import React, { useState, useEffect } from 'react';
import { X, CheckSquare, Save } from 'lucide-react';
import type {
  AcademicTask,
  TaskPriority,
  TaskStatus,
  TaskCategory,
  PlannerSemester,
  PlannedSubject,
} from '../../types/academicCompanion';

interface TaskPlannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskToEdit: AcademicTask | null;
  semesters: PlannerSemester[];
  subjects: PlannedSubject[];
  prefilledDate?: string;
  defaultSemesterId?: string;
  onSaveTask: (data: {
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
  }) => void;
}

export const TaskPlannerModal: React.FC<TaskPlannerModalProps> = ({
  isOpen,
  onClose,
  taskToEdit,
  semesters,
  subjects,
  prefilledDate,
  defaultSemesterId,
  onSaveTask,
}) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<TaskCategory>('assignment');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [status, setStatus] = useState<TaskStatus>('pending');
  const [selectedSemesterId, setSelectedSemesterId] = useState<string>('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (taskToEdit) {
      setTitle(taskToEdit.title);
      setCategory(taskToEdit.category || 'assignment');
      setDueDate(taskToEdit.dueDate || '');
      setPriority(taskToEdit.priority || 'medium');
      setStatus(taskToEdit.status || 'pending');
      setSelectedSemesterId(taskToEdit.semesterId || '');
      setSelectedSubjectId(taskToEdit.subjectId || '');
      setNotes(taskToEdit.notes || '');
    } else {
      setTitle('');
      setCategory('assignment');
      setDueDate(prefilledDate || new Date().toISOString().slice(0, 10));
      setPriority('medium');
      setStatus('pending');
      setSelectedSemesterId(defaultSemesterId || (semesters[0]?.id || ''));
      setSelectedSubjectId('');
      setNotes('');
    }
  }, [taskToEdit, isOpen, prefilledDate, defaultSemesterId, semesters]);

  if (!isOpen) return null;

  // Filter subjects for the chosen semester
  const availableSubjects = subjects.filter((s) => {
    if (!selectedSemesterId) return true;
    const sem = semesters.find((sm) => sm.id === selectedSemesterId);
    return s.semesterId === selectedSemesterId || (sem && s.semester === sem.semesterNumber);
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const chosenSem = semesters.find((s) => s.id === selectedSemesterId);
    const chosenSub = subjects.find((s) => s.id === selectedSubjectId);

    onSaveTask({
      title: title.trim(),
      category,
      dueDate: dueDate || new Date().toISOString().slice(0, 10),
      priority,
      status,
      semester: chosenSem?.semesterNumber,
      semesterId: selectedSemesterId || undefined,
      subjectId: selectedSubjectId || undefined,
      courseName: chosenSub?.courseName,
      notes: notes.trim() || undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-lg">
              <CheckSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white">
                {taskToEdit ? 'Edit Study Task' : 'Add Study Task'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Track assignments, exam milestones, and project deadlines.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Task Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Complete Unit 3 Operating Systems assignment"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Semester Link
              </label>
              <select
                value={selectedSemesterId}
                onChange={(e) => {
                  setSelectedSemesterId(e.target.value);
                  setSelectedSubjectId('');
                }}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">-- No specific semester --</option>
                {semesters.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title} {s.isCurrent ? '(Current)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Subject Link
              </label>
              <select
                value={selectedSubjectId}
                onChange={(e) => setSelectedSubjectId(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">-- General / No Subject --</option>
                {availableSubjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.courseName} {s.courseCode ? `(${s.courseCode})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Due Date *
              </label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="high">🔴 High Priority</option>
                <option value="medium">🟡 Medium</option>
                <option value="low">🔵 Low</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="pending">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as TaskCategory)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="assignment">Assignment</option>
                <option value="exam">Exam Preparation</option>
                <option value="project">Project / Lab Work</option>
                <option value="nptel">NPTEL Milestone</option>
                <option value="class">Class Work</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Task Notes (Optional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="References, submission portal link, team members..."
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              {taskToEdit ? 'Save Changes' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
