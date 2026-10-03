import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Calculator, Award, Layers, Clock, ShieldCheck } from 'lucide-react';
import { RecentCalculationsList } from '../components/common/RecentCalculationsList';

export const LandingPage: React.FC = () => {
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

        <div className="mt-8">
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

      {/* Recent Calculations Section */}
      <section className="w-full">
        <RecentCalculationsList />
      </section>

      {/* Privacy Notice */}
      <section className="w-full max-w-[700px] -mt-4">
        <div className="flex items-center justify-center gap-2.5 text-xs text-[var(--text-secondary)] text-center py-3 px-5 rounded-xl bg-[var(--surface)] border border-[var(--border-primary)]">
          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>Your calculations are processed locally in your browser. No account is required.</span>
        </div>
      </section>
    </div>
  );
};
