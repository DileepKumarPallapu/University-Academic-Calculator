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
});
