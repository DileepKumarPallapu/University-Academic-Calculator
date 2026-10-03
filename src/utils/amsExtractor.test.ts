import { describe, it, expect } from 'vitest';
import type { AmsSubject, AmsStudentInfo } from '../types/ams';
import {
  extractStudentInfo,
  extractSubjectsFromText,
  computeAmsAuditSummary,
  normalizeSubjectCode,
  parseStructuredAmsTextTable,
  detectDocumentPageType,
  validateBulkCredits,
  calculateAmsCgpa,
  classifyAcademicDocument,
  detectAmsFormat,
  compareWithSavedProfile,
  detectAndFlagDuplicates,
} from './amsExtractor';

describe('AMS Result Extractor', () => {
  it('extracts student information confidently from clear AMS header text', () => {
    const rawHeader = `
      VEL TECH RANGARAJAN Dr. SAGUNTHALA R&D INSTITUTE OF SCIENCE AND TECHNOLOGY
      END SEMESTER EXAMINATIONS - GRADE SHEET
      Student Name: Pallapu Dileep Kumar
      Register Number: 22021A0501
      Program: B.Tech Computer Science and Engineering
      Semester: Semester 5
      Regulation: VTR21
      Academic Year: 2026-27
    `;
    const info = extractStudentInfo(rawHeader);

    expect(info.name).toBe('Pallapu Dileep Kumar');
    expect(info.registerNumber).toBe('22021A0501');
    expect(info.semester).toBe(5);
    expect(info.regulation).toBe('VTR21');
    expect(info.academicYear).toBe('2026-27');
    expect(info.nameConfidence).toBe('high');
    expect(info.regConfidence).toBe('high');
  });

  it('extracts subjects with credits, grades, and grade points mapped to regulation', () => {
    const tableText = `
      S.No  Course Code  Course Title                     Credits  Grade
      1     CS501        Database Management Systems      4        A
      2     CS502        Compiler Design                  3        S
      3     CS503P       Web Technologies Lab             1.5      A
      4     EVS01        Environmental Studies            0        S
    `;
    const subjects = extractSubjectsFromText(tableText, 'VTR21');

    expect(subjects.length).toBe(4);

    // Subject 1
    expect(subjects[0].subjectCode).toBe('CS501');
    expect(subjects[0].subjectName).toContain('Database Management Systems');
    expect(subjects[0].credits).toBe(4);
    expect(subjects[0].grade).toBe('A');
    expect(subjects[0].gradePoint).toBe(9); // VTR21: A -> 9

    // Subject 2
    expect(subjects[1].subjectCode).toBe('CS502');
    expect(subjects[1].credits).toBe(3);
    expect(subjects[1].grade).toBe('S');
    expect(subjects[1].gradePoint).toBe(10); // VTR21: S -> 10

    // Non-credit Subject 4
    expect(subjects[3].subjectCode).toBe('EVS01');
    expect(subjects[3].credits).toBe(0);
    expect(subjects[3].grade).toBe('S');
    expect(subjects[3].gradePoint).toBe(10);
  });

  it('detects duplicate table rows and excludes the duplicate from calculations', () => {
    const tableWithDuplicates = `
      CS501   Database Management Systems   4   A
      CS502   Compiler Design               3   S
      CS501   Database Management Systems   4   A
    `;
    const subjects = extractSubjectsFromText(tableWithDuplicates, 'VTR21');

    expect(subjects.length).toBe(3);
    expect(subjects[0].isDuplicate).toBe(false);
    expect(subjects[0].isExcluded).toBe(false);

    // Third subject is duplicate of first
    expect(subjects[2].isDuplicate).toBe(true);
    expect(subjects[2].isExcluded).toBe(true);

    const audit = computeAmsAuditSummary(subjects);
    expect(audit.subjectsDetected).toBe(3);
    expect(audit.subjectsIncluded).toBe(2);
    expect(audit.duplicatesCount).toBe(1);
    expect(audit.duplicatesExcluded).toBe(1);
    // Total credits should be 4 + 3 = 7, not 11!
    expect(audit.totalCredits).toBe(7);
  });

  it('handles 0-credit subjects without contributing to SGPA denominator', () => {
    const raw = `
      CS501   Data Structures         4   A
      EVS01   Environmental Studies   0   S
      CS502   Algorithms              3   B
    `;
    const subjects = extractSubjectsFromText(raw, 'VTR21');
    const audit = computeAmsAuditSummary(subjects);

    // Credits: 4 (GP 9) -> 36 QP
    // Credits: 0 (GP 10) -> 0 QP
    // Credits: 3 (GP 8) -> 24 QP
    // Total Credits = 7, Total QP = 60, SGPA = 60 / 7 = 8.5714...
    expect(audit.totalCredits).toBe(7);
    expect(audit.totalQualityPoints).toBe(60);
    expect(audit.sgpa).toBeCloseTo(8.5714, 3);
    expect(audit.nonCreditCount).toBe(1);
    expect(audit.creditBearingCount).toBe(2);
  });

  it('normalizes subject codes with spaces and casing', () => {
    expect(normalizeSubjectCode('cs 501')).toBe('CS501');
    expect(normalizeSubjectCode('CS-501')).toBe('CS501');
    expect(normalizeSubjectCode(' 21cs501 ')).toBe('21CS501');
  });

  it('flags missing credits without inventing them', () => {
    const raw = `
      CS501   Database Systems   A
    `;
    const subjects = extractSubjectsFromText(raw, 'VTR21');
    expect(subjects.length).toBe(1);
    expect(subjects[0].credits).toBe('');
    expect(subjects[0].confidence.credits).toBe('none');

    const audit = computeAmsAuditSummary(subjects);
    expect(audit.fieldsRequiringInput).toBeGreaterThan(0);
  });

  it('handles result without regulation: grade points remain null until regulation selected', () => {
    const raw = `
      CS501   Database Systems   4   A
      CS502   Web Development    3   S
    `;
    // No regulation specified
    const subjects = extractSubjectsFromText(raw, null);
    expect(subjects.length).toBe(2);
    expect(subjects[0].gradePoint).toBeNull();
    expect(subjects[1].gradePoint).toBeNull();

    const audit = computeAmsAuditSummary(subjects);
    expect(audit.fieldsRequiringInput).toBeGreaterThan(0);
  });

  it('handles all 0-credit subjects correctly by returning null SGPA', () => {
    const raw = `
      EVS01   Environmental Studies   0   S
      NSS01   National Service Scheme 0   A
    `;
    const subjects = extractSubjectsFromText(raw, 'VTR21');
    const audit = computeAmsAuditSummary(subjects);

    expect(audit.totalCredits).toBe(0);
    expect(audit.nonCreditCount).toBe(2);
    expect(audit.creditBearingCount).toBe(0);
    expect(audit.sgpa).toBeNull();
  });

  it('correctly extracts 11-subject real university AMS semester format without credits', () => {
    const rawAmsDocument = `
      Student Name: PALLAPU DILEEP KUMAR
      Register No: 24UECS0805
      Degree: B.Tech
      Branch: CSE (AIML)
      Batch: 2024-2025
      Month & Year of Result: Nov.2024
      Result Type: Regular

      10210BM101 Biology for Engineers Pass C
      10210CS102 Computational Thinking for Problem Solving Pass C
      10210CS302 Computational Thinking Laboratory Pass S
      10210EE201 Basic Electrical, Electronics & Measurement Engineering Pass A
      10210EE204 Introduction to Engineering Pass S
      10210EN201 Professional Communication - I Pass C
      10210MA101 Linear Algebra for Computing Pass B
      10210PH101 Semiconductor Physics Pass D
      10210PH301 Modern Physics Laboratory Pass C
      10217GE901 Engineers and Society Pass S
      10217GE902 Constitution of India Pass B
    `;

    // 1. Verify student info extraction
    const studentInfo = extractStudentInfo(rawAmsDocument);
    expect(studentInfo.name).toBe('PALLAPU DILEEP KUMAR');
    expect(studentInfo.registerNumber).toBe('24UECS0805');
    expect(studentInfo.degree).toBe('B.Tech');
    expect(studentInfo.branch).toBe('CSE (AIML)');
    expect(studentInfo.batch).toBe('2024-2025');
    expect(studentInfo.resultMonthYear).toBe('Nov.2024');
    expect(studentInfo.resultType).toBe('Regular');
    // Semester is not explicitly named "Semester: X", so remains null for user selection
    expect(studentInfo.semester).toBeNull();

    // 2. Extract subjects with regulation VTR21
    const subjects = extractSubjectsFromText(rawAmsDocument, 'VTR21');
    expect(subjects.length).toBe(11);

    // Verify all 11 subject codes
    const expectedCodes = [
      '10210BM101',
      '10210CS102',
      '10210CS302',
      '10210EE201',
      '10210EE204',
      '10210EN201',
      '10210MA101',
      '10210PH101',
      '10210PH301',
      '10217GE901',
      '10217GE902',
    ];
    expect(subjects.map((s) => s.subjectCode)).toEqual(expectedCodes);

    // Verify full non-truncated course names
    expect(subjects[0].subjectName).toBe('Biology for Engineers');
    expect(subjects[1].subjectName).toBe('Computational Thinking for Problem Solving');
    expect(subjects[2].subjectName).toBe('Computational Thinking Laboratory');
    expect(subjects[3].subjectName).toBe('Basic Electrical, Electronics & Measurement Engineering');
    expect(subjects[4].subjectName).toBe('Introduction to Engineering');
    expect(subjects[5].subjectName).toBe('Professional Communication - I');
    expect(subjects[6].subjectName).toBe('Linear Algebra for Computing');
    expect(subjects[7].subjectName).toBe('Semiconductor Physics');
    expect(subjects[8].subjectName).toBe('Modern Physics Laboratory');
    expect(subjects[9].subjectName).toBe('Engineers and Society');
    expect(subjects[10].subjectName).toBe('Constitution of India');

    // Verify grades
    const expectedGrades = ['C', 'C', 'S', 'A', 'S', 'C', 'B', 'D', 'C', 'S', 'B'];
    expect(subjects.map((s) => s.grade)).toEqual(expectedGrades);

    // Verify that NO credits were guessed or invented
    for (const sub of subjects) {
      expect(sub.credits).toBe('');
      expect(sub.confidence.credits).toBe('none');
      expect(sub.creditsSource).toBe('USER');
      expect(sub.source).toBe('AMS');
      expect(sub.status).toBe('Pass');
    }

    // Verify grade points were derived from regulation VTR21:
    // S -> 10, A -> 9, B -> 8, C -> 7, D -> 6
    const expectedGradePoints = [7, 7, 10, 9, 10, 7, 8, 6, 7, 10, 8];
    expect(subjects.map((s) => s.gradePoint)).toEqual(expectedGradePoints);

    // 3. Verify audit summary blocks calculation when credits are missing
    const initialAudit = computeAmsAuditSummary(subjects, studentInfo);
    expect(initialAudit.sgpa).toBeNull();
    expect(initialAudit.fieldsRequiringInput).toBe(11); // All 11 require credits
    expect(initialAudit.fieldsDetectedAutomatically).toContain('Student Name');
    expect(initialAudit.fieldsDetectedAutomatically).toContain('Register Number');
    expect(initialAudit.fieldsEnteredByUser).toContain('Course Credits');

    // 4. Verify calculation once user enters credits (e.g. via bulk credit entry)
    const enteredCredits = [3, 3, 1.5, 4, 1.5, 2, 4, 3, 1.5, 0, 0];
    const completedSubjects = subjects.map((s, i) => ({
      ...s,
      credits: enteredCredits[i],
    }));

    const finalAudit = computeAmsAuditSummary(completedSubjects, {
      ...studentInfo,
      regulation: 'VTR21',
    });

    expect(finalAudit.fieldsRequiringInput).toBe(0);
    // Total Credits = 3 + 3 + 1.5 + 4 + 1.5 + 2 + 4 + 3 + 1.5 + 0 + 0 = 23.5
    expect(finalAudit.totalCredits).toBe(23.5);
    // Non credit count = 2 (0-credit subjects)
    expect(finalAudit.nonCreditCount).toBe(2);
    expect(finalAudit.creditBearingCount).toBe(9);
    // Total quality points =
    // (3*7)+(3*7)+(1.5*10)+(4*9)+(1.5*10)+(2*7)+(4*8)+(3*6)+(1.5*7)+(0*10)+(0*8)
    // = 21 + 21 + 15 + 36 + 15 + 14 + 32 + 18 + 10.5 + 0 + 0 = 182.5
    expect(finalAudit.totalQualityPoints).toBe(182.5);
    // SGPA = 182.5 / 23.5 = 7.7659...
    expect(finalAudit.sgpa).toBeCloseTo(182.5 / 23.5, 4);
  });

  it('extracts student metadata from repeating tabular row layout with distinct Stu Id and Register No', () => {
    const tabularLine = `
      1 VTU29962 24UECS0805 PALLAPU DILEEP KUMAR B.Tech CSE (AIML) 2024-2025 10210BM101 Biology for Engineers Pass C
    `;
    const info = extractStudentInfo(tabularLine);
    expect(info.studentId).toBe('VTU29962');
    expect(info.registerNumber).toBe('24UECS0805');
    expect(info.name).toBe('PALLAPU DILEEP KUMAR');
    expect(info.degree).toBe('B.Tech');
    expect(info.branch).toBe('CSE (AIML)');
    expect(info.batch).toBe('2024-2025');
    expect(info.nameVerified).toBe(true);

    const subjects = extractSubjectsFromText(tabularLine, 'VTR21');
    expect(subjects.length).toBe(1);
    expect(subjects[0].sno).toBe(1);
    expect(subjects[0].subjectCode).toBe('10210BM101');
    expect(subjects[0].subjectName).toBe('Biology for Engineers');
    expect(subjects[0].grade).toBe('C');
    expect(subjects[0].credits).toBe('');
  });

  it('merges multi-line wrapped course names across lines within SNo blocks', () => {
    const multiLineAmsText = `
      SNo Stu Id Register No Name Degree Branch Batch Coursecode Coursename Result Grade
      1 VTU29962 24UECS0805 PALLAPU DILEEP KUMAR B.Tech CSE (AIML) 2024-2025 10210BM101 Biology for Engineers Pass C
      2 VTU29962 24UECS0805 PALLAPU DILEEP KUMAR B.Tech CSE (AIML) 2024-2025 10210CS102 Computational Thinking for Problem
      Solving Pass C
      3 VTU29962 24UECS0805 PALLAPU DILEEP KUMAR B.Tech CSE (AIML) 2024-2025 10210CS302 Computational Thinking Laboratory Pass S
      4 VTU29962 24UECS0805 PALLAPU DILEEP KUMAR B.Tech CSE (AIML) 2024-2025 10210EE201 Basic Electrical, Electronics & Measurement
      Engineering Pass A
    `;

    const tableResult = parseStructuredAmsTextTable(multiLineAmsText, 'VTR21');

    expect(tableResult.tableDetected).toBe(true);
    expect(tableResult.detectedColumns).toContain('SNo');
    expect(tableResult.detectedColumns).toContain('Coursecode');
    expect(tableResult.detectedColumns).toContain('Coursename');
    expect(tableResult.subjects.length).toBe(4);

    // Multi-line merged title for row 2
    expect(tableResult.subjects[1].sno).toBe(2);
    expect(tableResult.subjects[1].subjectCode).toBe('10210CS102');
    expect(tableResult.subjects[1].subjectName).toBe('Computational Thinking for Problem Solving');
    expect(tableResult.subjects[1].grade).toBe('C');

    // Multi-line merged title for row 4
    expect(tableResult.subjects[3].sno).toBe(4);
    expect(tableResult.subjects[3].subjectCode).toBe('10210EE201');
    expect(tableResult.subjects[3].subjectName).toBe('Basic Electrical, Electronics & Measurement Engineering');
    expect(tableResult.subjects[3].grade).toBe('A');

    // Row accounting: rows 1..4 verified
    expect(tableResult.detectedRowsCount).toBe(4);
    expect(tableResult.extractedRowsCount).toBe(4);
    expect(tableResult.missingRowNumbers).toEqual([]);
    expect(tableResult.rowAccountingVerified).toBe(true);
  });

  it('detects missing row numbers when sequential SNo integrity is broken', () => {
    const tableWithMissingRow = `
      SNo Stu Id Register No Name Degree Branch Batch Coursecode Coursename Result Grade
      1 VTU29962 24UECS0805 PALLAPU DILEEP KUMAR B.Tech CSE (AIML) 2024-2025 10210BM101 Biology for Engineers Pass C
      2 VTU29962 24UECS0805 PALLAPU DILEEP KUMAR B.Tech CSE (AIML) 2024-2025 10210CS102 Computational Thinking Pass C
      4 VTU29962 24UECS0805 PALLAPU DILEEP KUMAR B.Tech CSE (AIML) 2024-2025 10210EE201 Basic Electrical Engineering Pass A
    `;

    const tableResult = parseStructuredAmsTextTable(tableWithMissingRow, 'VTR21');

    expect(tableResult.detectedRowsCount).toBe(3);
    expect(tableResult.extractedRowsCount).toBe(3);
    // Row 3 is missing between 2 and 4!
    expect(tableResult.missingRowNumbers).toEqual([3]);
    expect(tableResult.rowAccountingVerified).toBe(false);
  });

  it('treats Course Code as strictly optional without breaking extraction or SGPA calculation', () => {
    const tableWithoutCourseCodes = `
      1 Biology for Engineers Pass C
      2 Computational Thinking Pass S
    `;

    const subjects = extractSubjectsFromText(tableWithoutCourseCodes, 'VTR21');
    expect(subjects.length).toBe(2);

    expect(subjects[0].sno).toBe(1);
    expect(subjects[0].subjectCode).toBeNull();
    expect(subjects[0].subjectName).toBe('Biology for Engineers');
    expect(subjects[0].grade).toBe('C');
    expect(subjects[0].gradePoint).toBe(7); // VTR21: C -> 7

    expect(subjects[1].sno).toBe(2);
    expect(subjects[1].subjectCode).toBeNull();
    expect(subjects[1].subjectName).toBe('Computational Thinking');
    expect(subjects[1].grade).toBe('S');
    expect(subjects[1].gradePoint).toBe(10); // VTR21: S -> 10

    // Provide credits: calculation works normally without course code
    subjects[0].credits = 3;
    subjects[1].credits = 4;
    const audit = computeAmsAuditSummary(subjects);
    expect(audit.totalCredits).toBe(7);
    expect(audit.totalQualityPoints).toBe(3 * 7 + 4 * 10); // 21 + 40 = 61
    expect(audit.sgpa).toBeCloseTo(61 / 7, 3);
  });

  it('classifies document page type correctly (AMS result vs other academic vs unsupported)', () => {
    const amsTableText = `
      SNo Stu Id Register No Name Degree Branch Batch Coursecode Coursename Result Grade
      1 VTU29962 24UECS0805 PALLAPU DILEEP KUMAR B.Tech CSE (AIML) 2024-2025 10210BM101 Biology for Engineers Pass C
    `;
    const amsResult = detectDocumentPageType(amsTableText);
    expect(amsResult.pageType).toBe('AMS_RESULT_TABLE');
    expect(amsResult.tableDetected).toBe(true);

    const syllabusText = `
      DEPARTMENT OF COMPUTER SCIENCE AND ENGINEERING
      SYLLABUS FOR B.TECH CSE (AIML) - 2024-2025
      COURSE CURRICULUM AND CREDITS DISTRIBUTION
    `;
    const syllabusResult = detectDocumentPageType(syllabusText);
    expect(syllabusResult.pageType).toBe('OTHER_ACADEMIC_DOCUMENT');
    expect(syllabusResult.tableDetected).toBe(false);

    const randomText = `
      Shopping list:
      1. Apples
      2. Bananas
      3. Milk
    `;
    const randomResult = detectDocumentPageType(randomText);
    expect(randomResult.pageType).toBe('UNSUPPORTED');
    expect(randomResult.tableDetected).toBe(false);
  });

  it('generates a 10-point Pre-Calculation Audit Checklist and controls readyToCalculate flag', () => {
    const raw = `
      1 10210CS101 Data Structures Pass A
      2 10210CS102 Algorithms Pass S
    `;
    const studentInfo = {
      name: 'PALLAPU DILEEP KUMAR',
      nameConfidence: 'high' as const,
      registerNumber: '24UECS0805',
      regConfidence: 'high' as const,
      department: 'CSE',
      program: 'B.Tech',
      semester: null,
      semesterConfidence: 'none' as const,
      academicYear: '2024-2025',
      regulation: null, // Regulation NOT selected yet
      regulationConfidence: 'none' as const,
      college: 'Vel Tech',
    };

    const subjects = extractSubjectsFromText(raw, null);
    // Initial state: missing credits and regulation
    const initialAudit = computeAmsAuditSummary(subjects, studentInfo);

    expect(initialAudit.preCalculationAudit).toBeDefined();
    expect(initialAudit.preCalculationAudit!.length).toBe(10);
    expect(initialAudit.readyToCalculate).toBe(false);

    // Provide credits and select regulation
    subjects[0].credits = 4;
    subjects[1].credits = 3;
    subjects[0].gradePoint = 9; // A -> 9
    subjects[1].gradePoint = 10; // S -> 10

    const completedAudit = computeAmsAuditSummary(subjects, {
      ...studentInfo,
      regulation: 'VTR21',
    });

    expect(completedAudit.readyToCalculate).toBe(true);
    const creditsCheck = completedAudit.preCalculationAudit!.find((i) => i.id === 'credits_available');
    expect(creditsCheck?.status).toBe('passed');
    const regCheck = completedAudit.preCalculationAudit!.find((i) => i.id === 'regulation_selected');
    expect(regCheck?.status).toBe('passed');
  });

  it('stores originalValues on extracted subjects for user restoration', () => {
    const raw = `
      1 10210CS101 Data Structures Pass A
    `;
    const subjects = extractSubjectsFromText(raw, 'VTR21');
    expect(subjects.length).toBe(1);
    expect(subjects[0].originalValues).toBeDefined();
    expect(subjects[0].originalValues?.subjectCode).toBe('10210CS101');
    expect(subjects[0].originalValues?.subjectName).toBe('Data Structures');
    expect(subjects[0].originalValues?.grade).toBe('A');
    expect(subjects[0].originalValues?.gradePoint).toBe(9);
  });

  it('correctly reconstructs multi-line wrapped branch, batch, and top-right student name', () => {
    const raw = `
      PALLAPU DILEEP
      KUMAR
      Branch: CSE
      (AIML)
      Batch: 2024-
      2025
    `;
    const info = extractStudentInfo(raw);
    expect(info.name).toBe('PALLAPU DILEEP KUMAR');
    expect(info.branch).toBe('CSE (AIML)');
    expect(info.batch).toBe('2024-2025');
    expect(info.branchSource).toBe('AMS');
    expect(info.batchSource).toBe('AMS');
  });

  it('generates itemized calculationTrace with exact formula strings and non-credit course annotation', () => {
    const subjects: AmsSubject[] = [
      {
        id: '1',
        sno: 1,
        subjectCode: '10210CS101',
        subjectName: 'Algorithms',
        credits: 4,
        grade: 'S',
        gradePoint: 10,
        isDuplicate: false,
        isExcluded: false,
        source: 'AMS',
        confidence: { code: 'high', name: 'high', grade: 'high', credits: 'high', gradePoint: 'high' },
        creditsSource: 'USER',
        status: 'Pass',
        isManuallyEdited: false,
      },
      {
        id: '2',
        sno: 2,
        subjectCode: '10217GE901',
        subjectName: 'Engineers and Society',
        credits: 0,
        grade: 'S',
        gradePoint: 10,
        isDuplicate: false,
        isExcluded: false,
        source: 'AMS',
        confidence: { code: 'high', name: 'high', grade: 'high', credits: 'high', gradePoint: 'high' },
        creditsSource: 'USER',
        status: 'Pass',
        isManuallyEdited: false,
      },
      {
        id: '3',
        sno: 3,
        subjectCode: '10210CS102',
        subjectName: 'Web Development',
        credits: 3,
        grade: 'A',
        gradePoint: 9,
        isDuplicate: false,
        isExcluded: false,
        source: 'AMS',
        confidence: { code: 'high', name: 'high', grade: 'high', credits: 'high', gradePoint: 'high' },
        creditsSource: 'USER',
        status: 'Pass',
        isManuallyEdited: false,
      },
    ];

    const studentInfo: AmsStudentInfo = {
      name: 'Test Student',
      nameConfidence: 'high',
      registerNumber: '12345',
      regConfidence: 'high',
      department: 'CSE',
      program: 'B.Tech',
      academicYear: '2024-2025',
      college: 'Vel Tech',
      regulation: 'VTR21',
      regulationConfidence: 'high',
      semester: 1,
      semesterConfidence: 'high',
    };

    const audit = computeAmsAuditSummary(subjects, studentInfo);
    expect(audit.readyToCalculate).toBe(true);
    expect(audit.calculationTrace).toBeDefined();
    expect(audit.calculationTrace?.length).toBe(3);

    // Row 1: 4 * 10 = 40
    expect(audit.calculationTrace![0].formulaStr).toBe('4 × 10 = 40');
    expect(audit.calculationTrace![0].isNonCredit).toBe(false);

    // Row 2: 0 credits (Non-credit) = 0.00
    expect(audit.calculationTrace![1].formulaStr).toBe('0 credits (Non-credit) = 0.00');
    expect(audit.calculationTrace![1].isNonCredit).toBe(true);

    // Row 3: 3 * 9 = 27
    expect(audit.calculationTrace![2].formulaStr).toBe('3 × 9 = 27');

    // Total credits: 4 + 3 = 7 (0-credit course omitted from denominator)
    expect(audit.totalCredits).toBe(7);
    expect(audit.totalQualityPoints).toBe(67);
    expect(audit.sgpa).toBeCloseTo(67 / 7, 4);
    expect(audit.creditsEnteredCount).toBe(3);
    expect(audit.totalSubjectsCount).toBe(3);
  });

  it('identifies exact calculationIssues and locks readyToCalculate when invalid grades or missing credits exist', () => {
    const invalidSubjects: AmsSubject[] = [
      {
        id: '1',
        sno: 1,
        subjectCode: '10210CS101',
        subjectName: 'Algorithms',
        credits: '', // Missing credits
        grade: 'Z', // Invalid grade in VTR21
        gradePoint: null,
        isDuplicate: false,
        isExcluded: false,
        source: 'AMS',
        confidence: { code: 'high', name: 'high', grade: 'low', credits: 'none', gradePoint: 'none' },
        creditsSource: 'USER',
        status: 'Pass',
        isManuallyEdited: false,
      },
    ];

    const studentInfo: AmsStudentInfo = {
      name: 'Test Student',
      nameConfidence: 'high',
      registerNumber: '12345',
      regConfidence: 'high',
      department: 'CSE',
      program: 'B.Tech',
      academicYear: '2024-2025',
      college: 'Vel Tech',
      regulation: 'VTR21',
      regulationConfidence: 'high',
      semester: 1,
      semesterConfidence: 'high',
    };

    const audit = computeAmsAuditSummary(invalidSubjects, studentInfo);
    expect(audit.readyToCalculate).toBe(false);
    expect(audit.calculationIssues).toBeDefined();
    expect(audit.calculationIssues!.some((issue) => issue.includes('credit(s) missing'))).toBe(true);
    expect(audit.calculationIssues!.some((issue) => issue.includes('Grade not recognized under VTR21'))).toBe(true);
  });

  describe('Master Upgrade: Bulk Credits Validation', () => {
    it('validates matching credit tokens sequence correctly', () => {
      const res = validateBulkCredits('3 4 1.5 0 2', 5);
      expect(res.valid).toBe(true);
      expect(res.credits).toEqual([3, 4, 1.5, 0, 2]);
    });

    it('rejects count mismatch with exact required error message', () => {
      const res = validateBulkCredits('3 4 1.5', 5);
      expect(res.valid).toBe(false);
      expect(res.error).toBe('3 credit values provided for 5 subjects. Count must match exactly.');
    });

    it('rejects non-numeric tokens with error message specifying line/position', () => {
      const res = validateBulkCredits('3 ABC 1.5', 3);
      expect(res.valid).toBe(false);
      expect(res.error).toContain('Invalid credit value "ABC"');
    });
  });

  describe('Master Upgrade: Multi-Semester CGPA Engine', () => {
    it('calculates weighted cumulative GPA accurately across semesters', () => {
      const semesters = [
        {
          id: 'sem-1',
          semesterNumber: 1,
          semesterLabel: 'Semester 1',
          sgpa: 8.5,
          totalCredits: 20,
          totalQualityPoints: 170,
          subjectsCount: 6,
          isVerified: true,
          verified: true,
        },
        {
          id: 'sem-2',
          semesterNumber: 2,
          semesterLabel: 'Semester 2',
          sgpa: 9.0,
          totalCredits: 22,
          totalQualityPoints: 198,
          subjectsCount: 7,
          isVerified: true,
          verified: true,
        },
      ];

      const cgpaRes = calculateAmsCgpa(semesters);
      expect(cgpaRes.totalCredits).toBe(42);
      expect(cgpaRes.totalQualityPoints).toBe(368);
      // 368 / 42 = 8.7619...
      expect(cgpaRes.cgpa).toBeCloseTo(368 / 42, 4);
      expect(cgpaRes.calculationTrace.length).toBe(2);
      expect(cgpaRes.calculationTrace[0].formulaStr).toContain('20 credits × 8.50 SGPA = 170.00');
    });
  });

  describe('Master Upgrade: Document Classification and Format Detection', () => {
    it('correctly classifies AMS result tables vs other academic documents', () => {
      const amsText = 'Register No Coursecode Coursename Grade Result B.Tech Nov.2024';
      const classRes = classifyAcademicDocument(amsText);
      expect(classRes).toBe('AMS_RESULT');

      const otherDoc = 'Curriculum and Syllabus Unit 1 Unit 2 Reference Books';
      const nonAmsRes = classifyAcademicDocument(otherDoc);
      expect(nonAmsRes).toBe('UNKNOWN_ACADEMIC_DOCUMENT');
    });

    it('detects Vel Tech AMS format and identifies missing credits column', () => {
      const text = 'SNo Stu Id Register No Name Degree Branch Batch Coursecode Coursename Result Grade';
      const format = detectAmsFormat(text, ['Coursecode', 'Coursename', 'Result', 'Grade']);
      expect(format.formatName).toContain('Vel Tech');
      expect(format.missingColumns).toContain('Credits');
      expect(format.confidence.toLowerCase()).toBe('high');
    });
  });

  describe('Master Upgrade: Student Profile Matching', () => {
    it('identifies exact match with saved profile', () => {
      const savedProfile = {
        name: 'PALLAPU DILEEP KUMAR',
        rollNumber: '24UECS0805',
        department: 'CSE',
        regulation: 'VTR21',
        college: 'Vel Tech',
      };
      const amsInfo: AmsStudentInfo = {
        name: 'PALLAPU DILEEP KUMAR',
        nameConfidence: 'high',
        registerNumber: '24UECS0805',
        regConfidence: 'high',
        department: 'CSE',
        program: 'B.Tech',
        academicYear: '2024-2025',
        college: 'Vel Tech',
        regulation: 'VTR21',
        regulationConfidence: 'high',
        semester: 1,
        semesterConfidence: 'high',
      };

      const matchRes = compareWithSavedProfile(amsInfo, savedProfile);
      expect(matchRes.status).toBe('match');
      expect(matchRes.differences?.length).toBe(0);
    });

    it('flags differences when imported document does not match saved profile', () => {
      const savedProfile = {
        name: 'PALLAPU DILEEP KUMAR',
        rollNumber: '24UECS0805',
        department: 'CSE',
        regulation: 'VTR21',
        college: 'Vel Tech',
      };
      const amsInfo: AmsStudentInfo = {
        name: 'JOHN DOE',
        nameConfidence: 'high',
        registerNumber: '24UECS0999',
        regConfidence: 'high',
        department: 'ECE',
        program: 'B.Tech',
        academicYear: '2024-2025',
        college: 'Vel Tech',
        regulation: 'VTR21',
        regulationConfidence: 'high',
        semester: 1,
        semesterConfidence: 'high',
      };

      const matchRes = compareWithSavedProfile(amsInfo, savedProfile);
      expect(matchRes.status).toBe('different');
      expect(matchRes.differences?.some((d) => d.field === 'Name')).toBe(true);
      expect(matchRes.differences?.some((d) => d.field === 'Register Number')).toBe(true);
    });
  });

  describe('Master Upgrade: Cross-Semester Duplicate Protection', () => {
    it('does not flag identical course codes as duplicates across different semesters', () => {
      const subs: AmsSubject[] = [
        {
          id: 's1',
          subjectCode: '10210MA101',
          subjectName: 'Mathematics',
          credits: 4,
          grade: 'A',
          gradePoint: 9,
          semesterContext: 1,
          isDuplicate: false,
          isExcluded: false,
          source: 'AMS',
          confidence: { code: 'high', name: 'high', credits: 'high', grade: 'high', gradePoint: 'high' },
          status: 'Pass',
          isManuallyEdited: false,
        },
        {
          id: 's2',
          subjectCode: '10210MA101',
          subjectName: 'Mathematics',
          credits: 4,
          grade: 'S',
          gradePoint: 10,
          semesterContext: 2, // Different semester context!
          isDuplicate: false,
          isExcluded: false,
          source: 'AMS',
          confidence: { code: 'high', name: 'high', credits: 'high', grade: 'high', gradePoint: 'high' },
          status: 'Pass',
          isManuallyEdited: false,
        },
      ];

      const res = detectAndFlagDuplicates(subs);
      expect(res[0].isDuplicate).toBe(false);
      expect(res[1].isDuplicate).toBe(false);
    });
  });
});

