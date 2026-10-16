export type AchievementCategory =
  | 'study_sessions'
  | 'tasks'
  | 'syllabus'
  | 'mock_exams'
  | 'mistakes'
  | 'vault'
  | 'streaks'
  | 'special';

export type AchievementTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';

export interface AchievementDefinition {
  id: string;
  title: string;
  description: string;
  category: AchievementCategory;
  icon: string;
  tier: AchievementTier;
  targetValue: number;
  xpReward: number;
}

export interface StudentAchievement extends AchievementDefinition {
  isUnlocked: boolean;
  unlockedAt?: number;
  currentProgress: number;
}

export type PointsActionType =
  | 'study_session'
  | 'task_completed'
  | 'topic_completed'
  | 'mock_exam_completed'
  | 'mock_exam_high_score'
  | 'mistake_mastered'
  | 'vault_document'
  | 'streak_milestone'
  | 'weekly_challenge'
  | 'achievement_unlocked';

export interface PointsTransaction {
  id: string;
  sourceId: string; // Unique deduplication key: e.g. "session_123", "task_456"
  actionType: PointsActionType;
  description: string;
  points: number;
  timestamp: number;
}

export type ChallengeCategory =
  | 'sessions'
  | 'tasks'
  | 'topics'
  | 'exams'
  | 'mistakes'
  | 'minutes';

export interface WeeklyChallenge {
  id: string;
  weekStartDate: string; // YYYY-MM-DD (Monday of target week)
  title: string;
  description: string;
  category: ChallengeCategory;
  targetCount: number;
  currentCount: number;
  pointsReward: number;
  isCompleted: boolean;
  isClaimed: boolean;
  claimedAt?: number;
}

export interface LevelThreshold {
  level: number;
  title: string;
  minXp: number;
  maxXp: number;
  badgeName: string;
  perkDescription: string;
}

export interface GamificationProfile {
  profileId: string;
  totalPoints: number;
  currentLevel: number;
  levelTitle: string;
  currentStreak: number;
  longestStreak: number;
  lastActiveDate?: string; // YYYY-MM-DD
  activeDates: string[]; // List of unique YYYY-MM-DD active days
  updatedAt: number;
}

export interface GamificationSummary {
  profile: GamificationProfile;
  achievements: StudentAchievement[];
  unlockedCount: number;
  totalAchievementsCount: number;
  recentTransactions: PointsTransaction[];
  activeChallenges: WeeklyChallenge[];
  nextLevelInfo: {
    level: number;
    title: string;
    xpNeededForNextLevel: number;
    progressPercentage: number;
  };
}

export const LEVEL_TIERS: LevelThreshold[] = [
  {
    level: 1,
    title: 'Novice Scholar',
    minXp: 0,
    maxXp: 99,
    badgeName: 'Scholar Cadet',
    perkDescription: 'Beginning your academic journey and study logging.',
  },
  {
    level: 2,
    title: 'Curious Learner',
    minXp: 100,
    maxXp: 249,
    badgeName: 'Bronze Scholar',
    perkDescription: 'Establishing regular study habits and personal tasks.',
  },
  {
    level: 3,
    title: 'Diligent Student',
    minXp: 250,
    maxXp: 499,
    badgeName: 'Silver Scholar',
    perkDescription: 'Systematically clearing syllabus units and tracking revisions.',
  },
  {
    level: 4,
    title: 'Academic Explorer',
    minXp: 500,
    maxXp: 849,
    badgeName: 'Gold Scholar',
    perkDescription: 'Building consistent study streaks and practice exam habits.',
  },
  {
    level: 5,
    title: 'Focus Practitioner',
    minXp: 850,
    maxXp: 1299,
    badgeName: 'Focus Master',
    perkDescription: 'Demonstrating deep focus stamina and active mock testing.',
  },
  {
    level: 6,
    title: 'Knowledge Builder',
    minXp: 1300,
    maxXp: 1899,
    badgeName: 'Concept Architect',
    perkDescription: 'Mastering mistake questions and curating personal vault notes.',
  },
  {
    level: 7,
    title: 'Concept Master',
    minXp: 1900,
    maxXp: 2699,
    badgeName: 'Academic Champion',
    perkDescription: 'Conquering multi-subject syllabus coverage with high accuracy.',
  },
  {
    level: 8,
    title: 'Exam Strategist',
    minXp: 2700,
    maxXp: 3699,
    badgeName: 'Grand Tactician',
    perkDescription: 'Elite exam readiness, rapid error correction, and high streaks.',
  },
  {
    level: 9,
    title: 'Senior Scholar',
    minXp: 3700,
    maxXp: 4999,
    badgeName: 'Eminent Scholar',
    perkDescription: 'Outstanding dedication across all academic tools and goals.',
  },
  {
    level: 10,
    title: 'Academic Grandmaster',
    minXp: 5000,
    maxXp: 999999,
    badgeName: 'Grandmaster Laureate',
    perkDescription: 'The pinnacle of academic discipline, consistency, and mastery.',
  },
];
