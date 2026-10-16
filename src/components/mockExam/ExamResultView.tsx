import React, { useState } from 'react';
import {
  CheckCircle,
  XCircle,
  HelpCircle,
  Award,
  Clock,
  BookOpen,
  ArrowLeft,
  RotateCw,
  PlusCircle,
  Sliders,
} from 'lucide-react';
import type { ExamAttemptRecord, BankQuestion } from '../../types/mockExam';
import {
  updateDescriptiveEvaluation,
  addToMistakeNotebook,
} from '../../services/mockExamStorage';

interface ExamResultViewProps {
  attempt: ExamAttemptRecord;
  onRetakeExam?: (configId: string) => void;
  onBackToCenter: () => void;
  onAttemptUpdated?: (updated: ExamAttemptRecord) => void;
}

export const ExamResultView: React.FC<ExamResultViewProps> = ({
  attempt: initialAttempt,
  onRetakeExam,
  onBackToCenter,
  onAttemptUpdated,
}) => {
  const [attempt, setAttempt] = useState<ExamAttemptRecord>(initialAttempt);
  const [filterMode, setFilterMode] = useState<'all' | 'incorrect' | 'descriptive'>('all');
  const [savedMistakeIds, setSavedMistakeIds] = useState<Set<string>>(new Set());
  const [reflectionNotesMap, setReflectionNotesMap] = useState<Record<string, string>>({});

  const handleSelfGradeDescriptive = (questionId: string, marks: number) => {
    const updated = updateDescriptiveEvaluation(
      attempt.profileId,
      attempt.id,
      questionId,
      marks
    );
    if (updated) {
      setAttempt(updated);
      onAttemptUpdated?.(updated);
    }
  };

  const handleAddToMistakes = (q: BankQuestion) => {
    const note = reflectionNotesMap[q.id] || '';
    addToMistakeNotebook(attempt.profileId, q, 'Incorrect practice attempt', note);
    setSavedMistakeIds((prev) => new Set([...prev, q.id]));
  };

  const filteredQuestions = attempt.questions.filter((q) => {
    if (filterMode === 'incorrect') {
      const res = attempt.questionResults[q.id];
      return res?.isCorrect === false;
    }
    if (filterMode === 'descriptive') {
      return q.type === 'descriptive';
    }
    return true;
  });

  const durationMin = Math.floor(attempt.durationSecondsTaken / 60);
  const durationSec = attempt.durationSecondsTaken % 60;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBackToCenter}
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Mock Exam Center</span>
        </button>

        {onRetakeExam && (
          <button
            onClick={() => onRetakeExam(attempt.examConfigId)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 rounded-xl text-xs sm:text-sm font-semibold hover:bg-indigo-100 transition"
          >
            <RotateCw className="w-4 h-4" />
            <span>Retake This Exam</span>
          </button>
        )}
      </div>

      {/* Primary Score Report Card */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-gray-100 dark:border-gray-700">
          <div>
            <div className="flex items-center gap-2">
              <span
                className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-lg ${
                  attempt.isPassed
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                    : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                }`}
              >
                {attempt.isPassed ? 'Passed' : 'Needs Practice'}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                <span>
                  {durationMin}m {durationSec}s taken
                </span>
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mt-2">
              {attempt.examTitle}
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Attempt completed on {new Date(attempt.submittedAt).toLocaleString()}
            </p>
          </div>

          {/* Large Score Metric */}
          <div className="text-right sm:border-l sm:pl-8 border-gray-100 dark:border-gray-700">
            <div className="text-3xl sm:text-4xl font-extrabold text-indigo-600 dark:text-indigo-400">
              {attempt.percentage}%
            </div>
            <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mt-1">
              {attempt.totalObtainedMarks} / {attempt.maxMarks} Total Marks
            </div>
          </div>
        </div>

        {/* Detailed Breakdown Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6">
          <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-800/40">
            <div className="flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-300 font-medium">
              <CheckCircle className="w-4 h-4" />
              <span>Correct Answers</span>
            </div>
            <div className="text-xl font-bold text-emerald-800 dark:text-emerald-200 mt-1">
              {attempt.correctCount}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-800/40">
            <div className="flex items-center gap-1.5 text-xs text-rose-700 dark:text-rose-300 font-medium">
              <XCircle className="w-4 h-4" />
              <span>Incorrect</span>
            </div>
            <div className="text-xl font-bold text-rose-800 dark:text-rose-200 mt-1">
              {attempt.incorrectCount}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-gray-750 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400 font-medium">
              <HelpCircle className="w-4 h-4" />
              <span>Unanswered</span>
            </div>
            <div className="text-xl font-bold text-gray-800 dark:text-gray-200 mt-1">
              {attempt.unansweredCount}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-800/40">
            <div className="flex items-center gap-1.5 text-xs text-indigo-700 dark:text-indigo-300 font-medium">
              <Award className="w-4 h-4" />
              <span>Objective Marks</span>
            </div>
            <div className="text-xl font-bold text-indigo-800 dark:text-indigo-200 mt-1">
              {attempt.objectiveObtainedMarks}
              {attempt.negativeMarksDeducted > 0 && (
                <span className="text-xs text-rose-600 font-normal ml-1">
                  (-{attempt.negativeMarksDeducted})
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Question Analysis List Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <span>Question-Wise Review & Solutions</span>
        </h2>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl text-xs font-semibold">
          <button
            onClick={() => setFilterMode('all')}
            className={`px-3 py-1.5 rounded-lg transition ${
              filterMode === 'all'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            All ({attempt.questions.length})
          </button>
          <button
            onClick={() => setFilterMode('incorrect')}
            className={`px-3 py-1.5 rounded-lg transition ${
              filterMode === 'incorrect'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Incorrect ({attempt.incorrectCount})
          </button>
          <button
            onClick={() => setFilterMode('descriptive')}
            className={`px-3 py-1.5 rounded-lg transition ${
              filterMode === 'descriptive'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Descriptive (
            {attempt.questions.filter((q) => q.type === 'descriptive').length}
            )
          </button>
        </div>
      </div>

      {/* Questions Review Accordion/Cards */}
      <div className="space-y-4">
        {filteredQuestions.map((q, idx) => {
          const ans = attempt.answers[q.id];
          const res = attempt.questionResults[q.id];
          const isSavedInMistakes = savedMistakeIds.has(q.id);

          let statusBadge = (
            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
              Not Attempted
            </span>
          );

          if (q.type === 'descriptive') {
            statusBadge = (
              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300">
                Self-Evaluated: {res?.marksAwarded ?? 0} / {q.marks}
              </span>
            );
          } else if (res?.isCorrect === true) {
            statusBadge = (
              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" /> Correct (+{res.marksAwarded})
              </span>
            );
          } else if (res?.isCorrect === false) {
            statusBadge = (
              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 flex items-center gap-1">
                <XCircle className="w-3 h-3" /> Incorrect{' '}
                {res.negativeDeduction > 0 && `(-${res.negativeDeduction})`}
              </span>
            );
          }

          return (
            <div
              key={q.id}
              className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm space-y-4"
            >
              {/* Question Header */}
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-400">Q{idx + 1}.</span>
                  <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-[11px] font-semibold rounded">
                    {q.subjectName}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {q.unitOrTopic}
                  </span>
                </div>
                <div>{statusBadge}</div>
              </div>

              {/* Question Statement */}
              <p className="text-sm sm:text-base font-medium text-gray-900 dark:text-gray-100 leading-relaxed">
                {q.questionText}
              </p>

              {/* Options Review for MCQ */}
              {(q.type === 'single_mcq' || q.type === 'multiple_mcq') && q.options && (
                <div className="space-y-2 pt-1">
                  {q.options.map((opt, optIdx) => {
                    const isUserPick = ans?.selectedOptionIndices?.includes(optIdx);
                    const isCorrect = q.correctOptionIndices?.includes(optIdx);

                    let optStyle = 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300';
                    if (isCorrect) {
                      optStyle =
                        'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200 font-semibold';
                    } else if (isUserPick && !isCorrect) {
                      optStyle =
                        'border-rose-400 bg-rose-50/60 dark:bg-rose-950/30 text-rose-900 dark:text-rose-200 line-through';
                    }

                    return (
                      <div
                        key={opt.id || optIdx}
                        className={`p-2.5 rounded-xl border text-xs sm:text-sm flex items-center justify-between gap-3 ${optStyle}`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="w-5 h-5 rounded-full border flex items-center justify-center text-xs font-bold">
                            {String.fromCharCode(65 + optIdx)}
                          </span>
                          <span>{opt.text}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs">
                          {isUserPick && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 font-medium">
                              Your answer
                            </span>
                          )}
                          {isCorrect && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-600 text-white font-medium">
                              Correct Key
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* True / False Review */}
              {q.type === 'true_false' && (
                <div className="flex items-center gap-4 text-xs font-medium">
                  <div className="p-2 rounded-lg bg-gray-50 dark:bg-gray-700">
                    <span className="text-gray-400 mr-2">Your Answer:</span>
                    <span className="font-bold">
                      {typeof ans?.selectedBoolean === 'boolean'
                        ? ans.selectedBoolean
                          ? 'True'
                          : 'False'
                        : 'Unanswered'}
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold">
                    <span>Correct Answer: {q.correctBoolean ? 'True' : 'False'}</span>
                  </div>
                </div>
              )}

              {/* Descriptive Self-Evaluation Slider & Model Answer */}
              {q.type === 'descriptive' && (
                <div className="p-4 bg-gray-50 dark:bg-gray-750 rounded-xl border border-gray-200 dark:border-gray-700 space-y-3">
                  <div className="text-xs space-y-1">
                    <span className="font-bold text-gray-700 dark:text-gray-300">
                      Your Typed Solution:
                    </span>
                    <p className="p-2 rounded bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                      {ans?.descriptiveText || 'No answer typed.'}
                    </p>
                  </div>

                  {q.modelAnswer && (
                    <div className="text-xs space-y-1">
                      <span className="font-bold text-emerald-700 dark:text-emerald-400">
                        Model Answer / Evaluation Criteria:
                      </span>
                      <p className="p-2 rounded bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 text-emerald-900 dark:text-emerald-200 whitespace-pre-wrap">
                        {q.modelAnswer}
                      </p>
                    </div>
                  )}

                  {/* Interactive self-grading */}
                  <div className="pt-2 border-t border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                        Self-Award Marks (Max {q.marks}):
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min="0"
                        max={q.marks}
                        step="0.5"
                        value={ans?.selfAwardedMarks ?? 0}
                        onChange={(e) =>
                          handleSelfGradeDescriptive(q.id, parseFloat(e.target.value) || 0)
                        }
                        className="w-36 accent-indigo-600"
                      />
                      <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 w-10 text-right">
                        {ans?.selfAwardedMarks ?? 0} / {q.marks}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Explanation & Revision Notes */}
              {(q.explanation || q.revisionNotes) && (
                <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-xl border border-indigo-100 dark:border-indigo-900/40 text-xs space-y-1">
                  {q.explanation && (
                    <p className="text-gray-700 dark:text-gray-300">
                      <span className="font-bold text-indigo-700 dark:text-indigo-300">
                        Explanation:
                      </span>{' '}
                      {q.explanation}
                    </p>
                  )}
                  {q.revisionNotes && (
                    <p className="text-gray-600 dark:text-gray-400">
                      <span className="font-bold text-gray-700 dark:text-gray-300">
                        Revision Note:
                      </span>{' '}
                      {q.revisionNotes}
                    </p>
                  )}
                </div>
              )}

              {/* Mistake Notebook Quick-Save Button for Incorrect or Skipped questions */}
              {(res?.isCorrect === false || !ans?.isAnswered) && (
                <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-gray-100 dark:border-gray-700">
                  <input
                    type="text"
                    placeholder="Add a quick note: Why did you miss this? (optional)"
                    value={reflectionNotesMap[q.id] || ''}
                    onChange={(e) =>
                      setReflectionNotesMap({
                        ...reflectionNotesMap,
                        [q.id]: e.target.value,
                      })
                    }
                    className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-750 text-gray-900 dark:text-white"
                  />

                  <button
                    onClick={() => handleAddToMistakes(q)}
                    disabled={isSavedInMistakes}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition shrink-0 ${
                      isSavedInMistakes
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                        : 'bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                    }`}
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>
                      {isSavedInMistakes ? 'Saved to Mistake Notebook' : 'Save to Mistake Notebook'}
                    </span>
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
