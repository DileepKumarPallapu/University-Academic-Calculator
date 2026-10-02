import React, { useState, useRef } from 'react';
import {
  Sun,
  Moon,
  Laptop,
  Download,
  Upload,
  RotateCcw,
  AlertTriangle,
  SlidersHorizontal,
  FileSpreadsheet,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAcademic } from '../context/AcademicContext';
import { useAppToast } from '../components/layout/AppShell';
import { Modal } from '../components/common/Modal';

export const SettingsPage: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const {
    profile,
    updateProfile,
    gradeScale,
    updateGradeScale,
    restoreDefaultGradeScale,
    exportBackupJSON,
    exportHistoryCSV,
    importBackupJSON,
    clearAllPlatformData,
  } = useAcademic();
  const { showToast } = useAppToast();

  const [dangerModalOpen, setDangerModalOpen] = useState(false);
  const [scaleModalOpen, setScaleModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const branches = ['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'IT', 'AI & DS', 'Other'];
  const semesters = [1, 2, 3, 4, 5, 6, 7, 8];

  const handleDownloadJSON = () => {
    const jsonStr = exportBackupJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `academic-calculator-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Backup JSON downloaded', 'success');
  };

  const handleDownloadCSV = () => {
    const csvStr = exportHistoryCSV();
    const blob = new Blob([csvStr], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `academic-history-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('History CSV downloaded', 'success');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const res = importBackupJSON(content);
        if (res.success) {
          showToast(res.message, 'success');
        } else {
          showToast(res.message, 'error');
        }
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleConfirmClearAll = () => {
    clearAllPlatformData();
    setDangerModalOpen(false);
    showToast('All platform data cleared', 'info');
  };

  return (
    <div className="flex flex-col gap-10 sm:gap-14 apple-reveal max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex flex-col items-center text-center gap-3">
        <h1 className="text-[34px] sm:text-[48px] font-bold tracking-tight text-[#1D1D1F] dark:text-[#F5F5F7]">
          Settings
        </h1>
        <p className="text-[16px] text-[#6E6E73] dark:text-[#A1A1A6] max-w-lg leading-relaxed">
          Manage your appearance, academic profile, grade points, and platform backups.
        </p>
      </div>

      <div className="flex flex-col gap-8">
        {/* Appearance Section */}
        <section className="bg-[#FFFFFF] dark:bg-[#1D1D1F] rounded-[24px] p-6 sm:p-8 border border-black/[0.08] dark:border-white/[0.12] shadow-sm flex flex-col gap-4">
          <span className="text-xs font-semibold uppercase tracking-[0.06em] text-[#86868B]">
            Appearance
          </span>
          <div className="grid grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => setTheme('light')}
              className={`p-4 rounded-2xl border text-sm font-semibold flex flex-col items-center gap-2 transition-all min-h-[44px] ${
                theme === 'light'
                  ? 'border-black bg-black/5 dark:border-white dark:bg-white/10 text-[#1D1D1F] dark:text-[#F5F5F7]'
                  : 'border-black/[0.08] dark:border-white/[0.12] text-[#6E6E73] dark:text-[#A1A1A6]'
              }`}
            >
              <Sun className="w-5 h-5 text-amber-500" />
              <span>Light</span>
            </button>

            <button
              type="button"
              onClick={() => setTheme('dark')}
              className={`p-4 rounded-2xl border text-sm font-semibold flex flex-col items-center gap-2 transition-all min-h-[44px] ${
                theme === 'dark'
                  ? 'border-black bg-black/5 dark:border-white dark:bg-white/10 text-[#1D1D1F] dark:text-[#F5F5F7]'
                  : 'border-black/[0.08] dark:border-white/[0.12] text-[#6E6E73] dark:text-[#A1A1A6]'
              }`}
            >
              <Moon className="w-5 h-5 text-zinc-400" />
              <span>Dark</span>
            </button>

            <button
              type="button"
              onClick={() => setTheme('system')}
              className={`p-4 rounded-2xl border text-sm font-semibold flex flex-col items-center gap-2 transition-all min-h-[44px] ${
                theme === 'system'
                  ? 'border-black bg-black/5 dark:border-white dark:bg-white/10 text-[#1D1D1F] dark:text-[#F5F5F7]'
                  : 'border-black/[0.08] dark:border-white/[0.12] text-[#6E6E73] dark:text-[#A1A1A6]'
              }`}
            >
              <Laptop className="w-5 h-5 text-zinc-600 dark:text-zinc-300" />
              <span>System</span>
            </button>
          </div>
        </section>

        {/* 2. Semester & Academic Setup Section */}
        <section className="bg-[#FFFFFF] dark:bg-[#1D1D1F] rounded-[24px] p-6 sm:p-8 border border-black/[0.08] dark:border-white/[0.12] shadow-sm flex flex-col gap-5">
          <span className="text-xs font-semibold uppercase tracking-[0.06em] text-[#86868B]">
            Academic Setup
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label htmlFor="settings-name" className="text-xs font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                Student Name
              </label>
              <input
                id="settings-name"
                type="text"
                value={profile.name}
                onChange={(e) => updateProfile({ name: e.target.value })}
                placeholder="e.g. Dileep"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-[#F5F5F7] dark:bg-[#2C2C2E] border border-black/[0.04] dark:border-white/[0.08] outline-none text-[#1D1D1F] dark:text-[#F5F5F7]"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="settings-college" className="text-xs font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                Institution / College
              </label>
              <input
                id="settings-college"
                type="text"
                value={profile.college}
                onChange={(e) => updateProfile({ college: e.target.value })}
                placeholder="e.g. University College of Engineering"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-[#F5F5F7] dark:bg-[#2C2C2E] border border-black/[0.04] dark:border-white/[0.08] outline-none text-[#1D1D1F] dark:text-[#F5F5F7]"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="settings-semester" className="text-xs font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                Current Semester
              </label>
              <select
                id="settings-semester"
                value={profile.currentSemester}
                onChange={(e) => updateProfile({ currentSemester: parseInt(e.target.value) || 1 })}
                className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-[#F5F5F7] dark:bg-[#2C2C2E] border border-black/[0.04] dark:border-white/[0.08] outline-none text-[#1D1D1F] dark:text-[#F5F5F7] min-h-[44px]"
              >
                {semesters.map((s) => (
                  <option key={s} value={s}>
                    Semester {s}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="settings-branch" className="text-xs font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                Branch / Discipline
              </label>
              <select
                id="settings-branch"
                value={profile.branch}
                onChange={(e) => updateProfile({ branch: e.target.value })}
                className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-[#F5F5F7] dark:bg-[#2C2C2E] border border-black/[0.04] dark:border-white/[0.08] outline-none text-[#1D1D1F] dark:text-[#F5F5F7] min-h-[44px]"
              >
                {branches.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between border-t border-black/[0.04] dark:border-white/[0.06]">
            <button
              type="button"
              onClick={() => setScaleModalOpen(true)}
              className="text-xs font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] hover:underline flex items-center gap-1.5 min-h-[44px]"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Configure Grade Scale</span>
            </button>
            <span className="text-xs text-[#86868B]">Saved automatically</span>
          </div>
        </section>

        {/* 16 & 17. Data Export, Backup & Restore Section */}
        <section className="bg-[#FFFFFF] dark:bg-[#1D1D1F] rounded-[24px] p-6 sm:p-8 border border-black/[0.08] dark:border-white/[0.12] shadow-sm flex flex-col gap-5">
          <span className="text-xs font-semibold uppercase tracking-[0.06em] text-[#86868B]">
            Data & Backup
          </span>

          <p className="text-xs text-[#6E6E73] dark:text-[#A1A1A6] leading-relaxed">
            All your academic data resides strictly on this device. Create backups or export your records at any time.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={handleDownloadJSON}
              className="p-3.5 rounded-xl border border-black/[0.08] dark:border-white/[0.12] hover:bg-black/5 dark:hover:bg-white/5 text-xs font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] flex items-center justify-center gap-2 min-h-[44px]"
            >
              <Download className="w-4 h-4" />
              <span>Backup (JSON)</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadCSV}
              className="p-3.5 rounded-xl border border-black/[0.08] dark:border-white/[0.12] hover:bg-black/5 dark:hover:bg-white/5 text-xs font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] flex items-center justify-center gap-2 min-h-[44px]"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>History (CSV)</span>
            </button>

            <label
              htmlFor="backup-file-input"
              className="p-3.5 rounded-xl border border-black/[0.08] dark:border-white/[0.12] hover:bg-black/5 dark:hover:bg-white/5 text-xs font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] flex items-center justify-center gap-2 cursor-pointer min-h-[44px]"
            >
              <Upload className="w-4 h-4" />
              <span>Restore Backup</span>
              <input
                id="backup-file-input"
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          </div>
        </section>

        {/* 30. Danger Zone */}
        <section className="rounded-[24px] p-6 sm:p-8 border border-rose-500/20 bg-rose-500/[0.02] flex flex-col gap-4">
          <div className="flex items-center gap-2 text-rose-500 font-bold text-sm uppercase tracking-wider">
            <AlertTriangle className="w-4 h-4" />
            <span>Danger Zone</span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                Clear All Data
              </p>
              <p className="text-xs text-[#6E6E73] dark:text-[#A1A1A6] mt-0.5">
                Permanently removes your profile, subjects, calculations, history, and settings from this device.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setDangerModalOpen(true)}
              className="px-5 py-2.5 rounded-xl bg-rose-600 text-white font-semibold text-xs apple-button-interaction shrink-0 min-h-[44px]"
            >
              Clear All Data
            </button>
          </div>
        </section>
      </div>

      {/* Grade Scale Modal */}
      <Modal
        isOpen={scaleModalOpen}
        onClose={() => setScaleModalOpen(false)}
        title="University Grade Scale"
        description="Changing the grade scale affects GPA and CGPA calculations."
        confirmText="Done"
        onConfirm={() => setScaleModalOpen(false)}
      >
        <div className="flex flex-col gap-3 py-2">
          {gradeScale.map((item, idx) => (
            <div key={item.grade} className="flex items-center justify-between p-3 rounded-2xl bg-[#F5F5F7] dark:bg-[#2C2C2E]">
              <div className="flex items-center gap-3">
                <span className="text-base font-bold w-10 text-[#1D1D1F] dark:text-[#F5F5F7]">{item.grade}</span>
                <span className="text-xs text-[#6E6E73] dark:text-[#A1A1A6]">{item.description}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#86868B]">Points:</span>
                <input
                  type="number"
                  min={0}
                  max={10}
                  step={0.5}
                  value={item.points}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    if (!isNaN(val)) {
                      const updated = [...gradeScale];
                      updated[idx].points = Math.max(0, Math.min(10, val));
                      updateGradeScale(updated);
                    }
                  }}
                  className="w-16 px-2.5 py-1 text-center text-sm font-semibold rounded-xl bg-white dark:bg-[#1D1D1F] border border-black/10 dark:border-white/10 outline-none text-[#1D1D1F] dark:text-[#F5F5F7]"
                />
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={() => {
              restoreDefaultGradeScale();
              showToast('Restored default university grade scale', 'info');
            }}
            className="self-start text-xs font-semibold text-[#6E6E73] dark:text-[#A1A1A6] hover:underline flex items-center gap-1.5 pt-2"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restore Default</span>
          </button>
        </div>
      </Modal>

      {/* Danger Modal */}
      <Modal
        isOpen={dangerModalOpen}
        onClose={() => setDangerModalOpen(false)}
        title="Clear All Data?"
        description="This removes your profile, subjects, calculations, history and settings from this device."
        confirmText="Delete Everything"
        onConfirm={handleConfirmClearAll}
        confirmDestructive
      >
        <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/20 text-rose-600 text-xs">
          This operation cannot be reversed. You will lose all locally stored calculations and configurations.
        </div>
      </Modal>
    </div>
  );
};
