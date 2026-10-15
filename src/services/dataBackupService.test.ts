import { describe, it, expect, beforeEach } from 'vitest';
import {
  exportStudentBackup,
  validateBackupFile,
  detectBackupConflicts,
  restoreStudentBackup,
  resetStudentPersonalData,
  getStorageBreakdown,
  type StudentBackupData,
} from './dataBackupService';
import * as db from './db';
import type { StudentProfile, SavedCalculation } from '../types/profile';
import type { CreditSubjectItem } from '../types/credits';

// Ensure localStorage mock is present in Node/Vitest environment
const storageMap = new Map<string, string>();
const localStorageMock = {
  getItem: (key: string) => storageMap.get(key) ?? null,
  setItem: (key: string, value: string) => {
    storageMap.set(key, String(value));
  },
  removeItem: (key: string) => {
    storageMap.delete(key);
  },
  clear: () => {
    storageMap.clear();
  },
};

if (typeof globalThis.localStorage === 'undefined') {
  (globalThis as any).localStorage = localStorageMock;
}
if (typeof window === 'undefined') {
  (globalThis as any).window = {
    localStorage: localStorageMock,
    dispatchEvent: () => true,
    addEventListener: () => {},
    removeEventListener: () => {},
  };
}

describe('Student Data Backup, Restore & Local Privacy Tests', () => {
  const profileA: StudentProfile = {
    id: 'student-alpha-001',
    name: 'Alice Johnson',
    rollNumber: '21CS001',
    collegeName: 'University Framework',
    degree: 'B.Tech',
    department: 'Computer Science',
    regulation: 'VTR21',
    degreePathway: 'standard',
    targetAttendance: 75,
    customGraduationCredits: 164,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const profileB: StudentProfile = {
    id: 'student-beta-002',
    name: 'Bob Smith',
    rollNumber: '21CS002',
    collegeName: 'University Framework',
    degree: 'B.Tech',
    department: 'Mechanical',
    regulation: 'VTR21',
    degreePathway: 'honours',
    targetAttendance: 80,
    customGraduationCredits: 182,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  beforeEach(async () => {
    localStorage.clear();
    await db.saveProfile(profileA);
    await db.saveProfile(profileB);
  });

  // 1. Export Personal Data
  describe('1. Export Personal Data', () => {
    it('exports personal records with version 2.0.0 and correct metadata', async () => {
      // Seed profile A with courses, attendance, and calculations
      const coursesA: CreditSubjectItem[] = [
        {
          id: 'sub-1',
          profileId: profileA.id,
          name: 'Data Structures',
          code: '10211CS102',
          category: 'programme_core',
          semester: 3,
          credits: 4,
          registeredCredits: 4,
          earnedCredits: 4,
          status: 'Completed',
          source: 'Manual',
          isVerified: true,
        },
      ];
      localStorage.setItem(`academic_credits_subjects_${profileA.id}`, JSON.stringify(coursesA));

      const calcA: SavedCalculation = {
        id: 'calc-1',
        profileId: profileA.id,
        type: 'sgpa',
        title: 'Semester 3 SGPA',
        resultValue: '9.2 / 10',
        resultSummary: '22 Credits',
        inputs: {},
        isFavorite: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      await db.saveCalculation(calcA);

      const backup = await exportStudentBackup(profileA.id);

      expect(backup.version).toBe('2.0.0');
      expect(backup.app).toBe('University Academic Calculator');
      expect(backup.exportTimestamp).toBeDefined();
      expect(backup.sourceProfile.name).toBe('Alice Johnson');
      expect(backup.sourceProfile.rollNumber).toBe('21CS001');
      expect(backup.credits.subjects.length).toBe(1);
      expect(backup.credits.subjects[0].name).toBe('Data Structures');
      expect(backup.calculations.length).toBe(1);
      expect(backup.calculations[0].title).toBe('Semester 3 SGPA');
    });

    it('never contains passwords, session tokens, or authentication secrets', async () => {
      const backup = await exportStudentBackup(profileA.id);
      const jsonString = JSON.stringify(backup);

      expect(jsonString).not.toContain('password');
      expect(jsonString).not.toContain('token');
      expect(jsonString).not.toContain('cookie');
      expect(jsonString).not.toContain('secret');
      expect(jsonString).not.toContain('auth_key');
    });
  });

  // 2. Validate Backup File
  describe('2. Backup File Validation', () => {
    it('validates a valid v2.0.0 backup file and extracts correct summary counts', () => {
      const validBackup: StudentBackupData = {
        version: '2.0.0',
        app: 'University Academic Calculator',
        exportTimestamp: new Date().toISOString(),
        sourceProfile: {
          id: 'std-test',
          name: 'Charlie Davis',
          rollNumber: '21CS005',
          degree: 'B.Tech',
        },
        credits: {
          subjects: [
            {
              id: 'c-1',
              name: 'Operating Systems',
              category: 'programme_core',
              semester: 4,
              credits: 3,
              registeredCredits: 3,
              earnedCredits: 3,
              status: 'Completed',
              source: 'Manual',
              isVerified: true,
            },
          ],
        },
        attendance: {
          subjects: [{ name: 'Operating Systems', attended: 28, total: 30 }],
        },
        internals: {},
        calculations: [
          {
            id: 'calc-charlie-1',
            profileId: 'std-test',
            type: 'cgpa',
            title: 'Overall CGPA',
            resultValue: '8.8 / 10',
            resultSummary: '60 Credits',
            inputs: {},
            isFavorite: false,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
        ],
        companion: {
          tasks: [{ id: 't-1', title: 'Complete Lab Report', status: 'pending' }],
          planner: {},
          forecaster: {},
        },
        preferences: {},
      };

      const result = validateBackupFile(JSON.stringify(validBackup));
      expect(result.valid).toBe(true);
      expect(result.summary?.studentName).toBe('Charlie Davis');
      expect(result.summary?.counts.coursesCount).toBe(1);
      expect(result.summary?.counts.attendanceCount).toBe(1);
      expect(result.summary?.counts.calculationsCount).toBe(1);
      expect(result.summary?.counts.tasksCount).toBe(1);
    });

    it('supports legacy v1.0.0 backup format gracefully', () => {
      const legacyBackup = {
        version: '1.0.0',
        exportDate: new Date().toISOString(),
        app: 'University Academic Calculator',
        profile: {
          id: 'std-legacy',
          name: 'Legacy Student',
          rollNumber: '19CS099',
        },
        calculations: [],
      };

      const result = validateBackupFile(JSON.stringify(legacyBackup));
      expect(result.valid).toBe(true);
      expect(result.summary?.studentName).toBe('Legacy Student');
      expect(result.data?.version).toBe('1.0.0');
    });

    it('rejects empty or whitespace-only files', () => {
      expect(validateBackupFile('').valid).toBe(false);
      expect(validateBackupFile('   ').valid).toBe(false);
    });

    it('rejects malformed non-JSON content', () => {
      const result = validateBackupFile('This is not JSON content at all');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid JSON syntax');
    });

    it('rejects JSON without recognized student profile information', () => {
      const result = validateBackupFile(JSON.stringify({ someRandomKey: 123 }));
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Unsupported backup format');
    });
  });

  // 3. Conflict Detection
  describe('3. Conflict Detection', () => {
    it('flags warnings when importing a backup belonging to a different student', async () => {
      const backupFromBob: StudentBackupData = {
        version: '2.0.0',
        app: 'University Academic Calculator',
        exportTimestamp: new Date().toISOString(),
        sourceProfile: {
          id: profileB.id,
          name: 'Bob Smith',
          rollNumber: '21CS002',
        },
        credits: { subjects: [] },
        attendance: { subjects: [] },
        internals: {},
        calculations: [],
        companion: { tasks: [], planner: {}, forecaster: {} },
        preferences: {},
      };

      const conflicts = await detectBackupConflicts(profileA, backupFromBob);
      expect(conflicts.isDifferentStudent).toBe(true);
      expect(conflicts.sourceStudentName).toBe('Bob Smith');
      expect(conflicts.targetStudentName).toBe('Alice Johnson');
      expect(conflicts.warnings.length).toBeGreaterThan(0);
      expect(conflicts.warnings[0]).toContain('Bob Smith');
    });

    it('detects duplicate course names and duplicate calculations', async () => {
      // Setup existing courses in Alice's profile
      const existing: CreditSubjectItem[] = [
        {
          id: 'sub-existing',
          name: 'Computer Networks',
          code: '10211CS201',
          category: 'programme_core',
          semester: 5,
          credits: 3,
          registeredCredits: 3,
          earnedCredits: 3,
          status: 'Completed',
          source: 'Manual',
          isVerified: true,
        },
      ];
      localStorage.setItem(`academic_credits_subjects_${profileA.id}`, JSON.stringify(existing));

      const backup: StudentBackupData = {
        version: '2.0.0',
        app: 'University Academic Calculator',
        exportTimestamp: new Date().toISOString(),
        sourceProfile: { id: profileA.id, name: profileA.name },
        credits: {
          subjects: [
            {
              id: 'sub-new-1',
              name: 'Computer Networks', // duplicate by name & code
              code: '10211CS201',
              category: 'programme_core',
              semester: 5,
              credits: 3,
              registeredCredits: 3,
              earnedCredits: 3,
              status: 'Completed',
              source: 'Manual',
              isVerified: true,
            },
            {
              id: 'sub-new-2',
              name: 'Artificial Intelligence', // new course
              code: '10211CS305',
              category: 'programme_elective',
              semester: 6,
              credits: 3,
              registeredCredits: 3,
              earnedCredits: 3,
              status: 'Completed',
              source: 'Manual',
              isVerified: true,
            },
          ],
        },
        attendance: { subjects: [] },
        internals: {},
        calculations: [],
        companion: { tasks: [], planner: {}, forecaster: {} },
        preferences: {},
      };

      const conflicts = await detectBackupConflicts(profileA, backup);
      expect(conflicts.duplicateCoursesCount).toBe(1);
      expect(conflicts.newCoursesCount).toBe(1);
    });
  });

  // 4. Restore - Merge vs Replace
  describe('4. Safe Restore Execution (Merge & Replace)', () => {
    it('merges new records without deleting existing records or creating duplicate courses', async () => {
      const existing: CreditSubjectItem[] = [
        {
          id: 'sub-1',
          profileId: profileA.id,
          name: 'Course Alpha',
          code: 'ALPHA101',
          category: 'programme_core',
          semester: 1,
          credits: 4,
          registeredCredits: 4,
          earnedCredits: 4,
          status: 'Completed',
          source: 'Manual',
          isVerified: true,
        },
      ];
      localStorage.setItem(`academic_credits_subjects_${profileA.id}`, JSON.stringify(existing));

      const backup: StudentBackupData = {
        version: '2.0.0',
        app: 'University Academic Calculator',
        exportTimestamp: new Date().toISOString(),
        sourceProfile: { id: profileA.id, name: profileA.name },
        credits: {
          subjects: [
            {
              id: 'sub-incoming-dup',
              name: 'Course Alpha',
              code: 'ALPHA101',
              category: 'programme_core',
              semester: 1,
              credits: 4,
              registeredCredits: 4,
              earnedCredits: 4,
              status: 'Completed',
              source: 'Manual',
              isVerified: true,
            },
            {
              id: 'sub-incoming-new',
              name: 'Course Beta',
              code: 'BETA102',
              category: 'programme_core',
              semester: 2,
              credits: 3,
              registeredCredits: 3,
              earnedCredits: 3,
              status: 'Completed',
              source: 'Manual',
              isVerified: true,
            },
          ],
        },
        attendance: { subjects: [] },
        internals: {},
        calculations: [],
        companion: { tasks: [], planner: {}, forecaster: {} },
        preferences: {},
      };

      const result = await restoreStudentBackup(profileA.id, backup, 'merge');
      expect(result.success).toBe(true);

      const savedCourses: CreditSubjectItem[] = JSON.parse(
        localStorage.getItem(`academic_credits_subjects_${profileA.id}`) || '[]'
      );
      // Course Alpha merged + Course Beta appended = 2 total (not 3)
      expect(savedCourses.length).toBe(2);
      expect(savedCourses.some((c) => c.name === 'Course Alpha')).toBe(true);
      expect(savedCourses.some((c) => c.name === 'Course Beta')).toBe(true);
    });

    it('cleanly replaces current active profile records when replace strategy is confirmed', async () => {
      // Existing courses
      const existing: CreditSubjectItem[] = [
        {
          id: 'old-sub',
          profileId: profileA.id,
          name: 'Obsolete Course',
          category: 'programme_core',
          semester: 1,
          credits: 2,
          registeredCredits: 2,
          earnedCredits: 2,
          status: 'Completed',
          source: 'Manual',
          isVerified: true,
        },
      ];
      localStorage.setItem(`academic_credits_subjects_${profileA.id}`, JSON.stringify(existing));

      const backup: StudentBackupData = {
        version: '2.0.0',
        app: 'University Academic Calculator',
        exportTimestamp: new Date().toISOString(),
        sourceProfile: { id: profileA.id, name: profileA.name },
        credits: {
          subjects: [
            {
              id: 'fresh-sub',
              name: 'Brand New Restored Course',
              category: 'programme_core',
              semester: 1,
              credits: 4,
              registeredCredits: 4,
              earnedCredits: 4,
              status: 'Completed',
              source: 'Manual',
              isVerified: true,
            },
          ],
        },
        attendance: { subjects: [] },
        internals: {},
        calculations: [],
        companion: { tasks: [], planner: {}, forecaster: {} },
        preferences: {},
      };

      const result = await restoreStudentBackup(profileA.id, backup, 'replace');
      expect(result.success).toBe(true);

      const savedCourses: CreditSubjectItem[] = JSON.parse(
        localStorage.getItem(`academic_credits_subjects_${profileA.id}`) || '[]'
      );
      // Obsolete course is gone, only fresh restored course remains
      expect(savedCourses.length).toBe(1);
      expect(savedCourses[0].name).toBe('Brand New Restored Course');
    });
  });

  // 5. Profile Isolation
  describe('5. Profile Isolation', () => {
    it('restoring or resetting Profile A never modifies Profile B records', async () => {
      const coursesB: CreditSubjectItem[] = [
        {
          id: 'sub-b',
          profileId: profileB.id,
          name: 'Thermodynamics',
          category: 'programme_core',
          semester: 3,
          credits: 4,
          registeredCredits: 4,
          earnedCredits: 4,
          status: 'Completed',
          source: 'Manual',
          isVerified: true,
        },
      ];
      localStorage.setItem(`academic_credits_subjects_${profileB.id}`, JSON.stringify(coursesB));

      // Reset Profile A
      await resetStudentPersonalData(profileA.id);

      // Verify Profile A is cleared
      const rawA = localStorage.getItem(`academic_credits_subjects_${profileA.id}`);
      expect(JSON.parse(rawA || '[]').length).toBe(0);

      // Verify Profile B is completely untouched
      const rawB = localStorage.getItem(`academic_credits_subjects_${profileB.id}`);
      const savedB = JSON.parse(rawB || '[]');
      expect(savedB.length).toBe(1);
      expect(savedB[0].name).toBe('Thermodynamics');
    });
  });

  // 6. Safe Reset Personal Data
  describe('6. Safe Reset Personal Data', () => {
    it('resets personal data strictly to empty, while preserving shared catalogues', async () => {
      // Seed personal data
      localStorage.setItem(
        `academic_credits_subjects_${profileA.id}`,
        JSON.stringify([{ id: 'c1', name: 'Course 1', isVerified: true }])
      );
      localStorage.setItem(
        `academic_attendance_subjects_${profileA.id}`,
        JSON.stringify([{ id: 'a1', name: 'Subject 1' }])
      );
      // Seed shared catalogue
      localStorage.setItem(
        'academic_catalogue_VTR21',
        JSON.stringify([{ id: 'shared-cat-1', name: 'Shared Regulation Course' }])
      );

      const resetResult = await resetStudentPersonalData(profileA.id);
      expect(resetResult.success).toBe(true);

      // Personal records zeroed
      expect(JSON.parse(localStorage.getItem(`academic_credits_subjects_${profileA.id}`) || '[]').length).toBe(0);
      expect(JSON.parse(localStorage.getItem(`academic_attendance_subjects_${profileA.id}`) || '[]').length).toBe(0);

      // Shared catalogue preserved
      const sharedCat = JSON.parse(localStorage.getItem('academic_catalogue_VTR21') || '[]');
      expect(sharedCat.length).toBe(1);
      expect(sharedCat[0].name).toBe('Shared Regulation Course');
    });
  });

  // 7. Storage Breakdown
  describe('7. Storage Breakdown', () => {
    it('calculates storage breakdown accurately for active profile', async () => {
      localStorage.setItem(
        `academic_credits_subjects_${profileA.id}`,
        JSON.stringify([{ id: '1', name: 'Physics', credits: 4, isVerified: true }])
      );
      localStorage.setItem(
        `academic_attendance_subjects_${profileA.id}`,
        JSON.stringify([{ id: '1', name: 'Physics' }])
      );

      const breakdown = await getStorageBreakdown(profileA.id);
      expect(breakdown.creditsCount).toBe(1);
      expect(breakdown.attendanceCount).toBe(1);
      expect(breakdown.totalProfileBytes).toBeGreaterThan(0);
      expect(breakdown.formattedTotalBytes).toBeDefined();
    });
  });
});
