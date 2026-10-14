import type { CourseCategoryType } from './credits';
import type { RegulationId } from '../config/university';

export type TaskCategory =
  | 'assignment'
  | 'exam'
  | 'nptel'
  | 'project'
  | 'class'
  | 'other';

export type TaskPriority = 'high' | 'medium' | 'low';
export type TaskStatus = 'pending' | 'in_progress' | 'completed';

export interface AcademicTask {
  id: string;
  profileId: string;
  title: string;
  category: TaskCategory;
  dueDate: string; // YYYY-MM-DD
  dueTime?: string; // e.g. "11:59 PM"
  priority: TaskPriority;
  status: TaskStatus;
  courseName?: string;
  courseCode?: string;
  credits?: number;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export type PlannedCourseStatus = 'planned' | 'enrolled' | 'completed' | 'dropped';

export interface PlannedSubject {
  id: string;
  profileId: string;
  semester: number;
  courseName: string;
  courseCode?: string;
  category: CourseCategoryType;
  plannedCredits: number;
  targetGrade?: string;
  status: PlannedCourseStatus;
  isNptel?: boolean;
  nptelMilestone?: string;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export interface ForecastSubjectItem {
  id: string;
  courseName: string;
  courseCode?: string;
  credits: number;
  internalObtained: number;
  internalMax: number;
  estimatedEndSemMarks: number;
  estimatedEndSemMax: number;
  projectedTotalMarks: number;
  projectedGrade: string;
  projectedGradePoints: number;
}

export interface MarksForecastScenario {
  id: string;
  profileId: string;
  title: string;
  regulation: RegulationId;
  semester: number;
  subjects: ForecastSubjectItem[];
  projectedSgpa: number;
  totalCredits: number;
  targetSgpa?: number;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export type AlertType =
  | 'attendance_warning'
  | 'deadline_approaching'
  | 'nptel_pending'
  | 'credits_shortfall'
  | 'marks_update'
  | 'info';

export type AlertPriority = 'urgent' | 'warning' | 'info';

export interface AcademicAlert {
  id: string;
  type: AlertType;
  priority: AlertPriority;
  title: string;
  message: string;
  actionLabel?: string;
  actionLink?: string;
  dismissable: boolean;
  createdAt: number;
}

export interface AcademicCompanionOverview {
  profileId: string;
  studentName: string;
  rollNumber?: string;
  regulation: string;
  semester: number;
  // Timetable
  todayDay: string;
  todayClassesCount: number;
  nextClass?: {
    subjectName: string;
    startTime: string;
    endTime: string;
    room?: string;
  };
  // Attendance
  attendanceAvgPct: number | null;
  attendanceSubjectsCount: number;
  attendanceCriticalCount: number;
  // Internal Marks
  internalsCount: number;
  internalsAveragePct: number | null;
  // SGPA / CGPA
  latestSgpa: number | null;
  calculatedCgpa: number | null;
  savedCalculationsCount: number;
  // Credits
  earnedCredits: number;
  targetCredits: number;
  remainingCredits: number;
  registeredCredits: number;
  creditCompletionPct: number;
  // NPTEL
  nptelCount: number;
  nptelCompletedCredits: number;
  nptelPendingApprovalCount: number;
  // Upcoming Tasks
  pendingTasksCount: number;
  overdueTasksCount: number;
  nextUpcomingTask?: AcademicTask;
  // AMS Connection
  amsStatus: 'connected' | 'not_connected' | 'syncing' | 'manual_synced';
  amsLastSync?: string;
}
