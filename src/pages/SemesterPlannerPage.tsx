import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  BookOpen,
  CheckSquare,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  Clock,
  AlertCircle,
  Archive,
  Layers,
  ChevronRight,
  List,
} from 'lucide-react';
import { useProfile } from '../context/ProfileContext';
import { useAppToast } from '../components/layout/AppShell';
import type {
  PlannerSemester,
  PlannedSubject,
  AcademicTask,
  StudentAcademicGoals,
  AcademicGoalMetric,
  PreparationStatus,
  PlannedCourseStatus,
  TaskPriority,
  TaskStatus,
  TaskCategory,
} from '../types/academicCompanion';
import {
  getSemestersForProfile,
  createSemester,
  updateSemester,
  deleteSemester,
  toggleArchiveSemester,
  setCurrentSemester,
  getPlannedSubjectsForProfile,
  addPlannedSubject,
  updatePlannedSubject,
  deletePlannedSubject,
  getTasksForProfile,
  addTask,
  updateTask,
  deleteTask,
  toggleTaskStatus,
  getAcademicGoalsForProfile,
  saveAcademicGoalsForProfile,
  calculateAcademicGoalMetrics,
} from '../services/companionStorage';
import { REGULATIONS, type RegulationId } from '../config/university';
import { ResetConfirmModal } from '../components/common/ResetConfirmModal';
import { AcademicGoalsCard } from '../components/planner/AcademicGoalsCard';
import { GoalsManagerModal } from '../components/planner/GoalsManagerModal';
import { SemesterManagerModal } from '../components/planner/SemesterManagerModal';
import { SubjectPlannerModal } from '../components/planner/SubjectPlannerModal';
import { TaskPlannerModal } from '../components/planner/TaskPlannerModal';
import { InteractiveCalendarView } from '../components/planner/InteractiveCalendarView';

export const SemesterPlannerPage: React.FC = () => {
  const { activeProfile } = useProfile();
  const { showToast } = useAppToast();

  const [activeTab, setActiveTab] = useState<'dashboard' | 'semesters' | 'tasks'>('dashboard');
  const [taskViewMode, setTaskViewMode] = useState<'list' | 'calendar'>('list');

  // Core Data State
  const [semesters, setSemesters] = useState<PlannerSemester[]>([]);
  const [selectedSemesterId, setSelectedSemesterId] = useState<string>('');
  const [subjects, setSubjects] = useState<PlannedSubject[]>([]);
  const [tasks, setTasks] = useState<AcademicTask[]>([]);
  const [goals, setGoals] = useState<StudentAcademicGoals | null>(null);
  const [goalMetrics, setGoalMetrics] = useState<AcademicGoalMetric[]>([]);

  // Modals State
  const [isGoalsModalOpen, setIsGoalsModalOpen] = useState(false);
  const [isSemesterModalOpen, setIsSemesterModalOpen] = useState(false);
  const [editingSemester, setEditingSemester] = useState<PlannerSemester | null>(null);
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<PlannedSubject | null>(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<AcademicTask | null>(null);
  const [prefilledTaskDate, setPrefilledTaskDate] = useState<string | undefined>(undefined);

  // Deletion confirm
  const [itemToDelete, setItemToDelete] = useState<{
    type: 'semester' | 'subject' | 'task';
    id: string;
    title: string;
  } | null>(null);

  // Filters
  const [taskSemesterFilter, setTaskSemesterFilter] = useState<string>('all');
  const [taskPriorityFilter, setTaskPriorityFilter] = useState<string>('all');
  const [taskStatusFilter, setTaskStatusFilter] = useState<string>('all');
  const [semesterViewFilter, setSemesterViewFilter] = useState<'active' | 'archived' | 'all'>('active');

  const todayDateStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const availableGrades = useMemo(() => {
    return REGULATIONS[(activeProfile.regulation as RegulationId) || 'VTR21']?.grades || [];
  }, [activeProfile.regulation]);

  // Load all records for active profile
  const loadData = async () => {
    const sems = getSemestersForProfile(activeProfile.id);
    const subjs = getPlannedSubjectsForProfile(activeProfile.id);
    const tsks = getTasksForProfile(activeProfile.id);
    const gls = getAcademicGoalsForProfile(activeProfile.id);

    setSemesters(sems);
    setSubjects(subjs);
    setTasks(tsks);
    setGoals(gls);

    // Set active semester default
    if (sems.length > 0) {
      const current = sems.find((s) => s.isCurrent && !s.isArchived) || sems[0];
      setSelectedSemesterId((prev) => (sems.some((s) => s.id === prev) ? prev : current.id));
    } else {
      setSelectedSemesterId('');
    }

    const metrics = await calculateAcademicGoalMetrics(activeProfile, gls);
    setGoalMetrics(metrics);
  };

  useEffect(() => {
    loadData();
  }, [activeProfile.id]);

  // Active / Selected semester object
  const currentSemesterObj = useMemo(() => {
    return semesters.find((s) => s.id === selectedSemesterId) || null;
  }, [semesters, selectedSemesterId]);

  // Subjects for the selected semester
  const selectedSemesterSubjects = useMemo(() => {
    if (!selectedSemesterId) return [];
    const sem = currentSemesterObj;
    return subjects.filter(
      (s) => s.semesterId === selectedSemesterId || (sem && s.semester === sem.semesterNumber)
    );
  }, [subjects, selectedSemesterId, currentSemesterObj]);

  // Semester Summary stats
  const semesterCreditsTotal = useMemo(() => {
    return selectedSemesterSubjects.reduce((sum, s) => sum + (s.plannedCredits || 0), 0);
  }, [selectedSemesterSubjects]);

  const readySubjectsCount = useMemo(() => {
    return selectedSemesterSubjects.filter((s) => s.preparationStatus === 'ready').length;
  }, [selectedSemesterSubjects]);

  const semesterReadinessPct = useMemo(() => {
    if (selectedSemesterSubjects.length === 0) return 0;
    return Math.round((readySubjectsCount / selectedSemesterSubjects.length) * 100);
  }, [selectedSemesterSubjects, readySubjectsCount]);

  // Filtered Semesters
  const filteredSemesters = useMemo(() => {
    if (semesterViewFilter === 'active') return semesters.filter((s) => !s.isArchived);
    if (semesterViewFilter === 'archived') return semesters.filter((s) => s.isArchived);
    return semesters;
  }, [semesters, semesterViewFilter]);

  // Filtered Tasks for List View
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (taskSemesterFilter !== 'all') {
        const matchesSemester =
          task.semesterId === taskSemesterFilter ||
          (currentSemesterObj && task.semester === currentSemesterObj.semesterNumber);
        if (!matchesSemester) return false;
      }
      if (taskPriorityFilter !== 'all' && task.priority !== taskPriorityFilter) {
        return false;
      }
      if (taskStatusFilter !== 'all' && task.status !== taskStatusFilter) {
        return false;
      }
      return true;
    });
  }, [tasks, taskSemesterFilter, taskPriorityFilter, taskStatusFilter, currentSemesterObj]);

  // Upcoming deadlines (next 14 days)
  const upcomingDeadlines = useMemo(() => {
    const twoWeeksLater = new Date();
    twoWeeksLater.setDate(twoWeeksLater.getDate() + 14);
    const limitStr = twoWeeksLater.toISOString().slice(0, 10);

    return tasks
      .filter((t) => t.status !== 'completed' && t.dueDate <= limitStr)
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
      .slice(0, 5);
  }, [tasks]);

  // Overdue Tasks Count
  const overdueTasksCount = useMemo(() => {
    return tasks.filter((t) => t.status !== 'completed' && t.dueDate < todayDateStr).length;
  }, [tasks, todayDateStr]);

  // ==========================================
  // Handlers for Semesters
  // ==========================================

  const handleOpenCreateSemester = () => {
    setEditingSemester(null);
    setIsSemesterModalOpen(true);
  };

  const handleOpenEditSemester = (sem: PlannerSemester) => {
    setEditingSemester(sem);
    setIsSemesterModalOpen(true);
  };

  const handleSaveSemester = (data: {
    semesterNumber: number;
    title: string;
    academicYear?: string;
    isCurrent: boolean;
    isArchived: boolean;
    notes?: string;
  }) => {
    if (editingSemester) {
      updateSemester(activeProfile.id, editingSemester.id, data);
      showToast(`Updated ${data.title}.`, 'success');
    } else {
      const created = createSemester(activeProfile.id, data);
      setSelectedSemesterId(created.id);
      showToast(`Created ${data.title}.`, 'success');
    }
    loadData();
  };

  const handleToggleArchive = (semId: string) => {
    const res = toggleArchiveSemester(activeProfile.id, semId);
    if (res) {
      showToast(
        res.isArchived ? `Archived ${res.title}.` : `Restored ${res.title} to active semesters.`,
        'info'
      );
      loadData();
    }
  };

  const handleSetCurrent = (semId: string) => {
    const res = setCurrentSemester(activeProfile.id, semId);
    if (res) {
      showToast(`Set ${res.title} as current active semester.`, 'success');
      loadData();
    }
  };

  // ==========================================
  // Handlers for Subjects
  // ==========================================

  const handleOpenCreateSubject = () => {
    if (!currentSemesterObj) {
      showToast('Please create or select a semester first.', 'info');
      return;
    }
    setEditingSubject(null);
    setIsSubjectModalOpen(true);
  };

  const handleOpenEditSubject = (subj: PlannedSubject) => {
    setEditingSubject(subj);
    setIsSubjectModalOpen(true);
  };

  const handleSaveSubject = (data: {
    courseName: string;
    courseCode?: string;
    credits: number;
    category: any;
    examDate?: string;
    preparationStatus: PreparationStatus;
    status: PlannedCourseStatus;
    targetGrade?: string;
    notes?: string;
    semester: number;
    semesterId?: string;
  }) => {
    if (editingSubject) {
      updatePlannedSubject(activeProfile.id, editingSubject.id, data);
      showToast(`Updated subject "${data.courseName}".`, 'success');
    } else {
      addPlannedSubject(activeProfile.id, {
        ...data,
        plannedCredits: data.credits,
      });
      showToast(`Added "${data.courseName}" to semester.`, 'success');
    }
    loadData();
  };

  const handleQuickPrepStatusChange = (subjectId: string, status: PreparationStatus) => {
    updatePlannedSubject(activeProfile.id, subjectId, { preparationStatus: status });
    loadData();
  };

  // ==========================================
  // Handlers for Tasks
  // ==========================================

  const handleOpenCreateTask = (datePrefill?: string) => {
    setEditingTask(null);
    setPrefilledTaskDate(datePrefill);
    setIsTaskModalOpen(true);
  };

  const handleOpenEditTask = (task: AcademicTask) => {
    setEditingTask(task);
    setPrefilledTaskDate(undefined);
    setIsTaskModalOpen(true);
  };

  const handleSaveTask = (data: {
    title: string;
    category: TaskCategory;
    dueDate: string;
    priority: TaskPriority;
    status: TaskStatus;
    semester?: number;
    semesterId?: string;
    subjectId?: string;
    courseName?: string;
    notes?: string;
  }) => {
    if (editingTask) {
      updateTask(activeProfile.id, editingTask.id, data);
      showToast(`Updated task "${data.title}".`, 'success');
    } else {
      addTask(activeProfile.id, data);
      showToast(`Task "${data.title}" scheduled.`, 'success');
    }
    loadData();
  };

  const handleToggleTaskStatus = (taskId: string) => {
    const updated = toggleTaskStatus(activeProfile.id, taskId);
    if (updated) {
      showToast(
        updated.status === 'completed'
          ? `Marked "${updated.title}" as completed!`
          : `Marked "${updated.title}" as pending.`,
        'success'
      );
      loadData();
    }
  };

  // ==========================================
  // Handlers for Goals
  // ==========================================

  const handleSaveGoals = (newGoals: Partial<StudentAcademicGoals>) => {
    const saved = saveAcademicGoalsForProfile(activeProfile.id, newGoals);
    setGoals(saved);
    showToast('Academic targets updated successfully.', 'success');
    loadData();
  };

  // ==========================================
  // Confirmation Deletion Dispatcher
  // ==========================================

  const handleConfirmDelete = () => {
    if (!itemToDelete) return;
    if (itemToDelete.type === 'semester') {
      deleteSemester(activeProfile.id, itemToDelete.id);
      showToast(`Deleted semester "${itemToDelete.title}".`, 'info');
    } else if (itemToDelete.type === 'subject') {
      deletePlannedSubject(activeProfile.id, itemToDelete.id);
      showToast(`Removed subject "${itemToDelete.title}".`, 'info');
    } else if (itemToDelete.type === 'task') {
      deleteTask(activeProfile.id, itemToDelete.id);
      showToast(`Deleted task "${itemToDelete.title}".`, 'info');
    }
    setItemToDelete(null);
    loadData();
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* Top Header & Overview Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-2 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-xl">
                <Calendar className="w-6 h-6" />
              </span>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                  Semester Planner & Goal Tracker
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                  Manage semesters, track exam readiness, and compare personal goals with university standards.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-center">
            <button
              onClick={handleOpenCreateSemester}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Semester
            </button>
            <button
              onClick={() => handleOpenCreateTask()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Task
            </button>
          </div>
        </div>

        {/* Quick Stats Banner */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-700/60">
            <span className="text-slate-400 block text-[11px]">Active Semester</span>
            <span className="font-bold text-slate-900 dark:text-white truncate block text-sm mt-0.5">
              {currentSemesterObj ? currentSemesterObj.title : 'None selected'}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-700/60">
            <span className="text-slate-400 block text-[11px]">Planned Credits</span>
            <span className="font-bold text-slate-900 dark:text-white text-sm mt-0.5 block">
              {semesterCreditsTotal} Credits ({selectedSemesterSubjects.length} subjects)
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-700/60">
            <span className="text-slate-400 block text-[11px]">Exam Readiness</span>
            <span className="font-bold text-indigo-600 dark:text-indigo-400 text-sm mt-0.5 block">
              {semesterReadinessPct}% Ready ({readySubjectsCount}/{selectedSemesterSubjects.length})
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-700/60">
            <span className="text-slate-400 block text-[11px]">Pending Deadlines</span>
            <span className="font-bold text-slate-900 dark:text-white text-sm mt-0.5 block">
              {tasks.filter((t) => t.status !== 'completed').length} Tasks
              {overdueTasksCount > 0 && (
                <span className="text-rose-600 dark:text-rose-400 text-xs ml-1 font-semibold">
                  ({overdueTasksCount} overdue)
                </span>
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-6 text-sm font-semibold">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`pb-3 relative transition-colors ${
            activeTab === 'dashboard'
              ? 'text-indigo-600 dark:text-indigo-400'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <span className="inline-flex items-center gap-1.5">
            <Layers className="w-4 h-4" />
            Planner Dashboard
          </span>
          {activeTab === 'dashboard' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-full" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('semesters')}
          className={`pb-3 relative transition-colors ${
            activeTab === 'semesters'
              ? 'text-indigo-600 dark:text-indigo-400'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <span className="inline-flex items-center gap-1.5">
            <BookOpen className="w-4 h-4" />
            Semesters & Subjects ({semesters.length})
          </span>
          {activeTab === 'semesters' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-full" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('tasks')}
          className={`pb-3 relative transition-colors ${
            activeTab === 'tasks'
              ? 'text-indigo-600 dark:text-indigo-400'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <span className="inline-flex items-center gap-1.5">
            <CheckSquare className="w-4 h-4" />
            Study Tasks & Calendar ({tasks.length})
          </span>
          {activeTab === 'tasks' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-full" />
          )}
        </button>
      </div>

      {/* ==================================================== */}
      {/* TAB 1: PLANNER DASHBOARD                            */}
      {/* ==================================================== */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Empty State for Fresh Profile without Semesters */}
          {semesters.length === 0 ? (
            <div className="p-8 text-center rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-sm">
              <div className="w-12 h-12 mx-auto mb-3 p-3 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                <Calendar className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
                Your Semester Planner is Clean
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-5 leading-relaxed">
                Create your first semester to organize your courses, track exam dates, monitor preparation readiness, and schedule study tasks.
              </p>
              <button
                onClick={handleOpenCreateSemester}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition-colors"
              >
                <Plus className="w-4 h-4" />
                Create First Semester
              </button>
            </div>
          ) : (
            <>
              {/* Current Semester Summary Card */}
              {currentSemesterObj && (
                <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                        Current Semester Focus
                      </span>
                      {currentSemesterObj.isCurrent && (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">
                          Active
                        </span>
                      )}
                    </div>
                    <h2 className="text-xl font-black text-slate-900 dark:text-white mt-1">
                      {currentSemesterObj.title}
                    </h2>
                    {currentSemesterObj.notes && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xl">
                        {currentSemesterObj.notes}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 self-start md:self-center">
                    <button
                      onClick={handleOpenCreateSubject}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Subject
                    </button>
                    <button
                      onClick={() => setActiveTab('semesters')}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
                    >
                      View All Subjects <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* Upcoming Deadlines Widget */}
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                      Upcoming Deadlines & Tasks (Next 14 Days)
                    </h3>
                  </div>
                  <button
                    onClick={() => setActiveTab('tasks')}
                    className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
                  >
                    View All Tasks →
                  </button>
                </div>

                {upcomingDeadlines.length === 0 ? (
                  <p className="text-xs text-slate-500 dark:text-slate-400 italic py-2">
                    No deadlines due in the next 14 days. You're all caught up!
                  </p>
                ) : (
                  <div className="space-y-2">
                    {upcomingDeadlines.map((task) => {
                      const isOverdue = task.dueDate < todayDateStr;
                      return (
                        <div
                          key={task.id}
                          className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-700/60 text-xs"
                        >
                          <div className="flex items-center gap-2.5">
                            <button
                              onClick={() => handleToggleTaskStatus(task.id)}
                              className="text-slate-400 hover:text-indigo-600 transition-colors"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                            <div>
                              <span className="font-medium text-slate-900 dark:text-white">
                                {task.title}
                              </span>
                              {task.courseName && (
                                <span className="text-[10px] text-slate-400 ml-1.5">
                                  ({task.courseName})
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {isOverdue ? (
                              <span className="inline-flex items-center gap-1 font-semibold text-rose-600 dark:text-rose-400 text-[11px]">
                                <AlertCircle className="w-3 h-3" /> Overdue ({task.dueDate})
                              </span>
                            ) : (
                              <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                                Due {task.dueDate}
                              </span>
                            )}
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                task.priority === 'high'
                                  ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400'
                                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                              }`}
                            >
                              {task.priority.toUpperCase()}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Academic Goals & Benchmarks Card */}
          <AcademicGoalsCard
            metrics={goalMetrics}
            onEditGoals={() => setIsGoalsModalOpen(true)}
          />
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 2: SEMESTERS & SUBJECTS                         */}
      {/* ==================================================== */}
      {activeTab === 'semesters' && (
        <div className="space-y-6">
          {/* Semester Selector & Filters */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Select Semester:
                </span>
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg text-xs">
                  <button
                    onClick={() => setSemesterViewFilter('active')}
                    className={`px-2 py-0.5 rounded-md font-medium transition-colors ${
                      semesterViewFilter === 'active'
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Active
                  </button>
                  <button
                    onClick={() => setSemesterViewFilter('archived')}
                    className={`px-2 py-0.5 rounded-md font-medium transition-colors ${
                      semesterViewFilter === 'archived'
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Archived
                  </button>
                  <button
                    onClick={() => setSemesterViewFilter('all')}
                    className={`px-2 py-0.5 rounded-md font-medium transition-colors ${
                      semesterViewFilter === 'all'
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    All
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleOpenCreateSemester}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  New Semester
                </button>
              </div>
            </div>

            {/* Semester Tabs Pills */}
            {filteredSemesters.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-2">
                No {semesterViewFilter !== 'all' ? semesterViewFilter : ''} semesters found.
              </p>
            ) : (
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
                {filteredSemesters.map((sem) => {
                  const isSelected = sem.id === selectedSemesterId;
                  return (
                    <button
                      key={sem.id}
                      onClick={() => setSelectedSemesterId(sem.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      <span>{sem.title}</span>
                      {sem.isCurrent && (
                        <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                          isSelected ? 'bg-indigo-700 text-indigo-100' : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                        }`}>
                          Current
                        </span>
                      )}
                      {sem.isArchived && (
                        <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                          isSelected ? 'bg-amber-600 text-amber-100' : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                        }`}>
                          Archived
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Active Semester Subjects Section */}
          {currentSemesterObj ? (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-slate-900 dark:text-white">
                      {currentSemesterObj.title} Subjects
                    </h2>
                    <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {semesterCreditsTotal} Credits Planned
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {readySubjectsCount} of {selectedSemesterSubjects.length} subjects ready ({semesterReadinessPct}% preparation progress)
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenEditSemester(currentSemesterObj)}
                    className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    title="Edit Semester Settings"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleToggleArchive(currentSemesterObj.id)}
                    className="p-1.5 text-slate-400 hover:text-amber-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    title={currentSemesterObj.isArchived ? 'Restore Semester' : 'Archive Semester'}
                  >
                    <Archive className="w-4 h-4" />
                  </button>
                  {!currentSemesterObj.isCurrent && !currentSemesterObj.isArchived && (
                    <button
                      onClick={() => handleSetCurrent(currentSemesterObj.id)}
                      className="px-2 py-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 rounded-lg transition-colors"
                    >
                      Make Current
                    </button>
                  )}
                  <button
                    onClick={() =>
                      setItemToDelete({
                        type: 'semester',
                        id: currentSemesterObj.id,
                        title: currentSemesterObj.title,
                      })
                    }
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    title="Delete Semester"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleOpenCreateSubject}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-colors ml-2"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Subject
                  </button>
                </div>
              </div>

              {/* Subjects Table */}
              {selectedSemesterSubjects.length === 0 ? (
                <div className="p-8 text-center">
                  <BookOpen className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-50" />
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    No subjects added for {currentSemesterObj.title} yet.
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5 mb-4">
                    Add your courses to track credits, exam dates, and preparation status.
                  </p>
                  <button
                    onClick={handleOpenCreateSubject}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 rounded-lg transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add First Subject
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {selectedSemesterSubjects.map((subj) => {
                    const prepStatus = subj.preparationStatus || 'not_started';
                    return (
                      <div
                        key={subj.id}
                        className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors"
                      >
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-sm text-slate-900 dark:text-white">
                              {subj.courseName}
                            </span>
                            {subj.courseCode && (
                              <span className="text-xs font-mono font-semibold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                {subj.courseCode}
                              </span>
                            )}
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
                              {subj.plannedCredits} Credits
                            </span>
                            {subj.targetGrade && (
                              <span className="text-xs text-slate-500">
                                Target Grade: <strong>{subj.targetGrade}</strong>
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                            {subj.examDate && (
                              <span className="inline-flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-slate-400" />
                                Exam: <strong>{subj.examDate}</strong>
                              </span>
                            )}
                            {subj.notes && <span className="italic truncate max-w-md">{subj.notes}</span>}
                          </div>
                        </div>

                        {/* Prep Status Selector & Actions */}
                        <div className="flex items-center gap-3 self-end md:self-center">
                          <select
                            value={prepStatus}
                            onChange={(e) =>
                              handleQuickPrepStatusChange(subj.id, e.target.value as PreparationStatus)
                            }
                            className={`text-xs font-semibold px-2.5 py-1 rounded-lg border focus:outline-none transition-colors ${
                              prepStatus === 'ready'
                                ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 text-emerald-700 dark:text-emerald-400'
                                : prepStatus === 'revision'
                                ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-300 text-indigo-700 dark:text-indigo-400'
                                : prepStatus === 'in_progress'
                                ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-300 text-amber-700 dark:text-amber-400'
                                : 'bg-slate-100 dark:bg-slate-800 border-slate-300 text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            <option value="not_started">⚪ Not Started</option>
                            <option value="in_progress">🟡 In Progress</option>
                            <option value="revision">🔵 In Revision</option>
                            <option value="ready">🟢 Exam Ready</option>
                          </select>

                          <button
                            onClick={() => handleOpenEditSubject(subj)}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="Edit Subject"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() =>
                              setItemToDelete({
                                type: 'subject',
                                id: subj.id,
                                title: subj.courseName,
                              })
                            }
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="Delete Subject"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="p-8 text-center rounded-xl border border-dashed border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900">
              <p className="text-xs text-slate-500">Please create or select a semester above.</p>
            </div>
          )}
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 3: STUDY TASKS & CALENDAR                       */}
      {/* ==================================================== */}
      {activeTab === 'tasks' && (
        <div className="space-y-6">
          {/* Controls Bar: View Toggle & Filters */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg text-xs">
                <button
                  onClick={() => setTaskViewMode('list')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md font-semibold transition-colors ${
                    taskViewMode === 'list'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <List className="w-3.5 h-3.5" />
                  List View
                </button>
                <button
                  onClick={() => setTaskViewMode('calendar')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md font-semibold transition-colors ${
                    taskViewMode === 'calendar'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  Interactive Calendar
                </button>
              </div>

              {taskViewMode === 'list' && (
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <select
                    value={taskSemesterFilter}
                    onChange={(e) => setTaskSemesterFilter(e.target.value)}
                    className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                  >
                    <option value="all">All Semesters</option>
                    {semesters.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.title}
                      </option>
                    ))}
                  </select>

                  <select
                    value={taskPriorityFilter}
                    onChange={(e) => setTaskPriorityFilter(e.target.value)}
                    className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                  >
                    <option value="all">All Priorities</option>
                    <option value="high">High Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="low">Low Priority</option>
                  </select>

                  <select
                    value={taskStatusFilter}
                    onChange={(e) => setTaskStatusFilter(e.target.value)}
                    className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                  >
                    <option value="all">All Statuses</option>
                    <option value="pending">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              )}
            </div>

            <button
              onClick={() => handleOpenCreateTask()}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-colors self-start sm:self-center"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Task
            </button>
          </div>

          {/* Interactive Calendar View */}
          {taskViewMode === 'calendar' && (
            <InteractiveCalendarView
              tasks={tasks}
              onAddTaskForDate={(date) => handleOpenCreateTask(date)}
              onEditTask={(task) => handleOpenEditTask(task)}
              onDeleteTask={(taskId) => {
                const t = tasks.find((item) => item.id === taskId);
                setItemToDelete({ type: 'task', id: taskId, title: t?.title || 'task' });
              }}
              onToggleStatus={(taskId) => handleToggleTaskStatus(taskId)}
            />
          )}

          {/* Task List View */}
          {taskViewMode === 'list' && (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
              {filteredTasks.length === 0 ? (
                <div className="p-8 text-center">
                  <CheckSquare className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-50" />
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    No tasks match your current filter.
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5 mb-4">
                    Stay on top of assignments and preparation by creating study tasks.
                  </p>
                  <button
                    onClick={() => handleOpenCreateTask()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 rounded-lg transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Create Study Task
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredTasks.map((task) => {
                    const isOverdue = task.status !== 'completed' && task.dueDate < todayDateStr;
                    return (
                      <div
                        key={task.id}
                        className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                          isOverdue
                            ? 'bg-rose-50/25 dark:bg-rose-950/20'
                            : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/20'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <button
                            onClick={() => handleToggleTaskStatus(task.id)}
                            className={`mt-0.5 p-1 rounded-md transition-colors ${
                              task.status === 'completed'
                                ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60'
                                : 'text-slate-400 hover:text-indigo-600 bg-slate-100 dark:bg-slate-800'
                            }`}
                            title={task.status === 'completed' ? 'Mark Pending' : 'Mark Completed'}
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>

                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={`text-sm font-semibold ${
                                  task.status === 'completed'
                                    ? 'line-through text-slate-400 dark:text-slate-500'
                                    : 'text-slate-900 dark:text-white'
                                }`}
                              >
                                {task.title}
                              </span>

                              {isOverdue && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-400">
                                  <AlertCircle className="w-3 h-3" /> Overdue
                                </span>
                              )}

                              <span
                                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                  task.priority === 'high'
                                    ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400'
                                    : task.priority === 'medium'
                                    ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400'
                                    : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                                }`}
                              >
                                {task.priority.toUpperCase()}
                              </span>

                              {task.courseName && (
                                <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                                  {task.courseName}
                                </span>
                              )}
                            </div>

                            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                              <span>Due: {task.dueDate}</span>
                              {task.notes && (
                                <span className="italic truncate max-w-md">{task.notes}</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 self-end sm:self-center">
                          <button
                            onClick={() => handleOpenEditTask(task)}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="Edit Task"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() =>
                              setItemToDelete({
                                type: 'task',
                                id: task.id,
                                title: task.title,
                              })
                            }
                            className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="Delete Task"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ==================================================== */}
      {/* MODALS                                               */}
      {/* ==================================================== */}

      {/* Academic Goals Modal */}
      <GoalsManagerModal
        isOpen={isGoalsModalOpen}
        onClose={() => setIsGoalsModalOpen(false)}
        currentGoals={goals}
        onSaveGoals={handleSaveGoals}
      />

      {/* Semester Modal */}
      <SemesterManagerModal
        isOpen={isSemesterModalOpen}
        onClose={() => setIsSemesterModalOpen(false)}
        semesterToEdit={editingSemester}
        onSaveSemester={handleSaveSemester}
      />

      {/* Subject Modal */}
      <SubjectPlannerModal
        isOpen={isSubjectModalOpen}
        onClose={() => setIsSubjectModalOpen(false)}
        semesterNumber={currentSemesterObj?.semesterNumber || 1}
        semesterId={currentSemesterObj?.id}
        subjectToEdit={editingSubject}
        availableGrades={availableGrades}
        onSaveSubject={handleSaveSubject}
      />

      {/* Task Modal */}
      <TaskPlannerModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        taskToEdit={editingTask}
        semesters={semesters}
        subjects={subjects}
        prefilledDate={prefilledTaskDate}
        defaultSemesterId={selectedSemesterId}
        onSaveTask={handleSaveTask}
      />

      {/* Confirmation Modal */}
      {itemToDelete && (
        <ResetConfirmModal
          isOpen={true}
          title={`Delete ${itemToDelete.type}`}
          description={`Are you sure you want to delete "${itemToDelete.title}"? This cannot be undone.`}
          confirmLabel="Delete"
          onConfirm={handleConfirmDelete}
          onClose={() => setItemToDelete(null)}
        />
      )}
    </div>
  );
};
