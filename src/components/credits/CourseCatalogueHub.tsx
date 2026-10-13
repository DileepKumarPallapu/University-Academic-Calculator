import React, { useState, useMemo, useEffect } from 'react';
import {
  BookOpen,
  Search,
  Plus,
  Download,
  Upload,
  RotateCcw,
  AlertTriangle,
  Edit3,
  Trash2,
  Info,
  ShieldCheck,
  Check,
  X,
} from 'lucide-react';
import type { CatalogueCourse } from '../../types/catalogue';
import type { CreditSubjectItem } from '../../types/credits';
import {
  CATALOGUE_CATEGORIES,
  isRegulationSupportingCourseCode,
} from '../../data/courseCatalogue';
import {
  getCatalogueForRegulation,
  addCourseToCatalogue,
  updateCourseInCatalogue,
  deleteCourseFromCatalogue,
  resetCatalogueToDefaults,
  exportCatalogueToJSON,
  exportCatalogueToCSV,
  importCatalogueFromJSON,
  normalizeRegulationKey,
} from '../../services/catalogueStorage';

interface CourseCatalogueHubProps {
  activeProfileRegulation?: string;
  studentSubjects: CreditSubjectItem[];
  onAddCourseToRecords: (course: CatalogueCourse) => void;
  showToast: (msg: string, type?: 'info' | 'success' | 'error') => void;
}

export const CourseCatalogueHub: React.FC<CourseCatalogueHubProps> = ({
  activeProfileRegulation = 'VTR21',
  studentSubjects,
  onAddCourseToRecords,
  showToast,
}) => {
  const [selectedRegulation, setSelectedRegulation] = useState<string>(() =>
    normalizeRegulationKey(activeProfileRegulation)
  );
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchName, setSearchName] = useState<string>('');
  const [searchCode, setSearchCode] = useState<string>('');
  const [catalogueList, setCatalogueList] = useState<CatalogueCourse[]>([]);

  // Modal states
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<CatalogueCourse | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form states for Add/Edit Modal
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formCategory, setFormCategory] = useState('foundation');
  const [formCredits, setFormCredits] = useState<string>('');
  const [formDepartment, setFormDepartment] = useState('Common');
  const [formNotes, setFormNotes] = useState('');

  // Load catalogue whenever selectedRegulation changes
  useEffect(() => {
    const list = getCatalogueForRegulation(selectedRegulation);
    setCatalogueList(list);
  }, [selectedRegulation]);

  const supportsCode = isRegulationSupportingCourseCode(selectedRegulation);

  // Map student's personal subjects by course code and name for completion status
  const studentCompletionMap = useMemo(() => {
    const map = new Map<string, CreditSubjectItem>();
    studentSubjects.forEach((sub) => {
      if (sub.code) {
        map.set(sub.code.toUpperCase(), sub);
      }
      map.set(sub.name.trim().toLowerCase(), sub);
    });
    return map;
  }, [studentSubjects]);

  // Filter catalogue
  const filteredCourses = useMemo(() => {
    return catalogueList.filter((course) => {
      // Category filter
      if (selectedCategory !== 'all' && course.category !== selectedCategory) {
        return false;
      }
      // Name filter
      if (
        searchName.trim() &&
        !course.name.toLowerCase().includes(searchName.trim().toLowerCase())
      ) {
        return false;
      }
      // Code filter (only for regulations supporting codes)
      if (supportsCode && searchCode.trim()) {
        if (!course.code || !course.code.toLowerCase().includes(searchCode.trim().toLowerCase())) {
          return false;
        }
      }
      return true;
    });
  }, [catalogueList, selectedCategory, searchName, searchCode, supportsCode]);

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: catalogueList.length };
    CATALOGUE_CATEGORIES.forEach((c) => {
      counts[c.id] = catalogueList.filter((item) => item.category === c.id).length;
    });
    return counts;
  }, [catalogueList]);

  // Open Add Modal
  const handleOpenAdd = (presetCategory?: string) => {
    setEditingCourse(null);
    setFormName('');
    setFormCode('');
    setFormCategory(presetCategory || (selectedCategory !== 'all' ? selectedCategory : 'foundation'));
    setFormCredits('');
    setFormDepartment('Common');
    setFormNotes('');
    setIsAddEditModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (course: CatalogueCourse) => {
    setEditingCourse(course);
    setFormName(course.name);
    setFormCode(course.code || '');
    setFormCategory(course.category);
    setFormCredits(course.verifiedCredits !== undefined ? String(course.verifiedCredits) : '');
    setFormDepartment(course.department || 'Common');
    setFormNotes(course.notes || '');
    setIsAddEditModalOpen(true);
  };

  // Save Add/Edit
  const handleSaveAddEdit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = formName.trim();
    if (!cleanName) {
      showToast('Course name is required', 'info');
      return;
    }

    const creditNum = formCredits.trim() !== '' ? parseFloat(formCredits) : undefined;

    if (editingCourse) {
      // Edit
      const updated: CatalogueCourse = {
        ...editingCourse,
        name: cleanName,
        category: formCategory,
        code: supportsCode ? formCode.trim().toUpperCase() || undefined : undefined,
        verifiedCredits: !isNaN(creditNum as number) ? creditNum : undefined,
        department: formDepartment.trim() || undefined,
        notes: formNotes.trim() || undefined,
      };

      const res = updateCourseInCatalogue(selectedRegulation, updated);
      if (res.success) {
        setCatalogueList((prev) =>
          prev.map((c) => (c.id === updated.id ? updated : c))
        );
        setIsAddEditModalOpen(false);
        showToast('Saved successfully', 'success');
      } else {
        showToast(res.error || 'Failed to update course', 'error');
      }
    } else {
      // Add
      const res = addCourseToCatalogue(selectedRegulation, {
        category: formCategory,
        name: cleanName,
        code: supportsCode ? formCode.trim().toUpperCase() || undefined : undefined,
        verifiedCredits: !isNaN(creditNum as number) ? creditNum : undefined,
        source: 'Manual',
        isVerified: false,
        department: formDepartment.trim() || undefined,
        notes: formNotes.trim() || undefined,
      });

      if (res.success && res.course) {
        setCatalogueList((prev) => [res.course!, ...prev]);
        setIsAddEditModalOpen(false);
        showToast('Saved successfully', 'success');
      } else {
        showToast(res.error || 'Failed to add course', 'error');
      }
    }
  };

  // Delete
  const handleConfirmDelete = () => {
    if (!deleteConfirmId) return;
    const res = deleteCourseFromCatalogue(selectedRegulation, deleteConfirmId);
    if (res.success) {
      setCatalogueList((prev) => prev.filter((c) => c.id !== deleteConfirmId));
      setDeleteConfirmId(null);
      showToast('Course removed from catalogue', 'info');
    } else {
      showToast(res.error || 'Failed to delete course', 'error');
    }
  };

  // Reset to default seed
  const handleResetSeed = () => {
    if (
      window.confirm(
        `Reset ${selectedRegulation} catalogue to official seed records? Any custom additions will be reverted.`
      )
    ) {
      const reset = resetCatalogueToDefaults(selectedRegulation);
      setCatalogueList(reset);
      showToast(`${selectedRegulation} catalogue reset to defaults`, 'success');
    }
  };

  // Export JSON
  const handleExportJSON = () => {
    const json = exportCatalogueToJSON(selectedRegulation);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Course_Catalogue_${selectedRegulation}_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Exported ${selectedRegulation} catalogue to JSON`, 'success');
  };

  // Export CSV
  const handleExportCSV = () => {
    const csv = exportCatalogueToCSV(selectedRegulation);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Course_Catalogue_${selectedRegulation}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Exported ${selectedRegulation} catalogue to CSV`, 'success');
  };

  // Import JSON
  const handleImportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!importText.trim()) return;

    const res = importCatalogueFromJSON(selectedRegulation, importText);
    if (res.success) {
      setCatalogueList(getCatalogueForRegulation(selectedRegulation));
      setIsImportModalOpen(false);
      setImportText('');
      showToast(`Successfully imported ${res.count} courses!`, 'success');
    } else {
      showToast(res.error || 'Failed to parse import data', 'error');
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-appleFadeIn">
      {/* Regulation Selector Header Card */}
      <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border-primary)] p-5 sm:p-6 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-6">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
              University Course Catalogue
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
              Regulation-Wise
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)]">
            Explore official curriculum offerings, verified credits, and add subjects directly to your academic credit audit.
          </p>
        </div>

        {/* Regulation Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-secondary)]">
          {(['VTR21', 'VTR25', 'VTR18', 'VTR15'] as const).map((reg) => {
            const isSelected = selectedRegulation === reg;
            return (
              <button
                key={reg}
                type="button"
                onClick={() => setSelectedRegulation(reg)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[var(--surface)] text-[var(--text-primary)] shadow-sm border border-[var(--border-primary)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {reg}
                {reg === 'VTR21' && (
                  <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[9px] bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-extrabold">
                    Verified
                  </span>
                )}
                {reg === 'VTR25' && (
                  <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[9px] bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300 font-extrabold">
                    New Scheme
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Regulation Status Banner */}
      <div
        className={`p-4 rounded-xl border text-xs flex items-start gap-3 ${
          selectedRegulation === 'VTR21'
            ? 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
            : selectedRegulation === 'VTR25'
            ? 'bg-sky-50/70 dark:bg-sky-950/20 border-sky-200 dark:border-sky-800 text-sky-900 dark:text-sky-200'
            : 'bg-amber-50/70 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200'
        }`}
      >
        <Info className="w-4 h-4 shrink-0 mt-0.5" />
        <div className="flex-1 space-y-1">
          {selectedRegulation === 'VTR21' && (
            <>
              <p className="font-bold">
                Regulation VTR21 (VTRUGE2021) Official Catalogue
              </p>
              <p className="opacity-90 leading-relaxed">
                Source data extracted directly from official credit analysis audit records (VTU24654 and VTU29962). Displays verified course codes, names, categories, and report credits. Discrepancies between curriculum batches (e.g. ME104 vs ME103, CS204 vs CS226) are highlighted for review.
              </p>
            </>
          )}
          {selectedRegulation === 'VTR25' && (
            <>
              <p className="font-bold">
                Regulation VTR25 Scheme (No Course Codes)
              </p>
              <p className="opacity-90 leading-relaxed">
                As per institutional curriculum guidelines for VTR25, course codes are strictly omitted. Courses are identified exclusively by Course Name and Category. Course codes are never generated or required.
              </p>
            </>
          )}
          {(selectedRegulation === 'VTR15' || selectedRegulation === 'VTR18') && (
            <>
              <p className="font-bold">
                Regulation {selectedRegulation} Catalogue (User Configurable)
              </p>
              <p className="opacity-90 leading-relaxed">
                No official pre-seeded records were supplied for {selectedRegulation}. You can add courses manually using the <span className="font-bold">+ Add Course</span> button or import an official curriculum using the <span className="font-bold">Import</span> button.
              </p>
            </>
          )}
        </div>
      </div>

      {/* Category Pills & Navigation */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
            Category Breakdown ({catalogueList.length} Total Courses)
          </span>
          <span className="text-[11px] text-[var(--text-tertiary)]">
            Click a category to focus
          </span>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              selectedCategory === 'all'
                ? 'bg-black text-white dark:bg-white dark:text-black shadow-sm'
                : 'bg-[var(--surface)] border border-[var(--border-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            All Courses ({categoryCounts.all || 0})
          </button>
          {CATALOGUE_CATEGORIES.map((cat) => {
            const count = categoryCounts[cat.id] || 0;
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                  isSelected
                    ? 'bg-black text-white dark:bg-white dark:text-black shadow-sm'
                    : 'bg-[var(--surface)] border border-[var(--border-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <span>{cat.name}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    isSelected
                      ? 'bg-white/20 text-white dark:bg-black/20 dark:text-black'
                      : 'bg-[var(--border-secondary)] text-[var(--text-tertiary)]'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Search Bar & Actions Ribbon */}
      <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border-primary)] p-4 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-2">
          {/* Name search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[var(--text-tertiary)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search course by name..."
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              className="apple-input h-9 text-xs pl-9 pr-3 w-full"
            />
          </div>

          {/* Code search (ONLY when regulation supports code) */}
          {supportsCode && (
            <div className="relative w-full sm:w-48">
              <input
                type="text"
                placeholder="Search by code (e.g. 10210CS101)..."
                value={searchCode}
                onChange={(e) => setSearchCode(e.target.value)}
                className="apple-input h-9 text-xs px-3 w-full"
              />
            </div>
          )}

          {(searchName || searchCode || selectedCategory !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setSearchName('');
                setSearchCode('');
                setSelectedCategory('all');
              }}
              className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] px-2 py-1 font-semibold flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              Reset Filters
            </button>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => handleOpenAdd()}
            className="apple-btn-primary text-xs h-9 px-3 gap-1.5 font-semibold cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Course</span>
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            className="apple-btn-secondary text-xs h-9 px-3 gap-1.5 font-medium cursor-pointer"
            title="Export catalogue as CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={handleExportJSON}
            className="apple-btn-secondary text-xs h-9 px-3 gap-1.5 font-medium cursor-pointer"
            title="Export catalogue as JSON"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export JSON</span>
          </button>

          <button
            type="button"
            onClick={() => setIsImportModalOpen(true)}
            className="apple-btn-secondary text-xs h-9 px-3 gap-1.5 font-medium cursor-pointer"
            title="Import catalogue JSON"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import</span>
          </button>

          {selectedRegulation === 'VTR21' && (
            <button
              type="button"
              onClick={handleResetSeed}
              className="apple-btn-secondary text-xs h-9 px-2.5 gap-1 text-[var(--text-secondary)] hover:text-rose-600 cursor-pointer"
              title="Reset to official VTR21 reports seed"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Course List / Table */}
      <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border-primary)] shadow-sm overflow-hidden">
        {filteredCourses.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center gap-3">
            <BookOpen className="w-10 h-10 text-[var(--text-tertiary)] stroke-1" />
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              No courses found for {selectedRegulation}
            </h3>
            <p className="text-xs text-[var(--text-secondary)] max-w-md">
              {catalogueList.length === 0
                ? `The catalogue for ${selectedRegulation} is currently empty. You can add official courses or import a syllabus file.`
                : 'No courses match the active search and category filters.'}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <button
                type="button"
                onClick={() => handleOpenAdd()}
                className="apple-btn-primary text-xs h-8 px-4 font-semibold cursor-pointer"
              >
                + Add Course to {selectedRegulation}
              </button>
              {(searchName || searchCode || selectedCategory !== 'all') && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchName('');
                    setSearchCode('');
                    setSelectedCategory('all');
                  }}
                  className="apple-btn-secondary text-xs h-8 px-3 cursor-pointer"
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[var(--border-secondary)] bg-[var(--bg-tertiary)]/50 text-[var(--text-secondary)] font-semibold">
                  {supportsCode && <th className="p-3 w-32">Course Code</th>}
                  <th className="p-3">Course Name</th>
                  <th className="p-3 w-36">Category</th>
                  <th className="p-3 w-28 text-center">Verified Credits</th>
                  <th className="p-3 w-32">Source / Batch</th>
                  <th className="p-3 w-32">My Status</th>
                  <th className="p-3 w-40 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-secondary)]">
                {filteredCourses.map((course) => {
                  const categoryMeta = CATALOGUE_CATEGORIES.find(
                    (c) => c.id === course.category
                  );
                  const studentRecord = supportsCode && course.code
                    ? studentCompletionMap.get(course.code.toUpperCase()) ||
                      studentCompletionMap.get(course.name.trim().toLowerCase())
                    : studentCompletionMap.get(course.name.trim().toLowerCase());

                  return (
                    <tr
                      key={course.id}
                      className="hover:bg-[var(--bg-tertiary)]/40 transition-colors"
                    >
                      {/* Code Column (ONLY for VTR15/18/21) */}
                      {supportsCode && (
                        <td className="p-3 font-mono font-bold text-[var(--text-primary)]">
                          {course.code || (
                            <span className="text-[var(--text-tertiary)] italic">None</span>
                          )}
                        </td>
                      )}

                      {/* Name & Details Column */}
                      <td className="p-3">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-semibold text-[var(--text-primary)]">
                            {course.name}
                          </span>
                          {course.department && (
                            <span className="text-[10px] text-[var(--text-tertiary)] font-medium">
                              Dept: {course.department}
                            </span>
                          )}
                          {course.hasDiscrepancy && (
                            <div className="flex items-center gap-1 text-[10px] text-amber-700 dark:text-amber-400 font-medium mt-0.5">
                              <AlertTriangle className="w-3 h-3 shrink-0" />
                              <span>{course.discrepancyNote}</span>
                            </div>
                          )}
                          {course.notes && (
                            <span className="text-[10px] text-[var(--text-secondary)] italic">
                              {course.notes}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Category Badge */}
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[var(--bg-tertiary)] text-[var(--text-secondary)] border border-[var(--border-secondary)] inline-block">
                          {categoryMeta?.name || course.category}
                        </span>
                      </td>

                      {/* Verified Credits */}
                      <td className="p-3 text-center">
                        {course.verifiedCredits !== undefined ? (
                          <div className="inline-flex items-center gap-1 font-bold text-[var(--text-primary)]">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                            <span>{course.verifiedCredits} Cr</span>
                          </div>
                        ) : (
                          <span
                            className="text-[10px] text-amber-600 dark:text-amber-400 font-medium"
                            title="Credit requirement unassigned. Student will be asked to confirm upon selection."
                          >
                            Unassigned
                          </span>
                        )}
                      </td>

                      {/* Source & Verification */}
                      <td className="p-3">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[10px] font-medium text-[var(--text-secondary)] truncate max-w-[120px]" title={course.source}>
                            {course.source.replace('Official VTRUGE2021 Report ', '')}
                          </span>
                          {course.sourceBatch && (
                            <span className="text-[9px] text-[var(--text-tertiary)]">
                              {course.sourceBatch}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Student's Personal Completion Status */}
                      <td className="p-3">
                        {studentRecord ? (
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
                              studentRecord.status === 'Passed'
                                ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                                : studentRecord.status === 'Failed'
                                ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300'
                                : 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                            }`}
                          >
                            {studentRecord.status === 'Passed' && <Check className="w-2.5 h-2.5" />}
                            {studentRecord.status}
                          </span>
                        ) : (
                          <span className="text-[10px] text-[var(--text-tertiary)]">
                            Not added
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Quick Add to Student Credit Audit */}
                          <button
                            type="button"
                            onClick={() => onAddCourseToRecords(course)}
                            className="apple-btn-primary text-[11px] h-7 px-2.5 gap-1 font-semibold cursor-pointer"
                            title="Add this course to your credit audit records"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Add</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenEdit(course)}
                            className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] cursor-pointer"
                            title="Edit catalogue entry"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId(course.id)}
                            className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
                            title="Delete catalogue entry"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: Add / Edit Catalogue Course */}
      {isAddEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-appleFadeIn">
          <div className="w-full max-w-lg rounded-2xl bg-[var(--surface)] border border-[var(--border-primary)] shadow-2xl p-6 flex flex-col gap-5">
            <div className="flex items-center justify-between border-b border-[var(--border-secondary)] pb-3">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-base font-bold text-[var(--text-primary)]">
                  {editingCourse ? 'Edit Catalogue Course' : `Add Course to ${selectedRegulation}`}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddEditModalOpen(false)}
                className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAddEdit} className="flex flex-col gap-4 text-xs">
              {/* Category */}
              <div className="flex flex-col gap-1">
                <label className="font-semibold text-[var(--text-primary)]">
                  Course Category <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="apple-input h-10 text-xs cursor-pointer font-medium"
                >
                  {CATALOGUE_CATEGORIES.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name} ({cat.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Course Code (ONLY for VTR15/18/21, STRICTLY HIDDEN for VTR25) */}
              {supportsCode && (
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-[var(--text-primary)]">
                    Course Code (e.g. 10210CS101)
                  </label>
                  <input
                    type="text"
                    placeholder="Enter official course code"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    className="apple-input h-10 text-xs font-mono"
                  />
                  <span className="text-[10px] text-[var(--text-tertiary)]">
                    Supported for {selectedRegulation}.
                  </span>
                </div>
              )}

              {/* Course Name */}
              <div className="flex flex-col gap-1">
                <label className="font-semibold text-[var(--text-primary)]">
                  Course Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Data Structures or Biology for Engineers"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="apple-input h-10 text-xs"
                />
              </div>

              {/* Verified Credits & Department */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-[var(--text-primary)]">
                    Verified Credits (Optional)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="12"
                    step="0.5"
                    placeholder="Leave empty if unassigned"
                    value={formCredits}
                    onChange={(e) => setFormCredits(e.target.value)}
                    className="apple-input h-10 text-xs"
                  />
                  <span className="text-[10px] text-[var(--text-tertiary)]">
                    Only if verified in official syllabus.
                  </span>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-[var(--text-primary)]">
                    Department / Discipline
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. CSE, ECE, Common"
                    value={formDepartment}
                    onChange={(e) => setFormDepartment(e.target.value)}
                    className="apple-input h-10 text-xs"
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="flex flex-col gap-1">
                <label className="font-semibold text-[var(--text-primary)]">
                  Catalogue Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Lab component included, prerequisite info"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="apple-input h-10 text-xs"
                />
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border-secondary)]">
                <button
                  type="button"
                  onClick={() => setIsAddEditModalOpen(false)}
                  className="apple-btn-secondary text-xs h-9 px-4 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="apple-btn-primary text-xs h-9 px-5 font-semibold cursor-pointer"
                >
                  {editingCourse ? 'Save Changes' : 'Add to Catalogue'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Import JSON */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-appleFadeIn">
          <div className="w-full max-w-lg rounded-2xl bg-[var(--surface)] border border-[var(--border-primary)] shadow-2xl p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-[var(--border-secondary)] pb-3">
              <h3 className="text-base font-bold text-[var(--text-primary)]">
                Import Catalogue for {selectedRegulation}
              </h3>
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="p-1 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleImportSubmit} className="flex flex-col gap-4 text-xs">
              <p className="text-[var(--text-secondary)]">
                Paste JSON array of courses or export object. Duplicate entries by code or name will be skipped.
              </p>
              <textarea
                rows={8}
                required
                placeholder='[ { "name": "Linear Algebra", "category": "foundation", "verifiedCredits": 4 } ]'
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                className="apple-input font-mono text-xs p-3 h-48 w-full"
              />

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border-secondary)]">
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  className="apple-btn-secondary text-xs h-9 px-4 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="apple-btn-primary text-xs h-9 px-5 font-semibold cursor-pointer"
                >
                  Import Courses
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-appleFadeIn">
          <div className="w-full max-w-sm rounded-2xl bg-[var(--surface)] border border-[var(--border-primary)] shadow-2xl p-6 flex flex-col gap-4">
            <h3 className="text-base font-bold text-[var(--text-primary)]">
              Delete Catalogue Course?
            </h3>
            <p className="text-xs text-[var(--text-secondary)]">
              This will remove the course from the shared {selectedRegulation} catalogue. It will not delete existing student records.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="apple-btn-secondary text-xs h-9 px-4 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="apple-btn-primary text-xs h-9 px-4 bg-rose-600 hover:bg-rose-700 text-white border-transparent cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
