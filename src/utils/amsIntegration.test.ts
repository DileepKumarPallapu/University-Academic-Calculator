import { describe, it, expect, beforeEach } from 'vitest';
import {
  amsIntegrationAdapter,
  validateStudentIdFormat,
  OFFICIAL_AMS_METADATA,
  generateCompositeKey,
} from '../services/amsIntegrationAdapter';
import {
  getEmptyAmsDashboardData,
  getAmsDashboardData,
  saveAmsDashboardData,
  clearAmsDataForProfile,
  applyAmsToAttendance,
  reconcileAmsWithCredits,
} from '../services/amsStorage';
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

describe('Real Vel Tech AMS Integration Adapter & Authentication', () => {
  beforeEach(() => {
    if (typeof globalThis.localStorage !== 'undefined') {
      globalThis.localStorage.clear();
    }
    Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);
  });

  describe('Phase 1: Official AMS Verification & Metadata', () => {
    it('verifies the official Vel Tech AMS host and platform metadata', () => {
      expect(OFFICIAL_AMS_METADATA.host).toBe('ams.veltech.edu.in');
      expect(OFFICIAL_AMS_METADATA.serverPlatform).toBe('Microsoft-IIS/10.0');
      expect(OFFICIAL_AMS_METADATA.aspVersion).toBe('ASP.NET 4.0.30319');
      expect(OFFICIAL_AMS_METADATA.authEndpoint).toBe('/Login.aspx');
      expect(OFFICIAL_AMS_METADATA.postAction).toBe('/Validation.aspx');
      expect(OFFICIAL_AMS_METADATA.securityControls.hasCaptcha).toBe(true);
      expect(OFFICIAL_AMS_METADATA.securityControls.hasCryptographicNonce).toBe(true);
      expect(OFFICIAL_AMS_METADATA.securityControls.hasPublicRestApi).toBe(false);
      expect(OFFICIAL_AMS_METADATA.securityControls.hasPublicOAuthSso).toBe(false);
    });

    it('validates student ID format strictly (e.g. VTU12345)', () => {
      expect(validateStudentIdFormat('VTU12345')).toBe(true);
      expect(validateStudentIdFormat('VTU24654')).toBe(true);
      expect(validateStudentIdFormat('VTU29962')).toBe(true);
      expect(validateStudentIdFormat('')).toBe(false);
      expect(validateStudentIdFormat('12')).toBe(false);
    });
  });

  describe('Phase 2: Authentication Security & Validation', () => {
    it('rejects empty credentials with clear status', async () => {
      const res = await amsIntegrationAdapter.authenticate(
        { username: '', password: '' },
        'profile-1'
      );
      expect(res.success).toBe(false);
      expect(res.status).toBe('invalid_credentials');
      expect(res.message).toContain('required');
    });

    it('rejects invalid student ID format', async () => {
      const res = await amsIntegrationAdapter.authenticate(
        { username: '12', password: 'ValidPassword123!', captcha: 'RELLFT' },
        'profile-1'
      );
      expect(res.success).toBe(false);
      expect(res.status).toBe('invalid_credentials');
      expect(res.message).toContain('Invalid Student ID');
    });

    it('requires CAPTCHA verification', async () => {
      const res = await amsIntegrationAdapter.authenticate(
        { username: 'VTU12345', password: 'ValidPassword123!', captcha: '' },
        'profile-1'
      );
      expect(res.success).toBe(false);
      expect(res.status).toBe('captcha_required');
      expect(res.message).toContain('CAPTCHA');
    });

    it('rejects trivial or dummy passwords without faking login', async () => {
      const res = await amsIntegrationAdapter.authenticate(
        { username: 'VTU12345', password: 'password', captcha: 'RELLFT' },
        'profile-1'
      );
      expect(res.success).toBe(false);
      expect(res.status).toBe('invalid_credentials');
    });

    it('returns honest institutional requirement when official API is unprovisioned', async () => {
      const res = await amsIntegrationAdapter.authenticate(
        { username: 'VTU12345', password: 'ComplexPassword89#', captcha: 'RELLFT' },
        'profile-1'
      );
      expect(res.success).toBe(false);
      expect(res.status).toBe('official_api_required');
      expect(res.message).toContain('Official Institutional Authorization Required');
      expect(res.message).toContain('Office of Controller of Examinations');
      expect(res.details).toContain('Background credential-scraping is strictly disabled');
    });

    it('never writes passwords to browser localStorage or sessionStorage', async () => {
      await amsIntegrationAdapter.authenticate(
        { username: 'VTU12345', password: 'SuperSecretPassword999!', captcha: 'RELLFT' },
        'profile-test'
      );

      const allStored = JSON.stringify(mockStorage);
      expect(allStored).not.toContain('SuperSecretPassword999!');
    });
  });

  describe('Phase 4 & 5: Data Synchronization & Student Isolation', () => {
    it('initializes fresh student profile with clean empty data across all modules', () => {
      const fresh = getEmptyAmsDashboardData('new-student-42');
      expect(fresh.profileId).toBe('new-student-42');
      expect(fresh.attendance).toHaveLength(0);
      expect(fresh.timetable).toHaveLength(0);
      expect(fresh.internalMarks).toHaveLength(0);
      expect(fresh.semesterResults).toHaveLength(0);
      expect(fresh.registeredCourses).toHaveLength(0);
      expect(fresh.syncLogs).toHaveLength(0);
    });

    it('ensures strict isolation between two different students', () => {
      saveAmsDashboardData('student-A', {
        attendance: [
          {
            id: 'att-1',
            profileId: 'student-A',
            subjectName: 'Computer Networks',
            officialTotalSessions: 40,
            presentSessions: 36,
            absentSessions: 4,
            percentage: 90,
            source: 'Official AMS Record',
          },
        ],
      });

      const dataA = getAmsDashboardData('student-A');
      const dataB = getAmsDashboardData('student-B');

      expect(dataA.attendance).toHaveLength(1);
      expect(dataA.attendance[0].subjectName).toBe('Computer Networks');
      expect(dataB.attendance).toHaveLength(0);
    });

    it('clears all AMS data for a specific profile without affecting other students', () => {
      saveAmsDashboardData('student-X', {
        semesterResults: [
          {
            id: 'r-1',
            profileId: 'student-X',
            semester: 1,
            courseName: 'Engineering Mathematics',
            credits: 4,
            grade: 'O',
            status: 'Pass',
            isVerified: true,
            source: 'Official AMS Record',
          },
        ],
      });

      saveAmsDashboardData('student-Y', {
        semesterResults: [
          {
            id: 'r-2',
            profileId: 'student-Y',
            semester: 1,
            courseName: 'Engineering Physics',
            credits: 3,
            grade: 'A+',
            status: 'Pass',
            isVerified: true,
            source: 'Official AMS Record',
          },
        ],
      });

      clearAmsDataForProfile('student-X');

      expect(getAmsDashboardData('student-X').semesterResults).toHaveLength(0);
      expect(getAmsDashboardData('student-Y').semesterResults).toHaveLength(1);
    });

    it('generates stable composite keys to prevent duplicate records', () => {
      const key1 = generateCompositeKey(['VTU12345', '10211CS205', 3]);
      const key2 = generateCompositeKey(['VTU12345', '10211CS205', 3]);
      expect(key1).toBe(key2);
      expect(key1).toBe('vtu12345::10211cs205::3');
    });
  });

  describe('Phase 6: Calculator Connections', () => {
    it('applies AMS attendance directly to the manual Attendance Calculator without duplicates', () => {
      saveAmsDashboardData('profile-calc', {
        attendance: [
          {
            id: 'att-1',
            profileId: 'profile-calc',
            subjectName: 'Operating Systems',
            officialTotalSessions: 45,
            presentSessions: 40,
            absentSessions: 5,
            percentage: 88.89,
            source: 'Official AMS Record',
          },
        ],
      });

      const firstSync = applyAmsToAttendance('profile-calc');
      expect(firstSync.added).toBe(1);
      expect(firstSync.updated).toBe(0);

      // Verify stored in manual calculator key
      const stored = JSON.parse(safeGetItem('academic_attendance_subjects_profile-calc') || '[]');
      expect(stored).toHaveLength(1);
      expect(stored[0].name).toBe('Operating Systems');
      expect(stored[0].conducted).toBe(45);
      expect(stored[0].attended).toBe(40);

      // Repeated sync updates rather than duplicates
      const secondSync = applyAmsToAttendance('profile-calc');
      expect(secondSync.added).toBe(0);
      expect(secondSync.updated).toBe(1);
    });

    it('reconciles AMS results with Credits Planner without duplicating courses', () => {
      const results = [
        {
          id: 'res-1',
          profileId: 'profile-cred',
          semester: 2,
          courseName: 'Database Management Systems',
          courseCode: '10211CS202',
          credits: 4,
          grade: 'A',
          status: 'Pass' as const,
          isVerified: true,
          source: 'Official AMS Record' as const,
        },
      ];

      const r1 = reconcileAmsWithCredits('profile-cred', results, 'VTR21');
      expect(r1.added).toBe(1);

      const r2 = reconcileAmsWithCredits('profile-cred', results, 'VTR21');
      expect(r2.added).toBe(0);
      expect(r2.skipped).toBe(1);
    });
  });
});
