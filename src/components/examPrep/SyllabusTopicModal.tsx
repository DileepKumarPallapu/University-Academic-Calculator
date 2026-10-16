import React, { useState, useEffect } from 'react';
import { X, BookOpen, Save } from 'lucide-react';
import type { SyllabusTopic, TopicStatus, ExamDifficulty, ExamRecord } from '../../types/examPrep';
import { sanitizeCourseTitle } from '../../services/catalogueStorage';

interface SyllabusTopicModalProps {
  isOpen: boolean;
  onClose: () => void;
  topicToEdit: SyllabusTopic | null;
  defaultSubjectName?: string;
  exams: ExamRecord[];
  onSaveTopic: (data: {
    subjectName: string;
    unitNumber?: number;
    unitTitle?: string;
    title: string;
    difficulty: ExamDifficulty;
    estimatedHours: number;
    status: TopicStatus;
    revisionNotes?: string;
    examId?: string;
  }) => void;
}

export const SyllabusTopicModal: React.FC<SyllabusTopicModalProps> = ({
  isOpen,
  onClose,
  topicToEdit,
  defaultSubjectName = '',
  exams,
  onSaveTopic,
}) => {
  const [subjectName, setSubjectName] = useState('');
  const [unitNumber, setUnitNumber] = useState<string>('1');
  const [unitTitle, setUnitTitle] = useState('');
  const [title, setTitle] = useState('');
  const [difficulty, setDifficulty] = useState<ExamDifficulty>('moderate');
  const [estimatedHours, setEstimatedHours] = useState<number>(1.5);
  const [status, setStatus] = useState<TopicStatus>('not_started');
  const [revisionNotes, setRevisionNotes] = useState('');
  const [examId, setExamId] = useState('');

  useEffect(() => {
    if (topicToEdit) {
      setSubjectName(topicToEdit.subjectName);
      setUnitNumber(topicToEdit.unitNumber !== undefined ? String(topicToEdit.unitNumber) : '1');
      setUnitTitle(topicToEdit.unitTitle || '');
      setTitle(topicToEdit.title);
      setDifficulty(topicToEdit.difficulty || 'moderate');
      setEstimatedHours(topicToEdit.estimatedHours || 1.5);
      setStatus(topicToEdit.status || 'not_started');
      setRevisionNotes(topicToEdit.revisionNotes || '');
      setExamId(topicToEdit.examId || '');
    } else {
      setSubjectName(defaultSubjectName || (exams[0]?.subjectName || ''));
      setUnitNumber('1');
      setUnitTitle('');
      setTitle('');
      setDifficulty('moderate');
      setEstimatedHours(1.5);
      setStatus('not_started');
      setRevisionNotes('');
      setExamId(exams[0]?.id || '');
    }
  }, [topicToEdit, isOpen, defaultSubjectName, exams]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectName.trim() || !title.trim()) return;

    onSaveTopic({
      subjectName: sanitizeCourseTitle(subjectName),
      unitNumber: unitNumber.trim() ? parseInt(unitNumber, 10) : undefined,
      unitTitle: unitTitle.trim() || undefined,
      title: title.trim(),
      difficulty,
      estimatedHours: Math.max(0.5, Number(estimatedHours) || 1.5),
      status,
      revisionNotes: revisionNotes.trim() || undefined,
      examId: examId || undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-lg">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white">
                {topicToEdit ? 'Edit Syllabus Topic' : 'Add Syllabus Topic'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Track topic status, study hours, and revision notes.
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Subject Name *
            </label>
            <input
              type="text"
              required
              value={subjectName}
              onChange={(e) => setSubjectName(e.target.value)}
              placeholder="e.g. Operating Systems"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Unit Number (Optional)
              </label>
              <input
                type="number"
                min="1"
                max="20"
                value={unitNumber}
                onChange={(e) => setUnitNumber(e.target.value)}
                placeholder="e.g. 1"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Unit Title / Module (Optional)
              </label>
              <input
                type="text"
                value={unitTitle}
                onChange={(e) => setUnitTitle(e.target.value)}
                placeholder="e.g. Unit 1: Process Management"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Topic Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Semaphores and Producer-Consumer Problem"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Difficulty
              </label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as ExamDifficulty)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="easy">🟢 Easy</option>
                <option value="moderate">🟡 Moderate</option>
                <option value="hard">🟠 Hard</option>
                <option value="very_hard">🔴 Very Hard</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Est. Hours
              </label>
              <input
                type="number"
                step="0.5"
                min="0.5"
                max="20"
                value={estimatedHours}
                onChange={(e) => setEstimatedHours(parseFloat(e.target.value))}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TopicStatus)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="not_started">⚪ Not Started</option>
                <option value="learning">🔵 Learning</option>
                <option value="needs_revision">🟡 Needs Revision</option>
                <option value="completed">🟢 Completed</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Linked Exam (Optional)
            </label>
            <select
              value={examId}
              onChange={(e) => setExamId(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">-- No specific exam --</option>
              {exams.map((ex) => (
                <option key={ex.id} value={ex.id}>
                  {ex.subjectName} ({ex.examType.toUpperCase().replace(/_/g, ' ')})
                  {ex.examDate ? ` - ${ex.examDate}` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Revision Notes & High-Yield Summary (Optional)
            </label>
            <textarea
              rows={2}
              value={revisionNotes}
              onChange={(e) => setRevisionNotes(e.target.value)}
              placeholder="Important formulas, proof steps, past exam questions..."
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-2 font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              {topicToEdit ? 'Save Changes' : 'Add Topic'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
