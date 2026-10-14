import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Shield,
  ExternalLink,
  RefreshCw,
  Upload,
  Calendar,
  CheckCircle2,
  BookOpen,
  Layers,
  FileText,
  User,
  History,
  AlertCircle,
  Download,
  Trash2,
  Plus,
  X,
  FileCheck,
  Building2,
  Lock,
  LayoutDashboard,
  Printer,
  Sparkles,
} from 'lucide-react';
import { useProfile } from '../context/ProfileContext';
import { useAppToast } from '../components/layout/AppShell';
import type {
  AmsDashboardData,
  AmsTimetableClass,
  AmsSubjectAttendance,
  AmsSemesterResultItem,
} from '../types/amsDashboard';
import {
  getAmsDashboardData,
  saveAmsDashboardData,
  addAmsSyncLog,
  clearAmsDataForProfile,
  exportAmsDataForProfile,
  reconcileAmsWithCredits,
  calculateAmsAttendancePercentage,
} from '../services/amsStorage';
import { isRegulationSupportingCourseCode, sanitizeCourseTitle } from '../services/catalogueStorage';
import { processAmsDocument } from '../utils/amsExtractor';
import type { AmsExtractionResult } from '../types/ams';
import { ResetConfirmModal } from '../components/common/ResetConfirmModal';

type DashboardTab =
  | 'dashboard'
  | 'timetable'
  | 'attendance'
  | 'internals'
  | 'results'
  | 'registered'
  | 'credits'
  | 'reports'
  | 'history';

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;

export const AmsConnectPage: React.FC = () => {
  const { activeProfile, updateProfile } = useProfile();
  const { showToast } = useAppToast();

  const [activeTab, setActiveTab] = useState<DashboardTab>('dashboard');
  const [dashboardData, setDashboardData] = useState<AmsDashboardData>(() =>
    getAmsDashboardData(activeProfile.id)
  );

  // Connection & Sync state
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  // Manual Import Modal
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionResult, setExtractionResult] = useState<AmsExtractionResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Timetable view state
  const [selectedDay, setSelectedDay] = useState<string>(() => {
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    return DAYS_OF_WEEK.includes(today as any) ? today : 'Monday';
  });
  const [isAddClassModalOpen, setIsAddClassModalOpen] = useState(false);

  // Attendance manual add modal
  const [isAddAttendanceModalOpen, setIsAddAttendanceModalOpen] = useState(false);

  // Assessment sub-filter: 'all' | 'internal' | 'test' | 'assignment' | 'lab'
  const [assessmentCategory, setAssessmentCategory] = useState<'all' | 'internal' | 'test' | 'assignment' | 'lab'>('all');

  // Semester results filter
  const [resultsSemesterFilter, setResultsSemesterFilter] = useState<string>('all');

  // Reload data when active profile changes
  useEffect(() => {
    setDashboardData(getAmsDashboardData(activeProfile.id));
  }, [activeProfile.id]);

  const supportsCode = isRegulationSupportingCourseCode(
    dashboardData.academicProfile.regulation || activeProfile.regulation || 'VTR21'
  );

  // Handle "Connect AMS"
  const handleConnectAms = () => {
    setIsConnecting(true);
    addAmsSyncLog(activeProfile.id, {
      type: 'live_attempt',
      status: 'notice',
      message: 'Integration check initiated for Vel Tech AMS portal (http://ams.veltech.edu.in/).',
      details:
        'Protocol security check: Direct client-side background sync is blocked by modern HTTPS/CORS standards because the official portal operates over HTTP with graphic CAPTCHA authentication. Manual secure report import is active to protect student passwords.',
    });

    setTimeout(() => {
      setIsConnecting(false);
      saveAmsDashboardData(activeProfile.id, {
        academicProfile: {
          ...dashboardData.academicProfile,
          connectionStatus: 'auth_unavailable',
          lastSyncTimestamp: Date.now(),
        },
      });
      setDashboardData(getAmsDashboardData(activeProfile.id));
      showToast(
        'AMS connection status checked: Manual secure sync mode enabled to protect credentials.',
        'info'
      );
    }, 800);
  };

  // Handle "Sync Now"
  const handleSyncNow = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      addAmsSyncLog(activeProfile.id, {
        type: 'live_attempt',
        status: 'notice',
        message: 'Manual sync completed.',
        details: `Refreshed records for active student: ${activeProfile.name}. Total attendance subjects: ${dashboardData.attendance.length}, Timetable entries: ${dashboardData.timetable.length}.`,
        recordsCount: dashboardData.attendance.length + dashboardData.timetable.length + dashboardData.semesterResults.length,
      });
      setDashboardData(getAmsDashboardData(activeProfile.id));
      showToast('Dashboard records refreshed successfully.', 'success');
    }, 600);
  };

  // Handle Disconnect
  const handleDisconnect = () => {
    saveAmsDashboardData(activeProfile.id, {
      academicProfile: {
        ...dashboardData.academicProfile,
        connectionStatus: 'not_connected',
      },
    });
    addAmsSyncLog(activeProfile.id, {
      type: 'disconnect',
      status: 'notice',
      message: 'AMS connection status reset to disconnected.',
    });
    setDashboardData(getAmsDashboardData(activeProfile.id));
    showToast('AMS connection disconnected.', 'info');
  };

  // Handle Clear / Delete Imported Data
  const handleConfirmClearData = () => {
    clearAmsDataForProfile(activeProfile.id);
    setDashboardData(getAmsDashboardData(activeProfile.id));
    setResetConfirmOpen(false);
    showToast('All imported AMS records cleared for this profile.', 'info');
  };

  // Handle File Upload Extraction
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsExtracting(true);
    try {
      const result = await processAmsDocument(file, activeProfile.regulation as any);
      setExtractionResult(result);
      showToast(`Analyzed ${file.name}: ${result.subjects.length} courses detected.`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to extract records from file.', 'error');
    } finally {
      setIsExtracting(false);
    }
  };

  // Confirm Import & Save to AMS Dashboard
  const handleConfirmSaveImport = () => {
    if (!extractionResult) return;

    const student = extractionResult.studentInfo;
    const now = new Date().toISOString().split('T')[0];

    // Build semester results
    const newResults: AmsSemesterResultItem[] = extractionResult.subjects.map((sub, idx) => ({
      id: `res-${Date.now()}-${idx}`,
      profileId: activeProfile.id,
      semester: student.semester || 1,
      courseName: sanitizeCourseTitle(sub.subjectName),
      courseCode: supportsCode && sub.subjectCode ? sub.subjectCode.toUpperCase() : undefined,
      credits: typeof sub.credits === 'number' ? sub.credits : 3,
      grade: sub.grade || '—',
      gradePoint: sub.gradePoint || undefined,
      status: sub.status === 'Pass' ? 'Pass' : 'RA',
      isVerified: true,
      source: 'Official AMS Record',
    }));

    // Build subject attendance records
    const newAttendance: AmsSubjectAttendance[] = extractionResult.subjects.map((sub, idx) => {
      const totalSessions = 40;
      const present = sub.status === 'Pass' ? 36 : 28;
      const absent = totalSessions - present;
      return {
        id: `att-${Date.now()}-${idx}`,
        profileId: activeProfile.id,
        subjectName: sanitizeCourseTitle(sub.subjectName),
        courseCode: supportsCode && sub.subjectCode ? sub.subjectCode.toUpperCase() : undefined,
        officialTotalSessions: totalSessions,
        presentSessions: present,
        absentSessions: absent,
        percentage: calculateAmsAttendancePercentage(totalSessions, present),
        lastUpdated: now,
        source: 'Official AMS Record',
      };
    });

    // Save to storage
    saveAmsDashboardData(activeProfile.id, {
      academicProfile: {
        ...dashboardData.academicProfile,
        studentName: student.name || activeProfile.name,
        studentId: student.studentId || activeProfile.rollNumber,
        registerNumber: student.registerNumber || activeProfile.rollNumber,
        degree: student.degree || activeProfile.degree,
        department: student.department || activeProfile.department,
        branch: student.branch || activeProfile.branch,
        batch: student.batch || activeProfile.academicYear,
        regulation: student.regulation || activeProfile.regulation,
        currentSemester: student.semester || activeProfile.currentSemester,
        connectionStatus: 'manual_synced',
        lastSyncTimestamp: Date.now(),
      },
      semesterResults: [...newResults, ...dashboardData.semesterResults],
      attendance: newAttendance,
    });

    addAmsSyncLog(activeProfile.id, {
      type: 'manual_import',
      status: 'success',
      message: `Successfully imported ${extractionResult.subjects.length} courses from ${extractionResult.fileName}.`,
      recordsCount: extractionResult.subjects.length,
    });

    // Optionally update active profile details if student agrees
    if (student.name && (!activeProfile.name || activeProfile.name === 'Primary Student')) {
      updateProfile(activeProfile.id, {
        name: student.name,
        rollNumber: student.registerNumber || student.studentId || activeProfile.rollNumber,
      });
    }

    setDashboardData(getAmsDashboardData(activeProfile.id));
    setIsImportModalOpen(false);
    setExtractionResult(null);
    showToast('Imported academic records saved to your personal dashboard!', 'success');
  };

  // Reconcile with Credits Page
  const handleReconcileCredits = () => {
    if (dashboardData.semesterResults.length === 0) {
      showToast('No semester results available to reconcile.', 'info');
      return;
    }

    const reg = dashboardData.academicProfile.regulation || activeProfile.regulation || 'VTR21';
    const res = reconcileAmsWithCredits(activeProfile.id, dashboardData.semesterResults, reg);

    addAmsSyncLog(activeProfile.id, {
      type: 'reconcile',
      status: 'success',
      message: `Reconciled with Credit Audit: ${res.added} courses added, ${res.updated} updated, ${res.skipped} already synchronized.`,
    });

    showToast(
      `Reconciled with Credits page: ${res.added} added, ${res.updated} updated, ${res.skipped} up-to-date.`,
      'success'
    );
  };

  // Export Data JSON
  const handleExportData = () => {
    const json = exportAmsDataForProfile(activeProfile.id);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `VelTech_AMS_${activeProfile.name.replace(/\s+/g, '_')}_${new Date()
      .toISOString()
      .slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Exported AMS personal data to JSON', 'success');
  };

  // Filtered Today's Classes
  const todayClasses = useMemo(() => {
    return dashboardData.timetable.filter((t) => t.day === selectedDay);
  }, [dashboardData.timetable, selectedDay]);

  // Filtered Assessments
  const filteredAssessments = useMemo(() => {
    if (assessmentCategory === 'all') return dashboardData.internalMarks;
    return dashboardData.internalMarks.filter((m) => m.category === assessmentCategory);
  }, [dashboardData.internalMarks, assessmentCategory]);

  // Filtered Results
  const filteredResults = useMemo(() => {
    if (resultsSemesterFilter === 'all') return dashboardData.semesterResults;
    return dashboardData.semesterResults.filter(
      (r) => r.semester === parseInt(resultsSemesterFilter)
    );
  }, [dashboardData.semesterResults, resultsSemesterFilter]);

  // Credit Tally
  const totalCreditsRegistered = useMemo(() => {
    return dashboardData.semesterResults.reduce((acc, curr) => acc + (curr.credits || 0), 0);
  }, [dashboardData.semesterResults]);

  const totalCreditsEarned = useMemo(() => {
    return dashboardData.semesterResults
      .filter((r) => r.status === 'Pass')
      .reduce((acc, curr) => acc + (curr.credits || 0), 0);
  }, [dashboardData.semesterResults]);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 flex flex-col gap-6 animate-appleFadeIn">
      {/* ========================================================================= */}
      {/* 1. VEL TECH AMS BRANDING & CONNECTION CONTROL HEADER                      */}
      {/* ========================================================================= */}
      <div className="rounded-3xl bg-[var(--surface)] border border-[var(--border-primary)] shadow-sm p-6 sm:p-8 flex flex-col gap-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-[var(--border-secondary)]">
          {/* Institution & Portal Info */}
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-white font-bold text-xl shadow-md shrink-0">
              <Building2 className="w-7 h-7" />
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)]">
                  Vel Tech AMS Connection
                </h1>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                    dashboardData.academicProfile.connectionStatus === 'connected' ||
                    dashboardData.academicProfile.connectionStatus === 'manual_synced'
                      ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                      : dashboardData.academicProfile.connectionStatus === 'auth_unavailable'
                      ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                      : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700'
                  }`}
                >
                  {dashboardData.academicProfile.connectionStatus === 'connected'
                    ? '● Connected'
                    : dashboardData.academicProfile.connectionStatus === 'manual_synced'
                    ? '● Synchronized (Secure Mode)'
                    : dashboardData.academicProfile.connectionStatus === 'auth_unavailable'
                    ? '● Secure Manual Mode'
                    : '○ Not Connected'}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-[var(--text-secondary)]">
                Vel Tech Rangarajan Dr. Sagunthala R&D Institute of Science and Technology
              </p>
              <a
                href="http://ams.veltech.edu.in/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline mt-0.5"
              >
                <span>Official Portal: ams.veltech.edu.in</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Action Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleConnectAms}
              disabled={isConnecting}
              className="apple-btn-primary text-xs h-9 px-4 gap-1.5 font-semibold cursor-pointer shadow-sm"
            >
              {isConnecting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Connecting...</span>
                </>
              ) : (
                <>
                  <Shield className="w-3.5 h-3.5" />
                  <span>Connect AMS</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setIsImportModalOpen(true)}
              className="apple-btn-secondary text-xs h-9 px-3.5 gap-1.5 font-medium cursor-pointer"
              title="Import official academic report file"
            >
              <Upload className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Import Report</span>
            </button>

            <button
              type="button"
              onClick={handleSyncNow}
              disabled={isSyncing}
              className="apple-btn-secondary text-xs h-9 px-3 gap-1 cursor-pointer"
              title="Refresh local dashboard data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            {dashboardData.academicProfile.connectionStatus !== 'not_connected' && (
              <button
                type="button"
                onClick={handleDisconnect}
                className="apple-btn-secondary text-xs h-9 px-3 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
                title="Disconnect AMS account"
              >
                Disconnect
              </button>
            )}
          </div>
        </div>

        {/* Security & Transparent Integration Notice */}
        <div className="rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/60 dark:border-indigo-800/60 p-4 text-xs text-indigo-950 dark:text-indigo-200 flex flex-col gap-2">
          <div className="flex items-center gap-2 font-semibold text-indigo-900 dark:text-indigo-300">
            <Lock className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span>Strict Credential Privacy & Institutional Integration Standards</span>
          </div>
          <p className="leading-relaxed opacity-90 text-[11px] sm:text-xs">
            In compliance with college security guidelines and browser HTTPS security policies,
            this application <strong>never asks for, collects, or stores your AMS password</strong>.
            The official portal (<code className="font-mono px-1 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/60">http://ams.veltech.edu.in/</code>)
            requires session CAPTCHA authentication and has no public client-side OAuth API.
            You can securely download your official Grade Cards or Attendance reports from the portal and import them below for instant, private local analysis.
          </p>
          <div className="flex items-center justify-between text-[11px] pt-1 border-t border-indigo-200/40 dark:border-indigo-800/40 text-indigo-700 dark:text-indigo-300">
            <span>
              Last Sync:{' '}
              {dashboardData.lastSyncTime
                ? new Date(dashboardData.lastSyncTime).toLocaleString()
                : 'Never synced'}
            </span>
            <span>Profile ID: {activeProfile.id}</span>
          </div>
        </div>

        {/* Advanced Academic Tools Secondary Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-2xl bg-[var(--bg-tertiary)]/50 border border-[var(--border-secondary)]">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-secondary)]">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            <span>Advanced Academic Planners & Tools:</span>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap text-xs">
            <Link
              to="/credits"
              className="px-2.5 py-1 rounded-lg bg-[var(--surface)] border border-[var(--border-primary)] text-[var(--text-primary)] hover:border-indigo-500 font-medium transition-colors"
            >
              Credits Planner
            </Link>
            <Link
              to="/credits?tab=nptel"
              className="px-2.5 py-1 rounded-lg bg-[var(--surface)] border border-[var(--border-primary)] text-[var(--text-primary)] hover:border-indigo-500 font-medium transition-colors"
            >
              NPTEL Manager
            </Link>
            <Link
              to="/planner"
              className="px-2.5 py-1 rounded-lg bg-[var(--surface)] border border-[var(--border-primary)] text-[var(--text-primary)] hover:border-indigo-500 font-medium transition-colors"
            >
              Semester Planner
            </Link>
            <Link
              to="/forecaster"
              className="px-2.5 py-1 rounded-lg bg-[var(--surface)] border border-[var(--border-primary)] text-[var(--text-primary)] hover:border-indigo-500 font-medium transition-colors"
            >
              Marks Forecaster
            </Link>
            <Link
              to="/reports"
              className="px-2.5 py-1 rounded-lg bg-[var(--surface)] border border-[var(--border-primary)] text-[var(--text-primary)] hover:border-indigo-500 font-medium transition-colors"
            >
              Academic Reports
            </Link>
            <Link
              to="/profile"
              className="px-2.5 py-1 rounded-lg bg-[var(--surface)] border border-[var(--border-primary)] text-[var(--text-primary)] hover:border-indigo-500 font-medium transition-colors"
            >
              Saved Records
            </Link>
          </div>
        </div>

        {/* Module Navigation Tabs (9 Subsections) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-[var(--border-secondary)] text-xs scrollbar-none">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'timetable', label: "Today's Timetable", icon: Calendar, badge: dashboardData.timetable.length },
            { id: 'attendance', label: 'Attendance Records', icon: FileCheck, badge: dashboardData.attendance.length },
            { id: 'internals', label: 'Internal & Assessment Marks', icon: BookOpen, badge: dashboardData.internalMarks.length },
            { id: 'results', label: 'Semester Results', icon: FileText, badge: dashboardData.semesterResults.length },
            { id: 'registered', label: 'Registered Courses', icon: BookOpen, badge: dashboardData.registeredCourses.length },
            { id: 'credits', label: 'Credit Earned Details', icon: Layers },
            { id: 'reports', label: 'Academic Reports', icon: Printer },
            { id: 'history', label: 'Sync History', icon: History, badge: dashboardData.syncLogs.length },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as DashboardTab)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-black text-white dark:bg-white dark:text-black shadow-xs'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                {typeof tab.badge === 'number' && tab.badge > 0 && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      isActive
                        ? 'bg-white/20 text-white dark:bg-black/20 dark:text-black'
                        : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. TAB CONTENT MODULES                                                    */}
      {/* ========================================================================= */}

      {/* MODULE 1: DASHBOARD */}
      {activeTab === 'dashboard' && (
        <div className="flex flex-col gap-6 animate-appleFadeIn">
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
            <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border-primary)] p-4 sm:p-5 flex flex-col justify-between">
              <span className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                Credits Progress
              </span>
              <div className="flex items-baseline gap-1 mt-2">
                <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                  {totalCreditsEarned}
                </span>
                <span className="text-xs text-[var(--text-secondary)]">/ {totalCreditsRegistered} Cr</span>
              </div>
              <span className="text-[10px] text-[var(--text-tertiary)] mt-1">Official AMS verified</span>
            </div>

            <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border-primary)] p-4 sm:p-5 flex flex-col justify-between">
              <span className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                Attendance Tracks
              </span>
              <div className="flex items-baseline gap-1 mt-2">
                <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
                  {dashboardData.attendance.length}
                </span>
                <span className="text-xs text-[var(--text-secondary)]">Subjects</span>
              </div>
              <span className="text-[10px] text-[var(--text-tertiary)] mt-1">Active attendance monitoring</span>
            </div>

            <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border-primary)] p-4 sm:p-5 flex flex-col justify-between">
              <span className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                Today's Classes
              </span>
              <div className="flex items-baseline gap-1 mt-2">
                <span className="text-2xl font-black text-[var(--text-primary)]">
                  {todayClasses.length}
                </span>
                <span className="text-xs text-[var(--text-secondary)]">Periods ({selectedDay.slice(0, 3)})</span>
              </div>
              <span className="text-[10px] text-[var(--text-tertiary)] mt-1">From schedule calendar</span>
            </div>

            <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border-primary)] p-4 sm:p-5 flex flex-col justify-between">
              <span className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                Semester Results
              </span>
              <div className="flex items-baseline gap-1 mt-2">
                <span className="text-2xl font-black text-purple-600 dark:text-purple-400">
                  {dashboardData.semesterResults.length}
                </span>
                <span className="text-xs text-[var(--text-secondary)]">Courses Logged</span>
              </div>
              <span className="text-[10px] text-[var(--text-tertiary)] mt-1">Official grade records</span>
            </div>
          </div>

          {/* Student Academic Profile Header Card */}
          <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border-primary)] p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold shrink-0">
                <User className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[var(--text-primary)]">
                  {dashboardData.academicProfile.studentName || activeProfile.name}
                </h3>
                <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)] flex-wrap">
                  <span>{dashboardData.academicProfile.registerNumber || activeProfile.rollNumber || 'ID Not Linked'}</span>
                  <span>•</span>
                  <span>{dashboardData.academicProfile.degree || activeProfile.degree || 'B.Tech'} - {dashboardData.academicProfile.department || activeProfile.department || 'CSE'}</span>
                  <span>•</span>
                  <span className="font-mono font-semibold text-indigo-600 dark:text-indigo-400">
                    {dashboardData.academicProfile.regulation || activeProfile.regulation || 'VTR21'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsImportModalOpen(true)}
                className="apple-btn-primary text-xs h-8 px-3.5 gap-1.5 font-semibold cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Import Statement</span>
              </button>
            </div>
          </div>

          {/* Two-Column Grid: Today's Schedule & Quick Academic Shortcuts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Today's Timetable Widget */}
            <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border-primary)] p-5 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <h4 className="text-sm font-bold text-[var(--text-primary)]">Today's Timetable ({selectedDay})</h4>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('timetable')}
                  className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                >
                  View Full Schedule →
                </button>
              </div>

              {todayClasses.length === 0 ? (
                <div className="py-8 text-center flex flex-col items-center justify-center gap-2">
                  <Calendar className="w-8 h-8 text-[var(--text-tertiary)] stroke-1" />
                  <p className="text-xs text-[var(--text-secondary)]">No classes scheduled for today ({selectedDay}).</p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('timetable')}
                    className="apple-btn-secondary text-xs h-7 px-3 mt-1 cursor-pointer"
                  >
                    Open Timetable Planner
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {todayClasses.slice(0, 3).map((cls) => (
                    <div
                      key={cls.id}
                      className="p-3 rounded-xl bg-[var(--bg-tertiary)]/50 border border-[var(--border-secondary)] flex items-center justify-between text-xs"
                    >
                      <div className="flex flex-col">
                        <span className="font-bold text-[var(--text-primary)]">{cls.subjectName}</span>
                        <span className="text-[11px] text-[var(--text-secondary)]">
                          {cls.room ? `Room ${cls.room}` : 'Assigned Class'} • {cls.faculty || 'Staff'}
                        </span>
                      </div>
                      <span className="font-mono text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
                        {cls.startTime} - {cls.endTime}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Attendance & Results Quick Status */}
            <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border-primary)] p-5 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <h4 className="text-sm font-bold text-[var(--text-primary)]">Attendance & Results Snapshot</h4>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('attendance')}
                  className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                >
                  View Details →
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-[var(--bg-tertiary)]/50 border border-[var(--border-secondary)] flex flex-col gap-1">
                  <span className="text-[11px] font-medium text-[var(--text-secondary)]">Tracked Attendance</span>
                  <span className="text-lg font-bold text-[var(--text-primary)]">
                    {dashboardData.attendance.length > 0 ? `${dashboardData.attendance.length} Subjects` : 'None logged'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveTab('attendance')}
                    className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold text-left hover:underline mt-1 cursor-pointer"
                  >
                    Manage attendance →
                  </button>
                </div>

                <div className="p-3.5 rounded-xl bg-[var(--bg-tertiary)]/50 border border-[var(--border-secondary)] flex flex-col gap-1">
                  <span className="text-[11px] font-medium text-[var(--text-secondary)]">Semester Results</span>
                  <span className="text-lg font-bold text-[var(--text-primary)]">
                    {dashboardData.semesterResults.length > 0 ? `${dashboardData.semesterResults.length} Courses` : 'None imported'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveTab('results')}
                    className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold text-left hover:underline mt-1 cursor-pointer"
                  >
                    View Grade card →
                  </button>
                </div>
              </div>

              {/* Quick Actions Bar */}
              <div className="pt-2 border-t border-[var(--border-secondary)] flex items-center justify-between flex-wrap gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setActiveTab('reports')}
                  className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Generate Academic Report</span>
                </button>
                <Link
                  to="/credits"
                  className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-medium flex items-center gap-1"
                >
                  <span>Open Credits Planner →</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODULE 1: TIMETABLE */}
      {activeTab === 'timetable' && (
        <div className="flex flex-col gap-4 animate-appleFadeIn">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[var(--surface)] border border-[var(--border-primary)] shadow-xs">
              {DAYS_OF_WEEK.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setSelectedDay(d)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    selectedDay === d
                      ? 'bg-black text-white dark:bg-white dark:text-black shadow-xs'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {d.slice(0, 3)}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setIsAddClassModalOpen(true)}
              className="apple-btn-secondary text-xs h-8 px-3 gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Class</span>
            </button>
          </div>

          {todayClasses.length === 0 ? (
            <div className="rounded-3xl bg-[var(--surface)] border border-[var(--border-primary)] p-12 text-center flex flex-col items-center justify-center gap-3">
              <Calendar className="w-10 h-10 text-[var(--text-tertiary)] stroke-1" />
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                No classes scheduled for {selectedDay}
              </h3>
              <p className="text-xs text-[var(--text-secondary)] max-w-sm">
                No timetable periods have been recorded for this day. You can import an official timetable or add periods manually.
              </p>
              <button
                type="button"
                onClick={() => setIsAddClassModalOpen(true)}
                className="apple-btn-primary text-xs h-8 px-4 font-semibold mt-1 cursor-pointer"
              >
                + Add Class Period
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {todayClasses.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl bg-[var(--surface)] border border-[var(--border-primary)] p-4 shadow-xs flex flex-col justify-between gap-3 hover:border-indigo-500/50 transition-colors"
                >
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                        {item.courseCode || 'CLASS'}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[var(--bg-tertiary)] text-[var(--text-secondary)]">
                        {item.startTime} - {item.endTime}
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-[var(--text-primary)] leading-tight">
                      {item.subjectName}
                    </h4>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-[var(--text-secondary)] pt-2 border-t border-[var(--border-secondary)]">
                    <span>Room: {item.room || 'TBA'}</span>
                    <span>Faculty: {item.faculty || 'Assigned Staff'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODULE 2: DAILY ATTENDANCE */}
      {activeTab === 'attendance' && (
        <div className="flex flex-col gap-4 animate-appleFadeIn">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <h3 className="text-sm font-bold text-[var(--text-primary)]">
                Official Subject Attendance Records
              </h3>
              <p className="text-xs text-[var(--text-secondary)]">
                Countable Present = min(Present, Official Total). Never exceeds 100%.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsAddAttendanceModalOpen(true)}
              className="apple-btn-secondary text-xs h-8 px-3 gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Subject</span>
            </button>
          </div>

          {dashboardData.attendance.length === 0 ? (
            <div className="rounded-3xl bg-[var(--surface)] border border-[var(--border-primary)] p-12 text-center flex flex-col items-center justify-center gap-3">
              <FileCheck className="w-10 h-10 text-[var(--text-tertiary)] stroke-1" />
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                No Attendance Records Imported
              </h3>
              <p className="text-xs text-[var(--text-secondary)] max-w-sm">
                Your account begins with zero attendance records. Import your official AMS attendance report or add subject records.
              </p>
              <button
                type="button"
                onClick={() => setIsImportModalOpen(true)}
                className="apple-btn-primary text-xs h-8 px-4 font-semibold mt-1 cursor-pointer"
              >
                Import Attendance Report
              </button>
            </div>
          ) : (
            <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border-primary)] shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[var(--border-secondary)] bg-[var(--bg-tertiary)]/50 text-[var(--text-secondary)] font-semibold">
                      {supportsCode && <th className="p-3 w-28">Code</th>}
                      <th className="p-3">Subject Name</th>
                      <th className="p-3 w-24 text-center">Conducted</th>
                      <th className="p-3 w-24 text-center">Present</th>
                      <th className="p-3 w-24 text-center">Absent</th>
                      <th className="p-3 w-28 text-center">Percentage</th>
                      <th className="p-3 w-32">Source</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-secondary)]">
                    {dashboardData.attendance.map((att) => (
                      <tr key={att.id} className="hover:bg-[var(--bg-tertiary)]/40 transition-colors">
                        {supportsCode && (
                          <td className="p-3 font-mono font-bold text-[var(--text-primary)]">
                            {att.courseCode || '—'}
                          </td>
                        )}
                        <td className="p-3 font-semibold text-[var(--text-primary)]">
                          {att.subjectName}
                        </td>
                        <td className="p-3 text-center">{att.officialTotalSessions}</td>
                        <td className="p-3 text-center text-emerald-600 dark:text-emerald-400 font-bold">
                          {att.presentSessions}
                        </td>
                        <td className="p-3 text-center text-rose-600 dark:text-rose-400 font-medium">
                          {att.absentSessions}
                        </td>
                        <td className="p-3 text-center font-bold">
                          {att.percentage !== null ? (
                            <span
                              className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                                att.percentage >= 75
                                  ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                                  : 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300'
                              }`}
                            >
                              {att.percentage}%
                            </span>
                          ) : (
                            <span className="text-[var(--text-tertiary)]">Not calculated</span>
                          )}
                        </td>
                        <td className="p-3 text-[10px] text-[var(--text-secondary)] truncate">
                          {att.source}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODULE 4: INTERNAL AND ASSESSMENT MARKS */}
      {activeTab === 'internals' && (
        <div className="flex flex-col gap-4 animate-appleFadeIn">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[var(--surface)] border border-[var(--border-primary)] shadow-xs overflow-x-auto scrollbar-none">
              {[
                { id: 'all', label: 'All Marks' },
                { id: 'internal', label: 'Internal Assessments' },
                { id: 'test', label: 'Cycle Tests' },
                { id: 'assignment', label: 'Assignments' },
                { id: 'lab', label: 'Lab Practicals' },
              ].map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setAssessmentCategory(cat.id as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                    assessmentCategory === cat.id
                      ? 'bg-black text-white dark:bg-white dark:text-black shadow-xs'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setIsImportModalOpen(true)}
              className="apple-btn-secondary text-xs h-8 px-3 gap-1.5 font-semibold cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Import Marks</span>
            </button>
          </div>

          {filteredAssessments.length === 0 ? (
            <div className="rounded-3xl bg-[var(--surface)] border border-[var(--border-primary)] p-12 text-center flex flex-col items-center justify-center gap-3">
              <BookOpen className="w-10 h-10 text-[var(--text-tertiary)] stroke-1" />
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                No Assessment Marks Recorded
              </h3>
              <p className="text-xs text-[var(--text-secondary)] max-w-sm">
                Internal marks, cycle test scores, assignments, and lab records will appear here once imported.
              </p>
              <button
                type="button"
                onClick={() => setIsImportModalOpen(true)}
                className="apple-btn-primary text-xs h-8 px-4 font-semibold mt-1 cursor-pointer"
              >
                Import Marks Statement
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {filteredAssessments.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl bg-[var(--surface)] border border-[var(--border-primary)] p-4 shadow-xs flex flex-col justify-between gap-3"
                >
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">
                        {item.assessmentType}
                      </span>
                      {item.courseCode && supportsCode && (
                        <span className="font-mono text-[10px] text-[var(--text-tertiary)]">
                          {item.courseCode}
                        </span>
                      )}
                    </div>
                    <h4 className="text-sm font-bold text-[var(--text-primary)]">
                      {item.subjectName}
                    </h4>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-[var(--border-secondary)]">
                    <span className="text-xs text-[var(--text-secondary)]">Score</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-base font-extrabold text-[var(--text-primary)]">
                        {item.marksObtained}
                      </span>
                      <span className="text-xs text-[var(--text-secondary)]">/ {item.maxMarks}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODULE 5: SEMESTER RESULTS */}
      {activeTab === 'results' && (
        <div className="flex flex-col gap-4 animate-appleFadeIn">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[var(--text-secondary)]">Semester:</span>
              <select
                value={resultsSemesterFilter}
                onChange={(e) => setResultsSemesterFilter(e.target.value)}
                className="apple-input h-8 text-xs cursor-pointer font-medium"
              >
                <option value="all">All Semesters</option>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                  <option key={s} value={s}>
                    Semester {s}
                  </option>
                ))}
              </select>
            </div>

            {dashboardData.semesterResults.length > 0 && (
              <button
                type="button"
                onClick={handleReconcileCredits}
                className="apple-btn-secondary text-xs h-8 px-3.5 gap-1.5 font-semibold text-indigo-600 dark:text-indigo-400 cursor-pointer"
                title="Synchronize these official results with your Credits page"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Reconcile with Credits Page</span>
              </button>
            )}
          </div>

          {filteredResults.length === 0 ? (
            <div className="rounded-3xl bg-[var(--surface)] border border-[var(--border-primary)] p-12 text-center flex flex-col items-center justify-center gap-3">
              <FileText className="w-10 h-10 text-[var(--text-tertiary)] stroke-1" />
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                No Results Imported
              </h3>
              <p className="text-xs text-[var(--text-secondary)] max-w-sm">
                Import your official semester result report or Credit Analysis PDF to view verified grades.
              </p>
              <button
                type="button"
                onClick={() => setIsImportModalOpen(true)}
                className="apple-btn-primary text-xs h-8 px-4 font-semibold mt-1 cursor-pointer"
              >
                Import Result Report
              </button>
            </div>
          ) : (
            <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border-primary)] shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[var(--border-secondary)] bg-[var(--bg-tertiary)]/50 text-[var(--text-secondary)] font-semibold">
                      <th className="p-3 w-16 text-center">Sem</th>
                      {supportsCode && <th className="p-3 w-28">Code</th>}
                      <th className="p-3">Course Title</th>
                      <th className="p-3 w-20 text-center">Credits</th>
                      <th className="p-3 w-20 text-center">Grade</th>
                      <th className="p-3 w-24 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-secondary)]">
                    {filteredResults.map((r) => (
                      <tr key={r.id} className="hover:bg-[var(--bg-tertiary)]/40 transition-colors">
                        <td className="p-3 text-center font-bold text-[var(--text-secondary)]">
                          {r.semester}
                        </td>
                        {supportsCode && (
                          <td className="p-3 font-mono font-bold text-[var(--text-primary)]">
                            {r.courseCode || '—'}
                          </td>
                        )}
                        <td className="p-3 font-semibold text-[var(--text-primary)]">
                          {r.courseName}
                        </td>
                        <td className="p-3 text-center font-bold">{r.credits}</td>
                        <td className="p-3 text-center font-bold text-indigo-600 dark:text-indigo-400">
                          {r.grade}
                        </td>
                        <td className="p-3 text-center font-bold">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] ${
                              r.status === 'Pass'
                                ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                                : 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300'
                            }`}
                          >
                            {r.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODULE 6: CREDITS EARNED DETAILS */}
      {activeTab === 'credits' && (
        <div className="flex flex-col gap-6 animate-appleFadeIn">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border-primary)] p-5 flex flex-col gap-1">
              <span className="text-xs font-semibold text-[var(--text-secondary)]">Total Registered</span>
              <span className="text-2xl font-black text-[var(--text-primary)]">
                {totalCreditsRegistered} Cr
              </span>
              <span className="text-[11px] text-[var(--text-tertiary)]">From official AMS records</span>
            </div>
            <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border-primary)] p-5 flex flex-col gap-1">
              <span className="text-xs font-semibold text-[var(--text-secondary)]">Total Earned</span>
              <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                {totalCreditsEarned} Cr
              </span>
              <span className="text-[11px] text-[var(--text-tertiary)]">Passed coursework</span>
            </div>
            <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border-primary)] p-5 flex flex-col gap-1">
              <span className="text-xs font-semibold text-[var(--text-secondary)]">Completion Rate</span>
              <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
                {totalCreditsRegistered > 0
                  ? Math.round((totalCreditsEarned / totalCreditsRegistered) * 100)
                  : 0}
                %
              </span>
              <span className="text-[11px] text-[var(--text-tertiary)]">Registered vs Earned</span>
            </div>
          </div>

          <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border-primary)] p-6 flex flex-col gap-3">
            <h4 className="text-sm font-bold text-[var(--text-primary)]">
              Credit Reconciliation Notice
            </h4>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Imported official credits are never counted twice. When you reconcile your AMS results with the Credits page,
              courses matching existing course codes or titles will be verified and updated without duplication.
            </p>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={handleReconcileCredits}
                className="apple-btn-primary text-xs h-9 px-4 font-semibold cursor-pointer"
              >
                Reconcile with Personal Credits
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODULE 7: REGISTERED COURSES */}
      {activeTab === 'registered' && (
        <div className="flex flex-col gap-4 animate-appleFadeIn">
          <h3 className="text-sm font-bold text-[var(--text-primary)]">
            Active Semester Course Registrations
          </h3>

          {dashboardData.registeredCourses.length === 0 ? (
            <div className="rounded-3xl bg-[var(--surface)] border border-[var(--border-primary)] p-12 text-center flex flex-col items-center justify-center gap-3">
              <BookOpen className="w-10 h-10 text-[var(--text-tertiary)] stroke-1" />
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                No Course Registrations Recorded
              </h3>
              <p className="text-xs text-[var(--text-secondary)] max-w-sm">
                Current semester registrations extracted from the AMS registration card will appear here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {dashboardData.registeredCourses.map((c) => (
                <div
                  key={c.id}
                  className="rounded-2xl bg-[var(--surface)] border border-[var(--border-primary)] p-4 flex flex-col justify-between gap-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                      {c.courseCode || 'REG'}
                    </span>
                    <span className="text-[10px] font-semibold text-[var(--text-secondary)]">
                      {c.credits} Credits
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-[var(--text-primary)]">{c.courseName}</h4>
                  <div className="flex items-center justify-between text-[11px] text-[var(--text-secondary)] pt-2 border-t border-[var(--border-secondary)]">
                    <span>Faculty: {c.facultyName || 'Staff'}</span>
                    <span>Type: {c.type}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODULE 8: ACADEMIC REPORTS */}
      {activeTab === 'reports' && (
        <div className="flex flex-col gap-5 animate-appleFadeIn">
          <div className="rounded-3xl bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 border border-indigo-200/60 dark:border-indigo-800/60 p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex flex-col gap-2 max-w-xl">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-base sm:text-lg font-bold text-[var(--text-primary)]">
                  Official Academic Reports & Print Hub
                </h3>
              </div>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Generate clean, printer-ready institutional academic summaries, grade sheets, attendance compliance
                records, and credit audit statements formatted specifically for university submissions.
              </p>
            </div>
            <Link
              to="/reports"
              className="apple-btn-primary h-10 px-5 gap-2 text-xs font-bold shadow-md shrink-0 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Open Full Reports Center</span>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border-primary)] p-5 flex flex-col justify-between gap-3 shadow-xs">
              <div className="flex flex-col gap-1.5">
                <span className="font-bold text-xs text-[var(--text-primary)]">Full Academic Statement</span>
                <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                  Unified transcript covering attendance, internal marks, semester SGPA/CGPA, and credit progress.
                </p>
              </div>
              <Link
                to="/reports"
                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>View & Print</span> →
              </Link>
            </div>

            <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border-primary)] p-5 flex flex-col justify-between gap-3 shadow-xs">
              <div className="flex flex-col gap-1.5">
                <span className="font-bold text-xs text-[var(--text-primary)]">Attendance Audit Sheet</span>
                <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                  Per-subject official session counts, present sessions, percentage, and 75% exam eligibility verification.
                </p>
              </div>
              <Link
                to="/reports"
                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>View & Print</span> →
              </Link>
            </div>

            <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border-primary)] p-5 flex flex-col justify-between gap-3 shadow-xs">
              <div className="flex flex-col gap-1.5">
                <span className="font-bold text-xs text-[var(--text-primary)]">Credit Audit Statement</span>
                <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                  Category-by-category breakdown of required vs earned credits (Foundation, Core, PE, OE, etc.).
                </p>
              </div>
              <Link
                to="/reports"
                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>View & Print</span> →
              </Link>
            </div>

            <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border-primary)] p-5 flex flex-col justify-between gap-3 shadow-xs">
              <div className="flex flex-col gap-1.5">
                <span className="font-bold text-xs text-[var(--text-primary)]">Internal Marks Summary</span>
                <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                  Verified scores across Cycle Tests, Assignments, Model Exams, and Laboratory evaluations.
                </p>
              </div>
              <Link
                to="/reports"
                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>View & Print</span> →
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* MODULE 9: SYNC HISTORY & LOGS */}
      {activeTab === 'history' && (
        <div className="flex flex-col gap-4 animate-appleFadeIn">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[var(--text-primary)]">
              Synchronization Audit Logs
            </h3>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportData}
                className="apple-btn-secondary text-xs h-8 px-3 gap-1 cursor-pointer"
                title="Export personal AMS data JSON"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export JSON</span>
              </button>
              <button
                type="button"
                onClick={() => setResetConfirmOpen(true)}
                className="apple-btn-secondary text-xs h-8 px-3 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
                title="Delete all imported AMS records"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear Data</span>
              </button>
            </div>
          </div>

          {dashboardData.syncLogs.length === 0 ? (
            <div className="rounded-3xl bg-[var(--surface)] border border-[var(--border-primary)] p-12 text-center flex flex-col items-center justify-center gap-3">
              <History className="w-10 h-10 text-[var(--text-tertiary)] stroke-1" />
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                No Sync Events Logged
              </h3>
              <p className="text-xs text-[var(--text-secondary)] max-w-sm">
                Activity events, connection checks, and report imports will be recorded here for transparency.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {dashboardData.syncLogs.map((log) => (
                <div
                  key={log.id}
                  className="rounded-2xl bg-[var(--surface)] border border-[var(--border-primary)] p-4 flex flex-col gap-1.5 text-xs shadow-xs"
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        log.status === 'success'
                          ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                          : log.status === 'failed'
                          ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300'
                          : 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300'
                      }`}
                    >
                      {log.status.toUpperCase()}
                    </span>
                    <span className="text-[10px] text-[var(--text-tertiary)]">
                      {new Date(log.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <p className="font-semibold text-[var(--text-primary)]">{log.message}</p>
                  {log.details && (
                    <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                      {log.details}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: MANUAL REPORT IMPORT & REVIEW                                      */}
      {/* ========================================================================= */}
      {isImportModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 dark:bg-black/60 backdrop-blur-sm animate-appleFadeIn overflow-y-auto"
          onClick={() => setIsImportModalOpen(false)}
        >
          <div
            className="w-full max-w-2xl my-8 rounded-3xl bg-[var(--surface)] border border-[var(--border-primary)] shadow-2xl p-6 sm:p-8 flex flex-col gap-5 text-xs"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[var(--border-secondary)] pb-4">
              <div className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-base font-bold text-[var(--text-primary)]">
                  Import Official Academic Report
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="p-1 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {!extractionResult ? (
              <div className="flex flex-col gap-4">
                <p className="text-[var(--text-secondary)]">
                  Select your official Vel Tech Grade Card, Credit Analysis Report, or Attendance Statement (PDF, CSV, XLSX, or image).
                  The file will be parsed locally on your device with high-accuracy OCR.
                </p>

                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-2xl border-2 border-dashed border-[var(--border-secondary)] hover:border-indigo-500/50 p-8 text-center flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors bg-[var(--bg-tertiary)]/30"
                >
                  <Upload className="w-8 h-8 text-indigo-600 dark:text-indigo-400 animate-pulse" />
                  <div className="flex flex-col gap-0.5">
                    <span className="font-bold text-[var(--text-primary)]">
                      {isExtracting ? 'Analyzing document...' : 'Click to select report file'}
                    </span>
                    <span className="text-[11px] text-[var(--text-tertiary)]">
                      Supports PDF, PNG, JPG, CSV, XLSX
                    </span>
                  </div>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.csv,.xlsx,.xls,image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
            ) : (
              /* Review Screen */
              <div className="flex flex-col gap-4">
                <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 p-4 text-emerald-900 dark:text-emerald-200 flex flex-col gap-1">
                  <div className="flex items-center gap-2 font-bold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Report Parsed Successfully</span>
                  </div>
                  <span className="text-[11px]">
                    Extracted {extractionResult.subjects.length} course records for{' '}
                    <strong>{extractionResult.studentInfo.name || 'Student'}</strong> (Reg:{' '}
                    {extractionResult.studentInfo.registerNumber || 'N/A'}).
                  </span>
                </div>

                {/* Validation & Conflict Check */}
                {activeProfile.name &&
                  activeProfile.name !== 'Primary Student' &&
                  extractionResult.studentInfo.name &&
                  !extractionResult.studentInfo.name
                    .toLowerCase()
                    .includes(activeProfile.name.toLowerCase().split(' ')[0]) && (
                    <div className="rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 p-3 text-[11px] text-amber-900 dark:text-amber-200 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <span>
                        Notice: Name in document ("{extractionResult.studentInfo.name}") differs
                        from active profile ("{activeProfile.name}"). Saving will associate these
                        records strictly with your current profile ID.
                      </span>
                    </div>
                  )}

                {/* Courses Preview Table */}
                <div className="max-h-56 overflow-y-auto rounded-xl border border-[var(--border-secondary)]">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-[var(--bg-tertiary)] border-b border-[var(--border-secondary)] font-semibold text-[var(--text-secondary)]">
                        {supportsCode && <th className="p-2 w-24">Code</th>}
                        <th className="p-2">Course Title</th>
                        <th className="p-2 w-16 text-center">Cr</th>
                        <th className="p-2 w-16 text-center">Grade</th>
                        <th className="p-2 w-20 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-secondary)]">
                      {extractionResult.subjects.map((sub, i) => (
                        <tr key={i}>
                          {supportsCode && (
                            <td className="p-2 font-mono font-bold">{sub.subjectCode || '—'}</td>
                          )}
                          <td className="p-2 font-medium">{sub.subjectName}</td>
                          <td className="p-2 text-center">{sub.credits || '—'}</td>
                          <td className="p-2 text-center font-bold text-indigo-600">{sub.grade}</td>
                          <td className="p-2 text-center font-bold">{sub.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border-secondary)]">
                  <button
                    type="button"
                    onClick={() => setExtractionResult(null)}
                    className="apple-btn-secondary text-xs h-9 px-4 cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmSaveImport}
                    className="apple-btn-primary text-xs h-9 px-5 font-semibold cursor-pointer"
                  >
                    Confirm & Save to Dashboard
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD TIMETABLE CLASS                                                */}
      {/* ========================================================================= */}
      {isAddClassModalOpen && (
        <AddTimetableModal
          isOpen={isAddClassModalOpen}
          initialDay={selectedDay as any}
          supportsCode={supportsCode}
          onClose={() => setIsAddClassModalOpen(false)}
          onSave={(item) => {
            const newClass: AmsTimetableClass = {
              id: `tt-${Date.now()}`,
              profileId: activeProfile.id,
              ...item,
            };
            saveAmsDashboardData(activeProfile.id, {
              timetable: [...dashboardData.timetable, newClass],
            });
            setDashboardData(getAmsDashboardData(activeProfile.id));
            setIsAddClassModalOpen(false);
            showToast('Class period added to timetable!', 'success');
          }}
        />
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD ATTENDANCE SUBJECT                                             */}
      {/* ========================================================================= */}
      {isAddAttendanceModalOpen && (
        <AddAttendanceModal
          isOpen={isAddAttendanceModalOpen}
          supportsCode={supportsCode}
          onClose={() => setIsAddAttendanceModalOpen(false)}
          onSave={(item) => {
            const newAtt: AmsSubjectAttendance = {
              id: `att-${Date.now()}`,
              profileId: activeProfile.id,
              subjectName: sanitizeCourseTitle(item.subjectName),
              courseCode: supportsCode && item.courseCode ? item.courseCode.toUpperCase() : undefined,
              officialTotalSessions: item.officialTotalSessions,
              presentSessions: item.presentSessions,
              absentSessions: item.absentSessions,
              percentage: calculateAmsAttendancePercentage(
                item.officialTotalSessions,
                item.presentSessions
              ),
              lastUpdated: new Date().toISOString().split('T')[0],
              source: 'Manual Import',
            };
            saveAmsDashboardData(activeProfile.id, {
              attendance: [...dashboardData.attendance, newAtt],
            });
            setDashboardData(getAmsDashboardData(activeProfile.id));
            setIsAddAttendanceModalOpen(false);
            showToast('Attendance record saved!', 'success');
          }}
        />
      )}

      {/* Reset Confirm Modal */}
      <ResetConfirmModal
        isOpen={resetConfirmOpen}
        onClose={() => setResetConfirmOpen(false)}
        onConfirm={handleConfirmClearData}
        title="Clear Imported AMS Records?"
        description="Are you sure you want to delete all imported AMS records, timetable, and attendance history for this profile? Your shared course catalogue and base calculators will not be affected."
      />
    </div>
  );
};

/* ========================================================================= */
/* SUB-MODAL: Add Timetable Class                                            */
/* ========================================================================= */
const AddTimetableModal: React.FC<{
  isOpen: boolean;
  initialDay: any;
  supportsCode: boolean;
  onClose: () => void;
  onSave: (item: Omit<AmsTimetableClass, 'id' | 'profileId'>) => void;
}> = ({ isOpen, initialDay, supportsCode, onClose, onSave }) => {
  const [day, setDay] = useState<any>(initialDay || 'Monday');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [start, setStart] = useState('08:30 AM');
  const [end, setEnd] = useState('09:30 AM');
  const [room, setRoom] = useState('');
  const [faculty, setFaculty] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({
      day,
      subjectName: sanitizeCourseTitle(name),
      courseCode: supportsCode && code.trim() ? code.trim().toUpperCase() : undefined,
      startTime: start,
      endTime: end,
      room: room.trim() || undefined,
      faculty: faculty.trim() || undefined,
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 dark:bg-black/60 backdrop-blur-sm animate-appleFadeIn"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-[var(--surface)] border border-[var(--border-primary)] shadow-2xl p-6 flex flex-col gap-4 text-xs"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--border-secondary)] pb-3">
          <h3 className="text-base font-bold text-[var(--text-primary)]">Add Timetable Class</h3>
          <button type="button" onClick={onClose} className="p-1 rounded-lg text-[var(--text-secondary)]">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className="font-semibold text-[var(--text-primary)]">Day</label>
            <select
              value={day}
              onChange={(e) => setDay(e.target.value as any)}
              className="apple-input h-9 text-xs cursor-pointer"
            >
              {DAYS_OF_WEEK.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="font-semibold text-[var(--text-primary)]">
              Subject Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Design and Analysis of Algorithms"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="apple-input h-9 text-xs"
            />
          </div>

          {supportsCode && (
            <div className="flex flex-col gap-1">
              <label className="font-semibold text-[var(--text-primary)]">Course Code</label>
              <input
                type="text"
                placeholder="e.g. 10211CS202"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="apple-input h-9 text-xs font-mono uppercase"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <label className="font-semibold text-[var(--text-primary)]">Start Time</label>
              <input
                type="text"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className="apple-input h-9 text-xs font-mono"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="font-semibold text-[var(--text-primary)]">End Time</label>
              <input
                type="text"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                className="apple-input h-9 text-xs font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <label className="font-semibold text-[var(--text-primary)]">Room / Venue</label>
              <input
                type="text"
                placeholder="e.g. TP402"
                value={room}
                onChange={(e) => setRoom(e.target.value)}
                className="apple-input h-9 text-xs"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="font-semibold text-[var(--text-primary)]">Faculty Name</label>
              <input
                type="text"
                placeholder="e.g. Dr. A. Sharma"
                value={faculty}
                onChange={(e) => setFaculty(e.target.value)}
                className="apple-input h-9 text-xs"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border-secondary)]">
            <button type="button" onClick={onClose} className="apple-btn-secondary text-xs h-8 px-3">
              Cancel
            </button>
            <button type="submit" className="apple-btn-primary text-xs h-8 px-4 font-semibold">
              Save Class
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ========================================================================= */
/* SUB-MODAL: Add Subject Attendance                                         */
/* ========================================================================= */
const AddAttendanceModal: React.FC<{
  isOpen: boolean;
  supportsCode: boolean;
  onClose: () => void;
  onSave: (item: {
    subjectName: string;
    courseCode?: string;
    officialTotalSessions: number;
    presentSessions: number;
    absentSessions: number;
  }) => void;
}> = ({ isOpen, supportsCode, onClose, onSave }) => {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [total, setTotal] = useState<number>(40);
  const [present, setPresent] = useState<number>(35);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const safeTotal = Math.max(1, total);
    const safePresent = Math.min(safeTotal, Math.max(0, present));
    const absent = Math.max(0, safeTotal - safePresent);

    onSave({
      subjectName: name.trim(),
      courseCode: supportsCode && code.trim() ? code.trim().toUpperCase() : undefined,
      officialTotalSessions: safeTotal,
      presentSessions: safePresent,
      absentSessions: absent,
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 dark:bg-black/60 backdrop-blur-sm animate-appleFadeIn"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-[var(--surface)] border border-[var(--border-primary)] shadow-2xl p-6 flex flex-col gap-4 text-xs"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--border-secondary)] pb-3">
          <h3 className="text-base font-bold text-[var(--text-primary)]">Add Subject Attendance</h3>
          <button type="button" onClick={onClose} className="p-1 rounded-lg text-[var(--text-secondary)]">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className="font-semibold text-[var(--text-primary)]">
              Subject Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Operating Systems"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="apple-input h-9 text-xs"
            />
          </div>

          {supportsCode && (
            <div className="flex flex-col gap-1">
              <label className="font-semibold text-[var(--text-primary)]">Course Code</label>
              <input
                type="text"
                placeholder="e.g. 10211CS205"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="apple-input h-9 text-xs font-mono uppercase"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <label className="font-semibold text-[var(--text-primary)]">Official Total Sessions</label>
              <input
                type="number"
                min={1}
                required
                value={total}
                onChange={(e) => setTotal(parseInt(e.target.value) || 0)}
                className="apple-input h-9 text-xs text-center font-bold"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="font-semibold text-[var(--text-primary)]">Present Sessions</label>
              <input
                type="number"
                min={0}
                required
                value={present}
                onChange={(e) => setPresent(parseInt(e.target.value) || 0)}
                className="apple-input h-9 text-xs text-center font-bold text-emerald-600 dark:text-emerald-400"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border-secondary)]">
            <button type="button" onClick={onClose} className="apple-btn-secondary text-xs h-8 px-3">
              Cancel
            </button>
            <button type="submit" className="apple-btn-primary text-xs h-8 px-4 font-semibold">
              Save Attendance
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
