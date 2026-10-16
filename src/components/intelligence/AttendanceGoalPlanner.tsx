import React, { useState, useMemo } from 'react';
import {
  Info,
  RotateCcw,
  ShieldAlert,
} from 'lucide-react';
import {
  calculateAttendanceGoalPlan,
  type AttendanceGoalPlanResult,
} from '../../utils/attendancePlanner';
import { useProfile } from '../../context/ProfileContext';

export const AttendanceGoalPlanner: React.FC = () => {
  const { activeProfile } = useProfile();

  const [totalSessions, setTotalSessions] = useState<number | ''>(48);
  const [attendedSessions, setAttendedSessions] = useState<number | ''>(36);
  const [targetPercentage, setTargetPercentage] = useState<number | ''>(
    activeProfile.targetAttendance || 75
  );
  const [plannedFutureClasses, setPlannedFutureClasses] = useState<number | ''>(16);
  const [allowExtraClasses, setAllowExtraClasses] = useState<boolean>(false);
  const [isPolicyConfirmed, setIsPolicyConfirmed] = useState<boolean>(true);

  const numTotal = typeof totalSessions === 'number' ? totalSessions : 0;
  const numAttended = typeof attendedSessions === 'number' ? attendedSessions : 0;
  const numTarget = typeof targetPercentage === 'number' ? targetPercentage : 75;
  const numFuture = typeof plannedFutureClasses === 'number' ? plannedFutureClasses : 0;

  const result: AttendanceGoalPlanResult = useMemo(() => {
    return calculateAttendanceGoalPlan(
      numTotal,
      numAttended,
      numTarget,
      numFuture,
      {
        allowExtraClasses,
        isPolicyConfirmed,
        horizonLimit: 200,
      }
    );
  }, [numTotal, numAttended, numTarget, numFuture, allowExtraClasses, isPolicyConfirmed]);

  const handleReset = () => {
    setTotalSessions('');
    setAttendedSessions('');
    setPlannedFutureClasses('');
    setTargetPercentage(75);
    setAllowExtraClasses(false);
    setIsPolicyConfirmed(true);
  };

  return (
    <div className="flex flex-col gap-8 w-full max-w-5xl mx-auto">
      {/* Policy / Estimate Notice */}
      {result.isEstimate && (
        <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-200 text-xs sm:text-sm">
          <ShieldAlert className="w-5 h-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
          <div className="flex flex-col gap-1">
            <span className="font-bold uppercase tracking-wider text-[11px] text-amber-700 dark:text-amber-300">
              UNCONFIRMED INSTITUTIONAL RULES — ESTIMATE ONLY
            </span>
            <p className="leading-relaxed">
              Official college attendance regulations have not been confirmed for this query. Calculations are mathematical projections and should be verified with your department dean or academic mentor.
            </p>
          </div>
        </div>
      )}

      {/* Main Planner Card */}
      <div className="apple-card p-6 sm:p-8 flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border-secondary)] pb-5">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)]">
              Attendance Goal Planner
            </h2>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1">
              Plan your required classes, simulate upcoming sessions, and protect your eligibility.
            </p>
          </div>

          <button
            type="button"
            onClick={handleReset}
            className="apple-btn-secondary text-xs h-9 px-3.5 gap-1.5 self-start sm:self-auto"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        </div>

        {/* Inputs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[var(--text-primary)]">
              Official Total Sessions
            </label>
            <input
              type="number"
              min={0}
              value={totalSessions}
              onChange={(e) =>
                setTotalSessions(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value) || 0))
              }
              placeholder="e.g. 50"
              className="px-3.5 py-2 text-sm rounded-xl bg-[var(--surface)] border border-[var(--border-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
            <span className="text-[10px] text-[var(--text-tertiary)]">
              Conducted by department
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[var(--text-primary)]">
              Countable Present Sessions
            </label>
            <input
              type="number"
              min={0}
              value={attendedSessions}
              onChange={(e) =>
                setAttendedSessions(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value) || 0))
              }
              placeholder="e.g. 38"
              className="px-3.5 py-2 text-sm rounded-xl bg-[var(--surface)] border border-[var(--border-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
            <span className="text-[10px] text-[var(--text-tertiary)]">
              Officially counted as present
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[var(--text-primary)]">
              Desired Target (%)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={100}
                value={targetPercentage}
                onChange={(e) =>
                  setTargetPercentage(e.target.value === '' ? '' : Math.max(1, Math.min(100, parseInt(e.target.value) || 0)))
                }
                className="w-full px-3.5 py-2 text-sm rounded-xl bg-[var(--surface)] border border-[var(--border-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
              <div className="flex gap-1 shrink-0">
                {[75, 80, 85].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setTargetPercentage(preset)}
                    className={`px-2 py-1 text-[11px] font-semibold rounded-lg transition-colors ${
                      targetPercentage === preset
                        ? 'bg-blue-600 text-white'
                        : 'bg-[var(--surface)] border border-[var(--border-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {preset}%
                  </button>
                ))}
              </div>
            </div>
            <span className="text-[10px] text-[var(--text-tertiary)]">
              College threshold requirement
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[var(--text-primary)]">
              Planned Future Classes
            </label>
            <input
              type="number"
              min={0}
              value={plannedFutureClasses}
              onChange={(e) =>
                setPlannedFutureClasses(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value) || 0))
              }
              placeholder="e.g. 15"
              className="px-3.5 py-2 text-sm rounded-xl bg-[var(--surface)] border border-[var(--border-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
            <span className="text-[10px] text-[var(--text-tertiary)]">
              Upcoming sessions remaining
            </span>
          </div>
        </div>

        {/* Policy Toggles */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-secondary)] text-xs">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={allowExtraClasses}
              onChange={(e) => setAllowExtraClasses(e.target.checked)}
              className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
            />
            <span className="font-medium text-[var(--text-primary)]">
              Count extra/special sessions in official attendance (if permitted by policy)
            </span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={!isPolicyConfirmed}
              onChange={(e) => setIsPolicyConfirmed(!e.target.checked)}
              className="rounded text-amber-600 focus:ring-amber-500 h-4 w-4"
            />
            <span className="font-medium text-[var(--text-secondary)]">
              Mark calculation as unconfirmed estimate
            </span>
          </label>
        </div>

        {/* Results Banner */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-[var(--surface)] border border-[var(--border-primary)] flex flex-col justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
              Current Standing
            </span>
            <div className="mt-2">
              <span className="text-3xl sm:text-4xl font-extrabold text-[var(--text-primary)] tabular-nums">
                {result.currentPercentage !== null ? `${result.currentPercentage}%` : 'Not calculated'}
              </span>
              <div className="mt-1">
                <span
                  className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${result.statusDetails.badgeClass}`}
                >
                  {result.statusDetails.label}
                </span>
              </div>
            </div>
            <span className="text-[11px] text-[var(--text-tertiary)] mt-3">
              {result.countablePresentSessions} of {result.officialTotalSessions} countable sessions
            </span>
          </div>

          <div className="p-5 rounded-2xl bg-blue-500/5 dark:bg-blue-500/10 border border-blue-500/20 flex flex-col justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              Classes Needed for Goal
            </span>
            <div className="mt-2">
              <span className="text-3xl sm:text-4xl font-extrabold text-blue-600 dark:text-blue-400 tabular-nums">
                {result.currentPercentage === null
                  ? '—'
                  : result.additionalClassesNeeded === Infinity
                  ? 'N/A'
                  : result.additionalClassesNeeded}
              </span>
              <div className="text-xs font-semibold text-[var(--text-primary)] mt-1">
                {result.additionalClassesNeeded === 0
                  ? 'Target Met'
                  : result.additionalClassesNeeded === Infinity
                  ? '100% Unattainable'
                  : `consecutive ${result.additionalClassesNeeded === 1 ? 'class' : 'classes'} required`}
              </div>
            </div>
            <span className="text-[11px] text-[var(--text-secondary)] mt-3">
              assuming 100% attendance in future
            </span>
          </div>

          <div className="p-5 rounded-2xl bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20 flex flex-col justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Future Classes Simulation
            </span>
            <div className="mt-2">
              <span className="text-3xl sm:text-4xl font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">
                {result.projectedPercentageIfAllPlannedAttended !== null
                  ? `${result.projectedPercentageIfAllPlannedAttended}%`
                  : '—'}
              </span>
              <div className="text-xs font-semibold text-[var(--text-primary)] mt-1">
                {result.plannedFutureClasses > 0
                  ? result.canReachTargetWithPlannedClasses
                    ? `Attend at least ${result.classesNeededOutOfPlanned || 0} of ${result.plannedFutureClasses}`
                    : `Cannot reach ${result.desiredPercentage}% in ${result.plannedFutureClasses} classes`
                  : 'Enter future classes to simulate'}
              </div>
            </div>
            <span className="text-[11px] text-[var(--text-secondary)] mt-3">
              displayed attendance capped at 100%
            </span>
          </div>
        </div>

        {/* Narrative Explanation */}
        <div className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border-secondary)] flex items-start gap-3 text-xs leading-relaxed text-[var(--text-secondary)]">
          <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
          <div className="flex flex-col gap-1">
            <span className="font-semibold text-[var(--text-primary)]">
              Analysis Summary:
            </span>
            <p>{result.explanation}</p>
            {result.policyNote && (
              <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                {result.policyNote}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
