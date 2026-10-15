import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { setAmsFeatureEnabled } from '../config/features';
import {
  validateSubjectAttendance,
  validateInternalMark,
  validateSemesterResult,
  findDuplicateSubjects,
  validateDashboardData,
} from '../services/amsValidationEngine';
import { amsSyncEngine } from '../services/amsSyncEngine';
import {
  getEmptyAmsDashboardData,
  saveAmsDashboardData,
} from '../services/amsStorage';
import type {
  AmsSubjectAttendance,
  AmsInternalMarkItem,
  AmsSemesterResultItem,
  AmsDashboardData,
} from '../types/amsDashboard';
import { safeGetItem } from '../services/catalogueStorage';

const mockStorage: Record<string, string> = {};
if (typeof globalThis.localStorage === 'undefined') {
  (globalThis as any).localStorage = {
    getItem: (k: string) => mockStorage[k] ?? null,
    setItem: (k: string, v: string) => {
      mockStorage[k] = String(v);
    },
    removeItem: (k: string) => {
      delete mockStorage[k];
    },
    clear: () => {
      Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);
    },
  };
}

beforeEach(() => {
  setAmsFeatureEnabled(true);
});

afterAll(() => {
  setAmsFeatureEnabled(false);
});

function createAttendance(overrides: Partial<AmsSubjectAttendance> = {}): AmsSubjectAttendance {
  return {
    id: 'att-mock',
    profileId: 'test-profile',
    subjectName: 'Test Subject',
    officialTotalSessions: 40,
    presentSessions: 35,
    absentSessions: 5,
    percentage: 87.5,
    source: 'Official AMS Record',
    ...overrides,
  };
}

function createInternalMark(overrides: Partial<AmsInternalMarkItem> = {}): AmsInternalMarkItem {
  return {
    id: 'mark-mock',
    profileId: 'test-profile',
    subjectName: 'Test Subject',
    assessmentType: 'Internal Assessment 1',
    category: 'internal',
    maxMarks: 50,
    marksObtained: 40,
    status: 'Published',
    source: 'Official AMS Record',
    ...overrides,
  };
}

function createSemesterResult(overrides: Partial<AmsSemesterResultItem> = {}): AmsSemesterResultItem {
  return {
    id: 'res-mock',
    profileId: 'test-profile',
    semester: 3,
    courseName: 'Test Course',
    credits: 3,
    grade: 'A',
    status: 'Pass',
    isVerified: true,
    source: 'Official AMS Record',
    ...overrides,
  };
}

describe('AMS Validation Engine and Sync Center', () => {
  beforeEach(() => {
    if (typeof globalThis.localStorage !== 'undefined') {
      globalThis.localStorage.clear();
    }
    Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);
  });

  describe('validateSubjectAttendance', () => {
    it('flags missing subject name', () => {
      const item = createAttendance({ subjectName: '' });
      const issues = validateSubjectAttendance(item, 0);
      expect(issues.some((i) => i.code === 'MISSING_TITLE' && i.severity === 'error')).toBe(true);
    });

    it('flags non-positive official total sessions', () => {
      const item = createAttendance({
        subjectName: 'Operating Systems',
        officialTotalSessions: 0,
        presentSessions: 0,
        percentage: 0,
      });
      const issues = validateSubjectAttendance(item, 0);
      expect(issues.some((i) => i.code === 'INCOMPLETE_ATTENDANCE' && i.field === 'officialTotalSessions')).toBe(true);
    });

    it('flags negative present sessions', () => {
      const item = createAttendance({
        subjectName: 'Computer Networks',
        officialTotalSessions: 40,
        presentSessions: -5,
      });
      const issues = validateSubjectAttendance(item, 0);
      expect(issues.some((i) => i.code === 'INCOMPLETE_ATTENDANCE' && i.field === 'presentSessions')).toBe(true);
    });

    it('flags warning when present sessions exceeds official conducted total', () => {
      const item = createAttendance({
        subjectName: 'Compiler Design',
        officialTotalSessions: 30,
        presentSessions: 35,
        percentage: 100,
      });
      const issues = validateSubjectAttendance(item, 0);
      expect(issues.some((i) => i.code === 'INCOMPLETE_ATTENDANCE' && i.severity === 'warning')).toBe(true);
    });

    it('passes completely clean attendance records', () => {
      const item = createAttendance({
        subjectName: 'Cloud Computing',
        officialTotalSessions: 45,
        presentSessions: 40,
        percentage: 88.89,
      });
      const issues = validateSubjectAttendance(item, 0);
      expect(issues).toHaveLength(0);
    });
  });

  describe('validateInternalMark', () => {
    it('flags missing subject name in internal mark', () => {
      const item = createInternalMark({ subjectName: '   ' });
      const issues = validateInternalMark(item, 0);
      expect(issues.some((i) => i.code === 'MISSING_TITLE')).toBe(true);
    });

    it('flags invalid maxMarks (zero or negative)', () => {
      const item = createInternalMark({
        subjectName: 'Database Systems',
        marksObtained: 20,
        maxMarks: 0,
      });
      const issues = validateInternalMark(item, 0);
      expect(issues.some((i) => i.code === 'INVALID_MARKS' && i.field === 'maxMarks')).toBe(true);
    });

    it('flags negative obtained marks', () => {
      const item = createInternalMark({
        subjectName: 'Database Systems',
        marksObtained: -10,
        maxMarks: 50,
      });
      const issues = validateInternalMark(item, 0);
      expect(issues.some((i) => i.code === 'INVALID_MARKS' && i.field === 'marksObtained')).toBe(true);
    });

    it('warns when marks obtained exceed maximum marks', () => {
      const item = createInternalMark({
        subjectName: 'Database Systems',
        marksObtained: 55,
        maxMarks: 50,
      });
      const issues = validateInternalMark(item, 0);
      expect(issues.some((i) => i.code === 'INVALID_MARKS' && i.severity === 'warning')).toBe(true);
    });
  });

  describe('validateSemesterResult', () => {
    it('flags missing course title', () => {
      const item = createSemesterResult({ courseName: '' });
      const issues = validateSemesterResult(item, 0, 'VTR21');
      expect(issues.some((i) => i.code === 'MISSING_TITLE')).toBe(true);
    });

    it('flags invalid or out-of-range semester', () => {
      const item = createSemesterResult({
        courseName: 'Software Engineering',
        semester: 15,
      });
      const issues = validateSemesterResult(item, 0, 'VTR21');
      expect(issues.some((i) => i.code === 'INCONSISTENT_SEMESTER')).toBe(true);
    });

    it('flags invalid credits (zero, negative, or excessive)', () => {
      const item = createSemesterResult({
        courseName: 'Software Engineering',
        credits: 0,
      });
      const issues = validateSemesterResult(item, 0, 'VTR21');
      expect(issues.some((i) => i.code === 'INVALID_CREDITS')).toBe(true);
    });

    it('flags missing or pending grade', () => {
      const item = createSemesterResult({
        courseName: 'Software Engineering',
        grade: '—',
      });
      const issues = validateSemesterResult(item, 0, 'VTR21');
      expect(issues.some((i) => i.code === 'MISSING_GRADE')).toBe(true);
    });

    it('checks course code requirement according to regulation', () => {
      const item = createSemesterResult({
        courseName: 'Artificial Intelligence',
        semester: 5,
        credits: 4,
        grade: 'O',
        courseCode: undefined,
      });

      // VTR21 requires course code (gives info when missing)
      const vtr21Issues = validateSemesterResult(item, 0, 'VTR21');
      expect(vtr21Issues.some((i) => i.code === 'MISSING_COURSE_CODE')).toBe(true);

      // VTR25 forbids course codes (no issue flagged for missing course code)
      const vtr25Issues = validateSemesterResult(item, 0, 'VTR25');
      expect(vtr25Issues.some((i) => i.code === 'MISSING_COURSE_CODE')).toBe(false);
    });
  });

  describe('findDuplicateSubjects', () => {
    it('detects duplicate course entries within the same semester', () => {
      const results: AmsSemesterResultItem[] = [
        createSemesterResult({
          id: 'r1',
          courseName: 'Data Structures',
          courseCode: '10210CS101',
          semester: 2,
          credits: 4,
          grade: 'RA',
          status: 'RA',
        }),
        createSemesterResult({
          id: 'r2',
          courseName: 'Data Structures',
          courseCode: '10210CS101',
          semester: 2,
          credits: 4,
          grade: 'A',
          status: 'Pass',
        }),
      ];
      const issues = findDuplicateSubjects(results, []);
      expect(issues.some((i) => i.code === 'DUPLICATE_SUBJECT' && i.module === 'results')).toBe(true);
    });

    it('allows same course in different semesters (retake in later semester)', () => {
      const results: AmsSemesterResultItem[] = [
        createSemesterResult({
          id: 'r1',
          courseName: 'Data Structures',
          courseCode: '10210CS101',
          semester: 2,
          credits: 4,
          grade: 'RA',
          status: 'RA',
        }),
        createSemesterResult({
          id: 'r2',
          courseName: 'Data Structures',
          courseCode: '10210CS101',
          semester: 3,
          credits: 4,
          grade: 'A',
          status: 'Pass',
        }),
      ];
      const issues = findDuplicateSubjects(results, []);
      expect(issues.filter((i) => i.code === 'DUPLICATE_SUBJECT')).toHaveLength(0);
    });

    it('detects duplicate tracks within attendance records', () => {
      const attendance: AmsSubjectAttendance[] = [
        createAttendance({
          id: 'a1',
          subjectName: 'Discrete Mathematics',
          courseCode: '10210MA101',
          officialTotalSessions: 30,
          presentSessions: 25,
        }),
        createAttendance({
          id: 'a2',
          subjectName: 'Discrete Mathematics',
          courseCode: '10210MA101',
          officialTotalSessions: 15,
          presentSessions: 12,
        }),
      ];
      const issues = findDuplicateSubjects([], attendance);
      expect(issues.some((i) => i.code === 'DUPLICATE_SUBJECT' && i.module === 'attendance')).toBe(true);
    });
  });

  describe('validateDashboardData (Comprehensive Audit)', () => {
    it('produces an accurate validation report with metrics and issues', () => {
      const data: AmsDashboardData = {
        ...getEmptyAmsDashboardData('test-profile-1'),
        attendance: [
          createAttendance({
            id: 'att-1',
            subjectName: 'Physics',
            officialTotalSessions: 30,
            presentSessions: 32, // warning: present > total
            percentage: 100,
          }),
          createAttendance({
            id: 'att-2',
            subjectName: '', // error: missing title
            officialTotalSessions: 30,
            presentSessions: 20,
            percentage: 66.67,
          }),
        ],
        internalMarks: [
          createInternalMark({
            id: 'm-1',
            subjectName: 'Chemistry',
            marksObtained: -5, // error: negative marks
            maxMarks: 50,
          }),
        ],
        semesterResults: [],
        registeredCourses: [],
        timetable: [],
      };

      const report = validateDashboardData(data, 'VTR21');
      expect(report.isValid).toBe(false);
      expect(report.errorCount).toBeGreaterThanOrEqual(2);
      expect(report.warningCount).toBeGreaterThanOrEqual(1);
      expect(report.totalRecordsChecked).toBe(3);
    });
  });

  describe('AmsSyncEngine (Sync Center State & Cross-Calculator Transfers)', () => {
    const profileId = 'VTU99999_VAL_TEST';

    it('generates a SyncCenterState snapshot with live metrics', () => {
      const amsData = getEmptyAmsDashboardData(profileId);
      amsData.attendance.push(
        createAttendance({
          id: 'att-valid-1',
          profileId,
          subjectName: 'Database Management Systems',
          courseCode: '10210CS104',
          officialTotalSessions: 40,
          presentSessions: 36,
          percentage: 90,
        })
      );
      saveAmsDashboardData(profileId, amsData);

      const syncState = amsSyncEngine.getSyncCenterState(profileId);
      expect(syncState.profileId).toBe(profileId);
      expect(syncState.perModuleStatus.attendance).toBe('synced');
      expect(syncState.metrics.retrieved).toBe(1);
      expect(syncState.validationReport.isValid).toBe(true);
    });

    it('safely merges attendance records and updates changed records without duplication', () => {
      const existing: AmsSubjectAttendance[] = [
        createAttendance({
          id: 'existing-1',
          subjectName: 'Web Technologies',
          courseCode: '10210CS105',
          officialTotalSessions: 30,
          presentSessions: 25,
          percentage: 83.33,
        }),
      ];

      const incoming: AmsSubjectAttendance[] = [
        // Updated existing subject
        createAttendance({
          id: 'inc-1',
          subjectName: 'Web Technologies',
          courseCode: '10210CS105',
          officialTotalSessions: 35,
          presentSessions: 30,
          percentage: 85.71,
        }),
        // Brand new subject
        createAttendance({
          id: 'inc-2',
          subjectName: 'Cyber Security',
          courseCode: '10210CS106',
          officialTotalSessions: 40,
          presentSessions: 38,
          percentage: 95,
        }),
      ];

      const result = amsSyncEngine.mergeAttendanceRecords(existing, incoming, 'OFFICIAL_AMS');
      expect(result.updated).toBe(1);
      expect(result.added).toBe(1);
      expect(result.merged).toHaveLength(2);
      expect(result.merged[0].officialTotalSessions).toBe(35);
      expect(result.merged[0].presentSessions).toBe(30);
    });

    it('transfers verified attendance to Attendance Calculator storage without losing isolated profile data', () => {
      const amsData = getEmptyAmsDashboardData(profileId);
      amsData.attendance.push(
        createAttendance({
          id: 'att-trans-1',
          profileId,
          subjectName: 'Machine Learning',
          courseCode: '10210CS201',
          officialTotalSessions: 45,
          presentSessions: 40,
          percentage: 88.89,
        })
      );
      saveAmsDashboardData(profileId, amsData);

      const transferResult = amsSyncEngine.transferToAttendanceCalculator(profileId);
      expect(transferResult.added).toBe(1);

      const raw = safeGetItem(`academic_attendance_subjects_${profileId}`);
      expect(raw).toBeTruthy();
      const saved = JSON.parse(raw!);
      expect(saved[0].name).toBe('Machine Learning');
      expect(saved[0].conducted).toBe(45);
      expect(saved[0].attended).toBe(40);
      expect(saved[0].provenance).toBe('OFFICIAL_AMS');
    });

    it('transfers verified semester results to Credits Planner storage with regulation compliance', () => {
      const amsData = getEmptyAmsDashboardData(profileId);
      amsData.semesterResults.push(
        createSemesterResult({
          id: 'res-trans-1',
          profileId,
          courseName: 'Deep Learning',
          courseCode: '10210CS301',
          semester: 6,
          credits: 4,
          grade: 'O',
          status: 'Pass',
        }),
        createSemesterResult({
          id: 'res-trans-2',
          profileId,
          courseName: 'Quantum Computing',
          courseCode: '10210CS302',
          semester: 6,
          credits: 3,
          grade: 'RA',
          status: 'RA',
        })
      );
      saveAmsDashboardData(profileId, amsData);

      // Test transfer under VTR21
      const resVtr21 = amsSyncEngine.transferToCreditsPlanner(profileId, 'VTR21');
      expect(resVtr21.added).toBe(2);

      const raw = safeGetItem(`academic_credits_subjects_${profileId}`);
      expect(raw).toBeTruthy();
      const stored = JSON.parse(raw!);
      expect(stored[0].name).toBe('Deep Learning');
      expect(stored[0].code).toBe('10210CS301');
      expect(stored[0].earnedCredits).toBe(4);
      expect(stored[1].name).toBe('Quantum Computing');
      expect(stored[1].earnedCredits).toBe(0); // Failed/RA courses give 0 earned credits
      expect(stored[1].status).toBe('Failed');
    });

    it('transfers semester results to SGPA draft calculation store', () => {
      const amsData = getEmptyAmsDashboardData(profileId);
      amsData.semesterResults.push(
        createSemesterResult({
          id: 'res-sgpa-1',
          profileId,
          courseName: 'Internet of Things',
          courseCode: '10210CS205',
          semester: 4,
          credits: 3,
          grade: 'A+',
          status: 'Pass',
        })
      );
      saveAmsDashboardData(profileId, amsData);

      const transferResult = amsSyncEngine.transferToSgpaCalculator(profileId, 4);
      expect(transferResult.coursesCount).toBe(1);

      const rawDraft = safeGetItem(`academic_draft_gpa_${profileId}`);
      expect(rawDraft).toBeTruthy();
      const draft = JSON.parse(rawDraft!);
      expect(draft.semester).toBe(4);
      expect(draft.courses[0].name).toBe('Internet of Things');
      expect(draft.courses[0].grade).toBe('A+');
    });
  });
});
