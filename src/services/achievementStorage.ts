import type {
  AchievementDefinition,
  StudentAchievement,
  PointsTransaction,
  WeeklyChallenge,
  GamificationProfile,
  GamificationSummary,
  LevelThreshold,
} from '../types/achievements';
import { LEVEL_TIERS } from '../types/achievements';
import type { StudySessionLog, SyllabusTopic } from '../types/examPrep';
import type { ExamAttemptRecord, MistakeNotebookItem } from '../types/mockExam';
import type { AcademicTask } from '../types/academicCompanion';
import { safeGet, safeSet } from '../utils/safeStorage';
import { getDocumentsForProfile } from './vaultStorage';

// Base achievement catalog
export const MASTER_ACHIEVEMENTS: AchievementDefinition[] = [
  {
    id: 'first_focus',
    title: 'First Focus',
    description: 'Complete your first focused study session.',
    category: 'study_sessions',
    icon: 'Flame',
    tier: 'bronze',
    targetValue: 1,
    xpReward: 50,
  },
  {
    id: 'deep_work_5',
    title: 'Deep Work Explorer',
    description: 'Complete 5 focused study sessions.',
    category: 'study_sessions',
    icon: 'Target',
    tier: 'silver',
    targetValue: 5,
    xpReward: 100,
  },
  {
    id: 'century_scholar',
    title: 'Century Scholar',
    description: 'Log 100 or more total minutes of focused study time.',
    category: 'study_sessions',
    icon: 'Zap',
    tier: 'silver',
    targetValue: 100,
    xpReward: 100,
  },
  {
    id: 'focus_titan',
    title: 'Focus Titan',
    description: 'Log 300 or more total minutes of focused study time.',
    category: 'study_sessions',
    icon: 'Crown',
    tier: 'gold',
    targetValue: 300,
    xpReward: 200,
  },
  {
    id: 'task_initiator',
    title: 'Task Initiator',
    description: 'Mark your first study task as completed.',
    category: 'tasks',
    icon: 'CheckCircle2',
    tier: 'bronze',
    targetValue: 1,
    xpReward: 30,
  },
  {
    id: 'task_crusher',
    title: 'Task Crusher',
    description: 'Complete 5 study companion tasks.',
    category: 'tasks',
    icon: 'Award',
    tier: 'silver',
    targetValue: 5,
    xpReward: 75,
  },
  {
    id: 'task_master',
    title: 'Task Master',
    description: 'Complete 15 study companion tasks.',
    category: 'tasks',
    icon: 'Trophy',
    tier: 'gold',
    targetValue: 15,
    xpReward: 150,
  },
  {
    id: 'syllabus_scout',
    title: 'Syllabus Scout',
    description: 'Mark your first syllabus unit topic as completed.',
    category: 'syllabus',
    icon: 'BookOpen',
    tier: 'bronze',
    targetValue: 1,
    xpReward: 40,
  },
  {
    id: 'curriculum_conqueror',
    title: 'Curriculum Conqueror',
    description: 'Complete 5 syllabus topics across your courses.',
    category: 'syllabus',
    icon: 'Sparkles',
    tier: 'silver',
    targetValue: 5,
    xpReward: 100,
  },
  {
    id: 'subject_specialist',
    title: 'Subject Specialist',
    description: 'Complete 15 syllabus topics across your courses.',
    category: 'syllabus',
    icon: 'Medal',
    tier: 'gold',
    targetValue: 15,
    xpReward: 200,
  },
  {
    id: 'test_pilot',
    title: 'Test Pilot',
    description: 'Submit your first personal mock practice exam.',
    category: 'mock_exams',
    icon: 'FileQuestion',
    tier: 'bronze',
    targetValue: 1,
    xpReward: 60,
  },
  {
    id: 'exam_veteran',
    title: 'Exam Veteran',
    description: 'Complete 3 mock practice exams.',
    category: 'mock_exams',
    icon: 'GraduationCap',
    tier: 'silver',
    targetValue: 3,
    xpReward: 120,
  },
  {
    id: 'high_achiever',
    title: 'High Achiever',
    description: 'Score 80% or higher on any mock exam.',
    category: 'mock_exams',
    icon: 'Star',
    tier: 'gold',
    targetValue: 1,
    xpReward: 150,
  },
  {
    id: 'error_eliminator',
    title: 'Error Eliminator',
    description: 'Master your first question in the Mistake Notebook.',
    category: 'mistakes',
    icon: 'CheckSquare',
    tier: 'bronze',
    targetValue: 1,
    xpReward: 50,
  },
  {
    id: 'precision_scholar',
    title: 'Precision Scholar',
    description: 'Master 5 incorrect questions in the Mistake Notebook.',
    category: 'mistakes',
    icon: 'ShieldCheck',
    tier: 'silver',
    targetValue: 5,
    xpReward: 125,
  },
  {
    id: 'vault_curator',
    title: 'Vault Curator',
    description: 'Upload and organize 3 academic documents in your Vault.',
    category: 'vault',
    icon: 'FolderLock',
    tier: 'bronze',
    targetValue: 3,
    xpReward: 50,
  },
  {
    id: 'knowledge_archivist',
    title: 'Knowledge Archivist',
    description: 'Upload and organize 10 academic documents in your Vault.',
    category: 'vault',
    icon: 'Archive',
    tier: 'silver',
    targetValue: 10,
    xpReward: 150,
  },
  {
    id: 'streak_starter',
    title: 'Streak Starter',
    description: 'Maintain a 3-day consecutive study streak.',
    category: 'streaks',
    icon: 'Flame',
    tier: 'silver',
    targetValue: 3,
    xpReward: 100,
  },
  {
    id: 'unstoppable_streak',
    title: 'Unstoppable Momentum',
    description: 'Maintain a 7-day consecutive study streak.',
    category: 'streaks',
    icon: 'Zap',
    tier: 'gold',
    targetValue: 7,
    xpReward: 250,
  },
  {
    id: 'weekly_champion',
    title: 'Weekly Champion',
    description: 'Complete and claim at least 1 weekly study challenge.',
    category: 'special',
    icon: 'Crown',
    tier: 'silver',
    targetValue: 1,
    xpReward: 100,
  },
];

export function toLocalDateString(d: Date | number): string {
  const dt = typeof d === 'number' ? new Date(d) : d;
  const year = dt.getFullYear();
  const month = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getPreviousDateString(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() - 1);
  return toLocalDateString(dt);
}

export function getMondayOfWeek(d: Date = new Date()): string {
  const dt = new Date(d);
  const day = dt.getDay(); // 0 = Sunday, 1 = Monday ...
  const diff = dt.getDate() - day + (day === 0 ? -6 : 1);
  dt.setDate(diff);
  return toLocalDateString(dt);
}

export function calculateLevelFromXp(xp: number): LevelThreshold {
  for (let i = LEVEL_TIERS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_TIERS[i].minXp) {
      return LEVEL_TIERS[i];
    }
  }
  return LEVEL_TIERS[0];
}

export function calculateStreaks(
  activeDates: string[],
  referenceDate: Date = new Date()
): { currentStreak: number; longestStreak: number } {
  if (!activeDates || activeDates.length === 0) {
    return { currentStreak: 0, longestStreak: 0 };
  }

  const uniqueSorted = Array.from(new Set(activeDates)).sort();
  const activeSet = new Set(uniqueSorted);

  const todayStr = toLocalDateString(referenceDate);
  const yesterdayStr = getPreviousDateString(todayStr);

  let currentStreak = 0;
  if (activeSet.has(todayStr)) {
    currentStreak = 1;
    let checkDate = getPreviousDateString(todayStr);
    while (activeSet.has(checkDate)) {
      currentStreak++;
      checkDate = getPreviousDateString(checkDate);
    }
  } else if (activeSet.has(yesterdayStr)) {
    // Current streak is unbroken if user was active yesterday
    currentStreak = 1;
    let checkDate = getPreviousDateString(yesterdayStr);
    while (activeSet.has(checkDate)) {
      currentStreak++;
      checkDate = getPreviousDateString(checkDate);
    }
  }

  // Calculate longest streak across all recorded dates
  let longestStreak = currentStreak;
  let tempStreak = 0;
  let prevDate = '';

  for (const dateStr of uniqueSorted) {
    if (!prevDate) {
      tempStreak = 1;
    } else {
      const expectedNext = getPreviousDateString(dateStr);
      if (expectedNext === prevDate) {
        tempStreak++;
      } else {
        tempStreak = 1;
      }
    }
    if (tempStreak > longestStreak) {
      longestStreak = tempStreak;
    }
    prevDate = dateStr;
  }

  return { currentStreak, longestStreak };
}

export function getGamificationProfile(profileId: string): GamificationProfile {
  return safeGet<GamificationProfile>(`academic_gamification_profile_${profileId}`, {
    profileId,
    totalPoints: 0,
    currentLevel: 1,
    levelTitle: 'Novice Scholar',
    currentStreak: 0,
    longestStreak: 0,
    activeDates: [],
    updatedAt: Date.now(),
  });
}

export function getPointsHistory(profileId: string): PointsTransaction[] {
  return safeGet<PointsTransaction[]>(`academic_points_history_${profileId}`, []);
}

export function getWeeklyChallenges(profileId: string): WeeklyChallenge[] {
  const currentMonday = getMondayOfWeek(new Date());
  const stored = safeGet<WeeklyChallenge[]>(`academic_weekly_challenges_${profileId}`, []);

  // If stored challenges match this week's Monday, return them
  if (stored.length > 0 && stored[0].weekStartDate === currentMonday) {
    return stored;
  }

  // Generate new weekly challenges for the current week
  const newChallenges: WeeklyChallenge[] = [
    {
      id: `w_focus_${currentMonday}`,
      weekStartDate: currentMonday,
      title: 'Focus Sprint',
      description: 'Complete 3 focused study sessions this week.',
      category: 'sessions',
      targetCount: 3,
      currentCount: 0,
      pointsReward: 100,
      isCompleted: false,
      isClaimed: false,
    },
    {
      id: `w_tasks_${currentMonday}`,
      weekStartDate: currentMonday,
      title: 'Task Blitz',
      description: 'Complete 3 study companion tasks this week.',
      category: 'tasks',
      targetCount: 3,
      currentCount: 0,
      pointsReward: 100,
      isCompleted: false,
      isClaimed: false,
    },
    {
      id: `w_exam_${currentMonday}`,
      weekStartDate: currentMonday,
      title: 'Practice Trial',
      description: 'Complete 1 full mock exam attempt this week.',
      category: 'exams',
      targetCount: 1,
      currentCount: 0,
      pointsReward: 120,
      isCompleted: false,
      isClaimed: false,
    },
    {
      id: `w_mistake_${currentMonday}`,
      weekStartDate: currentMonday,
      title: 'Weak Spot Warrior',
      description: 'Master 2 mistake questions in your notebook this week.',
      category: 'mistakes',
      targetCount: 2,
      currentCount: 0,
      pointsReward: 80,
      isCompleted: false,
      isClaimed: false,
    },
  ];

  safeSet(`academic_weekly_challenges_${profileId}`, newChallenges);
  return newChallenges;
}

export function claimWeeklyChallenge(
  profileId: string,
  challengeId: string
): { success: boolean; pointsAwarded: number; message: string } {
  const challenges = getWeeklyChallenges(profileId);
  const challenge = challenges.find((c) => c.id === challengeId);

  if (!challenge) {
    return { success: false, pointsAwarded: 0, message: 'Challenge not found.' };
  }
  if (!challenge.isCompleted) {
    return { success: false, pointsAwarded: 0, message: 'Challenge criteria not met yet.' };
  }
  if (challenge.isClaimed) {
    return { success: false, pointsAwarded: 0, message: 'Reward already claimed.' };
  }

  // Mark claimed
  challenge.isClaimed = true;
  challenge.claimedAt = Date.now();
  safeSet(`academic_weekly_challenges_${profileId}`, challenges);

  // Add points transaction idempotently
  const transactions = getPointsHistory(profileId);
  const sourceId = `challenge_${challenge.id}_${challenge.weekStartDate}`;
  if (!transactions.some((t) => t.sourceId === sourceId)) {
    transactions.unshift({
      id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      sourceId,
      actionType: 'weekly_challenge',
      description: `Weekly Challenge: ${challenge.title}`,
      points: challenge.pointsReward,
      timestamp: Date.now(),
    });
    safeSet(`academic_points_history_${profileId}`, transactions);
  }

  // Dispatch update event
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('gamification-updated'));
  }

  return {
    success: true,
    pointsAwarded: challenge.pointsReward,
    message: `Claimed +${challenge.pointsReward} XP for "${challenge.title}"!`,
  };
}

/**
 * Main engine sync function: Reads all student activity logs, synchronizes transactions,
 * computes active calendar days, streak counts, unlocks achievements, updates weekly challenges,
 * and recalculates XP and rank level.
 * Completely idempotent: repeated calls never award duplicate points!
 */
export async function syncGamificationEngine(profileId: string): Promise<GamificationSummary> {
  // 1. Load actual user data from various sub-modules
  const sessions = safeGet<StudySessionLog[]>(`academic_study_sessions_${profileId}`, []).filter(
    (s) => s.isCompleted
  );
  const tasks = safeGet<AcademicTask[]>(`academic_companion_tasks_${profileId}`, []).filter(
    (t: any) => t.status === 'completed' || t.completed
  );
  const topics = safeGet<SyllabusTopic[]>(`academic_syllabus_topics_${profileId}`, []).filter(
    (top) => top.status === 'completed'
  );
  const examAttempts = safeGet<ExamAttemptRecord[]>(
    `academic_exam_attempts_${profileId}`,
    []
  ).filter((a) => a.isSubmitted);
  const mistakes = safeGet<MistakeNotebookItem[]>(
    `academic_mistake_notebook_${profileId}`,
    []
  ).filter((m) => m.isMastered);

  // Load vault documents
  let vaultDocs: any[] = [];
  try {
    vaultDocs = await getDocumentsForProfile(profileId);
  } catch {
    vaultDocs = [];
  }

  // 2. Load existing points history
  const transactions = getPointsHistory(profileId);
  const txSourceSet = new Set(transactions.map((t) => t.sourceId));
  let newTransactionsAdded = false;

  // 3. Collect active calendar dates (YYYY-MM-DD)
  const activeDatesSet = new Set<string>();

  // A. Study Sessions: 25 XP each + dates
  let totalSessionMinutes = 0;
  sessions.forEach((s) => {
    totalSessionMinutes += s.durationMinutes || 0;
    const dateStr = toLocalDateString(s.completedAt || s.startedAt || Date.now());
    activeDatesSet.add(dateStr);

    const sourceId = `session_${s.id}`;
    if (!txSourceSet.has(sourceId)) {
      transactions.unshift({
        id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        sourceId,
        actionType: 'study_session',
        description: `Completed study session on ${s.subjectName || 'Study Topic'} (${s.durationMinutes}m)`,
        points: 25,
        timestamp: s.completedAt || Date.now(),
      });
      txSourceSet.add(sourceId);
      newTransactionsAdded = true;
    }
  });

  // B. Tasks: 15 XP each + dates
  tasks.forEach((t) => {
    const taskDate = t.createdAt ? toLocalDateString(t.createdAt) : toLocalDateString(Date.now());
    activeDatesSet.add(taskDate);

    const sourceId = `task_${t.id}`;
    if (!txSourceSet.has(sourceId)) {
      transactions.unshift({
        id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        sourceId,
        actionType: 'task_completed',
        description: `Finished task: ${t.title}`,
        points: 15,
        timestamp: t.createdAt || Date.now(),
      });
      txSourceSet.add(sourceId);
      newTransactionsAdded = true;
    }
  });

  // C. Syllabus Topics: 20 XP each
  topics.forEach((top) => {
    const dateStr = top.updatedAt
      ? toLocalDateString(top.updatedAt)
      : toLocalDateString(Date.now());
    activeDatesSet.add(dateStr);

    const sourceId = `topic_${top.id}`;
    if (!txSourceSet.has(sourceId)) {
      transactions.unshift({
        id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        sourceId,
        actionType: 'topic_completed',
        description: `Mastered syllabus topic: ${top.title} (${top.subjectName})`,
        points: 20,
        timestamp: top.updatedAt || Date.now(),
      });
      txSourceSet.add(sourceId);
      newTransactionsAdded = true;
    }
  });

  // D. Mock Exam Attempts: 50 XP each + 30 bonus for >= 80%
  let hasHighScoreExam = false;
  examAttempts.forEach((att) => {
    const dateStr = att.submittedAt
      ? toLocalDateString(att.submittedAt)
      : toLocalDateString(Date.now());
    activeDatesSet.add(dateStr);

    const sourceId = `attempt_${att.id}`;
    if (!txSourceSet.has(sourceId)) {
      transactions.unshift({
        id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        sourceId,
        actionType: 'mock_exam_completed',
        description: `Completed mock exam: ${att.examTitle} (${att.percentage}%)`,
        points: 50,
        timestamp: att.submittedAt || Date.now(),
      });
      txSourceSet.add(sourceId);
      newTransactionsAdded = true;
    }

    if (att.percentage >= 80) {
      hasHighScoreExam = true;
      const highSourceId = `attempt_high_${att.id}`;
      if (!txSourceSet.has(highSourceId)) {
        transactions.unshift({
          id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          sourceId: highSourceId,
          actionType: 'mock_exam_high_score',
          description: `High score bonus (80%+): ${att.examTitle}`,
          points: 30,
          timestamp: att.submittedAt || Date.now(),
        });
        txSourceSet.add(highSourceId);
        newTransactionsAdded = true;
      }
    }
  });

  // E. Mistake Notebook: 15 XP each
  mistakes.forEach((m) => {
    const dateStr = m.masteredAt
      ? toLocalDateString(m.masteredAt)
      : toLocalDateString(Date.now());
    activeDatesSet.add(dateStr);

    const sourceId = `mistake_${m.id}`;
    if (!txSourceSet.has(sourceId)) {
      transactions.unshift({
        id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        sourceId,
        actionType: 'mistake_mastered',
        description: `Mastered mistake question: ${m.question?.subjectName || 'Practice Q'}`,
        points: 15,
        timestamp: m.masteredAt || Date.now(),
      });
      txSourceSet.add(sourceId);
      newTransactionsAdded = true;
    }
  });

  // F. Vault Documents: 10 XP each
  vaultDocs.forEach((doc) => {
    const dateStr = doc.uploadedAt
      ? toLocalDateString(doc.uploadedAt)
      : toLocalDateString(Date.now());
    activeDatesSet.add(dateStr);

    const sourceId = `doc_${doc.id}`;
    if (!txSourceSet.has(sourceId)) {
      transactions.unshift({
        id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        sourceId,
        actionType: 'vault_document',
        description: `Uploaded document to Vault: ${doc.originalName}`,
        points: 10,
        timestamp: doc.uploadedAt || Date.now(),
      });
      txSourceSet.add(sourceId);
      newTransactionsAdded = true;
    }
  });

  // 4. Calculate Streaks
  const activeDates = Array.from(activeDatesSet).sort();
  const { currentStreak, longestStreak } = calculateStreaks(activeDates, new Date());

  // 5. Update Weekly Challenges progress
  const challenges = getWeeklyChallenges(profileId);
  const currentMonday = getMondayOfWeek(new Date());

  challenges.forEach((ch) => {
    if (ch.weekStartDate === currentMonday) {
      if (ch.category === 'sessions') {
        const thisWeekSessions = sessions.filter(
          (s) => toLocalDateString(s.completedAt || s.startedAt) >= currentMonday
        ).length;
        ch.currentCount = Math.min(thisWeekSessions, ch.targetCount);
      } else if (ch.category === 'tasks') {
        const thisWeekTasks = tasks.filter(
          (t) => toLocalDateString(t.createdAt || Date.now()) >= currentMonday
        ).length;
        ch.currentCount = Math.min(thisWeekTasks, ch.targetCount);
      } else if (ch.category === 'exams') {
        const thisWeekExams = examAttempts.filter(
          (a) => toLocalDateString(a.submittedAt || Date.now()) >= currentMonday
        ).length;
        ch.currentCount = Math.min(thisWeekExams, ch.targetCount);
      } else if (ch.category === 'mistakes') {
        const thisWeekMistakes = mistakes.filter(
          (m) => toLocalDateString(m.masteredAt || Date.now()) >= currentMonday
        ).length;
        ch.currentCount = Math.min(thisWeekMistakes, ch.targetCount);
      }
      ch.isCompleted = ch.currentCount >= ch.targetCount;
    }
  });
  safeSet(`academic_weekly_challenges_${profileId}`, challenges);

  const claimedWeeklyChallengesCount = challenges.filter((c) => c.isClaimed).length;

  // 6. Evaluate Achievements
  const unlockedMap = safeGet<Record<string, { unlockedAt: number; claimed: boolean }>>(
    `academic_unlocked_achievements_${profileId}`,
    {}
  );

  const studentAchievements: StudentAchievement[] = MASTER_ACHIEVEMENTS.map((def) => {
    let currentVal = 0;
    switch (def.id) {
      case 'first_focus':
      case 'deep_work_5':
        currentVal = sessions.length;
        break;
      case 'century_scholar':
      case 'focus_titan':
        currentVal = totalSessionMinutes;
        break;
      case 'task_initiator':
      case 'task_crusher':
      case 'task_master':
        currentVal = tasks.length;
        break;
      case 'syllabus_scout':
      case 'curriculum_conqueror':
      case 'subject_specialist':
        currentVal = topics.length;
        break;
      case 'test_pilot':
      case 'exam_veteran':
        currentVal = examAttempts.length;
        break;
      case 'high_achiever':
        currentVal = hasHighScoreExam ? 1 : 0;
        break;
      case 'error_eliminator':
      case 'precision_scholar':
        currentVal = mistakes.length;
        break;
      case 'vault_curator':
      case 'knowledge_archivist':
        currentVal = vaultDocs.length;
        break;
      case 'streak_starter':
      case 'unstoppable_streak':
        currentVal = longestStreak;
        break;
      case 'weekly_champion':
        currentVal = claimedWeeklyChallengesCount;
        break;
      default:
        currentVal = 0;
    }

    const isUnlocked = currentVal >= def.targetValue;
    let unlockedAt = unlockedMap[def.id]?.unlockedAt;

    if (isUnlocked && !unlockedAt) {
      unlockedAt = Date.now();
      unlockedMap[def.id] = { unlockedAt, claimed: true };

      // Reward points for unlocking achievement idempotently
      const achSourceId = `achievement_${def.id}`;
      if (!txSourceSet.has(achSourceId)) {
        transactions.unshift({
          id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          sourceId: achSourceId,
          actionType: 'achievement_unlocked',
          description: `Unlocked Achievement: ${def.title}`,
          points: def.xpReward,
          timestamp: Date.now(),
        });
        txSourceSet.add(achSourceId);
        newTransactionsAdded = true;
      }
    }

    return {
      ...def,
      isUnlocked,
      unlockedAt,
      currentProgress: Math.min(currentVal, def.targetValue),
    };
  });

  safeSet(`academic_unlocked_achievements_${profileId}`, unlockedMap);

  if (newTransactionsAdded) {
    safeSet(`academic_points_history_${profileId}`, transactions);
  }

  // 7. Calculate Total XP and Level
  const totalPoints = transactions.reduce((acc, t) => acc + (t.points || 0), 0);
  const levelInfo = calculateLevelFromXp(totalPoints);

  // Next level progress
  const currentTierIndex = LEVEL_TIERS.findIndex((t) => t.level === levelInfo.level);
  const nextTier =
    currentTierIndex < LEVEL_TIERS.length - 1 ? LEVEL_TIERS[currentTierIndex + 1] : null;

  let xpNeededForNextLevel = 0;
  let progressPercentage = 100;
  if (nextTier) {
    const range = nextTier.minXp - levelInfo.minXp;
    const progressInCurrentLevel = totalPoints - levelInfo.minXp;
    progressPercentage = Math.min(100, Math.max(0, Math.round((progressInCurrentLevel / range) * 100)));
    xpNeededForNextLevel = Math.max(0, nextTier.minXp - totalPoints);
  }

  const profile: GamificationProfile = {
    profileId,
    totalPoints,
    currentLevel: levelInfo.level,
    levelTitle: levelInfo.title,
    currentStreak,
    longestStreak,
    lastActiveDate: activeDates.length > 0 ? activeDates[activeDates.length - 1] : undefined,
    activeDates,
    updatedAt: Date.now(),
  };

  safeSet(`academic_gamification_profile_${profileId}`, profile);

  return {
    profile,
    achievements: studentAchievements,
    unlockedCount: studentAchievements.filter((a) => a.isUnlocked).length,
    totalAchievementsCount: studentAchievements.length,
    recentTransactions: transactions.slice(0, 30),
    activeChallenges: challenges,
    nextLevelInfo: {
      level: nextTier ? nextTier.level : levelInfo.level,
      title: nextTier ? nextTier.title : levelInfo.title,
      xpNeededForNextLevel,
      progressPercentage,
    },
  };
}
