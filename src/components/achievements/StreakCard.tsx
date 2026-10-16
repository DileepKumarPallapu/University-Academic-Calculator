import React from 'react';
import type { GamificationProfile } from '../../types/achievements';
import { toLocalDateString, getPreviousDateString } from '../../services/achievementStorage';
import { Flame, Calendar, Award, CheckCircle2, Clock } from 'lucide-react';

interface StreakCardProps {
  profile: GamificationProfile;
}

export const StreakCard: React.FC<StreakCardProps> = ({ profile }) => {
  const { currentStreak, longestStreak, activeDates } = profile;
  const activeSet = new Set(activeDates || []);

  const todayStr = toLocalDateString(new Date());
  const yesterdayStr = getPreviousDateString(todayStr);
  const isActiveToday = activeSet.has(todayStr);
  const isActiveYesterday = activeSet.has(yesterdayStr);

  // Generate the last 14 days ending today for the activity calendar
  const last14Days: { dateStr: string; dayLabel: string; isToday: boolean; isActive: boolean }[] = [];
  let curr = todayStr;
  for (let i = 0; i < 14; i++) {
    const [y, m, d] = curr.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    const dayLabel = dateObj.toLocaleDateString('en-US', { weekday: 'narrow' }); // M, T, W, T, F, S, S

    last14Days.unshift({
      dateStr: curr,
      dayLabel,
      isToday: curr === todayStr,
      isActive: activeSet.has(curr),
    });
    curr = getPreviousDateString(curr);
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              currentStreak > 0
                ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 shadow-md shadow-amber-500/20'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-400'
            }`}
          >
            <Flame
              className={`w-6 h-6 ${currentStreak > 0 ? 'fill-amber-500 text-amber-500 animate-pulse' : ''}`}
            />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <span>Study Streak</span>
              {currentStreak > 0 && (
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  Active
                </span>
              )}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Consecutive days with study activity
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-right">
          <div>
            <div className="text-2xl font-black text-amber-500 flex items-center justify-end gap-1">
              <span>{currentStreak}</span>
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">days</span>
            </div>
            <div className="text-[11px] text-gray-500 dark:text-gray-400 flex items-center justify-end gap-1">
              <Award className="w-3.5 h-3.5 text-amber-500" />
              <span>Record: {longestStreak}d</span>
            </div>
          </div>
        </div>
      </div>

      {/* 14-Day Activity Heatmap */}
      <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            <span>14-Day Activity Timeline</span>
          </span>
          <span>{isActiveToday ? 'Logged today' : 'Not logged yet today'}</span>
        </div>

        <div className="grid grid-cols-14 gap-1.5 sm:gap-2">
          {last14Days.map((day) => (
            <div key={day.dateStr} className="flex flex-col items-center gap-1">
              <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400">
                {day.dayLabel}
              </span>
              <div
                title={`${day.dateStr}: ${day.isActive ? 'Active study day' : 'No activity logged'}`}
                className={`w-full aspect-square rounded-md flex items-center justify-center transition-all ${
                  day.isActive
                    ? 'bg-amber-500 text-white shadow-sm'
                    : day.isToday
                    ? 'border-2 border-dashed border-amber-400/60 dark:border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20'
                    : 'bg-gray-100 dark:bg-gray-700'
                }`}
              >
                {day.isActive && <CheckCircle2 className="w-3 h-3 text-white" />}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Motivational Status Box */}
      <div className="mt-4 p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 text-xs text-gray-600 dark:text-gray-300 flex items-center gap-2">
        <Clock className="w-4 h-4 text-amber-500 flex-shrink-0" />
        <span>
          {isActiveToday ? (
            <strong className="text-emerald-600 dark:text-emerald-400">
              Great job! You logged study activity today. Your streak is safe.
            </strong>
          ) : isActiveYesterday ? (
            <strong className="text-amber-600 dark:text-amber-400">
              Your streak is on the line! Complete any study task or focus session today to keep it.
            </strong>
          ) : (
            <span>
              Log a study session, finish a task, or take a mock exam to begin your study streak.
            </span>
          )}
        </span>
      </div>
    </div>
  );
};
