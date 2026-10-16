import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  FileText,
  FileSpreadsheet,
  Presentation,
  Image as ImageIcon,
  AlertCircle,
  CheckCircle2,
  Tag,
  Loader2,
} from 'lucide-react';
import type { StandardVaultCategory, VaultFolder, VaultDocumentMetadata } from '../../types/vault';
import { STANDARD_VAULT_CATEGORIES } from '../../types/vault';
import { saveDocument, formatFileSize, MAX_FILE_SIZE_BYTES } from '../../services/vaultStorage';

interface FileUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  profileId: string;
  existingSubjects?: string[];
  folders?: VaultFolder[];
  onUploadSuccess: (doc: VaultDocumentMetadata) => void;
}

export const FileUploadModal: React.FC<FileUploadModalProps> = ({
  isOpen,
  onClose,
  profileId,
  existingSubjects = [],
  folders = [],
  onUploadSuccess,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [semester, setSemester] = useState<string>('');
  const [subjectName, setSubjectName] = useState<string>('');
  const [category, setCategory] = useState<StandardVaultCategory | string>('Lecture Notes');
  const [tagsInput, setTagsInput] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [statusText, setStatusText] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isDragOver, setIsDragOver] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileSelection = (file: File) => {
    setErrorMsg('');
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setErrorMsg(
        `File size (${formatFileSize(file.size)}) exceeds local limit of ${formatFileSize(
          MAX_FILE_SIZE_BYTES
        )}.`
      );
      setSelectedFile(null);
      return;
    }
    setSelectedFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelection(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setErrorMsg('Please select a file to upload.');
      return;
    }

    setIsUploading(true);
    setUploadProgress(20);
    setStatusText('Reading file into local storage...');

    try {
      const parsedTags = tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      setUploadProgress(50);
      setStatusText('Extracting searchable text from document...');

      const result = await saveDocument(profileId, selectedFile, {
        semester: semester.trim() || undefined,
        subjectName: subjectName.trim() || undefined,
        category,
        tags: parsedTags,
        notes: notes.trim() || undefined,
      });

      setUploadProgress(100);
      setStatusText('Saved securely in browser IndexedDB!');

      setTimeout(() => {
        setIsUploading(false);
        onUploadSuccess(result);
        onClose();
      }, 400);
    } catch (err: any) {
      setIsUploading(false);
      setErrorMsg(err.message || 'Failed to save document.');
    }
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return <FileText className="w-8 h-8 text-rose-500" />;
    if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext || ''))
      return <ImageIcon className="w-8 h-8 text-blue-500" />;
    if (['pptx', 'ppt'].includes(ext || ''))
      return <Presentation className="w-8 h-8 text-amber-500" />;
    if (['xlsx', 'xls', 'csv'].includes(ext || ''))
      return <FileSpreadsheet className="w-8 h-8 text-emerald-500" />;
    return <FileText className="w-8 h-8 text-indigo-500" />;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-xl w-full max-h-[92vh] flex flex-col border border-gray-100 dark:border-gray-700 animate-in fade-in zoom-in-95 duration-200 my-6">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Upload Document to Vault
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Stored 100% locally in your browser&apos;s IndexedDB. Supported: PDF, DOCX, PPTX, PNG, JPG.
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isUploading}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {errorMsg && (
            <div className="p-3 bg-rose-50 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Drag & Drop File Picker */}
          {!selectedFile ? (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`p-8 border-2 border-dashed rounded-2xl text-center cursor-pointer transition flex flex-col items-center justify-center gap-3 ${
                isDragOver
                  ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20'
                  : 'border-gray-300 dark:border-gray-600 hover:border-indigo-400 dark:hover:border-indigo-500 bg-gray-50/50 dark:bg-gray-750/50'
              }`}
            >
              <div className="p-3 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-2xl">
                <Upload className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-800 dark:text-gray-200">
                  Click to select or drag and drop your file here
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  PDF, DOCX, PPTX, Images (JPG, PNG, WEBP), Text (TXT, MD) up to 25MB
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".pdf,.docx,.doc,.pptx,.ppt,.xlsx,.xls,.png,.jpg,.jpeg,.webp,.txt,.md,.csv,.json"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    handleFileSelection(e.target.files[0]);
                  }
                }}
              />
            </div>
          ) : (
            <div className="p-4 bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 rounded-2xl flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                {getFileIcon(selectedFile.name)}
                <div className="min-w-0">
                  <div className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                    {selectedFile.name}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {formatFileSize(selectedFile.size)} &bull; {selectedFile.type || 'Document'}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedFile(null)}
                className="text-xs font-semibold text-rose-600 hover:underline shrink-0"
              >
                Change File
              </button>
            </div>
          )}

          {/* Category / Folder & Semester */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                Category / Folder *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm"
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
                Semester (Optional)
              </label>
              <select
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm"
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
              Subject Name (Optional)
            </label>
            <input
              type="text"
              list="vault-subjects-list"
              value={subjectName}
              onChange={(e) => setSubjectName(e.target.value)}
              placeholder="e.g. Operating Systems or Engineering Mathematics"
              className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm"
            />
            {existingSubjects.length > 0 && (
              <datalist id="vault-subjects-list">
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
              placeholder="e.g. unit 2, formula sheet, important"
              className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
              Personal Notes / Description
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Important remarks or reminders regarding this document..."
              className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm"
            />
          </div>

          {/* Upload Progress Bar */}
          {isUploading && (
            <div className="p-4 bg-gray-50 dark:bg-gray-750 rounded-xl space-y-2 border border-gray-200 dark:border-gray-700">
              <div className="flex justify-between text-xs text-gray-600 dark:text-gray-300 font-semibold">
                <span className="flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                  {statusText}
                </span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-600 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-3 border-t border-gray-100 dark:border-gray-700">
            <button
              type="button"
              disabled={isUploading}
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!selectedFile || isUploading}
              className="px-6 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl shadow-md shadow-indigo-500/20 transition flex items-center gap-2"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Upload & Save</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
