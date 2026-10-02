import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { SegmentedControl } from '../components/common/SegmentedControl';
import { GradeSelect } from '../components/common/GradeSelect';
import {
  calculateTheoryInternal,
  calculateGPA,
  calculateCGPA,
  formatFixed,
} from '../utils/calculations';
import type { SubjectItem, SemesterItem } from '../types';

export const WhatIfPage: React.FC = () => {
  const [tab, setTab] = useState<'internal' | 'gpa' | 'cgpa'>('internal');

  // Internal What-If State
  const baseInternal = {
    test1: 24, // 8
    test2: 24, // 8
    test3: 18, // 6
    attendance: 5,
    assignment: 4,
  };
  const [hypotheticalT3, setHypotheticalT3] = useState<number>(27); // 9

  const currentTheoryRes = calculateTheoryInternal(baseInternal);
  const projectedTheoryRes = calculateTheoryInternal({
    ...baseInternal,
    test3: hypotheticalT3,
  });
  const internalDiff = projectedTheoryRes.totalInternal - currentTheoryRes.totalInternal;

  // GPA What-If State
  const gpaSubjects: SubjectItem[] = [
    { id: '1', name: 'Data Structures', credits: 4, grade: 'B+', gradePoint: 7 },
    { id: '2', name: 'Computer Networks', credits: 4, grade: 'A', gradePoint: 8 },
    { id: '3', name: 'Discrete Mathematics', credits: 3, grade: 'A', gradePoint: 8 },
    { id: '4', name: 'Design of Algorithms', credits: 4, grade: 'A+', gradePoint: 9 },
  ];
  const [modifiedGrade, setModifiedGrade] = useState<{ id: string; grade: string; points: number }>({
    id: '1',
    grade: 'A+',
    points: 9,
  });

  const currentGpaRes = calculateGPA(gpaSubjects);
  const projectedGpaSubjects = gpaSubjects.map((s) =>
    s.id === modifiedGrade.id
      ? { ...s, grade: modifiedGrade.grade, gradePoint: modifiedGrade.points }
      : s
  );
  const projectedGpaRes = calculateGPA(projectedGpaSubjects);
  const gpaDiff = projectedGpaRes.gpa - currentGpaRes.gpa;

  // CGPA What-If State
  const cgpaSemesters: SemesterItem[] = [
    { id: '1', semesterNumber: 1, gpa: 8.2, credits: 24 },
    { id: '2', semesterNumber: 2, gpa: 8.4, credits: 24 },
    { id: '3', semesterNumber: 3, gpa: 8.6, credits: 24 },
  ];
  const [hypotheticalNextGpa, setHypotheticalNextGpa] = useState<number>(9.2);
  const [hypotheticalNextCredits, setHypotheticalNextCredits] = useState<number>(24);

  const currentCgpaRes = calculateCGPA(cgpaSemesters);
  const projectedCgpaSemesters = [
    ...cgpaSemesters,
    {
      id: 'next',
      semesterNumber: cgpaSemesters.length + 1,
      gpa: hypotheticalNextGpa,
      credits: hypotheticalNextCredits,
    },
  ];
  const projectedCgpaRes = calculateCGPA(projectedCgpaSemesters);
  const cgpaDiff = projectedCgpaRes.cgpa - currentCgpaRes.cgpa;

  return (
    <div className="flex flex-col gap-10 sm:gap-14 apple-reveal max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col items-center text-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-black dark:bg-white text-white dark:text-black flex items-center justify-center shadow-sm">
          <Sparkles className="w-6 h-6" />
        </div>
        <h1 className="text-[34px] sm:text-[48px] font-bold tracking-tight text-[#1D1D1F] dark:text-[#F5F5F7]">
          What-If Scenario Sandbox
        </h1>
        <p className="text-[16px] text-[#6E6E73] dark:text-[#A1A1A6] max-w-lg leading-relaxed">
          Experiment with hypothetical grades and assessment scores without altering your saved records.
        </p>

        {/* Tab switch */}
        <div className="mt-4 w-full max-w-md">
          <SegmentedControl<'internal' | 'gpa' | 'cgpa'>
            fullWidth
            value={tab}
            onChange={(val) => setTab(val)}
            options={[
              { value: 'internal', label: 'Internal Test' },
              { value: 'gpa', label: 'Subject Grade' },
              { value: 'cgpa', label: 'Next Semester' },
            ]}
          />
        </div>
      </div>

      {/* 8 & 9. Comparison Mode Card */}
      {tab === 'internal' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          <div className="bg-[#FFFFFF] dark:bg-[#1D1D1F] rounded-[24px] p-6 sm:p-8 border border-black/[0.08] dark:border-white/[0.12] shadow-sm flex flex-col gap-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#86868B]">
              Scenario Controls
            </span>
            <div className="flex flex-col gap-3">
              <label htmlFor="what-if-t3" className="text-xs font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                What if I score this in Test 3? (out of 30)
              </label>
              <input
                id="what-if-t3"
                type="number"
                min={0}
                max={30}
                value={hypotheticalT3}
                onChange={(e) => setHypotheticalT3(Math.min(30, Math.max(0, parseInt(e.target.value) || 0)))}
                className="w-full px-4 py-3 text-lg font-bold rounded-xl bg-[#F5F5F7] dark:bg-[#2C2C2E] border border-black/[0.04] dark:border-white/[0.08] outline-none text-[#1D1D1F] dark:text-[#F5F5F7]"
              />
              <span className="text-xs text-[#6E6E73] dark:text-[#A1A1A6]">
                Converts to {formatFixed((hypotheticalT3 / 30) * 10, 2)} / 10 internal marks
              </span>
            </div>
          </div>

          <div className="bg-[#FFFFFF] dark:bg-[#1D1D1F] rounded-[24px] p-6 sm:p-8 border border-black/[0.08] dark:border-white/[0.12] shadow-sm flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold tracking-wider uppercase text-[#86868B]">
                COMPARISON
              </span>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-emerald-600 dark:text-emerald-400">
                {internalDiff >= 0 ? `+${internalDiff.toFixed(2)} marks` : `${internalDiff.toFixed(2)} marks`}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 border-b border-black/[0.06] dark:border-white/[0.08] pb-4">
              <div>
                <span className="text-xs text-[#6E6E73] dark:text-[#A1A1A6]">Current Standing</span>
                <div className="text-3xl font-bold text-[#1D1D1F] dark:text-[#F5F5F7] mt-1 tabular-nums">
                  {formatFixed(currentTheoryRes.totalInternal, 2)}
                  <span className="text-xs text-[#86868B] font-normal"> / 40</span>
                </div>
              </div>
              <div>
                <span className="text-xs text-[#6E6E73] dark:text-[#A1A1A6]">Projected Scenario</span>
                <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 tabular-nums">
                  {formatFixed(projectedTheoryRes.totalInternal, 2)}
                  <span className="text-xs text-[#86868B] font-normal"> / 40</span>
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#F5F5F7] dark:bg-[#2C2C2E] text-xs text-[#6E6E73] dark:text-[#A1A1A6]">
              Projected percentage improves from{' '}
              <strong>{currentTheoryRes.percentage.toFixed(1)}%</strong> to{' '}
              <strong>{projectedTheoryRes.percentage.toFixed(1)}%</strong>.
            </div>
          </div>
        </div>
      )}

      {/* GPA What-If */}
      {tab === 'gpa' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          <div className="bg-[#FFFFFF] dark:bg-[#1D1D1F] rounded-[24px] p-6 sm:p-8 border border-black/[0.08] dark:border-white/[0.12] shadow-sm flex flex-col gap-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#86868B]">
              Subject Grade Simulation
            </span>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                What if Data Structures (4 credits) is:
              </label>
              <GradeSelect
                value={modifiedGrade.grade}
                onChange={(g, p) => setModifiedGrade((prev) => ({ ...prev, grade: g, points: p }))}
              />
            </div>
          </div>

          <div className="bg-[#FFFFFF] dark:bg-[#1D1D1F] rounded-[24px] p-6 sm:p-8 border border-black/[0.08] dark:border-white/[0.12] shadow-sm flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold tracking-wider uppercase text-[#86868B]">
                GPA PROJECTION
              </span>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-emerald-600 dark:text-emerald-400">
                {gpaDiff >= 0 ? `+${gpaDiff.toFixed(2)} GPA` : `${gpaDiff.toFixed(2)} GPA`}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 border-b border-black/[0.06] dark:border-white/[0.08] pb-4">
              <div>
                <span className="text-xs text-[#6E6E73] dark:text-[#A1A1A6]">Current GPA</span>
                <div className="text-3xl font-bold text-[#1D1D1F] dark:text-[#F5F5F7] mt-1 tabular-nums">
                  {formatFixed(currentGpaRes.gpa, 2)}
                </div>
              </div>
              <div>
                <span className="text-xs text-[#6E6E73] dark:text-[#A1A1A6]">Projected GPA</span>
                <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 tabular-nums">
                  {formatFixed(projectedGpaRes.gpa, 2)}
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#F5F5F7] dark:bg-[#2C2C2E] text-xs text-[#6E6E73] dark:text-[#A1A1A6]">
              Labeled as <strong>Scenario Projection</strong>. Unsaved simulation.
            </div>
          </div>
        </div>
      )}

      {/* CGPA What-If */}
      {tab === 'cgpa' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          <div className="bg-[#FFFFFF] dark:bg-[#1D1D1F] rounded-[24px] p-6 sm:p-8 border border-black/[0.08] dark:border-white/[0.12] shadow-sm flex flex-col gap-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#86868B]">
              Next Semester Scenario
            </span>
            <div className="flex flex-col gap-3">
              <div>
                <label htmlFor="next-sem-gpa" className="text-xs font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                  What if upcoming semester GPA is:
                </label>
                <input
                  id="next-sem-gpa"
                  type="number"
                  step={0.05}
                  min={0}
                  max={10}
                  value={hypotheticalNextGpa}
                  onChange={(e) => setHypotheticalNextGpa(parseFloat(e.target.value) || 0)}
                  className="w-full px-4 py-2.5 text-lg font-bold rounded-xl bg-[#F5F5F7] dark:bg-[#2C2C2E] border border-black/[0.04] dark:border-white/[0.08] outline-none text-[#1D1D1F] dark:text-[#F5F5F7] mt-1"
                />
              </div>
              <div>
                <label htmlFor="next-sem-credits" className="text-xs font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                  Semester Credits:
                </label>
                <input
                  id="next-sem-credits"
                  type="number"
                  min={1}
                  max={35}
                  value={hypotheticalNextCredits}
                  onChange={(e) => setHypotheticalNextCredits(parseInt(e.target.value) || 24)}
                  className="w-full px-4 py-2.5 text-sm rounded-xl bg-[#F5F5F7] dark:bg-[#2C2C2E] border border-black/[0.04] dark:border-white/[0.08] outline-none text-[#1D1D1F] dark:text-[#F5F5F7] mt-1"
                />
              </div>
            </div>
          </div>

          <div className="bg-[#FFFFFF] dark:bg-[#1D1D1F] rounded-[24px] p-6 sm:p-8 border border-black/[0.08] dark:border-white/[0.12] shadow-sm flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold tracking-wider uppercase text-[#86868B]">
                CGPA PROJECTION
              </span>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-emerald-600 dark:text-emerald-400">
                {cgpaDiff >= 0 ? `+${cgpaDiff.toFixed(2)} CGPA` : `${cgpaDiff.toFixed(2)} CGPA`}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 border-b border-black/[0.06] dark:border-white/[0.08] pb-4">
              <div>
                <span className="text-xs text-[#6E6E73] dark:text-[#A1A1A6]">Current CGPA</span>
                <div className="text-3xl font-bold text-[#1D1D1F] dark:text-[#F5F5F7] mt-1 tabular-nums">
                  {formatFixed(currentCgpaRes.cgpa, 2)}
                </div>
              </div>
              <div>
                <span className="text-xs text-[#6E6E73] dark:text-[#A1A1A6]">Projected CGPA</span>
                <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 tabular-nums">
                  {formatFixed(projectedCgpaRes.cgpa, 2)}
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#F5F5F7] dark:bg-[#2C2C2E] text-xs text-[#6E6E73] dark:text-[#A1A1A6]">
              Based on credit-weighted formula Σ(GPA × Credits) / Σ(Credits).
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
