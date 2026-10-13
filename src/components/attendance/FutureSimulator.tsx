import React, { useState } from 'react';
import { Sliders, ArrowRight, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { simulateFutureAttendance } from '../../utils/attendancePlanner';

interface FutureSimulatorProps {
  currentConducted: number;
  currentAttended: number;
  targetPercentage: number;
}

export const FutureSimulator: React.FC<FutureSimulatorProps> = ({
  currentConducted,
  currentAttended,
  targetPercentage,
}) => {
  const [futurePlannedInput, setFuturePlannedInput] = useState<string>('15');
  const [futureAttendedInput, setFutureAttendedInput] = useState<string>('12');
  const [futureMissedInput, setFutureMissedInput] = useState<string>('3');

  const futurePlanned = Math.max(0, parseInt(futurePlannedInput) || 0);
  const futureAttended = Math.max(0, parseInt(futureAttendedInput) || 0);
  const futureMissed = Math.max(0, parseInt(futureMissedInput) || 0);

  const simResult = simulateFutureAttendance(
    currentConducted,
    currentAttended,
    futurePlanned,
    futureAttended,
    futureMissed,
    targetPercentage
  );

  const currentPct = currentConducted > 0 ? (currentAttended / currentConducted) * 100 : 0;
  const isSumExceeded = futureAttended + futureMissed > futurePlanned;

  return (
    <div className="apple-main-container p-6 sm:p-7 flex flex-col gap-5 border border-[var(--border-primary)] bg-[var(--surface)] shadow-xs">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-purple-500/10 dark:bg-purple-400/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-[var(--text-primary)]">
              Future Attendance Simulator
            </h3>
            <p className="text-xs text-[var(--text-secondary)]">
              Simulate upcoming class scenarios and project your final standing against {targetPercentage}%.
            </p>
          </div>
        </div>
      </div>

      {/* Simulator Inputs Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-[var(--text-primary)]">
            Planned Future Classes
          </label>
          <input
            type="number"
            min={0}
            max={200}
            value={futurePlannedInput}
            onChange={(e) => setFuturePlannedInput(e.target.value)}
            className="h-11 px-3.5 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-primary)] text-sm font-semibold text-[var(--text-primary)] outline-none focus:border-[var(--text-primary)] transition-all"
            placeholder="e.g. 15"
          />
          <span className="text-[11px] text-[var(--text-tertiary)]">Expected upcoming sessions</span>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-[var(--text-primary)]">
            Expect to Attend
          </label>
          <input
            type="number"
            min={0}
            max={futurePlanned}
            value={futureAttendedInput}
            onChange={(e) => setFutureAttendedInput(e.target.value)}
            className="h-11 px-3.5 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-primary)] text-sm font-semibold text-emerald-600 dark:text-emerald-400 outline-none focus:border-[var(--text-primary)] transition-all"
            placeholder="e.g. 12"
          />
          <span className="text-[11px] text-[var(--text-tertiary)]">Future sessions attended</span>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-[var(--text-primary)]">
            Expect to Miss
          </label>
          <input
            type="number"
            min={0}
            max={futurePlanned}
            value={futureMissedInput}
            onChange={(e) => setFutureMissedInput(e.target.value)}
            className="h-11 px-3.5 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-primary)] text-sm font-semibold text-amber-600 dark:text-amber-400 outline-none focus:border-[var(--text-primary)] transition-all"
            placeholder="e.g. 3"
          />
          <span className="text-[11px] text-[var(--text-tertiary)]">Future sessions missed</span>
        </div>
      </div>

      {/* Validation warning */}
      {isSumExceeded && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-700 dark:text-red-400 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>
            Attended ({futureAttended}) + Missed ({futureMissed}) = {futureAttended + futureMissed}, which exceeds total planned classes ({futurePlanned}).
          </span>
        </div>
      )}

      {/* Results Comparison Card */}
      {!isSumExceeded && currentConducted > 0 && simResult.projectedPercentage !== null && (
        <div className="p-4 sm:p-5 rounded-2xl bg-[var(--bg-tertiary)] border border-[var(--border-secondary)] flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
              Simulation Outcome
            </span>
            <div
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold self-start sm:self-auto ${
                simResult.targetMet
                  ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30'
                  : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30'
              }`}
            >
              {simResult.targetMet ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Target Met (≥ {targetPercentage}%)</span>
                </>
              ) : (
                <>
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Target Missed (&lt; {targetPercentage}%)</span>
                </>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
            <div className="p-3.5 rounded-xl bg-[var(--surface)] border border-[var(--border-secondary)] flex flex-col">
              <span className="text-[11px] font-medium text-[var(--text-secondary)]">Current Attendance</span>
              <span className="text-xl font-bold text-[var(--text-primary)] mt-1 tabular-nums">
                {currentPct.toFixed(2)}%
              </span>
              <span className="text-[10px] text-[var(--text-tertiary)]">
                {currentAttended} / {currentConducted} classes
              </span>
            </div>

            <div className="flex items-center justify-center text-[var(--text-tertiary)] hidden sm:flex">
              <ArrowRight className="w-6 h-6" />
            </div>

            <div className="p-3.5 rounded-xl bg-[var(--surface)] border border-[var(--border-secondary)] flex flex-col">
              <span className="text-[11px] font-medium text-[var(--text-secondary)]">Projected Attendance</span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-xl font-bold text-[var(--text-primary)] tabular-nums">
                  {simResult.projectedPercentage.toFixed(2)}%
                </span>
                {simResult.deltaPercentage !== null && (
                  <span
                    className={`text-xs font-bold tabular-nums ${
                      simResult.deltaPercentage >= 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-amber-600 dark:text-amber-400'
                    }`}
                  >
                    {simResult.deltaPercentage >= 0
                      ? `+${simResult.deltaPercentage.toFixed(2)}%`
                      : `${simResult.deltaPercentage.toFixed(2)}%`}
                  </span>
                )}
              </div>
              <span className="text-[10px] text-[var(--text-tertiary)]">
                {simResult.projectedAttended} / {simResult.projectedConducted} classes
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
