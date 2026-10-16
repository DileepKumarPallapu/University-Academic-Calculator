import React from 'react';
import { Trash2, AlertTriangle, X } from 'lucide-react';
import type { VaultDocumentMetadata } from '../../types/vault';
import { formatFileSize } from '../../services/vaultStorage';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: VaultDocumentMetadata | null;
  onConfirm: () => void;
  isDeleting: boolean;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  onClose,
  document,
  onConfirm,
  isDeleting,
}) => {
  if (!isOpen || !document) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[var(--surface)] text-[var(--text-primary)] rounded-2xl max-w-md w-full shadow-2xl border border-[var(--border-primary)] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-5 border-b border-[var(--border-secondary)] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <Trash2 className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-[var(--text-primary)]">
              Delete Document?
            </h3>
          </div>
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="p-1.5 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="p-3.5 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border-secondary)] space-y-1.5">
            <div className="text-sm font-bold text-[var(--text-primary)] truncate" title={document.fileName}>
              {document.fileName}
            </div>
            <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
              <span>{document.category}</span>
              <span>&bull;</span>
              <span>{formatFileSize(document.fileSize)}</span>
              {document.subjectName && (
                <>
                  <span>&bull;</span>
                  <span className="truncate">{document.subjectName}</span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-50/70 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 text-xs text-rose-700 dark:text-rose-300">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
            <span>
              This will permanently remove the file blob and its metadata from your device&apos;s local browser IndexedDB. This action cannot be undone.
            </span>
          </div>
        </div>

        <div className="p-4 bg-[var(--surface-secondary)] border-t border-[var(--border-secondary)] flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 text-xs font-semibold rounded-xl border border-[var(--border-primary)] bg-[var(--surface)] text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-4 py-2 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-700 text-white shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50"
          >
            {isDeleting ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Deleting...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                <span>Delete Permanently</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
