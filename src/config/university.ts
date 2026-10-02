/**
 * Central University Marking & Grading Configuration
 * Easily configurable for institutional rule changes.
 */

export type RegulationId = 'VTR15' | 'VTR18' | 'VTR21' | 'VTR25';

export interface RegulationConfig {
  id: RegulationId;
  name: string;
  years: string;
  description: string;
  grades: { grade: string; points: number; label: string; range: string }[];
}

export const REGULATIONS: Record<RegulationId, RegulationConfig> = {
  VTR25: {
    id: 'VTR25',
    name: 'VTR25',
    years: '2025 onwards',
    description: 'Grading scale: O (10), A+ (9), A (8), B+ (7), B (6), C (5), RA (0).',
    grades: [
      { grade: 'O', points: 10, label: 'O (10) — Outstanding', range: '91–100%' },
      { grade: 'A+', points: 9, label: 'A+ (9) — Excellent', range: '81–90%' },
      { grade: 'A', points: 8, label: 'A (8) — Very Good', range: '71–80%' },
      { grade: 'B+', points: 7, label: 'B+ (7) — Good', range: '61–70%' },
      { grade: 'B', points: 6, label: 'B (6) — Above Average', range: '56–60%' },
      { grade: 'C', points: 5, label: 'C (5) — Average', range: '50–55%' },
      { grade: 'RA', points: 0, label: 'RA (0) — Reappearance', range: '< 50%' },
    ],
  },
  VTR21: {
    id: 'VTR21',
    name: 'VTR21',
    years: '2021 to 2024 entrants',
    description: 'Grading scale: S (10), A (9), B (8), C (7), D (6), RA (0). Passing min: Grade D (6 points).',
    grades: [
      { grade: 'S', points: 10, label: 'S (10) — Outstanding', range: '90–100%' },
      { grade: 'A', points: 9, label: 'A (9) — Excellent', range: '80–89%' },
      { grade: 'B', points: 8, label: 'B (8) — Very Good', range: '70–79%' },
      { grade: 'C', points: 7, label: 'C (7) — Good', range: '60–69%' },
      { grade: 'D', points: 6, label: 'D (6) — Pass Minimum', range: '50–59%' },
      { grade: 'RA', points: 0, label: 'RA (0) — Reappear', range: '< 50%' },
    ],
  },
  VTR18: {
    id: 'VTR18',
    name: 'VTR18',
    years: '2018 to 2020 entrants & Law',
    description: 'Grading scale: S/O (10), A+ (9), A (8), B+ (7), B (6), C (5), E (5), RA (0). Passing min: Grade E (5 points).',
    grades: [
      { grade: 'S', points: 10, label: 'S / O (10) — Outstanding', range: '90–100%' },
      { grade: 'A+', points: 9, label: 'A+ (9) — Excellent', range: '80–89%' },
      { grade: 'A', points: 8, label: 'A (8) — Very Good', range: '80–89%' },
      { grade: 'B+', points: 7, label: 'B+ (7) — Good', range: '70–79%' },
      { grade: 'B', points: 6, label: 'B (6) — Above Average', range: '70–79%' },
      { grade: 'C', points: 5, label: 'C (5) — Average', range: '60–69%' },
      { grade: 'E', points: 5, label: 'E (5) — Pass Minimum', range: '50–59%' },
      { grade: 'RA', points: 0, label: 'RA (0) — Reappear', range: '< 50%' },
    ],
  },
  VTR15: {
    id: 'VTR15',
    name: 'VTR15',
    years: '2015 to 2017 entrants',
    description: 'Grading scale: S (10), A (9), B (8), C (7), D (6), E (5), RA (0). Passing min: Grade E (5 points).',
    grades: [
      { grade: 'S', points: 10, label: 'S (10) — Outstanding', range: '90–100%' },
      { grade: 'A', points: 9, label: 'A (9) — Excellent', range: '80–89%' },
      { grade: 'B', points: 8, label: 'B (8) — Very Good', range: '70–79%' },
      { grade: 'C', points: 7, label: 'C (7) — Good', range: '60–69%' },
      { grade: 'D', points: 6, label: 'D (6) — Satisfactory', range: '55–59%' },
      { grade: 'E', points: 5, label: 'E (5) — Pass Minimum', range: '50–54%' },
      { grade: 'RA', points: 0, label: 'RA (0) — Reappear', range: '< 50%' },
    ],
  },
};

export const UNIVERSITY_CONFIG = {
  institutionName: 'University Academic Framework',

  // Theory Internal Rules: Max 40 marks
  theoryInternal: {
    name: 'Theory Internal',
    totalMax: 40,
    test1: {
      id: 'test1',
      label: 'Test 1',
      rawMax: 30,
      convertedMax: 10,
      factor: 10 / 30, // (raw / 30) * 10
    },
    test2: {
      id: 'test2',
      label: 'Test 2',
      rawMax: 30,
      convertedMax: 10,
      factor: 10 / 30, // (raw / 30) * 10
    },
    test3: {
      id: 'test3',
      label: 'Test 3',
      rawMax: 30,
      convertedMax: 10,
      factor: 10 / 30, // (raw / 30) * 10
    },
    attendance: {
      id: 'attendance',
      label: 'Attendance',
      rawMax: 5,
      convertedMax: 5,
      factor: 1, // direct 5
    },
    assignment: {
      id: 'assignment',
      label: 'Assignment',
      rawMax: 5,
      convertedMax: 5,
      factor: 1, // direct 5
    },
  },

  // Integrated Internal Rules: Max 40 marks
  integratedInternal: {
    name: 'Integrated Internal',
    totalMax: 40,
    mid1: {
      id: 'mid1',
      label: 'Mid 1',
      rawMax: 20,
      convertedMax: 5,
      factor: 5 / 20, // (raw / 20) * 5
    },
    mid2: {
      id: 'mid2',
      label: 'Mid 2',
      rawMax: 20,
      convertedMax: 5,
      factor: 5 / 20, // (raw / 20) * 5
    },
    lab: {
      id: 'lab',
      label: 'Model / Integrated Lab',
      rawMax: 20,
      convertedMax: 20,
      factor: 1, // direct 20 marks
    },
    attendance: {
      id: 'attendance',
      label: 'Attendance',
      rawMax: 5,
      convertedMax: 5,
      factor: 1, // direct 5
    },
    assignment: {
      id: 'assignment',
      label: 'Assignment',
      rawMax: 5,
      convertedMax: 5,
      factor: 1, // direct 5
    },
  },

  // Default university standard grade scale
  defaultGradeScale: REGULATIONS.VTR21.grades,

  // Performance indicator tiers
  performanceIndicatorLabel: 'Performance indicator',
  getPerformanceTier(percentage: number): { label: string; color: string } {
    if (percentage >= 90) return { label: 'Outstanding', color: 'text-zinc-900 dark:text-zinc-100' };
    if (percentage >= 80) return { label: 'Excellent', color: 'text-zinc-900 dark:text-zinc-100' };
    if (percentage >= 70) return { label: 'Very Good', color: 'text-zinc-800 dark:text-zinc-200' };
    if (percentage >= 60) return { label: 'Good', color: 'text-zinc-700 dark:text-zinc-300' };
    if (percentage >= 50) return { label: 'Average', color: 'text-zinc-600 dark:text-zinc-400' };
    return { label: 'Needs Improvement', color: 'text-zinc-500 dark:text-zinc-400' };
  },

  getGpaTier(gpa: number): { label: string; color: string } {
    if (gpa >= 9.0) return { label: 'Distinction with Honors', color: 'text-emerald-700 dark:text-emerald-400' };
    if (gpa >= 8.0) return { label: 'First Class with Distinction', color: 'text-zinc-900 dark:text-zinc-100' };
    if (gpa >= 7.0) return { label: 'First Class', color: 'text-zinc-800 dark:text-zinc-200' };
    if (gpa >= 6.0) return { label: 'Second Class', color: 'text-zinc-700 dark:text-zinc-300' };
    if (gpa >= 5.0) return { label: 'Pass Class', color: 'text-amber-700 dark:text-amber-400' };
    return { label: 'Re-appear Required', color: 'text-rose-700 dark:text-rose-400' };
  },
};
