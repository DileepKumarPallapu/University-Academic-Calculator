import { describe, it, expect } from 'vitest';
import {
  calculateTheoryInternal,
  calculateIntegratedInternal,
  convertTestMark,
  convertMidMark,
  calculateGPA,
  calculateCGPA,
  calculateTargetGPA,
  calculateAttendance,
  calculateRequiredAttendance,
  calculateProjectedAttendance,
  validateMarks,
  validateCredits,
  validateGPAInput,
  roundTo,
} from './calculations';

describe('University Calculation Engine Unit Tests', () => {
  describe('Theory Internal Calculation', () => {
    it('converts raw test marks accurately (max 30 -> 10)', () => {
      expect(convertTestMark(30)).toBe(10);
      expect(convertTestMark(24)).toBe(8);
      expect(convertTestMark(27)).toBe(9);
      expect(convertTestMark(21)).toBe(7);
      expect(convertTestMark(15)).toBe(5);
      expect(convertTestMark(0)).toBe(0);
    });

    it('calculates the prompt mandatory example correctly: 24, 27, 21, 5, 4 => 33/40 (82.5%)', () => {
      const result = calculateTheoryInternal({
        test1: 24,
        test2: 27,
        test3: 21,
        attendance: 5,
        assignment: 4,
      });

      expect(result.t1Converted).toBe(8);
      expect(result.t2Converted).toBe(9);
      expect(result.t3Converted).toBe(7);
      expect(result.attendance).toBe(5);
      expect(result.assignment).toBe(4);
      expect(result.totalInternal).toBe(33);
      expect(result.maxInternal).toBe(40);
      expect(result.percentage).toBe(82.5);
      expect(result.performanceTier).toBe('Excellent');
    });

    it('handles boundary conditions: 30, 30, 30, 5, 5 => 40/40 and 0,0,0,0,0 => 0/40', () => {
      const maxRes = calculateTheoryInternal({ test1: 30, test2: 30, test3: 30, attendance: 5, assignment: 5 });
      expect(maxRes.totalInternal).toBe(40);
      const minRes = calculateTheoryInternal({ test1: 0, test2: 0, test3: 0, attendance: 0, assignment: 0 });
      expect(minRes.totalInternal).toBe(0);
    });
  });

  describe('Integrated Internal Calculation', () => {
    it('converts raw mid marks accurately (max 20 -> 5)', () => {
      expect(convertMidMark(20)).toBe(5);
      expect(convertMidMark(16)).toBe(4);
      expect(convertMidMark(18)).toBe(4.5);
      expect(convertMidMark(10)).toBe(2.5);
      expect(convertMidMark(0)).toBe(0);
    });

    it('calculates mandatory example: Mid1=16, Mid2=18, Lab=18, Att=5, Assn=4 => 35.5/40', () => {
      const result = calculateIntegratedInternal({
        mid1: 16,
        mid2: 18,
        lab: 18,
        attendance: 5,
        assignment: 4,
      });

      expect(result.mid1Converted).toBe(4);
      expect(result.mid2Converted).toBe(4.5);
      expect(result.lab).toBe(18);
      expect(result.totalInternal).toBe(35.5);
      expect(result.maxInternal).toBe(40);
      expect(result.percentage).toBe(88.75);
    });
  });

  describe('Target GPA Calculation', () => {
    it('calculates the exact example from prompt: Current=8.2, Completed=80, Target=8.5, Upcoming=24', () => {
      // Total = 80 + 24 = 104 credits
      // Target points = 8.5 * 104 = 884
      // Current points = 8.2 * 80 = 656
      // Needed points = 884 - 656 = 228
      // Required GPA = 228 / 24 = 9.50
      const res = calculateTargetGPA(8.2, 80, 8.5, 24);
      expect(res.requiredGpa).toBe(9.5);
      expect(res.isPossible).toBe(true);
    });

    it('detects impossible targets: Current=6.0, Completed=80, Target=9.5, Upcoming=20', () => {
      const res = calculateTargetGPA(6.0, 80, 9.5, 20);
      expect(res.isPossible).toBe(false);
      expect(res.requiredGpa).toBeGreaterThan(10);
      expect(res.explanation).toContain('not reachable');
    });
  });

  describe('Attendance Calculations (Phase 5)', () => {
    it('calculates attendance percentage using faculty sessions: 40 total, 38 faculty, 34 attended => 89.47%, absent 4', () => {
      const res = calculateAttendance({
        totalSessions: 40,
        facultySessions: 38,
        attended: 34,
      });
      expect(res.percentage).toBe(89.47);
      expect(res.absent).toBe(4);
      expect(res.totalSessions).toBe(40);
      expect(res.facultySessions).toBe(38);
      expect(res.attended).toBe(34);
    });

    it('handles edge cases: 100%, 0%, perfect faculty sessions', () => {
      expect(calculateAttendance({ totalSessions: 40, facultySessions: 40, attended: 40 }).percentage).toBe(100);
      expect(calculateAttendance({ totalSessions: 40, facultySessions: 38, attended: 0 }).percentage).toBe(0);
      expect(calculateAttendance({ totalSessions: 40, facultySessions: 38, attended: 38 }).percentage).toBe(100);
    });

    it('calculates required future sessions for target attendance (e.g. 28/40 = 70% to 75% target => 8 sessions)', () => {
      const targetRes = calculateRequiredAttendance({
        currentAttended: 28,
        currentFacultySessions: 40,
        targetPercentage: 75,
      });
      expect(targetRes.requiredSessions).toBe(8);
      expect(targetRes.projectedPercentage).toBe(75);
    });

    it('calculates projected attendance with future absences (e.g. 34/38, 5 future, 2 absences => 37/43 = 86.05%)', () => {
      const proj = calculateProjectedAttendance({
        attended: 34,
        facultySessions: 38,
        futureSessions: 5,
        futureAbsences: 2,
      });
      expect(proj.futureAttended).toBe(37);
      expect(proj.futureTotal).toBe(43);
      expect(proj.projectedPercentage).toBe(86.05);
    });
  });

  describe('Validation & Precision', () => {
    it('validates credits and marks correctly', () => {
      expect(validateCredits(4).isValid).toBe(true);
      expect(validateCredits(0).isValid).toBe(false);
      expect(validateGPAInput(8.5).isValid).toBe(true);
      expect(validateGPAInput(11).isValid).toBe(false);
      expect(validateMarks(35, 30, 'Test 1').isValid).toBe(false);
    });

    it('rounds numbers accurately without floating point drift', () => {
      expect(roundTo(8.5444, 2)).toBe(8.54);
      expect(roundTo(8.546, 2)).toBe(8.55);
    });
  });

  describe('GPA & CGPA Calculations', () => {
    it('calculates weighted GPA correctly', () => {
      const gpaRes = calculateGPA([
        { id: '1', name: 'Subject 1', credits: 4, grade: 'S', gradePoint: 10 },
        { id: '2', name: 'Subject 2', credits: 4, grade: 'A', gradePoint: 8 },
      ]);
      expect(gpaRes.totalCredits).toBe(8);
      expect(gpaRes.gpa).toBe(9.0);
    });

    it('calculates credit-weighted CGPA correctly', () => {
      const cgpaRes = calculateCGPA([
        { id: '1', semesterNumber: 1, gpa: 8.0, credits: 20 },
        { id: '2', semesterNumber: 2, gpa: 9.0, credits: 20 },
      ]);
      expect(cgpaRes.totalCredits).toBe(40);
      expect(cgpaRes.cgpa).toBe(8.5);
    });
  });
});
