import React from 'react';
import { Target, CheckCircle2, AlertCircle, AlertTriangle, HelpCircle } from 'lucide-react';
import type { AttendanceStatus, AttendanceStatusDetails } from '../../utils/attendancePlanner';

interface AttendanceSummaryCardProps {
  percentage: number | null;
  attended: number;
  missed: number;
  conducted: number;
  targetPercentage: number;
  differenceFromTarget: number | null;
  statusDetails: AttendanceStatusDetails;
  denominatorLabel: string;
  subjectName?: string;
}

export const AttendanceSummaryCard: React.FC<AttendanceSummaryCardProps> = ({
  percentage,
  attended,
  missed,
  conducted,
  targetPercentage,
  differenceFromTarget,
  statusDetails,
  denominatorLabel,
  subjectName,
}) => {
  // SVG circular progress calculation
  const radius = 64;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset =
    percentage !== null
      ? circumference - (Math.min(100, Math.max(0, percentage)) / 100) * circumference
      : circumference;

  const getStatusIcon = (status: AttendanceStatus) => {
    switch (status) {
      case 'On Track':
        return <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
      case 'Needs Attention':
        return <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />;
      case 'At Risk':
        return <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />;
      case 'Insufficient Data':
      default:
        return <HelpCircle className="w-4 h-4 text-neutral-500" />;
    }
  };

  const getRingColor = (status: AttendanceStatus) => {
    switch (status) {
      case 'On Track':
        return 'stroke-emerald-500';
      case 'Needs Attention':
        return 'stroke-amber-500';
      case 'At Risk':
        return 'stroke-red-500';
      case 'Insufficient Data':
      default:
        return 'stroke-neutral-300 dark:stroke-neutral-700';
    }
  };

  return (
    <div className="apple-main-container p-6 sm:p-8 flex flex-col gap-6 shadow-xs border border-[var(--border-primary)] bg-[var(--surface)] transition-all">
      {/* Header with subject & status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
              Overall Status
            </span>
            {subjectName && (
              <>
                <span className="text-[var(--text-tertiary)]">•</span>
                <span className="text-xs font-medium text-[var(--text-secondary)] truncate max-w-[200px]">
                  {subjectName}
                </span>
              </>
            )}
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)]">
            Attendance Summary
          </h2>
        </div>

        {/* Status Badge */}
        <div
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${statusDetails.badgeClass} self-start sm:self-auto`}
        >
          {getStatusIcon(statusDetails.status)}
          <span>{statusDetails.label}</span>
        </div>
      </div>

      {/* Main Stats Row: Circle Ring & Numbers */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
        {/* Visual Progress Ring */}
        <div className="md:col-span-5 flex flex-col items-center justify-center p-4">
          <div className="relative w-44 h-44 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 160 160">
              {/* Background circle */}
              <circle
                cx="80"
                cy="80"
                r={radius}
                className="stroke-neutral-200 dark:stroke-neutral-800"
                strokeWidth="12"
                fill="transparent"
              />
              {/* Progress circle */}
              <circle
                cx="80"
                cy="80"
                r={radius}
                className={`${getRingColor(statusDetails.status)} transition-all duration-700 ease-out`}
                strokeWidth="12"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center text-center">
              <span className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[var(--text-primary)] tabular-nums">
                {percentage !== null ? `${percentage.toFixed(1)}%` : '—'}
              </span>
              <span className="text-xs font-semibold text-[var(--text-tertiary)] mt-0.5">
                Current Attendance
              </span>
            </div>
          </div>
          <p className="text-xs text-center text-[var(--text-secondary)] mt-2 max-w-[240px]">
            {statusDetails.description}
          </p>
        </div>

        {/* Detailed Stats Grid */}
        <div className="md:col-span-7 grid grid-cols-2 gap-3.5 sm:gap-4">
          <div className="p-3.5 sm:p-4 rounded-2xl bg-[var(--bg-tertiary)] border border-[var(--border-secondary)] flex flex-col">
            <span className="text-xs font-medium text-[var(--text-secondary)]">Classes Attended</span>
            <span className="text-2xl font-bold text-[var(--text-primary)] mt-1 tabular-nums">
              {attended}
            </span>
            <span className="text-[11px] text-[var(--text-tertiary)] mt-0.5">Present sessions</span>
          </div>

          <div className="p-3.5 sm:p-4 rounded-2xl bg-[var(--bg-tertiary)] border border-[var(--border-secondary)] flex flex-col">
            <span className="text-xs font-medium text-[var(--text-secondary)]">Classes Missed</span>
            <span className="text-2xl font-bold text-[var(--text-primary)] mt-1 tabular-nums">
              {missed}
            </span>
            <span className="text-[11px] text-[var(--text-tertiary)] mt-0.5">Absent sessions</span>
          </div>

          <div className="p-3.5 sm:p-4 rounded-2xl bg-[var(--bg-tertiary)] border border-[var(--border-secondary)] flex flex-col">
            <span className="text-xs font-medium text-[var(--text-secondary)] truncate" title={denominatorLabel}>
              Classes Counted
            </span>
            <span className="text-2xl font-bold text-[var(--text-primary)] mt-1 tabular-nums">
              {conducted}
            </span>
            <span className="text-[11px] text-[var(--text-tertiary)] mt-0.5 truncate" title={denominatorLabel}>
              {denominatorLabel}
            </span>
          </div>

          <div className="p-3.5 sm:p-4 rounded-2xl bg-[var(--bg-tertiary)] border border-[var(--border-secondary)] flex flex-col">
            <span className="text-xs font-medium text-[var(--text-secondary)]">Configured Target</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-bold text-[var(--text-primary)] tabular-nums">
                {targetPercentage}%
              </span>
              {differenceFromTarget !== null && (
                <span
                  className={`text-xs font-bold tabular-nums ${
                    differenceFromTarget >= 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-amber-600 dark:text-amber-400'
                  }`}
                >
                  {differenceFromTarget >= 0 ? `+${differenceFromTarget.toFixed(1)}%` : `${differenceFromTarget.toFixed(1)}%`}
                </span>
              )}
            </div>
            <span className="text-[11px] text-[var(--text-tertiary)] mt-0.5">
              {differenceFromTarget !== null && differenceFromTarget >= 0 ? 'Above target margin' : 'Below target gap'}
            </span>
          </div>
        </div>
      </div>

      {/* College Policy Notice */}
      <div className="pt-4 border-t border-[var(--border-secondary)] flex items-center gap-2 text-xs text-[var(--text-tertiary)]">
        <Target className="w-3.5 h-3.5 shrink-0" />
        <span>
          Target attendance is student-configurable. Verify your university or department guidelines for condonation and examination eligibility.
        </span>
      </div>
    </div>
  );
};
