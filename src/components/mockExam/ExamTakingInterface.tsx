import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Clock,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Send,
  HelpCircle,
} from 'lucide-react';
import type { ActiveExamSession, QuestionUserAnswer, BankQuestion } from '../../types/mockExam';
import {
  updateAnswerInSession,
  saveActiveExamSession,
} from '../../services/mockExamStorage';

interface ExamTakingInterfaceProps {
  session: ActiveExamSession;
  onSubmitExam: (finalSession: ActiveExamSession) => void;
  onExitWithoutSubmitting: () => void;
}

export const ExamTakingInterface: React.FC<ExamTakingInterfaceProps> = ({
  session: initialSession,
  onSubmitExam,
  onExitWithoutSubmitting,
}) => {
  const [session, setSession] = useState<ActiveExamSession>(initialSession);
  const [currentIndex, setCurrentIndex] = useState<number>(initialSession.currentQuestionIndex || 0);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(initialSession.remainingSeconds);
  const [showSubmitModal, setShowSubmitModal] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Keep ref to avoid stale closures in timers
  const sessionRef = useRef<ActiveExamSession>(session);
  sessionRef.current = session;

  const currentQuestion: BankQuestion | undefined = session.questions[currentIndex];
  const currentAnswer: QuestionUserAnswer | undefined = currentQuestion
    ? session.answers[currentQuestion.id]
    : undefined;

  const handleTriggerSubmit = useCallback(() => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    const updated = {
      ...sessionRef.current,
      remainingSeconds,
      isSubmitted: true,
    };
    saveActiveExamSession(updated);
    onSubmitExam(updated);
  }, [isSubmitting, remainingSeconds, onSubmitExam]);

  // Countdown timer effect
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      const left = Math.max(0, Math.ceil((sessionRef.current.targetEndTime - now) / 1000));
      setRemainingSeconds(left);

      // Periodically update remaining time in active session
      if (left % 5 === 0 || left === 0) {
        const updated = {
          ...sessionRef.current,
          remainingSeconds: left,
          currentQuestionIndex: currentIndex,
        };
        saveActiveExamSession(updated);
      }

      if (left <= 0) {
        clearInterval(timer);
        handleTriggerSubmit();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [currentIndex, handleTriggerSubmit]);

  // Answer handler
  const handleUpdateAnswer = (updates: Partial<QuestionUserAnswer>) => {
    if (!currentQuestion || session.isSubmitted) return;

    const profileId = session.profileId;
    const questionId = currentQuestion.id;
    const updatedSession = updateAnswerInSession(profileId, questionId, updates);

    if (updatedSession) {
      setSession(updatedSession);
    } else {
      // Local fallback
      const prevAns = session.answers[questionId] || {
        questionId,
        isMarkedForReview: false,
        timeSpentSeconds: 0,
        isAnswered: false,
      };
      const mergedAns = { ...prevAns, ...updates };

      let hasAns = false;
      if (mergedAns.selectedOptionIndices && mergedAns.selectedOptionIndices.length > 0) {
        hasAns = true;
      } else if (typeof mergedAns.selectedBoolean === 'boolean') {
        hasAns = true;
      } else if (mergedAns.descriptiveText && mergedAns.descriptiveText.trim().length > 0) {
        hasAns = true;
      }
      mergedAns.isAnswered = hasAns;

      const newAnswers = { ...session.answers, [questionId]: mergedAns };
      const newSession = { ...session, answers: newAnswers };
      setSession(newSession);
      saveActiveExamSession(newSession);
    }
  };

  const handleSelectOption = (optIdx: number) => {
    if (!currentQuestion) return;

    if (currentQuestion.type === 'single_mcq') {
      handleUpdateAnswer({ selectedOptionIndices: [optIdx] });
    } else if (currentQuestion.type === 'multiple_mcq') {
      const existing = currentAnswer?.selectedOptionIndices || [];
      let updated: number[];
      if (existing.includes(optIdx)) {
        updated = existing.filter((i) => i !== optIdx);
      } else {
        updated = [...existing, optIdx];
      }
      handleUpdateAnswer({ selectedOptionIndices: updated });
    }
  };

  const handleToggleBoolean = (val: boolean) => {
    handleUpdateAnswer({ selectedBoolean: val });
  };

  const handleToggleReview = () => {
    if (!currentAnswer) return;
    handleUpdateAnswer({ isMarkedForReview: !currentAnswer.isMarkedForReview });
  };

  const handleClearResponse = () => {
    if (!currentQuestion) return;
    handleUpdateAnswer({
      selectedOptionIndices: [],
      selectedBoolean: undefined,
      descriptiveText: '',
      isAnswered: false,
    });
  };

  // Timer formatting
  const formatTime = (totalSec: number) => {
    const hours = Math.floor(totalSec / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    const seconds = totalSec % 60;

    if (hours > 0) {
      return `${hours}:${minutes < 10 ? '0' : ''}${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    }
    return `${minutes < 10 ? '0' : ''}${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  // Palette counts
  let answeredCount = 0;
  let markedCount = 0;
  session.questions.forEach((q) => {
    const ans = session.answers[q.id];
    if (ans?.isAnswered) answeredCount++;
    if (ans?.isMarkedForReview) markedCount++;
  });
  const unansweredCount = session.questions.length - answeredCount;
  const isTimeUrgent = remainingSeconds <= 300 && remainingSeconds > 0;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col font-sans">
      {/* Top Practice Notice Bar */}
      <div className="bg-amber-500/15 dark:bg-amber-500/20 border-b border-amber-300 dark:border-amber-700/50 px-4 py-1.5 text-center text-xs font-medium text-amber-800 dark:text-amber-300 flex items-center justify-center gap-1.5">
        <HelpCircle className="w-3.5 h-3.5 shrink-0" />
        <span>
          Practice & Revision Environment — Independent self-assessment simulator (not official university exam).
        </span>
      </div>

      {/* Main Sticky Header */}
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-gray-800/95 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 px-4 sm:px-8 py-3.5 shadow-sm flex items-center justify-between gap-4">
        <div>
          <h1 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white truncate max-w-md">
            {session.examTitle}
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Question {currentIndex + 1} of {session.questions.length}
            {session.enableNegativeMarking && (
              <span className="ml-2 text-rose-600 dark:text-rose-400 font-medium">
                Negative marking: -{session.negativeMarkingValue}
              </span>
            )}
          </p>
        </div>

        {/* Timer & Submit */}
        <div className="flex items-center gap-4">
          <div
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl border font-mono font-bold text-sm sm:text-base ${
              isTimeUrgent
                ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400 animate-pulse'
                : 'bg-gray-100 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-800 dark:text-gray-200'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>{formatTime(remainingSeconds)}</span>
          </div>

          <button
            onClick={() => setShowSubmitModal(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-md shadow-indigo-500/20 flex items-center gap-1.5 transition"
          >
            <Send className="w-4 h-4" />
            <span>Finish & Submit</span>
          </button>
        </div>
      </header>

      {/* Main Exam Content Area */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left: Current Question Area (3 cols) */}
        <div className="lg:col-span-3 flex flex-col justify-between bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm min-h-[500px]">
          {currentQuestion ? (
            <div className="space-y-6">
              {/* Question Meta Tags */}
              <div className="flex items-center justify-between flex-wrap gap-2 pb-4 border-b border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-xs font-semibold rounded-lg">
                    {currentQuestion.subjectName}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {currentQuestion.unitOrTopic}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 capitalize">
                    {currentQuestion.difficulty}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-1 rounded">
                    {currentQuestion.marks} {currentQuestion.marks === 1 ? 'Mark' : 'Marks'}
                  </span>
                  <button
                    onClick={handleToggleReview}
                    className={`inline-flex items-center gap-1 text-xs px-3 py-1 rounded-lg border font-medium transition ${
                      currentAnswer?.isMarkedForReview
                        ? 'bg-purple-100 border-purple-300 text-purple-700 dark:bg-purple-900/40 dark:border-purple-700 dark:text-purple-300'
                        : 'border-gray-200 dark:border-gray-600 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                  >
                    <Bookmark className="w-3.5 h-3.5 fill-current" />
                    <span>{currentAnswer?.isMarkedForReview ? 'Marked for Review' : 'Review Later'}</span>
                  </button>
                </div>
              </div>

              {/* Question Text */}
              <div className="text-base sm:text-lg font-medium text-gray-900 dark:text-gray-100 leading-relaxed whitespace-pre-wrap">
                <span className="font-bold text-gray-400 mr-2">Q{currentIndex + 1}.</span>
                {currentQuestion.questionText}
              </div>

              {/* Answer Input Controls */}
              <div className="pt-2">
                {/* Single or Multiple MCQ */}
                {(currentQuestion.type === 'single_mcq' ||
                  currentQuestion.type === 'multiple_mcq') && (
                  <div className="space-y-3">
                    <p className="text-xs text-gray-400 font-medium">
                      {currentQuestion.type === 'single_mcq'
                        ? 'Select one option:'
                        : 'Select all applicable options:'}
                    </p>
                    {currentQuestion.options?.map((opt, idx) => {
                      const isSelected =
                        currentAnswer?.selectedOptionIndices?.includes(idx) ?? false;
                      return (
                        <div
                          key={opt.id || idx}
                          onClick={() => handleSelectOption(idx)}
                          className={`p-3.5 rounded-xl border flex items-center gap-3 cursor-pointer transition ${
                            isSelected
                              ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-400 dark:border-indigo-600 text-gray-900 dark:text-white font-medium shadow-sm'
                              : 'bg-white dark:bg-gray-750 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                          }`}
                        >
                          <div
                            className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 border text-xs font-semibold ${
                              isSelected
                                ? 'bg-indigo-600 text-white border-indigo-600'
                                : 'border-gray-300 dark:border-gray-600 text-gray-500'
                            }`}
                          >
                            {String.fromCharCode(65 + idx)}
                          </div>
                          <span className="text-sm">{opt.text}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* True / False */}
                {currentQuestion.type === 'true_false' && (
                  <div className="space-y-3">
                    <p className="text-xs text-gray-400 font-medium">Select True or False:</p>
                    <div className="flex gap-4">
                      <button
                        type="button"
                        onClick={() => handleToggleBoolean(true)}
                        className={`flex-1 py-4 rounded-xl border font-bold text-sm transition ${
                          currentAnswer?.selectedBoolean === true
                            ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500 text-emerald-700 dark:text-emerald-300 shadow-sm'
                            : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                      >
                        True
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleBoolean(false)}
                        className={`flex-1 py-4 rounded-xl border font-bold text-sm transition ${
                          currentAnswer?.selectedBoolean === false
                            ? 'bg-rose-50 dark:bg-rose-950/50 border-rose-500 text-rose-700 dark:text-rose-300 shadow-sm'
                            : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                      >
                        False
                      </button>
                    </div>
                  </div>
                )}

                {/* Descriptive Answer */}
                {currentQuestion.type === 'descriptive' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-400 font-medium">
                        Draft your descriptive explanation below (self-evaluated after submission):
                      </p>
                      <span className="text-xs text-gray-400">
                        {currentAnswer?.descriptiveText?.length || 0} characters
                      </span>
                    </div>
                    <textarea
                      rows={7}
                      value={currentAnswer?.descriptiveText || ''}
                      onChange={(e) => handleUpdateAnswer({ descriptiveText: e.target.value })}
                      placeholder="Type your notes or bullet-point solution here..."
                      className="w-full p-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 resize-y"
                    />
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-400">No question selected.</div>
          )}

          {/* Navigation & Clear Actions Footer */}
          <div className="pt-6 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between flex-wrap gap-4 mt-8">
            <div className="flex items-center gap-2">
              <button
                disabled={currentIndex === 0}
                onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                className="inline-flex items-center gap-1 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-750 disabled:opacity-40 transition"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous</span>
              </button>

              <button
                disabled={currentIndex === session.questions.length - 1}
                onClick={() =>
                  setCurrentIndex((prev) => Math.min(session.questions.length - 1, prev + 1))
                }
                className="inline-flex items-center gap-1 px-4 py-2 rounded-xl bg-gray-900 dark:bg-gray-100 hover:bg-gray-800 dark:hover:bg-white text-white dark:text-gray-900 text-xs sm:text-sm font-semibold disabled:opacity-40 transition"
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {currentAnswer?.isAnswered && (
              <button
                onClick={handleClearResponse}
                className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-rose-600 transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Clear Response</span>
              </button>
            )}
          </div>
        </div>

        {/* Right: Question Palette & Overview (1 col) */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
              Question Palette
            </h3>

            {/* Quick Status Badges */}
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50">
                <div className="font-bold text-emerald-700 dark:text-emerald-300 text-base">
                  {answeredCount}
                </div>
                <div className="text-[10px] text-emerald-600 dark:text-emerald-400">Answered</div>
              </div>
              <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/50">
                <div className="font-bold text-purple-700 dark:text-purple-300 text-base">
                  {markedCount}
                </div>
                <div className="text-[10px] text-purple-600 dark:text-purple-400">Review</div>
              </div>
              <div className="p-2 rounded-xl bg-gray-100 dark:bg-gray-700/60 border border-gray-200 dark:border-gray-600">
                <div className="font-bold text-gray-700 dark:text-gray-300 text-base">
                  {unansweredCount}
                </div>
                <div className="text-[10px] text-gray-500 dark:text-gray-400">Pending</div>
              </div>
            </div>

            {/* Grid of question buttons */}
            <div className="grid grid-cols-5 gap-2 max-h-72 overflow-y-auto p-1">
              {session.questions.map((q, idx) => {
                const ans = session.answers[q.id];
                const isCurrent = idx === currentIndex;
                const isAns = ans?.isAnswered;
                const isRev = ans?.isMarkedForReview;

                let colorClasses =
                  'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600';
                if (isRev && isAns) {
                  colorClasses =
                    'bg-purple-600 text-white border-purple-700 ring-2 ring-emerald-400';
                } else if (isRev) {
                  colorClasses = 'bg-purple-600 text-white border-purple-700';
                } else if (isAns) {
                  colorClasses = 'bg-emerald-600 text-white border-emerald-700';
                }

                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentIndex(idx)}
                    className={`h-9 rounded-xl border text-xs font-bold transition flex items-center justify-center relative ${colorClasses} ${
                      isCurrent
                        ? 'ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-gray-800 scale-105'
                        : 'hover:opacity-85'
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="pt-3 border-t border-gray-100 dark:border-gray-700 text-[11px] space-y-1.5 text-gray-500 dark:text-gray-400">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-600"></div>
                <span>Answered</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-purple-600"></div>
                <span>Marked for Review</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-gray-200 dark:bg-gray-700 border border-gray-300"></div>
                <span>Unanswered</span>
              </div>
            </div>

            {/* Exit without submitting option */}
            <div className="pt-2">
              <button
                onClick={onExitWithoutSubmitting}
                className="w-full text-center text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 py-1"
              >
                Save & Exit to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Submit Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6 border border-gray-100 dark:border-gray-700 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-amber-500 mb-3">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Submit Practice Exam?
              </h3>
            </div>

            <p className="text-xs text-gray-600 dark:text-gray-300 mb-4">
              Are you sure you want to finish this attempt? Once submitted, your answers will be
              graded and recorded in your local history.
            </p>

            {/* Overview summary */}
            <div className="bg-gray-50 dark:bg-gray-750 p-4 rounded-xl border border-gray-200 dark:border-gray-700 space-y-2 text-xs mb-6">
              <div className="flex justify-between text-gray-600 dark:text-gray-300">
                <span>Total Questions:</span>
                <span className="font-semibold">{session.questions.length}</span>
              </div>
              <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-semibold">
                <span>Answered:</span>
                <span>{answeredCount}</span>
              </div>
              <div className="flex justify-between text-rose-500 font-semibold">
                <span>Unanswered / Skipped:</span>
                <span>{unansweredCount}</span>
              </div>
              <div className="flex justify-between text-purple-600 dark:text-purple-400">
                <span>Marked for Review:</span>
                <span>{markedCount}</span>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setShowSubmitModal(false)}
                className="px-4 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition"
              >
                Back to Exam
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleTriggerSubmit}
                className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl shadow-md transition flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isSubmitting ? 'Submitting...' : 'Confirm & Grade'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
