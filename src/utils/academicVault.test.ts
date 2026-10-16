import { describe, it, expect, beforeEach } from 'vitest';
import {
  saveDocument,
  getDocumentsForProfile,
  updateDocumentMetadata,
  deleteDocument,
  getVaultFolders,
  createVaultFolder,
  deleteVaultFolder,
  getVaultStorageStats,
  searchAndFilterDocuments,
  formatFileSize,
  getFileExtension,
  MAX_FILE_SIZE_BYTES,
  clearVaultStorage,
} from '../services/vaultStorage';
import type { VaultDocumentMetadata } from '../types/vault';

describe('Student Academic Vault & Document Search Service', () => {
  const profileAlpha = 'student_profile_alpha';
  const profileBeta = 'student_profile_beta';

  beforeEach(async () => {
    await clearVaultStorage();
  });

  describe('1. File Helpers & Validation', () => {
    it('formats file sizes accurately into human-readable strings', () => {
      expect(formatFileSize(0)).toBe('0 B');
      expect(formatFileSize(512)).toBe('512 B');
      expect(formatFileSize(1024)).toBe('1 KB');
      expect(formatFileSize(1536)).toBe('1.5 KB');
      expect(formatFileSize(1024 * 1024)).toBe('1 MB');
      expect(formatFileSize(10 * 1024 * 1024)).toBe('10 MB');
    });

    it('extracts lowercased file extensions accurately', () => {
      expect(getFileExtension('lecture_notes.pdf')).toBe('pdf');
      expect(getFileExtension('presentation_deck.PPTX')).toBe('pptx');
      expect(getFileExtension('lab_experiment.docx')).toBe('docx');
      expect(getFileExtension('diagram.PNG')).toBe('png');
      expect(getFileExtension('no_extension_file')).toBe('');
      expect(getFileExtension('archive.backup.tar.gz')).toBe('gz');
    });

    it('rejects files larger than the 25MB local limit', async () => {
      // Mock File object over 25MB
      const hugeFile = {
        name: 'huge_video_lecture.mp4',
        size: MAX_FILE_SIZE_BYTES + 1024,
        type: 'video/mp4',
      } as unknown as File;

      await expect(
        saveDocument(profileAlpha, hugeFile, { category: 'Lecture Notes' })
      ).rejects.toThrow(/exceeds the 25 MB local device limit/);
    });
  });

  describe('2. Document CRUD & Profile Isolation', () => {
    it('starts with completely clean zero records for fresh student profiles', async () => {
      const alphaDocs = await getDocumentsForProfile(profileAlpha);
      const betaDocs = await getDocumentsForProfile(profileBeta);
      expect(alphaDocs).toEqual([]);
      expect(betaDocs).toEqual([]);
    });

    it('saves document metadata and isolates records strictly by profileId', async () => {
      const textFile = new File(['Binary Search Tree Algorithm Steps'], 'bst_notes.txt', {
        type: 'text/plain',
      });

      const saved = await saveDocument(profileAlpha, textFile, {
        semester: 'Semester 3',
        subjectName: 'Data Structures',
        category: 'Lecture Notes',
        tags: ['bst', 'algorithms', 'trees'],
        notes: 'Covers insertion, deletion and AVL balancing.',
      });

      expect(saved.id).toBeDefined();
      expect(saved.profileId).toBe(profileAlpha);
      expect(saved.fileName).toBe('bst_notes.txt');
      expect(saved.fileExtension).toBe('txt');
      expect(saved.category).toBe('Lecture Notes');
      expect(saved.hasTextExtraction).toBe(true);
      expect(saved.extractedText).toContain('Binary Search Tree');

      // Alpha should have 1 document
      const alphaDocs = await getDocumentsForProfile(profileAlpha);
      expect(alphaDocs).toHaveLength(1);
      expect(alphaDocs[0].id).toBe(saved.id);

      // Beta must remain strictly empty (0 records)
      const betaDocs = await getDocumentsForProfile(profileBeta);
      expect(betaDocs).toHaveLength(0);
    });

    it('updates document metadata accurately without losing properties', async () => {
      const doc = new File(['Sample syllabus'], 'syllabus.txt', { type: 'text/plain' });
      const saved = await saveDocument(profileAlpha, doc, {
        category: 'Syllabus',
        semester: 'Semester 4',
      });

      const updated = await updateDocumentMetadata(profileAlpha, saved.id, {
        fileName: 'os_syllabus_revised.txt',
        subjectName: 'Operating Systems',
        notes: 'Revised 2026 syllabus guidelines',
      });

      expect(updated).not.toBeNull();
      expect(updated?.fileName).toBe('os_syllabus_revised.txt');
      expect(updated?.subjectName).toBe('Operating Systems');
      expect(updated?.notes).toBe('Revised 2026 syllabus guidelines');
      expect(updated?.semester).toBe('Semester 4');
    });

    it('deletes document cleanly from profile vault', async () => {
      const doc = new File(['assignment solution'], 'assign1.txt', { type: 'text/plain' });
      const saved = await saveDocument(profileAlpha, doc, { category: 'Assignments' });

      expect(await getDocumentsForProfile(profileAlpha)).toHaveLength(1);
      await deleteDocument(profileAlpha, saved.id);
      expect(await getDocumentsForProfile(profileAlpha)).toHaveLength(0);
    });
  });

  describe('3. Custom Folder & Category Management', () => {
    it('creates and isolates custom folders per profile', async () => {
      expect(await getVaultFolders(profileAlpha)).toEqual([]);
      expect(await getVaultFolders(profileBeta)).toEqual([]);

      const folder = await createVaultFolder(profileAlpha, 'Major Capstone Project', '#2563eb');
      expect(folder.id).toBeDefined();
      expect(folder.name).toBe('Major Capstone Project');

      const alphaFolders = await getVaultFolders(profileAlpha);
      expect(alphaFolders).toHaveLength(1);
      expect(alphaFolders[0].name).toBe('Major Capstone Project');

      // Profile Beta remains empty
      expect(await getVaultFolders(profileBeta)).toHaveLength(0);

      // Delete folder
      await deleteVaultFolder(profileAlpha, folder.id);
      expect(await getVaultFolders(profileAlpha)).toHaveLength(0);
    });
  });

  describe('4. Smart Search and Multi-Filtering Engine', () => {
    const mockDocs: VaultDocumentMetadata[] = [
      {
        id: 'doc_1',
        profileId: profileAlpha,
        fileName: 'Networks_Unit1_Protocols.pdf',
        fileType: 'application/pdf',
        fileExtension: 'pdf',
        fileSize: 2048000,
        uploadedAt: 1700000000000,
        semester: 'Semester 5',
        subjectName: 'Computer Networks',
        category: 'Lecture Notes',
        tags: ['osi', 'tcp', 'ip'],
        notes: 'Covers physical and data link layers',
        extractedText: 'Open Systems Interconnection 7 layer protocol stack overview',
        hasTextExtraction: true,
      },
      {
        id: 'doc_2',
        profileId: profileAlpha,
        fileName: 'DBMS_Lab_Manual.pdf',
        fileType: 'application/pdf',
        fileExtension: 'pdf',
        fileSize: 4096000,
        uploadedAt: 1700000050000,
        semester: 'Semester 4',
        subjectName: 'Database Management',
        category: 'Lab Records',
        tags: ['sql', 'queries', 'normalization'],
        notes: 'Week 1 to 10 experiments',
        extractedText: 'PL/SQL triggers cursors relational algebra schema creation',
        hasTextExtraction: true,
      },
      {
        id: 'doc_3',
        profileId: profileAlpha,
        fileName: 'AI_Ethics_Slides.pptx',
        fileType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        fileExtension: 'pptx',
        fileSize: 8192000,
        uploadedAt: 1700000100000,
        semester: 'Semester 6',
        subjectName: 'Artificial Intelligence',
        category: 'Presentations',
        tags: ['ethics', 'fairness', 'seminar'],
        notes: 'Group presentation slides',
        hasTextExtraction: false,
      },
      {
        id: 'doc_4',
        profileId: profileAlpha,
        fileName: 'Math_Formula_CheatSheet.png',
        fileType: 'image/png',
        fileExtension: 'png',
        fileSize: 1024000,
        uploadedAt: 1700000150000,
        semester: 'Semester 2',
        subjectName: 'Engineering Mathematics',
        category: 'Exam Preparation',
        tags: ['calculus', 'formulas', 'revision'],
        notes: 'Quick formula revision chart',
        hasTextExtraction: false,
      },
    ];

    it('searches by filename query', () => {
      const results = searchAndFilterDocuments(mockDocs, { query: 'Networks' });
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('doc_1');
    });

    it('searches by tag keywords', () => {
      const results = searchAndFilterDocuments(mockDocs, { query: 'normalization' });
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('doc_2');
    });

    it('searches by personal notes text', () => {
      const results = searchAndFilterDocuments(mockDocs, { query: 'presentation slides' });
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('doc_3');
    });

    it('searches by locally extracted text content', () => {
      const results = searchAndFilterDocuments(mockDocs, { query: 'Interconnection' });
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('doc_1');

      const results2 = searchAndFilterDocuments(mockDocs, { query: 'cursors' });
      expect(results2).toHaveLength(1);
      expect(results2[0].id).toBe('doc_2');
    });

    it('filters strictly by category', () => {
      const results = searchAndFilterDocuments(mockDocs, { category: 'Lab Records' });
      expect(results).toHaveLength(1);
      expect(results[0].fileName).toBe('DBMS_Lab_Manual.pdf');
    });

    it('filters strictly by semester and subject', () => {
      const results = searchAndFilterDocuments(mockDocs, {
        semester: 'Semester 5',
        subjectName: 'Computer Networks',
      });
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('doc_1');

      const noMatch = searchAndFilterDocuments(mockDocs, {
        semester: 'Semester 8',
      });
      expect(noMatch).toHaveLength(0);
    });

    it('filters by file format type', () => {
      const pdfs = searchAndFilterDocuments(mockDocs, { fileType: 'pdf' });
      expect(pdfs).toHaveLength(2);

      const presentations = searchAndFilterDocuments(mockDocs, { fileType: 'presentation' });
      expect(presentations).toHaveLength(1);
      expect(presentations[0].id).toBe('doc_3');

      const images = searchAndFilterDocuments(mockDocs, { fileType: 'image' });
      expect(images).toHaveLength(1);
      expect(images[0].id).toBe('doc_4');
    });

    it('sorts results properly by upload date, name, and size', () => {
      // By size descending
      const bySize = searchAndFilterDocuments(mockDocs, { sortBy: 'size_desc' });
      expect(bySize[0].id).toBe('doc_3'); // 8MB
      expect(bySize[bySize.length - 1].id).toBe('doc_4'); // 1MB

      // By name ascending
      const byName = searchAndFilterDocuments(mockDocs, { sortBy: 'name_asc' });
      expect(byName[0].fileName).toBe('AI_Ethics_Slides.pptx');
    });
  });

  describe('5. Storage Metrics', () => {
    it('calculates total files and storage bytes accurately', async () => {
      const stats = await getVaultStorageStats('unregistered_profile');
      expect(stats.totalFiles).toBe(0);
      expect(stats.totalBytes).toBe(0);
      expect(stats.formattedTotalBytes).toBe('0 B');
      expect(stats.isNearQuota).toBe(false);
    });
  });
});
