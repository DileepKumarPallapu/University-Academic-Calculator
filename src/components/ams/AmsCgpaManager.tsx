import React, { useState } from 'react';
import {
  Plus,
  Trash2,
  Copy,
  FileSpreadsheet,
  Check,
  CheckCircle2,
  Bookmark,
  Award,
  Layers,
  Sparkles,
  Upload,
} from 'lucide-react';
import type { AmsSemesterResult, AmsExtractionResult, AmsStudentInfo, AmsSubject, AmsAuditSummary } from '../../types/ams';
import { calculateAmsCgpa, exportTranscriptToExcel, exportTranscriptToCsv } from '../../utils/amsExtractor';
import { formatFixed } from '../../utils/calculations';
import { saveRecentAmsImport } from '../../utils/recentAmsImports';
import { useStudentProfile } from '../../hooks/useStudentProfile';
import { useAppToast } from '../layout/AppShell';
import { AmsUploader } from './AmsUploader';
import { AmsSideBySideReview } from './AmsSideBySideReview';

export const AmsCgpaManager: React.FC = () => {
  const { profile } = useStudentProfile();
  const { showToast } = useAppToast();

  const [semesters, setSemesters] = useState<AmsSemesterResult[]>([]);
  const [copied, setCopied] = useState<boolean>(false);
  const [isSaved, setIsSaved] = useState<boolean>(false);

  // Sub-workflow for uploading an AMS semester result
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [currentExtraction, setCurrentExtraction] = useState<AmsExtractionResult | null>(null);

  // Quick manual add modal
  const [showQuickAdd, setShowQuickAdd] = useState<boolean>(false);
  const [quickSemNumber, setQuickSemNumber] = useState<number>(semesters.length + 1);
  const [quickSgpa, setQuickSgpa] = useState<string>('');
  const [quickCredits, setQuickCredits] = useState<string>('');

  const cgpaResult = calculateAmsCgpa(semesters);

  const studentName = profile.name || semesters[0]?.studentInfo?.name || 'Student';
  const registerNo = profile.rollNumber || semesters[0]?.studentInfo?.registerNumber || '—';

  // Degree Classification
  const getClassification = (cgpa: number) => {
    if (cgpa >= 8.5) return 'First Class with Distinction';
    if (cgpa >= 7.0) return 'First Class';
    if (cgpa >= 5.5) return 'Second Class';
    return 'Pass';
  };

  const handleApplyQuickAdd = () => {
    const s = parseFloat(quickSgpa);
    const c = parseFloat(quickCredits);
    if (isNaN(s) || s < 0 || s > 10) {
      showToast('Please enter a valid SGPA between 0 and 10.', 'error');
      return;
    }
    if (isNaN(c) || c <= 0) {
      showToast('Please enter a valid total credits value.', 'error');
      return;
    }

    const newSem: AmsSemesterResult = {
      id: `manual-sem-${Date.now()}`,
      semesterNumber: quickSemNumber,
      semesterLabel: `Semester ${quickSemNumber}`,
      sgpa: s,
      totalCredits: c,
      totalQualityPoints: s * c,
      subjectsCount: 0,
      isVerified: false,
      verified: false,
    };

    setSemesters((prev) => [...prev, newSem]);
    setShowQuickAdd(false);
    setQuickSgpa('');
    setQuickCredits('');
    setQuickSemNumber(semesters.length + 2);
    showToast(`Semester ${quickSemNumber} added to transcript.`, 'success');
  };

  const handleExtractionComplete = (result: AmsExtractionResult) => {
    setCurrentExtraction(result);
  };

  const handleReviewConfirm = (
    confirmedInfo: AmsStudentInfo,
    confirmedSubjects: AmsSubject[],
    auditSummary: AmsAuditSummary
  ) => {
    const semNum = confirmedInfo.semester || semesters.length + 1;
    const newSem: AmsSemesterResult = {
      id: `ams-sem-${Date.now()}`,
      semesterNumber: semNum,
      semesterLabel: `Semester ${semNum}`,
      sgpa: auditSummary.sgpa ?? 0,
      totalCredits: auditSummary.totalCredits,
      totalQualityPoints: auditSummary.totalQualityPoints,
      subjectsCount: confirmedSubjects.filter((s) => !s.isExcluded).length,
      isVerified: true,
      verified: true,
      subjects: confirmedSubjects,
      studentInfo: confirmedInfo,
    };

    setSemesters((prev) => [...prev, newSem]);
    setCurrentExtraction(null);
    setIsUploading(false);
    showToast(`Semester ${semNum} imported and verified from AMS.`, 'success');
  };

  const handleRemoveSemester = (id: string) => {
    setSemesters((prev) => prev.filter((s) => s.id !== id));
    showToast('Semester removed from transcript.', 'info');
  };

  const handleCopySummary = async () => {
    const lines = [
      `ACADEMIC CALCULATOR — MULTI-SEMESTER TRANSCRIPT`,
      `Student Name: ${studentName}`,
      registerNo !== '—' ? `Register No: ${registerNo}` : '',
      `Overall CGPA: ${cgpaResult.cgpa !== null ? formatFixed(cgpaResult.cgpa, 2) : '—'} / 10`,
      `Total Cumulative Credits: ${cgpaResult.totalCredits}`,
      `Total Quality Points: ${formatFixed(cgpaResult.totalQualityPoints, 2)}`,
      `Semesters Count: ${semesters.length}`,
      '',
      'Semester Breakdown:',
      ...semesters.map(
        (s) =>
          `• ${s.semesterLabel}: SGPA ${formatFixed(s.sgpa, 2)} | ${s.totalCredits} Credits | ${s.verified ? 'Verified AMS' : 'Manual'}`
      ),
      '',
      `University Academic Calculator • https://university-academic-calculator.vercel.app/`,
    ].filter(Boolean);

    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setCopied(true);
      showToast('Transcript summary copied to clipboard.', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast('Could not copy to clipboard.', 'error');
    }
  };

  const handleSaveCalculation = () => {
    try {
      saveRecentAmsImport({
        id: `ams-cgpa-${Date.now()}`,
        timestamp: Date.now(),
        calculationType: 'CGPA',
        studentName,
        registerNumber: registerNo,
        semesterLabel: `${semesters.length} Semesters`,
        score: cgpaResult.cgpa ?? 0,
        totalCredits: cgpaResult.totalCredits,
        totalQualityPoints: cgpaResult.totalQualityPoints,
        subjectCount: semesters.reduce((acc, s) => acc + (s.subjectsCount ?? (s.subjects?.length || 0)), 0),
        regulation: profile.regulation || 'VTR21',
        cgpaResult,
      });
      setIsSaved(true);
      showToast('CGPA calculation saved to Recent Imports.', 'success');
    } catch {
      showToast('Failed to save calculation.', 'error');
    }
  };

  const handleExportExcel = async () => {
    try {
      await exportTranscriptToExcel(studentName, registerNo, cgpaResult);
      showToast('Transcript exported to Excel successfully.', 'success');
    } catch {
      showToast('Failed to export Excel transcript.', 'error');
    }
  };

  const handleExportCsv = () => {
    try {
      exportTranscriptToCsv(studentName, registerNo, cgpaResult);
      showToast('Transcript exported to CSV successfully.', 'success');
    } catch {
      showToast('Failed to export CSV transcript.', 'error');
    }
  };

  // If in review stage of an uploaded file
  if (currentExtraction) {
    return (
      <AmsSideBySideReview
        initialResult={currentExtraction}
        onConfirmCalculation={handleReviewConfirm}
        onCancel={() => setCurrentExtraction(null)}
      />
    );
  }

  // If in upload modal
  if (isUploading) {
    return (
      <div className="w-full flex flex-col gap-6">
        <div className="apple-card p-6 border border-[var(--border-primary)] flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-[var(--text-primary)]">
              Import Semester Result File
            </h3>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              Upload an AMS screenshot, PDF grade sheet, or Excel/CSV file for this semester.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsUploading(false)}
            className="apple-btn-secondary text-xs h-9 px-3"
          >
            Cancel
          </button>
        </div>

        <AmsUploader onExtractionComplete={handleExtractionComplete} />
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Top Banner */}
      <div className="apple-card p-6 border border-[var(--border-primary)] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--accent)]">
              TRANSCRIPT & CGPA MODE
            </span>
            <span className="text-[var(--text-tertiary)]">•</span>
            <span className="text-xs text-[var(--text-secondary)]">Multi-Semester AMS Intelligence</span>
          </div>
          <h2 className="text-xl font-bold text-[var(--text-primary)] mt-1">
            Cumulative GPA (CGPA) Transcript
          </h2>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Import multiple semester results to verify degree-wide academic standing with exact weighted credit calculation.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setIsUploading(true)}
            className="apple-btn-primary text-xs h-9 px-3.5 gap-1.5 flex items-center font-semibold"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import Result File</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setQuickSemNumber(semesters.length + 1);
              setShowQuickAdd(true);
            }}
            className="apple-btn-secondary text-xs h-9 px-3 gap-1.5 flex items-center"
          >
            <Plus className="w-3.5 h-3.5 text-[var(--accent)]" />
            <span>Quick Add Semester</span>
          </button>
        </div>
      </div>

      {/* Main CGPA Score Card */}
      <div className="apple-card p-6 sm:p-8 border border-[var(--border-primary)] bg-[var(--surface)]">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          {/* CGPA Display */}
          <div className="flex flex-col gap-2 md:border-r border-[var(--border-secondary)] md:pr-6">
            <span className="text-xs uppercase font-bold text-[var(--text-tertiary)] tracking-wider">
              Cumulative Grade Point Average
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl sm:text-5xl font-extrabold text-[var(--text-primary)] tracking-tight font-mono">
                {cgpaResult.cgpa !== null ? formatFixed(cgpaResult.cgpa, 2) : '—'}
              </span>
              <span className="text-sm font-semibold text-[var(--text-tertiary)]">/ 10.00</span>
            </div>
            {cgpaResult.cgpa !== null && (
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-1">
                <Award className="w-4 h-4" />
                <span>{getClassification(cgpaResult.cgpa)}</span>
              </div>
            )}
          </div>

          {/* Cumulative Stats */}
          <div className="grid grid-cols-2 gap-4 md:border-r border-[var(--border-secondary)] md:pr-6">
            <div className="p-3.5 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border-secondary)] flex flex-col gap-1">
              <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)]">
                Total Credits
              </span>
              <span className="text-xl font-bold text-[var(--text-primary)] font-mono">
                {cgpaResult.totalCredits}
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border-secondary)] flex flex-col gap-1">
              <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)]">
                Credit Points
              </span>
              <span className="text-xl font-bold text-[var(--text-primary)] font-mono">
                {formatFixed(cgpaResult.totalQualityPoints, 2)}
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border-secondary)] flex flex-col gap-1 col-span-2">
              <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)]">
                Semesters Accounted
              </span>
              <span className="text-sm font-semibold text-[var(--text-primary)]">
                {semesters.length} {semesters.length === 1 ? 'Semester' : 'Semesters'}
              </span>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-col gap-2">
            <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)]">
              Transcript Actions
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleExportExcel}
                disabled={semesters.length === 0}
                className="apple-btn-secondary text-xs h-9 px-3 gap-1.5 flex items-center justify-center disabled:opacity-40"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>Excel</span>
              </button>
              <button
                type="button"
                onClick={handleExportCsv}
                disabled={semesters.length === 0}
                className="apple-btn-secondary text-xs h-9 px-3 gap-1.5 flex items-center justify-center disabled:opacity-40"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600" />
                <span>CSV</span>
              </button>
              <button
                type="button"
                onClick={handleCopySummary}
                disabled={semesters.length === 0}
                className="apple-btn-secondary text-xs h-9 px-3 gap-1.5 flex items-center justify-center disabled:opacity-40"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
              <button
                type="button"
                onClick={handleSaveCalculation}
                disabled={semesters.length === 0}
                className="apple-btn-secondary text-xs h-9 px-3 gap-1.5 flex items-center justify-center disabled:opacity-40"
              >
                <Bookmark className={`w-3.5 h-3.5 ${isSaved ? 'text-purple-500 fill-purple-500' : ''}`} />
                <span>{isSaved ? 'Saved' : 'Save'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Formula Trace Explanation */}
        {cgpaResult.calculationTrace.length > 0 && (
          <div className="mt-6 pt-5 border-t border-[var(--border-secondary)] text-xs text-[var(--text-secondary)]">
            <div className="font-semibold text-[var(--text-primary)] mb-2 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[var(--accent)]" />
              <span>Official University CGPA Formula:</span>
            </div>
            <div className="p-3 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border-secondary)] font-mono text-[11px] leading-relaxed">
              CGPA = Σ(Semester SGPA × Semester Credits) / Σ(Semester Credits)
              <br />
              CGPA = {formatFixed(cgpaResult.totalQualityPoints, 2)} / {cgpaResult.totalCredits} ={' '}
              <strong className="text-[var(--text-primary)]">{formatFixed(cgpaResult.cgpa ?? 0, 2)}</strong>
            </div>
          </div>
        )}
      </div>

      {/* Semesters Table */}
      <div className="apple-card p-6 border border-[var(--border-primary)] flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-[var(--border-secondary)] pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--accent)]">
              SEMESTER BREAKDOWN
            </span>
            <span className="text-xs text-[var(--text-secondary)]">
              ({semesters.length} {semesters.length === 1 ? 'semester' : 'semesters'} loaded)
            </span>
          </div>
        </div>

        {semesters.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[var(--bg-tertiary)] text-[var(--text-tertiary)] flex items-center justify-center">
              <Layers className="w-6 h-6" />
            </div>
            <div className="flex flex-col gap-1">
              <h4 className="text-sm font-bold text-[var(--text-primary)]">
                No Semesters Added Yet
              </h4>
              <p className="text-xs text-[var(--text-secondary)] max-w-sm">
                Import an AMS result file or quick-add your verified semester SGPAs to compute your cumulative GPA.
              </p>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <button
                type="button"
                onClick={() => setIsUploading(true)}
                className="apple-btn-primary text-xs h-9 px-4 font-semibold"
              >
                Import AMS Result File
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[var(--border-secondary)] text-[10px] uppercase tracking-wider text-[var(--text-tertiary)] font-bold">
                  <th className="py-2.5 px-3">Semester</th>
                  <th className="py-2.5 px-3">Subjects</th>
                  <th className="py-2.5 px-3 text-right">Credits</th>
                  <th className="py-2.5 px-3 text-right">SGPA</th>
                  <th className="py-2.5 px-3 text-right">Quality Points</th>
                  <th className="py-2.5 px-3">Source / Status</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-secondary)]">
                {semesters.map((sem) => (
                  <tr key={sem.id} className="hover:bg-[var(--surface-secondary)]/50 transition-colors">
                    <td className="py-3 px-3 font-semibold text-[var(--text-primary)]">
                      {sem.semesterLabel}
                    </td>
                    <td className="py-3 px-3 text-[var(--text-secondary)]">
                      {(sem.subjectsCount ?? (sem.subjects?.length || 0)) > 0
                        ? `${sem.subjectsCount ?? sem.subjects?.length} subjects`
                        : '—'}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-[var(--text-primary)] font-semibold">
                      {sem.totalCredits}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-[var(--text-primary)] font-bold">
                      {formatFixed(sem.sgpa ?? 0, 2)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-[var(--text-secondary)]">
                      {formatFixed(sem.totalQualityPoints, 2)}
                    </td>
                    <td className="py-3 px-3">
                      {sem.verified || sem.isVerified ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                          <CheckCircle2 className="w-3 h-3" /> Verified AMS
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">
                          Manual Entry
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleRemoveSemester(sem.id)}
                        className="p-1 rounded hover:bg-rose-500/10 text-[var(--text-tertiary)] hover:text-rose-600 transition-colors"
                        title="Remove semester"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick Add Semester Modal */}
      {showQuickAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm bg-[var(--surface)] border border-[var(--border-primary)] rounded-2xl p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-[var(--border-secondary)] pb-3">
              <h3 className="font-bold text-sm text-[var(--text-primary)]">
                Quick Add Semester
              </h3>
              <button
                type="button"
                onClick={() => setShowQuickAdd(false)}
                className="text-xs text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col gap-3 text-xs">
              <div>
                <label className="font-semibold text-[var(--text-secondary)] block mb-1">
                  Semester Number
                </label>
                <input
                  type="number"
                  min={1}
                  max={12}
                  value={quickSemNumber}
                  onChange={(e) => setQuickSemNumber(parseInt(e.target.value) || 1)}
                  className="apple-input w-full p-2.5 font-mono"
                />
              </div>

              <div>
                <label className="font-semibold text-[var(--text-secondary)] block mb-1">
                  Semester SGPA (0.00 – 10.00)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  max={10}
                  placeholder="e.g. 8.75"
                  value={quickSgpa}
                  onChange={(e) => setQuickSgpa(e.target.value)}
                  className="apple-input w-full p-2.5 font-mono"
                  autoFocus
                />
              </div>

              <div>
                <label className="font-semibold text-[var(--text-secondary)] block mb-1">
                  Total Semester Credits
                </label>
                <input
                  type="number"
                  step="0.5"
                  min={1}
                  max={40}
                  placeholder="e.g. 21.5"
                  value={quickCredits}
                  onChange={(e) => setQuickCredits(e.target.value)}
                  className="apple-input w-full p-2.5 font-mono"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border-secondary)]">
              <button
                type="button"
                onClick={() => setShowQuickAdd(false)}
                className="apple-btn-secondary text-xs h-9 px-3.5"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyQuickAdd}
                className="apple-btn-primary text-xs h-9 px-4 font-semibold"
              >
                Add Semester
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
