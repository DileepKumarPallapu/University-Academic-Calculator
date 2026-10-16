import React, { useState, useEffect } from 'react';
import {
  X,
  Download,
  Trash2,
  Edit2,
  FileText,
  FileSpreadsheet,
  Presentation,
  Image as ImageIcon,
  Calendar,
  Tag,
  Search,
} from 'lucide-react';
import type { VaultDocumentMetadata } from '../../types/vault';
import {
  getDocumentBlob,
  downloadDocumentFile,
  formatFileSize,
} from '../../services/vaultStorage';

interface DocumentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: VaultDocumentMetadata;
  profileId: string;
  onEditMetadata: (doc: VaultDocumentMetadata) => void;
  onDeleteDocument: (docId: string) => void;
}

export const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({
  isOpen,
  onClose,
  document: doc,
  profileId,
  onEditMetadata,
  onDeleteDocument,
}) => {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showExtractedText, setShowExtractedText] = useState<boolean>(false);

  useEffect(() => {
    let activeUrl: string | null = null;
    let isCancelled = false;

    async function loadBlob() {
      setIsLoading(true);
      const blob = await getDocumentBlob(profileId, doc.id);
      if (isCancelled || !blob) {
        setIsLoading(false);
        return;
      }

      const url = URL.createObjectURL(blob);
      activeUrl = url;
      setBlobUrl(url);

      if (['txt', 'md', 'csv', 'json'].includes(doc.fileExtension)) {
        try {
          const text = await blob.text();
          if (!isCancelled) setTextContent(text);
        } catch {
          // ignore
        }
      }

      if (!isCancelled) setIsLoading(false);
    }

    loadBlob();

    return () => {
      isCancelled = true;
      if (activeUrl) {
        URL.revokeObjectURL(activeUrl);
      }
    };
  }, [profileId, doc.id, doc.fileExtension]);

  if (!isOpen) return null;

  const handleDownload = () => {
    downloadDocumentFile(profileId, doc.id);
  };

  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to delete "${doc.fileName}" from your vault?`)) {
      onDeleteDocument(doc.id);
      onClose();
    }
  };

  const isImage = ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(doc.fileExtension);
  const isPdf = doc.fileExtension === 'pdf';
  const isText = ['txt', 'md', 'csv', 'json'].includes(doc.fileExtension);
  const isOffice = ['docx', 'doc', 'pptx', 'ppt', 'xlsx', 'xls'].includes(doc.fileExtension);

  const getFormatIcon = () => {
    if (isPdf) return <FileText className="w-6 h-6 text-rose-500" />;
    if (isImage) return <ImageIcon className="w-6 h-6 text-blue-500" />;
    if (['pptx', 'ppt'].includes(doc.fileExtension))
      return <Presentation className="w-6 h-6 text-amber-500" />;
    if (['xlsx', 'xls'].includes(doc.fileExtension))
      return <FileSpreadsheet className="w-6 h-6 text-emerald-500" />;
    return <FileText className="w-6 h-6 text-indigo-500" />;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-md overflow-hidden">
      <div className="bg-white dark:bg-gray-850 rounded-3xl shadow-2xl w-full max-w-5xl h-[92vh] flex flex-col border border-gray-100 dark:border-gray-700 animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-100 dark:border-gray-700 gap-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 bg-gray-50 dark:bg-gray-750 rounded-2xl shrink-0">
              {getFormatIcon()}
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white truncate">
                {doc.fileName}
              </h2>
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 flex-wrap">
                <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                  {doc.category}
                </span>
                <span>&bull;</span>
                <span>{formatFileSize(doc.fileSize)}</span>
                {doc.semester && (
                  <>
                    <span>&bull;</span>
                    <span>{doc.semester}</span>
                  </>
                )}
                {doc.subjectName && (
                  <>
                    <span>&bull;</span>
                    <span>{doc.subjectName}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Action Header Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleDownload}
              className="p-2 sm:px-3 sm:py-1.5 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 rounded-xl text-xs font-semibold hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition flex items-center gap-1.5"
              title="Download Original File"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Download</span>
            </button>

            <button
              onClick={() => {
                onClose();
                onEditMetadata(doc);
              }}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-750 transition"
              title="Edit Details"
            >
              <Edit2 className="w-4 h-4" />
            </button>

            <button
              onClick={handleDelete}
              className="p-2 text-gray-400 hover:text-rose-600 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
              title="Delete Document"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            <div className="h-6 w-px bg-gray-200 dark:bg-gray-700" />

            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-750 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Sub-bar: Tags & Notes Toggle */}
        <div className="px-6 py-2.5 bg-gray-50/80 dark:bg-gray-800/80 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between flex-wrap gap-2 text-xs shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            {doc.tags.length > 0 ? (
              doc.tags.map((tag, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 font-medium flex items-center gap-1 text-[11px]"
                >
                  <Tag className="w-3 h-3 text-gray-400" />
                  {tag}
                </span>
              ))
            ) : (
              <span className="text-gray-400 italic">No tags assigned</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {doc.hasTextExtraction && (
              <button
                onClick={() => setShowExtractedText(!showExtractedText)}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                  showExtractedText
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600'
                }`}
              >
                <Search className="w-3.5 h-3.5" />
                <span>{showExtractedText ? 'Hide Extracted Text' : 'View Extracted Text'}</span>
              </button>
            )}

            <span className="text-gray-400 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {new Date(doc.uploadedAt).toLocaleDateString()}
            </span>
          </div>
        </div>

        {/* Content Preview Canvas */}
        <div className="flex-1 bg-gray-100 dark:bg-gray-900/60 p-4 sm:p-6 overflow-auto flex items-center justify-center relative">
          {isLoading ? (
            <div className="text-center space-y-3">
              <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-gray-500 dark:text-gray-400">Loading document from IndexedDB...</p>
            </div>
          ) : showExtractedText ? (
            /* Searchable Extracted Text Viewer */
            <div className="w-full h-full bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 overflow-y-auto space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-700">
                <span className="font-bold text-gray-900 dark:text-white uppercase tracking-wider text-[11px]">
                  Locally Extracted Searchable Text
                </span>
                <span className="text-gray-400 text-[10px]">
                  {doc.extractedText?.length || 0} characters indexed
                </span>
              </div>
              <p className="whitespace-pre-wrap text-gray-800 dark:text-gray-200 leading-relaxed">
                {doc.extractedText || 'No text content found in document.'}
              </p>
            </div>
          ) : isImage && blobUrl ? (
            /* Image Viewer */
            <div className="w-full h-full flex items-center justify-center p-2">
              <img
                src={blobUrl}
                alt={doc.fileName}
                className="max-h-full max-w-full object-contain rounded-xl shadow-lg border border-gray-200 dark:border-gray-700"
              />
            </div>
          ) : isPdf && blobUrl ? (
            /* Embedded PDF Viewer */
            <div className="w-full h-full rounded-2xl overflow-hidden shadow-md border border-gray-200 dark:border-gray-700 bg-white">
              <object
                data={blobUrl}
                type="application/pdf"
                className="w-full h-full"
              >
                <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-3 bg-white dark:bg-gray-800">
                  <FileText className="w-12 h-12 text-rose-500" />
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    PDF Preview is ready
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm">
                    If your browser does not support embedded PDF frames, you can open or download it directly.
                  </p>
                  <button
                    onClick={handleDownload}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold shadow flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download PDF File</span>
                  </button>
                </div>
              </object>
            </div>
          ) : isText && textContent ? (
            /* Plain Text Viewer */
            <div className="w-full h-full bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 overflow-y-auto font-mono text-xs text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed">
              {textContent}
            </div>
          ) : (
            /* Office Docs or Unsupported Preview Fallback */
            <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 sm:p-12 border border-gray-200 dark:border-gray-700 text-center max-w-md w-full shadow-lg space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto shadow-sm">
                {getFormatIcon()}
              </div>

              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white truncate">
                  {doc.fileName}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {formatFileSize(doc.fileSize)} &bull; {doc.fileExtension.toUpperCase()} Document
                </p>
              </div>

              <div className="p-3.5 bg-gray-50 dark:bg-gray-750 rounded-xl text-xs text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 leading-relaxed">
                {isOffice
                  ? 'Office files (Word, PowerPoint, Excel) cannot be safely rendered inside standard browser frames without third-party cloud services. Your original file is safely stored on your device.'
                  : 'Direct browser preview is not supported for this file format.'}
              </div>

              <button
                onClick={handleDownload}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-500/20 flex items-center justify-center gap-2 transition"
              >
                <Download className="w-4 h-4" />
                <span>Download Original File</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer Notes (if any) */}
        {doc.notes && (
          <div className="p-4 bg-white dark:bg-gray-850 border-t border-gray-100 dark:border-gray-700 text-xs shrink-0">
            <span className="font-bold text-gray-700 dark:text-gray-300 block mb-1">
              Personal Notes:
            </span>
            <p className="text-gray-600 dark:text-gray-400">{doc.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
};
