import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Plus,
  Copy,
  Trash2,
  Edit3,
  Bookmark,
  Star,
  Download,
  Upload,
  AlertTriangle,
  GraduationCap,
  Percent,
  ChevronRight,
} from 'lucide-react';
import { useProfile } from '../context/ProfileContext';
import { useAppToast } from '../components/layout/AppShell';
import { ResetConfirmModal } from '../components/common/ResetConfirmModal';
import { REGULATIONS, type RegulationId } from '../config/university';
import type { StudentProfile, SavedCalculation, CalculationType } from '../types/profile';

export const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const {
    profiles,
    activeProfile,
    switchProfile,
    createProfile,
    updateProfile,
    duplicateProfile,
    deleteProfile,
    getCalculations,
    deleteCalculation,
    toggleFavoriteCalculation,
    renameCalculation,
    exportProfileData,
    importProfileData,
    clearActiveProfileData,
  } = useProfile();

  const { showToast } = useAppToast();

  // Saved calculations state
  const [calculations, setCalculations] = useState<SavedCalculation[]>([]);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterFavorites, setFilterFavorites] = useState<boolean>(false);

  // Modals & form state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isNewProfileModalOpen, setIsNewProfileModalOpen] = useState(false);
  const [profileFormData, setProfileFormData] = useState<Partial<StudentProfile>>({});

  // Deletion modals
  const [deleteProfileConfirmOpen, setDeleteProfileConfirmOpen] = useState(false);
  const [clearDataConfirmOpen, setClearDataConfirmOpen] = useState(false);
  const [calcToDelete, setCalcToDelete] = useState<string | null>(null);

  // Renaming state
  const [renamingCalcId, setRenamingCalcId] = useState<string | null>(null);
  const [renamingTitle, setRenamingTitle] = useState<string>('');

  // File import ref
  const importFileRef = useRef<HTMLInputElement>(null);

  // Reload calculations for active profile
  const reloadCalcs = async () => {
    const list = await getCalculations();
    setCalculations(list);
  };

  useEffect(() => {
    reloadCalcs();
  }, [activeProfile.id]);

  // Open Edit Profile Modal
  const handleOpenEdit = () => {
    setProfileFormData({ ...activeProfile });
    setIsEditModalOpen(true);
  };

  // Open New Profile Modal
  const handleOpenNewProfile = () => {
    setProfileFormData({
      name: '',
      rollNumber: '',
      collegeName: activeProfile.collegeName || 'University Academic Framework',
      degree: 'B.Tech',
      department: 'Computer Science & Engineering',
      regulation: activeProfile.regulation || 'VTR21',
      admissionYear: '2024',
      academicYear: '2024-2025',
      currentSemester: 1,
      degreePathway: 'standard',
      targetAttendance: 75,
      customGraduationCredits: 160,
    });
    setIsNewProfileModalOpen(true);
  };

  // Save profile updates
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileFormData.name?.trim()) {
      showToast('Student Name is required', 'error');
      return;
    }
    await updateProfile(activeProfile.id, profileFormData);
    setIsEditModalOpen(false);
    showToast('Student profile updated successfully!', 'success');
  };

  // Create new profile
  const handleCreateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileFormData.name?.trim()) {
      showToast('Student Name is required', 'error');
      return;
    }
    const created = await createProfile(profileFormData);
    setIsNewProfileModalOpen(false);
    showToast(`Profile created for "${created.name}"!`, 'success');
  };

  // Duplicate profile
  const handleDuplicate = async () => {
    const dup = await duplicateProfile(activeProfile.id);
    showToast(`Duplicated profile as "${dup.name}"!`, 'success');
  };

  // Delete profile
  const handleConfirmDeleteProfile = async () => {
    try {
      await deleteProfile(activeProfile.id);
      setDeleteProfileConfirmOpen(false);
      showToast('Profile deleted successfully.', 'info');
    } catch (err: any) {
      showToast(err.message || 'Cannot delete profile', 'error');
      setDeleteProfileConfirmOpen(false);
    }
  };

  // Clear active profile data
  const handleConfirmClearData = async () => {
    await clearActiveProfileData();
    await reloadCalcs();
    setClearDataConfirmOpen(false);
    showToast('Saved calculations and data cleared for this profile.', 'info');
  };

  // Delete single calculation
  const handleConfirmDeleteCalc = async () => {
    if (calcToDelete) {
      await deleteCalculation(calcToDelete);
      await reloadCalcs();
      setCalcToDelete(null);
      showToast('Calculation removed.', 'info');
    }
  };

  // Rename calculation
  const handleRenameCalc = async (id: string) => {
    if (renamingTitle.trim()) {
      await renameCalculation(id, renamingTitle.trim());
      await reloadCalcs();
      setRenamingCalcId(null);
      showToast('Title updated.', 'success');
    }
  };

  // Toggle favorite
  const handleToggleFavorite = async (id: string) => {
    await toggleFavoriteCalculation(id);
    await reloadCalcs();
  };

  // Reopen calculation
  const handleReopenCalc = (calc: SavedCalculation) => {
    const routeMap: Record<CalculationType, string> = {
      sgpa: `/sgpa?calcId=${calc.id}`,
      cgpa: `/cgpa?calcId=${calc.id}`,
      internals: `/internals?calcId=${calc.id}`,
      attendance: `/attendance?calcId=${calc.id}`,
      credits: `/credits?calcId=${calc.id}`,
    };
    navigate(routeMap[calc.type] || '/');
  };

  // Export JSON
  const handleExportJSON = async () => {
    try {
      const json = await exportProfileData();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const filename = `${activeProfile.name.replace(/\s+/g, '_')}_Academic_Data_${new Date()
        .toISOString()
        .slice(0, 10)}.json`;
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Export file downloaded successfully!', 'success');
    } catch (err: any) {
      showToast(`Export failed: ${err.message}`, 'error');
    }
  };

  // Import JSON
  const handleImportFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const content = event.target?.result as string;
        if (!content) return;
        const res = await importProfileData(content, 'create_new');
        if (res.success) {
          showToast(res.message, 'success');
          await reloadCalcs();
        } else {
          showToast(res.message, 'error');
        }
      };
      reader.readAsText(file);
    } catch (err: any) {
      showToast('Failed to read import file.', 'error');
    } finally {
      if (importFileRef.current) importFileRef.current.value = '';
    }
  };

  // Filter calculations
  const filteredCalculations = calculations.filter((c) => {
    if (filterType !== 'all' && c.type !== filterType) return false;
    if (filterFavorites && !c.isFavorite) return false;
    return true;
  });

  return (
    <div className="w-full max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-8 animate-appleFadeIn">
      {/* 1. Header & Active Profile Switcher */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-[var(--border-secondary)] pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-black/5 dark:bg-white/10 text-[var(--text-secondary)]">
              Multi-Student Academic Profile
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
              Active Profile
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)]">
            {activeProfile.name || 'Student Profile'}
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            {activeProfile.rollNumber ? `${activeProfile.rollNumber} • ` : ''}
            {activeProfile.degree || 'B.Tech'} in {activeProfile.department || activeProfile.branch || 'Engineering'}
          </p>
        </div>

        {/* Profile Switcher & Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Profile Switcher dropdown */}
          <div className="flex items-center gap-2 bg-[var(--surface)] border border-[var(--border-primary)] rounded-xl px-3 py-1.5 shadow-xs">
            <Users className="w-4 h-4 text-[var(--text-secondary)]" />
            <select
              value={activeProfile.id}
              onChange={(e) => switchProfile(e.target.value)}
              className="bg-transparent text-xs font-semibold text-[var(--text-primary)] outline-none cursor-pointer py-1"
            >
              {profiles.map((p) => (
                <option key={p.id} value={p.id} className="bg-[var(--surface)] text-[var(--text-primary)]">
                  {p.name} {p.rollNumber ? `(${p.rollNumber})` : ''}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={handleOpenNewProfile}
            className="apple-btn-secondary text-xs h-10 px-3.5 gap-1.5 font-semibold"
            title="Create new student profile"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Student</span>
          </button>

          <button
            type="button"
            onClick={handleOpenEdit}
            className="apple-btn-primary text-xs h-10 px-4 gap-1.5 font-semibold"
            title="Edit student profile details"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Edit Profile</span>
          </button>
        </div>
      </div>

      {/* 2. Overview Card & Quick Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Academic Details Card (2 Cols) */}
        <div className="lg:col-span-2 rounded-2xl bg-[var(--surface)] border border-[var(--border-primary)] p-6 shadow-sm flex flex-col justify-between gap-6">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-[var(--border-secondary)] pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                Academic Curriculum & Details
              </span>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[var(--bg-tertiary)] text-[var(--text-primary)]">
                {activeProfile.degreePathway.toUpperCase()} PATHWAY
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                  University / College
                </span>
                <div className="font-semibold text-sm text-[var(--text-primary)] mt-0.5">
                  {activeProfile.collegeName || '—'}
                </div>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                  Degree & Branch
                </span>
                <div className="font-semibold text-sm text-[var(--text-primary)] mt-0.5">
                  {activeProfile.degree || 'B.Tech'} — {activeProfile.department || activeProfile.branch || '—'}
                </div>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                  Academic Regulation
                </span>
                <div className="font-semibold text-sm text-[var(--text-primary)] mt-0.5">
                  {REGULATIONS[activeProfile.regulation as RegulationId]?.name || activeProfile.regulation || 'VTR21'}
                </div>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                  Admission Year / Batch
                </span>
                <div className="font-semibold text-sm text-[var(--text-primary)] mt-0.5">
                  {activeProfile.admissionYear || '—'}
                </div>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                  Current Semester
                </span>
                <div className="font-semibold text-sm text-[var(--text-primary)] mt-0.5">
                  {activeProfile.semester || `Semester ${activeProfile.currentSemester || 5}`}
                </div>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                  Target Attendance
                </span>
                <div className="font-semibold text-sm text-[var(--text-primary)] mt-0.5 tabular-nums">
                  {activeProfile.targetAttendance || 75}% Minimum
                </div>
              </div>
            </div>
          </div>

          {/* Quick Shortcuts */}
          <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-[var(--border-secondary)]">
            <button
              type="button"
              onClick={handleDuplicate}
              className="apple-btn-secondary text-xs h-9 px-3 gap-1.5 font-medium"
              title="Duplicate this profile with its saved records"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Duplicate Profile</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/credits')}
              className="apple-btn-secondary text-xs h-9 px-3 gap-1.5 font-medium"
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Credits Planner</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/attendance')}
              className="apple-btn-secondary text-xs h-9 px-3 gap-1.5 font-medium"
            >
              <Percent className="w-3.5 h-3.5" />
              <span>Attendance Planner</span>
            </button>
          </div>
        </div>

        {/* Quick Profile Summary Widget (1 Col) */}
        <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border-primary)] p-6 shadow-sm flex flex-col justify-between gap-5">
          <div className="flex flex-col gap-3">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
              Profile Summary
            </span>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-black dark:bg-white text-white dark:text-black font-bold text-lg flex items-center justify-center shrink-0 shadow-xs">
                {activeProfile.name ? activeProfile.name.charAt(0).toUpperCase() : 'S'}
              </div>
              <div className="min-w-0">
                <div className="text-base font-bold text-[var(--text-primary)] truncate">
                  {activeProfile.name}
                </div>
                <div className="text-xs text-[var(--text-secondary)] truncate">
                  {activeProfile.rollNumber || 'No Register Number'}
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-secondary)] text-xs flex flex-col gap-1.5">
              <div className="flex justify-between items-center">
                <span className="text-[var(--text-secondary)]">Saved Calculations:</span>
                <span className="font-bold text-[var(--text-primary)] tabular-nums">
                  {calculations.length}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[var(--text-secondary)]">Graduation Target:</span>
                <span className="font-bold text-[var(--text-primary)] tabular-nums">
                  {activeProfile.customGraduationCredits || 160} Credits
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[var(--text-secondary)]">Attendance Goal:</span>
                <span className="font-bold text-[var(--text-primary)] tabular-nums">
                  {activeProfile.targetAttendance || 75}%
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleExportJSON}
            className="apple-btn-secondary text-xs h-10 w-full gap-1.5 font-semibold"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Profile Data (JSON)</span>
          </button>
        </div>
      </div>

      {/* 3. Saved Calculations Section */}
      <div className="flex flex-col gap-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
              Saved Calculations
            </h2>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Reopen, recalculate, rename, or inspect previous work isolated to {activeProfile.name}.
            </p>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center rounded-xl bg-[var(--surface)] border border-[var(--border-primary)] p-1 text-xs">
              {(
                [
                  { id: 'all', label: 'All' },
                  { id: 'sgpa', label: 'SGPA' },
                  { id: 'cgpa', label: 'CGPA' },
                  { id: 'internals', label: 'Internals' },
                  { id: 'attendance', label: 'Attendance' },
                  { id: 'credits', label: 'Credits' },
                ] as const
              ).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFilterType(f.id)}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                    filterType === f.id
                      ? 'bg-black text-white dark:bg-white dark:text-black shadow-xs'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setFilterFavorites((prev) => !prev)}
              className={`p-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                filterFavorites
                  ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border-amber-300'
                  : 'bg-[var(--surface)] border-[var(--border-primary)] text-[var(--text-secondary)]'
              }`}
              title="Show only favorites"
            >
              <Star className={`w-3.5 h-3.5 ${filterFavorites ? 'fill-current' : ''}`} />
              <span className="hidden sm:inline">Favorites</span>
            </button>
          </div>
        </div>

        {/* Calculations Cards Grid */}
        {filteredCalculations.length === 0 ? (
          <div className="py-16 text-center rounded-2xl border border-dashed border-[var(--border-primary)] bg-[var(--surface)] flex flex-col items-center gap-3">
            <Bookmark className="w-10 h-10 text-[var(--text-tertiary)]" />
            <div className="text-sm font-bold text-[var(--text-primary)]">
              No saved calculations found for this filter.
            </div>
            <p className="text-xs text-[var(--text-secondary)] max-w-sm">
              Use the Save button in any calculator (SGPA, CGPA, Internals, Attendance, Credits) to save your work here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCalculations.map((calc) => (
              <div
                key={calc.id}
                className="p-5 rounded-2xl bg-[var(--surface)] border border-[var(--border-primary)] shadow-xs flex flex-col justify-between gap-4 hover:border-[var(--border-secondary)] transition-all"
              >
                {/* Card Top: Type & Favorite & Title */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[var(--bg-tertiary)] text-[var(--text-secondary)]">
                      {calc.type}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleToggleFavorite(calc.id)}
                      className="p-1 rounded-lg text-amber-500 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
                      title={calc.isFavorite ? 'Remove favorite' : 'Mark favorite'}
                    >
                      <Star className={`w-4 h-4 ${calc.isFavorite ? 'fill-current' : ''}`} />
                    </button>
                  </div>

                  {renamingCalcId === calc.id ? (
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        type="text"
                        value={renamingTitle}
                        onChange={(e) => setRenamingTitle(e.target.value)}
                        className="apple-input h-8 text-xs font-semibold flex-1"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => handleRenameCalc(calc.id)}
                        className="apple-btn-primary text-xs h-8 px-2.5 font-bold"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setRenamingCalcId(null)}
                        className="apple-btn-secondary text-xs h-8 px-2 font-medium"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div className="text-base font-bold text-[var(--text-primary)] leading-snug">
                      {calc.title}
                    </div>
                  )}

                  <div className="text-2xl font-bold font-mono tracking-tight text-[var(--text-primary)] tabular-nums mt-1">
                    {calc.resultValue}
                  </div>
                  <div className="text-xs text-[var(--text-secondary)] truncate">
                    {calc.resultSummary}
                  </div>
                </div>

                {/* Card Bottom: Timestamp & Action Buttons */}
                <div className="flex items-center justify-between pt-3 border-t border-[var(--border-secondary)] text-xs">
                  <span className="text-[11px] text-[var(--text-tertiary)] font-mono">
                    {new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short' }).format(
                      calc.updatedAt
                    )}
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setRenamingCalcId(calc.id);
                        setRenamingTitle(calc.title);
                      }}
                      className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] cursor-pointer"
                      title="Rename calculation"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setCalcToDelete(calc.id)}
                      className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                      title="Delete calculation"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleReopenCalc(calc)}
                      className="apple-btn-primary text-xs h-8 px-3 gap-1 font-semibold"
                    >
                      <span>Open</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. Data Management & Storage Operations */}
      <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border-primary)] p-6 shadow-sm flex flex-col gap-5 mt-4">
        <div className="border-b border-[var(--border-secondary)] pb-3">
          <h2 className="text-lg font-bold text-[var(--text-primary)]">
            Data Management & Backup
          </h2>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Privacy-first local storage. Your academic records stay on this device and can be backed up or transferred anytime.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {/* Export */}
          <button
            type="button"
            onClick={handleExportJSON}
            className="apple-btn-secondary text-xs h-11 px-4 gap-2 font-semibold justify-start"
          >
            <Download className="w-4 h-4 text-[var(--text-primary)]" />
            <span>Export Profile Data (JSON)</span>
          </button>

          {/* Import */}
          <div>
            <input
              type="file"
              ref={importFileRef}
              accept=".json,application/json"
              onChange={handleImportFileChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => importFileRef.current?.click()}
              className="apple-btn-secondary text-xs h-11 px-4 gap-2 font-semibold justify-start w-full"
            >
              <Upload className="w-4 h-4 text-[var(--text-primary)]" />
              <span>Import Profile (JSON)</span>
            </button>
          </div>

          {/* Clear Calculations */}
          <button
            type="button"
            onClick={() => setClearDataConfirmOpen(true)}
            className="apple-btn-secondary text-xs h-11 px-4 gap-2 font-semibold justify-start text-amber-700 dark:text-amber-400"
          >
            <AlertTriangle className="w-4 h-4" />
            <span>Clear Profile Calculations</span>
          </button>

          {/* Delete Profile */}
          <button
            type="button"
            onClick={() => setDeleteProfileConfirmOpen(true)}
            disabled={profiles.length <= 1}
            className="apple-btn-secondary text-xs h-11 px-4 gap-2 font-semibold justify-start text-rose-600 hover:border-rose-300 disabled:opacity-40"
            title={profiles.length <= 1 ? 'Cannot delete the only profile' : 'Delete this profile'}
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete Profile</span>
          </button>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {isEditModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 dark:bg-black/60 backdrop-blur-sm animate-appleFadeIn"
          onClick={() => setIsEditModalOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-[var(--surface)] border border-[var(--border-primary)] shadow-2xl p-6 sm:p-7 flex flex-col gap-4 text-[var(--text-primary)]"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold tracking-tight text-[var(--text-primary)]">
              Edit Student Profile
            </h3>

            <form onSubmit={handleSaveProfile} className="flex flex-col gap-3.5">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-[var(--text-primary)]">
                  Student Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={profileFormData.name || ''}
                  onChange={(e) => setProfileFormData({ ...profileFormData, name: e.target.value })}
                  className="apple-input h-10 text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-[var(--text-primary)]">
                    Register / Student ID
                  </label>
                  <input
                    type="text"
                    value={profileFormData.rollNumber || ''}
                    onChange={(e) =>
                      setProfileFormData({ ...profileFormData, rollNumber: e.target.value })
                    }
                    className="apple-input h-10 text-xs"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-[var(--text-primary)]">
                    University / College
                  </label>
                  <input
                    type="text"
                    value={profileFormData.collegeName || ''}
                    onChange={(e) =>
                      setProfileFormData({ ...profileFormData, collegeName: e.target.value })
                    }
                    className="apple-input h-10 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-[var(--text-primary)]">
                    Degree
                  </label>
                  <input
                    type="text"
                    value={profileFormData.degree || 'B.Tech'}
                    onChange={(e) =>
                      setProfileFormData({ ...profileFormData, degree: e.target.value })
                    }
                    className="apple-input h-10 text-xs"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-[var(--text-primary)]">
                    Branch / Department
                  </label>
                  <input
                    type="text"
                    value={profileFormData.department || ''}
                    onChange={(e) =>
                      setProfileFormData({ ...profileFormData, department: e.target.value })
                    }
                    className="apple-input h-10 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-[var(--text-primary)]">
                    Regulation
                  </label>
                  <select
                    value={profileFormData.regulation || 'VTR21'}
                    onChange={(e) =>
                      setProfileFormData({ ...profileFormData, regulation: e.target.value })
                    }
                    className="apple-input h-10 text-xs cursor-pointer"
                  >
                    <option value="VTR25">VTR25 (2025+)</option>
                    <option value="VTR21">VTR21 (2021-24)</option>
                    <option value="VTR18">VTR18 (2018-20)</option>
                    <option value="VTR15">VTR15 (2015-17)</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-[var(--text-primary)]">
                    Semester
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Semester 5"
                    value={profileFormData.semester || ''}
                    onChange={(e) =>
                      setProfileFormData({ ...profileFormData, semester: e.target.value })
                    }
                    className="apple-input h-10 text-xs"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-[var(--text-primary)]">
                    Target Attendance %
                  </label>
                  <input
                    type="number"
                    min={50}
                    max={100}
                    value={profileFormData.targetAttendance || 75}
                    onChange={(e) =>
                      setProfileFormData({
                        ...profileFormData,
                        targetAttendance: parseInt(e.target.value) || 75,
                      })
                    }
                    className="apple-input h-10 text-xs text-center"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[var(--border-secondary)]">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="apple-btn-secondary text-xs h-10 px-4"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="apple-btn-primary text-xs h-10 px-5 font-semibold"
                >
                  Save Profile Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Profile Modal */}
      {isNewProfileModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 dark:bg-black/60 backdrop-blur-sm animate-appleFadeIn"
          onClick={() => setIsNewProfileModalOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-[var(--surface)] border border-[var(--border-primary)] shadow-2xl p-6 sm:p-7 flex flex-col gap-4 text-[var(--text-primary)]"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold tracking-tight text-[var(--text-primary)]">
              Create New Student Profile
            </h3>
            <p className="text-xs text-[var(--text-secondary)]">
              Maintain separate, isolated academic calculations for each student on this device.
            </p>

            <form onSubmit={handleCreateProfile} className="flex flex-col gap-3.5">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-[var(--text-primary)]">
                  Student Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Priya Sharma"
                  value={profileFormData.name || ''}
                  onChange={(e) => setProfileFormData({ ...profileFormData, name: e.target.value })}
                  className="apple-input h-10 text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-[var(--text-primary)]">
                    Register / Student ID
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 22EC104 (optional)"
                    value={profileFormData.rollNumber || ''}
                    onChange={(e) =>
                      setProfileFormData({ ...profileFormData, rollNumber: e.target.value })
                    }
                    className="apple-input h-10 text-xs"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-[var(--text-primary)]">
                    University / College
                  </label>
                  <input
                    type="text"
                    value={profileFormData.collegeName || 'University Academic Framework'}
                    onChange={(e) =>
                      setProfileFormData({ ...profileFormData, collegeName: e.target.value })
                    }
                    className="apple-input h-10 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-[var(--text-primary)]">
                    Degree
                  </label>
                  <input
                    type="text"
                    value={profileFormData.degree || 'B.Tech'}
                    onChange={(e) =>
                      setProfileFormData({ ...profileFormData, degree: e.target.value })
                    }
                    className="apple-input h-10 text-xs"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-[var(--text-primary)]">
                    Regulation
                  </label>
                  <select
                    value={profileFormData.regulation || 'VTR21'}
                    onChange={(e) =>
                      setProfileFormData({ ...profileFormData, regulation: e.target.value })
                    }
                    className="apple-input h-10 text-xs cursor-pointer"
                  >
                    <option value="VTR25">VTR25</option>
                    <option value="VTR21">VTR21</option>
                    <option value="VTR18">VTR18</option>
                    <option value="VTR15">VTR15</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-[var(--text-primary)]">
                    Pathway
                  </label>
                  <select
                    value={profileFormData.degreePathway || 'standard'}
                    onChange={(e) =>
                      setProfileFormData({
                        ...profileFormData,
                        degreePathway: e.target.value as any,
                      })
                    }
                    className="apple-input h-10 text-xs cursor-pointer"
                  >
                    <option value="standard">Standard</option>
                    <option value="honours">Honours</option>
                    <option value="minor">Minor</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[var(--border-secondary)]">
                <button
                  type="button"
                  onClick={() => setIsNewProfileModalOpen(false)}
                  className="apple-btn-secondary text-xs h-10 px-4"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="apple-btn-primary text-xs h-10 px-5 font-semibold"
                >
                  Create Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modals */}
      <ResetConfirmModal
        isOpen={deleteProfileConfirmOpen}
        onClose={() => setDeleteProfileConfirmOpen(false)}
        onConfirm={handleConfirmDeleteProfile}
        title={`Delete profile "${activeProfile.name}"?`}
        description="Are you sure you want to completely delete this student profile and all of its saved calculations? This action cannot be undone."
      />

      <ResetConfirmModal
        isOpen={clearDataConfirmOpen}
        onClose={() => setClearDataConfirmOpen(false)}
        onConfirm={handleConfirmClearData}
        title="Clear all saved calculations?"
        description={`This will remove all saved calculations and credit plans under ${activeProfile.name}'s profile. The student profile info itself will remain.`}
      />

      <ResetConfirmModal
        isOpen={Boolean(calcToDelete)}
        onClose={() => setCalcToDelete(null)}
        onConfirm={handleConfirmDeleteCalc}
        title="Delete calculation?"
        description="Are you sure you want to remove this calculation from your saved records?"
      />
    </div>
  );
};
