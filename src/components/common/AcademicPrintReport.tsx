import React from 'react';
import { getFormattedCurrentDate } from '../../utils/date';

interface MetaItem {
  label: string;
  value: string | number;
}

interface AcademicPrintReportProps {
  reportTitle?: string;
  calculatorName: string;
  studentName?: string;
  regulation?: string;
  semester?: string | number;
  calculationType?: string;
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
  regulation,
  semester,
  calculationType,
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
  const displayName = studentName.trim() || 'Student';

  // Details for Student Information table
  const infoRows: { label: string; value: React.ReactNode; isPrimary?: boolean }[] = [
    {
      label: 'Student Name',
      value: displayName,
      isPrimary: true,
    },
    {
      label: 'Calculator',
      value: calculatorName,
    },
    ...(regulation
      ? [
          {
            label: 'Regulation',
            value: regulation,
          },
        ]
      : []),
    ...(semester
      ? [
          {
            label: 'Semester',
            value: typeof semester === 'number' ? `Semester ${semester}` : semester,
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
    {
      label: 'Date',
      value: currentDate,
    },
  ];

  return (
    <div className="hidden print:block w-full bg-white text-[#1D1D1F] p-0 m-0 print-report-container">
      {/* 1. Header: Brand & Document Category */}
      <header className="border-b border-[#D2D2D7] pb-3 mb-5">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-[24px] font-bold text-[#1D1D1F] tracking-tight leading-tight uppercase">
              Academic Calculator
            </h1>
            <p className="text-[13px] font-semibold text-[#6E6E73] uppercase tracking-wide mt-0.5">
              {reportTitle}
            </p>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-bold text-[#86868B] uppercase tracking-wider block">
              Official Academic Report
            </span>
            <span className="text-[12px] font-semibold text-[#1D1D1F]">
              {currentDate}
            </span>
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

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-3.5 gap-x-6 text-[13px]">
          {/* Prominent Student Name Card in Grid */}
          <div className="col-span-2 sm:col-span-3 pb-3 border-b border-[#E5E5EA]">
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

      {/* Professional Academic Print Footer (Attribution to Developer) */}
      <footer className="mt-8 pt-4 border-t border-[#D2D2D7] text-[11px] text-[#6E6E73] flex flex-col gap-2 break-inside-avoid">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <div>
            <span className="font-semibold text-[#1D1D1F]">Academic Calculator</span>
            <span className="mx-1.5">•</span>
            <span>Developed by <strong className="text-[#1D1D1F] font-semibold">Pallapu Dileep Kumar</strong> (CSE Student • Developer)</span>
          </div>
          <div className="text-[#86868B]">
            Generated on {currentDate}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px]">
          <div>
            <span className="font-medium text-[#6E6E73]">GitHub: </span>
            <span className="text-[#1D1D1F] font-mono">https://github.com/DileepKumarPallapu</span>
          </div>
          <div>
            <span className="font-medium text-[#6E6E73]">LinkedIn: </span>
            <span className="text-[#1D1D1F] font-mono">https://www.linkedin.com/in/dileep-kumar-pallapu</span>
          </div>
        </div>

        <div className="pt-2 border-t border-[#E5E5EA] flex justify-between items-center text-[10px] text-[#86868B]">
          <span>© 2026 Pallapu Dileep Kumar. All rights reserved.</span>
          <span>A4 Academic Calculation Report</span>
        </div>
      </footer>
    </div>
  );
};
