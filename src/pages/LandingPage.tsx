import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar,
  Percent,
  Calculator,
  Award,
  GraduationCap,
  BookOpen,
  Clock,
  Building2,
  Bookmark,
  ArrowRight,
  AlertCircle,
  X,
  Sparkles,
  ChevronRight,
  FileText,
  TrendingUp,
} from 'lucide-react';
import { useProfile } from '../context/ProfileContext';
import { useAppToast } from '../components/layout/AppShell';
import type { AcademicCompanionOverview, AcademicAlert } from '../types/academicCompanion';
import {
  getAcademicCompanionOverview,
  generateAcademicAlerts,
  dismissAlert,
} from '../services/companionStorage';

export const LandingPage: React.FC = () => {
  const { activeProfile } = useProfile();
  const { showToast } = useAppToast();

  const [overview, setOverview] = useState<AcademicCompanionOverview | null>(null);
  const [alerts, setAlerts] = useState<AcademicAlert[]>([]);

  // Load real student companion overview
  const loadOverview = async () => {
    try {
      const data = await getAcademicCompanionOverview(activeProfile);
      setOverview(data);
      const generatedAlerts = generateAcademicAlerts(activeProfile, data);
      setAlerts(generatedAlerts);
    } catch {
      // Fallback empty
    }
  };

  useEffect(() => {
    loadOverview();
  }, [activeProfile.id]);

  // Handle Dismiss Alert
  const handleDismissAlert = (alertId: string) => {
    dismissAlert(activeProfile.id, alertId);
    setAlerts((prev) => prev.filter((a) => a.id !== alertId));
    showToast('Alert dismissed.', 'info');
  };

  const displayName = activeProfile.name.trim()
    ? activeProfile.name.trim().split(' ')[0]
    : 'Student';

  return (
    <div className="w-full max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex flex-col gap-8 animate-appleFadeIn">
      {/* 1. Header / Hero Welcome */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border-secondary)] pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-black/5 dark:bg-white/10 text-[var(--text-secondary)]">
              {activeProfile.degree || 'B.Tech'} • {activeProfile.regulation} • Semester {activeProfile.currentSemester || 5}
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              Academic Companion
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-[var(--text-primary)]">
            Welcome back, {displayName}
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1 max-w-xl">
            {activeProfile.collegeName || 'Vel Tech Rangarajan Dr. Sagunthala R&D Institute'} — {activeProfile.department || activeProfile.branch || 'Engineering Framework'}
          </p>
        </div>

        {/* Quick Profile Pill */}
        <Link
          to="/profile"
          className="apple-card p-3 sm:p-3.5 flex items-center gap-3 no-underline text-inherit hover:bg-[var(--bg-tertiary)] transition-colors self-start sm:self-auto shrink-0"
        >
          <div className="w-10 h-10 rounded-xl bg-black dark:bg-white text-white dark:text-black font-bold flex items-center justify-center text-sm">
            {displayName.charAt(0)}
          </div>
          <div>
            <div className="text-xs font-bold text-[var(--text-primary)]">
              {activeProfile.name}
            </div>
            <div className="text-[11px] text-[var(--text-secondary)]">
              {activeProfile.rollNumber || 'Switch Profile'}
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-[var(--text-tertiary)] ml-1" />
        </Link>
      </section>

      {/* 2. Academic Alerts Section */}
      {alerts.length > 0 && (
        <section className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
              <span>Academic Alerts ({alerts.length})</span>
            </span>
          </div>

          <div className="flex flex-col gap-2">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  alert.priority === 'urgent'
                    ? 'bg-red-50/20 dark:bg-red-950/20 border-red-500/30 text-red-900 dark:text-red-200'
                    : alert.priority === 'warning'
                    ? 'bg-amber-50/20 dark:bg-amber-950/20 border-amber-500/30 text-amber-900 dark:text-amber-200'
                    : 'bg-blue-50/20 dark:bg-blue-950/20 border-blue-500/30 text-blue-900 dark:text-blue-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                      alert.priority === 'urgent'
                        ? 'bg-red-500/10 text-red-600 dark:text-red-400'
                        : alert.priority === 'warning'
                        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                        : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                    }`}
                  >
                    <AlertCircle className="w-4 h-4" />
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-[var(--text-primary)]">
                      {alert.title}
                    </h3>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5 leading-relaxed">
                      {alert.message}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                  {alert.actionLink && (
                    <Link
                      to={alert.actionLink}
                      className="apple-btn-primary text-xs h-8 px-3 gap-1 font-semibold"
                    >
                      <span>{alert.actionLabel || 'View'}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  )}
                  {alert.dismissable && (
                    <button
                      type="button"
                      onClick={() => handleDismissAlert(alert.id)}
                      className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/10"
                      title="Dismiss alert"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 3. 9 SMART DASHBOARD CARDS */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-[var(--text-primary)] tracking-tight">
            Personalized Academic Dashboard
          </h2>
          <span className="text-xs text-[var(--text-secondary)]">
            Isolated to {activeProfile.name}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* CARD 1: TODAY'S TIMETABLE */}
          <div className="apple-card p-5 flex flex-col justify-between gap-4">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Calendar className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                  {overview?.todayDay || 'Today'}
                </span>
              </div>
              <h3 className="text-base font-bold text-[var(--text-primary)]">
                Today's Timetable
              </h3>

              {overview && overview.todayClassesCount > 0 ? (
                <div className="mt-2 text-xs flex flex-col gap-1.5">
                  <div className="font-semibold text-blue-600 dark:text-blue-400">
                    {overview.todayClassesCount} classes scheduled today
                  </div>
                  {overview.nextClass && (
                    <div className="p-2.5 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-secondary)] text-[11px] text-[var(--text-secondary)] flex flex-col gap-0.5">
                      <span className="font-semibold text-[var(--text-primary)] truncate">
                        {overview.nextClass.subjectName}
                      </span>
                      <span>
                        {overview.nextClass.startTime} – {overview.nextClass.endTime}
                        {overview.nextClass.room && ` (${overview.nextClass.room})`}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-[var(--text-secondary)] mt-2">
                  No classes scheduled today (or timetable not yet imported).
                </p>
              )}
            </div>

            <Link
              to="/ams-connect?tab=timetable"
              className="apple-btn-secondary text-xs h-9 px-3.5 gap-1.5 font-medium justify-between w-full"
            >
              <span>{overview && overview.todayClassesCount > 0 ? 'View Full Schedule' : 'Connect Timetable'}</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {/* CARD 2: ATTENDANCE OVERVIEW */}
          <div className="apple-card p-5 flex flex-col justify-between gap-4">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <Percent className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                  Goal: {activeProfile.targetAttendance || 75}%
                </span>
              </div>
              <h3 className="text-base font-bold text-[var(--text-primary)]">
                Attendance Overview
              </h3>

              {overview && overview.attendanceAvgPct !== null ? (
                <div className="mt-2">
                  <div className="text-2xl font-bold text-[var(--text-primary)] tabular-nums">
                    {overview.attendanceAvgPct}%
                  </div>
                  <div className="text-xs text-[var(--text-secondary)] mt-1">
                    Across {overview.attendanceSubjectsCount} subject(s)
                    {overview.attendanceCriticalCount > 0 && (
                      <span className="text-red-600 dark:text-red-400 font-semibold block mt-0.5">
                        ⚠ {overview.attendanceCriticalCount} subject(s) below target
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-[var(--text-secondary)] mt-2">
                  No attendance records entered. Track subjects or import from AMS.
                </p>
              )}
            </div>

            <Link
              to="/attendance"
              className="apple-btn-secondary text-xs h-9 px-3.5 gap-1.5 font-medium justify-between w-full"
            >
              <span>{overview && overview.attendanceAvgPct !== null ? 'Open Attendance Planner' : 'Calculate Attendance'}</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {/* CARD 3: INTERNAL MARKS */}
          <div className="apple-card p-5 flex flex-col justify-between gap-4">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                  <Calculator className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                  Assessments
                </span>
              </div>
              <h3 className="text-base font-bold text-[var(--text-primary)]">
                Internal Marks
              </h3>

              {overview && overview.internalsCount > 0 ? (
                <div className="mt-2">
                  <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 tabular-nums">
                    {overview.internalsAveragePct !== null ? `${overview.internalsAveragePct}%` : `${overview.internalsCount} Marks`}
                  </div>
                  <div className="text-xs text-[var(--text-secondary)] mt-1">
                    {overview.internalsCount} assessments recorded in AMS
                  </div>
                </div>
              ) : (
                <p className="text-xs text-[var(--text-secondary)] mt-2">
                  No internal marks recorded yet. Calculate theory/lab internals.
                </p>
              )}
            </div>

            <Link
              to="/internals"
              className="apple-btn-secondary text-xs h-9 px-3.5 gap-1.5 font-medium justify-between w-full"
            >
              <span>{overview && overview.internalsCount > 0 ? 'View Internals' : 'Calculate Internals'}</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {/* CARD 4: SGPA AND CGPA */}
          <div className="apple-card p-5 flex flex-col justify-between gap-4">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <Award className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                  Performance
                </span>
              </div>
              <h3 className="text-base font-bold text-[var(--text-primary)]">
                SGPA and CGPA
              </h3>

              {overview && (overview.latestSgpa !== null || overview.calculatedCgpa !== null) ? (
                <div className="mt-2 flex items-baseline gap-4">
                  {overview.latestSgpa !== null && (
                    <div>
                      <div className="text-2xl font-bold text-[var(--text-primary)] tabular-nums">
                        {overview.latestSgpa.toFixed(2)}
                      </div>
                      <div className="text-[10px] uppercase font-bold text-[var(--text-secondary)]">
                        Latest SGPA
                      </div>
                    </div>
                  )}
                  {overview.calculatedCgpa !== null && (
                    <div>
                      <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                        {overview.calculatedCgpa.toFixed(2)}
                      </div>
                      <div className="text-[10px] uppercase font-bold text-[var(--text-secondary)]">
                        Cumulative CGPA
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-[var(--text-secondary)] mt-2">
                  No GPA calculations recorded. Compute semester SGPA or cumulative CGPA.
                </p>
              )}
            </div>

            <Link
              to="/gpa"
              className="apple-btn-secondary text-xs h-9 px-3.5 gap-1.5 font-medium justify-between w-full"
            >
              <span>Calculate SGPA / CGPA</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {/* CARD 5: CREDIT PROGRESS */}
          <div className="apple-card p-5 flex flex-col justify-between gap-4">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                  Target: {overview?.targetCredits || 160} Cr
                </span>
              </div>
              <h3 className="text-base font-bold text-[var(--text-primary)]">
                Credit Progress
              </h3>

              {overview ? (
                <div className="mt-2 flex flex-col gap-2">
                  <div className="flex justify-between items-baseline">
                    <span className="text-2xl font-bold text-[var(--text-primary)] tabular-nums">
                      {overview.earnedCredits}{' '}
                      <span className="text-xs font-normal text-[var(--text-secondary)]">
                        / {overview.targetCredits} Credits
                      </span>
                    </span>
                    <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 tabular-nums">
                      {overview.creditCompletionPct}%
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full h-2 rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
                    <div
                      className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                      style={{ width: `${overview.creditCompletionPct}%` }}
                    />
                  </div>

                  <span className="text-[11px] text-[var(--text-secondary)]">
                    {overview.remainingCredits} credits remaining for graduation
                  </span>
                </div>
              ) : (
                <p className="text-xs text-[var(--text-secondary)] mt-2">
                  No credit audit records yet. Set up curriculum requirements.
                </p>
              )}
            </div>

            <Link
              to="/credits"
              className="apple-btn-secondary text-xs h-9 px-3.5 gap-1.5 font-medium justify-between w-full"
            >
              <span>Open Credits Planner</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {/* CARD 6: NPTEL COURSES */}
          <div className="apple-card p-5 flex flex-col justify-between gap-4">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                  <BookOpen className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                  SWAYAM / NPTEL
                </span>
              </div>
              <h3 className="text-base font-bold text-[var(--text-primary)]">
                NPTEL Courses
              </h3>

              {overview && overview.nptelCount > 0 ? (
                <div className="mt-2">
                  <div className="text-2xl font-bold text-teal-600 dark:text-teal-400 tabular-nums">
                    {overview.nptelCount} Courses
                  </div>
                  <div className="text-xs text-[var(--text-secondary)] mt-1">
                    {overview.nptelCompletedCredits} completed credits
                    {overview.nptelPendingApprovalCount > 0 && (
                      <span className="text-amber-600 dark:text-amber-400 font-semibold block mt-0.5">
                        • {overview.nptelPendingApprovalCount} pending college approval
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-[var(--text-secondary)] mt-2">
                  No NPTEL courses added. Map online electives to Programme or Open Electives.
                </p>
              )}
            </div>

            <Link
              to="/credits?tab=nptel"
              className="apple-btn-secondary text-xs h-9 px-3.5 gap-1.5 font-medium justify-between w-full"
            >
              <span>{overview && overview.nptelCount > 0 ? 'Manage NPTEL' : 'Add NPTEL Course'}</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {/* CARD 7: UPCOMING ACADEMIC TASKS */}
          <div className="apple-card p-5 flex flex-col justify-between gap-4">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                  <Clock className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                  Planner
                </span>
              </div>
              <h3 className="text-base font-bold text-[var(--text-primary)]">
                Upcoming Academic Tasks
              </h3>

              {overview && overview.pendingTasksCount > 0 ? (
                <div className="mt-2 text-xs flex flex-col gap-1.5">
                  <div className="font-semibold text-rose-600 dark:text-rose-400">
                    {overview.pendingTasksCount} pending task(s)
                    {overview.overdueTasksCount > 0 && (
                      <span className="text-red-600 dark:text-red-400 font-bold ml-1">
                        ({overview.overdueTasksCount} overdue)
                      </span>
                    )}
                  </div>
                  {overview.nextUpcomingTask && (
                    <div className="p-2.5 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-secondary)] text-[11px] text-[var(--text-secondary)] flex flex-col gap-0.5">
                      <span className="font-semibold text-[var(--text-primary)] truncate">
                        {overview.nextUpcomingTask.title}
                      </span>
                      <span>Due: {overview.nextUpcomingTask.dueDate}</span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-[var(--text-secondary)] mt-2">
                  No upcoming deadlines or tasks scheduled.
                </p>
              )}
            </div>

            <Link
              to="/planner"
              className="apple-btn-secondary text-xs h-9 px-3.5 gap-1.5 font-medium justify-between w-full"
            >
              <span>{overview && overview.pendingTasksCount > 0 ? 'Open Semester Planner' : 'Add Task / Milestone'}</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {/* CARD 8: SAVED CALCULATIONS */}
          <div className="apple-card p-5 flex flex-col justify-between gap-4">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 flex items-center justify-center">
                  <Bookmark className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                  Archive
                </span>
              </div>
              <h3 className="text-base font-bold text-[var(--text-primary)]">
                Saved Calculations
              </h3>

              {overview && overview.savedCalculationsCount > 0 ? (
                <div className="mt-2">
                  <div className="text-2xl font-bold text-[var(--text-primary)] tabular-nums">
                    {overview.savedCalculationsCount}
                  </div>
                  <div className="text-xs text-[var(--text-secondary)] mt-1">
                    Calculations saved locally for {activeProfile.name}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-[var(--text-secondary)] mt-2">
                  No calculations saved yet. Reopen and save calculations anytime.
                </p>
              )}
            </div>

            <Link
              to="/profile"
              className="apple-btn-secondary text-xs h-9 px-3.5 gap-1.5 font-medium justify-between w-full"
            >
              <span>View Saved Archive</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {/* CARD 9: AMS CONNECTION STATUS */}
          <div className="apple-card p-5 flex flex-col justify-between gap-4">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                  <Building2 className="w-5 h-5" />
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                    overview?.amsStatus === 'connected'
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                      : overview?.amsStatus === 'manual_synced'
                      ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
                      : 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20'
                  }`}
                >
                  {overview?.amsStatus === 'connected'
                    ? 'Connected'
                    : overview?.amsStatus === 'manual_synced'
                    ? 'Synced Locally'
                    : 'Not Connected'}
                </span>
              </div>
              <h3 className="text-base font-bold text-[var(--text-primary)]">
                Vel Tech AMS Integration
              </h3>
              <p className="text-xs text-[var(--text-secondary)] mt-2">
                {overview?.amsLastSync
                  ? `Last synchronized: ${overview.amsLastSync}`
                  : 'Official portal access for timetable, attendance, marks, and results.'}
              </p>
            </div>

            <Link
              to="/ams-connect"
              className="apple-btn-primary text-xs h-9 px-3.5 gap-1.5 font-medium justify-between w-full"
            >
              <span>{overview?.amsStatus === 'connected' ? 'Open AMS Dashboard' : 'Connect College AMS'}</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* 4. TOOLS QUICK ACCESS DOCK */}
      <section className="flex flex-col gap-4 border-t border-[var(--border-secondary)] pt-6">
        <h3 className="text-base font-bold text-[var(--text-primary)]">
          Academic Calculators & Planning Tools
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 text-center">
          <Link
            to="/gpa"
            className="p-3.5 rounded-2xl bg-[var(--surface)] border border-[var(--border-primary)] hover:bg-[var(--bg-tertiary)] transition-all flex flex-col items-center gap-2 no-underline text-inherit shadow-xs"
          >
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold text-[var(--text-primary)]">
              SGPA
            </span>
          </Link>

          <Link
            to="/cgpa"
            className="p-3.5 rounded-2xl bg-[var(--surface)] border border-[var(--border-primary)] hover:bg-[var(--bg-tertiary)] transition-all flex flex-col items-center gap-2 no-underline text-inherit shadow-xs"
          >
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold text-[var(--text-primary)]">
              CGPA
            </span>
          </Link>

          <Link
            to="/attendance"
            className="p-3.5 rounded-2xl bg-[var(--surface)] border border-[var(--border-primary)] hover:bg-[var(--bg-tertiary)] transition-all flex flex-col items-center gap-2 no-underline text-inherit shadow-xs"
          >
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Percent className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold text-[var(--text-primary)]">
              Attendance
            </span>
          </Link>

          <Link
            to="/internals"
            className="p-3.5 rounded-2xl bg-[var(--surface)] border border-[var(--border-primary)] hover:bg-[var(--bg-tertiary)] transition-all flex flex-col items-center gap-2 no-underline text-inherit shadow-xs"
          >
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Calculator className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold text-[var(--text-primary)]">
              Internals
            </span>
          </Link>

          <Link
            to="/credits"
            className="p-3.5 rounded-2xl bg-[var(--surface)] border border-[var(--border-primary)] hover:bg-[var(--bg-tertiary)] transition-all flex flex-col items-center gap-2 no-underline text-inherit shadow-xs"
          >
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <GraduationCap className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold text-[var(--text-primary)]">
              Credits
            </span>
          </Link>

          <Link
            to="/planner"
            className="p-3.5 rounded-2xl bg-[var(--surface)] border border-[var(--border-primary)] hover:bg-[var(--bg-tertiary)] transition-all flex flex-col items-center gap-2 no-underline text-inherit shadow-xs"
          >
            <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold text-[var(--text-primary)]">
              Planner
            </span>
          </Link>

          <Link
            to="/forecaster"
            className="p-3.5 rounded-2xl bg-[var(--surface)] border border-[var(--border-primary)] hover:bg-[var(--bg-tertiary)] transition-all flex flex-col items-center gap-2 no-underline text-inherit shadow-xs"
          >
            <div className="w-9 h-9 rounded-xl bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold text-[var(--text-primary)]">
              Forecaster
            </span>
          </Link>

          <Link
            to="/reports"
            className="p-3.5 rounded-2xl bg-[var(--surface)] border border-[var(--border-primary)] hover:bg-[var(--bg-tertiary)] transition-all flex flex-col items-center gap-2 no-underline text-inherit shadow-xs"
          >
            <div className="w-9 h-9 rounded-xl bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold text-[var(--text-primary)]">
              Reports
            </span>
          </Link>
        </div>
      </section>
    </div>
  );
};
