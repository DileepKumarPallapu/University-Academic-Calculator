import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { getAcademicSummary, type AcademicSummary } from '../../utils/recentCalculations';

export const AcademicSummaryCard: React.FC = () => {
  const [summary, setSummary] = useState<AcademicSummary>(getAcademicSummary());

  useEffect(() => {
    const handleUpdate = () => {
      setSummary(getAcademicSummary());
    };
    window.addEventListener('recent-calculations-updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('recent-calculations-updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  const hasAnyData = Boolean(
    summary.cgpa || summary.sgpa || summary.attendance || summary.internals
  );

  if (!hasAnyData) return null;

  const getRelativeTime = (timestamp?: number): string => {
    if (!timestamp) return 'Updated recently';
    const diffHours = (Date.now() - timestamp) / (1000 * 60 * 60);
    if (diffHours < 24) return 'Updated today';
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Updated yesterday';
    return `Updated ${diffDays} days ago`;
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
          Academic Snapshot
        </h2>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* CGPA */}
        {summary.cgpa && (
          <Link
            to={summary.cgpa.route}
            className="apple-card p-5 flex flex-col justify-between hover:border-[var(--text-primary)] transition-all group no-underline text-inherit"
          >
            <div>
              <div className="flex items-center justify-between gap-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] block truncate">
                  CGPA
                </span>
                <span className="text-[10px] text-[var(--text-tertiary)] shrink-0">
                  {getRelativeTime(summary.cgpa.timestamp)}
                </span>
              </div>
              <div className="text-[28px] sm:text-[32px] font-bold tracking-tight text-[var(--text-primary)] tabular-nums mt-1 leading-none">
                {summary.cgpa.value.replace(/\s*\/\s*10$/, '')}
              </div>
              {summary.cgpa.subtitle && (
                <div className="text-[11px] text-[var(--text-secondary)] mt-1.5 truncate">
                  {summary.cgpa.subtitle}
                </div>
              )}
            </div>
            <div className="mt-4 pt-3 border-t border-[var(--border-secondary)] flex items-center justify-between text-xs font-medium text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]">
              <span>View Details</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </div>
          </Link>
        )}

        {/* SGPA */}
        {summary.sgpa && (
          <Link
            to={summary.sgpa.route}
            className="apple-card p-5 flex flex-col justify-between hover:border-[var(--text-primary)] transition-all group no-underline text-inherit"
          >
            <div>
              <div className="flex items-center justify-between gap-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] block truncate">
                  Latest SGPA
                </span>
                <span className="text-[10px] text-[var(--text-tertiary)] shrink-0">
                  {getRelativeTime(summary.sgpa.timestamp)}
                </span>
              </div>
              <div className="text-[28px] sm:text-[32px] font-bold tracking-tight text-[var(--text-primary)] tabular-nums mt-1 leading-none">
                {summary.sgpa.value.replace(/\s*\/\s*10$/, '')}
              </div>
              {summary.sgpa.subtitle && (
                <div className="text-[11px] text-[var(--text-secondary)] mt-1.5 truncate">
                  {summary.sgpa.subtitle}
                </div>
              )}
            </div>
            <div className="mt-4 pt-3 border-t border-[var(--border-secondary)] flex items-center justify-between text-xs font-medium text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]">
              <span>View Details</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </div>
          </Link>
        )}

        {/* Attendance */}
        {summary.attendance && (
          <Link
            to={summary.attendance.route}
            className="apple-card p-5 flex flex-col justify-between hover:border-[var(--text-primary)] transition-all group no-underline text-inherit"
          >
            <div>
              <div className="flex items-center justify-between gap-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] block truncate">
                  Attendance
                </span>
                <span className="text-[10px] text-[var(--text-tertiary)] shrink-0">
                  {getRelativeTime(summary.attendance.timestamp)}
                </span>
              </div>
              <div className="text-[28px] sm:text-[32px] font-bold tracking-tight text-[var(--text-primary)] tabular-nums mt-1 leading-none">
                {summary.attendance.value}
              </div>
              {summary.attendance.subtitle && (
                <div className="text-[11px] text-[var(--text-secondary)] mt-1.5 truncate">
                  {summary.attendance.subtitle}
                </div>
              )}
            </div>
            <div className="mt-4 pt-3 border-t border-[var(--border-secondary)] flex items-center justify-between text-xs font-medium text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]">
              <span>View Details</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </div>
          </Link>
        )}

        {/* Latest Internal */}
        {summary.internals && (
          <Link
            to={summary.internals.route}
            className="apple-card p-5 flex flex-col justify-between hover:border-[var(--text-primary)] transition-all group no-underline text-inherit"
          >
            <div>
              <div className="flex items-center justify-between gap-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] block truncate">
                  Internal Marks
                </span>
                <span className="text-[10px] text-[var(--text-tertiary)] shrink-0">
                  {getRelativeTime(summary.internals.timestamp)}
                </span>
              </div>
              <div className="text-[28px] sm:text-[32px] font-bold tracking-tight text-[var(--text-primary)] tabular-nums mt-1 leading-none">
                {summary.internals.value}
              </div>
              {summary.internals.subtitle && (
                <div className="text-[11px] text-[var(--text-secondary)] mt-1.5 truncate">
                  {summary.internals.subtitle}
                </div>
              )}
            </div>
            <div className="mt-4 pt-3 border-t border-[var(--border-secondary)] flex items-center justify-between text-xs font-medium text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]">
              <span>View Details</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </div>
          </Link>
        )}
      </div>
    </div>
  );
};
