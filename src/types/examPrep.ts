export type ExamType =
  | 'mid_term_1'
  | 'mid_term_2'
  | 'end_sem'
  | 'lab'
  | 'model'
  | 'quiz'
  | 'other';

export type ExamDifficulty = 'easy' | 'moderate' | 'hard' | 'very_hard';

export interface ExamRecord {
  id: string;
  profileId: string;
  subjectName: string;
  courseCode?: string;
  examType: ExamType;
  examDate?: string; // YYYY-MM-DD
  examTime?: string; // HH:MM, e.g. "09:30"
  difficulty: ExamDifficulty;
  syllabusSummary?: string;
  preparationProgress: number; // 0 - 100%
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export type TopicStatus = 'not_started' | 'learning' | 'needs_revision' | 'completed';

export interface SyllabusTopic {
  id: string;
  profileId: string;
  subjectName: string;
  unitNumber?: number; // e.g. 1, 2, 3
  unitTitle?: string; // e.g. "Unit 1: Process Synchronization"
  title: string;
  difficulty: ExamDifficulty;
  estimatedHours: number; // e.g. 1.5, 2, 3 hours
  status: TopicStatus;
  revisionNotes?: string;
  examId?: string; // Optional link to ExamRecord
  createdAt: number;
  updatedAt: number;
}

export interface SyllabusSubjectProgress {
  subjectName: string;
  totalTopics: number;
  completedTopics: number;
  needsRevisionTopics: number;
  learningTopics: number;
  notStartedTopics: number;
  completionPercentage: number; // 0 - 100%
  difficultPendingTopicsCount: number;
}

export interface ScheduleGeneratorConfig {
  dailyStudyHours: number; // e.g. 3 hours
  selectedDays: number[]; // 0 = Sun, 1 = Mon ... 6 = Sat
  maxSessionMinutes: number; // e.g. 45 or 50 minutes
  breakMinutes: number; // e.g. 10 or 15 minutes
  reserveRevisionDaysBeforeExam: number; // e.g. 1 or 2 days
  startDate: string; // YYYY-MM-DD
}

export interface ScheduledStudySlot {
  id: string;
  date: string; // YYYY-MM-DD
  subjectName: string;
  topicId?: string;
  topicTitle: string;
  activityType: 'learning' | 'revision' | 'exam_day' | 'mock_test';
  durationMinutes: number;
  difficulty: ExamDifficulty;
  completed: boolean;
  notes?: string;
}

export interface StudyScheduleResult {
  slots: ScheduledStudySlot[];
  totalAvailableHours: number;
  totalRequiredHours: number;
  isFeasible: boolean;
  conflictWarning?: string;
  suggestedPriorities: string[];
  generatedAt: number;
}

export interface StudySessionLog {
  id: string;
  profileId: string;
  subjectName: string;
  topicId?: string;
  topicTitle?: string;
  durationMinutes: number;
  startedAt: number;
  completedAt: number;
  isCompleted: boolean;
  notes?: string;
}

export interface ExamCountdownInfo {
  exam: ExamRecord;
  hasDate: boolean;
  isPast: boolean;
  daysRemaining: number;
  formattedCountdown: string; // e.g. "Today", "Tomorrow", "In 5 days", "Past exam (3 days ago)"
}
