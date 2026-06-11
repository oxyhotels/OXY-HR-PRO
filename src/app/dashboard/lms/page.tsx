'use client';

import React, { useState } from 'react';
import { BookOpen, Award, CheckCircle2, Play, ChevronRight, GraduationCap, ArrowRight, ShieldAlert } from 'lucide-react';

interface Module {
  title: string;
  videoUrl: string;
  content: string;
}

interface Course {
  id: string;
  title: string;
  description: string;
  department: string;
  modules: Module[];
  questions?: { question: string; options: string[] }[];
}

const mockCourses: Course[] = [
  {
    id: 'c1',
    title: 'Hospitality Excellence & Guest Relations',
    description: 'Master premium customer interaction, active listening, and hotel guest engagement standards.',
    department: 'Front Office',
    modules: [
      { title: 'Understanding Guest Journeys', videoUrl: 'https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_1mb.mp4', content: 'Learn the key milestones of a guest stay, from booking to check-out and review tracking.' },
      { title: 'De-escalating Customer Complaints', videoUrl: 'https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_1mb.mp4', content: 'Strategies for handling unhappy guests, providing instant service recovery, and logging audits.' }
    ],
    questions: [
      { question: 'What is the first step in de-escalating a guest complaint?', options: ['Offer a discount immediately', 'Listen actively without interrupting', 'Argue and defend policy', 'Refer to Root Admin'] },
      { question: 'Which department primarily handles guest check-in services?', options: ['Housekeeping', 'IT Services', 'Front Office', 'Finance'] }
    ]
  },
  {
    id: 'c2',
    title: 'Sanitation Standards & HACCP Hygiene Protocols',
    description: 'Essential compliance protocols for food safety, kitchen sterilization, and water hygiene checks.',
    department: 'Kitchen',
    modules: [
      { title: 'HACCP Temperature Controls', videoUrl: 'https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_1mb.mp4', content: 'Learn the strict critical temperature boundaries for hot and cold food storage systems.' }
    ]
  }
];

export default function LmsPage() {
  const [courses] = useState<Course[]>(mockCourses);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [activeModuleIndex, setActiveModuleIndex] = useState<number>(0);
  const [quizActive, setQuizActive] = useState<boolean>(false);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [quizResult, setQuizResult] = useState<{ score: number; passed: boolean } | null>(null);

  const handleSelectCourse = (course: Course) => {
    setSelectedCourse(course);
    setActiveModuleIndex(0);
    setQuizActive(false);
    setQuizAnswers({});
    setQuizResult(null);
  };

  const handleSelectAnswer = (qIdx: number, optIdx: number) => {
    setQuizAnswers(prev => ({ ...prev, [qIdx]: optIdx }));
  };

  const handleSubmitQuiz = () => {
    if (!selectedCourse?.questions) return;
    // Simple mock calculation: assume index 1 for Q1 and index 2 for Q2 are correct
    let correctCount = 0;
    selectedCourse.questions.forEach((q, idx) => {
      const expectedAns = idx === 0 ? 1 : 2; // Mock correct answers: index 1 and index 2
      if (quizAnswers[idx] === expectedAns) {
        correctCount++;
      }
    });

    const score = Math.round((correctCount / selectedCourse.questions.length) * 100);
    setQuizResult({ score, passed: score >= 70 });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <GraduationCap className="text-gold" size={24} />
          Learning Management System (LMS)
        </h1>
        <p className="text-slate-400 text-xs mt-1">Enhance your hospitality skills and get certified in OXY brand standards.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Courses Index */}
        <div className="space-y-4">
          <h2 className="text-xs font-bold text-gold uppercase tracking-wider mb-2">Available Certifications</h2>
          {courses.map(course => (
            <div
              key={course.id}
              onClick={() => handleSelectCourse(course)}
              className={`glass-panel border p-5 rounded-xl cursor-pointer transition-all hover:-translate-y-0.5 ${
                selectedCourse?.id === course.id
                  ? 'border-gold/60 gold-glow bg-gold/5'
                  : 'border-slate-800/80 hover:border-gold/30 bg-card-dark'
              }`}
            >
              <div className="flex justify-between items-start">
                <span className="bg-slate-850 text-slate-350 border border-slate-750 px-2 py-0.5 rounded text-[9px] uppercase font-semibold">
                  {course.department}
                </span>
                <BookOpen size={16} className="text-slate-400" />
              </div>
              <h3 className="font-bold text-white text-xs mt-3 leading-snug">{course.title}</h3>
              <p className="text-[10px] text-slate-400 mt-2 line-clamp-2">{course.description}</p>
              <div className="mt-4 flex items-center justify-between text-[9px] text-gold font-bold uppercase tracking-wider pt-2 border-t border-slate-850">
                <span>{course.modules.length} modules</span>
                <span className="flex items-center gap-0.5">Start Study <ChevronRight size={10} /></span>
              </div>
            </div>
          ))}
        </div>

        {/* Right Columns: Video Course Viewer / Quiz */}
        <div className="lg:col-span-2 space-y-6">
          {selectedCourse ? (
            <div className="bg-card-dark border border-slate-800/80 rounded-xl p-6 space-y-6">
              <div className="flex justify-between items-center border-b border-slate-800/60 pb-4">
                <div>
                  <h2 className="text-sm font-bold text-white">{selectedCourse.title}</h2>
                  <p className="text-[10px] text-slate-400 mt-0.5">Completing modules unlocks the final certification assessment.</p>
                </div>
                {selectedCourse.questions && (
                  <button
                    onClick={() => setQuizActive(true)}
                    className="bg-gold hover:bg-gold-light text-slate-dark font-bold px-3 py-1.5 rounded-lg text-[10px] flex items-center gap-1 uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    <Award size={12} />
                    Final Exam
                  </button>
                )}
              </div>

              {!quizActive ? (
                <div className="space-y-6">
                  {/* Module Selector tabs */}
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {selectedCourse.modules.map((m, idx) => (
                      <button
                        key={idx}
                        onClick={() => setActiveModuleIndex(idx)}
                        className={`px-3 py-1.5 rounded text-[10px] font-semibold border transition-all cursor-pointer ${
                          activeModuleIndex === idx
                            ? 'bg-slate-800 text-white border-gold/40'
                            : 'bg-slate-950/40 text-slate-500 border-transparent hover:text-slate-300'
                        }`}
                      >
                        Module {idx + 1}: {m.title}
                      </button>
                    ))}
                  </div>

                  {/* Video Mock/Loader */}
                  <div className="aspect-video bg-slate-950 rounded-xl border border-slate-850 flex flex-col items-center justify-center relative overflow-hidden group">
                    <video 
                      src={selectedCourse.modules[activeModuleIndex].videoUrl} 
                      className="absolute inset-0 w-full h-full object-cover opacity-30" 
                      controls 
                    />
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-10 pointer-events-none group-hover:opacity-0 transition-opacity bg-black/40">
                      <div className="p-3.5 bg-gold/15 border border-gold/30 rounded-full text-gold mb-2 animate-pulse">
                        <Play size={20} fill="currentColor" />
                      </div>
                      <span className="text-[10px] uppercase font-bold text-slate-350 tracking-wider">Operational Training Video</span>
                    </div>
                  </div>

                  {/* Module Content info */}
                  <div className="bg-slate-950/40 border border-slate-900 rounded-xl p-5">
                    <h3 className="font-bold text-xs text-white flex items-center gap-1.5">
                      <CheckCircle2 className="text-gold" size={14} />
                      {selectedCourse.modules[activeModuleIndex].title}
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                      {selectedCourse.modules[activeModuleIndex].content}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {quizResult ? (
                    <div className="text-center p-8 bg-slate-950/50 border border-slate-900 rounded-xl max-w-sm mx-auto space-y-4">
                      <div className={`mx-auto w-12 h-12 rounded-full border flex items-center justify-center ${
                        quizResult.passed ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-red-500/10 border-red-500/30 text-red-400'
                      }`}>
                        <GraduationCap size={24} />
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-white">
                          {quizResult.passed ? 'Certification Earned!' : 'Assessment Failed'}
                        </h3>
                        <p className="text-[10px] text-slate-400 mt-1">Passing requirement: 70%. Your Score: {quizResult.score}%</p>
                      </div>
                      {quizResult.passed ? (
                        <div className="p-4 bg-gold/5 border border-gold/20 rounded-lg text-left space-y-1.5">
                          <p className="text-[9px] font-bold uppercase tracking-wider text-gold">Official Credential Issued</p>
                          <p className="text-xs font-bold text-slate-200">Certified Guest Specialist</p>
                          <p className="text-[9px] text-slate-500 font-mono">ID: OXY-CERT-{selectedCourse.id.toUpperCase()}</p>
                        </div>
                      ) : (
                        <p className="text-[10px] text-red-400 leading-relaxed">
                          Please review the module lessons again to retake this certification exam.
                        </p>
                      )}
                      <button
                        onClick={() => {
                          setQuizActive(false);
                          setQuizResult(null);
                        }}
                        className="w-full bg-slate-800 hover:bg-slate-755 border border-slate-700 text-white font-semibold py-2 rounded-lg text-[10px] uppercase transition-colors cursor-pointer"
                      >
                        Back to Study
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="flex justify-between items-center bg-slate-950/40 p-4 border border-slate-900 rounded-lg text-[10px] text-slate-400">
                        <span>Course: {selectedCourse.title}</span>
                        <span>Questions: {selectedCourse.questions?.length || 0}</span>
                      </div>

                      {selectedCourse.questions?.map((q, qIdx) => (
                        <div key={qIdx} className="space-y-3">
                          <p className="font-bold text-xs text-white">Q{qIdx + 1}. {q.question}</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {q.options.map((opt, optIdx) => (
                              <button
                                key={optIdx}
                                onClick={() => handleSelectAnswer(qIdx, optIdx)}
                                className={`text-left p-3 rounded-lg border text-[10px] transition-all cursor-pointer ${
                                  quizAnswers[qIdx] === optIdx
                                    ? 'bg-gold/10 border-gold text-white font-semibold'
                                    : 'bg-slate-950/20 border-slate-850 text-slate-400 hover:border-slate-700 hover:text-white'
                                }`}
                              >
                                {opt}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}

                      <button
                        onClick={handleSubmitQuiz}
                        disabled={Object.keys(quizAnswers).length < (selectedCourse.questions?.length || 0)}
                        className="w-full bg-gold hover:bg-gold-light disabled:opacity-30 text-slate-dark font-bold py-2.5 rounded-lg text-[10px] flex items-center justify-center gap-1.5 uppercase transition-colors cursor-pointer"
                      >
                        Submit Assessment
                        <ArrowRight size={12} />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center min-h-[40vh] border border-slate-800/80 rounded-xl bg-card-dark/40 p-8 text-center">
              <GraduationCap size={44} className="text-slate-500 mb-3" />
              <h3 className="font-bold text-white text-xs uppercase tracking-wider">Select a Course</h3>
              <p className="text-[10px] text-slate-500 mt-1 max-w-xs leading-relaxed">
                Click on any of the available certification programs on the left to start viewing video modules and test compliance quizzes.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
