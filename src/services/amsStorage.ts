import type {
  AmsDashboardData,
  AmsSemesterResultItem,
  AmsSyncLogEntry,
} from '../types/amsDashboard';
import { safeGetItem, safeSetItem, sanitizeCourseTitle } from './catalogueStorage';

const STORAGE_PREFIX = 'academic_ams_dashboard_';

/**
 * Returns clean empty initial state for a student profile
 */
export function getEmptyAmsDashboardData(profileId: string): AmsDashboardData {
  return {
    profileId,
    academicProfile: {
      college: 'Vel Tech Rangarajan Dr. Sagunthala R&D Institute of Science and Technology',
      connectionStatus: 'not_connected',
    },
    attendance: [],
    timetable: [],
    internalMarks: [],
    semesterResults: [],
    registeredCourses: [],
    syncLogs: [],
  };
}

/**
 * Retrieves the AMS dashboard data for a given student profile.
 * Fresh profiles start with empty records.
 */
export function getAmsDashboardData(profileId: string): AmsDashboardData {
  if (!profileId) return getEmptyAmsDashboardData('default');

  const key = `${STORAGE_PREFIX}${profileId}`;
  const raw = safeGetItem(key);

  if (!raw) {
    return getEmptyAmsDashboardData(profileId);
  }

  try {
    const parsed = JSON.parse(raw);
    return {
      profileId,
      academicProfile: {
        ...getEmptyAmsDashboardData(profileId).academicProfile,
        ...(parsed.academicProfile || {}),
      },
      attendance: Array.isArray(parsed.attendance)
        ? parsed.attendance.map((a: any) => ({
            ...a,
            subjectName: sanitizeCourseTitle(a.subjectName),
            percentage: calculateAmsAttendancePercentage(a.officialTotalSessions, a.presentSessions),
          }))
        : [],
      timetable: Array.isArray(parsed.timetable)
        ? parsed.timetable.map((t: any) => ({
            ...t,
            subjectName: sanitizeCourseTitle(t.subjectName),
          }))
        : [],
      internalMarks: Array.isArray(parsed.internalMarks)
        ? parsed.internalMarks.map((m: any) => ({
            ...m,
            subjectName: sanitizeCourseTitle(m.subjectName),
          }))
        : [],
      semesterResults: Array.isArray(parsed.semesterResults)
        ? parsed.semesterResults.map((r: any) => ({
            ...r,
            courseName: sanitizeCourseTitle(r.courseName),
          }))
        : [],
      registeredCourses: Array.isArray(parsed.registeredCourses)
        ? parsed.registeredCourses.map((c: any) => ({
            ...c,
            courseName: sanitizeCourseTitle(c.courseName),
          }))
        : [],
      syncLogs: Array.isArray(parsed.syncLogs) ? parsed.syncLogs : [],
      lastSyncTime: parsed.lastSyncTime,
    };
  } catch {
    return getEmptyAmsDashboardData(profileId);
  }
}

/**
 * Formula:
 * Countable Present = min(Present, Official Total)
 * Percentage = (Countable Present / Official Total) * 100
 * Strictly capped at 100%. Returns null if Official Total is 0.
 */
export function calculateAmsAttendancePercentage(
  officialTotal: number,
  presentSessions: number
): number | null {
  if (isNaN(officialTotal) || officialTotal <= 0) return null;
  const safePresent = Math.max(0, isNaN(presentSessions) ? 0 : presentSessions);
  const countablePresent = Math.min(safePresent, officialTotal);
  const pct = (countablePresent / officialTotal) * 100;
  return Math.min(100, Math.round(pct * 100) / 100);
}

/**
 * Persists updated AMS dashboard data for a student profile
 */
export function saveAmsDashboardData(
  profileId: string,
  updates: Partial<AmsDashboardData>
): { success: boolean; error?: string } {
  if (!profileId) return { success: false, error: 'Profile ID is required.' };

  const current = getAmsDashboardData(profileId);
  const merged: AmsDashboardData = {
    ...current,
    ...updates,
    profileId,
    academicProfile: {
      ...current.academicProfile,
      ...(updates.academicProfile || {}),
    },
    attendance: updates.attendance !== undefined ? updates.attendance : current.attendance,
    timetable: updates.timetable !== undefined ? updates.timetable : current.timetable,
    internalMarks: updates.internalMarks !== undefined ? updates.internalMarks : current.internalMarks,
    semesterResults: updates.semesterResults !== undefined ? updates.semesterResults : current.semesterResults,
    registeredCourses: updates.registeredCourses !== undefined ? updates.registeredCourses : current.registeredCourses,
    syncLogs: updates.syncLogs !== undefined ? updates.syncLogs : current.syncLogs,
    lastSyncTime: updates.lastSyncTime !== undefined ? updates.lastSyncTime : current.lastSyncTime,
  };

  try {
    const key = `${STORAGE_PREFIX}${profileId}`;
    safeSetItem(key, JSON.stringify(merged));
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to save AMS records.' };
  }
}

/**
 * Appends a sync history log entry
 */
export function addAmsSyncLog(
  profileId: string,
  entry: Omit<AmsSyncLogEntry, 'id' | 'profileId' | 'timestamp'>
): void {
  const current = getAmsDashboardData(profileId);
  const newLog: AmsSyncLogEntry = {
    id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    profileId,
    timestamp: Date.now(),
    ...entry,
  };

  saveAmsDashboardData(profileId, {
    syncLogs: [newLog, ...current.syncLogs].slice(0, 50),
    lastSyncTime: Date.now(),
  });
}

/**
 * Completely clears all imported AMS records for a student profile
 */
export function clearAmsDataForProfile(profileId: string): void {
  const key = `${STORAGE_PREFIX}${profileId}`;
  safeSetItem(key, JSON.stringify(getEmptyAmsDashboardData(profileId)));
}

/**
 * Exports AMS personal data to formatted JSON string
 */
export function exportAmsDataForProfile(profileId: string): string {
  const data = getAmsDashboardData(profileId);
  return JSON.stringify(
    {
      exportVersion: '1.0.0',
      exportedAt: new Date().toISOString(),
      institution: 'Vel Tech Rangarajan Dr. Sagunthala R&D Institute of Science and Technology',
      data,
    },
    null,
    2
  );
}

/**
 * Reconciles imported AMS semester results with the student's personal Credit audit records
 * without double-counting courses or overwriting custom changes blindly.
 */
export function reconcileAmsWithCredits(
  profileId: string,
  importedResults: AmsSemesterResultItem[],
  regulation: string = 'VTR21'
): { added: number; updated: number; skipped: number } {
  const key = `academic_credits_subjects_${profileId}`;
  const raw = safeGetItem(key);
  const existing: any[] = raw ? JSON.parse(raw) : [];

  let added = 0;
  let updated = 0;
  let skipped = 0;

  const isVtr25 = regulation.toUpperCase().includes('VTR25');

  for (const item of importedResults) {
    const cleanName = sanitizeCourseTitle(item.courseName);
    const code = isVtr25 ? undefined : (item.courseCode?.trim().toUpperCase() || undefined);

    const matchIdx = existing.findIndex((e) => {
      if (!isVtr25 && code && e.code) {
        return e.code.toUpperCase() === code;
      }
      return e.name.toLowerCase() === cleanName.toLowerCase();
    });

    if (matchIdx >= 0) {
      // Reconcile existing record if needed
      const current = existing[matchIdx];
      const targetStatus = item.status === 'Pass' ? 'Passed' : 'Failed';
      if (current.status !== targetStatus || current.credits !== item.credits || (item.grade && current.grade !== item.grade)) {
        existing[matchIdx] = {
          ...current,
          credits: item.credits,
          earnedCredits: item.status === 'Pass' ? item.credits : 0,
          grade: item.grade || current.grade,
          status: targetStatus,
          isVerified: true,
          updatedAt: Date.now(),
        };
        updated++;
      } else {
        skipped++;
      }
    } else {
      // Add new course
      existing.push({
        id: `sub-ams-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        profileId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        name: cleanName,
        code,
        category: 'programme_core',
        semester: item.semester || 1,
        credits: item.credits,
        registeredCredits: item.credits,
        earnedCredits: item.status === 'Pass' ? item.credits : 0,
        grade: item.grade || '—',
        status: item.status === 'Pass' ? 'Passed' : 'Failed',
        isVerified: true,
        source: 'Imported',
        regulation,
      });
      added++;
    }
  }

  safeSetItem(key, JSON.stringify(existing));
  return { added, updated, skipped };
}
