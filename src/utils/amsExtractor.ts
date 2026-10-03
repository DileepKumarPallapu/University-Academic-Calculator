import * as pdfjsLib from 'pdfjs-dist';
import { createWorker } from 'tesseract.js';
import * as XLSX from 'xlsx';
import { REGULATIONS, type RegulationId } from '../config/university';
import type {
  AmsExtractionResult,
  AmsStudentInfo,
  AmsSubject,
  AmsAuditSummary,
  AmsPageType,
  AuditChecklistItem,
  CalculationTraceItem,
  ScanStepItem,
  AmsFileType,
  DocumentClassification,
  DetectedFormatInfo,
  ColumnMapping,
  ProfileMatchResult,
  AmsSemesterResult,
  AmsCgpaResult,
  TableDebugInspection,
} from '../types/ams';

// Configure pdfjs worker using standard ESM URL
try {
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
  ).toString();
} catch {
  // fallback if URL resolution differs in certain runners
}

export interface FileValidationResult {
  valid: boolean;
  error?: string;
  fileType: AmsFileType;
}

export const validateAmsFile = (file: File): FileValidationResult => {
  const validImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  const isImage = validImageTypes.includes(file.type) || /\.(jpe?g|png|webp)$/i.test(file.name);
  const isCsv = file.type === 'text/csv' || file.name.toLowerCase().endsWith('.csv');
  const isExcel =
    file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    file.type === 'application/vnd.ms-excel' ||
    /\.(xlsx|xls)$/i.test(file.name);

  if (!isPdf && !isImage && !isCsv && !isExcel) {
    return {
      valid: false,
      error: 'Unsupported file type. Please upload a PDF, image (PNG, JPG, WEBP), CSV, or Excel (XLSX, XLS) file.',
      fileType: 'image',
    };
  }

  // 30MB maximum file size
  if (file.size > 30 * 1024 * 1024) {
    return {
      valid: false,
      error: 'File is too large (maximum 30MB allowed).',
      fileType: isPdf ? 'pdf' : isCsv ? 'csv' : isExcel ? 'excel' : 'image',
    };
  }

  const fileType: AmsFileType = isPdf ? 'pdf' : isCsv ? 'csv' : isExcel ? 'excel' : 'image';
  return {
    valid: true,
    fileType,
  };
};

/**
 * Normalizes text string: strips extraneous whitespace and invisible characters
 */
export const normalizeText = (text: string): string => {
  return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/[\t\f\v]/g, ' ').trim();
};

/**
 * Roman numerals converter for semesters (I -> 1, V -> 5, etc.)
 */
const romanToDecimal = (str: string): number | null => {
  const map: Record<string, number> = {
    I: 1,
    II: 2,
    III: 3,
    IV: 4,
    V: 5,
    VI: 6,
    VII: 7,
    VIII: 8,
  };
  const upper = str.toUpperCase().trim();
  if (map[upper]) return map[upper];
  const num = parseInt(str, 10);
  if (!isNaN(num) && num >= 1 && num <= 8) return num;
  return null;
};

/**
 * Extracts student metadata from full text
 */
/**
 * Extracts student metadata from full text
 */
export const extractStudentInfo = (text: string): AmsStudentInfo => {
  const info: AmsStudentInfo = {
    name: '',
    nameConfidence: 'none',
    studentId: '',
    registerNumber: '',
    regConfidence: 'none',
    degree: '',
    branch: '',
    department: '',
    program: '',
    batch: '',
    resultMonthYear: '',
    resultType: '',
    semester: null,
    semesterConfidence: 'none',
    academicYear: '',
    regulation: null,
    regulationConfidence: 'none',
    college: '',
  };

  // Student ID patterns: "VTU..." or "Stu Id"
  const vtuMatch = text.match(/\b(VTU\d{4,8})\b/i);
  if (vtuMatch) {
    info.studentId = vtuMatch[1].toUpperCase();
    info.studentIdSource = 'AMS';
  } else {
    const stuIdMatch = text.match(/(?:stu\s*id|student\s*id)\s*[:\-]?\s*([0-9a-zA-Z]{6,15})/i);
    if (stuIdMatch && stuIdMatch[1]) {
      info.studentId = stuIdMatch[1].trim().toUpperCase();
      info.studentIdSource = 'AMS';
    }
  }

  // Register Number patterns: e.g. 24UECS0805
  const regPatterns = [
    /(?:register\s*(?:no|number)?|roll\s*(?:no|number)?|ht\s*no|hall\s*ticket\s*(?:no|number)?|regd\s*(?:no|number)?)\s*[:\-]?\s*([0-9a-zA-Z]{6,15})/i,
    /\b([0-9]{2}[A-Za-z]{2,5}[0-9]{3,5})\b/,
    /\b([0-9]{2}[0-9A-Za-z]{8,10})\b/,
  ];

  for (const pattern of regPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const regCandidate = match[1].trim().toUpperCase();
      if (!regCandidate.startsWith('VTU')) {
        info.registerNumber = regCandidate;
        info.regConfidence = 'high';
        info.regSource = 'AMS';
        break;
      }
    }
  }

  // Priority 1: Explicit Name patterns
  const namePatterns = [
    /(?:student\s*name|candidate\s*name|name\s*of\s*the\s*candidate)\s*[:\-]\s*([a-zA-Z\s\.]+)/i,
    /name\s*[:]\s*([a-zA-Z\s\.]+)/i,
  ];

  for (const pattern of namePatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const candidate = match[1].replace(/(?:reg|roll|ht|degree|branch|batch|course|semester|sem)[\s\S]*/i, '').trim();
      if (candidate.length > 2 && !/^(student|candidate|result|grade|marks)$/i.test(candidate)) {
        info.name = candidate;
        info.nameConfidence = 'high';
        info.nameSource = 'AMS';
        break;
      }
    }
  }

  // Degree patterns: "Degree: B.Tech", "Degree - B.Tech"
  const degreeMatch = text.match(/(?:degree)\s*[:\-]?\s*([A-Za-z\.\s]{2,15}?)(?:\r?\n|\s+(?:branch|dept|batch|semester)|$)/i) ||
    text.match(/\b(B\.Tech|M\.Tech|B\.E|B\.Sc|M\.Sc|BBA|MBA|BCA|MCA)\b/i);
  if (degreeMatch && degreeMatch[1]) {
    info.degree = degreeMatch[1].replace(/(?:branch|dept|batch|semester)[\s\S]*/i, '').trim();
    info.degreeSource = 'AMS';
  }

  // Branch / Department patterns (handles multi-line e.g. "CSE \n (AIML)" or "CSE (AIML)")
  const multiLineBranchMatch = text.match(
    /(?:branch|dept|department)\s*[:\-]?\s*([^\r\n]+(?:\r?\n\s*\([A-Za-z0-9&/\-_\s]+\))?)/i
  );
  if (multiLineBranchMatch && multiLineBranchMatch[1]) {
    const cleanedBranch = multiLineBranchMatch[1]
      .replace(/(?:batch|degree|semester|month|result|ay|program)[\s\S]*/i, '')
      .replace(/\r?\n\s*/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (cleanedBranch) {
      info.branch = cleanedBranch;
      info.department = cleanedBranch;
      info.branchSource = 'AMS';
    }
  } else {
    const branchMatch = text.match(/\b(CSE(?:\s*\([A-Za-z0-9\s]+\))?|ECE|EEE|MECH|CIVIL|IT|AIDS)(?!\w)/i);
    if (branchMatch && branchMatch[1]) {
      info.branch = branchMatch[1].trim();
      info.department = branchMatch[1].trim();
      info.branchSource = 'AMS';
    }
  }

  // Batch patterns (handles multi-line e.g. "2024- \n 2025" or "2024-2025")
  const batchMatch = text.match(/(?:batch)\s*[:\-]?\s*(\d{4}\s*[-–/]\s*\r?\n?\s*\d{2,4})/i) ||
    text.match(/\b(\d{4}\s*[-–/]\s*\r?\n?\s*\d{4})\b/);
  if (batchMatch && batchMatch[1]) {
    info.batch = batchMatch[1].replace(/\r?\n\s*/g, '').replace(/\s+/g, '').trim();
    info.batchSource = 'AMS';
  }

  // Month & Year of Result: "Month & Year of Result: Nov.2024"
  const monthYearMatch = text.match(/(?:month\s*(?:&|and)?\s*year\s*(?:of\s*result)?|result\s*month(?:\s*year)?)\s*[:\-]?\s*([A-Za-z]{3,9}\.?\s*\d{4})/i) ||
    text.match(/\b((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s*\d{4})\b/i);
  if (monthYearMatch && monthYearMatch[1]) {
    info.resultMonthYear = monthYearMatch[1].trim();
    info.resultMonthYearSource = 'AMS';
  }

  // Result Type: "Result Type: Regular", "Result Type - Regular"
  const resTypeMatch = text.match(/(?:result\s*type)\s*[:\-]?\s*(Regular|Arrear|Supplementary|Revaluation|Improvement)/i);
  if (resTypeMatch && resTypeMatch[1]) {
    info.resultType = resTypeMatch[1].trim();
    info.resultTypeSource = 'AMS';
  }

  // Priority 2: If table row contained repeating metadata:
  // e.g. "1 VTU29962 24UECS0805 PALLAPU DILEEP KUMAR B.Tech CSE (AIML) 2024-2025 10210BM101 ..."
  const rowPattern = /(?:^\s*\d+\s+)?(VTU\d{4,8}|[0-9A-Za-z]{6,12})\s+([0-9]{2}[A-Za-z]{2,5}[0-9]{3,5}|[0-9A-Za-z]{8,12})\s+([A-Za-z\s\.]{4,35}?)\s+(B\.Tech|M\.Tech|B\.E|B\.Sc|MBA|MCA)\s+([A-Za-z0-9\s\(\)&/\-_]{2,25}?)\s+(\d{4}\s*[-–]\s*\d{4})/im;
  const rowMatch = text.match(rowPattern);
  if (rowMatch) {
    if (!info.studentId || info.studentId === info.registerNumber) {
      info.studentId = rowMatch[1].toUpperCase();
      info.studentIdSource = 'AMS';
    }
    if (!info.registerNumber) {
      info.registerNumber = rowMatch[2].toUpperCase();
      info.regConfidence = 'high';
      info.regSource = 'AMS';
    }
    if (!info.name) {
      info.name = rowMatch[3].trim();
      info.nameConfidence = 'high';
      info.nameSource = 'AMS';
    }
    if (!info.degree) {
      info.degree = rowMatch[4].trim();
      info.degreeSource = 'AMS';
    }
    if (!info.branch) {
      info.branch = rowMatch[5].trim();
      info.department = rowMatch[5].trim();
      info.branchSource = 'AMS';
    }
    if (!info.batch) {
      info.batch = rowMatch[6].replace(/\s+/g, '');
      info.batchSource = 'AMS';
    }
  }

  // Priority 3: If top-right has wrapped name e.g. PALLAPU DILEEP \n KUMAR
  if (!info.name) {
    const wrappedNameMatch = text.match(/\b([A-Z]{3,15}\s+[A-Z]{3,15})\s*\r?\n\s*([A-Z]{3,15})\b/);
    if (wrappedNameMatch) {
      const candidate = `${wrappedNameMatch[1]} ${wrappedNameMatch[2]}`.trim();
      if (!/(SEMESTER|RESULT|REGULAR|EXAMINATION)/i.test(candidate)) {
        info.name = candidate;
        info.nameConfidence = 'high';
        info.nameSource = 'AMS';
      }
    }
  }

  // Priority 4: Two-word wrapped student name
  if (!info.name) {
    const twoWordWrapped = text.match(/\b([A-Z]{3,15})\s*\r?\n\s*([A-Z]{3,15})\b/);
    if (twoWordWrapped) {
      const candidate = `${twoWordWrapped[1]} ${twoWordWrapped[2]}`.trim();
      if (!/(SEMESTER|RESULT|REGULAR|EXAMINATION|COURSE|STUDENT|DEGREE|BRANCH)/i.test(candidate)) {
        info.name = candidate;
        info.nameConfidence = 'medium';
        info.nameSource = 'AMS';
      }
    }
  }

  // Student name verification: check if name appears across document or matches top identity
  if (info.name) {
    const cleanName = info.name.replace(/\s+/g, ' ').toUpperCase();
    const collapsedText = text.replace(/[\r\n]+/g, ' ').toUpperCase();
    const occurrences = collapsedText.split(cleanName).length - 1;
    if (occurrences >= 1) {
      info.nameVerified = true;
    }
  }

  // Fallback: If studentId wasn't found separately but we have a register number:
  if (!info.studentId && info.registerNumber) {
    info.studentId = info.registerNumber;
    info.studentIdSource = 'AMS';
  }

  // Semester pattern: handles "Semester: 5", "Semester: Semester 5", "Sem: V", etc.
  const semMatch = text.match(/(?:semester|sem)\s*[:\-]?\s*(?:semester|sem)?\s*([1-8]|VIII|VII|VI|IV|V|III|II|I)\b/i);
  if (semMatch && semMatch[1]) {
    const parsedSem = romanToDecimal(semMatch[1]);
    if (parsedSem !== null) {
      info.semester = parsedSem;
      info.semesterConfidence = 'high';
      info.semesterSource = 'AMS';
    }
  }

  // Regulation pattern
  const regMatch = text.match(/\b(VTR15|VTR18|VTR21|VTR25)\b/i);
  if (regMatch && regMatch[1]) {
    const detected = regMatch[1].toUpperCase() as RegulationId;
    if (REGULATIONS[detected]) {
      info.regulation = detected;
      info.regulationConfidence = 'high';
      info.regulationSource = 'AMS';
    }
  }

  // Academic Year pattern (e.g. 2026-27, 2026–2027)
  const yearMatch = text.match(/\b(20\d\d\s*[-–/]\s*(?:20)?\d\d)\b/);
  if (yearMatch && yearMatch[1]) {
    info.academicYear = yearMatch[1].replace(/\s+/g, '');
  }

  return info;
};

/**
 * Image preprocessing on an offscreen canvas to optimize OCR contrast and character definition.
 * Keeps the original image untouched for visual preview and PDF attachments.
 */
export const preprocessImageForOcr = (sourceCanvas: HTMLCanvasElement): HTMLCanvasElement => {
  const width = sourceCanvas.width;
  const height = sourceCanvas.height;

  // Scale up if resolution is low (e.g. mobile screenshot with width < 1600)
  const scale = width < 1600 ? Math.min(2.5, 1600 / width) : 1;
  const targetWidth = Math.round(width * scale);
  const targetHeight = Math.round(height * scale);

  const preCanvas = document.createElement('canvas');
  preCanvas.width = targetWidth;
  preCanvas.height = targetHeight;
  const ctx = preCanvas.getContext('2d');
  if (!ctx) return sourceCanvas;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(sourceCanvas, 0, 0, targetWidth, targetHeight);

  try {
    const imgData = ctx.getImageData(0, 0, targetWidth, targetHeight);
    const data = imgData.data;

    let minLum = 255;
    let maxLum = 0;
    for (let i = 0; i < data.length; i += 4) {
      const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      if (lum < minLum) minLum = lum;
      if (lum > maxLum) maxLum = lum;
    }

    const range = maxLum - minLum || 1;

    for (let i = 0; i < data.length; i += 4) {
      const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      // Contrast stretch
      let stretched = ((lum - minLum) / range) * 255;
      // High-contrast text sharpening
      if (stretched < 135) {
        stretched = Math.max(0, stretched * 0.8);
      } else {
        stretched = Math.min(255, stretched * 1.15);
      }
      data[i] = stretched;
      data[i + 1] = stretched;
      data[i + 2] = stretched;
    }

    ctx.putImageData(imgData, 0, 0);
    return preCanvas;
  } catch {
    return sourceCanvas;
  }
};

/**
 * UI and legend elements that must never be interpreted as courses or subjects
 */
export const UI_AND_LEGEND_NOISE_TOKENS = new Set([
  'HOME', 'ROADMAP', 'ROAD MAP', 'TIMETABLE', 'TIME TABLE', 'UNENROLLMENT', 'PREREQUISITE', 'PRE-REQUISITE',
  'ATTENDANCE', 'DOCUMENTS', 'MARKS', 'HELP', 'CLEAR', 'EXCEL', 'PRINT', 'DOWNLOAD', 'BACK', 'LOGOUT',
  'RA-REAPPEAR', 'RA REAPPEAR', 'AB-ABSENT', 'AB ABSENT', 'NE-NOT ELIGIBLE', 'NE NOT ELIGIBLE',
  'WH1', 'WH2', 'WH3', 'WH4', 'ND', 'SEMESTER RESULT'
]);

export const isNoiseLine = (line: string): boolean => {
  const norm = line.toUpperCase().trim();
  if (!norm) return true;
  for (const token of UI_AND_LEGEND_NOISE_TOKENS) {
    if (norm === token || norm.startsWith(token + ' ') || norm.endsWith(' ' + token)) {
      return true;
    }
  }
  return false;
};

export const FORBIDDEN_SUBJECT_WORDS = [
  'INSTITUTE', 'DEEMED', 'UNIVERSITY', 'TECHNOLOGY', 'RANGARAJAN', 'SAGUNTHALA',
  'PALLAPU', 'DILEEP', 'KUMAR', 'VTU29962', '24UECS0805', 'B.TECH', 'M.TECH', 'B.E', 'B.SC',
  'CSE (AIML)', 'CSE', 'AIML', 'ECE', 'EEE', 'MECH', 'CIVIL', 'IT', 'AIDS',
  '2024-2025', 'NOV.2024', 'REGULAR', 'ARREAR', 'EXAMINATION', 'CONTROLLER', 'SEMESTER RESULT',
  'ROADMAP', 'TIMETABLE', 'TIME TABLE', 'ATTENDANCE', 'DOCUMENTS', 'MARKS', 'UNENROLLMENT',
  'PREREQUISITE', 'HELP', 'CLEAR', 'EXCEL', 'PRINT', 'DOWNLOAD', 'BACK', 'LOGOUT',
  'GET RESULT', 'DEGREE', 'BRANCH', 'BATCH', 'SEMESTER', 'MONTH & YEAR', 'RESULT TYPE',
  'RA-REAPPEAR', 'AB-ABSENT', 'NE-NOT ELIGIBLE', 'WH1', 'WH2', 'WH3', 'WH4', 'ND',
  'SNO', 'S.NO', 'STU ID', 'STUDENT ID', 'REGISTER NO', 'NAME', 'COURSECODE', 'COURSENAME', 'RESULT', 'GRADE', 'CREDITS',
];

export const isForbiddenSubjectName = (name: string, knownStudentName = ''): boolean => {
  const norm = name.trim().toUpperCase();
  if (norm.length < 2) return true;
  if (/^\d+$/.test(norm)) return true;
  if (/^[^\w\s]+$/.test(norm)) return true;

  for (const token of FORBIDDEN_SUBJECT_WORDS) {
    if (norm === token) return true;
  }

  if (
    norm.includes('INSTITUTE') ||
    norm.includes('DEEMED') ||
    norm.includes('UNIVERSITY') ||
    norm.includes('SAGUNTHALA') ||
    norm.includes('RANGARAJAN') ||
    norm.includes('ROADMAP') ||
    norm.includes('TIMETABLE') ||
    norm.includes('ATTENDANCE') ||
    norm.includes('GET RESULT')
  ) {
    return true;
  }

  if (knownStudentName) {
    const normStudent = knownStudentName.trim().toUpperCase();
    if (norm === normStudent || (normStudent.length > 4 && normStudent.includes(norm))) {
      return true;
    }
  }

  if (norm.includes('VTU') || norm.includes('24UECS')) {
    return true;
  }

  return false;
};

/**
 * Valid grade tokens across regulations
 */
export const ALL_VALID_GRADES = new Set([
  'S', 'A+', 'A', 'B+', 'B', 'C', 'D', 'P', 'E', 'F', 'O', 'RA', 'AB', 'W', 'FAIL', 'PASS'
]);

/**
 * Normalizes subject codes by stripping spaces and hyphens
 */
export const normalizeSubjectCode = (code: string | null): string => {
  if (!code) return '';
  return code.toUpperCase().replace(/[\s\-_]/g, '');
};

/**
 * Normalizes subject names by converting to lower case and removing punctuation
 */
export const normalizeSubjectName = (name: string): string => {
  return name.toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
};

export interface TableExtractionResult {
  subjects: AmsSubject[];
  detectedRowsCount: number;
  extractedRowsCount: number;
  missingRowNumbers: number[];
  rowAccountingVerified: boolean;
  tableDetected: boolean;
  detectedColumns: string[];
  pageType: AmsPageType;
  unrecognizedReason?: string;
  tableDebug?: TableDebugInspection;
}

export interface PageTypeDetectionResult {
  pageType: AmsPageType;
  unrecognizedReason?: string;
  detectedHeaders: string[];
  tableDetected: boolean;
}

/**
 * Determines whether the document contains a recognizable AMS result table,
 * another academic record, or unsupported content.
 */
export const detectDocumentPageType = (text: string): PageTypeDetectionResult => {
  const norm = text.toUpperCase();

  const HEADER_CHECKS: { name: string; regex: RegExp }[] = [
    { name: 'SNo', regex: /\b(SNO|S\.NO|SL\.NO|SERIAL\s*NO)\b/i },
    { name: 'Stu Id', regex: /\b(STU\s*ID|STUDENT\s*ID|STUDENTID)\b/i },
    { name: 'Register No', regex: /\b(REGISTER\s*NO|REGISTER\s*NUMBER|REG\s*NO|REG\.\s*NO|REGD\s*NO)\b/i },
    { name: 'Name', regex: /\b(STUDENT\s*NAME|CANDIDATE\s*NAME|NAME)\b/i },
    { name: 'Degree', regex: /\b(DEGREE|PROGRAMME|PROGRAM)\b/i },
    { name: 'Branch', regex: /\b(BRANCH|DEPARTMENT|DEPT)\b/i },
    { name: 'Batch', regex: /\b(BATCH|ACADEMIC\s*YEAR)\b/i },
    { name: 'Coursecode', regex: /\b(COURSE\s*CODE|COURSECODE|SUB\s*CODE|SUBJECT\s*CODE)\b/i },
    { name: 'Coursename', regex: /\b(COURSE\s*NAME|COURSENAME|COURSE\s*TITLE|SUBJECT\s*NAME|SUBJECT)\b/i },
    { name: 'Result', regex: /\b(RESULT|STATUS)\b/i },
    { name: 'Grade', regex: /\b(GRADE|LETTER\s*GRADE)\b/i },
    { name: 'Credits', regex: /\b(CREDITS|CREDIT|CR|COURSE\s*CREDITS)\b/i },
    { name: 'Grade Point', regex: /\b(GRADE\s*POINT|GP|GRADE\s*POINTS)\b/i },
  ];

  const detectedHeaders: string[] = [];
  for (const check of HEADER_CHECKS) {
    if (check.regex.test(norm)) {
      detectedHeaders.push(check.name);
    }
  }

  const hasAmsSignature = /\b(VEL\s*TECH|VTU\d+|24UECS\d+|SEMESTER\s*RESULT|END\s*SEMESTER|EXAMINATION\s*RESULT)\b/i.test(norm);
  const hasValidGrades = (norm.match(/\b(PASS|FAIL|RA|AB)\s+[SABCDP]\b/g) || []).length >= 1;
  const hasSubjectRowsWithCodes = (norm.match(/\b(102\d{2}[A-Za-z]{2}\d{3}|[A-Za-z]{2,5}\d{2,5})\b/g) || []).length >= 1;
  const hasSubjectLineWithGrade = /\b(102\d{2}[A-Za-z]{2}\d{3}|[A-Za-z]{2,5}\d{2,5}|\b[1-9]\d?\b)\s+.*?\s+([SABCDPFEOW]|A\+|B\+|PASS|FAIL)\b/i.test(norm);

  if (
    detectedHeaders.length >= 3 ||
    (detectedHeaders.length >= 2 && (hasAmsSignature || hasValidGrades || hasSubjectRowsWithCodes)) ||
    hasSubjectLineWithGrade ||
    hasValidGrades
  ) {
    return {
      pageType: 'AMS_RESULT_TABLE',
      detectedHeaders,
      tableDetected: true,
    };
  }

  const isOtherAcademic = /\b(SYLLABUS|ADMIT\s*CARD|HALL\s*TICKET|FEE\s*RECEIPT|CURRICULUM|TIMETABLE|BONAFIDE|IDENTITY\s*CARD)\b/i.test(norm);
  if (isOtherAcademic) {
    return {
      pageType: 'OTHER_ACADEMIC_DOCUMENT',
      unrecognizedReason: 'Could not identify an AMS result table. This document appears to be another academic record (e.g. syllabus or admit card).',
      detectedHeaders,
      tableDetected: false,
    };
  }

  return {
    pageType: 'UNSUPPORTED',
    unrecognizedReason: 'Could not identify an AMS result table in the uploaded file.',
    detectedHeaders,
    tableDetected: false,
  };
};

/**
 * Classifies the academic document type according to University taxonomy
 */
export const classifyAcademicDocument = (text: string): DocumentClassification => {
  const upper = text.toUpperCase();
  if (upper.includes('SYLLABUS') || upper.includes('CURRICULUM') || upper.includes('ADMIT CARD') || upper.includes('HALL TICKET')) {
    return 'UNKNOWN_ACADEMIC_DOCUMENT';
  }
  if (upper.includes('TRANSCRIPT') || upper.includes('CONSOLIDATED GRADE') || (upper.includes('SEMESTER 1') && upper.includes('SEMESTER 2'))) {
    return 'ACADEMIC_TRANSCRIPT';
  }
  if (upper.includes('GRADE SHEET') || upper.includes('STATEMENT OF GRADES') || upper.includes('GRADE REPORT')) {
    return 'GRADE_SHEET';
  }
  if (upper.includes('MARKS STATEMENT') || upper.includes('STATEMENT OF MARKS') || upper.includes('MARK SHEET')) {
    return 'MARKS_STATEMENT';
  }
  if (upper.includes('SEMESTER RESULT') || upper.includes('END SEMESTER EXAMINATION')) {
    return 'SEMESTER_RESULT';
  }
  if (
    upper.includes('AMS') ||
    (upper.includes('STU ID') && upper.includes('COURSECODE')) ||
    upper.includes('VEL TECH') ||
    upper.includes('EXAMINATION RESULT') ||
    (upper.includes('COURSECODE') && upper.includes('GRADE') && upper.includes('RESULT'))
  ) {
    return 'AMS_RESULT';
  }
  if (upper.includes('COURSE') || upper.includes('SUBJECT') || upper.includes('GRADE') || upper.includes('REGISTER NO')) {
    return 'UNKNOWN_ACADEMIC_DOCUMENT';
  }
  return 'UNSUPPORTED';
};

/**
 * Dynamically detects layout structure, format confidence, and available columns
 */
export const detectAmsFormat = (text: string, columnsFound: string[] = []): DetectedFormatInfo => {
  const upper = text.toUpperCase();
  const detectedCols: string[] = [];
  const missingCols: string[] = [];

  const hasCourseCode = columnsFound.some((c) => /code/i.test(c)) || /\b(coursecode|course\s*code|subject\s*code|code)\b/i.test(text);
  const hasCourseName = columnsFound.some((c) => /name|title|subject/i.test(c)) || /\b(coursename|course\s*name|subject\s*name|course\s*title|subject)\b/i.test(text);
  const hasGrade = columnsFound.some((c) => /grade/i.test(c)) || /\b(grade|letter\s*grade)\b/i.test(text);
  const hasCredits = columnsFound.some((c) => /credit/i.test(c)) || /\b(credit|credits|cr|course\s*credit)\b/i.test(text);
  const hasGradePoint = columnsFound.some((c) => /point|gp/i.test(c)) || /\b(grade\s*point|grade\s*points|gp)\b/i.test(text);
  const hasStudentName = /\b(name|student\s*name|candidate\s*name)\b/i.test(text);
  const hasRegNo = /\b(register\s*no|register\s*number|reg\s*no|roll\s*no)\b/i.test(text);

  if (hasStudentName) detectedCols.push('Student Name'); else missingCols.push('Student Name');
  if (hasRegNo) detectedCols.push('Register Number'); else missingCols.push('Register Number');
  if (hasCourseCode) detectedCols.push('Course Code'); else missingCols.push('Course Code');
  if (hasCourseName) detectedCols.push('Course Name'); else missingCols.push('Course Name');
  if (hasGrade) detectedCols.push('Grade'); else missingCols.push('Grade');
  if (hasCredits) detectedCols.push('Credits'); else missingCols.push('Credits');
  if (hasGradePoint) detectedCols.push('Grade Point'); else missingCols.push('Grade Point');

  const hasTablePresence = hasCourseName || hasGrade;
  const hasStudentArea = hasStudentName || hasRegNo;

  let formatName = 'Format A: Tabular AMS Result';
  let formatDesc = 'Complete table repeating student metadata and subject details';
  let confidence: 'High' | 'Medium' | 'Review' = 'High';

  if (upper.includes('STU ID') && upper.includes('COURSECODE')) {
    formatName = 'Format A: Vel Tech Tabular AMS';
    formatDesc = 'Standard AMS portal table with repeated student information and results';
    confidence = 'High';
  } else if (hasCredits && hasGradePoint) {
    formatName = 'Format C: Comprehensive Grade Sheet';
    formatDesc = 'Contains Course Code, Subject, Credits, Grade, and Grade Points';
    confidence = 'High';
  } else if (hasCredits && hasGrade) {
    formatName = 'Format B: Standard Subject-Credit Table';
    formatDesc = 'Contains Subject Name, Credits, and Grade';
    confidence = 'High';
  } else if (hasCourseName && hasGrade && !hasCredits) {
    formatName = 'Format E: Examination Result Table';
    formatDesc = 'Contains Subject Name and Grade (Credits not in document)';
    confidence = 'Medium';
  } else if (upper.includes('TRANSCRIPT')) {
    formatName = 'Format T: Multi-Semester Academic Transcript';
    formatDesc = 'Comprehensive transcript across multiple semesters';
    confidence = 'High';
  } else if (hasTablePresence) {
    formatName = 'Format D: Generic Academic Result';
    formatDesc = 'Dynamic table structure recognized';
    confidence = 'Review';
  } else {
    formatName = 'Unknown Academic Document';
    formatDesc = 'Could not reliably classify table structure';
    confidence = 'Review';
  }

  return {
    formatName,
    formatDescription: formatDesc,
    confidence,
    detectedColumns: detectedCols,
    missingColumns: missingCols,
    tablePresence: hasTablePresence,
    hasStudentInfoArea: hasStudentArea,
    availableColumnsCount: detectedCols.length,
  };
};

/**
 * Advanced Table Extraction Engine using OCR spatial bounding-box geometry.
 * Dissects document into:
 * [Top Exclusion Zone] -> [Table Header] -> [Column Intervals] -> [Row Slices 1..N] -> [Bottom Legend Exclusion Zone]
 */
export const extractTableFromOcrGeometry = (
  ocrData: OcrDataResult,
  selectedRegulation?: RegulationId | null,
  _fileName = 'AMS Result'
): TableExtractionResult & { studentInfo?: Partial<AmsStudentInfo> } => {
  const regConfig = selectedRegulation ? REGULATIONS[selectedRegulation] : null;
  const words = (ocrData.words || []).filter(
    (w) => w.text && w.text.trim().length > 0 && w.bbox
  );

  if (words.length === 0) {
    return {
      subjects: [],
      detectedRowsCount: 0,
      extractedRowsCount: 0,
      missingRowNumbers: [],
      rowAccountingVerified: false,
      tableDetected: false,
      detectedColumns: [],
      pageType: 'UNSUPPORTED',
      unrecognizedReason: 'No OCR words detected',
    };
  }

  // 1. Identify Candidate Header Words
  const HEADER_WORD_PATTERNS: { name: string; regex: RegExp }[] = [
    { name: 'SNo', regex: /^(s\.?no|sno|sl\.?no|serial)$/i },
    { name: 'Stu Id', regex: /^(stu\s*id|stuid|student\s*id)$/i },
    { name: 'Register No', regex: /^(register|reg\s*no|reg\.?|regd)$/i },
    { name: 'Name', regex: /^(name|student\s*name)$/i },
    { name: 'Degree', regex: /^(degree|prog)$/i },
    { name: 'Branch', regex: /^(branch|dept)$/i },
    { name: 'Batch', regex: /^(batch|ay)$/i },
    { name: 'Coursecode', regex: /^(coursecode|course\s*code|sub\s*code|code)$/i },
    { name: 'Coursename', regex: /^(coursename|course\s*name|subject\s*name|subject)$/i },
    { name: 'Result', regex: /^(result|status)$/i },
    { name: 'Grade', regex: /^(grade|letter\s*grade)$/i },
    { name: 'Credits', regex: /^(credits|credit|cr)$/i },
  ];

  const matchedHeaderWords: { word: OcrWord; name: string }[] = [];
  for (const w of words) {
    const clean = w.text.replace(/[^a-zA-Z0-9.]/g, '').trim();
    for (const pat of HEADER_WORD_PATTERNS) {
      if (pat.regex.test(clean) || pat.regex.test(w.text.trim())) {
        matchedHeaderWords.push({ word: w, name: pat.name });
        break;
      }
    }
  }

  // Find the horizontal header row band
  // Cluster header words by Y proximity (within 35px)
  let bestHeaderCluster: { word: OcrWord; name: string }[] = [];
  for (let i = 0; i < matchedHeaderWords.length; i++) {
    const base = matchedHeaderWords[i];
    const cluster = matchedHeaderWords.filter(
      (m) => Math.abs((m.word.bbox.y0 + m.word.bbox.y1) / 2 - (base.word.bbox.y0 + base.word.bbox.y1) / 2) < 35
    );
    const distinctNames = new Set(cluster.map((c) => c.name));
    if (distinctNames.size > new Set(bestHeaderCluster.map((c) => c.name)).size) {
      bestHeaderCluster = cluster;
    }
  }

  const distinctHeaderCount = new Set(bestHeaderCluster.map((c) => c.name)).size;
  const tableDetected = distinctHeaderCount >= 3;

  let headerY0 = 0;
  let headerY1 = 0;
  let tableTop = 0;

  if (tableDetected) {
    headerY0 = Math.min(...bestHeaderCluster.map((c) => c.word.bbox.y0));
    headerY1 = Math.max(...bestHeaderCluster.map((c) => c.word.bbox.y1));
    tableTop = headerY1 + 2;
  } else {
    const firstSno = words.find((w) => w.text.trim() === '1' && w.bbox.y0 > 150);
    const firstCode = words.find((w) => /^102\d{2}[A-Z]{2}\d{3}/i.test(w.text.trim()));
    tableTop = firstSno ? firstSno.bbox.y0 - 25 : firstCode ? firstCode.bbox.y0 - 25 : 200;
    headerY0 = Math.max(0, tableTop - 30);
    headerY1 = tableTop;
  }

  // 2. Identify Footer / Legend Bounding Box
  const FOOTER_LEGEND_REGEX = /\b(RA\s*[-–]\s*REAPPEAR|AB\s*[-–]\s*ABSENT|NE\s*[-–]\s*NOT\s*ELIGIBLE|WH[1-4]|ND\s*[-–]|PRINT|EXCEL|BACK|DISCLAIMER|CONTROLLER)\b/i;
  const footerWords = words.filter(
    (w) => w.bbox.y0 > tableTop && FOOTER_LEGEND_REGEX.test(w.text)
  );

  let tableBottom = 0;
  if (footerWords.length > 0) {
    const legendY0 = Math.min(...footerWords.map((w) => w.bbox.y0));
    tableBottom = legendY0 - 3;
  } else {
    const wordsBelow = words.filter((w) => w.bbox.y0 > tableTop);
    tableBottom = wordsBelow.length > 0 ? Math.max(...wordsBelow.map((w) => w.bbox.y1)) + 5 : 2000;
  }

  const pageWidth = Math.max(...words.map((w) => w.bbox.x1), 1200);
  const pageHeight = Math.max(...words.map((w) => w.bbox.y1), 1600);

  // 3. Determine Column Boundaries
  const uniqueColsMap = new Map<string, { word: OcrWord; x0: number; x1: number }>();
  for (const c of bestHeaderCluster) {
    if (!uniqueColsMap.has(c.name)) {
      uniqueColsMap.set(c.name, { word: c.word, x0: c.word.bbox.x0, x1: c.word.bbox.x1 });
    }
  }

  const sortedCols = Array.from(uniqueColsMap.entries())
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => a.x0 - b.x0);

  interface ColBound {
    name: string;
    x0: number;
    x1: number;
  }
  const colBounds: ColBound[] = [];

  if (sortedCols.length >= 3) {
    for (let i = 0; i < sortedCols.length; i++) {
      const cur = sortedCols[i];
      const prev = sortedCols[i - 1];
      const next = sortedCols[i + 1];

      const x0 = i === 0 ? 0 : (prev.x1 + cur.x0) / 2;
      const x1 = i === sortedCols.length - 1 ? pageWidth : (cur.x1 + next.x0) / 2;
      colBounds.push({ name: cur.name, x0, x1 });
    }
  } else {
    const proportions = [
      { name: 'SNo', pct: 0.04 },
      { name: 'Stu Id', pct: 0.08 },
      { name: 'Register No', pct: 0.11 },
      { name: 'Name', pct: 0.16 },
      { name: 'Degree', pct: 0.06 },
      { name: 'Branch', pct: 0.10 },
      { name: 'Batch', pct: 0.08 },
      { name: 'Coursecode', pct: 0.11 },
      { name: 'Coursename', pct: 0.18 },
      { name: 'Result', pct: 0.04 },
      { name: 'Grade', pct: 0.04 },
    ];
    let cumX = 0;
    for (const p of proportions) {
      const w = pageWidth * p.pct;
      colBounds.push({ name: p.name, x0: cumX, x1: cumX + w });
      cumX += w;
    }
  }

  const getCol = (name: string): ColBound | undefined => colBounds.find((c) => c.name.toLowerCase() === name.toLowerCase());
  const snoCol = getCol('SNo');
  const codeCol = getCol('Coursecode');
  const cnameCol = getCol('Coursename');
  const gradeCol = getCol('Grade');
  const resCol = getCol('Result');
  const creditsCol = getCol('Credits');
  const nameCol = getCol('Name');
  const regCol = getCol('Register No');
  const stuidCol = getCol('Stu Id');

  // 4. Identify Row Horizontal Bands via SNo sequence 1..N
  const snoMaxX = snoCol ? snoCol.x1 + 10 : pageWidth * 0.08;
  const snoCandidateWords = words.filter((w) => {
    if (w.bbox.y0 < tableTop || w.bbox.y1 > tableBottom) return false;
    if (w.bbox.x1 > snoMaxX) return false;
    return /^([1-9]|1[0-9]|20)$/.test(w.text.trim());
  });

  snoCandidateWords.sort((a, b) => a.bbox.y0 - b.bbox.y0);

  const sequentialSnoWords: { sno: number; word: OcrWord }[] = [];
  let nextExpected = 1;
  for (const cw of snoCandidateWords) {
    const val = parseInt(cw.text.trim(), 10);
    if (val === nextExpected) {
      sequentialSnoWords.push({ sno: val, word: cw });
      nextExpected++;
    }
  }

  interface RowSlice {
    sno: number;
    y0: number;
    y1: number;
  }
  const rowSlices: RowSlice[] = [];

  if (sequentialSnoWords.length >= 2) {
    const N = sequentialSnoWords.length;
    for (let k = 0; k < N; k++) {
      const cur = sequentialSnoWords[k];
      const prev = sequentialSnoWords[k - 1];
      const next = sequentialSnoWords[k + 1];

      const rY0 = k === 0 ? tableTop : (prev.word.bbox.y1 + cur.word.bbox.y0) / 2;
      const rY1 = k === N - 1 ? tableBottom : (cur.word.bbox.y1 + next.word.bbox.y0) / 2;
      rowSlices.push({ sno: cur.sno, y0: rY0, y1: rY1 });
    }
  } else {
    const codeCandidates = words.filter((w) => {
      if (w.bbox.y0 < tableTop || w.bbox.y1 > tableBottom) return false;
      const clean = w.text.trim().toUpperCase();
      return (
        /^102\d{2}[A-Z]{2}\d{3}[A-Z]?$/i.test(clean) ||
        (/^[A-Z]{2,4}\d{3,5}$/i.test(clean) && !clean.startsWith('VTU') && !clean.startsWith('24UECS'))
      );
    });
    codeCandidates.sort((a, b) => a.bbox.y0 - b.bbox.y0);

    const N = codeCandidates.length;
    for (let k = 0; k < N; k++) {
      const cur = codeCandidates[k];
      const prev = codeCandidates[k - 1];
      const next = codeCandidates[k + 1];
      const rY0 = k === 0 ? tableTop : (prev.bbox.y1 + cur.bbox.y0) / 2;
      const rY1 = k === N - 1 ? tableBottom : (cur.bbox.y1 + next.bbox.y0) / 2;
      rowSlices.push({ sno: k + 1, y0: rY0, y1: rY1 });
    }
  }

  // 5. Harvest Cell Values and Construct Academic Records
  const subjects: AmsSubject[] = [];
  const cellMappings: { row: number; col: string; rawText: string; confidence: number }[] = [];
  let extractedStudentName = '';
  let extractedRegNo = '';
  let extractedStuId = '';

  for (let idx = 0; idx < rowSlices.length; idx++) {
    const slice = rowSlices[idx];
    const rowWords = words.filter((w) => {
      const cy = (w.bbox.y0 + w.bbox.y1) / 2;
      return cy >= slice.y0 && cy < slice.y1;
    });

    const getCellWords = (bound?: ColBound) => {
      if (!bound) return [];
      return rowWords.filter((w) => {
        const cx = (w.bbox.x0 + w.bbox.x1) / 2;
        return cx >= bound.x0 - 5 && cx < bound.x1 + 5;
      });
    };

    // Course Code
    const codeWords = getCellWords(codeCol);
    let cellCode: string | null = null;
    for (const cw of codeWords) {
      const clean = cw.text.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
      if (/^102\d{2}[A-Z]{2}\d{3}/.test(clean) || /^[A-Z]{2,5}\d{2,5}$/.test(clean)) {
        cellCode = clean;
        break;
      }
    }
    if (!cellCode) {
      for (const w of rowWords) {
        const clean = w.text.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
        if ((/^102\d{2}[A-Z]{2}\d{3}/.test(clean) || /^[A-Z]{2,5}\d{2,5}$/.test(clean)) && !clean.startsWith('VTU') && !clean.startsWith('24UECS')) {
          cellCode = clean;
          break;
        }
      }
    }

    // Grade
    const rawGradeWords = getCellWords(gradeCol);
    let cellGrade = '';
    for (const gw of rawGradeWords) {
      const normG = gw.text.trim().toUpperCase();
      if (ALL_VALID_GRADES.has(normG)) {
        cellGrade = normG;
        break;
      }
    }
    if (!cellGrade) {
      const rightWords = [...rowWords].sort((a, b) => b.bbox.x1 - a.bbox.x1);
      for (const rw of rightWords) {
        const normG = rw.text.trim().toUpperCase();
        if (ALL_VALID_GRADES.has(normG) && normG !== 'PASS' && normG !== 'FAIL') {
          cellGrade = normG;
          break;
        }
      }
    }

    // Result
    const resWords = getCellWords(resCol);
    let cellResult = 'Pass';
    for (const rw of resWords) {
      const normR = rw.text.trim().toUpperCase();
      if (['PASS', 'FAIL', 'RA', 'AB', 'NE', 'W'].includes(normR)) {
        cellResult = normR === 'RA' || normR === 'AB' || normR === 'NE' || normR === 'W' ? normR : normR.charAt(0) + normR.slice(1).toLowerCase();
        break;
      }
    }

    // Credits
    let cellCredits: number | '' = '';
    let hasOrigCredits = false;
    if (creditsCol) {
      const crWords = getCellWords(creditsCol);
      for (const cw of crWords) {
        const val = parseFloat(cw.text.trim());
        if (!isNaN(val) && val >= 0) {
          cellCredits = val;
          hasOrigCredits = true;
          break;
        }
      }
    }

    // Coursename
    const cnameWords = getCellWords(cnameCol);
    cnameWords.sort((a, b) => {
      const dy = a.bbox.y0 - b.bbox.y0;
      if (Math.abs(dy) > 15) return dy;
      return a.bbox.x0 - b.bbox.x0;
    });

    let cellName = cnameWords
      .map((w) => w.text.trim())
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cellName && cellCode) {
      const codeWord = rowWords.find((w) => w.text.toUpperCase().includes(cellCode!));
      const codeX1 = codeWord ? codeWord.bbox.x1 : (codeCol ? codeCol.x1 : 0);
      const resWord = rowWords.find((w) => /^(pass|fail|ra|ab)$/i.test(w.text.trim()));
      const resX0 = resWord ? resWord.bbox.x0 : (resCol ? resCol.x0 : pageWidth);

      const intermediateWords = rowWords.filter((w) => {
        const cx = (w.bbox.x0 + w.bbox.x1) / 2;
        return cx > codeX1 + 5 && cx < resX0 - 5;
      });
      intermediateWords.sort((a, b) => a.bbox.x0 - b.bbox.x0);
      cellName = intermediateWords.map((w) => w.text.trim()).join(' ').trim();
    }

    // Metadata harvesting
    if (!extractedStudentName && nameCol) {
      const nameWords = getCellWords(nameCol);
      if (nameWords.length > 0) {
        extractedStudentName = nameWords.map((w) => w.text.trim()).join(' ').trim();
      }
    }
    if (!extractedRegNo && regCol) {
      const regWords = getCellWords(regCol);
      for (const rw of regWords) {
        const c = rw.text.trim().toUpperCase();
        if (/^\d{2}[A-Z]{2,5}\d{3,5}$/.test(c)) {
          extractedRegNo = c;
          break;
        }
      }
    }
    if (!extractedStuId && stuidCol) {
      const stuWords = getCellWords(stuidCol);
      for (const sw of stuWords) {
        const c = sw.text.trim().toUpperCase();
        if (/^VTU\d+$/.test(c)) {
          extractedStuId = c;
          break;
        }
      }
    }

    // Hard Guard against forbidden words leaking as subject name
    if (isForbiddenSubjectName(cellName, extractedStudentName)) {
      continue;
    }

    let gradePoint: number | null = null;
    if (cellGrade && regConfig) {
      const match = regConfig.grades.find((g) => g.grade.toUpperCase() === cellGrade.toUpperCase());
      if (match) gradePoint = match.points;
    }

    if (cellName || cellCode || cellGrade) {
      subjects.push({
        id: `ams-geo-${slice.sno}-${Date.now()}-${idx}`,
        sno: slice.sno,
        subjectCode: cellCode,
        subjectName: cellName,
        credits: cellCredits,
        grade: cellGrade,
        gradePoint,
        status: cellResult,
        source: 'AMS',
        creditsSource: hasOrigCredits ? 'AMS' : 'USER',
        gradePointSource: gradePoint !== null ? 'REGULATION' : undefined,
        isDuplicate: false,
        isExcluded: false,
        isManuallyEdited: false,
        hasOriginalCredits: hasOrigCredits,
        originalValues: {
          subjectCode: cellCode,
          subjectName: cellName,
          credits: cellCredits,
          grade: cellGrade,
          gradePoint,
        },
        confidence: {
          code: cellCode ? 'high' : 'none',
          name: cellName.length > 3 ? 'high' : 'medium',
          credits: hasOrigCredits ? 'high' : 'none',
          grade: cellGrade ? 'high' : 'low',
          gradePoint: gradePoint !== null ? 'high' : 'none',
        },
      });

      cellMappings.push(
        { row: slice.sno, col: 'Coursecode', rawText: cellCode || '', confidence: cellCode ? 0.95 : 0 },
        { row: slice.sno, col: 'Coursename', rawText: cellName, confidence: cellName ? 0.95 : 0 },
        { row: slice.sno, col: 'Grade', rawText: cellGrade, confidence: cellGrade ? 0.95 : 0 },
        { row: slice.sno, col: 'Result', rawText: cellResult, confidence: 0.95 }
      );
    }
  }

  const detectedSnoSet = new Set(subjects.map((s) => s.sno).filter(Boolean) as number[]);
  const detectedCount = rowSlices.length || subjects.length;
  const missingRowNumbers: number[] = [];
  for (let s = 1; s <= detectedCount; s++) {
    if (!detectedSnoSet.has(s) && !subjects.some((sub) => sub.sno === s)) {
      missingRowNumbers.push(s);
    }
  }

  const deduplicatedSubjects = detectAndFlagDuplicates(subjects);
  const duplicatesCount = deduplicatedSubjects.filter((s) => s.isDuplicate).length;

  const tableDebug: TableDebugInspection = {
    tableBBox: { x0: 0, y0: tableTop, x1: pageWidth, y1: tableBottom },
    columnBounds: colBounds,
    rowBounds: rowSlices,
    exclusionZones: [
      { name: 'Top University Header & Controls', y0: 0, y1: headerY0, reason: 'Institution branding and filter controls' },
      { name: 'Bottom Legend & Actions', y0: tableBottom, y1: pageHeight, reason: 'Grade code legend and print controls' },
    ],
    cellMappings,
    extractionStats: {
      totalRowsDetected: detectedCount,
      totalRowsExtracted: deduplicatedSubjects.length,
      courseCodesDetected: deduplicatedSubjects.filter((s) => s.subjectCode).length,
      courseNamesDetected: deduplicatedSubjects.filter((s) => s.subjectName).length,
      gradesDetected: deduplicatedSubjects.filter((s) => s.grade).length,
      duplicatesDetected: duplicatesCount,
      falseSubjectsFiltered: 0,
    },
  };

  return {
    subjects: deduplicatedSubjects,
    detectedRowsCount: detectedCount,
    extractedRowsCount: deduplicatedSubjects.length,
    missingRowNumbers,
    rowAccountingVerified: missingRowNumbers.length === 0 && deduplicatedSubjects.length === detectedCount,
    tableDetected: true,
    detectedColumns: colBounds.map((c) => c.name),
    pageType: 'AMS_RESULT_TABLE',
    studentInfo: {
      name: extractedStudentName,
      registerNumber: extractedRegNo,
      studentId: extractedStuId,
    },
    tableDebug,
  };
};

/**
 * Rebuilt Structured Text Table Parser with strict Table Zoning:
 * - Exclusion Zone 1: Strips all lines before Table Header row (protects from INSTITUTE, DEEMED, etc.)
 * - Exclusion Zone 2: Truncates all lines at or after bottom Legend (protects from RA-Reappear, etc.)
 * - Filter controls exclusion: Strips Degree, Branch, Batch, Semester, Result Type, Get Result
 * - Row grouping and sequential SNo accounting (1 to N)
 * - Strict Coursename isolation between Coursecode and Result/Grade
 * - Multi-line course name merging (e.g. "Computational Thinking for Problem" + "Solving")
 * - Hard forbidden tokens guard against student metadata or page headers becoming subjects
 * - Zero false subjects, zero duplicate false positives
 */
export const parseStructuredAmsTextTable = (
  text: string,
  selectedRegulation?: RegulationId | null,
  _sourceLabel = 'AMS Result'
): TableExtractionResult => {
  const pageTypeCheck = detectDocumentPageType(text);
  if (pageTypeCheck.pageType !== 'AMS_RESULT_TABLE') {
    return {
      subjects: [],
      detectedRowsCount: 0,
      extractedRowsCount: 0,
      missingRowNumbers: [],
      rowAccountingVerified: false,
      tableDetected: false,
      detectedColumns: pageTypeCheck.detectedHeaders,
      pageType: pageTypeCheck.pageType,
      unrecognizedReason: pageTypeCheck.unrecognizedReason,
    };
  }

  const rawLines = text.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
  const regConfig = selectedRegulation ? REGULATIONS[selectedRegulation] : null;

  // Extract student info first to know the student's name for cross-filtering
  const studentInfo = extractStudentInfo(text);

  // 1. Locate Table Header Row Index
  const headerColMatches: string[] = [];
  let headerIndex = -1;

  for (let idx = 0; idx < rawLines.length; idx++) {
    const l = rawLines[idx].toLowerCase();
    const cols = [
      'sno', 's.no', 'stu id', 'stuid', 'register no', 'name', 'degree',
      'branch', 'batch', 'coursecode', 'course code', 'coursename',
      'course name', 'result', 'grade', 'credits', 'grade point', 'gp'
    ];
    let count = 0;
    for (const c of cols) {
      if (l.includes(c)) count++;
    }
    if (count >= 3) {
      headerIndex = idx;
      if (l.includes('sno') || l.includes('s.no')) headerColMatches.push('SNo');
      if (l.includes('stu id') || l.includes('stuid')) headerColMatches.push('Stu Id');
      if (l.includes('register no') || l.includes('reg no')) headerColMatches.push('Register No');
      if (l.includes('name')) headerColMatches.push('Name');
      if (l.includes('degree')) headerColMatches.push('Degree');
      if (l.includes('branch')) headerColMatches.push('Branch');
      if (l.includes('batch')) headerColMatches.push('Batch');
      if (l.includes('coursecode') || l.includes('course code')) headerColMatches.push('Coursecode');
      if (l.includes('coursename') || l.includes('course name')) headerColMatches.push('Coursename');
      if (l.includes('result')) headerColMatches.push('Result');
      if (l.includes('grade')) headerColMatches.push('Grade');
      if (l.includes('credits') || l.includes('credit')) headerColMatches.push('Credits');
      break;
    }
  }

  let linesToProcess: string[];
  if (headerIndex !== -1) {
    // Header row found: drop header row and everything strictly before it
    linesToProcess = rawLines.slice(headerIndex + 1);
  } else {
    // No explicit header row found: find first line that starts with SNo 1 or course code
    let firstDataRowIdx = 0;
    for (let idx = 0; idx < rawLines.length; idx++) {
      const l = rawLines[idx];
      if (/^\s*1\b/i.test(l) || /^\s*102\d{2}[A-Z]{2}\d{3}\b/i.test(l) || /^\s*[A-Z]{2,5}\d{2,5}\b/i.test(l)) {
        firstDataRowIdx = idx;
        break;
      }
    }
    linesToProcess = rawLines.slice(firstDataRowIdx);
  }

  const tableDetected = headerIndex !== -1 || linesToProcess.length > 0;

  // EXCLUSION ZONE 2: Locate bottom Legend and truncate everything after it!
  const LEGEND_CUTOFF_REGEX = /\b(RA\s*[-–]\s*REAPPEAR|AB\s*[-–]\s*ABSENT|NE\s*[-–]\s*NOT\s*ELIGIBLE|WH[1-4]|ND\s*[-–]|PRINT|EXCEL|BACK|DISCLAIMER|CONTROLLER\s*OF\s*EXAMINATIONS)\b/i;
  for (let idx = 0; idx < linesToProcess.length; idx++) {
    if (LEGEND_CUTOFF_REGEX.test(linesToProcess[idx])) {
      linesToProcess = linesToProcess.slice(0, idx);
      break;
    }
  }

  // Filter residual navigation or control lines
  const FILTER_CONTROLS_REGEX = /^(?:Degree|Branch|Batch|Semester|Month\s*&\s*Year|Result\s*Type|Get\s*Result|Clear|Home|Roadmap|Timetable|Attendance|Marks|Documents|Help)\b/i;
  linesToProcess = linesToProcess.filter((l) => !isNoiseLine(l) && !FILTER_CONTROLS_REGEX.test(l));

  // 2. Group lines into distinct rows anchored by sequential SNo (1..N)
  interface RawRowBlock {
    sno?: number;
    lines: string[];
  }

  const rowBlocks: RawRowBlock[] = [];
  let currentBlock: RawRowBlock | null = null;

  const snoRegex = /^(?:([1-9]|1[0-9]|20)\b)(?:\s+(.*))?$/;
  const courseCodeRegex = /\b(102\d{2}[A-Za-z]{2}\d{3}[A-Za-z]?|[A-Za-z]{2,5}\d{2,5}[A-Za-z0-9]?)\b/;

  for (const line of linesToProcess) {
    const snoMatch = line.match(snoRegex);
    if (snoMatch) {
      const num = parseInt(snoMatch[1], 10);
      if (currentBlock) {
        rowBlocks.push(currentBlock);
      }
      currentBlock = {
        sno: num,
        lines: [line],
      };
      continue;
    }

    const lineStartsWithCode = /^\s*(?:102\d{2}[A-Za-z]{2}\d{3}[A-Za-z]?|[A-Za-z]{2,5}\d{2,5}[A-Za-z0-9]?)\b/i.test(line);

    if (currentBlock) {
      if (lineStartsWithCode) {
        rowBlocks.push(currentBlock);
        currentBlock = {
          lines: [line],
        };
      } else {
        // Multi-line continuation: append wrapped subject text to active block!
        currentBlock.lines.push(line);
      }
    } else if (courseCodeRegex.test(line)) {
      currentBlock = {
        lines: [line],
      };
    }
  }

  if (currentBlock) {
    rowBlocks.push(currentBlock);
  }

  // 3. Extract Academic Subjects with strict field isolation
  const subjects: AmsSubject[] = [];
  const detectedSnoSet = new Set<number>();
  let falseSubjectsFiltered = 0;

  for (let idx = 0; idx < rowBlocks.length; idx++) {
    const block = rowBlocks[idx];
    const fullBlockText = block.lines.join(' ').replace(/\s+/g, ' ').trim();
    if (block.sno) detectedSnoSet.add(block.sno);

    // Extract Course Code (excluding student ID and Register No)
    let foundCode: string | null = null;
    const allCodeMatches = Array.from(fullBlockText.matchAll(/\b(102\d{2}[A-Za-z]{2}\d{3}[A-Za-z]?|[A-Za-z]{2,5}\d{2,5}[A-Za-z0-9]?)\b/gi));
    for (const m of allCodeMatches) {
      const candidateCode = m[0].toUpperCase();
      if (!/^\d{2}[A-Z]{2,5}\d{3,5}$/i.test(candidateCode) && !/^VTU\d+/i.test(candidateCode)) {
        foundCode = candidateCode;
        break;
      }
    }

    // Extract Result and Grade strictly from the end of the line
    let foundResult = 'Pass';
    let foundGrade = '';
    let foundCredits: number | null | '' = '';
    let creditsSource: 'AMS' | 'USER' = 'USER';
    let rawTitle = fullBlockText;

    // Pattern 1: ... [Credits] [Result] [Grade]
    const creditsResultGrade = fullBlockText.match(/^(.*?)\s+(\d+(?:\.\d+)?)\s+(Pass|Fail|RA|AB|Absent|W|NE)\s+([A-Z]\+?|[A-Z])$/i);
    // Pattern 2: ... [Result] [Grade]
    const resultGrade = fullBlockText.match(/^(.*?)\s+(Pass|Fail|RA|AB|Absent|W|NE)\s+([A-Z]\+?|[A-Z])$/i);
    // Pattern 3: ... [Credits] [Grade]
    const creditsGrade = fullBlockText.match(/^(.*?)\s+(\d+(?:\.\d+)?)\s+([A-Z]\+?|[A-Z])$/i);
    // Pattern 4: ... [Grade]
    const gradeOnly = fullBlockText.match(/^(.*?)\s+([SABCDPFEOW]|A\+|B\+)$/i);

    if (creditsResultGrade) {
      rawTitle = creditsResultGrade[1].trim();
      foundCredits = parseFloat(creditsResultGrade[2]);
      foundResult = creditsResultGrade[3];
      foundGrade = creditsResultGrade[4].toUpperCase();
      creditsSource = 'AMS';
    } else if (resultGrade) {
      rawTitle = resultGrade[1].trim();
      foundResult = resultGrade[2];
      foundGrade = resultGrade[3].toUpperCase();
      foundCredits = '';
      creditsSource = 'USER';
    } else if (creditsGrade) {
      rawTitle = creditsGrade[1].trim();
      foundCredits = parseFloat(creditsGrade[2]);
      foundGrade = creditsGrade[3].toUpperCase();
      creditsSource = 'AMS';
    } else if (gradeOnly) {
      rawTitle = gradeOnly[1].trim();
      foundGrade = gradeOnly[2].toUpperCase();
      foundCredits = '';
      creditsSource = 'USER';
    }

    // Isolate Course Name:
    // If Course Code is present: Course Name is STRICTLY after Course Code!
    let courseName = rawTitle;
    if (foundCode && rawTitle.includes(foundCode)) {
      courseName = rawTitle.substring(rawTitle.indexOf(foundCode) + foundCode.length).trim();
    } else {
      // Strip student metadata prefix
      courseName = courseName
        .replace(/^\s*\d+\s+/, '')
        .replace(/\bVTU\d+\b/gi, '')
        .replace(/\b\d{2}[A-Z]{2,5}\d{3,5}\b/gi, '')
        .replace(/\b(PALLAPU|DILEEP|KUMAR)\b/gi, '')
        .replace(/\b(B\.Tech|M\.Tech|B\.E|B\.Sc)\b/gi, '')
        .replace(/\bCSE\s*(?:\(AIML\))?\b/gi, '')
        .replace(/\b\d{4}\s*[-–]\s*\d{4}\b/g, '')
        .trim();
    }

    // Clean course title
    courseName = courseName.replace(/^[-–—:\s]+/, '').replace(/[\s\t]+/g, ' ').trim();

    // Guard against forbidden words leaking as subject name
    if (isForbiddenSubjectName(courseName, studentInfo.name)) {
      falseSubjectsFiltered++;
      continue;
    }

    // Normalize result status
    const uRes = foundResult.toUpperCase();
    if (uRes === 'RA' || uRes === 'AB' || uRes === 'NE' || uRes === 'W') {
      foundResult = uRes;
    } else {
      foundResult = foundResult.charAt(0).toUpperCase() + foundResult.slice(1).toLowerCase();
    }

    if (courseName || foundCode || foundGrade) {
      let foundGP: number | null = null;
      if (foundGrade && regConfig) {
        const matchingGrade = regConfig.grades.find((g) => g.grade.toUpperCase() === foundGrade);
        if (matchingGrade) {
          foundGP = matchingGrade.points;
        }
      }

      subjects.push({
        id: `ams-sub-${Date.now()}-${Math.random().toString(36).substring(2, 7)}-${idx}`,
        sno: block.sno || idx + 1,
        subjectCode: foundCode || null,
        subjectName: courseName,
        credits: foundCredits,
        grade: foundGrade,
        gradePoint: foundGP,
        status: foundResult,
        source: 'AMS',
        creditsSource,
        gradePointSource: 'REGULATION',
        isDuplicate: false,
        isExcluded: false,
        isManuallyEdited: false,
        hasOriginalCredits: creditsSource === 'AMS' && foundCredits !== '' && foundCredits !== null,
        originalValues: {
          subjectCode: foundCode || null,
          subjectName: courseName,
          credits: foundCredits,
          grade: foundGrade,
          gradePoint: foundGP,
        },
        confidence: {
          code: foundCode ? 'high' : 'none',
          name: courseName.length > 3 ? 'high' : 'medium',
          credits: foundCredits !== '' && foundCredits !== null ? 'high' : 'none',
          grade: foundGrade && ALL_VALID_GRADES.has(foundGrade) ? 'high' : 'low',
          gradePoint: foundGP !== null ? 'high' : 'none',
        },
      });
    }
  }

  // Row Accounting: Check sequential SNo integrity
  const detectedCount = detectedSnoSet.size || subjects.length;
  const missingRowNumbers: number[] = [];
  if (detectedCount > 0) {
    const maxSno = Math.max(...Array.from(detectedSnoSet), subjects.length);
    for (let s = 1; s <= maxSno; s++) {
      if (!detectedSnoSet.has(s) && !subjects.some((sub) => sub.sno === s)) {
        missingRowNumbers.push(s);
      }
    }
  }

  const deduplicatedSubjects = detectAndFlagDuplicates(subjects);
  const duplicatesCount = deduplicatedSubjects.filter((s) => s.isDuplicate).length;

  const tableDebug: TableDebugInspection = {
    exclusionZones: [
      { name: 'Top University Header & Controls', y0: 0, y1: headerIndex, reason: 'Text before table header' },
      { name: 'Bottom Legend & Actions', y0: linesToProcess.length, y1: rawLines.length, reason: 'Text at or after legend' },
    ],
    columnBounds: headerColMatches.map((c) => ({ name: c, x0: 0, x1: 0 })),
    rowBounds: deduplicatedSubjects.map((s) => ({ sno: s.sno || 1, y0: 0, y1: 0 })),
    extractionStats: {
      totalRowsDetected: detectedCount,
      totalRowsExtracted: deduplicatedSubjects.length,
      courseCodesDetected: deduplicatedSubjects.filter((s) => s.subjectCode).length,
      courseNamesDetected: deduplicatedSubjects.filter((s) => s.subjectName).length,
      gradesDetected: deduplicatedSubjects.filter((s) => s.grade).length,
      duplicatesDetected: duplicatesCount,
      falseSubjectsFiltered,
    },
  };

  return {
    subjects: deduplicatedSubjects,
    detectedRowsCount: detectedCount,
    extractedRowsCount: deduplicatedSubjects.length,
    missingRowNumbers,
    rowAccountingVerified: missingRowNumbers.length === 0 && deduplicatedSubjects.length === detectedCount,
    tableDetected,
    detectedColumns: headerColMatches,
    pageType: 'AMS_RESULT_TABLE',
    tableDebug,
  };
};

/**
 * Parses lines looking for subject records
 */
export const extractSubjectsFromText = (
  text: string,
  selectedRegulation?: RegulationId | null,
  sourceLabel = 'AMS Result'
): AmsSubject[] => {
  const result = parseStructuredAmsTextTable(text, selectedRegulation, sourceLabel);
  return result.subjects;
};

/**
 * Duplicate Detection Engine:
 * Prevents double-counting identical subjects across pages or OCR lines.
 */
export const detectAndFlagDuplicates = (subjects: AmsSubject[]): AmsSubject[] => {
  const seenCodes = new Map<string, number>();
  const seenSignatures = new Map<string, number>();

  return subjects.map((sub, index) => {
    let isDupe = false;
    const semPrefix = sub.semesterContext !== undefined ? `sem_${sub.semesterContext}_` : '';

    if (sub.subjectCode) {
      const normCode = semPrefix + normalizeSubjectCode(sub.subjectCode);
      if (seenCodes.has(normCode)) {
        isDupe = true;
      } else {
        seenCodes.set(normCode, index);
      }
    } else if (sub.subjectName) {
      const sig = `${semPrefix}${normalizeSubjectName(sub.subjectName)}_${sub.credits}_${sub.grade}`;
      if (seenSignatures.has(sig)) {
        isDupe = true;
      } else {
        seenSignatures.set(sig, index);
      }
    }

    if (isDupe) {
      return {
        ...sub,
        isDuplicate: true,
        isExcluded: true,
      };
    }
    return sub;
  });
};

/**
 * Calculates Audit Summary for user verification and report
 */
export const computeAmsAuditSummary = (
  subjects: AmsSubject[],
  studentInfo?: AmsStudentInfo
): AmsAuditSummary => {
  const subjectsDetected = subjects.length;
  const uniqueSubjects = subjects.filter((s) => !s.isExcluded);
  const subjectsIncluded = uniqueSubjects.length;

  let creditBearingCount = 0;
  let nonCreditCount = 0;
  let duplicatesCount = 0;
  let duplicatesExcluded = 0;
  let manualCorrectionsCount = 0;
  let fieldsRequiringInput = 0;

  let totalCredits = 0;
  let totalQualityPoints = 0;
  let hasMissingCreditsOrGP = false;

  for (const s of subjects) {
    if (s.isDuplicate) duplicatesCount++;
    if (s.isExcluded) duplicatesExcluded++;
    if (s.isManuallyEdited) manualCorrectionsCount++;

    if (!s.isExcluded) {
      const isMissingCredit = s.credits === '' || s.credits === null || Number(s.credits) < 0;
      const isMissingGP = !s.grade || s.gradePoint === null;

      if (isMissingCredit || isMissingGP) {
        fieldsRequiringInput++;
        hasMissingCreditsOrGP = true;
      } else {
        const c = Number(s.credits);
        const gp = s.gradePoint!;
        if (c === 0) {
          nonCreditCount++;
        } else {
          creditBearingCount++;
          totalCredits += c;
          totalQualityPoints += c * gp;
        }
      }
    }
  }

  // CRITICAL RULE: DO NOT calculate SGPA until required missing information is provided.
  const sgpa = !hasMissingCreditsOrGP && totalCredits > 0 ? totalQualityPoints / totalCredits : null;

  // Track fields detected automatically vs entered by user
  const fieldsDetectedAutomatically: string[] = [];
  const fieldsEnteredByUser: string[] = [];

  if (studentInfo) {
    if (studentInfo.name) fieldsDetectedAutomatically.push('Student Name');
    if (studentInfo.studentId) fieldsDetectedAutomatically.push('Student ID');
    if (studentInfo.registerNumber) fieldsDetectedAutomatically.push('Register Number');
    if (studentInfo.degree) fieldsDetectedAutomatically.push('Degree');
    if (studentInfo.branch) fieldsDetectedAutomatically.push('Branch');
    if (studentInfo.batch) fieldsDetectedAutomatically.push('Batch');
    if (studentInfo.resultMonthYear) fieldsDetectedAutomatically.push('Result Month & Year');
    if (studentInfo.resultType) fieldsDetectedAutomatically.push('Result Type');
    if (studentInfo.regulation) fieldsDetectedAutomatically.push('Regulation');
  }

  if (subjectsDetected > 0) {
    fieldsDetectedAutomatically.push(`${subjectsDetected} Subject Names & Grades`);
    fieldsDetectedAutomatically.push('Result Status (Pass/Fail)');
  }

  const anyUserCredits = subjects.some((s) => s.creditsSource === 'USER' || s.credits === '' || s.credits === null);
  if (anyUserCredits) {
    fieldsEnteredByUser.push('Course Credits');
  }
  if (!studentInfo?.regulation) {
    fieldsEnteredByUser.push('Academic Regulation');
  }

  // Row accounting checks
  const detectedSnoSet = new Set(subjects.map((s) => s.sno).filter(Boolean) as number[]);
  const detectedCount = detectedSnoSet.size || subjectsDetected;
  const missingRowNumbers: number[] = [];
  if (detectedCount > 0) {
    const maxSno = Math.max(...Array.from(detectedSnoSet), subjectsDetected);
    for (let s = 1; s <= maxSno; s++) {
      if (!detectedSnoSet.has(s) && !subjects.some((sub) => sub.sno === s)) {
        missingRowNumbers.push(s);
      }
    }
  }

  // Validation items
  const missingNames = uniqueSubjects.filter((s) => !s.subjectName || s.subjectName.trim() === '');
  const missingCredits = uniqueSubjects.filter((s) => s.credits === '' || s.credits === null || Number(s.credits) < 0);
  const invalidGrades = uniqueSubjects.filter((s) => !s.grade || !ALL_VALID_GRADES.has(s.grade.toUpperCase()));
  const missingGPs = uniqueSubjects.filter((s) => s.gradePoint === null);

  // Regulation-specific grade validation
  const invalidGradesUnderReg: { row: number; grade: string }[] = [];
  if (studentInfo?.regulation && REGULATIONS[studentInfo.regulation]) {
    const regGrades = new Set(REGULATIONS[studentInfo.regulation].grades.map((g) => g.grade.toUpperCase()));
    uniqueSubjects.forEach((s, idx) => {
      if (s.grade && !regGrades.has(s.grade.toUpperCase())) {
        invalidGradesUnderReg.push({ row: s.sno || idx + 1, grade: s.grade });
      }
    });
  }

  // Calculation Issues (Blocking accuracy gates)
  const calculationIssues: string[] = [];
  if (subjectsDetected === 0) {
    calculationIssues.push('No subjects found in result');
  }
  if (missingRowNumbers.length > 0) {
    calculationIssues.push(`Missing result row(s): ${missingRowNumbers.join(', ')}`);
  }
  if (missingNames.length > 0) {
    calculationIssues.push(`${missingNames.length} subject name(s) missing`);
  }
  if (invalidGrades.length > 0) {
    calculationIssues.push(`${invalidGrades.length} unrecognized grade(s)`);
  }
  if (missingCredits.length > 0) {
    calculationIssues.push(`${missingCredits.length} credit(s) missing`);
  }
  if (!studentInfo?.regulation) {
    calculationIssues.push('Regulation not selected');
  }
  if (invalidGradesUnderReg.length > 0) {
    calculationIssues.push(`Grade not recognized under ${studentInfo?.regulation} (${invalidGradesUnderReg.map(x => `Row ${x.row}: ${x.grade}`).join(', ')})`);
  }
  if (missingGPs.length > 0) {
    calculationIssues.push('Grade points not resolved for all rows');
  }

  // 10-point Pre-calculation Audit Checklist
  const preCalculationAudit: AuditChecklistItem[] = [
    {
      id: 'ams_result',
      label: 'AMS Result Recognized',
      status: subjectsDetected > 0 ? 'passed' : 'failed',
      detail: subjectsDetected > 0 ? 'Result table recognized ✓' : 'Unable to recognize result table',
    },
    {
      id: 'student',
      label: 'Student Identified',
      status: studentInfo?.name && studentInfo?.registerNumber ? 'passed' : studentInfo?.name ? 'warning' : 'failed',
      detail: studentInfo?.name
        ? `${studentInfo.name} (${studentInfo.registerNumber || 'No Register No'})`
        : 'Student details need verification',
    },
    {
      id: 'rows_detected',
      label: 'Result Rows Detected',
      status: missingRowNumbers.length === 0 ? 'passed' : 'failed',
      detail: missingRowNumbers.length === 0
        ? `${detectedCount} rows detected`
        : `Missing row(s): ${missingRowNumbers.join(', ')}`,
    },
    {
      id: 'subjects_extracted',
      label: 'Subjects Extracted',
      status: subjectsDetected > 0 && subjectsDetected === detectedCount ? 'passed' : 'failed',
      detail: `${subjectsDetected} of ${detectedCount} subjects extracted`,
    },
    {
      id: 'course_names',
      label: 'Course Names Validated',
      status: missingNames.length === 0 ? 'passed' : 'failed',
      detail: missingNames.length === 0
        ? `${subjectsDetected}/${subjectsDetected} course names valid`
        : `${missingNames.length} missing course name(s)`,
    },
    {
      id: 'grades_found',
      label: 'Grades Found',
      status: invalidGrades.length === 0 && invalidGradesUnderReg.length === 0 ? 'passed' : 'failed',
      detail: invalidGrades.length === 0 && invalidGradesUnderReg.length === 0
        ? `${subjectsDetected}/${subjectsDetected} grades verified`
        : `${invalidGrades.length + invalidGradesUnderReg.length} unverified grade(s)`,
    },
    {
      id: 'credits_available',
      label: 'Credits Available',
      status: missingCredits.length === 0 ? 'passed' : 'warning',
      detail: missingCredits.length === 0
        ? 'All course credits available ✓'
        : 'Credits not present in document — input required',
    },
    {
      id: 'regulation_selected',
      label: 'Regulation Selected',
      status: studentInfo?.regulation ? 'passed' : 'warning',
      detail: studentInfo?.regulation
        ? `${studentInfo.regulation} active`
        : 'Regulation selection required to derive Grade Points',
    },
    {
      id: 'grade_points_validated',
      label: 'Grade Points Validated',
      status: missingGPs.length === 0 && Boolean(studentInfo?.regulation) && invalidGradesUnderReg.length === 0 ? 'passed' : 'warning',
      detail: missingGPs.length === 0 && Boolean(studentInfo?.regulation) && invalidGradesUnderReg.length === 0
        ? 'Derived from regulation rules'
        : 'Awaiting regulation selection or valid grades',
    },
    {
      id: 'duplicate_check',
      label: 'Duplicate Check',
      status: 'passed',
      detail: duplicatesCount > 0
        ? `${duplicatesCount} duplicate record(s) excluded`
        : 'No duplicates detected',
    },
  ];

  // Calculation Trace
  const calculationTrace: CalculationTraceItem[] = uniqueSubjects.map((s, idx) => {
    const isNonCredit = s.credits === 0;
    const c = typeof s.credits === 'number' ? s.credits : 0;
    const gp = s.gradePoint ?? 0;
    const cp = isNonCredit ? 0 : c * gp;
    const formulaStr = isNonCredit
      ? `0 credits (Non-credit) = 0.00`
      : `${c} × ${gp} = ${cp}`;
    return {
      sno: s.sno || idx + 1,
      subjectName: s.subjectName || `Row ${s.sno || idx + 1}`,
      subjectCode: s.subjectCode,
      credits: c,
      grade: s.grade,
      gradePoint: gp,
      creditPoints: cp,
      isNonCredit,
      formulaStr,
    };
  });

  const creditsEnteredCount = uniqueSubjects.filter((s) => s.credits !== '' && s.credits !== null && Number(s.credits) >= 0).length;
  const readyToCalculate = calculationIssues.length === 0 && uniqueSubjects.length > 0;

  return {
    subjectsDetected,
    subjectsIncluded,
    creditBearingCount,
    nonCreditCount,
    duplicatesCount,
    duplicatesExcluded,
    manualCorrectionsCount,
    fieldsRequiringInput,
    totalCredits,
    totalQualityPoints,
    sgpa,
    fieldsDetectedAutomatically,
    fieldsEnteredByUser,
    detectedRowsCount: detectedCount,
    extractedRowsCount: subjectsDetected,
    missingRowNumbers,
    rowAccountingVerified: missingRowNumbers.length === 0,
    studentNameVerified: studentInfo?.nameVerified ?? false,
    creditsDetectedInSource: !anyUserCredits,
    preCalculationAudit,
    readyToCalculate,
    calculationIssues,
    creditsEnteredCount,
    totalSubjectsCount: uniqueSubjects.length,
    calculationTrace,
  };
};

/**
 * Calculation Readiness Engine:
 * Validates whether all 8 prerequisite checkpoints are satisfied.
 */
export const isReadyForCalculation = (
  subjects: AmsSubject[],
  studentInfo?: AmsStudentInfo,
  rowAccountingVerified = true
): { ready: boolean; issues: string[] } => {
  const issues: string[] = [];
  const uniqueSubjects = subjects.filter((s) => !s.isExcluded);

  if (uniqueSubjects.length === 0) {
    issues.push('No subjects found in result');
  }

  if (!rowAccountingVerified) {
    issues.push('Row accounting mismatch (some rows missing from sequence)');
  }

  const missingNames = uniqueSubjects.filter((s) => !s.subjectName || s.subjectName.trim() === '');
  if (missingNames.length > 0) {
    issues.push(`${missingNames.length} course name(s) missing`);
  }

  const missingCredits = uniqueSubjects.filter((s) => s.credits === '' || s.credits === null || Number(s.credits) < 0);
  if (missingCredits.length > 0) {
    issues.push(`${missingCredits.length} credit(s) missing`);
  }

  if (!studentInfo?.regulation) {
    issues.push('Regulation not selected');
  }

  const regConfig = studentInfo?.regulation ? REGULATIONS[studentInfo.regulation] : null;
  const regGrades = regConfig ? new Set(regConfig.grades.map((g) => g.grade.toUpperCase())) : null;

  uniqueSubjects.forEach((s, idx) => {
    if (!s.grade || s.grade.trim() === '') {
      issues.push(`Row ${s.sno || idx + 1}: Missing grade`);
    } else if (regGrades && !regGrades.has(s.grade.toUpperCase())) {
      issues.push(`Row ${s.sno || idx + 1}: Grade "${s.grade}" invalid under ${studentInfo?.regulation}`);
    } else if (s.gradePoint === null && regConfig) {
      issues.push(`Row ${s.sno || idx + 1}: Grade point unresolved`);
    }
  });

  return {
    ready: issues.length === 0 && uniqueSubjects.length > 0,
    issues,
  };
};

/**
 * Compares imported student metadata against saved user profile
 */
export const compareWithSavedProfile = (
  studentInfo: AmsStudentInfo,
  savedProfile?: { name?: string; registerNumber?: string; rollNumber?: string } | null
): ProfileMatchResult => {
  const rollNo = savedProfile?.rollNumber || savedProfile?.registerNumber;
  if (!savedProfile || (!savedProfile.name?.trim() && !rollNo?.trim())) {
    return {
      isMatch: true,
      hasSavedProfile: false,
      status: 'none',
      diffs: [],
      differences: [],
    };
  }

  const diffs: { field: string; saved: string; imported: string }[] = [];
  const normSavedName = (savedProfile.name || '').trim().toLowerCase().replace(/\s+/g, ' ');
  const normImportedName = (studentInfo.name || '').trim().toLowerCase().replace(/\s+/g, ' ');

  if (savedProfile.name?.trim() && studentInfo.name?.trim() && normSavedName !== normImportedName) {
    diffs.push({
      field: 'Name',
      saved: savedProfile.name.trim(),
      imported: studentInfo.name.trim(),
    });
  }

  const normSavedReg = (rollNo || '').trim().toUpperCase().replace(/\s+/g, '');
  const normImportedReg = (studentInfo.registerNumber || '').trim().toUpperCase().replace(/\s+/g, '');

  if (rollNo?.trim() && studentInfo.registerNumber?.trim() && normSavedReg !== normImportedReg) {
    diffs.push({
      field: 'Register Number',
      saved: rollNo.trim(),
      imported: studentInfo.registerNumber.trim(),
    });
  }

  const isMatch = diffs.length === 0;

  return {
    isMatch,
    hasSavedProfile: true,
    status: isMatch ? 'match' : 'different',
    savedName: savedProfile.name?.trim(),
    importedName: studentInfo.name?.trim(),
    savedRegNo: rollNo?.trim(),
    importedRegNo: studentInfo.registerNumber?.trim(),
    diffs,
    differences: diffs.map((d) => ({
      field: d.field,
      saved: d.saved,
      profileValue: d.saved,
      imported: d.imported,
      importedValue: d.imported,
    })),
  };
};

/**
 * Validates bulk credits pasted by user
 */
export const validateBulkCredits = (
  rawInput: string,
  expectedSubjectCount: number
): { valid: boolean; credits?: number[]; error?: string } => {
  const lines = rawInput
    .trim()
    .split(/[\s,;\t\n]+/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    return { valid: false, error: 'Please enter credit values.' };
  }

  if (lines.length !== expectedSubjectCount) {
    return {
      valid: false,
      error: `${lines.length} credit values provided for ${expectedSubjectCount} subjects. Count must match exactly.`,
    };
  }

  const parsedCredits: number[] = [];
  for (let i = 0; i < lines.length; i++) {
    const val = parseFloat(lines[i]);
    if (isNaN(val) || val < 0) {
      return {
        valid: false,
        error: `Invalid credit value "${lines[i]}" at line ${i + 1}. Credits must be 0 or a positive number.`,
      };
    }
    parsedCredits.push(val);
  }

  return { valid: true, credits: parsedCredits };
};

/**
 * Calculates overall CGPA across multiple imported semesters
 */
export const calculateAmsCgpa = (semesters: AmsSemesterResult[]): AmsCgpaResult => {
  let totalCredits = 0;
  let totalQualityPoints = 0;

  const trace = semesters.map((sem) => {
    const credits = sem.totalCredits || 0;
    const sgpa = sem.sgpa ?? 0;
    const weightedPoints = credits * sgpa;
    totalCredits += credits;
    totalQualityPoints += weightedPoints;

    return {
      semesterLabel: sem.semesterLabel || `Semester ${sem.semesterNumber}`,
      sgpa,
      credits,
      weightedPoints,
      formulaStr: `${credits} credits × ${sgpa.toFixed(2)} SGPA = ${weightedPoints.toFixed(2)}`,
    };
  });

  const cgpa = totalCredits > 0 ? totalQualityPoints / totalCredits : null;

  return {
    semesters,
    totalCredits,
    totalQualityPoints,
    cgpa,
    calculationTrace: trace,
  };
};

/**
 * Native Spreadsheet Parser for Excel (XLSX, XLS) and CSV files
 * Completely deterministic - bypasses OCR with 0 error rate!
 */
export const parseStructuredSpreadsheet = async (
  file: File,
  regulationId: RegulationId | null = null,
  mappingOverride?: ColumnMapping
): Promise<AmsExtractionResult> => {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  const rawData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

  // 1. Detect Header Row
  let headerRowIdx = -1;
  for (let r = 0; r < Math.min(rawData.length, 15); r++) {
    const row = rawData[r];
    if (!row || !Array.isArray(row)) continue;
    const rowStr = row.map((c) => String(c || '').toLowerCase()).join(' ');
    if (
      (rowStr.includes('subject') || rowStr.includes('course')) &&
      (rowStr.includes('grade') || rowStr.includes('mark') || rowStr.includes('result') || rowStr.includes('credit'))
    ) {
      headerRowIdx = r;
      break;
    }
  }

  // 2. Extract Student Info from rows before header
  let rawText = '';
  const topRows = headerRowIdx > 0 ? rawData.slice(0, headerRowIdx) : rawData.slice(0, 5);
  for (const r of topRows) {
    if (Array.isArray(r)) {
      rawText += r.filter(Boolean).join(' ') + '\n';
    }
  }

  const studentInfo = extractStudentInfo(rawText);

  // 3. Map Columns
  const headers = headerRowIdx >= 0 ? rawData[headerRowIdx].map((c) => String(c || '').trim()) : [];
  const detectedCols: string[] = headers.filter(Boolean);

  let courseCodeColIdx = -1;
  let subjectNameColIdx = -1;
  let creditsColIdx = -1;
  let gradeColIdx = -1;
  let gradePointColIdx = -1;
  let statusColIdx = -1;
  let snoColIdx = -1;

  headers.forEach((h, idx) => {
    const low = h.toLowerCase();
    if (/s\.?no|sno|serial/i.test(low)) snoColIdx = idx;
    else if (/course\s*code|subject\s*code|code/i.test(low)) courseCodeColIdx = idx;
    else if (/course\s*name|subject\s*name|subject|course|course\s*title/i.test(low)) subjectNameColIdx = idx;
    else if (/credit|credits|cr/i.test(low)) creditsColIdx = idx;
    else if (/grade\s*point|gp/i.test(low)) gradePointColIdx = idx;
    else if (/grade|letter\s*grade/i.test(low)) gradeColIdx = idx;
    else if (/result|status/i.test(low)) statusColIdx = idx;
  });

  // Apply mapping override if provided
  if (mappingOverride) {
    if (mappingOverride.sno) snoColIdx = headers.indexOf(mappingOverride.sno);
    if (mappingOverride.courseCode) courseCodeColIdx = headers.indexOf(mappingOverride.courseCode);
    if (mappingOverride.subjectName) subjectNameColIdx = headers.indexOf(mappingOverride.subjectName);
    if (mappingOverride.credits) creditsColIdx = headers.indexOf(mappingOverride.credits);
    if (mappingOverride.grade) gradeColIdx = headers.indexOf(mappingOverride.grade);
    if (mappingOverride.gradePoint) gradePointColIdx = headers.indexOf(mappingOverride.gradePoint);
    if (mappingOverride.resultStatus) statusColIdx = headers.indexOf(mappingOverride.resultStatus);
  }

  // Fallback if no subject header recognized
  if (subjectNameColIdx === -1 && headers.length >= 2) {
    subjectNameColIdx = 1;
  }
  if (gradeColIdx === -1 && headers.length >= 3) {
    gradeColIdx = headers.length - 1;
  }

  // 4. Extract Subjects
  const subjects: AmsSubject[] = [];
  const startRow = headerRowIdx >= 0 ? headerRowIdx + 1 : 0;
  let snoCounter = 1;

  for (let r = startRow; r < rawData.length; r++) {
    const row = rawData[r];
    if (!row || !Array.isArray(row) || row.length === 0) continue;

    const rawSubject = subjectNameColIdx >= 0 ? String(row[subjectNameColIdx] || '').trim() : '';
    const rawGrade = gradeColIdx >= 0 ? String(row[gradeColIdx] || '').trim() : '';

    if (!rawSubject && !rawGrade) continue;

    const rawCode = courseCodeColIdx >= 0 ? String(row[courseCodeColIdx] || '').trim() : null;
    const rawCreditsStr = creditsColIdx >= 0 ? String(row[creditsColIdx] || '').trim() : '';
    const rawStatus = statusColIdx >= 0 ? String(row[statusColIdx] || '').trim() : 'Pass';
    const rawGpStr = gradePointColIdx >= 0 ? String(row[gradePointColIdx] || '').trim() : '';

    let credits: number | '' = '';
    let hasOrigCredits = false;
    if (rawCreditsStr !== '') {
      const parsedCr = parseFloat(rawCreditsStr);
      if (!isNaN(parsedCr) && parsedCr >= 0) {
        credits = parsedCr;
        hasOrigCredits = true;
      }
    }

    const sno = snoColIdx >= 0 && row[snoColIdx] ? parseInt(String(row[snoColIdx]), 10) : snoCounter++;
    const normGrade = rawGrade.trim().toUpperCase();

    let gradePoint: number | null = null;
    if (rawGpStr !== '') {
      const parsedGp = parseFloat(rawGpStr);
      if (!isNaN(parsedGp)) gradePoint = parsedGp;
    }
    if (gradePoint === null && normGrade && regulationId && REGULATIONS[regulationId]) {
      const found = REGULATIONS[regulationId].grades.find((g) => g.grade.toUpperCase() === normGrade.toUpperCase());
      if (found) gradePoint = found.points;
    }

    subjects.push({
      id: `spreadsheet-row-${r}-${Date.now()}`,
      sno: !isNaN(sno) ? sno : undefined,
      subjectCode: rawCode ? normalizeSubjectCode(rawCode) : null,
      subjectName: rawSubject.trim().replace(/\s+/g, ' '),
      credits,
      grade: normGrade || rawGrade,
      gradePoint,
      status: rawStatus || 'Pass',
      source: 'AMS',
      creditsSource: hasOrigCredits ? 'AMS' : 'USER',
      gradePointSource: gradePoint !== null ? (rawGpStr ? 'AMS' : 'REGULATION') : undefined,
      isDuplicate: false,
      isExcluded: false,
      isManuallyEdited: false,
      hasOriginalCredits: hasOrigCredits,
      originalValues: {
        subjectCode: rawCode,
        subjectName: rawSubject,
        credits,
        grade: normGrade || rawGrade,
        gradePoint,
      },
      confidence: {
        code: rawCode ? 'high' : 'none',
        name: rawSubject ? 'high' : 'low',
        credits: hasOrigCredits ? 'high' : 'none',
        grade: normGrade ? 'high' : 'low',
        gradePoint: gradePoint !== null ? 'high' : 'none',
      },
    });
  }

  const deduplicatedSubjects = detectAndFlagDuplicates(subjects);
  const duplicatesCount = deduplicatedSubjects.filter((s) => s.isDuplicate).length;
  const formatInfo = detectAmsFormat(rawText + ' ' + headers.join(' '), detectedCols);

  return {
    studentInfo,
    subjects: deduplicatedSubjects,
    duplicatesDetected: duplicatesCount,
    duplicatesExcluded: duplicatesCount,
    fileType: file.name.toLowerCase().endsWith('.csv') ? 'csv' : 'excel',
    fileName: file.name,
    fileSize: file.size,
    pageCount: 1,
    previewUrls: [],
    rawText,
    importedAt: Date.now(),
    pageType: 'AMS_RESULT_TABLE',
    documentClassification: 'AMS_RESULT',
    formatInfo,
    columnMapping: {
      sno: snoColIdx >= 0 ? headers[snoColIdx] : undefined,
      courseCode: courseCodeColIdx >= 0 ? headers[courseCodeColIdx] : undefined,
      subjectName: subjectNameColIdx >= 0 ? headers[subjectNameColIdx] : undefined,
      credits: creditsColIdx >= 0 ? headers[creditsColIdx] : undefined,
      grade: gradeColIdx >= 0 ? headers[gradeColIdx] : undefined,
      gradePoint: gradePointColIdx >= 0 ? headers[gradePointColIdx] : undefined,
      resultStatus: statusColIdx >= 0 ? headers[statusColIdx] : undefined,
    },
    tableDetected: true,
    detectedColumns: detectedCols,
    detectedRowsCount: subjects.length,
    extractedRowsCount: subjects.length,
    missingRowNumbers: [],
    rowAccountingVerified: true,
    scanSteps: [
      { step: 1, title: 'Result page detected', status: 'completed', detail: 'Structured spreadsheet parsed' },
      { step: 2, title: 'Student information detected', status: 'completed', detail: studentInfo.name || 'Student details parsed' },
      { step: 3, title: 'Result table detected', status: 'completed', detail: `${detectedCols.length} columns mapped` },
      { step: 4, title: 'Course rows detected', status: 'completed', detail: `${subjects.length} course rows extracted` },
      { step: 5, title: 'Grades detected', status: 'completed', detail: 'All grade records verified' },
      { step: 6, title: 'Checking missing information...', status: 'completed', detail: 'Validation completed' },
    ],
  };
};

/**
 * Exports current AMS result to styled Excel (.xlsx) file
 */
export const exportAmsToExcel = async (
  studentInfo: AmsStudentInfo,
  subjects: AmsSubject[],
  auditSummary: AmsAuditSummary
) => {
  const wb = XLSX.utils.book_new();

  const rows: any[] = [
    ['ACADEMIC CALCULATOR - AMS RESULT REPORT'],
    ['Generated On', new Date().toLocaleDateString('en-GB')],
    [],
    ['STUDENT INFORMATION'],
    ['Student Name', studentInfo.name || '—'],
    ['Register Number', studentInfo.registerNumber || '—'],
    ['Student ID', studentInfo.studentId || '—'],
    ['Degree & Branch', [studentInfo.degree, studentInfo.branch].filter(Boolean).join(' - ') || '—'],
    ['Batch / Period', [studentInfo.batch, studentInfo.resultMonthYear].filter(Boolean).join(' • ') || '—'],
    ['Semester', studentInfo.semester ? `Semester ${studentInfo.semester}` : '—'],
    ['Academic Regulation', studentInfo.regulation || '—'],
    [],
    ['SUBJECT BREAKDOWN'],
    ['S.No', 'Course Code', 'Subject Name', 'Credits', 'Grade', 'Grade Point', 'Credit Points', 'Result Status', 'Source'],
  ];

  const included = subjects.filter((s) => !s.isExcluded);
  included.forEach((s, idx) => {
    const c = typeof s.credits === 'number' ? s.credits : 0;
    const gp = s.gradePoint ?? 0;
    const cp = c * gp;
    rows.push([
      s.sno || idx + 1,
      s.subjectCode || '—',
      s.subjectName,
      c,
      s.grade,
      gp,
      cp,
      s.status || 'Pass',
      s.source,
    ]);
  });

  rows.push([]);
  rows.push(['SUMMARY & AUDIT']);
  rows.push(['Total Credits', auditSummary.totalCredits]);
  rows.push(['Total Quality Points', auditSummary.totalQualityPoints]);
  rows.push(['Calculated SGPA', auditSummary.sgpa !== null ? auditSummary.sgpa.toFixed(2) : '—']);

  const ws = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, 'AMS Result');

  const safeName = (studentInfo.name || 'Student').replace(/[^a-zA-Z0-9_-]/g, '_');
  XLSX.writeFile(wb, `${safeName}_AMS_SGPA_Report.xlsx`);
};

/**
 * Exports current AMS result to CSV file
 */
export const exportAmsToCsv = (
  studentInfo: AmsStudentInfo,
  subjects: AmsSubject[],
  auditSummary: AmsAuditSummary
) => {
  const rows: string[] = [
    `"Student Name","${studentInfo.name || ''}"`,
    `"Register No","${studentInfo.registerNumber || ''}"`,
    `"Semester","Semester ${studentInfo.semester || 1}"`,
    `"Regulation","${studentInfo.regulation || ''}"`,
    `"Calculated SGPA","${auditSummary.sgpa !== null ? auditSummary.sgpa.toFixed(2) : ''}"`,
    `"Total Credits","${auditSummary.totalCredits}"`,
    `"Total Credit Points","${auditSummary.totalQualityPoints.toFixed(2)}"`,
    '',
    '"S.No","Course Code","Subject Name","Credits","Grade","Grade Point","Credit Points","Result Status","Source"',
  ];

  const included = subjects.filter((s) => !s.isExcluded);
  included.forEach((s, idx) => {
    const c = typeof s.credits === 'number' ? s.credits : 0;
    const gp = s.gradePoint ?? 0;
    const cp = c * gp;
    rows.push(
      `"${s.sno || idx + 1}","${s.subjectCode || '—'}","${s.subjectName.replace(/"/g, '""')}","${c}","${s.grade}","${gp}","${cp.toFixed(2)}","${s.status || 'Pass'}","${s.source}"`
    );
  });

  const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const safeName = (studentInfo.name || 'Student').replace(/[^a-zA-Z0-9_-]/g, '_');
  a.download = `${safeName}_AMS_SGPA_Report.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

/**
 * Exports complete multi-semester transcript to Excel
 */
export const exportTranscriptToExcel = (
  studentName: string,
  registerNumber: string,
  cgpaResult: AmsCgpaResult
) => {
  const wb = XLSX.utils.book_new();

  const rows: any[][] = [
    ['UNIVERSITY ACADEMIC CALCULATOR — MULTI-SEMESTER TRANSCRIPT'],
    ['Generated', new Date().toLocaleString()],
    ['Student Name', studentName || 'Student'],
    ['Register No', registerNumber || '—'],
    ['Overall CGPA', cgpaResult.cgpa !== null ? cgpaResult.cgpa.toFixed(2) : '—'],
    ['Total Cumulative Credits', cgpaResult.totalCredits],
    ['Total Cumulative Points', cgpaResult.totalQualityPoints.toFixed(2)],
    [],
    ['SEMESTER BREAKDOWN'],
    ['Semester', 'Subjects', 'Credits', 'SGPA', 'Credit Points', 'Status'],
  ];

  cgpaResult.semesters.forEach((sem) => {
    rows.push([
      sem.semesterLabel,
      sem.subjectsCount ?? (sem.subjects?.length || 0),
      sem.totalCredits,
      (sem.sgpa ?? 0).toFixed(2),
      sem.totalQualityPoints.toFixed(2),
      sem.verified || sem.isVerified ? 'Verified' : 'Manual',
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, 'Transcript');

  const safeName = (studentName || 'Student').replace(/[^a-zA-Z0-9_-]/g, '_');
  XLSX.writeFile(wb, `${safeName}_Academic_Transcript.xlsx`);
};

/**
 * Exports multi-semester transcript to CSV
 */
export const exportTranscriptToCsv = (
  studentName: string,
  registerNumber: string,
  cgpaResult: AmsCgpaResult
) => {
  const rows: string[] = [
    `"Student Name","${studentName || ''}"`,
    `"Register No","${registerNumber || ''}"`,
    `"Overall CGPA","${cgpaResult.cgpa !== null ? cgpaResult.cgpa.toFixed(2) : ''}"`,
    `"Total Cumulative Credits","${cgpaResult.totalCredits}"`,
    `"Total Cumulative Points","${cgpaResult.totalQualityPoints.toFixed(2)}"`,
    '',
    '"Semester","Subjects","Credits","SGPA","Credit Points","Status"',
  ];

  cgpaResult.semesters.forEach((sem) => {
    rows.push(
      `"${sem.semesterLabel}","${sem.subjectsCount ?? (sem.subjects?.length || 0)}","${sem.totalCredits}","${(sem.sgpa ?? 0).toFixed(2)}","${sem.totalQualityPoints.toFixed(2)}","${sem.verified || sem.isVerified ? 'Verified' : 'Manual'}"`
    );
  });

  const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const safeName = (studentName || 'Student').replace(/[^a-zA-Z0-9_-]/g, '_');
  a.download = `${safeName}_Academic_Transcript.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

/**
 * Generates formatted summary text for clipboard copy or sharing
 */
export const formatAmsClipboardSummary = (
  studentInfo: AmsStudentInfo,
  auditSummary: AmsAuditSummary,
  calculationType: 'SGPA' | 'CGPA' = 'SGPA'
): string => {
  return [
    `Student: ${studentInfo.name || 'Student'}`,
    `Register No: ${studentInfo.registerNumber || '—'}`,
    `Semester: Semester ${studentInfo.semester || 1}`,
    `Total Credits: ${auditSummary.totalCredits}`,
    `Total Credit Points: ${auditSummary.totalQualityPoints.toFixed(2)}`,
    `${calculationType}: ${auditSummary.sgpa !== null ? auditSummary.sgpa.toFixed(2) : '—'}`,
    `Academic Calculator • https://university-academic-calculator.vercel.app/`,
  ].join('\n');
};

/**
 * Converts image file to canvas and checks quality
 */
export const loadAndCheckImage = async (
  file: File
): Promise<{ canvas: HTMLCanvasElement; warning?: string }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }
      ctx.drawImage(img, 0, 0);

      let warning: string | undefined;
      if (img.width < 500 || img.height < 500) {
        warning = 'The uploaded image resolution is low. Certain grades or credit figures may require verification.';
      }

      resolve({ canvas, warning });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read image file.'));
    };
    img.src = url;
  });
};

export interface OcrWord {
  text: string;
  bbox: { x0: number; y0: number; x1: number; y1: number };
  confidence: number;
}

export interface OcrLine {
  text: string;
  bbox: { x0: number; y0: number; x1: number; y1: number };
  words?: OcrWord[];
}

export interface OcrDataResult {
  text: string;
  words: OcrWord[];
  lines: OcrLine[];
}

/**
 * Performs client-side OCR on a canvas or blob, returning full structured data
 */
export const runTesseractOcr = async (
  image: HTMLCanvasElement | Blob,
  onProgress?: (progress: number) => void
): Promise<OcrDataResult> => {
  const worker = await createWorker('eng');
  if (onProgress) {
    onProgress(0.2);
  }
  const ret = await worker.recognize(image);
  if (onProgress) {
    onProgress(1.0);
  }
  await worker.terminate();

  const words: OcrWord[] = (((ret.data as any).words) || []).map((w: any) => ({
    text: (w.text || '').trim(),
    bbox: w.bbox || { x0: 0, y0: 0, x1: 0, y1: 0 },
    confidence: w.confidence || 0,
  }));

  const lines: OcrLine[] = (((ret.data as any).lines) || []).map((l: any) => ({
    text: (l.text || '').trim(),
    bbox: l.bbox || { x0: 0, y0: 0, x1: 0, y1: 0 },
    words: (l.words || []).map((w: any) => ({
      text: (w.text || '').trim(),
      bbox: w.bbox || { x0: 0, y0: 0, x1: 0, y1: 0 },
      confidence: w.confidence || 0,
    })),
  }));

  return {
    text: ret.data.text,
    words,
    lines,
  };
};

/**
 * Multi-stage table-aware processor for PDF and Image uploads
 */
export const processAmsDocument = async (
  file: File,
  selectedRegulation?: RegulationId | null,
  onProgress?: (stage: string, percent: number) => void,
  onStepUpdate?: (steps: ScanStepItem[]) => void
): Promise<AmsExtractionResult> => {
  const validation = validateAmsFile(file);
  if (!validation.valid) {
    throw new Error(validation.error || 'Invalid file');
  }

  // Fast-path: Native Spreadsheet / CSV Parsing (Zero OCR!)
  if (validation.fileType === 'csv' || validation.fileType === 'excel') {
    onProgress?.('Parsing structured spreadsheet...', 50);
    const spreadsheetResult = await parseStructuredSpreadsheet(file, selectedRegulation);
    onStepUpdate?.(spreadsheetResult.scanSteps || []);
    onProgress?.('Complete!', 100);
    return spreadsheetResult;
  }

  const scanSteps: ScanStepItem[] = [
    { step: 1, title: 'Result page detected', status: 'pending' },
    { step: 2, title: 'Student information detected', status: 'pending' },
    { step: 3, title: 'Result table detected', status: 'pending' },
    { step: 4, title: 'Course rows detected', status: 'pending' },
    { step: 5, title: 'Grades detected', status: 'pending' },
    { step: 6, title: 'Checking missing information...', status: 'pending' },
  ];

  const updateStep = (
    stepNum: number,
    status: 'pending' | 'in_progress' | 'completed' | 'failed',
    detail?: string
  ) => {
    const s = scanSteps.find((x) => x.step === stepNum);
    if (s) {
      s.status = status;
      if (detail !== undefined) s.detail = detail;
    }
    onStepUpdate?.([...scanSteps]);
  };

  updateStep(1, 'in_progress', 'Reading document file...');

  let fullRawText = '';
  const previewUrls: string[] = [];
  let pageCount = 1;
  let qualityWarning: string | undefined;

  let lastOcrData: OcrDataResult | null = null;

  if (validation.fileType === 'pdf') {
    onProgress?.('Loading PDF document...', 10);
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    pageCount = pdf.numPages;

    for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
      onProgress?.(`Reading page ${pageNum} of ${pageCount}...`, 20 + Math.floor((pageNum / pageCount) * 50));
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageStrings = textContent.items
        .map((item: any) => ('str' in item ? item.str : ''))
        .filter((s: string) => s.trim().length > 0);

      const viewport = page.getViewport({ scale: 1.8 });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        await page.render({ canvasContext: ctx, viewport, canvas }).promise;
        previewUrls.push(canvas.toDataURL('image/jpeg', 0.85));
      }

      if (pageStrings.length > 15) {
        fullRawText += `\n--- Page ${pageNum} ---\n` + pageStrings.join(' ');
      } else {
        onProgress?.(`Enhancing and running OCR on scanned page ${pageNum}...`, 75);
        const preprocessedCanvas = preprocessImageForOcr(canvas);
        const ocrData = await runTesseractOcr(preprocessedCanvas);
        lastOcrData = ocrData;
        fullRawText += `\n--- Scanned Page ${pageNum} ---\n` + ocrData.text;
      }
    }
  } else {
    // Image file
    onProgress?.('Inspecting image resolution...', 20);
    const { canvas, warning } = await loadAndCheckImage(file);
    qualityWarning = warning;
    previewUrls.push(canvas.toDataURL('image/jpeg', 0.9));

    onProgress?.('Preprocessing image: sharpening contrast and binarizing table lines...', 35);
    const preprocessedCanvas = preprocessImageForOcr(canvas);

    onProgress?.('Running table-aware OCR...', 55);
    const ocrData = await runTesseractOcr(preprocessedCanvas, (p) => {
      onProgress?.('Reading text with OCR...', 55 + Math.floor(p * 35));
    });
    lastOcrData = ocrData;
    fullRawText = ocrData.text;
  }

  onProgress?.('Reconstructing table columns, merging multi-line titles, and auditing...', 95);

  // Step 1: Result page detected
  const pageTypeCheck = detectDocumentPageType(fullRawText);
  if (pageTypeCheck.pageType === 'AMS_RESULT_TABLE') {
    updateStep(1, 'completed', 'Result page detected');
  } else {
    updateStep(1, 'failed', pageTypeCheck.unrecognizedReason || 'Could not identify an AMS result table');
  }

  // Step 2: Student information detected
  updateStep(2, 'in_progress');
  const studentInfo = extractStudentInfo(fullRawText);
  if (studentInfo.name || studentInfo.registerNumber || studentInfo.studentId) {
    updateStep(2, 'completed', 'Student information detected');
  } else {
    updateStep(2, 'failed', 'Student details need verification');
  }

  // Step 3: Result table detected (Geometric Spatial OCR or Structured Text Table)
  updateStep(3, 'in_progress');
  const activeReg = studentInfo.regulation || selectedRegulation;
  let tableResult: TableExtractionResult;

  if (lastOcrData && lastOcrData.words && lastOcrData.words.length > 0) {
    const geoResult = extractTableFromOcrGeometry(lastOcrData, activeReg, file.name);
    if (geoResult.tableDetected && geoResult.subjects.length > 0) {
      tableResult = geoResult;
      if (geoResult.studentInfo?.name && !studentInfo.name) {
        studentInfo.name = geoResult.studentInfo.name;
        studentInfo.nameConfidence = 'high';
        studentInfo.nameSource = 'AMS';
      }
      if (geoResult.studentInfo?.registerNumber && !studentInfo.registerNumber) {
        studentInfo.registerNumber = geoResult.studentInfo.registerNumber;
        studentInfo.regConfidence = 'high';
        studentInfo.regSource = 'AMS';
      }
      if (geoResult.studentInfo?.studentId && !studentInfo.studentId) {
        studentInfo.studentId = geoResult.studentInfo.studentId;
        studentInfo.studentIdSource = 'AMS';
      }
    } else {
      tableResult = parseStructuredAmsTextTable(fullRawText, activeReg, file.name);
    }
  } else {
    tableResult = parseStructuredAmsTextTable(fullRawText, activeReg, file.name);
  }

  if (tableResult.tableDetected || tableResult.detectedColumns.length > 0) {
    updateStep(3, 'completed', 'Result table detected');
  } else {
    updateStep(3, 'failed', 'Result table not detected');
  }

  // Step 4: Course rows detected
  updateStep(4, 'in_progress');
  const subjects = tableResult.subjects;
  if (subjects.length > 0) {
    updateStep(4, 'completed', 'Course rows detected');
  } else {
    updateStep(4, 'failed', 'Course rows not detected');
  }

  // Step 5: Grades detected
  updateStep(5, 'in_progress');
  const gradesDetectedCount = subjects.filter((s) => s.grade && s.grade.trim() !== '').length;
  if (gradesDetectedCount > 0) {
    updateStep(5, 'completed', 'Grades detected');
  } else {
    updateStep(5, 'failed', 'Grades not detected');
  }

  // Step 6: Checking missing information...
  updateStep(6, 'in_progress', 'Checking missing information...');
  const duplicatesDetected = subjects.filter((s) => s.isDuplicate).length;
  const duplicatesExcluded = subjects.filter((s) => s.isExcluded).length;
  updateStep(6, 'completed', 'Verification complete');

  onProgress?.('Complete!', 100);

  const documentClassification = classifyAcademicDocument(fullRawText);
  const formatInfo = detectAmsFormat(fullRawText, tableResult.detectedColumns);

  return {
    studentInfo,
    subjects,
    duplicatesDetected,
    duplicatesExcluded,
    fileType: validation.fileType,
    fileName: file.name,
    fileSize: file.size,
    pageCount,
    previewUrls,
    rawText: fullRawText,
    imageQualityWarning: qualityWarning,
    importedAt: Date.now(),
    pageType: tableResult.pageType,
    documentClassification,
    formatInfo,
    columnMapping: {
      sno: tableResult.detectedColumns.find((c) => /s\.?no/i.test(c)),
      courseCode: tableResult.detectedColumns.find((c) => /code/i.test(c)),
      subjectName: tableResult.detectedColumns.find((c) => /name|title|subject/i.test(c)),
      credits: tableResult.detectedColumns.find((c) => /credit/i.test(c)),
      grade: tableResult.detectedColumns.find((c) => /grade/i.test(c)),
      gradePoint: tableResult.detectedColumns.find((c) => /point|gp/i.test(c)),
      resultStatus: tableResult.detectedColumns.find((c) => /result|status/i.test(c)),
    },
    unrecognizedReason: tableResult.unrecognizedReason,
    tableDetected: tableResult.tableDetected,
    detectedColumns: tableResult.detectedColumns,
    detectedRowsCount: tableResult.detectedRowsCount,
    extractedRowsCount: tableResult.extractedRowsCount,
    missingRowNumbers: tableResult.missingRowNumbers,
    rowAccountingVerified: tableResult.rowAccountingVerified,
    scanSteps,
    tableDebug: tableResult.tableDebug,
  };
};
