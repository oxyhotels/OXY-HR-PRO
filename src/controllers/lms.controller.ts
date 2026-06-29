import { Request, Response, NextFunction } from 'express';
import { Course, Assessment, Certification, LmsWatchHistory, LmsAssignment, LmsComment } from '@/models/Lms';
import { User } from '@/models/User';
import { ApiError } from '@/utils/ApiError';
import { AuditLog } from '@/models/AuditLog';

// 1. Get Courses with dynamic search / filters
export const getCourses = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { category, department, search, sort } = req.query;
    const filter: any = { publishStatus: 'Published' };

    // Support open department exploration for all staff
    if (department && department !== 'All') {
      filter.department = department;
    }

    if (category) {
      filter.category = category;
    }

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { instructorName: { $regex: search, $options: 'i' } }
      ];
    }

    // Populate user profile who uploaded the video
    let queryBuilder = Course.find(filter).populate('createdBy', 'firstName lastName role designation photoUrl');

    // Sorting options
    if (sort === 'most-watched') {
      queryBuilder = queryBuilder.sort({ viewsCount: -1 });
    } else if (sort === 'newest') {
      queryBuilder = queryBuilder.sort({ createdAt: -1 });
    } else {
      queryBuilder = queryBuilder.sort({ createdAt: -1 });
    }

    const courses = await queryBuilder;

    res.status(200).json({
      status: 'success',
      data: { courses },
    });
  } catch (error) {
    next(error);
  }
};

// 2. Create Course (Admin, Manager, or Employee)
export const createCourse = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const {
      title, description, department, modules, questions,
      thumbnailUrl, bannerUrl, category, instructorName,
      difficultyLevel, duration, tags, attachments
    } = req.body;

    const course = await Course.create({
      title,
      description,
      department,
      thumbnailUrl,
      bannerUrl,
      category,
      instructorName: instructorName || `${req.user?.firstName} ${req.user?.lastName}`,
      difficultyLevel,
      duration: Number(duration || 0),
      tags: tags || [],
      attachments: attachments || [],
      modules: modules || [],
      createdBy: req.user?._id
    });

    if (questions && questions.length > 0) {
      await Assessment.create({
        course: course._id,
        questions,
      });
    }

    await AuditLog.create({
      user: req.user?._id,
      hotel: req.user?.hotel,
      action: 'CREATE_LMS_COURSE',
      module: 'LMS',
      details: `LMS Course "${title}" uploaded by ${req.user?.firstName} ${req.user?.lastName}`,
    });

    res.status(201).json({
      status: 'success',
      data: { course },
    });
  } catch (error) {
    next(error);
  }
};

// 3. Edit Course
export const editCourse = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { questions, ...courseData } = req.body;
    
    const courseObj = await Course.findById(req.params.id).lean() as any;
    if (!courseObj) throw new ApiError(404, 'Course not found');
    
    // Auth Check: ROOT_ADMIN or uploader owner
    const isOwner = courseObj.createdBy && courseObj.createdBy.toString() === req.user?._id?.toString();
    const isAdmin = ['ROOT_ADMIN', 'HOTEL_ADMIN', 'HR_MANAGER'].includes(req.user?.role || '');
    if (!isOwner && !isAdmin) {
      throw new ApiError(403, 'Permission denied: You can only edit courses you uploaded.');
    }

    const course = await Course.findByIdAndUpdate(req.params.id, courseData, { new: true });

    if (questions) {
      await Assessment.findOneAndUpdate(
        { course: course._id },
        { questions },
        { upsert: true, new: true }
      );
    }

    res.status(200).json({
      status: 'success',
      data: { course }
    });
  } catch (error) {
    next(error);
  }
};

// 4. Delete Course
export const deleteCourse = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const courseObj = await Course.findById(req.params.id).lean() as any;
    if (!courseObj) throw new ApiError(404, 'Course not found');

    // Auth Check: ROOT_ADMIN or uploader owner
    const isOwner = courseObj.createdBy && courseObj.createdBy.toString() === req.user?._id?.toString();
    const isAdmin = ['ROOT_ADMIN', 'HOTEL_ADMIN', 'HR_MANAGER'].includes(req.user?.role || '');
    if (!isOwner && !isAdmin) {
      throw new ApiError(403, 'Permission denied: You can only delete courses you uploaded.');
    }

    await Course.findByIdAndDelete(req.params.id);

    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (error) {
    next(error);
  }
};

// 5. Submit Assessment Quiz & Generate Credentials
export const submitAssessment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { answers } = req.body;
    const courseId = req.params.id;

    const assessment = await Assessment.findOne({ course: courseId }).lean() as any;
    if (!assessment) {
      throw new ApiError(404, 'No assessment found for this course');
    }

    let correctCount = 0;
    assessment.questions.forEach((q: any, idx: number) => {
      if (answers[idx] === q.answerIndex) {
        correctCount++;
      }
    });

    const totalQuestions = assessment.questions.length;
    const score = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 100;

    let certification = null;
    const passed = score >= 70;

    if (passed) {
      certification = await Certification.findOneAndUpdate(
        { employee: req.user?._id, course: courseId },
        { score, dateObtained: new Date() },
        { upsert: true, new: true }
      );
      // Increment completions count on Course
      await Course.findByIdAndUpdate(courseId, { $inc: { completionsCount: 1 } });
    }

    res.status(200).json({
      status: 'success',
      data: {
        score,
        passed,
        correctCount,
        totalQuestions,
        certification,
      },
    });
  } catch (error) {
    next(error);
  }
};

// 5.5 Get Course Assessment Questions
export const getCourseAssessment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const courseId = req.params.id;
    const assessment = await Assessment.findOne({ course: courseId }).lean() as any;
    if (!assessment) {
      res.status(200).json({
        status: 'success',
        data: { questions: [] }
      });
      return;
    }
    
    // For non-employees or managers/admins, we can include the answer index, but for employees, hide it
    const isEmployee = req.user?.role === 'EMPLOYEE';
    const questions = assessment.questions.map((q: any) => {
      const qObj: any = {
        question: q.question,
        options: q.options,
      };
      if (!isEmployee) {
        qObj.answerIndex = q.answerIndex;
      }
      return qObj;
    });

    res.status(200).json({
      status: 'success',
      data: { questions }
    });
  } catch (error) {
    next(error);
  }
};

// 6. Save Playback Watch History Progress
export const saveWatchProgress = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { courseId, activeModuleIndex, watchPercentage, lastPosition, completedModuleIndex } = req.body;
    const userId = req.user?._id;

    if (!courseId) throw new ApiError(400, 'courseId is required');

    let history = await LmsWatchHistory.findOne({ employee: userId, course: courseId });

    if (!history) {
      history = new LmsWatchHistory({
        employee: userId,
        course: courseId,
        activeModuleIndex: activeModuleIndex || 0,
        watchPercentage: watchPercentage || 0,
        lastPosition: lastPosition || 0,
        completedModules: completedModuleIndex !== undefined ? [completedModuleIndex] : []
      });
    } else {
      if (activeModuleIndex !== undefined) history.activeModuleIndex = activeModuleIndex;
      if (watchPercentage !== undefined) history.watchPercentage = Math.max(history.watchPercentage, watchPercentage);
      if (lastPosition !== undefined) history.lastPosition = lastPosition;
      
      if (completedModuleIndex !== undefined && !history.completedModules.includes(completedModuleIndex)) {
        history.completedModules.push(completedModuleIndex);
      }
    }

    // Check completion state
    const course = await Course.findById(courseId).lean() as any;
    if (course && history.completedModules.length >= course.modules.length) {
      history.status = 'Completed';
    }

    await history.save();

    res.status(200).json({
      status: 'success',
      data: { history }
    });
  } catch (error) {
    next(error);
  }
};

export const getWatchProgress = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const history = await LmsWatchHistory.find({ employee: req.user?._id }).lean() as any;
    res.status(200).json({
      status: 'success',
      data: { history }
    });
  } catch (error) {
    next(error);
  }
};

// 7. Course Assignments
export const assignCourse = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { courseId, targetType, targetEmployeeId, targetDepartment, targetHotelId, dueDate } = req.body;

    const assignment = await LmsAssignment.create({
      course: courseId,
      assignedBy: req.user?._id,
      targetType,
      targetEmployee: targetEmployeeId || undefined,
      targetDepartment: targetDepartment || undefined,
      targetHotel: targetHotelId || undefined,
      dueDate,
      completionStatus: 'Pending'
    });

    res.status(201).json({
      status: 'success',
      data: { assignment }
    });
  } catch (error) {
    next(error);
  }
};

export const getAssignments = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const filter: any = {};
    if (req.user?.role === 'EMPLOYEE') {
      filter.$or = [
        { targetEmployee: req.user._id },
        { targetDepartment: req.user.department },
        { targetHotel: req.user.hotel }
      ];
    } else {
      filter.assignedBy = req.user?._id;
    }

    const assignments = await LmsAssignment.find(filter)
          .populate('course', 'title category description thumbnailUrl bannerUrl modules')
          .populate('targetEmployee', 'firstName lastName')
          .sort({ createdAt: -1 }).lean() as any;

    res.status(200).json({
      status: 'success',
      data: { assignments }
    });
  } catch (error) {
    next(error);
  }
};

// 8. Video Comments / Discussion Board
export const createComment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { courseId, moduleIndex, comment, replyText, commentId } = req.body;
    const userId = req.user?._id;

    if (commentId) {
      // Append a reply to existing comment
      const parentComment = await LmsComment.findById(commentId);
      if (!parentComment) throw new ApiError(404, 'Comment thread not found');
      
      parentComment.replies.push({
        user: userId,
        reply: replyText,
        createdAt: new Date()
      });
      await parentComment.save();

      res.status(200).json({
        status: 'success',
        data: { comment: parentComment }
      });
      return;
    }

    // Create fresh root comment thread
    const newComment = await LmsComment.create({
      course: courseId,
      moduleIndex,
      user: userId,
      comment,
      replies: []
    });

    res.status(201).json({
      status: 'success',
      data: { comment: newComment }
    });
  } catch (error) {
    next(error);
  }
};

export const getComments = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { courseId, moduleIndex } = req.query;
    if (!courseId) throw new ApiError(400, 'courseId is required');

    const comments = await LmsComment.find({ course: courseId, moduleIndex: Number(moduleIndex || 0) })
          .populate('user', 'firstName lastName role designation photoUrl')
          .populate('replies.user', 'firstName lastName role designation photoUrl')
          .sort({ createdAt: -1 }).lean() as any;

    res.status(200).json({
      status: 'success',
      data: { comments }
    });
  } catch (error) {
    next(error);
  }
};

// 9. LMS Analytics Scorecard Reporting Panel
export const getLmsAnalytics = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const role = req.user?.role;
    const hotelId = req.user?.hotel;

    if (role === 'ROOT_ADMIN') {
      const totalCourses = await Course.countDocuments();
      const totalVideosCount = await Course.aggregate([
        { $project: { numberOfVideos: { $size: "$modules" } } },
        { $group: { _id: null, total: { $sum: "$numberOfVideos" } } }
      ]);
      const totalCertifications = await Certification.countDocuments();
      const trending = await Course.find().sort({ viewsCount: -1 }).limit(1).select('title viewsCount').lean() as any;

      res.status(200).json({
        status: 'success',
        data: {
          totalCourses,
          totalVideos: totalVideosCount[0]?.total || 0,
          totalCertifications,
          topCourse: trending[0]?.title || 'None'
        }
      });
    } else if (role === 'DEPT_MANAGER' || role === 'HR_MANAGER' || role === 'HOTEL_ADMIN') {
      // Manager Team progress
      const totalAssigned = await LmsAssignment.countDocuments({ assignedBy: req.user?._id });
      const completedAssigned = await LmsAssignment.countDocuments({ assignedBy: req.user?._id, completionStatus: 'Completed' });
      
      res.status(200).json({
        status: 'success',
        data: {
          totalAssigned,
          completedAssigned,
          pendingAssigned: totalAssigned - completedAssigned
        }
      });
    } else {
      // Employee Dashboard status
      const watchCount = await LmsWatchHistory.countDocuments({ employee: req.user?._id });
      const certificationCount = await Certification.countDocuments({ employee: req.user?._id });

      res.status(200).json({
        status: 'success',
        data: {
          watchCount,
          certificationCount
        }
      });
    }
  } catch (error) {
    next(error);
  }
};
