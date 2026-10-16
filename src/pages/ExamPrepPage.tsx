import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  BookOpen,
  Clock,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertTriangle,
  Flame,
} from 'lucide-react';
import { useProfile } from '../context/ProfileContext';
import { useAppToast } from '../components/layout/AppShell';
import type {
  ExamRecord,
  SyllabusTopic,
  StudyScheduleResult,
  ScheduledStudySlot,
  StudySessionLog,
  TopicStatus,
  ExamType,
  ExamDifficulty,
} from '../types/examPrep';
import {
  getExamsForProfile,
  addExam,
  updateExam,
  deleteExam,
  calculateExamCountdowns,
  getSyllabusTopicsForProfile,
  addSyllabusTopic,
  updateSyllabusTopic,
  deleteSyllabusTopic,
  calculateSyllabusProgress,
  getSavedSchedule,
  toggleSlotCompletion,
  getStudySessionsForProfile,
  clearStudySessionsForProfile,
  calculateStudyStats,
} from '../services/examPrepStorage';
import { getPlannedSubjectsForProfile } from '../services/companionStorage';
import { ResetConfirmModal } from '../components/common/ResetConfirmModal';
import { ExamManagerModal } from '../components/examPrep/ExamManagerModal';
import { SyllabusTopicModal } from '../components/examPrep/SyllabusTopicModal';
import { StudyFocusTimer } from '../components/examPrep/StudyFocusTimer';
import { ScheduleGeneratorModal } from '../components/examPrep/ScheduleGeneratorModal';

export const ExamPrepPage: React.FC = () => {
  const { activeProfile } = useProfile();
  const { showToast } = useAppToast();

  const [activeTab, setActiveTab] = useState<'exams' | 'syllabus' | 'timer'>('exams');

  // Core Data
  const [exams, setExams] = useState<ExamRecord[]>([]);
  const [topics, setTopics] = useState<SyllabusTopic[]>([]);
  const [savedSchedule, setSavedSchedule] = useState<StudyScheduleResult | null>(null);
  const [sessions, setSessions] = useState<StudySessionLog[]>([]);

  // Modals
  const [isExamModalOpen, setIsExamModalOpen] = useState(false);
  const [editingExam, setEditingExam] = useState<ExamRecord | null>(null);

  const [isTopicModalOpen, setIsTopicModalOpen] = useState(false);
  const [editingTopic, setEditingTopic] = useState<SyllabusTopic | null>(null);

  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);

  // Deletion confirm
  const [itemToDelete, setItemToDelete] = useState<{
    type: 'exam' | 'topic' | 'sessions';
    id: string;
    title: string;
  } | null>(null);

  // Filter
  const [syllabusSubjectFilter, setSyllabusSubjectFilter] = useState<string>('all');

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // Load known subjects from planned subjects and saved exams
  const knownSubjects = useMemo(() => {
    const fromPlans = getPlannedSubjectsForProfile(activeProfile.id).map((s) => s.courseName);
    const fromExams = exams.map((e) => e.subjectName);
    const combined = Array.from(new Set([...fromPlans, ...fromExams]));
    return combined.filter(Boolean);
  }, [activeProfile.id, exams]);

  // Load all data
  const loadData = () => {
    const exList = getExamsForProfile(activeProfile.id);
    const topList = getSyllabusTopicsForProfile(activeProfile.id);
    const sch = getSavedSchedule(activeProfile.id);
    const sessList = getStudySessionsForProfile(activeProfile.id);

    setExams(exList);
    setTopics(topList);
    setSavedSchedule(sch);
    setSessions(sessList);
  };

  useEffect(() => {
    loadData();
  }, [activeProfile.id]);

  // Exam Countdowns
  const examCountdowns = useMemo(() => {
    return calculateExamCountdowns(exams, todayStr);
  }, [exams, todayStr]);

  // Next Upcoming Exam
  const nextUpcomingExam = useMemo(() => {
    const upcoming = examCountdowns
      .filter((e) => e.hasDate && !e.isPast)
      .sort((a, b) => a.daysRemaining - b.daysRemaining);
    return upcoming[0] || null;
  }, [examCountdowns]);

  // Syllabus Progress
  const syllabusProgress = useMemo(() => {
    return calculateSyllabusProgress(topics);
  }, [topics]);

  // Overall syllabus completion %
  const overallSyllabusStats = useMemo(() => {
    const total = topics.length;
    const completed = topics.filter((t) => t.status === 'completed').length;
    const difficultPending = topics.filter(
      (t) => (t.difficulty === 'hard' || t.difficulty === 'very_hard') && t.status !== 'completed'
    ).length;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, difficultPending, pct };
  }, [topics]);

  // Study Stats
  const studyStats = useMemo(() => {
    return calculateStudyStats(sessions);
  }, [sessions]);

  // Today's Study Slots from saved schedule
  const todayStudySlots = useMemo(() => {
    if (!savedSchedule || !Array.isArray(savedSchedule.slots)) return [];
    return savedSchedule.slots.filter((s) => s.date === todayStr);
  }, [savedSchedule, todayStr]);

  // Filtered Topics
  const filteredTopics = useMemo(() => {
    if (syllabusSubjectFilter === 'all') return topics;
    return topics.filter(
      (t) => t.subjectName.toLowerCase() === syllabusSubjectFilter.toLowerCase()
    );
  }, [topics, syllabusSubjectFilter]);

  // Grouped schedule slots by date
  const scheduleSlotsByDate = useMemo(() => {
    if (!savedSchedule || !Array.isArray(savedSchedule.slots)) return {};
    const map: Record<string, ScheduledStudySlot[]> = {};
    savedSchedule.slots.forEach((slot) => {
      if (!map[slot.date]) map[slot.date] = [];
      map[slot.date].push(slot);
    });
    return map;
  }, [savedSchedule]);

  // ==========================================
  // Handlers for Exams
  // ==========================================

  const handleOpenCreateExam = () => {
    setEditingExam(null);
    setIsExamModalOpen(true);
  };

  const handleOpenEditExam = (exam: ExamRecord) => {
    setEditingExam(exam);
    setIsExamModalOpen(true);
  };

  const handleSaveExam = (data: {
    subjectName: string;
    courseCode?: string;
    examType: ExamType;
    examDate?: string;
    examTime?: string;
    difficulty: ExamDifficulty;
    syllabusSummary?: string;
    preparationProgress: number;
    notes?: string;
  }) => {
    if (editingExam) {
      updateExam(activeProfile.id, editingExam.id, data);
      showToast(`Updated exam for ${data.subjectName}.`, 'success');
    } else {
      addExam(activeProfile.id, data);
      showToast(`Added exam for ${data.subjectName}.`, 'success');
    }
    loadData();
  };

  // ==========================================
  // Handlers for Syllabus Topics
  // ==========================================

  const handleOpenCreateTopic = () => {
    setEditingTopic(null);
    setIsTopicModalOpen(true);
  };

  const handleOpenEditTopic = (topic: SyllabusTopic) => {
    setEditingTopic(topic);
    setIsTopicModalOpen(true);
  };

  const handleSaveTopic = (data: {
    subjectName: string;
    unitNumber?: number;
    unitTitle?: string;
    title: string;
    difficulty: ExamDifficulty;
    estimatedHours: number;
    status: TopicStatus;
    revisionNotes?: string;
    examId?: string;
  }) => {
    if (editingTopic) {
      updateSyllabusTopic(activeProfile.id, editingTopic.id, data);
      showToast(`Updated topic "${data.title}".`, 'success');
    } else {
      addSyllabusTopic(activeProfile.id, data);
      showToast(`Added topic "${data.title}".`, 'success');
    }
    loadData();
  };

  const handleQuickTopicStatusChange = (topicId: string, status: TopicStatus) => {
    updateSyllabusTopic(activeProfile.id, topicId, { status });
    loadData();
  };

  // ==========================================
  // Handlers for Schedule Slots
  // ==========================================

  const handleToggleSlot = (slotId: string) => {
    const updated = toggleSlotCompletion(activeProfile.id, slotId);
    if (updated) {
      setSavedSchedule(updated);
    }
  };

  // ==========================================
  // Delete Dispatcher
  // ==========================================

  const handleConfirmDelete = () => {
    if (!itemToDelete) return;
    if (itemToDelete.type === 'exam') {
      deleteExam(activeProfile.id, itemToDelete.id);
      showToast(`Deleted exam "${itemToDelete.title}".`, 'info');
    } else if (itemToDelete.type === 'topic') {
      deleteSyllabusTopic(activeProfile.id, itemToDelete.id);
      showToast(`Removed topic "${itemToDelete.title}".`, 'info');
    } else if (itemToDelete.type === 'sessions') {
      clearStudySessionsForProfile(activeProfile.id);
      showToast('Cleared study session history.', 'info');
    }
    setItemToDelete(null);
    loadData();
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* Top Header Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="p-2.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <Calendar className="w-6 h-6" />
            </span>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                Exam Preparation & Revision Planner
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Track countdowns, master your syllabus topic-by-topic, and generate practical study schedules.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-center">
            <button
              onClick={handleOpenCreateExam}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Exam
            </button>
            <button
              onClick={() => handleOpenCreateTopic()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Topic
            </button>
            <button
              onClick={() => setIsScheduleModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-purple-50 dark:bg-purple-950/50 hover:bg-purple-100 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 transition-colors"
            >
              <Clock className="w-4 h-4" />
              Generate Schedule
            </button>
          </div>
        </div>

        {/* Top Summary Banner */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 text-xs">
          {/* Next Exam Countdown */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-700/60">
            <span className="text-slate-400 block text-[11px]">Next Upcoming Exam</span>
            {nextUpcomingExam ? (
              <div className="mt-1">
                <span className="font-bold text-slate-900 dark:text-white truncate block text-sm">
                  {nextUpcomingExam.exam.subjectName}
                </span>
                <span className="inline-flex items-center gap-1 text-xs font-extrabold text-indigo-600 dark:text-indigo-400 mt-0.5">
                  <Flame className="w-3.5 h-3.5 text-amber-500" />
                  {nextUpcomingExam.formattedCountdown} ({nextUpcomingExam.exam.examDate})
                </span>
              </div>
            ) : (
              <span className="font-medium text-slate-500 italic block text-xs mt-1">
                No upcoming exams scheduled
              </span>
            )}
          </div>

          {/* Syllabus Progress */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-700/60">
            <span className="text-slate-400 block text-[11px]">Syllabus Completion</span>
            <span className="font-bold text-slate-900 dark:text-white text-sm mt-1 block">
              {overallSyllabusStats.pct}% Completed
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              {overallSyllabusStats.completed} of {overallSyllabusStats.total} topics ready
            </span>
          </div>

          {/* Today's Focus Plan */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-700/60">
            <span className="text-slate-400 block text-[11px]">Today's Study Plan</span>
            <span className="font-bold text-slate-900 dark:text-white text-sm mt-1 block">
              {todayStudySlots.length} Slots Scheduled
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              {todayStudySlots.filter((s) => s.completed).length} of {todayStudySlots.length} completed today
            </span>
          </div>

          {/* Study Timer Stats */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-700/60">
            <span className="text-slate-400 block text-[11px]">Today's Focus Time</span>
            <span className="font-bold text-indigo-600 dark:text-indigo-400 text-sm mt-1 block">
              {studyStats.todayMinutes} mins studied
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              {studyStats.totalSessions} completed sessions all-time
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-6 text-sm font-semibold">
        <button
          onClick={() => setActiveTab('exams')}
          className={`pb-3 relative transition-colors ${
            activeTab === 'exams'
              ? 'text-indigo-600 dark:text-indigo-400'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <span className="inline-flex items-center gap-1.5">
            <Calendar className="w-4 h-4" />
            Exams & Study Schedule ({exams.length})
          </span>
          {activeTab === 'exams' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-full" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('syllabus')}
          className={`pb-3 relative transition-colors ${
            activeTab === 'syllabus'
              ? 'text-indigo-600 dark:text-indigo-400'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <span className="inline-flex items-center gap-1.5">
            <BookOpen className="w-4 h-4" />
            Syllabus Tracker ({topics.length})
          </span>
          {activeTab === 'syllabus' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-full" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('timer')}
          className={`pb-3 relative transition-colors ${
            activeTab === 'timer'
              ? 'text-indigo-600 dark:text-indigo-400'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <span className="inline-flex items-center gap-1.5">
            <Clock className="w-4 h-4" />
            Focus Timer & History
          </span>
          {activeTab === 'timer' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-full" />
          )}
        </button>
      </div>

      {/* ==================================================== */}
      {/* TAB 1: EXAMS & STUDY SCHEDULE                       */}
      {/* ==================================================== */}
      {activeTab === 'exams' && (
        <div className="space-y-6">
          {/* Exam Cards Grid */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                Scheduled Exams
              </h2>
              <button
                onClick={handleOpenCreateExam}
                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add Exam
              </button>
            </div>

            {exams.length === 0 ? (
              <div className="p-8 text-center rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-sm">
                <Calendar className="w-10 h-10 text-slate-400 mx-auto mb-2 opacity-50" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                  No exams recorded yet
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-4">
                  Add your mid-term, lab, or end-semester exam dates to calculate real countdowns and generate a timetable.
                </p>
                <button
                  onClick={handleOpenCreateExam}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add First Exam
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {examCountdowns.map(({ exam, hasDate, isPast, daysRemaining, formattedCountdown }) => {
                  return (
                    <div
                      key={exam.id}
                      className={`p-4 rounded-xl border bg-white dark:bg-slate-900 flex flex-col justify-between transition-all ${
                        isPast
                          ? 'border-slate-200 dark:border-slate-800 opacity-60'
                          : daysRemaining <= 3 && hasDate
                          ? 'border-amber-300 dark:border-amber-900/80 shadow-xs'
                          : 'border-slate-200 dark:border-slate-800 shadow-xs'
                      }`}
                    >
                      <div>
                        {/* Countdown Badge */}
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              isPast
                                ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                                : daysRemaining === 0
                                ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300 animate-pulse'
                                : daysRemaining <= 3
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 font-bold'
                                : 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300'
                            }`}
                          >
                            {formattedCountdown}
                          </span>

                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                              exam.difficulty === 'very_hard'
                                ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400'
                                : exam.difficulty === 'hard'
                                ? 'bg-orange-50 text-orange-700 dark:bg-orange-950/60 dark:text-orange-400'
                                : exam.difficulty === 'moderate'
                                ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400'
                                : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                            }`}
                          >
                            {exam.difficulty.toUpperCase().replace(/_/g, ' ')}
                          </span>
                        </div>

                        {/* Title & Code */}
                        <h3 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                          {exam.subjectName}
                        </h3>
                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          <span>{exam.examType.toUpperCase().replace(/_/g, ' ')}</span>
                          {exam.courseCode && <span>• {exam.courseCode}</span>}
                        </div>

                        {/* Date & Time */}
                        <div className="mt-2 text-xs text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{exam.examDate ? `${exam.examDate} (${exam.examTime || 'Time TBD'})` : 'Date to be announced'}</span>
                        </div>

                        {/* Preparation Progress Bar */}
                        <div className="mt-3">
                          <div className="flex items-center justify-between text-[11px] mb-1">
                            <span className="text-slate-500">Preparation Progress</span>
                            <span className="font-bold text-indigo-600 dark:text-indigo-400">
                              {exam.preparationProgress}%
                            </span>
                          </div>
                          <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-indigo-600 transition-all duration-300"
                              style={{ width: `${exam.preparationProgress}%` }}
                            />
                          </div>
                        </div>

                        {exam.syllabusSummary && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 line-clamp-2">
                            {exam.syllabusSummary}
                          </p>
                        )}
                      </div>

                      {/* Footer Actions */}
                      <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <button
                          onClick={() => handleOpenEditTopic(topics.find((t) => t.subjectName === exam.subjectName) || {
                            id: '',
                            profileId: activeProfile.id,
                            subjectName: exam.subjectName,
                            title: '',
                            difficulty: exam.difficulty,
                            estimatedHours: 1.5,
                            status: 'not_started',
                            createdAt: Date.now(),
                            updatedAt: Date.now(),
                          })}
                          className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                        >
                          + Add Topic
                        </button>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleOpenEditExam(exam)}
                            className="p-1 text-slate-400 hover:text-indigo-600 rounded"
                            title="Edit Exam"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setItemToDelete({ type: 'exam', id: exam.id, title: exam.subjectName })}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded"
                            title="Delete Exam"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Generated Timetable Section */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    Personalized Study Timetable
                  </h2>
                  {savedSchedule && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                      Generated Algorithmic Plan
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Daily and weekly study schedule prioritizing high-yield topics and reserving revision buffers.
                </p>
              </div>

              <button
                onClick={() => setIsScheduleModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-colors self-start sm:self-center"
              >
                <Clock className="w-3.5 h-3.5" />
                {savedSchedule ? 'Regenerate Timetable' : 'Generate Timetable'}
              </button>
            </div>

            {/* Conflict Warning if plan is infeasible */}
            {savedSchedule?.conflictWarning && (
              <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-800 dark:text-rose-300 space-y-1">
                <div className="flex items-center gap-2 font-bold text-rose-900 dark:text-rose-200">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>Workload Conflict Advisory</span>
                </div>
                <p>{savedSchedule.conflictWarning}</p>
                {savedSchedule.suggestedPriorities.length > 0 && (
                  <div className="text-[11px] pt-1">
                    <span className="font-semibold block">Suggested Actions:</span>
                    <ul className="list-disc list-inside space-y-0.5">
                      {savedSchedule.suggestedPriorities.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Timetable List grouped by date */}
            {!savedSchedule || savedSchedule.slots.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                <Clock className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-50" />
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  No study timetable generated yet.
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5 mb-3">
                  Click 'Generate Timetable' to build a personalized study schedule based on your available daily hours and exam dates.
                </p>
                <button
                  onClick={() => setIsScheduleModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 rounded-lg transition-colors"
                >
                  <Clock className="w-3.5 h-3.5" />
                  Generate Timetable
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {Object.keys(scheduleSlotsByDate).map((dateStr) => {
                  const daySlots = scheduleSlotsByDate[dateStr];
                  const isToday = dateStr === todayStr;

                  return (
                    <div
                      key={dateStr}
                      className={`rounded-xl border p-3.5 ${
                        isToday
                          ? 'border-indigo-300 dark:border-indigo-800 bg-indigo-50/20'
                          : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-slate-200/60 dark:border-slate-700/60">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                          <span>
                            {new Date(dateStr + 'T00:00:00').toLocaleDateString(undefined, {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                          {isToday && (
                            <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-indigo-600 text-white">
                              Today
                            </span>
                          )}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {daySlots.filter((s) => s.completed).length} / {daySlots.length} completed
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        {daySlots.map((slot) => {
                          return (
                            <div
                              key={slot.id}
                              className={`p-2.5 rounded-lg border text-xs flex items-center justify-between gap-3 bg-white dark:bg-slate-900 transition-colors ${
                                slot.completed
                                  ? 'border-emerald-200 dark:border-emerald-950 opacity-60'
                                  : slot.activityType === 'exam_day'
                                  ? 'border-rose-300 dark:border-rose-900/60 bg-rose-50/10'
                                  : slot.activityType === 'revision'
                                  ? 'border-purple-200 dark:border-purple-900/60'
                                  : 'border-slate-200 dark:border-slate-800'
                              }`}
                            >
                              <div className="flex items-center gap-2.5">
                                <button
                                  type="button"
                                  onClick={() => handleToggleSlot(slot.id)}
                                  className={`p-1 rounded transition-colors ${
                                    slot.completed
                                      ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60'
                                      : 'text-slate-400 hover:text-indigo-600 bg-slate-100 dark:bg-slate-800'
                                  }`}
                                  title={slot.completed ? 'Mark Pending' : 'Mark Completed'}
                                >
                                  <CheckCircle2 className="w-4 h-4" />
                                </button>

                                <div>
                                  <div className="flex items-center gap-2">
                                    <span
                                      className={`font-semibold ${
                                        slot.completed
                                          ? 'line-through text-slate-400'
                                          : 'text-slate-900 dark:text-white'
                                      }`}
                                    >
                                      {slot.topicTitle}
                                    </span>
                                    <span
                                      className={`text-[9px] font-bold uppercase px-1.5 py-0.2 rounded ${
                                        slot.activityType === 'exam_day'
                                          ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                                          : slot.activityType === 'revision'
                                          ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300'
                                          : 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                                      }`}
                                    >
                                      {slot.activityType.replace(/_/g, ' ')}
                                    </span>
                                  </div>
                                  <span className="text-[10px] text-slate-400">
                                    {slot.subjectName} • {slot.durationMinutes} mins
                                  </span>
                                </div>
                              </div>

                              <span
                                className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                                  slot.difficulty === 'very_hard'
                                    ? 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-400'
                                    : slot.difficulty === 'hard'
                                    ? 'bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-400'
                                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                                }`}
                              >
                                {slot.difficulty.toUpperCase()}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 2: SYLLABUS TRACKER                             */}
      {/* ==================================================== */}
      {activeTab === 'syllabus' && (
        <div className="space-y-6">
          {/* Subject Progress Summary Cards */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                Subject Syllabus Progress
              </h2>

              <div className="flex items-center gap-2">
                <select
                  value={syllabusSubjectFilter}
                  onChange={(e) => setSyllabusSubjectFilter(e.target.value)}
                  className="px-2.5 py-1 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                >
                  <option value="all">All Subjects</option>
                  {syllabusProgress.map((p) => (
                    <option key={p.subjectName} value={p.subjectName}>
                      {p.subjectName}
                    </option>
                  ))}
                </select>

                <button
                  onClick={() => handleOpenCreateTopic()}
                  className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Topic
                </button>
              </div>
            </div>

            {syllabusProgress.length === 0 ? (
              <div className="p-8 text-center rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-sm">
                <BookOpen className="w-10 h-10 text-slate-400 mx-auto mb-2 opacity-50" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                  No syllabus units or topics recorded
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-4">
                  Add units and topics for your subjects to calculate genuine completion percentages and guide your study schedule.
                </p>
                <button
                  onClick={() => handleOpenCreateTopic()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add First Topic
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {syllabusProgress.map((prog) => {
                  return (
                    <div
                      key={prog.subjectName}
                      className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                          {prog.subjectName}
                        </h3>
                        <span className="font-bold text-indigo-600 dark:text-indigo-400 text-xs">
                          {prog.completionPercentage}%
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-600 transition-all duration-300"
                          style={{ width: `${prog.completionPercentage}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1">
                        <span>
                          {prog.completedTopics} / {prog.totalTopics} completed
                        </span>
                        {prog.difficultPendingTopicsCount > 0 && (
                          <span className="font-semibold text-rose-600 dark:text-rose-400">
                            {prog.difficultPendingTopicsCount} difficult pending
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Topics Breakdown Table / Cards */}
          {filteredTopics.length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Topic Status & Revision Details
                </span>
                <span className="text-xs text-slate-400">{filteredTopics.length} topics</span>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredTopics.map((topic) => {
                  return (
                    <div
                      key={topic.id}
                      className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-sm text-slate-900 dark:text-white">
                            {topic.title}
                          </span>
                          <span className="text-xs font-semibold px-2 py-0.2 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            {topic.subjectName}
                          </span>
                          {topic.unitTitle && (
                            <span className="text-xs text-slate-400">
                              {topic.unitTitle}
                            </span>
                          )}
                          <span
                            className={`text-[10px] font-semibold px-1.5 py-0.2 rounded ${
                              topic.difficulty === 'very_hard'
                                ? 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-400'
                                : topic.difficulty === 'hard'
                                ? 'bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-400'
                                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                            }`}
                          >
                            {topic.difficulty.toUpperCase()}
                          </span>
                          <span className="text-xs text-slate-400">
                            ~{topic.estimatedHours} hrs
                          </span>
                        </div>

                        {topic.revisionNotes && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                            Notes: {topic.revisionNotes}
                          </p>
                        )}
                      </div>

                      {/* Status Selector & Actions */}
                      <div className="flex items-center gap-2.5 self-end md:self-center">
                        <select
                          value={topic.status}
                          onChange={(e) =>
                            handleQuickTopicStatusChange(topic.id, e.target.value as TopicStatus)
                          }
                          className={`text-xs font-semibold px-2.5 py-1 rounded-lg border focus:outline-none transition-colors ${
                            topic.status === 'completed'
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 text-emerald-700 dark:text-emerald-400'
                              : topic.status === 'needs_revision'
                              ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-300 text-amber-700 dark:text-amber-400'
                              : topic.status === 'learning'
                              ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-300 text-blue-700 dark:text-blue-400'
                              : 'bg-slate-100 dark:bg-slate-800 border-slate-300 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          <option value="not_started">⚪ Not Started</option>
                          <option value="learning">🔵 Learning</option>
                          <option value="needs_revision">🟡 Needs Revision</option>
                          <option value="completed">🟢 Completed</option>
                        </select>

                        <button
                          onClick={() => handleOpenEditTopic(topic)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title="Edit Topic"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setItemToDelete({ type: 'topic', id: topic.id, title: topic.title })}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title="Delete Topic"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 3: STUDY FOCUS TIMER & SESSION HISTORY          */}
      {/* ==================================================== */}
      {activeTab === 'timer' && (
        <div className="space-y-6">
          <StudyFocusTimer
            knownSubjects={knownSubjects}
            topics={topics}
            onSessionLogged={loadData}
          />

          {/* Session History Log Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Completed Focus Sessions Log
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Total {sessions.length} sessions recorded locally on this device.
                </p>
              </div>

              {sessions.length > 0 && (
                <button
                  onClick={() => setItemToDelete({ type: 'sessions', id: 'all', title: 'all study sessions' })}
                  className="text-xs text-rose-600 dark:text-rose-400 hover:underline"
                >
                  Clear History
                </button>
              )}
            </div>

            {sessions.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-4 text-center">
                No study sessions logged yet. Complete a focus session above to record your history!
              </p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {sessions.map((sess) => (
                  <div key={sess.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {sess.subjectName}
                      </span>
                      {sess.topicTitle && (
                        <span className="text-slate-500 ml-2 truncate">
                          ({sess.topicTitle})
                        </span>
                      )}
                      {sess.notes && (
                        <p className="text-[11px] text-slate-400 italic mt-0.5">{sess.notes}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="font-bold text-indigo-600 dark:text-indigo-400">
                        {sess.durationMinutes} mins
                      </span>
                      <span className="text-slate-400 text-[11px]">
                        {new Date(sess.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODALS                                               */}
      {/* ==================================================== */}

      {/* Exam Modal */}
      <ExamManagerModal
        isOpen={isExamModalOpen}
        onClose={() => setIsExamModalOpen(false)}
        examToEdit={editingExam}
        knownSubjects={knownSubjects}
        onSaveExam={handleSaveExam}
      />

      {/* Topic Modal */}
      <SyllabusTopicModal
        isOpen={isTopicModalOpen}
        onClose={() => setIsTopicModalOpen(false)}
        topicToEdit={editingTopic}
        defaultSubjectName={knownSubjects[0] || ''}
        exams={exams}
        onSaveTopic={handleSaveTopic}
      />

      {/* Schedule Generator Modal */}
      <ScheduleGeneratorModal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        exams={exams}
        topics={topics}
        onScheduleGenerated={(res) => setSavedSchedule(res)}
      />

      {/* Reset/Delete Confirmation Modal */}
      {itemToDelete && (
        <ResetConfirmModal
          isOpen={true}
          title={`Delete ${itemToDelete.type}`}
          description={`Are you sure you want to delete ${itemToDelete.title}? This cannot be undone.`}
          confirmLabel="Delete"
          onConfirm={handleConfirmDelete}
          onClose={() => setItemToDelete(null)}
        />
      )}
    </div>
  );
};
