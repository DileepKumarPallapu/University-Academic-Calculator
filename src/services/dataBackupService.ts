import type { StudentProfile, SavedCalculation } from '../types/profile';
import type { CreditSubjectItem } from '../types/credits';
import * as db from './db';
import { safeGet, safeSet, safeRemove, isStorageAvailable } from '../utils/safeStorage';
import { calculateCreditSummary, COLLEGE_CHART_TEMPLATE } from '../utils/creditCalculations';
import {
  getDocumentsForProfile,
  getVaultFolders,
  deleteDocument,
  deleteVaultFolder,
} from './vaultStorage';

export interface StudentBackupData {
  version: '2.0.0' | '1.0.0';
  app: 'University Academic Calculator';
  exportTimestamp: string;
  sourceProfile: {
    id: string;
    name: string;
    rollNumber?: string;
    department?: string;
    degree?: string;
    regulation?: string;
    degreePathway?: string;
    targetAttendance?: number;
    customGraduationCredits?: number;
    admissionYear?: string;
    academicYear?: string;
    semester?: string;
    currentSemester?: number;
  };
  credits: {
    subjects: CreditSubjectItem[];
    pathway?: string;
    targetCredits?: number;
  };
  attendance: {
    subjects: any[];
    logs?: any[];
    draft?: any;
  };
  internals: {
    draft?: any;
    subjects?: any[];
  };
  calculations: SavedCalculation[];
  companion: {
    tasks: any[];
    planner: any;
    forecaster: any;
    semesters?: any[];
    goals?: any;
  };
  examPrep?: {
    exams: any[];
    topics: any[];
    sessions: any[];
    schedule?: any;
  };
  mockExams?: {
    questions: any[];
    exams: any[];
    attempts: any[];
    mistakes: any[];
  };
  vault?: {
    documents: any[];
    folders: any[];
    note?: string;
  };
  gamification?: {
    profile?: any;
    transactions?: any[];
    unlocked?: Record<string, any>;
    challenges?: any[];
  };
  preferences: {
    theme?: string;
    regulation?: string;
    degreePathway?: string;
    targetAttendance?: number;
    customGraduationCredits?: number;
  };
}

export interface BackupSummary {
  studentName: string;
  rollNumber?: string;
  department?: string;
  exportDate: string;
  version: string;
  counts: {
    coursesCount: number;
    attendanceCount: number;
    internalsCount: number;
    calculationsCount: number;
    tasksCount: number;
  };
}

export interface BackupConflictReport {
  isDifferentStudent: boolean;
  sourceStudentName: string;
  targetStudentName: string;
  sourceRollNumber?: string;
  targetRollNumber?: string;
  duplicateCalculationsCount: number;
  duplicateCoursesCount: number;
  duplicateAttendanceCount: number;
  newCoursesCount: number;
  newCalculationsCount: number;
  warnings: string[];
}

export interface RestoreStats {
  coursesImported: number;
  attendanceImported: number;
  calculationsImported: number;
  tasksImported: number;
  strategy: 'merge' | 'replace';
}

export interface StorageBreakdown {
  indexedDbCalculationsCount: number;
  indexedDbCalculationsBytes: number;
  creditsCount: number;
  creditsBytes: number;
  attendanceCount: number;
  attendanceBytes: number;
  internalsBytes: number;
  companionTasksCount: number;
  totalProfileBytes: number;
  formattedTotalBytes: string;
  storageEstimateQuota?: number;
  storageEstimateUsage?: number;
  formattedEstimateUsage?: string;
  formattedEstimateQuota?: string;
}

/**
 * Helper to calculate string size in UTF-8 bytes
 */
export function getByteSize(str: string): number {
  try {
    return new Blob([str]).size;
  } catch {
    return str.length;
  }
}

/**
 * Format bytes into human-readable representation
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Export personal data for the specified active profile.
 * Never includes passwords, authentication tokens, session cookies, or secrets.
 */
export async function exportStudentBackup(profileId: string): Promise<StudentBackupData> {
  const profile = await db.getProfile(profileId);
  if (!profile) {
    throw new Error('Profile not found for backup export');
  }

  // 1. Manually saved courses and credit details
  const rawCredits = safeGet<CreditSubjectItem[]>(`academic_credits_subjects_${profileId}`, []);

  // 2. Attendance records & draft
  const attendanceSubjects = safeGet<any[]>(`academic_attendance_subjects_${profileId}`, []);
  const attendanceLogs = safeGet<any[]>(`academic_attendance_logs_${profileId}`, []);
  const attendanceDraft = safeGet<any>(`academic_draft_attendance_${profileId}`, null);

  // 3. Internal assessment entries
  const internalsDraft =
    safeGet<any>(`academic_draft_internals_${profileId}`, null) ||
    safeGet<any>('academic_draft_internals', null);

  // 4. Saved SGPA, CGPA, Internal, Attendance calculations
  const calculations = await db.getCalculationsByProfile(profileId);

  // 5. Academic companion & semester planner
  const tasks = safeGet<any[]>(`academic_companion_tasks_${profileId}`, []);
  const planner = safeGet<any>(`academic_companion_planner_${profileId}`, {});
  const forecaster = safeGet<any>(`academic_companion_forecaster_${profileId}`, {});
  const semesters = safeGet<any[]>(`academic_planner_semesters_${profileId}`, []);
  const goals = safeGet<any>(`academic_goals_${profileId}`, null);

  // 5b. Exam Prep & Revision Planner
  const exams = safeGet<any[]>(`academic_exams_${profileId}`, []);
  const syllabusTopics = safeGet<any[]>(`academic_syllabus_topics_${profileId}`, []);
  const studySessions = safeGet<any[]>(`academic_study_sessions_${profileId}`, []);
  const studySchedule = safeGet<any>(`academic_study_schedule_${profileId}`, null);

  // 5c. Question Bank & Mock Exam Center
  const mockQuestions = safeGet<any[]>(`academic_question_bank_${profileId}`, []);
  const mockExamConfigs = safeGet<any[]>(`academic_mock_exams_${profileId}`, []);
  const mockExamAttempts = safeGet<any[]>(`academic_exam_attempts_${profileId}`, []);
  const mockMistakes = safeGet<any[]>(`academic_mistake_notebook_${profileId}`, []);

  // 5d. Academic Vault Documents (metadata)
  const vaultDocuments = await getDocumentsForProfile(profileId);
  const vaultFolders = await getVaultFolders(profileId);

  // 6. User preferences
  const theme = typeof window !== 'undefined' ? localStorage.getItem('academic_calculator_theme') : 'system';

  const backup: StudentBackupData = {
    version: '2.0.0',
    app: 'University Academic Calculator',
    exportTimestamp: new Date().toISOString(),
    sourceProfile: {
      id: profile.id,
      name: profile.name.trim(),
      rollNumber: profile.rollNumber?.trim() || undefined,
      department: profile.department || profile.branch || undefined,
      degree: profile.degree || 'B.Tech',
      regulation: profile.regulation || 'VTR21',
      degreePathway: profile.degreePathway || 'standard',
      targetAttendance: profile.targetAttendance ?? 75,
      customGraduationCredits: profile.customGraduationCredits ?? 160,
      admissionYear: profile.admissionYear,
      academicYear: profile.academicYear,
      semester: profile.semester,
      currentSemester: profile.currentSemester,
    },
    credits: {
      subjects: Array.isArray(rawCredits) ? rawCredits : [],
      pathway: profile.degreePathway,
      targetCredits: profile.customGraduationCredits,
    },
    attendance: {
      subjects: Array.isArray(attendanceSubjects) ? attendanceSubjects : [],
      logs: Array.isArray(attendanceLogs) ? attendanceLogs : [],
      draft: attendanceDraft,
    },
    internals: {
      draft: internalsDraft,
    },
    calculations: Array.isArray(calculations) ? calculations : [],
    companion: {
      tasks: Array.isArray(tasks) ? tasks : [],
      planner: planner || {},
      forecaster: forecaster || {},
      semesters: Array.isArray(semesters) ? semesters : [],
      goals: goals || null,
    },
    examPrep: {
      exams: Array.isArray(exams) ? exams : [],
      topics: Array.isArray(syllabusTopics) ? syllabusTopics : [],
      sessions: Array.isArray(studySessions) ? studySessions : [],
      schedule: studySchedule || null,
    },
    mockExams: {
      questions: Array.isArray(mockQuestions) ? mockQuestions : [],
      exams: Array.isArray(mockExamConfigs) ? mockExamConfigs : [],
      attempts: Array.isArray(mockExamAttempts) ? mockExamAttempts : [],
      mistakes: Array.isArray(mockMistakes) ? mockMistakes : [],
    },
    vault: {
      documents: Array.isArray(vaultDocuments) ? vaultDocuments : [],
      folders: Array.isArray(vaultFolders) ? vaultFolders : [],
      note: 'Academic Vault document metadata. Binary files remain stored in local device IndexedDB.',
    },
    gamification: {
      profile: safeGet<any>(`academic_gamification_profile_${profileId}`, null),
      transactions: safeGet<any[]>(`academic_points_history_${profileId}`, []),
      unlocked: safeGet<any>(`academic_unlocked_achievements_${profileId}`, {}),
      challenges: safeGet<any[]>(`academic_weekly_challenges_${profileId}`, []),
    },
    preferences: {
      theme: theme || 'system',
      regulation: profile.regulation || 'VTR21',
      degreePathway: profile.degreePathway || 'standard',
      targetAttendance: profile.targetAttendance ?? 75,
      customGraduationCredits: profile.customGraduationCredits ?? 160,
    },
  };

  return backup;
}

/**
 * Triggers a browser download of the backup file.
 */
export function downloadBackupFile(backup: StudentBackupData, filename?: string): void {
  const json = JSON.stringify(backup, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const safeName = backup.sourceProfile.name.replace(/[^a-zA-Z0-9_-]/g, '_') || 'Student';
  const dateStr = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = filename || `${safeName}_Academic_Backup_${dateStr}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Validates a backup file string and returns normalized backup data & summary.
 * Rejects malformed JSON, unsupported formats, or missing essential profile data.
 */
export function validateBackupFile(fileContent: string): {
  valid: boolean;
  data?: StudentBackupData;
  error?: string;
  summary?: BackupSummary;
} {
  if (!fileContent || !fileContent.trim()) {
    return { valid: false, error: 'The uploaded file is empty.' };
  }

  let parsed: any;
  try {
    parsed = JSON.parse(fileContent);
  } catch (err: any) {
    return { valid: false, error: `Invalid JSON syntax: ${err.message || 'Parsing failed.'}` };
  }

  if (typeof parsed !== 'object' || parsed === null) {
    return { valid: false, error: 'Backup root structure must be a valid JSON object.' };
  }

  // Handle Version 2.0.0
  if (parsed.version === '2.0.0' || (parsed.sourceProfile && parsed.credits)) {
    const profile = parsed.sourceProfile || parsed.profile;
    if (!profile || typeof profile.name !== 'string' || !profile.name.trim()) {
      return { valid: false, error: 'Backup is missing required student profile name.' };
    }

    const courses = Array.isArray(parsed.credits?.subjects) ? parsed.credits.subjects : [];
    const attendance = Array.isArray(parsed.attendance?.subjects) ? parsed.attendance.subjects : [];
    const calculations = Array.isArray(parsed.calculations) ? parsed.calculations : [];
    const tasks = Array.isArray(parsed.companion?.tasks) ? parsed.companion.tasks : [];
    const internalsCount = parsed.internals?.draft ? 1 : 0;

    const normalizedData: StudentBackupData = {
      version: '2.0.0',
      app: 'University Academic Calculator',
      exportTimestamp: parsed.exportTimestamp || new Date().toISOString(),
      sourceProfile: {
        id: profile.id || `std-${Date.now()}`,
        name: profile.name.trim(),
        rollNumber: profile.rollNumber,
        department: profile.department || profile.branch,
        degree: profile.degree || 'B.Tech',
        regulation: profile.regulation || 'VTR21',
        degreePathway: profile.degreePathway || 'standard',
        targetAttendance: profile.targetAttendance ?? 75,
        customGraduationCredits: profile.customGraduationCredits ?? 160,
        admissionYear: profile.admissionYear,
        academicYear: profile.academicYear,
        semester: profile.semester,
        currentSemester: profile.currentSemester,
      },
      credits: {
        subjects: courses,
        pathway: parsed.credits?.pathway || profile.degreePathway,
        targetCredits: parsed.credits?.targetCredits || profile.customGraduationCredits,
      },
      attendance: {
        subjects: attendance,
        logs: Array.isArray(parsed.attendance?.logs) ? parsed.attendance.logs : [],
        draft: parsed.attendance?.draft,
      },
      internals: {
        draft: parsed.internals?.draft,
        subjects: Array.isArray(parsed.internals?.subjects) ? parsed.internals.subjects : [],
      },
      calculations: calculations,
      companion: {
        tasks: tasks,
        planner: parsed.companion?.planner || {},
        forecaster: parsed.companion?.forecaster || {},
      },
      preferences: parsed.preferences || {},
    };

    return {
      valid: true,
      data: normalizedData,
      summary: {
        studentName: profile.name.trim(),
        rollNumber: profile.rollNumber,
        department: profile.department || profile.branch,
        exportDate: normalizedData.exportTimestamp,
        version: normalizedData.version,
        counts: {
          coursesCount: courses.length,
          attendanceCount: attendance.length,
          internalsCount,
          calculationsCount: calculations.length,
          tasksCount: tasks.length,
        },
      },
    };
  }

  // Handle Version 1.0.0 (Legacy Profile Export)
  if (parsed.profile && typeof parsed.profile.name === 'string') {
    const profile = parsed.profile;
    const calculations = Array.isArray(parsed.calculations) ? parsed.calculations : [];
    const normalizedData: StudentBackupData = {
      version: '1.0.0',
      app: 'University Academic Calculator',
      exportTimestamp: parsed.exportDate || new Date().toISOString(),
      sourceProfile: {
        id: profile.id,
        name: profile.name.trim(),
        rollNumber: profile.rollNumber,
        department: profile.department || profile.branch,
        degree: profile.degree || 'B.Tech',
        regulation: profile.regulation || 'VTR21',
        degreePathway: profile.degreePathway || 'standard',
        targetAttendance: profile.targetAttendance ?? 75,
        customGraduationCredits: profile.customGraduationCredits ?? 160,
      },
      credits: {
        subjects: [],
        pathway: profile.degreePathway,
      },
      attendance: { subjects: [] },
      internals: {},
      calculations,
      companion: { tasks: [], planner: {}, forecaster: {} },
      preferences: {},
    };

    return {
      valid: true,
      data: normalizedData,
      summary: {
        studentName: profile.name.trim(),
        rollNumber: profile.rollNumber,
        department: profile.department || profile.branch,
        exportDate: normalizedData.exportTimestamp,
        version: '1.0.0 (Legacy)',
        counts: {
          coursesCount: 0,
          attendanceCount: 0,
          internalsCount: 0,
          calculationsCount: calculations.length,
          tasksCount: 0,
        },
      },
    };
  }

  return {
    valid: false,
    error:
      'Unsupported backup format. File does not contain recognized University Academic Calculator student data structure.',
  };
}

/**
 * Detects conflicts between the target active profile and the backup file records.
 */
export async function detectBackupConflicts(
  targetProfile: StudentProfile,
  backup: StudentBackupData
): Promise<BackupConflictReport> {
  const isDifferentStudent =
    targetProfile.id !== backup.sourceProfile.id &&
    targetProfile.name.trim().toLowerCase() !== backup.sourceProfile.name.trim().toLowerCase();

  const warnings: string[] = [];
  if (isDifferentStudent) {
    warnings.push(
      `Backup file was exported from "${backup.sourceProfile.name}"${
        backup.sourceProfile.rollNumber ? ` (${backup.sourceProfile.rollNumber})` : ''
      }, while active profile is "${targetProfile.name}".`
    );
  }

  // Check existing courses for duplicates
  const existingCourses = safeGet<CreditSubjectItem[]>(
    `academic_credits_subjects_${targetProfile.id}`,
    []
  );
  let duplicateCoursesCount = 0;
  let newCoursesCount = 0;

  backup.credits.subjects.forEach((bc) => {
    const isDup = existingCourses.some(
      (ec) =>
        (ec.code && bc.code && ec.code.toUpperCase() === bc.code.toUpperCase()) ||
        ec.name.trim().toLowerCase() === bc.name.trim().toLowerCase()
    );
    if (isDup) duplicateCoursesCount++;
    else newCoursesCount++;
  });

  // Check calculations for duplicates
  const existingCalcs = await db.getCalculationsByProfile(targetProfile.id);
  let duplicateCalculationsCount = 0;
  let newCalculationsCount = 0;

  backup.calculations.forEach((bcalc) => {
    const isDup = existingCalcs.some(
      (ecalc) => ecalc.id === bcalc.id || (ecalc.title === bcalc.title && ecalc.type === bcalc.type)
    );
    if (isDup) duplicateCalculationsCount++;
    else newCalculationsCount++;
  });

  // Check attendance duplicates
  const existingAtt = safeGet<any[]>(`academic_attendance_subjects_${targetProfile.id}`, []);
  let duplicateAttendanceCount = 0;
  backup.attendance.subjects.forEach((batt) => {
    const isDup = existingAtt.some(
      (eatt) =>
        (eatt.code && batt.code && eatt.code === batt.code) ||
        (eatt.name && batt.name && eatt.name.trim().toLowerCase() === batt.name.trim().toLowerCase())
    );
    if (isDup) duplicateAttendanceCount++;
  });

  if (duplicateCoursesCount > 0) {
    warnings.push(
      `${duplicateCoursesCount} course(s) in this backup match existing course names or codes.`
    );
  }
  if (duplicateCalculationsCount > 0) {
    warnings.push(
      `${duplicateCalculationsCount} calculation(s) have identical titles or IDs to existing saved calculations.`
    );
  }

  return {
    isDifferentStudent,
    sourceStudentName: backup.sourceProfile.name,
    targetStudentName: targetProfile.name,
    sourceRollNumber: backup.sourceProfile.rollNumber,
    targetRollNumber: targetProfile.rollNumber,
    duplicateCalculationsCount,
    duplicateCoursesCount,
    duplicateAttendanceCount,
    newCoursesCount,
    newCalculationsCount,
    warnings,
  };
}

/**
 * Restores student backup into the specified active profile using 'merge' or 'replace'.
 * Confirms successful storage writes before returning success.
 */
export async function restoreStudentBackup(
  targetProfileId: string,
  backup: StudentBackupData,
  strategy: 'merge' | 'replace'
): Promise<{ success: boolean; message: string; stats: RestoreStats }> {
  if (!isStorageAvailable()) {
    throw new Error(
      'Device local storage is unavailable or restricted. Please check browser privacy/cookie settings.'
    );
  }

  const profile = await db.getProfile(targetProfileId);
  if (!profile) {
    throw new Error('Target profile not found for restoration.');
  }

  try {
    let coursesToSave: CreditSubjectItem[] = [];
    let attendanceToSave: any[] = [];
    let calculationsToSave: SavedCalculation[] = [];
    let tasksToSave: any[] = [];

    if (strategy === 'replace') {
      // Clean replacement: Assign profileId to all backup items
      coursesToSave = backup.credits.subjects.map((c) => ({
        ...c,
        id: c.id || `sub-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        profileId: targetProfileId,
      }));

      attendanceToSave = backup.attendance.subjects.map((a) => ({
        ...a,
        profileId: targetProfileId,
      }));

      calculationsToSave = backup.calculations.map((calc) => ({
        ...calc,
        id: `calc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        profileId: targetProfileId,
      }));

      tasksToSave = backup.companion.tasks.map((t) => ({
        ...t,
        profileId: targetProfileId,
      }));

      // Delete existing calculations for this profile in IndexedDB
      const existingCalcs = await db.getCalculationsByProfile(targetProfileId);
      for (const ec of existingCalcs) {
        await db.deleteCalculation(ec.id);
      }
    } else {
      // Safe Merge Strategy
      const existingCourses = safeGet<CreditSubjectItem[]>(
        `academic_credits_subjects_${targetProfileId}`,
        []
      );
      coursesToSave = [...existingCourses];
      backup.credits.subjects.forEach((bc) => {
        const idx = coursesToSave.findIndex(
          (ec) =>
            (ec.code && bc.code && ec.code.toUpperCase() === bc.code.toUpperCase()) ||
            ec.name.trim().toLowerCase() === bc.name.trim().toLowerCase()
        );
        if (idx >= 0) {
          // Update existing course with verified credits/status if present
          coursesToSave[idx] = {
            ...coursesToSave[idx],
            ...bc,
            profileId: targetProfileId,
          };
        } else {
          coursesToSave.push({
            ...bc,
            id: `sub-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            profileId: targetProfileId,
          });
        }
      });

      // Merge attendance
      const existingAtt = safeGet<any[]>(`academic_attendance_subjects_${targetProfileId}`, []);
      attendanceToSave = [...existingAtt];
      backup.attendance.subjects.forEach((ba) => {
        const idx = attendanceToSave.findIndex(
          (ea) =>
            (ea.code && ba.code && ea.code === ba.code) ||
            (ea.name && ba.name && ea.name.trim().toLowerCase() === ba.name.trim().toLowerCase())
        );
        if (idx >= 0) {
          attendanceToSave[idx] = { ...attendanceToSave[idx], ...ba, profileId: targetProfileId };
        } else {
          attendanceToSave.push({
            ...ba,
            id: ba.id || `att-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            profileId: targetProfileId,
          });
        }
      });

      // Merge calculations
      const existingCalcs = await db.getCalculationsByProfile(targetProfileId);
      calculationsToSave = [];
      for (const bc of backup.calculations) {
        const isDup = existingCalcs.some(
          (ec) => ec.id === bc.id || (ec.title === bc.title && ec.type === bc.type)
        );
        if (!isDup) {
          calculationsToSave.push({
            ...bc,
            id: `calc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            profileId: targetProfileId,
          });
        }
      }

      // Merge tasks
      const existingTasks = safeGet<any[]>(`academic_companion_tasks_${targetProfileId}`, []);
      tasksToSave = [...existingTasks];
      backup.companion.tasks.forEach((bt) => {
        const isDup = tasksToSave.some((et) => et.id === bt.id || et.title === bt.title);
        if (!isDup) {
          tasksToSave.push({
            ...bt,
            id: bt.id || `task-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            profileId: targetProfileId,
          });
        }
      });
    }

    // Write courses to storage with write verification
    const coursesKey = `academic_credits_subjects_${targetProfileId}`;
    if (!safeSet(coursesKey, coursesToSave)) {
      throw new Error(
        'Storage write failed for course credits. Browser quota exceeded. Free space or delete old calculations.'
      );
    }

    // Write attendance to storage
    const attKey = `academic_attendance_subjects_${targetProfileId}`;
    if (!safeSet(attKey, attendanceToSave)) {
      throw new Error('Storage write failed for attendance records. Browser quota exceeded.');
    }

    // Write companion tasks
    const tasksKey = `academic_companion_tasks_${targetProfileId}`;
    safeSet(tasksKey, tasksToSave);

    // Write semesters if present
    if (Array.isArray(backup.companion?.semesters) && backup.companion.semesters.length > 0) {
      const mappedSemesters = backup.companion.semesters.map((s: any) => ({
        ...s,
        profileId: targetProfileId,
      }));
      safeSet(`academic_planner_semesters_${targetProfileId}`, mappedSemesters);
    }

    // Write goals if present
    if (backup.companion?.goals) {
      safeSet(`academic_goals_${targetProfileId}`, {
        ...backup.companion.goals,
        profileId: targetProfileId,
      });
    }

    // Write exam prep data if present
    if (backup.examPrep) {
      if (Array.isArray(backup.examPrep.exams)) {
        safeSet(
          `academic_exams_${targetProfileId}`,
          backup.examPrep.exams.map((e: any) => ({ ...e, profileId: targetProfileId }))
        );
      }
      if (Array.isArray(backup.examPrep.topics)) {
        safeSet(
          `academic_syllabus_topics_${targetProfileId}`,
          backup.examPrep.topics.map((t: any) => ({ ...t, profileId: targetProfileId }))
        );
      }
      if (Array.isArray(backup.examPrep.sessions)) {
        safeSet(
          `academic_study_sessions_${targetProfileId}`,
          backup.examPrep.sessions.map((s: any) => ({ ...s, profileId: targetProfileId }))
        );
      }
      if (backup.examPrep.schedule) {
        safeSet(`academic_study_schedule_${targetProfileId}`, backup.examPrep.schedule);
      }
    }

    // Write mock exams data if present
    if (backup.mockExams) {
      if (Array.isArray(backup.mockExams.questions)) {
        safeSet(
          `academic_question_bank_${targetProfileId}`,
          backup.mockExams.questions.map((q: any) => ({ ...q, profileId: targetProfileId }))
        );
      }
      if (Array.isArray(backup.mockExams.exams)) {
        safeSet(
          `academic_mock_exams_${targetProfileId}`,
          backup.mockExams.exams.map((e: any) => ({ ...e, profileId: targetProfileId }))
        );
      }
      if (Array.isArray(backup.mockExams.attempts)) {
        safeSet(
          `academic_exam_attempts_${targetProfileId}`,
          backup.mockExams.attempts.map((a: any) => ({ ...a, profileId: targetProfileId }))
        );
      }
      if (Array.isArray(backup.mockExams.mistakes)) {
        safeSet(
          `academic_mistake_notebook_${targetProfileId}`,
          backup.mockExams.mistakes.map((m: any) => ({ ...m, profileId: targetProfileId }))
        );
      }
    }

    // Restore Gamification Center data if present
    if (backup.gamification) {
      if (backup.gamification.profile) {
        safeSet(`academic_gamification_profile_${targetProfileId}`, {
          ...backup.gamification.profile,
          profileId: targetProfileId,
        });
      }
      if (Array.isArray(backup.gamification.transactions)) {
        safeSet(`academic_points_history_${targetProfileId}`, backup.gamification.transactions);
      }
      if (backup.gamification.unlocked) {
        safeSet(`academic_unlocked_achievements_${targetProfileId}`, backup.gamification.unlocked);
      }
      if (Array.isArray(backup.gamification.challenges)) {
        safeSet(`academic_weekly_challenges_${targetProfileId}`, backup.gamification.challenges);
      }
    }

    // Write internals draft if present
    if (backup.internals?.draft) {
      safeSet(`academic_draft_internals_${targetProfileId}`, backup.internals.draft);
    }

    // Save calculations to IndexedDB
    for (const calc of calculationsToSave) {
      await db.saveCalculation(calc);
    }

    // Update profile preferences if replacement
    if (strategy === 'replace' && backup.sourceProfile) {
      await db.saveProfile({
        ...profile,
        department: backup.sourceProfile.department || profile.department,
        degree: backup.sourceProfile.degree || profile.degree,
        regulation: backup.sourceProfile.regulation || profile.regulation,
        degreePathway: (backup.sourceProfile.degreePathway as any) || profile.degreePathway,
        targetAttendance: backup.sourceProfile.targetAttendance ?? profile.targetAttendance,
        customGraduationCredits:
          backup.sourceProfile.customGraduationCredits ?? profile.customGraduationCredits,
        updatedAt: Date.now(),
      });
    }

    // Recalculate derived totals (verify data integrity)
    calculateCreditSummary(coursesToSave, profile.customGraduationCredits || 164, COLLEGE_CHART_TEMPLATE);

    // Dispatch system events for reactive UI wakeup
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('active-profile-changed'));
      window.dispatchEvent(new Event('student-profile-updated'));
      window.dispatchEvent(new Event('storage'));
    }

    const stats: RestoreStats = {
      coursesImported: coursesToSave.length,
      attendanceImported: attendanceToSave.length,
      calculationsImported: calculationsToSave.length,
      tasksImported: tasksToSave.length,
      strategy,
    };

    return {
      success: true,
      message: `Restoration successful! (${strategy === 'replace' ? 'Replaced' : 'Merged'} ${
        stats.coursesImported
      } courses, ${stats.attendanceImported} attendance subjects, and ${
        stats.calculationsImported
      } saved calculations).`,
      stats,
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Restoration failed: ${err.message || 'Storage write error.'}`,
      stats: {
        coursesImported: 0,
        attendanceImported: 0,
        calculationsImported: 0,
        tasksImported: 0,
        strategy,
      },
    };
  }
}

/**
 * Resets personal data for the active profile strictly to zero / empty.
 * Preserves shared course catalogues, official curriculum rules, and other profiles' data.
 */
export async function resetStudentPersonalData(
  profileId: string
): Promise<{ success: boolean; message: string }> {
  try {
    // 1. Reset credit subjects to empty
    safeSet(`academic_credits_subjects_${profileId}`, []);
    safeRemove(`academic_credits_nptel_rules_${profileId}`);

    // 2. Reset attendance subjects and logs to empty
    safeSet(`academic_attendance_subjects_${profileId}`, []);
    safeSet(`academic_attendance_logs_${profileId}`, []);
    safeRemove(`academic_draft_attendance_${profileId}`);

    // 3. Reset internal marks drafts
    safeRemove(`academic_draft_internals_${profileId}`);

    // 4. Reset companion tasks, planner, and goals
    safeSet(`academic_companion_tasks_${profileId}`, []);
    safeSet(`academic_companion_planner_${profileId}`, {});
    safeSet(`academic_companion_forecaster_${profileId}`, {});
    safeSet(`academic_planner_semesters_${profileId}`, []);
    safeRemove(`academic_goals_${profileId}`);

    // 4b. Reset exam prep
    safeSet(`academic_exams_${profileId}`, []);
    safeSet(`academic_syllabus_topics_${profileId}`, []);
    safeSet(`academic_study_sessions_${profileId}`, []);
    safeRemove(`academic_study_schedule_${profileId}`);

    // 4c. Reset mock exams & question bank
    safeSet(`academic_question_bank_${profileId}`, []);
    safeSet(`academic_mock_exams_${profileId}`, []);
    safeSet(`academic_exam_attempts_${profileId}`, []);
    safeRemove(`academic_active_attempt_${profileId}`);
    safeSet(`academic_mistake_notebook_${profileId}`, []);

    // 4d. Reset Academic Vault documents & folders
    const vaultDocs = await getDocumentsForProfile(profileId);
    for (const vd of vaultDocs) {
      await deleteDocument(profileId, vd.id);
    }
    const vaultFldrs = await getVaultFolders(profileId);
    for (const vf of vaultFldrs) {
      await deleteVaultFolder(profileId, vf.id);
    }

    // 4e. Reset Academic Achievement & Gamification data
    safeRemove(`academic_gamification_profile_${profileId}`);
    safeSet(`academic_points_history_${profileId}`, []);
    safeSet(`academic_unlocked_achievements_${profileId}`, {});
    safeSet(`academic_weekly_challenges_${profileId}`, []);

    // 5. Delete calculations for this profile in IndexedDB
    const calcs = await db.getCalculationsByProfile(profileId);
    for (const c of calcs) {
      await db.deleteCalculation(c.id);
    }

    // 6. Delete credit progress in IndexedDB
    await db.deleteCreditProgress(profileId);

    // Dispatch update events
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('active-profile-changed'));
      window.dispatchEvent(new Event('student-profile-updated'));
      window.dispatchEvent(new Event('storage'));
    }

    return {
      success: true,
      message: 'Personal records reset to zero successfully. Shared catalogues remain intact.',
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Reset failed: ${err.message || 'Storage error during reset.'}`,
    };
  }
}

/**
 * Inspects device local storage and IndexedDB usage for the specified student profile.
 */
export async function getStorageBreakdown(profileId: string): Promise<StorageBreakdown> {
  const calcs = await db.getCalculationsByProfile(profileId);
  const calcsBytes = getByteSize(JSON.stringify(calcs));

  const coursesRaw = safeGet<any[]>(`academic_credits_subjects_${profileId}`, []);
  const coursesBytes = getByteSize(JSON.stringify(coursesRaw));

  const attRaw = safeGet<any[]>(`academic_attendance_subjects_${profileId}`, []);
  const attBytes = getByteSize(JSON.stringify(attRaw));

  const internalsDraft = safeGet<any>(`academic_draft_internals_${profileId}`, null);
  const internalsBytes = internalsDraft ? getByteSize(JSON.stringify(internalsDraft)) : 0;

  const tasksRaw = safeGet<any[]>(`academic_companion_tasks_${profileId}`, []);

  const totalProfileBytes = calcsBytes + coursesBytes + attBytes + internalsBytes;

  let storageEstimateQuota: number | undefined;
  let storageEstimateUsage: number | undefined;

  if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
    try {
      const estimate = await navigator.storage.estimate();
      storageEstimateQuota = estimate.quota;
      storageEstimateUsage = estimate.usage;
    } catch {
      // ignore
    }
  }

  return {
    indexedDbCalculationsCount: calcs.length,
    indexedDbCalculationsBytes: calcsBytes,
    creditsCount: coursesRaw.length,
    creditsBytes: coursesBytes,
    attendanceCount: attRaw.length,
    attendanceBytes: attBytes,
    internalsBytes,
    companionTasksCount: tasksRaw.length,
    totalProfileBytes,
    formattedTotalBytes: formatBytes(totalProfileBytes),
    storageEstimateQuota,
    storageEstimateUsage,
    formattedEstimateUsage: storageEstimateUsage ? formatBytes(storageEstimateUsage) : undefined,
    formattedEstimateQuota: storageEstimateQuota ? formatBytes(storageEstimateQuota) : undefined,
  };
}
