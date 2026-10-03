import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Calculator, Award, Layers, Clock, ShieldCheck, Trash2 } from 'lucide-react';
import { AcademicSummaryCard } from '../components/common/AcademicSummaryCard';
import { RecentCalculationsList } from '../components/common/RecentCalculationsList';
import { ResetConfirmModal } from '../components/common/ResetConfirmModal';
import { clearAllLocalAcademicData } from '../utils/recentCalculations';
import { useAppToast } from '../components/layout/AppShell';

export const LandingPage: React.FC = () => {
  const [showClearModal, setShowClearModal] = useState(false);
  const { showToast } = useAppToast();

  const handleClearAll = () => {
    clearAllLocalAcademicData();
    setShowClearModal(false);
    showToast('All locally stored academic data cleared.', 'info');
  };

  return (
    <div className="apple-page-enter flex flex-col items-center gap-12 sm:gap-16 max-w-[1200px] mx-auto">
      {/* Hero Section */}
      <section className="flex flex-col items-center text-center pt-4 sm:pt-10 max-w-[600px] px-4">
        <h1 className="text-[32px] sm:text-[40px] lg:text-[48px] font-semibold tracking-tight text-[var(--text-primary)] leading-tight">
          Academic Calculator
        </h1>
        <p className="text-[17px] sm:text-[19px] text-[var(--text-secondary)] mt-3 leading-relaxed">
          Simple tools for your academic calculations.
        </p>

        {/* Feature badge */}
        <div className="inline-flex items-center gap-2 mt-4 px-3.5 py-1.5 rounded-full bg-[var(--surface)] border border-[var(--border-primary)] text-[12px] font-medium text-[var(--text-secondary)] shadow-xs">
          <span>Works offline</span>
          <span className="text-[var(--text-tertiary)]">•</span>
          <span>Mobile friendly</span>
          <span className="text-[var(--text-tertiary)]">•</span>
          <span>PDF reports</span>
        </div>

        <div className="mt-7">
          <Link to="/internals" className="apple-btn-primary gap-2.5">
            <span>Start Calculating</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* 4 Calculator Cards */}
      <section className="w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Card 1: Internal Marks */}
          <Link
            to="/internals"
            className="apple-card p-7 flex flex-col justify-between group no-underline text-inherit"
          >
            <div>
              {/* Apple Monochrome Icon Container: intentional dark container with crisp white icon */}
              <div className="w-12 h-12 rounded-[12px] bg-[#1D1D1F] dark:bg-[#2C2C2E] border border-black/10 dark:border-white/10 flex items-center justify-center text-[#FFFFFF] mb-5 shadow-sm">
                <Calculator className="w-6 h-6 text-[#FFFFFF]" />
              </div>
              <h2 className="text-[20px] font-semibold text-[var(--text-primary)] tracking-tight">
                Internal Marks
              </h2>
              <p className="text-[15px] text-[var(--text-secondary)] mt-2.5 leading-relaxed">
                Calculate theory tests (30 → 10), integrated lab (20), attendance (5) and assignments (5).
              </p>
            </div>
            <div className="mt-8 pt-4 -mx-7 -mb-7 px-7 pb-5 rounded-b-[20px] border-t border-[var(--border-primary)] flex items-center justify-between text-[15px] font-medium text-[var(--text-primary)] group-hover:bg-[var(--bg-tertiary)] transition-colors">
              <span className="font-medium text-[var(--text-primary)]">Open Calculator</span>
              <ArrowRight className="w-4 h-4 text-[var(--text-primary)] transition-transform group-hover:translate-x-1" />
            </div>
          </Link>

          {/* Card 2: SGPA */}
          <Link
            to="/gpa"
            className="apple-card p-7 flex flex-col justify-between group no-underline text-inherit"
          >
            <div>
              <div className="w-12 h-12 rounded-[12px] bg-[#1D1D1F] dark:bg-[#2C2C2E] border border-black/10 dark:border-white/10 flex items-center justify-center text-[#FFFFFF] mb-5 shadow-sm">
                <Award className="w-6 h-6 text-[#FFFFFF]" />
              </div>
              <h2 className="text-[20px] font-semibold text-[var(--text-primary)] tracking-tight">
                SGPA
              </h2>
              <p className="text-[15px] text-[var(--text-secondary)] mt-2.5 leading-relaxed">
                Semester Grade Point Average based on course credits and institutional regulations.
              </p>
            </div>
            <div className="mt-8 pt-4 -mx-7 -mb-7 px-7 pb-5 rounded-b-[20px] border-t border-[var(--border-primary)] flex items-center justify-between text-[15px] font-medium text-[var(--text-primary)] group-hover:bg-[var(--bg-tertiary)] transition-colors">
              <span className="font-medium text-[var(--text-primary)]">Open Calculator</span>
              <ArrowRight className="w-4 h-4 text-[var(--text-primary)] transition-transform group-hover:translate-x-1" />
            </div>
          </Link>

          {/* Card 3: CGPA */}
          <Link
            to="/cgpa"
            className="apple-card p-7 flex flex-col justify-between group no-underline text-inherit"
          >
            <div>
              <div className="w-12 h-12 rounded-[12px] bg-[#1D1D1F] dark:bg-[#2C2C2E] border border-black/10 dark:border-white/10 flex items-center justify-center text-[#FFFFFF] mb-5 shadow-sm">
                <Layers className="w-6 h-6 text-[#FFFFFF]" />
              </div>
              <h2 className="text-[20px] font-semibold text-[var(--text-primary)] tracking-tight">
                CGPA
              </h2>
              <p className="text-[15px] text-[var(--text-secondary)] mt-2.5 leading-relaxed">
                Cumulative Grade Point Average across all semesters with strict credit weighting.
              </p>
            </div>
            <div className="mt-8 pt-4 -mx-7 -mb-7 px-7 pb-5 rounded-b-[20px] border-t border-[var(--border-primary)] flex items-center justify-between text-[15px] font-medium text-[var(--text-primary)] group-hover:bg-[var(--bg-tertiary)] transition-colors">
              <span className="font-medium text-[var(--text-primary)]">Open Calculator</span>
              <ArrowRight className="w-4 h-4 text-[var(--text-primary)] transition-transform group-hover:translate-x-1" />
            </div>
          </Link>

          {/* Card 4: Attendance */}
          <Link
            to="/attendance"
            className="apple-card p-7 flex flex-col justify-between group no-underline text-inherit"
          >
            <div>
              <div className="w-12 h-12 rounded-[12px] bg-[#1D1D1F] dark:bg-[#2C2C2E] border border-black/10 dark:border-white/10 flex items-center justify-center text-[#FFFFFF] mb-5 shadow-sm">
                <Clock className="w-6 h-6 text-[#FFFFFF]" />
              </div>
              <h2 className="text-[20px] font-semibold text-[var(--text-primary)] tracking-tight">
                Attendance
              </h2>
              <p className="text-[15px] text-[var(--text-secondary)] mt-2.5 leading-relaxed">
                Calculate percentage based on faculty sessions and plan target attendance thresholds.
              </p>
            </div>
            <div className="mt-8 pt-4 -mx-7 -mb-7 px-7 pb-5 rounded-b-[20px] border-t border-[var(--border-primary)] flex items-center justify-between text-[15px] font-medium text-[var(--text-primary)] group-hover:bg-[var(--bg-tertiary)] transition-colors">
              <span className="font-medium text-[var(--text-primary)]">Open Calculator</span>
              <ArrowRight className="w-4 h-4 text-[var(--text-primary)] transition-transform group-hover:translate-x-1" />
            </div>
          </Link>
        </div>
      </section>

      {/* Academic Summary Section */}
      <section className="w-full">
        <AcademicSummaryCard />
      </section>

      {/* Recent Calculations Section */}
      <section className="w-full">
        <RecentCalculationsList />
      </section>

      {/* How It Works Section */}
      <section className="w-full">
        <div className="text-center mb-8">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] block">
            Workflow
          </span>
          <h3 className="text-[24px] sm:text-[28px] font-semibold text-[var(--text-primary)] tracking-tight mt-1">
            How it works
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="apple-card p-6 flex flex-col gap-2.5">
            <span className="text-[24px] font-bold text-[var(--text-tertiary)] font-mono">01</span>
            <h4 className="text-[17px] font-semibold text-[var(--text-primary)]">Enter</h4>
            <p className="text-[14px] text-[var(--text-secondary)] leading-relaxed">
              Enter your academic details, course marks, credits, or session attendance.
            </p>
          </div>

          <div className="apple-card p-6 flex flex-col gap-2.5">
            <span className="text-[24px] font-bold text-[var(--text-tertiary)] font-mono">02</span>
            <h4 className="text-[17px] font-semibold text-[var(--text-primary)]">Calculate</h4>
            <p className="text-[14px] text-[var(--text-secondary)] leading-relaxed">
              Get your result instantly with transparent mathematical formulas and breakdowns.
            </p>
          </div>

          <div className="apple-card p-6 flex flex-col gap-2.5">
            <span className="text-[24px] font-bold text-[var(--text-tertiary)] font-mono">03</span>
            <h4 className="text-[17px] font-semibold text-[var(--text-primary)]">Download</h4>
            <p className="text-[14px] text-[var(--text-secondary)] leading-relaxed">
              Save a professional A4 PDF report complete with official Report ID and verification QR.
            </p>
          </div>
        </div>
      </section>

      {/* Privacy Notice & Clear Local Data */}
      <section className="w-full max-w-[760px] -mt-4 flex flex-col items-center gap-3">
        <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[var(--text-secondary)] py-3.5 px-5 rounded-2xl bg-[var(--surface)] border border-[var(--border-primary)]">
          <div className="flex items-center gap-2.5 text-left">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>
              All student data, grades, and recent calculations are stored locally in your browser. No server storage or account is required.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowClearModal(true)}
            className="text-xs font-semibold text-[var(--text-secondary)] hover:text-rose-600 flex items-center gap-1.5 whitespace-nowrap px-2.5 py-1 rounded-lg border border-[var(--border-secondary)] hover:border-rose-300 dark:hover:border-rose-800 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Local Data</span>
          </button>
        </div>
      </section>

      {/* Clear Data Confirmation Modal */}
      <ResetConfirmModal
        isOpen={showClearModal}
        onClose={() => setShowClearModal(false)}
        onConfirm={handleClearAll}
        title="Clear all local academic data?"
        description="This will permanently remove your stored academic profile, calculation history, attendance logs, and local preferences from this device."
      />
    </div>
  );
};
