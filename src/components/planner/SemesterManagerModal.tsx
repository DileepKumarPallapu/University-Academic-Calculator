import React, { useState, useEffect } from 'react';
import { X, Calendar, Save } from 'lucide-react';
import type { PlannerSemester } from '../../types/academicCompanion';

interface SemesterManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  semesterToEdit: PlannerSemester | null;
  onSaveSemester: (data: {
    semesterNumber: number;
    title: string;
    academicYear?: string;
    isCurrent: boolean;
    isArchived: boolean;
    notes?: string;
  }) => void;
}

export const SemesterManagerModal: React.FC<SemesterManagerModalProps> = ({
  isOpen,
  onClose,
  semesterToEdit,
  onSaveSemester,
}) => {
  const [semesterNumber, setSemesterNumber] = useState<number>(1);
  const [title, setTitle] = useState<string>('');
  const [academicYear, setAcademicYear] = useState<string>('');
  const [isCurrent, setIsCurrent] = useState<boolean>(true);
  const [isArchived, setIsArchived] = useState<boolean>(false);
  const [notes, setNotes] = useState<string>('');

  useEffect(() => {
    if (semesterToEdit) {
      setSemesterNumber(semesterToEdit.semesterNumber);
      setTitle(semesterToEdit.title);
      setAcademicYear(semesterToEdit.academicYear || '');
      setIsCurrent(semesterToEdit.isCurrent);
      setIsArchived(semesterToEdit.isArchived);
      setNotes(semesterToEdit.notes || '');
    } else {
      setSemesterNumber(1);
      setTitle('Semester 1');
      setAcademicYear('');
      setIsCurrent(true);
      setIsArchived(false);
      setNotes('');
    }
  }, [semesterToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSemester({
      semesterNumber: Number(semesterNumber) || 1,
      title: title.trim() || `Semester ${semesterNumber}`,
      academicYear: academicYear.trim() || undefined,
      isCurrent,
      isArchived,
      notes: notes.trim() || undefined,
    });
    onClose();
  };

  const handleSemesterNumberChange = (num: number) => {
    setSemesterNumber(num);
    if (!title || title.startsWith('Semester ')) {
      setTitle(`Semester ${num}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-lg">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white">
                {semesterToEdit ? 'Edit Semester' : 'Create New Semester'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Organize your subjects, study tasks, and exam timeline.
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
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Semester Number
              </label>
              <select
                value={semesterNumber}
                onChange={(e) => handleSemesterNumberChange(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                  <option key={num} value={num}>
                    Semester {num}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Academic Year (Optional)
              </label>
              <input
                type="text"
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                placeholder="e.g. 2024-2025"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Semester Title / Name *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Semester 5 - Autumn"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Personal Notes (Optional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Goals, target SGPA, core focus areas for this term..."
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="space-y-2 pt-1">
            <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={isCurrent}
                onChange={(e) => {
                  setIsCurrent(e.target.checked);
                  if (e.target.checked) setIsArchived(false);
                }}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
              />
              <span>Set as current active semester</span>
            </label>

            {semesterToEdit && (
              <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isArchived}
                  onChange={(e) => {
                    setIsArchived(e.target.checked);
                    if (e.target.checked) setIsCurrent(false);
                  }}
                  className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-slate-300"
                />
                <span>Archive this semester (keeps subjects and past records safe)</span>
              </label>
            )}
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
              {semesterToEdit ? 'Save Changes' : 'Create Semester'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
