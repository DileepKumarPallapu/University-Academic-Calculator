import React from 'react';
import { Target, Award, CheckCircle, Clock, AlertCircle, Edit2, ShieldCheck } from 'lucide-react';
import type { AcademicGoalMetric } from '../../types/academicCompanion';

interface AcademicGoalsCardProps {
  metrics: AcademicGoalMetric[];
  onEditGoals: () => void;
}

export const AcademicGoalsCard: React.FC<AcademicGoalsCardProps> = ({
  metrics,
  onEditGoals,
}) => {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-lg">
              <Target className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Academic Goals & University Benchmarks
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Compare your personal targets alongside official college standards. Calculations never modify actual records.
          </p>
        </div>
        <button
          onClick={onEditGoals}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/40 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 transition-colors self-start sm:self-center"
        >
          <Edit2 className="w-3.5 h-3.5" />
          Edit My Targets
        </button>
      </div>

      {/* College Requirement vs Personal Goal Explanation Banner */}
      <div className="mb-6 p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex items-start gap-3">
        <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400 mt-0.5 shrink-0" />
        <div className="text-xs text-slate-600 dark:text-slate-300 space-y-1">
          <p>
            <strong className="text-slate-900 dark:text-white">College Requirements:</strong> Official mandatory thresholds established by University regulations (e.g., minimum 75% attendance for exam hall ticket, 5.0 passing CGPA).
          </p>
          <p>
            <strong className="text-slate-900 dark:text-white">Personal Targets:</strong> Your custom aspirational benchmarks. Progress is calculated only when actual recorded data exists.
          </p>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {metrics.map((metric) => {
          return (
            <div
              key={metric.key}
              className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {metric.title}
                  </span>
                  {metric.isAchieved ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full">
                      <CheckCircle className="w-3 h-3" /> Target Met
                    </span>
                  ) : metric.hasData ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-full">
                      <Clock className="w-3 h-3" /> In Progress
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                      <AlertCircle className="w-3 h-3" /> No Data
                    </span>
                  )}
                </div>

                {/* Current Value Display */}
                <div className="mt-1 mb-2">
                  {metric.hasData ? (
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-2xl font-black text-slate-900 dark:text-white">
                        {metric.currentValue !== null
                          ? metric.unit === '%' || metric.unit === 'GPA' || metric.unit === 'CGPA'
                            ? metric.currentValue.toFixed(1)
                            : metric.currentValue
                          : '--'}
                      </span>
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                        {metric.unit}
                      </span>
                    </div>
                  ) : (
                    <div className="text-sm font-medium text-slate-500 dark:text-slate-400 italic">
                      {metric.statusText}
                    </div>
                  )}
                </div>

                {/* Progress Bar (only when target and data exist) */}
                {metric.hasData && metric.targetValue !== null && (
                  <div className="mb-3">
                    <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          metric.isAchieved
                            ? 'bg-emerald-500'
                            : 'bg-indigo-600 dark:bg-indigo-500'
                        }`}
                        style={{ width: `${Math.min(100, Math.max(0, metric.progressPct))}%` }}
                      />
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                      <span>{metric.progressPct}% of target</span>
                      <span>Target: {metric.targetValue} {metric.unit}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Targets and College Standard Footer */}
              <div className="pt-3 border-t border-slate-200/60 dark:border-slate-800 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1 font-medium text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.5 rounded text-[10px]">
                    <Target className="w-2.5 h-2.5" /> {metric.userTargetLabel}:
                  </span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">
                    {metric.targetValue !== null ? `${metric.targetValue} ${metric.unit}` : 'Not set'}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-start gap-1">
                  <Award className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <span>{metric.collegeRequirement}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
