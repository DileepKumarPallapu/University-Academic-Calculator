import React from 'react';
import { AlertCircle, RotateCcw, ShieldAlert } from 'lucide-react';

interface VaultErrorStateProps {
  errorMessage: string;
  onRetry: () => void;
}

export const VaultErrorState: React.FC<VaultErrorStateProps> = ({ errorMessage, onRetry }) => {
  return (
    <div className="rounded-3xl border-2 border-dashed border-rose-200 dark:border-rose-900/50 bg-[var(--surface)] p-8 sm:p-12 text-center space-y-4 max-w-xl mx-auto shadow-sm animate-in fade-in zoom-in-95 duration-200">
      <div className="w-16 h-16 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto shadow-sm">
        <ShieldAlert className="w-8 h-8" />
      </div>

      <div>
        <h3 className="text-lg font-bold text-[var(--text-primary)]">
          Unable to Access Academic Vault Storage
        </h3>
        <p className="text-xs text-[var(--text-secondary)] mt-1.5 max-w-md mx-auto leading-relaxed">
          The browser was unable to open your local device&apos;s IndexedDB repository. Your personal files remain preserved and have not been deleted.
        </p>
      </div>

      <div className="p-3 rounded-xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-900/30 text-xs text-rose-700 dark:text-rose-300 flex items-center justify-center gap-2 max-w-md mx-auto">
        <AlertCircle className="w-4 h-4 shrink-0" />
        <span className="font-mono text-[11px] truncate">{errorMessage}</span>
      </div>

      <div className="pt-2">
        <button
          onClick={onRetry}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-500/20 inline-flex items-center gap-2 transition-transform transform active:scale-95 cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Retry Loading Vault</span>
        </button>
      </div>
    </div>
  );
};
