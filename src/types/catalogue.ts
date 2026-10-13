export type RegulationCode = 'VTR15' | 'VTR18' | 'VTR21' | 'VTR25' | string;

export type CatalogueSourceType =
  | 'Official VTRUGE2021 Report (VTU24654)'
  | 'Official VTRUGE2021 Report (VTU29962)'
  | 'Both Reports (Consensus)'
  | 'Manual'
  | 'Imported';

export interface CatalogueCourse {
  /** Stable unique internal ID (never displayed as course code) */
  id: string;
  regulation: 'VTR15' | 'VTR18' | 'VTR21' | 'VTR25' | string;
  category: string; // 'foundation', 'programme_core', 'programme_elective', 'open_elective', etc.
  name: string;
  /** Course code — STRICTLY undefined for VTR25, defined only for VTR15/VTR18/VTR21 */
  code?: string;
  /** Verified credit value from official curriculum, undefined if unassigned */
  verifiedCredits?: number;
  /** Suggested semester if officially verified */
  defaultSemester?: number;
  source: CatalogueSourceType;
  sourceBatch?: string; // e.g. '2023-2024 (CSE)' or '2024-2025 (CSE AIML)'
  isVerified: boolean;
  hasDiscrepancy?: boolean;
  discrepancyNote?: string;
  department?: string; // e.g. 'CSE', 'CSE (AIML)', 'Common'
  notes?: string;
}

export interface CatalogueRegulationSummary {
  regulation: string;
  totalCourses: number;
  categoryCounts: Record<string, number>;
  isOfficialSourceAvailable: boolean;
  sourceDescription: string;
}
