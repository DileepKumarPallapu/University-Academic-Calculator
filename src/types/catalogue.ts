export type RegulationCode = 'VTR15' | 'VTR18' | 'VTR21' | 'VTR25' | string;

export type CatalogueSourceType =
  | 'Official VTR21 Curriculum'
  | 'Official Curriculum Syllabus'
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
  isVerified: boolean;
  department?: string; // e.g. 'CSE', 'Common'
  notes?: string;
}

export interface CatalogueRegulationSummary {
  regulation: string;
  totalCourses: number;
  categoryCounts: Record<string, number>;
  isOfficialSourceAvailable: boolean;
  sourceDescription: string;
}
