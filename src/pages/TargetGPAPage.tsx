import React, { useState } from 'react';
import { Target, AlertCircle, CheckCircle2, BookmarkPlus, HelpCircle } from 'lucide-react';
import { calculateTargetGPA, formatFixed } from '../utils/calculations';
import { useHistory } from '../context/HistoryContext';
import { useAppToast } from '../components/layout/AppShell';

export const TargetGPAPage: React.FC = () => {
  const { addHistory } = useHistory();
  const { showToast } = useAppToast();

  const [currentGpa, setCurrentGpa] = useState<number | ''>(8.2);
  const [currentCredits, setCurrentCredits] = useState<number | ''>(80);
  const [targetGpa, setTargetGpa] = useState<number | ''>(8.5);
  const [upcomingCredits, setUpcomingCredits] = useState<number | ''>(24);

  const numCurrentGpa = typeof currentGpa === 'number' ? currentGpa : 0;
  const numCurrentCredits = typeof currentCredits === 'number' ? currentCredits : 0;
  const numTargetGpa = typeof targetGpa === 'number' ? targetGpa : 0;
  const numUpcomingCredits = typeof upcomingCredits === 'number' ? upcomingCredits : 0;

  const result = calculateTargetGPA(
    numCurrentGpa,
    numCurrentCredits,
    numTargetGpa,
    numUpcomingCredits,
    10.0
  );

  const handleSaveToHistory = () => {
    if (numUpcomingCredits <= 0) {
      showToast('Upcoming credits must be greater than zero.', 'error');
      return;
    }
    addHistory({
      type: 'target_gpa',
      title: `Target GPA: ${numTargetGpa.toFixed(2)} (${numUpcomingCredits} Upcoming Credits)`,
      resultSummary: `Required: ${result.requiredGpa.toFixed(2)} / 10.00`,
      score: `${result.requiredGpa.toFixed(2)} GPA`,
      percentage: `${formatFixed((result.requiredGpa / 10) * 100, 1)}%`,
      details: {
        ...result,
      },
    });
    showToast('Target GPA plan saved to history', 'success');
  };

  return (
    <div className="flex flex-col gap-10 sm:gap-14 apple-reveal max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col items-center text-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-black dark:bg-white text-white dark:text-black flex items-center justify-center shadow-sm">
          <Target className="w-6 h-6" />
        </div>
        <h1 className="text-[34px] sm:text-[48px] font-bold tracking-tight text-[#1D1D1F] dark:text-[#F5F5F7]">
          Target GPA Calculator
        </h1>
        <p className="text-[16px] text-[#6E6E73] dark:text-[#A1A1A6] max-w-lg leading-relaxed">
          Determine the exact average grade point required in upcoming courses to achieve your desired graduation standing.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        {/* Inputs (7 Columns) */}
        <div className="md:col-span-7 bg-[#FFFFFF] dark:bg-[#1D1D1F] rounded-[24px] p-6 sm:p-8 border border-black/[0.08] dark:border-white/[0.12] shadow-sm flex flex-col gap-5">
          <h2 className="text-xl font-bold text-[#1D1D1F] dark:text-[#F5F5F7]">
            Academic Standing Parameters
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label htmlFor="current-gpa" className="text-xs font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                Current Cumulative GPA
              </label>
              <input
                id="current-gpa"
                type="number"
                inputMode="decimal"
                step={0.01}
                min={0}
                max={10}
                value={currentGpa}
                onChange={(e) => setCurrentGpa(e.target.value === '' ? '' : parseFloat(e.target.value))}
                placeholder="e.g. 8.20"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-[#F5F5F7] dark:bg-[#2C2C2E] border border-black/[0.04] dark:border-white/[0.08] outline-none text-[#1D1D1F] dark:text-[#F5F5F7]"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="completed-credits" className="text-xs font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                Completed Credits
              </label>
              <input
                id="completed-credits"
                type="number"
                inputMode="decimal"
                min={1}
                max={200}
                value={currentCredits}
                onChange={(e) => setCurrentCredits(e.target.value === '' ? '' : parseFloat(e.target.value))}
                placeholder="e.g. 80"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-[#F5F5F7] dark:bg-[#2C2C2E] border border-black/[0.04] dark:border-white/[0.08] outline-none text-[#1D1D1F] dark:text-[#F5F5F7]"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="target-gpa" className="text-xs font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                Desired Target GPA
              </label>
              <input
                id="target-gpa"
                type="number"
                inputMode="decimal"
                step={0.01}
                min={0}
                max={10}
                value={targetGpa}
                onChange={(e) => setTargetGpa(e.target.value === '' ? '' : parseFloat(e.target.value))}
                placeholder="e.g. 8.50"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-[#F5F5F7] dark:bg-[#2C2C2E] border border-black/[0.04] dark:border-white/[0.08] outline-none text-[#1D1D1F] dark:text-[#F5F5F7]"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="upcoming-credits" className="text-xs font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                Upcoming Credits
              </label>
              <input
                id="upcoming-credits"
                type="number"
                inputMode="decimal"
                min={1}
                max={60}
                value={upcomingCredits}
                onChange={(e) => setUpcomingCredits(e.target.value === '' ? '' : parseFloat(e.target.value))}
                placeholder="e.g. 24"
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
              <span>Save Target Plan</span>
            </button>
            <span className="text-xs text-[#86868B]">Real-time calculation</span>
          </div>
        </div>

        {/* Result Panel (5 Columns) */}
        <div className="md:col-span-5 flex flex-col gap-4">
          <div className="bg-[#FFFFFF] dark:bg-[#1D1D1F] rounded-[24px] p-6 sm:p-8 border border-black/[0.08] dark:border-white/[0.12] shadow-sm flex flex-col gap-5">
            <span className="text-[11px] font-semibold tracking-[0.08em] uppercase text-[#6E6E73] dark:text-[#A1A1A6]">
              REQUIRED GRADE POINT
            </span>

            <div className="flex items-baseline gap-2 border-b border-black/[0.06] dark:border-white/[0.08] pb-5">
              <span className={`text-6xl font-bold tracking-tight tabular-nums ${
                result.isPossible ? 'text-[#1D1D1F] dark:text-[#F5F5F7]' : 'text-rose-500'
              }`}>
                {formatFixed(result.requiredGpa, 2)}
              </span>
              <span className="text-xl text-[#6E6E73] dark:text-[#A1A1A6] font-medium">
                / 10
              </span>
            </div>

            {/* Status indicator */}
            <div className="flex items-start gap-2.5">
              {result.isPossible ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
              )}
              <p className="text-xs leading-relaxed text-[#6E6E73] dark:text-[#A1A1A6]">
                {result.explanation}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#F5F5F7] dark:bg-[#2C2C2E] flex flex-col gap-1.5 text-xs">
              <div className="flex justify-between text-[#6E6E73] dark:text-[#A1A1A6]">
                <span>Total Accumulated Credits:</span>
                <span className="font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] tabular-nums">
                  {numCurrentCredits + numUpcomingCredits}
                </span>
              </div>
              <div className="flex justify-between text-[#6E6E73] dark:text-[#A1A1A6]">
                <span>Max Attainable GPA:</span>
                <span className="font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] tabular-nums">
                  {result.maxPossibleGpa.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* 11. Credit Weighting Explanation */}
          <div className="p-5 rounded-[24px] bg-[#FFFFFF] dark:bg-[#1D1D1F] border border-black/[0.08] dark:border-white/[0.12] shadow-sm text-xs text-[#6E6E73] dark:text-[#A1A1A6] flex flex-col gap-2">
            <div className="flex items-center gap-1.5 font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
              <HelpCircle className="w-4 h-4 text-[#86868B]" />
              <span>Why credits matter</span>
            </div>
            <p className="leading-relaxed">
              In university systems, a 4-credit course has twice the impact on your cumulative grade as a 2-credit course.
            </p>
            <div className="p-2.5 rounded-xl bg-[#F5F5F7] dark:bg-[#2C2C2E] font-mono text-[11px] text-[#1D1D1F] dark:text-[#F5F5F7]">
              Req GPA = [Target × (Curr + Up) - Curr × Credits] ÷ Up
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
