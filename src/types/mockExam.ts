export type QuestionType =
  | 'single_mcq'
  | 'multiple_mcq'
  | 'true_false'
  | 'descriptive';

export type QuestionDifficulty = 'easy' | 'moderate' | 'hard' | 'very_hard';

export interface QuestionOption {
  id: string;
  text: string;
}

export interface BankQuestion {
  id: string;
  profileId: string;
  subjectName: string;
  unitOrTopic: string;
  type: QuestionType;
  difficulty: QuestionDifficulty;
  marks: number;
  questionText: string;
  options?: QuestionOption[];
  correctOptionIndices?: number[];
  correctBoolean?: boolean;
  modelAnswer?: string;
  explanation?: string;
  revisionNotes?: string;
  tags?: string[];
  createdAt: number;
  updatedAt: number;
}

export interface MockExamConfig {
  id: string;
  profileId: string;
  title: string;
  description?: string;
  subjects: string[];
  topicFilters?: string[];
  difficultyFilters?: QuestionDifficulty[];
  durationMinutes: number;
  totalMarks: number;
  passPercentage?: number;
  questionIds: string[];
  enableNegativeMarking: boolean;
  negativeMarkingValue: number;
  createdAt: number;
  updatedAt: number;
}

export interface QuestionUserAnswer {
  questionId: string;
  selectedOptionIndices?: number[];
  selectedBoolean?: boolean;
  descriptiveText?: string;
  selfAwardedMarks?: number;
  isMarkedForReview: boolean;
  timeSpentSeconds: number;
  isAnswered: boolean;
}

export interface ExamAttemptRecord {
  id: string;
  profileId: string;
  examConfigId: string;
  examTitle: string;
  startedAt: number;
  submittedAt: number;
  durationSecondsTaken: number;
  remainingSecondsOnSubmit: number;
  questions: BankQuestion[];
  answers: Record<string, QuestionUserAnswer>;
  isSubmitted: boolean;
  totalQuestions: number;
  answeredCount: number;
  unansweredCount: number;
  markedForReviewCount: number;
  correctCount: number;
  incorrectCount: number;
  objectiveObtainedMarks: number;
  descriptiveObtainedMarks: number;
  negativeMarksDeducted: number;
  totalObtainedMarks: number;
  maxMarks: number;
  percentage: number;
  isPassed: boolean;
  questionResults: Record<
    string,
    {
      isCorrect: boolean | null;
      marksAwarded: number;
      negativeDeduction: number;
      explanation?: string;
    }
  >;
}

export interface ActiveExamSession {
  attemptId: string;
  profileId: string;
  examConfigId: string;
  examTitle: string;
  durationMinutes: number;
  remainingSeconds: number;
  targetEndTime: number;
  questions: BankQuestion[];
  answers: Record<string, QuestionUserAnswer>;
  currentQuestionIndex: number;
  enableNegativeMarking: boolean;
  negativeMarkingValue: number;
  isSubmitted: boolean;
}

export interface MistakeNotebookItem {
  id: string;
  profileId: string;
  questionId: string;
  question: BankQuestion;
  reasonForMistake?: string;
  personalNotes?: string;
  lastAttemptScore?: number;
  savedAt: number;
  isMastered: boolean;
  masteredAt?: number;
}

export interface ExamPerformanceAnalytics {
  totalAttempts: number;
  averageScorePercentage: number;
  highestScorePercentage: number;
  totalQuestionsAnswered: number;
  overallAccuracyPercentage: number;
  subjectAccuracy: Record<
    string,
    {
      subjectName: string;
      totalAnswered: number;
      correctCount: number;
      accuracyPercentage: number;
    }
  >;
  topicAccuracy: Record<
    string,
    {
      topicName: string;
      subjectName: string;
      totalAnswered: number;
      correctCount: number;
      accuracyPercentage: number;
    }
  >;
  strongTopics: string[];
  weakTopics: string[];
  scoreTrends: { attemptId: string; examTitle: string; date: string; percentage: number }[];
  suggestedQuestionsToRetry: BankQuestion[];
}
