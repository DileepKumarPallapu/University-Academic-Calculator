import type {
  AcademicTask,
  PlannedSubject,
  MarksForecastScenario,
  AcademicAlert,
  AcademicCompanionOverview,
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
