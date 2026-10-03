export type ThemeMode = 'light' | 'dark' | 'system';

export type InternalType = 'theory' | 'integrated';

export interface UserProfile {
  name: string;
  college: string;
  branch: string;
  currentSemester: number;
  academicYear: string;
}

export interface GradeScaleItem {
  grade: string;
  points: number;
  description?: string;
  label?: string;
  range?: string;
}

export interface TheoryInputs {
  test1: number | '';
  test2: number | '';
  test3: number | '';
  attendance: number | '';
  assignment: number | '';
}

export interface IntegratedInputs {
  mid1: number | '';
  mid2: number | '';
  lab: number | '';
  attendance: number | '';
  assignment: number | '';
}

export interface TheoryResult {
  t1Converted: number;
  t2Converted: number;
  t3Converted: number;
  attendance: number;
  assignment: number;
  totalInternal: number;
  maxInternal: number;
  percentage: number;
  performanceTier: string;
  isComplete: boolean;
}

export interface IntegratedResult {
  mid1Converted: number;
  mid2Converted: number;
  lab: number;
  attendance: number;
  assignment: number;
  totalInternal: number;
  maxInternal: number;
  percentage: number;
  performanceTier: string;
  isComplete: boolean;
}

export interface SubjectItem {
  id: string;
  name: string;
  code?: string;
  type?: InternalType;
  credits: number;
  grade: string;
  gradePoint: number;
  internalMark?: number;
}

export interface GPAResult {
  gpa: number;
  totalCredits: number;
  totalPoints: number;
  performanceTier: string;
  subjectsCount: number;
  creditBearingCount?: number;
  hasCreditBearingSubjects?: boolean;
}

export interface SemesterItem {
  id: string;
  semesterNumber: number;
  gpa: number | '';
  credits: number | '';
}

export interface CGPAResult {
  cgpa: number;
  totalCredits: number;
  semestersCount: number;
  performanceTier: string;
}

export interface SubjectAssessmentItem {
  id: string;
  name: string;
  code?: string;
  type: InternalType;
  credits?: number;
  theoryInputs?: TheoryInputs;
  integratedInputs?: IntegratedInputs;
  internalMark: number;
  maxMark: number;
  percentage: number;
}

export interface HistoryItem {
  id: string;
  type: 'theory' | 'integrated' | 'gpa' | 'cgpa' | 'subject_manager' | 'target_gpa' | 'attendance';
  title: string;
  resultSummary: string;
  score: string;
  percentage?: string;
  timestamp: number;
  details: Record<string, any>;
}

export interface TargetGPAResult {
  currentGpa: number;
  currentCredits: number;
  targetGpa: number;
  upcomingCredits: number;
  requiredGpa: number;
  isPossible: boolean;
  maxPossibleGpa: number;
  explanation: string;
}

export interface AttendancePlannerResult {
  conducted: number;
  attended: number;
  currentPercentage: number;
  futureSessions: number;
  projectedPercentage: number;
  targetPercentage: number;
  sessionsNeededForTarget: number;
  canBunkSessions: number;
  isTargetAchievable: boolean;
}

export interface AttendanceResult {
  totalSessions: number;
  facultySessions: number;
  attended: number;
  absent: number;
  percentage: number;
}

export interface BackupData {
  version: string;
  exportDate: string;
  profile: UserProfile;
  subjects: SubjectAssessmentItem[];
  history: HistoryItem[];
  gradeScale: GradeScaleItem[];
  favorites: string[];
}
