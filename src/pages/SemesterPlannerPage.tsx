import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  CheckCircle2,
  Clock,
  BookOpen,
  Trash2,
  Edit3,
  Check,
  X,
  Info,
} from 'lucide-react';
import { useProfile } from '../context/ProfileContext';
import { useAppToast } from '../components/layout/AppShell';
import type {
  AcademicTask,
  PlannedSubject,
  TaskCategory,
  TaskPriority,
  PlannedCourseStatus,
} from '../types/academicCompanion';
import type { CourseCategoryType } from '../types/credits';
import {
  getTasksForProfile,
  addTask,
  updateTask,
  deleteTask,
  toggleTaskStatus,
  getPlannedSubjectsForProfile,
  addPlannedSubject,
  updatePlannedSubject,
  deletePlannedSubject,
} from '../services/companionStorage';
import { isRegulationSupportingCourseCode, sanitizeCourseTitle } from '../services/catalogueStorage';
import { REGULATIONS, type RegulationId } from '../config/university';
import { ResetConfirmModal } from '../components/common/ResetConfirmModal';

const CATEGORIES: { value: CourseCategoryType; label: string }[] = [
  { value: 'foundation', label: 'Foundation' },
  { value: 'programme_core', label: 'Programme Core' },
  { value: 'programme_elective', label: 'Programme Elective (PE)' },
  { value: 'open_elective', label: 'Open Elective (OE)' },
  { value: 'independent_learning', label: 'Independent Learning' },
  { value: 'industry_interaction', label: 'Industry Interaction' },
  { value: 'professional_proficiency', label: 'Professional Proficiency' },
  { value: 'mandatory', label: 'Mandatory Course' },
  { value: 'custom', label: 'Custom' },
];

export const SemesterPlannerPage: React.FC = () => {
  const { activeProfile } = useProfile();
  const { showToast } = useAppToast();

  const [activeTab, setActiveTab] = useState<'subjects' | 'tasks'>('subjects');
  const [selectedSemester, setSelectedSemester] = useState<number>(activeProfile.currentSemester || 1);

  // Subjects state
  const [plannedSubjects, setPlannedSubjects] = useState<PlannedSubject[]>([]);
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<PlannedSubject | null>(null);

  // Form state for Subject
  const [subCourseName, setSubCourseName] = useState('');
  const [subCourseCode, setSubCourseCode] = useState('');
  const [subCategory, setSubCategory] = useState<CourseCategoryType>('programme_core');
  const [subCredits, setSubCredits] = useState<number>(3);
  const [subTargetGrade, setSubTargetGrade] = useState<string>('S');
  const [subStatus, setSubStatus] = useState<PlannedCourseStatus>('planned');
  const [subIsNptel, setSubIsNptel] = useState(false);
  const [subNptelMilestone, setSubNptelMilestone] = useState('');

  // Tasks state
  const [tasks, setTasks] = useState<AcademicTask[]>([]);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<AcademicTask | null>(null);

  // Form state for Task
  const [taskTitle, setTaskTitle] = useState('');
  const [taskCategory, setTaskCategory] = useState<TaskCategory>('assignment');
  const [taskDueDate, setTaskDueDate] = useState('');
  const [taskPriority, setTaskPriority] = useState<TaskPriority>('medium');
  const [taskCourseName, setTaskCourseName] = useState('');
  const [taskNotes, setTaskNotes] = useState('');

  // Filter tasks
  const [taskFilterCategory, setTaskFilterCategory] = useState<string>('all');
  const [taskFilterStatus, setTaskFilterStatus] = useState<'all' | 'pending' | 'completed'>('all');

  // Deletion confirm
  const [itemToDelete, setItemToDelete] = useState<{ type: 'subject' | 'task'; id: string } | null>(null);

  const supportsCode = isRegulationSupportingCourseCode(activeProfile.regulation || 'VTR21');
  const availableGrades = REGULATIONS[(activeProfile.regulation as RegulationId) || 'VTR21']?.grades || [];

  // Reload data on activeProfile change
  const reloadData = () => {
    setPlannedSubjects(getPlannedSubjectsForProfile(activeProfile.id));
    setTasks(getTasksForProfile(activeProfile.id));
  };

  useEffect(() => {
    reloadData();
    setSelectedSemester(activeProfile.currentSemester || 1);
  }, [activeProfile.id]);

  // Semester subjects calculation
  const semesterSubjects = useMemo(() => {
    return plannedSubjects.filter((s) => s.semester === selectedSemester);
  }, [plannedSubjects, selectedSemester]);

  const totalPlannedCredits = useMemo(() => {
    return semesterSubjects.reduce((sum, s) => sum + (s.plannedCredits || 0), 0);
  }, [semesterSubjects]);

  // Open Subject Modal
  const handleOpenSubjectModal = (subj?: PlannedSubject) => {
    if (subj) {
      setEditingSubject(subj);
      setSubCourseName(subj.courseName);
      setSubCourseCode(subj.courseCode || '');
      setSubCategory(subj.category);
      setSubCredits(subj.plannedCredits);
      setSubTargetGrade(subj.targetGrade || 'S');
      setSubStatus(subj.status);
      setSubIsNptel(!!subj.isNptel);
      setSubNptelMilestone(subj.nptelMilestone || '');
    } else {
      setEditingSubject(null);
      setSubCourseName('');
      setSubCourseCode('');
      setSubCategory('programme_core');
      setSubCredits(3);
      setSubTargetGrade(availableGrades[0]?.grade || 'S');
      setSubStatus('planned');
      setSubIsNptel(false);
      setSubNptelMilestone('');
    }
    setIsSubjectModalOpen(true);
  };

  // Save Subject
  const handleSaveSubject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subCourseName.trim()) {
      showToast('Course Name is required.', 'error');
      return;
    }

    if (editingSubject) {
      updatePlannedSubject(activeProfile.id, editingSubject.id, {
        semester: selectedSemester,
        courseName: sanitizeCourseTitle(subCourseName),
        courseCode: supportsCode && subCourseCode.trim() ? subCourseCode.trim().toUpperCase() : undefined,
        category: subCategory,
        plannedCredits: Number(subCredits) || 3,
        targetGrade: subTargetGrade,
        status: subStatus,
        isNptel: subIsNptel,
        nptelMilestone: subIsNptel ? subNptelMilestone.trim() : undefined,
      });
      showToast('Planned course updated.', 'success');
    } else {
      addPlannedSubject(activeProfile.id, {
        semester: selectedSemester,
        courseName: sanitizeCourseTitle(subCourseName),
        courseCode: supportsCode && subCourseCode.trim() ? subCourseCode.trim().toUpperCase() : undefined,
        category: subCategory,
        plannedCredits: Number(subCredits) || 3,
        targetGrade: subTargetGrade,
        status: subStatus,
        isNptel: subIsNptel,
        nptelMilestone: subIsNptel ? subNptelMilestone.trim() : undefined,
      });
      showToast('Course added to semester plan.', 'success');
    }

    setIsSubjectModalOpen(false);
    reloadData();
  };

  // Open Task Modal
  const handleOpenTaskModal = (task?: AcademicTask) => {
    if (task) {
      setEditingTask(task);
      setTaskTitle(task.title);
      setTaskCategory(task.category);
      setTaskDueDate(task.dueDate);
      setTaskPriority(task.priority);
      setTaskCourseName(task.courseName || '');
      setTaskNotes(task.notes || '');
    } else {
      setEditingTask(null);
      setTaskTitle('');
      setTaskCategory('assignment');
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setTaskDueDate(tomorrow.toISOString().split('T')[0]);
      setTaskPriority('medium');
      setTaskCourseName('');
      setTaskNotes('');
    }
    setIsTaskModalOpen(true);
  };

  // Save Task
  const handleSaveTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) {
      showToast('Task title is required.', 'error');
      return;
    }
    if (!taskDueDate) {
      showToast('Due date is required.', 'error');
      return;
    }

    if (editingTask) {
      updateTask(activeProfile.id, editingTask.id, {
        title: taskTitle.trim(),
        category: taskCategory,
        dueDate: taskDueDate,
        priority: taskPriority,
        courseName: taskCourseName.trim() || undefined,
        notes: taskNotes.trim() || undefined,
      });
      showToast('Task updated.', 'success');
    } else {
      addTask(activeProfile.id, {
        title: taskTitle.trim(),
        category: taskCategory,
        dueDate: taskDueDate,
        priority: taskPriority,
        status: 'pending',
        courseName: taskCourseName.trim() || undefined,
        notes: taskNotes.trim() || undefined,
      });
      showToast('Academic task added.', 'success');
    }

    setIsTaskModalOpen(false);
    reloadData();
  };

  // Toggle Task Status
  const handleToggleTask = (taskId: string) => {
    toggleTaskStatus(activeProfile.id, taskId);
    reloadData();
  };

  // Confirm Delete
  const handleConfirmDelete = () => {
    if (!itemToDelete) return;
    if (itemToDelete.type === 'subject') {
      deletePlannedSubject(activeProfile.id, itemToDelete.id);
      showToast('Planned course removed.', 'info');
    } else {
      deleteTask(activeProfile.id, itemToDelete.id);
      showToast('Task removed.', 'info');
    }
    setItemToDelete(null);
    reloadData();
  };

  // Filtered tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (taskFilterCategory !== 'all' && t.category !== taskFilterCategory) return false;
      if (taskFilterStatus === 'pending' && t.status === 'completed') return false;
      if (taskFilterStatus === 'completed' && t.status !== 'completed') return false;
      return true;
    });
  }, [tasks, taskFilterCategory, taskFilterStatus]);

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="w-full max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-8 animate-appleFadeIn">
      {/* 1. Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border-secondary)] pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-black/5 dark:bg-white/10 text-[var(--text-secondary)]">
              {activeProfile.name} • {activeProfile.regulation}
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              Semester Planner
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)]">
            Smart Semester Planner
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1">
            Organize upcoming subjects, track planned credits, and manage exams, assignments, and milestones.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {activeTab === 'subjects' ? (
            <button
              type="button"
              onClick={() => handleOpenSubjectModal()}
              className="apple-btn-primary text-xs h-9 px-3.5 gap-1.5 font-medium"
            >
              <Plus className="w-4 h-4" />
              <span>Add Planned Course</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleOpenTaskModal()}
              className="apple-btn-primary text-xs h-9 px-3.5 gap-1.5 font-medium"
            >
              <Plus className="w-4 h-4" />
              <span>Add Academic Task</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Important Notice Banner */}
      <div className="rounded-2xl bg-amber-500/10 border border-amber-500/30 p-4 text-xs text-amber-700 dark:text-amber-400 flex items-start gap-3">
        <Info className="w-4 h-4 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <span className="font-bold">Strict Credit Separation Guarantee:</span> Planned subjects and projected credits are strictly simulation goals and are <span className="underline">never</span> counted as officially earned graduation credits. Earned credits update only upon confirmed course completion.
        </div>
      </div>

      {/* 3. Quick Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border-primary)] shadow-sm flex flex-col justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
            Planned Courses (Sem {selectedSemester})
          </span>
          <div className="text-2xl font-bold text-[var(--text-primary)] mt-1 tabular-nums">
            {semesterSubjects.length}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border-primary)] shadow-sm flex flex-col justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
            Planned Credits (Projected)
          </span>
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1 tabular-nums">
            {totalPlannedCredits}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border-primary)] shadow-sm flex flex-col justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
            Pending Tasks
          </span>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1 tabular-nums">
            {tasks.filter((t) => t.status !== 'completed').length}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border-primary)] shadow-sm flex flex-col justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
            Completed Tasks
          </span>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 tabular-nums">
            {tasks.filter((t) => t.status === 'completed').length}
          </div>
        </div>
      </div>

      {/* 4. Tab Navigation & Semester Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border-secondary)] pb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('subjects')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'subjects'
                ? 'bg-black text-white dark:bg-white dark:text-black shadow-xs'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
            }`}
          >
            Planned Subjects & Credits
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('tasks')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'tasks'
                ? 'bg-black text-white dark:bg-white dark:text-black shadow-xs'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
            }`}
          >
            Exams, Tasks & Deadlines ({tasks.filter((t) => t.status !== 'completed').length})
          </button>
        </div>

        {activeTab === 'subjects' && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--text-secondary)] font-medium">Semester:</span>
            <div className="flex items-center rounded-xl bg-[var(--surface)] border border-[var(--border-primary)] p-0.5">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSelectedSemester(s)}
                  className={`w-7 h-7 text-xs font-semibold rounded-lg transition-all ${
                    selectedSemester === s
                      ? 'bg-black text-white dark:bg-white dark:text-black shadow-xs'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 5. TAB CONTENT */}
      {activeTab === 'subjects' ? (
        <div className="flex flex-col gap-4">
          {semesterSubjects.length === 0 ? (
            <div className="p-12 rounded-2xl bg-[var(--surface)] border border-[var(--border-primary)] text-center flex flex-col items-center justify-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-[var(--text-secondary)]">
                <BookOpen className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-[var(--text-primary)]">
                No planned subjects for Semester {selectedSemester}
              </h3>
              <p className="text-xs text-[var(--text-secondary)] max-w-md">
                Add courses you intend to register for in upcoming semesters to preview credit load and workload.
              </p>
              <button
                type="button"
                onClick={() => handleOpenSubjectModal()}
                className="apple-btn-primary text-xs h-9 px-4 gap-2 font-medium mt-2"
              >
                <Plus className="w-4 h-4" />
                <span>Add First Planned Course</span>
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl bg-[var(--surface)] border border-[var(--border-primary)] shadow-sm">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[var(--border-secondary)] bg-[var(--bg-tertiary)]/50 text-[var(--text-secondary)] font-semibold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4">Course</th>
                    {supportsCode && <th className="py-3 px-4">Code</th>}
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Credits</th>
                    <th className="py-3 px-4">Target Grade</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-secondary)]">
                  {semesterSubjects.map((sub) => (
                    <tr key={sub.id} className="hover:bg-[var(--bg-tertiary)]/30 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-sm text-[var(--text-primary)]">
                          {sub.courseName}
                        </div>
                        {sub.isNptel && (
                          <div className="flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 mt-0.5">
                            <span className="font-medium">NPTEL Course</span>
                            {sub.nptelMilestone && <span>• {sub.nptelMilestone}</span>}
                          </div>
                        )}
                      </td>
                      {supportsCode && (
                        <td className="py-3 px-4 font-mono font-medium text-[var(--text-secondary)]">
                          {sub.courseCode || '—'}
                        </td>
                      )}
                      <td className="py-3 px-4 capitalize text-[var(--text-secondary)]">
                        {sub.category.replace(/_/g, ' ')}
                      </td>
                      <td className="py-3 px-4 font-bold tabular-nums text-[var(--text-primary)]">
                        {sub.plannedCredits}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-md font-bold text-[11px] bg-zinc-100 dark:bg-zinc-800 text-[var(--text-primary)]">
                          {sub.targetGrade || '—'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                            sub.status === 'enrolled'
                              ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
                              : sub.status === 'completed'
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                              : sub.status === 'dropped'
                              ? 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20'
                              : 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20'
                          }`}
                        >
                          {sub.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenSubjectModal(sub)}
                            className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]"
                            title="Edit"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setItemToDelete({ type: 'subject', id: sub.id })}
                            className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* Tasks Tab */
        <div className="flex flex-col gap-4">
          {/* Task Filters */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-[var(--surface)] border border-[var(--border-primary)] text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[var(--text-secondary)] font-semibold">Filter:</span>
              <div className="flex items-center rounded-lg bg-[var(--bg-tertiary)] p-0.5">
                {(['all', 'pending', 'completed'] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setTaskFilterStatus(s)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold capitalize transition-all ${
                      taskFilterStatus === s
                        ? 'bg-[var(--surface)] text-[var(--text-primary)] shadow-xs'
                        : 'text-[var(--text-secondary)]'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>

              <select
                value={taskFilterCategory}
                onChange={(e) => setTaskFilterCategory(e.target.value)}
                className="apple-input text-xs h-7 px-2 py-0 rounded-lg bg-[var(--surface)]"
              >
                <option value="all">All Categories</option>
                <option value="assignment">Assignments</option>
                <option value="exam">Exams</option>
                <option value="nptel">NPTEL Milestones</option>
                <option value="project">Projects</option>
                <option value="class">Classes</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="text-[11px] text-[var(--text-tertiary)]">
              Showing {filteredTasks.length} task(s)
            </div>
          </div>

          {filteredTasks.length === 0 ? (
            <div className="p-12 rounded-2xl bg-[var(--surface)] border border-[var(--border-primary)] text-center flex flex-col items-center justify-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-[var(--text-secondary)]">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-[var(--text-primary)]">
                No academic tasks found
              </h3>
              <p className="text-xs text-[var(--text-secondary)] max-w-md">
                Add upcoming exams, lab assignments, project milestones, or NPTEL deadlines to stay on track.
              </p>
              <button
                type="button"
                onClick={() => handleOpenTaskModal()}
                className="apple-btn-primary text-xs h-9 px-4 gap-2 font-medium mt-2"
              >
                <Plus className="w-4 h-4" />
                <span>Add Academic Task</span>
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {filteredTasks.map((task) => {
                const isOverdue = task.status !== 'completed' && task.dueDate < todayStr;
                return (
                  <div
                    key={task.id}
                    className={`p-4 rounded-2xl bg-[var(--surface)] border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      task.status === 'completed'
                        ? 'opacity-60 border-[var(--border-secondary)]'
                        : isOverdue
                        ? 'border-red-500/40 bg-red-50/10 dark:bg-red-950/10'
                        : 'border-[var(--border-primary)] shadow-xs'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <button
                        type="button"
                        onClick={() => handleToggleTask(task.id)}
                        className={`w-5 h-5 rounded-md border flex items-center justify-center mt-0.5 shrink-0 transition-colors ${
                          task.status === 'completed'
                            ? 'bg-emerald-600 border-emerald-600 text-white'
                            : 'border-zinc-300 dark:border-zinc-700 hover:border-zinc-500'
                        }`}
                      >
                        {task.status === 'completed' && <Check className="w-3.5 h-3.5" />}
                      </button>

                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`text-sm font-semibold text-[var(--text-primary)] ${
                              task.status === 'completed' ? 'line-through text-[var(--text-secondary)]' : ''
                            }`}
                          >
                            {task.title}
                          </span>
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-zinc-100 dark:bg-zinc-800 text-[var(--text-secondary)]">
                            {task.category}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                              task.priority === 'high'
                                ? 'bg-red-500/10 text-red-600 dark:text-red-400'
                                : task.priority === 'medium'
                                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                            }`}
                          >
                            {task.priority} Priority
                          </span>
                        </div>

                        {task.courseName && (
                          <span className="text-xs text-[var(--text-secondary)]">
                            Course: {task.courseName}
                          </span>
                        )}
                        {task.notes && (
                          <p className="text-xs text-[var(--text-tertiary)] italic">
                            "{task.notes}"
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[var(--border-secondary)]">
                      <div className="flex items-center gap-1.5 text-xs">
                        <Clock className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                        <span
                          className={`font-semibold ${
                            isOverdue
                              ? 'text-red-600 dark:text-red-400'
                              : 'text-[var(--text-secondary)]'
                          }`}
                        >
                          Due: {task.dueDate} {isOverdue && '(Overdue)'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenTaskModal(task)}
                          className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]"
                          title="Edit Task"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setItemToDelete({ type: 'task', id: task.id })}
                          className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20"
                          title="Delete Task"
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
      )}

      {/* MODAL: ADD / EDIT PLANNED SUBJECT */}
      {isSubjectModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-[var(--surface)] border border-[var(--border-primary)] shadow-2xl p-6 flex flex-col gap-5 animate-appleFadeIn">
            <div className="flex items-center justify-between border-b border-[var(--border-secondary)] pb-3">
              <h3 className="text-lg font-bold text-[var(--text-primary)]">
                {editingSubject ? 'Edit Planned Course' : 'Add Planned Course'}
              </h3>
              <button
                type="button"
                onClick={() => setIsSubjectModalOpen(false)}
                className="p-1 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSubject} className="flex flex-col gap-4 text-xs">
              <div>
                <label className="font-semibold text-[var(--text-primary)] mb-1 block">
                  Course Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={subCourseName}
                  onChange={(e) => setSubCourseName(e.target.value)}
                  placeholder="e.g. Distributed Systems"
                  className="apple-input w-full h-10 px-3 rounded-xl"
                  required
                />
              </div>

              {supportsCode && (
                <div>
                  <label className="font-semibold text-[var(--text-primary)] mb-1 block">
                    Course Code (Optional)
                  </label>
                  <input
                    type="text"
                    value={subCourseCode}
                    onChange={(e) => setSubCourseCode(e.target.value)}
                    placeholder="e.g. 10211CS301"
                    className="apple-input w-full h-10 px-3 rounded-xl uppercase font-mono"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-[var(--text-primary)] mb-1 block">
                    Category
                  </label>
                  <select
                    value={subCategory}
                    onChange={(e) => setSubCategory(e.target.value as CourseCategoryType)}
                    className="apple-input w-full h-10 px-3 rounded-xl"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-[var(--text-primary)] mb-1 block">
                    Planned Credits
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={subCredits}
                    onChange={(e) => setSubCredits(Number(e.target.value))}
                    className="apple-input w-full h-10 px-3 rounded-xl"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-[var(--text-primary)] mb-1 block">
                    Target Grade Goal
                  </label>
                  <select
                    value={subTargetGrade}
                    onChange={(e) => setSubTargetGrade(e.target.value)}
                    className="apple-input w-full h-10 px-3 rounded-xl"
                  >
                    {availableGrades.map((g) => (
                      <option key={g.grade} value={g.grade}>
                        {g.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-[var(--text-primary)] mb-1 block">
                    Status
                  </label>
                  <select
                    value={subStatus}
                    onChange={(e) => setSubStatus(e.target.value as PlannedCourseStatus)}
                    className="apple-input w-full h-10 px-3 rounded-xl"
                  >
                    <option value="planned">Planned</option>
                    <option value="enrolled">Enrolled</option>
                    <option value="completed">Completed</option>
                    <option value="dropped">Dropped</option>
                  </select>
                </div>
              </div>

              {/* NPTEL toggle */}
              <div className="p-3 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-secondary)] flex flex-col gap-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={subIsNptel}
                    onChange={(e) => setSubIsNptel(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600"
                  />
                  <span className="font-semibold text-[var(--text-primary)]">
                    This is an NPTEL Course
                  </span>
                </label>
                {subIsNptel && (
                  <input
                    type="text"
                    value={subNptelMilestone}
                    onChange={(e) => setSubNptelMilestone(e.target.value)}
                    placeholder="Milestone (e.g. Week 8 Assignment / Exam Reg)"
                    className="apple-input w-full h-9 px-3 rounded-xl text-xs"
                  />
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border-secondary)]">
                <button
                  type="button"
                  onClick={() => setIsSubjectModalOpen(false)}
                  className="apple-btn-secondary text-xs h-9 px-3.5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="apple-btn-primary text-xs h-9 px-4 font-semibold"
                >
                  Save Course
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT TASK */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-[var(--surface)] border border-[var(--border-primary)] shadow-2xl p-6 flex flex-col gap-5 animate-appleFadeIn">
            <div className="flex items-center justify-between border-b border-[var(--border-secondary)] pb-3">
              <h3 className="text-lg font-bold text-[var(--text-primary)]">
                {editingTask ? 'Edit Academic Task' : 'Add Academic Task'}
              </h3>
              <button
                type="button"
                onClick={() => setIsTaskModalOpen(false)}
                className="p-1 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTask} className="flex flex-col gap-4 text-xs">
              <div>
                <label className="font-semibold text-[var(--text-primary)] mb-1 block">
                  Task Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="e.g. Unit Test 2 Preparation / NPTEL Assignment 4"
                  className="apple-input w-full h-10 px-3 rounded-xl"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-[var(--text-primary)] mb-1 block">
                    Category
                  </label>
                  <select
                    value={taskCategory}
                    onChange={(e) => setTaskCategory(e.target.value as TaskCategory)}
                    className="apple-input w-full h-10 px-3 rounded-xl"
                  >
                    <option value="assignment">Assignment</option>
                    <option value="exam">Exam</option>
                    <option value="nptel">NPTEL Milestone</option>
                    <option value="project">Project Deadline</option>
                    <option value="class">Class Presentation</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-[var(--text-primary)] mb-1 block">
                    Priority
                  </label>
                  <select
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value as TaskPriority)}
                    className="apple-input w-full h-10 px-3 rounded-xl"
                  >
                    <option value="high">High Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="low">Low Priority</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-[var(--text-primary)] mb-1 block">
                    Due Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={taskDueDate}
                    onChange={(e) => setTaskDueDate(e.target.value)}
                    className="apple-input w-full h-10 px-3 rounded-xl"
                    required
                  />
                </div>

                <div>
                  <label className="font-semibold text-[var(--text-primary)] mb-1 block">
                    Associated Course (Optional)
                  </label>
                  <input
                    type="text"
                    value={taskCourseName}
                    onChange={(e) => setTaskCourseName(e.target.value)}
                    placeholder="e.g. Operating Systems"
                    className="apple-input w-full h-10 px-3 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-[var(--text-primary)] mb-1 block">
                  Notes / Details (Optional)
                </label>
                <textarea
                  value={taskNotes}
                  onChange={(e) => setTaskNotes(e.target.value)}
                  placeholder="Additional notes, submission links, or chapters to cover..."
                  rows={3}
                  className="apple-input w-full p-3 rounded-xl resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border-secondary)]">
                <button
                  type="button"
                  onClick={() => setIsTaskModalOpen(false)}
                  className="apple-btn-secondary text-xs h-9 px-3.5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="apple-btn-primary text-xs h-9 px-4 font-semibold"
                >
                  Save Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRM MODAL */}
      <ResetConfirmModal
        isOpen={itemToDelete !== null}
        onClose={() => setItemToDelete(null)}
        onConfirm={handleConfirmDelete}
        title={itemToDelete?.type === 'subject' ? 'Remove Planned Course' : 'Delete Academic Task'}
        description={`Are you sure you want to remove this ${
          itemToDelete?.type === 'subject' ? 'planned course' : 'academic task'
        }?`}
        confirmLabel="Remove"
      />
    </div>
  );
};
