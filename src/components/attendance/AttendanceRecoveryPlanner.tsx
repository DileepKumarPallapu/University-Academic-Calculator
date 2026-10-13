import React from 'react';
import { TrendingUp, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { calculateRecoveryRequired } from '../../utils/attendancePlanner';

interface AttendanceRecoveryPlannerProps {
  conducted: number;
  attended: number;
  targetPercentage: number;
}

export const AttendanceRecoveryPlanner: React.FC<AttendanceRecoveryPlannerProps> = ({
  conducted,
  attended,
  targetPercentage,
}) => {
  const recovery = calculateRecoveryRequired(conducted, attended, targetPercentage);
  const currentPct = conducted > 0 ? (attended / conducted) * 100 : 0;
  const isMeetingTarget = currentPct >= targetPercentage;

  return (
    <div className="apple-main-container p-6 sm:p-7 flex flex-col gap-5 border border-[var(--border-primary)] bg-[var(--surface)] shadow-xs">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-blue-500/10 dark:bg-blue-400/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-[var(--text-primary)]">
              How Many Classes Must I Attend?
            </h3>
            <p className="text-xs text-[var(--text-secondary)]">
              Calculate consecutive classes required to reach or restore your {targetPercentage}% goal.
            </p>
          </div>
        </div>
      </div>

      {conducted <= 0 ? (
        <div className="p-4 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-secondary)] text-xs text-[var(--text-secondary)]">
          Enter class session counts above to see your attendance recovery roadmap.
        </div>
      ) : isMeetingTarget ? (
        <div className="p-5 rounded-2xl bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20 flex flex-col gap-2.5">
          <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-bold text-sm">
            <CheckCircle2 className="w-4 h-4" />
            <span>You are currently meeting your target.</span>
          </div>
          <p className="text-xs text-[var(--text-secondary)]">
            Your current attendance is {currentPct.toFixed(2)}%, which satisfies your {targetPercentage}% requirement. Maintain regular attendance to keep your buffer intact.
          </p>
        </div>
      ) : targetPercentage >= 100 && attended < conducted ? (
        <div className="p-5 rounded-2xl bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20 flex flex-col gap-2.5">
          <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300 font-bold text-sm">
            <AlertCircle className="w-4 h-4" />
            <span>100% Target Mathematical Advisory</span>
          </div>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            {recovery.explanation}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {/* Main Stat Card */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[var(--bg-tertiary)] border border-[var(--border-secondary)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex flex-col">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                Classes Needed Consecutively
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl sm:text-4xl font-extrabold text-[var(--text-primary)] tabular-nums">
                  {recovery.requiredSessions}
                </span>
                <span className="text-sm font-semibold text-[var(--text-secondary)]">
                  {recovery.requiredSessions === 1 ? 'consecutive class' : 'consecutive classes'}
                </span>
              </div>
            </div>

            {/* Estimated After Recovery */}
            <div className="px-3.5 py-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border-secondary)] flex flex-col text-xs shadow-2xs">
              <span className="text-[10px] text-[var(--text-tertiary)] font-medium">
                Projected Attendance After Recovery
              </span>
              <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                {recovery.projectedPercentage !== null ? `${recovery.projectedPercentage.toFixed(2)}%` : '—'}
              </span>
            </div>
          </div>

          {/* Progress Bar towards target */}
          <div className="flex flex-col gap-1.5 p-3.5 rounded-xl bg-[var(--surface)] border border-[var(--border-secondary)]">
            <div className="flex justify-between text-xs">
              <span className="text-[var(--text-secondary)]">Current: {currentPct.toFixed(1)}%</span>
              <span className="font-semibold text-[var(--text-primary)]">Target: {targetPercentage}%</span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-[var(--border-secondary)] overflow-hidden">
              <div
                className="h-full bg-blue-600 dark:bg-blue-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(5, (currentPct / targetPercentage) * 100))}%` }}
              />
            </div>
          </div>

          {/* Detailed Explanation */}
          <div className="p-3.5 rounded-xl bg-blue-500/5 dark:bg-blue-500/10 border border-blue-500/20 text-xs text-blue-950 dark:text-blue-100 flex items-start gap-2.5">
            <Info className="w-4 h-4 shrink-0 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div className="flex flex-col gap-0.5">
              <span className="font-semibold">Recovery Plan</span>
              <span className="leading-relaxed">{recovery.explanation}</span>
            </div>
          </div>

          {/* Formula */}
          <div className="p-3 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-secondary)] text-[11px] font-mono text-[var(--text-secondary)] leading-relaxed">
            <div className="text-[var(--text-primary)] font-semibold font-sans mb-0.5">
              Recovery Formula:
            </div>
            <span>[(Attended + x) ÷ (Conducted + x)] × 100 ≥ {targetPercentage}%</span>
          </div>
        </div>
      )}
    </div>
  );
};
