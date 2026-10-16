import { describe, it, expect } from 'vitest';
import {
  calculateTheoryInternal,
  calculateIntegratedInternal,
  calculateGPA,
  calculateCGPA,
  calculateAttendance,
  convertTestMark,
  convertMidMark,
  validateCredits,
} from './calculations';
import {
  calculateCurrentAttendance,
  validateAttendanceInputs,
} from './attendancePlanner';

describe('Master Upgrade: Calculation Accuracy, Edge Cases & PDF Standards', () => {
  describe('1. Internal Assessment Accuracy (Theory & Integrated / 40)', () => {
    it('accurately computes Theory Internals using exact 3-test conversion formula', () => {
      // Formula: (T1/30*10) + (T2/30*10) + (T3/30*10) + Att + Assign
      // T1=24 (8.00), T2=27 (9.00), T3=30 (10.00), Att=5, Assign=5 => 37.00 / 40
      const res = calculateTheoryInternal({
        test1: 24,
        test2: 27,
        test3: 30,
        attendance: 5,
        assignment: 5,
      });

      expect(res.t1Converted).toBe(8);
      expect(res.t2Converted).toBe(9);
      expect(res.t3Converted).toBe(10);
      expect(res.totalInternal).toBe(37);
      expect(res.maxInternal).toBe(40);
      expect(res.percentage).toBe(92.5);
    });

    it('accurately computes Integrated Internals using exact 2-mid conversion formula', () => {
      // Formula: (Mid1/20*5) + (Mid2/20*5) + Lab + Att + Assign
      // Mid1=16 (4.00), Mid2=18 (4.50), Lab=19, Att=4, Assign=4.5 => 36.00 / 40
      const res = calculateIntegratedInternal({
        mid1: 16,
        mid2: 18,
        lab: 19,
        attendance: 4,
        assignment: 4.5,
      });

      expect(res.mid1Converted).toBe(4);
      expect(res.mid2Converted).toBe(4.5);
      expect(res.lab).toBe(19);
      expect(res.attendance).toBe(4);
      expect(res.assignment).toBe(4.5);
      expect(res.totalInternal).toBe(36);
      expect(res.maxInternal).toBe(40);
      expect(res.percentage).toBe(90);
    });

    it('safely clamps out-of-range inputs to university regulatory maximums', () => {
      expect(convertTestMark(35)).toBe(10);
      expect(convertTestMark(-5)).toBe(0);
      expect(convertMidMark(25)).toBe(5);
      expect(convertMidMark(-2)).toBe(0);

      // Overflown inputs clamped
      const overflownTheory = calculateTheoryInternal({
        test1: 45, // clamped to 30 => 10
        test2: 50, // clamped to 30 => 10
        test3: 35, // clamped to 30 => 10
        attendance: 10, // clamped to 5
        assignment: 15, // clamped to 5
      });
      expect(overflownTheory.totalInternal).toBe(40);
    });

    it('handles zero defaults for fresh student profiles without errors', () => {
      const zeroTheory = calculateTheoryInternal({
        test1: 0,
        test2: 0,
        test3: 0,
        attendance: 0,
        assignment: 0,
      });
      expect(zeroTheory.totalInternal).toBe(0);
      expect(zeroTheory.percentage).toBe(0);

      const zeroIntegrated = calculateIntegratedInternal({
        mid1: 0,
        mid2: 0,
        lab: 0,
        attendance: 0,
        assignment: 0,
      });
      expect(zeroIntegrated.totalInternal).toBe(0);
      expect(zeroIntegrated.percentage).toBe(0);
    });
  });

  describe('2. SGPA & Credit-Weighted CGPA Accuracy', () => {
    it('calculates SGPA correctly ignoring 0-credit audit courses from credit denominator', () => {
      const result = calculateGPA([
        { id: '1', name: 'Data Structures', credits: 4, grade: 'S', gradePoint: 10 },
        { id: '2', name: 'Operating Systems', credits: 3, grade: 'A', gradePoint: 9 },
        { id: '3', name: 'Yoga / NSS Audit', credits: 0, grade: 'S', gradePoint: 10 },
      ]);

      expect(result.totalCredits).toBe(7);
      expect(result.totalPoints).toBe(67); // (4*10 + 3*9) = 67
      expect(result.gpa).toBe(9.57); // 67 / 7 = 9.5714 => 9.57
      expect(result.subjectsCount).toBe(3);
      expect(result.creditBearingCount).toBe(2);
    });

    it('proves CGPA is strictly credit-weighted and NOT a simple arithmetic average', () => {
      // Semester 1: 8.0 GPA with 20 credits (Quality points = 160)
      // Semester 2: 9.0 GPA with 25 credits (Quality points = 225)
      // Total quality points = 385, Total credits = 45
      // Weighted CGPA = 385 / 45 = 8.5555... => 8.56
      // Simple average would have been (8.0 + 9.0) / 2 = 8.50 (WRONG)
      const cgpa = calculateCGPA([
        { id: 's1', semesterNumber: 1, gpa: 8.0, credits: 20 },
        { id: 's2', semesterNumber: 2, gpa: 9.0, credits: 25 },
      ]);

      expect(cgpa.totalCredits).toBe(45);
      expect(cgpa.cgpa).toBe(8.56);
      expect(cgpa.cgpa).not.toBe(8.5); // Verifies it is NOT simple average
    });

    it('safely handles zero-credit semesters and empty states without NaN', () => {
      const empty = calculateCGPA([]);
      expect(empty.cgpa).toBe(0);
      expect(empty.totalCredits).toBe(0);

      const withZeroCredits = calculateCGPA([
        { id: 's1', semesterNumber: 1, gpa: 9.2, credits: 22 },
        { id: 's2', semesterNumber: 2, gpa: 0, credits: 0 },
      ]);
      expect(withZeroCredits.cgpa).toBe(9.2);
      expect(withZeroCredits.totalCredits).toBe(22);
    });

    it('validates semester credits bounds correctly', () => {
      expect(validateCredits(-1).isValid).toBe(false);
      expect(validateCredits(4).isValid).toBe(true);
      expect(validateCredits(15).isValid).toBe(false); // exceeds 12
    });
  });

  describe('3. Attendance Accuracy and "Not calculated" Zero State', () => {
    it('returns "Not calculated" (null percentage) when total sessions conducted is 0', () => {
      const zeroPlan = calculateCurrentAttendance(0, 0, 75);
      expect(zeroPlan.percentage).toBeNull();
      expect(zeroPlan.statusDetails.label).toBe('Not calculated');
      expect(zeroPlan.status).toBe('Insufficient Data');
    });

    it('correctly calculates percentage and caps at 100% when attendance is valid', () => {
      const normalPlan = calculateCurrentAttendance(40, 34, 75);
      expect(normalPlan.percentage).toBe(85);
      expect(normalPlan.missed).toBe(6);
      expect(normalPlan.statusDetails.label).toBe('On Track');
    });

    it('prevents attended classes from exceeding conducted classes in validation', () => {
      const invalid = validateAttendanceInputs(30, 35, 75);
      expect(invalid.isValid).toBe(false);
      expect(invalid.error).toContain('Attended classes cannot exceed conducted classes');

      const valid = validateAttendanceInputs(30, 28, 75);
      expect(valid.isValid).toBe(true);
    });

    it('ensures calculations.ts calculateAttendance handles zero conducted sessions safely', () => {
      const res = calculateAttendance(0, 0);
      expect(res.currentPercentage).toBe(0);
      expect(res.conducted).toBe(0);
      expect(res.attended).toBe(0);
    });
  });

  describe('4. PDF Branding and Developer Attribution Standards', () => {
    it('verifies standardized developer attribution string format', () => {
      const developerName = 'Pallapu Dileep Kumar';
      const developerRole = 'CSE Student • Developer';
      const copyright = '© 2026 Pallapu Dileep Kumar. All rights reserved.';
      const brandTitle = 'Academic Calculator';

      const fullFooter = `${brandTitle} | Developed by ${developerName}\n${developerRole}\n${copyright}`;
      expect(fullFooter).toContain('Academic Calculator | Developed by Pallapu Dileep Kumar');
      expect(fullFooter).toContain('CSE Student • Developer');
      expect(fullFooter).toContain('© 2026 Pallapu Dileep Kumar. All rights reserved.');
    });
  });
});
