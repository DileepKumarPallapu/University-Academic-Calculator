import React, { useState } from 'react';
import type { GamificationProfile, GamificationSummary } from '../../types/achievements';
import { LEVEL_TIERS } from '../../types/achievements';
import { Trophy, ChevronDown, ChevronUp, Sparkles, Award } from 'lucide-react';

interface LevelProgressBarProps {
  profile: GamificationProfile;
  summary: GamificationSummary;
}

export const LevelProgressBar: React.FC<LevelProgressBarProps> = ({ profile, summary }) => {
  const [showRanksModal, setShowRanksModal] = useState(false);
  const { nextLevelInfo } = summary;
  const currentTier = LEVEL_TIERS.find((t) => t.level === profile.currentLevel) || LEVEL_TIERS[0];
  const isMaxLevel = profile.currentLevel >= 10;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
            <Trophy className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400">
                Level {profile.currentLevel}
              </span>
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                {currentTier.badgeName}
              </span>
            </div>
            <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
              {profile.levelTitle}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-sm text-gray-500 dark:text-gray-400 font-medium">Total Experience</div>
            <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 flex items-center justify-end gap-1">
              <Sparkles className="w-5 h-5 text-amber-500 fill-amber-500" />
              <span>{profile.totalPoints.toLocaleString()}</span>
              <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">XP</span>
            </div>
          </div>

          <button
            onClick={() => setShowRanksModal(!showRanksModal)}
            className="px-3 py-2 text-xs font-semibold rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 flex items-center gap-1 transition-colors"
          >
            <span>Ranks & Perks</span>
            {showRanksModal ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Progress Bar towards next level */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs font-semibold">
          <span className="text-gray-600 dark:text-gray-300">
            {isMaxLevel
              ? 'Maximum Rank Reached'
              : `Progress to Level ${nextLevelInfo.level}: ${nextLevelInfo.title}`}
          </span>
          <span className="text-indigo-600 dark:text-indigo-400">
            {isMaxLevel ? 'Grandmaster Mastered' : `${nextLevelInfo.xpNeededForNextLevel} XP needed`}
          </span>
        </div>

        <div className="w-full h-3.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden p-0.5">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-amber-500 rounded-full transition-all duration-500 shadow-sm"
            style={{ width: `${isMaxLevel ? 100 : nextLevelInfo.progressPercentage}%` }}
          />
        </div>

        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>{currentTier.minXp} XP</span>
          <span>{isMaxLevel ? '5,000+ XP' : `${currentTier.maxXp + 1} XP`}</span>
        </div>
      </div>

      {/* Expandable Ranks List */}
      {showRanksModal && (
        <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-700">
          <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-1.5">
            <Award className="w-4 h-4 text-indigo-500" />
            <span>Academic Progression Path (10 Ranks)</span>
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {LEVEL_TIERS.map((tier) => {
              const isCurrent = tier.level === profile.currentLevel;
              const isPassed = tier.level < profile.currentLevel;

              return (
                <div
                  key={tier.level}
                  className={`p-3 rounded-lg border text-xs transition-all ${
                    isCurrent
                      ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-400 dark:border-indigo-500 shadow-sm'
                      : isPassed
                      ? 'bg-gray-50 dark:bg-gray-800/60 border-gray-200 dark:border-gray-700 opacity-80'
                      : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 opacity-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`font-bold px-1.5 py-0.5 rounded text-[10px] ${
                        isCurrent
                          ? 'bg-indigo-600 text-white'
                          : isPassed
                          ? 'bg-emerald-600 text-white'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                      }`}
                    >
                      Lvl {tier.level}
                    </span>
                    <span className="font-semibold text-gray-500 dark:text-gray-400">
                      {tier.minXp} XP
                    </span>
                  </div>
                  <div className="font-bold text-gray-900 dark:text-white truncate">
                    {tier.title}
                  </div>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                    {tier.perkDescription}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
