import * as pdfjsLib from 'pdfjs-dist';
import { createWorker } from 'tesseract.js';
import { REGULATIONS, type RegulationId } from '../config/university';
import type {
  AmsExtractionResult,
  AmsStudentInfo,
  AmsSubject,
  AmsAuditSummary,
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
  } else {
    const stuIdMatch = text.match(/(?:stu\s*id|student\s*id)\s*[:\-]?\s*([0-9a-zA-Z]{6,15})/i);
    if (stuIdMatch && stuIdMatch[1]) {
      info.studentId = stuIdMatch[1].trim().toUpperCase();
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
        break;
      }
    }
  }

  // Name patterns
  const namePatterns = [
    /(?:student\s*name|candidate\s*name|name\s*of\s*the\s*candidate|name)\s*[:\-]\s*([a-zA-Z\s\.]+)/i,
    /name\s*[:]\s*([a-zA-Z\s\.]+)/i,
  ];

  for (const pattern of namePatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const candidate = match[1].replace(/(?:reg|roll|ht|degree|branch|batch|course|semester|sem)[\s\S]*/i, '').trim();
      if (candidate.length > 2 && !/^(student|candidate|result|grade|marks)$/i.test(candidate)) {
        info.name = candidate;
        info.nameConfidence = 'high';
        break;
      }
    }
  }

  // Degree patterns: "Degree: B.Tech", "Degree - B.Tech"
  const degreeMatch = text.match(/(?:degree)\s*[:\-]?\s*([A-Za-z\.\s]{2,15}?)(?:\r?\n|$)/i) ||
    text.match(/\b(B\.Tech|M\.Tech|B\.E|B\.Sc|M\.Sc|BBA|MBA|BCA|MCA)\b/i);
  if (degreeMatch && degreeMatch[1]) {
    info.degree = degreeMatch[1].trim();
  }

  // Branch / Department patterns: "Branch: CSE (AIML)", "Branch - CSE (AIML)"
  const branchMatch = text.match(/(?:branch)\s*[:\-]?\s*([A-Za-z0-9\s\(\)&/\-_]{2,30}?)(?:\r?\n|$)/i) ||
    text.match(/(?:department|program(?:me)?)\s*[:\-]?\s*([A-Za-z0-9\s\(\)&/\-_]{2,30}?)(?:\r?\n|$)/i);
  if (branchMatch && branchMatch[1]) {
    info.branch = branchMatch[1].trim();
    info.department = branchMatch[1].trim();
  }

  // Batch patterns: "Batch: 2024-2025", "Batch - 2024-2025"
  const batchMatch = text.match(/(?:batch)\s*[:\-]?\s*(\d{4}\s*[-–/]\s*\d{2,4})/i);
  if (batchMatch && batchMatch[1]) {
    info.batch = batchMatch[1].trim().replace(/\s+/g, '');
  }

  // Month & Year of Result: "Month & Year of Result: Nov.2024"
  const monthYearMatch = text.match(/(?:month\s*(?:&|and)?\s*year\s*(?:of\s*result)?|result\s*month(?:\s*year)?)\s*[:\-]?\s*([A-Za-z]{3,9}\.?\s*\d{4})/i) ||
    text.match(/\b((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s*\d{4})\b/i);
  if (monthYearMatch && monthYearMatch[1]) {
    info.resultMonthYear = monthYearMatch[1].trim();
  }

  // Result Type: "Result Type: Regular", "Result Type - Regular"
  const resTypeMatch = text.match(/(?:result\s*type)\s*[:\-]?\s*(Regular|Arrear|Supplementary|Revaluation|Improvement)/i);
  if (resTypeMatch && resTypeMatch[1]) {
    info.resultType = resTypeMatch[1].trim();
  }

  // If table row contained repeating metadata:
  // e.g. "1 VTU29962 24UECS0805 PALLAPU DILEEP KUMAR B.Tech CSE (AIML) 2024-2025 10210BM101 ..."
  const rowPattern = /(?:^\s*\d+\s+)?(VTU\d{4,8}|[0-9A-Za-z]{6,12})\s+([0-9]{2}[A-Za-z]{2,5}[0-9]{3,5}|[0-9A-Za-z]{8,12})\s+([A-Za-z\s\.]{4,35}?)\s+(B\.Tech|M\.Tech|B\.E|B\.Sc|MBA|MCA)\s+([A-Za-z0-9\s\(\)&/\-_]{2,25}?)\s+(\d{4}\s*[-–]\s*\d{4})/im;
  const rowMatch = text.match(rowPattern);
  if (rowMatch) {
    if (!info.studentId || info.studentId === info.registerNumber) {
      info.studentId = rowMatch[1].toUpperCase();
    }
    if (!info.registerNumber) {
      info.registerNumber = rowMatch[2].toUpperCase();
      info.regConfidence = 'high';
    }
    if (!info.name) {
      info.name = rowMatch[3].trim();
      info.nameConfidence = 'high';
    }
    if (!info.degree) info.degree = rowMatch[4].trim();
    if (!info.branch) {
      info.branch = rowMatch[5].trim();
      info.department = rowMatch[5].trim();
    }
    if (!info.batch) info.batch = rowMatch[6].replace(/\s+/g, '');
  }

  // If top-right has wrapped name e.g. PALLAPU DILEEP \n KUMAR
  if (!info.name) {
    const wrappedNameMatch = text.match(/\b([A-Z]{3,15}\s+[A-Z]{3,15})\s*\r?\n\s*([A-Z]{3,15})\b/);
    if (wrappedNameMatch) {
      const candidate = `${wrappedNameMatch[1]} ${wrappedNameMatch[2]}`.trim();
      if (!/(SEMESTER|RESULT|REGULAR|EXAMINATION)/i.test(candidate)) {
        info.name = candidate;
        info.nameConfidence = 'high';
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
  }

  // Semester pattern: handles "Semester: 5", "Semester: Semester 5", "Sem: V", etc.
  const semMatch = text.match(/(?:semester|sem)\s*[:\-]?\s*(?:semester|sem)?\s*([1-8]|VIII|VII|VI|IV|V|III|II|I)\b/i);
  if (semMatch && semMatch[1]) {
    const parsedSem = romanToDecimal(semMatch[1]);
    if (parsedSem !== null) {
      info.semester = parsedSem;
      info.semesterConfidence = 'high';
    }
  }

  // Regulation pattern
  const regMatch = text.match(/\b(VTR15|VTR18|VTR21|VTR25)\b/i);
  if (regMatch && regMatch[1]) {
    const detected = regMatch[1].toUpperCase() as RegulationId;
    if (REGULATIONS[detected]) {
      info.regulation = detected;
      info.regulationConfidence = 'high';
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
}

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

  const rowAccountingVerified = missingRowNumbers.length === 0 && subjects.length === detectedCount;

  return {
    subjects: detectAndFlagDuplicates(subjects),
    detectedRowsCount: detectedCount,
    extractedRowsCount: subjects.length,
    missingRowNumbers,
    rowAccountingVerified,
    tableDetected,
    detectedColumns: headerColMatches,
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
      if (!detectedSnoSet.has(s)) missingRowNumbers.push(s);
    }
  }

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
  onProgress?: (stage: string, percent: number) => void
): Promise<AmsExtractionResult> => {
  const validation = validateAmsFile(file);
  if (!validation.valid) {
    throw new Error(validation.error || 'Invalid file');
  }

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

  const studentInfo = extractStudentInfo(fullRawText);
  const activeReg = studentInfo.regulation || selectedRegulation;

  const tableResult = parseStructuredAmsTextTable(fullRawText, activeReg, file.name);
  const subjects = tableResult.subjects;

  const duplicatesDetected = subjects.filter((s) => s.isDuplicate).length;
  const duplicatesExcluded = subjects.filter((s) => s.isExcluded).length;

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
    tableDetected: tableResult.tableDetected,
    detectedColumns: tableResult.detectedColumns,
    detectedRowsCount: tableResult.detectedRowsCount,
    extractedRowsCount: tableResult.extractedRowsCount,
    missingRowNumbers: tableResult.missingRowNumbers,
    rowAccountingVerified: tableResult.rowAccountingVerified,
  };
};
