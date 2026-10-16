import React from 'react';
import type { WeeklyChallenge } from '../../types/achievements';
import { Target, CheckCircle2, Sparkles, Clock, Flame, BookOpen, CheckSquare, FileQuestion } from 'lucide-react';

interface WeeklyChallengesCardProps {
  challenges: WeeklyChallenge[];
  onClaim: (challengeId: string) => void;
}

export const WeeklyChallengesCard: React.FC<WeeklyChallengesCardProps> = ({
  challenges,
  onClaim,
}) => {
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'sessions':
        return <Flame className="w-4 h-4 text-amber-500" />;
      case 'tasks':
        return <CheckCircle2 className="w-4 h-4 text-indigo-500" />;
      case 'topics':
        return <BookOpen className="w-4 h-4 text-emerald-500" />;
      case 'exams':
        return <FileQuestion className="w-4 h-4 text-purple-500" />;
      case 'mistakes':
        return <CheckSquare className="w-4 h-4 text-rose-500" />;
      default:
        return <Target className="w-4 h-4 text-indigo-500" />;
    }
  };

  const completedCount = challenges.filter((c) => c.isCompleted).length;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 flex items-center justify-center">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white">
              Weekly Learning Goals
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Personal targets derived from your saved study records
            </p>
          </div>
        </div>

        <div className="text-xs font-semibold px-2.5 py-1 rounded-full bg-purple-50 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800">
          {completedCount} / {challenges.length} Finished
        </div>
      </div>

      <div className="space-y-3">
        {challenges.map((challenge) => {
          const progressPercent = Math.min(
            100,
            Math.round((challenge.currentCount / challenge.targetCount) * 100)
          );

          return (
            <div
              key={challenge.id}
              className={`p-3.5 rounded-xl border transition-all ${
                challenge.isClaimed
                  ? 'bg-gray-50 dark:bg-gray-800/60 border-gray-200 dark:border-gray-700 opacity-75'
                  : challenge.isCompleted
                  ? 'bg-purple-50/60 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800 shadow-sm'
                  : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700'
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-start gap-2.5">
                  <div className="mt-0.5 p-1 rounded-md bg-gray-100 dark:bg-gray-700">
                    {getCategoryIcon(challenge.category)}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 dark:text-white leading-snug">
                      {challenge.title}
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {challenge.description}
                    </p>
                  </div>
                </div>

                <div className="flex-shrink-0 text-right">
                  {challenge.isClaimed ? (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 px-2 py-1 rounded bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Claimed</span>
                    </span>
                  ) : challenge.isCompleted ? (
                    <button
                      onClick={() => onClaim(challenge.id)}
                      className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-md shadow-purple-500/20 transition-all transform active:scale-95 animate-pulse"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                      <span>Claim +{challenge.pointsReward} XP</span>
                    </button>
                  ) : (
                    <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-0.5">
                      <Sparkles className="w-3 h-3 text-amber-500" />
                      <span>+{challenge.pointsReward} XP</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Progress bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] font-semibold text-gray-500 dark:text-gray-400">
                  <span>
                    Progress: {challenge.currentCount} / {challenge.targetCount}
                  </span>
                  <span>{progressPercent}%</span>
                </div>
                <div className="w-full h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      challenge.isCompleted
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                        : 'bg-gradient-to-r from-purple-500 to-indigo-500'
                    }`}
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between text-[11px] text-gray-400">
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          <span>Resets every Monday at 00:00</span>
        </span>
        <span>Week of {challenges[0]?.weekStartDate || 'Current'}</span>
      </div>
    </div>
  );
};
