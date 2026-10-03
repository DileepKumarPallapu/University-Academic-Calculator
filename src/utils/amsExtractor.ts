import * as pdfjsLib from 'pdfjs-dist';
import { createWorker } from 'tesseract.js';
import { REGULATIONS, type RegulationId } from '../config/university';
import type {
  AmsExtractionResult,
  AmsStudentInfo,
  AmsSubject,
  AmsAuditSummary,
  ConfidenceLevel,
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

  // Student ID patterns: "Stu Id", "Student Id", "StudentID"
  const stuIdMatch = text.match(/(?:stu\s*id|student\s*id)\s*[:\-]?\s*([0-9a-zA-Z]{6,15})/i);
  if (stuIdMatch && stuIdMatch[1]) {
    info.studentId = stuIdMatch[1].trim().toUpperCase();
  }

  // Register Number patterns
  const regPatterns = [
    /(?:register\s*(?:no|number)?|roll\s*(?:no|number)?|ht\s*no|hall\s*ticket\s*(?:no|number)?|regd\s*(?:no|number)?)\s*[:\-]?\s*([0-9a-zA-Z]{6,15})/i,
    /\b([0-9]{2}[0-9A-Za-z]{8,10})\b/,
    /\b([0-9]{2}[A-Za-z]{2,5}[0-9]{3,5})\b/,
  ];

  for (const pattern of regPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      info.registerNumber = match[1].trim().toUpperCase();
      info.regConfidence = 'high';
      break;
    }
  }

  // If studentId wasn't found separately but we have a register number:
  if (!info.studentId && info.registerNumber) {
    info.studentId = info.registerNumber;
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
  // e.g. "1 24UECS0805 24UECS0805 PALLAPU DILEEP KUMAR B.Tech CSE (AIML) 2024-2025 10210BM101 ..."
  const rowPattern = /(?:^\s*\d+\s+)?([0-9A-Za-z]{8,12})\s+([0-9A-Za-z]{8,12})\s+([A-Za-z\s\.]{4,35}?)\s+(B\.Tech|M\.Tech|B\.E|B\.Sc|MBA|MCA)\s+([A-Za-z0-9\s\(\)&/\-_]{2,25}?)\s+(\d{4}\s*[-–]\s*\d{4})/im;
  const rowMatch = text.match(rowPattern);
  if (rowMatch) {
    if (!info.studentId) info.studentId = rowMatch[1].toUpperCase();
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
 * Valid grade tokens across regulations
 */
const ALL_VALID_GRADES = new Set([
  'S', 'A+', 'A', 'B+', 'B', 'C', 'D', 'P', 'E', 'F', 'O', 'RA', 'AB', 'W', 'FAIL', 'PASS'
]);

/**
 * Normalizes subject codes by stripping spaces and hyphens
 */
export const normalizeSubjectCode = (code: string): string => {
  return code.toUpperCase().replace(/[\s\-_]/g, '');
};

/**
 * Normalizes subject names by converting to lower case and removing punctuation
 */
export const normalizeSubjectName = (name: string): string => {
  return name.toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
};

/**
 * Parses lines looking for subject records
 */
export const extractSubjectsFromText = (
  text: string,
  selectedRegulation?: RegulationId | null,
  _sourceLabel = 'AMS Result'
): AmsSubject[] => {
  const lines = text.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
  const subjects: AmsSubject[] = [];

  // Course code regex:
  // 10210BM101, 10217GE901, 10210CS302, CS501, 21CS101, EVS01
  const courseCodeRegex = /\b(102\d{2}[A-Za-z]{2}\d{3}[A-Za-z]?|[A-Za-z]{2,5}\d{2,5}[A-Za-z0-9]?|\d{4,6}[A-Za-z]{2,4}\d{2,4}[A-Za-z0-9]?)\b/g;

  // Header detection to avoid treating header rows as subjects
  const isHeaderLine = (line: string): boolean => {
    const l = line.toLowerCase();
    const matches = [
      'subject code',
      'course code',
      'coursecode',
      'subject name',
      'course title',
      'coursename',
      'credits',
      'letter grade',
      'grade point',
      'sno',
      's.no',
      'serial no',
      'stuid',
      'stu id',
      'registerno',
      'register no',
    ];
    let matchCount = 0;
    for (const m of matches) {
      if (l.includes(m)) matchCount++;
    }
    return matchCount >= 2;
  };

  const regConfig = selectedRegulation ? REGULATIONS[selectedRegulation] : null;

  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx];

    // Skip headers or metadata lines
    if (isHeaderLine(line)) continue;
    if (/^(student name|register no|degree|branch|batch|month & year|result type|semester|university|examination|date|page\s*\d+)/i.test(line)) {
      continue;
    }

    // Look for valid course code
    const codeMatches = Array.from(line.matchAll(courseCodeRegex));
    if (codeMatches.length === 0) continue;

    // Filter out code candidates that are clearly not course codes
    const validCodeMatches = codeMatches.filter((m) => {
      const c = m[0].toUpperCase();
      if (/^(SEMESTER|RESULT|STUDENT|CREDITS|GRADE|REGULAR|DEGREE|BRANCH|BATCH)$/i.test(c)) return false;
      // If it looks like a student roll number: 2 digits + 2-5 letters + 3-5 digits (e.g. 24UECS0805)
      if (/^\d{2}[A-Z]{2,5}\d{3,5}$/i.test(c)) return false;
      return true;
    });

    if (validCodeMatches.length === 0) continue;

    // Take the last valid course code match in the line
    const matchedCodeObj = validCodeMatches[validCodeMatches.length - 1];
    const foundCode = matchedCodeObj[0].toUpperCase();
    const codeIndex = matchedCodeObj.index ?? line.indexOf(foundCode);

    // Remainder of line after course code
    const afterCode = line.substring(codeIndex + foundCode.length).trim();
    if (!afterCode) continue;

    let foundName = '';
    let foundCredits: number | '' | null = null;
    let foundGrade = '';
    let foundStatus = 'Pass';
    let creditsSource: 'AMS' | 'USER' = 'USER';

    // Strategy 1: ... [Credits] [Result Status] [Grade]
    const creditsStatusGradeMatch = afterCode.match(/^(.*?)\s+(\d+(?:\.\d+)?)\s+(Pass|Fail|RA|AB|Absent|W|NE)\s+([A-Z]\+?|[A-Z])$/i);

    // Strategy 2: ... [Result Status] [Grade]
    const statusGradeMatch = afterCode.match(/^(.*?)\s+(Pass|Fail|RA|AB|Absent|W|NE)\s+([A-Z]\+?|[A-Z])$/i);

    // Strategy 3: ... [Credits] [Grade]
    const creditsGradeMatch = afterCode.match(/^(.*?)\s+(\d+(?:\.\d+)?)\s+([A-Z]\+?|[A-Z])$/i);

    // Strategy 4: ... [Grade]
    const gradeOnlyMatch = afterCode.match(/^(.*?)\s+([A-Z]\+?|[A-Z])$/i);

    const formatStatus = (s: string) => {
      const u = s.toUpperCase();
      if (u === 'RA' || u === 'AB' || u === 'NE' || u === 'W') return u;
      return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
    };

    if (creditsStatusGradeMatch) {
      foundName = creditsStatusGradeMatch[1].trim();
      foundCredits = parseFloat(creditsStatusGradeMatch[2]);
      foundStatus = formatStatus(creditsStatusGradeMatch[3]);
      foundGrade = creditsStatusGradeMatch[4].toUpperCase();
      creditsSource = 'AMS';
    } else if (statusGradeMatch) {
      foundName = statusGradeMatch[1].trim();
      foundStatus = formatStatus(statusGradeMatch[2]);
      foundGrade = statusGradeMatch[3].toUpperCase();
      foundCredits = ''; // No credits in AMS document!
      creditsSource = 'USER';
    } else if (creditsGradeMatch) {
      foundName = creditsGradeMatch[1].trim();
      foundCredits = parseFloat(creditsGradeMatch[2]);
      foundGrade = creditsGradeMatch[3].toUpperCase();
      creditsSource = 'AMS';
    } else if (gradeOnlyMatch && ALL_VALID_GRADES.has(gradeOnlyMatch[2].toUpperCase())) {
      foundName = gradeOnlyMatch[1].trim();
      foundGrade = gradeOnlyMatch[2].toUpperCase();
      foundCredits = '';
      creditsSource = 'USER';
    } else {
      // Fallback tokenize
      const tokens = afterCode.split(/\s+/);
      if (tokens.length >= 2) {
        const lastTok = tokens[tokens.length - 1].toUpperCase();
        if (ALL_VALID_GRADES.has(lastTok)) {
          foundGrade = lastTok;
          const secondLastTok = tokens[tokens.length - 2].toUpperCase();
          if (/^(PASS|FAIL|RA|AB|ABSENT|W|NE)$/i.test(secondLastTok)) {
            foundStatus = formatStatus(secondLastTok);
            foundName = tokens.slice(0, tokens.length - 2).join(' ');
          } else if (/^\d+(\.\d+)?$/.test(secondLastTok)) {
            foundCredits = parseFloat(secondLastTok);
            creditsSource = 'AMS';
            foundName = tokens.slice(0, tokens.length - 2).join(' ');
          } else {
            foundName = tokens.slice(0, tokens.length - 1).join(' ');
          }
        }
      }
    }

    // Clean up course title
    foundName = foundName.replace(/^[-–—:\s]+/, '').trim();

    if (foundCode && (foundGrade || foundName)) {
      let foundGP: number | null = null;
      let gpSource: 'AMS' | 'REGULATION' | 'USER' = 'REGULATION';

      if (foundGrade && regConfig) {
        const matchingGrade = regConfig.grades.find((g) => g.grade.toUpperCase() === foundGrade);
        if (matchingGrade) {
          foundGP = matchingGrade.points;
        }
      }

      const credConf: ConfidenceLevel = foundCredits !== '' && foundCredits !== null ? 'high' : 'none';
      const gradeConf: ConfidenceLevel = foundGrade && ALL_VALID_GRADES.has(foundGrade) ? 'high' : 'low';

      subjects.push({
        id: `ams-sub-${Date.now()}-${Math.random().toString(36).substring(2, 7)}-${idx}`,
        subjectCode: foundCode,
        subjectName: foundName || `Subject ${foundCode}`,
        credits: foundCredits,
        grade: foundGrade,
        gradePoint: foundGP,
        status: foundStatus,
        source: 'AMS',
        creditsSource,
        gradePointSource: gpSource,
        isDuplicate: false,
        isExcluded: false,
        isManuallyEdited: false,
        confidence: {
          code: 'high',
          name: foundName.length > 3 ? 'high' : 'medium',
          credits: credConf,
          grade: gradeConf,
          gradePoint: foundGP !== null ? 'high' : 'none',
        },
      });
    }
  }

  // Run Duplicate Detection Engine
  return detectAndFlagDuplicates(subjects);
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
    if (studentInfo.registerNumber) fieldsDetectedAutomatically.push('Register Number');
    if (studentInfo.degree) fieldsDetectedAutomatically.push('Degree');
    if (studentInfo.branch) fieldsDetectedAutomatically.push('Branch');
    if (studentInfo.batch) fieldsDetectedAutomatically.push('Batch');
    if (studentInfo.resultMonthYear) fieldsDetectedAutomatically.push('Result Month & Year');
    if (studentInfo.regulation) fieldsDetectedAutomatically.push('Regulation');
  }

  if (subjectsDetected > 0) {
    fieldsDetectedAutomatically.push(`${subjectsDetected} Subject Codes & Titles`);
    fieldsDetectedAutomatically.push('Letter Grades & Results');
  }

  const anyUserCredits = subjects.some((s) => s.creditsSource === 'USER' || s.credits === '' || s.credits === null);
  if (anyUserCredits) {
    fieldsEnteredByUser.push('Course Credits');
  }
  if (!studentInfo?.regulation) {
    fieldsEnteredByUser.push('Academic Regulation');
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

/**
 * Performs client-side OCR on a canvas or blob
 */
export const runTesseractOcr = async (
  image: HTMLCanvasElement | Blob,
  onProgress?: (progress: number) => void
): Promise<string> => {
  const worker = await createWorker('eng');
  if (onProgress) {
    onProgress(0.2);
  }
  const ret = await worker.recognize(image);
  if (onProgress) {
    onProgress(1.0);
  }
  await worker.terminate();
  return ret.data.text;
};

/**
 * Primary processor for PDF and Image uploads
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

      // Render page to canvas for preview & optional OCR
      const viewport = page.getViewport({ scale: 1.8 });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        await page.render({ canvasContext: ctx, viewport, canvas }).promise;
        previewUrls.push(canvas.toDataURL('image/jpeg', 0.85));
      }

      // If page has sufficient text content, use native PDF text (100% precision)
      if (pageStrings.length > 15) {
        fullRawText += `\n--- Page ${pageNum} ---\n` + pageStrings.join(' ');
      } else {
        // Scanned PDF page: run OCR on rendered canvas
        onProgress?.(`Running OCR on scanned page ${pageNum}...`, 75);
        const ocrText = await runTesseractOcr(canvas);
        fullRawText += `\n--- Scanned Page ${pageNum} ---\n` + ocrText;
      }
    }
  } else {
    // Image file
    onProgress?.('Inspecting image quality...', 20);
    const { canvas, warning } = await loadAndCheckImage(file);
    qualityWarning = warning;
    previewUrls.push(canvas.toDataURL('image/jpeg', 0.9));

    onProgress?.('Reading text with OCR...', 50);
    fullRawText = await runTesseractOcr(canvas, (p) => {
      onProgress?.('Extracting text with OCR...', 50 + Math.floor(p * 40));
    });
  }

  onProgress?.('Structuring academic results and detecting duplicates...', 95);

  const studentInfo = extractStudentInfo(fullRawText);
  // If regulation detected from document, prefer it over passed parameter
  const activeReg = studentInfo.regulation || selectedRegulation;

  const subjects = extractSubjectsFromText(fullRawText, activeReg, file.name);

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
  };
};
