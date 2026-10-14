import type {
  CreditSubjectItem,
  CreditCategoryConfig,
  CreditSummary,
  CategoryProgressItem,
  SemesterPlanItem,
  GraduationEligibilityResult,
  GraduationChecklistItem,
  NptelCollegeRulesConfig,
  NptelDashboardStats,
} from '../types/credits';
import { sanitizeCourseTitle } from '../services/catalogueStorage';

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

export const DEFAULT_NPTEL_RULES: NptelCollegeRulesConfig = {
  allowProgrammeElective: true,
  allowOpenElective: true,
  allowedCreditValues: [2, 3, 4],
  allowCustomCredits: false,
  requireApproval: true,
  requireCertificate: true,
  maxNptelCreditsAllowed: 0,
  allowMultiRequirementCount: false,
};

/**
 * Checks whether an NPTEL course is verified eligible to count toward graduation requirements.
 */
export function isNptelCourseEligible(
  subject: CreditSubjectItem,
  rules: NptelCollegeRulesConfig = DEFAULT_NPTEL_RULES
): {
  isEligible: boolean;
  eligibleCredits: number;
  reason?: string;
} {
  if (subject.courseType !== 'nptel') {
    const isPassed = subject.status === 'Passed';
    return {
      isEligible: isPassed,
      eligibleCredits: isPassed ? Math.max(0, Number(subject.credits) || 0) : 0,
      reason: isPassed ? 'Passed' : subject.status,
    };
  }

  const details = subject.nptelDetails;
  if (!details) {
    const isPassed = subject.status === 'Passed';
    return {
      isEligible: isPassed,
      eligibleCredits: isPassed ? Math.max(0, Number(subject.credits) || 0) : 0,
      reason: isPassed ? 'Passed' : subject.status,
    };
  }

  const targetCategory = details.categoryTarget || subject.category;
  if (targetCategory === 'programme_elective' && !rules.allowProgrammeElective) {
    return {
      isEligible: false,
      eligibleCredits: 0,
      reason: 'NPTEL not permitted for Programme Electives under college rules',
    };
  }
  if (targetCategory === 'open_elective' && !rules.allowOpenElective) {
    return {
      isEligible: false,
      eligibleCredits: 0,
      reason: 'NPTEL not permitted for Open Electives under college rules',
    };
  }

  if (details.approvalStatus === 'rejected' || subject.status === 'Failed') {
    return { isEligible: false, eligibleCredits: 0, reason: 'Course rejected or failed' };
  }

  if (rules.requireApproval && details.approvalStatus !== 'approved') {
    return { isEligible: false, eligibleCredits: 0, reason: 'Awaiting college approval' };
  }

  if (rules.requireCertificate) {
    const certValid =
      details.certificateStatus === 'completed' ||
      details.certificateStatus === 'certificate_received';
    if (!certValid) {
      return { isEligible: false, eligibleCredits: 0, reason: 'Certificate requirement not met' };
    }
  }

  const acceptedCredits = Math.max(0, Number(details.acceptedCredits) || 0);
  return {
    isEligible: true,
    eligibleCredits: acceptedCredits,
    reason: 'Approved and eligible',
  };
}

/**
 * Flags duplicate course codes and NPTEL identifiers and handles retake records.
 */
export function detectDuplicatesAndRetakes(subjects: CreditSubjectItem[]): CreditSubjectItem[] {
  const codeMap = new Map<string, CreditSubjectItem[]>();
  const nptelIdMap = new Map<string, CreditSubjectItem[]>();

  for (const s of subjects) {
    const trimmedCode = (s.code || '').trim().toUpperCase();
    if (trimmedCode) {
      if (!codeMap.has(trimmedCode)) codeMap.set(trimmedCode, []);
      codeMap.get(trimmedCode)!.push(s);
    }

    const nptelId = (s.nptelDetails?.courseIdOrUrl || '').trim().toLowerCase();
    if (nptelId) {
      if (!nptelIdMap.has(nptelId)) nptelIdMap.set(nptelId, []);
      nptelIdMap.get(nptelId)!.push(s);
    }
  }

  return subjects.map((sub) => {
    const trimmedCode = (sub.code || '').trim().toUpperCase();
    const nptelId = (sub.nptelDetails?.courseIdOrUrl || '').trim().toLowerCase();

    const codeMatches = trimmedCode ? codeMap.get(trimmedCode) || [] : [];
    const nptelMatches = nptelId ? nptelIdMap.get(nptelId) || [] : [];

    const isDup = codeMatches.length > 1 || nptelMatches.length > 1;

    if (isDup) {
      const allMatches = [...new Set([...codeMatches, ...nptelMatches])];
      const hasPassed = allMatches.some(
        (m) =>
          m.status === 'Passed' ||
          (m.courseType === 'nptel' && m.nptelDetails?.approvalStatus === 'approved')
      );
      const isThisPassed =
        sub.status === 'Passed' ||
        (sub.courseType === 'nptel' && sub.nptelDetails?.approvalStatus === 'approved');

      return {
        ...sub,
        isDuplicate: true,
        isRetake: hasPassed && !isThisPassed,
      };
    }

    return { ...sub, isDuplicate: false, isRetake: false };
  });
}

/**
 * Calculates overall credit summary.
 * - Supports regular and NPTEL courses
 * - Handles 0-credit subjects (visible in records, add 0 to earned credits)
 * - Excludes non-credit mandatory courses from the base 164/182 tally
 * - Deduplicates repeated passed courses (never count same course twice)
 * - Never allows completion percentage to exceed 100%
 * - Credits Remaining = max(0, target - earned)
 */
export function calculateCreditSummary(
  subjects: CreditSubjectItem[],
  targetCredits: number,
  categories: CreditCategoryConfig[] = COLLEGE_CHART_TEMPLATE,
  rules: NptelCollegeRulesConfig = DEFAULT_NPTEL_RULES
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
    const isNptel = sub.courseType === 'nptel';
    const effectiveCategory = isNptel
      ? sub.nptelDetails?.categoryTarget || sub.category
      : sub.category;
    const isNonCreditCategory = nonCreditCatIds.has(effectiveCategory);

    const rawCredits = isNptel
      ? Math.max(0, Number(sub.nptelDetails?.acceptedCredits ?? sub.credits) || 0)
      : Math.max(0, Number(sub.credits) || 0);

    const advertisedCredits = isNptel
      ? Math.max(0, Number(sub.nptelDetails?.courseCredits ?? sub.credits) || 0)
      : rawCredits;

    const code = (sub.code || sub.nptelDetails?.courseIdOrUrl || '').trim().toUpperCase();
    const dedupeKey = code || (sub.name || '').trim().toLowerCase();

    // Track Mandatory & Complementary course counts
    if (effectiveCategory === 'mandatory') {
      mandatoryTotalCount += 1;
      if (sub.status === 'Passed') mandatoryCompletedCount += 1;
    } else if (effectiveCategory === 'complementary_skills') {
      complementaryTotalCount += 1;
      if (sub.status === 'Passed') complementaryCompletedCount += 1;
    }

    if (isNonCreditCategory) {
      continue;
    }

    const studentEarned = sub.earnedCredits !== undefined ? sub.earnedCredits : rawCredits;
    const studentRegistered =
      sub.registeredCredits !== undefined
        ? sub.registeredCredits
        : advertisedCredits > 0
        ? advertisedCredits
        : rawCredits;

    // Attempted / Registered credits
    totalRegisteredCredits += studentRegistered;

    if (isNptel) {
      const eligibility = isNptelCourseEligible(sub, rules);
      if (eligibility.isEligible) {
        if (dedupeKey && countedCourseCodes.has(dedupeKey)) {
          continue; // Avoid double count
        }
        if (dedupeKey) countedCourseCodes.add(dedupeKey);

        totalEarnedCredits += eligibility.eligibleCredits;
        verifiedEarnedCredits += eligibility.eligibleCredits;
      } else if (sub.nptelDetails?.approvalStatus === 'rejected' || sub.status === 'Failed') {
        failedCredits += rawCredits;
      } else {
        // Awaiting approval or pending verification
        pendingCredits += rawCredits;
      }
    } else {
      if (sub.status === 'Passed') {
        if (dedupeKey && countedCourseCodes.has(dedupeKey)) {
          continue;
        }
        if (dedupeKey) countedCourseCodes.add(dedupeKey);

        totalEarnedCredits += studentEarned;
        if (sub.isVerified) {
          verifiedEarnedCredits += studentEarned;
        }
      } else if (sub.status === 'Pending') {
        pendingCredits += studentRegistered;
      } else if (sub.status === 'Failed') {
        failedCredits += studentRegistered;
      }
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
  subjects: CreditSubjectItem[],
  rules: NptelCollegeRulesConfig = DEFAULT_NPTEL_RULES
): CategoryProgressItem[] {
  const annotated = detectDuplicatesAndRetakes(subjects);

  return categories.map((cat) => {
    const catCourses = annotated.filter((s) => {
      const targetCat =
        s.courseType === 'nptel' ? s.nptelDetails?.categoryTarget || s.category : s.category;
      return targetCat === cat.id;
    });

    const countedCodes = new Set<string>();
    let earnedCredits = 0;
    let registeredCredits = 0;

    for (const c of catCourses) {
      const isNptel = c.courseType === 'nptel';
      const cr = isNptel
        ? Math.max(0, Number(c.nptelDetails?.acceptedCredits ?? c.credits) || 0)
        : Math.max(0, Number(c.credits) || 0);

      const advertisedCr = isNptel
        ? Math.max(0, Number(c.nptelDetails?.courseCredits ?? c.credits) || 0)
        : cr;

      registeredCredits += advertisedCr > 0 ? advertisedCr : cr;

      const code = (c.code || c.nptelDetails?.courseIdOrUrl || '').trim().toUpperCase();
      const dedupeKey = code || (c.name || '').trim().toLowerCase();

      if (isNptel) {
        const eligibility = isNptelCourseEligible(c, rules);
        if (eligibility.isEligible) {
          if (dedupeKey && countedCodes.has(dedupeKey)) {
            continue; // Avoid duplicate count
          }
          if (dedupeKey) countedCodes.add(dedupeKey);
          earnedCredits += eligibility.eligibleCredits;
        }
      } else {
        if (c.status === 'Passed') {
          if (dedupeKey && countedCodes.has(dedupeKey)) {
            continue;
          }
          if (dedupeKey) countedCodes.add(dedupeKey);
          earnedCredits += cr;
        }
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
  plannedTargets: Record<number, number> = {},
  rules: NptelCollegeRulesConfig = DEFAULT_NPTEL_RULES
): SemesterPlanItem[] {
  const annotated = detectDuplicatesAndRetakes(subjects);
  const result: SemesterPlanItem[] = [];

  for (let sem = 1; sem <= 8; sem++) {
    const semCourses = annotated.filter((s) => {
      const courseSem = s.courseType === 'nptel' ? s.nptelDetails?.semesterCounted || s.semester : s.semester;
      return courseSem === sem;
    });

    let registeredCredits = 0;
    let earnedCredits = 0;
    let failedCredits = 0;
    let pendingCredits = 0;

    for (const c of semCourses) {
      const isNptel = c.courseType === 'nptel';
      const cr = isNptel
        ? Math.max(0, Number(c.nptelDetails?.acceptedCredits ?? c.credits) || 0)
        : Math.max(0, Number(c.credits) || 0);

      const advertisedCr = isNptel
        ? Math.max(0, Number(c.nptelDetails?.courseCredits ?? c.credits) || 0)
        : cr;

      registeredCredits += advertisedCr > 0 ? advertisedCr : cr;

      if (isNptel) {
        const eligibility = isNptelCourseEligible(c, rules);
        if (eligibility.isEligible) {
          earnedCredits += eligibility.eligibleCredits;
        } else if (c.nptelDetails?.approvalStatus === 'rejected' || c.status === 'Failed') {
          failedCredits += cr;
        } else {
          pendingCredits += cr;
        }
      } else {
        if (c.status === 'Passed') {
          earnedCredits += cr;
        } else if (c.status === 'Failed') {
          failedCredits += cr;
        } else if (c.status === 'Pending') {
          pendingCredits += cr;
        }
      }
    }

    const plannedTarget = plannedTargets[sem] || 0;
    const isCompleted =
      semCourses.length > 0 &&
      semCourses.every((c) =>
        c.courseType === 'nptel'
          ? isNptelCourseEligible(c, rules).isEligible
          : c.status === 'Passed'
      );

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
 * Calculates NPTEL summary statistics for the NPTEL Dashboard.
 */
export function calculateNptelDashboardStats(
  subjects: CreditSubjectItem[],
  rules: NptelCollegeRulesConfig = DEFAULT_NPTEL_RULES
): NptelDashboardStats {
  const nptelCourses = subjects.filter((s) => s.courseType === 'nptel');
  const countedPe = new Set<string>();
  const countedOe = new Set<string>();

  let inProgressCourses = 0;
  let completedCertificates = 0;
  let awaitingApprovalCourses = 0;
  let approvedPeCredits = 0;
  let approvedOeCredits = 0;
  let pendingCredits = 0;
  let rejectedCredits = 0;

  for (const s of nptelCourses) {
    const details = s.nptelDetails;
    const cat = details?.categoryTarget || s.category;
    const acceptedCr = Math.max(0, Number(details?.acceptedCredits ?? s.credits) || 0);
    const advertisedCr = Math.max(0, Number(details?.courseCredits ?? s.credits) || 0);
    const effectiveCr = acceptedCr > 0 ? acceptedCr : advertisedCr;

    const dedupeKey = (details?.courseIdOrUrl || s.code || s.name || s.id).trim().toLowerCase();

    // Certificate status
    if (details?.certificateStatus === 'in_progress') {
      inProgressCourses += 1;
    } else if (
      details?.certificateStatus === 'completed' ||
      details?.certificateStatus === 'certificate_received'
    ) {
      completedCertificates += 1;
    }

    // Approval status
    if (details?.approvalStatus === 'submitted' || details?.approvalStatus === 'not_verified') {
      awaitingApprovalCourses += 1;
      pendingCredits += effectiveCr;
    } else if (details?.approvalStatus === 'rejected') {
      rejectedCredits += effectiveCr;
    } else if (details?.approvalStatus === 'approved') {
      const eligibility = isNptelCourseEligible(s, rules);
      if (eligibility.isEligible) {
        if (cat === 'programme_elective') {
          if (!countedPe.has(dedupeKey)) {
            countedPe.add(dedupeKey);
            approvedPeCredits += eligibility.eligibleCredits;
          }
        } else if (cat === 'open_elective') {
          if (!countedOe.has(dedupeKey)) {
            countedOe.add(dedupeKey);
            approvedOeCredits += eligibility.eligibleCredits;
          }
        }
      } else {
        pendingCredits += effectiveCr;
      }
    }
  }

  return {
    totalCourses: nptelCourses.length,
    inProgressCourses,
    completedCertificates,
    awaitingApprovalCourses,
    approvedPeCredits,
    approvedOeCredits,
    pendingCredits,
    rejectedCredits,
  };
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
    const rawName = tokens[1]?.replace(/^"|"$/g, '') || `Course ${i}`;
    const name = sanitizeCourseTitle(rawName) || `Course ${i}`;
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
