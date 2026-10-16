import React, { useState } from 'react';
import type { StudentAchievement } from '../../types/achievements';
import {
  Trophy,
  Flame,
  Target,
  Zap,
  Crown,
  CheckCircle2,
  Award,
  BookOpen,
  Sparkles,
  Medal,
  FileQuestion,
  GraduationCap,
  Star,
  CheckSquare,
  ShieldCheck,
  FolderLock,
  Archive,
  Lock,
  Check,
} from 'lucide-react';

interface AchievementBadgesGridProps {
  achievements: StudentAchievement[];
}

export const AchievementBadgesGrid: React.FC<AchievementBadgesGridProps> = ({ achievements }) => {
  const [statusFilter, setStatusFilter] = useState<'all' | 'unlocked' | 'locked'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const getBadgeIcon = (iconName: string) => {
    switch (iconName) {
      case 'Flame':
        return <Flame className="w-5 h-5 text-amber-500" />;
      case 'Target':
        return <Target className="w-5 h-5 text-indigo-500" />;
      case 'Zap':
        return <Zap className="w-5 h-5 text-yellow-500" />;
      case 'Crown':
        return <Crown className="w-5 h-5 text-amber-500" />;
      case 'CheckCircle2':
        return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
      case 'Award':
        return <Award className="w-5 h-5 text-purple-500" />;
      case 'Trophy':
        return <Trophy className="w-5 h-5 text-amber-500" />;
      case 'BookOpen':
        return <BookOpen className="w-5 h-5 text-blue-500" />;
      case 'Sparkles':
        return <Sparkles className="w-5 h-5 text-amber-500" />;
      case 'Medal':
        return <Medal className="w-5 h-5 text-indigo-500" />;
      case 'FileQuestion':
        return <FileQuestion className="w-5 h-5 text-purple-500" />;
      case 'GraduationCap':
        return <GraduationCap className="w-5 h-5 text-indigo-500" />;
      case 'Star':
        return <Star className="w-5 h-5 text-amber-500 fill-amber-500" />;
      case 'CheckSquare':
        return <CheckSquare className="w-5 h-5 text-rose-500" />;
      case 'ShieldCheck':
        return <ShieldCheck className="w-5 h-5 text-emerald-500" />;
      case 'FolderLock':
        return <FolderLock className="w-5 h-5 text-blue-500" />;
      case 'Archive':
        return <Archive className="w-5 h-5 text-slate-500" />;
      default:
        return <Award className="w-5 h-5 text-indigo-500" />;
    }
  };

  const getTierBadgeStyle = (tier: string) => {
    switch (tier) {
      case 'gold':
        return 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-700';
      case 'silver':
        return 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600';
      case 'bronze':
      default:
        return 'bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-400 border-orange-300 dark:border-orange-700';
    }
  };

  const filteredAchievements = achievements.filter((a) => {
    if (statusFilter === 'unlocked' && !a.isUnlocked) return false;
    if (statusFilter === 'locked' && a.isUnlocked) return false;
    if (categoryFilter !== 'all' && a.category !== categoryFilter) return false;
    return true;
  });

  const unlockedCount = achievements.filter((a) => a.isUnlocked).length;
  const lockedCount = achievements.length - unlockedCount;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <span>Milestone Badges</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400">
              {unlockedCount} / {achievements.length} Unlocked
            </span>
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Earn badges through verifiable study focus, syllabus completion, and mock exam practice
          </p>
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-1.5 p-1 bg-gray-100 dark:bg-gray-700/60 rounded-lg text-xs font-medium">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1 rounded-md transition-colors ${
              statusFilter === 'all'
                ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-xs font-bold'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            All ({achievements.length})
          </button>
          <button
            onClick={() => setStatusFilter('unlocked')}
            className={`px-3 py-1 rounded-md transition-colors ${
              statusFilter === 'unlocked'
                ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-xs font-bold'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Unlocked ({unlockedCount})
          </button>
          <button
            onClick={() => setStatusFilter('locked')}
            className={`px-3 py-1 rounded-md transition-colors ${
              statusFilter === 'locked'
                ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-xs font-bold'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Locked ({lockedCount})
          </button>
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex flex-wrap items-center gap-2 mb-6 pb-4 border-b border-gray-100 dark:border-gray-700">
        {[
          { id: 'all', label: 'All Categories' },
          { id: 'study_sessions', label: 'Focus Sessions' },
          { id: 'tasks', label: 'Study Tasks' },
          { id: 'syllabus', label: 'Syllabus Units' },
          { id: 'mock_exams', label: 'Mock Exams' },
          { id: 'mistakes', label: 'Mistake Notebook' },
          { id: 'vault', label: 'Academic Vault' },
          { id: 'streaks', label: 'Streaks' },
        ].map((cat) => (
          <button
            key={cat.id}
            onClick={() => setCategoryFilter(cat.id)}
            className={`px-2.5 py-1 text-xs rounded-full border transition-all ${
              categoryFilter === cat.id
                ? 'bg-indigo-600 text-white border-indigo-600 font-bold shadow-xs'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-indigo-300'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Badges Grid */}
      {filteredAchievements.length === 0 ? (
        <div className="text-center py-12 px-4 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
          <Trophy className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
          <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300">
            No badges match the selected filters
          </h4>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Try switching to "All" or choosing another category.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAchievements.map((badge) => {
            const progressPercent = Math.min(
              100,
              Math.round((badge.currentProgress / badge.targetValue) * 100)
            );

            return (
              <div
                key={badge.id}
                className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                  badge.isUnlocked
                    ? 'bg-white dark:bg-gray-800 border-indigo-200 dark:border-indigo-800/80 shadow-xs'
                    : 'bg-gray-50/70 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700/80 opacity-80'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2.5">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-11 h-11 rounded-xl flex items-center justify-center ${
                          badge.isUnlocked
                            ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 ring-2 ring-indigo-500/20'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-400'
                        }`}
                      >
                        {getBadgeIcon(badge.icon)}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded border ${getTierBadgeStyle(
                              badge.tier
                            )}`}
                          >
                            {badge.tier}
                          </span>
                          <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                            +{badge.xpReward} XP
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-gray-900 dark:text-white leading-tight mt-0.5">
                          {badge.title}
                        </h4>
                      </div>
                    </div>

                    <div className="flex-shrink-0">
                      {badge.isUnlocked ? (
                        <div
                          title="Unlocked"
                          className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </div>
                      ) : (
                        <div
                          title="Locked"
                          className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-400 flex items-center justify-center"
                        >
                          <Lock className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 mb-3">
                    {badge.description}
                  </p>
                </div>

                <div className="pt-2 border-t border-gray-100 dark:border-gray-700/60">
                  <div className="flex justify-between items-center text-[11px] font-semibold text-gray-500 dark:text-gray-400 mb-1">
                    <span>
                      {badge.isUnlocked
                        ? 'Completed'
                        : `Progress: ${badge.currentProgress} / ${badge.targetValue}`}
                    </span>
                    <span>{progressPercent}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        badge.isUnlocked
                          ? 'bg-emerald-500'
                          : 'bg-gradient-to-r from-indigo-500 to-purple-500'
                      }`}
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>

                  {badge.unlockedAt && (
                    <div className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1.5 font-medium">
                      Unlocked on {new Date(badge.unlockedAt).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
