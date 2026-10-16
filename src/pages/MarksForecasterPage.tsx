import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  Trash2,
  Save,
  RotateCcw,
  Info,
} from 'lucide-react';
import { useProfile } from '../context/ProfileContext';
import { useAppToast } from '../components/layout/AppShell';
import { REGULATIONS, type RegulationId } from '../config/university';
import type {
  ForecastSubjectItem,
  MarksForecastScenario,
} from '../types/academicCompanion';
import {
  getForecastScenariosForProfile,
  saveForecastScenario,
  deleteForecastScenario,
} from '../services/companionStorage';

function calculateGradeForRegulation(
  marks: number,
  regulationId: RegulationId
): { grade: string; points: number } {
  const reg = REGULATIONS[regulationId] || REGULATIONS.VTR21;
  const clamped = Math.max(0, Math.min(100, Math.round(marks)));

  // Iterate over regulation grades (ordered descending by points)
  for (const g of reg.grades) {
    if (g.grade === 'RA' || g.points === 0) continue;
    // Extract lower bound from range, e.g. "90–100%" -> 90, "80–89%" -> 80
    const match = g.range.match(/(\d+)[\–\-]/);
    const minVal = match ? parseInt(match[1], 10) : 50;
    if (clamped >= minVal) {
      return { grade: g.grade, points: g.points };
    }
  }

  return { grade: 'RA', points: 0 };
}

export const MarksForecasterPage: React.FC = () => {
  const { activeProfile } = useProfile();
  const { showToast } = useAppToast();

  const regulation = (activeProfile.regulation as RegulationId) || 'VTR21';
  const semester = activeProfile.currentSemester || 5;

  const [scenarioTitle, setScenarioTitle] = useState('Semester 5 Target Scenario');
  const [subjects, setSubjects] = useState<ForecastSubjectItem[]>([]);

  const [targetSgpa, setTargetSgpa] = useState<number>(8.5);
  const [savedScenarios, setSavedScenarios] = useState<MarksForecastScenario[]>([]);

  // Load saved scenarios on mount / profile change
  useEffect(() => {
    const list = getForecastScenariosForProfile(activeProfile.id);
    setSavedScenarios(list);
  }, [activeProfile.id]);

  // Update subject calculation
  const updateSubjectField = (
    id: string,
    field: keyof ForecastSubjectItem,
    value: any
  ) => {
    setSubjects((prev) =>
      prev.map((sub) => {
        if (sub.id !== id) return sub;

        const updated = { ...sub, [field]: value };

        // Recalculate totals
        const intObt = Number(updated.internalObtained) || 0;
        const intMax = Number(updated.internalMax) || 40;
        const endObt = Number(updated.estimatedEndSemMarks) || 0;
        const endMax = Number(updated.estimatedEndSemMax) || 60;

        // Normalized to 100
        const totalMarks = intMax + endMax > 0
          ? Math.round(((intObt + endObt) / (intMax + endMax)) * 100)
          : 0;

        const { grade, points } = calculateGradeForRegulation(totalMarks, regulation);

        return {
          ...updated,
          projectedTotalMarks: totalMarks,
          projectedGrade: grade,
          projectedGradePoints: points,
        };
      })
    );
  };

  // Add new course row
  const handleAddSubject = () => {
    const newSub: ForecastSubjectItem = {
      id: `sub-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      courseName: `New Course ${subjects.length + 1}`,
      credits: 3,
      internalObtained: 30,
      internalMax: 40,
      estimatedEndSemMarks: 45,
      estimatedEndSemMax: 60,
      projectedTotalMarks: 75,
      projectedGrade: 'B',
      projectedGradePoints: 8,
    };
    const { grade, points } = calculateGradeForRegulation(newSub.projectedTotalMarks, regulation);
    newSub.projectedGrade = grade;
    newSub.projectedGradePoints = points;
    setSubjects([...subjects, newSub]);
  };

  // Remove row
  const handleRemoveSubject = (id: string) => {
    setSubjects((prev) => prev.filter((s) => s.id !== id));
  };

  // Computed Projected SGPA
  const { projectedSgpa, totalCredits } = useMemo(() => {
    let totalCreds = 0;
    let weightedPoints = 0;

    for (const sub of subjects) {
      const cr = Number(sub.credits) || 0;
      totalCreds += cr;
      weightedPoints += cr * (sub.projectedGradePoints || 0);
    }

    const sgpa = totalCreds > 0 ? Math.round((weightedPoints / totalCreds) * 100) / 100 : 0;
    return { projectedSgpa: sgpa, totalCredits: totalCreds };
  }, [subjects]);

  // Save current scenario
  const handleSaveScenario = () => {
    if (!scenarioTitle.trim()) {
      showToast('Please enter a scenario name.', 'error');
      return;
    }

    const saved = saveForecastScenario(activeProfile.id, {
      title: scenarioTitle.trim(),
      regulation,
      semester,
      subjects,
      projectedSgpa,
      totalCredits,
      targetSgpa,
    });

    setSavedScenarios(getForecastScenariosForProfile(activeProfile.id));
    showToast(`Saved simulation scenario "${saved.title}".`, 'success');
  };

  // Load a saved scenario
  const handleLoadScenario = (sc: MarksForecastScenario) => {
    setScenarioTitle(sc.title);
    setSubjects(sc.subjects);
    if (sc.targetSgpa) setTargetSgpa(sc.targetSgpa);
    showToast(`Loaded scenario "${sc.title}".`, 'info');
  };

  // Delete saved scenario
  const handleDeleteScenario = (id: string) => {
    deleteForecastScenario(activeProfile.id, id);
    setSavedScenarios(getForecastScenariosForProfile(activeProfile.id));
    showToast('Simulation scenario removed.', 'info');
  };

  return (
    <div className="apple-page-enter flex flex-col gap-8 w-full">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border-secondary)] pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-black/5 dark:bg-white/10 text-[var(--text-secondary)]">
              {activeProfile.name} • Regulation {regulation}
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
              Simulation Only
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)]">
            Marks Forecaster & What-If Analyzer
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1">
            Simulate internal assessment scores and predict semester-end examination grades to forecast your expected SGPA.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSaveScenario}
          className="apple-btn-primary text-xs h-9 px-4 gap-2 font-medium shrink-0"
        >
          <Save className="w-4 h-4" />
          <span>Save Simulation</span>
        </button>
      </div>

      {/* 2. Official Integrity Guarantee Banner */}
      <div className="rounded-2xl bg-blue-500/10 border border-blue-500/30 p-4 text-xs text-blue-700 dark:text-blue-400 flex items-start gap-3">
        <Info className="w-4 h-4 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <span className="font-bold">Official Records Separation Guarantee:</span> All forecast values, simulated exams, and projected grade points are labeled as estimates. They are stored strictly in your simulation sandbox and will <span className="underline">never</span> overwrite your official AMS results or permanent grade transcripts.
        </div>
      </div>

      {/* 3. Outcome & Target Summary Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Projected SGPA Card */}
        <div className="md:col-span-2 rounded-2xl bg-gradient-to-br from-[var(--surface)] to-[var(--bg-tertiary)] border border-[var(--border-primary)] p-6 shadow-sm flex flex-col justify-between gap-6">
          <div className="flex items-center justify-between border-b border-[var(--border-secondary)] pb-4">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                Projected SGPA Outcome
              </span>
              <h2 className="text-3xl font-bold text-[var(--text-primary)] mt-1 tabular-nums">
                {projectedSgpa.toFixed(2)}{' '}
                <span className="text-sm font-normal text-[var(--text-secondary)]">/ 10.00</span>
              </h2>
            </div>

            <div className="text-right">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                Target SGPA
              </span>
              <div className="text-xl font-bold text-purple-600 dark:text-purple-400 mt-1 tabular-nums">
                {targetSgpa.toFixed(2)}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-3 rounded-xl bg-[var(--surface)] border border-[var(--border-secondary)]">
              <span className="text-[10px] font-bold uppercase text-[var(--text-secondary)]">
                Evaluated Credits
              </span>
              <div className="text-lg font-bold text-[var(--text-primary)] mt-0.5 tabular-nums">
                {totalCredits}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[var(--surface)] border border-[var(--border-secondary)]">
              <span className="text-[10px] font-bold uppercase text-[var(--text-secondary)]">
                Target Status
              </span>
              <div
                className={`text-lg font-bold mt-0.5 ${
                  projectedSgpa >= targetSgpa
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-amber-600 dark:text-amber-400'
                }`}
              >
                {projectedSgpa >= targetSgpa ? 'On Track ✓' : 'Gap Exists'}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[var(--surface)] border border-[var(--border-secondary)]">
              <span className="text-[10px] font-bold uppercase text-[var(--text-secondary)]">
                Performance Tier
              </span>
              <div className="text-lg font-bold text-[var(--text-primary)] mt-0.5">
                {projectedSgpa >= 9
                  ? 'Outstanding'
                  : projectedSgpa >= 8
                  ? 'Distinction'
                  : projectedSgpa >= 6.5
                  ? 'First Class'
                  : 'Pass'}
              </div>
            </div>
          </div>
        </div>

        {/* What-If Target Adjustment */}
        <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border-primary)] p-6 shadow-sm flex flex-col justify-between gap-4">
          <div className="flex flex-col gap-3">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
              Scenario Settings
            </span>

            <div>
              <label className="text-[11px] font-semibold text-[var(--text-secondary)] block mb-1">
                Scenario Name
              </label>
              <input
                type="text"
                value={scenarioTitle}
                onChange={(e) => setScenarioTitle(e.target.value)}
                className="apple-input w-full h-9 px-3 text-xs rounded-xl"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-[11px] font-semibold text-[var(--text-secondary)]">
                  Target SGPA Goal
                </label>
                <span className="text-xs font-bold text-purple-600 dark:text-purple-400 tabular-nums">
                  {targetSgpa.toFixed(1)}
                </span>
              </div>
              <input
                type="range"
                min="5.0"
                max="10.0"
                step="0.1"
                value={targetSgpa}
                onChange={(e) => setTargetSgpa(parseFloat(e.target.value))}
                className="w-full accent-purple-600 cursor-pointer"
              />
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-secondary)] text-[11px] text-[var(--text-secondary)] flex flex-col gap-1">
            <span className="font-semibold text-[var(--text-primary)]">Tip for End Exams:</span>
            <span>
              Adjust the "Estimated End-Sem" column to see minimum marks needed to attain your target SGPA.
            </span>
          </div>
        </div>
      </div>

      {/* 4. Subject Marks Simulation Table */}
      <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border-primary)] shadow-sm overflow-hidden">
        <div className="p-4 border-b border-[var(--border-secondary)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-[var(--text-primary)]">
              Course Marks & Grade Projection Table
            </h3>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Enter known internal marks and simulate semester exam outcomes under Regulation {regulation}.
            </p>
          </div>

          <button
            type="button"
            onClick={handleAddSubject}
            className="apple-btn-secondary text-xs h-8 px-3 gap-1.5 font-medium self-start sm:self-auto"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Course</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[var(--border-secondary)] bg-[var(--bg-tertiary)]/50 text-[var(--text-secondary)] font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4 min-w-[180px]">Course Name</th>
                <th className="py-3 px-3 w-20">Credits</th>
                <th className="py-3 px-3 min-w-[140px]">Internal Marks</th>
                <th className="py-3 px-3 min-w-[150px]">Estimated End-Sem</th>
                <th className="py-3 px-3 w-24">Total (%)</th>
                <th className="py-3 px-3 w-20">Grade</th>
                <th className="py-3 px-3 w-16 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-secondary)]">
              {subjects.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[var(--text-secondary)]">
                    <p className="font-semibold text-sm">No courses added yet.</p>
                    <p className="text-xs text-[var(--text-tertiary)] mt-1">
                      Click &ldquo;Add Course&rdquo; above to simulate your semester SGPA and grade projections.
                    </p>
                  </td>
                </tr>
              ) : (
                subjects.map((sub) => (
                <tr key={sub.id} className="hover:bg-[var(--bg-tertiary)]/20 transition-colors">
                  <td className="py-2.5 px-4">
                    <input
                      type="text"
                      value={sub.courseName}
                      onChange={(e) => updateSubjectField(sub.id, 'courseName', e.target.value)}
                      className="apple-input w-full h-8 px-2 text-xs font-semibold rounded-lg"
                    />
                  </td>

                  <td className="py-2.5 px-3">
                    <input
                      type="number"
                      min="1"
                      max="8"
                      value={sub.credits}
                      onChange={(e) => updateSubjectField(sub.id, 'credits', Number(e.target.value))}
                      className="apple-input w-full h-8 px-2 text-xs text-center font-bold rounded-lg"
                    />
                  </td>

                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="0"
                        max={sub.internalMax}
                        value={sub.internalObtained}
                        onChange={(e) =>
                          updateSubjectField(sub.id, 'internalObtained', Number(e.target.value))
                        }
                        className="apple-input w-16 h-8 px-2 text-xs text-center rounded-lg font-semibold"
                        title="Internal Marks Obtained"
                      />
                      <span className="text-[var(--text-tertiary)]">/</span>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={sub.internalMax}
                        onChange={(e) =>
                          updateSubjectField(sub.id, 'internalMax', Number(e.target.value))
                        }
                        className="apple-input w-14 h-8 px-1.5 text-xs text-center rounded-lg text-[var(--text-secondary)]"
                        title="Maximum Internal Marks"
                      />
                    </div>
                  </td>

                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="0"
                        max={sub.estimatedEndSemMax}
                        value={sub.estimatedEndSemMarks}
                        onChange={(e) =>
                          updateSubjectField(sub.id, 'estimatedEndSemMarks', Number(e.target.value))
                        }
                        className="apple-input w-16 h-8 px-2 text-xs text-center rounded-lg font-bold text-blue-600 dark:text-blue-400"
                        title="Estimated Semester End Exam Marks"
                      />
                      <span className="text-[var(--text-tertiary)]">/</span>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={sub.estimatedEndSemMax}
                        onChange={(e) =>
                          updateSubjectField(sub.id, 'estimatedEndSemMax', Number(e.target.value))
                        }
                        className="apple-input w-14 h-8 px-1.5 text-xs text-center rounded-lg text-[var(--text-secondary)]"
                        title="Maximum End Exam Marks"
                      />
                    </div>
                  </td>

                  <td className="py-2.5 px-3 font-bold tabular-nums text-sm text-[var(--text-primary)]">
                    {sub.projectedTotalMarks}%
                  </td>

                  <td className="py-2.5 px-3">
                    <span
                      className={`px-2 py-0.5 rounded-md font-bold text-xs inline-block text-center ${
                        sub.projectedGradePoints >= 9
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                          : sub.projectedGradePoints >= 7
                          ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                          : sub.projectedGradePoints >= 5
                          ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                          : 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'
                      }`}
                    >
                      {sub.projectedGrade} ({sub.projectedGradePoints})
                    </span>
                  </td>

                  <td className="py-2.5 px-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleRemoveSubject(sub.id)}
                      className="p-1 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20"
                      title="Remove Row"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              )))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Saved Scenarios Archive */}
      {savedScenarios.length > 0 && (
        <div className="flex flex-col gap-4">
          <h3 className="text-base font-bold text-[var(--text-primary)]">
            Saved Simulation Scenarios ({savedScenarios.length})
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {savedScenarios.map((sc) => (
              <div
                key={sc.id}
                className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border-primary)] shadow-sm flex flex-col justify-between gap-4"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                      {sc.regulation} • Semester {sc.semester}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteScenario(sc.id)}
                      className="text-red-500 hover:opacity-80 p-0.5"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <h4 className="font-bold text-sm text-[var(--text-primary)] mt-1">
                    {sc.title}
                  </h4>
                  <div className="text-xs text-[var(--text-secondary)] mt-1">
                    Projected SGPA:{' '}
                    <span className="font-bold text-[var(--text-primary)] tabular-nums">
                      {sc.projectedSgpa.toFixed(2)}
                    </span>{' '}
                    ({sc.subjects.length} courses, {sc.totalCredits} credits)
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleLoadScenario(sc)}
                  className="apple-btn-secondary text-xs h-8 px-3 gap-1.5 font-medium w-full"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Load Simulation</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
