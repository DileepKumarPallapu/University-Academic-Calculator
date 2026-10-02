import React, { useState } from 'react';
import { Clock, Info, BookmarkPlus, CheckCircle2, AlertTriangle } from 'lucide-react';
import { calculateAttendance, formatFixed } from '../utils/calculations';
import { useHistory } from '../context/HistoryContext';
import { useAppToast } from '../components/layout/AppShell';

export const AttendancePlannerPage: React.FC = () => {
  const { addHistory } = useHistory();
  const { showToast } = useAppToast();

  const [conducted, setConducted] = useState<number | ''>(40);
  const [attended, setAttended] = useState<number | ''>(34);
  const [futureSessions, setFutureSessions] = useState<number | ''>(10);
  const [targetPercentage, setTargetPercentage] = useState<number | ''>(85);

  const numConducted = typeof conducted === 'number' ? conducted : 0;
  const numAttended = typeof attended === 'number' ? attended : 0;
  const numFuture = typeof futureSessions === 'number' ? futureSessions : 0;
  const numTarget = typeof targetPercentage === 'number' ? targetPercentage : 85;

  const result = calculateAttendance(numConducted, numAttended, numFuture, numTarget);

  const handleSaveToHistory = () => {
    addHistory({
      type: 'attendance',
      title: `Attendance Plan (${result.currentPercentage}% Current)`,
      resultSummary: `Current: ${result.currentPercentage}%, Projected: ${result.projectedPercentage}%`,
      score: `${result.currentPercentage}%`,
      percentage: `${result.projectedPercentage}% projected`,
      details: {
        ...result,
      },
    });
    showToast('Attendance plan saved to history', 'success');
  };

  return (
    <div className="flex flex-col gap-10 sm:gap-14 apple-reveal max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col items-center text-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-black dark:bg-white text-white dark:text-black flex items-center justify-center shadow-sm">
          <Clock className="w-6 h-6" />
        </div>
        <h1 className="text-[34px] sm:text-[48px] font-bold tracking-tight text-[#1D1D1F] dark:text-[#F5F5F7]">
          Attendance Planner
        </h1>
        <p className="text-[16px] text-[#6E6E73] dark:text-[#A1A1A6] max-w-lg leading-relaxed">
          Simulate attendance trajectories, calculate future required sessions, and plan your safe margins.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        {/* Form (7 Columns) */}
        <div className="md:col-span-7 bg-[#FFFFFF] dark:bg-[#1D1D1F] rounded-[24px] p-6 sm:p-8 border border-black/[0.08] dark:border-white/[0.12] shadow-sm flex flex-col gap-5">
          <h2 className="text-xl font-bold text-[#1D1D1F] dark:text-[#F5F5F7]">
            Session Parameters
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label htmlFor="conducted-sessions" className="text-xs font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                Total Sessions Conducted
              </label>
              <input
                id="conducted-sessions"
                type="number"
                inputMode="decimal"
                min={0}
                value={conducted}
                onChange={(e) => setConducted(e.target.value === '' ? '' : parseInt(e.target.value) || 0)}
                placeholder="e.g. 40"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-[#F5F5F7] dark:bg-[#2C2C2E] border border-black/[0.04] dark:border-white/[0.08] outline-none text-[#1D1D1F] dark:text-[#F5F5F7]"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="attended-sessions" className="text-xs font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                Sessions Attended
              </label>
              <input
                id="attended-sessions"
                type="number"
                inputMode="decimal"
                min={0}
                max={numConducted}
                value={attended}
                onChange={(e) => setAttended(e.target.value === '' ? '' : parseInt(e.target.value) || 0)}
                placeholder="e.g. 34"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-[#F5F5F7] dark:bg-[#2C2C2E] border border-black/[0.04] dark:border-white/[0.08] outline-none text-[#1D1D1F] dark:text-[#F5F5F7]"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="future-sessions" className="text-xs font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                Upcoming Scheduled Sessions
              </label>
              <input
                id="future-sessions"
                type="number"
                inputMode="decimal"
                min={0}
                value={futureSessions}
                onChange={(e) => setFutureSessions(e.target.value === '' ? '' : parseInt(e.target.value) || 0)}
                placeholder="e.g. 10"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-[#F5F5F7] dark:bg-[#2C2C2E] border border-black/[0.04] dark:border-white/[0.08] outline-none text-[#1D1D1F] dark:text-[#F5F5F7]"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="target-percentage" className="text-xs font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                Target Attendance (%)
              </label>
              <input
                id="target-percentage"
                type="number"
                inputMode="decimal"
                min={50}
                max={100}
                value={targetPercentage}
                onChange={(e) => setTargetPercentage(e.target.value === '' ? '' : parseFloat(e.target.value) || 75)}
                placeholder="e.g. 85"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-[#F5F5F7] dark:bg-[#2C2C2E] border border-black/[0.04] dark:border-white/[0.08] outline-none text-[#1D1D1F] dark:text-[#F5F5F7]"
              />
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between border-t border-black/[0.04] dark:border-white/[0.06]">
            <button
              type="button"
              onClick={handleSaveToHistory}
              className="px-5 py-2.5 rounded-full bg-black dark:bg-white text-white dark:text-black font-semibold text-xs apple-button-interaction flex items-center gap-1.5"
            >
              <BookmarkPlus className="w-3.5 h-3.5" />
              <span>Save Plan</span>
            </button>
            <span className="text-xs text-[#86868B]">Real-time simulation</span>
          </div>
        </div>

        {/* Results (5 Columns) */}
        <div className="md:col-span-5 flex flex-col gap-4">
          <div className="bg-[#FFFFFF] dark:bg-[#1D1D1F] rounded-[24px] p-6 sm:p-8 border border-black/[0.08] dark:border-white/[0.12] shadow-sm flex flex-col gap-5">
            <span className="text-[11px] font-semibold tracking-[0.08em] uppercase text-[#6E6E73] dark:text-[#A1A1A6]">
              ATTENDANCE STANDING
            </span>

            <div className="flex items-baseline justify-between border-b border-black/[0.06] dark:border-white/[0.08] pb-5">
              <div className="flex flex-col">
                <span className="text-5xl font-bold tracking-tight text-[#1D1D1F] dark:text-[#F5F5F7] tabular-nums">
                  {formatFixed(result.currentPercentage, 1)}%
                </span>
                <span className="text-xs text-[#6E6E73] dark:text-[#A1A1A6] mt-0.5">
                  Current ({numAttended}/{numConducted})
                </span>
              </div>
              <div className="flex flex-col text-right">
                <span className="text-2xl font-bold text-[#1D1D1F] dark:text-[#F5F5F7] tabular-nums">
                  {formatFixed(result.projectedPercentage, 1)}%
                </span>
                <span className="text-xs text-[#6E6E73] dark:text-[#A1A1A6] mt-0.5">
                  Projected (100% future attendance)
                </span>
              </div>
            </div>

            {/* Target Recommendation */}
            <div className="flex flex-col gap-2.5 text-xs text-[#6E6E73] dark:text-[#A1A1A6]">
              {result.currentPercentage >= numTarget ? (
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    Your attendance is currently above your {numTarget}% target. You can safely miss up to{' '}
                    <strong>{result.canBunkSessions}</strong> sessions without dropping below target.
                  </span>
                </div>
              ) : (
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    To reach your target of {numTarget}%, you need to attend at least{' '}
                    <strong>{result.sessionsNeededForTarget}</strong> consecutive upcoming sessions without missing.
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="p-5 rounded-[24px] bg-[#FFFFFF] dark:bg-[#1D1D1F] border border-black/[0.08] dark:border-white/[0.12] shadow-sm text-xs text-[#6E6E73] dark:text-[#A1A1A6] flex items-start gap-2.5">
            <Info className="w-4 h-4 text-[#86868B] shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              This is a mathematical projection tool. Official university condonation rules and attendance exemptions vary by department.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
