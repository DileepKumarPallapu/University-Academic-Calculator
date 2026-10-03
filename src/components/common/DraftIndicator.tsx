import React, { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { ResetConfirmModal } from './ResetConfirmModal';

interface DraftIndicatorProps {
  hasDraft: boolean;
  onClear: () => void;
  className?: string;
}

export const DraftIndicator: React.FC<DraftIndicatorProps> = ({ hasDraft, onClear, className = '' }) => {
  const [showConfirm, setShowConfirm] = useState(false);

  if (!hasDraft) return null;

  return (
    <>
      <div className={`flex items-center justify-between text-xs text-[var(--text-secondary)] py-1.5 px-3 rounded-lg bg-[var(--surface)] border border-[var(--border-secondary)] no-print ${className}`}>
        <div className="flex items-center gap-1.5 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span>Draft saved locally</span>
        </div>
        <button
          type="button"
          onClick={() => setShowConfirm(true)}
          className="text-xs text-[var(--text-tertiary)] hover:text-rose-600 transition-colors cursor-pointer flex items-center gap-1"
        >
          <Trash2 className="w-3 h-3" />
          <span>Clear Draft</span>
        </button>
      </div>

      <ResetConfirmModal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={() => {
          setShowConfirm(false);
          onClear();
        }}
        title="Clear saved draft?"
        description="This will clear your locally stored form draft and reset all inputs."
        confirmLabel="Clear Draft"
        cancelLabel="Cancel"
      />
    </>
  );
};
