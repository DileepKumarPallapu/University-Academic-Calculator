import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Trash2, ArrowUpRight, Clock } from 'lucide-react';
import {
  getRecentCalculations,
  deleteRecentCalculation,
  clearRecentCalculations,
  type RecentCalculation,
} from '../../utils/recentCalculations';
import { ResetConfirmModal } from './ResetConfirmModal';

export const RecentCalculationsList: React.FC<{ className?: string }> = ({ className = '' }) => {
  const [items, setItems] = useState<RecentCalculation[]>([]);
  const [showClearConfirm, setShowClearConfirm] = useState<boolean>(false);

  const loadItems = () => {
    setItems(getRecentCalculations());
  };

  useEffect(() => {
    loadItems();
    const handleUpdate = () => loadItems();
    window.addEventListener('recent-calculations-updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('recent-calculations-updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  if (items.length === 0) return null;

  const formatDate = (ts: number): string => {
    const d = new Date(ts);
    const day = String(d.getDate()).padStart(2, '0');
    const month = d.toLocaleDateString('en-US', { month: 'short' });
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
  };

  const getTypeLabel = (type: RecentCalculation['type']): string => {
    switch (type) {
      case 'gpa':
        return 'SGPA';
      case 'cgpa':
        return 'CGPA';
      case 'attendance':
        return 'Attendance';
      case 'internals':
        return 'Internal';
      default:
        return 'Calculation';
    }
  };

  const handleClearHistory = () => {
    clearRecentCalculations();
    setShowClearConfirm(false);
  };

  return (
    <>
      <div className={`apple-main-container p-6 sm:p-7 flex flex-col gap-4 no-print ${className}`}>
        <div className="flex items-center justify-between border-b border-[var(--border-secondary)] pb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[var(--text-secondary)]" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
              Recent Calculations
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setShowClearConfirm(true)}
            className="text-xs font-semibold text-[var(--text-secondary)] hover:text-rose-600 transition-colors cursor-pointer"
          >
            Clear History
          </button>
        </div>

        <div className="flex flex-col divide-y divide-[var(--border-secondary)] text-sm">
          {items.map((item) => (
            <div key={item.id} className="py-3 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 sm:gap-6 min-w-0">
                <span className="w-20 sm:w-24 text-xs font-bold uppercase tracking-wide text-[var(--text-secondary)] shrink-0">
                  {getTypeLabel(item.type)}
                </span>
                <span className="font-mono font-bold text-[var(--text-primary)] text-sm sm:text-base shrink-0">
                  {item.value}
                </span>
                <span className="hidden sm:inline text-xs text-[var(--text-secondary)] shrink-0 font-mono">
                  {formatDate(item.timestamp)}
                </span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Link
                  to={item.route}
                  className="h-8 px-3 rounded-lg bg-[var(--surface)] border border-[var(--border-primary)] text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] flex items-center gap-1 transition-colors"
                >
                  <span>Open</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
                <button
                  type="button"
                  onClick={() => deleteRecentCalculation(item.id)}
                  aria-label={`Delete ${item.title}`}
                  className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <ResetConfirmModal
        isOpen={showClearConfirm}
        onClose={() => setShowClearConfirm(false)}
        onConfirm={handleClearHistory}
        title="Clear recent calculations?"
        description="Are you sure you want to clear your calculation history from this device? This action cannot be undone."
      />
    </>
  );
};
