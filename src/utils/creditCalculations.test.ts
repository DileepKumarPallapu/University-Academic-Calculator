import { describe, it, expect } from 'vitest';
import {
  COLLEGE_CHART_TEMPLATE,
  calculateCreditSummary,
  detectDuplicatesAndRetakes,
  calculateCategoryProgress,
  calculateSemesterProgress,
  calculateCreditsRequired,
  simulateScenarios,
  checkGraduationEligibility,
  exportCreditsToCSV,
  parseCreditsFromCSV,
} from './creditCalculations';
import type { CreditSubjectItem } from '../types/credits';

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
});
