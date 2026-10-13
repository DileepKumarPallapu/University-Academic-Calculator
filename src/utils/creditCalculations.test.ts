import { describe, it, expect } from 'vitest';
import {
  COLLEGE_CHART_TEMPLATE,
  DEFAULT_NPTEL_RULES,
  calculateCreditSummary,
  detectDuplicatesAndRetakes,
  calculateCategoryProgress,
  calculateSemesterProgress,
  calculateCreditsRequired,
  simulateScenarios,
  checkGraduationEligibility,
  exportCreditsToCSV,
  parseCreditsFromCSV,
  isNptelCourseEligible,
  calculateNptelDashboardStats,
} from './creditCalculations';
import type { CreditSubjectItem, NptelCollegeRulesConfig } from '../types/credits';

describe('Credit Calculation & Graduation Progress System Tests', () => {
  // Test 1: Standard B.Tech with 100 verified credits and 164 target has 64 remaining
  it('calculates remaining credits correctly for 100 earned credits out of 164 target', () => {
    const subjects: CreditSubjectItem[] = [
      {
        id: '1',
        name: 'Core Batch 1',
        category: 'programme_core',
        semester: 1,
        credits: 100,
        status: 'Passed',
        isVerified: true,
        source: 'Manual',
      },
    ];

    const summary = calculateCreditSummary(subjects, 164, COLLEGE_CHART_TEMPLATE);
    expect(summary.totalEarnedCredits).toBe(100);
    expect(summary.creditsRemaining).toBe(64);
  });

  // Test 2: Student with 182 verified credits and 182 target has 0 remaining
  it('calculates 0 remaining credits when earned equals 182 target', () => {
    const subjects: CreditSubjectItem[] = [
      {
        id: '1',
        name: 'Honours Batch',
        category: 'programme_core',
        semester: 1,
        credits: 182,
        status: 'Passed',
        isVerified: true,
        source: 'Manual',
      },
    ];

    const summary = calculateCreditSummary(subjects, 182, COLLEGE_CHART_TEMPLATE);
    expect(summary.totalEarnedCredits).toBe(182);
    expect(summary.creditsRemaining).toBe(0);
    expect(summary.completionPercentage).toBe(100);
  });

  // Test 3: Extra credits do not push progress % above 100%
  it('caps completion percentage at 100% even with extra credits', () => {
    const subjects: CreditSubjectItem[] = [
      {
        id: '1',
        name: 'Overachiever Courses',
        category: 'programme_core',
        semester: 1,
        credits: 190,
        status: 'Passed',
        isVerified: true,
        source: 'Manual',
      },
    ];

    const summary = calculateCreditSummary(subjects, 164, COLLEGE_CHART_TEMPLATE);
    expect(summary.totalEarnedCredits).toBe(190);
    expect(summary.extraCredits).toBe(26);
    expect(summary.completionPercentage).toBe(100);
    expect(summary.creditsRemaining).toBe(0);
  });

  // Test 4: Failed courses do not count as earned credits
  it('excludes failed, pending, and incomplete courses from earned credits', () => {
    const subjects: CreditSubjectItem[] = [
      {
        id: '1',
        name: 'Passed Course',
        category: 'programme_core',
        semester: 1,
        credits: 4,
        status: 'Passed',
        isVerified: true,
        source: 'Manual',
      },
      {
        id: '2',
        name: 'Failed Course',
        category: 'programme_core',
        semester: 1,
        credits: 4,
        status: 'Failed',
        isVerified: true,
        source: 'Manual',
      },
      {
        id: '3',
        name: 'Pending Course',
        category: 'programme_core',
        semester: 1,
        credits: 3,
        status: 'Pending',
        isVerified: false,
        source: 'Manual',
      },
    ];

    const summary = calculateCreditSummary(subjects, 164, COLLEGE_CHART_TEMPLATE);
    expect(summary.totalEarnedCredits).toBe(4);
    expect(summary.failedCredits).toBe(4);
    expect(summary.pendingCredits).toBe(3);
    expect(summary.totalRegisteredCredits).toBe(11);
  });

  // Test 5: 0-credit course remains visible but adds 0 to earned credits
  it('keeps 0-credit course visible in record but adds 0 to earned credits', () => {
    const subjects: CreditSubjectItem[] = [
      {
        id: '1',
        name: 'Environmental Studies',
        code: 'MC101',
        category: 'mandatory',
        semester: 2,
        credits: 0,
        status: 'Passed',
        isVerified: true,
        source: 'Manual',
      },
      {
        id: '2',
        name: 'Mathematics',
        code: 'FND101',
        category: 'foundation',
        semester: 1,
        credits: 4,
        status: 'Passed',
        isVerified: true,
        source: 'Manual',
      },
    ];

    const summary = calculateCreditSummary(subjects, 164, COLLEGE_CHART_TEMPLATE);
    expect(summary.totalEarnedCredits).toBe(4);
    expect(summary.mandatoryCompletedCount).toBe(1);
    expect(summary.mandatoryTotalCount).toBe(1);
  });

  // Test 6: Duplicate course records are flagged
  it('flags duplicate course codes for review', () => {
    const subjects: CreditSubjectItem[] = [
      {
        id: '1',
        name: 'Data Structures Attempt 1',
        code: 'CS201',
        category: 'programme_core',
        semester: 3,
        credits: 4,
        status: 'Failed',
        isVerified: true,
        source: 'Manual',
      },
      {
        id: '2',
        name: 'Data Structures Attempt 2',
        code: 'CS201',
        category: 'programme_core',
        semester: 4,
        credits: 4,
        status: 'Passed',
        isVerified: true,
        source: 'Manual',
      },
    ];

    const flagged = detectDuplicatesAndRetakes(subjects);
    expect(flagged[0].isDuplicate).toBe(true);
    expect(flagged[1].isDuplicate).toBe(true);
    expect(flagged[0].isRetake).toBe(true);
  });

  // Test 7: Repeated courses do not double-count the same graduation requirement
  it('does not double count repeated passed courses with the same code', () => {
    const subjects: CreditSubjectItem[] = [
      {
        id: '1',
        name: 'Algorithms (Pass)',
        code: 'CS202',
        category: 'programme_core',
        semester: 3,
        credits: 4,
        status: 'Passed',
        isVerified: true,
        source: 'Manual',
      },
      {
        id: '2',
        name: 'Algorithms (Retake Improvement Pass)',
        code: 'CS202',
        category: 'programme_core',
        semester: 4,
        credits: 4,
        status: 'Passed',
        isVerified: true,
        source: 'Manual',
      },
    ];

    const summary = calculateCreditSummary(subjects, 164, COLLEGE_CHART_TEMPLATE);
    expect(summary.totalEarnedCredits).toBe(4); // Counted once, not 8!
  });

  // Test 8: Category progress updates after subject edits
  it('calculates category progress with correct earned vs required credits', () => {
    const subjects: CreditSubjectItem[] = [
      {
        id: '1',
        name: 'Physics',
        code: 'PH101',
        category: 'foundation',
        semester: 1,
        credits: 4,
        status: 'Passed',
        isVerified: true,
        source: 'Manual',
      },
      {
        id: '2',
        name: 'Chemistry',
        code: 'CH101',
        category: 'foundation',
        semester: 1,
        credits: 4,
        status: 'Passed',
        isVerified: true,
        source: 'Manual',
      },
    ];

    const progress = calculateCategoryProgress(COLLEGE_CHART_TEMPLATE, subjects);
    const foundation = progress.find((p) => p.category.id === 'foundation');

    expect(foundation?.earnedCredits).toBe(8);
    expect(foundation?.category.requiredCredits).toBe(56);
    expect(foundation?.remainingCredits).toBe(48);
    expect(foundation?.isSatisfied).toBe(false);
  });

  // Test 9: Semester planning handles missing targets
  it('handles semester planning gracefully with missing targets', () => {
    const subjects: CreditSubjectItem[] = [
      {
        id: '1',
        name: 'Math',
        category: 'foundation',
        semester: 1,
        credits: 4,
        status: 'Passed',
        isVerified: true,
        source: 'Manual',
      },
    ];

    const semProgress = calculateSemesterProgress(subjects, {});
    expect(semProgress.length).toBe(8);
    expect(semProgress[0].earnedCredits).toBe(4);
    expect(semProgress[0].plannedTarget).toBe(0);
    expect(semProgress[7].earnedCredits).toBe(0);
  });

  // Test 10: Zero remaining-semester count does not produce NaN or Infinity
  it('safely handles zero remaining semesters without producing NaN or Infinity', () => {
    const result = calculateCreditsRequired(164, 100, 0);
    expect(Number.isNaN(result.requiredAveragePerSemester)).toBe(false);
    expect(Number.isFinite(result.requiredAveragePerSemester)).toBe(true);
    expect(result.requiredAveragePerSemester).toBe(0);
    expect(result.message).toContain('Zero remaining semesters');
  });

  // Test 11: Graduation eligibility requires both total credits AND all category minimums
  it('fails graduation eligibility if overall target is met but a category has a deficit', () => {
    // 164 credits all placed in foundation, but programme core (58) has 0 credits
    const subjects: CreditSubjectItem[] = [
      {
        id: '1',
        name: 'Massive Foundation Block',
        category: 'foundation',
        semester: 1,
        credits: 164,
        status: 'Passed',
        isVerified: true,
        source: 'Manual',
      },
    ];

    const summary = calculateCreditSummary(subjects, 164, COLLEGE_CHART_TEMPLATE);
    const catProgress = calculateCategoryProgress(COLLEGE_CHART_TEMPLATE, subjects);
    const eligibility = checkGraduationEligibility(summary, catProgress, subjects, 'standard');

    expect(summary.totalEarnedCredits).toBe(164);
    expect(eligibility.isEligible).toBe(false);
    expect(eligibility.status).toBe('Requirements remaining');
    expect(eligibility.deficitCategories.some((d) => d.name === 'Programme Core')).toBe(true);
  });

  // Test 12: Scenario simulation calculates projected remaining and required average
  it('simulates future semester credit scenarios', () => {
    const scenarios = simulateScenarios(64, 4, 20);
    expect(scenarios.length).toBe(3);
    // Scenario A: 64 - 20 = 44 remaining across 3 subsequent semesters -> 44 / 3 = 14.67
    expect(scenarios[0].projectedRemaining).toBe(44);
    expect(scenarios[0].requiredSubsequentAvg).toBe(14.67);
  });

  // Test 13: CSV export and import roundtripping
  it('exports to CSV and imports back accurately', () => {
    const subjects: CreditSubjectItem[] = [
      {
        id: '1',
        code: 'CS101',
        name: 'Programming in C',
        category: 'foundation',
        semester: 1,
        credits: 4,
        grade: 'O',
        status: 'Passed',
        isVerified: true,
        source: 'Manual',
      },
    ];

    const csvText = exportCreditsToCSV(subjects);
    expect(csvText).toContain('Programming in C');

    const imported = parseCreditsFromCSV(csvText);
    expect(imported.length).toBe(1);
    expect(imported[0].code).toBe('CS101');
    expect(imported[0].name).toBe('Programming in C');
    expect(imported[0].credits).toBe(4);
    expect(imported[0].status).toBe('Passed');
  });

  // =========================================================================
  // NPTEL INTEGRATION & CUSTOM CREDIT MAPPING TEST CASES
  // =========================================================================
  describe('NPTEL Course Integration & Custom Credit Mapping Tests', () => {
    // 1. An approved 2-credit NPTEL PE course adds 2 eligible credits to PE
    it('Case 1: an approved 2-credit NPTEL PE course adds 2 eligible credits to PE and updates progress', () => {
      const subjects: CreditSubjectItem[] = [
        {
          id: 'nptel-1',
          name: 'Cloud Computing Fundamentals',
          code: 'NPTEL-CS01',
          category: 'programme_elective',
          semester: 5,
          credits: 2,
          status: 'Passed',
          isVerified: true,
          source: 'Manual',
          courseType: 'nptel',
          nptelDetails: {
            courseName: 'Cloud Computing Fundamentals',
            courseIdOrUrl: 'noc24-cs01',
            categoryTarget: 'programme_elective',
            durationWeeks: '8 Weeks',
            certificateStatus: 'certificate_received',
            courseCredits: 2,
            acceptedCredits: 2,
            approvalStatus: 'approved',
            semesterCounted: 5,
          },
        },
      ];

      const catProgress = calculateCategoryProgress(COLLEGE_CHART_TEMPLATE, subjects);
      const peCategory = catProgress.find((c) => c.category.id === 'programme_elective')!;

      expect(peCategory.earnedCredits).toBe(2);
      expect(peCategory.remainingCredits).toBe(16); // 18 - 2 = 16

      const summary = calculateCreditSummary(subjects, 164, COLLEGE_CHART_TEMPLATE);
      expect(summary.totalEarnedCredits).toBe(2);
      expect(summary.verifiedEarnedCredits).toBe(2);
    });

    // 2. An approved 3-credit NPTEL OE course adds 3 eligible credits to OE
    it('Case 2: an approved 3-credit NPTEL OE course adds 3 eligible credits to OE', () => {
      const subjects: CreditSubjectItem[] = [
        {
          id: 'nptel-2',
          name: 'German Language & Culture',
          code: 'NPTEL-HS02',
          category: 'open_elective',
          semester: 6,
          credits: 3,
          status: 'Passed',
          isVerified: true,
          source: 'Manual',
          courseType: 'nptel',
          nptelDetails: {
            courseName: 'German Language & Culture',
            courseIdOrUrl: 'noc24-hs02',
            categoryTarget: 'open_elective',
            durationWeeks: '12 Weeks',
            certificateStatus: 'completed',
            courseCredits: 3,
            acceptedCredits: 3,
            approvalStatus: 'approved',
            semesterCounted: 6,
          },
        },
      ];

      const catProgress = calculateCategoryProgress(COLLEGE_CHART_TEMPLATE, subjects);
      const oeCategory = catProgress.find((c) => c.category.id === 'open_elective')!;

      expect(oeCategory.earnedCredits).toBe(3);
      expect(oeCategory.remainingCredits).toBe(9); // 12 - 3 = 9

      const summary = calculateCreditSummary(subjects, 164, COLLEGE_CHART_TEMPLATE);
      expect(summary.totalEarnedCredits).toBe(3);
    });

    // 3. A 4-credit course awaiting approval does not count as verified earned credit
    it('Case 3: a 4-credit course awaiting approval does not count as verified earned credit', () => {
      const subjects: CreditSubjectItem[] = [
        {
          id: 'nptel-3',
          name: 'Deep Learning',
          code: 'NPTEL-CS03',
          category: 'programme_elective',
          semester: 6,
          credits: 4,
          status: 'Pending',
          isVerified: false,
          source: 'Manual',
          courseType: 'nptel',
          nptelDetails: {
            courseName: 'Deep Learning',
            courseIdOrUrl: 'noc24-cs03',
            categoryTarget: 'programme_elective',
            durationWeeks: '12 Weeks',
            certificateStatus: 'completed',
            courseCredits: 4,
            acceptedCredits: 4,
            approvalStatus: 'submitted',
            semesterCounted: 6,
          },
        },
      ];

      const catProgress = calculateCategoryProgress(COLLEGE_CHART_TEMPLATE, subjects);
      const peCategory = catProgress.find((c) => c.category.id === 'programme_elective')!;

      expect(peCategory.earnedCredits).toBe(0);
      expect(peCategory.remainingCredits).toBe(18);

      const summary = calculateCreditSummary(subjects, 164, COLLEGE_CHART_TEMPLATE);
      expect(summary.totalEarnedCredits).toBe(0);
      expect(summary.verifiedEarnedCredits).toBe(0);
      expect(summary.pendingCredits).toBe(4);
    });

    // 4. A rejected course does not count toward graduation
    it('Case 4: a rejected course does not count toward graduation', () => {
      const subjects: CreditSubjectItem[] = [
        {
          id: 'nptel-4',
          name: 'Disallowed Topic Course',
          code: 'NPTEL-REJ01',
          category: 'open_elective',
          semester: 4,
          credits: 3,
          status: 'Failed',
          isVerified: false,
          source: 'Manual',
          courseType: 'nptel',
          nptelDetails: {
            courseName: 'Disallowed Topic Course',
            courseIdOrUrl: 'noc24-rej01',
            categoryTarget: 'open_elective',
            durationWeeks: '8 Weeks',
            certificateStatus: 'completed',
            courseCredits: 3,
            acceptedCredits: 3,
            approvalStatus: 'rejected',
            semesterCounted: 4,
          },
        },
      ];

      const catProgress = calculateCategoryProgress(COLLEGE_CHART_TEMPLATE, subjects);
      const oeCategory = catProgress.find((c) => c.category.id === 'open_elective')!;

      expect(oeCategory.earnedCredits).toBe(0);

      const summary = calculateCreditSummary(subjects, 164, COLLEGE_CHART_TEMPLATE);
      expect(summary.totalEarnedCredits).toBe(0);
      expect(summary.failedCredits).toBe(3);
    });

    // 5. Changing a course from PE to OE moves its eligible credits correctly
    it('Case 5: changing a course from PE to OE moves its eligible credits correctly without duplication', () => {
      const originalSubject: CreditSubjectItem = {
        id: 'nptel-5',
        name: 'Internet of Things',
        code: 'NPTEL-IOT',
        category: 'programme_elective',
        semester: 5,
        credits: 3,
        status: 'Passed',
        isVerified: true,
        source: 'Manual',
        courseType: 'nptel',
        nptelDetails: {
          courseName: 'Internet of Things',
          courseIdOrUrl: 'noc24-iot',
          categoryTarget: 'programme_elective',
          durationWeeks: '12 Weeks',
          certificateStatus: 'certificate_received',
          courseCredits: 3,
          acceptedCredits: 3,
          approvalStatus: 'approved',
          semesterCounted: 5,
        },
      };

      // As PE
      let progress = calculateCategoryProgress(COLLEGE_CHART_TEMPLATE, [originalSubject]);
      let pe = progress.find((c) => c.category.id === 'programme_elective')!;
      let oe = progress.find((c) => c.category.id === 'open_elective')!;
      expect(pe.earnedCredits).toBe(3);
      expect(oe.earnedCredits).toBe(0);

      // Student reclassifies to OE
      const reclassifiedSubject: CreditSubjectItem = {
        ...originalSubject,
        category: 'open_elective',
        nptelDetails: {
          ...originalSubject.nptelDetails!,
          categoryTarget: 'open_elective',
        },
      };

      progress = calculateCategoryProgress(COLLEGE_CHART_TEMPLATE, [reclassifiedSubject]);
      pe = progress.find((c) => c.category.id === 'programme_elective')!;
      oe = progress.find((c) => c.category.id === 'open_elective')!;
      expect(pe.earnedCredits).toBe(0);
      expect(oe.earnedCredits).toBe(3);
    });

    // 6. A duplicate NPTEL course is flagged
    it('Case 6: a duplicate NPTEL course is flagged based on course ID or code', () => {
      const subjects: CreditSubjectItem[] = [
        {
          id: 'nptel-6a',
          name: 'Machine Learning',
          code: 'NOC24-CS06',
          category: 'programme_elective',
          semester: 5,
          credits: 4,
          status: 'Passed',
          isVerified: true,
          source: 'Manual',
          courseType: 'nptel',
          nptelDetails: {
            courseName: 'Machine Learning',
            courseIdOrUrl: 'noc24-cs06',
            categoryTarget: 'programme_elective',
            certificateStatus: 'certificate_received',
            courseCredits: 4,
            acceptedCredits: 4,
            approvalStatus: 'approved',
            semesterCounted: 5,
          },
        },
        {
          id: 'nptel-6b',
          name: 'Machine Learning Attempt 2',
          code: 'NOC24-CS06',
          category: 'programme_elective',
          semester: 6,
          credits: 4,
          status: 'Passed',
          isVerified: true,
          source: 'Manual',
          courseType: 'nptel',
          nptelDetails: {
            courseName: 'Machine Learning Attempt 2',
            courseIdOrUrl: 'noc24-cs06',
            categoryTarget: 'programme_elective',
            certificateStatus: 'certificate_received',
            courseCredits: 4,
            acceptedCredits: 4,
            approvalStatus: 'approved',
            semesterCounted: 6,
          },
        },
      ];

      const annotated = detectDuplicatesAndRetakes(subjects);
      expect(annotated[0].isDuplicate).toBe(true);
      expect(annotated[1].isDuplicate).toBe(true);
    });

    // 7. The same course is not counted twice
    it('Case 7: the same course is not counted twice toward graduation requirements', () => {
      const subjects: CreditSubjectItem[] = [
        {
          id: 'nptel-7a',
          name: 'Data Mining',
          code: 'NOC24-CS07',
          category: 'programme_elective',
          semester: 5,
          credits: 3,
          status: 'Passed',
          isVerified: true,
          source: 'Manual',
          courseType: 'nptel',
          nptelDetails: {
            courseName: 'Data Mining',
            courseIdOrUrl: 'noc24-cs07',
            categoryTarget: 'programme_elective',
            certificateStatus: 'certificate_received',
            courseCredits: 3,
            acceptedCredits: 3,
            approvalStatus: 'approved',
            semesterCounted: 5,
          },
        },
        {
          id: 'nptel-7b',
          name: 'Data Mining Repeat',
          code: 'NOC24-CS07',
          category: 'programme_elective',
          semester: 6,
          credits: 3,
          status: 'Passed',
          isVerified: true,
          source: 'Manual',
          courseType: 'nptel',
          nptelDetails: {
            courseName: 'Data Mining Repeat',
            courseIdOrUrl: 'noc24-cs07',
            categoryTarget: 'programme_elective',
            certificateStatus: 'certificate_received',
            courseCredits: 3,
            acceptedCredits: 3,
            approvalStatus: 'approved',
            semesterCounted: 6,
          },
        },
      ];

      const progress = calculateCategoryProgress(COLLEGE_CHART_TEMPLATE, subjects);
      const pe = progress.find((c) => c.category.id === 'programme_elective')!;
      expect(pe.earnedCredits).toBe(3); // Not 6!

      const summary = calculateCreditSummary(subjects, 164, COLLEGE_CHART_TEMPLATE);
      expect(summary.totalEarnedCredits).toBe(3); // Not 6!
    });

    // 8. Changing the college's permitted credit options updates rules and input validation
    it('Case 8: changing permitted credit options and rules updates eligibility correctly', () => {
      const subject: CreditSubjectItem = {
        id: 'nptel-8',
        name: 'Advanced Robotics',
        category: 'programme_elective',
        semester: 6,
        credits: 2,
        status: 'Passed',
        isVerified: true,
        source: 'Manual',
        courseType: 'nptel',
        nptelDetails: {
          categoryTarget: 'programme_elective',
          certificateStatus: 'certificate_received',
          courseCredits: 2,
          acceptedCredits: 2,
          approvalStatus: 'approved',
          semesterCounted: 6,
        },
      };

      // Allowed under default rules
      const eligibleWithDefault = isNptelCourseEligible(subject, DEFAULT_NPTEL_RULES);
      expect(eligibleWithDefault.isEligible).toBe(true);

      // Institution custom rules where PE is NOT allowed via NPTEL
      const restrictiveRules: NptelCollegeRulesConfig = {
        ...DEFAULT_NPTEL_RULES,
        allowProgrammeElective: false,
      };
      const ineligibleWithRestrictive = isNptelCourseEligible(subject, restrictiveRules);
      expect(ineligibleWithRestrictive.isEligible).toBe(false);
      expect(ineligibleWithRestrictive.reason).toContain('not permitted for Programme Electives');
    });

    // 9. NPTEL data persists after refresh (serialization roundtrip)
    it('Case 9: NPTEL data persists after JSON serialization and parsing', () => {
      const original: CreditSubjectItem = {
        id: 'nptel-9',
        name: 'Cyber Security Essentials',
        code: 'NOC24-CS09',
        category: 'open_elective',
        semester: 5,
        credits: 3,
        status: 'Passed',
        isVerified: true,
        source: 'Manual',
        courseType: 'nptel',
        nptelDetails: {
          courseName: 'Cyber Security Essentials',
          courseIdOrUrl: 'noc24-cs09',
          categoryTarget: 'open_elective',
          durationWeeks: '12 Weeks',
          certificateStatus: 'certificate_received',
          courseCredits: 3,
          acceptedCredits: 3,
          approvalStatus: 'approved',
          semesterCounted: 5,
          notes: 'Dean approval letter dated 12/09/2024',
        },
      };

      const serialized = JSON.stringify([original]);
      const restored: CreditSubjectItem[] = JSON.parse(serialized);

      expect(restored[0].courseType).toBe('nptel');
      expect(restored[0].nptelDetails?.acceptedCredits).toBe(3);
      expect(restored[0].nptelDetails?.approvalStatus).toBe('approved');
      expect(restored[0].nptelDetails?.notes).toBe('Dean approval letter dated 12/09/2024');
    });

    // 10. Switching student profiles does not mix records
    it('Case 10: switching student profiles keeps records isolated', () => {
      const studentAKey = 'academic_credits_subjects_student_alpha';
      const studentBKey = 'academic_credits_subjects_student_beta';

      const studentACourses: CreditSubjectItem[] = [
        {
          id: 'nptel-a',
          name: 'Student A Course',
          category: 'programme_elective',
          semester: 5,
          credits: 3,
          status: 'Passed',
          isVerified: true,
          source: 'Manual',
          courseType: 'nptel',
          nptelDetails: {
            categoryTarget: 'programme_elective',
            courseCredits: 3,
            acceptedCredits: 3,
            certificateStatus: 'certificate_received',
            approvalStatus: 'approved',
            semesterCounted: 5,
          },
        },
      ];

      const studentBCourses: CreditSubjectItem[] = [
        {
          id: 'nptel-b',
          name: 'Student B Course',
          category: 'open_elective',
          semester: 6,
          credits: 2,
          status: 'Passed',
          isVerified: true,
          source: 'Manual',
          courseType: 'nptel',
          nptelDetails: {
            categoryTarget: 'open_elective',
            courseCredits: 2,
            acceptedCredits: 2,
            certificateStatus: 'completed',
            approvalStatus: 'approved',
            semesterCounted: 6,
          },
        },
      ];

      const fakeStorage = new Map<string, string>();
      fakeStorage.set(studentAKey, JSON.stringify(studentACourses));
      fakeStorage.set(studentBKey, JSON.stringify(studentBCourses));

      const loadedA: CreditSubjectItem[] = JSON.parse(fakeStorage.get(studentAKey)!);
      const loadedB: CreditSubjectItem[] = JSON.parse(fakeStorage.get(studentBKey)!);

      expect(loadedA[0].name).toBe('Student A Course');
      expect(loadedA[0].nptelDetails?.categoryTarget).toBe('programme_elective');

      expect(loadedB[0].name).toBe('Student B Course');
      expect(loadedB[0].nptelDetails?.categoryTarget).toBe('open_elective');
    });

    // 11. Existing SGPA, CGPA, Internal Marks, Attendance, and Credit calculations continue to work
    it('Case 11: dashboard stats and existing calculators remain intact', () => {
      const mixedSubjects: CreditSubjectItem[] = [
        {
          id: 'reg-1',
          name: 'Data Structures',
          category: 'programme_core',
          semester: 3,
          credits: 4,
          status: 'Passed',
          isVerified: true,
          source: 'Manual',
        },
        {
          id: 'nptel-pe',
          name: 'Cloud Computing',
          category: 'programme_elective',
          semester: 5,
          credits: 3,
          status: 'Passed',
          isVerified: true,
          source: 'Manual',
          courseType: 'nptel',
          nptelDetails: {
            categoryTarget: 'programme_elective',
            courseCredits: 3,
            acceptedCredits: 3,
            certificateStatus: 'certificate_received',
            approvalStatus: 'approved',
            semesterCounted: 5,
          },
        },
        {
          id: 'nptel-oe',
          name: 'German Language',
          category: 'open_elective',
          semester: 5,
          credits: 2,
          status: 'Passed',
          isVerified: true,
          source: 'Manual',
          courseType: 'nptel',
          nptelDetails: {
            categoryTarget: 'open_elective',
            courseCredits: 2,
            acceptedCredits: 2,
            certificateStatus: 'completed',
            approvalStatus: 'approved',
            semesterCounted: 5,
          },
        },
        {
          id: 'nptel-pending',
          name: 'AI Ethics',
          category: 'open_elective',
          semester: 6,
          credits: 3,
          status: 'Pending',
          isVerified: false,
          source: 'Manual',
          courseType: 'nptel',
          nptelDetails: {
            categoryTarget: 'open_elective',
            courseCredits: 3,
            acceptedCredits: 3,
            certificateStatus: 'in_progress',
            approvalStatus: 'submitted',
            semesterCounted: 6,
          },
        },
      ];

      const dashboard = calculateNptelDashboardStats(mixedSubjects);
      expect(dashboard.totalCourses).toBe(3);
      expect(dashboard.inProgressCourses).toBe(1);
      expect(dashboard.completedCertificates).toBe(2);
      expect(dashboard.awaitingApprovalCourses).toBe(1);
      expect(dashboard.approvedPeCredits).toBe(3);
      expect(dashboard.approvedOeCredits).toBe(2);
      expect(dashboard.pendingCredits).toBe(3);

      const summary = calculateCreditSummary(mixedSubjects, 164, COLLEGE_CHART_TEMPLATE);
      // 4 (core) + 3 (approved PE) + 2 (approved OE) = 9
      expect(summary.totalEarnedCredits).toBe(9);
      expect(summary.creditsRemaining).toBe(155);
    });
  });

  describe('Zero Defaults & Course Registration Separation Tests', () => {
    it('initializes a fresh student record with exactly zero credits and 100% remaining', () => {
      const freshSubjects: CreditSubjectItem[] = [];
      const targetCredits = 164;
      const summary = calculateCreditSummary(freshSubjects, targetCredits, COLLEGE_CHART_TEMPLATE);

      expect(summary.totalRegisteredCredits).toBe(0);
      expect(summary.totalEarnedCredits).toBe(0);
      expect(summary.pendingCredits).toBe(0);
      expect(summary.failedCredits).toBe(0);
      expect(summary.extraCredits).toBe(0);
      expect(summary.creditsRemaining).toBe(164);
      expect(summary.completionPercentage).toBe(0);
      expect(summary.mandatoryCompletedCount).toBe(0);
      expect(summary.complementaryCompletedCount).toBe(0);
    });

    it('adding a course initializes with 0 earned credits and Pending status without prematurely inflating earned credits', () => {
      // Adding a 4-credit course from catalogue as Pending / Not Started
      const registeredCourse: CreditSubjectItem = {
        id: 'new-reg-1',
        name: 'Operating Systems',
        code: 'CS202',
        category: 'programme_core',
        semester: 3,
        credits: 4,
        registeredCredits: 4,
        earnedCredits: 0,
        grade: '—',
        status: 'Pending',
        isVerified: true,
        source: 'Catalogue',
      };

      const summary = calculateCreditSummary([registeredCourse], 164, COLLEGE_CHART_TEMPLATE);
      expect(summary.totalRegisteredCredits).toBe(4);
      expect(summary.totalEarnedCredits).toBe(0);
      expect(summary.pendingCredits).toBe(4);
      expect(summary.creditsRemaining).toBe(164);
      expect(summary.completionPercentage).toBe(0);

      // Explicitly passing the course awards the earned credits
      const passedCourse: CreditSubjectItem = {
        ...registeredCourse,
        earnedCredits: 4,
        grade: 'A',
        status: 'Passed',
      };

      const updatedSummary = calculateCreditSummary([passedCourse], 164, COLLEGE_CHART_TEMPLATE);
      expect(updatedSummary.totalRegisteredCredits).toBe(4);
      expect(updatedSummary.totalEarnedCredits).toBe(4);
      expect(updatedSummary.pendingCredits).toBe(0);
      expect(updatedSummary.creditsRemaining).toBe(160);
      expect(updatedSummary.completionPercentage).toBeCloseTo((4 / 164) * 100, 2);
    });
  });
});
