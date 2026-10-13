import type { CatalogueCourse } from '../types/catalogue';
import {
  INITIAL_CATALOGUES_BY_REGULATION,
  isRegulationSupportingCourseCode,
} from '../data/courseCatalogue';

export { isRegulationSupportingCourseCode };

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
  return memoryStore[key] || null;
}

export function safeSetItem(key: string, value: string): void {
  if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      memoryStore[key] = value;
    }
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
        return parsed;
      }
    }
  } catch (err) {
    console.error(`Failed to load catalogue from storage for ${norm}:`, err);
  }

  // Return initial seed (VTR21 has verified records, others are empty)
  const defaultList = INITIAL_CATALOGUES_BY_REGULATION[norm] || [];
  return [...defaultList];
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
      if (!isRegulationSupportingCourseCode(norm)) {
        const { code, ...rest } = c;
        return { ...rest, regulation: norm };
      }
      return { ...c, regulation: norm };
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
  const cleanName = courseData.name.trim();

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
    name: updatedCourse.name.trim(),
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
    ? ['Course Code', 'Course Name', 'Category', 'Verified Credits', 'Source', 'Discrepancy Note', 'Notes']
    : ['Course Name', 'Category', 'Verified Credits', 'Source', 'Notes'];

  const rows = courses.map((c) => {
    if (supportsCode) {
      return [
        `"${c.code || ''}"`,
        `"${c.name.replace(/"/g, '""')}"`,
        `"${c.category}"`,
        c.verifiedCredits !== undefined ? c.verifiedCredits : '',
        `"${c.source || ''}"`,
        `"${(c.discrepancyNote || '').replace(/"/g, '""')}"`,
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

      const cleanName = item.name.trim();
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
        discrepancyNote: item.discrepancyNote || '',
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
