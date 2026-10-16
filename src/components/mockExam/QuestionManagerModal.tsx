import React, { useState } from 'react';
import { X, Plus, Trash2, CheckCircle2, AlertCircle, HelpCircle } from 'lucide-react';
import type { BankQuestion, QuestionType, QuestionDifficulty, QuestionOption } from '../../types/mockExam';
import { validateQuestion } from '../../services/mockExamStorage';

interface QuestionManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (question: Omit<BankQuestion, 'id' | 'profileId' | 'createdAt' | 'updatedAt'>) => void;
  initialQuestion?: BankQuestion | null;
  existingSubjects?: string[];
}

export const QuestionManagerModal: React.FC<QuestionManagerModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialQuestion,
  existingSubjects = [],
}) => {
  const [subjectName, setSubjectName] = useState(initialQuestion?.subjectName || '');
  const [unitOrTopic, setUnitOrTopic] = useState(initialQuestion?.unitOrTopic || '');
  const [type, setType] = useState<QuestionType>(initialQuestion?.type || 'single_mcq');
  const [difficulty, setDifficulty] = useState<QuestionDifficulty>(
    initialQuestion?.difficulty || 'moderate'
  );
  const [marks, setMarks] = useState<number>(initialQuestion?.marks || 1);
  const [questionText, setQuestionText] = useState(initialQuestion?.questionText || '');

  // Options for MCQ
  const [options, setOptions] = useState<QuestionOption[]>(
    initialQuestion?.options && initialQuestion.options.length >= 2
      ? initialQuestion.options
      : [
          { id: 'opt_1', text: '' },
          { id: 'opt_2', text: '' },
          { id: 'opt_3', text: '' },
          { id: 'opt_4', text: '' },
        ]
  );
  const [correctOptionIndices, setCorrectOptionIndices] = useState<number[]>(
    initialQuestion?.correctOptionIndices || [0]
  );

  // True / False
  const [correctBoolean, setCorrectBoolean] = useState<boolean>(
    initialQuestion?.correctBoolean ?? true
  );

  // Model answer & explanation
  const [modelAnswer, setModelAnswer] = useState(initialQuestion?.modelAnswer || '');
  const [explanation, setExplanation] = useState(initialQuestion?.explanation || '');
  const [revisionNotes, setRevisionNotes] = useState(initialQuestion?.revisionNotes || '');

  const [errors, setErrors] = useState<string[]>([]);

  if (!isOpen) return null;

  const handleAddOption = () => {
    if (options.length >= 6) return;
    setOptions([...options, { id: `opt_${Date.now()}`, text: '' }]);
  };

  const handleRemoveOption = (indexToRemove: number) => {
    if (options.length <= 2) return;
    const newOptions = options.filter((_, idx) => idx !== indexToRemove);
    setOptions(newOptions);

    // Adjust selected indices
    const updatedIndices = correctOptionIndices
      .filter((idx) => idx !== indexToRemove)
      .map((idx) => (idx > indexToRemove ? idx - 1 : idx));
    setCorrectOptionIndices(updatedIndices.length > 0 ? updatedIndices : [0]);
  };

  const handleOptionTextChange = (index: number, text: string) => {
    const updated = [...options];
    updated[index].text = text;
    setOptions(updated);
  };

  const handleToggleOptionSelection = (index: number) => {
    if (type === 'single_mcq') {
      setCorrectOptionIndices([index]);
    } else {
      if (correctOptionIndices.includes(index)) {
        if (correctOptionIndices.length > 1) {
          setCorrectOptionIndices(correctOptionIndices.filter((i) => i !== index));
        }
      } else {
        setCorrectOptionIndices([...correctOptionIndices, index]);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const candidate: Partial<BankQuestion> = {
      subjectName: subjectName.trim(),
      unitOrTopic: unitOrTopic.trim(),
      type,
      difficulty,
      marks: Number(marks),
      questionText: questionText.trim(),
      options: type === 'single_mcq' || type === 'multiple_mcq' ? options : undefined,
      correctOptionIndices:
        type === 'single_mcq' || type === 'multiple_mcq' ? correctOptionIndices : undefined,
      correctBoolean: type === 'true_false' ? correctBoolean : undefined,
      modelAnswer: modelAnswer.trim() || undefined,
      explanation: explanation.trim() || undefined,
      revisionNotes: revisionNotes.trim() || undefined,
    };

    const validation = validateQuestion(candidate);
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    setErrors([]);
    onSave(candidate as Omit<BankQuestion, 'id' | 'profileId' | 'createdAt' | 'updatedAt'>);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col border border-gray-100 dark:border-gray-700 animate-in fade-in zoom-in-95 duration-200 my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {initialQuestion ? 'Edit Question' : 'Add Question to Bank'}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Store syllabus questions, answer keys, and revision explanations.
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
          {errors.length > 0 && (
            <div className="p-4 bg-rose-50 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-700 dark:text-rose-300 text-sm space-y-1">
              <div className="flex items-center gap-2 font-semibold">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Please fix the following:</span>
              </div>
              <ul className="list-disc list-inside space-y-0.5 text-xs pl-2">
                {errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Subject & Topic */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                Subject Name *
              </label>
              <input
                type="text"
                list="subjects-list"
                value={subjectName}
                onChange={(e) => setSubjectName(e.target.value)}
                placeholder="e.g. Data Structures & Algorithms"
                className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm"
                required
              />
              {existingSubjects.length > 0 && (
                <datalist id="subjects-list">
                  {existingSubjects.map((s, idx) => (
                    <option key={idx} value={s} />
                  ))}
                </datalist>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                Unit / Topic Name *
              </label>
              <input
                type="text"
                value={unitOrTopic}
                onChange={(e) => setUnitOrTopic(e.target.value)}
                placeholder="e.g. Unit 3: Binary Trees"
                className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm"
                required
              />
            </div>
          </div>

          {/* Type, Difficulty, Marks */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                Question Type *
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as QuestionType)}
                className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm"
              >
                <option value="single_mcq">Single MCQ</option>
                <option value="multiple_mcq">Multiple Choice MCQ</option>
                <option value="true_false">True / False</option>
                <option value="descriptive">Descriptive / Theory</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                Difficulty
              </label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as QuestionDifficulty)}
                className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm"
              >
                <option value="easy">Easy</option>
                <option value="moderate">Moderate</option>
                <option value="hard">Hard</option>
                <option value="very_hard">Very Hard</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                Marks *
              </label>
              <input
                type="number"
                min="0.5"
                step="0.5"
                value={marks}
                onChange={(e) => setMarks(parseFloat(e.target.value) || 1)}
                className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm"
                required
              />
            </div>
          </div>

          {/* Question Text */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
              Question Statement *
            </label>
            <textarea
              rows={3}
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              placeholder="Enter the full question text here..."
              className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm resize-y"
              required
            />
          </div>

          {/* MCQ Options */}
          {(type === 'single_mcq' || type === 'multiple_mcq') && (
            <div className="p-4 bg-gray-50 dark:bg-gray-750 rounded-xl border border-gray-200 dark:border-gray-700 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                  Answer Options & Correct Answer
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {type === 'single_mcq'
                    ? 'Click radio to pick correct option'
                    : 'Check all valid correct options'}
                </span>
              </div>

              <div className="space-y-2">
                {options.map((opt, idx) => {
                  const isSelected = correctOptionIndices.includes(idx);
                  return (
                    <div key={opt.id} className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleOptionSelection(idx)}
                        className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 border transition ${
                          isSelected
                            ? 'bg-emerald-600 border-emerald-600 text-white'
                            : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-transparent hover:border-emerald-400'
                        }`}
                        title={isSelected ? 'Marked as correct' : 'Click to mark as correct'}
                      >
                        <CheckCircle2 className="w-4 h-4 fill-current" />
                      </button>

                      <input
                        type="text"
                        value={opt.text}
                        onChange={(e) => handleOptionTextChange(idx, e.target.value)}
                        placeholder={`Option ${idx + 1}`}
                        className={`flex-1 px-3 py-1.5 rounded-lg border text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 ${
                          isSelected
                            ? 'border-emerald-500 dark:border-emerald-500'
                            : 'border-gray-300 dark:border-gray-600'
                        }`}
                      />

                      {options.length > 2 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveOption(idx)}
                          className="p-1.5 text-gray-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/20"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {options.length < 6 && (
                <button
                  type="button"
                  onClick={handleAddOption}
                  className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Another Option
                </button>
              )}
            </div>
          )}

          {/* True / False Selector */}
          {type === 'true_false' && (
            <div className="p-4 bg-gray-50 dark:bg-gray-750 rounded-xl border border-gray-200 dark:border-gray-700 space-y-2">
              <span className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                Correct Answer
              </span>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-800 dark:text-gray-200">
                  <input
                    type="radio"
                    name="tf-correct"
                    checked={correctBoolean === true}
                    onChange={() => setCorrectBoolean(true)}
                    className="w-4 h-4 text-emerald-600 focus:ring-emerald-500"
                  />
                  True
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-800 dark:text-gray-200">
                  <input
                    type="radio"
                    name="tf-correct"
                    checked={correctBoolean === false}
                    onChange={() => setCorrectBoolean(false)}
                    className="w-4 h-4 text-rose-600 focus:ring-rose-500"
                  />
                  False
                </label>
              </div>
            </div>
          )}

          {/* Descriptive Model Answer */}
          {type === 'descriptive' && (
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                Model Answer / Key Points for Self-Evaluation
              </label>
              <textarea
                rows={3}
                value={modelAnswer}
                onChange={(e) => setModelAnswer(e.target.value)}
                placeholder="Key bullet points or sample ideal answer students can compare against..."
                className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm"
              />
            </div>
          )}

          {/* Explanation & Revision Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <span>Explanation / Rationale</span>
                <HelpCircle className="w-3.5 h-3.5 text-gray-400" />
              </label>
              <textarea
                rows={2}
                value={explanation}
                onChange={(e) => setExplanation(e.target.value)}
                placeholder="Why this answer is correct..."
                className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                Quick Revision Tip / Formula
              </label>
              <textarea
                rows={2}
                value={revisionNotes}
                onChange={(e) => setRevisionNotes(e.target.value)}
                placeholder="Important memory hook or mnemonic..."
                className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm"
              />
            </div>
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
              className="px-6 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-500/20 transition"
            >
              {initialQuestion ? 'Save Changes' : 'Add to Question Bank'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
