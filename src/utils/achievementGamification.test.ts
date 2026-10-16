import { describe, it, expect, beforeEach } from 'vitest';
import {
  calculateLevelFromXp,
  calculateStreaks,
  syncGamificationEngine,
  getPointsHistory,
  getWeeklyChallenges,
  claimWeeklyChallenge,
} from '../services/achievementStorage';
import { safeSet } from './safeStorage';
import { resetStudentPersonalData } from '../services/dataBackupService';

const storageMap = new Map<string, string>();
const localStorageMock = {
  getItem: (key: string) => storageMap.get(key) ?? null,
  setItem: (key: string, value: string) => {
    storageMap.set(key, String(value));
  },
  removeItem: (key: string) => {
    storageMap.delete(key);
  },
  clear: () => {
    storageMap.clear();
  },
};

if (typeof globalThis.localStorage === 'undefined') {
  (globalThis as any).localStorage = localStorageMock;
}
if (typeof window === 'undefined') {
  (globalThis as any).window = {
    localStorage: localStorageMock,
    dispatchEvent: () => true,
    addEventListener: () => {},
    removeEventListener: () => {},
  };
}

describe('Academic Achievement & Gamification Engine', () => {
  const profileA = 'test_student_profile_a';
  const profileB = 'test_student_profile_b';

  beforeEach(() => {
    storageMap.clear();
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
  });

  describe('1. Clean Start for New Profiles', () => {
    it('initializes a fresh profile with 0 XP, Level 1, 0 streaks, and 0 unlocked badges', async () => {
      const summary = await syncGamificationEngine(profileA);

      expect(summary.profile.totalPoints).toBe(0);
      expect(summary.profile.currentLevel).toBe(1);
      expect(summary.profile.levelTitle).toBe('Novice Scholar');
      expect(summary.profile.currentStreak).toBe(0);
      expect(summary.profile.longestStreak).toBe(0);
      expect(summary.profile.activeDates).toEqual([]);
      expect(summary.unlockedCount).toBe(0);
      expect(summary.achievements.every((a) => !a.isUnlocked)).toBe(true);
      expect(summary.recentTransactions).toEqual([]);
    });

    it('never awards badges merely because the dashboard was opened', async () => {
      const summary1 = await syncGamificationEngine(profileA);
      const summary2 = await syncGamificationEngine(profileA);

      expect(summary1.unlockedCount).toBe(0);
      expect(summary2.unlockedCount).toBe(0);
      expect(summary2.profile.totalPoints).toBe(0);
    });
  });

  describe('2. XP and Level Calculation (10 Ranks)', () => {
    it('correctly maps XP to each of the 10 documented ranks', () => {
      expect(calculateLevelFromXp(0).level).toBe(1);
      expect(calculateLevelFromXp(0).title).toBe('Novice Scholar');

      expect(calculateLevelFromXp(99).level).toBe(1);
      expect(calculateLevelFromXp(100).level).toBe(2);
      expect(calculateLevelFromXp(100).title).toBe('Curious Learner');

      expect(calculateLevelFromXp(250).level).toBe(3);
      expect(calculateLevelFromXp(250).title).toBe('Diligent Student');

      expect(calculateLevelFromXp(500).level).toBe(4);
      expect(calculateLevelFromXp(500).title).toBe('Academic Explorer');

      expect(calculateLevelFromXp(850).level).toBe(5);
      expect(calculateLevelFromXp(850).title).toBe('Focus Practitioner');

      expect(calculateLevelFromXp(1300).level).toBe(6);
      expect(calculateLevelFromXp(1300).title).toBe('Knowledge Builder');

      expect(calculateLevelFromXp(1900).level).toBe(7);
      expect(calculateLevelFromXp(1900).title).toBe('Concept Master');

      expect(calculateLevelFromXp(2700).level).toBe(8);
      expect(calculateLevelFromXp(2700).title).toBe('Exam Strategist');

      expect(calculateLevelFromXp(3700).level).toBe(9);
      expect(calculateLevelFromXp(3700).title).toBe('Senior Scholar');

      expect(calculateLevelFromXp(5000).level).toBe(10);
      expect(calculateLevelFromXp(5000).title).toBe('Academic Grandmaster');
      expect(calculateLevelFromXp(15000).level).toBe(10);
    });
  });

  describe('3. Study Streak Calculation & Deduplication', () => {
    const refDate = new Date('2026-10-16T12:00:00Z');
    const today = '2026-10-16';
    const yesterday = '2026-10-15';
    const dayBeforeYesterday = '2026-10-14';

    it('deduplicates multiple study sessions on the same calendar date to 1 active day', () => {
      const dates = [today, today, today];
      const result = calculateStreaks(dates, refDate);

      expect(result.currentStreak).toBe(1);
      expect(result.longestStreak).toBe(1);
    });

    it('calculates consecutive active days accurately when user studied today', () => {
      const dates = [dayBeforeYesterday, yesterday, today];
      const result = calculateStreaks(dates, refDate);

      expect(result.currentStreak).toBe(3);
      expect(result.longestStreak).toBe(3);
    });

    it('keeps streak unbroken if user was active yesterday but has not yet studied today', () => {
      const dates = [dayBeforeYesterday, yesterday]; // today not yet logged
      const result = calculateStreaks(dates, refDate);

      expect(result.currentStreak).toBe(2);
      expect(result.longestStreak).toBe(2);
    });

    it('resets current streak to 0 if a day was missed', () => {
      const dates = ['2026-10-10', '2026-10-11', '2026-10-12']; // Missed 13, 14, 15, 16
      const result = calculateStreaks(dates, refDate);

      expect(result.currentStreak).toBe(0);
      expect(result.longestStreak).toBe(3); // Historical record preserved
    });

    it('handles empty active dates gracefully', () => {
      const result = calculateStreaks([], refDate);
      expect(result.currentStreak).toBe(0);
      expect(result.longestStreak).toBe(0);
    });
  });

  describe('4. Idempotency & Verifiable Points Ledger', () => {
    it('awards points for genuine completed actions without duplicating on sync', async () => {
      // Add 1 study session (25 XP)
      safeSet(`academic_study_sessions_${profileA}`, [
        {
          id: 'sess_1',
          profileId: profileA,
          subjectName: 'Computer Networks',
          durationMinutes: 45,
          startedAt: Date.now() - 3600000,
          completedAt: Date.now(),
          isCompleted: true,
        },
      ]);

      // Add 1 completed task (15 XP)
      safeSet(`academic_companion_tasks_${profileA}`, [
        {
          id: 'task_1',
          profileId: profileA,
          title: 'Review Unit 2 Notes',
          completed: true,
          createdAt: Date.now(),
        },
      ]);

      // First sync
      const summary1 = await syncGamificationEngine(profileA);
      // Expected: 25 (session) + 15 (task) + 50 (first_focus badge) + 30 (task_initiator badge) = 120 XP
      expect(summary1.profile.totalPoints).toBe(120);
      expect(summary1.unlockedCount).toBe(2);

      // Second sync (simulate page refresh or re-render)
      const summary2 = await syncGamificationEngine(profileA);
      expect(summary2.profile.totalPoints).toBe(120);
      expect(summary2.recentTransactions.length).toBe(summary1.recentTransactions.length);

      // Third sync
      const summary3 = await syncGamificationEngine(profileA);
      expect(summary3.profile.totalPoints).toBe(120);
    });

    it('awards mock exam and high score bonus accurately', async () => {
      safeSet(`academic_exam_attempts_${profileA}`, [
        {
          id: 'att_1',
          profileId: profileA,
          examConfigId: 'cfg_1',
          examTitle: 'Mid-Term Simulation',
          percentage: 85,
          isSubmitted: true,
          submittedAt: Date.now(),
        },
      ]);

      const summary = await syncGamificationEngine(profileA);
      // 50 (exam) + 30 (high score >= 80%) + 60 (test_pilot badge) + 150 (high_achiever badge) = 290 XP
      expect(summary.profile.totalPoints).toBe(290);
      expect(summary.unlockedCount).toBe(2);
      expect(summary.profile.currentLevel).toBe(3); // Level 3 Diligent Student
    });
  });

  describe('5. Weekly Challenges & Claiming', () => {
    it('generates weekly challenges for current week and tracks progress', async () => {
      const challenges = getWeeklyChallenges(profileA);
      expect(challenges.length).toBe(4);
      expect(challenges.every((c) => !c.isClaimed)).toBe(true);

      // Add 3 tasks
      safeSet(`academic_companion_tasks_${profileA}`, [
        { id: 't1', profileId: profileA, title: 'Task 1', completed: true, createdAt: Date.now() },
        { id: 't2', profileId: profileA, title: 'Task 2', completed: true, createdAt: Date.now() },
        { id: 't3', profileId: profileA, title: 'Task 3', completed: true, createdAt: Date.now() },
      ]);

      const summary = await syncGamificationEngine(profileA);
      const taskChallenge = summary.activeChallenges.find((c) => c.category === 'tasks');
      expect(taskChallenge).toBeDefined();
      expect(taskChallenge?.currentCount).toBe(3);
      expect(taskChallenge?.isCompleted).toBe(true);
      expect(taskChallenge?.isClaimed).toBe(false);

      // Claim reward
      const claimRes = claimWeeklyChallenge(profileA, taskChallenge!.id);
      expect(claimRes.success).toBe(true);
      expect(claimRes.pointsAwarded).toBe(100);

      // Attempt claiming again (idempotent rejection)
      const repeatClaim = claimWeeklyChallenge(profileA, taskChallenge!.id);
      expect(repeatClaim.success).toBe(false);
      expect(repeatClaim.message).toContain('already claimed');
    });
  });

  describe('6. Profile Isolation', () => {
    it('strictly isolates points and badges between different student profiles', async () => {
      // Profile A has 1 completed session
      safeSet(`academic_study_sessions_${profileA}`, [
        {
          id: 'sess_a1',
          profileId: profileA,
          subjectName: 'Compiler Design',
          durationMinutes: 50,
          isCompleted: true,
          completedAt: Date.now(),
        },
      ]);

      // Profile B has nothing
      const summaryA = await syncGamificationEngine(profileA);
      const summaryB = await syncGamificationEngine(profileB);

      expect(summaryA.profile.totalPoints).toBeGreaterThan(0);
      expect(summaryA.unlockedCount).toBeGreaterThan(0);

      expect(summaryB.profile.totalPoints).toBe(0);
      expect(summaryB.unlockedCount).toBe(0);
      expect(summaryB.profile.currentLevel).toBe(1);
    });
  });

  describe('7. Data Reset Integrity', () => {
    it('resets gamification points and history to zero when student requests full reset', async () => {
      // Give profile A some activity
      safeSet(`academic_study_sessions_${profileA}`, [
        {
          id: 'sess_reset',
          profileId: profileA,
          subjectName: 'Database Systems',
          durationMinutes: 60,
          isCompleted: true,
          completedAt: Date.now(),
        },
      ]);
      await syncGamificationEngine(profileA);
      expect(getPointsHistory(profileA).length).toBeGreaterThan(0);

      // Execute data reset
      const resetRes = await resetStudentPersonalData(profileA);
      expect(resetRes.success).toBe(true);

      // Verify clean zero state
      const summaryAfterReset = await syncGamificationEngine(profileA);
      expect(summaryAfterReset.profile.totalPoints).toBe(0);
      expect(summaryAfterReset.unlockedCount).toBe(0);
      expect(summaryAfterReset.profile.currentStreak).toBe(0);
      expect(getPointsHistory(profileA)).toEqual([]);
    });
  });
});
