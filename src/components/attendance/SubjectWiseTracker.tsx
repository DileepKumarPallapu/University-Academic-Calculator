import React, { useState } from 'react';
import {
  BookOpen,
  Plus,
  Trash2,
  Edit2,
  Search,
  ArrowUpDown,
  ExternalLink,
} from 'lucide-react';
import {
  calculateCurrentAttendance,
  calculateBunkMargin,
  calculateRecoveryRequired,
  type SubjectAttendanceItem,
} from '../../utils/attendancePlanner';
import { ResetConfirmModal } from '../common/ResetConfirmModal';

interface SubjectWiseTrackerProps {
  subjects: SubjectAttendanceItem[];
  onAddSubject: (subject: Omit<SubjectAttendanceItem, 'id'>) => void;
  onUpdateSubject: (subject: SubjectAttendanceItem) => void;
  onDeleteSubject: (id: string) => void;
  onSelectSubjectForCalculator: (subject: SubjectAttendanceItem) => void;
}

export const SubjectWiseTracker: React.FC<SubjectWiseTrackerProps> = ({
  subjects,
  onAddSubject,
  onUpdateSubject,
  onDeleteSubject,
  onSelectSubjectForCalculator,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'lowest' | 'highest' | 'name' | 'needsAttention'>('lowest');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<SubjectAttendanceItem | null>(null);
  const [subjectToDelete, setSubjectToDelete] = useState<SubjectAttendanceItem | null>(null);

  // Form state for add / edit
  const [formName, setFormName] = useState('');
  const [formConducted, setFormConducted] = useState('');
  const [formAttended, setFormAttended] = useState('');
  const [formTarget, setFormTarget] = useState('75');
  const [formError, setFormError] = useState<string | null>(null);

  const openAddModal = () => {
    setEditingSubject(null);
    setFormName('');
    setFormConducted('');
    setFormAttended('');
    setFormTarget('75');
    setFormError(null);
    setIsAddModalOpen(true);
  };

  const openEditModal = (sub: SubjectAttendanceItem) => {
    setEditingSubject(sub);
    setFormName(sub.name);
    setFormConducted(sub.conducted.toString());
    setFormAttended(sub.attended.toString());
    setFormTarget(sub.targetPercentage.toString());
    setFormError(null);
    setIsAddModalOpen(true);
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    const cond = parseInt(formConducted) || 0;
    const att = parseInt(formAttended) || 0;
    const tgt = parseFloat(formTarget) || 75;

    if (!formName.trim()) {
      setFormError('Subject name is required.');
      return;
    }
    if (cond < 0 || att < 0) {
      setFormError('Session counts cannot be negative.');
      return;
    }
    if (att > cond) {
      setFormError('Attended classes cannot exceed conducted classes.');
      return;
    }

    if (editingSubject) {
      onUpdateSubject({
        ...editingSubject,
        name: formName.trim(),
        conducted: cond,
        attended: att,
        targetPercentage: tgt,
      });
    } else {
      onAddSubject({
        name: formName.trim(),
        conducted: cond,
        attended: att,
        targetPercentage: tgt,
      });
    }
    setIsAddModalOpen(false);
  };

  // Compute dashboard metrics
  const analyzedSubjects = subjects.map((sub) => {
    const current = calculateCurrentAttendance(sub.conducted, sub.attended, sub.targetPercentage);
    const bunk = calculateBunkMargin(sub.conducted, sub.attended, sub.targetPercentage);
    const recovery = calculateRecoveryRequired(sub.conducted, sub.attended, sub.targetPercentage);
    return {
      ...sub,
      percentage: current.percentage,
      missed: current.missed,
      diff: current.differenceFromTarget,
      status: current.status,
      statusDetails: current.statusDetails,
      maxBunk: bunk.maxBunk,
      recoveryRequired: recovery.requiredSessions,
    };
  });

  const totalCount = analyzedSubjects.length;
  const meetingTargetCount = analyzedSubjects.filter(
    (s) => s.percentage !== null && s.percentage >= s.targetPercentage
  ).length;
  const belowTargetCount = analyzedSubjects.filter(
    (s) => s.percentage !== null && s.percentage < s.targetPercentage
  ).length;

  // Find lowest attendance subject
  const validForLowest = analyzedSubjects.filter((s) => s.percentage !== null);
  const lowestSubject =
    validForLowest.length > 0
      ? [...validForLowest].sort((a, b) => (a.percentage ?? 0) - (b.percentage ?? 0))[0]
      : null;

  // Filter & sort subjects
  const filteredSubjects = analyzedSubjects.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  filteredSubjects.sort((a, b) => {
    if (sortBy === 'lowest') {
      return (a.percentage ?? -1) - (b.percentage ?? -1);
    }
    if (sortBy === 'highest') {
      return (b.percentage ?? -1) - (a.percentage ?? -1);
    }
    if (sortBy === 'name') {
      return a.name.localeCompare(b.name);
    }
    if (sortBy === 'needsAttention') {
      const aBad = a.percentage !== null && a.percentage < a.targetPercentage ? 1 : 0;
      const bBad = b.percentage !== null && b.percentage < b.targetPercentage ? 1 : 0;
      return bBad - aBad;
    }
    return 0;
  });

  return (
    <div className="apple-main-container p-6 sm:p-8 flex flex-col gap-6 border border-[var(--border-primary)] bg-[var(--surface)] shadow-xs">
      {/* Header & Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 dark:bg-indigo-400/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)]">
              Subject-Wise Attendance Tracker
            </h2>
            <p className="text-xs text-[var(--text-secondary)]">
              Track attendance, monitor deficits, and calculate buffers across each course independently.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={openAddModal}
          className="apple-btn-primary text-xs h-10 px-4 rounded-xl flex items-center gap-2 self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Subject</span>
        </button>
      </div>

      {/* Dashboard Analytics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-[var(--bg-tertiary)] border border-[var(--border-secondary)] flex flex-col">
          <span className="text-xs font-medium text-[var(--text-secondary)]">Total Subjects</span>
          <span className="text-2xl font-bold text-[var(--text-primary)] mt-1 tabular-nums">
            {totalCount}
          </span>
          <span className="text-[11px] text-[var(--text-tertiary)] mt-0.5">Tracked courses</span>
        </div>

        <div className="p-4 rounded-2xl bg-[var(--bg-tertiary)] border border-[var(--border-secondary)] flex flex-col">
          <span className="text-xs font-medium text-[var(--text-secondary)]">Meeting Target</span>
          <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 tabular-nums">
            {meetingTargetCount}
          </span>
          <span className="text-[11px] text-[var(--text-tertiary)] mt-0.5">On safe margin</span>
        </div>

        <div className="p-4 rounded-2xl bg-[var(--bg-tertiary)] border border-[var(--border-secondary)] flex flex-col">
          <span className="text-xs font-medium text-[var(--text-secondary)]">Below Target</span>
          <span className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1 tabular-nums">
            {belowTargetCount}
          </span>
          <span className="text-[11px] text-[var(--text-tertiary)] mt-0.5">Requires attendance recovery</span>
        </div>

        <div className="p-4 rounded-2xl bg-[var(--bg-tertiary)] border border-[var(--border-secondary)] flex flex-col">
          <span className="text-xs font-medium text-[var(--text-secondary)]">Lowest Attendance</span>
          <span className="text-xl font-bold text-[var(--text-primary)] mt-1 tabular-nums truncate">
            {lowestSubject && lowestSubject.percentage !== null
              ? `${lowestSubject.percentage.toFixed(1)}%`
              : '—'}
          </span>
          <span className="text-[11px] text-[var(--text-tertiary)] mt-0.5 truncate">
            {lowestSubject ? lowestSubject.name : 'No courses logged'}
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search subjects..."
            className="w-full h-10 pl-9 pr-3.5 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-primary)] text-xs text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none focus:border-[var(--text-primary)] transition-all"
          />
        </div>

        <div className="flex items-center gap-2">
          <ArrowUpDown className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="h-10 px-3 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-primary)] text-xs font-medium text-[var(--text-primary)] outline-none cursor-pointer"
          >
            <option value="lowest">Lowest Attendance First</option>
            <option value="highest">Highest Attendance First</option>
            <option value="needsAttention">Below Target First</option>
            <option value="name">Subject Name (A–Z)</option>
          </select>
        </div>
      </div>

      {/* Subject List / Cards */}
      {filteredSubjects.length === 0 ? (
        <div className="p-8 rounded-2xl bg-[var(--bg-tertiary)] border border-dashed border-[var(--border-secondary)] text-center flex flex-col items-center justify-center gap-3">
          <BookOpen className="w-8 h-8 text-[var(--text-tertiary)] opacity-60" />
          <p className="text-sm font-medium text-[var(--text-secondary)]">
            {subjects.length === 0 ? 'No subjects tracked yet.' : 'No subjects matched your filter.'}
          </p>
          {subjects.length === 0 && (
            <button
              type="button"
              onClick={openAddModal}
              className="apple-btn-secondary text-xs h-9 px-4 rounded-xl cursor-pointer"
            >
              Add First Subject
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredSubjects.map((sub) => {
            const isBelow = sub.percentage !== null && sub.percentage < sub.targetPercentage;
            return (
              <div
                key={sub.id}
                className={`p-5 rounded-2xl border transition-all flex flex-col justify-between gap-4 ${
                  isBelow
                    ? 'bg-amber-500/5 dark:bg-amber-500/10 border-amber-500/30'
                    : 'bg-[var(--surface)] border-[var(--border-secondary)]'
                }`}
              >
                {/* Top Row: Title, Target badge, Status */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-col gap-0.5">
                    <h4 className="text-base font-bold text-[var(--text-primary)] line-clamp-1">
                      {sub.name}
                    </h4>
                    <span className="text-[11px] text-[var(--text-secondary)]">
                      Target: {sub.targetPercentage}% • {sub.attended} / {sub.conducted} classes
                    </span>
                  </div>

                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-bold tabular-nums border ${sub.statusDetails.badgeClass}`}
                  >
                    {sub.percentage !== null ? `${sub.percentage.toFixed(1)}%` : '—'}
                  </span>
                </div>

                {/* Buffer & Recovery Insights */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-secondary)] flex flex-col">
                    <span className="text-[10px] text-[var(--text-tertiary)] font-medium">Safe Bunks</span>
                    <span className="text-sm font-bold text-[var(--text-primary)] tabular-nums">
                      {sub.maxBunk} {sub.maxBunk === 1 ? 'class' : 'classes'}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-secondary)] flex flex-col">
                    <span className="text-[10px] text-[var(--text-tertiary)] font-medium">To Recover</span>
                    <span
                      className={`text-sm font-bold tabular-nums ${
                        sub.recoveryRequired > 0
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      {sub.recoveryRequired > 0 ? `${sub.recoveryRequired} needed` : '0 needed'}
                    </span>
                  </div>
                </div>

                {/* Actions: Edit, Delete, Load into Calculator */}
                <div className="pt-3 border-t border-[var(--border-secondary)] flex items-center justify-between gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => onSelectSubjectForCalculator(sub)}
                    className="flex items-center gap-1.5 text-xs font-semibold text-[var(--accent)] hover:underline cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Plan in Calculator</span>
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEditModal(sub)}
                      className="p-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer"
                      title="Edit Subject"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setSubjectToDelete(sub)}
                      className="p-2 rounded-lg text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                      title="Delete Subject"
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

      {/* Add / Edit Subject Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-appleFadeIn">
          <div className="w-full max-w-md rounded-2xl bg-[var(--surface)] border border-[var(--border-primary)] shadow-2xl p-6 flex flex-col gap-4">
            <h3 className="text-lg font-bold text-[var(--text-primary)]">
              {editingSubject ? 'Edit Subject Attendance' : 'Add Subject Attendance'}
            </h3>

            <form onSubmit={handleSaveForm} className="flex flex-col gap-3.5">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-[var(--text-primary)]">
                  Subject Name
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Data Structures & Algorithms"
                  className="h-10 px-3 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-primary)] text-xs text-[var(--text-primary)] outline-none focus:border-[var(--text-primary)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-[var(--text-primary)]">
                    Classes Conducted
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={formConducted}
                    onChange={(e) => setFormConducted(e.target.value)}
                    className="h-10 px-3 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-primary)] text-xs text-[var(--text-primary)] outline-none focus:border-[var(--text-primary)]"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-[var(--text-primary)]">
                    Classes Attended
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={formAttended}
                    onChange={(e) => setFormAttended(e.target.value)}
                    className="h-10 px-3 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-primary)] text-xs text-[var(--text-primary)] outline-none focus:border-[var(--text-primary)]"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-[var(--text-primary)]">
                  Target Attendance (%)
                </label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={formTarget}
                  onChange={(e) => setFormTarget(e.target.value)}
                  className="h-10 px-3 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-primary)] text-xs text-[var(--text-primary)] outline-none focus:border-[var(--text-primary)]"
                />
              </div>

              {formError && (
                <div className="p-2.5 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 text-xs font-medium">
                  {formError}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="apple-btn-secondary text-xs h-9 px-4 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="apple-btn-primary text-xs h-9 px-4 rounded-xl cursor-pointer"
                >
                  {editingSubject ? 'Update Subject' : 'Save Subject'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {subjectToDelete && (
        <ResetConfirmModal
          isOpen={!!subjectToDelete}
          onClose={() => setSubjectToDelete(null)}
          onConfirm={() => {
            if (subjectToDelete) {
              onDeleteSubject(subjectToDelete.id);
              setSubjectToDelete(null);
            }
          }}
          title={`Delete "${subjectToDelete.name}"?`}
          description="Are you sure you want to remove this subject from your tracker? This cannot be undone."
        />
      )}
    </div>
  );
};
