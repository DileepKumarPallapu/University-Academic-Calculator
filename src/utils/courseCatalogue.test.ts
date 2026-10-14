import { describe, it, expect, beforeEach } from 'vitest';
import {
  INITIAL_VTR21_CATALOGUE,
  isRegulationSupportingCourseCode,
} from '../data/courseCatalogue';
import {
  getCatalogueForRegulation,
  saveCatalogueForRegulation,
  addCourseToCatalogue,
  updateCourseInCatalogue,
  deleteCourseFromCatalogue,
  resetCatalogueToDefaults,
  exportCatalogueToJSON,
  importCatalogueFromJSON,
  clearCatalogueStorage,
  sanitizeCourseTitle,
  safeGetItem,
  safeSetItem,
} from '../services/catalogueStorage';

describe('Regulation-Wise Course Catalogue', () => {
  beforeEach(() => {
    clearCatalogueStorage();
  });

  describe('1. Regulation Support & Code Display Rules', () => {
    it('supports course codes for VTR15, VTR18, and VTR21', () => {
      expect(isRegulationSupportingCourseCode('VTR15')).toBe(true);
      expect(isRegulationSupportingCourseCode('VTR18')).toBe(true);
      expect(isRegulationSupportingCourseCode('VTR21')).toBe(true);
      expect(isRegulationSupportingCourseCode('VTRUGE2021')).toBe(true);
    });

    it('strictly omits course codes for VTR25', () => {
      expect(isRegulationSupportingCourseCode('VTR25')).toBe(false);
      expect(isRegulationSupportingCourseCode('vtr25')).toBe(false);
    });
  });

  describe('2. Initial Seed Catalogues & Isolation', () => {
    it('seeds VTR21 with verified courses from official reports', () => {
      const vtr21 = getCatalogueForRegulation('VTR21');
      expect(vtr21.length).toBeGreaterThan(50);

      // Verify specific courses from VTU24654 & VTU29962
      const biology = vtr21.find((c) => c.code === '10210BM101');
      expect(biology).toBeDefined();
      expect(biology?.name).toBe('Biology for Engineers');
      expect(biology?.category).toBe('foundation');
      expect(biology?.verifiedCredits).toBe(2);

      const math = vtr21.find((c) => c.code === '10210MA101');
      expect(math?.name).toBe('Linear Algebra for Computing');
      expect(math?.verifiedCredits).toBe(4);

      const dsa = vtr21.find((c) => c.code === '10211CS102');
      expect(dsa?.name).toBe('Data Structures');
      expect(dsa?.category).toBe('programme_core');

      const mandatory = vtr21.find((c) => c.code === '10217GE901');
      expect(mandatory?.name).toBe('Engineers and Society');
      expect(mandatory?.verifiedCredits).toBe(0);
    });

    it('initializes VTR15, VTR18, and VTR25 as empty catalogues', () => {
      expect(getCatalogueForRegulation('VTR15')).toHaveLength(0);
      expect(getCatalogueForRegulation('VTR18')).toHaveLength(0);
      expect(getCatalogueForRegulation('VTR25')).toHaveLength(0);
    });
  });

  describe('3. Distinct Courses & Clean Title Verification', () => {
    it('preserves both ME104 and ME103 as distinct courses with clean titles', () => {
      const vtr21 = getCatalogueForRegulation('VTR21');
      const me104 = vtr21.find((c) => c.code === '10210ME104');
      const me103 = vtr21.find((c) => c.code === '10210ME103');

      expect(me104).toBeDefined();
      expect(me104?.name).toBe('Project Management and Finance');

      expect(me103).toBeDefined();
      expect(me103?.name).toBe('Innovation and Entrepreneurship');
    });

    it('preserves branch-specific differences (CS204 OOP Java vs CS226 Java Programming) with clean titles', () => {
      const vtr21 = getCatalogueForRegulation('VTR21');
      const cs204 = vtr21.find((c) => c.code === '10211CS204');
      const cs226 = vtr21.find((c) => c.code === '10211CS226');

      expect(cs204).toBeDefined();
      expect(cs204?.name).toBe('Object Oriented Programming using Java');

      expect(cs226).toBeDefined();
      expect(cs226?.name).toBe('Java Programming');
    });
  });

  describe('4. VTR25 Behavior — Never Invent or Display Codes', () => {
    it('strips code when saving courses in VTR25', () => {
      const result = addCourseToCatalogue('VTR25', {
        category: 'programme_core',
        name: 'Advanced Deep Learning',
        code: 'SHOULD_BE_IGNORED_123',
        isVerified: true,
        source: 'Manual',
      });

      expect(result.success).toBe(true);
      expect(result.course?.code).toBeUndefined();

      const vtr25Courses = getCatalogueForRegulation('VTR25');
      expect(vtr25Courses).toHaveLength(1);
      expect(vtr25Courses[0].name).toBe('Advanced Deep Learning');
      expect(vtr25Courses[0].code).toBeUndefined();
    });
  });

  describe('5. Adding, Editing, Deleting, and Persistence', () => {
    it('adds a new course to VTR18 and persists to localStorage', () => {
      const addRes = addCourseToCatalogue('VTR18', {
        category: 'foundation',
        code: '18MAT11',
        name: 'Calculus and Linear Algebra',
        verifiedCredits: 4,
        source: 'Manual',
        isVerified: true,
      });

      expect(addRes.success).toBe(true);
      expect(addRes.course?.code).toBe('18MAT11');

      // Check re-fetch
      const fetched = getCatalogueForRegulation('VTR18');
      expect(fetched).toHaveLength(1);
      expect(fetched[0].code).toBe('18MAT11');
      expect(fetched[0].name).toBe('Calculus and Linear Algebra');
    });

    it('prevents adding duplicate course codes in VTR21', () => {
      const res = addCourseToCatalogue('VTR21', {
        category: 'foundation',
        code: '10210BM101', // already exists
        name: 'Duplicate Biology',
        isVerified: false,
        source: 'Manual',
      });

      expect(res.success).toBe(false);
      expect(res.error).toContain('already exists');
    });

    it('updates an existing course in catalogue', () => {
      const vtr21 = getCatalogueForRegulation('VTR21');
      const first = { ...vtr21[0], notes: 'Updated course syllabus reference' };

      const updateRes = updateCourseInCatalogue('VTR21', first);
      expect(updateRes.success).toBe(true);

      const reloaded = getCatalogueForRegulation('VTR21');
      expect(reloaded[0].notes).toBe('Updated course syllabus reference');
    });

    it('deletes a course from catalogue', () => {
      const vtr21 = getCatalogueForRegulation('VTR21');
      const target = vtr21[0];

      const delRes = deleteCourseFromCatalogue('VTR21', target.id);
      expect(delRes.success).toBe(true);

      const after = getCatalogueForRegulation('VTR21');
      expect(after.find((c) => c.id === target.id)).toBeUndefined();
    });

    it('resets catalogue to default seed', () => {
      // Delete something
      const vtr21 = getCatalogueForRegulation('VTR21');
      deleteCourseFromCatalogue('VTR21', vtr21[0].id);
      expect(getCatalogueForRegulation('VTR21').length).toBe(vtr21.length - 1);

      // Reset
      resetCatalogueToDefaults('VTR21');
      expect(getCatalogueForRegulation('VTR21').length).toBe(INITIAL_VTR21_CATALOGUE.length);
    });
  });

  describe('6. JSON Export & Import', () => {
    it('exports and imports catalogue without data loss', () => {
      const json = exportCatalogueToJSON('VTR21');
      expect(json).toContain('10210BM101');
      expect(json).toContain('Biology for Engineers');

      // Clear VTR21
      saveCatalogueForRegulation('VTR21', []);
      expect(getCatalogueForRegulation('VTR21')).toHaveLength(0);

      // Re-import
      const impRes = importCatalogueFromJSON('VTR21', json);
      expect(impRes.success).toBe(true);
      expect(impRes.count).toBe(INITIAL_VTR21_CATALOGUE.length);
      expect(getCatalogueForRegulation('VTR21').length).toBe(INITIAL_VTR21_CATALOGUE.length);
    });
  });

  describe('7. Title Sanitization & Data Quality (Scenarios B, F, G)', () => {
    it('removes report sentences and student IDs from course titles', () => {
      const dirty = 'Listed in VTU24654 (CSE); VTU29962 (CSE AIML) took 10211CS226 Java Programming.';
      expect(sanitizeCourseTitle(dirty)).toBe('Java Programming');

      const dirty2 = '10211CS204 Object Oriented Programming using Java';
      expect(sanitizeCourseTitle(dirty2)).toBe('Object Oriented Programming using Java');

      const clean = 'Java Programming';
      expect(sanitizeCourseTitle(clean)).toBe('Java Programming');
    });

    it('Scenario B: Autocomplete does not populate personal student records', () => {
      const vtr21 = getCatalogueForRegulation('VTR21');
      const java = vtr21.find((c) => c.code === '10211CS226');
      expect(java).toBeDefined();
      expect(java?.name).toBe('Java Programming');
      expect(java?.code).toBe('10211CS226');
      expect(java?.verifiedCredits).toBe(3);

      // In autocomplete, selecting this gives prefilled data, but student personal storage remains untouched
      const profileKey = 'academic_credits_subjects_student_test';
      expect(safeGetItem(profileKey)).toBeNull();
    });

    it('Scenario C & D: Explicit save isolates data between separate profiles', () => {
      const profileA = 'student_A';
      const profileB = 'student_B';

      const courseA = {
        id: 'sub-1',
        profileId: profileA,
        name: 'Java Programming',
        code: '10211CS226',
        category: 'programme_core',
        semester: 3,
        credits: 3,
        registeredCredits: 3,
        earnedCredits: 3,
        status: 'Passed' as const,
        isVerified: true,
        source: 'Catalogue' as const,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      // Save for Student A
      safeSetItem(`academic_credits_subjects_${profileA}`, JSON.stringify([courseA]));

      // Student B storage must be empty
      const rawB = safeGetItem(`academic_credits_subjects_${profileB}`);
      const studentBCourses = rawB ? JSON.parse(rawB) : [];
      expect(studentBCourses).toHaveLength(0);

      // Student A storage still has 1 course
      const rawA = safeGetItem(`academic_credits_subjects_${profileA}`);
      const studentACourses = JSON.parse(rawA!);
      expect(studentACourses).toHaveLength(1);
      expect(studentACourses[0].name).toBe('Java Programming');
    });

    it('Scenario F: Regulation code display behavior', () => {
      expect(isRegulationSupportingCourseCode('VTR21')).toBe(true);
      expect(isRegulationSupportingCourseCode('VTR18')).toBe(true);
      expect(isRegulationSupportingCourseCode('VTR15')).toBe(true);
      expect(isRegulationSupportingCourseCode('VTR25')).toBe(false);

      // Missing/unseeded catalogues are empty and do not fabricate courses
      expect(getCatalogueForRegulation('VTR15')).toHaveLength(0);
      expect(getCatalogueForRegulation('VTR18')).toHaveLength(0);
      expect(getCatalogueForRegulation('VTR25')).toHaveLength(0);
    });

    it('Scenario G: Verified seed catalogue does not have student names in course titles', () => {
      const vtr21 = getCatalogueForRegulation('VTR21');
      for (const course of vtr21) {
        expect(course.name).not.toMatch(/VTU\d+/);
        expect(course.name).not.toMatch(/Listed in/i);
        expect(course.name).not.toMatch(/took/i);
        expect(course.name).not.toMatch(/PALLAPU/i);
      }
    });
  });
});
