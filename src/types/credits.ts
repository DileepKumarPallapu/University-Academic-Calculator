export type CourseCategoryType =
  | 'foundation'
  | 'programme_core'
  | 'programme_elective'
  | 'open_elective'
  | 'independent_learning'
  | 'industry_interaction'
  | 'professional_proficiency'
  | 'mandatory'
  | 'complementary_skills'
  | 'honours_minor'
  | 'custom';

export type CourseType = 'regular' | 'nptel' | 'external';

export type ResultStatus =
  | 'Passed'
  | 'Failed'
  | 'Pending'
  | 'Withdrawn'
  | 'Incomplete'
  | 'Exempted';

export type NptelCertificateStatus =
  | 'not_started'
  | 'in_progress'
  | 'completed'
  | 'certificate_received';

export type NptelApprovalStatus =
  | 'not_verified'
  | 'submitted'
  | 'approved'
  | 'rejected';

export interface NptelDetails {
  courseName?: string;
  courseIdOrUrl?: string; // Course ID or URL (e.g. noc24-cs101)
  categoryTarget: 'programme_elective' | 'open_elective' | string;
  durationWeeks?: string; // e.g. '4 Weeks', '8 Weeks', '12 Weeks'
  certificateStatus: NptelCertificateStatus;
  courseCredits: number; // Advertised / course credits selected by student (2, 3, 4, custom)
  acceptedCredits: number; // Officially recognized / accepted by college
  approvalStatus: NptelApprovalStatus;
  semesterCounted: number; // 1 to 8
  notes?: string;
}

export interface NptelCollegeRulesConfig {
  allowProgrammeElective: boolean;
  allowOpenElective: boolean;
  allowedCreditValues: number[];
  allowCustomCredits: boolean;
  requireApproval: boolean;
  requireCertificate: boolean;
  maxNptelCreditsAllowed: number; // 0 = unlimited / no cap
  allowMultiRequirementCount: boolean;
}

export interface NptelDashboardStats {
  totalCourses: number;
  inProgressCourses: number;
  completedCertificates: number;
  awaitingApprovalCourses: number;
  approvedPeCredits: number;
  approvedOeCredits: number;
  pendingCredits: number;
  rejectedCredits: number;
}

export interface CreditSubjectItem {
  id: string;
  name: string;
  code?: string;
  category: string; // matches CreditCategoryConfig.id
  semester: number; // 1 to 8
  credits: number; // earned credits (non-negative, supports 0-credit courses)
  registeredCredits?: number; // officially registered / attempted credits
  earnedCredits?: number; // verified earned credits
  grade?: string; // O, A+, A, B+, B, C, D, RA, P, W, etc.
  status: ResultStatus;
  regulation?: string;
  notes?: string;
  isVerified: boolean;
  source: 'Manual' | 'Imported' | 'Catalogue';
  isDuplicate?: boolean;
  isRetake?: boolean; // retake/repeat course attempt

  // Course type & NPTEL integration
  courseType?: CourseType;
  nptelDetails?: NptelDetails;
  catalogueCourseId?: string;

  // Strict personal data isolation & audit timestamps
  profileId?: string;
  createdAt?: number;
  updatedAt?: number;
}

export interface CreditCategoryConfig {
  id: string;
  name: string;
  code: string;
  requiredCredits: number;
  isMandatoryNonCredit?: boolean; // Excluded from base credit tally
  isComplementarySkills?: boolean; // G1/G2 requirements
  description?: string;
}

export interface DegreePathwayConfig {
  pathway: 'standard' | 'honours' | 'minor';
  title: string;
  targetCredits: number;
  additionalPathwayCredits: number;
  description: string;
}

export interface CreditSummary {
  targetCredits: number;
  totalEarnedCredits: number; // verified passed
  creditsRemaining: number;
  completionPercentage: number;
  totalRegisteredCredits: number;
  verifiedEarnedCredits: number;
  pendingCredits: number;
  failedCredits: number;
  extraCredits: number;
  mandatoryCompletedCount: number;
  mandatoryTotalCount: number;
  complementaryCompletedCount: number;
  complementaryTotalCount: number;
}

export interface CategoryProgressItem {
  category: CreditCategoryConfig;
  earnedCredits: number;
  registeredCredits: number;
  remainingCredits: number;
  progressPercentage: number;
  courseCount: number;
  isSatisfied: boolean;
  courses: CreditSubjectItem[];
}

export interface SemesterPlanItem {
  semester: number;
  plannedTarget: number;
  registeredCredits: number;
  earnedCredits: number;
  failedCredits: number;
  pendingCredits: number;
  isCompleted: boolean;
  courses: CreditSubjectItem[];
}

export interface GraduationChecklistItem {
  id: string;
  label: string;
  isSatisfied: boolean;
  current: string | number;
  required: string | number;
  details?: string;
}

export interface GraduationEligibilityResult {
  isEligible: boolean;
  status:
    | 'Eligible under configured rules'
    | 'Requirements remaining'
    | 'Pending results or verification'
    | 'Official rules not configured';
  checklist: GraduationChecklistItem[];
  deficitCategories: Array<{ name: string; remaining: number }>;
  failedCourses: CreditSubjectItem[];
}
