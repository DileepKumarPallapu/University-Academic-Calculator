export type DegreePathway = 'standard' | 'honours' | 'minor';

export type CalculationType = 'internals' | 'sgpa' | 'cgpa' | 'attendance' | 'credits';

export interface StudentProfile {
  id: string; // Unique UUID
  name: string; // Full name
  rollNumber?: string; // Student ID / Register number
  collegeName?: string; // College or university
  degree?: string; // e.g. B.Tech, B.E., M.Tech
  department?: string; // e.g. Computer Science and Engineering
  branch?: string; // alias for department
  regulation?: string; // e.g. VTR21, VTR25, R2022
  admissionYear?: string; // e.g. "2024"
  academicYear?: string; // e.g. "2024-2025"
  semester?: string; // e.g. "5" or "Semester 5"
  currentSemester?: number; // 1-10
  degreePathway: DegreePathway; // Standard, Honours, Minor
  targetAttendance: number; // default 75 (%)
  avatar?: string; // optional base64 image or preset avatar id
  customGraduationCredits?: number; // default: 160 (standard), 180 (honours), 178 (minor)
  createdAt: number;
  updatedAt: number;
}

export interface SavedCalculation {
  id: string; // Unique UUID
  profileId: string; // Belongs to StudentProfile.id
  type: CalculationType;
  title: string;
  resultValue: string; // formatted summary, e.g. "8.85 / 10"
  resultSummary: string; // e.g. "22 Credits • 6 Subjects"
  inputs: Record<string, any>; // Full serialized inputs state
  semester?: number | string;
  regulation?: string;
  isFavorite: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface CreditCourse {
  id: string;
  code?: string;
  name: string;
  credits: number;
  semester: number;
  grade?: string;
  isPassed: boolean;
}

export interface CreditCategory {
  id: string;
  name: string;
  code: string;
  requiredCredits: number;
  earnedCredits: number;
  courses: CreditCourse[];
}

export interface StudentCreditProgress {
  profileId: string;
  pathway: DegreePathway;
  targetCredits: number;
  earnedCredits: number;
  categories: CreditCategory[];
  updatedAt: number;
}

export interface ProfileExportData {
  version: string;
  exportDate: string;
  app: string;
  profile: StudentProfile;
  calculations: SavedCalculation[];
  creditProgress?: StudentCreditProgress | null;
}
