export type AmsConnectionStatus =
  | 'not_connected'
  | 'connecting'
  | 'auth_unavailable'
  | 'connected'
  | 'manual_synced';

export interface AmsTimetableClass {
  id: string;
  profileId: string;
  day: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday';
  subjectName: string;
  courseCode?: string;
  startTime: string; // e.g. "08:30 AM"
  endTime: string; // e.g. "09:30 AM"
  room?: string; // e.g. "TP402"
  faculty?: string; // e.g. "Dr. R. Ramanujam"
  semester?: number;
  isLab?: boolean;
}

export interface AmsSubjectAttendance {
  id: string;
  profileId: string;
  subjectName: string;
  courseCode?: string;
  officialTotalSessions: number;
  presentSessions: number;
  absentSessions: number;
  percentage: number | null; // Capped strictly at 100%
  facultySessions?: number;
  lastUpdated?: string;
  source: 'Official AMS Record' | 'Manual Import';
}

export interface AmsInternalMarkItem {
  id: string;
  profileId: string;
  subjectName: string;
  courseCode?: string;
  assessmentType: string; // 'Internal Assessment 1', 'Internal Assessment 2', 'Model Exam'
  category: 'internal' | 'test' | 'assignment' | 'lab';
  maxMarks: number;
  marksObtained: number;
  status: 'Published' | 'Under Evaluation' | 'Provisional';
  lastSynced?: string;
  source: string;
}

export interface AmsSemesterResultItem {
  id: string;
  profileId: string;
  semester: number;
  courseName: string;
  courseCode?: string; // strictly omitted for VTR25
  credits: number;
  grade: string;
  gradePoint?: number;
  status: 'Pass' | 'RA' | 'Withheld' | 'Absent';
  isVerified: boolean;
  source: 'Official AMS Record' | 'Manual Import';
}

export interface AmsRegisteredCourseItem {
  id: string;
  profileId: string;
  semester: number;
  courseName: string;
  courseCode?: string;
  credits: number;
  facultyName?: string;
  slot?: string;
  type: 'Regular' | 'Elective' | 'Retake' | 'Lab';
}

export interface AmsSyncLogEntry {
  id: string;
  profileId: string;
  timestamp: number;
  type: 'live_attempt' | 'manual_import' | 'disconnect' | 'reconcile';
  status: 'success' | 'failed' | 'notice';
  message: string;
  details?: string;
  recordsCount?: number;
}

export interface AmsStudentAcademicProfile {
  studentName?: string;
  studentId?: string; // e.g. VTU ID
  registerNumber?: string;
  college: string;
  department?: string;
  branch?: string;
  degree?: string;
  regulation?: string;
  batch?: string;
  currentSemester?: number;
  lastSyncTimestamp?: number;
  connectionStatus: AmsConnectionStatus;
}

export interface AmsDashboardData {
  profileId: string;
  academicProfile: AmsStudentAcademicProfile;
  attendance: AmsSubjectAttendance[];
  timetable: AmsTimetableClass[];
  internalMarks: AmsInternalMarkItem[];
  semesterResults: AmsSemesterResultItem[];
  registeredCourses: AmsRegisteredCourseItem[];
  syncLogs: AmsSyncLogEntry[];
  lastSyncTime?: number;
}
