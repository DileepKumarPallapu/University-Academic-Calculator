import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  GraduationCap,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  BookOpen,
  Award,
  Layers,
} from 'lucide-react';
import { useProfile } from '../context/ProfileContext';
import { useAppToast } from '../components/layout/AppShell';
import { SaveCalculationButton } from '../components/common/SaveCalculationModal';
import { ResetConfirmModal } from '../components/common/ResetConfirmModal';
import type { DegreePathway, CreditCategory } from '../types/profile';

const DEFAULT_CATEGORIES: Record<DegreePathway, CreditCategory[]> = {
  standard: [
    {
      id: 'cat-core',
      code: 'PC',
      name: 'Professional Core',
      requiredCredits: 58,
      earnedCredits: 0,
      courses: [
        { id: 'c1', code: 'CS201', name: 'Data Structures & Algorithms', credits: 4, semester: 3, grade: 'A', isPassed: true },
        { id: 'c2', code: 'CS202', name: 'Operating Systems', credits: 4, semester: 4, grade: 'O', isPassed: true },
        { id: 'c3', code: 'CS301', name: 'Database Management Systems', credits: 4, semester: 5, grade: 'A+', isPassed: true },
      ],
    },
    {
      id: 'cat-pe',
      code: 'PE',
      name: 'Professional Electives',
      requiredCredits: 18,
      earnedCredits: 0,
      courses: [
        { id: 'pe1', code: 'CS401', name: 'Cloud Computing Architecture', credits: 3, semester: 6, grade: 'A', isPassed: true },
      ],
    },
    {
      id: 'cat-oe',
      code: 'OE',
      name: 'Open Electives',
      requiredCredits: 12,
      earnedCredits: 0,
      courses: [
        { id: 'oe1', code: 'OE301', name: 'Renewable Energy Systems', credits: 3, semester: 5, grade: 'B+', isPassed: true },
      ],
    },
    {
      id: 'cat-bs-es',
      code: 'BS/ES',
      name: 'Basic Sciences & Engineering',
      requiredCredits: 38,
      earnedCredits: 0,
      courses: [
        { id: 'bs1', code: 'MA101', name: 'Engineering Mathematics I', credits: 4, semester: 1, grade: 'A', isPassed: true },
        { id: 'bs2', code: 'PH101', name: 'Engineering Physics', credits: 4, semester: 1, grade: 'A+', isPassed: true },
      ],
    },
    {
      id: 'cat-hsm',
      code: 'HSMC',
      name: 'Humanities & Social Sciences',
      requiredCredits: 14,
      earnedCredits: 0,
      courses: [
        { id: 'hs1', code: 'HS101', name: 'Technical English Communication', credits: 3, semester: 1, grade: 'O', isPassed: true },
      ],
    },
    {
      id: 'cat-proj',
      code: 'PROJ',
      name: 'Project Work & Internship',
      requiredCredits: 20,
      earnedCredits: 0,
      courses: [
        { id: 'pr1', code: 'PR301', name: 'Mini Project', credits: 2, semester: 6, grade: 'A+', isPassed: true },
      ],
    },
  ],
  honours: [
    {
      id: 'cat-core',
      code: 'PC',
      name: 'Professional Core',
      requiredCredits: 58,
      earnedCredits: 0,
      courses: [
        { id: 'c1', code: 'CS201', name: 'Data Structures & Algorithms', credits: 4, semester: 3, grade: 'A', isPassed: true },
        { id: 'c2', code: 'CS202', name: 'Operating Systems', credits: 4, semester: 4, grade: 'O', isPassed: true },
      ],
    },
    {
      id: 'cat-pe',
      code: 'PE',
      name: 'Professional Electives',
      requiredCredits: 18,
      earnedCredits: 0,
      courses: [],
    },
    {
      id: 'cat-oe',
      code: 'OE',
      name: 'Open Electives',
      requiredCredits: 12,
      earnedCredits: 0,
      courses: [],
    },
    {
      id: 'cat-bs-es',
      code: 'BS/ES',
      name: 'Basic Sciences & Engineering',
      requiredCredits: 38,
      earnedCredits: 0,
      courses: [],
    },
    {
      id: 'cat-hsm',
      code: 'HSMC',
      name: 'Humanities & Social Sciences',
      requiredCredits: 14,
      earnedCredits: 0,
      courses: [],
    },
    {
      id: 'cat-proj',
      code: 'PROJ',
      name: 'Project Work & Internship',
      requiredCredits: 20,
      earnedCredits: 0,
      courses: [],
    },
    {
      id: 'cat-hon',
      code: 'HON',
      name: 'Honours Specialization Courses',
      requiredCredits: 20,
      earnedCredits: 0,
      courses: [
        { id: 'hon1', code: 'CSH01', name: 'Advanced Machine Learning', credits: 4, semester: 5, grade: 'A+', isPassed: true },
        { id: 'hon2', code: 'CSH02', name: 'Deep Neural Networks', credits: 4, semester: 6, grade: 'O', isPassed: true },
      ],
    },
  ],
  minor: [
    {
      id: 'cat-core',
      code: 'PC',
      name: 'Professional Core',
      requiredCredits: 58,
      earnedCredits: 0,
      courses: [],
    },
    {
      id: 'cat-pe',
      code: 'PE',
      name: 'Professional Electives',
      requiredCredits: 18,
      earnedCredits: 0,
      courses: [],
    },
    {
      id: 'cat-oe',
      code: 'OE',
      name: 'Open Electives',
      requiredCredits: 12,
      earnedCredits: 0,
      courses: [],
    },
    {
      id: 'cat-bs-es',
      code: 'BS/ES',
      name: 'Basic Sciences & Engineering',
      requiredCredits: 38,
      earnedCredits: 0,
      courses: [],
    },
    {
      id: 'cat-hsm',
      code: 'HSMC',
      name: 'Humanities & Social Sciences',
      requiredCredits: 14,
      earnedCredits: 0,
      courses: [],
    },
    {
      id: 'cat-proj',
      code: 'PROJ',
      name: 'Project Work & Internship',
      requiredCredits: 20,
      earnedCredits: 0,
      courses: [],
    },
    {
      id: 'cat-min',
      code: 'MIN',
      name: 'Minor Degree Courses',
      requiredCredits: 18,
      earnedCredits: 0,
      courses: [
        { id: 'm1', code: 'EC_MIN1', name: 'Internet of Things Architecture', credits: 3, semester: 5, grade: 'A', isPassed: true },
      ],
    },
  ],
};

const DEFAULT_TARGET_CREDITS: Record<DegreePathway, number> = {
  standard: 160,
  honours: 180,
  minor: 178,
};

export const CreditsPlannerPage: React.FC = () => {
  const { activeProfile, updateProfile, getCalculation } = useProfile();
  const { showToast } = useAppToast();
  const [searchParams] = useSearchParams();
  const calcIdParam = searchParams.get('calcId');

  const [pathway, setPathway] = useState<DegreePathway>(activeProfile.degreePathway || 'standard');
  const [targetCredits, setTargetCredits] = useState<number>(
    activeProfile.customGraduationCredits || DEFAULT_TARGET_CREDITS[activeProfile.degreePathway || 'standard']
  );
  const [categories, setCategories] = useState<CreditCategory[]>(() => {
    return JSON.parse(JSON.stringify(DEFAULT_CATEGORIES[activeProfile.degreePathway || 'standard']));
  });

  const [activeTabCatId, setActiveTabCatId] = useState<string>('cat-core');
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [loadedCalcTitle, setLoadedCalcTitle] = useState<string | null>(null);

  // Sync if profile changes
  useEffect(() => {
    if (!calcIdParam) {
      setPathway(activeProfile.degreePathway || 'standard');
      setTargetCredits(
        activeProfile.customGraduationCredits || DEFAULT_TARGET_CREDITS[activeProfile.degreePathway || 'standard']
      );
    }
  }, [activeProfile.id, activeProfile.degreePathway, activeProfile.customGraduationCredits, calcIdParam]);

  // Load saved calculation if calcId in query params
  useEffect(() => {
    if (!calcIdParam) return;
    (async () => {
      const saved = await getCalculation(calcIdParam);
      if (saved && saved.inputs && saved.type === 'credits') {
        if (saved.inputs.pathway) setPathway(saved.inputs.pathway);
        if (saved.inputs.targetCredits) setTargetCredits(Number(saved.inputs.targetCredits));
        if (Array.isArray(saved.inputs.categories)) setCategories(saved.inputs.categories);
        setLoadedCalcTitle(saved.title);
        showToast(`Loaded saved credit plan: "${saved.title}"`, 'success');
      }
    })();
  }, [calcIdParam, getCalculation, showToast]);

  // Pathway change handler
  const handlePathwayChange = (newPathway: DegreePathway) => {
    setPathway(newPathway);
    const newTarget = DEFAULT_TARGET_CREDITS[newPathway];
    setTargetCredits(newTarget);
    setCategories(JSON.parse(JSON.stringify(DEFAULT_CATEGORIES[newPathway])));
    updateProfile(activeProfile.id, { degreePathway: newPathway, customGraduationCredits: newTarget });
    showToast(`Switched pathway to ${newPathway.toUpperCase()} (${newTarget} credits target)`, 'info');
  };

  // Add course to category
  const handleAddCourse = (catId: string) => {
    setCategories((prev) =>
      prev.map((cat) => {
        if (cat.id !== catId) return cat;
        const newCourse = {
          id: `c-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
          code: '',
          name: `New Course ${cat.courses.length + 1}`,
          credits: 3,
          semester: activeProfile.currentSemester || 5,
          grade: 'A',
          isPassed: true,
        };
        return {
          ...cat,
          courses: [...cat.courses, newCourse],
        };
      })
    );
  };

  // Remove course from category
  const handleRemoveCourse = (catId: string, courseId: string) => {
    setCategories((prev) =>
      prev.map((cat) => {
        if (cat.id !== catId) return cat;
        return {
          ...cat,
          courses: cat.courses.filter((c) => c.id !== courseId),
        };
      })
    );
  };

  // Update course fields
  const handleUpdateCourse = (
    catId: string,
    courseId: string,
    field: 'name' | 'code' | 'credits' | 'semester' | 'grade' | 'isPassed',
    val: any
  ) => {
    setCategories((prev) =>
      prev.map((cat) => {
        if (cat.id !== catId) return cat;
        return {
          ...cat,
          courses: cat.courses.map((c) => {
            if (c.id !== courseId) return c;
            return { ...c, [field]: val };
          }),
        };
      })
    );
  };

  // Category required credits edit
  const handleCategoryRequiredChange = (catId: string, value: number) => {
    setCategories((prev) =>
      prev.map((c) => (c.id === catId ? { ...c, requiredCredits: Math.max(0, value) } : c))
    );
  };

  // Reset to default
  const handleResetToDefault = () => {
    setCategories(JSON.parse(JSON.stringify(DEFAULT_CATEGORIES[pathway])));
    setTargetCredits(DEFAULT_TARGET_CREDITS[pathway]);
    setLoadedCalcTitle(null);
    setShowResetConfirm(false);
    showToast('Credit plan reset to official university defaults.', 'info');
  };

  // Computations
  const categoryStats = useMemo(() => {
    return categories.map((cat) => {
      // Rule: Do not count credits from failed or unverified records as earned
      const earned = cat.courses.reduce((sum, c) => {
        const isPassedGrade = c.grade !== 'RA' && c.grade !== 'F' && c.isPassed !== false;
        return sum + (isPassedGrade ? Number(c.credits) || 0 : 0);
      }, 0);
      const remaining = Math.max(0, cat.requiredCredits - earned);
      const completionPct = cat.requiredCredits > 0 ? Math.min(100, (earned / cat.requiredCredits) * 100) : 100;
      return {
        ...cat,
        earned,
        remaining,
        completionPct,
      };
    });
  }, [categories]);

  const totalEarnedCredits = useMemo(() => {
    return categoryStats.reduce((sum, c) => sum + c.earned, 0);
  }, [categoryStats]);

  const remainingCredits = Math.max(0, targetCredits - totalEarnedCredits);
  const completionPercentage = targetCredits > 0 ? Math.min(100, (totalEarnedCredits / targetCredits) * 100) : 0;

  // Deficits
  const missingRequirements = useMemo(() => {
    return categoryStats.filter((c) => c.remaining > 0);
  }, [categoryStats]);

  const activeCategory = categoryStats.find((c) => c.id === activeTabCatId) || categoryStats[0];

  return (
    <div className="w-full max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-8 animate-appleFadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--border-secondary)] pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-black/5 dark:bg-white/10 text-[var(--text-secondary)]">
              Degree Audit & Pathway System
            </span>
            {loadedCalcTitle && (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
                Loaded: {loadedCalcTitle}
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)]">
            Credit System & Progress Planner
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Track earned degree credits, inspect graduation requirements, and audit category completion.
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => setShowResetConfirm(true)}
            className="apple-btn-secondary text-xs h-10 px-3.5 gap-1.5"
            title="Reset credit planner"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>

          <SaveCalculationButton
            type="credits"
            defaultTitle={`Credit Plan — ${pathway.toUpperCase()} (${totalEarnedCredits}/${targetCredits})`}
            resultValue={`${totalEarnedCredits} / ${targetCredits} Credits`}
            resultSummary={`${completionPercentage.toFixed(1)}% completed • ${pathway.toUpperCase()}`}
            inputs={{
              pathway,
              targetCredits,
              categories,
            }}
            existingCalcId={calcIdParam}
            onSaved={() => setLoadedCalcTitle(`Credit Plan — ${pathway.toUpperCase()}`)}
          />
        </div>
      </div>

      {/* Pathway & Target Configuration Banner */}
      <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border-primary)] p-5 sm:p-6 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-6">
        {/* Pathway Selector */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
            Degree Pathway
          </label>
          <div className="flex flex-wrap items-center gap-2">
            {(
              [
                { id: 'standard', label: 'Standard Degree (160 Cr)', icon: GraduationCap },
                { id: 'honours', label: 'B.Tech Honours (180 Cr)', icon: Award },
                { id: 'minor', label: 'Additional Minor (178 Cr)', icon: Layers },
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
            <label htmlFor="target-credits-input" className="text-xs font-semibold text-[var(--text-secondary)] block">
              Graduation Target
            </label>
            <div className="flex items-center gap-2 mt-1">
              <input
                id="target-credits-input"
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

          <div className="text-xs text-[var(--text-secondary)] max-w-[200px] leading-relaxed">
            Configure custom targets if your university uses non-standard credit regulations.
          </div>
        </div>
      </div>

      {/* Progress Metrics Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-[var(--surface)] border border-[var(--border-primary)] flex flex-col justify-between shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
            Total Credits Earned
          </span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--text-primary)] tabular-nums">
              {totalEarnedCredits}
            </span>
            <span className="text-sm font-semibold text-[var(--text-secondary)]">
              / {targetCredits}
            </span>
          </div>
          <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-1">
            Verified passed credits
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-[var(--surface)] border border-[var(--border-primary)] flex flex-col justify-between shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
            Remaining Credits
          </span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--text-primary)] tabular-nums">
              {remainingCredits}
            </span>
            <span className="text-sm font-semibold text-[var(--text-secondary)]">
              needed
            </span>
          </div>
          <span className="text-xs text-[var(--text-secondary)] font-medium mt-1">
            {remainingCredits === 0 ? 'Degree requirements met!' : 'Across upcoming semesters'}
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-[var(--surface)] border border-[var(--border-primary)] flex flex-col justify-between shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
            Completion Status
          </span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--text-primary)] tabular-nums">
              {completionPercentage.toFixed(1)}%
            </span>
          </div>
          <div className="w-full bg-[var(--bg-tertiary)] rounded-full h-2 mt-2 overflow-hidden border border-[var(--border-secondary)]">
            <div
              className="bg-black dark:bg-white h-full rounded-full transition-all duration-500"
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[var(--surface)] border border-[var(--border-primary)] flex flex-col justify-between shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
            Requirements Status
          </span>
          <div className="flex items-center gap-2 mt-2">
            {missingRequirements.length === 0 ? (
              <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold text-lg">
                <CheckCircle2 className="w-5 h-5" />
                <span>All Met</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-bold text-lg">
                <AlertTriangle className="w-5 h-5" />
                <span>{missingRequirements.length} Categories Deficit</span>
              </div>
            )}
          </div>
          <span className="text-xs text-[var(--text-secondary)] mt-1">
            {categories.length} total categories tracked
          </span>
        </div>
      </div>

      {/* Deficits Warning Box if any */}
      {missingRequirements.length > 0 && (
        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 text-xs text-amber-900 dark:text-amber-300 flex flex-col gap-2">
          <div className="flex items-center gap-2 font-bold text-sm">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Graduation Requirements Deficit Alert</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 mt-1">
            {missingRequirements.map((m) => (
              <div key={m.id} className="p-2.5 rounded-lg bg-white/60 dark:bg-black/30 border border-amber-200/60 flex justify-between items-center">
                <span className="font-semibold">{m.name}:</span>
                <span className="font-bold tabular-nums">
                  Needs {m.remaining} more Cr
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Categories & Courses Detailed Planner */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Category Selection Tabs (4 Cols) */}
        <div className="lg:col-span-4 flex flex-col gap-2.5">
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] px-1">
            Credit Categories
          </span>
          <div className="flex flex-col gap-2">
            {categoryStats.map((cat) => {
              const isSelected = cat.id === activeCategory.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveTabCatId(cat.id)}
                  className={`p-4 rounded-xl text-left border transition-all cursor-pointer flex flex-col gap-2 ${
                    isSelected
                      ? 'bg-[var(--surface)] border-[var(--text-primary)] shadow-sm'
                      : 'bg-[var(--surface)] border-[var(--border-primary)] hover:border-[var(--border-secondary)]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                      {cat.code}
                    </span>
                    <span
                      className={`text-xs font-bold tabular-nums px-2 py-0.5 rounded-full ${
                        cat.remaining === 0
                          ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                          : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]'
                      }`}
                    >
                      {cat.earned} / {cat.requiredCredits} Cr
                    </span>
                  </div>

                  <div className="text-sm font-bold text-[var(--text-primary)]">
                    {cat.name}
                  </div>

                  {/* Micro Progress Bar */}
                  <div className="w-full bg-[var(--bg-tertiary)] rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        cat.remaining === 0 ? 'bg-emerald-500' : 'bg-black dark:bg-white'
                      }`}
                      style={{ width: `${cat.completionPct}%` }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Active Category Courses Detail (8 Cols) */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border-primary)] p-5 sm:p-6 shadow-sm flex flex-col gap-5">
            {/* Active Category Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border-secondary)] pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[var(--bg-tertiary)] text-[var(--text-secondary)]">
                    {activeCategory.code}
                  </span>
                  <h2 className="text-lg font-bold text-[var(--text-primary)]">
                    {activeCategory.name}
                  </h2>
                </div>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  Earned {activeCategory.earned} credits out of {activeCategory.requiredCredits} required.
                </p>
              </div>

              {/* Requirement config */}
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-[var(--text-secondary)] whitespace-nowrap">
                  Required:
                </label>
                <input
                  type="number"
                  min={0}
                  max={120}
                  value={activeCategory.requiredCredits}
                  onChange={(e) =>
                    handleCategoryRequiredChange(activeCategory.id, parseInt(e.target.value) || 0)
                  }
                  className="apple-input w-20 h-9 text-center font-bold text-xs"
                />
                <span className="text-xs text-[var(--text-secondary)] font-medium">Credits</span>
              </div>
            </div>

            {/* Courses Table / List */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                  Completed / Planned Courses ({activeCategory.courses.length})
                </span>
                <button
                  type="button"
                  onClick={() => handleAddCourse(activeCategory.id)}
                  className="apple-btn-secondary text-xs h-8 px-3 gap-1 font-semibold"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Course</span>
                </button>
              </div>

              {activeCategory.courses.length === 0 ? (
                <div className="py-10 text-center rounded-xl border border-dashed border-[var(--border-primary)] bg-[var(--bg-tertiary)] flex flex-col items-center gap-2">
                  <BookOpen className="w-8 h-8 text-[var(--text-tertiary)]" />
                  <span className="text-xs font-semibold text-[var(--text-secondary)]">
                    No courses recorded in {activeCategory.name}.
                  </span>
                  <button
                    type="button"
                    onClick={() => handleAddCourse(activeCategory.id)}
                    className="apple-btn-primary text-xs h-8 px-3.5 mt-1 font-semibold"
                  >
                    Add First Course
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {activeCategory.courses.map((course) => (
                    <div
                      key={course.id}
                      className="p-3.5 rounded-xl border border-[var(--border-secondary)] bg-[var(--bg-tertiary)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      {/* Code & Name */}
                      <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        <input
                          type="text"
                          placeholder="Code"
                          value={course.code || ''}
                          onChange={(e) =>
                            handleUpdateCourse(activeCategory.id, course.id, 'code', e.target.value)
                          }
                          className="apple-input w-20 h-9 text-center uppercase font-mono font-bold text-xs shrink-0"
                        />
                        <input
                          type="text"
                          placeholder="Course Name"
                          value={course.name}
                          onChange={(e) =>
                            handleUpdateCourse(activeCategory.id, course.id, 'name', e.target.value)
                          }
                          className="apple-input flex-1 h-9 font-medium text-xs min-w-0"
                        />
                      </div>

                      {/* Credits, Semester, Grade, Status */}
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="flex items-center gap-1">
                          <label className="text-[10px] uppercase font-bold text-[var(--text-secondary)]">
                            Cr:
                          </label>
                          <input
                            type="number"
                            min={0}
                            max={20}
                            value={course.credits}
                            onChange={(e) =>
                              handleUpdateCourse(
                                activeCategory.id,
                                course.id,
                                'credits',
                                parseInt(e.target.value) || 0
                              )
                            }
                            className="apple-input w-14 h-9 text-center font-bold text-xs"
                          />
                        </div>

                        <div className="flex items-center gap-1">
                          <label className="text-[10px] uppercase font-bold text-[var(--text-secondary)]">
                            Sem:
                          </label>
                          <select
                            value={course.semester}
                            onChange={(e) =>
                              handleUpdateCourse(
                                activeCategory.id,
                                course.id,
                                'semester',
                                parseInt(e.target.value) || 1
                              )
                            }
                            className="apple-input h-9 px-2 font-medium text-xs cursor-pointer"
                          >
                            {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                              <option key={s} value={s}>
                                S{s}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="flex items-center gap-1">
                          <label className="text-[10px] uppercase font-bold text-[var(--text-secondary)]">
                            Grade:
                          </label>
                          <select
                            value={course.grade || 'A'}
                            onChange={(e) => {
                              const val = e.target.value;
                              handleUpdateCourse(activeCategory.id, course.id, 'grade', val);
                              handleUpdateCourse(activeCategory.id, course.id, 'isPassed', val !== 'RA' && val !== 'F');
                            }}
                            className="apple-input h-9 px-2 font-bold text-xs cursor-pointer"
                          >
                            {['O', 'A+', 'A', 'B+', 'B', 'C', 'D', 'RA'].map((g) => (
                              <option key={g} value={g}>
                                {g}
                              </option>
                            ))}
                          </select>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveCourse(activeCategory.id, course.id)}
                          aria-label={`Remove course ${course.name}`}
                          className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <ResetConfirmModal
        isOpen={showResetConfirm}
        onClose={() => setShowResetConfirm(false)}
        onConfirm={handleResetToDefault}
        title="Reset Credit Plan?"
        description="Are you sure you want to restore the official university category requirements? Custom course entries in this draft will be re-initialized."
      />
    </div>
  );
};
