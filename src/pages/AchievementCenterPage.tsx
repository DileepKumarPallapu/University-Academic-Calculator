import React, { useState, useEffect, useCallback } from 'react';
import { useProfile } from '../context/ProfileContext';
import type { GamificationSummary } from '../types/achievements';
import {
  syncGamificationEngine,
  claimWeeklyChallenge,
} from '../services/achievementStorage';
import { LevelProgressBar } from '../components/achievements/LevelProgressBar';
import { StreakCard } from '../components/achievements/StreakCard';
import { WeeklyChallengesCard } from '../components/achievements/WeeklyChallengesCard';
import { AchievementBadgesGrid } from '../components/achievements/AchievementBadgesGrid';
import { PointsHistoryModal } from '../components/achievements/PointsHistoryModal';
import {
  Trophy,
  Flame,
  Award,
  Sparkles,
  Info,
  RefreshCw,
  History,
  Download,
  CheckCircle2,
  BookOpen,
} from 'lucide-react';

export const AchievementCenterPage: React.FC = () => {
  const { activeProfile } = useProfile();
  const [summary, setSummary] = useState<GamificationSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'info' } | null>(
    null
  );

  const profileId = activeProfile?.id || 'default_student_profile';

  const loadGamification = useCallback(
    async (isManualRefresh = false) => {
      if (isManualRefresh) setRefreshing(true);
      try {
        const res = await syncGamificationEngine(profileId);
        setSummary(res);
      } catch (err) {
        console.error('Failed to sync gamification data:', err);
      } finally {
        setLoading(false);
        if (isManualRefresh) {
          setRefreshing(false);
          setNotification({ message: 'Activity records synchronized successfully!', type: 'success' });
          setTimeout(() => setNotification(null), 3000);
        }
      }
    },
    [profileId]
  );

  useEffect(() => {
    loadGamification();
  }, [loadGamification]);

  // Listen for storage or gamification update events
  useEffect(() => {
    const handleUpdate = () => {
      loadGamification();
    };

    window.addEventListener('gamification-updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    window.addEventListener('student-profile-updated', handleUpdate);

    return () => {
      window.removeEventListener('gamification-updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
      window.removeEventListener('student-profile-updated', handleUpdate);
    };
  }, [loadGamification]);

  const handleClaimChallenge = (challengeId: string) => {
    const result = claimWeeklyChallenge(profileId, challengeId);
    if (result.success) {
      setNotification({ message: result.message, type: 'success' });
      loadGamification();
      setTimeout(() => setNotification(null), 4000);
    } else {
      setNotification({ message: result.message, type: 'info' });
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const handleExportSummary = () => {
    if (!summary) return;
    const reportData = {
      app: 'University Academic Calculator',
      module: 'Academic Achievement & Gamification Center',
      studentName: activeProfile?.name || 'Student',
      department: activeProfile?.department || activeProfile?.branch || 'General',
      exportDate: new Date().toISOString(),
      gamificationProfile: summary.profile,
      unlockedBadges: summary.achievements
        .filter((a) => a.isUnlocked)
        .map((a) => ({
          title: a.title,
          category: a.category,
          tier: a.tier,
          xpReward: a.xpReward,
          unlockedAt: a.unlockedAt ? new Date(a.unlockedAt).toISOString() : null,
        })),
      weeklyChallengesCompleted: summary.activeChallenges.filter((c) => c.isClaimed).length,
      totalPointsEarned: summary.profile.totalPoints,
      currentRank: summary.profile.levelTitle,
      disclaimer:
        'Personal learning milestone record. Not an official university transcript or degree qualification.',
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `academic-achievement-report-${activeProfile?.name?.replace(/\s+/g, '_') || 'student'}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8">
        <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mb-4" />
        <p className="text-sm font-semibold text-gray-600 dark:text-gray-400">
          Syncing Academic Achievement Center...
        </p>
      </div>
    );
  }

  if (!summary) {
    return null;
  }

  const { profile, achievements, unlockedCount, recentTransactions, activeChallenges } = summary;
  const isZeroProfile = profile.totalPoints === 0 && unlockedCount === 0 && profile.currentStreak === 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed top-5 right-5 z-50 p-4 rounded-xl shadow-lg border flex items-center gap-3 transition-all transform animate-in fade-in slide-in-from-top-3 ${
            notification.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/80 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
              : 'bg-indigo-50 dark:bg-indigo-950/80 border-indigo-200 dark:border-indigo-800 text-indigo-800 dark:text-indigo-200'
          }`}
        >
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span className="text-xs font-semibold">{notification.message}</span>
        </div>
      )}

      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-gray-200 dark:border-gray-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800">
              Personal Study Motivation
            </span>
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
              Student: <strong className="text-gray-900 dark:text-white">{activeProfile?.name || 'Student Profile'}</strong>
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
            <Trophy className="w-8 h-8 text-amber-500 fill-amber-500/20" />
            <span>Academic Achievement & Gamification Center</span>
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Build study habits, protect your daily learning streak, and master your university curriculum.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsHistoryOpen(true)}
            className="px-3.5 py-2 text-xs font-bold rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/60 text-gray-700 dark:text-gray-200 flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <History className="w-4 h-4 text-indigo-500" />
            <span>Points Ledger ({recentTransactions.length})</span>
          </button>

          <button
            onClick={handleExportSummary}
            className="px-3.5 py-2 text-xs font-bold rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/60 text-gray-700 dark:text-gray-200 flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <Download className="w-4 h-4 text-emerald-500" />
            <span>Export Report</span>
          </button>

          <button
            onClick={() => loadGamification(true)}
            disabled={refreshing}
            className="px-3.5 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'Syncing...' : 'Sync Activity'}</span>
          </button>
        </div>
      </div>

      {/* Prominent Educational Milestone Disclaimer */}
      <div className="p-4 rounded-xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/60 flex items-start gap-3">
        <Info className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
          <strong>Personal Learning Milestone & Habit Tool:</strong> Experience points (XP), ranks, streaks, and badges in this center reflect your genuine study sessions, completed tasks, syllabus progress, and mock exam practice. They are designed for self-motivation and personal productivity. They <strong>do NOT</strong> convert into university semester marks, degree credits, official GPAs, or certified diplomas.
        </div>
      </div>

      {/* Empty State Banner for New / Fresh Profiles */}
      {isZeroProfile && (
        <div className="p-6 rounded-2xl bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 dark:from-indigo-950/30 dark:via-purple-950/30 dark:to-pink-950/30 border border-indigo-100 dark:border-indigo-900/50 flex flex-col sm:flex-row items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-indigo-600 text-white flex items-center justify-center flex-shrink-0 shadow-lg shadow-indigo-500/20">
            <Sparkles className="w-8 h-8 text-amber-300" />
          </div>
          <div className="text-center sm:text-left flex-1">
            <h3 className="text-base font-bold text-gray-900 dark:text-white">
              Welcome to Your Academic Achievement Center!
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 max-w-2xl leading-relaxed">
              Your profile currently starts fresh with 0 XP, Level 1 (Novice Scholar), and 0 badges. No points are ever fabricated or awarded from sample data. Log your first study session in Exam Prep, complete a study task in the Semester Planner, or take a practice mock test to start earning your first badges!
            </p>
          </div>
          <a
            href="/study-companion"
            className="px-4 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 shadow-sm transition-colors flex-shrink-0"
          >
            <BookOpen className="w-4 h-4" />
            <span>Open Study Planner</span>
          </a>
        </div>
      )}

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-amber-500 fill-amber-500" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">Total Experience</div>
            <div className="text-lg font-black text-gray-900 dark:text-white">
              {profile.totalPoints.toLocaleString()} <span className="text-xs font-medium text-gray-400">XP</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <Flame className="w-5 h-5 fill-amber-500 text-amber-500" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">Current Streak</div>
            <div className="text-lg font-black text-gray-900 dark:text-white">
              {profile.currentStreak} <span className="text-xs font-medium text-gray-400">Days</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <Award className="w-5 h-5 text-emerald-500" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">Badges Unlocked</div>
            <div className="text-lg font-black text-gray-900 dark:text-white">
              {unlockedCount} <span className="text-xs font-medium text-gray-400">/ {achievements.length}</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 flex items-center justify-center">
            <Trophy className="w-5 h-5 text-purple-500" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">Current Rank</div>
            <div className="text-lg font-black text-gray-900 dark:text-white truncate">
              Lvl {profile.currentLevel}
            </div>
          </div>
        </div>
      </div>

      {/* Level Progress Bar & Ranks Path */}
      <LevelProgressBar profile={profile} summary={summary} />

      {/* Main Grid: Streaks & Weekly Challenges on Left, Badges on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column (5 cols) */}
        <div className="lg:col-span-5 space-y-8">
          <StreakCard profile={profile} />
          <WeeklyChallengesCard
            challenges={activeChallenges}
            onClaim={handleClaimChallenge}
          />
        </div>

        {/* Right Column (7 cols) */}
        <div className="lg:col-span-7 space-y-8">
          <AchievementBadgesGrid achievements={achievements} />
        </div>
      </div>

      {/* Points Ledger Modal */}
      <PointsHistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        transactions={recentTransactions}
        totalPoints={profile.totalPoints}
      />
    </div>
  );
};

export default AchievementCenterPage;
