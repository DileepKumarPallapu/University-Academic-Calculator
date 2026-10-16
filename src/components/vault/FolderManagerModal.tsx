import React, { useState } from 'react';
import { X, FolderPlus, Folder, Trash2, Plus, AlertCircle } from 'lucide-react';
import type { VaultFolder } from '../../types/vault';
import { createVaultFolder, deleteVaultFolder } from '../../services/vaultStorage';

interface FolderManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  profileId: string;
  folders: VaultFolder[];
  onFoldersChanged: (folders: VaultFolder[]) => void;
}

const COLOR_PRESETS = [
  '#4f46e5', // indigo
  '#2563eb', // blue
  '#059669', // emerald
  '#d97706', // amber
  '#dc2626', // rose
  '#7c3aed', // purple
  '#db2777', // pink
  '#475569', // slate
];

export const FolderManagerModal: React.FC<FolderManagerModalProps> = ({
  isOpen,
  onClose,
  profileId,
  folders,
  onFoldersChanged,
}) => {
  const [newFolderName, setNewFolderName] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<string>(COLOR_PRESETS[0]);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newFolderName.trim();
    if (!trimmed) {
      setErrorMsg('Folder name cannot be empty.');
      return;
    }

    if (folders.some((f) => f.name.toLowerCase() === trimmed.toLowerCase())) {
      setErrorMsg('A folder with this name already exists.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const created = await createVaultFolder(profileId, trimmed, selectedColor);
      onFoldersChanged([...folders, created]);
      setNewFolderName('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create folder.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteFolder = async (folderId: string, folderName: string) => {
    if (
      window.confirm(
        `Are you sure you want to delete folder "${folderName}"? Documents in this folder will remain in your vault.`
      )
    ) {
      await deleteVaultFolder(profileId, folderId);
      onFoldersChanged(folders.filter((f) => f.id !== folderId));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6 border border-gray-100 dark:border-gray-700 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <FolderPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white">
                Custom Categories & Folders
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Organize your course documents by subject, club, or semester.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Add Folder Form */}
        <form onSubmit={handleCreateFolder} className="py-4 space-y-3">
          {errorMsg && (
            <div className="p-2.5 bg-rose-50 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-700 dark:text-rose-300 text-xs flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
              New Folder Name
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. Major Project, IEEE Papers..."
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                className="flex-1 px-3 py-2 text-xs rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="submit"
                disabled={isSubmitting || !newFolderName.trim()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold disabled:opacity-50 transition flex items-center gap-1 shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create</span>
              </button>
            </div>
          </div>

          {/* Color Picker */}
          <div>
            <span className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5">
              Folder Color:
            </span>
            <div className="flex items-center gap-2">
              {COLOR_PRESETS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setSelectedColor(color)}
                  className={`w-6 h-6 rounded-full transition-transform ${
                    selectedColor === color
                      ? 'scale-125 ring-2 ring-offset-2 ring-indigo-500 dark:ring-offset-gray-800'
                      : 'hover:scale-110'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
        </form>

        {/* Existing Custom Folders */}
        <div className="pt-3 border-t border-gray-100 dark:border-gray-700 space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Your Custom Folders ({folders.length})
          </span>

          {folders.length === 0 ? (
            <div className="p-4 text-center text-xs text-gray-400 border border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
              No custom folders created yet. Standard categories (Syllabus, Notes, Assignments, etc.) are always available.
            </div>
          ) : (
            <div className="max-h-48 overflow-y-auto space-y-1.5 divide-y divide-gray-50 dark:divide-gray-750">
              {folders.map((f) => (
                <div
                  key={f.id}
                  className="flex items-center justify-between p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-750 transition"
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-3.5 h-3.5 rounded-md shrink-0"
                      style={{ backgroundColor: f.color || '#4f46e5' }}
                    />
                    <Folder className="w-4 h-4 text-gray-400" />
                    <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                      {f.name}
                    </span>
                  </div>

                  <button
                    onClick={() => handleDeleteFolder(f.id, f.name)}
                    className="p-1 text-gray-400 hover:text-rose-600 rounded transition"
                    title="Delete Folder"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end pt-4 mt-2">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
