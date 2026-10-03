import React, { useMemo } from 'react';
import { getFormattedCurrentDate, generateReportId } from '../../utils/date';
import { PrintQRCode } from '../common/PrintQRCode';
import { formatFixed } from '../../utils/calculations';
import type { AmsStudentInfo, AmsSubject, AmsAuditSummary } from '../../types/ams';

const GithubIcon: React.FC<{ className?: string }> = ({ className = 'w-3 h-3' }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);

const LinkedinIcon: React.FC<{ className?: string }> = ({ className = 'w-3 h-3' }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect width="4" height="12" x="2" y="9" />
    <circle cx="4" cy="4" r="2" />
  </svg>
);

interface AmsPrintReportProps {
  studentInfo: AmsStudentInfo;
  subjects: AmsSubject[];
  auditSummary: AmsAuditSummary;
  originalPreviewUrl?: string;
  includeOriginalInPdf?: boolean;
}

export const AmsPrintReport: React.FC<AmsPrintReportProps> = ({
  studentInfo,
  subjects,
  auditSummary,
  originalPreviewUrl,
  includeOriginalInPdf = true,
}) => {
  const currentDate = useMemo(() => getFormattedCurrentDate(), []);
  const reportId = useMemo(() => generateReportId('AMS'), []);

  const formattedSgpa = auditSummary.sgpa !== null ? formatFixed(auditSummary.sgpa, 2) : '—';
  const includedSubjects = subjects.filter((s) => !s.isExcluded);

  return (
    <div className="hidden print:block font-sans text-black bg-white p-0 m-0 w-full max-w-[210mm] mx-auto text-[11px] leading-normal print:visible">
      {/* Page 1: Academic Calculation Report */}
      <div className="min-h-[297mm] flex flex-col justify-between p-6 sm:p-8">
        <div className="flex flex-col gap-4">
          {/* Header */}
          <div className="flex justify-between items-start border-b border-black/40 pb-4">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold tracking-widest uppercase text-black/70">
                Academic Calculator
              </span>
              <h1 className="text-xl font-bold tracking-tight text-black m-0">
                AMS RESULT → SGPA REPORT
              </h1>
              <span className="text-[11px] font-medium text-black/60">
                Official Academic Calculation • Extracted from Examination Result
              </span>
            </div>

            {/* QR Code and Report ID */}
            <div className="flex flex-col items-end gap-1">
              <div className="w-[22mm] h-[22mm] min-w-[22mm] min-h-[22mm] flex items-center justify-center p-1 bg-white border border-black/30 rounded">
                <PrintQRCode
                  url="https://university-academic-calculator.vercel.app/"
                />
              </div>
              <span className="font-mono text-[9px] text-black/70 font-semibold tracking-wider">
                {reportId}
              </span>
            </div>
          </div>

          {/* Student & Import Information Grid */}
          <div className="grid grid-cols-2 gap-4 border border-black/20 rounded-md p-3.5 bg-black/[0.02]">
            {/* Student Details */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-black/70 border-b border-black/10 pb-1">
                Student Information
              </span>
              <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px] pt-1">
                <span className="text-black/60 font-medium">Student Name:</span>
                <span className="font-bold text-black">{studentInfo.name || 'Verified Student'}</span>

                <span className="text-black/60 font-medium">Register No:</span>
                <span className="font-mono font-bold text-black">{studentInfo.registerNumber || '—'}</span>

                {(studentInfo.degree || studentInfo.branch) && (
                  <>
                    <span className="text-black/60 font-medium">Degree & Branch:</span>
                    <span className="font-semibold text-black">
                      {[studentInfo.degree, studentInfo.branch].filter(Boolean).join(' - ')}
                    </span>
                  </>
                )}

                {(studentInfo.batch || studentInfo.resultMonthYear) && (
                  <>
                    <span className="text-black/60 font-medium">Batch / Period:</span>
                    <span className="font-semibold text-black">
                      {[studentInfo.batch, studentInfo.resultMonthYear].filter(Boolean).join(' • ')}
                    </span>
                  </>
                )}

                <span className="text-black/60 font-medium">Semester:</span>
                <span className="font-semibold text-black">Semester {studentInfo.semester || 1}</span>

                <span className="text-black/60 font-medium">Regulation:</span>
                <span className="font-bold text-black">{studentInfo.regulation || 'VTR21'}</span>
              </div>
            </div>

            {/* Import Metadata */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-black/70 border-b border-black/10 pb-1">
                Import & Verification Details
              </span>
              <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px] pt-1">
                <span className="text-black/60 font-medium">Source Document:</span>
                <span className="font-semibold text-black">AMS Result Document</span>

                <span className="text-black/60 font-medium">Imported & Verified:</span>
                <span className="font-mono text-black">{currentDate}</span>

                <span className="text-black/60 font-medium">Subjects Detected:</span>
                <span className="font-mono font-semibold text-black">{auditSummary.subjectsDetected}</span>

                <span className="text-black/60 font-medium">Duplicates Excluded:</span>
                <span className="font-mono font-semibold text-black">{auditSummary.duplicatesExcluded}</span>

                <span className="text-black/60 font-medium">Verification Status:</span>
                <span className="font-semibold text-black">User Confirmed ✓</span>
              </div>
            </div>
          </div>

          {/* Subject Breakdown Table */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-black/80">
              Subject Breakdown ({includedSubjects.length} Courses)
            </span>
            <table className="w-full border-collapse border border-black/30 text-left text-[10px]">
              <thead>
                <tr className="bg-black/[0.05] border-b border-black/30 font-bold uppercase text-black/80">
                  <th className="py-1.5 px-2 w-8 text-center border-r border-black/20">S.No</th>
                  <th className="py-1.5 px-2 w-20 border-r border-black/20">Code</th>
                  <th className="py-1.5 px-2 border-r border-black/20">Subject Name</th>
                  <th className="py-1.5 px-2 w-12 text-center border-r border-black/20">Result</th>
                  <th className="py-1.5 px-2 w-12 text-center border-r border-black/20">Grade</th>
                  <th className="py-1.5 px-2 w-12 text-center border-r border-black/20">GP</th>
                  <th className="py-1.5 px-2 w-14 text-center border-r border-black/20">Credits</th>
                  <th className="py-1.5 px-2 w-20 text-right">Credits × GP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/20">
                {includedSubjects.map((s, idx) => {
                  const c = Number(s.credits) || 0;
                  const gp = s.gradePoint ?? 0;
                  const cp = c * gp;

                  return (
                    <tr key={s.id} className="border-b border-black/10">
                      <td className="py-1.5 px-2 text-center border-r border-black/20 font-mono">
                        {idx + 1}
                      </td>
                      <td className="py-1.5 px-2 border-r border-black/20 font-mono font-semibold">
                        {s.subjectCode || '—'}
                      </td>
                      <td className="py-1.5 px-2 border-r border-black/20 font-medium">
                        {s.subjectName}
                        {c === 0 && (
                          <span className="text-[9px] text-black/50 ml-1.5 italic">
                            (Non-credit)
                          </span>
                        )}
                      </td>
                      <td className="py-1.5 px-2 text-center border-r border-black/20 font-mono font-semibold">
                        {s.status || 'Pass'}
                      </td>
                      <td className="py-1.5 px-2 text-center border-r border-black/20 font-bold font-mono">
                        {s.grade}
                      </td>
                      <td className="py-1.5 px-2 text-center border-r border-black/20 font-mono">
                        {gp}
                      </td>
                      <td className="py-1.5 px-2 text-center border-r border-black/20 font-mono">
                        {c}
                      </td>
                      <td className="py-1.5 px-2 text-right font-mono font-bold">
                        {cp.toFixed(1)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-black/[0.04] border-t-2 border-black/40 font-bold">
                  <td colSpan={6} className="py-2 px-2 text-right border-r border-black/20 uppercase text-[9px]">
                    Total Academic Count
                  </td>
                  <td className="py-2 px-2 text-center font-mono border-r border-black/20">
                    {auditSummary.totalCredits}
                  </td>
                  <td className="py-2 px-2 text-right font-mono font-bold">
                    {formatFixed(auditSummary.totalQualityPoints, 2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Result Card Banner */}
          <div className="flex justify-between items-center border-2 border-black/60 rounded-md p-4 bg-black/[0.03]">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold uppercase tracking-wider text-black/70">
                Calculated Semester Grade Point Average
              </span>
              <span className="text-2xl font-bold tracking-tight text-black mt-0.5">
                SGPA: {formattedSgpa} / 10
              </span>
              <span className="text-[10px] text-black/60">
                Total Credits: {auditSummary.totalCredits} • Total Quality Points: {formatFixed(auditSummary.totalQualityPoints, 2)}
              </span>
            </div>

            <div className="text-right text-[10px] font-mono leading-relaxed border-l border-black/20 pl-4">
              <span className="font-bold block text-black/80">MATHEMATICAL RULE</span>
              <span>SGPA = Σ(Credits × GP) ÷ Σ(Credits)</span>
              <span className="block font-semibold">
                {formatFixed(auditSummary.totalQualityPoints, 2)} ÷ {auditSummary.totalCredits} = {formattedSgpa}
              </span>
            </div>
          </div>
        </div>

        {/* Official Print Footer */}
        <div className="w-full border-t border-black/30 pt-3 mt-4 flex flex-col gap-1.5 text-[9px] text-black/60">
          <div className="flex justify-between items-center">
            <div>
              <strong className="text-black">Academic Calculator</strong> • Developed by Pallapu Dileep Kumar (CSE Student & Developer)
            </div>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1">
                <GithubIcon className="w-2.5 h-2.5" />
                <span>GitHub</span>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <LinkedinIcon className="w-2.5 h-2.5" />
                <span>LinkedIn</span>
              </span>
            </div>
          </div>
          <div className="flex justify-between items-center text-black/40 text-[8px]">
            <span>Imported from AMS result and verified by student. No external server storage.</span>
            <span>© 2026 Pallapu Dileep Kumar. All rights reserved.</span>
          </div>
        </div>
      </div>

      {/* Page 2: Appendix - Original AMS Result (Section 33 & 34) */}
      {includeOriginalInPdf && originalPreviewUrl && (
        <div className="min-h-[297mm] flex flex-col justify-between p-6 sm:p-8 break-before-page page-break-before-always">
          <div className="flex flex-col gap-4">
            <div className="flex justify-between items-center border-b border-black/40 pb-3">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-wider text-black/70">
                  APPENDIX • SOURCE ATTACHMENT
                </span>
                <h2 className="text-base font-bold text-black m-0">
                  ORIGINAL AMS EXAMINATION RESULT
                </h2>
              </div>
              <span className="text-[10px] font-mono text-black/60">
                {reportId}
              </span>
            </div>

            <p className="text-[10px] text-black/60 italic">
              Original uploaded document attached as an official verification appendix. Preserved without modification.
            </p>

            <div className="w-full max-h-[230mm] border border-black/30 rounded overflow-hidden flex items-center justify-center p-2 bg-black/[0.01]">
              <img
                src={originalPreviewUrl}
                alt="Original AMS Examination Result"
                className="max-h-[220mm] max-w-full object-contain"
              />
            </div>
          </div>

          <div className="w-full border-t border-black/30 pt-2 text-[8px] text-black/40 flex justify-between items-center">
            <span>Appendix: Original Source AMS Document</span>
            <span>Report ID: {reportId}</span>
          </div>
        </div>
      )}
    </div>
  );
};
