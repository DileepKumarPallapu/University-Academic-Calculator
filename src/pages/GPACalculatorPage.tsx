import React, { useState, useRef, useEffect } from 'react';
import { Plus, Trash2, RotateCcw, Download, ChevronDown } from 'lucide-react';
import { calculateGPA, formatFixed } from '../utils/calculations';
import { REGULATIONS, type RegulationId } from '../config/university';
import type { SubjectItem } from '../types';
import { PrintButton } from '../components/common/PrintButton';
import { AcademicPrintReport } from '../components/common/AcademicPrintReport';
import { useStudentProfile } from '../hooks/useStudentProfile';
import { StudentNameInput } from '../components/common/StudentNameInput';
import { GradeScaleModal } from '../components/common/GradeScaleModal';
import { ResultActionButtons } from '../components/common/ResultActionButtons';
import { ResetConfirmModal } from '../components/common/ResetConfirmModal';
import { saveRecentCalculation } from '../utils/recentCalculations';
import { useAppToast } from '../components/layout/AppShell';

export const GPACalculatorPage: React.FC = () => {
  const { profile, studentName, setStudentName, updateProfile, nameError, setNameError } = useStudentProfile();
  const { showToast } = useAppToast();
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

  const [showResetModal, setShowResetModal] = useState(false);
  const isDirty =
    subjects.some((s, idx) => Number(s.credits) > 0 || (s.name && s.name !== `Subject ${idx + 1}`)) ||
    subjects.length !== 6;

  const handleReset = () => {
    const defaultGrade = gradeOptions[0];
    setSubjects([
      { id: 'sub-1', name: 'Subject 1', credits: 0, grade: defaultGrade.grade, gradePoint: defaultGrade.points },
      { id: 'sub-2', name: 'Subject 2', credits: 0, grade: defaultGrade.grade, gradePoint: defaultGrade.points },
      { id: 'sub-3', name: 'Subject 3', credits: 0, grade: defaultGrade.grade, gradePoint: defaultGrade.points },
      { id: 'sub-4', name: 'Subject 4', credits: 0, grade: defaultGrade.grade, gradePoint: defaultGrade.points },
      { id: 'sub-5', name: 'Subject 5', credits: 0, grade: defaultGrade.grade, gradePoint: defaultGrade.points },
      { id: 'sub-6', name: 'Subject 6', credits: 0, grade: defaultGrade.grade, gradePoint: defaultGrade.points },
    ]);
    setNameError(null);
    setShowResetModal(false);
  };

  const handleResetClick = () => {
    if (isDirty) {
      setShowResetModal(true);
    } else {
      handleReset();
    }
  };

  const gpaResult = calculateGPA(subjects);
  const totalQualityPoints = subjects.reduce(
    (sum, s) => sum + (Number(s.credits) || 0) * (s.gradePoint ?? 0),
    0
  );

  // CSV Export Handler
  const handleExportCSV = () => {
    const headers = ['Subject', 'Credits', 'Grade', 'Grade Point', 'Credit Points'];
    const rows = subjects.map((sub, idx) => {
      const cred = Number(sub.credits) || 0;
      const pts = sub.gradePoint ?? 0;
      const cp = cred * pts;
      const name = `"${(sub.name.trim() || `Subject ${idx + 1}`).replace(/"/g, '""')}"`;
      return [name, cred, sub.grade, pts, cred === 0 ? 0 : cp.toFixed(1)].join(',');
    });
    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const safeName = (studentName.trim() || 'Student').replace(/[^a-zA-Z0-9_-]/g, '_');
    const dateStr = new Date().toISOString().split('T')[0];
    link.setAttribute('href', url);
    link.setAttribute('download', `${safeName}_SGPA_Subjects_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('CSV exported successfully.', 'success');
  };

  // What-If SGPA State & Handlers
  const [whatIfExpanded, setWhatIfExpanded] = useState<boolean>(false);
  const [whatIfGrades, setWhatIfGrades] = useState<Record<string, { grade: string; points: number }>>({});

  useEffect(() => {
    const initial: Record<string, { grade: string; points: number }> = {};
    subjects.forEach((s) => {
      initial[s.id] = { grade: s.grade, points: s.gradePoint ?? 0 };
    });
    setWhatIfGrades(initial);
  }, [subjects]);

  const handleWhatIfGradeChange = (id: string, grade: string) => {
    const opt = gradeOptions.find((g) => g.grade === grade) || gradeOptions[0];
    setWhatIfGrades((prev) => ({
      ...prev,
      [id]: { grade: opt.grade, points: opt.points },
    }));
  };

  const whatIfSubjectsList = subjects.map((s) => {
    const custom = whatIfGrades[s.id];
    return {
      ...s,
      grade: custom ? custom.grade : s.grade,
      gradePoint: custom ? custom.points : s.gradePoint,
    };
  });
  const whatIfGpaResult = calculateGPA(whatIfSubjectsList);

  const handleApplyWhatIf = () => {
    setSubjects(whatIfSubjectsList);
    showToast('What-if grades applied to main calculation.', 'success');
  };

  const handleResetWhatIf = () => {
    const initial: Record<string, { grade: string; points: number }> = {};
    subjects.forEach((s) => {
      initial[s.id] = { grade: s.grade, points: s.gradePoint ?? 0 };
    });
    setWhatIfGrades(initial);
    showToast('What-if grades reset to original.', 'info');
  };

  // Target SGPA Planner State & Derived Math
  const [targetGpaExpanded, setTargetGpaExpanded] = useState<boolean>(false);
  const [targetGpaInput, setTargetGpaInput] = useState<string>('8.50');
  const [remainingCreditsInput, setRemainingCreditsInput] = useState<string>('20');

  const parsedTargetSgpa = parseFloat(targetGpaInput) || 0;
  const parsedRemainingCredits = Math.max(0, parseFloat(remainingCreditsInput) || 0);

  const currentCompletedCredits = gpaResult.totalCredits;
  const currentQualityPts = totalQualityPoints;
  const targetTotalCredits = currentCompletedCredits + parsedRemainingCredits;

  const targetRequiredTotalQualityPoints = parsedTargetSgpa * targetTotalCredits;
  const targetRequiredRemainingQualityPoints = targetRequiredTotalQualityPoints - currentQualityPts;

  const requiredAvgGradePoint = parsedRemainingCredits > 0
    ? targetRequiredRemainingQualityPoints / parsedRemainingCredits
    : 0;

  const maxAchievableSgpa = targetTotalCredits > 0
    ? (currentQualityPts + 10.0 * parsedRemainingCredits) / targetTotalCredits
    : 0;


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
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[var(--text-primary)]">
              Regulation: {regulation}
            </span>
            <span>•</span>
            <span>Grade scale loaded for {regulation} ({regConfig.years})</span>
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

              {/* Number of Subjects Generator and CSV Export */}
              <div className="flex flex-wrap items-center gap-2">
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

                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="apple-btn-secondary text-xs h-10 px-3 flex items-center gap-1.5 whitespace-nowrap"
                  title="Export subjects to CSV"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export CSV</span>
                </button>
              </div>
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
                        <td className="py-3 px-3 text-center w-[120px] min-w-[110px]">
                          <div className="flex flex-col items-center">
                            <input
                              type="number"
                              inputMode="decimal"
                              min={0}
                              max={12}
                              step="any"
                              placeholder="0"
                              value={s.credits}
                              onChange={(e) => handleSubjectChange(s.id, 'credits', e.target.value)}
                              className={`h-[48px] w-full max-w-[84px] mx-auto rounded-[10px] bg-[var(--surface)] text-[var(--text-primary)] border ${
                                typeof s.credits === 'number' && s.credits < 0
                                  ? 'border-[var(--danger)] focus:border-[var(--danger)] ring-1 ring-[var(--danger)]'
                                  : 'border-[var(--input-border)] focus:border-[var(--text-primary)]'
                              } text-center text-[16px] font-medium placeholder:text-[var(--text-tertiary)] outline-none focus:border-2 focus:ring-2 focus:ring-black/10 dark:focus:ring-white/10 transition-all shadow-sm`}
                            />
                            {typeof s.credits === 'number' && s.credits < 0 ? (
                              <span className="text-[10px] text-[var(--danger)] font-medium mt-1">
                                ≥ 0 only
                              </span>
                            ) : (
                              (s.credits as any) === 0 && (
                                <span className="text-[10px] text-[var(--text-tertiary)] font-medium mt-1">
                                  Non-credit
                                </span>
                              )
                            )}
                          </div>
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
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-semibold text-[var(--text-primary)]">
                            Credits
                          </label>
                          {typeof s.credits === 'number' && s.credits < 0 ? (
                            <span className="text-[10px] text-[var(--danger)] font-medium">
                              Cannot be negative
                            </span>
                          ) : (
                            (s.credits as any) === 0 && (
                              <span className="text-[10px] text-[var(--text-tertiary)] font-medium">
                                Non-credit
                              </span>
                            )
                          )}
                        </div>
                        <input
                          type="number"
                          inputMode="decimal"
                          min={0}
                          max={12}
                          step="any"
                          placeholder="0"
                          value={s.credits}
                          onChange={(e) => handleSubjectChange(s.id, 'credits', e.target.value)}
                          className={`h-[48px] rounded-[10px] bg-[var(--surface)] text-[var(--text-primary)] border ${
                            typeof s.credits === 'number' && s.credits < 0
                              ? 'border-[var(--danger)] ring-1 ring-[var(--danger)]'
                              : 'border-[var(--input-border)]'
                          } text-center text-[16px] font-medium outline-none focus:border-2 focus:border-[var(--text-primary)] shadow-sm`}
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

            {/* Action Buttons: Add Subject, Reset & Calculate SGPA */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-[var(--border-primary)]">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleAddSubject}
                  className="apple-btn-secondary flex-1 sm:flex-initial h-[52px] text-[15px] font-semibold gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Subject</span>
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
                  const hasNegative = subjects.some((s) => typeof s.credits === 'number' && s.credits < 0);
                  if (hasNegative) {
                    showToast('Credits cannot be negative. Please enter 0 or higher.', 'error');
                    return;
                  }
                  if (gpaResult.totalCredits === 0) {
                    showToast('Add at least one subject with credits greater than 0 to calculate SGPA.', 'info');
                  } else {
                    saveRecentCalculation({
                      type: 'gpa',
                      title: `SGPA (Semester ${selectedSemester}, ${regulation})`,
                      value: `${formatFixed(gpaResult.gpa, 2)} / 10`,
                      subtext: `${gpaResult.totalCredits} Credits • ${subjects.length} Subjects`,
                      route: '/sgpa',
                    });
                    showToast('SGPA calculated successfully.', 'success');
                  }
                  if (window.innerWidth < 1024) {
                    const el = document.getElementById('sgpa-result-section');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
                className="apple-btn-primary w-full sm:flex-1 h-[52px] text-[17px] font-semibold"
              >
                Calculate SGPA
              </button>
            </div>
          </div>

          {/* Plan / What-If SGPA Card */}
          <div className="apple-main-container p-6 flex flex-col gap-4">
            <button
              type="button"
              onClick={() => setWhatIfExpanded((prev) => !prev)}
              className="flex items-center justify-between text-base font-semibold text-[var(--text-primary)] cursor-pointer text-left"
              aria-expanded={whatIfExpanded}
            >
              <div className="flex items-center gap-2">
                <span>Experiment with what-if grades</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--bg-tertiary)] text-[var(--text-secondary)] font-normal">
                  Simulation
                </span>
              </div>
              <ChevronDown
                className={`w-4 h-4 text-[var(--text-tertiary)] transition-transform ${
                  whatIfExpanded ? 'rotate-180' : ''
                }`}
              />
            </button>

            {whatIfExpanded && (
              <div className="pt-4 border-t border-[var(--border-secondary)] flex flex-col gap-5 text-sm animate-appleFadeIn">
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  Test hypothetical grade scenarios. Changes made here simulate your projected SGPA without affecting your active calculation until you choose to apply them.
                </p>

                {/* Subject Grade Selector Grid */}
                <div className="flex flex-col gap-3">
                  {subjects.map((s, idx) => {
                    const currentSimGrade = whatIfGrades[s.id]?.grade ?? s.grade;
                    const cred = Number(s.credits) || 0;
                    return (
                      <div
                        key={s.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl bg-[var(--surface)] border border-[var(--border-secondary)]"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-[var(--text-primary)] text-sm">
                            {s.name.trim() || `Subject ${idx + 1}`}
                          </span>
                          <span className="text-xs text-[var(--text-secondary)]">
                            ({cred} {cred === 1 ? 'credit' : 'credits'}{cred === 0 ? ' • Non-credit' : ''})
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="text-xs text-[var(--text-secondary)]">Simulate:</label>
                          <select
                            value={currentSimGrade}
                            onChange={(e) => handleWhatIfGradeChange(s.id, e.target.value)}
                            className="apple-input h-9 text-xs font-semibold py-0 w-28 cursor-pointer"
                          >
                            {gradeOptions.map((opt) => (
                              <option key={opt.grade} value={opt.grade}>
                                {opt.grade} ({opt.points} pts)
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Simulation Comparison Banner */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-primary)]">
                  <div>
                    <span className="text-xs text-[var(--text-secondary)] block">Current SGPA</span>
                    <span className="text-lg font-bold text-[var(--text-primary)] tabular-nums">
                      {gpaResult.totalCredits > 0 ? formatFixed(gpaResult.gpa, 2) : '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-[var(--text-secondary)] block">Projected SGPA</span>
                    <span className="text-lg font-bold text-[var(--text-primary)] tabular-nums">
                      {whatIfGpaResult.totalCredits > 0 ? formatFixed(whatIfGpaResult.gpa, 2) : '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-[var(--text-secondary)] block">Net Change</span>
                    <span
                      className={`text-lg font-bold tabular-nums ${
                        whatIfGpaResult.gpa > gpaResult.gpa
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : whatIfGpaResult.gpa < gpaResult.gpa
                          ? 'text-rose-600 dark:text-rose-400'
                          : 'text-[var(--text-primary)]'
                      }`}
                    >
                      {gpaResult.totalCredits > 0 && whatIfGpaResult.totalCredits > 0
                        ? `${whatIfGpaResult.gpa >= gpaResult.gpa ? '+' : ''}${formatFixed(
                            whatIfGpaResult.gpa - gpaResult.gpa,
                            2
                          )}`
                        : '—'}
                    </span>
                  </div>
                </div>

                {/* What-If Action Buttons */}
                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleApplyWhatIf}
                    className="apple-btn-primary flex-1 h-10 text-xs font-semibold"
                  >
                    Apply Changes to Calculation
                  </button>
                  <button
                    type="button"
                    onClick={handleResetWhatIf}
                    className="apple-btn-secondary h-10 px-4 text-xs font-semibold"
                  >
                    Reset What-if
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Target SGPA Planner Expandable Card */}
          <div className="apple-main-container p-6 flex flex-col gap-4">
            <button
              type="button"
              onClick={() => setTargetGpaExpanded((prev) => !prev)}
              className="flex items-center justify-between text-base font-semibold text-[var(--text-primary)] cursor-pointer text-left"
              aria-expanded={targetGpaExpanded}
            >
              <div className="flex items-center gap-2">
                <span>Plan your target SGPA</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--bg-tertiary)] text-[var(--text-secondary)] font-normal">
                  Goal Planner
                </span>
              </div>
              <ChevronDown
                className={`w-4 h-4 text-[var(--text-tertiary)] transition-transform ${
                  targetGpaExpanded ? 'rotate-180' : ''
                }`}
              />
            </button>

            {targetGpaExpanded && (
              <div className="pt-4 border-t border-[var(--border-secondary)] flex flex-col gap-5 text-sm animate-appleFadeIn">
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  Determine the average grade point required across your remaining semester credits to reach your target SGPA.
                </p>

                {/* Input Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="target-sgpa-input" className="apple-label text-xs">
                      Target SGPA (Max 10.0)
                    </label>
                    <input
                      id="target-sgpa-input"
                      type="number"
                      inputMode="decimal"
                      min={0}
                      max={10}
                      step="0.01"
                      placeholder="8.50"
                      value={targetGpaInput}
                      onChange={(e) => setTargetGpaInput(e.target.value)}
                      className="apple-input h-11 text-sm"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="remaining-credits-input" className="apple-label text-xs">
                      Remaining Credits
                    </label>
                    <input
                      id="remaining-credits-input"
                      type="number"
                      inputMode="decimal"
                      min={1}
                      max={40}
                      step="1"
                      placeholder="20"
                      value={remainingCreditsInput}
                      onChange={(e) => setRemainingCreditsInput(e.target.value)}
                      className="apple-input h-11 text-sm"
                    />
                  </div>
                </div>

                {/* Planner Summary Cards */}
                {parsedRemainingCredits > 0 ? (
                  <div className="flex flex-col gap-4">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="p-3 rounded-xl bg-[var(--surface)] border border-[var(--border-secondary)]">
                        <span className="text-xs text-[var(--text-secondary)] block">Current SGPA</span>
                        <span className="text-base font-bold text-[var(--text-primary)] tabular-nums mt-0.5 block">
                          {gpaResult.totalCredits > 0 ? formatFixed(gpaResult.gpa, 2) : '—'}
                        </span>
                        <span className="text-[10px] text-[var(--text-tertiary)]">
                          {gpaResult.totalCredits} credits
                        </span>
                      </div>

                      <div className="p-3 rounded-xl bg-[var(--surface)] border border-[var(--border-secondary)]">
                        <span className="text-xs text-[var(--text-secondary)] block">Target SGPA</span>
                        <span className="text-base font-bold text-[var(--text-primary)] tabular-nums mt-0.5 block">
                          {formatFixed(parsedTargetSgpa, 2)}
                        </span>
                        <span className="text-[10px] text-[var(--text-tertiary)]">
                          Goal
                        </span>
                      </div>

                      <div className="p-3 rounded-xl bg-[var(--surface)] border border-[var(--border-secondary)]">
                        <span className="text-xs text-[var(--text-secondary)] block">Required GP</span>
                        <span
                          className={`text-base font-bold tabular-nums mt-0.5 block ${
                            requiredAvgGradePoint > 10.0
                              ? 'text-rose-600 dark:text-rose-400'
                              : 'text-[var(--text-primary)]'
                          }`}
                        >
                          {requiredAvgGradePoint <= 0 ? '0.00' : formatFixed(requiredAvgGradePoint, 2)}
                        </span>
                        <span className="text-[10px] text-[var(--text-tertiary)]">
                          / 10 average
                        </span>
                      </div>

                      <div className="p-3 rounded-xl bg-[var(--surface)] border border-[var(--border-secondary)]">
                        <span className="text-xs text-[var(--text-secondary)] block">Max Achievable</span>
                        <span className="text-base font-bold text-[var(--text-primary)] tabular-nums mt-0.5 block">
                          {formatFixed(maxAchievableSgpa, 2)}
                        </span>
                        <span className="text-[10px] text-[var(--text-tertiary)]">
                          at 10.0 GP
                        </span>
                      </div>
                    </div>

                    {/* Result Analysis Message */}
                    {requiredAvgGradePoint > 10.0 ? (
                      <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-xs text-rose-800 dark:text-rose-300 leading-relaxed">
                        <strong>Target Unattainable:</strong> A target SGPA of {formatFixed(parsedTargetSgpa, 2)} requires an average grade point of {formatFixed(requiredAvgGradePoint, 2)} across your remaining {parsedRemainingCredits} credits, which exceeds the maximum grade point scale (10.0). The highest achievable SGPA is <strong>{formatFixed(maxAchievableSgpa, 2)}</strong>.
                      </div>
                    ) : requiredAvgGradePoint <= 0 ? (
                      <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 text-xs text-emerald-800 dark:text-emerald-300 leading-relaxed">
                        Your current quality points already secure your target SGPA of {formatFixed(parsedTargetSgpa, 2)} across all {targetTotalCredits} credits.
                      </div>
                    ) : (
                      <div className="p-3.5 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-primary)] text-xs text-[var(--text-primary)] leading-relaxed">
                        To attain an SGPA of <strong>{formatFixed(parsedTargetSgpa, 2)}</strong>, maintain an average grade point of at least <strong>{formatFixed(requiredAvgGradePoint, 2)} / 10</strong> across your remaining {parsedRemainingCredits} credits.
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-xs text-[var(--text-secondary)]">
                    Please specify a positive number of remaining credits to compute target requirements.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Result Card (Sticky on desktop) */}
        <div id="sgpa-result-section" className="lg:col-span-5 lg:sticky lg:top-24">
          <div className="apple-result-card flex flex-col gap-6">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                SGPA
              </span>
              {gpaResult.totalCredits > 0 ? (
                <>
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
                </>
              ) : (
                <div className="mt-2.5">
                  <div className="text-[18px] sm:text-[20px] font-semibold text-[var(--text-primary)] leading-snug">
                    No credit-bearing subjects available.
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] mt-1.5 leading-relaxed">
                    Add at least one subject with credits greater than 0 to calculate SGPA.
                  </p>
                </div>
              )}
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
              {gpaResult.totalCredits > 0 ? (
                <div className="mt-1 font-semibold">
                  {formatFixed(totalQualityPoints, 2)} ÷ {gpaResult.totalCredits} = {formatFixed(gpaResult.gpa, 2)}
                </div>
              ) : (
                <div className="mt-1 text-[var(--text-secondary)] font-sans">
                  No credit-bearing subjects available. Add at least one subject with credits &gt; 0.
                </div>
              )}
            </div>

            {/* Result Action Buttons: Copy & Share */}
            <div className="pt-2">
              <ResultActionButtons
                title={`SGPA - Semester ${selectedSemester} (${regulation})`}
                studentName={studentName}
                items={[
                  { label: 'Regulation', value: regulation },
                  { label: 'Semester', value: `Semester ${selectedSemester}` },
                  { label: 'Total Credits', value: `${gpaResult.totalCredits}` },
                  { label: 'Total Credit Points', value: formatFixed(totalQualityPoints, 2) },
                  { label: 'Subject Count', value: `${subjects.length}` },
                ]}
                resultLabel="SGPA"
                resultValue={
                  gpaResult.totalCredits > 0
                    ? `${formatFixed(gpaResult.gpa, 2)} / 10`
                    : 'No credit-bearing subjects available'
                }
              />
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
      reportType="SGPA"
      studentName={studentName}
      profile={profile}
      regulation={regulation}
      semester={selectedSemester}
      resultLabel="SEMESTER GRADE POINT AVERAGE (SGPA)"
      resultValue={gpaResult.totalCredits > 0 ? `${formatFixed(gpaResult.gpa, 2)} / 10` : 'N/A'}
      resultSubtext={
        gpaResult.totalCredits > 0
          ? `Total Credits: ${gpaResult.totalCredits} • Total Credit Points: ${formatFixed(totalQualityPoints, 2)}`
          : 'No credit-bearing subjects available'
      }
      formulaTitle="SGPA Calculation Summary"
      formulaRule="SGPA Formula: Σ(Credit × Grade Point) ÷ Σ(Credits)"
      formulaCalculation={
        gpaResult.totalCredits > 0
          ? `${formatFixed(totalQualityPoints, 2)} ÷ ${gpaResult.totalCredits} = ${formatFixed(gpaResult.gpa, 2)}`
          : 'No credit-bearing subjects'
      }
      isEmpty={gpaResult.totalCredits === 0}
      emptyNotice="Add at least one subject with credits greater than 0 to calculate SGPA before printing."
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
                  {cred === 0 && (
                    <span className="ml-2 text-[10px] font-normal text-[#86868B]">
                      (Non-credit)
                    </span>
                  )}
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
                  {qualityPts.toFixed(1)}
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
      title="Reset SGPA calculation?"
      description="Are you sure you want to reset all subjects to default starting values? This action cannot be undone."
    />
    </>
  );
};
