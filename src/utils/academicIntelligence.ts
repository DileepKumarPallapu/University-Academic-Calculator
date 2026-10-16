import { REGULATIONS, type RegulationId } from '../config/university';
import { roundTo } from './calculations';
import { safeGetItem, safeSetItem } from '../services/catalogueStorage';
import type { SavedCalculation, StudentProfile } from '../types/profile';
import type { CreditSubjectItem, CourseCategoryType } from '../types/credits';
import {
  calculateCreditSummary,
  calculateCategoryProgress,
  COLLEGE_CHART_TEMPLATE,
} from './creditCalculations';

export const ACADEMIC_CATEGORIES: CourseCategoryType[] = [
  'foundation',
  'programme_core',
  'programme_elective',
  'open_elective',
  'independent_learning',
  'industry_interaction',
  'professional_proficiency',
  'mandatory',
  'custom',
];

export interface WhatIfSubject {
  id: string;
  name: string;
  code?: string;
  credits: number;
  grade: string;
}

export interface WhatIfScenario {
  id: string;
  profileId: string;
  title: string;
  regulation: RegulationId;
  semester: number;
  subjects: WhatIfSubject[];
  projectedSgpa: number;
  totalCredits: number;
  projectedCgpa: number | null;
  deltaCgpa: number | null;
  priorCgpa: number | null;
  priorCredits: number;
  createdAt: number;
  updatedAt: number;
  isSimulation: true;
}

export interface PriorSemestersSummary {
  priorCredits: number;
  priorWeightedPoints: number;
  priorCgpa: number | null;
  semestersCount: number;
}

export interface AcademicSemesterPerformanceItem {
  semester: number;
  sgpa: number;
  credits: number;
  cgpaAfter?: number;
  source: string;
}

export interface AcademicIntelligenceMetrics {
  profileId: string;
  studentName: string;
  rollNumber?: string;
  regulation: RegulationId;
  currentSemester: number;
  hasAnyData: boolean;

  // SGPA & CGPA
  currentSgpa: number | null;
  currentCgpa: number | null;
  sgpaDisplay: string;
  cgpaDisplay: string;

  // Attendance
  overallAttendancePercentage: number | null;
  attendanceDisplay: string;
  totalConductedSessions: number;
  totalAttendedSessions: number;
  subjectsCount: number;
  criticalAttendanceCount: number;
  subjectWiseAttendance: Array<{
    id: string;
    name: string;
    conducted: number;
    attended: number;
    percentage: number;
    status: 'On Track' | 'Needs Attention' | 'At Risk';
  }>;

  // Credits
  registeredCredits: number;
  earnedCredits: number;
  pendingCredits: number;
  targetCredits: number;
  completionPercentage: number;
  categoryBreakdown: Array<{
    category: CourseCategoryType;
    label: string;
    earned: number;
    required: number;
    percentage: number;
  }>;

  // Semester Performance Chart Data
  semesterPerformance: AcademicSemesterPerformanceItem[];

  // Recent Academic Activity
  recentActivity: Array<{
    id: string;
    type: 'calculation' | 'simulation' | 'credits' | 'task';
    title: string;
    summary: string;
    timestamp: number;
    dateFormatted: string;
  }>;
}

const WHAT_IF_STORAGE_PREFIX = 'academic_what_if_scenarios_';

/**
 * Maps a letter grade to verified regulation grade points.
 * Throws or returns 0 for unrecognized grades.
 */
export function getGradePointForRegulation(
  grade: string,
  regulationId: RegulationId
): { points: number; isValid: boolean; label: string } {
  const regConfig = REGULATIONS[regulationId] || REGULATIONS.VTR21;
  const match = regConfig.grades.find(
    (g) => g.grade.trim().toUpperCase() === grade.trim().toUpperCase()
  );

  if (match) {
    return { points: match.points, isValid: true, label: match.label };
  }

  return { points: 0, isValid: false, label: 'Invalid Grade' };
}

/**
 * Validates a What-If hypothetical subject entry.
 */
export function validateWhatIfSubject(
  subject: { name?: string; credits: number; grade: string },
  regulationId: RegulationId
): { isValid: boolean; error?: string } {
  if (!subject.name || subject.name.trim().length === 0) {
    return { isValid: false, error: 'Subject title is required.' };
  }
  if (isNaN(subject.credits) || subject.credits <= 0) {
    return { isValid: false, error: 'Credits must be a positive number greater than 0.' };
  }
  if (subject.credits > 12) {
    return { isValid: false, error: 'Credits per course cannot exceed 12.' };
  }
  const gp = getGradePointForRegulation(subject.grade, regulationId);
  if (!gp.isValid) {
    return { isValid: false, error: `Grade "${subject.grade}" is not recognized under regulation ${regulationId}.` };
  }
  return { isValid: true };
}

/**
 * Calculates a hypothetical What-If scenario.
 * Projects hypothetical SGPA and estimates combined future CGPA based on existing prior credits.
 * Never mutates or alters any saved database or student records.
 */
export function calculateWhatIfScenario(
  title: string,
  regulationId: RegulationId,
  semesterNumber: number,
  subjects: WhatIfSubject[],
  priorSummary: PriorSemestersSummary = { priorCredits: 0, priorWeightedPoints: 0, priorCgpa: null, semestersCount: 0 },
  profileId: string = 'default'
): WhatIfScenario {
  let totalCredits = 0;
  let totalWeightedPoints = 0;

  for (const sub of subjects) {
    const credits = Math.max(0, Number(sub.credits) || 0);
    const { points, isValid } = getGradePointForRegulation(sub.grade, regulationId);
    if (isValid && credits > 0) {
      totalCredits += credits;
      totalWeightedPoints += credits * points;
    }
  }

  const projectedSgpa = totalCredits > 0 ? roundTo(totalWeightedPoints / totalCredits, 2) : 0;

  // Projected CGPA calculation using prior eligible semester credits
  let projectedCgpa: number | null = null;
  let deltaCgpa: number | null = null;

  if (priorSummary.priorCredits > 0) {
    const combinedCredits = priorSummary.priorCredits + totalCredits;
    const combinedPoints = priorSummary.priorWeightedPoints + totalWeightedPoints;
    projectedCgpa = combinedCredits > 0 ? roundTo(combinedPoints / combinedCredits, 2) : projectedSgpa;
    if (priorSummary.priorCgpa !== null) {
      deltaCgpa = roundTo(projectedCgpa - priorSummary.priorCgpa, 2);
    }
  } else if (totalCredits > 0) {
    projectedCgpa = projectedSgpa;
    deltaCgpa = 0;
  }

  const now = Date.now();
  return {
    id: `scenario-${now}-${Math.random().toString(36).slice(2, 7)}`,
    profileId,
    title: title.trim() || `Semester ${semesterNumber} Simulation`,
    regulation: regulationId,
    semester: semesterNumber,
    subjects: [...subjects],
    projectedSgpa,
    totalCredits: roundTo(totalCredits, 1),
    projectedCgpa,
    deltaCgpa,
    priorCgpa: priorSummary.priorCgpa,
    priorCredits: priorSummary.priorCredits,
    createdAt: now,
    updatedAt: now,
    isSimulation: true,
  };
}

/**
 * Storage helpers for What-If Scenarios (isolated per profileId)
 */
export function getWhatIfScenariosForProfile(profileId: string): WhatIfScenario[] {
  if (!profileId) return [];
  const raw = safeGetItem(`${WHAT_IF_STORAGE_PREFIX}${profileId}`);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveWhatIfScenarioForProfile(
  profileId: string,
  scenario: WhatIfScenario
): WhatIfScenario[] {
  if (!profileId) return [];
  const current = getWhatIfScenariosForProfile(profileId);
  const idx = current.findIndex((s) => s.id === scenario.id);
  let updated: WhatIfScenario[];
  if (idx >= 0) {
    updated = [...current];
    updated[idx] = { ...scenario, updatedAt: Date.now() };
  } else {
    updated = [scenario, ...current];
  }
  safeSetItem(`${WHAT_IF_STORAGE_PREFIX}${profileId}`, JSON.stringify(updated));
  return updated;
}

export function deleteWhatIfScenarioForProfile(
  profileId: string,
  scenarioId: string
): WhatIfScenario[] {
  if (!profileId) return [];
  const current = getWhatIfScenariosForProfile(profileId);
  const updated = current.filter((s) => s.id !== scenarioId);
  safeSetItem(`${WHAT_IF_STORAGE_PREFIX}${profileId}`, JSON.stringify(updated));
  return updated;
}

/**
 * Extracts prior semesters summary from student's saved calculations or credit courses.
 */
export function extractPriorSemestersSummary(
  savedCalcs: SavedCalculation[],
  creditSubjects: CreditSubjectItem[] = []
): PriorSemestersSummary {
  // 1. Check saved SGPA calculations
  const sgpaCalcs = savedCalcs.filter((c) => c.type === 'sgpa');
  if (sgpaCalcs.length > 0) {
    let priorCredits = 0;
    let priorWeightedPoints = 0;
    let validCount = 0;

    for (const c of sgpaCalcs) {
      const gpa = parseFloat(c.resultValue);
      const credits = Number(c.inputs?.totalCredits || c.inputs?.credits) || 0;
      if (!isNaN(gpa) && gpa >= 0 && credits > 0) {
        priorCredits += credits;
        priorWeightedPoints += gpa * credits;
        validCount++;
      }
    }

    if (priorCredits > 0) {
      return {
        priorCredits: roundTo(priorCredits, 1),
        priorWeightedPoints: roundTo(priorWeightedPoints, 2),
        priorCgpa: roundTo(priorWeightedPoints / priorCredits, 2),
        semestersCount: validCount,
      };
    }
  }

  // 2. Check saved CGPA calculation
  const cgpaCalc = savedCalcs.find((c) => c.type === 'cgpa');
  if (cgpaCalc && cgpaCalc.inputs?.semesters && Array.isArray(cgpaCalc.inputs.semesters)) {
    let priorCredits = 0;
    let priorWeightedPoints = 0;
    let validCount = 0;

    for (const sem of cgpaCalc.inputs.semesters) {
      const gpa = Number(sem.gpa);
      const credits = Number(sem.credits);
      if (!isNaN(gpa) && gpa >= 0 && credits > 0) {
        priorCredits += credits;
        priorWeightedPoints += gpa * credits;
        validCount++;
      }
    }

    if (priorCredits > 0) {
      return {
        priorCredits: roundTo(priorCredits, 1),
        priorWeightedPoints: roundTo(priorWeightedPoints, 2),
        priorCgpa: roundTo(priorWeightedPoints / priorCredits, 2),
        semestersCount: validCount,
      };
    }
  }

  // 3. Check passed credit courses grouped by semester
  if (creditSubjects.length > 0) {
    const passedCourses = creditSubjects.filter(
      (c) => c.status === 'Passed' && c.grade && c.semester
    );
    if (passedCourses.length > 0) {
      let priorCredits = 0;
      let priorWeightedPoints = 0;
      const semestersSet = new Set<number>();

      for (const course of passedCourses) {
        const credits = Number(course.credits) || 0;
        const gp = getGradePointForRegulation(course.grade || '', 'VTR21');
        if (credits > 0 && gp.isValid) {
          priorCredits += credits;
          priorWeightedPoints += credits * gp.points;
          if (course.semester) semestersSet.add(course.semester);
        }
      }

      if (priorCredits > 0) {
        return {
          priorCredits: roundTo(priorCredits, 1),
          priorWeightedPoints: roundTo(priorWeightedPoints, 2),
          priorCgpa: roundTo(priorWeightedPoints / priorCredits, 2),
          semestersCount: semestersSet.size || 1,
        };
      }
    }
  }

  return {
    priorCredits: 0,
    priorWeightedPoints: 0,
    priorCgpa: null,
    semestersCount: 0,
  };
}

/**
 * Builds the comprehensive Academic Intelligence metrics for a profile.
 * Reads ONLY the current student's saved personal records.
 * Returns empty defaults ("Not calculated", zero totals) when no data exists.
 */
export function getAcademicIntelligenceMetrics(
  profile: StudentProfile,
  savedCalculations: SavedCalculation[] = []
): AcademicIntelligenceMetrics {
  const profileId = profile.id;
  const regulation = (profile.regulation as RegulationId) || 'VTR21';
  const currentSemester = profile.currentSemester || 1;
  const targetCredits = profile.customGraduationCredits || 160;

  // 1. Saved Credits Records
  const rawCreds = safeGetItem(`academic_credits_subjects_${profileId}`);
  let creditSubjects: CreditSubjectItem[] = [];
  if (rawCreds) {
    try {
      creditSubjects = JSON.parse(rawCreds);
    } catch {
      creditSubjects = [];
    }
  }

  const creditSummary = calculateCreditSummary(creditSubjects, targetCredits, COLLEGE_CHART_TEMPLATE);
  const registeredCredits = creditSummary.totalRegisteredCredits;
  const earnedCredits = creditSummary.totalEarnedCredits;
  const pendingCredits = creditSummary.creditsRemaining;
  const completionPercentage = creditSummary.completionPercentage;

  // Category progress breakdown
  const categoryProgressItems = calculateCategoryProgress(COLLEGE_CHART_TEMPLATE, creditSubjects);
  const categoryBreakdown = categoryProgressItems.map((item) => ({
    category: item.category.id as CourseCategoryType,
    label: item.category.name,
    earned: item.earnedCredits,
    required: item.category.requiredCredits,
    percentage: item.progressPercentage,
  }));

  // 2. Attendance Records
  const rawAtt = safeGetItem(`academic_attendance_subjects_${profileId}`);
  let attendanceSubjects: any[] = [];
  if (rawAtt) {
    try {
      attendanceSubjects = JSON.parse(rawAtt);
    } catch {
      attendanceSubjects = [];
    }
  }

  let totalConductedSessions = 0;
  let totalAttendedSessions = 0;
  let overallAttendancePercentage: number | null = null;
  let criticalAttendanceCount = 0;
  const targetAtt = profile.targetAttendance || 75;

  const subjectWiseAttendance: AcademicIntelligenceMetrics['subjectWiseAttendance'] = [];

  for (const s of attendanceSubjects) {
    const conducted = Number(s.conducted || s.totalSessions) || 0;
    const attended = Number(s.attended || s.presentSessions) || 0;
    if (conducted > 0) {
      totalConductedSessions += conducted;
      totalAttendedSessions += Math.min(conducted, attended);
      const pct = roundTo(Math.min(100, (Math.min(conducted, attended) / conducted) * 100), 2);
      let status: 'On Track' | 'Needs Attention' | 'At Risk' = 'On Track';
      if (pct < targetAtt - 10) {
        status = 'At Risk';
        criticalAttendanceCount++;
      } else if (pct < targetAtt) {
        status = 'Needs Attention';
        criticalAttendanceCount++;
      }

      subjectWiseAttendance.push({
        id: s.id || `att-${Math.random()}`,
        name: s.name || s.subjectName || 'Course',
        conducted,
        attended: Math.min(conducted, attended),
        percentage: pct,
        status,
      });
    }
  }

  if (totalConductedSessions > 0) {
    overallAttendancePercentage = roundTo(
      Math.min(100, (totalAttendedSessions / totalConductedSessions) * 100),
      2
    );
  }

  // 3. SGPA & CGPA from saved calculations
  const priorSummary = extractPriorSemestersSummary(savedCalculations, creditSubjects);
  let currentSgpa: number | null = null;
  let currentCgpa: number | null = priorSummary.priorCgpa;

  // Find latest SGPA calculation for current semester or latest available
  const sgpaCalcs = savedCalculations.filter((c) => c.type === 'sgpa');
  if (sgpaCalcs.length > 0) {
    const semMatch = sgpaCalcs.find((c) => Number(c.semester) === currentSemester);
    const chosen = semMatch || sgpaCalcs[0];
    const val = parseFloat(chosen.resultValue);
    if (!isNaN(val) && val >= 0) {
      currentSgpa = val;
    }
  }

  // If CGPA wasn't derived from prior summary, check explicit CGPA calculation
  if (currentCgpa === null) {
    const cgpaCalc = savedCalculations.find((c) => c.type === 'cgpa');
    if (cgpaCalc) {
      const val = parseFloat(cgpaCalc.resultValue);
      if (!isNaN(val) && val >= 0) {
        currentCgpa = val;
      }
    }
  }

  // 4. Semester Performance Timeline Data
  const semesterPerformance: AcademicSemesterPerformanceItem[] = [];
  const semMap = new Map<number, { sgpa: number; credits: number; source: string }>();

  // Map from saved SGPA calculations
  for (const c of sgpaCalcs) {
    const semNum = Number(c.semester) || 1;
    const gpa = parseFloat(c.resultValue);
    const credits = Number(c.inputs?.totalCredits || c.inputs?.credits) || 20;
    if (!isNaN(gpa) && gpa > 0) {
      semMap.set(semNum, { sgpa: gpa, credits, source: 'Saved SGPA Calculation' });
    }
  }

  // Map from CGPA calculation semester inputs if missing
  const cgpaCalc = savedCalculations.find((c) => c.type === 'cgpa');
  if (cgpaCalc?.inputs?.semesters && Array.isArray(cgpaCalc.inputs.semesters)) {
    for (const sem of cgpaCalc.inputs.semesters) {
      const semNum = Number(sem.semesterNumber) || 1;
      const gpa = Number(sem.gpa);
      const credits = Number(sem.credits) || 20;
      if (!isNaN(gpa) && gpa > 0 && !semMap.has(semNum)) {
        semMap.set(semNum, { sgpa: gpa, credits, source: 'Saved CGPA Entry' });
      }
    }
  }

  // Sort by semester number ascending
  const sortedSemNums = Array.from(semMap.keys()).sort((a, b) => a - b);
  let cumCredits = 0;
  let cumPoints = 0;
  for (const semNum of sortedSemNums) {
    const item = semMap.get(semNum)!;
    cumCredits += item.credits;
    cumPoints += item.sgpa * item.credits;
    const cgpaAfter = cumCredits > 0 ? roundTo(cumPoints / cumCredits, 2) : item.sgpa;
    semesterPerformance.push({
      semester: semNum,
      sgpa: item.sgpa,
      credits: item.credits,
      cgpaAfter,
      source: item.source,
    });
  }

  // 5. Recent Activity
  const recentActivity: AcademicIntelligenceMetrics['recentActivity'] = [];

  // Saved calculations
  for (const c of savedCalculations.slice(0, 5)) {
    recentActivity.push({
      id: c.id,
      type: 'calculation',
      title: c.title,
      summary: `${c.type.toUpperCase()}: ${c.resultValue} • ${c.resultSummary || 'Calculated'}`,
      timestamp: c.updatedAt || c.createdAt,
      dateFormatted: new Date(c.updatedAt || c.createdAt).toLocaleDateString(),
    });
  }

  // Saved What-If scenarios
  const savedScenarios = getWhatIfScenariosForProfile(profileId);
  for (const s of savedScenarios.slice(0, 3)) {
    recentActivity.push({
      id: s.id,
      type: 'simulation',
      title: s.title,
      summary: `Simulation: Projected SGPA ${s.projectedSgpa.toFixed(2)}${s.projectedCgpa ? ` • Projected CGPA ${s.projectedCgpa.toFixed(2)}` : ''}`,
      timestamp: s.updatedAt || s.createdAt,
      dateFormatted: new Date(s.updatedAt || s.createdAt).toLocaleDateString(),
    });
  }

  // Sort recent activity descending
  recentActivity.sort((a, b) => b.timestamp - a.timestamp);

  const hasAnyData =
    currentSgpa !== null ||
    currentCgpa !== null ||
    overallAttendancePercentage !== null ||
    creditSubjects.length > 0 ||
    savedCalculations.length > 0 ||
    savedScenarios.length > 0;

  return {
    profileId,
    studentName: profile.name,
    rollNumber: profile.rollNumber,
    regulation,
    currentSemester,
    hasAnyData,
    currentSgpa,
    currentCgpa,
    sgpaDisplay: currentSgpa !== null ? currentSgpa.toFixed(2) : 'Not calculated',
    cgpaDisplay: currentCgpa !== null ? currentCgpa.toFixed(2) : 'Not calculated',
    overallAttendancePercentage,
    attendanceDisplay:
      overallAttendancePercentage !== null ? `${overallAttendancePercentage.toFixed(2)}%` : 'Not calculated',
    totalConductedSessions,
    totalAttendedSessions,
    subjectsCount: subjectWiseAttendance.length,
    criticalAttendanceCount,
    subjectWiseAttendance,
    registeredCredits,
    earnedCredits,
    pendingCredits,
    targetCredits,
    completionPercentage,
    categoryBreakdown,
    semesterPerformance,
    recentActivity: recentActivity.slice(0, 8),
  };
}
