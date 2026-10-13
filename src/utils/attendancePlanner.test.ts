import { describe, it, expect } from 'vitest';
import {
  calculateCurrentAttendance,
  calculateBunkMargin,
  calculateRecoveryRequired,
  simulateFutureAttendance,
  validateAttendanceInputs,
  evaluateAttendanceStatus,
} from './attendancePlanner';

describe('Smart Attendance Planner Engine Unit Tests', () => {
  // Case 1: 45 attended out of 50 conducted = 90%
  it('Case 1: 45 attended out of 50 conducted yields 90.00%', () => {
    const result = calculateCurrentAttendance(50, 45, 75);
    expect(result.percentage).toBe(90);
    expect(result.missed).toBe(5);
    expect(result.differenceFromTarget).toBe(15);
    expect(result.status).toBe('On Track');
  });

  // Case 2: 35 attended out of 50 conducted = 70%
  it('Case 2: 35 attended out of 50 conducted yields 70.00%', () => {
    const result = calculateCurrentAttendance(50, 35, 75);
    expect(result.percentage).toBe(70);
    expect(result.missed).toBe(15);
    expect(result.differenceFromTarget).toBe(-5);
    expect(result.status).toBe('Needs Attention');
  });

  // Case 3: 0 classes conducted = no percentage calculation
  it('Case 3: 0 classes conducted yields null percentage and Insufficient Data status', () => {
    const result = calculateCurrentAttendance(0, 0, 75);
    expect(result.percentage).toBeNull();
    expect(result.differenceFromTarget).toBeNull();
    expect(result.status).toBe('Insufficient Data');
  });

  // Case 4: Attended classes greater than conducted classes = validation error
  it('Case 4: rejects attended classes exceeding conducted classes with error', () => {
    const validation = validateAttendanceInputs(40, 45, 75);
    expect(validation.isValid).toBe(false);
    expect(validation.error).toBe('Attended classes cannot exceed conducted classes.');

    const negValidation = validateAttendanceInputs(-5, 10, 75);
    expect(negValidation.isValid).toBe(false);
    expect(negValidation.error).toBe('Session counts cannot be negative.');
  });

  // Case 5: A student below target can calculate required future classes
  it('Case 5: calculates required consecutive classes to recover to target', () => {
    // 35/50 = 70%, target = 75%
    // (35 + x)/(50 + x) >= 0.75
    // 35 + x >= 37.5 + 0.75x => 0.25x >= 2.5 => x >= 10
    const recovery = calculateRecoveryRequired(50, 35, 75);
    expect(recovery.requiredSessions).toBe(10);
    expect(recovery.projectedPercentage).toBe(75);
    expect(recovery.isAchievable).toBe(true);
    expect(recovery.explanation).toContain('Attend the next 10 consecutive classes');
  });

  // Case 6: A student at target can calculate safe future absences (or 0 bunk margin)
  it('Case 6: student exactly at target calculates safe future absences (margin = 0, warning on next)', () => {
    // 30/40 = 75%, target = 75%
    // maxBunk = floor((100*30)/75 - 40) = floor(40 - 40) = 0
    const bunk = calculateBunkMargin(40, 30, 75);
    expect(bunk.maxBunk).toBe(0);
    expect(bunk.canSkipAtLeastOne).toBe(false);
    expect(bunk.pctAfterBunk).toBe(75);
    // After 1 absence: 30 / 41 = 73.17%
    expect(bunk.pctAfterNextBunk).toBe(73.17);
    expect(bunk.warningMessage).toContain('Skipping even 1 class will drop your attendance below');
  });

  // Case 7: A student above target can simulate future absences
  it('Case 7: student above target can calculate safe absences and simulate future classes', () => {
    // 45/50 = 90%, target = 75%
    // maxBunk = floor((100*45)/75 - 50) = floor(60 - 50) = 10
    const bunk = calculateBunkMargin(50, 45, 75);
    expect(bunk.maxBunk).toBe(10);
    expect(bunk.canSkipAtLeastOne).toBe(true);
    expect(bunk.pctAfterBunk).toBe(75); // 45 / 60 = 75%
    expect(bunk.pctAfterNextBunk).toBe(73.77); // 45 / 61 = 73.77%

    // Future simulation: plan 10 future classes, attend 6, miss 4
    // Projected = (45 + 6) / (50 + 10) = 51 / 60 = 85%
    const sim = simulateFutureAttendance(50, 45, 10, 6, 4, 75);
    expect(sim.isValid).toBe(true);
    expect(sim.projectedAttended).toBe(51);
    expect(sim.projectedConducted).toBe(60);
    expect(sim.projectedPercentage).toBe(85);
    expect(sim.deltaPercentage).toBe(-5);
    expect(sim.targetMet).toBe(true);
  });

  it('handles target 100% edge cases gracefully', () => {
    // Already missed: 40/50, target=100% -> impossible
    const recoveryImpossible = calculateRecoveryRequired(50, 40, 100);
    expect(recoveryImpossible.requiredSessions).toBe(Infinity);
    expect(recoveryImpossible.isAchievable).toBe(false);
    expect(recoveryImpossible.explanation).toContain('100% attendance target cannot be reached');

    // Perfect: 50/50, target=100% -> 0 required
    const recoveryPerfect = calculateRecoveryRequired(50, 50, 100);
    expect(recoveryPerfect.requiredSessions).toBe(0);
    expect(recoveryPerfect.isAchievable).toBe(true);
  });

  it('evaluates status correctly across all tiers', () => {
    expect(evaluateAttendanceStatus(null, 75, 0, true)).toBe('Insufficient Data');
    expect(evaluateAttendanceStatus(80, 75, 0, true)).toBe('On Track');
    expect(evaluateAttendanceStatus(70, 75, 5, true)).toBe('Needs Attention');
    expect(evaluateAttendanceStatus(40, 95, 300, false)).toBe('At Risk');
  });
});
