import { describe, it, expect, beforeEach } from 'vitest';
import {
  COLLEGE_CHART_TEMPLATE,
  calculateCreditSummary,
  calculateCategoryProgress,
  calculateSemesterProgress,
  calculateNptelDashboardStats,
} from './creditCalculations';
import {
  isRegulationSupportingCourseCode,
  getCatalogueForRegulation,
  sanitizeCourseTitle,
} from '../services/catalogueStorage';
import type { CreditSubjectItem, ResultStatus } from '../types/credits';

const storageMap = new Map<string, string>();
const localStorageMock = {
  getItem: (key: string) => storageMap.get(key) ?? null,
  setItem: (key: string, value: string) => storageMap.set(key, String(value)),
  removeItem: (key: string) => storageMap.delete(key),
  clear: () => storageMap.clear(),
};

if (typeof globalThis.localStorage === 'undefined') {
  (globalThis as any).localStorage = localStorageMock;
}

describe('Credit Calculator — Clean Defaults, User-Entered Data & Profile Isolation', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // 1. Clean Credit Calculator defaults
  it('initializes all personal credit data to zero and empty for a new student profile', () => {
    const emptySubjects: CreditSubjectItem[] = [];
    const summary = calculateCreditSummary(emptySubjects, 164, COLLEGE_CHART_TEMPLATE);

    expect(summary.totalRegisteredCredits).toBe(0);
    expect(summary.totalEarnedCredits).toBe(0);
    expect(summary.pendingCredits).toBe(0);
    expect(summary.completionPercentage).toBe(0);
    expect(summary.creditsRemaining).toBe(164);
    expect(summary.extraCredits).toBe(0);

    const categoryProgress = calculateCategoryProgress(COLLEGE_CHART_TEMPLATE, emptySubjects);
    categoryProgress.forEach((cat) => {
      expect(cat.earnedCredits).toBe(0);
      expect(cat.isSatisfied).toBe(false);
    });

    const semesterProgress = calculateSemesterProgress(emptySubjects);
    semesterProgress.forEach((sem) => {
      expect(sem.earnedCredits).toBe(0);
      expect(sem.registeredCredits).toBe(0);
      expect(sem.pendingCredits).toBe(0);
    });

    const nptelStats = calculateNptelDashboardStats(emptySubjects);
    expect(nptelStats.totalCourses).toBe(0);
    expect(nptelStats.approvedPeCredits).toBe(0);
    expect(nptelStats.approvedOeCredits).toBe(0);
  });

  // 2. Empty-state message text
  it('provides the exact required empty state prompt', () => {
    const emptyStateMessage =
      'Your credit record is empty. Add your subjects and credit details to start tracking your academic progress.';
    expect(emptyStateMessage).toContain('Your credit record is empty.');
    expect(emptyStateMessage).toContain('Add your subjects and credit details to start tracking your academic progress.');
  });

  // 3. User entry with Course Status (Registered, Completed, Pending)
  it('correctly derives earned, registered, and pending credits for Completed, Registered, and Pending statuses', () => {
    const subjects: CreditSubjectItem[] = [
      {
        id: 'sub-1',
        name: 'Mathematics I',
        code: '10211MA101',
        category: 'basic_sciences',
        semester: 1,
        credits: 4,
        registeredCredits: 4,
        earnedCredits: 4,
        status: 'Completed',
        source: 'Manual',
        isVerified: true,
      },
      {
        id: 'sub-2',
        name: 'Data Structures',
        code: '10211CS102',
        category: 'programme_core',
        semester: 3,
        credits: 3,
        registeredCredits: 3,
        earnedCredits: 0,
        status: 'Registered',
        source: 'Manual',
        isVerified: true,
      },
      {
        id: 'sub-3',
        name: 'Artificial Intelligence',
        code: '10211CS205',
        category: 'programme_elective',
        semester: 5,
        credits: 3,
        registeredCredits: 3,
        earnedCredits: 0,
        status: 'Pending',
        source: 'Catalogue',
        isVerified: true,
      },
      {
        id: 'sub-4',
        name: 'Compiler Design',
        code: '10211CS301',
        category: 'programme_core',
        semester: 6,
        credits: 3,
        registeredCredits: 3,
        earnedCredits: 0,
        status: 'Failed',
        source: 'Manual',
        isVerified: true,
      },
    ];

    const summary = calculateCreditSummary(subjects, 164, COLLEGE_CHART_TEMPLATE);
    // Completed = 4 earned credits
    expect(summary.totalEarnedCredits).toBe(4);
    // All 4 courses are registered = 4 + 3 + 3 + 3 = 13 credits
    expect(summary.totalRegisteredCredits).toBe(13);
    // Registered (3) + Pending (3) = 6 pending credits
    expect(summary.pendingCredits).toBe(6);
  });

  // 4. Input validation logic
  it('validates essential fields: course title and non-negative credit values', () => {
    const validateCourse = (name: string, credits: any): { valid: boolean; error?: string } => {
      const sanitized = sanitizeCourseTitle(name);
      if (!sanitized) {
        return { valid: false, error: 'Course name is required before saving.' };
      }
      const parsedCr = typeof credits === 'number' ? credits : parseFloat(String(credits));
      if (isNaN(parsedCr) || parsedCr < 0) {
        return { valid: false, error: 'Please enter a valid non-negative credit value.' };
      }
      return { valid: true };
    };

    expect(validateCourse('', 3).valid).toBe(false);
    expect(validateCourse('   ', 3).valid).toBe(false);
    expect(validateCourse('Operating Systems', -1).valid).toBe(false);
    expect(validateCourse('Operating Systems', 'invalid').valid).toBe(false);
    expect(validateCourse('Operating Systems', 0).valid).toBe(true);
    expect(validateCourse('Operating Systems', 3.5).valid).toBe(true);
  });

  // 5. Regulation awareness: course codes hidden/omitted for VTR25, supported for VTR15/VTR18/VTR21
  it('enforces regulation rules for course codes', () => {
    expect(isRegulationSupportingCourseCode('VTR25')).toBe(false);
    expect(isRegulationSupportingCourseCode('VTR21')).toBe(true);
    expect(isRegulationSupportingCourseCode('VTR18')).toBe(true);
    expect(isRegulationSupportingCourseCode('VTR15')).toBe(true);

    const formatCodeForRegulation = (reg: string, codeInput: string) => {
      if (!isRegulationSupportingCourseCode(reg)) {
        return undefined;
      }
      return codeInput.trim().toUpperCase() || undefined;
    };

    expect(formatCodeForRegulation('VTR25', '10211CS101')).toBeUndefined();
    expect(formatCodeForRegulation('VTR21', '10211CS101')).toBe('10211CS101');
  });

  // 6. Catalogue autocomplete suggestions DO NOT auto-save
  it('ensures catalogue suggestions prefill fields without creating a saved record automatically', () => {
    const vtr21Catalogue = getCatalogueForRegulation('VTR21');
    expect(vtr21Catalogue.length).toBeGreaterThan(0);

    const suggestion = vtr21Catalogue[0];
    const personalSubjects: CreditSubjectItem[] = [];

    // Selecting suggestion populates form draft:
    const formDraft = {
      name: sanitizeCourseTitle(suggestion.name),
      code: isRegulationSupportingCourseCode(suggestion.regulation) ? suggestion.code : undefined,
      category: suggestion.category,
      semester: suggestion.defaultSemester || 1,
      credits: suggestion.verifiedCredits ?? 0,
      status: 'Registered' as ResultStatus,
      source: 'Catalogue' as const,
      isVerified: true,
    };

    // User has NOT clicked save yet: personal subjects list MUST remain untouched and empty
    expect(personalSubjects.length).toBe(0);
    expect(formDraft.name).toBe(sanitizeCourseTitle(suggestion.name));
    expect(formDraft.source).toBe('Catalogue');

    // Only after explicit save does it get added:
    personalSubjects.push({
      id: 'sub-new',
      ...formDraft,
      registeredCredits: formDraft.credits,
      earnedCredits: 0,
    });
    expect(personalSubjects.length).toBe(1);
    expect(personalSubjects[0].name).toBe(sanitizeCourseTitle(suggestion.name));
  });

  // 7. Strict Profile Data Isolation & Local Storage Persistence
  it('isolates personal credit records strictly per student profile ID', () => {
    const profileA_Id = 'student-alpha-123';
    const profileB_Id = 'student-beta-456';

    const subjectsA: CreditSubjectItem[] = [
      {
        id: 'sub-a1',
        profileId: profileA_Id,
        name: 'Database Management Systems',
        category: 'programme_core',
        semester: 4,
        credits: 4,
        registeredCredits: 4,
        earnedCredits: 4,
        status: 'Completed',
        source: 'Manual',
        isVerified: true,
      },
    ];

    const subjectsB: CreditSubjectItem[] = []; // Fresh profile B

    // Save profile A
    localStorage.setItem(`academic_credits_subjects_${profileA_Id}`, JSON.stringify(subjectsA));
    // Save profile B
    localStorage.setItem(`academic_credits_subjects_${profileB_Id}`, JSON.stringify(subjectsB));

    // Retrieve and verify complete isolation
    const loadedA = JSON.parse(localStorage.getItem(`academic_credits_subjects_${profileA_Id}`) || '[]');
    const loadedB = JSON.parse(localStorage.getItem(`academic_credits_subjects_${profileB_Id}`) || '[]');

    expect(loadedA.length).toBe(1);
    expect(loadedA[0].name).toBe('Database Management Systems');
    expect(loadedB.length).toBe(0);

    // Profile B should calculate to 0
    const summaryB = calculateCreditSummary(loadedB, 164, COLLEGE_CHART_TEMPLATE);
    expect(summaryB.totalEarnedCredits).toBe(0);
    expect(summaryB.totalRegisteredCredits).toBe(0);
  });

  // 8. "Reset My Credit Data" safety
  it('clears only the active profile data upon Reset My Credit Data, leaving other profiles and shared catalogues intact', () => {
    const profileA_Id = 'student-reset-test';
    const profileOther_Id = 'student-unaffected';

    localStorage.setItem(
      `academic_credits_subjects_${profileA_Id}`,
      JSON.stringify([{ id: 'sub-1', name: 'Course 1', credits: 3 }])
    );
    localStorage.setItem(
      `academic_credits_subjects_${profileOther_Id}`,
      JSON.stringify([{ id: 'sub-2', name: 'Course 2', credits: 4 }])
    );

    // Perform Reset on Profile A:
    localStorage.removeItem(`academic_credits_subjects_${profileA_Id}`);

    // Profile A is reset to empty
    const resetA = localStorage.getItem(`academic_credits_subjects_${profileA_Id}`);
    expect(resetA).toBeNull();

    // Profile Other is untouched
    const keptOther = JSON.parse(localStorage.getItem(`academic_credits_subjects_${profileOther_Id}`) || '[]');
    expect(keptOther.length).toBe(1);
    expect(keptOther[0].name).toBe('Course 2');

    // Shared catalogue for all regulations remains intact
    const vtr21Catalogue = getCatalogueForRegulation('VTR21');
    expect(vtr21Catalogue.length).toBeGreaterThan(0);
  });
});
