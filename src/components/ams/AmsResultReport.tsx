import React, { useState } from 'react';
import {
  Printer,
  Copy,
  Share2,
  Check,
} from 'lucide-react';
import type { AmsStudentInfo, AmsSubject, AmsAuditSummary } from '../../types/ams';
import { formatFixed } from '../../utils/calculations';
import { useAppToast } from '../layout/AppShell';

interface AmsResultReportProps {
  studentInfo: AmsStudentInfo;
  subjects: AmsSubject[];
  auditSummary: AmsAuditSummary;
  originalPreviewUrl?: string;
  onEditData: () => void;
  onReset: () => void;
  onPrint: (includeOriginal: boolean) => void;
}

export const AmsResultReport: React.FC<AmsResultReportProps> = ({
  studentInfo,
  subjects,
  auditSummary,
  originalPreviewUrl,
  onEditData,
  onReset,
  onPrint,
}) => {
  const { showToast } = useAppToast();
  const [includeOriginalInPdf, setIncludeOriginalInPdf] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);

  const formattedSgpa = auditSummary.sgpa !== null ? formatFixed(auditSummary.sgpa, 2) : '—';

  const handleCopyText = async () => {
    const lines = [
      `ACADEMIC CALCULATOR — AMS RESULT REPORT`,
      `Student Name: ${studentInfo.name || 'Student'}`,
      studentInfo.registerNumber ? `Register No: ${studentInfo.registerNumber}` : '',
      studentInfo.semester ? `Semester: Semester ${studentInfo.semester}` : '',
      studentInfo.regulation ? `Regulation: ${studentInfo.regulation}` : '',
      `SGPA: ${formattedSgpa} / 10`,
      `Total Credits: ${auditSummary.totalCredits}`,
      `Total Credit Points: ${formatFixed(auditSummary.totalQualityPoints, 2)}`,
      `Subjects Included: ${auditSummary.subjectsIncluded}`,
      `Source: Imported from AMS Result and verified by student`,
      `https://university-academic-calculator.vercel.app/`,
    ].filter(Boolean);

    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setCopied(true);
      showToast('Calculation summary copied to clipboard.', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast('Could not copy to clipboard.', 'error');
    }
  };

  const handleShare = async () => {
    const text = `SGPA: ${formattedSgpa} / 10 (Total Credits: ${auditSummary.totalCredits}) — University Academic Calculator`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'AMS Result SGPA Report',
          text,
          url: 'https://university-academic-calculator.vercel.app/',
        });
      } catch {
        // user cancelled share
      }
    } else {
      handleCopyText();
    }
  };

  return (
    <div className="w-full flex flex-col gap-6 no-print">
      {/* Top Header Card */}
      <div className="apple-card p-6 border border-[var(--border-primary)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <Check className="w-3.5 h-3.5" />
              <span>Calculation Complete</span>
            </span>
            <span className="text-[var(--text-tertiary)]">•</span>
            <span className="text-xs text-[var(--text-secondary)]">Imported from AMS result and verified</span>
          </div>
          <h2 className="text-xl font-bold text-[var(--text-primary)] mt-1">
            Official SGPA Calculation Report
          </h2>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Student: <strong>{studentInfo.name || 'Verified Student'}</strong>
            {studentInfo.registerNumber ? ` (${studentInfo.registerNumber})` : ''}
            {studentInfo.degree ? ` • ${studentInfo.degree}` : ''}
            {studentInfo.branch ? ` • ${studentInfo.branch}` : ''}
            {studentInfo.batch ? ` • Batch ${studentInfo.batch}` : ''}
            {studentInfo.resultMonthYear ? ` • ${studentInfo.resultMonthYear}` : ''}
            • Semester {studentInfo.semester || 1} • {studentInfo.regulation || 'VTR21'}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onEditData}
            className="apple-btn-secondary text-xs h-9 px-3.5"
          >
            Edit Extracted Data
          </button>
          <button
            type="button"
            onClick={onReset}
            className="apple-btn-secondary text-xs h-9 px-3.5 text-[var(--text-secondary)] hover:text-rose-600"
          >
            Import Another
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Audit Summary & Subject Breakdown (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          {/* Imported Result Summary Card */}
          <div className="apple-main-container p-6 flex flex-col gap-4">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] border-b border-[var(--border-secondary)] pb-2.5">
              Imported Result Summary & Accuracy Audit
            </span>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-[var(--surface)] border border-[var(--border-secondary)]">
                <span className="text-[10px] font-bold uppercase text-[var(--text-secondary)] block">
                  Subjects Detected
                </span>
                <span className="text-lg font-bold text-[var(--text-primary)] mt-0.5 block tabular-nums">
                  {auditSummary.subjectsDetected}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-[var(--surface)] border border-[var(--border-secondary)]">
                <span className="text-[10px] font-bold uppercase text-[var(--text-secondary)] block">
                  Subjects Included
                </span>
                <span className="text-lg font-bold text-[var(--text-primary)] mt-0.5 block tabular-nums">
                  {auditSummary.subjectsIncluded}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-[var(--surface)] border border-[var(--border-secondary)]">
                <span className="text-[10px] font-bold uppercase text-[var(--text-secondary)] block">
                  Credit-bearing
                </span>
                <span className="text-lg font-bold text-[var(--text-primary)] mt-0.5 block tabular-nums">
                  {auditSummary.creditBearingCount}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-[var(--surface)] border border-[var(--border-secondary)]">
                <span className="text-[10px] font-bold uppercase text-[var(--text-secondary)] block">
                  Non-credit (0 Cr)
                </span>
                <span className="text-lg font-bold text-[var(--text-primary)] mt-0.5 block tabular-nums">
                  {auditSummary.nonCreditCount}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-[var(--surface)] border border-[var(--border-secondary)]">
                <span className="text-[10px] font-bold uppercase text-[var(--text-secondary)] block">
                  Duplicates Excluded
                </span>
                <span className="text-lg font-bold text-[var(--text-primary)] mt-0.5 block tabular-nums">
                  {auditSummary.duplicatesExcluded}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-[var(--surface)] border border-[var(--border-secondary)]">
                <span className="text-[10px] font-bold uppercase text-[var(--text-secondary)] block">
                  Data Status
                </span>
                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-1 block">
                  Verified ✓
                </span>
              </div>
            </div>

            {/* Provenance Audit Details */}
            <div className="p-3.5 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-secondary)] flex flex-col gap-2 text-xs">
              <span className="font-bold text-[var(--text-primary)]">Data Provenance Summary</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                <div className="flex flex-col gap-1">
                  <span className="font-semibold text-[var(--text-secondary)]">Auto-Detected from Document:</span>
                  <span className="text-[var(--text-primary)]">
                    {auditSummary.fieldsDetectedAutomatically?.join(', ') || 'Student Info, Subject Codes, Titles, Grades'}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="font-semibold text-[var(--text-secondary)]">User Verified / Entered:</span>
                  <span className="text-[var(--text-primary)]">
                    {auditSummary.fieldsEnteredByUser?.join(', ') || 'Course Credits, Regulation'}
                  </span>
                </div>
              </div>
            </div>

            {auditSummary.duplicatesExcluded > 0 && (
              <div className="p-3 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-secondary)] text-xs text-[var(--text-secondary)]">
                <strong>Duplicate Audit:</strong> {auditSummary.duplicatesExcluded} duplicate subject {auditSummary.duplicatesExcluded === 1 ? 'record was' : 'records were'} detected and safely excluded from calculation to avoid double-counting.
              </div>
            )}
          </div>

          {/* Subject Breakdown List */}
          <div className="apple-main-container p-6 flex flex-col gap-3">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] border-b border-[var(--border-secondary)] pb-2.5">
              Subject Contribution Breakdown
            </span>

            <div className="flex flex-col divide-y divide-[var(--border-secondary)] text-xs">
              {subjects
                .filter((s) => !s.isExcluded)
                .map((s) => {
                  const c = Number(s.credits) || 0;
                  const gp = s.gradePoint ?? 0;
                  const cp = c * gp;

                  return (
                    <div key={s.id} className="py-2.5 flex items-center justify-between gap-3">
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-2">
                          {s.subjectCode && (
                            <span className="font-mono font-bold text-[var(--text-primary)]">
                              {s.subjectCode}
                            </span>
                          )}
                          <span className="font-medium text-[var(--text-primary)] truncate">
                            {s.subjectName}
                          </span>
                        </div>
                        <span className="text-[11px] text-[var(--text-secondary)]">
                          {c} {c === 1 ? 'Credit' : 'Credits'} • Grade {s.grade} (GP: {gp})
                          {c === 0 && ' • Non-credit course'}
                        </span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-mono font-bold text-sm text-[var(--text-primary)]">
                          {cp.toFixed(1)}
                        </span>
                        <span className="text-[10px] text-[var(--text-tertiary)] block">
                          Credit Pts
                        </span>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>

        {/* Right Result Card (5 cols) */}
        <div className="lg:col-span-5 lg:sticky lg:top-24 flex flex-col gap-5">
          <div className="apple-result-card flex flex-col gap-6">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                SEMESTER GPA
              </span>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-[48px] sm:text-[60px] font-bold tracking-tight text-[var(--text-primary)] tabular-nums leading-none">
                  {formattedSgpa}
                </span>
                <span className="text-xl font-semibold text-[var(--text-secondary)]">
                  / 10
                </span>
              </div>
              <p className="text-sm font-medium text-[var(--text-secondary)] mt-2">
                Semester Grade Point Average ({studentInfo.regulation || 'VTR21'})
              </p>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 gap-4 border-t border-[var(--border-primary)] pt-4">
              <div>
                <span className="text-xs text-[var(--text-secondary)] font-medium">
                  Total Credits
                </span>
                <div className="text-[20px] font-bold text-[var(--text-primary)] mt-1 tabular-nums">
                  {auditSummary.totalCredits}
                </div>
              </div>
              <div>
                <span className="text-xs text-[var(--text-secondary)] font-medium">
                  Quality Points
                </span>
                <div className="text-[20px] font-bold text-[var(--text-primary)] mt-1 tabular-nums">
                  {formatFixed(auditSummary.totalQualityPoints, 2)}
                </div>
              </div>
            </div>

            {/* Step-by-Step Formula Breakdown Box */}
            <div className="rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-primary)] p-4 text-xs font-mono leading-relaxed flex flex-col gap-2">
              <div className="flex items-center justify-between border-b border-[var(--border-secondary)] pb-1.5">
                <strong className="text-[12px] text-[var(--text-primary)]">SGPA Step-by-Step Breakdown:</strong>
                <span className="text-[10px] text-[var(--text-tertiary)]">{studentInfo.regulation}</span>
              </div>
              <div className="text-[11px] text-[var(--text-secondary)]">
                Formula: SGPA = Σ (Credits × Grade Point) ÷ Σ (Credits)
              </div>
              <div className="text-[11px] text-[var(--text-primary)] bg-[var(--surface)] p-2.5 rounded-lg border border-[var(--border-secondary)] max-h-28 overflow-y-auto break-words leading-loose">
                {subjects
                  .filter((s) => !s.isExcluded)
                  .map((s) => `(${s.credits || 0} × ${s.gradePoint ?? 0})`)
                  .join(' + ')}
              </div>
              <div className="text-xs font-semibold text-[var(--text-primary)] pt-1">
                = {formatFixed(auditSummary.totalQualityPoints, 2)} Quality Points ÷ {auditSummary.totalCredits} Credits = <span className="font-bold text-[var(--accent)] text-sm">{formattedSgpa}</span>
              </div>
              {auditSummary.nonCreditCount > 0 && (
                <div className="text-[10px] text-[var(--text-tertiary)] italic">
                  * {auditSummary.nonCreditCount} non-credit course(s) with 0 credits contribute 0 points and are excluded from the denominator.
                </div>
              )}
            </div>

            {/* Appendix Option for PDF (Section 33 & 34) */}
            {originalPreviewUrl && (
              <label className="flex items-start gap-2.5 p-3 rounded-xl bg-[var(--surface)] border border-[var(--border-secondary)] text-xs text-[var(--text-primary)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeOriginalInPdf}
                  onChange={(e) => setIncludeOriginalInPdf(e.target.checked)}
                  className="mt-0.5 rounded cursor-pointer"
                />
                <div className="flex flex-col">
                  <span className="font-semibold">Include Original Result in PDF Report</span>
                  <span className="text-[11px] text-[var(--text-secondary)]">
                    Appends original AMS screenshot / PDF page as an official appendix.
                  </span>
                </div>
              </label>
            )}

            {/* Print Button */}
            <button
              type="button"
              onClick={() => onPrint(includeOriginalInPdf)}
              className="apple-btn-primary w-full text-sm h-11 gap-2 font-semibold"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Save PDF Report</span>
            </button>

            {/* Copy & Share Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleCopyText}
                className="apple-btn-secondary text-xs h-10 gap-1.5"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
              <button
                type="button"
                onClick={handleShare}
                className="apple-btn-secondary text-xs h-10 gap-1.5"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Share</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
