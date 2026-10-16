import { describe, it, expect, beforeEach } from 'vitest';
import {
  getSemestersForProfile,
  createSemester,
  updateSemester,
  deleteSemester,
  toggleArchiveSemester,
  setCurrentSemester,
  getPlannedSubjectsForProfile,
  addPlannedSubject,
  updatePlannedSubject,
  deletePlannedSubject,
  getTasksForProfile,
  addTask,
  updateTask,
  deleteTask,
  toggleTaskStatus,
  getAcademicGoalsForProfile,
  saveAcademicGoalsForProfile,
  calculateAcademicGoalMetrics,
} from '../services/companionStorage';
import { clearCatalogueStorage } from '../services/catalogueStorage';
import type { StudentProfile } from '../types/profile';

const mockStorage: Record<string, string> = {};
if (typeof globalThis.localStorage === 'undefined') {
  (globalThis as any).localStorage = {
    getItem: (k: string) => mockStorage[k] ?? null,
    setItem: (k: string, v: string) => {
      mockStorage[k] = String(v);
    },
    removeItem: (k: string) => {
      delete mockStorage[k];
    },
    clear: () => {
      Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);
    },
  };
}

describe('Smart Semester Planner & Academic Goal Tracker', () => {
  const profileA: StudentProfile = {
    id: 'student-planner-alpha',
    name: 'Ananya Sharma',
    rollNumber: '22021A0510',
    collegeName: 'Vel Tech',
    degree: 'B.Tech',
    department: 'Computer Science and Engineering',
    regulation: 'VTR21',
    degreePathway: 'standard',
    targetAttendance: 85,
    customGraduationCredits: 160,
    currentSemester: 5,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const profileB: StudentProfile = {
    id: 'student-planner-beta',
    name: 'Karthik Raja',
    rollNumber: '22021A0511',
    collegeName: 'Vel Tech',
    degree: 'B.Tech',
    department: 'Electronics and Communication',
    regulation: 'VTR21',
    degreePathway: 'standard',
    targetAttendance: 75,
    customGraduationCredits: 160,
    currentSemester: 6,
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

  describe('1. Clean Defaults & Zero State', () => {
    it('initializes a fresh profile with zero personal semesters, subjects, tasks, and goals', () => {
      expect(getSemestersForProfile('fresh-student-99')).toEqual([]);
      expect(getPlannedSubjectsForProfile('fresh-student-99')).toEqual([]);
      expect(getTasksForProfile('fresh-student-99')).toEqual([]);
      expect(getAcademicGoalsForProfile('fresh-student-99')).toBeNull();
    });

    it('returns goal metrics with hasData = false when no academic records exist', async () => {
      const metrics = await calculateAcademicGoalMetrics(profileA, null);
      expect(metrics).toHaveLength(5);

      const sgpaMetric = metrics.find((m) => m.key === 'sgpa');
      expect(sgpaMetric?.hasData).toBe(false);
      expect(sgpaMetric?.statusText).toBe('Not calculated yet');
      expect(sgpaMetric?.collegeRequirement).toContain('5.0 Min Passing SGPA');

      const attMetric = metrics.find((m) => m.key === 'attendance');
      expect(attMetric?.hasData).toBe(false);
      expect(attMetric?.statusText).toBe('No attendance recorded yet');
      expect(attMetric?.collegeRequirement).toContain('75% Min Attendance');
    });
  });

  describe('2. Semester Management (CRUD, Current, Archive)', () => {
    it('allows student to create and retrieve personal semesters', () => {
      const sem = createSemester(profileA.id, {
        semesterNumber: 5,
        title: 'Semester 5 - Autumn 2024',
        academicYear: '2024-2025',
        isCurrent: true,
        isArchived: false,
        notes: 'Targeting 9.0 SGPA with Core subjects',
      });

      expect(sem.id).toBeDefined();
      expect(sem.title).toBe('Semester 5 - Autumn 2024');
      expect(sem.isCurrent).toBe(true);

      const list = getSemestersForProfile(profileA.id);
      expect(list).toHaveLength(1);
      expect(list[0].id).toBe(sem.id);
    });

    it('setting a semester as current automatically unsets isCurrent on other semesters', () => {
      const sem1 = createSemester(profileA.id, {
        semesterNumber: 4,
        title: 'Semester 4',
        isCurrent: true,
        isArchived: false,
      });

      const sem2 = createSemester(profileA.id, {
        semesterNumber: 5,
        title: 'Semester 5',
        isCurrent: true,
        isArchived: false,
      });

      let list = getSemestersForProfile(profileA.id);
      let retrievedSem1 = list.find((s) => s.id === sem1.id);
      let retrievedSem2 = list.find((s) => s.id === sem2.id);

      expect(retrievedSem1?.isCurrent).toBe(false);
      expect(retrievedSem2?.isCurrent).toBe(true);

      // Explicit setCurrentSemester switch
      setCurrentSemester(profileA.id, sem1.id);
      list = getSemestersForProfile(profileA.id);
      retrievedSem1 = list.find((s) => s.id === sem1.id);
      retrievedSem2 = list.find((s) => s.id === sem2.id);

      expect(retrievedSem1?.isCurrent).toBe(true);
      expect(retrievedSem2?.isCurrent).toBe(false);

      // updateSemester title & notes
      const updated = updateSemester(profileA.id, sem1.id, {
        title: 'Semester 4 (Updated)',
        notes: 'Target 9.2 GPA',
      });
      expect(updated?.title).toBe('Semester 4 (Updated)');
      expect(updated?.notes).toBe('Target 9.2 GPA');
    });

    it('allows archiving and restoring a semester without data loss', () => {
      const sem = createSemester(profileA.id, {
        semesterNumber: 3,
        title: 'Semester 3',
        isCurrent: true,
        isArchived: false,
      });

      // Archive
      const archived = toggleArchiveSemester(profileA.id, sem.id);
      expect(archived?.isArchived).toBe(true);
      expect(archived?.isCurrent).toBe(false);

      // Restore / Unarchive
      const restored = toggleArchiveSemester(profileA.id, sem.id);
      expect(restored?.isArchived).toBe(false);
    });

    it('deletes semester and removes linked subjects cleanly', () => {
      const sem = createSemester(profileA.id, {
        semesterNumber: 5,
        title: 'Semester 5',
        isCurrent: true,
        isArchived: false,
      });

      addPlannedSubject(profileA.id, {
        semester: 5,
        semesterId: sem.id,
        courseName: 'Compiler Design',
        plannedCredits: 4,
        category: 'programme_core',
        status: 'planned',
      });

      expect(getPlannedSubjectsForProfile(profileA.id)).toHaveLength(1);

      const deleted = deleteSemester(profileA.id, sem.id);
      expect(deleted).toBe(true);
      expect(getSemestersForProfile(profileA.id)).toHaveLength(0);
      expect(getPlannedSubjectsForProfile(profileA.id)).toHaveLength(0);
    });
  });

  describe('3. Subject Management & Preparation Readiness Tracking', () => {
    it('creates subjects with exam date, credits, and preparation status', () => {
      const subj = addPlannedSubject(profileA.id, {
        semester: 5,
        courseName: 'Distributed Systems',
        courseCode: '10210CS105',
        plannedCredits: 3,
        category: 'programme_core',
        examDate: '2026-11-20',
        preparationStatus: 'in_progress',
        status: 'planned',
        notes: 'Focus on Paxos & Raft consensus algorithms',
      });

      expect(subj.id).toBeDefined();
      expect(subj.courseName).toBe('Distributed Systems');
      expect(subj.courseCode).toBe('10210CS105');
      expect(subj.examDate).toBe('2026-11-20');
      expect(subj.preparationStatus).toBe('in_progress');

      // Update preparation status to ready
      const updated = updatePlannedSubject(profileA.id, subj.id, {
        preparationStatus: 'ready',
      });
      expect(updated?.preparationStatus).toBe('ready');

      // Delete subject
      const deleted = deletePlannedSubject(profileA.id, subj.id);
      expect(deleted).toBe(true);
      expect(getPlannedSubjectsForProfile(profileA.id)).toHaveLength(0);
    });

    it('calculates exam readiness percentage from ready subjects', async () => {
      const sem = createSemester(profileA.id, {
        semesterNumber: 5,
        title: 'Semester 5',
        isCurrent: true,
        isArchived: false,
      });

      // Add 2 subjects: 1 ready, 1 in_progress
      addPlannedSubject(profileA.id, {
        semester: 5,
        semesterId: sem.id,
        courseName: 'Subject A',
        plannedCredits: 3,
        category: 'programme_core',
        preparationStatus: 'ready',
        status: 'planned',
      });
      addPlannedSubject(profileA.id, {
        semester: 5,
        semesterId: sem.id,
        courseName: 'Subject B',
        plannedCredits: 3,
        category: 'programme_core',
        preparationStatus: 'in_progress',
        status: 'planned',
      });

      const metrics = await calculateAcademicGoalMetrics(profileA, {
        profileId: profileA.id,
        targetSgpa: 8.5,
        targetCgpa: 8.0,
        targetAttendancePct: 85,
        targetCredits: 160,
        targetPrepCompletionPct: 100,
        updatedAt: Date.now(),
      });

      const prepMetric = metrics.find((m) => m.key === 'prep_completion');
      expect(prepMetric?.hasData).toBe(true);
      expect(prepMetric?.currentValue).toBe(50); // 1 out of 2 ready = 50%
      expect(prepMetric?.isAchieved).toBe(false); // target is 100%
      expect(prepMetric?.statusText).toContain('1 of 2 subjects fully ready (50%)');
    });
  });

  describe('4. Study Tasks & Calendar Management', () => {
    it('creates, filters, and toggles study tasks', () => {
      const task = addTask(profileA.id, {
        title: 'Submit Distributed Systems Assignment 2',
        category: 'assignment',
        dueDate: '2026-10-25',
        priority: 'high',
        status: 'pending',
        semester: 5,
        courseName: 'Distributed Systems',
      });

      expect(task.id).toBeDefined();
      expect(task.status).toBe('pending');

      // Toggle status
      const toggled = toggleTaskStatus(profileA.id, task.id);
      expect(toggled?.status).toBe('completed');

      // Update task
      const updated = updateTask(profileA.id, task.id, { notes: 'Submitted via portal' });
      expect(updated?.notes).toBe('Submitted via portal');

      // Delete task
      const deleted = deleteTask(profileA.id, task.id);
      expect(deleted).toBe(true);
      expect(getTasksForProfile(profileA.id)).toHaveLength(0);
    });
  });

  describe('5. Academic Goals vs College Benchmarks', () => {
    it('persists student goals and clearly distinguishes user targets from college standards', async () => {
      saveAcademicGoalsForProfile(profileA.id, {
        targetSgpa: 9.0,
        targetCgpa: 8.5,
        targetAttendancePct: 90,
        targetCredits: 160,
        targetPrepCompletionPct: 100,
      });

      const savedGoals = getAcademicGoalsForProfile(profileA.id);
      expect(savedGoals?.targetSgpa).toBe(9.0);
      expect(savedGoals?.targetAttendancePct).toBe(90);

      const metrics = await calculateAcademicGoalMetrics(profileA, savedGoals);
      const attMetric = metrics.find((m) => m.key === 'attendance');

      expect(attMetric?.targetValue).toBe(90);
      expect(attMetric?.userTargetLabel).toBe('Your Target Attendance');
      expect(attMetric?.collegeRequirement).toContain('75% Min Attendance');
    });

    it('does not mutate or alter actual student data during goal metric calculations', async () => {
      const initialSemesters = getSemestersForProfile(profileA.id);
      const initialTasks = getTasksForProfile(profileA.id);

      await calculateAcademicGoalMetrics(profileA, {
        profileId: profileA.id,
        targetSgpa: 9.5,
        targetCgpa: 9.2,
        targetAttendancePct: 95,
        targetCredits: 160,
        targetPrepCompletionPct: 100,
        updatedAt: Date.now(),
      });

      // Must remain identical
      expect(getSemestersForProfile(profileA.id)).toEqual(initialSemesters);
      expect(getTasksForProfile(profileA.id)).toEqual(initialTasks);
    });
  });

  describe('6. Student Profile Data Isolation', () => {
    it('guarantees complete isolation between multiple student profiles', () => {
      createSemester(profileA.id, {
        semesterNumber: 5,
        title: 'Alice Semester 5',
        isCurrent: true,
        isArchived: false,
      });

      addTask(profileA.id, {
        title: 'Alice Task 1',
        category: 'exam',
        dueDate: '2026-11-01',
        priority: 'high',
        status: 'pending',
      });

      saveAcademicGoalsForProfile(profileA.id, {
        targetSgpa: 9.2,
      });

      // Verify Profile B has zero of Profile A's data
      expect(getSemestersForProfile(profileB.id)).toHaveLength(0);
      expect(getTasksForProfile(profileB.id)).toHaveLength(0);
      expect(getAcademicGoalsForProfile(profileB.id)).toBeNull();
    });
  });
});
