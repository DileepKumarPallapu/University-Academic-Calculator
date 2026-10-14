/**
 * AMS Data Validation Engine
 * Validates imported student profile, attendance, internal marks, semester results,
 * registered courses, and timetable records according to university standards.
 * Flags questionable records with actionable explanations rather than silently changing them.
 */

import type {
  AmsSubjectAttendance,
  AmsInternalMarkItem,
  AmsSemesterResultItem,
  AmsRegisteredCourseItem,
  AmsTimetableClass,
  AmsDashboardData,
} from '../types/amsDashboard';

export type ValidationSeverity = 'error' | 'warning' | 'info';

export interface ValidationIssue {
  id: string;
  module: 'attendance' | 'internals' | 'results' | 'registered' | 'timetable' | 'profile';
  recordId?: string;
  recordTitle?: string;
  field: string;
  severity: ValidationSeverity;
  code:
    | 'MISSING_TITLE'
    | 'INVALID_CREDITS'
    | 'INCONSISTENT_SEMESTER'
    | 'DUPLICATE_SUBJECT'
    | 'INVALID_MARKS'
    | 'INCOMPLETE_ATTENDANCE'
    | 'MISSING_GRADE'
    | 'MISSING_COURSE_CODE'
    | 'IRREGULAR_TIMING';
  message: string;
  suggestedFix?: string;
}

export interface ValidationReport {
  timestamp: number;
  isValid: boolean;
  totalRecordsChecked: number;
  errorCount: number;
  warningCount: number;
  infoCount: number;
  issues: ValidationIssue[];
}

/**
 * Validates a single Subject Attendance record
 */
export function validateSubjectAttendance(
  item: AmsSubjectAttendance,
  index: number
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const idPrefix = item.id || `att-${index}`;
  const title = item.subjectName || `Subject #${index + 1}`;

  // 1. Missing Title
  if (!item.subjectName || item.subjectName.trim().length === 0) {
    issues.push({
      id: `${idPrefix}-missing-title`,
      module: 'attendance',
      recordId: item.id,
      recordTitle: title,
      field: 'subjectName',
      severity: 'error',
      code: 'MISSING_TITLE',
      message: 'Subject name is missing or blank in attendance record.',
      suggestedFix: 'Provide a valid subject title.',
    });
  }

  // 2. Incomplete Attendance Data
  if (typeof item.officialTotalSessions !== 'number' || item.officialTotalSessions <= 0) {
    issues.push({
      id: `${idPrefix}-invalid-total`,
      module: 'attendance',
      recordId: item.id,
      recordTitle: title,
      field: 'officialTotalSessions',
      severity: 'error',
      code: 'INCOMPLETE_ATTENDANCE',
      message: `Official total sessions is ${item.officialTotalSessions ?? 'undefined'}. Total sessions must be a positive integer.`,
      suggestedFix: 'Set official total sessions to a positive number (e.g. 40 or 45).',
    });
  }

  if (typeof item.presentSessions !== 'number' || item.presentSessions < 0) {
    issues.push({
      id: `${idPrefix}-invalid-present`,
      module: 'attendance',
      recordId: item.id,
      recordTitle: title,
      field: 'presentSessions',
      severity: 'error',
      code: 'INCOMPLETE_ATTENDANCE',
      message: `Present sessions count cannot be negative (${item.presentSessions}).`,
      suggestedFix: 'Ensure present sessions is non-negative.',
    });
  }

  // 3. Questionable: Present sessions exceeds official conducted total
  if (
    typeof item.presentSessions === 'number' &&
    typeof item.officialTotalSessions === 'number' &&
    item.officialTotalSessions > 0 &&
    item.presentSessions > item.officialTotalSessions
  ) {
    issues.push({
      id: `${idPrefix}-present-exceeds-total`,
      module: 'attendance',
      recordId: item.id,
      recordTitle: title,
      field: 'presentSessions',
      severity: 'warning',
      code: 'INCOMPLETE_ATTENDANCE',
      message: `Present sessions (${item.presentSessions}) exceeds official total (${item.officialTotalSessions}). Percentage will be calculated using countable cap: min(Present, Total).`,
      suggestedFix: 'Verify if extra faculty sessions were recorded beyond official target.',
    });
  }

  return issues;
}

/**
 * Validates a single Internal / Test / Lab Mark item
 */
export function validateInternalMark(
  item: AmsInternalMarkItem,
  index: number
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const idPrefix = item.id || `mark-${index}`;
  const title = item.subjectName || `Assessment #${index + 1}`;

  // 1. Missing Title
  if (!item.subjectName || item.subjectName.trim().length === 0) {
    issues.push({
      id: `${idPrefix}-missing-title`,
      module: 'internals',
      recordId: item.id,
      recordTitle: title,
      field: 'subjectName',
      severity: 'error',
      code: 'MISSING_TITLE',
      message: 'Subject name is missing in internal marks statement.',
      suggestedFix: 'Specify subject title for this assessment.',
    });
  }

  // 2. Invalid Marks
  if (typeof item.maxMarks !== 'number' || item.maxMarks <= 0) {
    issues.push({
      id: `${idPrefix}-invalid-max`,
      module: 'internals',
      recordId: item.id,
      recordTitle: title,
      field: 'maxMarks',
      severity: 'error',
      code: 'INVALID_MARKS',
      message: `Maximum marks must be greater than 0 (received: ${item.maxMarks}).`,
      suggestedFix: 'Set a valid maximum marks denominator (e.g. 50 or 100).',
    });
  }

  if (typeof item.marksObtained !== 'number' || item.marksObtained < 0) {
    issues.push({
      id: `${idPrefix}-negative-marks`,
      module: 'internals',
      recordId: item.id,
      recordTitle: title,
      field: 'marksObtained',
      severity: 'error',
      code: 'INVALID_MARKS',
      message: `Marks obtained cannot be negative (${item.marksObtained}).`,
      suggestedFix: 'Enter zero or a positive score.',
    });
  }

  if (
    typeof item.marksObtained === 'number' &&
    typeof item.maxMarks === 'number' &&
    item.maxMarks > 0 &&
    item.marksObtained > item.maxMarks
  ) {
    issues.push({
      id: `${idPrefix}-marks-exceed-max`,
      module: 'internals',
      recordId: item.id,
      recordTitle: title,
      field: 'marksObtained',
      severity: 'warning',
      code: 'INVALID_MARKS',
      message: `Marks obtained (${item.marksObtained}) exceeds maximum marks (${item.maxMarks}).`,
      suggestedFix: 'Check for scaled marks, bonus points, or scoring typos.',
    });
  }

  return issues;
}

/**
 * Validates a single Semester Result item
 */
export function validateSemesterResult(
  item: AmsSemesterResultItem,
  index: number,
  regulation?: string
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const idPrefix = item.id || `res-${index}`;
  const title = item.courseName || `Course #${index + 1}`;
  const isVtr25 = regulation ? regulation.toUpperCase().includes('VTR25') : false;

  // 1. Missing Title
  if (!item.courseName || item.courseName.trim().length === 0) {
    issues.push({
      id: `${idPrefix}-missing-title`,
      module: 'results',
      recordId: item.id,
      recordTitle: title,
      field: 'courseName',
      severity: 'error',
      code: 'MISSING_TITLE',
      message: 'Course title is missing or empty in result record.',
      suggestedFix: 'Specify the official course title.',
    });
  }

  // 2. Inconsistent Semester Assignment
  if (typeof item.semester !== 'number' || item.semester < 1 || item.semester > 10) {
    issues.push({
      id: `${idPrefix}-invalid-semester`,
      module: 'results',
      recordId: item.id,
      recordTitle: title,
      field: 'semester',
      severity: 'warning',
      code: 'INCONSISTENT_SEMESTER',
      message: `Semester assignment (${item.semester ?? 'None'}) is outside the expected 1–8 range for standard degrees.`,
      suggestedFix: 'Assign course to an active academic semester between 1 and 8.',
    });
  }

  // 3. Invalid Credit Values
  if (typeof item.credits !== 'number' || isNaN(item.credits) || item.credits <= 0 || item.credits > 12) {
    issues.push({
      id: `${idPrefix}-invalid-credits`,
      module: 'results',
      recordId: item.id,
      recordTitle: title,
      field: 'credits',
      severity: 'error',
      code: 'INVALID_CREDITS',
      message: `Course credits value (${item.credits}) is invalid. Typical university courses have 1 to 6 credits.`,
      suggestedFix: 'Assign a valid credit value (e.g. 2, 3, or 4 credits).',
    });
  }

  // 4. Missing Grade
  if (!item.grade || item.grade.trim() === '' || item.grade === '—') {
    issues.push({
      id: `${idPrefix}-missing-grade`,
      module: 'results',
      recordId: item.id,
      recordTitle: title,
      field: 'grade',
      severity: 'warning',
      code: 'MISSING_GRADE',
      message: 'Course grade is pending or unrecorded.',
      suggestedFix: 'Provide letter grade (O, A+, A, B+, B, C, or RA) if published.',
    });
  }

  // 5. Course Code check (for regulations supporting course codes)
  if (!isVtr25 && (!item.courseCode || item.courseCode.trim().length === 0)) {
    issues.push({
      id: `${idPrefix}-missing-code`,
      module: 'results',
      recordId: item.id,
      recordTitle: title,
      field: 'courseCode',
      severity: 'info',
      code: 'MISSING_COURSE_CODE',
      message: 'Course code is absent for a non-VTR25 regulation record.',
      suggestedFix: 'Optionally link course code for autocomplete and indexing.',
    });
  }

  return issues;
}

/**
 * Validates a single Registered Course item
 */
export function validateRegisteredCourse(
  item: AmsRegisteredCourseItem,
  index: number
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const idPrefix = item.id || `reg-${index}`;
  const title = item.courseName || `Course #${index + 1}`;

  if (!item.courseName || item.courseName.trim().length === 0) {
    issues.push({
      id: `${idPrefix}-missing-title`,
      module: 'registered',
      recordId: item.id,
      recordTitle: title,
      field: 'courseName',
      severity: 'error',
      code: 'MISSING_TITLE',
      message: 'Course title is missing in active registration record.',
    });
  }

  if (typeof item.credits !== 'number' || item.credits <= 0 || item.credits > 12) {
    issues.push({
      id: `${idPrefix}-invalid-credits`,
      module: 'registered',
      recordId: item.id,
      recordTitle: title,
      field: 'credits',
      severity: 'error',
      code: 'INVALID_CREDITS',
      message: `Invalid registration credits (${item.credits}).`,
    });
  }

  return issues;
}

/**
 * Validates a single Timetable class period
 */
export function validateTimetableClass(
  item: AmsTimetableClass,
  index: number
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const idPrefix = item.id || `cls-${index}`;
  const title = item.subjectName || `Class #${index + 1}`;

  if (!item.subjectName || item.subjectName.trim().length === 0) {
    issues.push({
      id: `${idPrefix}-missing-title`,
      module: 'timetable',
      recordId: item.id,
      recordTitle: title,
      field: 'subjectName',
      severity: 'error',
      code: 'MISSING_TITLE',
      message: 'Subject name is missing in timetable period.',
    });
  }

  if (!item.startTime || !item.endTime) {
    issues.push({
      id: `${idPrefix}-missing-timing`,
      module: 'timetable',
      recordId: item.id,
      recordTitle: title,
      field: 'startTime',
      severity: 'warning',
      code: 'IRREGULAR_TIMING',
      message: `Incomplete period schedule (Start: ${item.startTime || 'None'}, End: ${item.endTime || 'None'}).`,
    });
  }

  return issues;
}

/**
 * Checks for duplicate subjects in results and attendance
 */
export function findDuplicateSubjects(
  results: AmsSemesterResultItem[],
  attendance: AmsSubjectAttendance[]
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // 1. Duplicates within Semester Results (Same course code or title in same semester)
  const seenResults = new Map<string, { id: string; name: string; semester: number }>();
  for (const r of results) {
    const key = `${r.semester}::${(r.courseCode || r.courseName).trim().toLowerCase()}`;
    if (seenResults.has(key)) {
      issues.push({
        id: `res-dup-${r.id}`,
        module: 'results',
        recordId: r.id,
        recordTitle: r.courseName,
        field: 'courseName',
        severity: 'warning',
        code: 'DUPLICATE_SUBJECT',
        message: `Duplicate subject detected in Semester ${r.semester}: "${r.courseName}". Multiple records exist for this course in the same semester.`,
        suggestedFix: 'Consolidate multiple attempts into a single entry or verify retake semester.',
      });
    } else {
      seenResults.set(key, { id: r.id, name: r.courseName, semester: r.semester });
    }
  }

  // 2. Duplicates within Attendance Records
  const seenAtt = new Map<string, string>();
  for (const a of attendance) {
    const key = (a.courseCode || a.subjectName).trim().toLowerCase();
    if (seenAtt.has(key)) {
      issues.push({
        id: `att-dup-${a.id}`,
        module: 'attendance',
        recordId: a.id,
        recordTitle: a.subjectName,
        field: 'subjectName',
        severity: 'warning',
        code: 'DUPLICATE_SUBJECT',
        message: `Multiple attendance tracks exist for "${a.subjectName}".`,
        suggestedFix: 'Merge separate section tracks or remove obsolete subject record.',
      });
    } else {
      seenAtt.set(key, a.id);
    }
  }

  return issues;
}

/**
 * Comprehensive Validation Engine
 * Audits an entire student's dashboard data and produces an actionable report
 */
export function validateDashboardData(
  data: AmsDashboardData,
  regulation?: string
): ValidationReport {
  const allIssues: ValidationIssue[] = [];
  const activeReg = regulation || data.academicProfile.regulation || 'VTR21';

  let totalRecords = 0;

  // 1. Audit Attendance Records
  data.attendance.forEach((att, idx) => {
    totalRecords++;
    allIssues.push(...validateSubjectAttendance(att, idx));
  });

  // 2. Audit Internal Marks
  data.internalMarks.forEach((m, idx) => {
    totalRecords++;
    allIssues.push(...validateInternalMark(m, idx));
  });

  // 3. Audit Semester Results
  data.semesterResults.forEach((r, idx) => {
    totalRecords++;
    allIssues.push(...validateSemesterResult(r, idx, activeReg));
  });

  // 4. Audit Registered Courses
  data.registeredCourses.forEach((c, idx) => {
    totalRecords++;
    allIssues.push(...validateRegisteredCourse(c, idx));
  });

  // 5. Audit Timetable
  data.timetable.forEach((t, idx) => {
    totalRecords++;
    allIssues.push(...validateTimetableClass(t, idx));
  });

  // 6. Audit Cross-Record Duplicates
  allIssues.push(...findDuplicateSubjects(data.semesterResults, data.attendance));

  const errorCount = allIssues.filter((i) => i.severity === 'error').length;
  const warningCount = allIssues.filter((i) => i.severity === 'warning').length;
  const infoCount = allIssues.filter((i) => i.severity === 'info').length;

  return {
    timestamp: Date.now(),
    isValid: errorCount === 0,
    totalRecordsChecked: totalRecords,
    errorCount,
    warningCount,
    infoCount,
    issues: allIssues,
  };
}
