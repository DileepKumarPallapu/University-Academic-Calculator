import React from 'react';
import { Link } from 'react-router-dom';
import {
  Clock,
  ArrowLeft,
  Calculator,
  Award,
  Layers,
  Percent,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react';

export const AmsDevelopmentNotice: React.FC = () => {
  return (
    <div className="apple-page-enter max-w-3xl mx-auto flex flex-col gap-8 py-6 sm:py-10">
      {/* Top Breadcrumb */}
      <div>
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </Link>
      </div>

      {/* Main Notice Container */}
      <div className="apple-main-container p-8 sm:p-12 flex flex-col items-center text-center gap-6 shadow-sm border border-[var(--border-primary)] bg-[var(--surface)]">
        {/* Under Development Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
          <Clock className="w-3.5 h-3.5" />
          <span>Coming Soon — Under Development</span>
        </div>

        {/* Icon & Heading */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20 shadow-xs">
            <Clock className="w-8 h-8" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)]">
            AMS Portal — Under Development
          </h1>
        </div>

        {/* Notice Message */}
        <p className="text-base sm:text-lg text-[var(--text-secondary)] max-w-xl leading-relaxed">
          We are developing the official AMS integration. This feature is temporarily unavailable. Your manual calculators are ready to use.
        </p>

        {/* Security & Privacy Guarantee */}
        <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-secondary)] text-xs text-[var(--text-secondary)] max-w-md">
          <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>All four academic calculators run 100% offline with strict private local storage on your device.</span>
        </div>

        {/* Action Buttons to 4 Main Calculators */}
        <div className="w-full pt-4 border-t border-[var(--border-secondary)] flex flex-col gap-3">
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
            Available Academic Tools
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full text-left">
            <Link
              to="/internals"
              className="p-4 rounded-xl border border-[var(--border-primary)] bg-[var(--bg-primary)] hover:border-[var(--accent)] hover:shadow-xs transition-all flex items-center gap-3.5 group"
            >
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Calculator className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-[var(--text-primary)]">
                  Internal Marks
                </div>
                <div className="text-xs text-[var(--text-secondary)] truncate">
                  Theory (40) & Integrated (50) models
                </div>
              </div>
            </Link>

            <Link
              to="/gpa"
              className="p-4 rounded-xl border border-[var(--border-primary)] bg-[var(--bg-primary)] hover:border-[var(--accent)] hover:shadow-xs transition-all flex items-center gap-3.5 group"
            >
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Award className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-[var(--text-primary)]">
                  SGPA Calculator
                </div>
                <div className="text-xs text-[var(--text-secondary)] truncate">
                  VTR15, VTR18, VTR21, VTR25 scales
                </div>
              </div>
            </Link>

            <Link
              to="/cgpa"
              className="p-4 rounded-xl border border-[var(--border-primary)] bg-[var(--bg-primary)] hover:border-[var(--accent)] hover:shadow-xs transition-all flex items-center gap-3.5 group"
            >
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Layers className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-[var(--text-primary)]">
                  CGPA Calculator
                </div>
                <div className="text-xs text-[var(--text-secondary)] truncate">
                  Cumulative credit-weighted average
                </div>
              </div>
            </Link>

            <Link
              to="/attendance"
              className="p-4 rounded-xl border border-[var(--border-primary)] bg-[var(--bg-primary)] hover:border-[var(--accent)] hover:shadow-xs transition-all flex items-center gap-3.5 group"
            >
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Percent className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-[var(--text-primary)]">
                  Attendance Calculator
                </div>
                <div className="text-xs text-[var(--text-secondary)] truncate">
                  Subject planner & extra session logic
                </div>
              </div>
            </Link>
          </div>
        </div>

        {/* Link to Official College AMS for Direct External Access */}
        <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
          <a
            href="https://ams.veltech.edu.in/"
            target="_blank"
            rel="noopener noreferrer"
            className="apple-btn-secondary text-xs h-10 px-4 gap-2 font-medium"
          >
            <span>Visit Official Vel Tech AMS</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          <Link
            to="/"
            className="apple-btn-primary text-xs h-10 px-5 gap-2 font-semibold"
          >
            <span>Return to Home</span>
          </Link>
        </div>
      </div>
    </div>
  );
};
