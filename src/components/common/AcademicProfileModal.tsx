import React, { useState, useEffect } from 'react';
import { User, X, Check, Trash2, Edit3 } from 'lucide-react';
import { useStudentProfile, type StudentProfile } from '../../hooks/useStudentProfile';
import { REGULATIONS, type RegulationId } from '../../config/university';
import { ResetConfirmModal } from './ResetConfirmModal';

interface AcademicProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AcademicProfileModal: React.FC<AcademicProfileModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { profile, updateProfile, clearProfile } = useStudentProfile();
  const [formData, setFormData] = useState<StudentProfile>(profile);
  const [isEditing, setIsEditing] = useState<boolean>(!profile.name.trim());
  const [showClearConfirm, setShowClearConfirm] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setFormData(profile);
      setIsEditing(!profile.name.trim());
      setError(null);
      setSaveSuccess(false);
    }
  }, [isOpen, profile]);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('Student Name is required.');
      return;
    }
    setError(null);
    updateProfile(formData);
    setIsEditing(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  const handleConfirmClear = () => {
    clearProfile();
    setFormData({
      name: '',
      rollNumber: '',
      department: '',
      year: '',
      semester: '',
      regulation: '',
    });
    setIsEditing(true);
    setShowClearConfirm(false);
  };

  return (
    <>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-modal-title"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 dark:bg-black/60 backdrop-blur-sm animate-appleFadeIn"
        onClick={onClose}
      >
        <div
          className="w-full max-w-lg rounded-2xl bg-[var(--surface)] border border-[var(--border-primary)] shadow-2xl p-6 sm:p-7 flex flex-col gap-5 text-[var(--text-primary)]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[var(--border-secondary)] pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#1D1D1F] dark:bg-[#2C2C2E] border border-black/10 dark:border-white/10 flex items-center justify-center text-white">
                <User className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 id="profile-modal-title" className="text-lg font-bold tracking-tight text-[var(--text-primary)]">
                  Student Academic Profile
                </h2>
                <p className="text-xs text-[var(--text-secondary)]">
                  Saved locally on this device • Used across all calculators
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close profile modal"
              className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          {!isEditing && profile.name.trim() ? (
            /* View Mode */
            <div className="flex flex-col gap-4">
              <div className="rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-primary)] p-4 flex flex-col gap-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                    Student Name
                  </span>
                  <div className="text-[18px] font-bold text-[var(--text-primary)] mt-0.5">
                    {profile.name}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-[var(--border-secondary)] text-xs">
                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                      Register / Roll No
                    </span>
                    <div className="font-semibold text-[var(--text-primary)] mt-0.5">
                      {profile.rollNumber || '—'}
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                      Department
                    </span>
                    <div className="font-semibold text-[var(--text-primary)] mt-0.5">
                      {profile.department || '—'}
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                      Academic Year
                    </span>
                    <div className="font-semibold text-[var(--text-primary)] mt-0.5">
                      {profile.year || '—'}
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                      Semester
                    </span>
                    <div className="font-semibold text-[var(--text-primary)] mt-0.5">
                      {profile.semester || '—'}
                    </div>
                  </div>
                </div>

                {profile.regulation && (
                  <div className="pt-2 border-t border-[var(--border-secondary)] text-xs">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                      Regulation
                    </span>
                    <div className="font-semibold text-[var(--text-primary)] mt-0.5">
                      {REGULATIONS[profile.regulation as RegulationId]?.name || profile.regulation}
                    </div>
                  </div>
                )}
              </div>

              {saveSuccess && (
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg p-2.5">
                  <Check className="w-4 h-4" />
                  <span>Profile updated successfully!</span>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setShowClearConfirm(true)}
                  className="apple-btn-secondary text-xs h-10 px-3.5 gap-1.5 text-rose-600 hover:text-rose-700 hover:border-rose-300"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear Profile</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="apple-btn-primary text-xs h-10 px-4 gap-1.5"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit Profile</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Edit / Create Form */
            <form onSubmit={handleSave} className="flex flex-col gap-3.5">
              {error && (
                <div className="text-xs font-semibold text-[var(--danger)] bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-lg p-2.5">
                  {error}
                </div>
              )}

              <div className="flex flex-col gap-1">
                <label htmlFor="modal-student-name" className="text-xs font-semibold text-[var(--text-primary)]">
                  Student Name <span className="text-rose-500">*</span>
                </label>
                <input
                  id="modal-student-name"
                  type="text"
                  maxLength={100}
                  required
                  placeholder="e.g. Pallapu Dileep Kumar"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="apple-input h-11 text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label htmlFor="modal-student-roll" className="text-xs font-semibold text-[var(--text-primary)]">
                    Register / Roll Number
                  </label>
                  <input
                    id="modal-student-roll"
                    type="text"
                    maxLength={30}
                    placeholder="e.g. 21CS101 (optional)"
                    value={formData.rollNumber || ''}
                    onChange={(e) => setFormData({ ...formData, rollNumber: e.target.value })}
                    className="apple-input h-10 text-xs"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label htmlFor="modal-student-dept" className="text-xs font-semibold text-[var(--text-primary)]">
                    Department
                  </label>
                  <input
                    id="modal-student-dept"
                    type="text"
                    maxLength={40}
                    placeholder="e.g. CSE / ECE"
                    value={formData.department || ''}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="apple-input h-10 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="flex flex-col gap-1">
                  <label htmlFor="modal-student-year" className="text-xs font-semibold text-[var(--text-primary)]">
                    Year
                  </label>
                  <input
                    id="modal-student-year"
                    type="text"
                    maxLength={20}
                    placeholder="e.g. 3rd Year"
                    value={formData.year || ''}
                    onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                    className="apple-input h-10 text-xs"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label htmlFor="modal-student-sem" className="text-xs font-semibold text-[var(--text-primary)]">
                    Current Semester
                  </label>
                  <input
                    id="modal-student-sem"
                    type="text"
                    maxLength={20}
                    placeholder="e.g. Semester 5"
                    value={formData.semester || ''}
                    onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
                    className="apple-input h-10 text-xs"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label htmlFor="modal-student-reg" className="text-xs font-semibold text-[var(--text-primary)]">
                    Regulation
                  </label>
                  <select
                    id="modal-student-reg"
                    value={formData.regulation || 'VTR21'}
                    onChange={(e) => setFormData({ ...formData, regulation: e.target.value })}
                    className="apple-input h-10 text-xs cursor-pointer"
                  >
                    <option value="VTR21">VTR21</option>
                    <option value="VTR25">VTR25</option>
                    <option value="VTR18">VTR18</option>
                    <option value="VTR15">VTR15</option>
                  </select>
                </div>
              </div>

              <div className="text-[11px] text-[var(--text-tertiary)] pt-1">
                Student Name is required for official PDF reports and verification.
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-between pt-3 border-t border-[var(--border-secondary)]">
                {profile.name.trim() ? (
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="apple-btn-secondary text-xs h-10 px-4"
                  >
                    Cancel
                  </button>
                ) : (
                  <div />
                )}

                <button
                  type="submit"
                  className="apple-btn-primary text-xs h-10 px-5 gap-1.5 font-semibold"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Save Profile</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      <ResetConfirmModal
        isOpen={showClearConfirm}
        onClose={() => setShowClearConfirm(false)}
        onConfirm={handleConfirmClear}
        title="Clear student profile?"
        description="Are you sure you want to remove your saved academic profile from this device? You can enter details again anytime."
      />
    </>
  );
};
