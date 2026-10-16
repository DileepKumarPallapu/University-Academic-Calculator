import React from 'react';
import { Link } from 'react-router-dom';
import {
  Calculator,
  Award,
  TrendingUp,
  Percent,
  Building2,
  ArrowRight,
  ShieldCheck,
  Calendar,
  Clock,
  FileQuestion,
} from 'lucide-react';

import { AMS_FEATURE_ENABLED } from '../config/features';

export const LandingPage: React.FC = () => {
  return (
    <div className="w-full max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 flex flex-col gap-10 sm:gap-14 animate-appleFadeIn">
      {/* 1. HERO SECTION */}
      <section className="flex flex-col items-center text-center max-w-[700px] mx-auto pt-2 sm:pt-6">
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[var(--text-primary)] leading-tight">
          Academic Calculator
        </h1>
        <p className="text-base sm:text-lg text-[var(--text-secondary)] mt-3 leading-relaxed">
          Simple academic tools for your college calculations.
        </p>

        {/* Feature Badges */}
        <div className="inline-flex items-center gap-2.5 mt-5 px-4 py-1.5 rounded-full bg-[var(--surface)] border border-[var(--border-primary)] text-xs font-medium text-[var(--text-secondary)] shadow-xs">
          <span>Works offline</span>
          <span className="text-[var(--text-tertiary)]">•</span>
          <span>100% Client-Side</span>
          <span className="text-[var(--text-tertiary)]">•</span>
          <span>No login required</span>
        </div>
      </section>

      {/* 2. FOUR MAIN CALCULATOR TOOLS */}
      <section className="flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
            Four Core Calculators
          </h2>
          <span className="text-xs text-[var(--text-tertiary)]">
            Manual calculations • Free to use
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* CALCULATOR 1: INTERNAL MARKS */}
          <div className="apple-card p-6 sm:p-7 flex flex-col justify-between gap-6 hover:shadow-md transition-shadow">
            <div className="flex flex-col gap-3">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                <Calculator className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">
                  Internal Marks
                </h3>
                <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1.5 leading-relaxed">
                  Calculate theory and integrated course internals with test conversions, assignment marks, and lab assessments according to your regulation formula.
                </p>
              </div>
            </div>

            <Link
              to="/internals"
              className="apple-btn-primary text-xs h-10 px-5 gap-2 font-semibold justify-between w-full"
            >
              <span>Open Calculator</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* CALCULATOR 2: SGPA CALCULATOR */}
          <div className="apple-card p-6 sm:p-7 flex flex-col justify-between gap-6 hover:shadow-md transition-shadow">
            <div className="flex flex-col gap-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Award className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">
                  SGPA Calculator
                </h3>
                <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1.5 leading-relaxed">
                  Calculate your Semester Grade Point Average. Select your college regulation (VTR15, VTR18, VTR21, VTR25) and enter subject credits and grades.
                </p>
              </div>
            </div>

            <Link
              to="/gpa"
              className="apple-btn-primary text-xs h-10 px-5 gap-2 font-semibold justify-between w-full"
            >
              <span>Open Calculator</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* CALCULATOR 3: CGPA CALCULATOR */}
          <div className="apple-card p-6 sm:p-7 flex flex-col justify-between gap-6 hover:shadow-md transition-shadow">
            <div className="flex flex-col gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">
                  CGPA Calculator
                </h3>
                <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1.5 leading-relaxed">
                  Calculate your Cumulative Grade Point Average weighted across completed semesters with respective semester credit weights.
                </p>
              </div>
            </div>

            <Link
              to="/cgpa"
              className="apple-btn-primary text-xs h-10 px-5 gap-2 font-semibold justify-between w-full"
            >
              <span>Open Calculator</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* CALCULATOR 4: ATTENDANCE CALCULATOR */}
          <div className="apple-card p-6 sm:p-7 flex flex-col justify-between gap-6 hover:shadow-md transition-shadow">
            <div className="flex flex-col gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Percent className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">
                  Attendance Calculator
                </h3>
                <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1.5 leading-relaxed">
                  Enter official total sessions and present sessions. Calculates your percentage strictly capped at 100% and projects future class requirements.
                </p>
              </div>
            </div>

            <Link
              to="/attendance"
              className="apple-btn-primary text-xs h-10 px-5 gap-2 font-semibold justify-between w-full"
            >
              <span>Open Calculator</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* 3. SEPARATE, CLEARLY NAMED SECTION: ACADEMIC INTELLIGENCE & SIMULATOR */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
            Academic Intelligence & Simulator
          </span>
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
            Analytics Suite
          </span>
        </div>

        <div className="rounded-3xl border border-[var(--border-primary)] bg-[var(--surface)] p-6 sm:p-8 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-start gap-4 sm:gap-5">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md">
              <TrendingUp className="w-7 h-7" />
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">
                  Academic Intelligence & What-If Simulator
                </h3>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-purple-500/10 text-purple-600 dark:text-purple-400">
                  Analytics • Goal Planning
                </span>
              </div>

              <div className="text-sm font-semibold text-[var(--text-primary)]">
                Unified analytics, trajectory charts, and hypothetical grade modeling.
              </div>

              <p className="text-xs text-[var(--text-secondary)] max-w-xl leading-relaxed">
                Derive real SGPA/CGPA standings from saved calculations, simulate hypothetical semester outcomes with regulation-specific grading without mutating saved records, and calculate exact attendance recovery goals.
              </p>

              <div className="flex items-center gap-3 text-[11px] text-[var(--text-tertiary)] mt-1 flex-wrap">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  100% Client-Side Private
                </span>
                <span>•</span>
                <span>Multi-Scenario Comparison</span>
                <span>•</span>
                <span>Printable Summary</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0 w-full md:w-auto">
            <Link
              to="/intelligence"
              className="apple-btn-primary text-xs h-11 px-6 gap-2 font-semibold w-full sm:w-auto shadow-sm"
            >
              <span>Open Intelligence</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* 4. EXAM PREPARATION & REVISION PLANNER */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
            Exam Preparation & Revision Planner
          </span>
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
            Study Timetable & Tracker
          </span>
        </div>

        <div className="rounded-3xl border border-[var(--border-primary)] bg-[var(--surface)] p-6 sm:p-8 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-start gap-4 sm:gap-5">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white flex items-center justify-center shrink-0 shadow-md">
              <Calendar className="w-7 h-7" />
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">
                  Exam Countdown & Personalized Revision Planner
                </h3>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                  Timetable • Focus Timer
                </span>
              </div>

              <div className="text-sm font-semibold text-[var(--text-primary)]">
                Algorithmic study schedule generator, syllabus tracker, and pomodoro focus timer.
              </div>

              <p className="text-xs text-[var(--text-secondary)] max-w-xl leading-relaxed">
                Track upcoming exam countdowns, break down course syllabi into manageable units and topics, generate realistic daily study timetables with workload conflict detection, and record study sessions locally.
              </p>

              <div className="flex items-center gap-3 text-[11px] text-[var(--text-tertiary)] mt-1 flex-wrap">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-indigo-500" />
                  Accurate Wall-Clock Timer
                </span>
                <span>•</span>
                <span>Feasibility Conflict Detection</span>
                <span>•</span>
                <span>100% Client-Side Private</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0 w-full md:w-auto">
            <Link
              to="/exam-prep"
              className="apple-btn-primary text-xs h-11 px-6 gap-2 font-semibold w-full sm:w-auto shadow-sm"
            >
              <span>Open Exam Planner</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* 4b. SEPARATE SECTION: QUESTION BANK & MOCK EXAM CENTER */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
            Practice & Test Simulation
          </span>
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
            Mock Exam Center
          </span>
        </div>

        <div className="rounded-3xl border border-[var(--border-primary)] bg-[var(--surface)] p-6 sm:p-8 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-start gap-4 sm:gap-5">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white flex items-center justify-center shrink-0 shadow-md">
              <FileQuestion className="w-7 h-7" />
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">
                  Question Bank & Mock Exam Center
                </h3>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                  MCQ • True/False • Theory
                </span>
              </div>

              <div className="text-sm font-semibold text-[var(--text-primary)]">
                Create syllabus questions, practice timed tests, and master weak topics.
              </div>

              <p className="text-xs text-[var(--text-secondary)] max-w-xl leading-relaxed">
                Build a personal question bank with MCQs, True/False, and descriptive questions. Configure timed mock exams with customizable negative marking, autosaving countdowns, mistake revision notebooks, and topic accuracy analytics.
              </p>

              <div className="flex items-center gap-2 text-[11px] text-[var(--text-tertiary)] mt-1 flex-wrap">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-indigo-500" />
                  Real-time Simulation
                </span>
                <span>•</span>
                <span>Self-Paced Practice</span>
                <span>•</span>
                <span>Mistake Error Log</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0 w-full md:w-auto">
            <Link
              to="/mock-exams"
              className="apple-btn-primary text-xs h-11 px-6 gap-2 font-semibold w-full sm:w-auto shadow-sm"
            >
              <span>Open Exam Center</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* 5. SEPARATE, CLEARLY DISTINGUISHED ENTRY: VEL TECH AMS PORTAL */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
            College Portal Access
          </span>
          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
            AMS_FEATURE_ENABLED
              ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
              : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
          }`}>
            {AMS_FEATURE_ENABLED ? 'Separate Portal' : 'Coming Soon — Under Development'}
          </span>
        </div>

        <div className={`rounded-3xl border-2 p-6 sm:p-8 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6 ${
          AMS_FEATURE_ENABLED
            ? 'bg-gradient-to-r from-blue-50/70 via-[var(--surface)] to-indigo-50/50 dark:from-blue-950/25 dark:via-[var(--surface)] dark:to-indigo-950/25 border-blue-500/20 dark:border-blue-500/30'
            : 'bg-[var(--surface)] border-[var(--border-primary)]'
        }`}>
          <div className="flex items-start gap-4 sm:gap-5">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-md ${
              AMS_FEATURE_ENABLED
                ? 'bg-blue-600 text-white'
                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
            }`}>
              <Building2 className="w-7 h-7" />
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">
                  {AMS_FEATURE_ENABLED ? 'Vel Tech AMS Portal' : 'AMS Portal — Under Development'}
                </h3>
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                  AMS_FEATURE_ENABLED
                    ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                    : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                }`}>
                  {AMS_FEATURE_ENABLED ? 'Authorized Student Integration' : 'Coming Soon'}
                </span>
              </div>

              <div className="text-sm font-semibold text-[var(--text-primary)]">
                {AMS_FEATURE_ENABLED
                  ? 'Access your college academic information.'
                  : 'We are developing the official AMS integration.'}
              </div>

              <p className="text-xs text-[var(--text-secondary)] max-w-xl leading-relaxed">
                {AMS_FEATURE_ENABLED
                  ? 'Connect your official Vel Tech AMS account to retrieve your timetable, subject attendance, internal marks, registered courses, and published semester results into a private local dashboard.'
                  : 'We are developing the official AMS integration. This feature is temporarily unavailable. Your manual calculators are ready to use.'}
              </p>

              <div className="flex items-center gap-2 text-[11px] text-[var(--text-tertiary)] mt-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>Zero password storage • 100% private local device calculations</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0 w-full md:w-auto">
            <Link
              to="/ams-portal"
              className={
                AMS_FEATURE_ENABLED
                  ? 'apple-btn-primary text-xs h-11 px-6 gap-2 font-semibold w-full md:w-auto shadow-sm'
                  : 'apple-btn-secondary text-xs h-11 px-5 gap-2 font-medium w-full md:w-auto'
              }
            >
              <span>{AMS_FEATURE_ENABLED ? 'Open AMS Portal' : 'Under Development'}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};
