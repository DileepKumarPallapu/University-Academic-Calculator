import React, { useState, useRef } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { calculateGPA, formatFixed } from '../utils/calculations';
import { REGULATIONS, type RegulationId } from '../config/university';
import type { SubjectItem } from '../types';
import { PrintButton } from '../components/common/PrintButton';
import { AcademicPrintReport } from '../components/common/AcademicPrintReport';
import { useStudentName } from '../hooks/useStudentName';
import { StudentNameInput } from '../components/common/StudentNameInput';

export const GPACalculatorPage: React.FC = () => {
  const { studentName, setStudentName, nameError, setNameError } = useStudentName();
  const studentNameInputRef = useRef<HTMLInputElement>(null);

  // Regulation selection with localStorage persistence
  const [regulation, setRegulation] = useState<RegulationId>(() => {
    try {
      const saved = localStorage.getItem('academic_selected_regulation') as RegulationId;
      return saved && REGULATIONS[saved] ? saved : 'VTR21';
    } catch {
      return 'VTR21';
    }
  });

  const [selectedSemester, setSelectedSemester] = useState<number>(5);
  const [subjectCountInput, setSubjectCountInput] = useState<number>(6);

  const regConfig = REGULATIONS[regulation];
  const gradeOptions = regConfig.grades;

  // Subjects state defaulted to 0 credits
  const [subjects, setSubjects] = useState<SubjectItem[]>(() => {
    const defaultGrade = REGULATIONS.VTR21.grades[0];
    return [
      { id: 'sub-1', name: 'Subject 1', credits: 0, grade: defaultGrade.grade, gradePoint: defaultGrade.points },
      { id: 'sub-2', name: 'Subject 2', credits: 0, grade: defaultGrade.grade, gradePoint: defaultGrade.points },
      { id: 'sub-3', name: 'Subject 3', credits: 0, grade: defaultGrade.grade, gradePoint: defaultGrade.points },
      { id: 'sub-4', name: 'Subject 4', credits: 0, grade: defaultGrade.grade, gradePoint: defaultGrade.points },
      { id: 'sub-5', name: 'Subject 5', credits: 0, grade: defaultGrade.grade, gradePoint: defaultGrade.points },
      { id: 'sub-6', name: 'Subject 6', credits: 0, grade: defaultGrade.grade, gradePoint: defaultGrade.points },
    ];
  });

  // Handle regulation change
  const handleRegulationChange = (newReg: RegulationId) => {
    setRegulation(newReg);
    try {
      localStorage.setItem('academic_selected_regulation', newReg);
    } catch {
      // ignore
    }

    const newOptions = REGULATIONS[newReg].grades;
    const defaultOption = newOptions[0];

    // Remap existing subjects to matching grade in new regulation, or default
    setSubjects((prev) =>
      prev.map((s) => {
        const found = newOptions.find((g) => g.grade === s.grade);
        if (found) {
          return { ...s, gradePoint: found.points };
        }
        return { ...s, grade: defaultOption.grade, gradePoint: defaultOption.points };
      })
    );
  };

  const handleGenerateSubjects = (e: React.FormEvent) => {
    e.preventDefault();
    const count = Math.max(1, Math.min(20, subjectCountInput || 1));
    const defaultGrade = gradeOptions[0];
    const newSubjects: SubjectItem[] = [];
    for (let i = 1; i <= count; i++) {
      newSubjects.push({
        id: `gen-sub-${i}-${Date.now()}`,
        name: `Subject ${i}`,
        credits: 0,
        grade: defaultGrade.grade,
        gradePoint: defaultGrade.points,
      });
    }
    setSubjects(newSubjects);
  };

  const handleSubjectChange = (id: string, field: 'name' | 'credits' | 'grade', value: any) => {
    setSubjects((prev) =>
      prev.map((sub) => {
        if (sub.id !== id) return sub;
        if (field === 'credits') {
          const val = value === '' ? '' : (parseFloat(value) || 0);
          return { ...sub, credits: val as any };
        }
        if (field === 'grade') {
          const opt = gradeOptions.find((g) => g.grade === value) || gradeOptions[0];
          return { ...sub, grade: value, gradePoint: opt.points };
        }
        return { ...sub, [field]: value };
      })
    );
  };

  const handleAddSubject = () => {
    const nextNum = subjects.length + 1;
    const defaultGrade = gradeOptions[0];
    setSubjects((prev) => [
      ...prev,
      {
        id: `sub-${Date.now()}`,
        name: `Subject ${nextNum}`,
        credits: 0,
        grade: defaultGrade.grade,
        gradePoint: defaultGrade.points,
      },
    ]);
  };

  const handleRemoveSubject = (id: string) => {
    if (subjects.length <= 1) return;
    setSubjects((prev) => prev.filter((s) => s.id !== id));
  };

  const gpaResult = calculateGPA(subjects);
  const totalQualityPoints = subjects.reduce(
    (sum, s) => sum + (Number(s.credits) || 0) * (s.gradePoint ?? 0),
    0
  );

  return (
    <>
      <div className="apple-page-enter flex flex-col gap-8 max-w-[1200px] mx-auto print:hidden">
        {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-[32px] sm:text-[40px] font-semibold tracking-tight text-[var(--text-primary)]">
          SGPA Calculator
        </h1>
        <p className="text-[17px] text-[var(--text-secondary)]">
          Calculate your semester Grade Point Average based on course credits and regulation grades.
        </p>
      </div>

      {/* Student Name Input */}
      <StudentNameInput
        value={studentName}
        onChange={setStudentName}
        errorMessage={nameError}
        inputRef={studentNameInputRef}
      />

      {/* Regulation Selection Card */}
      <div className="apple-main-container p-6 sm:p-7 flex flex-col gap-4">
        <span className="apple-label text-base">Choose your regulation</span>
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

        <div className="pt-2 border-t border-[var(--border-secondary)] text-xs text-[var(--text-secondary)] flex flex-wrap items-center gap-2">
          <span className="font-semibold text-[var(--text-primary)]">
            Regulation: {regulation}
          </span>
          <span>•</span>
          <span>Grade scale loaded for {regulation} ({regConfig.years})</span>
        </div>
      </div>

      {/* Main Content Layout: Grid of Subjects LEFT (7 cols), Result RIGHT (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Subjects Section */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          <div className="apple-main-container p-6 sm:p-8 flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border-primary)] pb-5">
              <div className="flex items-center gap-3">
                <label htmlFor="semester-select" className="text-sm font-semibold text-[var(--text-primary)]">
                  Semester:
                </label>
                <select
                  id="semester-select"
                  value={selectedSemester}
                  onChange={(e) => setSelectedSemester(parseInt(e.target.value) || 1)}
                  className="apple-input h-10 w-36 text-sm py-0 cursor-pointer font-medium"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                    <option key={s} value={s}>
                      Semester {s}
                    </option>
                  ))}
                </select>
              </div>

              {/* Number of Subjects Generator */}
              <form onSubmit={handleGenerateSubjects} className="flex items-center gap-2">
                <label htmlFor="num-subjects" className="text-xs font-medium text-[var(--text-secondary)] whitespace-nowrap">
                  Subjects:
                </label>
                <input
                  id="num-subjects"
                  type="number"
                  inputMode="decimal"
                  min={1}
                  max={20}
                  value={subjectCountInput}
                  onChange={(e) => setSubjectCountInput(parseInt(e.target.value) || 0)}
                  className="apple-input w-16 text-center text-sm h-10"
                />
                <button type="submit" className="apple-btn-secondary text-xs h-10 px-3 whitespace-nowrap">
                  Generate
                </button>
              </form>
            </div>

            {/* Desktop & Tablet Subject Table with Stable, Centered Credits Column */}
            <div className="hidden md:block overflow-x-auto rounded-xl border border-[var(--border-primary)]">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-[var(--bg-primary)] border-b border-[var(--border-primary)]">
                    <th className="py-3.5 px-4 font-semibold text-[14px] text-[var(--text-primary)]">
                      Subject
                    </th>
                    <th className="py-3.5 px-3 font-semibold text-[14px] text-[var(--text-primary)] text-center w-[110px] min-w-[100px]">
                      Credits
                    </th>
                    <th className="py-3.5 px-3 font-semibold text-[14px] text-[var(--text-primary)] text-center w-[110px] min-w-[100px]">
                      Grade
                    </th>
                    <th className="py-3.5 px-3 font-semibold text-[14px] text-[var(--text-primary)] text-center w-[130px] min-w-[110px]">
                      Grade Point
                    </th>
                    <th className="py-3.5 px-4 font-semibold text-[14px] text-[var(--text-primary)] text-right w-[150px] min-w-[130px]">
                      Credits × GP
                    </th>
                    <th className="py-3.5 px-3 text-center w-[80px]"></th>
                  </tr>
                </thead>
                <tbody>
                  {subjects.map((s, idx) => {
                    const cred = Number(s.credits) || 0;
                    const pts = s.gradePoint ?? 0;
                    return (
                      <tr key={s.id} className="bg-[var(--surface)] border-b border-[var(--border-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors">
                        {/* Subject Title */}
                        <td className="py-3.5 px-4">
                          <input
                            type="text"
                            value={s.name}
                            placeholder={`Subject ${idx + 1}`}
                            onChange={(e) => handleSubjectChange(s.id, 'name', e.target.value)}
                            className="w-full bg-transparent border-b border-transparent focus:border-[var(--text-primary)] outline-none text-[var(--text-primary)] font-medium placeholder:text-[var(--text-tertiary)] text-[15px]"
                          />
                        </td>

                        {/* Credits Input Cell: 48px, High-contrast, Centered */}
                        <td className="py-3 px-3 text-center w-[110px] min-w-[100px]">
                          <input
                            type="number"
                            inputMode="decimal"
                            min={0}
                            max={12}
                            step="any"
                            placeholder="0"
                            value={s.credits}
                            onChange={(e) => handleSubjectChange(s.id, 'credits', e.target.value)}
                            className="h-[48px] w-full max-w-[84px] mx-auto rounded-[10px] bg-[var(--surface)] text-[var(--text-primary)] border border-[var(--input-border)] text-center text-[16px] font-medium placeholder:text-[var(--text-tertiary)] outline-none focus:border-2 focus:border-[var(--text-primary)] focus:ring-2 focus:ring-black/10 dark:focus:ring-white/10 transition-all shadow-sm"
                          />
                        </td>

                        {/* Grade Select */}
                        <td className="py-3 px-3 text-center w-[110px] min-w-[100px]">
                          <select
                            value={s.grade}
                            onChange={(e) => handleSubjectChange(s.id, 'grade', e.target.value)}
                            className="h-[48px] w-full rounded-[10px] bg-[var(--surface)] text-[var(--text-primary)] border border-[var(--input-border)] text-center text-[15px] font-semibold cursor-pointer outline-none focus:border-2 focus:border-[var(--text-primary)] shadow-sm"
                          >
                            {gradeOptions.map((opt) => (
                              <option key={opt.grade} value={opt.grade}>
                                {opt.grade}
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* Grade Point */}
                        <td className="py-3.5 px-3 text-center font-medium text-[16px] text-[var(--text-primary)] tabular-nums w-[130px] min-w-[110px]">
                          {pts}
                        </td>

                        {/* Credits × GP */}
                        <td className="py-3.5 px-4 text-right font-semibold text-[16px] text-[var(--text-primary)] tabular-nums w-[150px] min-w-[130px]">
                          {(cred * pts).toFixed(1)}
                        </td>

                        {/* Remove Action */}
                        <td className="py-3.5 px-3 text-center w-[80px]">
                          {subjects.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveSubject(s.id)}
                              className="text-[var(--text-tertiary)] hover:text-[var(--danger)] transition-colors p-2 rounded-lg hover:bg-[var(--bg-primary)]"
                              aria-label={`Remove subject ${idx + 1}`}
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

            {/* Mobile Stacked Subject Cards */}
            <div className="md:hidden flex flex-col gap-3">
              {subjects.map((s, idx) => {
                const cred = Number(s.credits) || 0;
                const pts = s.gradePoint ?? 0;
                return (
                  <div
                    key={s.id}
                    className="p-5 rounded-xl bg-[var(--surface)] border border-[var(--border-primary)] flex flex-col gap-4 shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                        Subject {idx + 1}
                      </span>
                      {subjects.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveSubject(s.id)}
                          className="text-[var(--text-tertiary)] hover:text-[var(--danger)] p-1.5"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <input
                      type="text"
                      value={s.name}
                      placeholder={`Subject ${idx + 1}`}
                      onChange={(e) => handleSubjectChange(s.id, 'name', e.target.value)}
                      className="apple-input h-11 text-base font-medium"
                    />

                    <div className="grid grid-cols-2 gap-3 items-center">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-[var(--text-primary)]">
                          Credits
                        </label>
                        <input
                          type="number"
                          inputMode="decimal"
                          min={0}
                          max={12}
                          placeholder="0"
                          value={s.credits}
                          onChange={(e) => handleSubjectChange(s.id, 'credits', e.target.value)}
                          className="h-[48px] rounded-[10px] bg-[var(--surface)] text-[var(--text-primary)] border border-[var(--input-border)] text-center text-[16px] font-medium outline-none focus:border-2 focus:border-[var(--text-primary)] shadow-sm"
                        />
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-[var(--text-primary)]">
                          Grade
                        </label>
                        <select
                          value={s.grade}
                          onChange={(e) => handleSubjectChange(s.id, 'grade', e.target.value)}
                          className="h-[48px] rounded-[10px] bg-[var(--surface)] text-[var(--text-primary)] border border-[var(--input-border)] text-center text-[15px] font-semibold cursor-pointer outline-none focus:border-2 focus:border-[var(--text-primary)] shadow-sm"
                        >
                          {gradeOptions.map((opt) => (
                            <option key={opt.grade} value={opt.grade}>
                              {opt.grade} ({opt.points} pts)
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-[var(--border-secondary)] flex justify-between items-center text-sm">
                      <span className="text-[var(--text-secondary)] font-medium">
                        Grade Point: <strong className="text-[var(--text-primary)]">{pts}</strong>
                      </span>
                      <span className="text-[var(--text-primary)] font-semibold">
                        Credits × GP = {(cred * pts).toFixed(1)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Action Buttons: Add Subject & Calculate SGPA */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-[var(--border-primary)]">
              <button
                type="button"
                onClick={handleAddSubject}
                className="apple-btn-secondary w-full sm:w-auto h-[52px] text-[15px] font-semibold gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>Add Subject</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  const el = document.getElementById('sgpa-result-section');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                className="apple-btn-primary w-full sm:flex-1 h-[52px] text-[17px] font-semibold"
              >
                Calculate SGPA
              </button>
            </div>
          </div>
        </div>

        {/* Right Result Card (Sticky on desktop) */}
        <div id="sgpa-result-section" className="lg:col-span-5 lg:sticky lg:top-24">
          <div className="apple-result-card flex flex-col gap-6">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                SGPA
              </span>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-[44px] sm:text-[56px] font-bold tracking-tight text-[var(--text-primary)] tabular-nums leading-none">
                  {formatFixed(gpaResult.gpa, 2)}
                </span>
                <span className="text-xl font-semibold text-[var(--text-secondary)]">
                  / 10
                </span>
              </div>
              <p className="text-sm font-medium text-[var(--text-secondary)] mt-2">
                Semester Grade Point Average ({regulation})
              </p>
            </div>

            {/* Summary Metrics */}
            <div className="grid grid-cols-2 gap-4 border-t border-[var(--border-primary)] pt-4">
              <div>
                <span className="text-xs text-[var(--text-secondary)] font-medium">
                  Total Credits
                </span>
                <div className="text-[20px] sm:text-2xl font-semibold text-[var(--text-primary)] mt-1 tabular-nums">
                  {gpaResult.totalCredits}
                </div>
              </div>
              <div>
                <span className="text-xs text-[var(--text-secondary)] font-medium">
                  Subject Count
                </span>
                <div className="text-[20px] sm:text-2xl font-semibold text-[var(--text-primary)] mt-1 tabular-nums">
                  {subjects.length}
                </div>
              </div>
            </div>

            {/* Formula box */}
            <div className="rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-primary)] p-4 text-xs text-[var(--text-primary)] font-mono leading-relaxed">
              <strong className="block mb-1 text-[13px] text-[var(--text-primary)]">How SGPA is Calculated:</strong>
              <div>• SGPA = Σ (Credit × Grade Point) ÷ Σ (Credits)</div>
              <div className="mt-1 font-semibold">
                {formatFixed(totalQualityPoints, 2)} ÷ {gpaResult.totalCredits || 0} = {formatFixed(gpaResult.gpa, 2)}
              </div>
            </div>

            {/* Print / Save PDF Action Button */}
            <div className="pt-2">
              <PrintButton
                studentName={studentName}
                calculatorType="SGPA"
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
      reportTitle="SGPA Report"
      calculatorName="SGPA Calculator"
      studentName={studentName}
      regulation={regulation}
      semester={selectedSemester}
      resultLabel="SEMESTER GRADE POINT AVERAGE (SGPA)"
      resultValue={`${formatFixed(gpaResult.gpa, 2)} / 10`}
      resultSubtext={`Total Credits: ${gpaResult.totalCredits} • Total Credit Points: ${formatFixed(totalQualityPoints, 2)}`}
      formulaTitle="SGPA Calculation Summary"
      formulaRule="SGPA Formula: Σ(Credit × Grade Point) ÷ Σ(Credits)"
      formulaCalculation={`${formatFixed(totalQualityPoints, 2)} ÷ ${gpaResult.totalCredits || 0} = ${formatFixed(gpaResult.gpa, 2)}`}
      isEmpty={gpaResult.totalCredits === 0}
      emptyNotice="Please enter course credits and calculate your SGPA before printing."
    >
      <table className="w-full text-left border-collapse border border-[#D2D2D7]">
        <thead>
          <tr className="bg-[#F5F5F7] border-b-2 border-[#D2D2D7]">
            <th className="py-2.5 px-3 text-[12px] font-bold text-[#1D1D1F] uppercase">Subject</th>
            <th className="py-2.5 px-3 text-[12px] font-bold text-[#1D1D1F] uppercase text-center w-[110px]">Credits</th>
            <th className="py-2.5 px-3 text-[12px] font-bold text-[#1D1D1F] uppercase text-center w-[100px]">Grade</th>
            <th className="py-2.5 px-3 text-[12px] font-bold text-[#1D1D1F] uppercase text-center w-[110px]">Grade Point</th>
            <th className="py-2.5 px-3 text-[12px] font-bold text-[#1D1D1F] uppercase text-right w-[140px]">Credit × GP</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#E5E5EA] text-[13px]">
          {subjects.map((sub, idx) => {
            const cred = Number(sub.credits) || 0;
            const pts = sub.gradePoint ?? 0;
            const qualityPts = cred * pts;
            return (
              <tr key={sub.id}>
                <td className="py-2.5 px-3 font-medium text-[#1D1D1F]">
                  {sub.name.trim() || `Subject ${idx + 1}`}
                </td>
                <td className="py-2.5 px-3 text-center font-semibold text-[#1D1D1F] tabular-nums font-mono">
                  {cred}
                </td>
                <td className="py-2.5 px-3 text-center font-semibold text-[#1D1D1F]">
                  {sub.grade}
                </td>
                <td className="py-2.5 px-3 text-center text-[#6E6E73] tabular-nums font-mono">
                  {pts}
                </td>
                <td className="py-2.5 px-3 text-right font-semibold text-[#1D1D1F] tabular-nums font-mono">
                  {qualityPts.toFixed(2)}
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="bg-[#FAFAFA] font-bold border-t-2 border-[#D2D2D7]">
            <td className="py-3 px-3 text-[#1D1D1F]">TOTALS</td>
            <td className="py-3 px-3 text-center text-[14px] text-[#1D1D1F] tabular-nums font-mono">
              {gpaResult.totalCredits}
            </td>
            <td className="py-3 px-3 text-center text-[#6E6E73]">—</td>
            <td className="py-3 px-3 text-center text-[#6E6E73]">—</td>
            <td className="py-3 px-3 text-right text-[14px] text-[#1D1D1F] tabular-nums font-mono">
              {formatFixed(totalQualityPoints, 2)}
            </td>
          </tr>
        </tfoot>
      </table>
    </AcademicPrintReport>
    </>
  );
};
