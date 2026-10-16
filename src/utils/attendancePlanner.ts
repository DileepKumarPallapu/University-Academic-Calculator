import { roundTo } from './calculations';

export type AttendanceStatus = 'On Track' | 'Needs Attention' | 'At Risk' | 'Insufficient Data';

export interface AttendanceStatusDetails {
  status: AttendanceStatus;
  label: string;
  badgeClass: string;
  description: string;
}

export interface BunkPlanResult {
  maxBunk: number;
  pctAfterBunk: number | null;
  pctAfterNextBunk: number | null;
  canSkipAtLeastOne: boolean;
  warningMessage?: string;
}

export interface RecoveryPlanResult {
  requiredSessions: number;
  isAchievable: boolean;
  projectedPercentage: number | null;
  explanation: string;
}

export interface SimulationResult {
  projectedConducted: number;
  projectedAttended: number;
  projectedPercentage: number | null;
  deltaPercentage: number | null;
  targetMet: boolean;
  isValid: boolean;
  error?: string;
}

export interface SubjectAttendanceItem {
  id: string;
  name: string;
  conducted: number;
  attended: number;
  targetPercentage: number;
  facultySessions?: number;
  notes?: string;
}

export interface ClassLogEntry {
  id: string;
  date: string; // YYYY-MM-DD
  subject: string;
  status: 'attended' | 'missed' | 'planned';
  time?: string;
  notes?: string;
}

/**
 * Validates basic attendance input numbers.
 */
export function validateAttendanceInputs(
  conducted: number,
  attended: number,
  targetPercentage: number
): { isValid: boolean; error?: string } {
  if (isNaN(conducted) || isNaN(attended) || isNaN(targetPercentage)) {
    return { isValid: false, error: 'Please enter valid numerical values.' };
  }
  if (conducted < 0 || attended < 0) {
    return { isValid: false, error: 'Session counts cannot be negative.' };
  }
  if (targetPercentage < 0 || targetPercentage > 100) {
    return { isValid: false, error: 'Target percentage must be between 0% and 100%.' };
  }
  if (attended > conducted) {
    return { isValid: false, error: 'Attended classes cannot exceed conducted classes.' };
  }
  return { isValid: true };
}

/**
 * Calculates current attendance metrics.
 */
export function calculateCurrentAttendance(
  conducted: number,
  attended: number,
  targetPercentage: number,
  horizonLimit: number = 200
): {
  percentage: number | null;
  missed: number;
  differenceFromTarget: number | null;
  status: AttendanceStatus;
  statusDetails: AttendanceStatusDetails;
} {
  if (conducted <= 0) {
    const statusDetails: AttendanceStatusDetails = {
      status: 'Insufficient Data',
      label: 'Not calculated',
      badgeClass: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700',
      description: 'Enter your attendance numbers above to calculate.',
    };
    return {
      percentage: null,
      missed: 0,
      differenceFromTarget: null,
      status: 'Insufficient Data',
      statusDetails,
    };
  }

  const safeAttended = Math.min(conducted, Math.max(0, attended));
  const percentage = roundTo((safeAttended / conducted) * 100, 2);
  const missed = Math.max(0, conducted - safeAttended);
  const differenceFromTarget = roundTo(percentage - targetPercentage, 2);

  const recovery = calculateRecoveryRequired(conducted, safeAttended, targetPercentage, horizonLimit);
  const status = evaluateAttendanceStatus(percentage, targetPercentage, recovery.requiredSessions, recovery.isAchievable);
  const statusDetails = getStatusDetails(status, differenceFromTarget);

  return {
    percentage,
    missed,
    differenceFromTarget,
    status,
    statusDetails,
  };
}

/**
 * Smart Bunk Planner ("Can I Skip a Class?")
 * Finds maximum consecutive classes student can miss while maintaining >= target%.
 * Formula: attended / (conducted + x) * 100 >= target%
 * => x <= (100 * attended / target) - conducted
 */
export function calculateBunkMargin(
  conducted: number,
  attended: number,
  targetPercentage: number
): BunkPlanResult {
  if (conducted <= 0 || targetPercentage <= 0) {
    return {
      maxBunk: 0,
      pctAfterBunk: null,
      pctAfterNextBunk: null,
      canSkipAtLeastOne: false,
      warningMessage: 'Insufficient session data or zero target.',
    };
  }

  const safeAttended = Math.min(conducted, Math.max(0, attended));
  const currentPct = (safeAttended / conducted) * 100;

  if (currentPct < targetPercentage) {
    const nextPct = roundTo((safeAttended / (conducted + 1)) * 100, 2);
    return {
      maxBunk: 0,
      pctAfterBunk: roundTo(currentPct, 2),
      pctAfterNextBunk: nextPct,
      canSkipAtLeastOne: false,
      warningMessage: 'Your attendance is already below target. Skipping any class will lower it further.',
    };
  }

  // Calculate maximum whole number of absences
  const rawMax = (100 * safeAttended) / targetPercentage - conducted;
  const maxBunk = Math.max(0, Math.floor(rawMax + 1e-9)); // add tiny epsilon to counteract floating point rounding

  const pctAfterBunk = roundTo((safeAttended / (conducted + maxBunk)) * 100, 2);
  const pctAfterNextBunk = roundTo((safeAttended / (conducted + maxBunk + 1)) * 100, 2);

  return {
    maxBunk,
    pctAfterBunk,
    pctAfterNextBunk,
    canSkipAtLeastOne: maxBunk > 0,
    warningMessage:
      maxBunk === 0
        ? 'Skipping even 1 class will drop your attendance below your target percentage.'
        : undefined,
  };
}

/**
 * Attendance Recovery Planner ("How Many Classes Must I Attend?")
 * Calculates smallest non-negative integer x such that (attended + x) / (conducted + x) * 100 >= target%
 * Formula: x >= (target * conducted - 100 * attended) / (100 - target)
 */
export function calculateRecoveryRequired(
  conducted: number,
  attended: number,
  targetPercentage: number,
  horizonLimit: number = 200
): RecoveryPlanResult {
  if (conducted <= 0) {
    return {
      requiredSessions: 0,
      isAchievable: true,
      projectedPercentage: null,
      explanation: 'No classes have been conducted yet.',
    };
  }

  const safeAttended = Math.min(conducted, Math.max(0, attended));
  const currentPct = (safeAttended / conducted) * 100;

  if (currentPct >= targetPercentage) {
    return {
      requiredSessions: 0,
      isAchievable: true,
      projectedPercentage: roundTo(currentPct, 2),
      explanation: 'You are currently meeting your target.',
    };
  }

  // If target is 100%, and attended < conducted, 100% is mathematically impossible once an absence occurred
  if (targetPercentage >= 100) {
    const isFull = safeAttended === conducted;
    return {
      requiredSessions: isFull ? 0 : Infinity,
      isAchievable: isFull,
      projectedPercentage: isFull ? 100 : roundTo(currentPct, 2),
      explanation: isFull
        ? 'You are currently at 100% attendance.'
        : 'A 100% attendance target cannot be reached because you have already missed classes. However, attending all remaining classes will bring you as close as possible.',
    };
  }

  const numerator = targetPercentage * conducted - 100 * safeAttended;
  const denominator = 100 - targetPercentage;
  const rawX = numerator / denominator;
  const x = Math.max(0, Math.ceil(rawX - 1e-9));

  const isAchievable = x <= horizonLimit;
  const projectedPercentage = roundTo(((safeAttended + x) / (conducted + x)) * 100, 2);

  const explanation = isAchievable
    ? `Attend the next ${x} consecutive ${x === 1 ? 'class' : 'classes'} without missing any to reach ${projectedPercentage}% (≥ ${targetPercentage}% target).`
    : `Reaching ${targetPercentage}% would require attending ${x} consecutive classes, which exceeds the reasonable planning horizon (${horizonLimit} classes).`;

  return {
    requiredSessions: x,
    isAchievable,
    projectedPercentage,
    explanation,
  };
}

/**
 * Future Attendance Simulator
 * Simulates user-entered future attendance scenarios.
 */
export function simulateFutureAttendance(
  currentConducted: number,
  currentAttended: number,
  futureTotal: number,
  futureAttended: number,
  futureMissed: number,
  targetPercentage: number
): SimulationResult {
  if (currentConducted < 0 || currentAttended < 0 || futureTotal < 0 || futureAttended < 0 || futureMissed < 0) {
    return {
      projectedConducted: 0,
      projectedAttended: 0,
      projectedPercentage: null,
      deltaPercentage: null,
      targetMet: false,
      isValid: false,
      error: 'Values cannot be negative.',
    };
  }

  if (futureAttended + futureMissed > futureTotal) {
    return {
      projectedConducted: 0,
      projectedAttended: 0,
      projectedPercentage: null,
      deltaPercentage: null,
      targetMet: false,
      isValid: false,
      error: 'Attended + missed classes cannot exceed planned future classes.',
    };
  }

  const projectedConducted = currentConducted + (futureAttended + futureMissed);
  const projectedAttended = currentAttended + futureAttended;

  if (projectedConducted <= 0) {
    return {
      projectedConducted: 0,
      projectedAttended: 0,
      projectedPercentage: null,
      deltaPercentage: null,
      targetMet: false,
      isValid: true,
    };
  }

  const currentPct = currentConducted > 0 ? (currentAttended / currentConducted) * 100 : 0;
  const projectedPct = roundTo((projectedAttended / projectedConducted) * 100, 2);
  const deltaPct = roundTo(projectedPct - currentPct, 2);
  const targetMet = projectedPct >= targetPercentage;

  return {
    projectedConducted,
    projectedAttended,
    projectedPercentage: projectedPct,
    deltaPercentage: deltaPct,
    targetMet,
    isValid: true,
  };
}

/**
 * Evaluates attendance status relative to target.
 */
export function evaluateAttendanceStatus(
  percentage: number | null,
  targetPercentage: number,
  recoveryRequired: number,
  isRecoveryAchievable: boolean
): AttendanceStatus {
  if (percentage === null) return 'Insufficient Data';
  if (percentage >= targetPercentage) return 'On Track';
  if (isRecoveryAchievable && recoveryRequired < Infinity) return 'Needs Attention';
  return 'At Risk';
}

export function getStatusDetails(status: AttendanceStatus, diff: number | null): AttendanceStatusDetails {
  switch (status) {
    case 'On Track':
      return {
        status,
        label: 'On Track',
        badgeClass: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
        description: diff !== null && diff >= 0
          ? `${diff.toFixed(2)}% above your target. Safe margin available.`
          : 'Currently meeting or exceeding your target percentage.',
      };
    case 'Needs Attention':
      return {
        status,
        label: 'Needs Attention',
        badgeClass: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30',
        description: diff !== null
          ? `${Math.abs(diff).toFixed(2)}% below your target. Recoverable with planned attendance.`
          : 'Below target percentage, but recoverable through upcoming classes.',
      };
    case 'At Risk':
      return {
        status,
        label: 'At Risk',
        badgeClass: 'bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/30',
        description: 'Target cannot be reached within the current planning horizon.',
      };
    case 'Insufficient Data':
    default:
      return {
        status: 'Insufficient Data',
        label: 'Insufficient Data',
        badgeClass: 'bg-neutral-500/10 text-neutral-700 dark:text-neutral-300 border-neutral-500/30',
        description: 'Enter session counts to evaluate attendance status.',
      };
  }
}

export interface AttendanceGoalPlanOptions {
  allowExtraClasses?: boolean;
  isPolicyConfirmed?: boolean;
  horizonLimit?: number;
}

export interface AttendanceGoalPlanResult {
  officialTotalSessions: number;
  countablePresentSessions: number;
  desiredPercentage: number;
  plannedFutureClasses: number;
  currentPercentage: number | null;
  additionalClassesNeeded: number;
  isTargetAchievable: boolean;
  canReachTargetWithPlannedClasses: boolean;
  classesNeededOutOfPlanned: number | null;
  projectedPercentageIfAllPlannedAttended: number | null;
  isEstimate: boolean;
  status: AttendanceStatus;
  statusDetails: AttendanceStatusDetails;
  explanation: string;
  policyNote?: string;
}

/**
 * Shared Attendance Goal Planning Service
 * Computes consecutive classes needed and projected attendance with planned future sessions.
 * Respects configured treatment of extra classes, caps displayed attendance strictly at 100%,
 * and flags unconfirmed policy results as estimates.
 */
export function calculateAttendanceGoalPlan(
  officialTotalSessions: number,
  countablePresentSessions: number,
  desiredPercentage: number,
  plannedFutureClasses: number = 0,
  options: AttendanceGoalPlanOptions = {}
): AttendanceGoalPlanResult {
  const {
    allowExtraClasses = false,
    isPolicyConfirmed = true,
    horizonLimit = 200,
  } = options;

  const isEstimate = !isPolicyConfirmed;
  const safeFuture = Math.max(0, Math.floor(plannedFutureClasses || 0));
  const safeDesired = Math.max(0, Math.min(100, desiredPercentage));

  if (officialTotalSessions <= 0) {
    const statusDetails: AttendanceStatusDetails = {
      status: 'Insufficient Data',
      label: 'Not calculated',
      badgeClass: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700',
      description: 'Enter your session numbers to calculate required attendance.',
    };
    return {
      officialTotalSessions: 0,
      countablePresentSessions: 0,
      desiredPercentage: safeDesired,
      plannedFutureClasses: safeFuture,
      currentPercentage: null,
      additionalClassesNeeded: 0,
      isTargetAchievable: true,
      canReachTargetWithPlannedClasses: true,
      classesNeededOutOfPlanned: null,
      projectedPercentageIfAllPlannedAttended: null,
      isEstimate,
      status: 'Insufficient Data',
      statusDetails,
      explanation: 'No official sessions have been conducted yet.',
    };
  }

  // Treatment of extra classes: cap countable at official unless permitted
  let effectiveAttended = Math.max(0, countablePresentSessions);
  let policyNote: string | undefined;

  if (effectiveAttended > officialTotalSessions) {
    if (!allowExtraClasses) {
      effectiveAttended = officialTotalSessions;
      policyNote = 'Extra sessions beyond official total are excluded from countable attendance per standard institutional policy.';
    } else {
      policyNote = 'Extra sessions are permitted and counted towards official attendance according to selected institutional rule.';
    }
  }

  const rawPct = (effectiveAttended / officialTotalSessions) * 100;
  const currentPercentage = roundTo(Math.min(100, rawPct), 2);
  const diffFromTarget = roundTo(currentPercentage - safeDesired, 2);

  // Recovery calculation: x consecutive classes needed
  let additionalClassesNeeded = 0;
  let isTargetAchievable = true;
  let explanation = '';

  if (currentPercentage >= safeDesired) {
    additionalClassesNeeded = 0;
    isTargetAchievable = true;
    explanation = `You are currently at ${currentPercentage}%, which meets your ${safeDesired}% target.`;
  } else if (safeDesired >= 100) {
    const isFull = effectiveAttended === officialTotalSessions;
    additionalClassesNeeded = isFull ? 0 : Infinity;
    isTargetAchievable = isFull;
    explanation = isFull
      ? 'You have maintained 100% attendance.'
      : 'A 100% attendance target cannot be reached because sessions have already been missed. Attending all future classes will yield the maximum possible percentage.';
  } else {
    // Formula: (effectiveAttended + x) / (officialTotalSessions + x) >= safeDesired / 100
    // x >= (safeDesired * officialTotalSessions - 100 * effectiveAttended) / (100 - safeDesired)
    const numerator = safeDesired * officialTotalSessions - 100 * effectiveAttended;
    const denominator = 100 - safeDesired;
    const rawX = numerator / denominator;
    const x = Math.max(0, Math.ceil(rawX - 1e-9));

    additionalClassesNeeded = x;
    isTargetAchievable = x <= horizonLimit;

    const projectedPct = roundTo(Math.min(100, ((effectiveAttended + x) / (officialTotalSessions + x)) * 100), 2);
    explanation = isTargetAchievable
      ? `Attend the next ${x} consecutive ${x === 1 ? 'class' : 'classes'} to reach ${projectedPct}% (≥ ${safeDesired}% target).`
      : `Reaching ${safeDesired}% requires ${x} consecutive classes, which exceeds the planning horizon limit (${horizonLimit} classes).`;
  }

  // Future planned classes simulation
  let projectedPercentageIfAllPlannedAttended: number | null = null;
  let canReachTargetWithPlannedClasses = true;
  let classesNeededOutOfPlanned: number | null = null;

  if (safeFuture > 0) {
    const totalWithFuture = officialTotalSessions + safeFuture;
    const attendedAll = effectiveAttended + safeFuture;
    projectedPercentageIfAllPlannedAttended = roundTo(Math.min(100, (attendedAll / totalWithFuture) * 100), 2);

    if (currentPercentage >= safeDesired) {
      canReachTargetWithPlannedClasses = true;
      // How many can miss? Or min required?
      // (effectiveAttended + k) / totalWithFuture >= safeDesired / 100
      const minK = Math.max(0, Math.ceil(((safeDesired * totalWithFuture) / 100) - effectiveAttended - 1e-9));
      classesNeededOutOfPlanned = Math.min(safeFuture, minK);
    } else {
      const minK = Math.ceil(((safeDesired * totalWithFuture) / 100) - effectiveAttended - 1e-9);
      if (minK <= safeFuture) {
        canReachTargetWithPlannedClasses = true;
        classesNeededOutOfPlanned = Math.max(0, minK);
      } else {
        canReachTargetWithPlannedClasses = false;
        classesNeededOutOfPlanned = null;
      }
    }
  }

  const status = evaluateAttendanceStatus(
    currentPercentage,
    safeDesired,
    additionalClassesNeeded,
    isTargetAchievable
  );
  const statusDetails = getStatusDetails(status, diffFromTarget);

  return {
    officialTotalSessions,
    countablePresentSessions: effectiveAttended,
    desiredPercentage: safeDesired,
    plannedFutureClasses: safeFuture,
    currentPercentage,
    additionalClassesNeeded,
    isTargetAchievable,
    canReachTargetWithPlannedClasses,
    classesNeededOutOfPlanned,
    projectedPercentageIfAllPlannedAttended,
    isEstimate,
    status,
    statusDetails,
    explanation,
    policyNote,
  };
}

