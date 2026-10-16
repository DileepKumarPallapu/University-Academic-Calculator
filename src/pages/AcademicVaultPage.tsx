import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
  ShieldCheck,
  X,
  RefreshCw,
  SlidersHorizontal,
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
import { VaultLoadingSkeleton } from '../components/vault/VaultLoadingSkeleton';
import { VaultErrorState } from '../components/vault/VaultErrorState';
import { DeleteConfirmModal } from '../components/vault/DeleteConfirmModal';

export type VaultLoadingState = 'loading' | 'success' | 'empty' | 'error';

export const AcademicVaultPage: React.FC = () => {
  const { activeProfile } = useProfile();
  const profileId = activeProfile?.id || 'default';

  // Loading State Machine
  const [status, setStatus] = useState<VaultLoadingState>('loading');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Data states
  const [documents, setDocuments] = useState<VaultDocumentMetadata[]>([]);
  const [folders, setFolders] = useState<VaultFolder[]>([]);
  const [storageStats, setStorageStats] = useState<VaultStorageStats | null>(null);

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

  // Destructive delete confirmation modal
  const [docToDelete, setDocToDelete] = useState<VaultDocumentMetadata | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Request cancellation token & loading stability guards
  const requestIdRef = useRef(0);
  const hasLoadedOnceRef = useRef(false);
  const previousProfileIdRef = useRef(profileId);

  // Load Vault Data with State Machine (flicker-free lifecycle)
  const loadVaultData = useCallback(
    async (isManualRetry = false) => {
      const currentRequestId = ++requestIdRef.current;
      const isProfileSwitch = previousProfileIdRef.current !== profileId;
      previousProfileIdRef.current = profileId;

      // Only enter full skeleton loading on the very first retrieval, a true profile switch, or explicit manual retry
      if (isManualRetry || isProfileSwitch || !hasLoadedOnceRef.current) {
        setStatus('loading');
      } else {
        setIsRefreshing(true);
      }

      setErrorMessage(null);

      try {
        const [docs, fldrs, stats] = await Promise.all([
          getDocumentsForProfile(profileId),
          getVaultFolders(profileId),
          getVaultStorageStats(profileId),
        ]);

        // Guard against stale requests if profile changed or component unmounted
        if (currentRequestId !== requestIdRef.current) return;

        hasLoadedOnceRef.current = true;
        setDocuments(docs);
        setFolders(fldrs);
        setStorageStats(stats);
        setStatus(docs.length === 0 ? 'empty' : 'success');
      } catch (err: any) {
        if (currentRequestId !== requestIdRef.current) return;
        console.error('Academic Vault storage failure:', err);
        setErrorMessage(err?.message || 'Failed to communicate with browser IndexedDB storage.');
        setStatus('error');
      } finally {
        if (currentRequestId === requestIdRef.current) {
          setIsRefreshing(false);
        }
      }
    },
    [profileId]
  );

  // Initial load & profile change sync
  useEffect(() => {
    loadVaultData();

    return () => {
      // Invalidate pending requests on unmount
      requestIdRef.current++;
    };
  }, [loadVaultData]); // Stable callback guarded by profileId

  // Listen for external storage events safely without re-triggering full page spinner
  useEffect(() => {
    const handleBackgroundRefresh = () => {
      // Background revalidation without switching back to 'loading'
      setIsRefreshing(true);
      Promise.all([
        getDocumentsForProfile(profileId),
        getVaultFolders(profileId),
        getVaultStorageStats(profileId),
      ])
        .then(([docs, fldrs, stats]) => {
          setDocuments(docs);
          setFolders(fldrs);
          setStorageStats(stats);
          setStatus(docs.length === 0 ? 'empty' : 'success');
        })
        .catch(() => {
          // Keep existing data on background error
        })
        .finally(() => {
          setIsRefreshing(false);
        });
    };

    window.addEventListener('active-profile-changed', handleBackgroundRefresh);
    window.addEventListener('student-profile-updated', handleBackgroundRefresh);

    return () => {
      window.removeEventListener('active-profile-changed', handleBackgroundRefresh);
      window.removeEventListener('student-profile-updated', handleBackgroundRefresh);
    };
  }, [profileId]);

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

  // Are any search/filter criteria currently applied?
  const hasActiveFilters = useMemo(() => {
    return (
      searchQuery.trim() !== '' ||
      selectedCategory !== 'all' ||
      selectedSemester !== 'all' ||
      selectedSubject !== 'all' ||
      selectedFileType !== 'all'
    );
  }, [searchQuery, selectedCategory, selectedSemester, selectedSubject, selectedFileType]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (searchQuery.trim() !== '') count++;
    if (selectedCategory !== 'all') count++;
    if (selectedSemester !== 'all') count++;
    if (selectedSubject !== 'all') count++;
    if (selectedFileType !== 'all') count++;
    return count;
  }, [searchQuery, selectedCategory, selectedSemester, selectedSubject, selectedFileType]);

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setSelectedSemester('all');
    setSelectedSubject('all');
    setSelectedFileType('all');
  };

  const handleConfirmDelete = async () => {
    if (!docToDelete) return;
    setIsDeleting(true);
    try {
      await deleteDocument(profileId, docToDelete.id);
      if (previewDoc?.id === docToDelete.id) {
        setPreviewDoc(null);
      }
      setDocToDelete(null);
      // Soft reload
      const [docs, stats] = await Promise.all([
        getDocumentsForProfile(profileId),
        getVaultStorageStats(profileId),
      ]);
      setDocuments(docs);
      setStorageStats(stats);
      if (docs.length === 0) setStatus('empty');
    } catch (err: any) {
      alert(`Delete failed: ${err.message || 'Storage error'}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleUploadSuccess = async () => {
    setIsUploadOpen(false);
    const [docs, stats] = await Promise.all([
      getDocumentsForProfile(profileId),
      getVaultStorageStats(profileId),
    ]);
    setDocuments(docs);
    setStorageStats(stats);
    setStatus('success');
  };

  const handleMetadataUpdated = async () => {
    setEditingDoc(null);
    const [docs, stats] = await Promise.all([
      getDocumentsForProfile(profileId),
      getVaultStorageStats(profileId),
    ]);
    setDocuments(docs);
    setStorageStats(stats);
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
    <div className="apple-page-enter flex flex-col gap-6 w-full print:hidden">
      {/* Top Header Card */}
      <div className="rounded-2xl border border-[var(--border-primary)] bg-[var(--surface)] p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
              <FolderLock className="w-6 h-6" />
            </span>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-[var(--text-primary)] tracking-tight">
                Academic Vault
              </h1>
              {isRefreshing && (
                <span
                  title="Synchronizing storage in background"
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800"
                >
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  <span>Syncing</span>
                </span>
              )}
            </div>
          </div>
          <p className="text-xs text-[var(--text-secondary)] mt-1.5 leading-relaxed">
            Personal document archive for syllabus charts, lecture notes, lab manuals, assignments, and exam revision files.
          </p>
        </div>

        {/* Top Actions */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => setIsFolderManagerOpen(true)}
            className="px-3.5 py-2 bg-[var(--surface)] hover:bg-[var(--surface-secondary)] text-[var(--text-primary)] border border-[var(--border-primary)] rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <FolderPlus className="w-4 h-4 text-[var(--text-secondary)]" />
            <span>Folders</span>
          </button>

          <button
            onClick={() => setIsUploadOpen(true)}
            className="apple-btn-primary px-4 py-2 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>Upload Document</span>
          </button>
        </div>
      </div>

      {/* Storage Usage Banner (Rendered when stats are available) */}
      {storageStats && <StorageUsageBanner stats={storageStats} />}

      {/* Privacy Guarantee Notice */}
      <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
        <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
        <span>
          <strong>100% Client-Side Private:</strong> All files and extracted texts are saved exclusively in your device&apos;s browser IndexedDB. No documents are uploaded to external cloud servers or third-party databases.
        </span>
      </div>

      {/* RENDER VIEW ACCORDING TO STATE MACHINE */}
      {status === 'loading' ? (
        <VaultLoadingSkeleton />
      ) : status === 'error' ? (
        <VaultErrorState
          errorMessage={errorMessage || 'Storage communication failed.'}
          onRetry={() => loadVaultData(true)}
        />
      ) : status === 'empty' ? (
        /* Empty State for Fresh / Empty Vault */
        <div className="bg-[var(--surface)] rounded-3xl border-2 border-dashed border-[var(--border-primary)] p-12 text-center space-y-4 shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto shadow-sm">
            <FolderLock className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[var(--text-primary)]">
              Your Academic Vault is Empty
            </h3>
            <p className="text-xs text-[var(--text-secondary)] max-w-md mx-auto mt-1 leading-relaxed">
              Start organizing your semester files, lecture PDFs, presentations, syllabus charts,
              and assignments in one secure, student-controlled local library.
            </p>
          </div>
          <button
            onClick={() => setIsUploadOpen(true)}
            className="apple-btn-primary px-5 py-2.5 text-xs font-semibold inline-flex items-center gap-2 cursor-pointer shadow-sm"
          >
            <Upload className="w-4 h-4" />
            <span>Upload Your First Document</span>
          </button>
        </div>
      ) : (
        /* SUCCESS STATE: DOCUMENTS EXIST */
        <div className="space-y-4">
          {/* Category Horizontal Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none" role="tablist">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition shrink-0 cursor-pointer ${
                selectedCategory === 'all'
                  ? 'bg-indigo-600 text-white shadow-xs font-bold'
                  : 'bg-[var(--surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-secondary)] border border-[var(--border-primary)]'
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
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition shrink-0 cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-indigo-600 text-white shadow-xs font-bold'
                      : 'bg-[var(--surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-secondary)] border border-[var(--border-primary)]'
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
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition shrink-0 flex items-center gap-1.5 cursor-pointer ${
                    selectedCategory === f.name
                      ? 'bg-indigo-600 text-white shadow-xs font-bold'
                      : 'bg-[var(--surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-secondary)] border border-[var(--border-primary)]'
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
          <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border-primary)] p-4 shadow-xs space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              {/* Search Input */}
              <div className="sm:col-span-2 relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-[var(--text-tertiary)]" />
                <input
                  type="text"
                  placeholder="Search filenames, tags, notes, or extracted text..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-[var(--border-primary)] bg-[var(--surface)] text-[var(--text-primary)] focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-2.5 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Semester Filter */}
              <select
                value={selectedSemester}
                onChange={(e) => setSelectedSemester(e.target.value)}
                className="px-3 py-2 text-xs rounded-xl border border-[var(--border-primary)] bg-[var(--surface)] text-[var(--text-primary)] focus:ring-2 focus:ring-indigo-500 focus:outline-none"
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
                className="px-3 py-2 text-xs rounded-xl border border-[var(--border-primary)] bg-[var(--surface)] text-[var(--text-primary)] focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="all">All Subjects ({distinctSubjects.length})</option>
                {distinctSubjects.map((subj, idx) => (
                  <option key={idx} value={subj}>
                    {subj}
                  </option>
                ))}
              </select>
            </div>

            {/* Sub-bar: Format Filters, Sort, View Toggle & Clear Filters */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-[var(--border-secondary)] text-xs text-[var(--text-secondary)]">
              {/* File Type Filter */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-[var(--text-primary)]">Format:</span>
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
                    className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition cursor-pointer ${
                      selectedFileType === val
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'bg-[var(--surface)] border-[var(--border-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {label}
                  </button>
                ))}

                {hasActiveFilters && (
                  <button
                    onClick={handleClearFilters}
                    className="ml-1 px-2.5 py-1 rounded-lg text-[11px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 hover:bg-rose-100 flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                    <span>Clear Filters ({activeFilterCount})</span>
                  </button>
                )}
              </div>

              {/* Sort & View Mode */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-[var(--text-tertiary)]">Sort:</span>
                  <select
                    value={sortBy}
                    onChange={(e: any) => setSortBy(e.target.value)}
                    className="px-2 py-1 text-xs rounded-lg border border-[var(--border-primary)] bg-[var(--surface)] text-[var(--text-primary)]"
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
                <div className="flex items-center p-0.5 rounded-lg border border-[var(--border-primary)] bg-[var(--surface-secondary)]">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-1 rounded cursor-pointer ${
                      viewMode === 'grid'
                        ? 'bg-[var(--surface)] text-indigo-600 shadow-xs'
                        : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)]'
                    }`}
                    title="Grid View"
                    aria-label="Grid View"
                  >
                    <Grid className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-1 rounded cursor-pointer ${
                      viewMode === 'list'
                        ? 'bg-[var(--surface)] text-indigo-600 shadow-xs'
                        : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)]'
                    }`}
                    title="List View"
                    aria-label="List View"
                  >
                    <ListIcon className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Result Count Status Line */}
          <div className="flex items-center justify-between text-xs text-[var(--text-secondary)] px-1">
            <span>
              Showing <strong>{filteredDocuments.length}</strong> of <strong>{documents.length}</strong> documents
            </span>
          </div>

          {/* Filtered Empty State */}
          {filteredDocuments.length === 0 ? (
            <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border-primary)] p-10 text-center space-y-3">
              <SlidersHorizontal className="w-10 h-10 mx-auto text-[var(--text-tertiary)]" />
              <h4 className="text-sm font-bold text-[var(--text-primary)]">
                No matching documents found
              </h4>
              <p className="text-xs text-[var(--text-secondary)] max-w-sm mx-auto">
                No files matched your active search query or selected filters. Try clearing your filters or searching with a different keyword.
              </p>
              <div className="pt-2">
                <button
                  onClick={handleClearFilters}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs cursor-pointer"
                >
                  Clear All Filters
                </button>
              </div>
            </div>
          ) : viewMode === 'grid' ? (
            /* GRID VIEW */
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {filteredDocuments.map((doc) => (
                <div
                  key={doc.id}
                  className="bg-[var(--surface)] rounded-2xl border border-[var(--border-primary)] p-4 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-3 group"
                >
                  <div className="space-y-2.5">
                    {/* Top Meta Tag & Size */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
                        {doc.category}
                      </span>
                      <span className="text-[11px] text-[var(--text-tertiary)] font-medium">
                        {formatFileSize(doc.fileSize)}
                      </span>
                    </div>

                    {/* Icon & Document Title */}
                    <div className="flex items-start gap-2.5">
                      <div className="p-2 bg-[var(--surface-secondary)] rounded-xl shrink-0 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-950/40 transition-colors">
                        {getFormatIcon(doc.fileExtension)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4
                          onClick={() => setPreviewDoc(doc)}
                          className="text-sm font-bold text-[var(--text-primary)] truncate cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                          title={doc.fileName}
                        >
                          {doc.fileName}
                        </h4>
                        <p className="text-[11px] text-[var(--text-secondary)] truncate mt-0.5">
                          {doc.subjectName || doc.semester || 'General Course Document'}
                        </p>
                      </div>
                    </div>

                    {/* Tags */}
                    {doc.tags && doc.tags.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap pt-1">
                        {doc.tags.slice(0, 3).map((t, i) => (
                          <span
                            key={i}
                            className="text-[10px] px-2 py-0.5 rounded-md bg-[var(--surface-secondary)] text-[var(--text-secondary)] border border-[var(--border-secondary)] truncate max-w-[120px]"
                          >
                            #{t}
                          </span>
                        ))}
                        {doc.tags.length > 3 && (
                          <span className="text-[10px] text-[var(--text-tertiary)]">
                            +{doc.tags.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Card Bottom Controls */}
                  <div className="pt-2.5 border-t border-[var(--border-secondary)] flex items-center justify-between">
                    <span className="text-[10px] text-[var(--text-tertiary)]">
                      {new Date(doc.uploadedAt).toLocaleDateString()}
                    </span>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setPreviewDoc(doc)}
                        className="p-1.5 text-[var(--text-secondary)] hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-[var(--surface-secondary)] rounded-lg transition-colors cursor-pointer"
                        title="Preview Document"
                        aria-label="Preview"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => downloadDocumentFile(profileId, doc.id)}
                        className="p-1.5 text-[var(--text-secondary)] hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-[var(--surface-secondary)] rounded-lg transition-colors cursor-pointer"
                        title="Download Document"
                        aria-label="Download"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => setEditingDoc(doc)}
                        className="p-1.5 text-[var(--text-secondary)] hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-[var(--surface-secondary)] rounded-lg transition-colors cursor-pointer"
                        title="Edit Metadata"
                        aria-label="Edit"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => setDocToDelete(doc)}
                        className="p-1.5 text-[var(--text-secondary)] hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                        title="Delete Document"
                        aria-label="Delete"
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
            <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border-primary)] shadow-xs divide-y divide-[var(--border-secondary)] overflow-hidden">
              {filteredDocuments.map((doc) => (
                <div
                  key={doc.id}
                  className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[var(--surface-secondary)] transition-colors group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 bg-[var(--surface-secondary)] group-hover:bg-[var(--surface)] rounded-xl shrink-0 border border-[var(--border-secondary)]">
                      {getFormatIcon(doc.fileExtension)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4
                          onClick={() => setPreviewDoc(doc)}
                          className="text-xs sm:text-sm font-bold text-[var(--text-primary)] truncate cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                          title={doc.fileName}
                        >
                          {doc.fileName}
                        </h4>
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 shrink-0">
                          {doc.category}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-[var(--text-secondary)] mt-0.5">
                        <span>{doc.subjectName || 'General'}</span>
                        {doc.semester && (
                          <>
                            <span>&bull;</span>
                            <span>{doc.semester}</span>
                          </>
                        )}
                        <span>&bull;</span>
                        <span>{formatFileSize(doc.fileSize)}</span>
                        <span>&bull;</span>
                        <span>{new Date(doc.uploadedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                    <button
                      onClick={() => setPreviewDoc(doc)}
                      className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-[var(--border-primary)] hover:bg-[var(--surface)] text-[var(--text-primary)] flex items-center gap-1 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Preview</span>
                    </button>
                    <button
                      onClick={() => downloadDocumentFile(profileId, doc.id)}
                      className="p-1.5 text-[var(--text-secondary)] hover:text-indigo-600 hover:bg-[var(--surface)] rounded-lg border border-[var(--border-primary)] cursor-pointer"
                      title="Download"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setEditingDoc(doc)}
                      className="p-1.5 text-[var(--text-secondary)] hover:text-indigo-600 hover:bg-[var(--surface)] rounded-lg border border-[var(--border-primary)] cursor-pointer"
                      title="Edit"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDocToDelete(doc)}
                      className="p-1.5 text-[var(--text-secondary)] hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg border border-[var(--border-primary)] cursor-pointer"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODALS */}
      {isUploadOpen && (
        <FileUploadModal
          isOpen={isUploadOpen}
          onClose={() => setIsUploadOpen(false)}
          profileId={profileId}
          existingSubjects={distinctSubjects}
          folders={folders}
          onUploadSuccess={handleUploadSuccess}
        />
      )}

      {previewDoc && (
        <DocumentPreviewModal
          isOpen={!!previewDoc}
          onClose={() => setPreviewDoc(null)}
          document={previewDoc}
          profileId={profileId}
          onEditMetadata={(doc) => {
            setPreviewDoc(null);
            setEditingDoc(doc);
          }}
          onDeleteDocument={(docId) => {
            const doc = documents.find((d) => d.id === docId);
            if (doc) {
              setPreviewDoc(null);
              setDocToDelete(doc);
            }
          }}
        />
      )}

      {editingDoc && (
        <EditMetadataModal
          isOpen={!!editingDoc}
          onClose={() => setEditingDoc(null)}
          document={editingDoc}
          profileId={profileId}
          existingSubjects={distinctSubjects}
          folders={folders}
          onUpdated={handleMetadataUpdated}
        />
      )}

      {isFolderManagerOpen && (
        <FolderManagerModal
          isOpen={isFolderManagerOpen}
          onClose={() => setIsFolderManagerOpen(false)}
          profileId={profileId}
          folders={folders}
          onFoldersChanged={(updatedFolders) => {
            setFolders(updatedFolders);
          }}
        />
      )}

      {docToDelete && (
        <DeleteConfirmModal
          isOpen={!!docToDelete}
          onClose={() => setDocToDelete(null)}
          document={docToDelete}
          onConfirm={handleConfirmDelete}
          isDeleting={isDeleting}
        />
      )}
    </div>
  );
};

export default AcademicVaultPage;
