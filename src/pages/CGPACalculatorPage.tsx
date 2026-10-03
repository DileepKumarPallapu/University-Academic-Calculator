import React, { useState, useRef } from 'react';
import { Plus, Trash2, RotateCcw } from 'lucide-react';
import { calculateCGPA, formatFixed } from '../utils/calculations';
import { REGULATIONS, type RegulationId } from '../config/university';
import type { SemesterItem } from '../types';
import { PrintButton } from '../components/common/PrintButton';
import { AcademicPrintReport } from '../components/common/AcademicPrintReport';
import { useStudentProfile } from '../hooks/useStudentProfile';
import { StudentNameInput } from '../components/common/StudentNameInput';
import { GradeScaleModal } from '../components/common/GradeScaleModal';
import { ResultActionButtons } from '../components/common/ResultActionButtons';
import { ResetConfirmModal } from '../components/common/ResetConfirmModal';
import { saveRecentCalculation } from '../utils/recentCalculations';

export const CGPACalculatorPage: React.FC = () => {
  const { profile, studentName, setStudentName, updateProfile, nameError, setNameError } = useStudentProfile();
  const studentNameInputRef = useRef<HTMLInputElement>(null);
  const [isGradeScaleOpen, setIsGradeScaleOpen] = useState(false);

  // Regulation selection with localStorage persistence
  const [regulation, setRegulation] = useState<RegulationId>(() => {
    try {
      const saved = localStorage.getItem('academic_selected_regulation') as RegulationId;
      return saved && REGULATIONS[saved] ? saved : 'VTR21';
    } catch {
      return 'VTR21';
    }
  });

  const [semestersCountInput, setSemestersCountInput] = useState<number>(5);
  // Default all semesters to 0
  const [semesters, setSemesters] = useState<SemesterItem[]>([
    { id: 'sem-1', semesterNumber: 1, gpa: 0, credits: 0 },
    { id: 'sem-2', semesterNumber: 2, gpa: 0, credits: 0 },
    { id: 'sem-3', semesterNumber: 3, gpa: 0, credits: 0 },
    { id: 'sem-4', semesterNumber: 4, gpa: 0, credits: 0 },
    { id: 'sem-5', semesterNumber: 5, gpa: 0, credits: 0 },
  ]);

  const handleRegulationChange = (newReg: RegulationId) => {
    setRegulation(newReg);
    try {
      localStorage.setItem('academic_selected_regulation', newReg);
    } catch {
      // ignore
    }
  };

  const handleGenerateSemesters = (e: React.FormEvent) => {
    e.preventDefault();
    const count = Math.max(1, Math.min(16, semestersCountInput || 1));
    const newSemesters: SemesterItem[] = [];
    for (let i = 1; i <= count; i++) {
      newSemesters.push({
        id: `gen-sem-${i}-${Date.now()}`,
        semesterNumber: i,
        gpa: 0,
        credits: 0,
      });
    }
    setSemesters(newSemesters);
  };

  const handleSemesterChange = (id: string, field: 'gpa' | 'credits', value: string) => {
    setSemesters((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        if (value === '') {
          return { ...s, [field]: '' };
        }
        const num = parseFloat(value);
        if (isNaN(num)) return s;
        const bounded = field === 'gpa' ? Math.max(0, Math.min(10, num)) : Math.max(0, Math.min(50, num));
        return { ...s, [field]: bounded };
      })
    );
  };

  const handleAddSemester = () => {
    const nextNum = semesters.length + 1;
    setSemesters((prev) => [
      ...prev,
      {
        id: `sem-${Date.now()}`,
        semesterNumber: nextNum,
        gpa: 0,
        credits: 0,
      },
    ]);
  };

  const handleRemoveSemester = (id: string) => {
    if (semesters.length <= 1) return;
    setSemesters((prev) => prev.filter((s) => s.id !== id));
  };

  const [showResetModal, setShowResetModal] = useState(false);
  const isDirty = semesters.some((s) => Number(s.gpa) > 0 || Number(s.credits) > 0) || semesters.length !== 5;

  const handleReset = () => {
    setSemesters([
      { id: 'sem-1', semesterNumber: 1, gpa: 0, credits: 0 },
      { id: 'sem-2', semesterNumber: 2, gpa: 0, credits: 0 },
      { id: 'sem-3', semesterNumber: 3, gpa: 0, credits: 0 },
      { id: 'sem-4', semesterNumber: 4, gpa: 0, credits: 0 },
      { id: 'sem-5', semesterNumber: 5, gpa: 0, credits: 0 },
    ]);
    setShowResetModal(false);
  };

  const handleResetClick = () => {
    if (isDirty) {
      setShowResetModal(true);
    } else {
      handleReset();
    }
  };

  const cgpaResult = calculateCGPA(semesters);
  const totalQualityPoints = semesters.reduce(
    (sum, s) => sum + (Number(s.gpa) || 0) * (Number(s.credits) || 0),
    0
  );

  return (
    <>
      <div className="apple-page-enter flex flex-col gap-8 max-w-[1200px] mx-auto print:hidden">
        {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-[32px] sm:text-[40px] font-semibold tracking-tight text-[var(--text-primary)]">
          CGPA Calculator
        </h1>
        <p className="text-[17px] text-[var(--text-secondary)]">
          Calculate your Cumulative Grade Point Average across all completed semesters with exact credit weighting.
        </p>
      </div>

      {/* Student Name Input */}
      <StudentNameInput
        value={studentName}
        onChange={setStudentName}
        errorMessage={nameError}
        inputRef={studentNameInputRef}
        profile={profile}
        onProfileChange={updateProfile}
      />

      {/* Regulation Selection Card */}
      <div className="apple-main-container p-6 sm:p-7 flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <span className="apple-label text-base">Choose your regulation</span>
          <button
            type="button"
            onClick={() => setIsGradeScaleOpen(true)}
            className="text-xs font-semibold text-[var(--accent)] hover:underline flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
          >
            <span>View Grade Scale & Regulations</span>
            <span aria-hidden="true">→</span>
          </button>
        </div>
        <div className="flex flex-wrap gap-2.5">
          {(['VTR15', 'VTR18', 'VTR21', 'VTR25'] as RegulationId[]).map((regId) => (
            <button
              key={regId}
              type="button"
              onClick={() => handleRegulationChange(regId)}
              className={`h-11 px-5 rounded-xl text-sm font-semibold border transition-all ${
                regulation === regId
                  ? 'bg-[var(--button-primary)] text-[var(--button-primary-text)] border-transparent shadow-sm'
                  : 'bg-[var(--surface)] text-[var(--text-primary)] border-[var(--border-primary)] hover:bg-[var(--bg-tertiary)]'
              }`}
            >
              {regId}
            </button>
          ))}
        </div>
        <div className="pt-2 border-t border-[var(--border-secondary)] text-xs text-[var(--text-secondary)] flex flex-wrap items-center justify-between gap-2">
          <div>
            Selected: <strong className="text-[var(--text-primary)]">{regulation}</strong> ({REGULATIONS[regulation].description})
          </div>
          <button
            type="button"
            onClick={() => setIsGradeScaleOpen(true)}
            className="font-medium text-[var(--accent)] hover:underline"
          >
            View scale details
          </button>
        </div>
      </div>

      {/* Main Content Layout: Grid of Semesters LEFT (7 cols), Result RIGHT (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Semesters Form */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          <div className="apple-main-container p-6 sm:p-8 flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border-primary)] pb-5">
              <span className="text-sm font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                Semesters List ({semesters.length})
              </span>

              {/* Number of Semesters Generator */}
              <form onSubmit={handleGenerateSemesters} className="flex items-center gap-2">
                <label htmlFor="num-semesters" className="text-xs font-medium text-[var(--text-secondary)] whitespace-nowrap">
                  Semesters:
                </label>
                <input
                  id="num-semesters"
                  type="number"
                  inputMode="decimal"
                  min={1}
                  max={16}
                  value={semestersCountInput}
                  onChange={(e) => setSemestersCountInput(parseInt(e.target.value) || 0)}
                  className="apple-input w-16 text-center text-sm h-10"
                />
                <button type="submit" className="apple-btn-secondary text-xs h-10 px-3 whitespace-nowrap">
                  Generate
                </button>
              </form>
            </div>

            {/* Desktop / Tablet Table */}
            <div className="hidden md:block overflow-x-auto rounded-xl border border-[var(--border-primary)]">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-[var(--bg-primary)] border-b border-[var(--border-primary)]">
                    <th className="py-3.5 px-4 font-semibold text-[14px] text-[var(--text-primary)]">
                      Semester
                    </th>
                    <th className="py-3.5 px-3 font-semibold text-[14px] text-[var(--text-primary)] text-center w-[140px] min-w-[120px]">
                      Semester SGPA
                    </th>
                    <th className="py-3.5 px-3 font-semibold text-[14px] text-[var(--text-primary)] text-center w-[130px] min-w-[110px]">
                      Total Credits
                    </th>
                    <th className="py-3.5 px-4 font-semibold text-[14px] text-[var(--text-primary)] text-right w-[150px] min-w-[130px]">
                      SGPA × Credits
                    </th>
                    <th className="py-3.5 px-3 text-center w-[80px]"></th>
                  </tr>
                </thead>
                <tbody>
                  {semesters.map((s) => {
                    const g = typeof s.gpa === 'number' ? s.gpa : (parseFloat(s.gpa as string) || 0);
                    const c = typeof s.credits === 'number' ? s.credits : (parseFloat(s.credits as string) || 0);
                    return (
                      <tr key={s.id} className="bg-[var(--surface)] border-b border-[var(--border-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors">
                        <td className="py-3.5 px-4 font-semibold text-[15px] text-[var(--text-primary)]">
                          Semester {s.semesterNumber}
                        </td>
                        <td className="py-3 px-3 text-center w-[140px] min-w-[120px]">
                          <input
                            type="number"
                            inputMode="decimal"
                            min={0}
                            max={10}
                            step="0.01"
                            placeholder="0"
                            value={s.gpa}
                            onChange={(e) => handleSemesterChange(s.id, 'gpa', e.target.value)}
                            className="h-[48px] w-full max-w-[100px] mx-auto rounded-[10px] bg-[var(--surface)] text-[var(--text-primary)] border border-[var(--input-border)] text-center text-[16px] font-semibold placeholder:text-[var(--text-tertiary)] outline-none focus:border-2 focus:border-[var(--text-primary)] focus:ring-2 focus:ring-black/10 dark:focus:ring-white/10 transition-all shadow-sm"
                          />
                        </td>
                        <td className="py-3 px-3 text-center w-[130px] min-w-[110px]">
                          <input
                            type="number"
                            inputMode="decimal"
                            min={0}
                            max={50}
                            step="any"
                            placeholder="0"
                            value={s.credits}
                            onChange={(e) => handleSemesterChange(s.id, 'credits', e.target.value)}
                            className="h-[48px] w-full max-w-[90px] mx-auto rounded-[10px] bg-[var(--surface)] text-[var(--text-primary)] border border-[var(--input-border)] text-center text-[16px] font-medium placeholder:text-[var(--text-tertiary)] outline-none focus:border-2 focus:border-[var(--text-primary)] focus:ring-2 focus:ring-black/10 dark:focus:ring-white/10 transition-all shadow-sm"
                          />
                        </td>
                        <td className="py-3.5 px-4 text-right font-semibold text-[16px] text-[var(--text-primary)] tabular-nums w-[150px] min-w-[130px]">
                          {(g * c).toFixed(1)}
                        </td>
                        <td className="py-3.5 px-3 text-center w-[80px]">
                          {semesters.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveSemester(s.id)}
                              className="text-[var(--text-tertiary)] hover:text-[var(--danger)] transition-colors p-2 rounded-lg hover:bg-[var(--bg-primary)]"
                              aria-label={`Remove semester ${s.semesterNumber}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Stacked Cards */}
            <div className="md:hidden flex flex-col gap-3">
              {semesters.map((s) => {
                const g = typeof s.gpa === 'number' ? s.gpa : (parseFloat(s.gpa as string) || 0);
                const c = typeof s.credits === 'number' ? s.credits : (parseFloat(s.credits as string) || 0);
                return (
                  <div
                    key={s.id}
                    className="p-5 rounded-xl bg-[var(--surface)] border border-[var(--border-primary)] flex flex-col gap-4 shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-[var(--text-primary)]">
                        Semester {s.semesterNumber}
                      </span>
                      {semesters.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveSemester(s.id)}
                          className="text-[var(--text-tertiary)] hover:text-[var(--danger)] p-1.5"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3 items-center">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-[var(--text-primary)]">
                          Semester SGPA
                        </label>
                        <input
                          type="number"
                          inputMode="decimal"
                          min={0}
                          max={10}
                          step="0.01"
                          placeholder="0"
                          value={s.gpa}
                          onChange={(e) => handleSemesterChange(s.id, 'gpa', e.target.value)}
                          className="h-[48px] rounded-[10px] bg-[var(--surface)] text-[var(--text-primary)] border border-[var(--input-border)] text-center text-[16px] font-semibold outline-none focus:border-2 focus:border-[var(--text-primary)] shadow-sm"
                        />
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-[var(--text-primary)]">
                          Credits
                        </label>
                        <input
                          type="number"
                          inputMode="decimal"
                          min={0}
                          max={50}
                          placeholder="0"
                          value={s.credits}
                          onChange={(e) => handleSemesterChange(s.id, 'credits', e.target.value)}
                          className="h-[48px] rounded-[10px] bg-[var(--surface)] text-[var(--text-primary)] border border-[var(--input-border)] text-center text-[16px] font-medium outline-none focus:border-2 focus:border-[var(--text-primary)] shadow-sm"
                        />
                      </div>
                    </div>

                    <div className="pt-3 border-t border-[var(--border-secondary)] flex justify-between items-center text-sm font-semibold">
                      <span className="text-[var(--text-secondary)] font-medium">
                        Points Contribution
                      </span>
                      <span className="text-[var(--text-primary)]">
                        {(g * c).toFixed(1)} pts
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Action Buttons: Add Semester, Reset & Calculate CGPA */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-[var(--border-primary)]">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleAddSemester}
                  className="apple-btn-secondary flex-1 sm:flex-initial h-[52px] text-[15px] font-semibold gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Semester</span>
                </button>
                <button
                  type="button"
                  onClick={handleResetClick}
                  className="apple-btn-secondary h-[52px] px-4 text-[14px] font-semibold gap-1.5 text-[var(--text-secondary)] hover:text-rose-600"
                  title="Reset calculation"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Reset</span>
                </button>
              </div>
              <button
                type="button"
                onClick={() => {
                  saveRecentCalculation({
                    type: 'cgpa',
                    title: `CGPA (${semesters.length} Semesters, ${regulation})`,
                    value: `${formatFixed(cgpaResult.cgpa, 2)} / 10`,
                    subtext: `${cgpaResult.totalCredits} Total Credits`,
                    route: '/cgpa',
                  });
                  if (window.innerWidth < 1024) {
                    const el = document.getElementById('cgpa-result-section');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
                className="apple-btn-primary w-full sm:flex-1 h-[52px] text-[17px] font-semibold"
              >
                Calculate CGPA
              </button>
            </div>
          </div>
        </div>

        {/* Right Result Card (Sticky on desktop) */}
        <div id="cgpa-result-section" className="lg:col-span-5 lg:sticky lg:top-24">
          <div className="apple-result-card flex flex-col gap-6">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                YOUR CGPA
              </span>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-[44px] sm:text-[56px] font-bold tracking-tight text-[var(--text-primary)] tabular-nums leading-none">
                  {formatFixed(cgpaResult.cgpa, 2)}
                </span>
                <span className="text-xl font-semibold text-[var(--text-secondary)]">
                  / 10
                </span>
              </div>
              <p className="text-sm font-medium text-[var(--text-secondary)] mt-2">
                Cumulative Grade Point Average ({regulation})
              </p>
            </div>

            {/* Total Credits & Quality Points */}
            <div className="grid grid-cols-2 gap-4 border-t border-[var(--border-primary)] pt-4">
              <div>
                <span className="text-xs text-[var(--text-secondary)] font-medium">
                  Total Credits
                </span>
                <div className="text-[20px] sm:text-2xl font-semibold text-[var(--text-primary)] mt-1 tabular-nums">
                  {cgpaResult.totalCredits}
                </div>
              </div>
              <div>
                <span className="text-xs text-[var(--text-secondary)] font-medium">
                  Semesters
                </span>
                <div className="text-[20px] sm:text-2xl font-semibold text-[var(--text-primary)] mt-1 tabular-nums">
                  {semesters.length}
                </div>
              </div>
            </div>

            {/* Formula box */}
            <div className="rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-primary)] p-4 text-xs text-[var(--text-primary)] font-mono leading-relaxed">
              <strong className="block mb-1 text-[13px] text-[var(--text-primary)]">How CGPA is Calculated:</strong>
              <div>• CGPA = Σ (SGPA × Semester Credits) ÷ Σ (Semester Credits)</div>
              <div className="mt-1 font-semibold">
                {formatFixed(totalQualityPoints, 2)} ÷ {cgpaResult.totalCredits || 0} = {formatFixed(cgpaResult.cgpa, 2)}
              </div>
            </div>

            {/* Result Action Buttons: Copy & Share */}
            <div className="pt-2">
              <ResultActionButtons
                title={`CGPA Summary (${regulation})`}
                studentName={studentName}
                items={[
                  { label: 'Regulation', value: regulation },
                  { label: 'Completed Semesters', value: `${semesters.length}` },
                  { label: 'Total Credits', value: `${cgpaResult.totalCredits}` },
                  { label: 'Total Weighted Points', value: formatFixed(totalQualityPoints, 2) },
                ]}
                resultLabel="CGPA"
                resultValue={`${formatFixed(cgpaResult.cgpa, 2)} / 10`}
              />
            </div>

            {/* Print / Save PDF Action Button */}
            <div className="pt-2">
              <PrintButton
                studentName={studentName}
                calculatorType="CGPA"
                onValidationError={setNameError}
                inputRef={studentNameInputRef}
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* Dedicated A4 Print Report */}
    <AcademicPrintReport
      reportTitle="CGPA Report"
      calculatorName="CGPA Calculator"
      reportType="CGPA"
      studentName={studentName}
      profile={profile}
      regulation={regulation}
      resultLabel="CUMULATIVE GRADE POINT AVERAGE (CGPA)"
      resultValue={`${formatFixed(cgpaResult.cgpa, 2)} / 10`}
      resultSubtext={`Total Credits: ${cgpaResult.totalCredits} • Total Weighted Quality Points: ${formatFixed(totalQualityPoints, 2)}`}
      formulaTitle="CGPA Calculation Summary"
      formulaRule="CGPA Formula: Σ (SGPA × Semester Credits) ÷ Σ (Semester Credits)"
      formulaCalculation={`${formatFixed(totalQualityPoints, 2)} ÷ ${cgpaResult.totalCredits || 0} = ${formatFixed(cgpaResult.cgpa, 2)}`}
      isEmpty={cgpaResult.totalCredits === 0}
      emptyNotice="Please enter semester SGPA and credits to calculate your CGPA before printing."
    >
      <table className="w-full text-left border-collapse border border-[#D2D2D7]">
        <thead>
          <tr className="bg-[#F5F5F7] border-b-2 border-[#D2D2D7]">
            <th className="py-2.5 px-3 text-[12px] font-bold text-[#1D1D1F] uppercase">Semester</th>
            <th className="py-2.5 px-3 text-[12px] font-bold text-[#1D1D1F] uppercase text-center w-[120px]">SGPA</th>
            <th className="py-2.5 px-3 text-[12px] font-bold text-[#1D1D1F] uppercase text-center w-[120px]">Credits</th>
            <th className="py-2.5 px-3 text-[12px] font-bold text-[#1D1D1F] uppercase text-right w-[160px]">Weighted Points</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#E5E5EA] text-[13px]">
          {semesters.map((s) => {
            const g = Number(s.gpa) || 0;
            const c = Number(s.credits) || 0;
            const weighted = g * c;
            return (
              <tr key={s.id}>
                <td className="py-2.5 px-3 font-medium text-[#1D1D1F]">
                  Semester {s.semesterNumber}
                </td>
                <td className="py-2.5 px-3 text-center font-semibold text-[#1D1D1F] tabular-nums font-mono">
                  {formatFixed(g, 2)}
                </td>
                <td className="py-2.5 px-3 text-center font-semibold text-[#1D1D1F] tabular-nums font-mono">
                  {c}
                </td>
                <td className="py-2.5 px-3 text-right font-semibold text-[#1D1D1F] tabular-nums font-mono">
                  {weighted.toFixed(2)}
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="bg-[#FAFAFA] font-bold border-t-2 border-[#D2D2D7]">
            <td className="py-3 px-3 text-[#1D1D1F]">TOTALS</td>
            <td className="py-3 px-3 text-center text-[#6E6E73]">—</td>
            <td className="py-3 px-3 text-center text-[14px] text-[#1D1D1F] tabular-nums font-mono">
              {cgpaResult.totalCredits}
            </td>
            <td className="py-3 px-3 text-right text-[14px] text-[#1D1D1F] tabular-nums font-mono">
              {formatFixed(totalQualityPoints, 2)}
            </td>
          </tr>
        </tfoot>
      </table>
    </AcademicPrintReport>

    {/* Grade Scale Modal */}
    <GradeScaleModal
      isOpen={isGradeScaleOpen}
      onClose={() => setIsGradeScaleOpen(false)}
      regulation={regulation}
    />

    {/* Reset Confirmation Modal */}
    <ResetConfirmModal
      isOpen={showResetModal}
      onClose={() => setShowResetModal(false)}
      onConfirm={handleReset}
      title="Reset CGPA calculation?"
      description="Are you sure you want to reset all semester grades and credits to 0? This action cannot be undone."
    />
    </>
  );
};
