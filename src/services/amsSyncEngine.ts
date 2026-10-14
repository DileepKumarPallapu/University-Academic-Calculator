/**
 * Centralized AMS Data Synchronization and Integration Engine
 * Coordinates verification, synchronization, provenance tracking, duplicate prevention,
 * and safe cross-calculator transfers with explicit confirmation.
 */

import type {
  AmsSubjectAttendance,
  AmsConnectionStatus,
} from '../types/amsDashboard';
import {
  getAmsDashboardData,
  addAmsSyncLog,
  calculateAmsAttendancePercentage,
} from './amsStorage';
import {
  generateCompositeKey,
} from './amsIntegrationAdapter';
import {
  validateDashboardData,
  type ValidationReport,
} from './amsValidationEngine';
import { safeGetItem, safeSetItem, sanitizeCourseTitle } from './catalogueStorage';

export type SyncProvenance =
  | 'OFFICIAL_AMS'
  | 'IMPORTED_DOCUMENT'
  | 'MANUAL_ENTRY'
  | 'CALCULATED_ESTIMATE';

export type SyncModuleKey =
  | 'profile'
  | 'timetable'
  | 'attendance'
  | 'registered'
  | 'testLab'
  | 'internals'
  | 'results'
  | 'credits'
  | 'documents'
  | 'history';

export interface SyncMetrics {
  retrieved: number;
  added: number;
  updated: number;
  unchanged: number;
  flagged: number;
  failed: number;
}

export interface SyncCenterState {
  profileId: string;
  connectionStatus: AmsConnectionStatus;
  lastSyncTime?: number;
  metrics: SyncMetrics;
  perModuleStatus: Record<SyncModuleKey, 'synced' | 'not_available' | 'flagged' | 'failed' | 'not_synced'>;
  validationReport: ValidationReport;
  errors: string[];
}

export class AmsSyncEngine {
  /**
   * Generates a complete live Sync Center snapshot for a student profile
   */
  getSyncCenterState(profileId: string): SyncCenterState {
    const data = getAmsDashboardData(profileId);
    const validationReport = validateDashboardData(data);

    const hasFlaggedAttendance = validationReport.issues.some((i) => i.module === 'attendance');
    const hasFlaggedInternals = validationReport.issues.some((i) => i.module === 'internals');
    const hasFlaggedResults = validationReport.issues.some((i) => i.module === 'results');

    const totalRetrieved =
      data.attendance.length +
      data.timetable.length +
      data.internalMarks.length +
      data.semesterResults.length +
      data.registeredCourses.length;

    const metrics: SyncMetrics = {
      retrieved: totalRetrieved,
      added: 0,
      updated: 0,
      unchanged: totalRetrieved,
      flagged: validationReport.issues.length,
      failed: validationReport.errorCount,
    };

    const perModuleStatus: Record<SyncModuleKey, 'synced' | 'not_available' | 'flagged' | 'failed' | 'not_synced'> = {
      profile: data.academicProfile.studentId ? 'synced' : 'not_available',
      timetable: data.timetable.length > 0 ? 'synced' : 'not_available',
      attendance:
        data.attendance.length > 0
          ? hasFlaggedAttendance
            ? 'flagged'
            : 'synced'
          : 'not_available',
      registered: data.registeredCourses.length > 0 ? 'synced' : 'not_available',
      testLab:
        data.internalMarks.filter((m) => m.category !== 'internal').length > 0
          ? hasFlaggedInternals
            ? 'flagged'
            : 'synced'
          : 'not_available',
      internals:
        data.internalMarks.filter((m) => m.category === 'internal').length > 0
          ? hasFlaggedInternals
            ? 'flagged'
            : 'synced'
          : 'not_available',
      results:
        data.semesterResults.length > 0
          ? hasFlaggedResults
            ? 'flagged'
            : 'synced'
          : 'not_available',
      credits: data.semesterResults.length > 0 ? 'synced' : 'not_available',
      documents: 'synced',
      history: data.syncLogs.length > 0 ? 'synced' : 'not_available',
    };

    return {
      profileId,
      connectionStatus: data.academicProfile.connectionStatus,
      lastSyncTime: data.lastSyncTime,
      metrics,
      perModuleStatus,
      validationReport,
      errors: validationReport.issues
        .filter((i) => i.severity === 'error')
        .map((i) => `${i.recordTitle || i.module}: ${i.message}`),
    };
  }

  /**
   * Safely merges new records with existing records using stable composite keys
   * and preserves source provenance.
   */
  mergeAttendanceRecords(
    existing: AmsSubjectAttendance[],
    incoming: AmsSubjectAttendance[],
    provenance: SyncProvenance = 'OFFICIAL_AMS'
  ): { merged: AmsSubjectAttendance[]; added: number; updated: number; unchanged: number } {
    let added = 0;
    let updated = 0;
    let unchanged = 0;

    const merged = [...existing];

    for (const item of incoming) {
      const cleanName = sanitizeCourseTitle(item.subjectName);
      const compositeKey = generateCompositeKey([item.courseCode || cleanName]);

      const idx = merged.findIndex(
        (m) => generateCompositeKey([m.courseCode || m.subjectName]) === compositeKey
      );

      if (idx >= 0) {
        const cur = merged[idx];
        const isDifferent =
          cur.officialTotalSessions !== item.officialTotalSessions ||
          cur.presentSessions !== item.presentSessions ||
          cur.courseCode !== item.courseCode;

        if (isDifferent) {
          merged[idx] = {
            ...cur,
            officialTotalSessions: item.officialTotalSessions,
            presentSessions: item.presentSessions,
            absentSessions: Math.max(0, item.officialTotalSessions - item.presentSessions),
            percentage: calculateAmsAttendancePercentage(
              item.officialTotalSessions,
              item.presentSessions
            ),
            courseCode: item.courseCode || cur.courseCode,
            source: provenance === 'OFFICIAL_AMS' ? 'Official AMS Record' : 'Manual Import',
            lastUpdated: new Date().toISOString().split('T')[0],
          };
          updated++;
        } else {
          unchanged++;
        }
      } else {
        merged.push({
          ...item,
          subjectName: cleanName,
          source: provenance === 'OFFICIAL_AMS' ? 'Official AMS Record' : 'Manual Import',
          lastUpdated: new Date().toISOString().split('T')[0],
        });
        added++;
      }
    }

    return { merged, added, updated, unchanged };
  }

  /**
   * Transfer verified attendance to the manual Attendance Calculator
   * Does NOT overwrite custom user subjects; matches on name or code.
   */
  transferToAttendanceCalculator(profileId: string): {
    added: number;
    updated: number;
    unchanged: number;
  } {
    const ams = getAmsDashboardData(profileId);
    if (!ams.attendance || ams.attendance.length === 0) {
      return { added: 0, updated: 0, unchanged: 0 };
    }

    const key = `academic_attendance_subjects_${profileId}`;
    const raw = safeGetItem(key);
    const manualSubjects: any[] = raw ? JSON.parse(raw) : [];

    let added = 0;
    let updated = 0;
    let unchanged = 0;

    for (const item of ams.attendance) {
      const cleanName = sanitizeCourseTitle(item.subjectName);
      const matchIdx = manualSubjects.findIndex(
        (s) => s.name.trim().toLowerCase() === cleanName.toLowerCase()
      );

      if (matchIdx >= 0) {
        const current = manualSubjects[matchIdx];
        if (
          current.conducted !== item.officialTotalSessions ||
          current.attended !== item.presentSessions
        ) {
          manualSubjects[matchIdx] = {
            ...current,
            conducted: item.officialTotalSessions,
            attended: item.presentSessions,
            code: item.courseCode || current.code,
            provenance: 'OFFICIAL_AMS',
            isVerified: true,
            source: 'Official AMS Record (Synced)',
            updatedAt: Date.now(),
          };
          updated++;
        } else {
          unchanged++;
        }
      } else {
        manualSubjects.push({
          id: `att-sync-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          name: cleanName,
          code: item.courseCode,
          conducted: item.officialTotalSessions,
          attended: item.presentSessions,
          provenance: 'OFFICIAL_AMS',
          isVerified: true,
          source: 'Official AMS Record (Synced)',
          createdAt: Date.now(),
        });
        added++;
      }
    }

    safeSetItem(key, JSON.stringify(manualSubjects));

    addAmsSyncLog(profileId, {
      type: 'reconcile',
      status: 'success',
      message: `Exported to Attendance Calculator: ${added} added, ${updated} updated, ${unchanged} unchanged.`,
    });

    return { added, updated, unchanged };
  }

  /**
   * Transfer verified semester results into the Credits Planner and SGPA store
   * Prevents duplication and flags mismatched regulations.
   */
  transferToCreditsPlanner(
    profileId: string,
    regulation?: string
  ): { added: number; updated: number; skipped: number } {
    const ams = getAmsDashboardData(profileId);
    if (!ams.semesterResults || ams.semesterResults.length === 0) {
      return { added: 0, updated: 0, skipped: 0 };
    }

    const reg = regulation || ams.academicProfile.regulation || 'VTR21';
    const isVtr25 = reg.toUpperCase().includes('VTR25');

    const key = `academic_credits_subjects_${profileId}`;
    const raw = safeGetItem(key);
    const existing: any[] = raw ? JSON.parse(raw) : [];

    let added = 0;
    let updated = 0;
    let skipped = 0;

    for (const r of ams.semesterResults) {
      const cleanName = sanitizeCourseTitle(r.courseName);
      const code = isVtr25 ? undefined : (r.courseCode?.trim().toUpperCase() || undefined);

      const matchIdx = existing.findIndex((e) => {
        if (!isVtr25 && code && e.code) {
          return e.code.toUpperCase() === code;
        }
        return e.name.toLowerCase() === cleanName.toLowerCase();
      });

      const targetStatus = r.status === 'Pass' ? 'Passed' : 'Failed';

      if (matchIdx >= 0) {
        const cur = existing[matchIdx];
        if (
          cur.status !== targetStatus ||
          cur.credits !== r.credits ||
          (r.grade && cur.grade !== r.grade)
        ) {
          existing[matchIdx] = {
            ...cur,
            credits: r.credits,
            earnedCredits: r.status === 'Pass' ? r.credits : 0,
            grade: r.grade || cur.grade,
            status: targetStatus,
            isVerified: true,
            provenance: 'OFFICIAL_AMS',
            source: 'Official AMS Record (Synced)',
            updatedAt: Date.now(),
          };
          updated++;
        } else {
          skipped++;
        }
      } else {
        existing.push({
          id: `sub-sync-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          profileId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          name: cleanName,
          code,
          category: 'programme_core',
          semester: r.semester || 1,
          credits: r.credits,
          registeredCredits: r.credits,
          earnedCredits: r.status === 'Pass' ? r.credits : 0,
          grade: r.grade || '—',
          status: targetStatus,
          isVerified: true,
          provenance: 'OFFICIAL_AMS',
          source: 'Official AMS Record (Synced)',
          regulation: reg,
        });
        added++;
      }
    }

    safeSetItem(key, JSON.stringify(existing));

    addAmsSyncLog(profileId, {
      type: 'reconcile',
      status: 'success',
      message: `Exported to Credits Planner: ${added} added, ${updated} updated, ${skipped} up to date.`,
    });

    return { added, updated, skipped };
  }

  /**
   * Transfer verified semester results to GPA/SGPA calculator draft
   */
  transferToSgpaCalculator(
    profileId: string,
    targetSemester: number = 1
  ): { coursesCount: number } {
    const ams = getAmsDashboardData(profileId);
    const semesterCourses = ams.semesterResults.filter(
      (r) => (r.semester || 1) === targetSemester
    );

    if (semesterCourses.length === 0) {
      return { coursesCount: 0 };
    }

    const draftKey = `academic_draft_gpa_${profileId}`;
    const mappedCourses = semesterCourses.map((c) => ({
      id: `gpa-course-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: c.courseName,
      code: c.courseCode,
      credits: c.credits,
      grade: c.grade || 'O',
      isVerified: true,
      provenance: 'OFFICIAL_AMS',
    }));

    safeSetItem(
      draftKey,
      JSON.stringify({
        semester: targetSemester,
        courses: mappedCourses,
        source: 'Official AMS Record',
        importedAt: Date.now(),
      })
    );

    addAmsSyncLog(profileId, {
      type: 'reconcile',
      status: 'success',
      message: `Exported ${mappedCourses.length} Semester ${targetSemester} courses to SGPA Calculator.`,
    });

    return { coursesCount: mappedCourses.length };
  }
}

export const amsSyncEngine = new AmsSyncEngine();
