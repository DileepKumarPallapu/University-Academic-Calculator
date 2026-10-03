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
export const extractStudentInfo = (text: string): AmsStudentInfo => {
  const info: AmsStudentInfo = {
    name: '',
    nameConfidence: 'none',
    registerNumber: '',
    regConfidence: 'none',
    department: '',
    program: '',
    semester: null,
    semesterConfidence: 'none',
    academicYear: '',
    regulation: null,
    regulationConfidence: 'none',
    college: '',
  };

  // Name patterns
  const namePatterns = [
    /(?:student\s*name|candidate\s*name|name\s*of\s*the\s*candidate|name)\s*[:\-]\s*([a-zA-Z\s\.]+)/i,
    /name\s*[:]\s*([a-zA-Z\s\.]+)/i,
  ];

  for (const pattern of namePatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const candidate = match[1].replace(/(?:reg|roll|ht|branch|course|semester|sem)[\s\S]*/i, '').trim();
      if (candidate.length > 2 && !/^(student|candidate|result|grade|marks)$/i.test(candidate)) {
        info.name = candidate;
        info.nameConfidence = 'high';
        break;
      }
    }
  }

  // Register Number patterns
  const regPatterns = [
    /(?:register\s*(?:no|number)?|roll\s*(?:no|number)?|ht\s*no|hall\s*ticket\s*(?:no|number)?|regd\s*(?:no|number)?)\s*[:\-]?\s*([0-9a-zA-Z]{6,15})/i,
    /\b([0-9]{2}[0-9A-Za-z]{8,10})\b/,
  ];

  for (const pattern of regPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      info.registerNumber = match[1].trim().toUpperCase();
      info.regConfidence = 'high';
      break;
    }
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

  // Department pattern
  const deptMatch = text.match(/(?:department|branch|program(?:me)?)\s*[:\-]\s*([a-zA-Z\s&]{2,30})/i);
  if (deptMatch && deptMatch[1]) {
    info.department = deptMatch[1].trim();
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
  sourceLabel = 'AMS Result'
): AmsSubject[] => {
  const lines = text.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
  const subjects: AmsSubject[] = [];

  // Pattern for subject code: 4-10 alphanumeric characters
  const codeRegex = /\b([A-Za-z0-9]{4,10})\b/;

  // Header detection to avoid treating header rows as subjects
  const isHeaderLine = (line: string): boolean => {
    const l = line.toLowerCase();
    const matches = [
      'subject code',
      'course code',
      'subject name',
      'course title',
      'credits',
      'letter grade',
      'grade point',
      's.no',
      'serial no',
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
    if (/^(student name|register no|semester|university|examination|date|page\s*\d+)/i.test(line)) {
      continue;
    }

    // Split line tokens by 2+ spaces, tabs, or pipe symbols
    let rawTokens = line.split(/\t+| {2,}|\|/).map((t) => t.trim()).filter(Boolean);

    // If the first token is a pure serial number (1, 2, 3...) and next token looks like subject code, drop S.No
    if (rawTokens.length >= 3 && /^[0-9]{1,3}$/.test(rawTokens[0])) {
      if (/^[A-Za-z0-9]{4,10}$/.test(rawTokens[1])) {
        rawTokens = rawTokens.slice(1);
      }
    }

    let foundCode = '';
    let foundName = '';
    let foundCredits: number | '' | null = null;
    let foundGrade = '';
    let foundGP: number | null = null;
    let foundStatus = 'Pass';

    // Strategy 1: Check tokenized cells
    if (rawTokens.length >= 3) {
      for (const tok of rawTokens) {
        // Check for subject code
        if (!foundCode && /^[A-Za-z0-9]{4,10}$/.test(tok) && !/^(PASS|FAIL|ABSENT|CREDITS|GRADE)$/i.test(tok)) {
          foundCode = tok.toUpperCase();
          continue;
        }

        // Check for Grade
        const upperTok = tok.toUpperCase();
        if (!foundGrade && ALL_VALID_GRADES.has(upperTok)) {
          foundGrade = upperTok;
          continue;
        }

        // Check for Status
        if (/^(PASS|FAIL|RA|ABSENT|AB)$/i.test(tok)) {
          foundStatus = tok.toUpperCase();
          continue;
        }

        // Check for numeric credits (0, 0.5, 1, 1.5, 2, 3, 4, 5, etc.)
        if (foundCredits === null && /^[0-9](\.[0-9])?$/.test(tok)) {
          const c = parseFloat(tok);
          if (!isNaN(c) && c >= 0 && c <= 15) {
            foundCredits = c;
            continue;
          }
        }

        // Title token
        if (tok.length > 2 && !foundName) {
          foundName = tok;
        }
      }
    }

    // Strategy 2: If token split didn't find complete row, parse via line regex
    if (!foundCode || !foundGrade) {
      // Look for code
      const cMatch = line.match(codeRegex);
      if (cMatch && !/^(SEMESTER|RESULT|STUDENT|CREDITS|GRADE)$/i.test(cMatch[1])) {
        foundCode = cMatch[1].toUpperCase();

        // Remove the code from line to examine remainder
        const afterCode = line.substring(line.indexOf(cMatch[1]) + cMatch[1].length).trim();

        // Look for grade at word boundaries
        const gradeMatches = afterCode.match(/\b(A\+|B\+|O|S|A|B|C|D|P|F|RA|AB)\b/i);
        if (gradeMatches) {
          foundGrade = gradeMatches[1].toUpperCase();
        }

        // Look for credits: e.g. standalone 0, 1, 2, 3, 4, 5
        const creditMatch = afterCode.match(/\b([0-9](\.[0-9])?)\b/);
        if (creditMatch) {
          const val = parseFloat(creditMatch[1]);
          if (!isNaN(val) && val >= 0 && val <= 12) {
            foundCredits = val;
          }
        }

        // Title is roughly the string between code and credits/grade
        let rawTitle = afterCode;
        if (foundGrade) {
          rawTitle = rawTitle.replace(new RegExp(`\\b${foundGrade}\\b`, 'i'), '');
        }
        if (creditMatch) {
          rawTitle = rawTitle.replace(creditMatch[0], '');
        }
        rawTitle = rawTitle.replace(/[\d|\t]+/g, ' ').replace(/\s+/g, ' ').trim();
        if (rawTitle.length > 2) {
          foundName = rawTitle;
        }
      }
    }

    // A valid row requires at least a Subject Code OR a recognizable Subject Name + Grade
    if ((foundCode || (foundName && foundName.length >= 4)) && (foundGrade || foundCredits !== null)) {
      // Derive Grade Point from regulation if available and grade is present
      if (foundGrade && regConfig) {
        const matchingGrade = regConfig.grades.find((g) => g.grade.toUpperCase() === foundGrade);
        if (matchingGrade) {
          foundGP = matchingGrade.points;
        }
      }

      // Check confidence levels
      const codeConf: ConfidenceLevel = foundCode ? 'high' : 'low';
      const nameConf: ConfidenceLevel = foundName && foundName.length > 3 ? 'high' : 'medium';
      const credConf: ConfidenceLevel = foundCredits !== null ? 'high' : 'none';
      const gradeConf: ConfidenceLevel = foundGrade && ALL_VALID_GRADES.has(foundGrade) ? 'high' : 'low';

      subjects.push({
        id: `ams-sub-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        subjectCode: foundCode || '',
        subjectName: foundName || (foundCode ? `Subject ${foundCode}` : `Subject ${subjects.length + 1}`),
        credits: foundCredits !== null ? foundCredits : '',
        grade: foundGrade || '',
        gradePoint: foundGP,
        status: foundStatus,
        source: `${sourceLabel}, Row ${idx + 1}`,
        isDuplicate: false,
        isExcluded: false,
        isManuallyEdited: false,
        confidence: {
          code: codeConf,
          name: nameConf,
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
      // Fallback signature: name + credits + grade
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
        isExcluded: true, // by default excluded so it is not double-counted
      };
    }
    return sub;
  });
};

/**
 * Calculates Audit Summary for user verification and report
 */
export const computeAmsAuditSummary = (subjects: AmsSubject[]): AmsAuditSummary => {
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

  for (const s of subjects) {
    if (s.isDuplicate) duplicatesCount++;
    if (s.isExcluded) duplicatesExcluded++;
    if (s.isManuallyEdited) manualCorrectionsCount++;

    if (!s.isExcluded) {
      const c = Number(s.credits) || 0;
      const gp = s.gradePoint ?? 0;

      if (c === 0) {
        nonCreditCount++;
      } else {
        creditBearingCount++;
        totalCredits += c;
        totalQualityPoints += c * gp;
      }

      if (s.credits === '' || s.credits === null || !s.grade || s.gradePoint === null) {
        fieldsRequiringInput++;
      }
    }
  }

  const sgpa = totalCredits > 0 ? totalQualityPoints / totalCredits : null;

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
