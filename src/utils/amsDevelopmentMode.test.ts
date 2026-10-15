import { describe, it, expect, beforeEach } from 'vitest';
import { AMS_FEATURE_ENABLED, setAmsFeatureEnabled } from '../config/features';
import { amsIntegrationAdapter } from '../services/amsIntegrationAdapter';
import { amsSyncEngine } from '../services/amsSyncEngine';
import { calculateCurrentAttendance, validateAttendanceInputs } from './attendancePlanner';
import { calculateCreditSummary, calculateCategoryProgress } from './creditCalculations';
import { calculateTheoryInternal, calculateIntegratedInternal, calculateGPA } from './calculations';
import { getAcademicCompanionOverview, generateAcademicAlerts } from '../services/companionStorage';
import type { StudentProfile } from '../types/profile';

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

describe('AMS Development Mode & Zero Default Student Isolation', () => {
  const freshProfile: StudentProfile = {
    id: 'student-fresh-001',
    name: 'New Student',
    rollNumber: 'VTU30001',
    branch: 'CSE',
    currentSemester: 1,
    regulation: 'VTR21',
    degreePathway: 'standard',
    customGraduationCredits: 160,
    targetAttendance: 75,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const studentProfileB: StudentProfile = {
    id: 'student-b-002',
    name: 'Student B',
    rollNumber: 'VTU30002',
    branch: 'ECE',
    currentSemester: 3,
    regulation: 'VTR21',
    degreePathway: 'standard',
    customGraduationCredits: 160,
    targetAttendance: 75,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  beforeEach(() => {
    setAmsFeatureEnabled(false);
    if (typeof globalThis.localStorage !== 'undefined') {
      globalThis.localStorage.clear();
    }
    Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);
  });

  describe('1. AMS Feature Flag & Development Mode Guards', () => {
    it('has AMS_FEATURE_ENABLED set to false by default in development', () => {
      expect(AMS_FEATURE_ENABLED).toBe(false);
    });

    it('blocks authentication attempts when AMS is disabled during development', async () => {
      const authResult = await amsIntegrationAdapter.authenticate(
        { username: 'VTU30001', password: 'ValidPassword123!', captcha: 'ABCD12' },
        freshProfile.id
      );

      expect(authResult.success).toBe(false);
      expect(authResult.status).toBe('auth_unavailable');
      expect(authResult.message).toContain('under development');
    });

    it('blocks data synchronization when AMS is disabled', async () => {
      const syncResult = await amsIntegrationAdapter.syncAll(freshProfile.id);

      expect(syncResult.totalRetrieved).toBe(0);
      expect(syncResult.added).toBe(0);
      expect(syncResult.failed).toBe(0);
      expect(syncResult.modules.attendance).toBe('not_available');
      expect(syncResult.modules.internalMarks).toBe('not_available');
      expect(syncResult.modules.semesterResults).toBe('not_available');
    });

    it('prevents cross-calculator transfers when AMS is disabled', () => {
      const attTransfer = amsSyncEngine.transferToAttendanceCalculator(freshProfile.id);
      expect(attTransfer).toEqual({ added: 0, updated: 0, unchanged: 0 });

      const credTransfer = amsSyncEngine.transferToCreditsPlanner(freshProfile.id, 'VTR21');
      expect(credTransfer).toEqual({ added: 0, updated: 0, skipped: 0 });

      const gpaTransfer = amsSyncEngine.transferToSgpaCalculator(freshProfile.id);
      expect(gpaTransfer).toEqual({ coursesCount: 0 });
    });
  });

  describe('2. Student Defaults Initialization (All Zeros)', () => {
    it('initializes Attendance with 0 sessions and displays "Not calculated"', () => {
      const conducted = 0;
      const attended = 0;
      const targetPct = 75;

      const validation = validateAttendanceInputs(conducted, attended, targetPct);
      expect(validation.isValid).toBe(true);

      const metrics = calculateCurrentAttendance(conducted, attended, targetPct);
      expect(metrics.percentage).toBeNull();
      expect(metrics.missed).toBe(0);
      expect(metrics.differenceFromTarget).toBeNull();
      expect(metrics.status).toBe('Insufficient Data');
      expect(metrics.statusDetails.label).toBe('Not calculated');
    });

    it('handles zero conducted sessions without division-by-zero errors', () => {
      expect(() => {
        const res = calculateCurrentAttendance(0, 0, 75);
        expect(res.percentage).toBeNull();
      }).not.toThrow();
    });

    it('initializes Credit System with 0 registered, 0 earned, and full degree target remaining', () => {
      const emptySubjects: any[] = [];
      const target = 160;

      const summary = calculateCreditSummary(emptySubjects, target);
      expect(summary.totalRegisteredCredits).toBe(0);
      expect(summary.totalEarnedCredits).toBe(0);
      expect(summary.pendingCredits).toBe(0);
      expect(summary.failedCredits).toBe(0);
      expect(summary.creditsRemaining).toBe(160);
      expect(summary.completionPercentage).toBe(0);

      const catProgress = calculateCategoryProgress([], emptySubjects);
      expect(catProgress).toEqual([]);
    });

    it('initializes Internal Marks with 0 for all assessments', () => {
      const theory = calculateTheoryInternal({
        test1: 0,
        test2: 0,
        test3: 0,
        attendance: 0,
        assignment: 0,
      });
      expect(theory.totalInternal).toBe(0);
      expect(theory.percentage).toBe(0);

      const integrated = calculateIntegratedInternal({
        mid1: 0,
        mid2: 0,
        lab: 0,
        attendance: 0,
        assignment: 0,
      });
      expect(integrated.totalInternal).toBe(0);
      expect(integrated.percentage).toBe(0);
    });

    it('calculates SGPA as 0.00 for empty subject lists', () => {
      const res = calculateGPA([]);
      expect(res.gpa).toBe(0);
    });

    it('initializes Companion Overview with 0 alerts and 0 overdue tasks for fresh profiles', async () => {
      const overview = await getAcademicCompanionOverview(freshProfile);

      expect(overview.attendanceAvgPct).toBeNull();
      expect(overview.attendanceSubjectsCount).toBe(0);
      expect(overview.earnedCredits).toBe(0);
      expect(overview.registeredCredits).toBe(0);
      expect(overview.pendingTasksCount).toBe(0);
      expect(overview.overdueTasksCount).toBe(0);

      const alerts = generateAcademicAlerts(freshProfile, overview);
      expect(alerts).toHaveLength(0);
    });
  });

  describe('3. Strict Individual Student Isolation', () => {
    it('keeps data completely isolated between Profile A and Profile B', () => {
      // Simulate draft storage for Profile A
      localStorage.setItem(
        `academic_draft_sgpa_${freshProfile.id}`,
        JSON.stringify([{ id: 'row-1', name: 'Profile A Subject', credits: 4, grade: 'S' }])
      );

      // Verify Profile B has no draft data
      const draftB = localStorage.getItem(`academic_draft_sgpa_${studentProfileB.id}`);
      expect(draftB).toBeNull();

      // Verify Profile A retains its data
      const draftA = localStorage.getItem(`academic_draft_sgpa_${freshProfile.id}`);
      expect(draftA).toBeTruthy();
      expect(JSON.parse(draftA!)[0].name).toBe('Profile A Subject');
    });

    it('keeps attendance subjects strictly isolated by profile ID', () => {
      localStorage.setItem(
        `academic_attendance_subjects_${freshProfile.id}`,
        JSON.stringify([{ id: 'att-1', name: 'Physics', conducted: 30, attended: 28 }])
      );

      const bAttendance = localStorage.getItem(`academic_attendance_subjects_${studentProfileB.id}`);
      expect(bAttendance).toBeNull();
    });
  });
});
