import type { RecentAmsImport } from '../types/ams';
import { safeGet, safeSet, safeRemove } from './safeStorage';

const STORAGE_KEY = 'academic_recent_ams_imports';
const MAX_RECENT_IMPORTS = 10;

/**
 * Saves a new AMS import calculation to local storage.
 * Only stores structured academic data (not large raw files or images).
 */
export const saveRecentAmsImport = (item: RecentAmsImport): void => {
  try {
    const existing = getRecentAmsImports();
    // Filter out item with same id if already present
    const filtered = existing.filter((i) => i.id !== item.id);
    // Add to top of list
    const updated = [item, ...filtered].slice(0, MAX_RECENT_IMPORTS);
    safeSet(STORAGE_KEY, updated);
  } catch (e) {
    console.error('Failed to save recent AMS import:', e);
  }
};

/**
 * Retrieves all stored recent AMS imports.
 */
export const getRecentAmsImports = (): RecentAmsImport[] => {
  try {
    return safeGet<RecentAmsImport[]>(STORAGE_KEY, []);
  } catch (e) {
    console.error('Failed to retrieve recent AMS imports:', e);
    return [];
  }
};

/**
 * Deletes an AMS import by ID.
 */
export const deleteRecentAmsImport = (id: string): void => {
  try {
    const existing = getRecentAmsImports();
    const filtered = existing.filter((i) => i.id !== id);
    safeSet(STORAGE_KEY, filtered);
  } catch (e) {
    console.error('Failed to delete recent AMS import:', e);
  }
};

/**
 * Clears all recent AMS imports.
 */
export const clearRecentAmsImports = (): void => {
  try {
    safeRemove(STORAGE_KEY);
  } catch (e) {
    console.error('Failed to clear recent AMS imports:', e);
  }
};
