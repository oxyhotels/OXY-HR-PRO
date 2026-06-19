'use client';

import React, { useEffect, useState, useRef } from 'react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { DEPARTMENTS } from '@/constants/departments';
import {
  BookOpen, Award, CheckCircle2, Play, ChevronRight, GraduationCap,
  ArrowRight, ShieldAlert, Search, Filter, Plus, Trash2, Edit,
  MessageSquare, Send, CornerDownRight, X, Clock, User, Download,
  Tag, Calendar, Building, Users, Check, Eye
} from 'lucide-react';

interface Module {
  title: string;
  videoUrl: string;
  content: string;
  videoType?: 'mp4' | 'youtube' | 'vimeo' | 'doc';
  duration?: number;
}

interface Question {
  question: string;
  options: string[];
  answerIndex: number;
}

interface Course {
  _id: string;
  title: string;
  description: string;
  department: string;
  thumbnailUrl?: string;
  bannerUrl?: string;
  category?: string;
  instructorName?: string;
  difficultyLevel?: 'Beginner' | 'Intermediate' | 'Advanced';
  duration?: number;
  tags?: string[];
  attachments?: { name: string; fileUrl: string; fileType: string }[];
  isCertificationEnabled?: boolean;
  publishStatus?: 'Draft' | 'Published';
  viewsCount?: number;
  completionsCount?: number;
  modules: Module[];
  createdBy?: any;
}

interface WatchHistory {
  course: string;
  activeModuleIndex: number;
  watchPercentage: number;
  lastPosition: number;
  completedModules: number[];
  status: 'In_Progress' | 'Completed';
}

interface Assignment {
  _id: string;
  course: {
    _id: string;
    title: string;
    category?: string;
    description?: string;
    thumbnailUrl?: string;
  };
  assignedBy: {
    firstName: string;
    lastName: string;
  };
  targetType: 'Employee' | 'Department' | 'Hotel';
  targetEmployee?: {
    firstName: string;
    lastName: string;
  };
  targetDepartment?: string;
  dueDate: string;
  completionStatus: 'Pending' | 'Completed';
}

interface LmsComment {
  _id: string;
  course: string;
  moduleIndex: number;
  user: {
    _id: string;
    firstName: string;
    lastName: string;
    role: string;
    designation?: string;
    photoUrl?: string;
  };
  comment: string;
  replies: {
    _id: string;
    user: {
      _id: string;
      firstName: string;
      lastName: string;
      role: string;
      designation?: string;
      photoUrl?: string;
    };
    reply: string;
    createdAt: string;
  }[];
  createdAt: string;
}

interface LmsAnalytics {
  totalCourses?: number;
  totalVideos?: number;
  totalCertifications?: number;
  topCourse?: string;
  totalAssigned?: number;
  completedAssigned?: number;
  pendingAssigned?: number;
  watchCount?: number;
  certificationCount?: number;
}

export default function LmsPage() {
  const { user } = useAuthStore();
  const isAdmin = ['ROOT_ADMIN', 'HOTEL_ADMIN', 'HR_MANAGER'].includes(user?.role || '');
  const isManager = ['DEPT_MANAGER'].includes(user?.role || '');

  const canModifyCourse = (course: Course) => {
    if (isAdmin) return true;
    if (!user || !course.createdBy) return false;
    const uploaderId = typeof course.createdBy === 'object' ? course.createdBy._id || course.createdBy.id : course.createdBy;
    const currentUserId = user.id || (user as any)._id;
    return uploaderId === currentUserId;
  };

  // Main UI Data State
  const [courses, setCourses] = useState<Course[]>([]);
  const [watchHistories, setWatchHistories] = useState<Record<string, WatchHistory>>({});
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [analytics, setAnalytics] = useState<LmsAnalytics | null>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [hotels, setHotels] = useState<any[]>([]);

  // Filtering / Search State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedDifficulty, setSelectedDifficulty] = useState('All');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('All');
  const [sortBy, setSortBy] = useState('newest');

  // Active Video Player Console State
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [activeModuleIndex, setActiveModuleIndex] = useState<number>(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playbackTime, setPlaybackTime] = useState<number>(0);
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const [watchPercentageSent, setWatchPercentageSent] = useState<Record<string, number>>({});

  // Comments / discussions state
  const [comments, setComments] = useState<LmsComment[]>([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [replyTextMap, setReplyTextMap] = useState<Record<string, string>>({});
  const [activeReplyBox, setActiveReplyBox] = useState<string | null>(null);

  // Quiz / Certification state
  const [quizActive, setQuizActive] = useState(false);
  const [quizQuestions, setQuizQuestions] = useState<Question[]>([]);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [quizResult, setQuizResult] = useState<{ score: number; passed: boolean; certification?: any } | null>(null);
  const [certificationInfo, setCertificationInfo] = useState<any>(null);

  // Admin Course Creation/Edit Modal State
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [courseForm, setCourseForm] = useState({
    title: '',
    description: '',
    department: 'Administration',
    category: 'Safety Training',
    thumbnailUrl: '',
    bannerUrl: '',
    instructorName: 'OXY Brand Expert',
    difficultyLevel: 'Beginner' as 'Beginner' | 'Intermediate' | 'Advanced',
    duration: 0,
    tags: '',
    attachments: [] as { name: string; fileUrl: string; fileType: string }[],
    isCertificationEnabled: true,
    publishStatus: 'Published' as 'Draft' | 'Published'
  });

  const [formModules, setFormModules] = useState<Module[]>([]);
  const [formQuestions, setFormQuestions] = useState<Question[]>([]);
  
  // Single Video Upload Helper State
  const [isSingleVideo, setIsSingleVideo] = useState(true);
  const [singleVideoUrl, setSingleVideoUrl] = useState('');
  const [singleVideoType, setSingleVideoType] = useState<'mp4' | 'youtube' | 'vimeo' | 'doc'>('youtube');
  const [singleVideoDuration, setSingleVideoDuration] = useState(0);

  // Dynamic Add / Edit form helper states
  const [newModule, setNewModule] = useState<Module>({
    title: '',
    videoUrl: '',
    content: '',
    videoType: 'mp4',
    duration: 0
  });

  const [newQuestion, setNewQuestion] = useState<Question>({
    question: '',
    options: ['', '', '', ''],
    answerIndex: 0
  });

  const [newAttachment, setNewAttachment] = useState({ name: '', fileUrl: '', fileType: 'PDF' });

  // Manager Assignment Modal State
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assignForm, setAssignForm] = useState({
    courseId: '',
    targetType: 'Employee' as 'Employee' | 'Department' | 'Hotel',
    targetEmployeeId: '',
    targetDepartment: '',
    targetHotelId: '',
    dueDate: ''
  });

  // Predefined lists
  const categoriesList = ['All', 'Safety Training', 'Guest Relations', 'Kitchen Hygiene', 'Housekeeping', 'F&B Operations', 'General Compliance'];
  const [departmentsList, setDepartmentsList] = useState<string[]>(Array.from(DEPARTMENTS));

  useEffect(() => {
    const fetchDepts = async () => {
      try {
        const res = await api.get('/organization/public-departments');
        if (res?.data?.departments) {
          setDepartmentsList(res.data.departments);
        }
      } catch (err) {
        console.error('Failed to load active departments', err);
      }
    };
    fetchDepts();
  }, []);

  const isEmployee = (role?: string) => {
    return role === 'EMPLOYEE';
  };

  const fetchCoreData = async () => {
    try {
      // Fetch Courses with parameters
      let url = `/lms/courses?sort=${sortBy}`;
      if (selectedCategory !== 'All') url += `&category=${encodeURIComponent(selectedCategory)}`;
      if (selectedDeptFilter !== 'All') url += `&department=${encodeURIComponent(selectedDeptFilter)}`;
      
      const coursesRes = await api.get(url);
      setCourses(coursesRes.data.courses || []);

      // Fetch User's Watch History Progress
      const historyRes = await api.get('/lms/history');
      const historyMap: Record<string, WatchHistory> = {};
      if (historyRes.data.history) {
        historyRes.data.history.forEach((h: any) => {
          historyMap[h.course] = h;
        });
      }
      setWatchHistories(historyMap);

      // Fetch Analytics summary
      const analyticsRes = await api.get('/lms/analytics');
      setAnalytics(analyticsRes.data || null);

      // Fetch Assignments list
      const assignRes = await api.get('/lms/assign');
      setAssignments(assignRes.data.assignments || []);

      // Fetch Employees for Assignment (Manager/HR/Admin only)
      if (!isEmployee(user?.role)) {
        const empRes = await api.get('/employees');
        setEmployees(empRes.data.employees || []);
      }

      // Fetch Hotels for Assignment (Root Admin / Hotel Admin)
      if (user?.role === 'ROOT_ADMIN') {
        const hotelsRes = await api.get('/hotels');
        setHotels(hotelsRes.data.hotels || []);
      }
    } catch (error) {
      console.error('Error fetching LMS core data:', error);
    }
  };

  const fetchComments = async () => {
    if (!selectedCourse) return;
    try {
      const res = await api.get(`/lms/comments?courseId=${selectedCourse._id}&moduleIndex=${activeModuleIndex}`);
      setComments(res.data.comments || []);
    } catch (err) {
      console.error('Error fetching comments:', err);
    }
  };

  useEffect(() => {
    fetchCoreData();
  }, [selectedCategory, selectedDifficulty, selectedDeptFilter, sortBy]);

  // Load comment board when selected module changes
  useEffect(() => {
    if (selectedCourse) {
      fetchComments();
    }
  }, [selectedCourse, activeModuleIndex]);

  const handlePostComment = async () => {
    if (!selectedCourse || !newCommentText.trim()) return;
    try {
      await api.post('/lms/comments', {
        courseId: selectedCourse._id,
        moduleIndex: activeModuleIndex,
        comment: newCommentText.trim()
      });
      setNewCommentText('');
      fetchComments();
    } catch (err) {
      console.error('Error posting comment:', err);
    }
  };

  const handlePostReply = async (commentId: string) => {
    const text = replyTextMap[commentId];
    if (!selectedCourse || !text || !text.trim()) return;
    try {
      await api.post('/lms/comments', {
        commentId,
        replyText: text.trim()
      });
      setReplyTextMap(prev => ({ ...prev, [commentId]: '' }));
      setActiveReplyBox(null);
      fetchComments();
    } catch (err) {
      console.error('Error posting reply:', err);
    }
  };

  // Video Progress Auto-save mechanism
  const handleTimeUpdate = async () => {
    if (!videoRef.current || !selectedCourse) return;
    const current = videoRef.current.currentTime;
    const duration = videoRef.current.duration;
    if (!duration || isNaN(duration)) return;

    setPlaybackTime(current);
    setVideoDuration(duration);

    const percentage = Math.round((current / duration) * 100);

    // Save progress periodically to backend at 25%, 50%, 75%, 90%, and 100%
    const threshold = [25, 50, 75, 90, 98].find(t => percentage >= t && (watchPercentageSent[selectedCourse._id] || 0) < t);
    
    if (threshold !== undefined) {
      setWatchPercentageSent(prev => ({ ...prev, [selectedCourse._id]: threshold }));
      await saveProgress(percentage, current);
    }
  };

  const handleVideoEnded = async () => {
    if (!selectedCourse) return;
    // Mark this module as completed on completion
    await saveProgress(100, videoDuration, true);
  };

  const saveProgress = async (percentage: number, position: number, isFinished = false) => {
    if (!selectedCourse) return;
    try {
      const payload: any = {
        courseId: selectedCourse._id,
        activeModuleIndex,
        watchPercentage: percentage,
        lastPosition: Math.round(position)
      };

      if (isFinished) {
        payload.completedModuleIndex = activeModuleIndex;
      }

      const res = await api.post('/lms/history', payload);
      // Update history in state
      if (res.data.history) {
        setWatchHistories(prev => ({
          ...prev,
          [selectedCourse._id]: res.data.history
        }));
      }
    } catch (err) {
      console.error('Error saving watch history:', err);
    }
  };

  const handleMarkModuleComplete = async () => {
    await saveProgress(100, videoDuration || 0, true);
  };

  // Dynamic Video Player YouTube Embed Parser
  const getEmbedUrl = (url: string, type?: string) => {
    if (!url) return '';
    if (type === 'youtube' || url.includes('youtube.com') || url.includes('youtu.be')) {
      let videoId = '';
      const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
      const match = url.match(regExp);
      if (match && match[2].length === 11) {
        videoId = match[2];
      }
      return `https://www.youtube.com/embed/${videoId}?autoplay=1`;
    }
    if (type === 'vimeo' || url.includes('vimeo.com')) {
      let videoId = '';
      const regExp = /vimeo\.com\/(?:video\/)?([0-9]+)/;
      const match = url.match(regExp);
      if (match && match[1]) {
        videoId = match[1];
      }
      return `https://player.vimeo.com/video/${videoId}?autoplay=1`;
    }
    return url;
  };

  // Quiz System handlers
  const handleOpenQuiz = async () => {
    if (!selectedCourse) return;
    try {
      const res = await api.get(`/lms/courses/${selectedCourse._id}/assessment`);
      setQuizQuestions(res.data.questions || []);
      setQuizAnswers({});
      setQuizResult(null);
      setQuizActive(true);
    } catch (err) {
      console.error('Error fetching quiz questions:', err);
    }
  };

  const handleSelectQuizAnswer = (qIdx: number, optIdx: number) => {
    setQuizAnswers(prev => ({ ...prev, [qIdx]: optIdx }));
  };

  const handleSubmitQuiz = async () => {
    if (!selectedCourse) return;
    try {
      const formattedAnswers = Object.keys(quizAnswers).reduce((acc: any, key) => {
        acc[Number(key)] = quizAnswers[Number(key)];
        return acc;
      }, {});

      const res = await api.post(`/lms/courses/${selectedCourse._id}/assessment`, {
        answers: formattedAnswers
      });
      
      setQuizResult({
        score: res.data.data.score,
        passed: res.data.data.passed,
        certification: res.data.data.certification
      });

      if (res.data.data.passed && res.data.data.certification) {
        setCertificationInfo(res.data.data.certification);
        // Refresh histories
        fetchCoreData();
      }
    } catch (err) {
      console.error('Error submitting assessment quiz:', err);
    }
  };

  // Certificate PDF download/printer trigger
  const handlePrintCertificate = () => {
    const printWindow = window.open('about:blank', 'PrintCertificate', 'left=5000,top=5000,width=0,height=0');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>Certificate - ${selectedCourse?.title}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@500;700&family=Montserrat:wght@400;600&display=swap');
            body { margin: 0; padding: 0; display: flex; justify-content: center; align-items: center; height: 100vh; background-color: #f7f7f7; font-family: 'Montserrat', sans-serif; }
            .cert-container { width: 800px; height: 560px; padding: 30px; border: 15px solid #d4af37; background: #fff; box-shadow: 0 0 20px rgba(0,0,0,0.1); position: relative; text-align: center; box-sizing: border-box; }
            .cert-inner { border: 2px solid #c59b27; height: 100%; padding: 40px; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; align-items: center; background: radial-gradient(circle, #fff 60%, #fbf9f4 100%); }
            .logo { height: 60px; object-fit: contain; margin-bottom: 15px; }
            .title { font-family: 'Cinzel', serif; font-size: 36px; color: #1e293b; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; }
            .subtitle { font-size: 14px; text-transform: uppercase; letter-spacing: 3px; color: #64748b; margin-top: 5px; }
            .award-to { font-size: 12px; font-style: italic; color: #64748b; margin-top: 15px; }
            .name { font-size: 28px; color: #b8860b; border-bottom: 2px solid #e2e8f0; padding-bottom: 5px; min-width: 300px; display: inline-block; margin-top: 10px; font-weight: 600; }
            .statement { font-size: 13px; color: #475569; max-width: 550px; line-height: 1.6; margin-top: 15px; }
            .course-title { font-size: 18px; font-weight: 600; color: #1e293b; margin-top: 5px; }
            .footer-section { display: flex; justify-content: space-between; width: 100%; margin-top: 25px; align-items: flex-end; }
            .signature-box { width: 180px; text-align: center; border-top: 1px solid #cbd5e1; padding-top: 5px; font-size: 11px; color: #64748b; }
            .sig-line { font-family: 'Cinzel', serif; font-weight: 700; color: #1e293b; margin-bottom: 5px; font-size: 13px; }
            .cert-id { font-family: monospace; font-size: 9px; color: #94a3b8; align-self: center; margin-top: 10px; }
            @media print {
              body { background: none; }
              .cert-container { box-shadow: none; border: 15px solid #d4af37 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>
          <div class="cert-container">
            <div class="cert-inner">
              <img src="/oxy-logo.jpeg" class="logo" alt="OXY Hotels Logo" onerror="this.src='https://placehold.co/150x60?text=OXY+HOTELS'" />
              <div>
                <div class="title">Certificate of Completion</div>
                <div class="subtitle">OXY Hotels Learning Center</div>
              </div>
              <div>
                <div class="award-to">This is proudly presented to</div>
                <div class="name">${user?.firstName} ${user?.lastName}</div>
              </div>
              <div>
                <div class="statement">
                  for successfully completing the prescribed hospitality training and meeting all mandatory requirements and final assessments for:
                  <div class="course-title">${selectedCourse?.title}</div>
                </div>
              </div>
              <div class="footer-section">
                <div class="signature-box">
                  <div class="sig-line">OXY Brand Academy</div>
                  <div>Authorized Signatory</div>
                </div>
                <div class="signature-box">
                  <div class="sig-line">${new Date(certificationInfo?.dateObtained || Date.now()).toLocaleDateString()}</div>
                  <div>Date Issued</div>
                </div>
              </div>
              <div class="cert-id">Verification Code: OXY-CERT-${selectedCourse?._id?.substring(18).toUpperCase()}</div>
            </div>
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Course management action triggers
  const handleOpenCreateModal = () => {
    setEditingCourseId(null);
    setCourseForm({
      title: '',
      description: '',
      department: 'Administration',
      category: 'Safety Training',
      thumbnailUrl: '',
      bannerUrl: '',
      instructorName: 'OXY Brand Expert',
      difficultyLevel: 'Beginner',
      duration: 0,
      tags: '',
      attachments: [],
      isCertificationEnabled: true,
      publishStatus: 'Published'
    });
    setFormModules([]);
    setFormQuestions([]);
    setIsSingleVideo(true);
    setSingleVideoUrl('');
    setSingleVideoType('youtube');
    setSingleVideoDuration(0);
    setIsCourseModalOpen(true);
  };

  const handleOpenEditModal = async (course: Course) => {
    setEditingCourseId(course._id);
    setCourseForm({
      title: course.title,
      description: course.description,
      department: course.department,
      category: course.category || 'Safety Training',
      thumbnailUrl: course.thumbnailUrl || '',
      bannerUrl: course.bannerUrl || '',
      instructorName: course.instructorName || 'OXY Brand Expert',
      difficultyLevel: course.difficultyLevel || 'Beginner',
      duration: course.duration || 0,
      tags: course.tags?.join(', ') || '',
      attachments: course.attachments || [],
      isCertificationEnabled: course.isCertificationEnabled ?? true,
      publishStatus: course.publishStatus || 'Published'
    });
    setFormModules(course.modules || []);
    
    if (course.modules && course.modules.length === 1) {
      setIsSingleVideo(true);
      setSingleVideoUrl(course.modules[0].videoUrl || '');
      setSingleVideoType(course.modules[0].videoType || 'youtube');
      setSingleVideoDuration(course.modules[0].duration || 0);
    } else {
      setIsSingleVideo(false);
      setSingleVideoUrl('');
      setSingleVideoType('youtube');
      setSingleVideoDuration(0);
    }

    // Load quiz questions if exists
    try {
      const res = await api.get(`/lms/courses/${course._id}/assessment`);
      setFormQuestions(res.data.questions || []);
    } catch (err) {
      setFormQuestions([]);
    }
    
    setIsCourseModalOpen(true);
  };

  const handleDeleteCourse = async (courseId: string) => {
    if (!confirm('Are you sure you want to delete this course? This action is irreversible.')) return;
    try {
      await api.delete(`/lms/courses/${courseId}`);
      fetchCoreData();
    } catch (err) {
      alert('Error deleting course');
    }
  };

  const handleSaveCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let finalModules = formModules;
    if (isSingleVideo) {
      if (!singleVideoUrl.trim()) {
        alert('Please enter a valid video streaming link / YouTube URL.');
        return;
      }
      finalModules = [{
        title: courseForm.title,
        videoUrl: singleVideoUrl.trim(),
        content: courseForm.description,
        videoType: singleVideoType,
        duration: Number(singleVideoDuration || 0)
      }];
    }

    if (finalModules.length === 0) {
      alert('Please add at least one module (video lesson) before saving.');
      return;
    }

    const payload = {
      ...courseForm,
      duration: isSingleVideo ? Number(singleVideoDuration || 0) : courseForm.duration,
      tags: courseForm.tags.split(',').map(t => t.trim()).filter(Boolean),
      modules: finalModules,
      questions: formQuestions
    };

    try {
      if (editingCourseId) {
        await api.put(`/lms/courses/${editingCourseId}`, payload);
      } else {
        await api.post('/lms/courses', payload);
      }
      setIsCourseModalOpen(false);
      fetchCoreData();
    } catch (err) {
      console.error(err);
      alert('Failed to save course. Check details and try again.');
    }
  };

  // Helper form items adding handlers
  const handleAddModule = () => {
    if (!newModule.title || !newModule.videoUrl) {
      alert('Title and Video URL are required');
      return;
    }
    setFormModules([...formModules, { ...newModule }]);
    setNewModule({ title: '', videoUrl: '', content: '', videoType: 'mp4', duration: 0 });
  };

  const handleRemoveModule = (index: number) => {
    setFormModules(formModules.filter((_, idx) => idx !== index));
  };

  const handleAddQuestion = () => {
    if (!newQuestion.question || newQuestion.options.some(o => !o.trim())) {
      alert('Please fill the question and all 4 options');
      return;
    }
    setFormQuestions([...formQuestions, { ...newQuestion }]);
    setNewQuestion({ question: '', options: ['', '', '', ''], answerIndex: 0 });
  };

  const handleRemoveQuestion = (index: number) => {
    setFormQuestions(formQuestions.filter((_, idx) => idx !== index));
  };

  const handleAddAttachment = () => {
    if (!newAttachment.name || !newAttachment.fileUrl) {
      alert('Attachment name and file URL are required');
      return;
    }
    setCourseForm(prev => ({
      ...prev,
      attachments: [...prev.attachments, { ...newAttachment }]
    }));
    setNewAttachment({ name: '', fileUrl: '', fileType: 'PDF' });
  };

  const handleRemoveAttachment = (index: number) => {
    setCourseForm(prev => ({
      ...prev,
      attachments: prev.attachments.filter((_, idx) => idx !== index)
    }));
  };

  // Manager delegation handlers
  const handleOpenAssignModal = (courseId: string) => {
    setAssignForm({
      courseId,
      targetType: 'Employee',
      targetEmployeeId: '',
      targetDepartment: '',
      targetHotelId: '',
      dueDate: ''
    });
    setIsAssignModalOpen(true);
  };

  const handleSaveAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignForm.dueDate) {
      alert('Please select a valid due date');
      return;
    }
    
    const payload = {
      courseId: assignForm.courseId,
      targetType: assignForm.targetType,
      targetEmployeeId: assignForm.targetType === 'Employee' ? assignForm.targetEmployeeId : undefined,
      targetDepartment: assignForm.targetType === 'Department' ? assignForm.targetDepartment : undefined,
      targetHotelId: assignForm.targetType === 'Hotel' ? assignForm.targetHotelId : undefined,
      dueDate: assignForm.dueDate
    };

    try {
      await api.post('/lms/assign', payload);
      setIsAssignModalOpen(false);
      fetchCoreData();
      alert('Training program successfully assigned!');
    } catch (err) {
      alert('Failed to create assignment.');
    }
  };

  const handleSelectCourse = (course: Course) => {
    setSelectedCourse(course);
    setActiveModuleIndex(0);
    setQuizActive(false);
    setQuizAnswers({});
    setQuizResult(null);
    
    // Check if certification/quiz is already earned for this course
    const hist = watchHistories[course._id];
    if (hist && hist.status === 'Completed') {
      // Find certification if exists
      api.get('/lms/history').then(() => {
        // Search certification from database
        // In simple flow, let employee print certificate straightaway if status is Completed
      });
    }
  };

  // Filtered course feed list
  const filteredCourses = courses.filter(c => {
    const matchSearch = c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        c.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (c.instructorName || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchDiff = selectedDifficulty === 'All' || c.difficultyLevel === selectedDifficulty;
    return matchSearch && matchDiff;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      
      {/* Header and Branding */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800/80 pb-5">
        <div className="flex items-center gap-3">
          <img src="/oxy-logo.jpeg" alt="OXY Logo" className="h-10 w-10 rounded-lg object-contain bg-slate-900 border border-slate-800" onError={(e) => { e.currentTarget.src = 'https://placehold.co/40x40?text=OXY'; }} />
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <GraduationCap className="text-gold" size={24} />
              OXY Video Learning Center
            </h1>
            <p className="text-slate-400 text-xs mt-0.5">Premium hospitality standards and certified operations execution training.</p>
          </div>
        </div>
        {user && (
          <button
            onClick={handleOpenCreateModal}
            className="bg-gold hover:bg-gold-light text-slate-dark font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 uppercase tracking-wider transition-all shadow-lg shadow-gold/10 hover:shadow-gold/20 cursor-pointer"
          >
            <Plus size={16} />
            Upload Video
          </button>
        )}
      </div>

      {/* Analytics scoreboard panel */}
      {analytics && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {user?.role === 'ROOT_ADMIN' ? (
            <>
              <div className="glass-panel border border-slate-800/80 p-4 rounded-xl flex items-center gap-4">
                <div className="p-3 rounded-lg bg-gold/10 text-gold"><BookOpen size={20} /></div>
                <div>
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Total Courses</div>
                  <div className="text-xl font-bold text-white mt-0.5">{analytics.totalCourses || 0}</div>
                </div>
              </div>
              <div className="glass-panel border border-slate-800/80 p-4 rounded-xl flex items-center gap-4">
                <div className="p-3 rounded-lg bg-blue-500/10 text-blue-400"><Play size={20} /></div>
                <div>
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Total Lessons</div>
                  <div className="text-xl font-bold text-white mt-0.5">{analytics.totalVideos || 0}</div>
                </div>
              </div>
              <div className="glass-panel border border-slate-800/80 p-4 rounded-xl flex items-center gap-4">
                <div className="p-3 rounded-lg bg-green-500/10 text-green-400"><Award size={20} /></div>
                <div>
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Certificates Issued</div>
                  <div className="text-xl font-bold text-white mt-0.5">{analytics.totalCertifications || 0}</div>
                </div>
              </div>
              <div className="glass-panel border border-slate-800/80 p-4 rounded-xl flex items-center gap-4">
                <div className="p-3 rounded-lg bg-purple-500/10 text-purple-400"><Eye size={20} /></div>
                <div>
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Trending Module</div>
                  <div className="text-xs font-bold text-white mt-0.5 truncate max-w-[150px]">{analytics.topCourse || 'None'}</div>
                </div>
              </div>
            </>
          ) : !isEmployee(user?.role) ? (
            <>
              <div className="glass-panel border border-slate-800/80 p-4 rounded-xl flex items-center gap-4">
                <div className="p-3 rounded-lg bg-gold/10 text-gold"><Calendar size={20} /></div>
                <div>
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Assigned Programs</div>
                  <div className="text-xl font-bold text-white mt-0.5">{analytics.totalAssigned || 0}</div>
                </div>
              </div>
              <div className="glass-panel border border-slate-800/80 p-4 rounded-xl flex items-center gap-4">
                <div className="p-3 rounded-lg bg-green-500/10 text-green-400"><CheckCircle2 size={20} /></div>
                <div>
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Completed Programs</div>
                  <div className="text-xl font-bold text-white mt-0.5">{analytics.completedAssigned || 0}</div>
                </div>
              </div>
              <div className="glass-panel border border-slate-800/80 p-4 rounded-xl flex items-center gap-4">
                <div className="p-3 rounded-lg bg-red-500/10 text-red-400"><ShieldAlert size={20} /></div>
                <div>
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Pending Programs</div>
                  <div className="text-xl font-bold text-white mt-0.5">{analytics.pendingAssigned || 0}</div>
                </div>
              </div>
              <div className="glass-panel border border-slate-800/80 p-4 rounded-xl flex items-center gap-4">
                <div className="p-3 rounded-lg bg-blue-500/10 text-blue-400"><Users size={20} /></div>
                <div>
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Active Enrollees</div>
                  <div className="text-xl font-bold text-white mt-0.5">{employees.length}</div>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="glass-panel border border-slate-800/80 p-4 rounded-xl flex items-center gap-4">
                <div className="p-3 rounded-lg bg-gold/10 text-gold"><BookOpen size={20} /></div>
                <div>
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Study Progress</div>
                  <div className="text-xl font-bold text-white mt-0.5">{analytics.watchCount || 0} courses</div>
                </div>
              </div>
              <div className="glass-panel border border-slate-800/80 p-4 rounded-xl flex items-center gap-4">
                <div className="p-3 rounded-lg bg-green-500/10 text-green-400"><Award size={20} /></div>
                <div>
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Certificates Earned</div>
                  <div className="text-xl font-bold text-white mt-0.5">{analytics.certificationCount || 0}</div>
                </div>
              </div>
              <div className="glass-panel border border-slate-800/80 p-4 rounded-xl flex items-center gap-4 col-span-1 sm:col-span-2">
                <div className="p-3 rounded-lg bg-blue-500/10 text-blue-400"><Users size={20} /></div>
                <div>
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">XP Rank Status</div>
                  <div className="text-xs font-semibold text-white mt-0.5">
                    Level {user?.level || 1} &bull; {user?.xp || 0} XP earned &bull; Index: {user?.accountabilityIndex || 100}% Accountability
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Main Grid: Browse Feed vs Immersive Player */}
      {!selectedCourse ? (
        <div className="space-y-8">
          
          {/* Controls: Search, Sort and Filters */}
          <div className="glass-panel border border-slate-800/80 p-4 rounded-xl grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
            
            {/* Search Bar */}
            <div className="relative md:col-span-2">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                <Search size={16} />
              </span>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search courses, modules, or instructor..."
                className="w-full pl-9 pr-4 py-2 bg-slate-950/60 border border-slate-850 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-gold/60"
              />
            </div>

            {/* Difficulty Filter */}
            <div className="flex items-center gap-2">
              <Filter size={14} className="text-gold" />
              <select
                value={selectedDifficulty}
                onChange={(e) => setSelectedDifficulty(e.target.value)}
                className="w-full py-2 px-3 bg-slate-950/60 border border-slate-850 rounded-lg text-xs text-white focus:outline-none focus:border-gold/60"
              >
                <option value="All">All Difficulty</option>
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
              </select>
            </div>

            {/* Sort Filter */}
            <div className="flex items-center gap-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full py-2 px-3 bg-slate-950/60 border border-slate-850 rounded-lg text-xs text-white focus:outline-none focus:border-gold/60"
              >
                <option value="newest">Sort By: Newest</option>
                <option value="most-watched">Sort By: Most Watched</option>
              </select>
            </div>

          </div>

          {/* Categories Tab pills */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
            {categoriesList.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all border cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-gold text-slate-dark border-gold shadow-md shadow-gold/10'
                    : 'bg-slate-900 text-slate-400 border-slate-800/80 hover:text-white hover:border-slate-700'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Category-Scoped Department pills */}
          <div className="flex gap-2 overflow-x-auto pb-1 border-b border-slate-850">
            <span className="text-[10px] text-slate-500 uppercase font-bold flex items-center pr-2">Dept Scope:</span>
            {['All', ...departmentsList].map((dept) => (
              <button
                key={dept}
                onClick={() => setSelectedDeptFilter(dept)}
                className={`text-[10px] px-2.5 py-1 rounded transition-all font-medium whitespace-nowrap cursor-pointer ${
                  selectedDeptFilter === dept
                    ? 'bg-slate-800 text-gold font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {dept}
              </button>
            ))}
          </div>

          {/* Section: Continuing Studies Progress (Only for Employees & logged in progress) */}
          {Object.values(watchHistories).some(w => w.status === 'In_Progress') && (
            <div className="space-y-4">
              <h2 className="text-xs font-bold text-gold uppercase tracking-wider flex items-center gap-1.5">
                <Play size={12} fill="currentColor" />
                Continue Watching
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {courses
                  .filter(c => watchHistories[c._id]?.status === 'In_Progress')
                  .map(course => {
                    const progress = watchHistories[course._id];
                    return (
                      <div
                        key={course._id}
                        onClick={() => handleSelectCourse(course)}
                        className="glass-panel border border-slate-800/80 rounded-xl overflow-hidden cursor-pointer hover:border-gold/30 transition-all flex flex-col group"
                      >
                        <div className="aspect-video w-full relative bg-slate-950 overflow-hidden">
                          <img
                            src={course.thumbnailUrl || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&auto=format&fit=crop&q=60'}
                            alt={course.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-80"
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="p-3 bg-gold text-slate-dark rounded-full shadow-lg">
                              <Play size={20} fill="currentColor" />
                            </div>
                          </div>
                          <span className="absolute bottom-2 right-2 bg-slate-950/80 text-[9px] font-bold text-white px-1.5 py-0.5 rounded">
                            {course.modules.length} Lessons
                          </span>
                        </div>
                        <div className="p-4 flex flex-col flex-grow">
                          <div className="flex justify-between items-center text-[9px] text-slate-400 font-bold uppercase">
                            <span>{course.category}</span>
                            <span>{course.difficultyLevel}</span>
                          </div>
                          <h3 className="font-bold text-white text-xs mt-2 leading-snug line-clamp-1">{course.title}</h3>
                          <div className="mt-auto pt-4 space-y-1">
                            <div className="flex justify-between text-[9px] text-slate-400">
                              <span>Module {progress?.activeModuleIndex + 1 || 1} in progress</span>
                              <span>{progress?.watchPercentage || 0}%</span>
                            </div>
                            <div className="w-full bg-slate-850 h-1.5 rounded-full overflow-hidden">
                              <div className="bg-gold h-full rounded-full" style={{ width: `${progress?.watchPercentage || 0}%` }}></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Section: All courses catalog */}
          <div className="space-y-4">
            <h2 className="text-xs font-bold text-gold uppercase tracking-wider">All Available Training Courses</h2>
            {filteredCourses.length === 0 ? (
              <div className="flex flex-col items-center justify-center min-h-[30vh] border border-slate-800/80 rounded-xl bg-card-dark/20 text-center p-8">
                <BookOpen size={36} className="text-slate-500 mb-2" />
                <p className="text-xs text-slate-400">No courses match your active search or filter tags.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredCourses.map(course => {
                  const history = watchHistories[course._id];
                  const isCompleted = history?.status === 'Completed';
                  const inProgress = history?.status === 'In_Progress';
                  
                  return (
                    <div
                      key={course._id}
                      className="glass-panel border border-slate-800/80 rounded-xl overflow-hidden hover:border-gold/30 transition-all flex flex-col group relative"
                    >
                      
                      {/* Action buttons for creator / admin */}
                      {canModifyCourse(course) && (
                        <div className="absolute top-2 right-2 z-20 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleOpenEditModal(course); }}
                            className="p-1.5 bg-slate-900/90 text-slate-400 hover:text-gold rounded border border-slate-800"
                          >
                            <Edit size={12} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteCourse(course._id); }}
                            className="p-1.5 bg-slate-900/90 text-slate-400 hover:text-red-400 rounded border border-slate-800"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      )}

                      <div
                        onClick={() => handleSelectCourse(course)}
                        className="cursor-pointer flex flex-col h-full"
                      >
                        
                        {/* Course Image Header */}
                        <div className="aspect-video w-full relative bg-slate-950 overflow-hidden">
                          <img
                            src={course.thumbnailUrl || 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=600&auto=format&fit=crop&q=60'}
                            alt={course.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-75"
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="p-3 bg-gold text-slate-dark rounded-full shadow-lg">
                              <Play size={20} fill="currentColor" />
                            </div>
                          </div>
                          
                          {/* Badges overlays */}
                          <div className="absolute top-2 left-2 flex gap-1">
                            <span className="bg-slate-950/80 text-gold border border-gold/20 text-[8px] font-bold px-2 py-0.5 rounded uppercase">
                              {course.department}
                            </span>
                            {isCompleted && (
                              <span className="bg-green-500/90 text-white text-[8px] font-bold px-2 py-0.5 rounded flex items-center gap-0.5 uppercase">
                                <Check size={8} /> Completed
                              </span>
                            )}
                          </div>

                          <span className="absolute bottom-2 right-2 bg-slate-950/85 text-[9px] font-bold text-white px-1.5 py-0.5 rounded flex items-center gap-1">
                            <Clock size={10} /> {course.duration || 0} mins
                          </span>
                        </div>

                        {/* Course metadata contents */}
                        <div className="p-4 flex flex-col flex-grow">
                          <div className="flex justify-between items-center text-[8px] text-slate-400 font-bold uppercase tracking-wider">
                            <span>{course.category}</span>
                            <span>{course.difficultyLevel}</span>
                          </div>
                          
                          <h3 className="font-bold text-white text-xs mt-2 leading-snug line-clamp-1 group-hover:text-gold transition-colors">
                            {course.title}
                          </h3>
                          <p className="text-[10px] text-slate-400 mt-2 line-clamp-2 leading-relaxed">
                            {course.description}
                          </p>

                          <div className="mt-4 pt-3 border-t border-slate-850/60 space-y-1">
                            <div className="flex items-center justify-between text-[9px] text-slate-400">
                              <span className="flex items-center gap-1 font-medium truncate max-w-[150px]">
                                <User size={10} className="text-gold" /> 
                                {course.createdBy && typeof course.createdBy === 'object'
                                  ? `${course.createdBy.firstName} ${course.createdBy.lastName}`
                                  : course.instructorName || 'OXY Academy'}
                              </span>
                              <span>{course.modules.length} lessons</span>
                            </div>
                            {course.createdBy && typeof course.createdBy === 'object' && (
                              <div className="text-[8px] text-slate-500 font-medium">
                                Uploaded by: {course.createdBy.role}
                              </div>
                            )}
                          </div>

                          {/* Progress bar if in progress */}
                          {inProgress && (
                            <div className="mt-3 space-y-1">
                              <div className="w-full bg-slate-850 h-1 rounded-full overflow-hidden">
                                <div className="bg-gold h-full rounded-full" style={{ width: `${history?.watchPercentage || 0}%` }}></div>
                              </div>
                            </div>
                          )}
                        </div>

                      </div>

                      {/* Delegation assignments controls (Manager/Admin Only) */}
                      {!isEmployee(user?.role) && (
                        <div className="px-4 pb-4 border-t border-slate-850/40 pt-3 bg-slate-900/20 flex justify-end">
                          <button
                            onClick={() => handleOpenAssignModal(course._id)}
                            className="bg-slate-800 hover:bg-slate-700 text-gold font-bold px-3 py-1 rounded text-[10px] flex items-center gap-1 uppercase tracking-wider transition-colors cursor-pointer"
                          >
                            <Users size={10} />
                            Assign Training
                          </button>
                        </div>
                      )}

                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section: List Assigned Training Programs (Manager delegation view / Reports tracking) */}
          {!isEmployee(user?.role) && assignments.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xs font-bold text-gold uppercase tracking-wider">Active Staff Assignment Deployments</h2>
              <div className="glass-panel border border-slate-800/80 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-950/40 text-slate-400 text-[10px] uppercase font-bold tracking-wider border-b border-slate-805">
                      <th className="p-4">Assigned Course</th>
                      <th className="p-4">Staff Member / Group</th>
                      <th className="p-4">Target Type</th>
                      <th className="p-4">Due Date</th>
                      <th className="p-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850">
                    {assignments.map(ass => (
                      <tr key={ass._id} className="hover:bg-slate-900/30 text-[11px] text-slate-300">
                        <td className="p-4 font-semibold text-white">{ass.course?.title}</td>
                        <td className="p-4">
                          {ass.targetType === 'Employee'
                            ? `${ass.targetEmployee?.firstName} ${ass.targetEmployee?.lastName}`
                            : ass.targetType === 'Department'
                            ? `Department: ${ass.targetDepartment}`
                            : `Hotel-wide`}
                        </td>
                        <td className="p-4">{ass.targetType}</td>
                        <td className="p-4 text-slate-400">{new Date(ass.dueDate).toLocaleDateString()}</td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded text-[9px] uppercase font-bold ${
                            ass.completionStatus === 'Completed'
                              ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                              : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                          }`}>
                            {ass.completionStatus}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      ) : (
        
        /* Interactive Video Player & Training console page */
        <div className="space-y-6">
          
          {/* Back Navigation Bar */}
          <div className="flex justify-between items-center bg-slate-950/40 border border-slate-850/60 p-3 rounded-xl">
            <button
              onClick={() => { setSelectedCourse(null); fetchCoreData(); }}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1 uppercase tracking-wider font-semibold cursor-pointer"
            >
              <X size={14} /> Back to Browse Feed
            </button>
            <div className="flex items-center gap-2">
              <span className="text-[10px] bg-slate-800 border border-slate-700 px-2.5 py-0.5 rounded-full text-slate-350">
                {selectedCourse.category}
              </span>
              <span className="text-[10px] bg-slate-800 border border-slate-700 px-2.5 py-0.5 rounded-full text-gold">
                {selectedCourse.difficultyLevel}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left Column: Streaming Player, Details, Discussions */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Media Player wrapper */}
              <div className="bg-slate-950 border border-slate-850 rounded-xl overflow-hidden aspect-video relative group">
                {!quizActive ? (
                  selectedCourse.modules[activeModuleIndex].videoType === 'mp4' ? (
                    <video
                      ref={videoRef}
                      src={selectedCourse.modules[activeModuleIndex].videoUrl}
                      className="w-full h-full object-contain"
                      controls
                      autoPlay
                      onTimeUpdate={handleTimeUpdate}
                      onEnded={handleVideoEnded}
                    />
                  ) : (
                    <iframe
                      src={getEmbedUrl(selectedCourse.modules[activeModuleIndex].videoUrl, selectedCourse.modules[activeModuleIndex].videoType)}
                      className="w-full h-full"
                      allow="autoplay; encrypted-media; picture-in-picture"
                      allowFullScreen
                    />
                  )
                ) : (
                  /* Quiz Screen overlay */
                  <div className="w-full h-full bg-slate-950 flex flex-col justify-center items-center p-6 text-center text-white overflow-y-auto">
                    {quizResult ? (
                      /* Pass / Fail Grade cards */
                      <div className="max-w-md w-full space-y-4 p-8 bg-slate-900 border border-slate-800 rounded-xl flex flex-col items-center">
                        <div className={`w-14 h-14 rounded-full border flex items-center justify-center ${
                          quizResult.passed ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-red-500/10 border-red-500/30 text-red-400'
                        }`}>
                          {quizResult.passed ? <Award size={32} /> : <ShieldAlert size={32} />}
                        </div>
                        <div>
                          <h3 className="font-bold text-base text-white">
                            {quizResult.passed ? 'Certification Earned!' : 'Assessment Failed'}
                          </h3>
                          <p className="text-[11px] text-slate-400 mt-1">Passing threshold: 70%. Your Score: {quizResult.score}%</p>
                        </div>

                        {quizResult.passed ? (
                          <div className="w-full p-4 bg-gold/5 border border-gold/20 rounded-lg text-left space-y-2">
                            <p className="text-[9px] font-bold uppercase tracking-wider text-gold">Official Credential Details</p>
                            <p className="text-xs font-bold text-slate-200">Certified Guest Relations Specialist</p>
                            <p className="text-[9px] text-slate-500 font-mono">Verification Code: OXY-CERT-{selectedCourse._id.substring(18).toUpperCase()}</p>
                            <button
                              onClick={handlePrintCertificate}
                              className="mt-2 w-full bg-gold hover:bg-gold-light text-slate-dark font-bold py-1.5 rounded text-[10px] flex items-center justify-center gap-1 uppercase tracking-wider transition-colors cursor-pointer"
                            >
                              <Download size={12} /> Print/Save PDF Certificate
                            </button>
                          </div>
                        ) : (
                          <p className="text-[11px] text-red-400 leading-relaxed max-w-xs">
                            You did not meet the brand compliance threshold. Please review the lessons and retake the test.
                          </p>
                        )}

                        <div className="flex gap-2 w-full pt-2">
                          <button
                            onClick={() => { setQuizActive(false); setQuizResult(null); }}
                            className="flex-grow bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-semibold py-2 rounded text-[10px] uppercase transition-colors cursor-pointer"
                          >
                            Back to Study
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Quiz Question Board */
                      <div className="max-w-xl w-full text-left space-y-6">
                        <div className="flex justify-between items-center border-b border-slate-850 pb-3">
                          <span className="text-xs font-bold uppercase text-gold">Final Compliance Exam</span>
                          <span className="text-[10px] text-slate-400">Questions: {quizQuestions.length}</span>
                        </div>

                        {quizQuestions.length === 0 ? (
                          <div className="text-center py-6 text-slate-400 text-xs">No quiz questions defined for this course.</div>
                        ) : (
                          quizQuestions.map((q, qIdx) => (
                            <div key={qIdx} className="space-y-3 bg-slate-900/60 p-4 border border-slate-850 rounded-lg">
                              <p className="font-bold text-xs text-white">Q{qIdx + 1}. {q.question}</p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {q.options.map((opt, optIdx) => (
                                  <button
                                    key={optIdx}
                                    onClick={() => handleSelectQuizAnswer(qIdx, optIdx)}
                                    className={`text-left p-3 rounded-lg border text-[10px] transition-all cursor-pointer ${
                                      quizAnswers[qIdx] === optIdx
                                        ? 'bg-gold/15 border-gold text-white font-semibold'
                                        : 'bg-slate-950 border-slate-850 text-slate-400 hover:border-slate-700 hover:text-white'
                                    }`}
                                  >
                                    {opt}
                                  </button>
                                ))}
                              </div>
                            </div>
                          ))
                        )}

                        <div className="flex justify-between items-center pt-2">
                          <button
                            onClick={() => setQuizActive(false)}
                            className="bg-slate-900 border border-slate-800 hover:bg-slate-800 px-4 py-2 rounded text-[10px] uppercase tracking-wider font-semibold text-white cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleSubmitQuiz}
                            disabled={Object.keys(quizAnswers).length < quizQuestions.length}
                            className="bg-gold hover:bg-gold-light text-slate-dark font-bold px-5 py-2.5 rounded text-[10px] flex items-center justify-center gap-1.5 uppercase transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            Submit Assessment <ArrowRight size={12} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Mobile-only Modules and Assessment checklist */}
              <div className="lg:hidden space-y-6">
                {/* Modules list panel */}
                <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 space-y-4">
                  <div>
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">Lesson Modules</h3>
                    <p className="text-[9px] text-slate-550 mt-0.5">Complete all lessons to unlock final compliance quiz.</p>
                  </div>

                  <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                    {selectedCourse.modules.map((mod, idx) => {
                      const isCompleted = watchHistories[selectedCourse._id]?.completedModules?.includes(idx);
                      const isActive = activeModuleIndex === idx && !quizActive;

                      return (
                        <div
                          key={idx}
                          onClick={() => { setQuizActive(false); setActiveModuleIndex(idx); }}
                          className={`p-3 rounded-lg border cursor-pointer transition-all flex items-start justify-between gap-3 ${
                            isActive
                              ? 'bg-gold/10 border-gold/40 text-white'
                              : 'bg-slate-950/40 border-slate-850 text-slate-400 hover:border-slate-750'
                          }`}
                        >
                          <div className="flex gap-2 min-w-0">
                            <div className="mt-0.5 flex-shrink-0">
                              {isCompleted ? (
                                <CheckCircle2 size={12} className="text-green-500" />
                              ) : (
                                <Play size={12} className={isActive ? 'text-gold' : 'text-slate-500'} />
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className={`text-[9px] font-bold uppercase tracking-wider ${isActive ? 'text-gold' : 'text-slate-500'}`}>
                                Module {idx + 1}
                              </div>
                              <div className="text-[10.5px] font-medium text-white truncate mt-0.5">{mod.title}</div>
                            </div>
                          </div>
                          <span className="text-[8px] bg-slate-900 px-1.5 py-0.5 text-slate-500 rounded uppercase font-mono flex-shrink-0">
                            {mod.duration || 0}m
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Assessment Panel Trigger */}
                {selectedCourse.isCertificationEnabled !== false && (
                  <div className="glass-panel border border-slate-800/80 rounded-xl p-4 space-y-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Award size={24} className="text-gold" />
                      <h3 className="text-xs font-bold text-white uppercase tracking-wider">Course Certification</h3>
                    </div>
                    <p className="text-[9px] text-slate-400 leading-relaxed max-w-[280px] mx-auto">
                      Completing all video lessons unlocks the mandatory score quiz for issuing official credentials.
                    </p>

                    {/* Unlock details indicator */}
                    {(() => {
                      const complCount = watchHistories[selectedCourse._id]?.completedModules?.length || 0;
                      const totalCount = selectedCourse.modules.length;
                      const allDone = complCount >= totalCount;

                      return allDone ? (
                        <button
                          type="button"
                          onClick={handleOpenQuiz}
                          className="w-full bg-gold hover:bg-gold-light text-slate-dark font-extrabold py-2 rounded-lg text-[10px] uppercase tracking-wider transition-colors cursor-pointer"
                        >
                          Start Assessment Quiz
                        </button>
                      ) : (
                        <div className="w-full bg-slate-950 border border-slate-850/80 p-2.5 rounded-lg text-slate-400 text-[10px] flex items-center justify-between font-mono">
                          <span>Modules complete:</span>
                          <span className="font-bold text-gold">{complCount} / {totalCount}</span>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>

              {/* Module contents detailing */}
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-5 space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-sm font-bold text-white leading-snug">{selectedCourse.modules[activeModuleIndex].title}</h2>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Instructor: {selectedCourse.instructorName} &bull; OXY Certified
                    </p>
                    {selectedCourse.createdBy && typeof selectedCourse.createdBy === 'object' && (
                      <div className="flex items-center gap-1.5 mt-2 bg-slate-950/40 p-2 rounded border border-slate-850 max-w-fit animate-fade-in">
                        <div className="w-5 h-5 rounded-full bg-gold/10 text-gold flex items-center justify-center font-bold text-[9px] uppercase">
                          {selectedCourse.createdBy.firstName?.substring(0, 1)}
                        </div>
                        <span className="text-[10px] text-slate-350">
                          Uploaded by: <strong className="text-white font-semibold">{selectedCourse.createdBy.firstName} {selectedCourse.createdBy.lastName}</strong> ({selectedCourse.createdBy.role})
                        </span>
                      </div>
                    )}
                  </div>
                  {!quizActive && (
                    <button
                      onClick={handleMarkModuleComplete}
                      className="bg-slate-850 hover:bg-slate-800 border border-slate-750 text-gold font-bold px-3 py-1.5 rounded-lg text-[9px] flex items-center gap-1 uppercase tracking-wider transition-colors cursor-pointer"
                    >
                      <Check size={12} /> Mark Finished
                    </button>
                  )}
                </div>

                <p className="text-[11px] text-slate-350 leading-relaxed border-t border-slate-850/60 pt-3">
                  {selectedCourse.modules[activeModuleIndex].content}
                </p>

                {/* Course files attachments if any */}
                {selectedCourse.attachments && selectedCourse.attachments.length > 0 && (
                  <div className="pt-3 border-t border-slate-850/60">
                    <h4 className="text-[10px] font-bold text-gold uppercase tracking-wider">Lesson Attachments & PDF Manuals</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                      {selectedCourse.attachments.map((file, idx) => (
                        <a
                          key={idx}
                          href={file.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 p-2 bg-slate-950 border border-slate-850 rounded hover:border-gold/30 transition-all text-[10px] text-slate-300"
                        >
                          <Tag size={12} className="text-gold" />
                          <span className="truncate flex-grow font-semibold">{file.name}</span>
                          <span className="text-[8px] bg-slate-900 px-1 py-0.5 text-slate-500 rounded uppercase">{file.fileType}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Discussions Q&A board */}
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-5 space-y-6">
                <h3 className="text-xs font-bold text-white flex items-center gap-1.5 uppercase tracking-wider">
                  <MessageSquare size={14} className="text-gold" />
                  Q&A Discussion board ({comments.length})
                </h3>

                {/* Add root comment */}
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-white text-xs">
                    {user?.firstName?.substring(0, 1) || 'U'}
                  </div>
                  <div className="flex-grow flex gap-2">
                    <input
                      type="text"
                      value={newCommentText}
                      onChange={(e) => setNewCommentText(e.target.value)}
                      placeholder="Ask a question or comment on this training topic..."
                      className="flex-grow px-3 py-2 bg-slate-950/60 border border-slate-850 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-gold/60"
                    />
                    <button
                      onClick={handlePostComment}
                      className="bg-gold hover:bg-gold-light text-slate-dark p-2 rounded-lg cursor-pointer transition-colors"
                    >
                      <Send size={14} />
                    </button>
                  </div>
                </div>

                {/* Comments Thread */}
                <div className="space-y-4 pt-2 divide-y divide-slate-850/60">
                  {comments.map((comm) => (
                    <div key={comm._id} className="pt-4 space-y-3">
                      <div className="flex justify-between items-start">
                        <div className="flex gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-white text-[10px]">
                            {comm.user?.firstName?.substring(0, 1)}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-white text-[11px]">{comm.user?.firstName} {comm.user?.lastName}</span>
                              <span className="text-[8px] bg-slate-800 text-slate-400 border border-slate-750 px-1.5 rounded uppercase font-semibold">
                                {comm.user?.role}
                              </span>
                            </div>
                            <p className="text-[11.5px] text-slate-300 mt-1 leading-relaxed">{comm.comment}</p>
                          </div>
                        </div>
                        <span className="text-[9px] text-slate-500">{new Date(comm.createdAt).toLocaleDateString()}</span>
                      </div>

                      {/* Nested Replies Timeline */}
                      {comm.replies && comm.replies.length > 0 && (
                        <div className="pl-9 space-y-3 border-l-2 border-slate-850 ml-3.5">
                          {comm.replies.map(rep => (
                            <div key={rep._id} className="flex gap-2">
                              <div className="w-5 h-5 rounded-full bg-slate-850 border border-slate-750 flex items-center justify-center font-bold text-white text-[8px]">
                                {rep.user?.firstName?.substring(0, 1)}
                              </div>
                              <div className="flex-grow">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-white text-[10px]">{rep.user?.firstName} {rep.user?.lastName}</span>
                                  <span className="text-[7px] bg-slate-800 text-slate-400 px-1 rounded uppercase font-semibold">
                                    {rep.user?.role}
                                  </span>
                                  <span className="text-[8px] text-slate-500 ml-auto">{new Date(rep.createdAt).toLocaleDateString()}</span>
                                </div>
                                <p className="text-[10px] text-slate-350 mt-0.5">{rep.reply}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Reply field triggers */}
                      <div className="pl-9 ml-3.5">
                        {activeReplyBox === comm._id ? (
                          <div className="flex gap-2 mt-2">
                            <input
                              type="text"
                              value={replyTextMap[comm._id] || ''}
                              onChange={(e) => setReplyTextMap(prev => ({ ...prev, [comm._id]: e.target.value }))}
                              placeholder="Write a reply..."
                              className="flex-grow px-2 py-1.5 bg-slate-950/60 border border-slate-850 rounded text-[10.5px] text-white focus:outline-none focus:border-gold/60"
                            />
                            <button
                              onClick={() => handlePostReply(comm._id)}
                              className="bg-gold hover:bg-gold-light text-slate-dark px-3 rounded text-[9px] font-bold uppercase transition-colors cursor-pointer"
                            >
                              Reply
                            </button>
                            <button
                              onClick={() => setActiveReplyBox(null)}
                              className="bg-slate-850 hover:bg-slate-850 text-slate-400 px-2 rounded text-[9px] cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setActiveReplyBox(comm._id)}
                            className="text-[9px] text-slate-400 hover:text-gold flex items-center gap-1 mt-1 font-semibold uppercase tracking-wider cursor-pointer"
                          >
                            <CornerDownRight size={10} /> Reply to this question
                          </button>
                        )}
                      </div>

                    </div>
                  ))}
                </div>

              </div>

            </div>

            {/* Right Column: Lessons Checklist & Assessments */}
            <div className="hidden lg:block space-y-6">
              
              {/* Modules list panel */}
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-5 space-y-4">
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">Lesson Modules</h3>
                  <p className="text-[9px] text-slate-500 mt-0.5">Complete all lessons to unlock final compliance quiz.</p>
                </div>

                <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                  {selectedCourse.modules.map((mod, idx) => {
                    const isCompleted = watchHistories[selectedCourse._id]?.completedModules?.includes(idx);
                    const isActive = activeModuleIndex === idx && !quizActive;

                    return (
                      <div
                        key={idx}
                        onClick={() => { setQuizActive(false); setActiveModuleIndex(idx); }}
                        className={`p-3 rounded-lg border cursor-pointer transition-all flex items-start justify-between gap-3 ${
                          isActive
                            ? 'bg-gold/10 border-gold/40 text-white'
                            : 'bg-slate-950/40 border-slate-850 text-slate-400 hover:border-slate-750'
                        }`}
                      >
                        <div className="flex gap-2">
                          <div className="mt-0.5">
                            {isCompleted ? (
                              <CheckCircle2 size={12} className="text-green-500" />
                            ) : (
                              <Play size={12} className={isActive ? 'text-gold' : 'text-slate-500'} />
                            )}
                          </div>
                          <div>
                            <div className={`text-[10px] font-bold uppercase ${isActive ? 'text-gold' : 'text-slate-400'}`}>
                              Module {idx + 1}
                            </div>
                            <div className="text-[11px] font-medium text-white line-clamp-1 mt-0.5">{mod.title}</div>
                          </div>
                        </div>
                        <span className="text-[8px] bg-slate-900 px-1 py-0.5 text-slate-500 rounded uppercase">
                          {mod.duration || 0}m
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Assessment Panel Trigger */}
              {selectedCourse.isCertificationEnabled !== false && (
                <div className="glass-panel border border-slate-800/80 rounded-xl p-5 space-y-4 text-center">
                  <Award size={36} className="text-gold mx-auto" />
                  <div>
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">Course Certification</h3>
                    <p className="text-[10px] text-slate-500 mt-1 max-w-[200px] mx-auto leading-relaxed">
                      Completing all video lessons unlocks the mandatory score quiz for issuing official credentials.
                    </p>
                  </div>

                  {/* Unlock details indicator */}
                  {(() => {
                    const complCount = watchHistories[selectedCourse._id]?.completedModules?.length || 0;
                    const totalCount = selectedCourse.modules.length;
                    const allDone = complCount >= totalCount;

                    return allDone ? (
                      <button
                        onClick={handleOpenQuiz}
                        className="w-full bg-gold hover:bg-gold-light text-slate-dark font-bold py-2 rounded-xl text-[10px] uppercase tracking-wider transition-colors cursor-pointer"
                      >
                        Start Assessment Quiz
                      </button>
                    ) : (
                      <div className="w-full bg-slate-950 border border-slate-850/80 p-3 rounded-lg text-slate-500 text-[10px] flex items-center justify-between">
                        <span>Modules complete:</span>
                        <span className="font-bold text-gold font-mono">{complCount} / {totalCount}</span>
                      </div>
                    );
                  })()}
                </div>
              )}

            </div>

          </div>

        </div>
      )}

      {/* ADMIN: Create/Edit Course Popup Modal */}
      {isCourseModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex justify-center items-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl p-6 space-y-6 max-h-[90vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                {editingCourseId ? 'Modify Hospitality Course' : 'Create New Compliance Course'}
              </h2>
              <button onClick={() => setIsCourseModalOpen(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveCourse} className="space-y-6">
              
              {/* Upload Mode Selector (Single YouTube Video vs Multi-Module Playlist) */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-950/40 p-4 rounded-xl border border-slate-850">
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">Course Format</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">Choose how you want to upload this training program.</p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsSingleVideo(true)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border cursor-pointer ${
                      isSingleVideo
                        ? 'bg-gold text-slate-dark border-gold shadow-md shadow-gold/10'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white hover:border-slate-700'
                    }`}
                  >
                    Single YouTube/Video Lesson
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsSingleVideo(false)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border cursor-pointer ${
                      !isSingleVideo
                        ? 'bg-gold text-slate-dark border-gold shadow-md shadow-gold/10'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white hover:border-slate-700'
                    }`}
                  >
                    Multi-Module Playlist Course
                  </button>
                </div>
              </div>

              {/* Form Row 1 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Course Title</label>
                  <input
                    type="text"
                    required
                    value={courseForm.title}
                    onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-850 rounded text-xs text-white focus:outline-none focus:border-gold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Department</label>
                  <select
                    value={courseForm.department}
                    onChange={(e) => setCourseForm({ ...courseForm, department: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-850 rounded text-xs text-white focus:outline-none focus:border-gold"
                  >
                    {departmentsList.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Category</label>
                  <select
                    value={courseForm.category}
                    onChange={(e) => setCourseForm({ ...courseForm, category: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-850 rounded text-xs text-white focus:outline-none focus:border-gold"
                  >
                    {categoriesList.filter(c => c !== 'All').map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Form Row 2 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Instructor Name</label>
                  <input
                    type="text"
                    value={courseForm.instructorName}
                    onChange={(e) => setCourseForm({ ...courseForm, instructorName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-850 rounded text-xs text-white focus:outline-none focus:border-gold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Difficulty Level</label>
                  <select
                    value={courseForm.difficultyLevel}
                    onChange={(e) => setCourseForm({ ...courseForm, difficultyLevel: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-850 rounded text-xs text-white focus:outline-none focus:border-gold"
                  >
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Thumbnail Image URL</label>
                  <input
                    type="text"
                    placeholder="https://example.com/thumbnail.jpg"
                    value={courseForm.thumbnailUrl}
                    onChange={(e) => setCourseForm({ ...courseForm, thumbnailUrl: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-850 rounded text-xs text-white focus:outline-none focus:border-gold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Course Description</label>
                <textarea
                  required
                  rows={2}
                  value={courseForm.description}
                  onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-850 rounded text-xs text-white focus:outline-none focus:border-gold resize-none"
                />
              </div>

              {/* Single Video Mode Inputs */}
              {isSingleVideo && (
                <div className="border border-slate-800 p-4 rounded-xl space-y-4 bg-slate-950/20">
                  <div className="flex items-center gap-2 border-b border-slate-850 pb-2">
                    <Play className="text-gold" size={14} />
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">YouTube / Video Streaming Details</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">YouTube / Video Link</label>
                      <input
                        type="text"
                        required={isSingleVideo}
                        placeholder="e.g. https://www.youtube.com/watch?v=dQw4w9WgXcQ or MP4 link"
                        value={singleVideoUrl}
                        onChange={(e) => setSingleVideoUrl(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-850 rounded text-xs text-white focus:outline-none focus:border-gold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Video Source Type</label>
                      <select
                        value={singleVideoType}
                        onChange={(e) => setSingleVideoType(e.target.value as any)}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-850 rounded text-xs text-white focus:outline-none focus:border-gold"
                      >
                        <option value="youtube">YouTube URL</option>
                        <option value="mp4">Direct MP4 Video Link</option>
                        <option value="vimeo">Vimeo URL</option>
                        <option value="doc">Text Document Content</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Video Duration (Minutes)</label>
                      <input
                        type="number"
                        min={0}
                        required={isSingleVideo}
                        value={singleVideoDuration || ''}
                        onChange={(e) => setSingleVideoDuration(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-850 rounded text-xs text-white focus:outline-none focus:border-gold"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Multi-Module Mode Dynamic Chapters Manager */}
              {!isSingleVideo && (
                <div className="border border-slate-800 p-4 rounded-xl space-y-4 bg-slate-950/20">
                  <div className="flex justify-between items-center border-b border-slate-850 pb-2">
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">LMS Video Chapters / Modules</h3>
                    <span className="text-[10px] text-slate-500 font-bold">{formModules.length} Modules added</span>
                  </div>

                  {/* Modules list */}
                  {formModules.length > 0 && (
                    <div className="space-y-2">
                      {formModules.map((mod, idx) => (
                        <div key={idx} className="flex justify-between items-center p-2.5 bg-slate-950 border border-slate-850 rounded text-xs text-white">
                          <div>
                            <span className="font-bold text-gold mr-2">Module {idx + 1}:</span>
                            <span>{mod.title}</span>
                            <span className="text-[10px] text-slate-500 ml-2">({mod.videoType} &bull; {mod.duration || 0}m)</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveModule(idx)}
                            className="text-slate-400 hover:text-red-400"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Module Adder */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
                    <div>
                      <input
                        type="text"
                        placeholder="Chapter Title"
                        value={newModule.title}
                        onChange={(e) => setNewModule({ ...newModule, title: e.target.value })}
                        className="w-full px-2 py-1.5 bg-slate-950 border border-slate-850 rounded text-[11px] text-white focus:outline-none"
                      />
                    </div>
                    <div className="lg:col-span-2">
                      <input
                        type="text"
                        placeholder="Video Embed URL (MP4 / YouTube / Vimeo)"
                        value={newModule.videoUrl}
                        onChange={(e) => setNewModule({ ...newModule, videoUrl: e.target.value })}
                        className="w-full px-2 py-1.5 bg-slate-950 border border-slate-850 rounded text-[11px] text-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <select
                        value={newModule.videoType}
                        onChange={(e) => setNewModule({ ...newModule, videoType: e.target.value as any })}
                        className="w-full px-2 py-1.5 bg-slate-950 border border-slate-850 rounded text-[11px] text-white focus:outline-none"
                      >
                        <option value="mp4">Format: MP4 File</option>
                        <option value="youtube">Format: YouTube</option>
                        <option value="vimeo">Format: Vimeo</option>
                        <option value="doc">Format: Text Doc</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <textarea
                      placeholder="Chapter Text content notes..."
                      value={newModule.content}
                      onChange={(e) => setNewModule({ ...newModule, content: e.target.value })}
                      className="w-full px-2 py-1.5 bg-slate-950 border border-slate-850 rounded text-[11px] text-white focus:outline-none resize-none"
                      rows={1}
                    />
                    <input
                      type="number"
                      placeholder="Mins"
                      value={newModule.duration || ''}
                      onChange={(e) => setNewModule({ ...newModule, duration: Number(e.target.value) })}
                      className="w-20 px-2 py-1.5 bg-slate-950 border border-slate-850 rounded text-[11px] text-white focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleAddModule}
                      className="bg-gold hover:bg-gold-light text-slate-dark font-bold px-3 rounded text-[10px] uppercase cursor-pointer"
                    >
                      Add
                    </button>
                  </div>
                </div>
              )}

              {/* Dynamic Assessment Builder */}
              {courseForm.isCertificationEnabled && (
                <div className="border border-slate-800 p-4 rounded-xl space-y-4 bg-slate-950/20">
                  <div className="flex justify-between items-center border-b border-slate-850 pb-2">
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider font-semibold">Certification Exam Builder</h3>
                    <span className="text-[10px] text-slate-500 font-bold">{formQuestions.length} Questions added</span>
                  </div>

                  {/* Questions list */}
                  {formQuestions.length > 0 && (
                    <div className="space-y-2">
                      {formQuestions.map((q, idx) => (
                        <div key={idx} className="flex justify-between items-center p-2.5 bg-slate-950 border border-slate-850 rounded text-xs text-white">
                          <div className="truncate max-w-[650px]">
                            <span className="font-bold text-gold mr-2">Q{idx + 1}:</span>
                            <span>{q.question}</span>
                            <span className="text-[10px] text-green-400 ml-2 font-mono">(Ans Key: {q.answerIndex})</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveQuestion(idx)}
                            className="text-slate-400 hover:text-red-400"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Question Adder */}
                  <div className="space-y-3 pt-2">
                    <input
                      type="text"
                      placeholder="Enter Quiz Question Statement"
                      value={newQuestion.question}
                      onChange={(e) => setNewQuestion({ ...newQuestion, question: e.target.value })}
                      className="w-full px-2 py-1.5 bg-slate-950 border border-slate-850 rounded text-[11px] text-white focus:outline-none"
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {newQuestion.options.map((opt, oIdx) => (
                        <input
                          key={oIdx}
                          type="text"
                          placeholder={`Option ${oIdx + 1}`}
                          value={opt}
                          onChange={(e) => {
                            const newOpts = [...newQuestion.options];
                            newOpts[oIdx] = e.target.value;
                            setNewQuestion({ ...newQuestion, options: newOpts });
                          }}
                          className="w-full px-2 py-1.5 bg-slate-950 border border-slate-850 rounded text-[11px] text-white focus:outline-none"
                        />
                      ))}
                    </div>

                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-400 uppercase font-semibold">Correct Answer Index:</span>
                        <select
                          value={newQuestion.answerIndex}
                          onChange={(e) => setNewQuestion({ ...newQuestion, answerIndex: Number(e.target.value) })}
                          className="px-2 py-1 bg-slate-950 border border-slate-850 rounded text-[10px] text-white focus:outline-none"
                        >
                          <option value={0}>Option 1 is correct</option>
                          <option value={1}>Option 2 is correct</option>
                          <option value={2}>Option 3 is correct</option>
                          <option value={3}>Option 4 is correct</option>
                        </select>
                      </div>
                      <button
                        type="button"
                        onClick={handleAddQuestion}
                        className="bg-gold hover:bg-gold-light text-slate-dark font-bold px-3 py-1.5 rounded text-[10px] uppercase cursor-pointer"
                      >
                        Add Question
                      </button>
                    </div>
                  </div>

                </div>
              )}

              {/* Attachments Builder */}
              <div className="border border-slate-800 p-4 rounded-xl space-y-4 bg-slate-950/20">
                <div className="flex justify-between items-center border-b border-slate-850 pb-2">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">Lesson Attachments</h3>
                </div>

                {courseForm.attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {courseForm.attachments.map((file, idx) => (
                      <span key={idx} className="bg-slate-950 border border-slate-850 px-2.5 py-1 rounded text-[10px] text-slate-350 flex items-center gap-1.5">
                        <span>{file.name} ({file.fileType})</span>
                        <button type="button" onClick={() => handleRemoveAttachment(idx)} className="text-red-400 hover:text-red-300">
                          <X size={10} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Attachment Display Name"
                    value={newAttachment.name}
                    onChange={(e) => setNewAttachment({ ...newAttachment, name: e.target.value })}
                    className="flex-grow px-2 py-1.5 bg-slate-950 border border-slate-850 rounded text-[11px] text-white focus:outline-none"
                  />
                  <input
                    type="text"
                    placeholder="File URL / Path"
                    value={newAttachment.fileUrl}
                    onChange={(e) => setNewAttachment({ ...newAttachment, fileUrl: e.target.value })}
                    className="flex-grow px-2 py-1.5 bg-slate-950 border border-slate-850 rounded text-[11px] text-white focus:outline-none"
                  />
                  <select
                    value={newAttachment.fileType}
                    onChange={(e) => setNewAttachment({ ...newAttachment, fileType: e.target.value })}
                    className="px-2 py-1.5 bg-slate-950 border border-slate-850 rounded text-[11px] text-white focus:outline-none"
                  >
                    <option value="PDF">PDF</option>
                    <option value="XLS">Spreadsheet</option>
                    <option value="DOC">Word Doc</option>
                  </select>
                  <button
                    type="button"
                    onClick={handleAddAttachment}
                    className="bg-gold hover:bg-gold-light text-slate-dark font-bold px-3 rounded text-[10px] uppercase cursor-pointer"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex justify-between items-center border-t border-slate-800 pt-4">
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 text-xs text-slate-400">
                    <input
                      type="checkbox"
                      checked={courseForm.isCertificationEnabled}
                      onChange={(e) => setCourseForm({ ...courseForm, isCertificationEnabled: e.target.checked })}
                      className="rounded border-slate-800 bg-slate-950 text-gold"
                    />
                    Enable quiz certificate
                  </label>

                  <select
                    value={courseForm.publishStatus}
                    onChange={(e) => setCourseForm({ ...courseForm, publishStatus: e.target.value as any })}
                    className="ml-3 px-2 py-1 bg-slate-950 border border-slate-850 rounded text-[11px] text-white focus:outline-none"
                  >
                    <option value="Published">Publish Immediately</option>
                    <option value="Draft">Draft Mode</option>
                  </select>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsCourseModalOpen(false)}
                    className="bg-slate-950 border border-slate-850 hover:bg-slate-850 px-4 py-2 rounded-xl text-xs text-white uppercase font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-gold hover:bg-gold-light text-slate-dark px-5 py-2 rounded-xl text-xs uppercase font-bold"
                  >
                    Save Course
                  </button>
                </div>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* MANAGER: Assign Training Program Modal Popup */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-6">
            
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">Delegate LMS Training</h2>
              <button onClick={() => setIsAssignModalOpen(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveAssignment} className="space-y-4">
              
              <div>
                <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Target Group Type</label>
                <select
                  value={assignForm.targetType}
                  onChange={(e) => setAssignForm({ ...assignForm, targetType: e.target.value as any })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-850 rounded text-xs text-white focus:outline-none"
                >
                  <option value="Employee">Specific Staff Member</option>
                  <option value="Department">Entire Department Group</option>
                  {user?.role === 'ROOT_ADMIN' && <option value="Hotel">All Employees (Hotel-wide)</option>}
                </select>
              </div>

              {/* Target specific employees dropdown */}
              {assignForm.targetType === 'Employee' && (
                <div>
                  <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Select Employee</label>
                  <select
                    required
                    value={assignForm.targetEmployeeId}
                    onChange={(e) => setAssignForm({ ...assignForm, targetEmployeeId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-850 rounded text-xs text-white focus:outline-none"
                  >
                    <option value="">-- Choose Staff member --</option>
                    {employees.map(e => (
                      <option key={e._id} value={e._id}>{e.firstName} {e.lastName} ({e.department || 'No Dept'})</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Target Department dropdown */}
              {assignForm.targetType === 'Department' && (
                <div>
                  <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Select Department</label>
                  <select
                    required
                    value={assignForm.targetDepartment}
                    onChange={(e) => setAssignForm({ ...assignForm, targetDepartment: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-850 rounded text-xs text-white focus:outline-none"
                  >
                    <option value="">-- Choose Department --</option>
                    {departmentsList.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Target Hotel dropdown (Root Admin only) */}
              {assignForm.targetType === 'Hotel' && (
                <div>
                  <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Select Hotel Branch</label>
                  <select
                    required
                    value={assignForm.targetHotelId}
                    onChange={(e) => setAssignForm({ ...assignForm, targetHotelId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-850 rounded text-xs text-white focus:outline-none"
                  >
                    <option value="">-- Choose Hotel --</option>
                    {hotels.map(h => (
                      <option key={h._id || h.id} value={h._id || h.id}>{h.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Completion Due Date</label>
                <input
                  type="date"
                  required
                  value={assignForm.dueDate}
                  onChange={(e) => setAssignForm({ ...assignForm, dueDate: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-850 rounded text-xs text-white focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(false)}
                  className="bg-slate-955 border border-slate-850 hover:bg-slate-850 px-4 py-2 rounded-xl text-xs text-white uppercase font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-gold hover:bg-gold-light text-slate-dark px-5 py-2 rounded-xl text-xs uppercase font-bold"
                >
                  Deploy Assignment
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}
