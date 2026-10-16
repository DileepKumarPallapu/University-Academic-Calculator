export type StandardVaultCategory =
  | 'Syllabus'
  | 'Lecture Notes'
  | 'Assignments'
  | 'Lab Records'
  | 'Presentations'
  | 'Exam Preparation'
  | 'Other Documents';

export const STANDARD_VAULT_CATEGORIES: StandardVaultCategory[] = [
  'Syllabus',
  'Lecture Notes',
  'Assignments',
  'Lab Records',
  'Presentations',
  'Exam Preparation',
  'Other Documents',
];

export interface VaultDocumentMetadata {
  id: string;
  profileId: string;
  fileName: string;
  fileType: string;
  fileExtension: string;
  fileSize: number;
  uploadedAt: number;
  semester?: string;
  subjectName?: string;
  category: StandardVaultCategory | string;
  folderId?: string;
  tags: string[];
  notes?: string;
  extractedText?: string;
  hasTextExtraction: boolean;
  extractionError?: string;
}

export interface VaultDocumentBlobRecord {
  id: string;
  profileId: string;
  blob: Blob;
  fileName: string;
  fileType: string;
  uploadedAt: number;
}

export interface VaultFolder {
  id: string;
  profileId: string;
  name: string;
  color?: string;
  createdAt: number;
}

export interface VaultStorageStats {
  totalFiles: number;
  totalBytes: number;
  formattedTotalBytes: string;
  storageQuotaBytes?: number;
  storageUsageBytes?: number;
  storageUsagePercent?: number;
  isNearQuota: boolean;
}

export interface VaultFilterOptions {
  query: string;
  semester: string;
  subjectName: string;
  category: string;
  fileType: string; // 'all' | 'pdf' | 'image' | 'document' | 'presentation' | 'other'
  sortBy: 'date_desc' | 'date_asc' | 'name_asc' | 'name_desc' | 'size_desc' | 'size_asc';
}
