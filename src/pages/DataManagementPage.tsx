import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Download,
  Upload,
  HardDrive,
  Shield,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  Lock,
  RefreshCw,
  Users,
  Check,
  X,
  Database,
} from 'lucide-react';
import { useProfile } from '../context/ProfileContext';
import { useAppToast } from '../components/layout/AppShell';
import {
  exportStudentBackup,
  downloadBackupFile,
  validateBackupFile,
  detectBackupConflicts,
  restoreStudentBackup,
  resetStudentPersonalData,
  getStorageBreakdown,
  type StudentBackupData,
  type BackupSummary,
  type BackupConflictReport,
  type StorageBreakdown,
} from '../services/dataBackupService';

export const DataManagementPage: React.FC = () => {
  const { activeProfile, profiles, switchProfile, refreshProfiles } = useProfile();
  const { showToast } = useAppToast();

  // Storage breakdown state
  const [storage, setStorage] = useState<StorageBreakdown | null>(null);
  const [isRefreshingStorage, setIsRefreshingStorage] = useState(false);

  // Export state
  const [isExporting, setIsExporting] = useState(false);

  // Import / Preview modal state
  const [validatedBackup, setValidatedBackup] = useState<StudentBackupData | null>(null);
  const [backupSummary, setBackupSummary] = useState<BackupSummary | null>(null);
  const [conflictReport, setConflictReport] = useState<BackupConflictReport | null>(null);
  const [selectedStrategy, setSelectedStrategy] = useState<'merge' | 'replace'>('merge');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [replaceConfirmed, setReplaceConfirmed] = useState(false);

  // Reset modal state
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load storage breakdown
  const loadStorageInfo = async () => {
    setIsRefreshingStorage(true);
    try {
      const breakdown = await getStorageBreakdown(activeProfile.id);
      setStorage(breakdown);
    } catch {
      // fallback
    } finally {
      setIsRefreshingStorage(false);
    }
  };

  useEffect(() => {
    loadStorageInfo();
  }, [activeProfile.id]);

  // Handle Export
  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const backup = await exportStudentBackup(activeProfile.id);
      downloadBackupFile(backup);
      showToast('Backup file downloaded successfully!', 'success');
    } catch (err: any) {
      showToast(`Export failed: ${err.message || 'Unknown error'}`, 'error');
    } finally {
      setIsExporting(false);
    }
  };

  // Handle File Chosen for Import
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      if (!content) {
        showToast('File is empty.', 'error');
        return;
      }

      const validation = validateBackupFile(content);
      if (!validation.valid || !validation.data || !validation.summary) {
        showToast(validation.error || 'Invalid backup file format.', 'error');
        return;
      }

      setValidatedBackup(validation.data);
      setBackupSummary(validation.summary);

      // Detect conflicts
      const conflicts = await detectBackupConflicts(activeProfile, validation.data);
      setConflictReport(conflicts);
      setSelectedStrategy('merge');
      setReplaceConfirmed(false);
      setIsImportModalOpen(true);
    };

    reader.onerror = () => {
      showToast('Failed to read the backup file.', 'error');
    };

    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Confirm and Execute Restore
  const handleConfirmRestore = async () => {
    if (!validatedBackup) return;

    if (selectedStrategy === 'replace' && !replaceConfirmed) {
      showToast('Please confirm replacement of current records.', 'error');
      return;
    }

    setIsRestoring(true);
    try {
      const result = await restoreStudentBackup(activeProfile.id, validatedBackup, selectedStrategy);
      if (result.success) {
        showToast(result.message, 'success');
        setIsImportModalOpen(false);
        setValidatedBackup(null);
        setBackupSummary(null);
        await refreshProfiles();
        await loadStorageInfo();
      } else {
        showToast(result.message, 'error');
      }
    } catch (err: any) {
      showToast(`Restoration failed: ${err.message || 'Storage error.'}`, 'error');
    } finally {
      setIsRestoring(false);
    }
  };

  // Confirm and Execute Reset
  const handleConfirmReset = async () => {
    setIsResetting(true);
    try {
      const result = await resetStudentPersonalData(activeProfile.id);
      if (result.success) {
        showToast(result.message, 'info');
        setIsResetModalOpen(false);
        await refreshProfiles();
        await loadStorageInfo();
      } else {
        showToast(result.message, 'error');
      }
    } catch (err: any) {
      showToast(`Reset error: ${err.message || 'Could not reset records.'}`, 'error');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="apple-page-enter flex flex-col gap-8 w-full">
      {/* 1. Header & Breadcrumb */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--border-secondary)] pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-secondary)] mb-1">
            <Link to="/profile" className="hover:text-[var(--text-primary)] transition-colors">
              Profile
            </Link>
            <span>/</span>
            <span className="text-[var(--text-primary)]">Settings → Data Management</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)] flex items-center gap-2.5">
            <Database className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            <span>Data Management & Local Privacy</span>
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1 max-w-2xl">
            Backup your personal records, restore previous workspaces, check local storage usage, and keep your academic data strictly on this device.
          </p>
        </div>

        {/* Profile Switcher */}
        <div className="flex items-center gap-2 bg-[var(--surface)] border border-[var(--border-primary)] rounded-xl px-3 py-1.5 shadow-xs">
          <Users className="w-4 h-4 text-[var(--text-secondary)]" />
          <div className="flex flex-col">
            <span className="text-[9px] uppercase tracking-wider font-bold text-[var(--text-tertiary)]">
              Active Student
            </span>
            <select
              value={activeProfile.id}
              onChange={(e) => switchProfile(e.target.value)}
              className="bg-transparent text-xs font-semibold text-[var(--text-primary)] outline-none cursor-pointer"
            >
              {profiles.map((p) => (
                <option key={p.id} value={p.id} className="bg-[var(--surface)] text-[var(--text-primary)]">
                  {p.name} {p.rollNumber ? `(${p.rollNumber})` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 2. Storage Status & Device Footprint Card */}
      <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border-primary)] p-6 shadow-sm flex flex-col gap-5">
        <div className="flex items-center justify-between border-b border-[var(--border-secondary)] pb-3">
          <div className="flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-base font-bold text-[var(--text-primary)]">
              Device Storage Status
            </h2>
          </div>
          <button
            type="button"
            onClick={loadStorageInfo}
            disabled={isRefreshingStorage}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--bg-tertiary)] hover:bg-[var(--border-secondary)] text-[var(--text-secondary)] transition-colors cursor-pointer"
            title="Refresh local storage status"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingStorage ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-[var(--bg-tertiary)]/70 border border-[var(--border-secondary)] flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
              Courses & Credits
            </span>
            <div className="text-lg font-bold text-[var(--text-primary)]">
              {storage?.creditsCount ?? 0}
            </div>
            <span className="text-[11px] text-[var(--text-tertiary)]">
              {storage ? `${(storage.creditsBytes / 1024).toFixed(1)} KB` : '—'}
            </span>
          </div>

          <div className="p-4 rounded-xl bg-[var(--bg-tertiary)]/70 border border-[var(--border-secondary)] flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
              Attendance Records
            </span>
            <div className="text-lg font-bold text-[var(--text-primary)]">
              {storage?.attendanceCount ?? 0}
            </div>
            <span className="text-[11px] text-[var(--text-tertiary)]">
              {storage ? `${(storage.attendanceBytes / 1024).toFixed(1)} KB` : '—'}
            </span>
          </div>

          <div className="p-4 rounded-xl bg-[var(--bg-tertiary)]/70 border border-[var(--border-secondary)] flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
              Saved Calculations
            </span>
            <div className="text-lg font-bold text-[var(--text-primary)]">
              {storage?.indexedDbCalculationsCount ?? 0}
            </div>
            <span className="text-[11px] text-[var(--text-tertiary)]">
              {storage ? `${(storage.indexedDbCalculationsBytes / 1024).toFixed(1)} KB` : '—'}
            </span>
          </div>

          <div className="p-4 rounded-xl bg-[var(--bg-tertiary)]/70 border border-[var(--border-secondary)] flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
              Total Profile Storage
            </span>
            <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
              {storage?.formattedTotalBytes ?? '0 B'}
            </div>
            <span className="text-[11px] text-[var(--text-tertiary)]">
              {storage?.formattedEstimateUsage
                ? `${storage.formattedEstimateUsage} browser total`
                : 'IndexedDB + LocalStorage'}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Export & Import Action Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Export Card */}
        <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border-primary)] p-6 shadow-sm flex flex-col justify-between gap-6">
          <div className="flex flex-col gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--text-primary)]">
                Export My Data
              </h2>
              <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
                Download a clean, structured JSON file containing all academic records for <strong>{activeProfile.name}</strong>.
              </p>
            </div>

            <ul className="text-xs text-[var(--text-secondary)] space-y-1.5 list-disc pl-4 pt-1">
              <li>Course list, categories, and credit progress</li>
              <li>Attendance subjects, logs, and target goals</li>
              <li>Saved SGPA, CGPA, and internal marks calculations</li>
              <li>Personal degree pathway and grading preferences</li>
              <li>Format version and export timestamp included</li>
              <li className="font-semibold text-emerald-600 dark:text-emerald-400 list-none -ml-4 flex items-center gap-1.5 pt-1">
                <Shield className="w-3.5 h-3.5 shrink-0" />
                <span>Zero passwords, tokens, or credentials exported</span>
              </li>
            </ul>
          </div>

          <button
            type="button"
            onClick={handleExportData}
            disabled={isExporting}
            className="apple-btn-primary text-xs h-11 px-5 gap-2 font-semibold justify-center cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>{isExporting ? 'Generating Backup...' : 'Export Personal Data (JSON)'}</span>
          </button>
        </div>

        {/* Import Card */}
        <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border-primary)] p-6 shadow-sm flex flex-col justify-between gap-6">
          <div className="flex flex-col gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--text-primary)]">
                Import My Backup
              </h2>
              <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
                Restore academic records from a previously exported JSON backup file with conflict inspection.
              </p>
            </div>

            <ul className="text-xs text-[var(--text-secondary)] space-y-1.5 list-disc pl-4 pt-1">
              <li>Validates format, version, and file integrity before saving</li>
              <li>Pre-import preview of courses, attendance, and calculations</li>
              <li>Detects duplicate records and conflicting student profiles</li>
              <li>Choose between <strong>Safe Merge</strong> or <strong>Replace Records</strong></li>
              <li>Immediate recalculation of credit and attendance totals</li>
            </ul>
          </div>

          <div>
            <input
              type="file"
              ref={fileInputRef}
              accept=".json,application/json"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="apple-btn-secondary text-xs h-11 px-5 gap-2 font-semibold justify-center w-full cursor-pointer hover:border-emerald-400"
            >
              <Upload className="w-4 h-4 text-[var(--text-primary)]" />
              <span>Select Backup File (JSON)</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4. Reset Personal Data Section */}
      <div className="rounded-2xl bg-[var(--surface)] border border-rose-200 dark:border-rose-900/60 p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 bg-gradient-to-r from-rose-50/40 dark:from-rose-950/10 to-transparent">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0 mt-0.5">
            <RotateCcw className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[var(--text-primary)]">
              Reset My Personal Data
            </h2>
            <p className="text-xs text-[var(--text-secondary)] mt-1 max-w-xl leading-relaxed">
              Resets personal records for <strong>{activeProfile.name}</strong> to zero and empty defaults. Shared regulation catalogues and other student profiles are completely preserved.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setIsResetModalOpen(true);
          }}
          className="apple-btn-secondary text-xs h-10 px-4 gap-2 font-semibold text-rose-600 dark:text-rose-400 border-rose-300 dark:border-rose-800 hover:bg-rose-50 dark:hover:bg-rose-950/30 shrink-0 cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset My Personal Data</span>
        </button>
      </div>

      {/* 5. Privacy Information & Device Portability Card */}
      <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border-primary)] p-6 shadow-sm flex flex-col gap-4">
        <div className="flex items-center gap-2 border-b border-[var(--border-secondary)] pb-3">
          <Lock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <h2 className="text-base font-bold text-[var(--text-primary)]">
            Privacy Information & Local Persistence Policy
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-[var(--text-secondary)] leading-relaxed">
          <div className="p-4 rounded-xl bg-[var(--bg-tertiary)]/70 border border-[var(--border-secondary)] flex flex-col gap-2">
            <div className="flex items-center gap-2 font-bold text-[var(--text-primary)]">
              <Shield className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Keep Local Data Local</span>
            </div>
            <p>
              Your academic grades, attendance marks, course records, and calculations are stored exclusively on your device inside browser IndexedDB and localStorage. No external backup server receives your personal records.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[var(--bg-tertiary)]/70 border border-[var(--border-secondary)] flex flex-col gap-2">
            <div className="flex items-center gap-2 font-bold text-[var(--text-primary)]">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span>Browser Cache & Site Data Warning</span>
            </div>
            <p>
              If you clear browser cookies or site data, or if you browse in Private/Incognito mode, local records may be erased when the session ends. Always keep an exported JSON backup stored on your device or drive.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[var(--bg-tertiary)]/70 border border-[var(--border-secondary)] flex flex-col gap-2">
            <div className="flex items-center gap-2 font-bold text-[var(--text-primary)]">
              <HardDrive className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>No Automatic Cloud Synchronization</span>
            </div>
            <p>
              Local data does not automatically synchronize between different browsers or devices. To move your workspace from your laptop to your smartphone, use "Export My Data" and select the backup file on your phone.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[var(--bg-tertiary)]/70 border border-[var(--border-secondary)] flex flex-col gap-2">
            <div className="flex items-center gap-2 font-bold text-[var(--text-primary)]">
              <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Strict Student Profile Isolation</span>
            </div>
            <p>
              Each student profile operates in a strictly isolated key partition. Adding, modifying, or resetting records in one profile never modifies or mixes with another student’s personal calculations or attendance.
            </p>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL: Import Preview, Conflict Detection, Strategy Choice                 */}
      {/* ========================================================================= */}
      {isImportModalOpen && validatedBackup && backupSummary && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 dark:bg-black/70 backdrop-blur-sm animate-appleFadeIn overflow-y-auto"
          onClick={() => !isRestoring && setIsImportModalOpen(false)}
        >
          <div
            className="w-full max-w-lg my-8 rounded-2xl bg-[var(--surface)] border border-[var(--border-primary)] shadow-2xl p-6 sm:p-7 flex flex-col gap-5 text-[var(--text-primary)] text-xs"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[var(--border-secondary)] pb-3">
              <div className="flex items-center gap-2">
                <Upload className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-base font-bold text-[var(--text-primary)]">
                  Preview & Confirm Backup Restore
                </h3>
              </div>
              <button
                type="button"
                onClick={() => !isRestoring && setIsImportModalOpen(false)}
                className="p-1 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Profile Warning if Different Student */}
            {conflictReport?.isDifferentStudent && (
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="flex flex-col gap-0.5">
                  <span className="font-bold">Student Identity Notice</span>
                  <span>
                    Backup was exported from <strong>"{conflictReport.sourceStudentName}"</strong>
                    {conflictReport.sourceRollNumber ? ` (${conflictReport.sourceRollNumber})` : ''},
                    but active profile is <strong>"{conflictReport.targetStudentName}"</strong>.
                  </span>
                </div>
              </div>
            )}

            {/* Backup Metadata Breakdown */}
            <div className="p-4 rounded-xl bg-[var(--bg-tertiary)]/70 border border-[var(--border-secondary)] flex flex-col gap-2.5">
              <div className="flex items-center justify-between font-semibold border-b border-[var(--border-secondary)] pb-2">
                <span>Backup Student:</span>
                <span className="font-bold text-[var(--text-primary)]">{backupSummary.studentName}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] text-[var(--text-secondary)]">
                <div>Export Date: {new Date(backupSummary.exportDate).toLocaleDateString()}</div>
                <div>Backup Version: {backupSummary.version}</div>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[var(--border-secondary)] text-center">
                <div className="p-2 rounded-lg bg-[var(--surface)] border border-[var(--border-primary)]">
                  <div className="font-bold text-sm text-[var(--text-primary)]">
                    {backupSummary.counts.coursesCount}
                  </div>
                  <div className="text-[10px] text-[var(--text-secondary)]">Courses</div>
                </div>
                <div className="p-2 rounded-lg bg-[var(--surface)] border border-[var(--border-primary)]">
                  <div className="font-bold text-sm text-[var(--text-primary)]">
                    {backupSummary.counts.attendanceCount}
                  </div>
                  <div className="text-[10px] text-[var(--text-secondary)]">Attendance</div>
                </div>
                <div className="p-2 rounded-lg bg-[var(--surface)] border border-[var(--border-primary)]">
                  <div className="font-bold text-sm text-[var(--text-primary)]">
                    {backupSummary.counts.calculationsCount}
                  </div>
                  <div className="text-[10px] text-[var(--text-secondary)]">Calculations</div>
                </div>
              </div>
            </div>

            {/* Choose Restore Strategy */}
            <div className="flex flex-col gap-2">
              <span className="font-bold text-[var(--text-primary)]">
                Select Restore Strategy:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedStrategy('merge')}
                  className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                    selectedStrategy === 'merge'
                      ? 'bg-indigo-50/60 dark:bg-indigo-950/40 border-indigo-500 ring-1 ring-indigo-500'
                      : 'bg-[var(--surface)] border-[var(--border-primary)] hover:border-[var(--border-secondary)]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-[var(--text-primary)]">
                      Safe Merge (Recommended)
                    </span>
                    {selectedStrategy === 'merge' && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                  </div>
                  <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                    Appends new courses & calculations without deleting existing records. Avoids duplicate entries.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedStrategy('replace')}
                  className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                    selectedStrategy === 'replace'
                      ? 'bg-rose-50/60 dark:bg-rose-950/40 border-rose-500 ring-1 ring-rose-500'
                      : 'bg-[var(--surface)] border-[var(--border-primary)] hover:border-[var(--border-secondary)]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-rose-600 dark:text-rose-400">
                      Replace Records
                    </span>
                    {selectedStrategy === 'replace' && <Check className="w-3.5 h-3.5 text-rose-600" />}
                  </div>
                  <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                    Replaces current active profile data with the exact records from this backup file.
                  </p>
                </button>
              </div>
            </div>

            {/* Replacement Confirmation Checkbox */}
            {selectedStrategy === 'replace' && (
              <label className="flex items-start gap-2 p-3 rounded-xl bg-rose-50/70 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-900 dark:text-rose-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={replaceConfirmed}
                  onChange={(e) => setReplaceConfirmed(e.target.checked)}
                  className="mt-0.5 rounded border-rose-400"
                />
                <span className="font-medium text-[11px] leading-snug">
                  I understand that this will replace my current courses, attendance, and calculations for <strong>{activeProfile.name}</strong>.
                </span>
              </label>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[var(--border-secondary)]">
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                disabled={isRestoring}
                className="apple-btn-secondary text-xs h-9 px-4 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRestore}
                disabled={isRestoring || (selectedStrategy === 'replace' && !replaceConfirmed)}
                className={`apple-btn-primary text-xs h-9 px-5 font-semibold cursor-pointer ${
                  selectedStrategy === 'replace' ? 'bg-rose-600 hover:bg-rose-700 text-white' : ''
                }`}
              >
                {isRestoring ? 'Restoring...' : `Confirm & ${selectedStrategy === 'replace' ? 'Replace' : 'Merge'}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: Reset Confirmation with "Download Backup First"                      */}
      {/* ========================================================================= */}
      {isResetModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 dark:bg-black/70 backdrop-blur-sm animate-appleFadeIn"
          onClick={() => !isResetting && setIsResetModalOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-[var(--surface)] border border-rose-200 dark:border-rose-900/60 shadow-2xl p-6 sm:p-7 flex flex-col gap-4 text-[var(--text-primary)] text-xs"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2.5 text-rose-600 dark:text-rose-400">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h3 className="text-base font-bold text-[var(--text-primary)]">
                Reset Personal Data for "{activeProfile.name}"?
              </h3>
            </div>

            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              This action will permanently zero out personal academic records for this student profile:
            </p>

            <ul className="text-xs text-[var(--text-secondary)] space-y-1 list-disc pl-4 bg-[var(--bg-tertiary)]/70 p-3 rounded-xl border border-[var(--border-secondary)]">
              <li>All registered and completed course credit records</li>
              <li>All attendance subjects, logged sessions, and drafts</li>
              <li>All internal marks drafts and assessments</li>
              <li>Saved calculations and academic planner tasks</li>
            </ul>

            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Download className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span className="font-medium text-[11px]">Recommended: Save a copy first</span>
              </div>
              <button
                type="button"
                onClick={handleExportData}
                className="px-3 py-1 rounded-lg bg-emerald-600 text-white font-bold text-[11px] hover:bg-emerald-700 transition-colors cursor-pointer shrink-0"
              >
                Download Backup
              </button>
            </div>

            <p className="text-[11px] text-[var(--text-tertiary)]">
              Shared curriculum regulations, university templates, and other student profiles will remain untouched.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[var(--border-secondary)]">
              <button
                type="button"
                onClick={() => setIsResetModalOpen(false)}
                disabled={isResetting}
                className="apple-btn-secondary text-xs h-9 px-4 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReset}
                disabled={isResetting}
                className="px-4 h-9 rounded-xl font-bold text-xs bg-rose-600 hover:bg-rose-700 text-white shadow-sm cursor-pointer disabled:opacity-50"
              >
                {isResetting ? 'Resetting...' : 'Yes, Reset Personal Data'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
