import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, RotateCcw } from 'lucide-react';
import { getRecentCalculations, type RecentCalculation } from '../../utils/recentCalculations';

export const ContinueCalculationCard: React.FC<{ className?: string }> = ({ className = '' }) => {
  const [latestItem, setLatestItem] = useState<RecentCalculation | null>(null);

  const loadLatest = () => {
    const items = getRecentCalculations();
    if (items && items.length > 0) {
      setLatestItem(items[0]);
    } else {
      setLatestItem(null);
    }
  };

  useEffect(() => {
    loadLatest();
    const handleUpdate = () => loadLatest();
    window.addEventListener('recent-calculations-updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('recent-calculations-updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  if (!latestItem) return null;

  const getTypeLabel = (type: RecentCalculation['type']): string => {
    switch (type) {
      case 'gpa':
        return 'SGPA';
      case 'cgpa':
        return 'CGPA';
      case 'attendance':
        return 'Attendance';
      case 'internals':
        return 'Internal Marks';
      default:
        return 'Calculation';
    }
  };

  return (
    <div className={`apple-card p-6 sm:p-7 border border-[var(--border-primary)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 ${className}`}>
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-secondary)] flex items-center justify-center text-[var(--text-primary)] shrink-0 mt-0.5">
          <RotateCcw className="w-5 h-5 text-[var(--text-secondary)]" />
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
              Continue
            </span>
            <span className="text-[var(--text-tertiary)]">•</span>
            <span className="text-xs font-medium text-[var(--text-secondary)]">
              Continue your recent calculation
            </span>
          </div>
          <div className="flex flex-wrap items-baseline gap-2.5 mt-1.5">
            <span className="text-base font-bold text-[var(--text-primary)]">
              {getTypeLabel(latestItem.type)}
            </span>
            {latestItem.subtitle && (
              <span className="text-xs text-[var(--text-secondary)] font-medium">
                {latestItem.subtitle}
              </span>
            )}
            <span className="font-mono text-sm font-semibold text-[var(--text-primary)] bg-[var(--bg-tertiary)] px-2 py-0.5 rounded-md">
              {latestItem.value}
            </span>
          </div>
        </div>
      </div>

      <Link
        to={latestItem.route}
        className="apple-btn-secondary text-xs h-9 px-4 py-0 flex items-center gap-1.5 shrink-0 self-stretch sm:self-auto justify-center"
      >
        <span>Continue</span>
        <ArrowRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
};
