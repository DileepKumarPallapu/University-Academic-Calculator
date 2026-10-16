import React, { useState, useMemo } from 'react';
import { X, Search, CheckSquare, Square, AlertCircle } from 'lucide-react';
import type { BankQuestion, MockExamConfig, QuestionDifficulty } from '../../types/mockExam';

interface MockExamBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: Omit<MockExamConfig, 'id' | 'profileId' | 'createdAt' | 'updatedAt'>) => void;
  availableQuestions: BankQuestion[];
  initialConfig?: MockExamConfig | null;
}

export const MockExamBuilderModal: React.FC<MockExamBuilderModalProps> = ({
  isOpen,
  onClose,
  onSave,
  availableQuestions,
  initialConfig,
}) => {
  const [title, setTitle] = useState(initialConfig?.title || '');
  const [description, setDescription] = useState(initialConfig?.description || '');
  const [durationMinutes, setDurationMinutes] = useState(initialConfig?.durationMinutes || 60);
  const [passPercentage, setPassPercentage] = useState(initialConfig?.passPercentage || 40);
  const [enableNegativeMarking, setEnableNegativeMarking] = useState(
    initialConfig?.enableNegativeMarking || false
  );
  const [negativeMarkingValue, setNegativeMarkingValue] = useState(
    initialConfig?.negativeMarkingValue || 0.25
  );

  // Selected question IDs
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>(
    initialConfig?.questionIds || []
  );

  // Filters for selector table
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Extract distinct subjects
  const distinctSubjects = useMemo(() => {
    const set = new Set<string>();
    availableQuestions.forEach((q) => set.add(q.subjectName));
    return Array.from(set).sort();
  }, [availableQuestions]);

  // Filtered available questions
  const filteredQuestions = useMemo(() => {
    return availableQuestions.filter((q) => {
      if (subjectFilter !== 'all' && q.subjectName !== subjectFilter) return false;
      if (difficultyFilter !== 'all' && q.difficulty !== difficultyFilter) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesText = q.questionText.toLowerCase().includes(query);
        const matchesSubj = q.subjectName.toLowerCase().includes(query);
        const matchesTopic = q.unitOrTopic.toLowerCase().includes(query);
        if (!matchesText && !matchesSubj && !matchesTopic) return false;
      }
      return true;
    });
  }, [availableQuestions, subjectFilter, difficultyFilter, searchQuery]);

  // Compute total marks from selected questions
  const selectedQuestions = useMemo(() => {
    return availableQuestions.filter((q) => selectedQuestionIds.includes(q.id));
  }, [availableQuestions, selectedQuestionIds]);

  const totalCalculatedMarks = useMemo(() => {
    return selectedQuestions.reduce((acc, q) => acc + q.marks, 0);
  }, [selectedQuestions]);

  if (!isOpen) return null;

  const handleToggleQuestion = (id: string) => {
    if (selectedQuestionIds.includes(id)) {
      setSelectedQuestionIds(selectedQuestionIds.filter((qid) => qid !== id));
    } else {
      setSelectedQuestionIds([...selectedQuestionIds, id]);
    }
  };

  const handleSelectAllFiltered = () => {
    const filteredIds = filteredQuestions.map((q) => q.id);
    const combined = Array.from(new Set([...selectedQuestionIds, ...filteredIds]));
    setSelectedQuestionIds(combined);
  };

  const handleDeselectAllFiltered = () => {
    const filteredIdsSet = new Set(filteredQuestions.map((q) => q.id));
    setSelectedQuestionIds(selectedQuestionIds.filter((id) => !filteredIdsSet.has(id)));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      setErrorMsg('Please specify an exam title.');
      return;
    }

    if (durationMinutes <= 0) {
      setErrorMsg('Exam duration must be at least 1 minute.');
      return;
    }

    if (selectedQuestionIds.length === 0) {
      setErrorMsg('Please select at least one question for this mock exam.');
      return;
    }

    setErrorMsg('');

    // Extract subjects represented
    const subjectsIncluded = Array.from(
      new Set(selectedQuestions.map((q) => q.subjectName))
    );

    const config: Omit<MockExamConfig, 'id' | 'profileId' | 'createdAt' | 'updatedAt'> = {
      title: title.trim(),
      description: description.trim() || undefined,
      subjects: subjectsIncluded,
      durationMinutes: Number(durationMinutes),
      totalMarks: totalCalculatedMarks,
      passPercentage: Number(passPercentage),
      questionIds: selectedQuestionIds,
      enableNegativeMarking,
      negativeMarkingValue: enableNegativeMarking ? Number(negativeMarkingValue) : 0,
      difficultyFilters:
        difficultyFilter !== 'all' ? [difficultyFilter as QuestionDifficulty] : undefined,
    };

    onSave(config);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col border border-gray-100 dark:border-gray-700 animate-in fade-in zoom-in-95 duration-200 my-6">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {initialConfig ? 'Edit Mock Exam' : 'Configure New Mock Exam'}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Assemble questions into timed practice exams with custom test rules.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {errorMsg && (
            <div className="p-3 bg-rose-50 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-700 dark:text-rose-300 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Exam Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                Exam Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Unit 1 & 2 Practice Test"
                className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                Description / Notes
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional test description or syllabus scope"
                className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm"
              />
            </div>
          </div>

          {/* Duration & Passing Marks */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                Duration (Minutes) *
              </label>
              <input
                type="number"
                min="1"
                max="300"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(parseInt(e.target.value, 10) || 60)}
                className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                Pass Mark Threshold (%)
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={passPercentage}
                onChange={(e) => setPassPercentage(parseInt(e.target.value, 10) || 40)}
                className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm"
              />
            </div>
          </div>

          {/* Negative Marking Configuration */}
          <div className="p-4 bg-gray-50 dark:bg-gray-750 rounded-xl border border-gray-200 dark:border-gray-700 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                  Enable Negative Marking
                </span>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Deduct marks only for attempted incorrect objective answers.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={enableNegativeMarking}
                  onChange={(e) => setEnableNegativeMarking(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            {enableNegativeMarking && (
              <div className="pt-2 border-t border-gray-200 dark:border-gray-700 flex items-center gap-4">
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  Penalty per wrong answer (marks):
                </label>
                <input
                  type="number"
                  min="0.1"
                  step="0.05"
                  value={negativeMarkingValue}
                  onChange={(e) => setNegativeMarkingValue(parseFloat(e.target.value) || 0.25)}
                  className="w-24 px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                />
              </div>
            )}
          </div>

          {/* Question Selector Section */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                  Select Exam Questions
                </span>
                <span className="ml-2 text-xs font-medium text-indigo-600 dark:text-indigo-400">
                  {selectedQuestionIds.length} questions ({totalCalculatedMarks} total marks)
                </span>
              </div>

              {filteredQuestions.length > 0 && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSelectAllFiltered}
                    className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
                  >
                    Select Filtered ({filteredQuestions.length})
                  </button>
                  <span className="text-gray-300 dark:text-gray-600">|</span>
                  <button
                    type="button"
                    onClick={handleDeselectAllFiltered}
                    className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 font-medium"
                  >
                    Clear Filtered
                  </button>
                </div>
              )}
            </div>

            {/* Filters Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search questions or topics..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <select
                value={subjectFilter}
                onChange={(e) => setSubjectFilter(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="all">All Subjects ({distinctSubjects.length})</option>
                {distinctSubjects.map((s, idx) => (
                  <option key={idx} value={s}>
                    {s}
                  </option>
                ))}
              </select>

              <select
                value={difficultyFilter}
                onChange={(e) => setDifficultyFilter(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="all">All Difficulties</option>
                <option value="easy">Easy</option>
                <option value="moderate">Moderate</option>
                <option value="hard">Hard</option>
                <option value="very_hard">Very Hard</option>
              </select>
            </div>

            {/* Questions List */}
            {availableQuestions.length === 0 ? (
              <div className="p-6 text-center border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl text-gray-500 dark:text-gray-400 text-xs">
                No questions exist in your Question Bank yet. Please add questions to your bank before creating a mock exam.
              </div>
            ) : filteredQuestions.length === 0 ? (
              <div className="p-4 text-center text-xs text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-xl">
                No questions match your current filter query.
              </div>
            ) : (
              <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden divide-y divide-gray-100 dark:divide-gray-700 max-h-56 overflow-y-auto">
                {filteredQuestions.map((q) => {
                  const isChecked = selectedQuestionIds.includes(q.id);
                  return (
                    <div
                      key={q.id}
                      onClick={() => handleToggleQuestion(q.id)}
                      className={`p-3 flex items-start gap-3 cursor-pointer transition ${
                        isChecked
                          ? 'bg-indigo-50/70 dark:bg-indigo-950/40'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-750'
                      }`}
                    >
                      <button
                        type="button"
                        className="mt-0.5 text-indigo-600 dark:text-indigo-400 shrink-0"
                      >
                        {isChecked ? (
                          <CheckSquare className="w-4 h-4" />
                        ) : (
                          <Square className="w-4 h-4 text-gray-400" />
                        )}
                      </button>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded">
                            {q.subjectName}
                          </span>
                          <span className="text-[10px] text-gray-500 dark:text-gray-400">
                            {q.unitOrTopic}
                          </span>
                          <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 ml-auto">
                            {q.marks} {q.marks === 1 ? 'Mark' : 'Marks'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-900 dark:text-gray-200 line-clamp-2">
                          {q.questionText}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={availableQuestions.length === 0}
              className="px-6 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl shadow-md shadow-indigo-500/20 transition"
            >
              {initialConfig ? 'Save Changes' : 'Create Mock Exam'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
