import React, { useMemo } from 'react';
import { getFormattedCurrentDate, generateReportId } from '../../utils/date';
import { PrintQRCode } from './PrintQRCode';
import type { StudentProfile } from '../../hooks/useStudentProfile';

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

interface MetaItem {
  label: string;
  value: string | number;
}

interface AcademicPrintReportProps {
  reportTitle?: string;
  calculatorName: string;
  studentName?: string;
  profile?: StudentProfile;
  regulation?: string;
  semester?: string | number;
  calculationType?: string;
  reportType?: string;
  reportId?: string;
  metaItems?: MetaItem[];
  resultLabel: string;
  resultValue: string | number;
  resultSubtext?: string;
  formulaTitle?: string;
  formulaRule?: string;
  formulaCalculation?: string;
  isEmpty?: boolean;
  emptyNotice?: string;
  children?: React.ReactNode;
}

export const AcademicPrintReport: React.FC<AcademicPrintReportProps> = ({
  reportTitle = 'Academic Calculation Report',
  calculatorName,
  studentName = '',
  profile,
  regulation,
  semester,
  calculationType,
  reportType,
  reportId,
  metaItems = [],
  resultLabel,
  resultValue,
  resultSubtext,
  formulaTitle = 'Calculation Summary',
  formulaRule,
  formulaCalculation,
  isEmpty = false,
  emptyNotice = 'Please calculate the result before printing.',
  children,
}) => {
  const currentDate = getFormattedCurrentDate();
  const displayName = (profile?.name || studentName || '').trim() || 'Student';

  const finalReportId = useMemo(() => {
    if (reportId) return reportId;
    const typeCode = reportType || (calculatorName ? calculatorName.replace(/\s+/g, '') : 'REPORT');
    return generateReportId(typeCode);
  }, [reportId, reportType, calculatorName]);

  // Details for Student Information table
  const infoRows: { label: string; value: React.ReactNode; isPrimary?: boolean }[] = [
    {
      label: 'Student Name',
      value: displayName,
      isPrimary: true,
    },
    {
      label: 'Report ID',
      value: <span className="font-mono text-[11px] tracking-tight">{finalReportId}</span>,
    },
    {
      label: 'Generated On',
      value: currentDate,
    },
    ...(profile?.rollNumber
      ? [
          {
            label: 'Register / Roll No',
            value: profile.rollNumber,
          },
        ]
      : []),
    ...(profile?.department
      ? [
          {
            label: 'Department',
            value: profile.department,
          },
        ]
      : []),
    ...(profile?.year
      ? [
          {
            label: 'Year',
            value: profile.year,
          },
        ]
      : []),
    {
      label: 'Calculator',
      value: calculatorName,
    },
    ...(regulation || profile?.regulation
      ? [
          {
            label: 'Regulation',
            value: regulation || profile?.regulation,
          },
        ]
      : []),
    ...(semester || profile?.semester
      ? [
          {
            label: 'Semester',
            value:
              typeof semester === 'number'
                ? `Semester ${semester}`
                : semester || profile?.semester,
          },
        ]
      : []),
    ...(calculationType
      ? [
          {
            label: 'Assessment Type',
            value: calculationType,
          },
        ]
      : []),
    ...metaItems.map((m) => ({ label: m.label, value: m.value })),
  ];

  return (
    <div className="print-report-container print-report w-full bg-white text-[#1D1D1F] p-0 m-0">
      {/* Upper Content Section */}
      <div className="report-content w-full">
        {/* 1. Header: Brand, Document Category, Date, Report ID & Small Verification QR */}
        <header className="print-header border-b border-[#D2D2D7] pb-3 mb-4">
          <div className="flex justify-between items-start gap-4">
            <div>
              <h1 className="text-[22px] font-bold text-[#1D1D1F] tracking-tight leading-tight uppercase">
                Academic Calculator
              </h1>
              <p className="text-[12px] font-semibold text-[#6E6E73] uppercase tracking-wide mt-0.5">
                {reportTitle}
              </p>
            </div>

            <div className="flex items-start gap-3.5 text-right">
              <div className="flex flex-col items-end pt-0.5">
                <span className="text-[10px] font-bold text-[#86868B] uppercase tracking-wider block">
                  Official Academic Report
                </span>
                <span className="text-[11px] font-semibold text-[#1D1D1F] mt-0.5">
                  {currentDate}
                </span>
                <span className="text-[9px] text-[#86868B] font-mono tracking-wide mt-0.5">
                  {finalReportId}
                </span>
              </div>
              <PrintQRCode />
            </div>
          </div>
        </header>

        {/* 2. STUDENT INFORMATION BLOCK */}
        <section className="border border-[#D2D2D7] rounded-xl bg-[#FAFAFA] p-4 sm:p-5 mb-6 break-inside-avoid">
          <div className="border-b border-[#E5E5EA] pb-2 mb-3 flex items-center justify-between">
            <h2 className="text-[11px] font-bold uppercase tracking-wider text-[#6E6E73]">
              Student Information
            </h2>
            <span className="text-[10px] font-medium text-[#86868B] uppercase">
              Official Identification
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-y-3.5 gap-x-6 text-[13px]">
            {/* Prominent Student Name Card in Grid */}
            <div className="col-span-2 sm:col-span-3 lg:col-span-4 pb-3 border-b border-[#E5E5EA]">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6E6E73] block">
                Student Name
              </span>
              <div className="text-[19px] sm:text-[20px] font-bold text-[#1D1D1F] tracking-tight mt-0.5">
                {displayName}
              </div>
            </div>

            {/* Secondary Details */}
            {infoRows
              .filter((r) => !r.isPrimary)
              .map((row, idx) => (
                <div key={idx} className="flex flex-col">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#6E6E73]">
                    {row.label}
                  </span>
                  <span className="font-semibold text-[#1D1D1F] mt-0.5">
                    {row.value}
                  </span>
                </div>
              ))}
          </div>
        </section>

        {/* Empty State Warning if data uncalculated */}
        {isEmpty ? (
          <div className="border border-dashed border-[#D2D2D7] rounded-xl p-8 text-center my-8">
            <p className="text-[15px] font-semibold text-[#1D1D1F]">
              {emptyNotice}
            </p>
            <p className="text-[12px] text-[#6E6E73] mt-1">
              Return to the calculator on screen, enter your academic components, and click calculate.
            </p>
          </div>
        ) : (
          <>
            {/* Main Table / Assessment Components */}
            <div className="mb-6">{children}</div>

            {/* Prominent Result Block */}
            <section className="border border-[#D2D2D7] rounded-xl bg-[#FAFAFA] p-5 mb-6 print-result-box break-inside-avoid">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#6E6E73] block">
                    {resultLabel}
                  </span>
                  <div className="text-[34px] font-bold text-[#1D1D1F] tracking-tight tabular-nums mt-1 leading-none">
                    {resultValue}
                  </div>
                  {resultSubtext && (
                    <p className="text-[12px] font-medium text-[#6E6E73] mt-2">
                      {resultSubtext}
                    </p>
                  )}
                </div>

                {/* Status / Stamp badge */}
                <div className="text-right border-l border-[#D2D2D7] pl-6">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#86868B] block">
                    Status
                  </span>
                  <span className="text-[14px] font-semibold text-[#1D1D1F] block mt-1">
                    Verified Calculation
                  </span>
                  <span className="text-[11px] text-[#6E6E73] block mt-0.5">
                    University Formula Verified
                  </span>
                </div>
              </div>
            </section>

            {/* Calculation Summary Box */}
            {(formulaRule || formulaCalculation) && (
              <section className="border border-[#D2D2D7] rounded-xl p-4 mb-6 bg-[#FFFFFF] break-inside-avoid">
                <h2 className="text-[12px] font-bold uppercase tracking-wider text-[#1D1D1F] mb-1.5">
                  {formulaTitle}
                </h2>
                {formulaRule && (
                  <div className="text-[12px] text-[#6E6E73] font-mono leading-relaxed">
                    • {formulaRule}
                  </div>
                )}
                {formulaCalculation && (
                  <div className="text-[13px] font-semibold text-[#1D1D1F] font-mono mt-1 pt-1 border-t border-[#E5E5EA]">
                    Result: {formulaCalculation}
                  </div>
                )}
              </section>
            )}
          </>
        )}
      </div>

      {/* 3. Dedicated Print Footer matching Website Branding */}
      <footer className="print-footer break-inside-avoid">
        <div className="print-footer-left">
          <div className="print-footer-title">
            Academic Calculator
          </div>
          <div className="print-footer-description">
            Simple academic tools for students.
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span className="print-footer-label">
              Developed by
            </span>
            <span className="print-footer-developer">
              Pallapu Dileep Kumar
            </span>
            <span className="print-footer-role">
              CSE Student • Developer
            </span>
          </div>

          <div className="print-footer-copyright">
            © 2026 Pallapu Dileep Kumar. All rights reserved.
          </div>
        </div>

        <div className="print-footer-right">
          <div className="print-footer-connect">
            CONNECT
          </div>
          <div className="print-footer-socials">
            <a
              href="https://github.com/DileepKumarPallapu"
              target="_blank"
              rel="noopener noreferrer"
              className="print-footer-social"
            >
              <GithubIcon className="w-3 h-3 text-[#1D1D1F]" />
              <span>GitHub</span>
            </a>

            <a
              href="https://www.linkedin.com/in/dileep-kumar-pallapu"
              target="_blank"
              rel="noopener noreferrer"
              className="print-footer-social"
            >
              <LinkedinIcon className="w-3 h-3 text-[#1D1D1F]" />
              <span>LinkedIn</span>
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};
