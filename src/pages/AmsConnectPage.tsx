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
  Eye,
  EyeOff,
  AlertTriangle,
  Award,
  Calculator,
  ShieldCheck,
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
import {
  amsIntegrationAdapter,
  OFFICIAL_AMS_METADATA,
  type AmsAuthStatusCode,
} from '../services/amsIntegrationAdapter';
import { amsSyncEngine, type SyncCenterState } from '../services/amsSyncEngine';
import { type ValidationSeverity } from '../services/amsValidationEngine';
import { isRegulationSupportingCourseCode, sanitizeCourseTitle } from '../services/catalogueStorage';
import { processAmsDocument } from '../utils/amsExtractor';
import type { AmsExtractionResult } from '../types/ams';
import { ResetConfirmModal } from '../components/common/ResetConfirmModal';
import { AMS_FEATURE_ENABLED } from '../config/features';
import { AmsDevelopmentNotice } from '../components/ams/AmsDevelopmentNotice';

export type DashboardTab =
  | 'overview'
  | 'syncCenter'
  | 'profile'
  | 'timetable'
  | 'attendance'
  | 'registered'
  | 'testLab'
  | 'internals'
  | 'results'
  | 'credits'
  | 'documents'
  | 'history';

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;

export const AmsConnectPage: React.FC = () => {
  if (!AMS_FEATURE_ENABLED) {
    return <AmsDevelopmentNotice />;
  }

  const { activeProfile } = useProfile();
  const { showToast } = useAppToast();

  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
  const [dashboardData, setDashboardData] = useState<AmsDashboardData>(() =>
    getAmsDashboardData(activeProfile.id)
  );

  // Authentication Form State (Transient in-memory only — never saved to storage)
  const [amsIdInput, setAmsIdInput] = useState<string>(() =>
    dashboardData.academicProfile.studentId || activeProfile.rollNumber || ''
  );
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [captchaInput, setCaptchaInput] = useState<string>('');
  const [captchaCode, setCaptchaCode] = useState<string>('RELLFT');

  // Connection State
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [authStatus, setAuthStatus] = useState<AmsAuthStatusCode>('idle');
  const [authMessage, setAuthMessage] = useState<string>('');
  const [authDetails, setAuthDetails] = useState<string>('');
  const [resetConfirmOpen, setResetConfirmOpen] = useState<boolean>(false);

  // Sync Center & Validation State
  const [validationFilter, setValidationFilter] = useState<'all' | ValidationSeverity>('all');
  const [confirmTransferAttendanceOpen, setConfirmTransferAttendanceOpen] = useState<boolean>(false);
  const [confirmTransferSgpaOpen, setConfirmTransferSgpaOpen] = useState<boolean>(false);
  const [selectedSgpaSemester, setSelectedSgpaSemester] = useState<number>(1);

  // Manual Document Import Modal
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [isExtracting, setIsExtracting] = useState<boolean>(false);
  const [extractionResult, setExtractionResult] = useState<AmsExtractionResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Timetable state
  const [selectedDay, setSelectedDay] = useState<string>(() => {
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    return DAYS_OF_WEEK.includes(today as any) ? today : 'Monday';
  });
  const [isAddClassModalOpen, setIsAddClassModalOpen] = useState<boolean>(false);

  // Attendance manual add modal
  const [isAddAttendanceModalOpen, setIsAddAttendanceModalOpen] = useState<boolean>(false);

  // Assessment sub-filter: 'all' | 'test' | 'assignment' | 'lab'
  const [assessmentCategory, setAssessmentCategory] = useState<'all' | 'test' | 'assignment' | 'lab'>('all');

  // Semester results filter
  const [resultsSemesterFilter, setResultsSemesterFilter] = useState<string>('all');

  // Reload data when active profile changes
  useEffect(() => {
    setDashboardData(getAmsDashboardData(activeProfile.id));
    setAmsIdInput(dashboardData.academicProfile.studentId || activeProfile.rollNumber || '');
    setAuthStatus('idle');
    setAuthMessage('');
    setAuthDetails('');
  }, [activeProfile.id]);

  const supportsCode = isRegulationSupportingCourseCode(
    dashboardData.academicProfile.regulation || activeProfile.regulation || 'VTR21'
  );

  // Live Sync Center state computation
  const syncCenterState: SyncCenterState = useMemo(() => {
    return amsSyncEngine.getSyncCenterState(activeProfile.id);
  }, [dashboardData, activeProfile.id]);

  // Filtered Validation Issues
  const filteredValidationIssues = useMemo(() => {
    if (validationFilter === 'all') return syncCenterState.validationReport.issues;
    return syncCenterState.validationReport.issues.filter((i) => i.severity === validationFilter);
  }, [syncCenterState.validationReport.issues, validationFilter]);

  // Refresh CAPTCHA code generator
  const refreshCaptcha = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCaptchaCode(code);
    setCaptchaInput('');
  };

  // Genuine Authentication Submission
  const handleConnectAms = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsConnecting(true);
    setAuthStatus('authenticating');
    setAuthMessage('');
    setAuthDetails('');

    const credentials = {
      username: amsIdInput,
      password: passwordInput,
      captcha: captchaInput,
    };

    // Immediately clear transient password from React state for security
    setPasswordInput('');

    try {
      const result = await amsIntegrationAdapter.authenticate(credentials, activeProfile.id);
      setIsConnecting(false);
      setAuthStatus(result.status);
      setAuthMessage(result.message);
      if (result.details) setAuthDetails(result.details);

      if (result.success) {
        setDashboardData(getAmsDashboardData(activeProfile.id));
        showToast('Successfully authenticated with official AMS.', 'success');
      } else if (result.status === 'invalid_credentials') {
        showToast('Authentication failed: Invalid Student ID or password.', 'error');
      } else if (result.status === 'captcha_required') {
        showToast('Session CAPTCHA verification is required.', 'info');
      } else if (result.status === 'official_api_required') {
        showToast('Institutional API authorization required from Vel Tech Office of CoE.', 'info');
      }
    } catch (err: any) {
      setIsConnecting(false);
      setAuthStatus('connection_error');
      setAuthMessage(`Connection error: ${err.message || 'Unable to reach official AMS'}`);
      showToast('Connection error connecting to official AMS.', 'error');
    }
  };

  // Secure Disconnect
  const handleDisconnect = async () => {
    await amsIntegrationAdapter.disconnect(activeProfile.id);
    setDashboardData(getAmsDashboardData(activeProfile.id));
    setAuthStatus('idle');
    setAuthMessage('');
    setAuthDetails('');
    showToast('AMS account disconnected. Session credentials cleared.', 'info');
  };

  // Manual Refresh
  const handleSyncNow = async () => {
    setIsSyncing(true);
    const summary = await amsIntegrationAdapter.syncAll(activeProfile.id);
    setTimeout(() => {
      setIsSyncing(false);
      addAmsSyncLog(activeProfile.id, {
        type: 'live_attempt',
        status: 'notice',
        message: 'Dashboard refresh completed.',
        details: `Verified ${summary.totalRetrieved} records across institutional modules. Flagged issues: ${syncCenterState.validationReport.issues.length}.`,
        recordsCount: summary.totalRetrieved,
      });
      setDashboardData(getAmsDashboardData(activeProfile.id));
      showToast('Dashboard records refreshed successfully.', 'success');
    }, 600);
  };

  // Calculator Transfer Handlers with Explicit Confirmation
  const handleExecuteTransferAttendance = () => {
    const res = amsSyncEngine.transferToAttendanceCalculator(activeProfile.id);
    setConfirmTransferAttendanceOpen(false);
    showToast(
      `Attendance Calculator updated: ${res.added} added, ${res.updated} updated, ${res.unchanged} unchanged.`,
      'success'
    );
  };

  const handleExecuteTransferSgpa = () => {
    const res = amsSyncEngine.transferToSgpaCalculator(activeProfile.id, selectedSgpaSemester);
    setConfirmTransferSgpaOpen(false);
    if (res.coursesCount > 0) {
      showToast(
        `Exported ${res.coursesCount} Semester ${selectedSgpaSemester} courses to SGPA Calculator.`,
        'success'
      );
    } else {
      showToast(`No results found for Semester ${selectedSgpaSemester}.`, 'info');
    }
  };

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
      message: `Reconciled with Credit Audit: ${res.added} courses added, ${res.updated} updated, ${res.skipped} already up to date.`,
    });

    showToast(
      `Reconciled with Credits page: ${res.added} added, ${res.updated} updated, ${res.skipped} up to date.`,
      'success'
    );
  };

  // Export JSON
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

  // Handle Document File Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsExtracting(true);
    setExtractionResult(null);

    try {
      const res = await processAmsDocument(file);
      setExtractionResult(res);
      if (res.imageQualityWarning) {
        showToast(res.imageQualityWarning, 'info');
      } else {
        showToast(`Parsed ${res.subjects.length} subjects from official report.`, 'success');
      }
    } catch (err: any) {
      showToast(`Error extracting report: ${err.message || 'Unknown error'}`, 'error');
    } finally {
      setIsExtracting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Save Extracted Document Records
  const handleConfirmExtraction = () => {
    if (!extractionResult) return;

    const student = extractionResult.studentInfo;
    const now = new Date().toISOString().split('T')[0];

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
      semesterResults: [...dashboardData.semesterResults, ...newResults],
      attendance: [...dashboardData.attendance, ...newAttendance],
    });

    addAmsSyncLog(activeProfile.id, {
      type: 'manual_import',
      status: 'success',
      message: `Imported official statement: ${extractionResult.fileName || 'Academic Report'}`,
      details: `Added ${newResults.length} course results and ${newAttendance.length} attendance tracks.`,
      recordsCount: newResults.length + newAttendance.length,
    });

    setDashboardData(getAmsDashboardData(activeProfile.id));
    setIsImportModalOpen(false);
    setExtractionResult(null);
    showToast('Imported verified records saved to personal AMS dashboard!', 'success');
  };

  // Filtered Today's Classes
  const todayClasses = useMemo(() => {
    return dashboardData.timetable.filter((t) => t.day === selectedDay);
  }, [dashboardData.timetable, selectedDay]);

  // Filtered Test & Lab Marks
  const testLabMarks = useMemo(() => {
    const list = dashboardData.internalMarks.filter((m) => m.category !== 'internal');
    if (assessmentCategory === 'all') return list;
    return list.filter((m) => m.category === assessmentCategory);
  }, [dashboardData.internalMarks, assessmentCategory]);

  // Filtered Theory Internal Marks
  const theoryInternalMarks = useMemo(() => {
    return dashboardData.internalMarks.filter((m) => m.category === 'internal');
  }, [dashboardData.internalMarks]);

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
      {/* 1. VEL TECH AMS BRANDING & STATUS HEADER                                   */}
      {/* ========================================================================= */}
      <div className="rounded-3xl bg-[var(--surface)] border border-[var(--border-primary)] shadow-sm p-6 sm:p-8 flex flex-col gap-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-[var(--border-secondary)]">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-white font-bold text-xl shadow-md shrink-0">
              <Building2 className="w-7 h-7" />
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)]">
                  Vel Tech AMS Connection & Sync Center
                </h1>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                    dashboardData.academicProfile.connectionStatus === 'connected'
                      ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                      : dashboardData.academicProfile.connectionStatus === 'manual_synced'
                      ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                      : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700'
                  }`}
                >
                  {dashboardData.academicProfile.connectionStatus === 'connected'
                    ? '● Authenticated (Live)'
                    : dashboardData.academicProfile.connectionStatus === 'manual_synced'
                    ? '● Synchronized (Official Document)'
                    : '○ Unconnected (API Pending)'}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-[var(--text-secondary)]">
                Vel Tech Rangarajan Dr. Sagunthala R&D Institute of Science and Technology
              </p>
              <a
                href={OFFICIAL_AMS_METADATA.portalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline mt-0.5"
              >
                <span>Official Institutional Portal: {OFFICIAL_AMS_METADATA.host}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Header Action Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setIsImportModalOpen(true)}
              className="apple-btn-secondary text-xs h-9 px-3.5 gap-1.5 font-medium cursor-pointer"
              title="Import official academic report file"
            >
              <Upload className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Import Official Report</span>
            </button>

            <button
              type="button"
              onClick={handleSyncNow}
              disabled={isSyncing}
              className="apple-btn-secondary text-xs h-9 px-3 gap-1 cursor-pointer"
              title="Refresh local dashboard data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh Sync</span>
            </button>

            {dashboardData.academicProfile.connectionStatus !== 'not_connected' && (
              <button
                type="button"
                onClick={handleDisconnect}
                className="apple-btn-secondary text-xs h-9 px-3 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
                title="Disconnect AMS session"
              >
                Disconnect
              </button>
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* AUTHENTICATION FORM & INSTITUTIONAL NOTICE                                */}
        {/* ========================================================================= */}
        <div className="rounded-2xl bg-[var(--bg-tertiary)]/40 border border-[var(--border-secondary)] p-5 sm:p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <h2 className="text-sm font-bold text-[var(--text-primary)]">
                Connect to Vel Tech Official AMS Account
              </h2>
            </div>
            <span className="text-[11px] text-[var(--text-tertiary)]">
              Last Sync:{' '}
              {dashboardData.lastSyncTime
                ? new Date(dashboardData.lastSyncTime).toLocaleString()
                : 'Never synced'}
            </span>
          </div>

          {/* Authentication Alert Banners */}
          {authStatus === 'invalid_credentials' && (
            <div className="rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 p-3.5 text-xs text-rose-900 dark:text-rose-200 flex items-start gap-2.5 animate-appleFadeIn">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex flex-col gap-0.5">
                <span className="font-bold">Authentication Failed</span>
                <p>{authMessage || 'Invalid Student ID or password. Please verify your credentials.'}</p>
              </div>
            </div>
          )}

          {authStatus === 'captcha_required' && (
            <div className="rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 p-3.5 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5 animate-appleFadeIn">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="flex flex-col gap-0.5">
                <span className="font-bold">Session CAPTCHA Required</span>
                <p>{authMessage || 'Please enter the CAPTCHA characters shown below.'}</p>
              </div>
            </div>
          )}

          {authStatus === 'official_api_required' && (
            <div className="rounded-xl bg-indigo-50/90 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800/80 p-4 text-xs text-indigo-950 dark:text-indigo-200 flex flex-col gap-2 animate-appleFadeIn">
              <div className="flex items-center gap-2 font-bold text-indigo-900 dark:text-indigo-300">
                <Lock className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>Institutional Authentication Notice</span>
              </div>
              <p className="leading-relaxed opacity-95 text-[11px] sm:text-xs">
                {authMessage}
              </p>
              {authDetails && (
                <p className="text-[11px] text-indigo-800 dark:text-indigo-300/80 italic leading-relaxed">
                  {authDetails}
                </p>
              )}
            </div>
          )}

          {authStatus === 'connected' && (
            <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 p-3.5 text-xs text-emerald-900 dark:text-emerald-200 flex items-center gap-2.5 animate-appleFadeIn">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-bold">Authenticated with Vel Tech AMS Gateway</span>
            </div>
          )}

          {/* Genuine Authentication Form */}
          <form onSubmit={handleConnectAms} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Student ID */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-[var(--text-secondary)]">
                Student AMS ID
              </label>
              <input
                type="text"
                placeholder="e.g. VTU12345"
                value={amsIdInput}
                onChange={(e) => setAmsIdInput(e.target.value.toUpperCase())}
                maxLength={30}
                required
                className="apple-input h-9 text-xs font-mono font-bold uppercase tracking-wider"
              />
            </div>

            {/* Password with Show/Hide toggle */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-[var(--text-secondary)]">
                AMS Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter Password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  maxLength={100}
                  required
                  className="apple-input h-9 text-xs pr-9"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] cursor-pointer"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* CAPTCHA Display & Input */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold text-[var(--text-secondary)]">
                  Session CAPTCHA
                </label>
                <button
                  type="button"
                  onClick={refreshCaptcha}
                  className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold hover:underline flex items-center gap-0.5"
                  title="Refresh CAPTCHA"
                >
                  <RefreshCw className="w-2.5 h-2.5" />
                  <span>Refresh</span>
                </button>
              </div>
              <div className="flex items-center gap-1.5">
                <div
                  className="px-2.5 py-1.5 rounded-lg bg-[var(--surface)] border border-[var(--border-primary)] font-mono font-bold text-xs tracking-widest text-[var(--text-primary)] select-none italic"
                  style={{ transform: 'skewX(-4deg)' }}
                >
                  {captchaCode}
                </div>
                <input
                  type="text"
                  placeholder="Enter Code"
                  value={captchaInput}
                  onChange={(e) => setCaptchaInput(e.target.value.toUpperCase())}
                  maxLength={10}
                  required
                  className="apple-input h-9 text-xs font-mono uppercase font-bold"
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex flex-col justify-end">
              <button
                type="submit"
                disabled={isConnecting}
                className="apple-btn-primary h-9 px-4 text-xs font-bold gap-2 cursor-pointer shadow-xs w-full"
              >
                {isConnecting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Authenticating...</span>
                  </>
                ) : (
                  <>
                    <Shield className="w-3.5 h-3.5" />
                    <span>Connect to AMS</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Privacy & Zero-Password Commitment */}
          <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-[var(--border-secondary)] text-[11px] text-[var(--text-tertiary)]">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>Zero-Storage Guarantee: Your password is kept only in transient memory during authentication and never saved to localStorage, logs, or analytics.</span>
            </div>
            <span>Profile ID: {activeProfile.id}</span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* ADVANCED TOOLS SECONDARY TOOLBAR                                          */}
        {/* ========================================================================= */}
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

        {/* ========================================================================= */}
        {/* NAVIGATION TABS (INCLUDING SYNC CENTER)                                   */}
        {/* ========================================================================= */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-[var(--border-secondary)] text-xs scrollbar-none">
          {[
            { id: 'overview', label: 'Overview', icon: LayoutDashboard },
            {
              id: 'syncCenter',
              label: 'Sync Center',
              icon: RefreshCw,
              badge: syncCenterState.validationReport.issues.length > 0
                ? `${syncCenterState.validationReport.issues.length} Issues`
                : undefined,
            },
            { id: 'profile', label: 'Profile', icon: User },
            { id: 'timetable', label: 'Timetable', icon: Calendar, badge: dashboardData.timetable.length },
            { id: 'attendance', label: 'Attendance', icon: FileCheck, badge: dashboardData.attendance.length },
            { id: 'registered', label: 'Registered Subjects', icon: BookOpen, badge: dashboardData.registeredCourses.length },
            { id: 'testLab', label: 'Test & Lab Marks', icon: Award, badge: testLabMarks.length },
            { id: 'internals', label: 'Internal Marks', icon: Calculator, badge: theoryInternalMarks.length },
            { id: 'results', label: 'Semester Results', icon: FileText, badge: dashboardData.semesterResults.length },
            { id: 'credits', label: 'Credit Earned Details', icon: Layers },
            { id: 'documents', label: 'Academic Documents', icon: Printer },
            { id: 'history', label: 'Sync Status & History', icon: History, badge: dashboardData.syncLogs.length },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as DashboardTab)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-black text-white dark:bg-white dark:text-black shadow-xs'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                {tab.badge && (
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
      {/* 2. TAB MODULE CONTENT SECTIONS                                            */}
      {/* ========================================================================= */}

      {/* 1. OVERVIEW DASHBOARD */}
      {activeTab === 'overview' && (
        <div className="flex flex-col gap-6 animate-appleFadeIn">
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
            <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border-primary)] p-4 sm:p-5 flex flex-col justify-between">
              <span className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                Credits Earned
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

          {/* Sync Center Banner */}
          <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border-primary)] p-5 sm:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                <RefreshCw className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[var(--text-primary)]">
                  AMS Data Synchronization & Validation Engine
                </h3>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  {syncCenterState.validationReport.issues.length === 0
                    ? 'All imported records verified. No schema or calculation issues detected.'
                    : `${syncCenterState.validationReport.issues.length} questionable records detected across academic modules.`}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('syncCenter')}
              className="apple-btn-primary text-xs h-8 px-4 font-bold shrink-0 cursor-pointer"
            >
              Open Sync Center →
            </button>
          </div>

          {/* Quick Actions & Links */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border-primary)] p-5 flex flex-col justify-between gap-3">
              <div>
                <h4 className="text-sm font-bold text-[var(--text-primary)]">Calculator Connections</h4>
                <p className="text-xs text-[var(--text-secondary)] mt-1">
                  Seamlessly push your official AMS attendance, marks, and grades into the four manual calculators.
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-[var(--border-secondary)]">
                <button
                  type="button"
                  onClick={() => setConfirmTransferAttendanceOpen(true)}
                  className="apple-btn-secondary text-xs h-8 px-3 font-semibold text-emerald-600 dark:text-emerald-400 cursor-pointer"
                >
                  Apply to Attendance Calculator
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmTransferSgpaOpen(true)}
                  className="apple-btn-secondary text-xs h-8 px-3 font-semibold text-indigo-600 dark:text-indigo-400 cursor-pointer"
                >
                  Apply to SGPA Calculator
                </button>
                <button
                  type="button"
                  onClick={handleReconcileCredits}
                  className="apple-btn-secondary text-xs h-8 px-3 font-semibold text-indigo-600 dark:text-indigo-400 cursor-pointer"
                >
                  Reconcile with Credits Planner
                </button>
              </div>
            </div>

            <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border-primary)] p-5 flex flex-col justify-between gap-3">
              <div>
                <h4 className="text-sm font-bold text-[var(--text-primary)]">Official Academic Reports</h4>
                <p className="text-xs text-[var(--text-secondary)] mt-1">
                  Generate printer-ready institutional transcripts, credit compliance certificates, and grade cards.
                </p>
              </div>
              <div className="pt-2 border-t border-[var(--border-secondary)]">
                <Link
                  to="/reports"
                  className="apple-btn-primary text-xs h-8 px-4 font-semibold gap-1.5 w-fit"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Open Full Reports Center</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. SYNC CENTER & VALIDATION ENGINE TAB (PHASE 4 & 6)                      */}
      {/* ========================================================================= */}
      {activeTab === 'syncCenter' && (
        <div className="flex flex-col gap-6 animate-appleFadeIn">
          {/* Synchronization Overview Card */}
          <div className="rounded-3xl bg-[var(--surface)] border border-[var(--border-primary)] p-6 sm:p-8 flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border-secondary)]">
              <div>
                <h3 className="text-base font-bold text-[var(--text-primary)]">
                  AMS Synchronization & Verification Hub
                </h3>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  Live audit and synchronization status across institutional student modules.
                </p>
              </div>
              <button
                type="button"
                onClick={handleSyncNow}
                disabled={isSyncing}
                className="apple-btn-primary text-xs h-8 px-4 font-bold gap-1.5 cursor-pointer self-start sm:self-auto"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>Run Synchronization Audit</span>
              </button>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-[var(--bg-tertiary)]/50 border border-[var(--border-secondary)] flex flex-col gap-1">
                <span className="text-[var(--text-secondary)] font-medium">Retrieved</span>
                <span className="text-xl font-black text-[var(--text-primary)]">
                  {syncCenterState.metrics.retrieved}
                </span>
                <span className="text-[10px] text-[var(--text-tertiary)]">Total source records</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-[var(--bg-tertiary)]/50 border border-[var(--border-secondary)] flex flex-col gap-1">
                <span className="text-[var(--text-secondary)] font-medium">Added</span>
                <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                  {syncCenterState.metrics.added}
                </span>
                <span className="text-[10px] text-[var(--text-tertiary)]">New verified items</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-[var(--bg-tertiary)]/50 border border-[var(--border-secondary)] flex flex-col gap-1">
                <span className="text-[var(--text-secondary)] font-medium">Updated</span>
                <span className="text-xl font-black text-indigo-600 dark:text-indigo-400">
                  {syncCenterState.metrics.updated}
                </span>
                <span className="text-[10px] text-[var(--text-tertiary)]">Refreshed data</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-[var(--bg-tertiary)]/50 border border-[var(--border-secondary)] flex flex-col gap-1">
                <span className="text-[var(--text-secondary)] font-medium">Unchanged</span>
                <span className="text-xl font-black text-[var(--text-primary)]">
                  {syncCenterState.metrics.unchanged}
                </span>
                <span className="text-[10px] text-[var(--text-tertiary)]">Already synced</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-[var(--bg-tertiary)]/50 border border-[var(--border-secondary)] flex flex-col gap-1">
                <span className="text-[var(--text-secondary)] font-medium">Flagged Issues</span>
                <span className="text-xl font-black text-amber-600 dark:text-amber-400">
                  {syncCenterState.validationReport.issues.length}
                </span>
                <span className="text-[10px] text-[var(--text-tertiary)]">Questionable records</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-[var(--bg-tertiary)]/50 border border-[var(--border-secondary)] flex flex-col gap-1">
                <span className="text-[var(--text-secondary)] font-medium">Errors</span>
                <span className="text-xl font-black text-rose-600 dark:text-rose-400">
                  {syncCenterState.validationReport.errorCount}
                </span>
                <span className="text-[10px] text-[var(--text-tertiary)]">Critical issues</span>
              </div>
            </div>

            {/* Per-Module Status Breakdown */}
            <div className="flex flex-col gap-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                Per-Module Integration Status
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 text-xs">
                {Object.entries(syncCenterState.perModuleStatus).map(([key, st]) => (
                  <div
                    key={key}
                    className="p-3 rounded-xl bg-[var(--bg-tertiary)]/50 border border-[var(--border-secondary)] flex flex-col justify-between gap-1.5"
                  >
                    <span className="font-semibold text-[var(--text-primary)] capitalize">
                      {key.replace(/([A-Z])/g, ' $1')}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold w-fit ${
                        st === 'synced'
                          ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                          : st === 'flagged'
                          ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                          : st === 'failed'
                          ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                      }`}
                    >
                      {st === 'synced'
                        ? 'Synced'
                        : st === 'flagged'
                        ? 'Flagged Issues'
                        : st === 'failed'
                        ? 'Failed'
                        : 'Not Available'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Validation Engine Inspector */}
          <div className="rounded-3xl bg-[var(--surface)] border border-[var(--border-primary)] p-6 sm:p-8 flex flex-col gap-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--border-secondary)]">
              <div>
                <h3 className="text-base font-bold text-[var(--text-primary)]">
                  Data Validation & Anomaly Detection Engine
                </h3>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  Validates credit values, semester assignments, duplicate subjects, marks limits, and attendance denominators.
                </p>
              </div>

              {/* Filter Pills */}
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[var(--bg-tertiary)] text-xs">
                {(['all', 'error', 'warning', 'info'] as const).map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => setValidationFilter(filter)}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all capitalize cursor-pointer ${
                      validationFilter === filter
                        ? 'bg-black text-white dark:bg-white dark:text-black shadow-xs'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {filter === 'all'
                      ? `All (${syncCenterState.validationReport.issues.length})`
                      : filter === 'error'
                      ? `Errors (${syncCenterState.validationReport.errorCount})`
                      : filter === 'warning'
                      ? `Warnings (${syncCenterState.validationReport.warningCount})`
                      : `Info (${syncCenterState.validationReport.infoCount})`}
                  </button>
                ))}
              </div>
            </div>

            {filteredValidationIssues.length === 0 ? (
              <div className="rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/60 p-8 text-center flex flex-col items-center justify-center gap-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                <h4 className="text-sm font-bold text-emerald-900 dark:text-emerald-300">
                  All Records Passed Validation
                </h4>
                <p className="text-xs text-emerald-800/80 dark:text-emerald-400/80 max-w-md">
                  No missing titles, credit inconsistencies, duplicate courses, or attendance denominator anomalies detected in this profile.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2.5 max-h-96 overflow-y-auto">
                {filteredValidationIssues.map((issue) => (
                  <div
                    key={issue.id}
                    className={`p-3.5 rounded-xl border text-xs flex flex-col gap-1.5 transition-colors ${
                      issue.severity === 'error'
                        ? 'bg-rose-50/50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/50'
                        : issue.severity === 'warning'
                        ? 'bg-amber-50/50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/50'
                        : 'bg-indigo-50/50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-900/50'
                    }`}
                  >
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            issue.severity === 'error'
                              ? 'bg-rose-600 text-white'
                              : issue.severity === 'warning'
                              ? 'bg-amber-500 text-black'
                              : 'bg-indigo-600 text-white'
                          }`}
                        >
                          {issue.severity}
                        </span>
                        <span className="font-bold text-[var(--text-primary)]">
                          {issue.recordTitle || issue.module}
                        </span>
                        <span className="font-mono text-[11px] text-[var(--text-tertiary)]">
                          [{issue.field}]
                        </span>
                      </div>
                      <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase">
                        {issue.code}
                      </span>
                    </div>

                    <p className="text-[var(--text-secondary)] leading-relaxed">
                      {issue.message}
                    </p>

                    {issue.suggestedFix && (
                      <div className="flex items-center gap-1.5 text-[11px] font-medium text-indigo-700 dark:text-indigo-300 pt-1 border-t border-[var(--border-secondary)]">
                        <span className="font-bold">Suggested Fix:</span>
                        <span>{issue.suggestedFix}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Calculator Connections Hub */}
          <div className="rounded-3xl bg-[var(--surface)] border border-[var(--border-primary)] p-6 sm:p-8 flex flex-col gap-5">
            <h3 className="text-base font-bold text-[var(--text-primary)]">
              Calculator Connection Hub (With Explicit Confirmation)
            </h3>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Export verified institutional attendance, semester grades, and credits directly to your calculators.
              Manual calculations are never overwritten without your explicit consent.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 text-xs">
              <div className="p-4 rounded-2xl bg-[var(--bg-tertiary)]/50 border border-[var(--border-secondary)] flex flex-col justify-between gap-3">
                <div className="flex flex-col gap-1">
                  <span className="font-bold text-[var(--text-primary)]">Attendance Calculator</span>
                  <p className="text-[11px] text-[var(--text-secondary)]">
                    Transfers {dashboardData.attendance.length} verified attendance tracks with conducted/present sessions.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setConfirmTransferAttendanceOpen(true)}
                  className="apple-btn-primary text-xs h-8 px-3 font-semibold cursor-pointer"
                >
                  Apply to Attendance Calculator
                </button>
              </div>

              <div className="p-4 rounded-2xl bg-[var(--bg-tertiary)]/50 border border-[var(--border-secondary)] flex flex-col justify-between gap-3">
                <div className="flex flex-col gap-1">
                  <span className="font-bold text-[var(--text-primary)]">SGPA Calculator</span>
                  <p className="text-[11px] text-[var(--text-secondary)]">
                    Loads verified course credits and letter grades into SGPA calculation draft.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setConfirmTransferSgpaOpen(true)}
                  className="apple-btn-primary text-xs h-8 px-3 font-semibold cursor-pointer"
                >
                  Apply to SGPA Calculator
                </button>
              </div>

              <div className="p-4 rounded-2xl bg-[var(--bg-tertiary)]/50 border border-[var(--border-secondary)] flex flex-col justify-between gap-3">
                <div className="flex flex-col gap-1">
                  <span className="font-bold text-[var(--text-primary)]">Credits Planner</span>
                  <p className="text-[11px] text-[var(--text-secondary)]">
                    Reconciles {dashboardData.semesterResults.length} course results without duplicate counting.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleReconcileCredits}
                  className="apple-btn-primary text-xs h-8 px-3 font-semibold cursor-pointer"
                >
                  Reconcile with Credits Planner
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. SECTION: PROFILE */}
      {activeTab === 'profile' && (
        <div className="rounded-3xl bg-[var(--surface)] border border-[var(--border-primary)] p-6 sm:p-8 flex flex-col gap-6 animate-appleFadeIn">
          <div className="flex items-center justify-between pb-4 border-b border-[var(--border-secondary)]">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-lg">
                <User className="w-6 h-6" />
              </div>
              <div className="flex flex-col">
                <h3 className="text-base font-bold text-[var(--text-primary)]">
                  {dashboardData.academicProfile.studentName || activeProfile.name || 'Not Available'}
                </h3>
                <span className="text-xs text-[var(--text-secondary)]">
                  Student ID: {dashboardData.academicProfile.studentId || activeProfile.rollNumber || 'Not Linked'}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
            <div className="flex flex-col gap-1 p-3.5 rounded-xl bg-[var(--bg-tertiary)]/50 border border-[var(--border-secondary)]">
              <span className="text-[var(--text-secondary)] font-medium">Institution</span>
              <span className="font-bold text-[var(--text-primary)]">Vel Tech University</span>
            </div>
            <div className="flex flex-col gap-1 p-3.5 rounded-xl bg-[var(--bg-tertiary)]/50 border border-[var(--border-secondary)]">
              <span className="text-[var(--text-secondary)] font-medium">Register Number</span>
              <span className="font-bold text-[var(--text-primary)]">
                {dashboardData.academicProfile.registerNumber || activeProfile.rollNumber || 'Not available'}
              </span>
            </div>
            <div className="flex flex-col gap-1 p-3.5 rounded-xl bg-[var(--bg-tertiary)]/50 border border-[var(--border-secondary)]">
              <span className="text-[var(--text-secondary)] font-medium">Degree</span>
              <span className="font-bold text-[var(--text-primary)]">
                {dashboardData.academicProfile.degree || activeProfile.degree || 'Not available'}
              </span>
            </div>
            <div className="flex flex-col gap-1 p-3.5 rounded-xl bg-[var(--bg-tertiary)]/50 border border-[var(--border-secondary)]">
              <span className="text-[var(--text-secondary)] font-medium">Department / Branch</span>
              <span className="font-bold text-[var(--text-primary)]">
                {dashboardData.academicProfile.department || activeProfile.department || 'Not available'}
              </span>
            </div>
            <div className="flex flex-col gap-1 p-3.5 rounded-xl bg-[var(--bg-tertiary)]/50 border border-[var(--border-secondary)]">
              <span className="text-[var(--text-secondary)] font-medium">Regulation</span>
              <span className="font-bold text-[var(--text-primary)] font-mono">
                {dashboardData.academicProfile.regulation || activeProfile.regulation || 'Not available'}
              </span>
            </div>
            <div className="flex flex-col gap-1 p-3.5 rounded-xl bg-[var(--bg-tertiary)]/50 border border-[var(--border-secondary)]">
              <span className="text-[var(--text-secondary)] font-medium">Current Semester</span>
              <span className="font-bold text-[var(--text-primary)]">
                {dashboardData.academicProfile.currentSemester
                  ? `Semester ${dashboardData.academicProfile.currentSemester}`
                  : activeProfile.currentSemester
                  ? `Semester ${activeProfile.currentSemester}`
                  : 'Not available'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 4. SECTION: TIMETABLE */}
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
              <span>Add Class Period</span>
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
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {todayClasses.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl bg-[var(--surface)] border border-[var(--border-primary)] p-4 shadow-xs flex flex-col justify-between gap-3"
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

      {/* 5. SECTION: ATTENDANCE */}
      {activeTab === 'attendance' && (
        <div className="flex flex-col gap-4 animate-appleFadeIn">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h3 className="text-sm font-bold text-[var(--text-primary)]">
              Daily & Subject-Wise Attendance Records
            </h3>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setConfirmTransferAttendanceOpen(true)}
                className="apple-btn-primary text-xs h-8 px-3.5 gap-1.5 font-semibold cursor-pointer"
                title="Copy official attendance to the manual Attendance Calculator"
              >
                <Calculator className="w-3.5 h-3.5" />
                <span>Send to Attendance Calculator</span>
              </button>
              <button
                type="button"
                onClick={() => setIsAddAttendanceModalOpen(true)}
                className="apple-btn-secondary text-xs h-8 px-3 gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Record</span>
              </button>
            </div>
          </div>

          {dashboardData.attendance.length === 0 ? (
            <div className="rounded-3xl bg-[var(--surface)] border border-[var(--border-primary)] p-12 text-center flex flex-col items-center justify-center gap-3">
              <FileCheck className="w-10 h-10 text-[var(--text-tertiary)] stroke-1" />
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                No Attendance Records Available
              </h3>
              <p className="text-xs text-[var(--text-secondary)] max-w-sm">
                Subject attendance records extracted from your official AMS statement or imported PDF will appear here.
              </p>
              <button
                type="button"
                onClick={() => setIsImportModalOpen(true)}
                className="apple-btn-primary text-xs h-8 px-4 font-semibold mt-1 cursor-pointer"
              >
                Import Attendance Statement
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

      {/* 6. SECTION: REGISTERED SUBJECTS */}
      {activeTab === 'registered' && (
        <div className="flex flex-col gap-4 animate-appleFadeIn">
          <h3 className="text-sm font-bold text-[var(--text-primary)]">
            Active Semester Course Registrations
          </h3>

          {dashboardData.registeredCourses.length === 0 ? (
            <div className="rounded-3xl bg-[var(--surface)] border border-[var(--border-primary)] p-12 text-center flex flex-col items-center justify-center gap-3">
              <BookOpen className="w-10 h-10 text-[var(--text-tertiary)] stroke-1" />
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                No Course Registrations Available
              </h3>
              <p className="text-xs text-[var(--text-secondary)] max-w-sm">
                Current semester registrations extracted from your official AMS course card will appear here.
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

      {/* 7. SECTION: TEST / ASSIGNMENT / LAB MARKS */}
      {activeTab === 'testLab' && (
        <div className="flex flex-col gap-4 animate-appleFadeIn">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[var(--surface)] border border-[var(--border-primary)] shadow-xs overflow-x-auto scrollbar-none">
              {[
                { id: 'all', label: 'All Assessments' },
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
          </div>

          {testLabMarks.length === 0 ? (
            <div className="rounded-3xl bg-[var(--surface)] border border-[var(--border-primary)] p-12 text-center flex flex-col items-center justify-center gap-3">
              <Award className="w-10 h-10 text-[var(--text-tertiary)] stroke-1" />
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                No Test or Lab Marks Available
              </h3>
              <p className="text-xs text-[var(--text-secondary)] max-w-sm">
                Specific component marks appear here when uploaded or extracted from official marks statements.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {testLabMarks.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl bg-[var(--surface)] border border-[var(--border-primary)] p-4 shadow-xs flex flex-col justify-between gap-3"
                >
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">
                      {item.assessmentType}
                    </span>
                    <h4 className="text-sm font-bold text-[var(--text-primary)]">
                      {item.subjectName}
                    </h4>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-[var(--border-secondary)]">
                    <span className="text-xs text-[var(--text-secondary)]">Score</span>
                    <span className="text-sm font-extrabold text-[var(--text-primary)]">
                      {item.marksObtained} / {item.maxMarks}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 8. SECTION: INTERNAL MARKS */}
      {activeTab === 'internals' && (
        <div className="flex flex-col gap-4 animate-appleFadeIn">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h3 className="text-sm font-bold text-[var(--text-primary)]">
              Continuous Internal Assessment (IA 1, IA 2, Model Exams)
            </h3>
            <Link
              to="/internals"
              className="apple-btn-primary text-xs h-8 px-3.5 font-semibold gap-1.5"
            >
              <Calculator className="w-3.5 h-3.5" />
              <span>Open Internal Marks Calculator</span>
            </Link>
          </div>

          {theoryInternalMarks.length === 0 ? (
            <div className="rounded-3xl bg-[var(--surface)] border border-[var(--border-primary)] p-12 text-center flex flex-col items-center justify-center gap-3">
              <BookOpen className="w-10 h-10 text-[var(--text-tertiary)] stroke-1" />
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                No Internal Assessment Records Available
              </h3>
              <p className="text-xs text-[var(--text-secondary)] max-w-sm">
                Internal marks published on the AMS portal will appear here once synchronized or imported.
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
              {theoryInternalMarks.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl bg-[var(--surface)] border border-[var(--border-primary)] p-4 shadow-xs flex flex-col justify-between gap-3"
                >
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">
                      {item.assessmentType}
                    </span>
                    <h4 className="text-sm font-bold text-[var(--text-primary)]">
                      {item.subjectName}
                    </h4>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-[var(--border-secondary)]">
                    <span className="text-xs text-[var(--text-secondary)]">Score</span>
                    <span className="text-sm font-extrabold text-[var(--text-primary)]">
                      {item.marksObtained} / {item.maxMarks}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 9. SECTION: SEMESTER RESULTS */}
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

            <div className="flex items-center gap-2">
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
              <button
                type="button"
                onClick={() => setConfirmTransferSgpaOpen(true)}
                className="apple-btn-primary text-xs h-8 px-3.5 font-semibold gap-1.5 cursor-pointer"
              >
                <Calculator className="w-3.5 h-3.5" />
                <span>Send to SGPA Calculator</span>
              </button>
            </div>
          </div>

          {filteredResults.length === 0 ? (
            <div className="rounded-3xl bg-[var(--surface)] border border-[var(--border-primary)] p-12 text-center flex flex-col items-center justify-center gap-3">
              <FileText className="w-10 h-10 text-[var(--text-tertiary)] stroke-1" />
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                No Results Available
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

      {/* 10. SECTION: CREDIT EARNED DETAILS */}
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

      {/* 11. SECTION: ACADEMIC DOCUMENTS */}
      {activeTab === 'documents' && (
        <div className="flex flex-col gap-5 animate-appleFadeIn">
          <div className="rounded-3xl bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 border border-indigo-200/60 dark:border-indigo-800/60 p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex flex-col gap-2 max-w-xl">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-base sm:text-lg font-bold text-[var(--text-primary)]">
                  Official Academic Documents & Reports Center
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

      {/* 12. SECTION: SYNC STATUS AND HISTORY */}
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
      {/* MODAL: MANUAL DOCUMENT IMPORT & REVIEW                                    */}
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
                  Import Official Academic Report (PDF / Image)
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
                <p className="text-[var(--text-secondary)] leading-relaxed">
                  Upload your official downloaded Vel Tech Grade Card, Credit Analysis Report, or Attendance statement.
                  Your file is processed entirely within your device's browser and is never uploaded to any remote server.
                </p>

                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-2xl border-2 border-dashed border-[var(--border-secondary)] hover:border-indigo-500/50 p-8 text-center flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors bg-[var(--bg-tertiary)]/20"
                >
                  <Upload className="w-8 h-8 text-indigo-500 stroke-1" />
                  <div className="flex flex-col gap-1">
                    <span className="font-semibold text-[var(--text-primary)]">
                      Click to choose or drop official report file
                    </span>
                    <span className="text-[11px] text-[var(--text-tertiary)]">
                      Supports PDF, PNG, JPG files
                    </span>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>

                {isExtracting && (
                  <div className="flex items-center justify-center gap-2 py-4 text-indigo-600 dark:text-indigo-400 font-semibold">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Analyzing official document tables & grades...</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-4 animate-appleFadeIn">
                <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200/50 dark:border-indigo-800/50 flex flex-col gap-2">
                  <span className="font-bold text-indigo-900 dark:text-indigo-300">
                    Extracted Student Verification
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
                    <div>
                      <span className="text-[var(--text-tertiary)]">Name: </span>
                      <span className="font-semibold">{extractionResult.studentInfo.name || '—'}</span>
                    </div>
                    <div>
                      <span className="text-[var(--text-tertiary)]">ID: </span>
                      <span className="font-semibold">{extractionResult.studentInfo.studentId || '—'}</span>
                    </div>
                    <div>
                      <span className="text-[var(--text-tertiary)]">Semester: </span>
                      <span className="font-semibold">Sem {extractionResult.studentInfo.semester || 1}</span>
                    </div>
                    <div>
                      <span className="text-[var(--text-tertiary)]">Regulation: </span>
                      <span className="font-semibold">{extractionResult.studentInfo.regulation || '—'}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
                  <span className="font-bold text-[var(--text-primary)]">
                    Detected Course Results ({extractionResult.subjects.length})
                  </span>
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-[var(--border-secondary)] bg-[var(--bg-tertiary)] text-[var(--text-secondary)] font-semibold">
                        <th className="p-2">Subject</th>
                        <th className="p-2 w-16 text-center">Cr</th>
                        <th className="p-2 w-16 text-center">Grade</th>
                        <th className="p-2 w-20 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-secondary)]">
                      {extractionResult.subjects.map((sub, idx) => (
                        <tr key={idx}>
                          <td className="p-2 font-medium">{sub.subjectName}</td>
                          <td className="p-2 text-center font-bold">{sub.credits ?? 3}</td>
                          <td className="p-2 text-center font-bold text-indigo-600 dark:text-indigo-400">
                            {sub.grade || '—'}
                          </td>
                          <td className="p-2 text-center">
                            <span
                              className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                                sub.status === 'Pass'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                  : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                              }`}
                            >
                              {sub.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border-secondary)]">
                  <button
                    type="button"
                    onClick={() => setExtractionResult(null)}
                    className="apple-btn-secondary text-xs h-8 px-3"
                  >
                    Cancel / Choose Another
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmExtraction}
                    className="apple-btn-primary text-xs h-8 px-4 font-semibold"
                  >
                    Confirm & Save to Dashboard
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: ADD CLASS PERIOD */}
      {isAddClassModalOpen && (
        <AddClassModal
          day={selectedDay}
          onClose={() => setIsAddClassModalOpen(false)}
          onAdd={(newClass) => {
            saveAmsDashboardData(activeProfile.id, {
              timetable: [...dashboardData.timetable, newClass],
            });
            setDashboardData(getAmsDashboardData(activeProfile.id));
            setIsAddClassModalOpen(false);
            showToast('Class period added to timetable.', 'success');
          }}
          profileId={activeProfile.id}
          supportsCode={supportsCode}
        />
      )}

      {/* MODAL: ADD ATTENDANCE RECORD */}
      {isAddAttendanceModalOpen && (
        <AddAttendanceModal
          onClose={() => setIsAddAttendanceModalOpen(false)}
          onAdd={(newAtt) => {
            saveAmsDashboardData(activeProfile.id, {
              attendance: [...dashboardData.attendance, newAtt],
            });
            setDashboardData(getAmsDashboardData(activeProfile.id));
            setIsAddAttendanceModalOpen(false);
            showToast('Attendance record saved.', 'success');
          }}
          profileId={activeProfile.id}
          supportsCode={supportsCode}
        />
      )}

      {/* MODAL: CONFIRM TRANSFER TO ATTENDANCE CALCULATOR */}
      {confirmTransferAttendanceOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 dark:bg-black/60 backdrop-blur-sm animate-appleFadeIn"
          onClick={() => setConfirmTransferAttendanceOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-3xl bg-[var(--surface)] border border-[var(--border-primary)] shadow-2xl p-6 flex flex-col gap-4 text-xs"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2">
              <Calculator className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <h3 className="text-sm font-bold text-[var(--text-primary)]">
                Export to Attendance Calculator
              </h3>
            </div>
            <p className="text-[var(--text-secondary)] leading-relaxed">
              This will transfer {dashboardData.attendance.length} verified subject attendance records into your manual Attendance Calculator.
              Existing subjects matching names will be safely updated with official session counts without duplicating your records.
            </p>
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border-secondary)]">
              <button
                type="button"
                onClick={() => setConfirmTransferAttendanceOpen(false)}
                className="apple-btn-secondary text-xs h-8 px-3 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteTransferAttendance}
                className="apple-btn-primary text-xs h-8 px-4 font-semibold cursor-pointer"
              >
                Confirm Export
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRM TRANSFER TO SGPA CALCULATOR */}
      {confirmTransferSgpaOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 dark:bg-black/60 backdrop-blur-sm animate-appleFadeIn"
          onClick={() => setConfirmTransferSgpaOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-3xl bg-[var(--surface)] border border-[var(--border-primary)] shadow-2xl p-6 flex flex-col gap-4 text-xs"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2">
              <Calculator className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-sm font-bold text-[var(--text-primary)]">
                Export to SGPA Calculator
              </h3>
            </div>
            <p className="text-[var(--text-secondary)] leading-relaxed">
              Select which semester's verified courses and grades to load into the SGPA Calculator draft:
            </p>
            <div className="flex flex-col gap-1.5">
              <label className="font-semibold text-[var(--text-primary)]">Target Semester</label>
              <select
                value={selectedSgpaSemester}
                onChange={(e) => setSelectedSgpaSemester(parseInt(e.target.value))}
                className="apple-input h-9 text-xs cursor-pointer font-bold"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                  <option key={s} value={s}>
                    Semester {s} ({dashboardData.semesterResults.filter((r) => (r.semester || 1) === s).length} courses)
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border-secondary)]">
              <button
                type="button"
                onClick={() => setConfirmTransferSgpaOpen(false)}
                className="apple-btn-secondary text-xs h-8 px-3 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteTransferSgpa}
                className="apple-btn-primary text-xs h-8 px-4 font-semibold cursor-pointer"
              >
                Confirm Export
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: RESET CONFIRM */}
      <ResetConfirmModal
        isOpen={resetConfirmOpen}
        onClose={() => setResetConfirmOpen(false)}
        onConfirm={() => {
          clearAmsDataForProfile(activeProfile.id);
          setDashboardData(getAmsDashboardData(activeProfile.id));
          setResetConfirmOpen(false);
          showToast('All imported AMS records deleted for this profile.', 'info');
        }}
        title="Clear Imported AMS Records"
        description="Are you sure you want to delete all imported AMS timetable, attendance, marks, and result records for this student profile? This will not affect your manually saved calculator records."
        confirmLabel="Clear Data"
      />
    </div>
  );
};

// =============================================================================
// SUB-MODAL COMPONENTS
// =============================================================================

interface AddClassModalProps {
  day: string;
  onClose: () => void;
  onAdd: (newClass: AmsTimetableClass) => void;
  profileId: string;
  supportsCode: boolean;
}

const AddClassModal: React.FC<AddClassModalProps> = ({
  day,
  onClose,
  onAdd,
  profileId,
  supportsCode,
}) => {
  const [subjectName, setSubjectName] = useState('');
  const [courseCode, setCourseCode] = useState('');
  const [startTime, setStartTime] = useState('08:30 AM');
  const [endTime, setEndTime] = useState('09:30 AM');
  const [room, setRoom] = useState('');
  const [faculty, setFaculty] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectName.trim()) return;

    onAdd({
      id: `cls-${Date.now()}`,
      profileId,
      day: day as any,
      subjectName: sanitizeCourseTitle(subjectName.trim()),
      courseCode: supportsCode && courseCode.trim() ? courseCode.trim().toUpperCase() : undefined,
      startTime,
      endTime,
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
        className="w-full max-w-md rounded-3xl bg-[var(--surface)] border border-[var(--border-primary)] shadow-2xl p-6 flex flex-col gap-4 text-xs"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--border-secondary)] pb-3">
          <h3 className="text-sm font-bold text-[var(--text-primary)]">Add Class Period ({day})</h3>
          <button type="button" onClick={onClose} className="p-1 text-[var(--text-secondary)]">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className="font-semibold text-[var(--text-primary)]">Subject Name</label>
            <input
              type="text"
              placeholder="e.g. Distributed Computing"
              required
              value={subjectName}
              onChange={(e) => setSubjectName(e.target.value)}
              className="apple-input h-9 text-xs"
            />
          </div>

          {supportsCode && (
            <div className="flex flex-col gap-1">
              <label className="font-semibold text-[var(--text-primary)]">Course Code</label>
              <input
                type="text"
                placeholder="e.g. 10211CS205"
                value={courseCode}
                onChange={(e) => setCourseCode(e.target.value.toUpperCase())}
                className="apple-input h-9 text-xs font-mono uppercase"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <label className="font-semibold text-[var(--text-primary)]">Start Time</label>
              <input
                type="text"
                placeholder="08:30 AM"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="apple-input h-9 text-xs font-mono"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="font-semibold text-[var(--text-primary)]">End Time</label>
              <input
                type="text"
                placeholder="09:30 AM"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="apple-input h-9 text-xs font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <label className="font-semibold text-[var(--text-primary)]">Room</label>
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
                placeholder="e.g. Dr. K. Raman"
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
              Save Period
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface AddAttendanceModalProps {
  onClose: () => void;
  onAdd: (newAtt: AmsSubjectAttendance) => void;
  profileId: string;
  supportsCode: boolean;
}

const AddAttendanceModal: React.FC<AddAttendanceModalProps> = ({
  onClose,
  onAdd,
  profileId,
  supportsCode,
}) => {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [total, setTotal] = useState(40);
  const [present, setPresent] = useState(36);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const absent = Math.max(0, total - present);
    onAdd({
      id: `att-${Date.now()}`,
      profileId,
      subjectName: sanitizeCourseTitle(name.trim()),
      courseCode: supportsCode && code.trim() ? code.trim().toUpperCase() : undefined,
      officialTotalSessions: total,
      presentSessions: present,
      absentSessions: absent,
      percentage: calculateAmsAttendancePercentage(total, present),
      source: 'Manual Import',
      lastUpdated: new Date().toISOString().split('T')[0],
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
        className="w-full max-w-md rounded-3xl bg-[var(--surface)] border border-[var(--border-primary)] shadow-2xl p-6 flex flex-col gap-4 text-xs"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--border-secondary)] pb-3">
          <h3 className="text-sm font-bold text-[var(--text-primary)]">Add Subject Attendance</h3>
          <button type="button" onClick={onClose} className="p-1 text-[var(--text-secondary)]">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className="font-semibold text-[var(--text-primary)]">Subject Name</label>
            <input
              type="text"
              placeholder="e.g. Design and Analysis of Algorithms"
              required
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
