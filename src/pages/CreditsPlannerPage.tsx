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
  BookOpen,
  ExternalLink,
  Settings,
} from 'lucide-react';
import { useProfile } from '../context/ProfileContext';
import { useAppToast } from '../components/layout/AppShell';
import { SaveCalculationButton } from '../components/common/SaveCalculationModal';
import { ResetConfirmModal } from '../components/common/ResetConfirmModal';
import type {
  CreditSubjectItem,
  CreditCategoryConfig,
  ResultStatus,
  CourseType,
  NptelDetails,
  NptelCertificateStatus,
  NptelApprovalStatus,
  NptelCollegeRulesConfig,
  NptelDashboardStats,
  CategoryProgressItem,
} from '../types/credits';
import {
  COLLEGE_CHART_TEMPLATE,
  DEFAULT_PATHWAY_TARGETS,
  DEFAULT_NPTEL_RULES,
  calculateCreditSummary,
  calculateCategoryProgress,
  calculateSemesterProgress,
  calculateCreditsRequired,
  simulateScenarios,
  checkGraduationEligibility,
  exportCreditsToCSV,
  parseCreditsFromCSV,
  detectDuplicatesAndRetakes,
  calculateNptelDashboardStats,
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

  // NPTEL Institutional Rules state per profile
  const [nptelRules, setNptelRules] = useState<NptelCollegeRulesConfig>(() => {
    try {
      const saved = localStorage.getItem(`academic_credits_nptel_rules_${activeProfile.id}`);
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_NPTEL_RULES;
  });

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSemester, setFilterSemester] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCourseType, setFilterCourseType] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'credits' | 'semester' | 'status'>('semester');

  // NPTEL Hub Filters & Settings state
  const [nptelSearchQuery, setNptelSearchQuery] = useState('');
  const [nptelFilterCategory, setNptelFilterCategory] = useState<string>('all');
  const [nptelFilterSemester, setNptelFilterSemester] = useState<string>('all');
  const [nptelFilterCert, setNptelFilterCert] = useState<string>('all');
  const [nptelFilterApproval, setNptelFilterApproval] = useState<string>('all');
  const [nptelRulesExpanded, setNptelRulesExpanded] = useState(false);

  // Active Tab / View
  const [activeSection, setActiveSection] = useState<
    | 'dashboard'
    | 'subjects'
    | 'nptel'
    | 'categories'
    | 'semesters'
    | 'calculator'
    | 'pathways'
    | 'eligibility'
  >('dashboard');

  // Modals state
  const [subjectModalOpen, setSubjectModalOpen] = useState(false);
  const [subjectModalInitialCourseType, setSubjectModalInitialCourseType] =
    useState<CourseType>('regular');
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

  // Sync NPTEL rules to localStorage per profile
  useEffect(() => {
    try {
      localStorage.setItem(
        `academic_credits_nptel_rules_${activeProfile.id}`,
        JSON.stringify(nptelRules)
      );
    } catch {}
  }, [nptelRules, activeProfile.id]);

  // Profile switch effect: keep records isolated
  useEffect(() => {
    try {
      const savedSub = localStorage.getItem(`academic_credits_subjects_${activeProfile.id}`);
      setSubjects(savedSub ? JSON.parse(savedSub) : INITIAL_SUBJECTS_TEMPLATE);
      const savedRules = localStorage.getItem(
        `academic_credits_nptel_rules_${activeProfile.id}`
      );
      setNptelRules(savedRules ? JSON.parse(savedRules) : DEFAULT_NPTEL_RULES);
    } catch {}
  }, [activeProfile.id]);

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
        if (saved.inputs.nptelRules) setNptelRules(saved.inputs.nptelRules);
        setLoadedCalcTitle(saved.title);
        showToast(`Loaded saved credit records: "${saved.title}"`, 'success');
      }
    })();
  }, [calcIdParam, getCalculation, showToast]);

  // Calculations
  const annotatedSubjects = useMemo(() => detectDuplicatesAndRetakes(subjects), [subjects]);

  const summary = useMemo(
    () => calculateCreditSummary(annotatedSubjects, targetCredits, categories, nptelRules),
    [annotatedSubjects, targetCredits, categories, nptelRules]
  );

  const categoryStats = useMemo(
    () => calculateCategoryProgress(categories, annotatedSubjects, nptelRules),
    [categories, annotatedSubjects, nptelRules]
  );

  const semesterStats = useMemo(
    () => calculateSemesterProgress(annotatedSubjects, plannedTargets, nptelRules),
    [annotatedSubjects, plannedTargets, nptelRules]
  );

  const nptelStats = useMemo(
    () => calculateNptelDashboardStats(annotatedSubjects, nptelRules),
    [annotatedSubjects, nptelRules]
  );

  const nptelCount = useMemo(
    () => subjects.filter((s) => s.courseType === 'nptel').length,
    [subjects]
  );

  const eligibility = useMemo(
    () => checkGraduationEligibility(summary, categoryStats, annotatedSubjects, pathway),
    [summary, categoryStats, annotatedSubjects, pathway]
  );

  // Filtered and Sorted Subjects
  const filteredSubjects = useMemo(() => {
    return annotatedSubjects
      .filter((s) => {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          s.name.toLowerCase().includes(query) ||
          (s.code || '').toLowerCase().includes(query) ||
          (s.nptelDetails?.courseIdOrUrl &&
            s.nptelDetails.courseIdOrUrl.toLowerCase().includes(query));

        const matchesSem =
          filterSemester === 'all' || s.semester === Number(filterSemester);
        const effectiveCat =
          s.courseType === 'nptel' ? s.nptelDetails?.categoryTarget || s.category : s.category;
        const matchesCat = filterCategory === 'all' || effectiveCat === filterCategory;
        const matchesStatus = filterStatus === 'all' || s.status === filterStatus;
        const matchesCourseType =
          filterCourseType === 'all' ||
          (filterCourseType === 'regular' && (!s.courseType || s.courseType === 'regular')) ||
          s.courseType === filterCourseType;

        return matchesSearch && matchesSem && matchesCat && matchesStatus && matchesCourseType;
      })
      .sort((a, b) => {
        if (sortBy === 'name') return a.name.localeCompare(b.name);
        if (sortBy === 'credits') return b.credits - a.credits;
        if (sortBy === 'status') return a.status.localeCompare(b.status);
        return a.semester - b.semester;
      });
  }, [
    annotatedSubjects,
    searchQuery,
    filterSemester,
    filterCategory,
    filterStatus,
    filterCourseType,
    sortBy,
  ]);

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
    const isNptel = data.courseType === 'nptel';
    const courseTitle = isNptel
      ? (data.nptelDetails?.courseName || data.name || '').trim()
      : (data.name || '').trim();

    if (!courseTitle) {
      showToast('Course name is required', 'error');
      return;
    }

    const cr = isNptel
      ? Math.max(0, Number(data.nptelDetails?.acceptedCredits ?? data.credits) || 0)
      : Math.max(0, Number(data.credits) || 0);

    const sem = isNptel
      ? Number(data.nptelDetails?.semesterCounted ?? data.semester) || 1
      : Number(data.semester) || 1;

    const cat = isNptel
      ? data.nptelDetails?.categoryTarget || data.category || 'programme_elective'
      : data.category || 'programme_core';

    let status = data.status || 'Passed';
    let isVerified = data.isVerified !== undefined ? data.isVerified : true;

    if (isNptel && data.nptelDetails) {
      if (data.nptelDetails.approvalStatus === 'approved') {
        const certValid =
          data.nptelDetails.certificateStatus === 'completed' ||
          data.nptelDetails.certificateStatus === 'certificate_received';
        status = certValid ? 'Passed' : 'Pending';
        isVerified = certValid;
      } else if (data.nptelDetails.approvalStatus === 'rejected') {
        status = 'Failed';
        isVerified = false;
      } else {
        status = 'Pending';
        isVerified = false;
      }
    }

    if (editingSubject) {
      setSubjects((prev) =>
        prev.map((s) =>
          s.id === editingSubject.id
            ? {
                ...s,
                ...data,
                name: courseTitle,
                category: cat,
                credits: cr,
                semester: sem,
                status,
                isVerified,
                courseType: data.courseType || 'regular',
                nptelDetails: data.nptelDetails,
              }
            : s
        )
      );
      showToast(`Updated course: ${courseTitle}`, 'success');
    } else {
      const newSubject: CreditSubjectItem = {
        id: `sub-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        name: courseTitle,
        code: (data.code || data.nptelDetails?.courseIdOrUrl || '').trim().toUpperCase(),
        category: cat,
        semester: sem,
        credits: cr,
        grade: data.grade || (isNptel ? 'Elite' : 'A'),
        status,
        isVerified,
        source: 'Manual',
        notes: data.notes?.trim() || data.nptelDetails?.notes?.trim(),
        courseType: data.courseType || 'regular',
        nptelDetails: data.nptelDetails,
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

  // Switch NPTEL category between PE and OE
  const handleSwitchNptelCategory = (
    course: CreditSubjectItem,
    newCat: 'programme_elective' | 'open_elective'
  ) => {
    setSubjects((prev) =>
      prev.map((s) => {
        if (s.id !== course.id) return s;
        return {
          ...s,
          category: newCat,
          nptelDetails: s.nptelDetails
            ? { ...s.nptelDetails, categoryTarget: newCat }
            : undefined,
        };
      })
    );
    showToast(
      `Moved course to ${
        newCat === 'programme_elective' ? 'Programme Elective (PE)' : 'Open Elective (OE)'
      }`,
      'success'
    );
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
              nptelRules,
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
            { id: 'nptel', label: `3. NPTEL Courses (${nptelCount})` },
            { id: 'categories', label: '4. Category Progress' },
            { id: 'semesters', label: '5. Semester Planner' },
            { id: 'calculator', label: '6. Credits Required Calculator' },
            { id: 'pathways', label: '7. Honours & Minor' },
            { id: 'eligibility', label: '8. Graduation Eligibility' },
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
                  <strong>Duplicate Course Warning:</strong> {duplicateCount} records share identical course codes or NPTEL IDs. Repeated passed courses are counted only once to avoid double-counting.
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

          {/* NPTEL Electives Transfer Summary Card */}
          <div className="p-5 rounded-2xl bg-[var(--surface)] border border-[var(--border-primary)] shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-5">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <BookOpen className="w-5 h-5" />
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-[var(--text-primary)]">
                    NPTEL & External Elective Credits
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
                    {nptelStats.totalCourses} recorded
                  </span>
                </div>
                <p className="text-xs text-[var(--text-secondary)]">
                  Approved PE: <strong className="text-[var(--text-primary)]">{nptelStats.approvedPeCredits} Cr</strong> • Approved OE: <strong className="text-[var(--text-primary)]">{nptelStats.approvedOeCredits} Cr</strong> • Awaiting Approval: <strong className="text-amber-600 dark:text-amber-400">{nptelStats.pendingCredits} Cr</strong>
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setEditingSubject(null);
                  setSubjectModalInitialCourseType('nptel');
                  setSubjectModalOpen(true);
                }}
                className="apple-btn-secondary text-xs h-9 px-3.5 gap-1.5 font-semibold text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/20"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add NPTEL Course</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveSection('nptel')}
                className="apple-btn-primary text-xs h-9 px-3.5 gap-1.5 font-semibold"
              >
                <span>Manage NPTEL ({nptelStats.totalCourses})</span>
              </button>
            </div>
          </div>
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
                placeholder="Search by course name, code, or NPTEL ID..."
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
                  setSubjectModalInitialCourseType('regular');
                  setSubjectModalOpen(true);
                }}
                className="apple-btn-primary text-xs h-10 px-3.5 gap-1.5 font-semibold"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Subject</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setEditingSubject(null);
                  setSubjectModalInitialCourseType('nptel');
                  setSubjectModalOpen(true);
                }}
                className="apple-btn-secondary text-xs h-10 px-3.5 gap-1.5 font-semibold text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/20"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add NPTEL Course</span>
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

              {/* Course Type Filter */}
              <select
                value={filterCourseType}
                onChange={(e) => setFilterCourseType(e.target.value)}
                className="apple-input h-8 text-xs font-medium cursor-pointer"
              >
                <option value="all">All Types</option>
                <option value="regular">Regular</option>
                <option value="nptel">NPTEL</option>
                <option value="external">External</option>
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
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span>{sub.name}</span>
                              {sub.courseType === 'nptel' && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
                                  NPTEL ({sub.nptelDetails?.categoryTarget === 'open_elective' ? 'OE' : 'PE'})
                                </span>
                              )}
                              {sub.courseType === 'external' && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300">
                                  External
                                </span>
                              )}
                            </div>
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
                            {sub.courseType === 'nptel' ? (
                              <span
                                className={`text-[11px] font-bold ${
                                  sub.nptelDetails?.approvalStatus === 'approved'
                                    ? 'text-emerald-600 dark:text-emerald-400'
                                    : sub.nptelDetails?.approvalStatus === 'submitted'
                                    ? 'text-amber-600 dark:text-amber-400'
                                    : sub.nptelDetails?.approvalStatus === 'rejected'
                                    ? 'text-rose-600 dark:text-rose-400'
                                    : 'text-[var(--text-tertiary)]'
                                }`}
                              >
                                {sub.nptelDetails?.approvalStatus === 'approved'
                                  ? '✓ Approved'
                                  : sub.nptelDetails?.approvalStatus === 'submitted'
                                  ? '⏳ Submitted'
                                  : sub.nptelDetails?.approvalStatus === 'rejected'
                                  ? '✕ Rejected'
                                  : 'Unverified'}
                              </span>
                            ) : (
                              <span
                                className={`text-[11px] font-medium ${
                                  sub.isVerified
                                    ? 'text-emerald-600 dark:text-emerald-400'
                                    : 'text-[var(--text-tertiary)]'
                                }`}
                              >
                                {sub.isVerified ? '✓ Verified' : 'Unverified'}
                              </span>
                            )}
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
      {/* 3. NPTEL COURSES & CREDIT TRANSFER                       */}
      {/* ======================================================== */}
      {activeSection === 'nptel' && (
        <NptelDashboardSection
          nptelStats={nptelStats}
          subjects={annotatedSubjects}
          categoryStats={categoryStats}
          nptelRules={nptelRules}
          onUpdateRules={(updated) => {
            setNptelRules(updated);
            showToast('Updated institutional NPTEL rules', 'info');
          }}
          onAddCourse={() => {
            setEditingSubject(null);
            setSubjectModalInitialCourseType('nptel');
            setSubjectModalOpen(true);
          }}
          onEditCourse={(course) => {
            setEditingSubject(course);
            setSubjectModalInitialCourseType(course.courseType || 'nptel');
            setSubjectModalOpen(true);
          }}
          onDeleteCourse={(id) => {
            setDeleteSubjectId(id);
          }}
          onSwitchCategory={handleSwitchNptelCategory}
          searchQuery={nptelSearchQuery}
          setSearchQuery={setNptelSearchQuery}
          filterCategory={nptelFilterCategory}
          setFilterCategory={setNptelFilterCategory}
          filterSemester={nptelFilterSemester}
          setFilterSemester={setNptelFilterSemester}
          filterCert={nptelFilterCert}
          setFilterCert={setNptelFilterCert}
          filterApproval={nptelFilterApproval}
          setFilterApproval={setNptelFilterApproval}
          rulesExpanded={nptelRulesExpanded}
          setRulesExpanded={setNptelRulesExpanded}
        />
      )}

      {/* ======================================================== */}
      {/* 4. CATEGORY-WISE PROGRESS                                */}
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
          initialCourseType={subjectModalInitialCourseType}
          categories={categories}
          nptelRules={nptelRules}
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
/* SUB-COMPONENT: NPTEL Dashboard & Management Hub                           */
/* ========================================================================= */
const NptelDashboardSection: React.FC<{
  nptelStats: NptelDashboardStats;
  subjects: CreditSubjectItem[];
  categoryStats: CategoryProgressItem[];
  nptelRules: NptelCollegeRulesConfig;
  onUpdateRules: (rules: NptelCollegeRulesConfig) => void;
  onAddCourse: () => void;
  onEditCourse: (course: CreditSubjectItem) => void;
  onDeleteCourse: (id: string) => void;
  onSwitchCategory: (course: CreditSubjectItem, newCat: 'programme_elective' | 'open_elective') => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  filterCategory: string;
  setFilterCategory: (c: string) => void;
  filterSemester: string;
  setFilterSemester: (s: string) => void;
  filterCert: string;
  setFilterCert: (c: string) => void;
  filterApproval: string;
  setFilterApproval: (a: string) => void;
  rulesExpanded: boolean;
  setRulesExpanded: (e: boolean) => void;
}> = ({
  nptelStats,
  subjects,
  categoryStats,
  nptelRules,
  onUpdateRules,
  onAddCourse,
  onEditCourse,
  onDeleteCourse,
  onSwitchCategory,
  searchQuery,
  setSearchQuery,
  filterCategory,
  setFilterCategory,
  filterSemester,
  setFilterSemester,
  filterCert,
  setFilterCert,
  filterApproval,
  setFilterApproval,
  rulesExpanded,
  setRulesExpanded,
}) => {
  const peStat = categoryStats.find((c) => c.category.id === 'programme_elective');
  const oeStat = categoryStats.find((c) => c.category.id === 'open_elective');

  const peRequired = peStat?.category.requiredCredits || 18;
  const peEarned = peStat?.earnedCredits || 0;
  const peRemaining = Math.max(0, peRequired - peEarned);

  const oeRequired = oeStat?.category.requiredCredits || 12;
  const oeEarned = oeStat?.earnedCredits || 0;
  const oeRemaining = Math.max(0, oeRequired - oeEarned);

  const nptelCourses = subjects.filter((s) => s.courseType === 'nptel');

  const filteredCourses = nptelCourses.filter((s) => {
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      s.name.toLowerCase().includes(q) ||
      (s.code && s.code.toLowerCase().includes(q)) ||
      (s.nptelDetails?.courseName && s.nptelDetails.courseName.toLowerCase().includes(q)) ||
      (s.nptelDetails?.courseIdOrUrl && s.nptelDetails.courseIdOrUrl.toLowerCase().includes(q));

    const cat = s.nptelDetails?.categoryTarget || s.category;
    const matchesCat = filterCategory === 'all' || cat === filterCategory;

    const sem = s.nptelDetails?.semesterCounted || s.semester;
    const matchesSem = filterSemester === 'all' || sem === parseInt(filterSemester);

    const cert = s.nptelDetails?.certificateStatus || 'not_started';
    const matchesCert = filterCert === 'all' || cert === filterCert;

    const approval = s.nptelDetails?.approvalStatus || 'not_verified';
    const matchesApproval = filterApproval === 'all' || approval === filterApproval;

    return matchesSearch && matchesCat && matchesSem && matchesCert && matchesApproval;
  });

  const [localRules, setLocalRules] = useState<NptelCollegeRulesConfig>(nptelRules);
  useEffect(() => {
    setLocalRules(nptelRules);
  }, [nptelRules]);

  return (
    <div className="flex flex-col gap-6 animate-appleFadeIn">
      {/* Top Header Card */}
      <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border-primary)] p-6 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
              NPTEL Transfer Hub
            </span>
            <span className="text-xs text-[var(--text-tertiary)] font-medium">
              SWAYAM / NPTEL MOOCs Integration
            </span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-[var(--text-primary)] mt-1">
            NPTEL Course Integration & Custom Credit Transfer
          </h2>
          <p className="text-xs text-[var(--text-secondary)] mt-1 max-w-2xl leading-relaxed">
            Record NPTEL online courses, verify certifications, and transfer credits toward Programme Electives (PE) or Open Electives (OE) per university guidelines.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setRulesExpanded(!rulesExpanded)}
            className={`apple-btn-secondary text-xs h-10 px-3.5 gap-1.5 font-semibold transition-all ${
              rulesExpanded
                ? 'bg-black text-white dark:bg-white dark:text-black border-transparent shadow-xs'
                : ''
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>{rulesExpanded ? 'Hide College Rules' : 'College Rules Settings'}</span>
          </button>

          <button
            type="button"
            onClick={onAddCourse}
            className="apple-btn-primary text-xs h-10 px-4 gap-1.5 font-semibold"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Add NPTEL Course</span>
          </button>
        </div>
      </div>

      {/* 8-Card NPTEL Summary Dashboard */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border-primary)] shadow-xs flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase">
            Total Recorded
          </span>
          <div className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] tabular-nums mt-1">
            {nptelStats.totalCourses}
          </div>
          <span className="text-[10px] text-[var(--text-tertiary)] mt-0.5">NPTEL courses logged</span>
        </div>

        <div className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border-primary)] shadow-xs flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase">
            In Progress
          </span>
          <div className="text-2xl sm:text-3xl font-bold text-amber-600 dark:text-amber-400 tabular-nums mt-1">
            {nptelStats.inProgressCourses}
          </div>
          <span className="text-[10px] text-[var(--text-tertiary)] mt-0.5">Currently pursuing</span>
        </div>

        <div className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border-primary)] shadow-xs flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase">
            Certificates Received
          </span>
          <div className="text-2xl sm:text-3xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums mt-1">
            {nptelStats.completedCertificates}
          </div>
          <span className="text-[10px] text-[var(--text-tertiary)] mt-0.5">Completed exam passed</span>
        </div>

        <div className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border-primary)] shadow-xs flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase">
            Awaiting Approval
          </span>
          <div className="text-2xl sm:text-3xl font-bold text-indigo-600 dark:text-indigo-400 tabular-nums mt-1">
            {nptelStats.awaitingApprovalCourses}
          </div>
          <span className="text-[10px] text-[var(--text-tertiary)] mt-0.5">Submitted to college</span>
        </div>

        <div className="p-4 rounded-2xl bg-[var(--surface)] border border-emerald-500/20 bg-emerald-50/20 dark:bg-emerald-950/10 shadow-xs flex flex-col justify-between">
          <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 uppercase">
            Approved PE Credits
          </span>
          <div className="text-2xl sm:text-3xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums mt-1">
            {nptelStats.approvedPeCredits} Cr
          </div>
          <span className="text-[10px] text-emerald-700/80 dark:text-emerald-300/80 mt-0.5">
            Target: {peRequired} Cr • Remaining: {peRemaining} Cr
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-[var(--surface)] border border-emerald-500/20 bg-emerald-50/20 dark:bg-emerald-950/10 shadow-xs flex flex-col justify-between">
          <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 uppercase">
            Approved OE Credits
          </span>
          <div className="text-2xl sm:text-3xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums mt-1">
            {nptelStats.approvedOeCredits} Cr
          </div>
          <span className="text-[10px] text-emerald-700/80 dark:text-emerald-300/80 mt-0.5">
            Target: {oeRequired} Cr • Remaining: {oeRemaining} Cr
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border-primary)] shadow-xs flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-300 uppercase">
            Pending Credits
          </span>
          <div className="text-2xl sm:text-3xl font-bold text-amber-600 dark:text-amber-400 tabular-nums mt-1">
            {nptelStats.pendingCredits} Cr
          </div>
          <span className="text-[10px] text-[var(--text-tertiary)] mt-0.5">Awaiting verification</span>
        </div>

        <div className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border-primary)] shadow-xs flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-rose-700 dark:text-rose-300 uppercase">
            Rejected Credits
          </span>
          <div className="text-2xl sm:text-3xl font-bold text-rose-600 dark:text-rose-400 tabular-nums mt-1">
            {nptelStats.rejectedCredits} Cr
          </div>
          <span className="text-[10px] text-[var(--text-tertiary)] mt-0.5">Ineligible / not approved</span>
        </div>
      </div>

      {/* Credit Transfer Formula Calculation Panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-secondary)] flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-xs text-[var(--text-primary)]">
              Programme Elective (PE) Transfer Progress
            </span>
            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
              {peEarned} / {peRequired} Cr
            </span>
          </div>
          <div className="text-[11px] font-mono text-[var(--text-secondary)] bg-[var(--surface)] p-2.5 rounded-lg border border-[var(--border-secondary)]">
            Remaining PE Credits = max(0, {peRequired} Required PE − {peEarned} Verified PE) = <strong>{peRemaining} Cr</strong>
          </div>
          <div className="text-[10px] text-[var(--text-tertiary)]">
            Approved NPTEL PE credits ({nptelStats.approvedPeCredits} Cr) reduce your remaining departmental elective requirement.
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-secondary)] flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-xs text-[var(--text-primary)]">
              Open Elective (OE) Transfer Progress
            </span>
            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
              {oeEarned} / {oeRequired} Cr
            </span>
          </div>
          <div className="text-[11px] font-mono text-[var(--text-secondary)] bg-[var(--surface)] p-2.5 rounded-lg border border-[var(--border-secondary)]">
            Remaining OE Credits = max(0, {oeRequired} Required OE − {oeEarned} Verified OE) = <strong>{oeRemaining} Cr</strong>
          </div>
          <div className="text-[10px] text-[var(--text-tertiary)]">
            Approved NPTEL OE credits ({nptelStats.approvedOeCredits} Cr) reduce your remaining interdisciplinary elective requirement.
          </div>
        </div>
      </div>

      {/* College NPTEL Rules Configuration Card (Expandable) */}
      {rulesExpanded && (
        <div className="p-6 rounded-2xl bg-[var(--surface)] border border-emerald-500/30 shadow-md flex flex-col gap-5 animate-appleFadeIn">
          <div className="flex items-center justify-between border-b border-[var(--border-secondary)] pb-3">
            <div>
              <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                <Settings className="w-4 h-4 text-emerald-600" />
                Institutional NPTEL Credit Transfer Policies
              </h3>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Customize the rules according to your college's specific academic council regulations.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setLocalRules(DEFAULT_NPTEL_RULES);
                onUpdateRules(DEFAULT_NPTEL_RULES);
              }}
              className="apple-btn-secondary text-xs h-8 px-2.5"
            >
              Reset to Defaults
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            <div className="p-3.5 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-secondary)] flex flex-col justify-between gap-3">
              <div>
                <span className="font-bold text-[var(--text-primary)] block">Programme Electives (PE)</span>
                <span className="text-[11px] text-[var(--text-secondary)]">Can NPTEL courses satisfy departmental PE credits?</span>
              </div>
              <label className="flex items-center gap-2 cursor-pointer font-semibold">
                <input
                  type="checkbox"
                  checked={localRules.allowProgrammeElective}
                  onChange={(e) => {
                    const updated = { ...localRules, allowProgrammeElective: e.target.checked };
                    setLocalRules(updated);
                    onUpdateRules(updated);
                  }}
                  className="rounded text-emerald-600"
                />
                <span>Allow PE Mapping</span>
              </label>
            </div>

            <div className="p-3.5 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-secondary)] flex flex-col justify-between gap-3">
              <div>
                <span className="font-bold text-[var(--text-primary)] block">Open Electives (OE)</span>
                <span className="text-[11px] text-[var(--text-secondary)]">Can NPTEL courses satisfy multidisciplinary OE credits?</span>
              </div>
              <label className="flex items-center gap-2 cursor-pointer font-semibold">
                <input
                  type="checkbox"
                  checked={localRules.allowOpenElective}
                  onChange={(e) => {
                    const updated = { ...localRules, allowOpenElective: e.target.checked };
                    setLocalRules(updated);
                    onUpdateRules(updated);
                  }}
                  className="rounded text-emerald-600"
                />
                <span>Allow OE Mapping</span>
              </label>
            </div>

            <div className="p-3.5 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-secondary)] flex flex-col justify-between gap-3">
              <div>
                <span className="font-bold text-[var(--text-primary)] block">Faculty / Dept Approval</span>
                <span className="text-[11px] text-[var(--text-secondary)]">Requires official department signature before counting?</span>
              </div>
              <label className="flex items-center gap-2 cursor-pointer font-semibold">
                <input
                  type="checkbox"
                  checked={localRules.requireApproval}
                  onChange={(e) => {
                    const updated = { ...localRules, requireApproval: e.target.checked };
                    setLocalRules(updated);
                    onUpdateRules(updated);
                  }}
                  className="rounded text-emerald-600"
                />
                <span>Require College Approval</span>
              </label>
            </div>

            <div className="p-3.5 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-secondary)] flex flex-col justify-between gap-3">
              <div>
                <span className="font-bold text-[var(--text-primary)] block">Certificate Requirement</span>
                <span className="text-[11px] text-[var(--text-secondary)]">Exam pass certificate must be earned?</span>
              </div>
              <label className="flex items-center gap-2 cursor-pointer font-semibold">
                <input
                  type="checkbox"
                  checked={localRules.requireCertificate}
                  onChange={(e) => {
                    const updated = { ...localRules, requireCertificate: e.target.checked };
                    setLocalRules(updated);
                    onUpdateRules(updated);
                  }}
                  className="rounded text-emerald-600"
                />
                <span>Require Certificate</span>
              </label>
            </div>

            <div className="p-3.5 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-secondary)] flex flex-col justify-between gap-3">
              <div>
                <span className="font-bold text-[var(--text-primary)] block">Permitted Credit Values</span>
                <span className="text-[11px] text-[var(--text-secondary)]">Allowed values: {localRules.allowedCreditValues.join(', ')} credits</span>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {[1, 2, 3, 4, 6].map((cr) => {
                  const has = localRules.allowedCreditValues.includes(cr);
                  return (
                    <button
                      key={cr}
                      type="button"
                      onClick={() => {
                        const next = has
                          ? localRules.allowedCreditValues.filter((v) => v !== cr)
                          : [...localRules.allowedCreditValues, cr].sort();
                        if (next.length > 0) {
                          const updated = { ...localRules, allowedCreditValues: next };
                          setLocalRules(updated);
                          onUpdateRules(updated);
                        }
                      }}
                      className={`px-2.5 py-1 rounded-md text-xs font-bold border transition-all ${
                        has
                          ? 'bg-black text-white dark:bg-white dark:text-black border-transparent shadow-xs'
                          : 'bg-[var(--surface)] border-[var(--border-primary)] text-[var(--text-secondary)]'
                      }`}
                    >
                      {cr} Cr
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-secondary)] flex flex-col justify-between gap-3">
              <div>
                <span className="font-bold text-[var(--text-primary)] block">Custom Credit Options</span>
                <span className="text-[11px] text-[var(--text-secondary)]">Allow entering arbitrary custom credit values?</span>
              </div>
              <label className="flex items-center gap-2 cursor-pointer font-semibold">
                <input
                  type="checkbox"
                  checked={localRules.allowCustomCredits}
                  onChange={(e) => {
                    const updated = { ...localRules, allowCustomCredits: e.target.checked };
                    setLocalRules(updated);
                    onUpdateRules(updated);
                  }}
                  className="rounded text-emerald-600"
                />
                <span>Allow Custom Values</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Search and Filters Bar */}
      <div className="p-3.5 rounded-xl bg-[var(--surface)] border border-[var(--border-primary)] flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[var(--text-tertiary)]" />
          <input
            type="text"
            placeholder="Search NPTEL course title, ID or URL..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="apple-input h-8 pl-8 text-xs w-full"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Category Filter */}
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="apple-input h-8 text-xs font-medium cursor-pointer"
          >
            <option value="all">All Electives</option>
            <option value="programme_elective">Programme Elective (PE)</option>
            <option value="open_elective">Open Elective (OE)</option>
          </select>

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

          {/* Certificate Filter */}
          <select
            value={filterCert}
            onChange={(e) => setFilterCert(e.target.value)}
            className="apple-input h-8 text-xs font-medium cursor-pointer"
          >
            <option value="all">All Certificate States</option>
            <option value="not_started">Not started</option>
            <option value="in_progress">In progress</option>
            <option value="completed">Completed</option>
            <option value="certificate_received">Certificate received</option>
          </select>

          {/* Approval Filter */}
          <select
            value={filterApproval}
            onChange={(e) => setFilterApproval(e.target.value)}
            className="apple-input h-8 text-xs font-medium cursor-pointer"
          >
            <option value="all">All Approval States</option>
            <option value="not_verified">Not verified</option>
            <option value="submitted">Submitted for approval</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* NPTEL Courses Table */}
      <div className="rounded-2xl border border-[var(--border-primary)] bg-[var(--surface)] overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[var(--bg-tertiary)] border-b border-[var(--border-primary)] text-[var(--text-secondary)] font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-3.5">Course & ID / URL</th>
                <th className="py-3 px-3.5 text-center">Elective Target</th>
                <th className="py-3 px-2 text-center">Duration / Sem</th>
                <th className="py-3 px-3 text-center">Credits (Accepted / NPTEL)</th>
                <th className="py-3 px-3 text-center">Certificate Status</th>
                <th className="py-3 px-3 text-center">College Approval</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-secondary)]">
              {filteredCourses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[var(--text-secondary)]">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <BookOpen className="w-8 h-8 opacity-30" />
                      <p className="font-semibold text-sm">No NPTEL courses found</p>
                      <p className="text-xs text-[var(--text-tertiary)] max-w-sm">
                        Add an NPTEL MOOC course to track certificate progress and transfer credits to PE or OE.
                      </p>
                      <button
                        type="button"
                        onClick={onAddCourse}
                        className="apple-btn-primary text-xs h-9 px-4 mt-2 gap-1.5 font-semibold"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Your First NPTEL Course</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredCourses.map((sub) => {
                  const details = sub.nptelDetails;
                  const targetCat = details?.categoryTarget || sub.category;
                  const isPE = targetCat === 'programme_elective';
                  const isURL = details?.courseIdOrUrl?.startsWith('http');

                  return (
                    <tr
                      key={sub.id}
                      className="hover:bg-[var(--bg-tertiary)] transition-colors group"
                    >
                      <td className="py-3.5 px-3.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[var(--text-primary)] text-sm">
                            {details?.courseName || sub.name}
                          </span>
                          {sub.isDuplicate && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
                              Duplicate ID
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-[var(--text-tertiary)]">
                          {details?.courseIdOrUrl ? (
                            isURL ? (
                              <a
                                href={details.courseIdOrUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 hover:underline"
                              >
                                <span>Course Link</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            ) : (
                              <span className="font-mono">{details.courseIdOrUrl}</span>
                            )
                          ) : (
                            <span>ID: {sub.code || '—'}</span>
                          )}
                          {details?.notes && <span>• {details.notes}</span>}
                        </div>
                      </td>

                      <td className="py-3.5 px-3.5 text-center">
                        <div className="inline-flex items-center gap-1.5">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                              isPE
                                ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300'
                                : 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300'
                            }`}
                          >
                            {isPE ? 'Programme Elective (PE)' : 'Open Elective (OE)'}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              onSwitchCategory(sub, isPE ? 'open_elective' : 'programme_elective')
                            }
                            className="p-1 rounded text-[10px] font-semibold text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--border-secondary)] cursor-pointer"
                            title={`Switch to ${isPE ? 'Open Elective' : 'Programme Elective'}`}
                          >
                            ⇄ Move
                          </button>
                        </div>
                      </td>

                      <td className="py-3.5 px-2 text-center tabular-nums">
                        <div className="font-semibold text-[var(--text-primary)]">
                          Sem {details?.semesterCounted || sub.semester}
                        </div>
                        <div className="text-[10px] text-[var(--text-tertiary)]">
                          {details?.durationWeeks || '8 Weeks'}
                        </div>
                      </td>

                      <td className="py-3.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1 font-bold text-xs">
                          <span
                            className="text-emerald-600 dark:text-emerald-400"
                            title="Accepted Credits officially recognized by college"
                          >
                            {details?.acceptedCredits ?? sub.credits} Accepted
                          </span>
                          <span className="text-[var(--text-tertiary)] font-normal">/</span>
                          <span
                            className="text-[var(--text-secondary)] font-normal text-[11px]"
                            title="Advertised NPTEL course credit value"
                          >
                            {details?.courseCredits ?? sub.credits} NPTEL
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            details?.certificateStatus === 'certificate_received'
                              ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                              : details?.certificateStatus === 'completed'
                              ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300'
                              : details?.certificateStatus === 'in_progress'
                              ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                              : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                          }`}
                        >
                          {details?.certificateStatus === 'certificate_received'
                            ? 'Certificate Received'
                            : details?.certificateStatus === 'completed'
                            ? 'Exam Passed'
                            : details?.certificateStatus === 'in_progress'
                            ? 'In Progress'
                            : 'Not Started'}
                        </span>
                      </td>

                      <td className="py-3.5 px-3 text-center">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            details?.approvalStatus === 'approved'
                              ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                              : details?.approvalStatus === 'submitted'
                              ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                              : details?.approvalStatus === 'rejected'
                              ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300'
                              : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                          }`}
                        >
                          {details?.approvalStatus === 'approved'
                            ? '✓ Approved'
                            : details?.approvalStatus === 'submitted'
                            ? '⏳ Submitted'
                            : details?.approvalStatus === 'rejected'
                            ? '✕ Rejected'
                            : 'Not Verified'}
                        </span>
                      </td>

                      <td className="py-3.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => onEditCourse(sub)}
                            className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--border-secondary)] cursor-pointer"
                            title="Edit course"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteCourse(sub.id)}
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
  );
};

/* ========================================================================= */
/* MODAL: Subject Form (Add / Edit) with NPTEL Integration                   */
/* ========================================================================= */
const SubjectFormModal: React.FC<{
  isOpen: boolean;
  initialData: CreditSubjectItem | null;
  initialCourseType?: CourseType;
  categories: CreditCategoryConfig[];
  nptelRules: NptelCollegeRulesConfig;
  onClose: () => void;
  onSave: (data: Partial<CreditSubjectItem>) => void;
}> = ({
  isOpen,
  initialData,
  initialCourseType = 'regular',
  categories,
  nptelRules,
  onClose,
  onSave,
}) => {
  const [courseType, setCourseType] = useState<CourseType>(
    initialData?.courseType || initialCourseType
  );

  // Regular Course Fields
  const [name, setName] = useState(initialData?.name || '');
  const [code, setCode] = useState(initialData?.code || '');
  const [category, setCategory] = useState(
    initialData?.category || categories[0]?.id || 'foundation'
  );
  const [semester, setSemester] = useState(initialData?.semester || 1);
  const [credits, setCredits] = useState(
    initialData?.credits !== undefined ? initialData.credits : 3
  );
  const [grade, setGrade] = useState(initialData?.grade || 'A');
  const [status, setStatus] = useState<ResultStatus>(initialData?.status || 'Passed');
  const [isVerified, setIsVerified] = useState(initialData?.isVerified ?? true);
  const [notes, setNotes] = useState(initialData?.notes || '');

  // NPTEL Fields
  const [nptelCourseName, setNptelCourseName] = useState(
    initialData?.nptelDetails?.courseName || initialData?.name || ''
  );
  const [nptelCourseIdOrUrl, setNptelCourseIdOrUrl] = useState(
    initialData?.nptelDetails?.courseIdOrUrl || initialData?.code || ''
  );
  const [categoryTarget, setCategoryTarget] = useState<'programme_elective' | 'open_elective'>(
    (initialData?.nptelDetails?.categoryTarget as any) ||
      (initialData?.category === 'open_elective' ? 'open_elective' : 'programme_elective')
  );
  const [durationWeeks, setDurationWeeks] = useState(
    initialData?.nptelDetails?.durationWeeks || '8 Weeks'
  );
  const [courseCredits, setCourseCredits] = useState<number>(
    initialData?.nptelDetails?.courseCredits ?? 3
  );
  const [acceptedCredits, setAcceptedCredits] = useState<number>(
    initialData?.nptelDetails?.acceptedCredits ?? (initialData?.credits ?? 3)
  );
  const [certStatus, setCertStatus] = useState<NptelCertificateStatus>(
    initialData?.nptelDetails?.certificateStatus || 'completed'
  );
  const [approvalStatus, setApprovalStatus] = useState<NptelApprovalStatus>(
    initialData?.nptelDetails?.approvalStatus || 'approved'
  );
  const [nptelSemesterCounted, setNptelSemesterCounted] = useState<number>(
    initialData?.nptelDetails?.semesterCounted ?? (initialData?.semester ?? 5)
  );
  const [nptelNotes, setNptelNotes] = useState(
    initialData?.nptelDetails?.notes || initialData?.notes || ''
  );

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (courseType === 'nptel') {
      const title = nptelCourseName.trim();
      if (!title) return;

      const safeCourseCr = Math.max(0, Number(courseCredits) || 0);
      const safeAcceptedCr = Math.max(0, Number(acceptedCredits) || 0);

      const nptelDetails: NptelDetails = {
        courseName: title,
        courseIdOrUrl: nptelCourseIdOrUrl.trim(),
        categoryTarget,
        durationWeeks,
        certificateStatus: certStatus,
        courseCredits: safeCourseCr,
        acceptedCredits: safeAcceptedCr,
        approvalStatus,
        semesterCounted: nptelSemesterCounted,
        notes: nptelNotes.trim(),
      };

      onSave({
        name: title,
        code: nptelCourseIdOrUrl.trim().toUpperCase() || 'NPTEL',
        category: categoryTarget,
        semester: nptelSemesterCounted,
        credits: safeAcceptedCr,
        courseType: 'nptel',
        nptelDetails,
        grade: 'Elite',
        notes: nptelNotes.trim(),
      });
    } else {
      const title = name.trim();
      if (!title) return;

      onSave({
        name: title,
        code: code.trim().toUpperCase(),
        category,
        semester,
        credits: Math.max(0, Number(credits) || 0),
        grade,
        status,
        isVerified,
        notes: notes.trim(),
        courseType,
      });
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 dark:bg-black/60 backdrop-blur-sm animate-appleFadeIn overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg my-8 rounded-2xl bg-[var(--surface)] border border-[var(--border-primary)] shadow-2xl p-6 flex flex-col gap-4 text-[var(--text-primary)] text-xs"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--border-secondary)] pb-3">
          <h3 className="text-base font-bold text-[var(--text-primary)]">
            {initialData
              ? `Edit ${courseType === 'nptel' ? 'NPTEL' : 'Course'} Record`
              : `Add New ${courseType === 'nptel' ? 'NPTEL' : 'Course'}`}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Course Type Selector */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-secondary)]">
          <button
            type="button"
            onClick={() => setCourseType('regular')}
            className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              courseType === 'regular'
                ? 'bg-[var(--surface)] text-[var(--text-primary)] shadow-xs'
                : 'text-[var(--text-secondary)]'
            }`}
          >
            Regular Course
          </button>
          <button
            type="button"
            onClick={() => setCourseType('nptel')}
            className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              courseType === 'nptel'
                ? 'bg-[var(--surface)] text-emerald-600 dark:text-emerald-400 shadow-xs'
                : 'text-[var(--text-secondary)]'
            }`}
          >
            NPTEL Course
          </button>
          <button
            type="button"
            onClick={() => setCourseType('external')}
            className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              courseType === 'external'
                ? 'bg-[var(--surface)] text-[var(--text-primary)] shadow-xs'
                : 'text-[var(--text-secondary)]'
            }`}
          >
            Other External
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          {courseType === 'nptel' ? (
            /* ================= NPTEL SPECIFIC FORM FIELDS ================= */
            <>
              {/* Elective Category Selector */}
              <div className="flex flex-col gap-1">
                <label className="font-semibold text-[var(--text-primary)] flex items-center justify-between">
                  <span>
                    Elective Category Mapping <span className="text-rose-500">*</span>
                  </span>
                  <span className="text-[10px] text-[var(--text-tertiary)] font-normal">
                    Programme Elective (PE) or Open Elective (OE)
                  </span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={!nptelRules.allowProgrammeElective}
                    onClick={() => setCategoryTarget('programme_elective')}
                    className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1 transition-all ${
                      categoryTarget === 'programme_elective'
                        ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300'
                        : 'border-[var(--border-primary)] bg-[var(--surface)] text-[var(--text-secondary)]'
                    } ${
                      !nptelRules.allowProgrammeElective
                        ? 'opacity-40 cursor-not-allowed'
                        : 'cursor-pointer'
                    }`}
                  >
                    <span>Programme Elective (PE)</span>
                    <span className="text-[10px] opacity-75">Departmental Core Elective</span>
                  </button>
                  <button
                    type="button"
                    disabled={!nptelRules.allowOpenElective}
                    onClick={() => setCategoryTarget('open_elective')}
                    className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1 transition-all ${
                      categoryTarget === 'open_elective'
                        ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300'
                        : 'border-[var(--border-primary)] bg-[var(--surface)] text-[var(--text-secondary)]'
                    } ${
                      !nptelRules.allowOpenElective
                        ? 'opacity-40 cursor-not-allowed'
                        : 'cursor-pointer'
                    }`}
                  >
                    <span>Open Elective (OE)</span>
                    <span className="text-[10px] opacity-75">Interdisciplinary Elective</span>
                  </button>
                </div>
              </div>

              {/* Course Title */}
              <div className="flex flex-col gap-1">
                <label className="font-semibold text-[var(--text-primary)]">
                  NPTEL Course Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Cloud Computing or Introduction to Machine Learning"
                  value={nptelCourseName}
                  onChange={(e) => setNptelCourseName(e.target.value)}
                  className="apple-input h-10 text-xs"
                />
              </div>

              {/* Course ID or URL & Duration */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-[var(--text-primary)]">
                    NPTEL Course ID / URL (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. noc24-cs101 or nptel.ac.in/..."
                    value={nptelCourseIdOrUrl}
                    onChange={(e) => setNptelCourseIdOrUrl(e.target.value)}
                    className="apple-input h-10 text-xs"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-[var(--text-primary)]">
                    Course Duration
                  </label>
                  <select
                    value={durationWeeks}
                    onChange={(e) => setDurationWeeks(e.target.value)}
                    className="apple-input h-10 text-xs cursor-pointer"
                  >
                    <option value="4 Weeks">4 Weeks</option>
                    <option value="8 Weeks">8 Weeks</option>
                    <option value="12 Weeks">12 Weeks</option>
                    <option value="Self-paced">Self-paced</option>
                  </select>
                </div>
              </div>

              {/* Advertised Credits vs Accepted Credits */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-secondary)]">
                <div className="flex flex-col gap-1.5">
                  <label className="font-semibold text-[var(--text-primary)] text-xs">
                    Course Credits (Advertised)
                  </label>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {nptelRules.allowedCreditValues.map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => {
                          setCourseCredits(val);
                          if (acceptedCredits === 0 || acceptedCredits === courseCredits) {
                            setAcceptedCredits(val);
                          }
                        }}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                          courseCredits === val
                            ? 'bg-black text-white dark:bg-white dark:text-black border-transparent shadow-xs'
                            : 'bg-[var(--surface)] border-[var(--border-primary)] text-[var(--text-secondary)]'
                        }`}
                      >
                        {val} Cr
                      </button>
                    ))}
                    {nptelRules.allowCustomCredits && (
                      <input
                        type="number"
                        min={0}
                        max={20}
                        step={0.5}
                        placeholder="Custom"
                        value={courseCredits}
                        onChange={(e) =>
                          setCourseCredits(Math.max(0, parseFloat(e.target.value) || 0))
                        }
                        className="apple-input h-8 text-xs w-16 text-center font-bold"
                      />
                    )}
                  </div>
                  <span className="text-[10px] text-[var(--text-tertiary)]">
                    Portal credit value
                  </span>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-semibold text-[var(--text-primary)] text-xs">
                    Credits Accepted by College <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={20}
                    step={0.5}
                    required
                    value={acceptedCredits}
                    onChange={(e) =>
                      setAcceptedCredits(Math.max(0, parseFloat(e.target.value) || 0))
                    }
                    className="apple-input h-8 text-xs text-center font-bold text-emerald-600 dark:text-emerald-400"
                  />
                  <span className="text-[10px] text-[var(--text-tertiary)]">
                    Officially transferred to degree
                  </span>
                </div>
              </div>

              {/* Certificate Status & Approval Status */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-[var(--text-primary)]">
                    NPTEL Certificate Status
                  </label>
                  <select
                    value={certStatus}
                    onChange={(e) => setCertStatus(e.target.value as NptelCertificateStatus)}
                    className="apple-input h-10 text-xs cursor-pointer font-medium"
                  >
                    <option value="not_started">Not started</option>
                    <option value="in_progress">In progress</option>
                    <option value="completed">Completed (Exam Passed)</option>
                    <option value="certificate_received">Certificate received</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-[var(--text-primary)]">
                    College Verification / Approval
                  </label>
                  <select
                    value={approvalStatus}
                    onChange={(e) => setApprovalStatus(e.target.value as NptelApprovalStatus)}
                    className={`apple-input h-10 text-xs cursor-pointer font-bold ${
                      approvalStatus === 'approved'
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : approvalStatus === 'submitted'
                        ? 'text-amber-600 dark:text-amber-400'
                        : approvalStatus === 'rejected'
                        ? 'text-rose-600 dark:text-rose-400'
                        : ''
                    }`}
                  >
                    <option value="not_verified">Not verified</option>
                    <option value="submitted">Submitted for approval</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
              </div>

              {/* Semester Counted & Notes */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-[var(--text-primary)]">
                    Semester Counted
                  </label>
                  <select
                    value={nptelSemesterCounted}
                    onChange={(e) => setNptelSemesterCounted(parseInt(e.target.value) || 1)}
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
                  <label className="font-semibold text-[var(--text-primary)]">
                    Optional Transfer Notes
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Dean letter or NOC approval"
                    value={nptelNotes}
                    onChange={(e) => setNptelNotes(e.target.value)}
                    className="apple-input h-10 text-xs"
                  />
                </div>
              </div>
            </>
          ) : (
            /* ================= REGULAR / EXTERNAL COURSE FORM FIELDS ================= */
            <>
              <div className="flex flex-col gap-1">
                <label className="font-semibold text-[var(--text-primary)]">
                  Course Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Data Structures and Algorithms"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="apple-input h-10 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-[var(--text-primary)]">Course Code</label>
                  <input
                    type="text"
                    placeholder="e.g. 21CS201"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    className="apple-input h-10 text-xs font-mono uppercase"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-[var(--text-primary)]">Course Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
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
                    value={credits}
                    onChange={(e) => setCredits(parseFloat(e.target.value) || 0)}
                    className="apple-input h-10 text-xs text-center font-bold"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-[var(--text-primary)]">Semester</label>
                  <select
                    value={semester}
                    onChange={(e) => setSemester(parseInt(e.target.value) || 1)}
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
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
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
                    value={status}
                    onChange={(e) => setStatus(e.target.value as ResultStatus)}
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
                    checked={isVerified}
                    onChange={(e) => setIsVerified(e.target.checked)}
                    className="rounded border-[var(--border-primary)]"
                  />
                  <label htmlFor="is-verified-chk" className="font-medium cursor-pointer">
                    Verified official record
                  </label>
                </div>

                <div className="flex flex-col gap-1 col-span-2">
                  <label className="font-semibold text-[var(--text-primary)]">
                    Notes / Remarks (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Audit, lab component, exemption"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="apple-input h-10 text-xs"
                  />
                </div>
              </div>
            </>
          )}

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border-secondary)]">
            <button
              type="button"
              onClick={onClose}
              className="apple-btn-secondary text-xs h-9 px-4 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="apple-btn-primary text-xs h-9 px-5 font-semibold cursor-pointer"
            >
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
