import type { RegulationId } from '../config/university';

export type ConfidenceLevel = 'high' | 'medium' | 'low' | 'none';
export type FieldSource = 'AMS' | 'USER' | 'PROFILE' | 'REGULATION' | 'AMS + User';

export type AmsFileType = 'image' | 'pdf' | 'csv' | 'excel';

export type DocumentClassification =
  | 'AMS_RESULT'
  | 'SEMESTER_RESULT'
  | 'MARKS_STATEMENT'
  | 'GRADE_SHEET'
  | 'ACADEMIC_TRANSCRIPT'
  | 'UNKNOWN_ACADEMIC_DOCUMENT'
  | 'UNSUPPORTED';

export interface DetectedFormatInfo {
  formatName: string;
  formatDescription?: string;
  confidence: 'High' | 'Medium' | 'Review';
  detectedColumns: string[];
  missingColumns: string[];
  tablePresence: boolean;
  headerRowIndex?: number;
  hasStudentInfoArea: boolean;
  availableColumnsCount: number;
  notes?: string;
}

export interface ColumnMapping {
  sno?: string;
  courseCode?: string;
  subjectName?: string;
  credits?: string;
  grade?: string;
  gradePoint?: string;
  resultStatus?: string;
  [key: string]: string | undefined;
}

export interface StudentFieldVerification {
  field: string;
  label: string;
  value: string;
  sources: string[];
  isAgreement: boolean;
  status: 'verified' | 'review_required';
}

export interface ProfileMatchResult {
  isMatch: boolean;
  hasSavedProfile: boolean;
  status: 'match' | 'different' | 'none';
  savedName?: string;
  importedName?: string;
  savedRegNo?: string;
  importedRegNo?: string;
  diffs: { field: string; saved: string; imported: string }[];
  differences?: { field: string; saved?: string; profileValue?: string; imported?: string; importedValue?: string }[];
}

export interface AmsStudentInfo {
  name: string;
  nameConfidence: ConfidenceLevel;
  nameSource?: 'AMS' | 'USER' | 'PROFILE';
  studentId?: string;
  studentIdSource?: 'AMS' | 'USER';
  registerNumber: string;
  regConfidence: ConfidenceLevel;
  regSource?: 'AMS' | 'USER' | 'PROFILE';
  degree?: string;
  degreeSource?: 'AMS' | 'USER';
  branch?: string;
  branchSource?: 'AMS' | 'USER';
  department: string;
  program: string;
  batch?: string;
  batchSource?: 'AMS' | 'USER';
  resultMonthYear?: string;
  resultMonthYearSource?: 'AMS' | 'USER';
  resultType?: string;
  resultTypeSource?: 'AMS' | 'USER';
  semester: number | null;
  semesterConfidence: ConfidenceLevel;
  semesterSource?: 'AMS' | 'USER' | 'PROFILE';
  academicYear: string;
  regulation: RegulationId | null;
  regulationConfidence: ConfidenceLevel;
  regulationSource?: 'AMS' | 'USER' | 'REGULATION' | 'PROFILE';
  college: string;
  studentNameMismatch?: boolean;
  nameVerified?: boolean;
  verifications?: StudentFieldVerification[];
}

export interface AmsSubject {
  id: string;
  sno?: number;
  subjectCode: string | null;
  subjectName: string;
  credits: number | '' | null;
  grade: string;
  gradePoint: number | null;
  status: string; // e.g., 'Pass', 'RA', 'AB', 'NE'
  source: 'AMS' | 'USER';
  creditsSource?: 'AMS' | 'USER';
  gradePointSource?: 'AMS' | 'REGULATION' | 'USER';
  isDuplicate: boolean;
  isExcluded: boolean;
  isManuallyEdited: boolean;
  hasOriginalCredits?: boolean;
  semesterContext?: number; // Semester context for cross-semester duplicate protection
  originalValues?: {
    subjectCode: string | null;
    subjectName: string;
    credits: number | '' | null;
    grade: string;
    gradePoint: number | null;
  };
  confidence: {
    code: ConfidenceLevel;
    name: ConfidenceLevel;
    credits: ConfidenceLevel;
    grade: ConfidenceLevel;
    gradePoint: ConfidenceLevel;
  };
}

export type AmsPageType = 'AMS_RESULT_TABLE' | 'OTHER_ACADEMIC_DOCUMENT' | 'UNSUPPORTED';

export interface AuditChecklistItem {
  id: string;
  label: string;
  status: 'passed' | 'failed' | 'warning' | 'pending';
  detail?: string;
}

export interface ScanStepItem {
  step: number;
  title: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  detail?: string;
}

export interface CalculationTraceItem {
  sno?: number;
  subjectName: string;
  subjectCode?: string | null;
  credits: number;
  grade: string;
  gradePoint: number;
  creditPoints: number;
  isNonCredit: boolean;
  formulaStr: string;
}

export interface AmsExtractionResult {
  studentInfo: AmsStudentInfo;
  subjects: AmsSubject[];
  duplicatesDetected: number;
  duplicatesExcluded: number;
  fileType: AmsFileType;
  fileName: string;
  fileSize: number;
  pageCount: number;
  previewUrls: string[]; // data URLs or object URLs of pages
  rawText: string;
  imageQualityWarning?: string;
  importedAt: number;
  pageType: AmsPageType;
  documentClassification?: DocumentClassification;
  formatInfo?: DetectedFormatInfo;
  columnMapping?: ColumnMapping;
  unrecognizedReason?: string;
  tableDetected?: boolean;
  detectedColumns?: string[];
  detectedRowsCount?: number;
  extractedRowsCount?: number;
  missingRowNumbers?: number[];
  rowAccountingVerified?: boolean;
  scanSteps?: ScanStepItem[];
  profileMatch?: ProfileMatchResult;
}

export interface AmsAuditSummary {
  subjectsDetected: number;
  subjectsIncluded: number;
  creditBearingCount: number;
  nonCreditCount: number;
  duplicatesCount: number;
  duplicatesExcluded: number;
  manualCorrectionsCount: number;
  fieldsRequiringInput: number;
  totalCredits: number;
  totalQualityPoints: number;
  sgpa: number | null;
  fieldsDetectedAutomatically?: string[];
  fieldsEnteredByUser?: string[];
  detectedRowsCount?: number;
  extractedRowsCount?: number;
  missingRowNumbers?: number[];
  rowAccountingVerified?: boolean;
  studentNameVerified?: boolean;
  creditsDetectedInSource?: boolean;
  preCalculationAudit?: AuditChecklistItem[];
  readyToCalculate?: boolean;
  calculationIssues?: string[];
  creditsEnteredCount?: number;
  totalSubjectsCount?: number;
  calculationTrace?: CalculationTraceItem[];
}

export interface AmsSemesterResult {
  id: string;
  semesterNumber: number;
  semesterLabel: string;
  studentInfo?: AmsStudentInfo;
  subjects?: AmsSubject[];
  subjectsCount?: number;
  auditSummary?: AmsAuditSummary;
  fileName?: string;
  previewUrl?: string;
  sgpa: number | null;
  totalCredits: number;
  totalQualityPoints: number;
  isVerified: boolean;
  verified?: boolean;
}

export interface AmsCgpaResult {
  semesters: AmsSemesterResult[];
  totalCredits: number;
  totalQualityPoints: number;
  cgpa: number | null;
  calculationTrace: {
    semesterLabel: string;
    sgpa: number;
    credits: number;
    weightedPoints: number;
    formulaStr: string;
  }[];
}

export interface RecentAmsImport {
  id: string;
  timestamp: number;
  calculationType: 'SGPA' | 'CGPA';
  studentName: string;
  registerNumber: string;
  semesterLabel: string;
  score: number; // SGPA or CGPA
  totalCredits: number;
  totalQualityPoints: number;
  subjectCount: number;
  regulation: string;
  extractionResult?: AmsExtractionResult;
  auditSummary?: AmsAuditSummary;
  cgpaResult?: AmsCgpaResult;
}
