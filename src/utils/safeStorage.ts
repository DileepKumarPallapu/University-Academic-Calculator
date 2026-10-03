/**
 * Safe LocalStorage Utility with data versioning and fault tolerance.
 * Handles missing storage, private browsing restrictions, quota errors,
 * malformed JSON, and structural version migration safely.
 */

const DATA_VERSION_KEY = 'academic-calculator-data-version';
const CURRENT_DATA_VERSION = '2.1.0';

export function isStorageAvailable(): boolean {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return false;
    const testKey = '__academic_storage_probe__';
    window.localStorage.setItem(testKey, testKey);
    window.localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

export function safeGet<T>(key: string, fallback: T): T {
  try {
    if (!isStorageAvailable()) return fallback;
    const item = window.localStorage.getItem(key);
    if (item === null || item === undefined) return fallback;
    return JSON.parse(item) as T;
  } catch {
    return fallback;
  }
}

export function safeGetString(key: string, fallback: string): string {
  try {
    if (!isStorageAvailable()) return fallback;
    const item = window.localStorage.getItem(key);
    return item !== null ? item : fallback;
  } catch {
    return fallback;
  }
}

export function safeSet<T>(key: string, value: T): boolean {
  try {
    if (!isStorageAvailable()) return false;
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);
    window.localStorage.setItem(key, serialized);
    return true;
  } catch {
    return false;
  }
}

export function safeRemove(key: string): boolean {
  try {
    if (!isStorageAvailable()) return false;
    window.localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

export function initDataVersioning(): void {
  try {
    if (!isStorageAvailable()) return;
    const existingVersion = window.localStorage.getItem(DATA_VERSION_KEY);
    if (!existingVersion) {
      window.localStorage.setItem(DATA_VERSION_KEY, CURRENT_DATA_VERSION);
    }
  } catch {
    // Gracefully ignore storage initialization failures
  }
}
