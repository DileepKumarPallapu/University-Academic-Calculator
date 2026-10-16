import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  Trash2,
  Save,
  RotateCcw,
  AlertCircle,
  Info,
} from 'lucide-react';
import { useProfile } from '../../context/ProfileContext';
import { useAppToast } from '../layout/AppShell';
import { REGULATIONS, type RegulationId } from '../../config/university';
import {
  calculateWhatIfScenario,
  getWhatIfScenariosForProfile,
  saveWhatIfScenarioForProfile,
  deleteWhatIfScenarioForProfile,
  extractPriorSemestersSummary,
  validateWhatIfSubject,
  type WhatIfSubject,
  type WhatIfScenario,
  type PriorSemestersSummary,
} from '../../utils/academicIntelligence';
import { getCalculationsByProfile } from '../../services/db';

export const WhatIfGpaSimulator: React.FC = () => {
  const { activeProfile } = useProfile();
  const { showToast } = useAppToast();

  const [regulation, setRegulation] = useState<RegulationId>(
    (activeProfile.regulation as RegulationId) || 'VTR21'
  );
  const [semester, setSemester] = useState<number>(activeProfile.currentSemester || 1);
  const [scenarioTitle, setScenarioTitle] = useState('Scenario A (Target)');

  const [priorSummary, setPriorSummary] = useState<PriorSemestersSummary>({
    priorCredits: 0,
    priorWeightedPoints: 0,
    priorCgpa: null,
    semestersCount: 0,
  });

  const [subjects, setSubjects] = useState<WhatIfSubject[]>([
    { id: '1', name: 'Advanced Engineering Course', credits: 4, grade: 'S' },
    { id: '2', name: 'Core Computing Principles', credits: 4, grade: 'A' },
    { id: '3', name: 'Design and Analysis Lab', credits: 2, grade: 'S' },
  ]);

  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [savedScenarios, setSavedScenarios] = useState<WhatIfScenario[]>([]);

  // Load prior summary and saved scenarios
  useEffect(() => {
    setRegulation((activeProfile.regulation as RegulationId) || 'VTR21');
    setSemester(activeProfile.currentSemester || 1);

    getCalculationsByProfile(activeProfile.id).then((calcs) => {
      const summary = extractPriorSemestersSummary(calcs);
      setPriorSummary(summary);
    });

    const scenarios = getWhatIfScenariosForProfile(activeProfile.id);
    setSavedScenarios(scenarios);
  }, [activeProfile.id]);

  const regConfig = REGULATIONS[regulation] || REGULATIONS.VTR21;
  const availableGrades = regConfig.grades;

  // Real-time calculation
  const currentSimulation = useMemo(() => {
    return calculateWhatIfScenario(
      scenarioTitle,
      regulation,
      semester,
      subjects,
      priorSummary,
      activeProfile.id
    );
  }, [scenarioTitle, regulation, semester, subjects, priorSummary, activeProfile.id]);

  const handleAddSubject = () => {
    const defaultGrade = availableGrades[0]?.grade || 'S';
    const newSub: WhatIfSubject = {
      id: `sub-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      name: '',
      credits: 3,
      grade: defaultGrade,
    };
    setSubjects((prev) => [...prev, newSub]);
  };

  const handleRemoveSubject = (id: string) => {
    setSubjects((prev) => prev.filter((s) => s.id !== id));
  };

  const handleUpdateSubject = (id: string, field: keyof WhatIfSubject, value: any) => {
    setSubjects((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        return { ...s, [field]: value };
      })
    );
  };

  const handleReset = () => {
    const defaultGrade = availableGrades[0]?.grade || 'S';
    setSubjects([
      { id: '1', name: 'Course 1', credits: 4, grade: defaultGrade },
      { id: '2', name: 'Course 2', credits: 3, grade: defaultGrade },
    ]);
    setScenarioTitle('New Simulation Scenario');
    setValidationErrors([]);
    showToast('Simulation reset to blank sandbox.', 'info');
  };

  const handleSaveScenario = () => {
    // Validate inputs
    const errors: string[] = [];
    if (subjects.length === 0) {
      errors.push('Add at least one hypothetical course to simulate.');
    }
    subjects.forEach((sub, idx) => {
      const val = validateWhatIfSubject(sub, regulation);
      if (!val.isValid && val.error) {
        errors.push(`Row ${idx + 1}: ${val.error}`);
      }
    });

    if (errors.length > 0) {
      setValidationErrors(errors);
      showToast('Please fix the errors before saving.', 'error');
      return;
    }

    setValidationErrors([]);
    const updated = saveWhatIfScenarioForProfile(activeProfile.id, currentSimulation);
    setSavedScenarios(updated);
    showToast(`Saved simulation scenario "${currentSimulation.title}"!`, 'success');
  };

  const handleDeleteScenario = (id: string) => {
    const updated = deleteWhatIfScenarioForProfile(activeProfile.id, id);
    setSavedScenarios(updated);
    showToast('Simulation scenario deleted.', 'info');
  };

  const handleLoadScenario = (s: WhatIfScenario) => {
    setScenarioTitle(s.title);
    setRegulation(s.regulation);
    setSemester(s.semester);
    setSubjects(s.subjects);
    setValidationErrors([]);
    showToast(`Loaded scenario "${s.title}" into simulator.`, 'info');
  };

  return (
    <div className="flex flex-col gap-8 w-full max-w-5xl mx-auto">
      {/* Simulation Notice Banner */}
      <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-200 text-xs sm:text-sm">
        <Info className="w-5 h-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
        <div className="flex flex-col gap-1">
          <span className="font-bold uppercase tracking-wider text-[11px] text-amber-700 dark:text-amber-300">
            SIMULATION ONLY — Hypothetical Analytics
          </span>
          <p className="leading-relaxed">
            This simulator allows you to test hypothetical grades and credit distributions.
            Calculations are purely for scenario planning and{' '}
            <strong className="font-semibold underline">never alter</strong> your official records, saved calculations, or transcripts.
          </p>
        </div>
      </div>

      {/* Simulator Control Card */}
      <div className="apple-card p-6 sm:p-8 flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border-secondary)] pb-5">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)]">
              What-If GPA & CGPA Simulator
            </h2>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1">
              Explore your projected SGPA and cumulative CGPA across various grade outcomes.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleReset}
              className="apple-btn-secondary text-xs h-9 px-3.5 gap-1.5"
              title="Reset subjects"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
            <button
              type="button"
              onClick={handleSaveScenario}
              className="apple-btn-primary text-xs h-9 px-4 gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Scenario</span>
            </button>
          </div>
        </div>

        {/* Configuration Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[var(--text-primary)]">
              Scenario Name
            </label>
            <input
              type="text"
              value={scenarioTitle}
              onChange={(e) => setScenarioTitle(e.target.value)}
              placeholder="e.g. Best Case Scenario"
              className="px-3.5 py-2 text-sm rounded-xl bg-[var(--surface)] border border-[var(--border-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[var(--text-primary)]">
              Regulation Scale
            </label>
            <select
              value={regulation}
              onChange={(e) => setRegulation(e.target.value as RegulationId)}
              className="px-3.5 py-2 text-sm rounded-xl bg-[var(--surface)] border border-[var(--border-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            >
              {Object.keys(REGULATIONS).map((regKey) => (
                <option key={regKey} value={regKey}>
                  {regKey} ({REGULATIONS[regKey as RegulationId].years})
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[var(--text-primary)]">
              Target Semester
            </label>
            <select
              value={semester}
              onChange={(e) => setSemester(Number(e.target.value))}
              className="px-3.5 py-2 text-sm rounded-xl bg-[var(--surface)] border border-[var(--border-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                <option key={s} value={s}>
                  Semester {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Results Banner Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-5 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-primary)]">
          <div className="flex flex-col">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
              Projected SGPA
            </span>
            <span className="text-2xl sm:text-3xl font-extrabold text-blue-600 dark:text-blue-400 mt-1 tabular-nums">
              {currentSimulation.projectedSgpa > 0
                ? currentSimulation.projectedSgpa.toFixed(2)
                : '—'}
            </span>
            <span className="text-[11px] text-[var(--text-secondary)] mt-0.5">
              from {currentSimulation.totalCredits} credits
            </span>
          </div>

          <div className="flex flex-col">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
              Projected CGPA
            </span>
            <span className="text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1 tabular-nums">
              {currentSimulation.projectedCgpa !== null
                ? currentSimulation.projectedCgpa.toFixed(2)
                : currentSimulation.projectedSgpa > 0
                ? currentSimulation.projectedSgpa.toFixed(2)
                : '—'}
            </span>
            <span className="text-[11px] text-[var(--text-secondary)] mt-0.5">
              {priorSummary.priorCredits > 0
                ? `with ${priorSummary.priorCredits} prior cr.`
                : 'no prior credits'}
            </span>
          </div>

          <div className="flex flex-col">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
              CGPA Impact (Δ)
            </span>
            <div className="flex items-center gap-1.5 mt-1">
              <span
                className={`text-2xl sm:text-3xl font-extrabold tabular-nums ${
                  currentSimulation.deltaCgpa === null
                    ? 'text-[var(--text-secondary)]'
                    : currentSimulation.deltaCgpa >= 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-red-500'
                }`}
              >
                {currentSimulation.deltaCgpa === null
                  ? '—'
                  : currentSimulation.deltaCgpa >= 0
                  ? `+${currentSimulation.deltaCgpa.toFixed(2)}`
                  : currentSimulation.deltaCgpa.toFixed(2)}
              </span>
            </div>
            <span className="text-[11px] text-[var(--text-secondary)] mt-0.5">
              relative to {priorSummary.priorCgpa !== null ? priorSummary.priorCgpa.toFixed(2) : 'current'}
            </span>
          </div>

          <div className="flex flex-col">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
              Scenario Scale
            </span>
            <span className="text-sm font-bold text-[var(--text-primary)] mt-1">
              {regulation}
            </span>
            <span className="text-[11px] text-[var(--text-secondary)] mt-0.5 truncate">
              {regConfig.grades.map((g) => g.grade).join(', ')}
            </span>
          </div>
        </div>

        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs flex flex-col gap-1">
            <span className="font-bold flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4" /> Please resolve the following inputs:
            </span>
            <ul className="list-disc list-inside">
              {validationErrors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Subject Rows */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
              Hypothetical Courses ({subjects.length})
            </span>
            <button
              type="button"
              onClick={handleAddSubject}
              className="apple-btn-secondary text-xs h-8 px-3 gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Course</span>
            </button>
          </div>

          <div className="flex flex-col gap-2">
            {subjects.map((sub, index) => (
              <div
                key={sub.id}
                className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 p-3 rounded-xl bg-[var(--surface)] border border-[var(--border-primary)]"
              >
                <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-tertiary)] w-7 shrink-0">
                  #{index + 1}
                </div>

                <div className="flex-1">
                  <input
                    type="text"
                    value={sub.name}
                    onChange={(e) => handleUpdateSubject(sub.id, 'name', e.target.value)}
                    placeholder="Course name (e.g. Operating Systems)"
                    className="w-full px-3 py-1.5 text-xs rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-secondary)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5">
                    <label className="text-[11px] text-[var(--text-secondary)] whitespace-nowrap">
                      Credits:
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={12}
                      value={sub.credits}
                      onChange={(e) =>
                        handleUpdateSubject(sub.id, 'credits', Number(e.target.value) || 0)
                      }
                      className="w-16 px-2.5 py-1.5 text-xs text-center rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-secondary)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div className="flex items-center gap-1.5">
                    <label className="text-[11px] text-[var(--text-secondary)] whitespace-nowrap">
                      Expected Grade:
                    </label>
                    <select
                      value={sub.grade}
                      onChange={(e) => handleUpdateSubject(sub.id, 'grade', e.target.value)}
                      className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-secondary)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      {availableGrades.map((g) => (
                        <option key={g.grade} value={g.grade}>
                          {g.grade} ({g.points} pts)
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveSubject(sub.id)}
                    className="p-1.5 text-[var(--text-tertiary)] hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors ml-auto sm:ml-0"
                    title="Remove course"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Multi-Scenario Comparison Section */}
      {savedScenarios.length > 0 && (
        <div className="apple-card p-6 sm:p-8 flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-[var(--text-primary)]">
                Scenario Comparison Table
              </h3>
              <p className="text-xs text-[var(--text-secondary)]">
                Compare your saved hypothetical projections side-by-side.
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400">
              {savedScenarios.length} Saved Scenarios
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[var(--border-primary)] text-[var(--text-tertiary)] uppercase font-semibold">
                  <th className="py-2.5 px-3">Scenario Title</th>
                  <th className="py-2.5 px-3">Regulation</th>
                  <th className="py-2.5 px-3">Credits</th>
                  <th className="py-2.5 px-3">Projected SGPA</th>
                  <th className="py-2.5 px-3">Future CGPA</th>
                  <th className="py-2.5 px-3">Impact (Δ)</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-secondary)]">
                {savedScenarios.map((sc) => (
                  <tr key={sc.id} className="hover:bg-[var(--bg-secondary)]/50 transition-colors">
                    <td className="py-3 px-3 font-semibold text-[var(--text-primary)]">
                      {sc.title}
                    </td>
                    <td className="py-3 px-3 text-[var(--text-secondary)]">
                      {sc.regulation}
                    </td>
                    <td className="py-3 px-3 font-mono text-[var(--text-primary)]">
                      {sc.totalCredits}
                    </td>
                    <td className="py-3 px-3 font-bold text-blue-600 dark:text-blue-400 font-mono">
                      {sc.projectedSgpa.toFixed(2)}
                    </td>
                    <td className="py-3 px-3 font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                      {sc.projectedCgpa ? sc.projectedCgpa.toFixed(2) : '—'}
                    </td>
                    <td className="py-3 px-3 font-mono font-semibold">
                      {sc.deltaCgpa === null ? (
                        '—'
                      ) : sc.deltaCgpa >= 0 ? (
                        <span className="text-emerald-600 dark:text-emerald-400">
                          +{sc.deltaCgpa.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-red-500">{sc.deltaCgpa.toFixed(2)}</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleLoadScenario(sc)}
                          className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-[var(--surface)] border border-[var(--border-primary)] text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"
                        >
                          Load
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteScenario(sc.id)}
                          className="p-1 text-[var(--text-tertiary)] hover:text-red-500 rounded-md"
                          title="Delete scenario"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
