import React from 'react';
import { Coffee, AlertTriangle, Info } from 'lucide-react';
import { calculateBunkMargin } from '../../utils/attendancePlanner';

interface SmartBunkPlannerProps {
  conducted: number;
  attended: number;
  targetPercentage: number;
}

export const SmartBunkPlanner: React.FC<SmartBunkPlannerProps> = ({
  conducted,
  attended,
  targetPercentage,
}) => {
  const bunkResult = calculateBunkMargin(conducted, attended, targetPercentage);

  return (
    <div className="apple-main-container p-6 sm:p-7 flex flex-col gap-5 border border-[var(--border-primary)] bg-[var(--surface)] shadow-xs">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 dark:bg-amber-400/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <Coffee className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-[var(--text-primary)]">
              Can I Skip a Class?
            </h3>
            <p className="text-xs text-[var(--text-secondary)]">
              Calculate your maximum safe absences while staying at or above {targetPercentage}%.
            </p>
          </div>
        </div>
      </div>

      {conducted <= 0 ? (
        <div className="p-4 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-secondary)] text-xs text-[var(--text-secondary)]">
          Enter class session counts above to compute your absence buffer.
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {/* Main Stat Card */}
          <div
            className={`p-4 sm:p-5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
              bunkResult.canSkipAtLeastOne
                ? 'bg-emerald-500/5 dark:bg-emerald-500/10 border-emerald-500/20 text-emerald-950 dark:text-emerald-100'
                : 'bg-amber-500/5 dark:bg-amber-500/10 border-amber-500/20 text-amber-950 dark:text-amber-100'
            }`}
          >
            <div className="flex flex-col">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                Safe Absence Buffer
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl sm:text-4xl font-extrabold text-[var(--text-primary)] tabular-nums">
                  {bunkResult.maxBunk}
                </span>
                <span className="text-sm font-semibold text-[var(--text-secondary)]">
                  {bunkResult.maxBunk === 1 ? 'class can be missed' : 'consecutive classes can be missed'}
                </span>
              </div>
            </div>

            {/* Projection Pills */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="px-3 py-2 rounded-xl bg-[var(--surface)] border border-[var(--border-secondary)] flex flex-col text-xs shadow-2xs">
                <span className="text-[10px] text-[var(--text-tertiary)] font-medium">
                  After {bunkResult.maxBunk} {bunkResult.maxBunk === 1 ? 'absence' : 'absences'}
                </span>
                <span className="text-sm font-bold text-[var(--text-primary)] tabular-nums">
                  {bunkResult.pctAfterBunk !== null ? `${bunkResult.pctAfterBunk.toFixed(2)}%` : '—'}
                </span>
              </div>

              <div className="px-3 py-2 rounded-xl bg-[var(--surface)] border border-[var(--border-secondary)] flex flex-col text-xs shadow-2xs">
                <span className="text-[10px] text-[var(--text-tertiary)] font-medium">
                  After +1 more absence
                </span>
                <span className="text-sm font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                  {bunkResult.pctAfterNextBunk !== null ? `${bunkResult.pctAfterNextBunk.toFixed(2)}%` : '—'}
                </span>
              </div>
            </div>
          </div>

          {/* Warning Message if 0 Bunk Available */}
          {!bunkResult.canSkipAtLeastOne && (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-300">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex flex-col gap-0.5">
                <span className="font-semibold">Zero Absence Buffer</span>
                <span>
                  Skipping even 1 additional class will drop your attendance to{' '}
                  <strong className="underline">
                    {bunkResult.pctAfterNextBunk !== null ? `${bunkResult.pctAfterNextBunk.toFixed(2)}%` : ''}
                  </strong>
                  , which is below your {targetPercentage}% requirement.
                </span>
              </div>
            </div>
          )}

          {/* Formula Breakdown */}
          <div className="p-3 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-secondary)] text-[11px] font-mono text-[var(--text-secondary)] leading-relaxed">
            <div className="text-[var(--text-primary)] font-semibold font-sans mb-0.5">
              Bunk Formula:
            </div>
            <span>Attendance % after x absences = [Attended ÷ (Conducted + x)] × 100 ≥ {targetPercentage}%</span>
          </div>

          {/* Institutional Policy Disclaimer */}
          <div className="flex items-center gap-2 text-xs text-[var(--text-tertiary)] pt-1">
            <Info className="w-3.5 h-3.5 shrink-0" />
            <span>
              This planner calculates mathematical buffers only. Do not risk internal assessment marks or attendance criteria.
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
