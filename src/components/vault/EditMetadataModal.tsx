import React, { useState } from 'react';
import { X, Save, AlertCircle, Tag } from 'lucide-react';
import type { VaultDocumentMetadata, VaultFolder, StandardVaultCategory } from '../../types/vault';
import { STANDARD_VAULT_CATEGORIES } from '../../types/vault';
import { updateDocumentMetadata } from '../../services/vaultStorage';

interface EditMetadataModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: VaultDocumentMetadata;
  profileId: string;
  existingSubjects?: string[];
  folders?: VaultFolder[];
  onUpdated: (updated: VaultDocumentMetadata) => void;
}

export const EditMetadataModal: React.FC<EditMetadataModalProps> = ({
  isOpen,
  onClose,
  document: doc,
  profileId,
  existingSubjects = [],
  folders = [],
  onUpdated,
}) => {
  // Separate base name and extension
  const ext = doc.fileExtension;
  const initialBaseName = doc.fileName.endsWith(`.${ext}`)
    ? doc.fileName.slice(0, -(ext.length + 1))
    : doc.fileName;

  const [baseName, setBaseName] = useState<string>(initialBaseName);
  const [semester, setSemester] = useState<string>(doc.semester || '');
  const [subjectName, setSubjectName] = useState<string>(doc.subjectName || '');
  const [category, setCategory] = useState<StandardVaultCategory | string>(doc.category);
  const [tagsInput, setTagsInput] = useState<string>(doc.tags.join(', '));
  const [notes, setNotes] = useState<string>(doc.notes || '');

  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!baseName.trim()) {
      setErrorMsg('File name cannot be empty.');
      return;
    }

    setIsSaving(true);
    setErrorMsg('');

    try {
      const finalFileName = ext ? `${baseName.trim()}.${ext}` : baseName.trim();
      const parsedTags = tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      const updated = await updateDocumentMetadata(profileId, doc.id, {
        fileName: finalFileName,
        semester: semester.trim() || undefined,
        subjectName: subjectName.trim() || undefined,
        category,
        tags: parsedTags,
        notes: notes.trim() || undefined,
      });

      if (updated) {
        onUpdated(updated);
        onClose();
      } else {
        setErrorMsg('Failed to update document metadata.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error saving changes.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-gray-100 dark:border-gray-700 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-700">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              Edit Document Details
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Update filename, subject, category, tags, and notes.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          {errorMsg && (
            <div className="p-3 bg-rose-50 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Filename with static extension */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
              File Name *
            </label>
            <div className="flex rounded-xl border border-gray-300 dark:border-gray-600 overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500">
              <input
                type="text"
                value={baseName}
                onChange={(e) => setBaseName(e.target.value)}
                className="flex-1 px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-0 focus:outline-none"
                required
              />
              {ext && (
                <span className="px-3 py-2 bg-gray-100 dark:bg-gray-600 text-gray-500 dark:text-gray-300 text-xs font-mono flex items-center border-l border-gray-300 dark:border-gray-600">
                  .{ext}
                </span>
              )}
            </div>
          </div>

          {/* Category & Semester */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                Category / Folder
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <optgroup label="Standard Categories">
                  {STANDARD_VAULT_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </optgroup>
                {folders.length > 0 && (
                  <optgroup label="Custom Folders">
                    {folders.map((f) => (
                      <option key={f.id} value={f.name}>
                        {f.name}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                Semester
              </label>
              <select
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">General / Unassigned</option>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                  <option key={s} value={`Semester ${s}`}>
                    Semester {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Subject Name */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
              Subject Name
            </label>
            <input
              type="text"
              list="edit-subjects-list"
              value={subjectName}
              onChange={(e) => setSubjectName(e.target.value)}
              placeholder="e.g. Operating Systems"
              className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            {existingSubjects.length > 0 && (
              <datalist id="edit-subjects-list">
                {existingSubjects.map((s, idx) => (
                  <option key={idx} value={s} />
                ))}
              </datalist>
            )}
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-gray-400" />
              <span>Tags (Comma-separated)</span>
            </label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="e.g. unit 2, formula sheet"
              className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
              Notes / Remarks
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Personal notes..."
              className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-gray-100 dark:border-gray-700">
            <button
              type="button"
              disabled={isSaving}
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
