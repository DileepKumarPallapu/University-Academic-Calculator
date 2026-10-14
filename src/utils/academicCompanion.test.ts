import { describe, it, expect, beforeEach } from 'vitest';
import {
  getTasksForProfile,
  addTask,
  updateTask,
  deleteTask,
  toggleTaskStatus,
  getPlannedSubjectsForProfile,
  addPlannedSubject,
  getForecastScenariosForProfile,
  saveForecastScenario,
  getDismissedAlertIds,
  dismissAlert,
  resetDismissedAlerts,
  getAcademicCompanionOverview,
  generateAcademicAlerts,
} from '../services/companionStorage';
import { clearCatalogueStorage } from '../services/catalogueStorage';
import type { StudentProfile } from '../types/profile';

const mockStorage: Record<string, string> = {};
if (typeof globalThis.localStorage === 'undefined') {
  (globalThis as any).localStorage = {
    getItem: (k: string) => mockStorage[k] ?? null,
    setItem: (k: string, v: string) => { mockStorage[k] = String(v); },
    removeItem: (k: string) => { delete mockStorage[k]; },
    clear: () => {
      Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);
    },
  };
}

describe('Smart Student Academic Companion Service', () => {
  const profileA: StudentProfile = {
    id: 'student-profile-alpha',
    name: 'Alice Johnson',
    rollNumber: '22021A0501',
    collegeName: 'Vel Tech',
    degree: 'B.Tech',
    department: 'Computer Science',
    regulation: 'VTR21',
    degreePathway: 'standard',
    targetAttendance: 75,
    customGraduationCredits: 160,
    currentSemester: 5,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const profileB: StudentProfile = {
    id: 'student-profile-beta',
    name: 'Bob Smith',
    rollNumber: '22021A0502',
    collegeName: 'Vel Tech',
    degree: 'B.Tech',
    department: 'Information Technology',
    regulation: 'VTR21',
    degreePathway: 'standard',
    targetAttendance: 80,
    customGraduationCredits: 160,
    currentSemester: 5,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  beforeEach(() => {
    clearCatalogueStorage();
    if (typeof globalThis.localStorage !== 'undefined') {
      globalThis.localStorage.clear();
    }
    Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);
  });

  describe('Zero Initial State & Clean Defaults', () => {
    it('initializes fresh profile with empty tasks and empty planned courses', () => {
      expect(getTasksForProfile('fresh-student-1')).toEqual([]);
      expect(getPlannedSubjectsForProfile('fresh-student-1')).toEqual([]);
      expect(getForecastScenariosForProfile('fresh-student-1')).toEqual([]);
      expect(getDismissedAlertIds('fresh-student-1')).toEqual([]);
    });

    it('returns zero earned credits and null attendance on fresh profile overview', async () => {
      const overview = await getAcademicCompanionOverview(profileA);
      expect(overview.profileId).toBe(profileA.id);
      expect(overview.earnedCredits).toBe(0);
      expect(overview.registeredCredits).toBe(0);
      expect(overview.attendanceAvgPct).toBeNull();
      expect(overview.internalsAveragePct).toBeNull();
      expect(overview.latestSgpa).toBeNull();
      expect(overview.todayClassesCount).toBe(0);
      expect(overview.pendingTasksCount).toBe(0);
    });
  });

  describe('Multi-Student Profile Isolation', () => {
    it('strictly isolates academic tasks between student profiles', () => {
      addTask(profileA.id, {
        title: 'Operating Systems Lab Submission',
        category: 'assignment',
        dueDate: '2026-10-20',
        priority: 'high',
        status: 'pending',
      });

      const aliceTasks = getTasksForProfile(profileA.id);
      const bobTasks = getTasksForProfile(profileB.id);

      expect(aliceTasks).toHaveLength(1);
      expect(aliceTasks[0].title).toBe('Operating Systems Lab Submission');
      expect(bobTasks).toHaveLength(0);
    });

    it('strictly isolates planned subjects between student profiles', () => {
      addPlannedSubject(profileA.id, {
        semester: 6,
        courseName: 'Cloud Computing Architecture',
        category: 'programme_elective',
        plannedCredits: 3,
        status: 'planned',
      });

      const alicePlans = getPlannedSubjectsForProfile(profileA.id);
      const bobPlans = getPlannedSubjectsForProfile(profileB.id);

      expect(alicePlans).toHaveLength(1);
      expect(alicePlans[0].courseName).toBe('Cloud Computing Architecture');
      expect(bobPlans).toHaveLength(0);
    });

    it('strictly isolates forecast scenarios between student profiles', () => {
      saveForecastScenario(profileA.id, {
        title: 'Target 9.0 Scenario',
        regulation: 'VTR21',
        semester: 5,
        subjects: [],
        projectedSgpa: 9.15,
        totalCredits: 20,
      });

      const aliceScenarios = getForecastScenariosForProfile(profileA.id);
      const bobScenarios = getForecastScenariosForProfile(profileB.id);

      expect(aliceScenarios).toHaveLength(1);
      expect(aliceScenarios[0].projectedSgpa).toBe(9.15);
      expect(bobScenarios).toHaveLength(0);
    });
  });

  describe('Task Operations & Toggling', () => {
    it('adds, updates, toggles and deletes tasks correctly', () => {
      const task = addTask(profileA.id, {
        title: 'Unit Test 1',
        category: 'exam',
        dueDate: '2026-11-01',
        priority: 'high',
        status: 'pending',
      });

      expect(task.status).toBe('pending');

      // Toggle to completed
      const toggled = toggleTaskStatus(profileA.id, task.id);
      expect(toggled?.status).toBe('completed');

      // Update title
      const updated = updateTask(profileA.id, task.id, { title: 'Unit Test 1 (Postponed)' });
      expect(updated?.title).toBe('Unit Test 1 (Postponed)');

      // Delete task
      const deleted = deleteTask(profileA.id, task.id);
      expect(deleted).toBe(true);
      expect(getTasksForProfile(profileA.id)).toHaveLength(0);
    });
  });

  describe('Planned Subjects Separation from Earned Credits', () => {
    it('planned credits do not count towards earned credits in overview', async () => {
      addPlannedSubject(profileA.id, {
        semester: 5,
        courseName: 'Deep Learning',
        category: 'programme_elective',
        plannedCredits: 4,
        status: 'planned',
      });

      const overview = await getAcademicCompanionOverview(profileA);
      // Earned credits must remain 0!
      expect(overview.earnedCredits).toBe(0);
      expect(overview.creditCompletionPct).toBe(0);
      expect(overview.remainingCredits).toBe(160);
    });
  });

  describe('Academic Alerts Engine', () => {
    it('generates low attendance alert when attendance is below student target', async () => {
      const overview = await getAcademicCompanionOverview(profileA);
      overview.attendanceAvgPct = 71.5;
      overview.attendanceCriticalCount = 2;

      const alerts = generateAcademicAlerts(profileA, overview);
      const attAlert = alerts.find((a) => a.type === 'attendance_warning');

      expect(attAlert).toBeDefined();
      expect(attAlert?.title).toContain('Low Attendance: 71.5%');
      expect(attAlert?.priority).toBe('warning');
    });

    it('does not generate attendance alert when attendance satisfies target', async () => {
      const overview = await getAcademicCompanionOverview(profileA);
      overview.attendanceAvgPct = 82.0;

      const alerts = generateAcademicAlerts(profileA, overview);
      const attAlert = alerts.find((a) => a.type === 'attendance_warning');

      expect(attAlert).toBeUndefined();
    });

    it('generates overdue task alert when pending tasks have passed due date', async () => {
      const overview = await getAcademicCompanionOverview(profileA);
      overview.overdueTasksCount = 1;
      overview.nextUpcomingTask = {
        id: 'task-overdue-1',
        profileId: profileA.id,
        title: 'Compiler Project Phase 1',
        category: 'project',
        dueDate: '2026-09-01',
        priority: 'high',
        status: 'pending',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const alerts = generateAcademicAlerts(profileA, overview);
      const taskAlert = alerts.find((a) => a.type === 'deadline_approaching');

      expect(taskAlert).toBeDefined();
      expect(taskAlert?.priority).toBe('urgent');
      expect(taskAlert?.message).toContain('Compiler Project Phase 1');
    });

    it('respects alert dismissal', async () => {
      const overview = await getAcademicCompanionOverview(profileA);
      overview.attendanceAvgPct = 68.0;
      overview.attendanceCriticalCount = 1;

      const firstAlerts = generateAcademicAlerts(profileA, overview);
      expect(firstAlerts).toHaveLength(1);

      // Dismiss alert
      dismissAlert(profileA.id, firstAlerts[0].id);

      // Next call should not include dismissed alert
      const secondAlerts = generateAcademicAlerts(profileA, overview);
      expect(secondAlerts).toHaveLength(0);

      // Resetting dismissed alerts brings it back
      resetDismissedAlerts(profileA.id);
      const thirdAlerts = generateAcademicAlerts(profileA, overview);
      expect(thirdAlerts).toHaveLength(1);
    });
  });
});
