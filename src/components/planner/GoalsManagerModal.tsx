import React, { useState } from 'react';
import { X, Target, Save, RotateCcw } from 'lucide-react';
import type { StudentAcademicGoals } from '../../types/academicCompanion';

interface GoalsManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentGoals: StudentAcademicGoals | null;
  onSaveGoals: (goals: Partial<StudentAcademicGoals>) => void;
}

export const GoalsManagerModal: React.FC<GoalsManagerModalProps> = ({
  isOpen,
  onClose,
  currentGoals,
  onSaveGoals,
}) => {
  const [targetSgpa, setTargetSgpa] = useState<string>(
    currentGoals?.targetSgpa !== null && currentGoals?.targetSgpa !== undefined
      ? String(currentGoals.targetSgpa)
      : ''
  );
  const [targetCgpa, setTargetCgpa] = useState<string>(
    currentGoals?.targetCgpa !== null && currentGoals?.targetCgpa !== undefined
      ? String(currentGoals.targetCgpa)
      : ''
  );
  const [targetAttendancePct, setTargetAttendancePct] = useState<string>(
    currentGoals?.targetAttendancePct !== null && currentGoals?.targetAttendancePct !== undefined
      ? String(currentGoals.targetAttendancePct)
      : '85'
  );
  const [targetCredits, setTargetCredits] = useState<string>(
    currentGoals?.targetCredits !== null && currentGoals?.targetCredits !== undefined
      ? String(currentGoals.targetCredits)
      : '160'
  );
  const [targetPrepCompletionPct, setTargetPrepCompletionPct] = useState<string>(
    currentGoals?.targetPrepCompletionPct !== null &&
      currentGoals?.targetPrepCompletionPct !== undefined
      ? String(currentGoals.targetPrepCompletionPct)
      : '100'
  );

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveGoals({
      targetSgpa: targetSgpa.trim() ? parseFloat(targetSgpa) : null,
      targetCgpa: targetCgpa.trim() ? parseFloat(targetCgpa) : null,
      targetAttendancePct: targetAttendancePct.trim() ? parseFloat(targetAttendancePct) : null,
      targetCredits: targetCredits.trim() ? parseInt(targetCredits, 10) : null,
      targetPrepCompletionPct: targetPrepCompletionPct.trim()
        ? parseFloat(targetPrepCompletionPct)
        : null,
    });
    onClose();
  };

  const handleResetDefaults = () => {
    setTargetSgpa('8.5');
    setTargetCgpa('8.0');
    setTargetAttendancePct('85');
    setTargetCredits('160');
    setTargetPrepCompletionPct('100');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-lg">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white">Custom Academic Targets</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Set personal goals to compare against college minimum standards.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Target SGPA (0.0 – 10.0)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="10"
                value={targetSgpa}
                onChange={(e) => setTargetSgpa(e.target.value)}
                placeholder="e.g. 8.5"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <span className="text-[10px] text-slate-500">College min passing SGPA: 5.0</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Target CGPA (0.0 – 10.0)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="10"
                value={targetCgpa}
                onChange={(e) => setTargetCgpa(e.target.value)}
                placeholder="e.g. 8.0"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <span className="text-[10px] text-slate-500">College graduation min: 5.0</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Target Attendance % (60% – 100%)
              </label>
              <input
                type="number"
                step="0.1"
                min="60"
                max="100"
                value={targetAttendancePct}
                onChange={(e) => setTargetAttendancePct(e.target.value)}
                placeholder="e.g. 85"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <span className="text-[10px] text-slate-500">College mandatory rule: 75% min</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Target Graduation Credits
              </label>
              <input
                type="number"
                step="1"
                min="100"
                max="250"
                value={targetCredits}
                onChange={(e) => setTargetCredits(e.target.value)}
                placeholder="e.g. 160"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <span className="text-[10px] text-slate-500">B.Tech standard requirement: 160</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Exam Readiness Target % (0% – 100%)
            </label>
            <input
              type="number"
              step="1"
              min="0"
              max="100"
              value={targetPrepCompletionPct}
              onChange={(e) => setTargetPrepCompletionPct(e.target.value)}
              placeholder="e.g. 100"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <span className="text-[10px] text-slate-500">
              Percentage of current semester subjects fully prepared before exams.
            </span>
          </div>

          <div className="pt-2 flex items-center justify-between">
            <button
              type="button"
              onClick={handleResetDefaults}
              className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset to Recommended
            </button>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              Save Targets
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
