import React, { useState, useEffect } from 'react';
import { X, BookOpen, Save } from 'lucide-react';
import type {
  PlannedSubject,
  PreparationStatus,
  PlannedCourseStatus,
} from '../../types/academicCompanion';
import type { CourseCategoryType } from '../../types/credits';
import { sanitizeCourseTitle } from '../../services/catalogueStorage';

interface SubjectPlannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  semesterNumber: number;
  semesterId?: string;
  subjectToEdit: PlannedSubject | null;
  availableGrades: { grade: string; points: number }[];
  onSaveSubject: (data: {
    courseName: string;
    courseCode?: string;
    credits: number;
    category: CourseCategoryType;
    examDate?: string;
    preparationStatus: PreparationStatus;
    status: PlannedCourseStatus;
    targetGrade?: string;
    notes?: string;
    semester: number;
    semesterId?: string;
  }) => void;
}

const CATEGORIES: { value: CourseCategoryType; label: string }[] = [
  { value: 'programme_core', label: 'Programme Core' },
  { value: 'programme_elective', label: 'Programme Elective (PE)' },
  { value: 'open_elective', label: 'Open Elective (OE)' },
  { value: 'foundation', label: 'Foundation' },
  { value: 'independent_learning', label: 'Independent Learning' },
  { value: 'industry_interaction', label: 'Industry Interaction' },
  { value: 'professional_proficiency', label: 'Professional Proficiency' },
  { value: 'mandatory', label: 'Mandatory Course' },
  { value: 'custom', label: 'Custom' },
];

export const SubjectPlannerModal: React.FC<SubjectPlannerModalProps> = ({
  isOpen,
  onClose,
  semesterNumber,
  semesterId,
  subjectToEdit,
  availableGrades,
  onSaveSubject,
}) => {
  const [courseName, setCourseName] = useState('');
  const [courseCode, setCourseCode] = useState('');
  const [credits, setCredits] = useState<number>(3);
  const [category, setCategory] = useState<CourseCategoryType>('programme_core');
  const [examDate, setExamDate] = useState<string>('');
  const [preparationStatus, setPreparationStatus] = useState<PreparationStatus>('not_started');
  const [status, setStatus] = useState<PlannedCourseStatus>('planned');
  const [targetGrade, setTargetGrade] = useState<string>('S');
  const [notes, setNotes] = useState<string>('');

  useEffect(() => {
    if (subjectToEdit) {
      setCourseName(subjectToEdit.courseName);
      setCourseCode(subjectToEdit.courseCode || '');
      setCredits(subjectToEdit.plannedCredits || 3);
      setCategory(subjectToEdit.category || 'programme_core');
      setExamDate(subjectToEdit.examDate || '');
      setPreparationStatus(subjectToEdit.preparationStatus || 'not_started');
      setStatus(subjectToEdit.status || 'planned');
      setTargetGrade(subjectToEdit.targetGrade || 'S');
      setNotes(subjectToEdit.notes || '');
    } else {
      setCourseName('');
      setCourseCode('');
      setCredits(3);
      setCategory('programme_core');
      setExamDate('');
      setPreparationStatus('not_started');
      setStatus('planned');
      setTargetGrade(availableGrades[0]?.grade || 'S');
      setNotes('');
    }
  }, [subjectToEdit, isOpen, availableGrades]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseName.trim()) return;

    onSaveSubject({
      courseName: sanitizeCourseTitle(courseName),
      courseCode: courseCode.trim() ? courseCode.trim().toUpperCase() : undefined,
      credits: Number(credits) || 3,
      category,
      examDate: examDate.trim() || undefined,
      preparationStatus,
      status,
      targetGrade: targetGrade || undefined,
      notes: notes.trim() || undefined,
      semester: semesterNumber,
      semesterId,
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
                {subjectToEdit ? 'Edit Semester Subject' : 'Add Subject to Semester'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Track exam timeline, credits, and preparation status.
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
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Subject Name *
            </label>
            <input
              type="text"
              required
              value={courseName}
              onChange={(e) => setCourseName(e.target.value)}
              placeholder="e.g. Operating Systems"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
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
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Credits *
              </label>
              <input
                type="number"
                min="1"
                max="10"
                required
                value={credits}
                onChange={(e) => setCredits(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as CourseCategoryType)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Preparation Status
              </label>
              <select
                value={preparationStatus}
                onChange={(e) => setPreparationStatus(e.target.value as PreparationStatus)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="not_started">⚪ Not Started</option>
                <option value="in_progress">🟡 In Progress</option>
                <option value="revision">🔵 In Revision</option>
                <option value="ready">🟢 Exam Ready</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Exam Date (Optional)
              </label>
              <input
                type="date"
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Target Grade (Optional)
              </label>
              <select
                value={targetGrade}
                onChange={(e) => setTargetGrade(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {availableGrades.map((g) => (
                  <option key={g.grade} value={g.grade}>
                    Grade {g.grade} ({g.points} pts)
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Personal Notes (Optional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Important units, textbook references, lab exam notes..."
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
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
              {subjectToEdit ? 'Save Changes' : 'Add Subject'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
