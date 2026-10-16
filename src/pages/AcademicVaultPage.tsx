import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  FolderLock,
  Upload,
  FolderPlus,
  Search,
  Grid,
  List as ListIcon,
  Download,
  Trash2,
  Edit2,
  Eye,
  FileText,
  FileSpreadsheet,
  Presentation,
  Image as ImageIcon,
  HelpCircle,
} from 'lucide-react';
import { useProfile } from '../context/ProfileContext';
import type {
  VaultDocumentMetadata,
  VaultFolder,
  VaultStorageStats,
} from '../types/vault';
import { STANDARD_VAULT_CATEGORIES } from '../types/vault';
import {
  getDocumentsForProfile,
  getVaultFolders,
  getVaultStorageStats,
  downloadDocumentFile,
  deleteDocument,
  searchAndFilterDocuments,
  formatFileSize,
} from '../services/vaultStorage';

import { FileUploadModal } from '../components/vault/FileUploadModal';
import { DocumentPreviewModal } from '../components/vault/DocumentPreviewModal';
import { EditMetadataModal } from '../components/vault/EditMetadataModal';
import { FolderManagerModal } from '../components/vault/FolderManagerModal';
import { StorageUsageBanner } from '../components/vault/StorageUsageBanner';

export const AcademicVaultPage: React.FC = () => {
  const { activeProfile } = useProfile();
  const profileId = activeProfile?.id || 'default';

  // Data states
  const [documents, setDocuments] = useState<VaultDocumentMetadata[]>([]);
  const [folders, setFolders] = useState<VaultFolder[]>([]);
  const [storageStats, setStorageStats] = useState<VaultStorageStats>({
    totalFiles: 0,
    totalBytes: 0,
    formattedTotalBytes: '0 B',
    isNearQuota: false,
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSemester, setSelectedSemester] = useState<string>('all');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [selectedFileType, setSelectedFileType] = useState<string>('all');
  const [sortBy, setSortBy] = useState<
    'date_desc' | 'date_asc' | 'name_asc' | 'name_desc' | 'size_desc' | 'size_asc'
  >('date_desc');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Modals
  const [isUploadOpen, setIsUploadOpen] = useState<boolean>(false);
  const [isFolderManagerOpen, setIsFolderManagerOpen] = useState<boolean>(false);
  const [previewDoc, setPreviewDoc] = useState<VaultDocumentMetadata | null>(null);
  const [editingDoc, setEditingDoc] = useState<VaultDocumentMetadata | null>(null);

  // Load Vault Data
  const loadVaultData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [docs, fldrs, stats] = await Promise.all([
        getDocumentsForProfile(profileId),
        getVaultFolders(profileId),
        getVaultStorageStats(profileId),
      ]);
      setDocuments(docs);
      setFolders(fldrs);
      setStorageStats(stats);
    } finally {
      setIsLoading(false);
    }
  }, [profileId]);

  useEffect(() => {
    loadVaultData();

    const handleProfileChange = () => {
      loadVaultData();
    };

    window.addEventListener('active-profile-changed', handleProfileChange);
    window.addEventListener('student-profile-updated', handleProfileChange);
    window.addEventListener('storage', handleProfileChange);

    return () => {
      window.removeEventListener('active-profile-changed', handleProfileChange);
      window.removeEventListener('student-profile-updated', handleProfileChange);
      window.removeEventListener('storage', handleProfileChange);
    };
  }, [loadVaultData]);

  // Derived distinct subjects from saved docs
  const distinctSubjects = useMemo(() => {
    const s = new Set<string>();
    documents.forEach((d) => {
      if (d.subjectName) s.add(d.subjectName);
    });
    return Array.from(s).sort();
  }, [documents]);

  // Filtered & Sorted documents
  const filteredDocuments = useMemo(() => {
    return searchAndFilterDocuments(documents, {
      query: searchQuery,
      category: selectedCategory,
      semester: selectedSemester,
      subjectName: selectedSubject,
      fileType: selectedFileType,
      sortBy,
    });
  }, [
    documents,
    searchQuery,
    selectedCategory,
    selectedSemester,
    selectedSubject,
    selectedFileType,
    sortBy,
  ]);

  const handleDelete = async (docId: string) => {
    await deleteDocument(profileId, docId);
    await loadVaultData();
    if (previewDoc?.id === docId) {
      setPreviewDoc(null);
    }
  };

  const getFormatIcon = (ext: string) => {
    if (ext === 'pdf') return <FileText className="w-5 h-5 text-rose-500" />;
    if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext))
      return <ImageIcon className="w-5 h-5 text-blue-500" />;
    if (['pptx', 'ppt'].includes(ext))
      return <Presentation className="w-5 h-5 text-amber-500" />;
    if (['xlsx', 'xls', 'csv'].includes(ext))
      return <FileSpreadsheet className="w-5 h-5 text-emerald-500" />;
    return <FileText className="w-5 h-5 text-indigo-500" />;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200 dark:border-gray-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400">
                <FolderLock className="w-6 h-6" />
              </span>
              <h1 className="text-2xl font-black text-gray-900 dark:text-white">
                Academic Vault & Document Library
              </h1>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Locally stored notes, syllabus, lab records, assignments, and exam preparation files.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setIsFolderManagerOpen(true)}
              className="px-3.5 py-2 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-semibold shadow-sm flex items-center gap-1.5 transition"
            >
              <FolderPlus className="w-4 h-4 text-gray-500" />
              <span>Folders</span>
            </button>

            <button
              onClick={() => setIsUploadOpen(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-500/20 flex items-center gap-1.5 transition"
            >
              <Upload className="w-4 h-4" />
              <span>Upload Document</span>
            </button>
          </div>
        </div>

        {/* Storage Usage Banner */}
        <StorageUsageBanner stats={storageStats} />

        {/* Privacy Notice Pill */}
        <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 rounded-xl text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
          <HelpCircle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <span>
            <strong>Local Privacy Guarantee:</strong> Documents are stored exclusively inside your
            device&apos;s browser IndexedDB. No files are uploaded to external servers, cloud AI
            systems, or college databases.
          </span>
        </div>

        {/* Category Pills Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition shrink-0 ${
              selectedCategory === 'all'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-750 border border-gray-200 dark:border-gray-700'
            }`}
          >
            All Documents ({documents.length})
          </button>

          {STANDARD_VAULT_CATEGORIES.map((cat) => {
            const count = documents.filter((d) => d.category === cat).length;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition shrink-0 ${
                  selectedCategory === cat
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-750 border border-gray-200 dark:border-gray-700'
                }`}
              >
                {cat} {count > 0 && <span className="opacity-75">({count})</span>}
              </button>
            );
          })}

          {folders.map((f) => {
            const count = documents.filter((d) => d.category === f.name).length;
            return (
              <button
                key={f.id}
                onClick={() => setSelectedCategory(f.name)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition shrink-0 flex items-center gap-1.5 ${
                  selectedCategory === f.name
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-750 border border-gray-200 dark:border-gray-700'
                }`}
              >
                <div
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: f.color || '#4f46e5' }}
                />
                <span>{f.name}</span>
                {count > 0 && <span className="opacity-75">({count})</span>}
              </button>
            );
          })}
        </div>

        {/* Search & Multi-Filter Control Strip */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            {/* Search Input */}
            <div className="sm:col-span-2 relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                placeholder="Smart search across filenames, tags, notes, text contents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Semester Filter */}
            <select
              value={selectedSemester}
              onChange={(e) => setSelectedSemester(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">All Semesters</option>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                <option key={s} value={`Semester ${s}`}>
                  Semester {s}
                </option>
              ))}
            </select>

            {/* Subject Filter */}
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">All Subjects ({distinctSubjects.length})</option>
              {distinctSubjects.map((subj, idx) => (
                <option key={idx} value={subj}>
                  {subj}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-gray-100 dark:border-gray-700 text-xs text-gray-500">
            {/* File Type Filter */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-gray-700 dark:text-gray-300">Format:</span>
              {(
                [
                  ['all', 'All'],
                  ['pdf', 'PDF'],
                  ['image', 'Images'],
                  ['document', 'Word / Text'],
                  ['presentation', 'Slides (PPT)'],
                ] as const
              ).map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => setSelectedFileType(val)}
                  className={`px-2 py-1 rounded-lg transition ${
                    selectedFileType === val
                      ? 'bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 font-bold'
                      : 'hover:text-gray-900 dark:hover:text-gray-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Sort & View Mode Controls */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-gray-700 dark:text-gray-300">Sort:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="px-2 py-1 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                >
                  <option value="date_desc">Newest First</option>
                  <option value="date_asc">Oldest First</option>
                  <option value="name_asc">Name (A-Z)</option>
                  <option value="name_desc">Name (Z-A)</option>
                  <option value="size_desc">Size (Largest)</option>
                  <option value="size_asc">Size (Smallest)</option>
                </select>
              </div>

              {/* View Toggle */}
              <div className="flex items-center p-0.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1 rounded ${
                    viewMode === 'grid'
                      ? 'bg-white dark:bg-gray-700 text-indigo-600 shadow-xs'
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                  title="Grid View"
                >
                  <Grid className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-1 rounded ${
                    viewMode === 'list'
                      ? 'bg-white dark:bg-gray-700 text-indigo-600 shadow-xs'
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                  title="List View"
                >
                  <ListIcon className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Document Content */}
        {isLoading ? (
          <div className="py-20 text-center space-y-3">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-gray-400">Loading your academic documents...</p>
          </div>
        ) : documents.length === 0 ? (
          /* Empty State for Fresh Profiles */
          <div className="bg-white dark:bg-gray-800 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-700 p-12 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto shadow-sm">
              <FolderLock className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">
                Your Academic Vault is Empty
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 max-w-md mx-auto mt-1 leading-relaxed">
                Start organizing your semester files, lecture PDFs, presentations, syllabus charts,
                and assignments in one secure, student-controlled local library.
              </p>
            </div>
            <button
              onClick={() => setIsUploadOpen(true)}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-500/20 inline-flex items-center gap-2 transition"
            >
              <Upload className="w-4 h-4" />
              <span>Upload Your First Document</span>
            </button>
          </div>
        ) : filteredDocuments.length === 0 ? (
          /* Filtered empty state */
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-8 text-center text-xs text-gray-500 dark:text-gray-400">
            No documents matched your search query or selected filters.
          </div>
        ) : viewMode === 'grid' ? (
          /* GRID VIEW */
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {filteredDocuments.map((doc) => (
              <div
                key={doc.id}
                className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm hover:shadow-md transition flex flex-col justify-between space-y-3 group"
              >
                <div className="space-y-2.5">
                  {/* Top Meta */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
                      {doc.category}
                    </span>
                    <span className="text-[11px] text-gray-400">
                      {formatFileSize(doc.fileSize)}
                    </span>
                  </div>

                  {/* Icon & Name */}
                  <div className="flex items-start gap-2.5">
                    <div className="p-2 bg-gray-50 dark:bg-gray-750 rounded-xl shrink-0 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-950/40 transition">
                      {getFormatIcon(doc.fileExtension)}
                    </div>
                    <div className="min-w-0">
                      <h4
                        onClick={() => setPreviewDoc(doc)}
                        className="text-sm font-bold text-gray-900 dark:text-white truncate cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 transition"
                        title={doc.fileName}
                      >
                        {doc.fileName}
                      </h4>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate mt-0.5">
                        {doc.subjectName || doc.semester || 'General Document'}
                      </p>
                    </div>
                  </div>

                  {/* Tags */}
                  {doc.tags.length > 0 && (
                    <div className="flex items-center gap-1 flex-wrap pt-1">
                      {doc.tags.slice(0, 3).map((tag, idx) => (
                        <span
                          key={idx}
                          className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-[10px] font-medium"
                        >
                          #{tag}
                        </span>
                      ))}
                      {doc.tags.length > 3 && (
                        <span className="text-[10px] text-gray-400">
                          +{doc.tags.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Footer Actions */}
                <div className="pt-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between text-xs">
                  <span className="text-[10px] text-gray-400">
                    {new Date(doc.uploadedAt).toLocaleDateString()}
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setPreviewDoc(doc)}
                      className="p-1.5 text-gray-400 hover:text-indigo-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                      title="Preview Document"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => downloadDocumentFile(profileId, doc.id)}
                      className="p-1.5 text-gray-400 hover:text-emerald-600 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition"
                      title="Download File"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setEditingDoc(doc)}
                      className="p-1.5 text-gray-400 hover:text-indigo-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                      title="Edit Details"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(doc.id)}
                      className="p-1.5 text-gray-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* LIST VIEW */
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700 shadow-sm overflow-hidden">
            {filteredDocuments.map((doc) => (
              <div
                key={doc.id}
                className="p-3.5 sm:p-4 flex items-center justify-between gap-4 hover:bg-gray-50 dark:hover:bg-gray-750 transition flex-wrap"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 bg-gray-50 dark:bg-gray-700 rounded-xl shrink-0">
                    {getFormatIcon(doc.fileExtension)}
                  </div>
                  <div className="min-w-0">
                    <h4
                      onClick={() => setPreviewDoc(doc)}
                      className="text-sm font-bold text-gray-900 dark:text-white truncate cursor-pointer hover:text-indigo-600 transition"
                    >
                      {doc.fileName}
                    </h4>
                    <div className="flex items-center gap-2 text-xs text-gray-400 flex-wrap mt-0.5">
                      <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                        {doc.category}
                      </span>
                      <span>&bull;</span>
                      <span>{formatFileSize(doc.fileSize)}</span>
                      {doc.subjectName && (
                        <>
                          <span>&bull;</span>
                          <span>{doc.subjectName}</span>
                        </>
                      )}
                      {doc.semester && (
                        <>
                          <span>&bull;</span>
                          <span>{doc.semester}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-auto sm:ml-0">
                  <span className="text-xs text-gray-400 mr-2 hidden sm:inline">
                    {new Date(doc.uploadedAt).toLocaleDateString()}
                  </span>

                  <button
                    onClick={() => setPreviewDoc(doc)}
                    className="p-2 text-gray-400 hover:text-indigo-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                    title="Preview"
                  >
                    <Eye className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => downloadDocumentFile(profileId, doc.id)}
                    className="p-2 text-gray-400 hover:text-emerald-600 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                    title="Download"
                  >
                    <Download className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => setEditingDoc(doc)}
                    className="p-2 text-gray-400 hover:text-indigo-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                    title="Edit"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleDelete(doc.id)}
                    className="p-2 text-gray-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Upload Modal */}
        {isUploadOpen && (
          <FileUploadModal
            isOpen={isUploadOpen}
            onClose={() => setIsUploadOpen(false)}
            profileId={profileId}
            existingSubjects={distinctSubjects}
            folders={folders}
            onUploadSuccess={() => loadVaultData()}
          />
        )}

        {/* Folder Manager Modal */}
        {isFolderManagerOpen && (
          <FolderManagerModal
            isOpen={isFolderManagerOpen}
            onClose={() => setIsFolderManagerOpen(false)}
            profileId={profileId}
            folders={folders}
            onFoldersChanged={(updated) => setFolders(updated)}
          />
        )}

        {/* Document Preview Modal */}
        {previewDoc && (
          <DocumentPreviewModal
            isOpen={Boolean(previewDoc)}
            onClose={() => setPreviewDoc(null)}
            document={previewDoc}
            profileId={profileId}
            onEditMetadata={(doc) => setEditingDoc(doc)}
            onDeleteDocument={(docId) => handleDelete(docId)}
          />
        )}

        {/* Edit Metadata Modal */}
        {editingDoc && (
          <EditMetadataModal
            isOpen={Boolean(editingDoc)}
            onClose={() => setEditingDoc(null)}
            document={editingDoc}
            profileId={profileId}
            existingSubjects={distinctSubjects}
            folders={folders}
            onUpdated={() => loadVaultData()}
          />
        )}
      </div>
    </div>
  );
};
