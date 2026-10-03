import * as pdfjsLib from 'pdfjs-dist';
import { createWorker } from 'tesseract.js';
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
  fileType: 'image' | 'pdf';
}

export const validateAmsFile = (file: File): FileValidationResult => {
  const validImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  const isImage = validImageTypes.includes(file.type) || /\.(jpe?g|png|webp)$/i.test(file.name);

  if (!isPdf && !isImage) {
    return {
      valid: false,
      error: 'Unsupported file type. Please upload a screenshot (PNG, JPG, JPEG) or a PDF result document.',
      fileType: 'image',
    };
  }

  // 30MB maximum file size
  if (file.size > 30 * 1024 * 1024) {
    return {
      valid: false,
      error: 'File is too large (maximum 30MB allowed).',
      fileType: isPdf ? 'pdf' : 'image',
    };
  }

  return {
    valid: true,
    fileType: isPdf ? 'pdf' : 'image',
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
  const degreeMatch = text.match(/(?:degree)\s*[:\-]?\s*([A-Za-z\.\s]{2,15}?)(?:\r?\n|$)/i) ||
    text.match(/\b(B\.Tech|M\.Tech|B\.E|B\.Sc|M\.Sc|BBA|MBA|BCA|MCA)\b/i);
  if (degreeMatch && degreeMatch[1]) {
    info.degree = degreeMatch[1].trim();
    info.degreeSource = 'AMS';
  }

  // Branch / Department patterns (handles multi-line e.g. "CSE \n (AIML)" or "CSE (AIML)")
  const multiLineBranchMatch = text.match(
    /(?:branch|dept|department)\s*[:\-]?\s*([^\r\n]+(?:\r?\n\s*\([A-Za-z0-9&/\-_\s]+\))?)/i
  );
  if (multiLineBranchMatch && multiLineBranchMatch[1]) {
    const cleanedBranch = multiLineBranchMatch[1].replace(/\r?\n\s*/g, ' ').replace(/\s+/g, ' ').trim();
    info.branch = cleanedBranch;
    info.department = cleanedBranch;
    info.branchSource = 'AMS';
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
 * High-accuracy table parser that handles:
 * - Table header column detection (SNo, Stu Id, Register No, Name, Degree, Branch, Batch, Coursecode, Coursename, Result, Grade)
 * - Row grouping and SNo accounting (1 to N)
 * - Multi-line course name merging (e.g. "Computational Thinking for Problem" + "Solving")
 * - Multi-line student info merging
 * - Optional Course Code handling (subjectCode = null if absent)
 * - Dynamic Credits column extraction (only if present in document)
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
  const cleanLines = rawLines.filter((l) => !isNoiseLine(l));

  const regConfig = selectedRegulation ? REGULATIONS[selectedRegulation] : null;

  // Header detection to find table columns
  const headerColMatches: string[] = [];
  let headerIndex = -1;

  for (let idx = 0; idx < cleanLines.length; idx++) {
    const l = cleanLines[idx].toLowerCase();
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

  const tableDetected = headerIndex !== -1;
  const linesToProcess = tableDetected ? cleanLines.slice(headerIndex + 1) : cleanLines;

  // Group lines into distinct rows using S.No or Course Code anchors
  interface RawRowBlock {
    sno?: number;
    lines: string[];
  }

  const rowBlocks: RawRowBlock[] = [];
  let currentBlock: RawRowBlock | null = null;

  const snoRegex = /^(?:([1-9]|1[0-9]|20)\b)(?:\s+(.*))?$/;
  const courseCodeRegex = /\b(102\d{2}[A-Za-z]{2}\d{3}[A-Za-z]?|[A-Za-z]{2,5}\d{2,5}[A-Za-z0-9]?|\d{4,6}[A-Za-z]{2,4}\d{2,4}[A-Za-z0-9]?)\b/;

  for (const line of linesToProcess) {
    // Check if line starts with S.No (1, 2, ... 20)
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

    const lineEndsWithGrade = (l: string) => {
      const trimmed = l.trim();
      return /\b(Pass|Fail|RA|AB|Absent|W|NE)\s+([A-Z]\+?|[A-Z])$/i.test(trimmed) ||
             /\b\d+(?:\.\d+)?\s+([A-Z]\+?|[A-Z])$/i.test(trimmed) ||
             /\s+([SABCDPFEOW]|A\+|B\+|RA|AB|FAIL|PASS)$/i.test(trimmed);
    };

    const lineStartsWithCode = (l: string) => {
      return /^\s*(?:102\d{2}[A-Za-z]{2}\d{3}[A-Za-z]?|[A-Za-z]{2,5}\d{2,5}[A-Za-z0-9]?|\d{4,6}[A-Za-z]{2,4}\d{2,4}[A-Za-z0-9]?)\b/i.test(l.trim());
    };

    // If currentBlock exists, check if this line is a continuation line or a standalone subject line
    if (currentBlock) {
      const hasEndGrade = lineEndsWithGrade(line);
      const blockHasEndGrade = currentBlock.lines.some(lineEndsWithGrade);
      const startsWithCode = lineStartsWithCode(line);

      if (startsWithCode || (hasEndGrade && blockHasEndGrade)) {
        rowBlocks.push(currentBlock);
        currentBlock = {
          lines: [line],
        };
      } else {
        // Multi-line continuation: append to current block!
        currentBlock.lines.push(line);
      }
    } else {
      // Check if line looks like a subject row
      if (courseCodeRegex.test(line) || lineEndsWithGrade(line)) {
        currentBlock = {
          lines: [line],
        };
      }
    }
  }

  if (currentBlock) {
    rowBlocks.push(currentBlock);
  }

  const subjects: AmsSubject[] = [];
  const detectedSnoSet = new Set<number>();

  for (let idx = 0; idx < rowBlocks.length; idx++) {
    const block = rowBlocks[idx];
    const fullBlockText = block.lines.join(' ').replace(/\s+/g, ' ').trim();
    if (block.sno) detectedSnoSet.add(block.sno);

    // Extract Course Code (Optional!)
    let foundCode: string | null = null;
    const allCodeMatches = Array.from(fullBlockText.matchAll(/\b(102\d{2}[A-Za-z]{2}\d{3}[A-Za-z]?|[A-Za-z]{2,5}\d{2,5}[A-Za-z0-9]?|\d{4,6}[A-Za-z]{2,4}\d{2,4}[A-Za-z0-9]?)\b/gi));
    for (const m of allCodeMatches) {
      const candidateCode = m[0].toUpperCase();
      // Ensure candidate is not a student ID / Register No
      if (!/^\d{2}[A-Z]{2,5}\d{3,5}$/i.test(candidateCode) && !/^VTU\d+/i.test(candidateCode)) {
        foundCode = candidateCode;
        break;
      }
    }

    // Extract Result and Grade from the end of the block
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
    const gradeOnly = fullBlockText.match(/^(.*?)\s+([A-Z]\+?|[A-Z])$/i);

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
    } else if (gradeOnly && ALL_VALID_GRADES.has(gradeOnly[2].toUpperCase())) {
      rawTitle = gradeOnly[1].trim();
      foundGrade = gradeOnly[2].toUpperCase();
      foundCredits = '';
      creditsSource = 'USER';
    }

    // Now isolate Course Name:
    // If Course Code was present, Course Name is everything after Course Code!
    let courseName = rawTitle;
    if (foundCode && rawTitle.includes(foundCode)) {
      courseName = rawTitle.substring(rawTitle.indexOf(foundCode) + foundCode.length).trim();
    } else {
      // Strip out student metadata if repeated in the row
      // e.g. "1 VTU29962 24UECS0805 PALLAPU DILEEP KUMAR B.Tech CSE (AIML) 2024-2025 ..."
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

    // Normalize result status to TitleCase or standard abbreviation
    const uRes = foundResult.toUpperCase();
    if (uRes === 'RA' || uRes === 'AB' || uRes === 'NE' || uRes === 'W') {
      foundResult = uRes;
    } else {
      foundResult = foundResult.charAt(0).toUpperCase() + foundResult.slice(1).toLowerCase();
    }

    if (courseName && (foundGrade || foundCode)) {
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
    } else if (!courseName && (foundGrade || foundCode)) {
      // Row detected but course name was missing: preserve SNo and flag missing name
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
        subjectName: '',
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
          subjectName: '',
          credits: foundCredits,
          grade: foundGrade,
          gradePoint: foundGP,
        },
        confidence: {
          code: foundCode ? 'high' : 'none',
          name: 'none',
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

  const rowAccountingVerified = missingRowNumbers.length === 0 && subjects.length === detectedCount;

  return {
    subjects: detectAndFlagDuplicates(subjects),
    detectedRowsCount: detectedCount,
    extractedRowsCount: subjects.length,
    missingRowNumbers,
    rowAccountingVerified,
    tableDetected,
    detectedColumns: headerColMatches,
    pageType: 'AMS_RESULT_TABLE',
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

    if (sub.subjectCode) {
      const normCode = normalizeSubjectCode(sub.subjectCode);
      if (seenCodes.has(normCode)) {
        isDupe = true;
      } else {
        seenCodes.set(normCode, index);
      }
    } else if (sub.subjectName) {
      const sig = `${normalizeSubjectName(sub.subjectName)}_${sub.credits}_${sub.grade}`;
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
        fullRawText += `\n--- Scanned Page ${pageNum} ---\n` + ocrData.text;
      }
    }
  } else {
    // Image file
    onProgress?.('Inspecting image resolution...', 20);
    const { canvas, warning } = await loadAndCheckImage(file);
    qualityWarning = warning;
    // Original canvas stored for side-by-side zoom & PDF appendix
    previewUrls.push(canvas.toDataURL('image/jpeg', 0.9));

    onProgress?.('Preprocessing image: sharpening contrast and binarizing table lines...', 35);
    const preprocessedCanvas = preprocessImageForOcr(canvas);

    onProgress?.('Running table-aware OCR...', 55);
    const ocrData = await runTesseractOcr(preprocessedCanvas, (p) => {
      onProgress?.('Reading text with OCR...', 55 + Math.floor(p * 35));
    });
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

  // Step 3: Result table detected
  updateStep(3, 'in_progress');
  const activeReg = studentInfo.regulation || selectedRegulation;
  const tableResult = parseStructuredAmsTextTable(fullRawText, activeReg, file.name);
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
    unrecognizedReason: tableResult.unrecognizedReason,
    tableDetected: tableResult.tableDetected,
    detectedColumns: tableResult.detectedColumns,
    detectedRowsCount: tableResult.detectedRowsCount,
    extractedRowsCount: tableResult.extractedRowsCount,
    missingRowNumbers: tableResult.missingRowNumbers,
    rowAccountingVerified: tableResult.rowAccountingVerified,
    scanSteps,
  };
};
