import type {
  AcademicTask,
  PlannedSubject,
  MarksForecastScenario,
  AcademicAlert,
  AcademicCompanionOverview,
  PlannerSemester,
  StudentAcademicGoals,
  AcademicGoalMetric,
} from '../types/academicCompanion';
import type { StudentProfile } from '../types/profile';
import { safeGetItem, safeSetItem, sanitizeCourseTitle } from './catalogueStorage';
import { getAmsDashboardData } from './amsStorage';
import { getCalculationsByProfile } from './db';
import { calculateAmsAttendancePercentage } from './amsStorage';

const TASKS_PREFIX = 'academic_companion_tasks_';
const PLANNER_PREFIX = 'academic_companion_planner_';
const FORECASTER_PREFIX = 'academic_companion_forecaster_';
const DISMISSED_ALERTS_PREFIX = 'academic_companion_dismissed_alerts_';
const SEMESTERS_PREFIX = 'academic_planner_semesters_';
const GOALS_PREFIX = 'academic_goals_';

// ==========================================
// 1. TASKS MANAGEMENT (Per Profile)
// ==========================================

export function getTasksForProfile(profileId: string): AcademicTask[] {
  if (!profileId) return [];
  const raw = safeGetItem(`${TASKS_PREFIX}${profileId}`);
  if (!raw) return [];
  try {
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function saveTasksForProfile(profileId: string, tasks: AcademicTask[]): void {
  if (!profileId) return;
  safeSetItem(`${TASKS_PREFIX}${profileId}`, JSON.stringify(tasks));
}

export function addTask(
  profileId: string,
  task: Omit<AcademicTask, 'id' | 'profileId' | 'createdAt' | 'updatedAt'>
): AcademicTask {
  const current = getTasksForProfile(profileId);
  const now = Date.now();
  const newTask: AcademicTask = {
    ...task,
    id: `task-${now}-${Math.random().toString(36).slice(2, 6)}`,
    profileId,
    title: task.title.trim(),
    createdAt: now,
    updatedAt: now,
  };
  saveTasksForProfile(profileId, [newTask, ...current]);
  return newTask;
}

export function updateTask(
  profileId: string,
  taskId: string,
  updates: Partial<AcademicTask>
): AcademicTask | null {
  const current = getTasksForProfile(profileId);
  const idx = current.findIndex((t) => t.id === taskId);
  if (idx < 0) return null;

  const updated: AcademicTask = {
    ...current[idx],
    ...updates,
    updatedAt: Date.now(),
  };
  current[idx] = updated;
  saveTasksForProfile(profileId, current);
  return updated;
}

export function deleteTask(profileId: string, taskId: string): boolean {
  const current = getTasksForProfile(profileId);
  const filtered = current.filter((t) => t.id !== taskId);
  if (filtered.length !== current.length) {
    saveTasksForProfile(profileId, filtered);
    return true;
  }
  return false;
}

export function toggleTaskStatus(profileId: string, taskId: string): AcademicTask | null {
  const current = getTasksForProfile(profileId);
  const task = current.find((t) => t.id === taskId);
  if (!task) return null;

  const nextStatus = task.status === 'completed' ? 'pending' : 'completed';
  return updateTask(profileId, taskId, { status: nextStatus });
}

// ==========================================
// 2. PLANNED SUBJECTS (Semester Planner)
// ==========================================

export function getPlannedSubjectsForProfile(profileId: string): PlannedSubject[] {
  if (!profileId) return [];
  const raw = safeGetItem(`${PLANNER_PREFIX}${profileId}`);
  if (!raw) return [];
  try {
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function savePlannedSubjectsForProfile(
  profileId: string,
  subjects: PlannedSubject[]
): void {
  if (!profileId) return;
  safeSetItem(`${PLANNER_PREFIX}${profileId}`, JSON.stringify(subjects));
}

export function addPlannedSubject(
  profileId: string,
  subject: Omit<PlannedSubject, 'id' | 'profileId' | 'createdAt' | 'updatedAt'>
): PlannedSubject {
  const current = getPlannedSubjectsForProfile(profileId);
  const now = Date.now();
  const newSubject: PlannedSubject = {
    ...subject,
    id: `plan-${now}-${Math.random().toString(36).slice(2, 6)}`,
    profileId,
    courseName: sanitizeCourseTitle(subject.courseName),
    preparationStatus: subject.preparationStatus || 'not_started',
    createdAt: now,
    updatedAt: now,
  };
  savePlannedSubjectsForProfile(profileId, [...current, newSubject]);
  return newSubject;
}

export function updatePlannedSubject(
  profileId: string,
  subjectId: string,
  updates: Partial<PlannedSubject>
): PlannedSubject | null {
  const current = getPlannedSubjectsForProfile(profileId);
  const idx = current.findIndex((s) => s.id === subjectId);
  if (idx < 0) return null;

  const updated: PlannedSubject = {
    ...current[idx],
    ...updates,
    updatedAt: Date.now(),
  };
  current[idx] = updated;
  savePlannedSubjectsForProfile(profileId, current);
  return updated;
}

export function deletePlannedSubject(profileId: string, subjectId: string): boolean {
  const current = getPlannedSubjectsForProfile(profileId);
  const filtered = current.filter((s) => s.id !== subjectId);
  if (filtered.length !== current.length) {
    savePlannedSubjectsForProfile(profileId, filtered);
    return true;
  }
  return false;
}

// ==========================================
// 2B. SEMESTER MANAGEMENT (Smart Semester Planner)
// ==========================================

export function getSemestersForProfile(profileId: string): PlannerSemester[] {
  if (!profileId) return [];
  const raw = safeGetItem(`${SEMESTERS_PREFIX}${profileId}`);
  if (!raw) return [];
  try {
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function saveSemestersForProfile(profileId: string, semesters: PlannerSemester[]): void {
  if (!profileId) return;
  safeSetItem(`${SEMESTERS_PREFIX}${profileId}`, JSON.stringify(semesters));
}

export function createSemester(
  profileId: string,
  data: Omit<PlannerSemester, 'id' | 'profileId' | 'createdAt' | 'updatedAt'>
): PlannerSemester {
  const current = getSemestersForProfile(profileId);
  const now = Date.now();
  let updatedList = [...current];

  if (data.isCurrent) {
    updatedList = updatedList.map((s) => ({ ...s, isCurrent: false }));
  }

  const newSemester: PlannerSemester = {
    ...data,
    id: `sem-${now}-${Math.random().toString(36).slice(2, 6)}`,
    profileId,
    title: data.title.trim() || `Semester ${data.semesterNumber}`,
    isCurrent: !!data.isCurrent,
    isArchived: !!data.isArchived,
    createdAt: now,
    updatedAt: now,
  };

  saveSemestersForProfile(profileId, [...updatedList, newSemester]);
  return newSemester;
}

export function updateSemester(
  profileId: string,
  semesterId: string,
  updates: Partial<PlannerSemester>
): PlannerSemester | null {
  const current = getSemestersForProfile(profileId);
  const idx = current.findIndex((s) => s.id === semesterId);
  if (idx < 0) return null;

  let updatedList = [...current];
  if (updates.isCurrent) {
    updatedList = updatedList.map((s) => ({ ...s, isCurrent: false }));
  }

  const updated: PlannerSemester = {
    ...updatedList[idx],
    ...updates,
    updatedAt: Date.now(),
  };
  updatedList[idx] = updated;
  saveSemestersForProfile(profileId, updatedList);
  return updated;
}

export function deleteSemester(profileId: string, semesterId: string): boolean {
  const current = getSemestersForProfile(profileId);
  const filtered = current.filter((s) => s.id !== semesterId);
  if (filtered.length !== current.length) {
    saveSemestersForProfile(profileId, filtered);
    // Remove linked subjects
    const subjects = getPlannedSubjectsForProfile(profileId);
    const updatedSubjects = subjects.filter((s) => s.semesterId !== semesterId);
    if (updatedSubjects.length !== subjects.length) {
      savePlannedSubjectsForProfile(profileId, updatedSubjects);
    }
    return true;
  }
  return false;
}

export function toggleArchiveSemester(profileId: string, semesterId: string): PlannerSemester | null {
  const current = getSemestersForProfile(profileId);
  const sem = current.find((s) => s.id === semesterId);
  if (!sem) return null;
  const willArchive = !sem.isArchived;
  return updateSemester(profileId, semesterId, {
    isArchived: willArchive,
    isCurrent: willArchive ? false : sem.isCurrent,
  });
}

export function setCurrentSemester(profileId: string, semesterId: string): PlannerSemester | null {
  return updateSemester(profileId, semesterId, { isCurrent: true, isArchived: false });
}

// ==========================================
// 2C. ACADEMIC GOALS (Goal Tracker)
// ==========================================

export function getAcademicGoalsForProfile(profileId: string): StudentAcademicGoals | null {
  if (!profileId) return null;
  const raw = safeGetItem(`${GOALS_PREFIX}${profileId}`);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === 'object' && parsed !== null) {
      return parsed as StudentAcademicGoals;
    }
    return null;
  } catch {
    return null;
  }
}

export function saveAcademicGoalsForProfile(
  profileId: string,
  goals: Partial<StudentAcademicGoals>
): StudentAcademicGoals {
  const existing = getAcademicGoalsForProfile(profileId);
  const updated: StudentAcademicGoals = {
    profileId,
    targetSgpa: goals.targetSgpa !== undefined ? goals.targetSgpa : existing?.targetSgpa ?? null,
    targetCgpa: goals.targetCgpa !== undefined ? goals.targetCgpa : existing?.targetCgpa ?? null,
    targetAttendancePct:
      goals.targetAttendancePct !== undefined
        ? goals.targetAttendancePct
        : existing?.targetAttendancePct ?? null,
    targetCredits:
      goals.targetCredits !== undefined ? goals.targetCredits : existing?.targetCredits ?? null,
    targetPrepCompletionPct:
      goals.targetPrepCompletionPct !== undefined
        ? goals.targetPrepCompletionPct
        : existing?.targetPrepCompletionPct ?? null,
    updatedAt: Date.now(),
  };
  safeSetItem(`${GOALS_PREFIX}${profileId}`, JSON.stringify(updated));
  return updated;
}

export async function calculateAcademicGoalMetrics(
  profile: StudentProfile,
  goals?: StudentAcademicGoals | null
): Promise<AcademicGoalMetric[]> {
  const profileId = profile.id;
  const effectiveGoals = goals ?? getAcademicGoalsForProfile(profileId);

  // 1. SGPA & CGPA from calculations
  const calculations = await getCalculationsByProfile(profileId);
  const sgpaCalcs = calculations.filter((c) => c.type === 'sgpa');
  let latestSgpa: number | null = null;
  if (sgpaCalcs.length > 0) {
    const val = parseFloat(sgpaCalcs[0].resultValue);
    if (!isNaN(val)) latestSgpa = val;
  }

  const cgpaCalcs = calculations.filter((c) => c.type === 'cgpa');
  let latestCgpa: number | null = null;
  if (cgpaCalcs.length > 0) {
    const val = parseFloat(cgpaCalcs[0].resultValue);
    if (!isNaN(val)) latestCgpa = val;
  }

  // 2. Attendance
  let currentAttendancePct: number | null = null;
  const attRaw = safeGetItem(`academic_attendance_subjects_${profileId}`);
  if (attRaw) {
    try {
      const attList = JSON.parse(attRaw);
      if (Array.isArray(attList) && attList.length > 0) {
        let totalAtt = 0;
        let totalCond = 0;
        attList.forEach((s: any) => {
          totalAtt += Number(s.attended || s.presentSessions || 0);
          totalCond += Number(s.conducted || s.totalSessions || 0);
        });
        if (totalCond > 0) {
          currentAttendancePct = Math.round((totalAtt / totalCond) * 1000) / 10;
        }
      }
    } catch {
      // ignore
    }
  }
  if (currentAttendancePct === null) {
    const amsData = getAmsDashboardData(profileId);
    if (amsData.attendance && amsData.attendance.length > 0) {
      let totalAtt = 0;
      let totalCond = 0;
      amsData.attendance.forEach((a) => {
        totalAtt += a.presentSessions || 0;
        totalCond += a.officialTotalSessions || 0;
      });
      if (totalCond > 0) {
        currentAttendancePct = calculateAmsAttendancePercentage(totalCond, totalAtt);
      }
    }
  }

  // 3. Earned Credits
  let earnedCredits = 0;
  let hasCreditRecords = false;
  const rawCreds = safeGetItem(`academic_credits_subjects_${profileId}`);
  if (rawCreds) {
    try {
      const creditSubjects = JSON.parse(rawCreds);
      if (Array.isArray(creditSubjects) && creditSubjects.length > 0) {
        hasCreditRecords = true;
        for (const cs of creditSubjects) {
          const cr = Number(cs.credits) || 0;
          if (cs.status === 'Passed' || (cs.earnedCredits && Number(cs.earnedCredits) > 0)) {
            earnedCredits += cs.earnedCredits !== undefined ? Number(cs.earnedCredits) : cr;
          }
        }
      }
    } catch {
      // ignore
    }
  }

  // 4. Preparation Completion Rate
  const subjects = getPlannedSubjectsForProfile(profileId);
  const semesters = getSemestersForProfile(profileId);
  const currentSem = semesters.find((s) => s.isCurrent && !s.isArchived);
  const targetSubjects = currentSem
    ? subjects.filter(
        (s) =>
          (s.semesterId && s.semesterId === currentSem.id) ||
          s.semester === currentSem.semesterNumber
      )
    : subjects;

  const totalSubjs = targetSubjects.length;
  const readySubjs = targetSubjects.filter((s) => s.preparationStatus === 'ready').length;
  const prepCompletionPct = totalSubjs > 0 ? Math.round((readySubjs / totalSubjs) * 100) : null;

  const metrics: AcademicGoalMetric[] = [
    {
      key: 'sgpa',
      title: 'Target SGPA',
      targetValue: effectiveGoals?.targetSgpa ?? null,
      currentValue: latestSgpa,
      hasData: latestSgpa !== null,
      unit: 'GPA',
      collegeRequirement: 'College standard: 5.0 Min Passing SGPA (VTR Regulation)',
      userTargetLabel: 'Your Target SGPA',
      isAchieved:
        latestSgpa !== null && effectiveGoals?.targetSgpa != null
          ? latestSgpa >= effectiveGoals.targetSgpa
          : false,
      progressPct:
        latestSgpa !== null && effectiveGoals?.targetSgpa
          ? Math.min(100, Math.round((latestSgpa / effectiveGoals.targetSgpa) * 100))
          : 0,
      statusText: latestSgpa !== null ? `Current: ${latestSgpa.toFixed(2)}` : 'Not calculated yet',
    },
    {
      key: 'cgpa',
      title: 'Target CGPA',
      targetValue: effectiveGoals?.targetCgpa ?? null,
      currentValue: latestCgpa,
      hasData: latestCgpa !== null,
      unit: 'CGPA',
      collegeRequirement: 'College standard: 5.0 Min Passing CGPA for Degree',
      userTargetLabel: 'Your Target CGPA',
      isAchieved:
        latestCgpa !== null && effectiveGoals?.targetCgpa != null
          ? latestCgpa >= effectiveGoals.targetCgpa
          : false,
      progressPct:
        latestCgpa !== null && effectiveGoals?.targetCgpa
          ? Math.min(100, Math.round((latestCgpa / effectiveGoals.targetCgpa) * 100))
          : 0,
      statusText: latestCgpa !== null ? `Current: ${latestCgpa.toFixed(2)}` : 'Not calculated yet',
    },
    {
      key: 'attendance',
      title: 'Target Attendance',
      targetValue: effectiveGoals?.targetAttendancePct ?? null,
      currentValue: currentAttendancePct,
      hasData: currentAttendancePct !== null,
      unit: '%',
      collegeRequirement: 'College requirement: 75% Min Attendance (65% condonation)',
      userTargetLabel: 'Your Target Attendance',
      isAchieved:
        currentAttendancePct !== null && effectiveGoals?.targetAttendancePct != null
          ? currentAttendancePct >= effectiveGoals.targetAttendancePct
          : false,
      progressPct:
        currentAttendancePct !== null && effectiveGoals?.targetAttendancePct
          ? Math.min(100, Math.round((currentAttendancePct / effectiveGoals.targetAttendancePct) * 100))
          : 0,
      statusText:
        currentAttendancePct !== null
          ? `Current: ${currentAttendancePct.toFixed(1)}%`
          : 'No attendance recorded yet',
    },
    {
      key: 'credits',
      title: 'Target Earned Credits',
      targetValue: effectiveGoals?.targetCredits ?? 160,
      currentValue: hasCreditRecords ? earnedCredits : null,
      hasData: hasCreditRecords,
      unit: 'Credits',
      collegeRequirement: 'College requirement: 160 Credits for B.Tech Degree',
      userTargetLabel: 'Your Target Credits',
      isAchieved:
        effectiveGoals?.targetCredits != null ? earnedCredits >= effectiveGoals.targetCredits : false,
      progressPct: effectiveGoals?.targetCredits
        ? Math.min(100, Math.round((earnedCredits / effectiveGoals.targetCredits) * 100))
        : 0,
      statusText: hasCreditRecords
        ? `${earnedCredits} of ${effectiveGoals?.targetCredits || 160} credits earned`
        : 'No credit records added yet',
    },
    {
      key: 'prep_completion',
      title: 'Subject Exam Readiness',
      targetValue: effectiveGoals?.targetPrepCompletionPct ?? 100,
      currentValue: prepCompletionPct,
      hasData: prepCompletionPct !== null,
      unit: '%',
      collegeRequirement: 'University exam rule: Minimum 50% combined score required',
      userTargetLabel: 'Your Readiness Target',
      isAchieved:
        prepCompletionPct !== null && effectiveGoals?.targetPrepCompletionPct != null
          ? prepCompletionPct >= effectiveGoals.targetPrepCompletionPct
          : false,
      progressPct: prepCompletionPct ?? 0,
      statusText:
        prepCompletionPct !== null
          ? `${readySubjs} of ${totalSubjs} subjects fully ready (${prepCompletionPct}%)`
          : 'No planned subjects in active semester',
    },
  ];

  return metrics;
}

// ==========================================
// 3. MARKS FORECASTER SCENARIOS
// ==========================================

export function getForecastScenariosForProfile(profileId: string): MarksForecastScenario[] {
  if (!profileId) return [];
  const raw = safeGetItem(`${FORECASTER_PREFIX}${profileId}`);
  if (!raw) return [];
  try {
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function saveForecastScenario(
  profileId: string,
  scenario: Omit<MarksForecastScenario, 'id' | 'profileId' | 'createdAt' | 'updatedAt'> & {
    id?: string;
  }
): MarksForecastScenario {
  const current = getForecastScenariosForProfile(profileId);
  const now = Date.now();
  const id = scenario.id || `forecast-${now}-${Math.random().toString(36).slice(2, 6)}`;
  const existingIdx = current.findIndex((s) => s.id === id);

  const saved: MarksForecastScenario = {
    ...scenario,
    id,
    profileId,
    createdAt: existingIdx >= 0 ? current[existingIdx].createdAt : now,
    updatedAt: now,
  };

  if (existingIdx >= 0) {
    current[existingIdx] = saved;
  } else {
    current.unshift(saved);
  }

  safeSetItem(`${FORECASTER_PREFIX}${profileId}`, JSON.stringify(current));
  return saved;
}

export function deleteForecastScenario(profileId: string, scenarioId: string): boolean {
  const current = getForecastScenariosForProfile(profileId);
  const filtered = current.filter((s) => s.id !== scenarioId);
  if (filtered.length !== current.length) {
    safeSetItem(`${FORECASTER_PREFIX}${profileId}`, JSON.stringify(filtered));
    return true;
  }
  return false;
}

// ==========================================
// 4. DISMISSED ALERTS MANAGEMENT
// ==========================================

export function getDismissedAlertIds(profileId: string): string[] {
  if (!profileId) return [];
  const raw = safeGetItem(`${DISMISSED_ALERTS_PREFIX}${profileId}`);
  if (!raw) return [];
  try {
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function dismissAlert(profileId: string, alertId: string): void {
  if (!profileId || !alertId) return;
  const current = getDismissedAlertIds(profileId);
  if (!current.includes(alertId)) {
    safeSetItem(`${DISMISSED_ALERTS_PREFIX}${profileId}`, JSON.stringify([...current, alertId]));
  }
}

export function resetDismissedAlerts(profileId: string): void {
  if (!profileId) return;
  safeSetItem(`${DISMISSED_ALERTS_PREFIX}${profileId}`, JSON.stringify([]));
}

// ==========================================
// 5. ACADEMIC OVERVIEW AGGREGATOR
// ==========================================

export async function getAcademicCompanionOverview(
  profile: StudentProfile
): Promise<AcademicCompanionOverview> {
  const profileId = profile.id;

  // 1. Timetable (from AMS)
  const amsData = getAmsDashboardData(profileId);
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;
  const todayDayName = days[new Date().getDay()];
  const todayClasses = amsData.timetable.filter((t) => t.day === todayDayName);
  const nextClass =
    todayClasses.length > 0
      ? {
          subjectName: todayClasses[0].subjectName,
          startTime: todayClasses[0].startTime,
          endTime: todayClasses[0].endTime,
          room: todayClasses[0].room,
        }
      : undefined;

  // 2. Attendance Overview (from Attendance Calculator or AMS)
  let attendanceAvgPct: number | null = null;
  let attendanceSubjectsCount = 0;
  let attendanceCriticalCount = 0;

  const rawAttSub = safeGetItem(`academic_attendance_subjects_${profileId}`);
  let manualAttendanceSubjects: any[] = [];
  if (rawAttSub) {
    try {
      manualAttendanceSubjects = JSON.parse(rawAttSub);
    } catch {
      manualAttendanceSubjects = [];
    }
  }

  // Use manual attendance calculator subjects if available, otherwise check AMS attendance
  const effectiveAttendance =
    manualAttendanceSubjects.length > 0 ? manualAttendanceSubjects : amsData.attendance;

  if (effectiveAttendance.length > 0) {
    let validCount = 0;
    let sumPct = 0;

    for (const sub of effectiveAttendance) {
      let pct: number | null = null;
      if (typeof sub.percentage === 'number') {
        pct = sub.percentage;
      } else if (sub.officialTotalSessions && sub.officialTotalSessions > 0) {
        pct = calculateAmsAttendancePercentage(sub.officialTotalSessions, sub.presentSessions);
      } else if (sub.totalSessions && sub.totalSessions > 0) {
        pct = calculateAmsAttendancePercentage(sub.totalSessions, sub.presentSessions || sub.attendedSessions);
      }

      if (pct !== null) {
        sumPct += pct;
        validCount++;
        if (pct < (profile.targetAttendance || 75)) {
          attendanceCriticalCount++;
        }
      }
    }

    attendanceSubjectsCount = effectiveAttendance.length;
    if (validCount > 0) {
      attendanceAvgPct = Math.round((sumPct / validCount) * 100) / 100;
    }
  }

  // 3. Internal Marks
  let internalsCount = amsData.internalMarks.length;
  let internalsAveragePct: number | null = null;
  if (internalsCount > 0) {
    const validMarks = amsData.internalMarks.filter((m) => m.maxMarks > 0);
    if (validMarks.length > 0) {
      const totalPct = validMarks.reduce(
        (acc, curr) => acc + (curr.marksObtained / curr.maxMarks) * 100,
        0
      );
      internalsAveragePct = Math.round((totalPct / validMarks.length) * 100) / 100;
    }
  }

  // 4. Saved Calculations & SGPA / CGPA
  const savedCalcs = await getCalculationsByProfile(profileId);
  const savedCalculationsCount = savedCalcs.length;

  let latestSgpa: number | null = null;
  let calculatedCgpa: number | null = null;

  const sgpaCalc = savedCalcs.find((c) => c.type === 'sgpa');
  if (sgpaCalc) {
    const num = parseFloat(sgpaCalc.resultValue);
    if (!isNaN(num)) latestSgpa = num;
  }

  const cgpaCalc = savedCalcs.find((c) => c.type === 'cgpa');
  if (cgpaCalc) {
    const num = parseFloat(cgpaCalc.resultValue);
    if (!isNaN(num)) calculatedCgpa = num;
  }

  // 5. Credits Progress
  const rawCreds = safeGetItem(`academic_credits_subjects_${profileId}`);
  let creditSubjects: any[] = [];
  if (rawCreds) {
    try {
      creditSubjects = JSON.parse(rawCreds);
    } catch {
      creditSubjects = [];
    }
  }

  let registeredCredits = 0;
  let earnedCredits = 0;
  let nptelCount = 0;
  let nptelCompletedCredits = 0;
  let nptelPendingApprovalCount = 0;

  for (const cs of creditSubjects) {
    const cr = Number(cs.credits) || 0;
    registeredCredits += cr;
    if (cs.status === 'Passed' || cs.earnedCredits > 0) {
      earnedCredits += cs.earnedCredits !== undefined ? Number(cs.earnedCredits) : cr;
    }

    if (cs.courseType === 'nptel' || cs.nptelDetails) {
      nptelCount++;
      if (cs.status === 'Passed') {
        nptelCompletedCredits += cr;
      }
      if (cs.nptelDetails?.approvalStatus === 'submitted') {
        nptelPendingApprovalCount++;
      }
    }
  }

  const targetCredits = profile.customGraduationCredits || 160;
  const remainingCredits = Math.max(0, targetCredits - earnedCredits);
  const creditCompletionPct =
    targetCredits > 0 ? Math.min(100, Math.round((earnedCredits / targetCredits) * 100)) : 0;

  // 6. Upcoming Tasks
  const tasks = getTasksForProfile(profileId);
  const todayStr = new Date().toISOString().split('T')[0];
  const pendingTasks = tasks.filter((t) => t.status !== 'completed');
  const overdueTasks = pendingTasks.filter((t) => t.dueDate < todayStr);

  const sortedUpcoming = [...pendingTasks].sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const nextUpcomingTask = sortedUpcoming[0];

  // 7. AMS Status
  const amsStatus =
    amsData.academicProfile.connectionStatus === 'connected'
      ? 'connected'
      : amsData.academicProfile.connectionStatus === 'manual_synced'
      ? 'manual_synced'
      : amsData.academicProfile.connectionStatus === 'connecting'
      ? 'syncing'
      : 'not_connected';

  const amsLastSync = amsData.lastSyncTime
    ? new Date(amsData.lastSyncTime).toLocaleString()
    : undefined;

  return {
    profileId,
    studentName: profile.name,
    rollNumber: profile.rollNumber,
    regulation: profile.regulation || 'VTR21',
    semester: profile.currentSemester || 1,
    todayDay: todayDayName,
    todayClassesCount: todayClasses.length,
    nextClass,
    attendanceAvgPct,
    attendanceSubjectsCount,
    attendanceCriticalCount,
    internalsCount,
    internalsAveragePct,
    latestSgpa,
    calculatedCgpa,
    savedCalculationsCount,
    earnedCredits,
    targetCredits,
    remainingCredits,
    registeredCredits,
    creditCompletionPct,
    nptelCount,
    nptelCompletedCredits,
    nptelPendingApprovalCount,
    pendingTasksCount: pendingTasks.length,
    overdueTasksCount: overdueTasks.length,
    nextUpcomingTask,
    amsStatus,
    amsLastSync,
  };
}

// ==========================================
// 6. ACADEMIC ALERTS GENERATOR
// ==========================================

export function generateAcademicAlerts(
  profile: StudentProfile,
  overview: AcademicCompanionOverview
): AcademicAlert[] {
  const dismissed = getDismissedAlertIds(profile.id);
  const alerts: AcademicAlert[] = [];
  const targetAtt = profile.targetAttendance || 75;

  // 1. Attendance Alert (Below target)
  if (overview.attendanceAvgPct !== null && overview.attendanceAvgPct < targetAtt) {
    const alertId = `att-low-${profile.id}-${Math.floor(overview.attendanceAvgPct)}`;
    if (!dismissed.includes(alertId)) {
      alerts.push({
        id: alertId,
        type: 'attendance_warning',
        priority: overview.attendanceAvgPct < targetAtt - 10 ? 'urgent' : 'warning',
        title: `Low Attendance: ${overview.attendanceAvgPct}% (Goal: ${targetAtt}%)`,
        message: `${overview.attendanceCriticalCount} subject(s) are currently below your college requirement. Plan future sessions to avoid shortage.`,
        actionLabel: 'Check Attendance',
        actionLink: '/attendance',
        dismissable: true,
        createdAt: Date.now(),
      });
    }
  }

  // 2. Overdue Tasks Alert
  if (overview.overdueTasksCount > 0) {
    const alertId = `tasks-overdue-${profile.id}-${overview.overdueTasksCount}`;
    if (!dismissed.includes(alertId)) {
      alerts.push({
        id: alertId,
        type: 'deadline_approaching',
        priority: 'urgent',
        title: `${overview.overdueTasksCount} Academic Task(s) Overdue`,
        message: `You have overdue tasks including "${overview.nextUpcomingTask?.title || 'Academic assignments'}".`,
        actionLabel: 'Open Planner',
        actionLink: '/planner',
        dismissable: true,
        createdAt: Date.now(),
      });
    }
  } else if (overview.nextUpcomingTask) {
    const today = new Date().toISOString().split('T')[0];
    const diffDays = Math.ceil(
      (new Date(overview.nextUpcomingTask.dueDate).getTime() - new Date(today).getTime()) /
        (1000 * 60 * 60 * 24)
    );
    if (diffDays <= 2 && diffDays >= 0) {
      const alertId = `task-near-${overview.nextUpcomingTask.id}`;
      if (!dismissed.includes(alertId)) {
        alerts.push({
          id: alertId,
          type: 'deadline_approaching',
          priority: 'warning',
          title: `Upcoming Deadline: ${overview.nextUpcomingTask.title}`,
          message: `Due ${diffDays === 0 ? 'today' : `in ${diffDays} day(s)`} (${overview.nextUpcomingTask.dueDate}).`,
          actionLabel: 'View Task',
          actionLink: '/planner',
          dismissable: true,
          createdAt: Date.now(),
        });
      }
    }
  }

  // 3. Pending NPTEL Approvals Alert
  if (overview.nptelPendingApprovalCount > 0) {
    const alertId = `nptel-pending-${profile.id}-${overview.nptelPendingApprovalCount}`;
    if (!dismissed.includes(alertId)) {
      alerts.push({
        id: alertId,
        type: 'nptel_pending',
        priority: 'info',
        title: `${overview.nptelPendingApprovalCount} NPTEL Course(s) Pending College Approval`,
        message: 'Ensure certificates and submission receipts are verified with the department coordinator.',
        actionLabel: 'Review NPTEL',
        actionLink: '/credits?tab=nptel',
        dismissable: true,
        createdAt: Date.now(),
      });
    }
  }

  // 4. Missing Credits Alert (for senior semesters >= 7)
  if ((profile.currentSemester || 1) >= 7 && overview.remainingCredits > 24) {
    const alertId = `credits-shortfall-${profile.id}-${overview.remainingCredits}`;
    if (!dismissed.includes(alertId)) {
      alerts.push({
        id: alertId,
        type: 'credits_shortfall',
        priority: 'warning',
        title: `Credit Shortfall: ${overview.remainingCredits} Credits Remaining`,
        message: `You need ${overview.remainingCredits} more credits to reach the ${overview.targetCredits} graduation target. Plan your electives carefully.`,
        actionLabel: 'Plan Credits',
        actionLink: '/credits',
        dismissable: true,
        createdAt: Date.now(),
      });
    }
  }

  return alerts;
}
