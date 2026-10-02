import { UNIVERSITY_CONFIG } from '../config/university';
import type {
  TheoryInputs,
  TheoryResult,
  IntegratedInputs,
  IntegratedResult,
  SubjectItem,
  GPAResult,
  SemesterItem,
  CGPAResult,
  TargetGPAResult,
  AttendancePlannerResult,
  AttendanceResult,
} from '../types';

/**
 * Rounds a number to a fixed number of decimal places without floating-point artifacts.
 */
export function roundTo(num: number, decimals: number = 2): number {
  const factor = Math.pow(10, decimals);
  return Math.round((num + Number.EPSILON) * factor) / factor;
}

export function formatScore(num: number, decimals: number = 2): string {
  if (Number.isInteger(num)) {
    return num.toString();
  }
  const rounded = roundTo(num, decimals);
  return rounded % 1 === 0 ? rounded.toString() : rounded.toFixed(decimals).replace(/\.?0+$/, (match) => {
    return match === '.00' ? '' : match;
  });
}

export function formatFixed(num: number, decimals: number = 2): string {
  return roundTo(num, decimals).toFixed(decimals);
}

/**
 * Converts Theory Test raw marks (out of 30) to converted marks (out of 10).
 */
export function convertTestMark(rawMarks: number): number {
  if (rawMarks <= 0) return 0;
  if (rawMarks > 30) return 10;
  return roundTo((rawMarks / 30) * 10, 2);
}

/**
 * Converts Integrated Mid raw marks (out of 20) to converted marks (out of 5).
 */
export function convertMidMark(rawMarks: number): number {
  if (rawMarks <= 0) return 0;
  if (rawMarks > 20) return 5;
  return roundTo((rawMarks / 20) * 5, 2);
}

/**
 * Centralized Validation Architecture
 */
export function validateMarks(
  value: number | '',
  max: number,
  fieldName: string = 'Field'
): { isValid: boolean; error?: string } {
  if (value === '' || value === undefined || value === null) {
    return { isValid: true };
  }
  if (typeof value !== 'number' || isNaN(value)) {
    return { isValid: false, error: `${fieldName} must be a valid number.` };
  }
  if (value < 0) {
    return { isValid: false, error: `${fieldName} cannot be negative.` };
  }
  if (value > max) {
    return { isValid: false, error: `Maximum allowed for ${fieldName} is ${max}.` };
  }
  return { isValid: true };
}

export function validateCredits(credits: number | ''): { isValid: boolean; error?: string } {
  if (credits === '' || credits === undefined || isNaN(Number(credits))) {
    return { isValid: false, error: 'Credits are required.' };
  }
  const val = Number(credits);
  if (val <= 0 || val > 12) {
    return { isValid: false, error: 'Credits must be between 1 and 12.' };
  }
  return { isValid: true };
}

export function validateGPAInput(gpa: number | ''): { isValid: boolean; error?: string } {
  if (gpa === '' || gpa === undefined || isNaN(Number(gpa))) {
    return { isValid: false, error: 'GPA is required.' };
  }
  const val = Number(gpa);
  if (val < 0 || val > 10) {
    return { isValid: false, error: 'GPA must be between 0.00 and 10.00.' };
  }
  return { isValid: true };
}

export function validateSubject(name: string): { isValid: boolean; error?: string } {
  if (!name || name.trim().length === 0) {
    return { isValid: false, error: 'Subject title cannot be empty.' };
  }
  return { isValid: true };
}

/**
 * Calculates Theory Internal Marks.
 */
export function calculateTheoryInternal(inputs: TheoryInputs): TheoryResult {
  const t1Raw = typeof inputs.test1 === 'number' ? Math.max(0, Math.min(30, inputs.test1)) : 0;
  const t2Raw = typeof inputs.test2 === 'number' ? Math.max(0, Math.min(30, inputs.test2)) : 0;
  const t3Raw = typeof inputs.test3 === 'number' ? Math.max(0, Math.min(30, inputs.test3)) : 0;
  const attendance = typeof inputs.attendance === 'number' ? Math.max(0, Math.min(5, inputs.attendance)) : 0;
  const assignment = typeof inputs.assignment === 'number' ? Math.max(0, Math.min(5, inputs.assignment)) : 0;

  const t1Converted = convertTestMark(t1Raw);
  const t2Converted = convertTestMark(t2Raw);
  const t3Converted = convertTestMark(t3Raw);

  const totalInternal = roundTo(t1Converted + t2Converted + t3Converted + attendance + assignment, 2);
  const maxInternal = UNIVERSITY_CONFIG.theoryInternal.totalMax; // 40
  const percentage = roundTo((totalInternal / maxInternal) * 100, 2);
  const performanceTier = UNIVERSITY_CONFIG.getPerformanceTier(percentage).label;

  const isComplete =
    inputs.test1 !== '' &&
    inputs.test2 !== '' &&
    inputs.test3 !== '' &&
    inputs.attendance !== '' &&
    inputs.assignment !== '';

  return {
    t1Converted,
    t2Converted,
    t3Converted,
    attendance,
    assignment,
    totalInternal,
    maxInternal,
    percentage,
    performanceTier,
    isComplete,
  };
}

/**
 * Calculates Integrated Internal Marks.
 */
export function calculateIntegratedInternal(inputs: IntegratedInputs): IntegratedResult {
  const mid1Raw = typeof inputs.mid1 === 'number' ? Math.max(0, Math.min(20, inputs.mid1)) : 0;
  const mid2Raw = typeof inputs.mid2 === 'number' ? Math.max(0, Math.min(20, inputs.mid2)) : 0;
  const lab = typeof inputs.lab === 'number' ? Math.max(0, Math.min(20, inputs.lab)) : 0;
  const attendance = typeof inputs.attendance === 'number' ? Math.max(0, Math.min(5, inputs.attendance)) : 0;
  const assignment = typeof inputs.assignment === 'number' ? Math.max(0, Math.min(5, inputs.assignment)) : 0;

  const mid1Converted = convertMidMark(mid1Raw);
  const mid2Converted = convertMidMark(mid2Raw);

  const totalInternal = roundTo(mid1Converted + mid2Converted + lab + attendance + assignment, 2);
  const maxInternal = UNIVERSITY_CONFIG.integratedInternal.totalMax; // 40
  const percentage = roundTo((totalInternal / maxInternal) * 100, 2);
  const performanceTier = UNIVERSITY_CONFIG.getPerformanceTier(percentage).label;

  const isComplete =
    inputs.mid1 !== '' &&
    inputs.mid2 !== '' &&
    inputs.lab !== '' &&
    inputs.attendance !== '' &&
    inputs.assignment !== '';

  return {
    mid1Converted,
    mid2Converted,
    lab,
    attendance,
    assignment,
    totalInternal,
    maxInternal,
    percentage,
    performanceTier,
    isComplete,
  };
}

/**
 * Calculates GPA using weighted credits formula:
 * GPA = Σ(Credits × Grade Points) / Σ(Credits)
 */
export function calculateGPA(
  subjects: SubjectItem[],
  customGradeScale?: Record<string, number>
): GPAResult {
  if (!subjects || subjects.length === 0) {
    return { gpa: 0, totalCredits: 0, totalPoints: 0, performanceTier: 'N/A', subjectsCount: 0 };
  }

  let totalCredits = 0;
  let totalPoints = 0;

  for (const sub of subjects) {
    const credits = Number(sub.credits) || 0;
    let points = sub.gradePoint;

    if (customGradeScale && customGradeScale[sub.grade] !== undefined) {
      points = customGradeScale[sub.grade];
    }

    if (credits > 0) {
      totalCredits += credits;
      totalPoints += credits * points;
    }
  }

  const gpa = totalCredits > 0 ? roundTo(totalPoints / totalCredits, 2) : 0;
  const performanceTier = UNIVERSITY_CONFIG.getGpaTier(gpa).label;

  return {
    gpa,
    totalCredits: roundTo(totalCredits, 1),
    totalPoints: roundTo(totalPoints, 2),
    performanceTier,
    subjectsCount: subjects.length,
  };
}

/**
 * Calculates CGPA using weighted semester credits formula.
 */
export function calculateCGPA(semesters: SemesterItem[]): CGPAResult {
  if (!semesters || semesters.length === 0) {
    return { cgpa: 0, totalCredits: 0, semestersCount: 0, performanceTier: 'N/A' };
  }

  let totalWeightedGPA = 0;
  let totalCredits = 0;
  let validSemesters = 0;

  for (const sem of semesters) {
    const credits = typeof sem.credits === 'number' ? sem.credits : 0;
    const gpa = typeof sem.gpa === 'number' ? sem.gpa : 0;

    if (credits > 0 && gpa >= 0) {
      totalCredits += credits;
      totalWeightedGPA += gpa * credits;
      validSemesters++;
    }
  }

  const cgpa = totalCredits > 0 ? roundTo(totalWeightedGPA / totalCredits, 2) : 0;
  const performanceTier = UNIVERSITY_CONFIG.getGpaTier(cgpa).label;

  return {
    cgpa,
    totalCredits: roundTo(totalCredits, 1),
    semestersCount: validSemesters,
    performanceTier,
  };
}

/**
 * Target GPA Calculation
 * Formula: Required GPA = (Target GPA × (Current Credits + Upcoming Credits) - Current GPA × Current Credits) / Upcoming Credits
 */
export function calculateTargetGPA(
  currentGpa: number,
  currentCredits: number,
  targetGpa: number,
  upcomingCredits: number,
  maxGradePoint: number = 10.0
): TargetGPAResult {
  if (upcomingCredits <= 0) {
    return {
      currentGpa,
      currentCredits,
      targetGpa,
      upcomingCredits,
      requiredGpa: 0,
      isPossible: false,
      maxPossibleGpa: currentGpa,
      explanation: 'Upcoming credits must be greater than zero.',
    };
  }

  const totalCredits = currentCredits + upcomingCredits;
  const targetTotalQualityPoints = targetGpa * totalCredits;
  const currentQualityPoints = currentGpa * currentCredits;
  const neededQualityPoints = targetTotalQualityPoints - currentQualityPoints;
  const requiredGpaRaw = neededQualityPoints / upcomingCredits;
  const requiredGpa = roundTo(requiredGpaRaw, 2);

  // Maximum possible GPA if student scores 10.0 in all upcoming credits
  const maxPossiblePoints = currentQualityPoints + maxGradePoint * upcomingCredits;
  const maxPossibleGpa = roundTo(maxPossiblePoints / totalCredits, 2);

  const isPossible = requiredGpa <= maxGradePoint && requiredGpa >= 0;

  let explanation = '';
  if (requiredGpa > maxGradePoint) {
    explanation = `This target is not reachable with the current credit setup. Even with a perfect ${maxGradePoint}.00 in all ${upcomingCredits} upcoming credits, your highest attainable GPA is ${maxPossibleGpa.toFixed(2)}.`;
  } else if (requiredGpa < 0) {
    explanation = `Your target of ${targetGpa.toFixed(2)} is already secured by your existing credits, even with 0 points in upcoming courses.`;
  } else {
    explanation = `To achieve a cumulative GPA of ${targetGpa.toFixed(2)}, you must maintain an average grade point of ${requiredGpa.toFixed(2)} across the upcoming ${upcomingCredits} credits.`;
  }

  return {
    currentGpa,
    currentCredits,
    targetGpa,
    upcomingCredits,
    requiredGpa: Math.max(0, requiredGpa),
    isPossible,
    maxPossibleGpa,
    explanation,
  };
}

/**
 * Attendance Planner
 */
export interface AttendanceInputParams {
  totalSessions: number;
  facultySessions: number;
  attended: number;
}

export function calculateAttendance(params: AttendanceInputParams): AttendanceResult;
export function calculateAttendance(
  conducted: number,
  attended: number,
  futureSessions?: number,
  targetPercentage?: number
): AttendancePlannerResult;
export function calculateAttendance(
  paramsOrConducted: AttendanceInputParams | number,
  attendedArg?: number,
  futureSessionsArg: number = 0,
  targetPercentageArg: number = 85
): any {
  if (typeof paramsOrConducted === 'object' && paramsOrConducted !== null) {
    const totalSessions = Number(paramsOrConducted.totalSessions) || 0;
    const facultySessions = Number(paramsOrConducted.facultySessions) || 0;
    const attended = Number(paramsOrConducted.attended) || 0;
    const absent = Math.max(0, facultySessions - attended);
    const percentage = facultySessions > 0 ? roundTo((attended / facultySessions) * 100, 2) : 0;
    return {
      totalSessions,
      facultySessions,
      attended,
      absent,
      percentage,
    };
  }

  const currentConducted = Math.max(0, paramsOrConducted);
  const currentAttended = Math.min(currentConducted, Math.max(0, attendedArg || 0));
  const currentPercentage =
    currentConducted > 0 ? roundTo((currentAttended / currentConducted) * 100, 2) : 100;

  const totalFuture = Math.max(0, futureSessionsArg);
  const totalProjectedConducted = currentConducted + totalFuture;
  const totalProjectedAttended = currentAttended + totalFuture;
  const projectedPercentage =
    totalProjectedConducted > 0
      ? roundTo((totalProjectedAttended / totalProjectedConducted) * 100, 2)
      : currentPercentage;

  let sessionsNeededForTarget = 0;
  if (targetPercentageArg < 100) {
    const num = (targetPercentageArg * currentConducted - 100 * currentAttended) / (100 - targetPercentageArg);
    sessionsNeededForTarget = Math.max(0, Math.ceil(num));
  } else {
    sessionsNeededForTarget = currentAttended === currentConducted ? 0 : Infinity;
  }

  let canBunkSessions = 0;
  if (targetPercentageArg > 0 && currentPercentage >= targetPercentageArg) {
    const maxConducted = (100 * currentAttended) / targetPercentageArg;
    canBunkSessions = Math.max(0, Math.floor(maxConducted - currentConducted));
  }

  const isTargetAchievable =
    futureSessionsArg > 0
      ? projectedPercentage >= targetPercentageArg
      : currentPercentage >= targetPercentageArg || sessionsNeededForTarget < 200;

  return {
    conducted: currentConducted,
    attended: currentAttended,
    currentPercentage,
    futureSessions: totalFuture,
    projectedPercentage,
    targetPercentage: targetPercentageArg,
    sessionsNeededForTarget,
    canBunkSessions,
    isTargetAchievable,
  };
}

/**
 * Calculates required consecutive future attended sessions to achieve target %.
 */
export function calculateRequiredAttendance(params: {
  currentAttended: number;
  currentFacultySessions: number;
  targetPercentage: number;
}): {
  requiredSessions: number;
  projectedPercentage: number;
} {
  const { currentAttended, currentFacultySessions, targetPercentage } = params;
  if (currentFacultySessions <= 0) {
    return { requiredSessions: 0, projectedPercentage: 0 };
  }

  const currentPct = (currentAttended / currentFacultySessions) * 100;
  if (currentPct >= targetPercentage) {
    return {
      requiredSessions: 0,
      projectedPercentage: roundTo(currentPct, 2),
    };
  }

  if (targetPercentage >= 100) {
    const req = currentAttended === currentFacultySessions ? 0 : Infinity;
    return {
      requiredSessions: req,
      projectedPercentage: req === 0 ? 100 : 0,
    };
  }

  const num = (targetPercentage * currentFacultySessions - 100 * currentAttended) / (100 - targetPercentage);
  const x = Math.max(0, Math.ceil(num));
  const projectedPct = roundTo(((currentAttended + x) / (currentFacultySessions + x)) * 100, 2);

  return {
    requiredSessions: x,
    projectedPercentage: projectedPct,
  };
}

/**
 * Calculates projected attendance with planned future absences.
 */
export function calculateProjectedAttendance(params: {
  attended: number;
  facultySessions: number;
  futureSessions: number;
  futureAbsences: number;
}): {
  futureAttended: number;
  futureTotal: number;
  projectedPercentage: number;
} {
  const { attended, facultySessions, futureSessions, futureAbsences } = params;
  const attendedNetFuture = Math.max(0, futureSessions - futureAbsences);
  const futureAttended = attended + attendedNetFuture;
  const futureTotal = facultySessions + futureSessions;
  const projectedPercentage =
    futureTotal > 0 ? roundTo((futureAttended / futureTotal) * 100, 2) : 0;

  return {
    futureAttended,
    futureTotal,
    projectedPercentage,
  };
}
