import { describe, it, expect, beforeEach } from 'vitest';
import {
  getGradePointForRegulation,
  validateWhatIfSubject,
  calculateWhatIfScenario,
  getWhatIfScenariosForProfile,
  saveWhatIfScenarioForProfile,
  deleteWhatIfScenarioForProfile,
  getAcademicIntelligenceMetrics,
  type WhatIfSubject,
} from './academicIntelligence';
import { calculateAttendanceGoalPlan } from './attendancePlanner';
import { AMS_FEATURE_ENABLED } from '../config/features';
import type { StudentProfile, SavedCalculation } from '../types/profile';

const storageMap = new Map<string, string>();
const localStorageMock = {
  getItem: (key: string) => storageMap.get(key) ?? null,
  setItem: (key: string, value: string) => storageMap.set(key, String(value)),
  removeItem: (key: string) => storageMap.delete(key),
  clear: () => storageMap.clear(),
};

if (typeof globalThis.localStorage === 'undefined') {
  (globalThis as any).localStorage = localStorageMock;
}

describe('Academic Intelligence & What-If Simulator Acceptance Tests', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // ==========================================
  // 1. EMPTY PROFILE & ZERO DEFAULTS
  // ==========================================
  describe('1. Empty Profile & Zero Defaults', () => {
    it('initializes a fresh profile with zero totals and "Not calculated" display states', () => {
      const freshProfile: StudentProfile = {
        id: 'fresh-student-1',
        name: 'New Student',
        regulation: 'VTR21',
        degreePathway: 'standard',
        targetAttendance: 75,
        customGraduationCredits: 160,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const metrics = getAcademicIntelligenceMetrics(freshProfile, []);

      // Verify zero totals and uncalculated metrics
      expect(metrics.hasAnyData).toBe(false);
      expect(metrics.currentSgpa).toBeNull();
      expect(metrics.sgpaDisplay).toBe('Not calculated');
      expect(metrics.currentCgpa).toBeNull();
      expect(metrics.cgpaDisplay).toBe('Not calculated');
      expect(metrics.overallAttendancePercentage).toBeNull();
      expect(metrics.attendanceDisplay).toBe('Not calculated');
      expect(metrics.registeredCredits).toBe(0);
      expect(metrics.earnedCredits).toBe(0);
      expect(metrics.pendingCredits).toBe(160);
      expect(metrics.semesterPerformance).toHaveLength(0);
      expect(metrics.recentActivity).toHaveLength(0);
    });

    it('does not fabricate student records, grades, or attendance', () => {
      const freshProfile: StudentProfile = {
        id: 'fresh-student-2',
        name: 'Empty Profile',
        regulation: 'VTR25',
        degreePathway: 'standard',
        targetAttendance: 75,
        customGraduationCredits: 160,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const metrics = getAcademicIntelligenceMetrics(freshProfile, []);
      expect(metrics.subjectWiseAttendance).toHaveLength(0);
      expect(metrics.semesterPerformance).toHaveLength(0);
    });
  });

  // ==========================================
  // 2. WHAT-IF GPA SIMULATOR & REGULATION GRADES
  // ==========================================
  describe('2. What-If GPA Simulator Engine', () => {
    it('maps verified regulation grade points correctly for VTR21, VTR25, VTR18, and VTR15', () => {
      // VTR21: S=10, A=9, B=8, C=7, D=6, RA=0
      expect(getGradePointForRegulation('S', 'VTR21').points).toBe(10);
      expect(getGradePointForRegulation('A', 'VTR21').points).toBe(9);
      expect(getGradePointForRegulation('D', 'VTR21').points).toBe(6);
      expect(getGradePointForRegulation('RA', 'VTR21').points).toBe(0);

      // VTR25: O=10, A+=9, A=8, B+=7, B=6, C=5, RA=0
      expect(getGradePointForRegulation('O', 'VTR25').points).toBe(10);
      expect(getGradePointForRegulation('A+', 'VTR25').points).toBe(9);
      expect(getGradePointForRegulation('C', 'VTR25').points).toBe(5);

      // VTR18: E=5 is pass minimum
      expect(getGradePointForRegulation('E', 'VTR18').points).toBe(5);

      // Unsupported grades should be marked invalid
      expect(getGradePointForRegulation('Z', 'VTR21').isValid).toBe(false);
      expect(getGradePointForRegulation('A++', 'VTR21').isValid).toBe(false);
    });

    it('validates What-If subject inputs rigorously', () => {
      // Empty title
      expect(validateWhatIfSubject({ name: '', credits: 4, grade: 'S' }, 'VTR21').isValid).toBe(false);
      // Zero or negative credits
      expect(validateWhatIfSubject({ name: 'Physics', credits: 0, grade: 'S' }, 'VTR21').isValid).toBe(false);
      expect(validateWhatIfSubject({ name: 'Physics', credits: -2, grade: 'S' }, 'VTR21').isValid).toBe(false);
      // Credits exceeding maximum allowed (12)
      expect(validateWhatIfSubject({ name: 'Physics', credits: 16, grade: 'S' }, 'VTR21').isValid).toBe(false);
      // Valid subject
      expect(validateWhatIfSubject({ name: 'Algorithms', credits: 4, grade: 'S' }, 'VTR21').isValid).toBe(true);
    });

    it('calculates projected SGPA using weighted credits formula', () => {
      const subjects: WhatIfSubject[] = [
        { id: '1', name: 'Course 1', credits: 4, grade: 'S' }, // 4 * 10 = 40
        { id: '2', name: 'Course 2', credits: 4, grade: 'A' }, // 4 * 9 = 36
        { id: '3', name: 'Course 3', credits: 3, grade: 'B' }, // 3 * 8 = 24
        { id: '4', name: 'Course 4', credits: 1, grade: 'S' }, // 1 * 10 = 10
      ];
      // Total credits: 12, Total weighted points: 110 => 110 / 12 = 9.17
      const scenario = calculateWhatIfScenario('Target Term', 'VTR21', 4, subjects);
      expect(scenario.totalCredits).toBe(12);
      expect(scenario.projectedSgpa).toBe(9.17);
      expect(scenario.isSimulation).toBe(true);
    });

    it('estimates future CGPA combining prior credits with the hypothetical semester', () => {
      // Student has completed 40 credits with 8.50 CGPA (340 points)
      const prior = {
        priorCredits: 40,
        priorWeightedPoints: 340,
        priorCgpa: 8.5,
        semestersCount: 2,
      };

      // Hypothetical semester: 20 credits at 9.00 SGPA (180 points)
      const subjects: WhatIfSubject[] = [
        { id: '1', name: 'Sub 1', credits: 10, grade: 'A' }, // 10 * 9 = 90
        { id: '2', name: 'Sub 2', credits: 10, grade: 'A' }, // 10 * 9 = 90
      ];

      // Combined: (340 + 180) / (40 + 20) = 520 / 60 = 8.67
      const scenario = calculateWhatIfScenario('Semester 3 Projection', 'VTR21', 3, subjects, prior);
      expect(scenario.projectedSgpa).toBe(9.0);
      expect(scenario.projectedCgpa).toBe(8.67);
      expect(scenario.deltaCgpa).toBe(0.17); // 8.67 - 8.50
    });

    it('manages multiple saved scenarios isolated per profile and never alters real database records', () => {
      const profileId = 'student-sim-1';
      const scenarioA = calculateWhatIfScenario('Best Case', 'VTR21', 5, [
        { id: '1', name: 'A1', credits: 4, grade: 'S' },
      ], undefined, profileId);

      const scenarioB = calculateWhatIfScenario('Worst Case', 'VTR21', 5, [
        { id: '2', name: 'B1', credits: 4, grade: 'C' },
      ], undefined, profileId);

      saveWhatIfScenarioForProfile(profileId, scenarioA);
      saveWhatIfScenarioForProfile(profileId, scenarioB);

      const loaded = getWhatIfScenariosForProfile(profileId);
      expect(loaded).toHaveLength(2);
      expect(loaded[0].title).toBe('Worst Case');
      expect(loaded[1].title).toBe('Best Case');

      deleteWhatIfScenarioForProfile(profileId, scenarioA.id);
      const afterDelete = getWhatIfScenariosForProfile(profileId);
      expect(afterDelete).toHaveLength(1);
      expect(afterDelete[0].title).toBe('Worst Case');

      // Check profile isolation
      expect(getWhatIfScenariosForProfile('another-student')).toHaveLength(0);
    });
  });

  // ==========================================
  // 3. ATTENDANCE GOAL PLANNER (SHARED SERVICE)
  // ==========================================
  describe('3. Attendance Goal Planner (Shared Service)', () => {
    it('calculates required consecutive classes to reach target percentage', () => {
      // Conducted = 50, Attended = 35 (70%), Target = 75%
      // (35 + x) / (50 + x) >= 0.75 => x >= 10
      const plan = calculateAttendanceGoalPlan(50, 35, 75);
      expect(plan.currentPercentage).toBe(70);
      expect(plan.additionalClassesNeeded).toBe(10);
      expect(plan.isTargetAchievable).toBe(true);
      expect(plan.status).toBe('Needs Attention');
    });

    it('identifies when attendance already meets the desired percentage', () => {
      // Conducted = 50, Attended = 45 (90%), Target = 75%
      const plan = calculateAttendanceGoalPlan(50, 45, 75);
      expect(plan.currentPercentage).toBe(90);
      expect(plan.additionalClassesNeeded).toBe(0);
      expect(plan.status).toBe('On Track');
    });

    it('simulates planned future classes scenario', () => {
      // Conducted = 50, Attended = 35 (70%), Target = 75%, Future classes = 15
      // Total will be 65. If attends all 15: (35 + 15) / 65 = 50 / 65 = 76.92%
      // Classes needed out of 15: (35 + k) / 65 >= 0.75 => 35 + k >= 48.75 => k = 14
      const plan = calculateAttendanceGoalPlan(50, 35, 75, 15);
      expect(plan.plannedFutureClasses).toBe(15);
      expect(plan.projectedPercentageIfAllPlannedAttended).toBe(76.92);
      expect(plan.canReachTargetWithPlannedClasses).toBe(true);
      expect(plan.classesNeededOutOfPlanned).toBe(14);
    });

    it('caps displayed attendance strictly at 100%', () => {
      const plan = calculateAttendanceGoalPlan(40, 40, 75, 10);
      expect(plan.currentPercentage).toBe(100);
      expect(plan.projectedPercentageIfAllPlannedAttended).toBe(100);
    });

    it('handles extra class policy rules correctly', () => {
      // 45 attended out of 40 conducted (e.g. 5 extra sessions)
      // Standard policy excludes extra classes: capped at 40
      const standardPlan = calculateAttendanceGoalPlan(40, 45, 75, 0, { allowExtraClasses: false });
      expect(standardPlan.countablePresentSessions).toBe(40);
      expect(standardPlan.currentPercentage).toBe(100);
      expect(standardPlan.policyNote).toContain('Extra sessions beyond official total are excluded');

      // Permitted policy
      const permittedPlan = calculateAttendanceGoalPlan(40, 45, 75, 0, { allowExtraClasses: true });
      expect(permittedPlan.policyNote).toContain('Extra sessions are permitted');
    });

    it('labels results as estimate when policy is unconfirmed', () => {
      const plan = calculateAttendanceGoalPlan(50, 40, 75, 10, { isPolicyConfirmed: false });
      expect(plan.isEstimate).toBe(true);
    });

    it('handles target 100% when absences already occurred', () => {
      const plan = calculateAttendanceGoalPlan(50, 45, 100);
      expect(plan.additionalClassesNeeded).toBe(Infinity);
      expect(plan.isTargetAchievable).toBe(false);
    });
  });

  // ==========================================
  // 4. ACADEMIC REPORT GENERATION & DATA INTEGRITY
  // ==========================================
  describe('4. Academic Intelligence & Report Generator Data Integrity', () => {
    it('aggregates saved calculations and credit courses into verified metrics', () => {
      const profile: StudentProfile = {
        id: 'student-report-test',
        name: 'Jane Doe',
        rollNumber: '21102001',
        regulation: 'VTR21',
        degreePathway: 'standard',
        targetAttendance: 75,
        customGraduationCredits: 160,
        currentSemester: 3,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const savedCalcs: SavedCalculation[] = [
        {
          id: 'calc-1',
          profileId: profile.id,
          type: 'sgpa',
          title: 'Semester 1 SGPA',
          resultValue: '8.80',
          resultSummary: '20 Credits',
          inputs: { totalCredits: 20 },
          semester: 1,
          isFavorite: false,
          createdAt: Date.now() - 100000,
          updatedAt: Date.now() - 100000,
        },
        {
          id: 'calc-2',
          profileId: profile.id,
          type: 'sgpa',
          title: 'Semester 2 SGPA',
          resultValue: '9.20',
          resultSummary: '20 Credits',
          inputs: { totalCredits: 20 },
          semester: 2,
          isFavorite: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ];

      const metrics = getAcademicIntelligenceMetrics(profile, savedCalcs);
      expect(metrics.hasAnyData).toBe(true);
      expect(metrics.semesterPerformance).toHaveLength(2);
      expect(metrics.semesterPerformance[0].sgpa).toBe(8.8);
      expect(metrics.semesterPerformance[1].sgpa).toBe(9.2);

      // Prior CGPA: (8.8 * 20 + 9.2 * 20) / 40 = 18.0 * 20 / 40 = 9.00
      expect(metrics.currentCgpa).toBe(9.0);
    });

    it('strictly isolates data between different student profiles', () => {
      const profileA: StudentProfile = {
        id: 'profile-a',
        name: 'Student A',
        regulation: 'VTR21',
        degreePathway: 'standard',
        targetAttendance: 75,
        customGraduationCredits: 160,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const profileB: StudentProfile = {
        id: 'profile-b',
        name: 'Student B',
        regulation: 'VTR25',
        degreePathway: 'standard',
        targetAttendance: 75,
        customGraduationCredits: 160,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      // Set attendance for Profile A only
      localStorage.setItem(
        'academic_attendance_subjects_profile-a',
        JSON.stringify([{ id: '1', name: 'Mathematics', conducted: 40, attended: 36 }])
      );

      const metricsA = getAcademicIntelligenceMetrics(profileA, []);
      const metricsB = getAcademicIntelligenceMetrics(profileB, []);

      expect(metricsA.overallAttendancePercentage).toBe(90);
      expect(metricsB.overallAttendancePercentage).toBeNull();
      expect(metricsB.attendanceDisplay).toBe('Not calculated');
    });
  });

  // ==========================================
  // 5. DISABLED AMS FEATURE STATUS
  // ==========================================
  describe('5. Feature Flag Protection', () => {
    it('AMS feature remains disabled during development', () => {
      expect(AMS_FEATURE_ENABLED).toBe(false);
    });
  });
});
