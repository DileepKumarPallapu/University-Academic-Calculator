import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Trash2, ArrowUpRight, Clock } from 'lucide-react';
import {
  getRecentCalculations,
  deleteRecentCalculation,
  clearRecentCalculations,
  type RecentCalculation,
} from '../../utils/recentCalculations';

export const RecentCalculationsList: React.FC<{ className?: string }> = ({ className = '' }) => {
  const [items, setItems] = useState<RecentCalculation[]>([]);

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

  const formatTimestamp = (ts: number): string => {
    const diff = Date.now() - ts;
    const minutes = Math.floor(diff / (1000 * 60));
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return new Date(ts).toLocaleDateString();
  };

  return (
    <div className={`apple-main-container p-6 sm:p-7 flex flex-col gap-4 no-print ${className}`}>
      <div className="flex items-center justify-between border-b border-[var(--border-secondary)] pb-3">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-[var(--text-secondary)]" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
            Recent Calculations
          </h2>
        </div>
        <button
          type="button"
          onClick={clearRecentCalculations}
          className="text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--danger)] transition-colors cursor-pointer"
        >
          Clear All
        </button>
      </div>

      <div className="flex flex-col divide-y divide-[var(--border-secondary)] text-sm">
        {items.map((item) => (
          <div key={item.id} className="py-3 flex items-center justify-between gap-4">
            <div className="flex flex-col">
              <span className="font-semibold text-[var(--text-primary)]">
                {item.title}
              </span>
              <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)] mt-0.5">
                <span className="font-mono font-bold text-[var(--text-primary)]">{item.value}</span>
                {item.subtext && (
                  <>
                    <span>•</span>
                    <span>{item.subtext}</span>
                  </>
                )}
                <span>•</span>
                <span>{formatTimestamp(item.timestamp)}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
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
                className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--danger)] transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
