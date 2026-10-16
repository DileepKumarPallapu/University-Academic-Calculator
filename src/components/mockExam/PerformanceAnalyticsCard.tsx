import React from 'react';
import {
  TrendingUp,
  Target,
  Award,
  AlertOctagon,
  CheckCircle2,
  Calendar,
  RotateCw,
} from 'lucide-react';
import type { ExamPerformanceAnalytics, ExamAttemptRecord } from '../../types/mockExam';

interface PerformanceAnalyticsCardProps {
  analytics: ExamPerformanceAnalytics;
  attempts: ExamAttemptRecord[];
  onViewAttempt: (attempt: ExamAttemptRecord) => void;
}

export const PerformanceAnalyticsCard: React.FC<PerformanceAnalyticsCardProps> = ({
  analytics,
  attempts,
  onViewAttempt,
}) => {
  if (analytics.totalAttempts === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-8 shadow-sm text-center">
        <Target className="w-10 h-10 text-gray-400 mx-auto mb-3 opacity-50" />
        <h3 className="text-base font-bold text-gray-900 dark:text-white">
          No Mock Exam Analytics Available
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-sm mx-auto">
          Take practice mock exams to analyze your subject accuracy, identify weak syllabus units, and monitor your score trends over time.
        </p>
      </div>
    );
  }

  const subjectList = Object.values(analytics.subjectAccuracy);

  return (
    <div className="space-y-6">
      {/* Overview Stat Widgets */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400">
            <RotateCw className="w-4 h-4 text-indigo-500" />
            <span>Total Attempts</span>
          </div>
          <div className="text-2xl font-black text-gray-900 dark:text-white mt-2">
            {analytics.totalAttempts}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400">
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            <span>Average Score</span>
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2">
            {analytics.averageScorePercentage}%
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400">
            <Award className="w-4 h-4 text-amber-500" />
            <span>Highest Score</span>
          </div>
          <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-2">
            {analytics.highestScorePercentage}%
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400">
            <Target className="w-4 h-4 text-purple-500" />
            <span>Overall Accuracy</span>
          </div>
          <div className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-2">
            {analytics.overallAccuracyPercentage}%
          </div>
        </div>
      </div>

      {/* Strong & Weak Topic Focus */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Strong Topics */}
        <div className="bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold text-sm">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Strong Topics (Accuracy &ge; 75%)</span>
          </div>
          {analytics.strongTopics.length === 0 ? (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              No topics with &ge; 75% accuracy yet. Keep practicing!
            </p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {analytics.strongTopics.map((topic, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 rounded-lg text-xs font-semibold"
                >
                  {topic}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Weak Topics */}
        <div className="bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/40 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-rose-800 dark:text-rose-300 font-bold text-sm">
            <AlertOctagon className="w-4 h-4 shrink-0" />
            <span>Attention Needed (&lt; 60% Accuracy)</span>
          </div>
          {analytics.weakTopics.length === 0 ? (
            <p className="text-xs text-emerald-700 dark:text-emerald-300 font-medium">
              Great job! No weak topics identified in recent attempts.
            </p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {analytics.weakTopics.map((topic, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-200 rounded-lg text-xs font-semibold"
                >
                  {topic}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Subject-Wise Accuracy Progress */}
      {subjectList.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
            Subject Accuracy Breakdown
          </h3>
          <div className="space-y-3">
            {subjectList.map((subj) => (
              <div key={subj.subjectName} className="space-y-1">
                <div className="flex justify-between text-xs font-semibold text-gray-800 dark:text-gray-200">
                  <span>{subj.subjectName}</span>
                  <span className="text-indigo-600 dark:text-indigo-400">
                    {subj.accuracyPercentage}% ({subj.correctCount}/{subj.totalAnswered} questions)
                  </span>
                </div>
                <div className="h-2 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      subj.accuracyPercentage >= 75
                        ? 'bg-emerald-500'
                        : subj.accuracyPercentage >= 60
                        ? 'bg-amber-500'
                        : 'bg-rose-500'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(0, subj.accuracyPercentage))}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Attempts History Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
          Recent Attempts History
        </h3>

        <div className="divide-y divide-gray-100 dark:divide-gray-700">
          {attempts.slice(0, 10).map((att) => (
            <div
              key={att.id}
              className="py-3 flex items-center justify-between gap-4 flex-wrap hover:bg-gray-50/50 dark:hover:bg-gray-750/50 px-2 rounded-xl transition"
            >
              <div>
                <div className="font-semibold text-sm text-gray-900 dark:text-white">
                  {att.examTitle}
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{new Date(att.submittedAt).toLocaleDateString()}</span>
                  <span>&bull;</span>
                  <span>{Math.round(att.durationSecondsTaken / 60)} mins</span>
                  <span>&bull;</span>
                  <span>
                    {att.correctCount}/{att.totalQuestions} correct
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span
                  className={`text-sm font-black px-2.5 py-1 rounded-lg ${
                    att.isPassed
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                      : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                  }`}
                >
                  {att.percentage}%
                </span>

                <button
                  onClick={() => onViewAttempt(att)}
                  className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  View Report
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
