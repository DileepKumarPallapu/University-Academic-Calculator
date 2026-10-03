import type { RegulationId } from '../config/university';

export type ConfidenceLevel = 'high' | 'medium' | 'low' | 'none';

export interface AmsStudentInfo {
  name: string;
  nameConfidence: ConfidenceLevel;
  registerNumber: string;
  regConfidence: ConfidenceLevel;
  department: string;
  program: string;
  semester: number | null;
  semesterConfidence: ConfidenceLevel;
  academicYear: string;
  regulation: RegulationId | null;
  regulationConfidence: ConfidenceLevel;
  college: string;
}

export interface AmsSubject {
  id: string;
  subjectCode: string;
  subjectName: string;
  credits: number | '' | null;
  grade: string;
  gradePoint: number | null;
  status: string; // e.g., 'Pass', 'RA', 'Absent', 'Fail'
  source: string;
  isDuplicate: boolean;
  isExcluded: boolean;
  isManuallyEdited: boolean;
  originalValues?: {
    subjectCode: string;
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
}
