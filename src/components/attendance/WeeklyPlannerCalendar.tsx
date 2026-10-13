import React, { useState } from 'react';
import {
  Calendar as CalendarIcon,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  Trash2,
  Filter,
} from 'lucide-react';
import type { ClassLogEntry } from '../../utils/attendancePlanner';

interface WeeklyPlannerCalendarProps {
  entries: ClassLogEntry[];
  onAddEntry: (entry: Omit<ClassLogEntry, 'id'>) => void;
  onUpdateStatus: (id: string, status: 'attended' | 'missed' | 'planned') => void;
  onDeleteEntry: (id: string) => void;
  availableSubjectNames?: string[];
}

export const WeeklyPlannerCalendar: React.FC<WeeklyPlannerCalendarProps> = ({
  entries,
  onAddEntry,
  onUpdateStatus,
  onDeleteEntry,
  availableSubjectNames = [],
}) => {
  const [filterPeriod, setFilterPeriod] = useState<'all' | 'thisWeek' | 'thisMonth'>('thisWeek');
  const [isAddOpen, setIsAddOpen] = useState(false);

  // Form state
  const todayStr = new Date().toISOString().split('T')[0];
  const [formDate, setFormDate] = useState(todayStr);
  const [formSubject, setFormSubject] = useState('');
  const [formStatus, setFormStatus] = useState<'planned' | 'attended' | 'missed'>('planned');
  const [formNotes, setFormNotes] = useState('');

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formSubject.trim()) return;
    onAddEntry({
      date: formDate,
      subject: formSubject.trim(),
      status: formStatus,
      notes: formNotes.trim() || undefined,
    });
    setFormSubject('');
    setFormNotes('');
    setIsAddOpen(false);
  };

  // Helper date filtering
  const now = new Date();
  const filteredEntries = entries.filter((item) => {
    if (filterPeriod === 'all') return true;
    const itemDate = new Date(item.date);
    if (filterPeriod === 'thisWeek') {
      const dayDiff = Math.abs((now.getTime() - itemDate.getTime()) / (1000 * 3600 * 24));
      return dayDiff <= 7;
    }
    if (filterPeriod === 'thisMonth') {
      return (
        itemDate.getFullYear() === now.getFullYear() &&
        itemDate.getMonth() === now.getMonth()
      );
    }
    return true;
  });

  // Calculate confirmed attendance statistics
  const confirmedAttended = filteredEntries.filter((e) => e.status === 'attended').length;
  const confirmedMissed = filteredEntries.filter((e) => e.status === 'missed').length;
  const plannedSessions = filteredEntries.filter((e) => e.status === 'planned').length;
  const totalConfirmed = confirmedAttended + confirmedMissed;
  const confirmedPct = totalConfirmed > 0 ? (confirmedAttended / totalConfirmed) * 100 : null;

  // Sort by date descending
  filteredEntries.sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="apple-main-container p-6 sm:p-8 flex flex-col gap-6 border border-[var(--border-primary)] bg-[var(--surface)] shadow-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-teal-500/10 dark:bg-teal-400/10 text-teal-600 dark:text-teal-400 flex items-center justify-center">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)]">
              Attendance Calendar & Weekly Log
            </h2>
            <p className="text-xs text-[var(--text-secondary)]">
              Plan classes in advance and record confirmed presence or absence day by day.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsAddOpen(true)}
          className="apple-btn-primary text-xs h-10 px-4 rounded-xl flex items-center gap-2 self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Log Class Session</span>
        </button>
      </div>

      {/* Summary Banner of Confirmed Sessions */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[var(--bg-tertiary)] border border-[var(--border-secondary)] grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="flex flex-col">
          <span className="text-xs text-[var(--text-secondary)]">Confirmed Attended</span>
          <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 tabular-nums">
            {confirmedAttended}
          </span>
          <span className="text-[10px] text-[var(--text-tertiary)]">Present sessions</span>
        </div>

        <div className="flex flex-col">
          <span className="text-xs text-[var(--text-secondary)]">Confirmed Missed</span>
          <span className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-1 tabular-nums">
            {confirmedMissed}
          </span>
          <span className="text-[10px] text-[var(--text-tertiary)]">Absent sessions</span>
        </div>

        <div className="flex flex-col">
          <span className="text-xs text-[var(--text-secondary)]">Planned (Unconfirmed)</span>
          <span className="text-xl font-bold text-blue-600 dark:text-blue-400 mt-1 tabular-nums">
            {plannedSessions}
          </span>
          <span className="text-[10px] text-[var(--text-tertiary)]">Upcoming classes</span>
        </div>

        <div className="flex flex-col">
          <span className="text-xs text-[var(--text-secondary)]">Log Period Rate</span>
          <span className="text-xl font-bold text-[var(--text-primary)] mt-1 tabular-nums">
            {confirmedPct !== null ? `${confirmedPct.toFixed(1)}%` : '—'}
          </span>
          <span className="text-[10px] text-[var(--text-tertiary)]">Only confirmed records</span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between gap-2 border-b border-[var(--border-secondary)] pb-2 text-xs">
        <div className="flex items-center gap-1.5">
          <Filter className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
          <span className="text-[var(--text-secondary)] font-medium">Timeline:</span>
          {(['thisWeek', 'thisMonth', 'all'] as const).map((period) => (
            <button
              key={period}
              type="button"
              onClick={() => setFilterPeriod(period)}
              className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                filterPeriod === period
                  ? 'bg-[var(--text-primary)] text-[var(--bg-primary)] shadow-2xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {period === 'thisWeek' ? 'Past 7 Days' : period === 'thisMonth' ? 'This Month' : 'All Logs'}
            </button>
          ))}
        </div>

        <span className="text-[11px] text-[var(--text-tertiary)]">
          {filteredEntries.length} {filteredEntries.length === 1 ? 'record' : 'records'}
        </span>
      </div>

      {/* Class Log Entry List */}
      {filteredEntries.length === 0 ? (
        <div className="p-8 rounded-2xl bg-[var(--bg-tertiary)] border border-dashed border-[var(--border-secondary)] text-center text-xs text-[var(--text-secondary)] flex flex-col items-center gap-2">
          <CalendarIcon className="w-7 h-7 text-[var(--text-tertiary)] opacity-60" />
          <span>No class sessions logged in this timeframe.</span>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {filteredEntries.map((item) => (
            <div
              key={item.id}
              className="p-3.5 sm:p-4 rounded-xl border border-[var(--border-secondary)] bg-[var(--surface)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition-colors hover:border-[var(--border-primary)]"
            >
              <div className="flex items-center gap-3">
                <span className="font-mono text-[11px] text-[var(--text-tertiary)] px-2 py-1 rounded-md bg-[var(--bg-tertiary)] shrink-0">
                  {item.date}
                </span>

                <div className="flex flex-col">
                  <span className="font-bold text-[var(--text-primary)] text-sm">{item.subject}</span>
                  {item.notes && (
                    <span className="text-[11px] text-[var(--text-tertiary)]">{item.notes}</span>
                  )}
                </div>
              </div>

              {/* Status Action Buttons */}
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() => onUpdateStatus(item.id, 'attended')}
                  className={`px-2.5 py-1 rounded-lg flex items-center gap-1 font-semibold transition-all cursor-pointer ${
                    item.status === 'attended'
                      ? 'bg-emerald-500 text-white shadow-2xs'
                      : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-emerald-600'
                  }`}
                  title="Mark Attended"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Attended</span>
                </button>

                <button
                  type="button"
                  onClick={() => onUpdateStatus(item.id, 'missed')}
                  className={`px-2.5 py-1 rounded-lg flex items-center gap-1 font-semibold transition-all cursor-pointer ${
                    item.status === 'missed'
                      ? 'bg-amber-500 text-white shadow-2xs'
                      : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-amber-600'
                  }`}
                  title="Mark Missed"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Missed</span>
                </button>

                <button
                  type="button"
                  onClick={() => onUpdateStatus(item.id, 'planned')}
                  className={`px-2.5 py-1 rounded-lg flex items-center gap-1 font-semibold transition-all cursor-pointer ${
                    item.status === 'planned'
                      ? 'bg-blue-500 text-white shadow-2xs'
                      : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-blue-600'
                  }`}
                  title="Mark Planned"
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Planned</span>
                </button>

                <button
                  type="button"
                  onClick={() => onDeleteEntry(item.id)}
                  className="p-1.5 rounded-lg text-neutral-400 hover:text-red-500 transition-colors ml-1 cursor-pointer"
                  title="Delete Log"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Entry Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-appleFadeIn">
          <div className="w-full max-w-md rounded-2xl bg-[var(--surface)] border border-[var(--border-primary)] shadow-2xl p-6 flex flex-col gap-4">
            <h3 className="text-lg font-bold text-[var(--text-primary)]">
              Log Class Session
            </h3>

            <form onSubmit={handleAddSubmit} className="flex flex-col gap-3.5">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-[var(--text-primary)]">Date</label>
                <input
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="h-10 px-3 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-primary)] text-xs text-[var(--text-primary)] outline-none"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-[var(--text-primary)]">Subject</label>
                <input
                  type="text"
                  list="subjects-datalist"
                  value={formSubject}
                  onChange={(e) => setFormSubject(e.target.value)}
                  placeholder="e.g. Mathematics or Computer Networks"
                  className="h-10 px-3 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-primary)] text-xs text-[var(--text-primary)] outline-none"
                />
                <datalist id="subjects-datalist">
                  {availableSubjectNames.map((name) => (
                    <option key={name} value={name} />
                  ))}
                </datalist>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-[var(--text-primary)]">Initial Status</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['planned', 'attended', 'missed'] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setFormStatus(st)}
                      className={`h-9 rounded-xl text-xs font-semibold capitalize border transition-all cursor-pointer ${
                        formStatus === st
                          ? 'bg-[var(--text-primary)] text-[var(--bg-primary)] border-transparent'
                          : 'bg-[var(--bg-tertiary)] border-[var(--border-secondary)] text-[var(--text-secondary)]'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-[var(--text-primary)]">Notes (Optional)</label>
                <input
                  type="text"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="e.g. Period 2, Laboratory session"
                  className="h-10 px-3 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-primary)] text-xs text-[var(--text-primary)] outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="apple-btn-secondary text-xs h-9 px-4 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="apple-btn-primary text-xs h-9 px-4 rounded-xl cursor-pointer"
                >
                  Save Log
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
