import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Sparkles,
  Award,
  TrendingUp,
  Percent,
  Layers,
  Clock,
  Printer,
  ChevronRight,
  BookOpen,
  FileText,
  Activity,
  Calculator,
} from 'lucide-react';
import { useProfile } from '../context/ProfileContext';
import { getCalculationsByProfile } from '../services/db';
import {
  getAcademicIntelligenceMetrics,
  type AcademicIntelligenceMetrics,
} from '../utils/academicIntelligence';
import { WhatIfGpaSimulator } from '../components/intelligence/WhatIfGpaSimulator';
import { AttendanceGoalPlanner } from '../components/intelligence/AttendanceGoalPlanner';
import type { SavedCalculation } from '../types/profile';

type TabMode = 'overview' | 'simulator' | 'attendance' | 'reports';

export const AcademicIntelligencePage: React.FC = () => {
  const { activeProfile } = useProfile();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = (searchParams.get('tab') as TabMode) || 'overview';
  const [activeTab, setActiveTab] = useState<TabMode>(tabParam);

  const [savedCalcs, setSavedCalcs] = useState<SavedCalculation[]>([]);

  // Sync tab param
  useEffect(() => {
    if (searchParams.get('tab')) {
      setActiveTab(searchParams.get('tab') as TabMode);
    }
  }, [searchParams]);

  const handleTabChange = (tab: TabMode) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  useEffect(() => {
    getCalculationsByProfile(activeProfile.id).then((calcs) => {
      setSavedCalcs(calcs);
    });
  }, [activeProfile.id]);

  const metrics: AcademicIntelligenceMetrics = getAcademicIntelligenceMetrics(
    activeProfile,
    savedCalcs
  );

  return (
    <div className="apple-page-enter flex flex-col gap-6 w-full print:hidden">
      {/* 1. Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border-secondary)] pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-black/5 dark:bg-white/10 text-[var(--text-secondary)]">
              {activeProfile.name} • {activeProfile.regulation}
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400">
              Academic Intelligence
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--text-primary)]">
            Academic Analytics & Simulator
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1">
            Real-time standing derived strictly from your saved local records and hypothetical sandbox.
          </p>
        </div>

        {/* Action Button: Print / Export */}
        <div className="flex items-center gap-2.5">
          <Link
            to="/reports"
            className="apple-btn-secondary text-xs h-10 px-4 gap-2 font-semibold shadow-xs"
          >
            <Printer className="w-4 h-4" />
            <span>Generate Official Report</span>
          </Link>
        </div>
      </div>

      {/* 2. Navigation Tabs */}
      <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-secondary)] overflow-x-auto">
        <button
          type="button"
          onClick={() => handleTabChange('overview')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl transition-all whitespace-nowrap ${
            activeTab === 'overview'
              ? 'bg-[var(--surface)] text-[var(--text-primary)] shadow-sm'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Dashboard Overview</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('simulator')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl transition-all whitespace-nowrap ${
            activeTab === 'simulator'
              ? 'bg-[var(--surface)] text-[var(--text-primary)] shadow-sm'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>What-If GPA Simulator</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('attendance')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl transition-all whitespace-nowrap ${
            activeTab === 'attendance'
              ? 'bg-[var(--surface)] text-[var(--text-primary)] shadow-sm'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Attendance Goal Planner</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('reports')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl transition-all whitespace-nowrap ${
            activeTab === 'reports'
              ? 'bg-[var(--surface)] text-[var(--text-primary)] shadow-sm'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Academic Reports</span>
        </button>
      </div>

      {/* 3. Tab Contents */}
      {activeTab === 'overview' && (
        <div className="flex flex-col gap-8">
          {/* Top 4 KPI Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* KPI 1: SGPA */}
            <div className="apple-card p-5 flex flex-col justify-between gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                  Current SGPA
                </span>
                <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Award className="w-4 h-4" />
                </div>
              </div>
              <div>
                <span className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] tabular-nums">
                  {metrics.sgpaDisplay}
                </span>
                <p className="text-[11px] text-[var(--text-secondary)] mt-1">
                  {metrics.currentSgpa !== null
                    ? `Semester ${metrics.currentSemester} • ${metrics.regulation}`
                    : 'No saved semester calculation'}
                </p>
              </div>
              <Link
                to="/gpa"
                className="text-xs text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-1 hover:underline pt-1"
              >
                <span>Calculate SGPA</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* KPI 2: CGPA */}
            <div className="apple-card p-5 flex flex-col justify-between gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                  Cumulative CGPA
                </span>
                <div className="w-7 h-7 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div>
                <span className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] tabular-nums">
                  {metrics.cgpaDisplay}
                </span>
                <p className="text-[11px] text-[var(--text-secondary)] mt-1">
                  {metrics.currentCgpa !== null
                    ? `Weighted across completed terms`
                    : 'No saved CGPA record'}
                </p>
              </div>
              <Link
                to="/cgpa"
                className="text-xs text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-1 hover:underline pt-1"
              >
                <span>Calculate CGPA</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* KPI 3: Attendance */}
            <div className="apple-card p-5 flex flex-col justify-between gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                  Attendance Standing
                </span>
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <Percent className="w-4 h-4" />
                </div>
              </div>
              <div>
                <span className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] tabular-nums">
                  {metrics.attendanceDisplay}
                </span>
                <p className="text-[11px] text-[var(--text-secondary)] mt-1">
                  {metrics.overallAttendancePercentage !== null
                    ? `${metrics.totalAttendedSessions} of ${metrics.totalConductedSessions} sessions attended`
                    : 'No attendance records logged'}
                </p>
              </div>
              <Link
                to="/attendance"
                className="text-xs text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-1 hover:underline pt-1"
              >
                <span>Log Attendance</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* KPI 4: Credits Progress */}
            <div className="apple-card p-5 flex flex-col justify-between gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                  Degree Credits
                </span>
                <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <Layers className="w-4 h-4" />
                </div>
              </div>
              <div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] tabular-nums">
                    {metrics.earnedCredits}
                  </span>
                  <span className="text-xs text-[var(--text-secondary)] font-semibold">
                    / {metrics.targetCredits} Earned
                  </span>
                </div>
                <div className="w-full bg-[var(--border-secondary)] rounded-full h-1.5 mt-2 overflow-hidden">
                  <div
                    className="bg-blue-600 h-1.5 rounded-full transition-all duration-500"
                    style={{ width: `${metrics.completionPercentage}%` }}
                  />
                </div>
              </div>
              <Link
                to="/credits"
                className="text-xs text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-1 hover:underline pt-1"
              >
                <span>Manage Credits</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Empty State Banner if student has zero records */}
          {!metrics.hasAnyData && (
            <div className="apple-card p-8 sm:p-12 text-center flex flex-col items-center justify-center gap-4 border-dashed border-2">
              <div className="w-14 h-14 rounded-2xl bg-[var(--bg-secondary)] flex items-center justify-center text-[var(--text-tertiary)]">
                <BookOpen className="w-7 h-7" />
              </div>
              <div className="max-w-md">
                <h3 className="text-lg font-bold text-[var(--text-primary)]">
                  Your Academic Records Are Clean & Empty
                </h3>
                <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1.5 leading-relaxed">
                  Start using any of the four core calculators or credit planners. All derived analytics, SGPA charts, and attendance projections will update automatically.
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 mt-2">
                <Link to="/internals" className="apple-btn-secondary text-xs h-9 px-4">
                  Internals Calculator
                </Link>
                <Link to="/gpa" className="apple-btn-secondary text-xs h-9 px-4">
                  SGPA Calculator
                </Link>
                <Link to="/attendance" className="apple-btn-secondary text-xs h-9 px-4">
                  Attendance Calculator
                </Link>
                <button
                  type="button"
                  onClick={() => handleTabChange('simulator')}
                  className="apple-btn-primary text-xs h-9 px-4 gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Try What-If Simulator</span>
                </button>
              </div>
            </div>
          )}

          {/* Section: Semester-wise Performance Chart */}
          <div className="apple-card p-6 sm:p-8 flex flex-col gap-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--border-secondary)] pb-4">
              <div>
                <h3 className="text-lg font-bold text-[var(--text-primary)]">
                  Semester Performance Trajectory
                </h3>
                <p className="text-xs text-[var(--text-secondary)]">
                  Historical SGPA progression and cumulative standing across saved terms.
                </p>
              </div>
              {metrics.semesterPerformance.length > 0 && (
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 self-start sm:self-auto">
                  {metrics.semesterPerformance.length} Semesters Recorded
                </span>
              )}
            </div>

            {metrics.semesterPerformance.length === 0 ? (
              <div className="py-10 text-center text-xs text-[var(--text-tertiary)] flex flex-col items-center gap-2">
                <span>No saved semester calculations available to plot trajectory.</span>
                <Link
                  to="/gpa"
                  className="text-blue-600 dark:text-blue-400 font-semibold hover:underline"
                >
                  Save your first SGPA calculation →
                </Link>
              </div>
            ) : (
              <div className="flex flex-col gap-6 pt-2">
                {/* Visual Accessible Bar Chart */}
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-3 items-end min-h-[160px] pt-6 pb-2">
                  {metrics.semesterPerformance.map((item) => {
                    const heightPct = Math.min(100, Math.max(15, (item.sgpa / 10) * 100));
                    return (
                      <div
                        key={item.semester}
                        className="flex flex-col items-center gap-2 group relative"
                      >
                        <span className="text-xs font-bold text-[var(--text-primary)] font-mono tabular-nums">
                          {item.sgpa.toFixed(2)}
                        </span>
                        <div className="w-full max-w-[48px] bg-[var(--bg-secondary)] rounded-xl h-36 flex items-end p-1.5 border border-[var(--border-secondary)]">
                          <div
                            className="w-full bg-gradient-to-t from-blue-600 to-indigo-500 rounded-lg transition-all duration-500 group-hover:brightness-110"
                            style={{ height: `${heightPct}%` }}
                          />
                        </div>
                        <span className="text-[11px] font-semibold text-[var(--text-secondary)]">
                          Sem {item.semester}
                        </span>

                        {/* Tooltip on hover */}
                        <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none bg-black text-white text-[10px] py-1 px-2 rounded-md shadow-md whitespace-nowrap z-10">
                          {item.credits} Credits • CGPA: {item.cgpaAfter?.toFixed(2) || '—'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Section: 2 Columns - Category Breakdown & Attendance Quick-List */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Category Credit Progress */}
            <div className="apple-card p-6 flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-[var(--border-secondary)] pb-3">
                <h4 className="text-base font-bold text-[var(--text-primary)]">
                  Credit Category Breakdown
                </h4>
                <Link
                  to="/credits"
                  className="text-xs text-blue-600 dark:text-blue-400 font-semibold hover:underline"
                >
                  View Planner
                </Link>
              </div>

              {metrics.registeredCredits === 0 ? (
                <div className="py-8 text-center text-xs text-[var(--text-tertiary)]">
                  No courses added. Add subjects in the Credit Planner to track category distribution.
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {metrics.categoryBreakdown
                    .filter((c) => c.required > 0 || c.earned > 0)
                    .map((cat) => (
                      <div key={cat.category} className="flex flex-col gap-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-[var(--text-primary)]">
                            {cat.label}
                          </span>
                          <span className="font-mono text-[var(--text-secondary)]">
                            {cat.earned} / {cat.required > 0 ? cat.required : '—'} cr ({cat.percentage}%)
                          </span>
                        </div>
                        <div className="w-full bg-[var(--border-secondary)] rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-blue-600 h-1.5 rounded-full"
                            style={{ width: `${cat.percentage}%` }}
                          />
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Subject-Wise Attendance Summary */}
            <div className="apple-card p-6 flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-[var(--border-secondary)] pb-3">
                <h4 className="text-base font-bold text-[var(--text-primary)]">
                  Subject-Wise Attendance
                </h4>
                <Link
                  to="/attendance"
                  className="text-xs text-blue-600 dark:text-blue-400 font-semibold hover:underline"
                >
                  Full Tracker
                </Link>
              </div>

              {metrics.subjectWiseAttendance.length === 0 ? (
                <div className="py-8 text-center text-xs text-[var(--text-tertiary)]">
                  No subjects logged in Attendance Tracker yet.
                </div>
              ) : (
                <div className="divide-y divide-[var(--border-secondary)]">
                  {metrics.subjectWiseAttendance.map((sub) => (
                    <div
                      key={sub.id}
                      className="py-2.5 flex items-center justify-between gap-3 text-xs first:pt-0 last:pb-0"
                    >
                      <div className="flex flex-col truncate">
                        <span className="font-semibold text-[var(--text-primary)] truncate">
                          {sub.name}
                        </span>
                        <span className="text-[11px] text-[var(--text-secondary)]">
                          {sub.attended} of {sub.conducted} sessions
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-mono font-bold text-[var(--text-primary)]">
                          {sub.percentage}%
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            sub.status === 'On Track'
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                              : sub.status === 'Needs Attention'
                              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                              : 'bg-red-500/10 text-red-600 dark:text-red-400'
                          }`}
                        >
                          {sub.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Section: Recent Saved Activity */}
          <div className="apple-card p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-[var(--border-secondary)] pb-3">
              <h4 className="text-base font-bold text-[var(--text-primary)]">
                Recent Saved Academic Activity
              </h4>
              <span className="text-xs text-[var(--text-tertiary)]">
                Isolated to {activeProfile.name}
              </span>
            </div>

            {metrics.recentActivity.length === 0 ? (
              <div className="py-6 text-center text-xs text-[var(--text-tertiary)]">
                No recent activity recorded for this profile.
              </div>
            ) : (
              <div className="divide-y divide-[var(--border-secondary)]">
                {metrics.recentActivity.map((act) => (
                  <div
                    key={act.id}
                    className="py-3 flex items-center justify-between gap-4 text-xs first:pt-0 last:pb-0"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[var(--bg-secondary)] flex items-center justify-center text-[var(--text-secondary)]">
                        {act.type === 'simulation' ? (
                          <Sparkles className="w-4 h-4 text-amber-500" />
                        ) : (
                          <Calculator className="w-4 h-4 text-blue-500" />
                        )}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-semibold text-[var(--text-primary)]">
                          {act.title}
                        </span>
                        <span className="text-[11px] text-[var(--text-secondary)]">
                          {act.summary}
                        </span>
                      </div>
                    </div>
                    <span className="text-[11px] text-[var(--text-tertiary)] shrink-0 font-mono">
                      {act.dateFormatted}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: What-If Simulator */}
      {activeTab === 'simulator' && <WhatIfGpaSimulator />}

      {/* Tab: Attendance Goal Planner */}
      {activeTab === 'attendance' && <AttendanceGoalPlanner />}

      {/* Tab: Academic Reports redirect / shortcut */}
      {activeTab === 'reports' && (
        <div className="apple-card p-8 sm:p-12 text-center flex flex-col items-center justify-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <FileText className="w-7 h-7" />
          </div>
          <div className="max-w-md">
            <h3 className="text-xl font-bold text-[var(--text-primary)]">
              Academic Report Generator
            </h3>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1.5 leading-relaxed">
              Generate a printable academic performance report with student details, semester SGPA, CGPA, attendance breakdown, and credit distribution.
            </p>
          </div>
          <Link
            to="/reports"
            className="apple-btn-primary text-xs h-10 px-5 gap-2 font-semibold"
          >
            <Printer className="w-4 h-4" />
            <span>Open Report Generator</span>
          </Link>
        </div>
      )}
    </div>
  );
};
