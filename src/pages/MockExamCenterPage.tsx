import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  FileQuestion,
  PlayCircle,
  Plus,
  BarChart3,
  BookMarked,
  Search,
  Trash2,
  Edit,
  Clock,
  HelpCircle,
} from 'lucide-react';
import { useProfile } from '../context/ProfileContext';
import type {
  BankQuestion,
  MockExamConfig,
  ExamAttemptRecord,
  ActiveExamSession,
  MistakeNotebookItem,
} from '../types/mockExam';
import {
  getQuestionsForProfile,
  addQuestion,
  updateQuestion,
  deleteQuestion,
  getMockExamsForProfile,
  createMockExam,
  updateMockExam,
  deleteMockExam,
  getActiveExamSession,
  clearActiveExamSession,
  startExamSession,
  gradeAndSubmitExam,
  getAttemptsForProfile,
  getMistakeNotebook,
  removeFromMistakeNotebook,
  toggleMistakeMastered,
  updateMistakeItem,
  calculateExamAnalytics,
} from '../services/mockExamStorage';

import { QuestionManagerModal } from '../components/mockExam/QuestionManagerModal';
import { MockExamBuilderModal } from '../components/mockExam/MockExamBuilderModal';
import { ExamTakingInterface } from '../components/mockExam/ExamTakingInterface';
import { ExamResultView } from '../components/mockExam/ExamResultView';
import { MistakeNotebookCard } from '../components/mockExam/MistakeNotebookCard';
import { PerformanceAnalyticsCard } from '../components/mockExam/PerformanceAnalyticsCard';

type TabType = 'practice' | 'questions' | 'analytics' | 'mistakes';

export const MockExamCenterPage: React.FC = () => {
  const { activeProfile } = useProfile();
  const profileId = activeProfile?.id || 'default';
  const [activeTab, setActiveTab] = useState<TabType>('practice');

  // Core Data States
  const [questions, setQuestions] = useState<BankQuestion[]>([]);
  const [mockExams, setMockExams] = useState<MockExamConfig[]>([]);
  const [attempts, setAttempts] = useState<ExamAttemptRecord[]>([]);
  const [mistakes, setMistakes] = useState<MistakeNotebookItem[]>([]);
  const [activeSession, setActiveSession] = useState<ActiveExamSession | null>(null);

  // Active View States
  const [selectedAttemptForView, setSelectedAttemptForView] = useState<ExamAttemptRecord | null>(
    null
  );

  // Modals
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState<boolean>(false);
  const [editingQuestion, setEditingQuestion] = useState<BankQuestion | null>(null);

  const [isExamModalOpen, setIsExamModalOpen] = useState<boolean>(false);
  const [editingExam, setEditingExam] = useState<MockExamConfig | null>(null);

  // Search & Filters in Question Bank Tab
  const [questionSearch, setQuestionSearch] = useState<string>('');
  const [questionSubjectFilter, setQuestionSubjectFilter] = useState<string>('all');
  const [questionTypeFilter, setQuestionTypeFilter] = useState<string>('all');

  // Load Data
  const loadProfileData = useCallback(() => {
    setQuestions(getQuestionsForProfile(profileId));
    setMockExams(getMockExamsForProfile(profileId));
    setAttempts(getAttemptsForProfile(profileId));
    setMistakes(getMistakeNotebook(profileId));
    setActiveSession(getActiveExamSession(profileId));
  }, [profileId]);

  useEffect(() => {
    loadProfileData();

    const handleProfileChange = () => {
      loadProfileData();
    };

    window.addEventListener('active-profile-changed', handleProfileChange);
    window.addEventListener('student-profile-updated', handleProfileChange);
    window.addEventListener('storage', handleProfileChange);

    return () => {
      window.removeEventListener('active-profile-changed', handleProfileChange);
      window.removeEventListener('student-profile-updated', handleProfileChange);
      window.removeEventListener('storage', handleProfileChange);
    };
  }, [loadProfileData]);

  // Derived distinct subjects from question bank
  const distinctSubjects = useMemo(() => {
    const s = new Set<string>();
    questions.forEach((q) => s.add(q.subjectName));
    return Array.from(s).sort();
  }, [questions]);

  // Analytics
  const analytics = useMemo(() => {
    return calculateExamAnalytics(attempts, questions);
  }, [attempts, questions]);

  // Filtered Question Bank
  const filteredQuestions = useMemo(() => {
    return questions.filter((q) => {
      if (questionSubjectFilter !== 'all' && q.subjectName !== questionSubjectFilter) return false;
      if (questionTypeFilter !== 'all' && q.type !== questionTypeFilter) return false;
      if (questionSearch.trim()) {
        const query = questionSearch.toLowerCase();
        const matchesText = q.questionText.toLowerCase().includes(query);
        const matchesSubj = q.subjectName.toLowerCase().includes(query);
        const matchesTopic = q.unitOrTopic.toLowerCase().includes(query);
        if (!matchesText && !matchesSubj && !matchesTopic) return false;
      }
      return true;
    });
  }, [questions, questionSubjectFilter, questionTypeFilter, questionSearch]);

  // Question Bank Actions
  const handleSaveQuestion = (
    data: Omit<BankQuestion, 'id' | 'profileId' | 'createdAt' | 'updatedAt'>
  ) => {
    if (editingQuestion) {
      updateQuestion(profileId, editingQuestion.id, data);
    } else {
      addQuestion(profileId, data);
    }
    setQuestions(getQuestionsForProfile(profileId));
    setEditingQuestion(null);
  };

  const handleDeleteQuestion = (id: string) => {
    if (window.confirm('Are you sure you want to delete this question?')) {
      deleteQuestion(profileId, id);
      setQuestions(getQuestionsForProfile(profileId));
    }
  };

  // Mock Exam Config Actions
  const handleSaveMockExam = (
    data: Omit<MockExamConfig, 'id' | 'profileId' | 'createdAt' | 'updatedAt'>
  ) => {
    if (editingExam) {
      updateMockExam(profileId, editingExam.id, data);
    } else {
      createMockExam(profileId, data);
    }
    setMockExams(getMockExamsForProfile(profileId));
    setEditingExam(null);
  };

  const handleDeleteMockExam = (id: string) => {
    if (window.confirm('Delete this mock exam configuration?')) {
      deleteMockExam(profileId, id);
      setMockExams(getMockExamsForProfile(profileId));
    }
  };

  // Exam-Taking Actions
  const handleStartExam = (config: MockExamConfig) => {
    const selectedQ = questions.filter((q) => config.questionIds.includes(q.id));
    if (selectedQ.length === 0) {
      alert('Selected questions for this exam are no longer in the question bank.');
      return;
    }

    const newSession = startExamSession(profileId, config, selectedQ);
    setActiveSession(newSession);
    setSelectedAttemptForView(null);
  };

  const handleSubmitActiveExam = (finalSession: ActiveExamSession) => {
    const record = gradeAndSubmitExam(finalSession);
    setActiveSession(null);
    setAttempts(getAttemptsForProfile(profileId));
    setSelectedAttemptForView(record);
  };

  const handleDiscardOngoingSession = () => {
    if (
      window.confirm(
        'Discard ongoing practice attempt? Your current unsaved progress will be cleared.'
      )
    ) {
      clearActiveExamSession(profileId);
      setActiveSession(null);
    }
  };

  // Practice mistakes shortcut
  const handlePracticeMistakes = (mistakeQuestions: BankQuestion[]) => {
    if (mistakeQuestions.length === 0) return;
    const tempConfig: MockExamConfig = {
      id: `temp_mistake_${Date.now()}`,
      profileId,
      title: 'Mistake Notebook Practice Session',
      durationMinutes: Math.max(10, mistakeQuestions.length * 2),
      totalMarks: mistakeQuestions.reduce((acc, q) => acc + q.marks, 0),
      subjects: Array.from(new Set(mistakeQuestions.map((q) => q.subjectName))),
      questionIds: mistakeQuestions.map((q) => q.id),
      enableNegativeMarking: false,
      negativeMarkingValue: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    const session = startExamSession(profileId, tempConfig, mistakeQuestions);
    setActiveSession(session);
    setSelectedAttemptForView(null);
  };

  // Mistake Notebook Actions
  const handleToggleMastered = (itemId: string, isMastered?: boolean) => {
    toggleMistakeMastered(profileId, itemId, isMastered);
    setMistakes(getMistakeNotebook(profileId));
  };

  const handleRemoveMistake = (itemId: string) => {
    removeFromMistakeNotebook(profileId, itemId);
    setMistakes(getMistakeNotebook(profileId));
  };

  const handleUpdateMistakeNotes = (itemId: string, notes: string) => {
    updateMistakeItem(profileId, itemId, { personalNotes: notes });
    setMistakes(getMistakeNotebook(profileId));
  };

  // If currently taking an exam, show the full screen simulation interface
  if (activeSession) {
    return (
      <ExamTakingInterface
        session={activeSession}
        onSubmitExam={handleSubmitActiveExam}
        onExitWithoutSubmitting={() => {
          setActiveSession(null);
          loadProfileData();
        }}
      />
    );
  }

  // If viewing a completed attempt report
  if (selectedAttemptForView) {
    return (
      <div className="apple-page-enter flex flex-col gap-6 w-full print:hidden">
        <ExamResultView
          attempt={selectedAttemptForView}
          onBackToCenter={() => setSelectedAttemptForView(null)}
          onRetakeExam={(configId) => {
            const config = mockExams.find((e) => e.id === configId);
            if (config) {
              handleStartExam(config);
            }
          }}
          onAttemptUpdated={(updated) => {
            setSelectedAttemptForView(updated);
            setAttempts(getAttemptsForProfile(profileId));
          }}
        />
      </div>
    );
  }

  return (
    <div className="apple-page-enter flex flex-col gap-6 w-full print:hidden">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border-secondary)]">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <FileQuestion className="w-5 h-5 sm:w-6 sm:h-6" />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)]">
              Question Bank & Mock Exam Center
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1">
            Curate your syllabus question bank, generate timed test simulations, and master weak topics.
          </p>
        </div>

        {/* Quick Stats Pill */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-[11px] text-[var(--text-tertiary)] block uppercase font-medium">Bank Questions</span>
            <span className="text-sm sm:text-base font-bold text-[var(--text-primary)]">
              {questions.length} Saved
            </span>
          </div>
          <div className="h-8 w-px bg-[var(--border-secondary)]" />
          <div className="text-right">
            <span className="text-[11px] text-[var(--text-tertiary)] block uppercase font-medium">Practice Tests</span>
            <span className="text-sm sm:text-base font-bold text-blue-600 dark:text-blue-400">
              {attempts.length} Attempted
            </span>
          </div>
        </div>
      </div>

      {/* Practice Tool Disclaimer Notice */}
      <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
        <HelpCircle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
        <span>
          <strong>Practice Disclaimer:</strong> This Mock Exam Center is an independent student study and revision tool for self-evaluation. It is not an official university examination portal.
        </span>
      </div>

      {/* Active Unfinished Exam Banner, if any */}
      {getActiveExamSession(profileId) && (
        <div className="p-4 bg-[var(--surface)] border border-blue-500/30 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-3">
            <span className="p-2 bg-blue-600 text-white rounded-xl shrink-0">
              <Clock className="w-5 h-5 animate-spin" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-[var(--text-primary)]">
                Unfinished Practice Exam in Progress
              </h3>
              <p className="text-xs text-[var(--text-secondary)]">
                You have an active session for &ldquo;
                {getActiveExamSession(profileId)?.examTitle}&rdquo;.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDiscardOngoingSession}
              className="px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:text-rose-600 font-semibold"
            >
              Discard
            </button>
            <button
              onClick={() => setActiveSession(getActiveExamSession(profileId))}
              className="apple-btn-primary px-4 py-1.5 text-xs font-semibold flex items-center gap-1.5"
            >
              <PlayCircle className="w-4 h-4" />
              <span>Resume Attempt</span>
            </button>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-[var(--surface-sunken)] border border-[var(--border-secondary)] overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab('practice')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition whitespace-nowrap ${
            activeTab === 'practice'
              ? 'bg-[var(--surface)] text-[var(--text-primary)] shadow-sm font-bold'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <PlayCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span>Mock Exams ({mockExams.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('questions')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition whitespace-nowrap ${
            activeTab === 'questions'
              ? 'bg-[var(--surface)] text-[var(--text-primary)] shadow-sm font-bold'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <FileQuestion className="w-4 h-4 text-indigo-500" />
          <span>Question Bank ({questions.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('analytics')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition whitespace-nowrap ${
            activeTab === 'analytics'
              ? 'bg-[var(--surface)] text-[var(--text-primary)] shadow-sm font-bold'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <BarChart3 className="w-4 h-4 text-emerald-500" />
          <span>Analytics</span>
        </button>

        <button
          onClick={() => setActiveTab('mistakes')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition whitespace-nowrap ${
            activeTab === 'mistakes'
              ? 'bg-[var(--surface)] text-[var(--text-primary)] shadow-sm font-bold'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <BookMarked className="w-4 h-4 text-rose-500" />
          <span>Mistakes ({mistakes.filter((m) => !m.isMastered).length})</span>
        </button>
      </div>

      {/* TAB 1: PRACTICE MOCK EXAMS */}
        {activeTab === 'practice' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-gray-900 dark:text-white">
                  Configured Mock Exams
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Timed practice exams created from your saved questions.
                </p>
              </div>

              <button
                onClick={() => {
                  setEditingExam(null);
                  setIsExamModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-500/20 transition self-start sm:self-auto"
              >
                <Plus className="w-4 h-4" />
                <span>Configure New Mock Exam</span>
              </button>
            </div>

            {mockExams.length === 0 ? (
              <div className="p-10 bg-white dark:bg-gray-800 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700 text-center space-y-3">
                <PlayCircle className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto" />
                <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200">
                  No Mock Exams Configured Yet
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
                  {questions.length === 0
                    ? 'Start by adding questions to your Question Bank, then assemble them into practice exams.'
                    : 'Click "Configure New Mock Exam" above to select questions, set exam duration, and start practicing.'}
                </p>
                {questions.length === 0 ? (
                  <button
                    onClick={() => {
                      setEditingQuestion(null);
                      setIsQuestionModalOpen(true);
                    }}
                    className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Questions to Bank</span>
                  </button>
                ) : (
                  <button
                    onClick={() => setIsExamModalOpen(true)}
                    className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create Your First Mock Exam</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {mockExams.map((exam) => {
                  const examAttempts = attempts.filter((a) => a.examConfigId === exam.id);
                  const lastAttempt = examAttempts[0];

                  return (
                    <div
                      key={exam.id}
                      className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-bold text-gray-900 dark:text-white text-base">
                            {exam.title}
                          </h3>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => {
                                setEditingExam(exam);
                                setIsExamModalOpen(true);
                              }}
                              className="p-1 text-gray-400 hover:text-indigo-600 rounded-lg transition"
                              title="Edit exam"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteMockExam(exam.id)}
                              className="p-1 text-gray-400 hover:text-rose-600 rounded-lg transition"
                              title="Delete exam"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {exam.description && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                            {exam.description}
                          </p>
                        )}

                        <div className="flex flex-wrap gap-1.5">
                          {exam.subjects.map((s, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 text-[10px] font-semibold rounded"
                            >
                              {s}
                            </span>
                          ))}
                        </div>

                        {/* Meta Specs */}
                        <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-gray-100 dark:border-gray-700">
                          <div className="text-gray-500 dark:text-gray-400">
                            <span className="font-semibold text-gray-700 dark:text-gray-300">
                              {exam.durationMinutes} mins
                            </span>
                          </div>
                          <div className="text-right text-gray-500 dark:text-gray-400">
                            <span className="font-semibold text-gray-700 dark:text-gray-300">
                              {exam.questionIds.length} Questions
                            </span>{' '}
                            ({exam.totalMarks} Marks)
                          </div>
                        </div>

                        {exam.enableNegativeMarking && (
                          <div className="text-[11px] text-rose-600 dark:text-rose-400 font-medium">
                            Negative Marking: -{exam.negativeMarkingValue} per wrong answer
                          </div>
                        )}
                      </div>

                      {/* Footer & Start Button */}
                      <div className="pt-4 mt-4 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
                        <span className="text-[11px] text-gray-400">
                          {lastAttempt ? (
                            <>
                              Last: <strong className="text-indigo-600">{lastAttempt.percentage}%</strong>
                            </>
                          ) : (
                            'Never attempted'
                          )}
                        </span>

                        <button
                          onClick={() => handleStartExam(exam)}
                          className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm flex items-center gap-1.5 transition"
                        >
                          <PlayCircle className="w-3.5 h-3.5" />
                          <span>Start Exam</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: QUESTION BANK */}
        {activeTab === 'questions' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-gray-900 dark:text-white">
                  Personal Question Bank
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Manage syllabus questions, multiple choice options, and revision keys.
                </p>
              </div>

              <button
                onClick={() => {
                  setEditingQuestion(null);
                  setIsQuestionModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-500/20 transition self-start sm:self-auto"
              >
                <Plus className="w-4 h-4" />
                <span>Add New Question</span>
              </button>
            </div>

            {/* Filter controls */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search questions or units..."
                  value={questionSearch}
                  onChange={(e) => setQuestionSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <select
                value={questionSubjectFilter}
                onChange={(e) => setQuestionSubjectFilter(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="all">All Subjects ({distinctSubjects.length})</option>
                {distinctSubjects.map((s, idx) => (
                  <option key={idx} value={s}>
                    {s}
                  </option>
                ))}
              </select>

              <select
                value={questionTypeFilter}
                onChange={(e) => setQuestionTypeFilter(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="all">All Question Types</option>
                <option value="single_mcq">Single MCQ</option>
                <option value="multiple_mcq">Multiple Choice MCQ</option>
                <option value="true_false">True / False</option>
                <option value="descriptive">Descriptive</option>
              </select>
            </div>

            {/* Questions Table/List */}
            {questions.length === 0 ? (
              <div className="p-10 bg-white dark:bg-gray-800 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700 text-center space-y-3">
                <FileQuestion className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto" />
                <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200">
                  Your Question Bank is Empty
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
                  Add questions from your course syllabus, lecture notes, or textbooks to create
                  practice mock exams.
                </p>
                <button
                  onClick={() => {
                    setEditingQuestion(null);
                    setIsQuestionModalOpen(true);
                  }}
                  className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add First Question</span>
                </button>
              </div>
            ) : filteredQuestions.length === 0 ? (
              <div className="p-6 text-center text-xs text-gray-500 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800">
                No questions found matching your search and filter criteria.
              </div>
            ) : (
              <div className="space-y-3">
                {filteredQuestions.map((q, idx) => (
                  <div
                    key={q.id}
                    className="p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-2 hover:border-gray-300 transition"
                  >
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-400">#{idx + 1}</span>
                        <span className="px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-[11px] font-semibold">
                          {q.subjectName}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {q.unitOrTopic}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 capitalize font-medium">
                          {q.difficulty}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 uppercase font-medium">
                          {q.type.replace('_', ' ')}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                          {q.marks} {q.marks === 1 ? 'Mark' : 'Marks'}
                        </span>
                        <button
                          onClick={() => {
                            setEditingQuestion(q);
                            setIsQuestionModalOpen(true);
                          }}
                          className="p-1 text-gray-400 hover:text-indigo-600 rounded transition"
                          title="Edit Question"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteQuestion(q.id)}
                          className="p-1 text-gray-400 hover:text-rose-600 rounded transition"
                          title="Delete Question"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {q.questionText}
                    </p>

                    {/* MCQ Options Summary */}
                    {(q.type === 'single_mcq' || q.type === 'multiple_mcq') && q.options && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                        {q.options.map((opt, optIdx) => {
                          const isCorrect = q.correctOptionIndices?.includes(optIdx);
                          return (
                            <div
                              key={opt.id || optIdx}
                              className={`px-2.5 py-1 text-xs rounded-lg border flex items-center gap-2 ${
                                isCorrect
                                  ? 'border-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 font-semibold'
                                  : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'
                              }`}
                            >
                              <span className="font-bold">{String.fromCharCode(65 + optIdx)}.</span>
                              <span className="truncate">{opt.text}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* True/False Summary */}
                    {q.type === 'true_false' && (
                      <div className="text-xs text-emerald-700 dark:text-emerald-300 font-semibold pt-1">
                        Answer Key: {q.correctBoolean ? 'True' : 'False'}
                      </div>
                    )}

                    {/* Explanation */}
                    {q.explanation && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 pt-1 italic">
                        <strong>Explanation:</strong> {q.explanation}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: PERFORMANCE ANALYTICS */}
        {activeTab === 'analytics' && (
          <PerformanceAnalyticsCard
            analytics={analytics}
            attempts={attempts}
            onViewAttempt={(attempt) => setSelectedAttemptForView(attempt)}
          />
        )}

        {/* TAB 4: MISTAKE NOTEBOOK */}
        {activeTab === 'mistakes' && (
          <MistakeNotebookCard
            items={mistakes}
            onToggleMastered={handleToggleMastered}
            onRemoveItem={handleRemoveMistake}
            onUpdateNotes={handleUpdateMistakeNotes}
            onPracticeMistakes={handlePracticeMistakes}
          />
        )}

        {/* Question Modal */}
        {isQuestionModalOpen && (
          <QuestionManagerModal
            isOpen={isQuestionModalOpen}
            onClose={() => {
              setIsQuestionModalOpen(false);
              setEditingQuestion(null);
            }}
            onSave={handleSaveQuestion}
            initialQuestion={editingQuestion}
            existingSubjects={distinctSubjects}
          />
        )}

        {/* Mock Exam Builder Modal */}
        {isExamModalOpen && (
          <MockExamBuilderModal
            isOpen={isExamModalOpen}
            onClose={() => {
              setIsExamModalOpen(false);
              setEditingExam(null);
            }}
            onSave={handleSaveMockExam}
            availableQuestions={questions}
            initialConfig={editingExam}
          />
        )}
    </div>
  );
};
