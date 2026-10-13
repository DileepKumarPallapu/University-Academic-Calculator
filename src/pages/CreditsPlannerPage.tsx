import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  GraduationCap,
  Award,
  Layers,
  Plus,
  Trash2,
  Edit3,
  Search,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Download,
  Upload,
  Printer,
  Filter,
  Check,
  X,
  ArrowUpDown,
} from 'lucide-react';
import { useProfile } from '../context/ProfileContext';
import { useAppToast } from '../components/layout/AppShell';
import { SaveCalculationButton } from '../components/common/SaveCalculationModal';
import { ResetConfirmModal } from '../components/common/ResetConfirmModal';
import type {
  CreditSubjectItem,
  CreditCategoryConfig,
  ResultStatus,
} from '../types/credits';
import {
  COLLEGE_CHART_TEMPLATE,
  DEFAULT_PATHWAY_TARGETS,
  calculateCreditSummary,
  calculateCategoryProgress,
  calculateSemesterProgress,
  calculateCreditsRequired,
  simulateScenarios,
  checkGraduationEligibility,
  exportCreditsToCSV,
  parseCreditsFromCSV,
  detectDuplicatesAndRetakes,
} from '../utils/creditCalculations';

// Initial sample data based on college curriculum template
const INITIAL_SUBJECTS_TEMPLATE: CreditSubjectItem[] = [
  { id: 'sub-fnd-1', code: 'MA101', name: 'Engineering Mathematics I', category: 'foundation', semester: 1, credits: 4, grade: 'A', status: 'Passed', isVerified: true, source: 'Manual' },
  { id: 'sub-fnd-2', code: 'PH101', name: 'Engineering Physics', category: 'foundation', semester: 1, credits: 4, grade: 'A+', status: 'Passed', isVerified: true, source: 'Manual' },
  { id: 'sub-fnd-3', code: 'CS101', name: 'Problem Solving & Python Programming', category: 'foundation', semester: 1, credits: 3, grade: 'O', status: 'Passed', isVerified: true, source: 'Manual' },
  { id: 'sub-core-1', code: 'CS201', name: 'Data Structures & Algorithms', category: 'programme_core', semester: 3, credits: 4, grade: 'A', status: 'Passed', isVerified: true, source: 'Manual' },
  { id: 'sub-core-2', code: 'CS202', name: 'Computer Architecture & Organisation', category: 'programme_core', semester: 3, credits: 4, grade: 'B+', status: 'Passed', isVerified: true, source: 'Manual' },
  { id: 'sub-core-3', code: 'CS301', name: 'Database Management Systems', category: 'programme_core', semester: 4, credits: 4, grade: 'A+', status: 'Passed', isVerified: true, source: 'Manual' },
  { id: 'sub-pe-1', code: 'CS401', name: 'Cloud Computing Architecture', category: 'programme_elective', semester: 5, credits: 3, grade: 'A', status: 'Passed', isVerified: true, source: 'Manual' },
  { id: 'sub-oe-1', code: 'OE301', name: 'Renewable Energy Systems', category: 'open_elective', semester: 5, credits: 3, grade: 'B+', status: 'Passed', isVerified: true, source: 'Manual' },
  { id: 'sub-il-1', code: 'IL201', name: 'Technical Seminar & Self Study', category: 'independent_learning', semester: 4, credits: 2, grade: 'O', status: 'Passed', isVerified: true, source: 'Manual' },
  { id: 'sub-ind-1', code: 'IND301', name: 'Industrial Internship / Training', category: 'industry_interaction', semester: 6, credits: 2, grade: 'A+', status: 'Passed', isVerified: true, source: 'Manual' },
  { id: 'sub-ppc-1', code: 'PPC101', name: 'Professional Communication Lab', category: 'professional_proficiency', semester: 2, credits: 2, grade: 'A', status: 'Passed', isVerified: true, source: 'Manual' },
  { id: 'sub-mc-1', code: 'MC101', name: 'Environmental Science & Sustainability', category: 'mandatory', semester: 2, credits: 0, grade: 'P', status: 'Passed', isVerified: true, source: 'Manual' },
  { id: 'sub-cs-1', code: 'CS_G1', name: 'Complementary Skills G1 Benchmark', category: 'complementary_skills', semester: 3, credits: 0, grade: 'P', status: 'Passed', isVerified: true, source: 'Manual' },
];

export const CreditsPlannerPage: React.FC = () => {
  const { activeProfile, updateProfile, getCalculation } = useProfile();
  const { showToast } = useAppToast();
  const [searchParams] = useSearchParams();
  const calcIdParam = searchParams.get('calcId');

  // Degree Pathway & Target state
  const [pathway, setPathway] = useState<'standard' | 'honours' | 'minor'>(
    activeProfile.degreePathway || 'standard'
  );
  const [targetCredits, setTargetCredits] = useState<number>(() => {
    return (
      activeProfile.customGraduationCredits ||
      DEFAULT_PATHWAY_TARGETS[activeProfile.degreePathway || 'standard'] ||
      164
    );
  });

  // Configurable Categories
  const [categories, setCategories] = useState<CreditCategoryConfig[]>(() => {
    return JSON.parse(JSON.stringify(COLLEGE_CHART_TEMPLATE));
  });

  // Subjects state with activeProfile local fallback
  const [subjects, setSubjects] = useState<CreditSubjectItem[]>(() => {
    try {
      const saved = localStorage.getItem(`academic_credits_subjects_${activeProfile.id}`);
      if (saved) return JSON.parse(saved);
    } catch {}
    return INITIAL_SUBJECTS_TEMPLATE;
  });

  // Semester planned targets (Sem 1 to 8)
  const [plannedTargets, setPlannedTargets] = useState<Record<number, number>>({
    1: 22,
    2: 22,
    3: 21,
    4: 21,
    5: 20,
    6: 20,
    7: 20,
    8: 18,
  });

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSemester, setFilterSemester] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'credits' | 'semester' | 'status'>('semester');

  // Active Tab / View
  const [activeSection, setActiveSection] = useState<'dashboard' | 'subjects' | 'categories' | 'semesters' | 'calculator' | 'pathways' | 'eligibility'>('dashboard');

  // Modals state
  const [subjectModalOpen, setSubjectModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<CreditSubjectItem | null>(null);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [deleteSubjectId, setDeleteSubjectId] = useState<string | null>(null);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [importReviewModalOpen, setImportReviewModalOpen] = useState(false);
  const [importedSubjectsReview, setImportedSubjectsReview] = useState<CreditSubjectItem[]>([]);
  const [loadedCalcTitle, setLoadedCalcTitle] = useState<string | null>(null);

  // File import ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync subjects to localStorage per profile
  useEffect(() => {
    try {
      localStorage.setItem(`academic_credits_subjects_${activeProfile.id}`, JSON.stringify(subjects));
    } catch {}
  }, [subjects, activeProfile.id]);

  // Load from Profile Context if calcIdParam is provided
  useEffect(() => {
    if (!calcIdParam) return;
    (async () => {
      const saved = await getCalculation(calcIdParam);
      if (saved && saved.inputs && saved.type === 'credits') {
        if (saved.inputs.pathway) setPathway(saved.inputs.pathway);
        if (saved.inputs.targetCredits) setTargetCredits(Number(saved.inputs.targetCredits));
        if (Array.isArray(saved.inputs.categories)) setCategories(saved.inputs.categories);
        if (Array.isArray(saved.inputs.subjects)) setSubjects(saved.inputs.subjects);
        if (saved.inputs.plannedTargets) setPlannedTargets(saved.inputs.plannedTargets);
        setLoadedCalcTitle(saved.title);
        showToast(`Loaded saved credit records: "${saved.title}"`, 'success');
      }
    })();
  }, [calcIdParam, getCalculation, showToast]);

  // Calculations
  const annotatedSubjects = useMemo(() => detectDuplicatesAndRetakes(subjects), [subjects]);

  const summary = useMemo(
    () => calculateCreditSummary(annotatedSubjects, targetCredits, categories),
    [annotatedSubjects, targetCredits, categories]
  );

  const categoryStats = useMemo(
    () => calculateCategoryProgress(categories, annotatedSubjects),
    [categories, annotatedSubjects]
  );

  const semesterStats = useMemo(
    () => calculateSemesterProgress(annotatedSubjects, plannedTargets),
    [annotatedSubjects, plannedTargets]
  );

  const eligibility = useMemo(
    () => checkGraduationEligibility(summary, categoryStats, annotatedSubjects, pathway),
    [summary, categoryStats, annotatedSubjects, pathway]
  );

  // Filtered and Sorted Subjects
  const filteredSubjects = useMemo(() => {
    return annotatedSubjects
      .filter((s) => {
        const matchesSearch =
          s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (s.code || '').toLowerCase().includes(searchQuery.toLowerCase());
        const matchesSem = filterSemester === 'all' || s.semester === Number(filterSemester);
        const matchesCat = filterCategory === 'all' || s.category === filterCategory;
        const matchesStatus = filterStatus === 'all' || s.status === filterStatus;
        return matchesSearch && matchesSem && matchesCat && matchesStatus;
      })
      .sort((a, b) => {
        if (sortBy === 'name') return a.name.localeCompare(b.name);
        if (sortBy === 'credits') return b.credits - a.credits;
        if (sortBy === 'status') return a.status.localeCompare(b.status);
        return a.semester - b.semester;
      });
  }, [annotatedSubjects, searchQuery, filterSemester, filterCategory, filterStatus, sortBy]);

  // Pathway Switch Handler
  const handlePathwayChange = (newPathway: 'standard' | 'honours' | 'minor') => {
    setPathway(newPathway);
    const newTarget = DEFAULT_PATHWAY_TARGETS[newPathway];
    setTargetCredits(newTarget);
    updateProfile(activeProfile.id, { degreePathway: newPathway, customGraduationCredits: newTarget });
    showToast(`Switched pathway to ${newPathway.toUpperCase()} (${newTarget} Cr Target)`, 'info');
  };

  // Add / Edit Subject Save Handler
  const handleSaveSubject = (data: Partial<CreditSubjectItem>) => {
    if (!data.name?.trim()) {
      showToast('Course name is required', 'error');
      return;
    }

    const cr = Math.max(0, Number(data.credits) || 0);

    if (editingSubject) {
      setSubjects((prev) =>
        prev.map((s) => (s.id === editingSubject.id ? { ...s, ...data, credits: cr } : s))
      );
      showToast(`Updated course: ${data.name}`, 'success');
    } else {
      const newSubject: CreditSubjectItem = {
        id: `sub-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        name: data.name.trim(),
        code: data.code?.trim().toUpperCase(),
        category: data.category || 'programme_core',
        semester: Number(data.semester) || 1,
        credits: cr,
        grade: data.grade || 'A',
        status: data.status || 'Passed',
        isVerified: data.isVerified !== undefined ? data.isVerified : true,
        source: 'Manual',
        notes: data.notes?.trim(),
      };
      setSubjects((prev) => [...prev, newSubject]);
      showToast(`Added course: ${newSubject.name}`, 'success');
    }

    setSubjectModalOpen(false);
    setEditingSubject(null);
  };

  // Delete Subject Handler
  const handleConfirmDeleteSubject = () => {
    if (deleteSubjectId) {
      setSubjects((prev) => prev.filter((s) => s.id !== deleteSubjectId));
      setDeleteSubjectId(null);
      showToast('Course record deleted', 'info');
    }
  };

  // Reset to College Template
  const handleResetToTemplate = () => {
    setCategories(JSON.parse(JSON.stringify(COLLEGE_CHART_TEMPLATE)));
    setSubjects(INITIAL_SUBJECTS_TEMPLATE);
    setTargetCredits(DEFAULT_PATHWAY_TARGETS[pathway]);
    setLoadedCalcTitle(null);
    setResetConfirmOpen(false);
    showToast('Reset to college supplied credit template.', 'info');
  };

  // CSV Export
  const handleExportCSV = () => {
    const csv = exportCreditsToCSV(subjects);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeProfile.name.replace(/\s+/g, '_')}_Credits_${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Exported subjects to CSV', 'success');
  };

  // File Import (CSV or JSON)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      try {
        if (file.name.endsWith('.json')) {
          const parsed = JSON.parse(text);
          if (Array.isArray(parsed.subjects)) {
            setImportedSubjectsReview(parsed.subjects);
            setImportReviewModalOpen(true);
          } else {
            showToast('JSON file missing subjects array', 'error');
          }
        } else {
          // CSV Parsing
          const parsed = parseCreditsFromCSV(text);
          if (parsed.length > 0) {
            setImportedSubjectsReview(parsed);
            setImportReviewModalOpen(true);
          } else {
            showToast('No valid subject records found in CSV', 'error');
          }
        }
      } catch (err: any) {
        showToast(`Failed to parse file: ${err.message}`, 'error');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Confirm Import Review
  const handleConfirmImport = (confirmedList: CreditSubjectItem[]) => {
    setSubjects((prev) => [...prev, ...confirmedList]);
    setImportReviewModalOpen(false);
    showToast(`Imported ${confirmedList.length} course records.`, 'success');
  };

  // Printable Report
  const handlePrintReport = () => {
    window.print();
  };

  // Active Category Count for tabs
  const duplicateCount = annotatedSubjects.filter((s) => s.isDuplicate).length;

  return (
    <div className="w-full max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-8 animate-appleFadeIn">
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        accept=".csv,.json"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--border-secondary)] pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-black/5 dark:bg-white/10 text-[var(--text-secondary)]">
              Official Curriculum System
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
              Active: {activeProfile.name}
            </span>
            {loadedCalcTitle && (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-zinc-200 dark:bg-zinc-800 text-[var(--text-primary)]">
                Loaded: {loadedCalcTitle}
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)]">
            Credit Calculator & Degree Progress
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Track your earned credits, remaining requirements, and graduation progress.
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handlePrintReport}
            className="apple-btn-secondary text-xs h-10 px-3.5 gap-1.5 font-semibold"
            title="Print credit audit report"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Report</span>
          </button>

          <button
            type="button"
            onClick={() => setResetConfirmOpen(true)}
            className="apple-btn-secondary text-xs h-10 px-3.5 gap-1.5 text-[var(--text-secondary)] hover:text-rose-600"
            title="Reset to college credit template"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>

          <SaveCalculationButton
            type="credits"
            defaultTitle={`Credit Audit — ${pathway.toUpperCase()} (${summary.totalEarnedCredits}/${summary.targetCredits})`}
            resultValue={`${summary.totalEarnedCredits} / ${summary.targetCredits} Credits`}
            resultSummary={`${summary.completionPercentage.toFixed(1)}% completed • ${pathway.toUpperCase()} • ${eligibility.status}`}
            inputs={{
              pathway,
              targetCredits,
              categories,
              subjects,
              plannedTargets,
            }}
            existingCalcId={calcIdParam}
            onSaved={() => setLoadedCalcTitle(`Credit Audit — ${pathway.toUpperCase()}`)}
          />
        </div>
      </div>

      {/* Pathway Switcher & Target Banner */}
      <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border-primary)] p-5 sm:p-6 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-6">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
              Degree Pathway
            </span>
            <span className="text-[11px] text-[var(--text-tertiary)]">
              (College template: 164 base + 18 pathway)
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {(
              [
                { id: 'standard', label: 'Standard B.Tech (164 Cr)', icon: GraduationCap },
                { id: 'honours', label: 'B.Tech Honours (182 Cr)', icon: Award },
                { id: 'minor', label: 'Additional Minor (182 Cr)', icon: Layers },
              ] as const
            ).map((opt) => {
              const Icon = opt.icon;
              const isSelected = pathway === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handlePathwayChange(opt.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-black text-white dark:bg-white dark:text-black shadow-sm'
                      : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-primary)]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Target Credits Config */}
        <div className="flex items-center gap-4 border-t md:border-t-0 md:border-l border-[var(--border-secondary)] pt-4 md:pt-0 md:pl-6">
          <div>
            <label htmlFor="credit-target-input" className="text-xs font-semibold text-[var(--text-secondary)] block">
              Graduation Target
            </label>
            <div className="flex items-center gap-2 mt-1">
              <input
                id="credit-target-input"
                type="number"
                min={60}
                max={250}
                value={targetCredits}
                onChange={(e) => setTargetCredits(Math.max(1, parseInt(e.target.value) || 0))}
                className="apple-input w-24 h-10 text-center font-bold text-sm tabular-nums"
              />
              <span className="text-xs text-[var(--text-secondary)] font-medium">Credits</span>
            </div>
          </div>

          <div className="text-xs text-[var(--text-secondary)] max-w-[210px] leading-relaxed">
            Editable template. Customize graduation targets if your university follows different regulations.
          </div>
        </div>
      </div>

      {/* Navigation Tabs for the 7 Detailed Views */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none border-b border-[var(--border-secondary)]">
        {(
          [
            { id: 'dashboard', label: '1. Credit Dashboard' },
            { id: 'subjects', label: `2. Subject Manager (${subjects.length})` },
            { id: 'categories', label: '3. Category Progress' },
            { id: 'semesters', label: '4. Semester Planner' },
            { id: 'calculator', label: '5. Credits Required Calculator' },
            { id: 'pathways', label: '6. Honours & Minor' },
            { id: 'eligibility', label: '7. Graduation Eligibility' },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveSection(tab.id)}
            className={`px-4 py-2.5 text-xs font-semibold whitespace-nowrap rounded-xl transition-all cursor-pointer ${
              activeSection === tab.id
                ? 'bg-black text-white dark:bg-white dark:text-black shadow-xs'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ======================================================== */}
      {/* 1. CREDIT DASHBOARD                                     */}
      {/* ======================================================== */}
      {activeSection === 'dashboard' && (
        <div className="flex flex-col gap-6 animate-appleFadeIn">
          {/* Main Summary Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-[var(--surface)] border border-[var(--border-primary)] shadow-xs flex flex-col justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                Total Credits Earned
              </span>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--text-primary)] tabular-nums">
                  {summary.totalEarnedCredits}
                </span>
                <span className="text-sm font-semibold text-[var(--text-secondary)]">
                  / {summary.targetCredits}
                </span>
              </div>
              <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-1">
                Verified earned credits
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-[var(--surface)] border border-[var(--border-primary)] shadow-xs flex flex-col justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                Credits Remaining
              </span>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--text-primary)] tabular-nums">
                  {summary.creditsRemaining}
                </span>
                <span className="text-sm font-semibold text-[var(--text-secondary)]">
                  needed
                </span>
              </div>
              <div className="text-xs text-[var(--text-secondary)] mt-1">
                {summary.creditsRemaining === 0 ? 'Degree requirement met!' : 'Across remaining semesters'}
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-[var(--surface)] border border-[var(--border-primary)] shadow-xs flex flex-col justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                Completion Percentage
              </span>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--text-primary)] tabular-nums">
                  {summary.completionPercentage.toFixed(1)}%
                </span>
                {summary.extraCredits > 0 && (
                  <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    (+{summary.extraCredits} Extra Cr)
                  </span>
                )}
              </div>
              <div className="w-full bg-[var(--bg-tertiary)] rounded-full h-2 mt-2 overflow-hidden border border-[var(--border-secondary)]">
                <div
                  className="bg-black dark:bg-white h-full rounded-full transition-all duration-500"
                  style={{ width: `${summary.completionPercentage}%` }}
                />
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-[var(--surface)] border border-[var(--border-primary)] shadow-xs flex flex-col justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                Graduation Status
              </span>
              <div className="flex items-center gap-2 mt-2">
                {eligibility.isEligible ? (
                  <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold text-base">
                    <CheckCircle2 className="w-5 h-5 shrink-0" />
                    <span>Eligible</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-bold text-base">
                    <AlertTriangle className="w-5 h-5 shrink-0" />
                    <span>Requirements Remaining</span>
                  </div>
                )}
              </div>
              <div className="text-xs text-[var(--text-secondary)] mt-1 truncate">
                {eligibility.deficitCategories.length === 0
                  ? 'All categories satisfied'
                  : `${eligibility.deficitCategories.length} category deficit(s)`}
              </div>
            </div>
          </div>

          {/* Detailed breakdown pill cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border-secondary)]">
              <span className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase">
                Registered / Attempted
              </span>
              <div className="text-xl font-bold text-[var(--text-primary)] tabular-nums mt-0.5">
                {summary.totalRegisteredCredits} Cr
              </div>
              <span className="text-[10px] text-[var(--text-tertiary)]">All attempted courses</span>
            </div>

            <div className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border-secondary)]">
              <span className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase">
                Pending Verification
              </span>
              <div className="text-xl font-bold text-amber-600 dark:text-amber-400 tabular-nums mt-0.5">
                {summary.pendingCredits} Cr
              </div>
              <span className="text-[10px] text-[var(--text-tertiary)]">In-progress or awaiting results</span>
            </div>

            <div className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border-secondary)]">
              <span className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase">
                Failed Courses
              </span>
              <div className="text-xl font-bold text-rose-600 dark:text-rose-400 tabular-nums mt-0.5">
                {summary.failedCredits} Cr
              </div>
              <span className="text-[10px] text-[var(--text-tertiary)]">Excluded from earned credits</span>
            </div>

            <div className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border-secondary)]">
              <span className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase">
                Extra Credits
              </span>
              <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums mt-0.5">
                {summary.extraCredits} Cr
              </div>
              <span className="text-[10px] text-[var(--text-tertiary)]">Beyond required {summary.targetCredits} target</span>
            </div>
          </div>

          {/* Duplicates Alert Banner if any */}
          {duplicateCount > 0 && (
            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-xs text-amber-900 dark:text-amber-300 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                <span>
                  <strong>Duplicate Course Warning:</strong> {duplicateCount} records share identical course codes. Repeated passed courses are counted only once to avoid double-counting.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActiveSection('subjects')}
                className="apple-btn-secondary text-xs h-8 px-3 shrink-0"
              >
                Review Subjects
              </button>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. SUBJECT CREDIT MANAGER                                */}
      {/* ======================================================== */}
      {activeSection === 'subjects' && (
        <div className="flex flex-col gap-5 animate-appleFadeIn">
          {/* Controls Bar: Search, Filters, Add Course */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-[var(--text-tertiary)]" />
              <input
                type="text"
                placeholder="Search by course name or code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="apple-input h-10 pl-9 text-xs w-full"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setEditingSubject(null);
                  setSubjectModalOpen(true);
                }}
                className="apple-btn-primary text-xs h-10 px-3.5 gap-1.5 font-semibold"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Subject</span>
              </button>

              <button
                type="button"
                onClick={() => setBulkModalOpen(true)}
                className="apple-btn-secondary text-xs h-10 px-3.5 gap-1.5 font-semibold"
              >
                <span>Bulk Entry</span>
              </button>

              <button
                type="button"
                onClick={handleExportCSV}
                className="apple-btn-secondary text-xs h-10 px-3 gap-1.5 font-semibold"
                title="Export subjects to CSV"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="apple-btn-secondary text-xs h-10 px-3 gap-1.5 font-semibold"
                title="Import subjects from CSV / JSON"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Import</span>
              </button>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="p-3.5 rounded-xl bg-[var(--surface)] border border-[var(--border-primary)] flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-[var(--text-secondary)] uppercase text-[10px] flex items-center gap-1">
                <Filter className="w-3 h-3" /> Filters:
              </span>

              {/* Semester Filter */}
              <select
                value={filterSemester}
                onChange={(e) => setFilterSemester(e.target.value)}
                className="apple-input h-8 text-xs font-medium cursor-pointer"
              >
                <option value="all">All Semesters</option>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                  <option key={s} value={s}>
                    Semester {s}
                  </option>
                ))}
              </select>

              {/* Category Filter */}
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="apple-input h-8 text-xs font-medium cursor-pointer max-w-[180px]"
              >
                <option value="all">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.code})
                  </option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="apple-input h-8 text-xs font-medium cursor-pointer"
              >
                <option value="all">All Statuses</option>
                <option value="Passed">Passed</option>
                <option value="Failed">Failed</option>
                <option value="Pending">Pending</option>
                <option value="Withdrawn">Withdrawn</option>
                <option value="Incomplete">Incomplete</option>
              </select>
            </div>

            {/* Sort Controls */}
            <div className="flex items-center gap-2">
              <span className="font-bold text-[var(--text-secondary)] uppercase text-[10px] flex items-center gap-1">
                <ArrowUpDown className="w-3 h-3" /> Sort:
              </span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="apple-input h-8 text-xs font-medium cursor-pointer"
              >
                <option value="semester">By Semester</option>
                <option value="name">By Course Name</option>
                <option value="credits">By Credits (High to Low)</option>
                <option value="status">By Result Status</option>
              </select>
            </div>
          </div>

          {/* Subjects Table */}
          <div className="rounded-2xl border border-[var(--border-primary)] bg-[var(--surface)] overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[var(--bg-tertiary)] border-b border-[var(--border-primary)] text-[var(--text-secondary)] font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-3.5">Code</th>
                    <th className="py-3 px-3.5">Course Name</th>
                    <th className="py-3 px-3.5">Category</th>
                    <th className="py-3 px-2 text-center">Sem</th>
                    <th className="py-3 px-2 text-center">Credits</th>
                    <th className="py-3 px-2 text-center">Grade</th>
                    <th className="py-3 px-3 text-center">Status</th>
                    <th className="py-3 px-3 text-center">Verification</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-secondary)]">
                  {filteredSubjects.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-[var(--text-secondary)]">
                        No course records found matching your filters.
                      </td>
                    </tr>
                  ) : (
                    filteredSubjects.map((sub) => {
                      const catConfig = categories.find((c) => c.id === sub.category);
                      return (
                        <tr
                          key={sub.id}
                          className="hover:bg-[var(--bg-tertiary)] transition-colors group"
                        >
                          <td className="py-3 px-3.5 font-mono font-bold text-[var(--text-primary)]">
                            {sub.code || '—'}
                            {sub.isDuplicate && (
                              <span
                                className="ml-1.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300"
                                title="Duplicate course code detected"
                              >
                                {sub.isRetake ? 'Retake' : 'Duplicate'}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3.5 font-medium text-[var(--text-primary)]">
                            {sub.name}
                            {sub.notes && (
                              <span className="block text-[10px] text-[var(--text-tertiary)]">
                                {sub.notes}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3.5">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[var(--bg-tertiary)] text-[var(--text-secondary)]">
                              {catConfig ? catConfig.code : sub.category}
                            </span>
                          </td>
                          <td className="py-3 px-2 text-center tabular-nums font-semibold">
                            S{sub.semester}
                          </td>
                          <td className="py-3 px-2 text-center tabular-nums font-bold text-[var(--text-primary)]">
                            {sub.credits}
                            {sub.credits === 0 && (
                              <span className="block text-[9px] text-[var(--text-tertiary)] font-normal">
                                Non-credit
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-2 text-center font-bold font-mono">
                            {sub.grade || '—'}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                sub.status === 'Passed'
                                  ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                                  : sub.status === 'Failed'
                                  ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300'
                                  : 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                              }`}
                            >
                              {sub.status}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span
                              className={`text-[11px] font-medium ${
                                sub.isVerified
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : 'text-[var(--text-tertiary)]'
                              }`}
                            >
                              {sub.isVerified ? '✓ Verified' : 'Unverified'}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingSubject(sub);
                                  setSubjectModalOpen(true);
                                }}
                                className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--border-secondary)] cursor-pointer"
                                title="Edit course"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteSubjectId(sub.id)}
                                className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                                title="Delete course"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. CATEGORY-WISE PROGRESS                                */}
      {/* ======================================================== */}
      {activeSection === 'categories' && (
        <div className="flex flex-col gap-6 animate-appleFadeIn">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-[var(--text-primary)]">
                Category-Wise Credit Tracker
              </h2>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Every configured curriculum category must satisfy its minimum credit threshold to qualify for graduation.
              </p>
            </div>
            <span className="text-xs font-semibold text-[var(--text-secondary)]">
              {categories.length} Categories
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {categoryStats.map((item) => {
              const cat = item.category;
              return (
                <div
                  key={cat.id}
                  className="p-5 rounded-2xl bg-[var(--surface)] border border-[var(--border-primary)] shadow-xs flex flex-col justify-between gap-4"
                >
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[var(--bg-tertiary)] text-[var(--text-secondary)]">
                          {cat.code}
                        </span>
                        <h3 className="text-sm font-bold text-[var(--text-primary)]">
                          {cat.name}
                        </h3>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          item.isSatisfied
                            ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                            : 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                        }`}
                      >
                        {item.isSatisfied ? 'Satisfied' : `Deficit: ${item.remainingCredits} Cr`}
                      </span>
                    </div>

                    {cat.description && (
                      <p className="text-xs text-[var(--text-secondary)]">
                        {cat.description}
                      </p>
                    )}

                    <div className="grid grid-cols-3 gap-2 pt-2 text-xs">
                      <div>
                        <span className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase">
                          Required
                        </span>
                        <div className="font-bold text-[var(--text-primary)] tabular-nums mt-0.5">
                          {cat.requiredCredits} Cr
                        </div>
                      </div>
                      <div>
                        <span className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase">
                          Earned
                        </span>
                        <div className="font-bold text-emerald-600 dark:text-emerald-400 tabular-nums mt-0.5">
                          {item.earnedCredits} Cr
                        </div>
                      </div>
                      <div>
                        <span className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase">
                          Remaining
                        </span>
                        <div className="font-bold text-[var(--text-primary)] tabular-nums mt-0.5">
                          {item.remainingCredits} Cr
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-[var(--bg-tertiary)] rounded-full h-2 mt-2 overflow-hidden border border-[var(--border-secondary)]">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          item.isSatisfied ? 'bg-emerald-500' : 'bg-black dark:bg-white'
                        }`}
                        style={{ width: `${item.progressPercentage}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-3 border-t border-[var(--border-secondary)]">
                    <span className="text-[var(--text-tertiary)]">
                      {item.courseCount} {item.courseCount === 1 ? 'course' : 'courses'} recorded
                    </span>
                    <span className="font-bold tabular-nums text-[var(--text-primary)]">
                      {item.progressPercentage.toFixed(1)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 4. SEMESTER-WISE PROGRESS                                */}
      {/* ======================================================== */}
      {activeSection === 'semesters' && (
        <div className="flex flex-col gap-6 animate-appleFadeIn">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-[var(--text-primary)]">
                Semester-Wise Credit Planner
              </h2>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Monitor registered, earned, and planned targets across Semesters I through VIII.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {semesterStats.map((sem) => (
              <div
                key={sem.semester}
                className="p-5 rounded-2xl bg-[var(--surface)] border border-[var(--border-primary)] shadow-xs flex flex-col justify-between gap-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-[var(--text-primary)]">
                    Semester {sem.semester}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      sem.earnedCredits > 0 && sem.failedCredits === 0
                        ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                        : sem.failedCredits > 0
                        ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300'
                        : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]'
                    }`}
                  >
                    {sem.earnedCredits > 0 ? `${sem.earnedCredits} Cr Earned` : 'Planned'}
                  </span>
                </div>

                <div className="flex flex-col gap-1.5 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-[var(--text-secondary)]">Planned Target:</span>
                    <input
                      type="number"
                      min={0}
                      max={40}
                      value={plannedTargets[sem.semester] || 0}
                      onChange={(e) =>
                        setPlannedTargets((prev) => ({
                          ...prev,
                          [sem.semester]: parseInt(e.target.value) || 0,
                        }))
                      }
                      className="apple-input w-16 h-7 text-center font-bold text-xs"
                    />
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-[var(--text-secondary)]">Registered:</span>
                    <span className="font-bold text-[var(--text-primary)] tabular-nums">
                      {sem.registeredCredits} Cr
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-[var(--text-secondary)]">Earned:</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                      {sem.earnedCredits} Cr
                    </span>
                  </div>

                  {sem.failedCredits > 0 && (
                    <div className="flex justify-between items-center text-rose-600">
                      <span>Failed:</span>
                      <span className="font-bold tabular-nums">{sem.failedCredits} Cr</span>
                    </div>
                  )}
                </div>

                <div className="text-[10px] text-[var(--text-tertiary)] pt-2 border-t border-[var(--border-secondary)]">
                  {sem.courses.length} courses registered
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 5. CREDITS REQUIRED CALCULATOR                           */}
      {/* ======================================================== */}
      {activeSection === 'calculator' && (
        <CreditsRequiredSection
          targetCredits={targetCredits}
          earnedCredits={summary.totalEarnedCredits}
          pathway={pathway}
        />
      )}

      {/* ======================================================== */}
      {/* 6. HONOURS AND MINOR PLANNER                             */}
      {/* ======================================================== */}
      {activeSection === 'pathways' && (
        <HonoursMinorSection
          pathway={pathway}
          totalEarnedCredits={summary.totalEarnedCredits}
          onSelectPathway={handlePathwayChange}
          categoryStats={categoryStats}
        />
      )}

      {/* ======================================================== */}
      {/* 7. GRADUATION ELIGIBILITY CHECKER                        */}
      {/* ======================================================== */}
      {activeSection === 'eligibility' && (
        <GraduationEligibilitySection eligibility={eligibility} summary={summary} />
      )}

      {/* ======================================================== */}
      {/* MODALS                                                   */}
      {/* ======================================================== */}

      {/* Add / Edit Subject Modal */}
      {subjectModalOpen && (
        <SubjectFormModal
          isOpen={subjectModalOpen}
          initialData={editingSubject}
          categories={categories}
          onClose={() => {
            setSubjectModalOpen(false);
            setEditingSubject(null);
          }}
          onSave={handleSaveSubject}
        />
      )}

      {/* Bulk Entry Modal */}
      {bulkModalOpen && (
        <BulkEntryModal
          isOpen={bulkModalOpen}
          categories={categories}
          onClose={() => setBulkModalOpen(false)}
          onSaveBulk={(newCourses) => {
            setSubjects((prev) => [...prev, ...newCourses]);
            setBulkModalOpen(false);
            showToast(`Added ${newCourses.length} courses in bulk.`, 'success');
          }}
        />
      )}

      {/* Import Review Modal */}
      {importReviewModalOpen && (
        <ImportReviewModal
          isOpen={importReviewModalOpen}
          importedSubjects={importedSubjectsReview}
          categories={categories}
          onClose={() => setImportReviewModalOpen(false)}
          onConfirm={handleConfirmImport}
        />
      )}

      {/* Delete Subject Confirmation */}
      <ResetConfirmModal
        isOpen={Boolean(deleteSubjectId)}
        onClose={() => setDeleteSubjectId(null)}
        onConfirm={handleConfirmDeleteSubject}
        title="Delete course record?"
        description="Are you sure you want to remove this course from your academic credit plan? This will immediately recalculate your earned credits."
      />

      {/* Reset To Template Confirmation */}
      <ResetConfirmModal
        isOpen={resetConfirmOpen}
        onClose={() => setResetConfirmOpen(false)}
        onConfirm={handleResetToTemplate}
        title="Reset to College Template?"
        description="Are you sure you want to restore the official 164-credit college structure and initial template courses? Any custom courses added will be reset."
      />
    </div>
  );
};

/* ========================================================================= */
/* SUB-COMPONENT: Credits Required Calculator & Future Simulator             */
/* ========================================================================= */
const CreditsRequiredSection: React.FC<{
  targetCredits: number;
  earnedCredits: number;
  pathway: string;
}> = ({ targetCredits, earnedCredits, pathway }) => {
  const [remainingSemestersInput, setRemainingSemestersInput] = useState<number>(3);
  const [nextSemPlannedInput, setNextSemPlannedInput] = useState<number>(20);

  const reqResult = useMemo(
    () => calculateCreditsRequired(targetCredits, earnedCredits, remainingSemestersInput),
    [targetCredits, earnedCredits, remainingSemestersInput]
  );

  const scenarios = useMemo(
    () => simulateScenarios(reqResult.remainingCredits, remainingSemestersInput, nextSemPlannedInput),
    [reqResult.remainingCredits, remainingSemestersInput, nextSemPlannedInput]
  );

  return (
    <div className="flex flex-col gap-6 animate-appleFadeIn">
      <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border-primary)] p-6 shadow-sm flex flex-col gap-6">
        <div>
          <h2 className="text-lg font-bold text-[var(--text-primary)]">
            Credits Required & Semester Load Simulator
          </h2>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Plan your remaining semester workload to reach your {pathway.toUpperCase()} degree target.
          </p>
        </div>

        {/* Inputs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-[var(--border-secondary)] pt-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="req-target-cr" className="text-xs font-semibold text-[var(--text-secondary)]">
              Degree Credit Target
            </label>
            <div className="text-2xl font-bold text-[var(--text-primary)] tabular-nums">
              {targetCredits} Cr
            </div>
            <span className="text-[11px] text-[var(--text-tertiary)]">Configured degree goal</span>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="req-earned-cr" className="text-xs font-semibold text-[var(--text-secondary)]">
              Verified Credits Earned
            </label>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
              {earnedCredits} Cr
            </div>
            <span className="text-[11px] text-[var(--text-tertiary)]">Confirmed passed courses</span>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="remaining-sem-input" className="text-xs font-semibold text-[var(--text-primary)]">
              Remaining Semesters in Degree
            </label>
            <input
              id="remaining-sem-input"
              type="number"
              min={0}
              max={8}
              value={remainingSemestersInput}
              onChange={(e) => setRemainingSemestersInput(Math.max(0, parseInt(e.target.value) || 0))}
              className="apple-input h-10 text-sm font-bold w-32 text-center"
            />
            <span className="text-[11px] text-[var(--text-tertiary)]">Semesters left to graduate</span>
          </div>
        </div>

        {/* Output Banner */}
        <div className="p-5 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-primary)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
              Required Average Per Semester
            </span>
            <div className="text-3xl font-bold text-[var(--text-primary)] tabular-nums mt-1">
              {reqResult.requiredAveragePerSemester} Credits / Semester
            </div>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              {reqResult.message}
            </p>
          </div>

          {reqResult.requiredAveragePerSemester > 26 && (
            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-xs text-amber-800 dark:text-amber-300 font-semibold max-w-xs">
              ⚠️ Heavy Semester Load Warning: A requirement exceeding 26 credits per semester may surpass your university's maximum semester credit limit.
            </div>
          )}
        </div>
      </div>

      {/* Scenario Simulator */}
      <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border-primary)] p-6 shadow-sm flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-[var(--text-primary)]">
              Scenario Simulator (Next Semester Pacing)
            </h3>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Projected estimates based on varying course registration intensities.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-[var(--text-secondary)]">Next Sem Planned:</label>
            <input
              type="number"
              min={10}
              max={32}
              value={nextSemPlannedInput}
              onChange={(e) => setNextSemPlannedInput(Math.max(1, parseInt(e.target.value) || 0))}
              className="apple-input h-8 w-20 text-center font-bold text-xs"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {scenarios.map((sc) => (
            <div
              key={sc.id}
              className="p-5 rounded-xl border border-[var(--border-secondary)] bg-[var(--bg-tertiary)] flex flex-col justify-between gap-3 shadow-xs"
            >
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                  Scenario {sc.id} • {sc.name}
                </span>
                <div className="text-xl font-bold text-[var(--text-primary)] tabular-nums mt-1">
                  Take {sc.nextSemesterCredits} Credits Next Sem
                </div>
              </div>

              <div className="text-xs flex flex-col gap-1 border-t border-[var(--border-secondary)] pt-3 text-[var(--text-secondary)]">
                <div className="flex justify-between">
                  <span>Projected Remaining:</span>
                  <strong className="text-[var(--text-primary)]">{sc.projectedRemaining} Cr</strong>
                </div>
                <div className="flex justify-between">
                  <span>Subsequent Average:</span>
                  <strong className="text-[var(--text-primary)]">{sc.requiredSubsequentAvg} Cr / sem</strong>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/* ========================================================================= */
/* SUB-COMPONENT: Honours & Minor Pathway Planner                            */
/* ========================================================================= */
const HonoursMinorSection: React.FC<{
  pathway: 'standard' | 'honours' | 'minor';
  totalEarnedCredits: number;
  onSelectPathway: (p: 'standard' | 'honours' | 'minor') => void;
  categoryStats: any[];
}> = ({ pathway, totalEarnedCredits, onSelectPathway, categoryStats }) => {
  const hmStat = categoryStats.find((c) => c.category.id === 'honours_minor');
  const hmEarned = hmStat?.earnedCredits || 0;
  const hmRemaining = Math.max(0, 18 - hmEarned);

  return (
    <div className="flex flex-col gap-6 animate-appleFadeIn">
      <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border-primary)] p-6 shadow-sm flex flex-col gap-6">
        <div>
          <h2 className="text-lg font-bold text-[var(--text-primary)]">
            Honours & Minor Degree Pathway Planner
          </h2>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            The college chart specifies an additional 18-credit pathway for B.Tech Honours or Additional Minor degrees.
          </p>
        </div>

        {/* 3 Pathway Comparison Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(
            [
              {
                id: 'standard',
                title: 'Standard B.Tech Degree',
                target: 164,
                extraCr: 0,
                desc: '164 base credits across core, foundation, and electives.',
              },
              {
                id: 'honours',
                title: 'B.Tech with Honours',
                target: 182,
                extraCr: 18,
                desc: '164 base credits + 18 specialized advanced departmental honours credits.',
              },
              {
                id: 'minor',
                title: 'B.Tech with Additional Minor',
                target: 182,
                extraCr: 18,
                desc: '164 base credits + 18 credits in an interdisciplinary minor engineering branch.',
              },
            ] as const
          ).map((opt) => {
            const isCurrent = pathway === opt.id;
            return (
              <div
                key={opt.id}
                className={`p-5 rounded-2xl border flex flex-col justify-between gap-4 transition-all ${
                  isCurrent
                    ? 'border-[var(--text-primary)] bg-[var(--bg-tertiary)] shadow-md'
                    : 'border-[var(--border-primary)] bg-[var(--surface)]'
                }`}
              >
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                      {opt.id.toUpperCase()}
                    </span>
                    {isCurrent && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-black text-white dark:bg-white dark:text-black">
                        Active Pathway
                      </span>
                    )}
                  </div>
                  <h3 className="text-base font-bold text-[var(--text-primary)]">
                    {opt.title}
                  </h3>
                  <div className="text-2xl font-bold tabular-nums text-[var(--text-primary)]">
                    {opt.target} Credits
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                    {opt.desc}
                  </p>
                </div>

                {!isCurrent && (
                  <button
                    type="button"
                    onClick={() => onSelectPathway(opt.id)}
                    className="apple-btn-secondary text-xs h-9 w-full font-semibold"
                  >
                    Switch to {opt.title}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Detailed Breakdown for Active Pathway */}
        <div className="p-5 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-secondary)] flex flex-col gap-4 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-sm text-[var(--text-primary)]">
              Pathway Progress Audit ({pathway.toUpperCase()})
            </span>
            <span className="text-xs text-[var(--text-secondary)] font-medium">
              Earned: {totalEarnedCredits} Cr • Base: 164 Cr {pathway !== 'standard' ? '• Pathway: +18 Cr' : ''}
            </span>
          </div>

          {pathway !== 'standard' ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-lg bg-[var(--surface)] border border-[var(--border-secondary)]">
                <span className="text-[10px] uppercase font-bold text-[var(--text-secondary)]">
                  Pathway Required
                </span>
                <div className="text-xl font-bold text-[var(--text-primary)] tabular-nums mt-0.5">
                  18 Cr
                </div>
              </div>
              <div className="p-3.5 rounded-lg bg-[var(--surface)] border border-[var(--border-secondary)]">
                <span className="text-[10px] uppercase font-bold text-[var(--text-secondary)]">
                  Pathway Completed
                </span>
                <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums mt-0.5">
                  {hmEarned} Cr
                </div>
              </div>
              <div className="p-3.5 rounded-lg bg-[var(--surface)] border border-[var(--border-secondary)]">
                <span className="text-[10px] uppercase font-bold text-[var(--text-secondary)]">
                  Pathway Remaining
                </span>
                <div className="text-xl font-bold text-[var(--text-primary)] tabular-nums mt-0.5">
                  {hmRemaining} Cr
                </div>
              </div>
            </div>
          ) : (
            <p className="text-[var(--text-secondary)] leading-relaxed">
              Standard B.Tech degree path selected. No additional Honours or Minor credits are required.
            </p>
          )}

          <div className="text-[11px] text-[var(--text-tertiary)] pt-2 border-t border-[var(--border-secondary)]">
            Important: Credits earned for base degree requirements do not automatically satisfy Honours or Minor pathway requirements unless explicitly permitted under your college's official course overlap regulations.
          </div>
        </div>
      </div>
    </div>
  );
};

/* ========================================================================= */
/* SUB-COMPONENT: Graduation Eligibility Section                             */
/* ========================================================================= */
const GraduationEligibilitySection: React.FC<{
  eligibility: any;
  summary: any;
}> = ({ eligibility }) => {
  return (
    <div className="flex flex-col gap-6 animate-appleFadeIn">
      <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border-primary)] p-6 shadow-sm flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-[var(--text-primary)]">
              Graduation Eligibility Checker
            </h2>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Comprehensive rules-based audit validating overall credits, category minimums, mandatory courses, and active backlogs.
            </p>
          </div>

          <span
            className={`px-3 py-1 rounded-full text-xs font-bold ${
              eligibility.isEligible
                ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                : 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
            }`}
          >
            {eligibility.status}
          </span>
        </div>

        {/* Checklist */}
        <div className="flex flex-col divide-y divide-[var(--border-secondary)] border border-[var(--border-primary)] rounded-xl overflow-hidden bg-[var(--bg-tertiary)] text-xs">
          {eligibility.checklist.map((item: any) => (
            <div key={item.id} className="p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                    item.isSatisfied
                      ? 'bg-emerald-500 text-white'
                      : 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                  }`}
                >
                  {item.isSatisfied ? <Check className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                </div>
                <div>
                  <div className="font-bold text-[var(--text-primary)] text-sm">
                    {item.label}
                  </div>
                  {item.details && (
                    <div className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                      {item.details}
                    </div>
                  )}
                </div>
              </div>

              <div className="text-right shrink-0">
                <div className="font-bold tabular-nums text-[var(--text-primary)]">
                  {item.current}
                </div>
                <div className="text-[10px] text-[var(--text-tertiary)]">
                  Min: {item.required}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/* ========================================================================= */
/* MODAL: Subject Form (Add / Edit)                                          */
/* ========================================================================= */
const SubjectFormModal: React.FC<{
  isOpen: boolean;
  initialData: CreditSubjectItem | null;
  categories: CreditCategoryConfig[];
  onClose: () => void;
  onSave: (data: Partial<CreditSubjectItem>) => void;
}> = ({ isOpen, initialData, categories, onClose, onSave }) => {
  const [formData, setFormData] = useState<Partial<CreditSubjectItem>>(() => {
    return (
      initialData || {
        name: '',
        code: '',
        category: categories[0]?.id || 'foundation',
        semester: 1,
        credits: 3,
        grade: 'A',
        status: 'Passed',
        isVerified: true,
        notes: '',
      }
    );
  });

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 dark:bg-black/60 backdrop-blur-sm animate-appleFadeIn"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-[var(--surface)] border border-[var(--border-primary)] shadow-2xl p-6 flex flex-col gap-4 text-[var(--text-primary)] text-xs"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--border-secondary)] pb-3">
          <h3 className="text-base font-bold text-[var(--text-primary)]">
            {initialData ? 'Edit Course Record' : 'Add New Course'}
          </h3>
          <button type="button" onClick={onClose} className="p-1 rounded-lg text-[var(--text-secondary)]">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSave(formData);
          }}
          className="flex flex-col gap-3.5"
        >
          <div className="flex flex-col gap-1">
            <label className="font-semibold text-[var(--text-primary)]">
              Course Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Data Structures and Algorithms"
              value={formData.name || ''}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="apple-input h-10 text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="font-semibold text-[var(--text-primary)]">Course Code</label>
              <input
                type="text"
                placeholder="e.g. 21CS201"
                value={formData.code || ''}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                className="apple-input h-10 text-xs font-mono uppercase"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-semibold text-[var(--text-primary)]">Course Category</label>
              <select
                value={formData.category || 'foundation'}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="apple-input h-10 text-xs cursor-pointer"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1">
              <label className="font-semibold text-[var(--text-primary)]">Credits</label>
              <input
                type="number"
                min={0}
                max={20}
                step={0.5}
                required
                value={formData.credits !== undefined ? formData.credits : 3}
                onChange={(e) => setFormData({ ...formData, credits: parseFloat(e.target.value) || 0 })}
                className="apple-input h-10 text-xs text-center font-bold"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-semibold text-[var(--text-primary)]">Semester</label>
              <select
                value={formData.semester || 1}
                onChange={(e) => setFormData({ ...formData, semester: parseInt(e.target.value) || 1 })}
                className="apple-input h-10 text-xs cursor-pointer"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                  <option key={s} value={s}>
                    Semester {s}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-semibold text-[var(--text-primary)]">Grade</label>
              <select
                value={formData.grade || 'A'}
                onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                className="apple-input h-10 text-xs cursor-pointer font-bold"
              >
                {['O', 'A+', 'A', 'B+', 'B', 'C', 'D', 'RA', 'P', 'F', 'W'].map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="font-semibold text-[var(--text-primary)]">Result Status</label>
              <select
                value={formData.status || 'Passed'}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as ResultStatus })}
                className="apple-input h-10 text-xs cursor-pointer font-semibold"
              >
                <option value="Passed">Passed</option>
                <option value="Failed">Failed</option>
                <option value="Pending">Pending</option>
                <option value="Withdrawn">Withdrawn</option>
                <option value="Incomplete">Incomplete</option>
              </select>
            </div>

            <div className="flex items-center gap-2 pt-5">
              <input
                id="is-verified-chk"
                type="checkbox"
                checked={formData.isVerified ?? true}
                onChange={(e) => setFormData({ ...formData, isVerified: e.target.checked })}
                className="rounded border-[var(--border-primary)]"
              />
              <label htmlFor="is-verified-chk" className="font-medium cursor-pointer">
                Verified official record
              </label>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border-secondary)]">
            <button type="button" onClick={onClose} className="apple-btn-secondary text-xs h-9 px-4">
              Cancel
            </button>
            <button type="submit" className="apple-btn-primary text-xs h-9 px-5 font-semibold">
              Save Course Record
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ========================================================================= */
/* MODAL: Bulk Subject Entry                                                 */
/* ========================================================================= */
const BulkEntryModal: React.FC<{
  isOpen: boolean;
  categories: CreditCategoryConfig[];
  onClose: () => void;
  onSaveBulk: (courses: CreditSubjectItem[]) => void;
}> = ({ isOpen, categories, onClose, onSaveBulk }) => {
  const [bulkText, setBulkText] = useState('');

  if (!isOpen) return null;

  const handleParseAndAdd = () => {
    const lines = bulkText.trim().split(/\r?\n/);
    const result: CreditSubjectItem[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      // Format: Code, Name, Credits, Semester, Grade, Status
      const parts = line.split(',').map((p) => p.trim());
      if (parts.length >= 2) {
        result.push({
          id: `bulk-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 5)}`,
          code: parts[0].toUpperCase(),
          name: parts[1],
          credits: Math.max(0, parseFloat(parts[2]) || 3),
          semester: parseInt(parts[3]) || 1,
          grade: parts[4] || 'A',
          status: (['Passed', 'Failed', 'Pending'].includes(parts[5]) ? parts[5] : 'Passed') as any,
          category: categories[0]?.id || 'foundation',
          isVerified: true,
          source: 'Manual',
        });
      }
    }

    if (result.length > 0) {
      onSaveBulk(result);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 dark:bg-black/60 backdrop-blur-sm animate-appleFadeIn"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-[var(--surface)] border border-[var(--border-primary)] shadow-2xl p-6 flex flex-col gap-4 text-[var(--text-primary)] text-xs"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--border-secondary)] pb-3">
          <h3 className="text-base font-bold">Bulk Add Courses</h3>
          <button type="button" onClick={onClose} className="p-1 rounded-lg text-[var(--text-secondary)]">
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-[var(--text-secondary)] leading-relaxed">
          Paste multiple courses as comma-separated lines. Format per line:
          <br />
          <code className="font-mono bg-[var(--bg-tertiary)] px-1.5 py-0.5 rounded mt-1 block">
            CODE, Course Name, Credits, Semester, Grade, Status
          </code>
        </p>

        <textarea
          rows={8}
          placeholder={`CS201, Data Structures, 4, 3, A, Passed\nCS202, Operating Systems, 4, 4, O, Passed\nCS203, Database Systems, 4, 4, B+, Passed`}
          value={bulkText}
          onChange={(e) => setBulkText(e.target.value)}
          className="apple-input p-3 font-mono text-xs w-full resize-none"
        />

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border-secondary)]">
          <button type="button" onClick={onClose} className="apple-btn-secondary text-xs h-9 px-4">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleParseAndAdd}
            className="apple-btn-primary text-xs h-9 px-5 font-semibold"
          >
            Add All Courses
          </button>
        </div>
      </div>
    </div>
  );
};

/* ========================================================================= */
/* MODAL: Import Review Screen                                               */
/* ========================================================================= */
const ImportReviewModal: React.FC<{
  isOpen: boolean;
  importedSubjects: CreditSubjectItem[];
  categories: CreditCategoryConfig[];
  onClose: () => void;
  onConfirm: (confirmed: CreditSubjectItem[]) => void;
}> = ({ isOpen, importedSubjects, categories, onClose, onConfirm }) => {
  const [reviewList, setReviewList] = useState<CreditSubjectItem[]>(importedSubjects);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 dark:bg-black/60 backdrop-blur-sm animate-appleFadeIn"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl rounded-2xl bg-[var(--surface)] border border-[var(--border-primary)] shadow-2xl p-6 flex flex-col gap-4 text-[var(--text-primary)] text-xs max-h-[85vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--border-secondary)] pb-3">
          <div>
            <h3 className="text-base font-bold">Review Imported Courses</h3>
            <p className="text-[var(--text-secondary)] text-[11px] mt-0.5">
              Confirm or edit detected subjects, categories, and credits before saving.
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded-lg text-[var(--text-secondary)]">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Table */}
        <div className="overflow-y-auto flex-1 rounded-xl border border-[var(--border-secondary)]">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[var(--bg-tertiary)] border-b border-[var(--border-secondary)] text-[var(--text-secondary)] font-bold">
                <th className="p-2.5">Code</th>
                <th className="p-2.5">Course Name</th>
                <th className="p-2.5">Category</th>
                <th className="p-2.5 text-center">Sem</th>
                <th className="p-2.5 text-center">Credits</th>
                <th className="p-2.5 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-secondary)]">
              {reviewList.map((item, idx) => (
                <tr key={idx}>
                  <td className="p-2.5 font-mono font-bold">{item.code || '—'}</td>
                  <td className="p-2.5 font-medium">{item.name}</td>
                  <td className="p-2.5">
                    <select
                      value={item.category}
                      onChange={(e) => {
                        const val = e.target.value;
                        setReviewList((prev) =>
                          prev.map((c, i) => (i === idx ? { ...c, category: val } : c))
                        );
                      }}
                      className="apple-input h-7 text-[11px]"
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.code}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="p-2.5 text-center">S{item.semester}</td>
                  <td className="p-2.5 text-center font-bold">{item.credits}</td>
                  <td className="p-2.5 text-center font-semibold">{item.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-[var(--border-secondary)]">
          <span className="text-[var(--text-secondary)] font-medium">
            {reviewList.length} courses ready to import
          </span>
          <div className="flex items-center gap-2">
            <button type="button" onClick={onClose} className="apple-btn-secondary text-xs h-9 px-4">
              Cancel
            </button>
            <button
              type="button"
              onClick={() => onConfirm(reviewList)}
              className="apple-btn-primary text-xs h-9 px-5 font-semibold"
            >
              Confirm and Save Records
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
