import React, { useState, useEffect } from 'react';
import { X, Calendar, Save } from 'lucide-react';
import type { ExamRecord, ExamType, ExamDifficulty } from '../../types/examPrep';
import { sanitizeCourseTitle } from '../../services/catalogueStorage';

interface ExamManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  examToEdit: ExamRecord | null;
  knownSubjects?: string[];
  onSaveExam: (data: {
    subjectName: string;
    courseCode?: string;
    examType: ExamType;
    examDate?: string;
    examTime?: string;
    difficulty: ExamDifficulty;
    syllabusSummary?: string;
    preparationProgress: number;
    notes?: string;
  }) => void;
}

const EXAM_TYPES: { value: ExamType; label: string }[] = [
  { value: 'mid_term_1', label: 'Mid-Term 1 (Internal Assessment)' },
  { value: 'mid_term_2', label: 'Mid-Term 2 (Internal Assessment)' },
  { value: 'end_sem', label: 'End-Semester University Exam' },
  { value: 'model', label: 'Model Examination' },
  { value: 'lab', label: 'Practical / Lab Exam' },
  { value: 'quiz', label: 'Quiz / Surprise Test' },
  { value: 'other', label: 'Other Exam' },
];

export const ExamManagerModal: React.FC<ExamManagerModalProps> = ({
  isOpen,
  onClose,
  examToEdit,
  knownSubjects = [],
  onSaveExam,
}) => {
  const [subjectName, setSubjectName] = useState('');
  const [courseCode, setCourseCode] = useState('');
  const [examType, setExamType] = useState<ExamType>('end_sem');
  const [examDate, setExamDate] = useState('');
  const [examTime, setExamTime] = useState('');
  const [difficulty, setDifficulty] = useState<ExamDifficulty>('moderate');
  const [preparationProgress, setPreparationProgress] = useState<number>(0);
  const [syllabusSummary, setSyllabusSummary] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (examToEdit) {
      setSubjectName(examToEdit.subjectName);
      setCourseCode(examToEdit.courseCode || '');
      setExamType(examToEdit.examType || 'end_sem');
      setExamDate(examToEdit.examDate || '');
      setExamTime(examToEdit.examTime || '');
      setDifficulty(examToEdit.difficulty || 'moderate');
      setPreparationProgress(examToEdit.preparationProgress || 0);
      setSyllabusSummary(examToEdit.syllabusSummary || '');
      setNotes(examToEdit.notes || '');
    } else {
      setSubjectName(knownSubjects[0] || '');
      setCourseCode('');
      setExamType('end_sem');
      setExamDate('');
      setExamTime('09:30');
      setDifficulty('moderate');
      setPreparationProgress(0);
      setSyllabusSummary('');
      setNotes('');
    }
  }, [examToEdit, isOpen, knownSubjects]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectName.trim()) return;

    onSaveExam({
      subjectName: sanitizeCourseTitle(subjectName),
      courseCode: courseCode.trim() ? courseCode.trim().toUpperCase() : undefined,
      examType,
      examDate: examDate.trim() || undefined,
      examTime: examTime.trim() || undefined,
      difficulty,
      syllabusSummary: syllabusSummary.trim() || undefined,
      preparationProgress: Math.max(0, Math.min(100, Number(preparationProgress) || 0)),
      notes: notes.trim() || undefined,
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
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white">
                {examToEdit ? 'Edit Exam Record' : 'Add New Exam'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Track countdowns, exam schedule, syllabus, and preparation progress.
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
              list="exam-known-subjects"
              value={subjectName}
              onChange={(e) => setSubjectName(e.target.value)}
              placeholder="e.g. Operating Systems"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {knownSubjects.length > 0 && (
              <datalist id="exam-known-subjects">
                {knownSubjects.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Course Code (Optional)
              </label>
              <input
                type="text"
                value={courseCode}
                onChange={(e) => setCourseCode(e.target.value)}
                placeholder="e.g. 10210CS101"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 uppercase"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Exam Type
              </label>
              <select
                value={examType}
                onChange={(e) => setExamType(e.target.value as ExamType)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {EXAM_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Exam Date (Optional)
              </label>
              <input
                type="date"
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <span className="text-[10px] text-slate-500">Leave blank if date is not announced yet.</span>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Exam Time (Optional)
              </label>
              <input
                type="time"
                value={examTime}
                onChange={(e) => setExamTime(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Difficulty Rating
              </label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as ExamDifficulty)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="easy">🟢 Easy (High confidence)</option>
                <option value="moderate">🟡 Moderate (Standard workload)</option>
                <option value="hard">🟠 Hard (Challenging material)</option>
                <option value="very_hard">🔴 Very Hard (High priority / Complex)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Preparation Progress: {preparationProgress}%
              </label>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={preparationProgress}
                onChange={(e) => setPreparationProgress(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600 mt-2"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Syllabus Summary or Units Covered (Optional)
            </label>
            <input
              type="text"
              value={syllabusSummary}
              onChange={(e) => setSyllabusSummary(e.target.value)}
              placeholder="e.g. Units 1, 2, and 3 (Threads, CPU Scheduling, Synchronization)"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Personal Notes & Exam Hall Instructions (Optional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Allowed calculator models, formula sheet allowed, hall ticket number..."
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
              {examToEdit ? 'Save Changes' : 'Add Exam'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
