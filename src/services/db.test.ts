import { describe, it, expect } from 'vitest';
import {
  saveProfile,
  getProfile,
  deleteProfile,
  saveCalculation,
  getCalculationsByProfile,
  exportProfileData,
  importProfileData,
} from './db';
import type { StudentProfile, SavedCalculation } from '../types/profile';

describe('Storage & Multi-Student Isolation Service', () => {

  it('creates and retrieves separate student profiles', async () => {
    const studentA: StudentProfile = {
      id: 'profile-a',
      name: 'Alice Johnson',
      rollNumber: '21CS001',
      collegeName: 'Tech University',
      degree: 'B.Tech',
      department: 'Computer Science',
      degreePathway: 'standard',
      targetAttendance: 75,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const studentB: StudentProfile = {
      id: 'profile-b',
      name: 'Bob Smith',
      rollNumber: '21EC002',
      collegeName: 'State Institute',
      degree: 'B.E.',
      department: 'Electronics',
      degreePathway: 'honours',
      targetAttendance: 80,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await saveProfile(studentA);
    await saveProfile(studentB);

    const fetchedA = await getProfile('profile-a');
    const fetchedB = await getProfile('profile-b');

    expect(fetchedA?.name).toBe('Alice Johnson');
    expect(fetchedB?.name).toBe('Bob Smith');
    expect(fetchedA?.degreePathway).toBe('standard');
    expect(fetchedB?.degreePathway).toBe('honours');
  });

  it('strictly isolates calculations between profiles', async () => {
    const calcA: SavedCalculation = {
      id: 'calc-1',
      profileId: 'profile-a',
      type: 'sgpa',
      title: 'SGPA - Semester 3',
      resultValue: '8.90 / 10',
      resultSummary: '24 Credits',
      inputs: { subjects: [{ name: 'Math', credits: 4, grade: 'O' }] },
      isFavorite: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const calcB: SavedCalculation = {
      id: 'calc-2',
      profileId: 'profile-b',
      type: 'sgpa',
      title: 'SGPA - Semester 4',
      resultValue: '9.20 / 10',
      resultSummary: '22 Credits',
      inputs: { subjects: [{ name: 'DSP', credits: 4, grade: 'A+' }] },
      isFavorite: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await saveCalculation(calcA);
    await saveCalculation(calcB);

    const calcsForA = await getCalculationsByProfile('profile-a');
    const calcsForB = await getCalculationsByProfile('profile-b');

    expect(calcsForA.length).toBe(1);
    expect(calcsForA[0].id).toBe('calc-1');
    expect(calcsForA[0].resultValue).toBe('8.90 / 10');

    expect(calcsForB.length).toBe(1);
    expect(calcsForB[0].id).toBe('calc-2');
    expect(calcsForB[0].resultValue).toBe('9.20 / 10');
  });

  it('deletes one profile without affecting another student profile or data', async () => {
    const studentA: StudentProfile = {
      id: 'profile-a',
      name: 'Alice Johnson',
      degreePathway: 'standard',
      targetAttendance: 75,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const studentB: StudentProfile = {
      id: 'profile-b',
      name: 'Bob Smith',
      degreePathway: 'honours',
      targetAttendance: 80,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await saveProfile(studentA);
    await saveProfile(studentB);

    const calcA: SavedCalculation = {
      id: 'calc-1',
      profileId: 'profile-a',
      type: 'internals',
      title: 'Internals A',
      resultValue: '38 / 40',
      resultSummary: 'Theory',
      inputs: {},
      isFavorite: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const calcB: SavedCalculation = {
      id: 'calc-2',
      profileId: 'profile-b',
      type: 'attendance',
      title: 'Attendance B',
      resultValue: '85%',
      resultSummary: 'On track',
      inputs: {},
      isFavorite: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await saveCalculation(calcA);
    await saveCalculation(calcB);

    // Delete Student A
    await deleteProfile('profile-a');

    const profileA = await getProfile('profile-a');
    const profileB = await getProfile('profile-b');

    expect(profileA).toBeNull();
    expect(profileB).not.toBeNull();
    expect(profileB?.name).toBe('Bob Smith');

    const calcsForB = await getCalculationsByProfile('profile-b');
    expect(calcsForB.length).toBe(1);
    expect(calcsForB[0].title).toBe('Attendance B');
  });

  it('exports and imports student data safely', async () => {
    const studentA: StudentProfile = {
      id: 'profile-export-test',
      name: 'Charlie Brown',
      rollNumber: 'CB100',
      collegeName: 'Stanford',
      degree: 'B.S.',
      department: 'Math',
      degreePathway: 'standard',
      targetAttendance: 75,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await saveProfile(studentA);

    await saveCalculation({
      id: 'calc-exp-1',
      profileId: 'profile-export-test',
      type: 'cgpa',
      title: 'Overall CGPA',
      resultValue: '9.45 / 10',
      resultSummary: '4 Semesters',
      inputs: { semesters: [{ gpa: 9.45, credits: 80 }] },
      isFavorite: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    const exportData = await exportProfileData('profile-export-test');
    expect(exportData.profile.name).toBe('Charlie Brown');
    expect(exportData.calculations.length).toBe(1);

    const jsonString = JSON.stringify(exportData);
    const importRes = await importProfileData(jsonString, 'create_new');

    expect(importRes.success).toBe(true);
    expect(importRes.profileId).toBeDefined();

    if (importRes.profileId) {
      const importedCalcs = await getCalculationsByProfile(importRes.profileId);
      expect(importedCalcs.length).toBe(1);
      expect(importedCalcs[0].resultValue).toBe('9.45 / 10');
    }
  });

  it('isolates credit progress records between students', async () => {
    const studentA: StudentProfile = {
      id: 'student-credit-1',
      name: 'Diana Prince',
      degreePathway: 'honours',
      targetAttendance: 85,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    const studentB: StudentProfile = {
      id: 'student-credit-2',
      name: 'Bruce Wayne',
      degreePathway: 'standard',
      targetAttendance: 75,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await saveProfile(studentA);
    await saveProfile(studentB);

    await importProfileData(
      JSON.stringify({
        version: '1.0.0',
        exportDate: new Date().toISOString(),
        app: 'University Academic Calculator',
        profile: studentA,
        calculations: [],
        creditProgress: {
          profileId: 'student-credit-1',
          pathway: 'honours',
          targetCredits: 180,
          earnedCredits: 120,
          categories: [],
          updatedAt: Date.now(),
        },
      }),
      'replace'
    );

    const dataA = await exportProfileData('student-credit-1');
    const dataB = await exportProfileData('student-credit-2');

    expect(dataA.creditProgress?.earnedCredits).toBe(120);
    expect(dataB.creditProgress).toBeNull();
  });

  it('verifies fresh profile initializes without sample calculations or preloaded records', async () => {
    const freshStudent: StudentProfile = {
      id: 'fresh-student-99',
      name: 'Fresh Student',
      degreePathway: 'standard',
      targetAttendance: 75,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await saveProfile(freshStudent);

    const calcs = await getCalculationsByProfile('fresh-student-99');
    expect(calcs).toEqual([]);

    const exported = await exportProfileData('fresh-student-99');
    expect(exported.calculations).toEqual([]);
    expect(exported.creditProgress).toBeNull();
  });
});

