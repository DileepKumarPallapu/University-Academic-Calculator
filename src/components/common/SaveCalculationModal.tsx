import React, { useState, useEffect } from 'react';
import { Bookmark, Check, X, User, ChevronDown, RefreshCw } from 'lucide-react';
import { useProfile } from '../../context/ProfileContext';
import type { CalculationType } from '../../types/profile';

interface SaveCalculationModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: CalculationType;
  defaultTitle: string;
  resultValue: string;
  resultSummary: string;
  inputs: Record<string, any>;
  semester?: number | string;
  regulation?: string;
  existingCalcId?: string | null;
  onSaved?: (savedCalcId: string) => void;
}

export const SaveCalculationModal: React.FC<SaveCalculationModalProps> = ({
  isOpen,
  onClose,
  type,
  defaultTitle,
  resultValue,
  resultSummary,
  inputs,
  semester,
  regulation,
  existingCalcId,
  onSaved,
}) => {
  const { profiles, activeProfile, switchProfile, saveCalculation } = useProfile();
  const [title, setTitle] = useState(defaultTitle);
  const [selectedProfileId, setSelectedProfileId] = useState(activeProfile.id);
  const [saveMode, setSaveMode] = useState<'update' | 'new'>(existingCalcId ? 'update' : 'new');
  const [isSaving, setIsSaving] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTitle(defaultTitle);
      setSelectedProfileId(activeProfile.id);
      setSaveMode(existingCalcId ? 'update' : 'new');
      setIsSuccess(false);
      setIsSaving(false);
    }
  }, [isOpen, defaultTitle, activeProfile.id, existingCalcId]);

  if (!isOpen) return null;

  const handleProfileSwitch = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newId = e.target.value;
    setSelectedProfileId(newId);
    await switchProfile(newId);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSaving(true);
    try {
      const calcIdToUse = saveMode === 'update' && existingCalcId ? existingCalcId : undefined;
      const saved = await saveCalculation({
        id: calcIdToUse,
        type,
        title: title.trim(),
        resultValue,
        resultSummary,
        inputs,
        semester,
        regulation,
        isFavorite: false,
      });

      setIsSuccess(true);
      if (onSaved) {
        onSaved(saved.id);
      }
      setTimeout(() => {
        setIsSuccess(false);
        onClose();
      }, 1200);
    } catch (err) {
      console.error('Failed to save calculation', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="save-calc-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 dark:bg-black/60 backdrop-blur-sm animate-appleFadeIn"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-[var(--surface)] border border-[var(--border-primary)] shadow-2xl p-6 sm:p-7 flex flex-col gap-5 text-[var(--text-primary)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-secondary)] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-black dark:bg-white text-white dark:text-black flex items-center justify-center shadow-xs">
              <Bookmark className="w-5 h-5 fill-current" />
            </div>
            <div>
              <h3 id="save-calc-modal-title" className="text-base font-bold tracking-tight text-[var(--text-primary)]">
                Save Calculation
              </h3>
              <p className="text-xs text-[var(--text-secondary)]">
                Keep in your profile to reopen or review anytime
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} className="flex flex-col gap-4">
          {/* Active Profile Indicator / Switcher */}
          <div className="rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-primary)] p-3.5 flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-[var(--text-secondary)] uppercase tracking-wider text-[10px]">
                Saving to Profile
              </span>
              <span className="text-[11px] text-[var(--accent)] font-medium">
                {activeProfile.degree || 'B.Tech'} • {activeProfile.degreePathway.toUpperCase()}
              </span>
            </div>

            <div className="flex items-center gap-2 mt-0.5">
              <User className="w-4 h-4 text-[var(--text-secondary)] shrink-0" />
              {profiles.length > 1 ? (
                <div className="relative flex-1">
                  <select
                    value={selectedProfileId}
                    onChange={handleProfileSwitch}
                    className="apple-input h-9 text-xs font-semibold py-0 pr-8 w-full cursor-pointer"
                  >
                    {profiles.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} {p.rollNumber ? `(${p.rollNumber})` : ''}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-3 text-[var(--text-tertiary)] pointer-events-none" />
                </div>
              ) : (
                <span className="text-sm font-semibold text-[var(--text-primary)]">
                  {activeProfile.name || 'Primary Student'}
                </span>
              )}
            </div>
          </div>

          {/* Title Input */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="save-calc-title" className="text-xs font-semibold text-[var(--text-primary)]">
              Calculation Title
            </label>
            <input
              id="save-calc-title"
              type="text"
              required
              maxLength={120}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. SGPA — Semester 5"
              className="apple-input h-11 text-sm font-medium"
            />
          </div>

          {/* Result Preview Card */}
          <div className="p-3.5 rounded-xl border border-[var(--border-secondary)] bg-[var(--surface)] flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--text-secondary)]">
                {type.toUpperCase()} Result
              </span>
              <span className="text-xs text-[var(--text-secondary)] mt-0.5">
                {resultSummary}
              </span>
            </div>
            <div className="text-lg font-bold text-[var(--text-primary)] tabular-nums font-mono">
              {resultValue}
            </div>
          </div>

          {/* Update vs Save As New if previously loaded */}
          {existingCalcId && (
            <div className="flex items-center gap-2 pt-1 text-xs">
              <button
                type="button"
                onClick={() => setSaveMode('update')}
                className={`flex-1 py-2 px-3 rounded-xl border text-center font-medium transition-all ${
                  saveMode === 'update'
                    ? 'border-[var(--text-primary)] bg-[var(--bg-tertiary)] font-bold text-[var(--text-primary)]'
                    : 'border-[var(--border-primary)] text-[var(--text-secondary)]'
                }`}
              >
                Update Existing
              </button>
              <button
                type="button"
                onClick={() => setSaveMode('new')}
                className={`flex-1 py-2 px-3 rounded-xl border text-center font-medium transition-all ${
                  saveMode === 'new'
                    ? 'border-[var(--text-primary)] bg-[var(--bg-tertiary)] font-bold text-[var(--text-primary)]'
                    : 'border-[var(--border-primary)] text-[var(--text-secondary)]'
                }`}
              >
                Save as New Copy
              </button>
            </div>
          )}

          {/* Success Banner */}
          {isSuccess && (
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg p-2.5 animate-appleFadeIn">
              <Check className="w-4 h-4" />
              <span>Calculation saved successfully to {activeProfile.name}!</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[var(--border-secondary)]">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="apple-btn-secondary text-xs h-10 px-4"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || !title.trim()}
              className="apple-btn-primary text-xs h-10 px-5 gap-1.5 font-semibold"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>{saveMode === 'update' ? 'Save Changes' : 'Save to Profile'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const SaveCalculationButton: React.FC<{
  type: CalculationType;
  defaultTitle: string;
  resultValue: string;
  resultSummary: string;
  inputs: Record<string, any>;
  semester?: number | string;
  regulation?: string;
  existingCalcId?: string | null;
  onSaved?: (savedCalcId: string) => void;
  className?: string;
}> = (props) => {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        className={`apple-btn-secondary text-xs h-[42px] px-3.5 gap-1.5 font-semibold cursor-pointer ${
          props.className || ''
        }`}
        title="Save calculation to your student profile"
        aria-label="Save calculation to student profile"
      >
        <Bookmark className="w-3.5 h-3.5 text-[var(--text-primary)]" />
        <span>Save</span>
      </button>

      <SaveCalculationModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        {...props}
      />
    </>
  );
};
