import * as pdfjsLib from 'pdfjs-dist';
import type {
  VaultDocumentMetadata,
  VaultDocumentBlobRecord,
  VaultFolder,
  VaultStorageStats,
  VaultFilterOptions,
  StandardVaultCategory,
} from '../types/vault';

// Configure pdfjs worker if in browser
try {
  if (typeof window !== 'undefined' && typeof URL !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.min.mjs',
      import.meta.url
    ).toString();
  }
} catch {
  // fallback
}

const DB_NAME = 'AcademicVaultDB';
const DB_VERSION = 1;

const STORE_METADATA = 'vault_metadata';
const STORE_BLOBS = 'vault_blobs';
const STORE_FOLDERS = 'vault_folders';

export const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB

let vaultDbInstance: IDBDatabase | null = null;

// Fallback in-memory stores for testing or environments without IndexedDB
const memoryMetadata: Record<string, VaultDocumentMetadata[]> = {};
const memoryBlobs: Record<string, Blob> = {};
const memoryFolders: Record<string, VaultFolder[]> = {};

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function getFileExtension(filename: string): string {
  const parts = filename.split('.');
  if (parts.length <= 1) return '';
  return parts[parts.length - 1].toLowerCase();
}

/**
 * Open or initialize AcademicVaultDB
 */
function openVaultDB(): Promise<IDBDatabase> {
  if (vaultDbInstance) return Promise.resolve(vaultDbInstance);

  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB not available'));
    }

    try {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Metadata Store
        if (!db.objectStoreNames.contains(STORE_METADATA)) {
          const metaStore = db.createObjectStore(STORE_METADATA, { keyPath: 'id' });
          metaStore.createIndex('by_profile', 'profileId', { unique: false });
          metaStore.createIndex('by_category', 'category', { unique: false });
          metaStore.createIndex('by_subject', 'subjectName', { unique: false });
          metaStore.createIndex('by_semester', 'semester', { unique: false });
        }

        // File Blobs Store
        if (!db.objectStoreNames.contains(STORE_BLOBS)) {
          const blobStore = db.createObjectStore(STORE_BLOBS, { keyPath: 'id' });
          blobStore.createIndex('by_profile', 'profileId', { unique: false });
        }

        // Folders Store
        if (!db.objectStoreNames.contains(STORE_FOLDERS)) {
          const folderStore = db.createObjectStore(STORE_FOLDERS, { keyPath: 'id' });
          folderStore.createIndex('by_profile', 'profileId', { unique: false });
        }
      };

      request.onsuccess = () => {
        vaultDbInstance = request.result;
        resolve(vaultDbInstance);
      };

      request.onerror = () => {
        reject(request.error);
      };
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Extract searchable text locally from PDF or plain text files
 */
export async function extractSearchableText(file: File): Promise<{
  text: string;
  hasText: boolean;
  error?: string;
}> {
  const ext = getFileExtension(file.name);

  // Plain text formats
  if (['txt', 'md', 'csv', 'json'].includes(ext)) {
    try {
      const raw = await file.text();
      return {
        text: raw.slice(0, 100000), // cap at 100k chars for performance
        hasText: raw.trim().length > 0,
      };
    } catch (err: any) {
      return { text: '', hasText: false, error: err.message };
    }
  }

  // PDF format
  if (ext === 'pdf') {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      const numPages = Math.min(pdf.numPages, 20); // inspect up to first 20 pages
      const pageTexts: string[] = [];

      for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageString = textContent.items
          .map((item: any) => item.str || '')
          .join(' ')
          .trim();
        if (pageString) {
          pageTexts.push(pageString);
        }
      }

      const combined = pageTexts.join('\n').slice(0, 100000);
      return {
        text: combined,
        hasText: combined.trim().length > 0,
      };
    } catch (err: any) {
      return {
        text: '',
        hasText: false,
        error: `Local PDF text extraction was unavailable: ${err?.message || 'Unsupported format'}`,
      };
    }
  }

  // Unsupported for client-side text parsing (DOCX, PPTX, Images without cloud OCR)
  return {
    text: '',
    hasText: false,
  };
}

// ==========================================
// 1. SAVE & UPLOAD DOCUMENT
// ==========================================

export async function saveDocument(
  profileId: string,
  file: File,
  meta: {
    semester?: string;
    subjectName?: string;
    category?: StandardVaultCategory | string;
    folderId?: string;
    tags?: string[];
    notes?: string;
  }
): Promise<VaultDocumentMetadata> {
  if (!profileId) {
    throw new Error('Active student profile is required to save document.');
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error(
      `File size (${formatFileSize(file.size)}) exceeds the ${formatFileSize(
        MAX_FILE_SIZE_BYTES
      )} local device limit.`
    );
  }

  const now = Date.now();
  const id = `doc_${now}_${Math.random().toString(36).substring(2, 8)}`;
  const ext = getFileExtension(file.name);

  // Attempt text extraction
  const extraction = await extractSearchableText(file);

  const metadata: VaultDocumentMetadata = {
    id,
    profileId,
    fileName: file.name,
    fileType: file.type || 'application/octet-stream',
    fileExtension: ext,
    fileSize: file.size,
    uploadedAt: now,
    semester: meta.semester?.trim() || undefined,
    subjectName: meta.subjectName?.trim() || undefined,
    category: meta.category || 'Other Documents',
    folderId: meta.folderId || undefined,
    tags: meta.tags || [],
    notes: meta.notes?.trim() || undefined,
    extractedText: extraction.hasText ? extraction.text : undefined,
    hasTextExtraction: extraction.hasText,
    extractionError: extraction.error,
  };

  const blobRecord: VaultDocumentBlobRecord = {
    id,
    profileId,
    blob: file,
    fileName: file.name,
    fileType: file.type || 'application/octet-stream',
    uploadedAt: now,
  };

  try {
    const db = await openVaultDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction([STORE_METADATA, STORE_BLOBS], 'readwrite');
      tx.objectStore(STORE_METADATA).put(metadata);
      tx.objectStore(STORE_BLOBS).put(blobRecord);

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // Memory fallback
    if (!memoryMetadata[profileId]) memoryMetadata[profileId] = [];
    memoryMetadata[profileId].unshift(metadata);
    memoryBlobs[id] = file;
  }

  return metadata;
}

// ==========================================
// 2. QUERY & RETRIEVE DOCUMENTS
// ==========================================

export async function getDocumentsForProfile(
  profileId: string
): Promise<VaultDocumentMetadata[]> {
  if (!profileId) return [];

  try {
    const db = await openVaultDB();
    return await new Promise<VaultDocumentMetadata[]>((resolve, reject) => {
      const tx = db.transaction(STORE_METADATA, 'readonly');
      const store = tx.objectStore(STORE_METADATA);
      const index = store.index('by_profile');
      const request = index.getAll(IDBKeyRange.only(profileId));

      request.onsuccess = () => {
        const results = (request.result as VaultDocumentMetadata[]) || [];
        // Sort descending by upload date
        results.sort((a, b) => b.uploadedAt - a.uploadedAt);
        resolve(results);
      };
      request.onerror = () => reject(request.error);
    });
  } catch {
    return memoryMetadata[profileId] || [];
  }
}

export async function getDocumentBlob(
  profileId: string,
  docId: string
): Promise<Blob | null> {
  if (!docId) return null;

  try {
    const db = await openVaultDB();
    return await new Promise<Blob | null>((resolve, reject) => {
      const tx = db.transaction(STORE_BLOBS, 'readonly');
      const store = tx.objectStore(STORE_BLOBS);
      const request = store.get(docId);

      request.onsuccess = () => {
        const record = request.result as VaultDocumentBlobRecord | undefined;
        if (record && record.profileId === profileId) {
          resolve(record.blob);
        } else {
          resolve(null);
        }
      };
      request.onerror = () => reject(request.error);
    });
  } catch {
    return memoryBlobs[docId] || null;
  }
}

export async function downloadDocumentFile(
  profileId: string,
  docId: string
): Promise<boolean> {
  const docs = await getDocumentsForProfile(profileId);
  const doc = docs.find((d) => d.id === docId);
  if (!doc) return false;

  const blob = await getDocumentBlob(profileId, docId);
  if (!blob) return false;

  if (typeof window === 'undefined') return false;

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = doc.fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}

// ==========================================
// 3. UPDATE & DELETE
// ==========================================

export async function updateDocumentMetadata(
  profileId: string,
  docId: string,
  updates: Partial<
    Omit<VaultDocumentMetadata, 'id' | 'profileId' | 'fileSize' | 'fileExtension' | 'uploadedAt'>
  >
): Promise<VaultDocumentMetadata | null> {
  try {
    const db = await openVaultDB();
    return await new Promise<VaultDocumentMetadata | null>((resolve, reject) => {
      const tx = db.transaction([STORE_METADATA], 'readwrite');
      const store = tx.objectStore(STORE_METADATA);
      const request = store.get(docId);

      request.onsuccess = () => {
        const existing = request.result as VaultDocumentMetadata | undefined;
        if (!existing || existing.profileId !== profileId) {
          resolve(null);
          return;
        }

        const updated: VaultDocumentMetadata = {
          ...existing,
          ...updates,
        };

        store.put(updated);
        resolve(updated);
      };

      request.onerror = () => reject(request.error);
    });
  } catch {
    const list = memoryMetadata[profileId] || [];
    const idx = list.findIndex((d) => d.id === docId);
    if (idx === -1) return null;
    list[idx] = { ...list[idx], ...updates };
    return list[idx];
  }
}

export async function deleteDocument(
  profileId: string,
  docId: string
): Promise<boolean> {
  try {
    const db = await openVaultDB();
    return await new Promise<boolean>((resolve, reject) => {
      const tx = db.transaction([STORE_METADATA, STORE_BLOBS], 'readwrite');
      tx.objectStore(STORE_METADATA).delete(docId);
      tx.objectStore(STORE_BLOBS).delete(docId);

      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    if (memoryMetadata[profileId]) {
      memoryMetadata[profileId] = memoryMetadata[profileId].filter((d) => d.id !== docId);
    }
    delete memoryBlobs[docId];
    return true;
  }
}

// ==========================================
// 4. FOLDERS & CATEGORIES CRUD
// ==========================================

export async function getVaultFolders(profileId: string): Promise<VaultFolder[]> {
  if (!profileId) return [];

  try {
    const db = await openVaultDB();
    return await new Promise<VaultFolder[]>((resolve, reject) => {
      const tx = db.transaction(STORE_FOLDERS, 'readonly');
      const store = tx.objectStore(STORE_FOLDERS);
      const index = store.index('by_profile');
      const request = index.getAll(IDBKeyRange.only(profileId));

      request.onsuccess = () => {
        const results = (request.result as VaultFolder[]) || [];
        resolve(results);
      };
      request.onerror = () => reject(request.error);
    });
  } catch {
    return memoryFolders[profileId] || [];
  }
}

export async function createVaultFolder(
  profileId: string,
  name: string,
  color?: string
): Promise<VaultFolder> {
  const folder: VaultFolder = {
    id: `folder_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    profileId,
    name: name.trim(),
    color: color || '#4f46e5',
    createdAt: Date.now(),
  };

  try {
    const db = await openVaultDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_FOLDERS, 'readwrite');
      tx.objectStore(STORE_FOLDERS).put(folder);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    if (!memoryFolders[profileId]) memoryFolders[profileId] = [];
    memoryFolders[profileId].push(folder);
  }

  return folder;
}

export async function deleteVaultFolder(
  profileId: string,
  folderId: string
): Promise<boolean> {
  try {
    const db = await openVaultDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_FOLDERS, 'readwrite');
      tx.objectStore(STORE_FOLDERS).delete(folderId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    return true;
  } catch {
    if (memoryFolders[profileId]) {
      memoryFolders[profileId] = memoryFolders[profileId].filter((f) => f.id !== folderId);
    }
    return true;
  }
}

// ==========================================
// 5. STORAGE METRICS & WARNINGS
// ==========================================

export async function getVaultStorageStats(profileId: string): Promise<VaultStorageStats> {
  const docs = await getDocumentsForProfile(profileId);
  const totalBytes = docs.reduce((acc, d) => acc + d.fileSize, 0);

  let storageQuotaBytes: number | undefined;
  let storageUsageBytes: number | undefined;
  let storageUsagePercent: number | undefined;

  if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
    try {
      const est = await navigator.storage.estimate();
      storageQuotaBytes = est.quota;
      storageUsageBytes = est.usage;
      if (est.quota && est.usage) {
        storageUsagePercent = Number(((est.usage / est.quota) * 100).toFixed(1));
      }
    } catch {
      // ignore
    }
  }

  const isNearQuota = (storageUsagePercent ?? 0) >= 80;

  return {
    totalFiles: docs.length,
    totalBytes,
    formattedTotalBytes: formatFileSize(totalBytes),
    storageQuotaBytes,
    storageUsageBytes,
    storageUsagePercent,
    isNearQuota,
  };
}

// ==========================================
// 6. SEARCH & MULTI-FILTER ENGINE
// ==========================================

export function searchAndFilterDocuments(
  documents: VaultDocumentMetadata[],
  options: Partial<VaultFilterOptions>
): VaultDocumentMetadata[] {
  const query = (options.query || '').trim().toLowerCase();
  const semesterFilter = options.semester || 'all';
  const subjectFilter = options.subjectName || 'all';
  const categoryFilter = options.category || 'all';
  const fileTypeFilter = options.fileType || 'all';
  const sortBy = options.sortBy || 'date_desc';

  const filtered = documents.filter((doc) => {
    // Semester filter
    if (semesterFilter !== 'all' && doc.semester !== semesterFilter) {
      return false;
    }

    // Subject filter
    if (subjectFilter !== 'all' && doc.subjectName !== subjectFilter) {
      return false;
    }

    // Category filter
    if (categoryFilter !== 'all' && doc.category !== categoryFilter) {
      return false;
    }

    // File type filter
    if (fileTypeFilter !== 'all') {
      const ext = doc.fileExtension;
      if (fileTypeFilter === 'pdf' && ext !== 'pdf') return false;
      if (
        fileTypeFilter === 'image' &&
        !['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext)
      ) {
        return false;
      }
      if (
        fileTypeFilter === 'document' &&
        !['docx', 'doc', 'txt', 'rtf', 'odt', 'csv', 'json'].includes(ext)
      ) {
        return false;
      }
      if (fileTypeFilter === 'presentation' && !['pptx', 'ppt'].includes(ext)) {
        return false;
      }
    }

    // Search query matching across filename, tags, notes, subject, semester, extracted text
    if (query) {
      const inFilename = doc.fileName.toLowerCase().includes(query);
      const inNotes = doc.notes?.toLowerCase().includes(query) ?? false;
      const inSubject = doc.subjectName?.toLowerCase().includes(query) ?? false;
      const inSemester = doc.semester?.toLowerCase().includes(query) ?? false;
      const inCategory = doc.category.toLowerCase().includes(query);
      const inTags = doc.tags.some((t) => t.toLowerCase().includes(query));
      const inExtractedText = doc.extractedText?.toLowerCase().includes(query) ?? false;

      if (
        !inFilename &&
        !inNotes &&
        !inSubject &&
        !inSemester &&
        !inCategory &&
        !inTags &&
        !inExtractedText
      ) {
        return false;
      }
    }

    return true;
  });

  // Sorting
  filtered.sort((a, b) => {
    if (sortBy === 'date_desc') return b.uploadedAt - a.uploadedAt;
    if (sortBy === 'date_asc') return a.uploadedAt - b.uploadedAt;
    if (sortBy === 'name_asc') return a.fileName.localeCompare(b.fileName);
    if (sortBy === 'name_desc') return b.fileName.localeCompare(a.fileName);
    if (sortBy === 'size_desc') return b.fileSize - a.fileSize;
    if (sortBy === 'size_asc') return a.fileSize - b.fileSize;
    return 0;
  });

  return filtered;
}

export async function clearVaultStorage(profileId?: string): Promise<void> {
  if (profileId) {
    delete memoryMetadata[profileId];
    delete memoryFolders[profileId];
  } else {
    Object.keys(memoryMetadata).forEach((k) => delete memoryMetadata[k]);
    Object.keys(memoryBlobs).forEach((k) => delete memoryBlobs[k]);
    Object.keys(memoryFolders).forEach((k) => delete memoryFolders[k]);
  }

  try {
    const db = await openVaultDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction([STORE_METADATA, STORE_BLOBS, STORE_FOLDERS], 'readwrite');
      if (!profileId) {
        tx.objectStore(STORE_METADATA).clear();
        tx.objectStore(STORE_BLOBS).clear();
        tx.objectStore(STORE_FOLDERS).clear();
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // ignore
  }
}
