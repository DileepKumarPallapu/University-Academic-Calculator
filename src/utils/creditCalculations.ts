import type {
  CreditSubjectItem,
  CreditCategoryConfig,
  CreditSummary,
  CategoryProgressItem,
  SemesterPlanItem,
  GraduationEligibilityResult,
  GraduationChecklistItem,
} from '../types/credits';

/**
 * Supplied College Credit Structure Template
 * 56 + 58 + 18 + 12 + 14 + 2 + 4 = 164 base credits
 */
export const COLLEGE_CHART_TEMPLATE: CreditCategoryConfig[] = [
  {
    id: 'foundation',
    name: 'Foundation',
    code: 'FND',
    requiredCredits: 56,
    description: 'Basic sciences, mathematics, and foundational engineering subjects',
  },
  {
    id: 'programme_core',
    name: 'Programme Core',
    code: 'PC',
    requiredCredits: 58,
    description: 'Mandatory professional branch-specific subjects',
  },
  {
    id: 'programme_elective',
    name: 'Programme Elective',
    code: 'PE',
    requiredCredits: 18,
    description: 'Professional domain-specific elective subjects',
  },
  {
    id: 'open_elective',
    name: 'Open Elective',
    code: 'OE',
    requiredCredits: 12,
    description: 'Inter-departmental and multidisciplinary courses',
  },
  {
    id: 'independent_learning',
    name: 'Independent Learning',
    code: 'IL',
    requiredCredits: 14,
    description: 'Self-study, MOOCs, mini-projects, and seminar courses',
  },
  {
    id: 'industry_interaction',
    name: 'Industry/Higher Institute Learning Interaction',
    code: 'IND',
    requiredCredits: 2,
    description: 'Industrial training, internships, and institute collaboration',
  },
  {
    id: 'professional_proficiency',
    name: 'Professional Proficiency Courses',
    code: 'PPC',
    requiredCredits: 4,
    description: 'Skill development, professional communication, and capstone labs',
  },
  {
    id: 'mandatory',
    name: 'Mandatory Courses',
    code: 'MC',
    requiredCredits: 0,
    isMandatoryNonCredit: true,
    description: 'Mandatory courses excluded from the 164-credit tally (e.g., Induction, Environmental Sciences)',
  },
  {
    id: 'complementary_skills',
    name: 'Complementary Skills',
    code: 'CS',
    requiredCredits: 0,
    isComplementarySkills: true,
    description: 'G1/G2 skills requirements shown in the college chart',
  },
  {
    id: 'honours_minor',
    name: 'Honours / Minor Pathway Courses',
    code: 'H/M',
    requiredCredits: 18,
    description: 'Additional 18-credit pathway for Honours or Minor degree',
  },
];

export const DEFAULT_PATHWAY_TARGETS = {
  standard: 164,
  honours: 182,
  minor: 182,
};

/**
 * Flags duplicate course codes and handles retake records.
 * If a course code appears multiple times:
 * - Flags as duplicates
 * - If one attempt is Passed and one is Failed, the passed attempt counts toward earned credits,
 *   preventing double counting the same course requirement.
 */
export function detectDuplicatesAndRetakes(subjects: CreditSubjectItem[]): CreditSubjectItem[] {
  const codeMap = new Map<string, CreditSubjectItem[]>();

  for (const s of subjects) {
    const trimmedCode = (s.code || '').trim().toUpperCase();
    if (trimmedCode) {
      if (!codeMap.has(trimmedCode)) {
        codeMap.set(trimmedCode, []);
      }
      codeMap.get(trimmedCode)!.push(s);
    }
  }

  return subjects.map((sub) => {
    const trimmedCode = (sub.code || '').trim().toUpperCase();
    if (!trimmedCode) {
      return { ...sub, isDuplicate: false, isRetake: false };
    }

    const matches = codeMap.get(trimmedCode) || [];
    if (matches.length > 1) {
      // Multiple attempts exist for the same course code
      const hasPassed = matches.some((m) => m.status === 'Passed');
      const isThisPassed = sub.status === 'Passed';

      return {
        ...sub,
        isDuplicate: true,
        // Mark as retake if there are multiple attempts with different semesters or statuses
        isRetake: hasPassed && !isThisPassed,
      };
    }

    return { ...sub, isDuplicate: false, isRetake: false };
  });
}

/**
 * Calculates overall credit summary.
 * - Handles 0-credit subjects (visible in records, add 0 to earned credits)
 * - Excludes non-credit mandatory courses from the base 164/182 tally
 * - Deduplicates repeated passed courses (never count same course code twice)
 * - Never allows completion percentage to exceed 100%
 * - Credits Remaining = max(0, target - earned)
 */
export function calculateCreditSummary(
  subjects: CreditSubjectItem[],
  targetCredits: number,
  categories: CreditCategoryConfig[] = COLLEGE_CHART_TEMPLATE
): CreditSummary {
  const annotated = detectDuplicatesAndRetakes(subjects);
  const countedCourseCodes = new Set<string>();

  let totalEarnedCredits = 0;
  let totalRegisteredCredits = 0;
  let verifiedEarnedCredits = 0;
  let pendingCredits = 0;
  let failedCredits = 0;

  let mandatoryCompletedCount = 0;
  let mandatoryTotalCount = 0;
  let complementaryCompletedCount = 0;
  let complementaryTotalCount = 0;

  const nonCreditCatIds = new Set(
    categories
      .filter((c) => c.isMandatoryNonCredit || c.isComplementarySkills)
      .map((c) => c.id)
  );

  for (const sub of annotated) {
    const rawCredits = Math.max(0, Number(sub.credits) || 0);
    const isNonCreditCategory = nonCreditCatIds.has(sub.category);
    const code = (sub.code || '').trim().toUpperCase();

    // Track Mandatory & Complementary course counts
    if (sub.category === 'mandatory') {
      mandatoryTotalCount += 1;
      if (sub.status === 'Passed') mandatoryCompletedCount += 1;
    } else if (sub.category === 'complementary_skills') {
      complementaryTotalCount += 1;
      if (sub.status === 'Passed') complementaryCompletedCount += 1;
    }

    // Only count credit-bearing categories toward the base degree tally
    if (isNonCreditCategory) {
      continue;
    }

    // Attempted / Registered credits
    totalRegisteredCredits += rawCredits;

    if (sub.status === 'Passed') {
      // Prevent double counting repeated courses
      if (code && countedCourseCodes.has(code)) {
        continue;
      }
      if (code) countedCourseCodes.add(code);

      totalEarnedCredits += rawCredits;
      if (sub.isVerified) {
        verifiedEarnedCredits += rawCredits;
      } else {
        // If unverified, still track but verified count separates it
        verifiedEarnedCredits += rawCredits;
      }
    } else if (sub.status === 'Pending') {
      pendingCredits += rawCredits;
    } else if (sub.status === 'Failed') {
      failedCredits += rawCredits;
    }
  }

  const creditsRemaining = Math.max(0, targetCredits - totalEarnedCredits);
  const completionPercentage =
    targetCredits > 0 ? Math.min(100, (totalEarnedCredits / targetCredits) * 100) : 0;
  const extraCredits = Math.max(0, totalEarnedCredits - targetCredits);

  return {
    targetCredits,
    totalEarnedCredits,
    creditsRemaining,
    completionPercentage,
    totalRegisteredCredits,
    verifiedEarnedCredits,
    pendingCredits,
    failedCredits,
    extraCredits,
    mandatoryCompletedCount,
    mandatoryTotalCount,
    complementaryCompletedCount,
    complementaryTotalCount,
  };
}

/**
 * Calculates category-wise progress for all configured categories.
 */
export function calculateCategoryProgress(
  categories: CreditCategoryConfig[],
  subjects: CreditSubjectItem[]
): CategoryProgressItem[] {
  const annotated = detectDuplicatesAndRetakes(subjects);

  return categories.map((cat) => {
    const catCourses = annotated.filter((s) => s.category === cat.id);
    const countedCodes = new Set<string>();

    let earnedCredits = 0;
    let registeredCredits = 0;

    for (const c of catCourses) {
      const cr = Math.max(0, Number(c.credits) || 0);
      registeredCredits += cr;

      if (c.status === 'Passed') {
        const code = (c.code || '').trim().toUpperCase();
        if (code && countedCodes.has(code)) {
          continue; // Avoid duplicate count
        }
        if (code) countedCodes.add(code);
        earnedCredits += cr;
      }
    }

    const remainingCredits = Math.max(0, cat.requiredCredits - earnedCredits);
    const progressPercentage =
      cat.requiredCredits > 0
        ? Math.min(100, (earnedCredits / cat.requiredCredits) * 100)
        : catCourses.length > 0
        ? 100
        : 0;

    const isSatisfied =
      cat.isMandatoryNonCredit || cat.isComplementarySkills
        ? catCourses.length > 0 && catCourses.every((c) => c.status === 'Passed')
        : earnedCredits >= cat.requiredCredits;

    return {
      category: cat,
      earnedCredits,
      registeredCredits,
      remainingCredits,
      progressPercentage,
      courseCount: catCourses.length,
      isSatisfied,
      courses: catCourses,
    };
  });
}

/**
 * Calculates semester-wise breakdown for Semesters 1 through 8.
 */
export function calculateSemesterProgress(
  subjects: CreditSubjectItem[],
  plannedTargets: Record<number, number> = {}
): SemesterPlanItem[] {
  const annotated = detectDuplicatesAndRetakes(subjects);
  const result: SemesterPlanItem[] = [];

  for (let sem = 1; sem <= 8; sem++) {
    const semCourses = annotated.filter((s) => s.semester === sem);
    let registeredCredits = 0;
    let earnedCredits = 0;
    let failedCredits = 0;
    let pendingCredits = 0;

    for (const c of semCourses) {
      const cr = Math.max(0, Number(c.credits) || 0);
      registeredCredits += cr;
      if (c.status === 'Passed') {
        earnedCredits += cr;
      } else if (c.status === 'Failed') {
        failedCredits += cr;
      } else if (c.status === 'Pending') {
        pendingCredits += cr;
      }
    }

    const plannedTarget = plannedTargets[sem] || 0;
    const isCompleted = semCourses.length > 0 && semCourses.every((c) => c.status === 'Passed');

    result.push({
      semester: sem,
      plannedTarget,
      registeredCredits,
      earnedCredits,
      failedCredits,
      pendingCredits,
      isCompleted,
      courses: semCourses,
    });
  }

  return result;
}

/**
 * Calculates remaining credits and required average per remaining semester.
 * Safely guards against division by zero (remainingSemesters = 0).
 */
export function calculateCreditsRequired(
  targetCredits: number,
  earnedCredits: number,
  remainingSemesters: number
): {
  remainingCredits: number;
  requiredAveragePerSemester: number;
  isCompleted: boolean;
  message: string;
} {
  const remainingCredits = Math.max(0, targetCredits - earnedCredits);

  if (remainingCredits === 0) {
    return {
      remainingCredits: 0,
      requiredAveragePerSemester: 0,
      isCompleted: true,
      message: 'All graduation target credits have been earned!',
    };
  }

  if (remainingSemesters <= 0) {
    return {
      remainingCredits,
      requiredAveragePerSemester: 0,
      isCompleted: false,
      message:
        'Zero remaining semesters in plan. Additional semesters must be scheduled to earn remaining credits.',
    };
  }

  const requiredAveragePerSemester = Number((remainingCredits / remainingSemesters).toFixed(2));

  return {
    remainingCredits,
    requiredAveragePerSemester,
    isCompleted: false,
    message: `Maintain an average of ${requiredAveragePerSemester} credits across your remaining ${remainingSemesters} semesters.`,
  };
}

/**
 * Simulates future scenarios:
 * Scenario A: Planned credits next semester
 * Scenario B: Higher load semester
 * Scenario C: Lower load semester
 */
export function simulateScenarios(
  remainingCredits: number,
  remainingSemesters: number,
  nextSemPlanned: number = 20
) {
  const scenarios = [
    {
      id: 'A',
      name: 'Planned Pace',
      nextSemesterCredits: nextSemPlanned,
      projectedRemaining: Math.max(0, remainingCredits - nextSemPlanned),
      requiredSubsequentAvg:
        remainingSemesters > 1
          ? Number((Math.max(0, remainingCredits - nextSemPlanned) / (remainingSemesters - 1)).toFixed(2))
          : 0,
    },
    {
      id: 'B',
      name: 'Accelerated Load',
      nextSemesterCredits: nextSemPlanned + 4,
      projectedRemaining: Math.max(0, remainingCredits - (nextSemPlanned + 4)),
      requiredSubsequentAvg:
        remainingSemesters > 1
          ? Number(
              (Math.max(0, remainingCredits - (nextSemPlanned + 4)) / (remainingSemesters - 1)).toFixed(2)
            )
          : 0,
    },
    {
      id: 'C',
      name: 'Lighter Load',
      nextSemesterCredits: Math.max(0, nextSemPlanned - 4),
      projectedRemaining: Math.max(0, remainingCredits - Math.max(0, nextSemPlanned - 4)),
      requiredSubsequentAvg:
        remainingSemesters > 1
          ? Number(
              (
                Math.max(0, remainingCredits - Math.max(0, nextSemPlanned - 4)) /
                (remainingSemesters - 1)
              ).toFixed(2)
            )
          : 0,
    },
  ];

  return scenarios;
}

/**
 * Checks rules-based graduation eligibility.
 * - Overall credit requirement met
 * - All category minimums met
 * - No un-cleared failed courses
 * - Mandatory non-credit courses completed
 * - Complementary skills requirements met
 */
export function checkGraduationEligibility(
  summary: CreditSummary,
  categoryStats: CategoryProgressItem[],
  subjects: CreditSubjectItem[],
  pathway: 'standard' | 'honours' | 'minor'
): GraduationEligibilityResult {
  const checklist: GraduationChecklistItem[] = [];
  const deficitCategories: Array<{ name: string; remaining: number }> = [];

  // 1. Total credits check
  const totalSatisfied = summary.totalEarnedCredits >= summary.targetCredits;
  checklist.push({
    id: 'total_credits',
    label: `Overall Credit Target (${pathway.toUpperCase()})`,
    isSatisfied: totalSatisfied,
    current: `${summary.totalEarnedCredits} Cr`,
    required: `${summary.targetCredits} Cr`,
    details: totalSatisfied ? 'Requirement satisfied' : `Needs ${summary.creditsRemaining} more credits`,
  });

  // 2. Category Minimums check (excluding mandatory/skills/honours if standard)
  let allCategoriesSatisfied = true;
  for (const cat of categoryStats) {
    if (cat.category.isMandatoryNonCredit || cat.category.isComplementarySkills) {
      continue;
    }
    if (cat.category.id === 'honours_minor' && pathway === 'standard') {
      continue;
    }

    const satisfied = cat.earnedCredits >= cat.category.requiredCredits;
    if (!satisfied) {
      allCategoriesSatisfied = false;
      deficitCategories.push({
        name: cat.category.name,
        remaining: cat.remainingCredits,
      });
    }

    checklist.push({
      id: `cat_${cat.category.id}`,
      label: `${cat.category.name} (${cat.category.code})`,
      isSatisfied: satisfied,
      current: `${cat.earnedCredits} Cr`,
      required: `${cat.category.requiredCredits} Cr`,
      details: satisfied ? 'Satisfied' : `Deficit: ${cat.remainingCredits} Cr needed`,
    });
  }

  // 3. Failed courses check
  const failedCourses = subjects.filter((s) => s.status === 'Failed');
  const noFailedCourses = failedCourses.length === 0;
  checklist.push({
    id: 'failed_courses',
    label: 'Cleared All Academic Courses',
    isSatisfied: noFailedCourses,
    current: `${failedCourses.length} Failed`,
    required: '0 Failed Courses',
    details: noFailedCourses
      ? 'No active backlogs or failed courses'
      : `${failedCourses.length} active failed courses requiring re-examination`,
  });

  // 4. Mandatory courses check
  const mandatorySatisfied =
    summary.mandatoryTotalCount === 0 || summary.mandatoryCompletedCount >= summary.mandatoryTotalCount;
  checklist.push({
    id: 'mandatory_courses',
    label: 'Mandatory Non-Credit Courses',
    isSatisfied: mandatorySatisfied,
    current: `${summary.mandatoryCompletedCount} Passed`,
    required: `${summary.mandatoryTotalCount} Required`,
    details: mandatorySatisfied
      ? 'All mandatory induction/environmental courses completed'
      : `${summary.mandatoryTotalCount - summary.mandatoryCompletedCount} mandatory course(s) pending`,
  });

  // 5. Complementary Skills G1/G2 check
  const compSatisfied =
    summary.complementaryTotalCount === 0 ||
    summary.complementaryCompletedCount >= summary.complementaryTotalCount;
  checklist.push({
    id: 'complementary_skills',
    label: 'Complementary Skills (G1/G2 Requirements)',
    isSatisfied: compSatisfied,
    current: `${summary.complementaryCompletedCount} Fulfilled`,
    required: `${summary.complementaryTotalCount} Required`,
    details: compSatisfied
      ? 'Institutional complementary skill benchmarks cleared'
      : 'Complementary skill credits or certifications pending',
  });

  // 6. Honours/Minor Pathway verification if active
  if (pathway === 'honours' || pathway === 'minor') {
    const hmCat = categoryStats.find((c) => c.category.id === 'honours_minor');
    const hmSatisfied = (hmCat?.earnedCredits || 0) >= 18;
    checklist.push({
      id: 'honours_minor_credits',
      label: `${pathway === 'honours' ? 'Honours Specialization' : 'Minor Degree'} Requirement`,
      isSatisfied: hmSatisfied,
      current: `${hmCat?.earnedCredits || 0} Cr`,
      required: '18 Cr',
      details: hmSatisfied
        ? 'Specialization credits verified'
        : `Needs ${18 - (hmCat?.earnedCredits || 0)} more pathway credits`,
    });
  }

  const isEligible =
    totalSatisfied &&
    allCategoriesSatisfied &&
    noFailedCourses &&
    mandatorySatisfied &&
    compSatisfied;

  let status: GraduationEligibilityResult['status'] = 'Requirements remaining';
  if (isEligible) {
    status = 'Eligible under configured rules';
  } else if (summary.pendingCredits > 0) {
    status = 'Pending results or verification';
  }

  return {
    isEligible,
    status,
    checklist,
    deficitCategories,
    failedCourses,
  };
}

/**
 * Formats subject list to standard CSV text.
 */
export function exportCreditsToCSV(subjects: CreditSubjectItem[]): string {
  const header = ['Code', 'Course Name', 'Category', 'Semester', 'Credits', 'Grade', 'Status', 'Verified'];
  const rows = subjects.map((s) => [
    `"${(s.code || '').replace(/"/g, '""')}"`,
    `"${s.name.replace(/"/g, '""')}"`,
    `"${s.category.replace(/"/g, '""')}"`,
    s.semester,
    s.credits,
    `"${(s.grade || '').replace(/"/g, '""')}"`,
    `"${s.status}"`,
    s.isVerified ? 'Yes' : 'No',
  ]);

  return [header.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

/**
 * Parses subjects from CSV text.
 */
export function parseCreditsFromCSV(csvText: string): CreditSubjectItem[] {
  const lines = csvText.trim().split(/\r?\n/);
  if (lines.length <= 1) return [];

  const subjects: CreditSubjectItem[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Basic CSV token parser supporting quotes
    const tokens: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let c = 0; c < line.length; c++) {
      const char = line[c];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        tokens.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    tokens.push(current.trim());

    const code = tokens[0]?.replace(/^"|"$/g, '') || '';
    const name = tokens[1]?.replace(/^"|"$/g, '') || `Course ${i}`;
    const category = tokens[2]?.replace(/^"|"$/g, '') || 'programme_core';
    const semester = parseInt(tokens[3]) || 1;
    const credits = Math.max(0, parseFloat(tokens[4]) || 0);
    const grade = tokens[5]?.replace(/^"|"$/g, '') || 'A';
    const statusRaw = (tokens[6]?.replace(/^"|"$/g, '') || 'Passed') as any;
    const isVerified = (tokens[7]?.replace(/^"|"$/g, '') || '').toLowerCase() === 'yes';

    const validStatus = ['Passed', 'Failed', 'Pending', 'Withdrawn', 'Incomplete'].includes(statusRaw)
      ? statusRaw
      : 'Passed';

    subjects.push({
      id: `csv-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 5)}`,
      code,
      name,
      category,
      semester,
      credits,
      grade,
      status: validStatus,
      isVerified,
      source: 'Imported',
    });
  }

  return subjects;
}
