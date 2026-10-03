import React, { useState } from 'react';
import {
  calculateTheoryInternal,
  calculateIntegratedInternal,
  convertTestMark,
  convertMidMark,
  formatFixed,
} from '../utils/calculations';
import type { TheoryInputs, IntegratedInputs } from '../types';
import { PrintButton } from '../components/common/PrintButton';
import { AcademicPrintReport } from '../components/common/AcademicPrintReport';


export const InternalCalculatorPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'theory' | 'integrated'>('theory');

  // Theory inputs defaulted to 0
  const [theory, setTheory] = useState<TheoryInputs>({
    test1: 0,
    test2: 0,
    test3: 0,
    attendance: 0,
    assignment: 0,
  });

  // Integrated inputs defaulted to 0
  const [integrated, setIntegrated] = useState<IntegratedInputs>({
    mid1: 0,
    mid2: 0,
    lab: 0,
    attendance: 0,
    assignment: 0,
  });

  const handleTheoryChange = (field: keyof TheoryInputs, value: string) => {
    if (value === '') {
      setTheory((prev) => ({ ...prev, [field]: '' }));
      return;
    }
    const num = parseFloat(value);
    const max = field === 'attendance' || field === 'assignment' ? 5 : 30;
    if (isNaN(num)) return;
    setTheory((prev) => ({ ...prev, [field]: Math.max(0, Math.min(max, num)) }));
  };

  const handleIntegratedChange = (field: keyof IntegratedInputs, value: string) => {
    if (value === '') {
      setIntegrated((prev) => ({ ...prev, [field]: '' }));
      return;
    }
    const num = parseFloat(value);
    const max = field === 'attendance' || field === 'assignment' ? 5 : 20;
    if (isNaN(num)) return;
    setIntegrated((prev) => ({ ...prev, [field]: Math.max(0, Math.min(max, num)) }));
  };

  const loadTheoryExample = () => {
    setTheory({
      test1: 24,
      test2: 27,
      test3: 21,
      attendance: 5,
      assignment: 4,
    });
  };

  const resetTheory = () => {
    setTheory({
      test1: 0,
      test2: 0,
      test3: 0,
      attendance: 0,
      assignment: 0,
    });
  };

  const loadIntegratedExample = () => {
    setIntegrated({
      mid1: 16,
      mid2: 18,
      lab: 18,
      attendance: 5,
      assignment: 4,
    });
  };

  const resetIntegrated = () => {
    setIntegrated({
      mid1: 0,
      mid2: 0,
      lab: 0,
      attendance: 0,
      assignment: 0,
    });
  };

  const theoryResult = calculateTheoryInternal(theory);
  const integratedResult = calculateIntegratedInternal(integrated);

  const t1Raw = typeof theory.test1 === 'number' ? theory.test1 : (parseFloat(theory.test1 as string) || 0);
  const t2Raw = typeof theory.test2 === 'number' ? theory.test2 : (parseFloat(theory.test2 as string) || 0);
  const t3Raw = typeof theory.test3 === 'number' ? theory.test3 : (parseFloat(theory.test3 as string) || 0);

  const m1Raw = typeof integrated.mid1 === 'number' ? integrated.mid1 : (parseFloat(integrated.mid1 as string) || 0);
  const m2Raw = typeof integrated.mid2 === 'number' ? integrated.mid2 : (parseFloat(integrated.mid2 as string) || 0);

  return (
    <>
      <div className="apple-page-enter flex flex-col gap-8 max-w-[1200px] mx-auto print:hidden">
        {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-[32px] sm:text-[40px] font-semibold tracking-tight text-[var(--text-primary)]">
          Internal Marks
        </h1>
        <p className="text-[17px] text-[var(--text-secondary)]">
          Calculate your internal assessment.
        </p>

        {/* Segmented Control */}
        <div className="mt-4 flex rounded-xl bg-[var(--border-secondary)] p-1 border border-[var(--border-primary)] w-full max-w-xs">
          <button
            type="button"
            onClick={() => setActiveTab('theory')}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
              activeTab === 'theory'
                ? 'bg-[var(--surface)] text-[var(--text-primary)] shadow-sm border border-[var(--border-primary)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            THEORY
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('integrated')}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
              activeTab === 'integrated'
                ? 'bg-[var(--surface)] text-[var(--text-primary)] shadow-sm border border-[var(--border-primary)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            INTEGRATED
          </button>
        </div>
      </div>

      {/* Main Grid: Form LEFT, Result RIGHT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Form: 7 cols */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          <div className="apple-main-container p-6 sm:p-8 flex flex-col gap-6">
            {activeTab === 'theory' ? (
              <>
                <div className="flex items-center justify-between border-b border-[var(--border-primary)] pb-4">
                  <div>
                    <h2 className="text-[20px] font-semibold text-[var(--text-primary)] tracking-tight">
                      Theory Internal
                    </h2>
                    <span className="text-xs text-[var(--text-secondary)]">
                      Assessment Components (Maximum 40 Marks)
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={loadTheoryExample}
                      className="text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:underline"
                    >
                      Load Example
                    </button>
                    <span className="text-[var(--text-tertiary)] text-xs">•</span>
                    <button
                      type="button"
                      onClick={resetTheory}
                      className="text-xs font-semibold text-[var(--text-primary)] hover:underline"
                    >
                      Reset to 0
                    </button>
                  </div>
                </div>

                {/* Test 1 */}
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <label htmlFor="theory-t1" className="apple-label">
                      Test 1 (Marks / 30)
                    </label>
                    <span className="text-xs font-semibold text-[var(--badge-text)] bg-[var(--badge-bg)] px-2.5 py-1 rounded-md tabular-nums">
                      {formatFixed(convertTestMark(t1Raw), 2)} / 10
                    </span>
                  </div>
                  <input
                    id="theory-t1"
                    type="number"
                    inputMode="decimal"
                    min={0}
                    max={30}
                    step="any"
                    placeholder="0"
                    value={theory.test1}
                    onChange={(e) => handleTheoryChange('test1', e.target.value)}
                    className="apple-input"
                  />
                  <span className="text-xs text-[var(--text-secondary)]">
                    Scaled: (marks / 30) × 10
                  </span>
                </div>

                {/* Test 2 */}
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <label htmlFor="theory-t2" className="apple-label">
                      Test 2 (Marks / 30)
                    </label>
                    <span className="text-xs font-semibold text-[var(--badge-text)] bg-[var(--badge-bg)] px-2.5 py-1 rounded-md tabular-nums">
                      {formatFixed(convertTestMark(t2Raw), 2)} / 10
                    </span>
                  </div>
                  <input
                    id="theory-t2"
                    type="number"
                    inputMode="decimal"
                    min={0}
                    max={30}
                    step="any"
                    placeholder="0"
                    value={theory.test2}
                    onChange={(e) => handleTheoryChange('test2', e.target.value)}
                    className="apple-input"
                  />
                  <span className="text-xs text-[var(--text-secondary)]">
                    Scaled: (marks / 30) × 10
                  </span>
                </div>

                {/* Test 3 */}
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <label htmlFor="theory-t3" className="apple-label">
                      Test 3 (Marks / 30)
                    </label>
                    <span className="text-xs font-semibold text-[var(--badge-text)] bg-[var(--badge-bg)] px-2.5 py-1 rounded-md tabular-nums">
                      {formatFixed(convertTestMark(t3Raw), 2)} / 10
                    </span>
                  </div>
                  <input
                    id="theory-t3"
                    type="number"
                    inputMode="decimal"
                    min={0}
                    max={30}
                    step="any"
                    placeholder="0"
                    value={theory.test3}
                    onChange={(e) => handleTheoryChange('test3', e.target.value)}
                    className="apple-input"
                  />
                  <span className="text-xs text-[var(--text-secondary)]">
                    Scaled: (marks / 30) × 10
                  </span>
                </div>

                {/* Attendance & Assignment */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                      <label htmlFor="theory-att" className="apple-label">
                        Attendance
                      </label>
                      <span className="text-xs font-semibold text-[var(--text-primary)]">
                        Marks / 5
                      </span>
                    </div>
                    <input
                      id="theory-att"
                      type="number"
                      inputMode="decimal"
                      min={0}
                      max={5}
                      step="any"
                      placeholder="0"
                      value={theory.attendance}
                      onChange={(e) => handleTheoryChange('attendance', e.target.value)}
                      className="apple-input"
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                      <label htmlFor="theory-asn" className="apple-label">
                        Assignment
                      </label>
                      <span className="text-xs font-semibold text-[var(--text-primary)]">
                        Marks / 5
                      </span>
                    </div>
                    <input
                      id="theory-asn"
                      type="number"
                      inputMode="decimal"
                      min={0}
                      max={5}
                      step="any"
                      placeholder="0"
                      value={theory.assignment}
                      onChange={(e) => handleTheoryChange('assignment', e.target.value)}
                      className="apple-input"
                    />
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between border-b border-[var(--border-primary)] pb-4">
                  <div>
                    <h2 className="text-[20px] font-semibold text-[var(--text-primary)] tracking-tight">
                      Integrated Internal
                    </h2>
                    <span className="text-xs text-[var(--text-secondary)]">
                      Assessment Components (Maximum 40 Marks)
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={loadIntegratedExample}
                      className="text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:underline"
                    >
                      Load Example
                    </button>
                    <span className="text-[var(--text-tertiary)] text-xs">•</span>
                    <button
                      type="button"
                      onClick={resetIntegrated}
                      className="text-xs font-semibold text-[var(--text-primary)] hover:underline"
                    >
                      Reset to 0
                    </button>
                  </div>
                </div>

                {/* Mid 1 */}
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <label htmlFor="int-m1" className="apple-label">
                      Mid 1 (Marks / 20)
                    </label>
                    <span className="text-xs font-semibold text-[var(--badge-text)] bg-[var(--badge-bg)] px-2.5 py-1 rounded-md tabular-nums">
                      Converted: {formatFixed(convertMidMark(m1Raw), 2)} / 5
                    </span>
                  </div>
                  <input
                    id="int-m1"
                    type="number"
                    inputMode="decimal"
                    min={0}
                    max={20}
                    step="any"
                    placeholder="0"
                    value={integrated.mid1}
                    onChange={(e) => handleIntegratedChange('mid1', e.target.value)}
                    className="apple-input"
                  />
                  <span className="text-xs text-[var(--text-secondary)]">
                    Scaled: (marks / 20) × 5
                  </span>
                </div>

                {/* Mid 2 */}
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <label htmlFor="int-m2" className="apple-label">
                      Mid 2 (Marks / 20)
                    </label>
                    <span className="text-xs font-semibold text-[var(--badge-text)] bg-[var(--badge-bg)] px-2.5 py-1 rounded-md tabular-nums">
                      Converted: {formatFixed(convertMidMark(m2Raw), 2)} / 5
                    </span>
                  </div>
                  <input
                    id="int-m2"
                    type="number"
                    inputMode="decimal"
                    min={0}
                    max={20}
                    step="any"
                    placeholder="0"
                    value={integrated.mid2}
                    onChange={(e) => handleIntegratedChange('mid2', e.target.value)}
                    className="apple-input"
                  />
                  <span className="text-xs text-[var(--text-secondary)]">
                    Scaled: (marks / 20) × 5
                  </span>
                </div>

                {/* Model / Lab */}
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <label htmlFor="int-lab" className="apple-label">
                      Model / Integrated Lab (Marks / 20)
                    </label>
                    <span className="text-xs font-semibold text-[var(--badge-text)] bg-[var(--badge-bg)] px-2.5 py-1 rounded-md tabular-nums">
                      Direct: {typeof integrated.lab === 'number' ? integrated.lab : 0} / 20
                    </span>
                  </div>
                  <input
                    id="int-lab"
                    type="number"
                    inputMode="decimal"
                    min={0}
                    max={20}
                    step="any"
                    placeholder="0"
                    value={integrated.lab}
                    onChange={(e) => handleIntegratedChange('lab', e.target.value)}
                    className="apple-input"
                  />
                  <span className="text-xs text-[var(--text-secondary)]">
                    Direct 20 marks allocated
                  </span>
                </div>

                {/* Attendance & Assignment */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                      <label htmlFor="int-att" className="apple-label">
                        Attendance
                      </label>
                      <span className="text-xs font-semibold text-[var(--text-primary)]">
                        Marks / 5
                      </span>
                    </div>
                    <input
                      id="int-att"
                      type="number"
                      inputMode="decimal"
                      min={0}
                      max={5}
                      step="any"
                      placeholder="0"
                      value={integrated.attendance}
                      onChange={(e) => handleIntegratedChange('attendance', e.target.value)}
                      className="apple-input"
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                      <label htmlFor="int-asn" className="apple-label">
                        Assignment
                      </label>
                      <span className="text-xs font-semibold text-[var(--text-primary)]">
                        Marks / 5
                      </span>
                    </div>
                    <input
                      id="int-asn"
                      type="number"
                      inputMode="decimal"
                      min={0}
                      max={5}
                      step="any"
                      placeholder="0"
                      value={integrated.assignment}
                      onChange={(e) => handleIntegratedChange('assignment', e.target.value)}
                      className="apple-input"
                    />
                  </div>
                </div>
              </>
            )}

            {/* Primary Calculate Button */}
            <div className="pt-2 border-t border-[var(--border-primary)]">
              <button
                type="button"
                className="apple-btn-primary w-full h-[52px]"
                onClick={() => {
                  const el = document.getElementById('internal-result-section');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                Calculate Internal Marks
              </button>
            </div>
          </div>
        </div>

        {/* Right Result Card: 5 cols (Sticky on desktop) */}
        <div id="internal-result-section" className="lg:col-span-5 lg:sticky lg:top-24">
          <div className="apple-result-card flex flex-col gap-6">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                YOUR INTERNAL
              </span>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-[44px] sm:text-[56px] font-bold tracking-tight text-[var(--text-primary)] tabular-nums leading-none">
                  {formatFixed(
                    activeTab === 'theory' ? theoryResult.totalInternal : integratedResult.totalInternal,
                    2
                  )}
                </span>
                <span className="text-xl font-semibold text-[var(--text-secondary)]">
                  / 40
                </span>
              </div>
              <div className="text-[17px] font-semibold text-[var(--text-primary)] mt-2 tabular-nums">
                {formatFixed(
                  activeTab === 'theory' ? theoryResult.percentage : integratedResult.percentage,
                  2
                )}%
              </div>
            </div>

            {/* Breakdown List */}
            <div className="border-t border-[var(--border-primary)] pt-4 flex flex-col divide-y divide-[var(--border-secondary)] text-sm">
              {activeTab === 'theory' ? (
                <>
                  <div className="flex justify-between py-2.5">
                    <span className="text-[var(--text-secondary)] font-medium">Test 1</span>
                    <span className="font-semibold text-[var(--text-primary)] tabular-nums">
                      {formatFixed(theoryResult.t1Converted, 2)} / 10
                    </span>
                  </div>
                  <div className="flex justify-between py-2.5">
                    <span className="text-[var(--text-secondary)] font-medium">Test 2</span>
                    <span className="font-semibold text-[var(--text-primary)] tabular-nums">
                      {formatFixed(theoryResult.t2Converted, 2)} / 10
                    </span>
                  </div>
                  <div className="flex justify-between py-2.5">
                    <span className="text-[var(--text-secondary)] font-medium">Test 3</span>
                    <span className="font-semibold text-[var(--text-primary)] tabular-nums">
                      {formatFixed(theoryResult.t3Converted, 2)} / 10
                    </span>
                  </div>
                  <div className="flex justify-between py-2.5">
                    <span className="text-[var(--text-secondary)] font-medium">Attendance</span>
                    <span className="font-semibold text-[var(--text-primary)] tabular-nums">
                      {theoryResult.attendance} / 5
                    </span>
                  </div>
                  <div className="flex justify-between py-2.5">
                    <span className="text-[var(--text-secondary)] font-medium">Assignment</span>
                    <span className="font-semibold text-[var(--text-primary)] tabular-nums">
                      {theoryResult.assignment} / 5
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between py-2.5">
                    <span className="text-[var(--text-secondary)] font-medium">Mid 1</span>
                    <span className="font-semibold text-[var(--text-primary)] tabular-nums">
                      {formatFixed(integratedResult.mid1Converted, 2)} / 5
                    </span>
                  </div>
                  <div className="flex justify-between py-2.5">
                    <span className="text-[var(--text-secondary)] font-medium">Mid 2</span>
                    <span className="font-semibold text-[var(--text-primary)] tabular-nums">
                      {formatFixed(integratedResult.mid2Converted, 2)} / 5
                    </span>
                  </div>
                  <div className="flex justify-between py-2.5">
                    <span className="text-[var(--text-secondary)] font-medium">Model / Lab</span>
                    <span className="font-semibold text-[var(--text-primary)] tabular-nums">
                      {integratedResult.lab} / 20
                    </span>
                  </div>
                  <div className="flex justify-between py-2.5">
                    <span className="text-[var(--text-secondary)] font-medium">Attendance</span>
                    <span className="font-semibold text-[var(--text-primary)] tabular-nums">
                      {integratedResult.attendance} / 5
                    </span>
                  </div>
                  <div className="flex justify-between py-2.5">
                    <span className="text-[var(--text-secondary)] font-medium">Assignment</span>
                    <span className="font-semibold text-[var(--text-primary)] tabular-nums">
                      {integratedResult.assignment} / 5
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Formula box */}
            <div className="rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-primary)] p-4 text-xs text-[var(--text-primary)] font-mono leading-relaxed">
              {activeTab === 'theory' ? (
                <div>
                  <strong className="block mb-1 text-[13px] text-[var(--text-primary)]">Theory Formula:</strong>
                  <div>T1 (/30×10) + T2 (/30×10) + T3 (/30×10) + Att (5) + Assn (5) = Max 40</div>
                </div>
              ) : (
                <div>
                  <strong className="block mb-1 text-[13px] text-[var(--text-primary)]">Integrated Formula:</strong>
                  <div>Mid1 (/20×5) + Mid2 (/20×5) + Lab (20) + Att (5) + Assn (5) = Max 40</div>
                </div>
              )}
            </div>

            {/* Print / Save PDF Action Button */}
            <div className="pt-2">
              <PrintButton />
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* Dedicated A4 Print Report */}
    <AcademicPrintReport
      reportTitle="Internal Marks Report"
      calculatorName="Internal Marks Calculator"
      calculationType={activeTab === 'theory' ? 'Theory Internal' : 'Integrated Internal'}
      resultLabel="TOTAL INTERNAL MARKS"
      resultValue={`${formatFixed(
        activeTab === 'theory' ? theoryResult.totalInternal : integratedResult.totalInternal,
        2
      )} / 40`}
      resultSubtext={`${formatFixed(
        activeTab === 'theory' ? theoryResult.percentage : integratedResult.percentage,
        2
      )}% Assessment Percentage`}
      formulaTitle={activeTab === 'theory' ? 'Theory Internal Formula' : 'Integrated Internal Formula'}
      formulaRule={
        activeTab === 'theory'
          ? 'T1 (/30 × 10) + T2 (/30 × 10) + T3 (/30 × 10) + Attendance (5) + Assignment (5) = Max 40'
          : 'Mid 1 (/20 × 5) + Mid 2 (/20 × 5) + Model Lab (20) + Attendance (5) + Assignment (5) = Max 40'
      }
      formulaCalculation={
        activeTab === 'theory'
          ? `${formatFixed(theoryResult.t1Converted, 2)} + ${formatFixed(theoryResult.t2Converted, 2)} + ${formatFixed(theoryResult.t3Converted, 2)} + ${theoryResult.attendance} + ${theoryResult.assignment} = ${formatFixed(theoryResult.totalInternal, 2)} / 40`
          : `${formatFixed(integratedResult.mid1Converted, 2)} + ${formatFixed(integratedResult.mid2Converted, 2)} + ${integratedResult.lab} + ${integratedResult.attendance} + ${integratedResult.assignment} = ${formatFixed(integratedResult.totalInternal, 2)} / 40`
      }
    >
      <table className="w-full text-left border-collapse border border-[#D2D2D7]">
        <thead>
          <tr className="bg-[#F5F5F7] border-b-2 border-[#D2D2D7]">
            <th className="py-2.5 px-3 text-[12px] font-bold text-[#1D1D1F] uppercase">Assessment Component</th>
            <th className="py-2.5 px-3 text-[12px] font-bold text-[#1D1D1F] uppercase text-center">Raw / Input Marks</th>
            <th className="py-2.5 px-3 text-[12px] font-bold text-[#1D1D1F] uppercase text-right">Scaled / Awarded Marks</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#E5E5EA] text-[13px]">
          {activeTab === 'theory' ? (
            <>
              <tr>
                <td className="py-2.5 px-3 font-medium text-[#1D1D1F]">Test 1 (Internal Exam 1)</td>
                <td className="py-2.5 px-3 text-center text-[#6E6E73] tabular-nums font-mono">{t1Raw} / 30</td>
                <td className="py-2.5 px-3 text-right font-semibold text-[#1D1D1F] tabular-nums font-mono">{formatFixed(theoryResult.t1Converted, 2)} / 10</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-medium text-[#1D1D1F]">Test 2 (Internal Exam 2)</td>
                <td className="py-2.5 px-3 text-center text-[#6E6E73] tabular-nums font-mono">{t2Raw} / 30</td>
                <td className="py-2.5 px-3 text-right font-semibold text-[#1D1D1F] tabular-nums font-mono">{formatFixed(theoryResult.t2Converted, 2)} / 10</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-medium text-[#1D1D1F]">Test 3 (Internal Exam 3)</td>
                <td className="py-2.5 px-3 text-center text-[#6E6E73] tabular-nums font-mono">{t3Raw} / 30</td>
                <td className="py-2.5 px-3 text-right font-semibold text-[#1D1D1F] tabular-nums font-mono">{formatFixed(theoryResult.t3Converted, 2)} / 10</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-medium text-[#1D1D1F]">Attendance</td>
                <td className="py-2.5 px-3 text-center text-[#6E6E73] tabular-nums font-mono">{theoryResult.attendance} / 5</td>
                <td className="py-2.5 px-3 text-right font-semibold text-[#1D1D1F] tabular-nums font-mono">{theoryResult.attendance} / 5</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-medium text-[#1D1D1F]">Assignment / Continuous Evaluation</td>
                <td className="py-2.5 px-3 text-center text-[#6E6E73] tabular-nums font-mono">{theoryResult.assignment} / 5</td>
                <td className="py-2.5 px-3 text-right font-semibold text-[#1D1D1F] tabular-nums font-mono">{theoryResult.assignment} / 5</td>
              </tr>
            </>
          ) : (
            <>
              <tr>
                <td className="py-2.5 px-3 font-medium text-[#1D1D1F]">Mid Term Exam 1</td>
                <td className="py-2.5 px-3 text-center text-[#6E6E73] tabular-nums font-mono">{m1Raw} / 20</td>
                <td className="py-2.5 px-3 text-right font-semibold text-[#1D1D1F] tabular-nums font-mono">{formatFixed(integratedResult.mid1Converted, 2)} / 5</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-medium text-[#1D1D1F]">Mid Term Exam 2</td>
                <td className="py-2.5 px-3 text-center text-[#6E6E73] tabular-nums font-mono">{m2Raw} / 20</td>
                <td className="py-2.5 px-3 text-right font-semibold text-[#1D1D1F] tabular-nums font-mono">{formatFixed(integratedResult.mid2Converted, 2)} / 5</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-medium text-[#1D1D1F]">Model Lab / Integrated Practical</td>
                <td className="py-2.5 px-3 text-center text-[#6E6E73] tabular-nums font-mono">{integratedResult.lab} / 20</td>
                <td className="py-2.5 px-3 text-right font-semibold text-[#1D1D1F] tabular-nums font-mono">{integratedResult.lab} / 20</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-medium text-[#1D1D1F]">Attendance</td>
                <td className="py-2.5 px-3 text-center text-[#6E6E73] tabular-nums font-mono">{integratedResult.attendance} / 5</td>
                <td className="py-2.5 px-3 text-right font-semibold text-[#1D1D1F] tabular-nums font-mono">{integratedResult.attendance} / 5</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-medium text-[#1D1D1F]">Assignment / Continuous Evaluation</td>
                <td className="py-2.5 px-3 text-center text-[#6E6E73] tabular-nums font-mono">{integratedResult.assignment} / 5</td>
                <td className="py-2.5 px-3 text-right font-semibold text-[#1D1D1F] tabular-nums font-mono">{integratedResult.assignment} / 5</td>
              </tr>
            </>
          )}
        </tbody>
        <tfoot>
          <tr className="bg-[#FAFAFA] font-bold border-t-2 border-[#D2D2D7]">
            <td className="py-3 px-3 text-[#1D1D1F]">TOTAL CALCULATED INTERNAL</td>
            <td className="py-3 px-3 text-center text-[#6E6E73]">—</td>
            <td className="py-3 px-3 text-right text-[15px] text-[#1D1D1F] tabular-nums font-mono">
              {formatFixed(
                activeTab === 'theory' ? theoryResult.totalInternal : integratedResult.totalInternal,
                2
              )} / 40
            </td>
          </tr>
        </tfoot>
      </table>
    </AcademicPrintReport>
    </>
  );
};

