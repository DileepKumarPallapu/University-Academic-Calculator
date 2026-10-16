import type { CatalogueCourse } from '../types/catalogue';
import {
  INITIAL_CATALOGUES_BY_REGULATION,
  isRegulationSupportingCourseCode,
} from '../data/courseCatalogue';

export { isRegulationSupportingCourseCode };

/**
 * Sanitizes course titles to strictly eliminate:
 * - Student names (e.g. PALLAPU DILEEP KUMAR)
 * - Student register numbers (e.g. VTU24654, VTU29962, 24UECS0805)
 * - Report provenance sentences e.g. "Listed in VTU24654 (CSE); VTU29962 (CSE AIML) took 10211CS226 Java Programming."
 * - Course code prefixes mistakenly merged into title
 * - Individual batch / branch tags in parentheses
 */
export function sanitizeCourseTitle(title: string): string {
  if (!title) return '';
  let cleaned = title.trim();

  // Pattern 1: "... took [optional code] Course Name"
  const tookMatch = cleaned.match(/(?:took|instead\s+of)\s+(?:[0-9]{5}[A-Z]{2}[0-9]{3}\s+)?([A-Za-z0-9\s,&/()\-]+?)(?:\.|\s*\(|$)/i);
  if (tookMatch && tookMatch[1] && tookMatch[1].trim().length > 2) {
    cleaned = tookMatch[1].trim();
  } else {
    // Pattern 2: "Listed in ... [code] [Name]"
    cleaned = cleaned.replace(/^Listed in[^;:\n]*[;:]\s*/i, '');
    cleaned = cleaned.replace(/^Included in[^;:\n]*[;:]\s*/i, '');
  }

  // Strip student IDs (e.g. VTU24654, VTU29962, 24UECS0805)
  cleaned = cleaned.replace(/\bVTU\d+\b/gi, '');
  cleaned = cleaned.replace(/\b\d{2}[A-Z]{4}\d{4}\b/gi, '');

  // Strip student names
  cleaned = cleaned.replace(/\bPALLAPU\s+DILEEP\s+KUMAR\b/gi, '');

  // Strip branch / batch annotations in parentheses
  cleaned = cleaned.replace(/\((?:CSE|AIML|ECE|EEE|MECH|CIVIL|IT|B\.Tech|[0-9]{4}-[0-9]{4})[^)]*\)/gi, '');

  // Strip standalone course code prefix if mistakenly prepended to title e.g. "10211CS226 Java Programming"
  cleaned = cleaned.replace(/^[0-9]{5}[A-Z]{2}[0-9]{3}\s+/i, '');

  // Strip report phrases
  cleaned = cleaned.replace(/\b(?:took this course|took course|listed in report|from report|curriculum record)\b/gi, '');

  // Clean trailing / leading punctuation and extra spaces
  cleaned = cleaned.replace(/^[;,\-–—.\s]+|[;,\-–—.\s]+$/g, '').replace(/\s{2,}/g, ' ').trim();

  return cleaned || title.trim();
}

const STORAGE_PREFIX = 'academic_catalogue_';
const SCHEMA_VERSION = 'v1';

// In-memory fallback for environments without localStorage (e.g. Node / Vitest)
const memoryStore: Record<string, string> = {};

export function safeGetItem(key: string): string | null {
  if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return memoryStore[key] || null;
    }
  }
  if (typeof globalThis !== 'undefined' && typeof (globalThis as any).localStorage !== 'undefined') {
    try {
      const val = (globalThis as any).localStorage.getItem(key);
      if (val !== null) return val;
    } catch {}
  }
  return memoryStore[key] || null;
}

export function safeSetItem(key: string, value: string): void {
  if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      memoryStore[key] = value;
    }
  } else if (typeof globalThis !== 'undefined' && typeof (globalThis as any).localStorage !== 'undefined') {
    try {
      (globalThis as any).localStorage.setItem(key, value);
    } catch {}
    memoryStore[key] = value;
  } else {
    memoryStore[key] = value;
  }
}

export function clearCatalogueStorage(): void {
  if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
    try {
      window.localStorage.clear();
    } catch {}
  }
  for (const k of Object.keys(memoryStore)) {
    delete memoryStore[k];
  }
}

/**
 * Normalizes regulation string to uppercase key (e.g. 'VTR21')
 */
export function normalizeRegulationKey(regulation?: string): string {
  if (!regulation) return 'VTR21';
  const clean = regulation.trim().toUpperCase();
  if (clean.includes('VTR25')) return 'VTR25';
  if (clean.includes('VTR21') || clean.includes('VTRUGE2021')) return 'VTR21';
  if (clean.includes('VTR18')) return 'VTR18';
  if (clean.includes('VTR15')) return 'VTR15';
  return clean;
}

function getStorageKey(regulation: string): string {
  const norm = normalizeRegulationKey(regulation);
  return `${STORAGE_PREFIX}${norm.toLowerCase()}_${SCHEMA_VERSION}`;
}

/**
 * Loads the course catalogue for a given regulation.
 * Fallbacks to default seeds (seeded for VTR21, empty for VTR15/VTR18/VTR25).
 */
export function getCatalogueForRegulation(regulation: string): CatalogueCourse[] {
  const norm = normalizeRegulationKey(regulation);
  const key = getStorageKey(norm);

  try {
    const raw = safeGetItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map((c) => ({
          ...c,
          name: sanitizeCourseTitle(c.name),
        }));
      }
    }
  } catch (err) {
    console.error(`Failed to load catalogue from storage for ${norm}:`, err);
  }

  // Return initial seed (VTR21 has verified records, others are empty)
  const defaultList = INITIAL_CATALOGUES_BY_REGULATION[norm] || [];
  return defaultList.map((c) => ({
    ...c,
    name: sanitizeCourseTitle(c.name),
  }));
}

/**
 * Persists the entire catalogue for a given regulation.
 */
export function saveCatalogueForRegulation(
  regulation: string,
  courses: CatalogueCourse[]
): { success: boolean; error?: string } {
  const norm = normalizeRegulationKey(regulation);
  const key = getStorageKey(norm);

  try {
    // Sanitize: For VTR25, ensure no course codes are ever stored or invented
    const sanitized = courses.map((c) => {
      const cleanName = sanitizeCourseTitle(c.name);
      if (!isRegulationSupportingCourseCode(norm)) {
        const { code, ...rest } = c;
        return { ...rest, name: cleanName, regulation: norm };
      }
      return { ...c, name: cleanName, regulation: norm };
    });

    safeSetItem(key, JSON.stringify(sanitized));
    return { success: true };
  } catch (err: any) {
    console.error(`Failed to save catalogue to storage for ${norm}:`, err);
    return { success: false, error: err?.message || 'Storage quota exceeded or storage unavailable.' };
  }
}

/**
 * Adds a new course to the specified regulation's catalogue.
 */
export function addCourseToCatalogue(
  regulation: string,
  courseData: Omit<CatalogueCourse, 'id' | 'regulation'>
): { success: boolean; course?: CatalogueCourse; error?: string } {
  const norm = normalizeRegulationKey(regulation);
  const current = getCatalogueForRegulation(norm);

  const supportsCode = isRegulationSupportingCourseCode(norm);
  const cleanName = sanitizeCourseTitle(courseData.name);

  if (!cleanName) {
    return { success: false, error: 'Course name is required.' };
  }

  // Check for duplicate course
  const isDuplicate = current.some((c) => {
    if (supportsCode && courseData.code && c.code) {
      return c.code.trim().toUpperCase() === courseData.code.trim().toUpperCase();
    }
    return c.name.trim().toLowerCase() === cleanName.toLowerCase() && c.category === courseData.category;
  });

  if (isDuplicate) {
    return {
      success: false,
      error: supportsCode && courseData.code
        ? `A course with code "${courseData.code}" already exists in the ${norm} catalogue.`
        : `A course with name "${cleanName}" already exists in this category.`,
    };
  }

  const id = `cat-${norm.toLowerCase()}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const newCourse: CatalogueCourse = {
    ...courseData,
    id,
    regulation: norm,
    name: cleanName,
    code: supportsCode ? courseData.code?.trim().toUpperCase() : undefined,
    isVerified: courseData.isVerified ?? false,
    source: courseData.source || 'Manual',
  };

  const updated = [newCourse, ...current];
  const res = saveCatalogueForRegulation(norm, updated);
  if (!res.success) {
    return { success: false, error: res.error };
  }

  return { success: true, course: newCourse };
}

/**
 * Updates an existing course in the catalogue.
 */
export function updateCourseInCatalogue(
  regulation: string,
  updatedCourse: CatalogueCourse
): { success: boolean; error?: string } {
  const norm = normalizeRegulationKey(regulation);
  const current = getCatalogueForRegulation(norm);
  const idx = current.findIndex((c) => c.id === updatedCourse.id);

  if (idx === -1) {
    return { success: false, error: 'Course record not found in catalogue.' };
  }

  const supportsCode = isRegulationSupportingCourseCode(norm);
  const clean: CatalogueCourse = {
    ...updatedCourse,
    regulation: norm,
    name: sanitizeCourseTitle(updatedCourse.name),
    code: supportsCode ? updatedCourse.code?.trim().toUpperCase() : undefined,
  };

  current[idx] = clean;
  return saveCatalogueForRegulation(norm, current);
}

/**
 * Deletes a course from the regulation catalogue.
 */
export function deleteCourseFromCatalogue(
  regulation: string,
  courseId: string
): { success: boolean; error?: string } {
  const norm = normalizeRegulationKey(regulation);
  const current = getCatalogueForRegulation(norm);
  const filtered = current.filter((c) => c.id !== courseId);

  if (filtered.length === current.length) {
    return { success: false, error: 'Course not found in catalogue.' };
  }

  return saveCatalogueForRegulation(norm, filtered);
}

/**
 * Resets the regulation catalogue back to default verified seed.
 */
export function resetCatalogueToDefaults(regulation: string): CatalogueCourse[] {
  const norm = normalizeRegulationKey(regulation);
  const defaults = INITIAL_CATALOGUES_BY_REGULATION[norm] || [];
  saveCatalogueForRegulation(norm, defaults);
  return [...defaults];
}

/**
 * Exports regulation catalogue as formatted JSON.
 */
export function exportCatalogueToJSON(regulation: string): string {
  const norm = normalizeRegulationKey(regulation);
  const courses = getCatalogueForRegulation(norm);
  return JSON.stringify(
    {
      regulation: norm,
      exportedAt: new Date().toISOString(),
      courseCount: courses.length,
      courses,
    },
    null,
    2
  );
}

/**
 * Exports regulation catalogue as CSV string.
 */
export function exportCatalogueToCSV(regulation: string): string {
  const norm = normalizeRegulationKey(regulation);
  const courses = getCatalogueForRegulation(norm);
  const supportsCode = isRegulationSupportingCourseCode(norm);

  const headers = supportsCode
    ? ['Course Code', 'Course Name', 'Category', 'Verified Credits', 'Source', 'Notes']
    : ['Course Name', 'Category', 'Verified Credits', 'Source', 'Notes'];

  const rows = courses.map((c) => {
    if (supportsCode) {
      return [
        `"${c.code || ''}"`,
        `"${c.name.replace(/"/g, '""')}"`,
        `"${c.category}"`,
        c.verifiedCredits !== undefined ? c.verifiedCredits : '',
        `"${c.source || ''}"`,
        `"${(c.notes || '').replace(/"/g, '""')}"`,
      ].join(',');
    } else {
      return [
        `"${c.name.replace(/"/g, '""')}"`,
        `"${c.category}"`,
        c.verifiedCredits !== undefined ? c.verifiedCredits : '',
        `"${c.source || ''}"`,
        `"${(c.notes || '').replace(/"/g, '""')}"`,
      ].join(',');
    }
  });

  return [headers.join(','), ...rows].join('\n');
}

/**
 * Imports catalogue courses from parsed JSON string.
 */
export function importCatalogueFromJSON(
  regulation: string,
  jsonStr: string
): { success: boolean; count: number; error?: string } {
  const norm = normalizeRegulationKey(regulation);
  try {
    const parsed = JSON.parse(jsonStr);
    const list: any[] = Array.isArray(parsed) ? parsed : parsed.courses;

    if (!Array.isArray(list)) {
      return { success: false, count: 0, error: 'Invalid JSON format: missing courses array.' };
    }

    const supportsCode = isRegulationSupportingCourseCode(norm);
    const current = getCatalogueForRegulation(norm);
    const existingIds = new Set(current.map((c) => c.id));
    const importedCourses: CatalogueCourse[] = [];

    for (const item of list) {
      if (!item.name || typeof item.name !== 'string') continue;

      const cleanName = sanitizeCourseTitle(item.name);
      if (!cleanName) continue;
      const code = supportsCode ? item.code?.toString().trim().toUpperCase() : undefined;
      const id = item.id && !existingIds.has(item.id)
        ? item.id
        : `cat-${norm.toLowerCase()}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

      importedCourses.push({
        id,
        regulation: norm,
        category: item.category || 'foundation',
        name: cleanName,
        code,
        verifiedCredits: typeof item.verifiedCredits === 'number' ? item.verifiedCredits : undefined,
        defaultSemester: typeof item.defaultSemester === 'number' ? item.defaultSemester : undefined,
        source: 'Imported',
        isVerified: !!item.isVerified,
        notes: item.notes || '',
      });
    }

    if (importedCourses.length === 0) {
      return { success: false, count: 0, error: 'No valid courses found in JSON.' };
    }

    // Merge: Avoid duplicates by code or name+category
    const merged = [...current];
    let addedCount = 0;

    for (const imp of importedCourses) {
      const exists = merged.some((m) => {
        if (supportsCode && imp.code && m.code) {
          return m.code.toUpperCase() === imp.code.toUpperCase();
        }
        return m.name.toLowerCase() === imp.name.toLowerCase() && m.category === imp.category;
      });

      if (!exists) {
        merged.push(imp);
        addedCount++;
      }
    }

    const res = saveCatalogueForRegulation(norm, merged);
    if (!res.success) {
      return { success: false, count: 0, error: res.error };
    }

    return { success: true, count: addedCount };
  } catch (err: any) {
    return { success: false, count: 0, error: `JSON Parse error: ${err.message}` };
  }
}
