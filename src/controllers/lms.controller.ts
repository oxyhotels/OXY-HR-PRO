import { Request, Response, NextFunction } from 'express';
import { Course, Assessment, Certification } from '@/models/Lms';
import { ApiError } from '@/utils/ApiError';

export const getCourses = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userDept = req.user?.department;
    // Standard employee only sees courses matching their department
    const query = req.user?.role === 'EMPLOYEE' && userDept ? { department: userDept } : {};
    const courses = await Course.find(query);

    res.status(200).json({
      status: 'success',
      data: { courses },
    });
  } catch (error) {
    next(error);
  }
};

export const createCourse = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { title, description, department, modules, questions } = req.body;
    
    // Create course
    const course = await Course.create({
      title,
      description,
      department,
      modules: modules || [],
    });

    // Create associated quiz if questions provided
    if (questions && questions.length > 0) {
      await Assessment.create({
        course: course._id,
        questions,
      });
    }

    res.status(201).json({
      status: 'success',
      data: { course },
    });
  } catch (error) {
    next(error);
  }
};

export const submitAssessment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { answers } = req.body; // Array of option indexes
    const courseId = req.params.id;

    const assessment = await Assessment.findOne({ course: courseId });
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
    const passed = score >= 70; // 70% passing score standard

    if (passed) {
      // Issue certification
      certification = await Certification.findOneAndUpdate(
        { employee: req.user?._id, course: courseId },
        { score, dateObtained: new Date() },
        { upsert: true, new: true }
      );
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
