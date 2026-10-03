import { describe, it, expect } from 'vitest';
import {
  extractStudentInfo,
  extractSubjectsFromText,
  computeAmsAuditSummary,
  normalizeSubjectCode,
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

  it('extracts student metadata from repeating tabular row layout', () => {
    const tabularLine = `
      1 24UECS0805 24UECS0805 PALLAPU DILEEP KUMAR B.Tech CSE (AIML) 2024-2025 10210BM101 Biology for Engineers Pass C
    `;
    const info = extractStudentInfo(tabularLine);
    expect(info.registerNumber).toBe('24UECS0805');
    expect(info.name).toBe('PALLAPU DILEEP KUMAR');
    expect(info.degree).toBe('B.Tech');
    expect(info.branch).toBe('CSE (AIML)');
    expect(info.batch).toBe('2024-2025');

    const subjects = extractSubjectsFromText(tabularLine, 'VTR21');
    expect(subjects.length).toBe(1);
    expect(subjects[0].subjectCode).toBe('10210BM101');
    expect(subjects[0].subjectName).toBe('Biology for Engineers');
    expect(subjects[0].grade).toBe('C');
    expect(subjects[0].credits).toBe('');
  });
});

