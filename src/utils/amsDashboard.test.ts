import { describe, it, expect, beforeEach } from 'vitest';
import {
  getEmptyAmsDashboardData,
  getAmsDashboardData,
  saveAmsDashboardData,
  calculateAmsAttendancePercentage,
  addAmsSyncLog,
  clearAmsDataForProfile,
  exportAmsDataForProfile,
  reconcileAmsWithCredits,
} from '../services/amsStorage';
import { safeGetItem } from '../services/catalogueStorage';
import type { AmsSemesterResultItem } from '../types/amsDashboard';

const mockStorage: Record<string, string> = {};
if (typeof globalThis.localStorage === 'undefined') {
  (globalThis as any).localStorage = {
    getItem: (k: string) => mockStorage[k] ?? null,
    setItem: (k: string, v: string) => { mockStorage[k] = String(v); },
    removeItem: (k: string) => { delete mockStorage[k]; },
    clear: () => {
      Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);
    },
  };
}

describe('AMS Dashboard & Storage System', () => {
  beforeEach(() => {
    if (typeof globalThis.localStorage !== 'undefined') {
      globalThis.localStorage.clear();
    }
    Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);
  });

  describe('Zero Initial State & Empty Profile Defaults', () => {
    it('initializes a fresh profile with zero records across all 9 modules', () => {
      const empty = getEmptyAmsDashboardData('student-profile-1');
      expect(empty.profileId).toBe('student-profile-1');
      expect(empty.academicProfile.connectionStatus).toBe('not_connected');
      expect(empty.attendance).toHaveLength(0);
      expect(empty.timetable).toHaveLength(0);
      expect(empty.internalMarks).toHaveLength(0);
      expect(empty.semesterResults).toHaveLength(0);
      expect(empty.registeredCourses).toHaveLength(0);
      expect(empty.syncLogs).toHaveLength(0);
      expect(empty.lastSyncTime).toBeUndefined();
    });

    it('returns empty dashboard when querying an uninitialized profile id', () => {
      const data = getAmsDashboardData('fresh-student-99');
      expect(data.profileId).toBe('fresh-student-99');
      expect(data.attendance).toEqual([]);
      expect(data.timetable).toEqual([]);
      expect(data.internalMarks).toEqual([]);
      expect(data.semesterResults).toEqual([]);
      expect(data.registeredCourses).toEqual([]);
      expect(data.syncLogs).toEqual([]);
    });
  });

  describe('Attendance Calculation Logic', () => {
    it('calculates correct attendance percentage with normal attendance', () => {
      // 25 attended out of 30 official sessions
      const pct = calculateAmsAttendancePercentage(30, 25);
      expect(pct).toBe(83.33);
    });

    it('caps attendance percentage strictly at 100% when extra sessions are attended', () => {
      // 35 attended when official total is 30
      const pct = calculateAmsAttendancePercentage(30, 35);
      expect(pct).toBe(100);
    });

    it('handles perfect 100% attendance', () => {
      const pct = calculateAmsAttendancePercentage(40, 40);
      expect(pct).toBe(100);
    });

    it('returns 0% when 0 sessions are attended', () => {
      const pct = calculateAmsAttendancePercentage(40, 0);
      expect(pct).toBe(0);
    });

    it('returns null when official total sessions is 0 or negative', () => {
      expect(calculateAmsAttendancePercentage(0, 0)).toBeNull();
      expect(calculateAmsAttendancePercentage(0, 10)).toBeNull();
      expect(calculateAmsAttendancePercentage(-5, 5)).toBeNull();
    });

    it('handles negative or invalid present sessions gracefully by treating them as 0', () => {
      const pct = calculateAmsAttendancePercentage(30, -5);
      expect(pct).toBe(0);
    });
  });

  describe('Multi-Student Profile Data Isolation', () => {
    it('strictly isolates AMS data between student profiles', () => {
      const profileA = 'profile-alice';
      const profileB = 'profile-bob';

      // Save attendance for Alice
      saveAmsDashboardData(profileA, {
        academicProfile: {
          college: 'Vel Tech Rangarajan Dr. Sagunthala R&D Institute of Science and Technology',
          studentName: 'Alice',
          registerNumber: '22021A0101',
          connectionStatus: 'connected',
        },
        attendance: [
          {
            id: 'att-1',
            profileId: profileA,
            courseCode: '19CS301',
            subjectName: 'Compiler Design',
            officialTotalSessions: 40,
            presentSessions: 38,
            absentSessions: 2,
            percentage: 95,
            source: 'Official AMS Record',
          },
        ],
      });

      // Verify Alice has data
      const aliceData = getAmsDashboardData(profileA);
      expect(aliceData.academicProfile.studentName).toBe('Alice');
      expect(aliceData.attendance).toHaveLength(1);
      expect(aliceData.attendance[0].subjectName).toBe('Compiler Design');

      // Verify Bob has zero data and was not contaminated
      const bobData = getAmsDashboardData(profileB);
      expect(bobData.academicProfile.studentName).toBeUndefined();
      expect(bobData.attendance).toHaveLength(0);
      expect(bobData.academicProfile.connectionStatus).toBe('not_connected');
    });

    it('clearing data for one profile does not affect other profiles', () => {
      const profile1 = 'student-1';
      const profile2 = 'student-2';

      saveAmsDashboardData(profile1, {
        timetable: [
          {
            id: 'tt-1',
            profileId: profile1,
            day: 'Monday',
            startTime: '08:30 AM',
            endTime: '09:30 AM',
            subjectName: 'Data Structures',
            faculty: 'Prof. Sharma',
          },
        ],
      });

      saveAmsDashboardData(profile2, {
        timetable: [
          {
            id: 'tt-2',
            profileId: profile2,
            day: 'Tuesday',
            startTime: '09:30 AM',
            endTime: '10:30 AM',
            subjectName: 'Operating Systems',
            faculty: 'Dr. Rao',
          },
        ],
      });

      // Clear profile1
      clearAmsDataForProfile(profile1);

      expect(getAmsDashboardData(profile1).timetable).toHaveLength(0);
      expect(getAmsDashboardData(profile2).timetable).toHaveLength(1);
      expect(getAmsDashboardData(profile2).timetable[0].subjectName).toBe('Operating Systems');
    });
  });

  describe('Sync History & Audit Logging', () => {
    it('appends sync logs with timestamps and status correctly', () => {
      const profileId = 'student-audit-1';
      addAmsSyncLog(profileId, {
        type: 'manual_import',
        status: 'success',
        message: 'Successfully imported attendance records.',
        recordsCount: 6,
      });

      const data = getAmsDashboardData(profileId);
      expect(data.syncLogs).toHaveLength(1);
      expect(data.syncLogs[0].type).toBe('manual_import');
      expect(data.syncLogs[0].status).toBe('success');
      expect(data.syncLogs[0].recordsCount).toBe(6);
      expect(data.lastSyncTime).toBeDefined();
    });
  });

  describe('Credit Reconciliation', () => {
    it('reconciles imported AMS results without duplicating courses', () => {
      const profileId = 'student-credits-1';
      const results: AmsSemesterResultItem[] = [
        {
          id: 'res-1',
          profileId,
          semester: 4,
          courseCode: '19CS401',
          courseName: 'Database Management Systems',
          credits: 4,
          grade: 'S',
          status: 'Pass',
          isVerified: true,
          source: 'Official AMS Record',
        },
        {
          id: 'res-2',
          profileId,
          semester: 4,
          courseCode: '19CS402',
          courseName: 'Computer Networks',
          credits: 3,
          grade: 'A',
          status: 'Pass',
          isVerified: true,
          source: 'Official AMS Record',
        },
      ];

      // First run adds both
      const firstRun = reconcileAmsWithCredits(profileId, results, 'VTR21');
      expect(firstRun.added).toBe(2);
      expect(firstRun.updated).toBe(0);
      expect(firstRun.skipped).toBe(0);

      // Second run with same results skips duplication
      const secondRun = reconcileAmsWithCredits(profileId, results, 'VTR21');
      expect(secondRun.added).toBe(0);
      expect(secondRun.updated).toBe(0);
      expect(secondRun.skipped).toBe(2);

      // Updating a grade reconciles existing record
      const updatedResults: AmsSemesterResultItem[] = [
        {
          id: 'res-1',
          profileId,
          semester: 4,
          courseCode: '19CS401',
          courseName: 'Database Management Systems',
          credits: 4,
          grade: 'U',
          status: 'RA',
          isVerified: true,
          source: 'Official AMS Record',
        },
      ];
      const thirdRun = reconcileAmsWithCredits(profileId, updatedResults, 'VTR21');
      expect(thirdRun.updated).toBe(1);
    });

    it('respects VTR25 regulation by never attaching course codes in credit records', () => {
      const profileId = 'student-vtr25';
      const results: AmsSemesterResultItem[] = [
        {
          id: 'res-vtr25',
          profileId,
          semester: 1,
          courseCode: 'IGNORED_CODE',
          courseName: 'Introduction to AI',
          credits: 3,
          grade: 'O',
          status: 'Pass',
          isVerified: true,
          source: 'Official AMS Record',
        },
      ];

      reconcileAmsWithCredits(profileId, results, 'VTR25');
      const raw = safeGetItem(`academic_credits_subjects_${profileId}`);
      const stored = JSON.parse(raw || '[]');
      expect(stored).toHaveLength(1);
      expect(stored[0].code).toBeUndefined();
      expect(stored[0].name).toBe('Introduction to AI');
    });
  });

  describe('Data Export', () => {
    it('exports well-formatted JSON with metadata', () => {
      const profileId = 'student-export';
      saveAmsDashboardData(profileId, {
        academicProfile: {
          college: 'Vel Tech Rangarajan Dr. Sagunthala R&D Institute of Science and Technology',
          studentName: 'Charlie',
          connectionStatus: 'connected',
        },
      });

      const jsonStr = exportAmsDataForProfile(profileId);
      const parsed = JSON.parse(jsonStr);

      expect(parsed.exportVersion).toBe('1.0.0');
      expect(parsed.institution).toContain('Vel Tech');
      expect(parsed.data.academicProfile.studentName).toBe('Charlie');
    });
  });
});
