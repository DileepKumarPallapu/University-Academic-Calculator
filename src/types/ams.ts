import type { RegulationId } from '../config/university';

export type ConfidenceLevel = 'high' | 'medium' | 'low' | 'none';

export interface AmsStudentInfo {
  name: string;
  nameConfidence: ConfidenceLevel;
  studentId?: string;
  registerNumber: string;
  regConfidence: ConfidenceLevel;
  degree?: string;
  branch?: string;
  department: string;
  program: string;
  batch?: string;
  resultMonthYear?: string;
  resultType?: string;
  semester: number | null;
  semesterConfidence: ConfidenceLevel;
  academicYear: string;
  regulation: RegulationId | null;
  regulationConfidence: ConfidenceLevel;
  college: string;
  studentNameMismatch?: boolean;
  nameVerified?: boolean;
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

export interface AmsExtractionResult {
  studentInfo: AmsStudentInfo;
  subjects: AmsSubject[];
  duplicatesDetected: number;
  duplicatesExcluded: number;
  fileType: 'image' | 'pdf';
  fileName: string;
  fileSize: number;
  pageCount: number;
  previewUrls: string[]; // data URLs or object URLs of pages
  rawText: string;
  imageQualityWarning?: string;
  importedAt: number;
  tableDetected?: boolean;
  detectedColumns?: string[];
  detectedRowsCount?: number;
  extractedRowsCount?: number;
  missingRowNumbers?: number[];
  rowAccountingVerified?: boolean;
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
}
