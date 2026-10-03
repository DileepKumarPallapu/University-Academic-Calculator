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

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
          My Academic Summary
        </h2>
      </div>

      {!hasAnyData ? (
        <div className="apple-main-container p-6 sm:p-7 text-center rounded-2xl border border-[var(--border-primary)] flex flex-col items-center justify-center gap-2">
          <p className="text-sm font-medium text-[var(--text-secondary)]">
            Complete a calculation to see your academic summary.
          </p>
          <Link
            to="/internals"
            className="text-xs font-semibold text-[var(--text-primary)] hover:underline mt-1"
          >
            Start with Internal Marks →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* CGPA */}
          {summary.cgpa && (
            <Link
              to={summary.cgpa.route}
              className="apple-card p-5 flex flex-col justify-between hover:border-[var(--text-primary)] transition-all group no-underline text-inherit"
            >
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] block">
                  Current CGPA
                </span>
                <div className="text-[28px] sm:text-[32px] font-bold tracking-tight text-[var(--text-primary)] tabular-nums mt-1 leading-none">
                  {summary.cgpa.value.replace(/\s*\/\s*10$/, '')}
                </div>
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
                <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] block">
                  Latest SGPA
                </span>
                <div className="text-[28px] sm:text-[32px] font-bold tracking-tight text-[var(--text-primary)] tabular-nums mt-1 leading-none">
                  {summary.sgpa.value.replace(/\s*\/\s*10$/, '')}
                </div>
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
                <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] block">
                  Attendance
                </span>
                <div className="text-[28px] sm:text-[32px] font-bold tracking-tight text-[var(--text-primary)] tabular-nums mt-1 leading-none">
                  {summary.attendance.value}
                </div>
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
                <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] block">
                  Latest Internal
                </span>
                <div className="text-[28px] sm:text-[32px] font-bold tracking-tight text-[var(--text-primary)] tabular-nums mt-1 leading-none">
                  {summary.internals.value}
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-[var(--border-secondary)] flex items-center justify-between text-xs font-medium text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]">
                <span>View Details</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </div>
            </Link>
          )}
        </div>
      )}
    </div>
  );
};
