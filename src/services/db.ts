import type {
  StudentProfile,
  SavedCalculation,
  StudentCreditProgress,
  ProfileExportData,
} from '../types/profile';

const DB_NAME = 'AcademicCalculatorDB';
const DB_VERSION = 1;

const STORE_PROFILES = 'profiles';
const STORE_CALCULATIONS = 'saved_calculations';
const STORE_CREDITS = 'credit_progress';

const ACTIVE_PROFILE_STORAGE_KEY = 'academic-active-profile-id';
const LEGACY_PROFILE_KEY = 'academic-calculator-student-profile';
const LEGACY_NAME_KEY = 'academic-calculator-student-name';

// Fallback keys for environments without IndexedDB
const FALLBACK_PROFILES_KEY = 'ac_db_fallback_profiles';
const FALLBACK_CALCS_KEY = 'ac_db_fallback_calculations';
const FALLBACK_CREDITS_KEY = 'ac_db_fallback_credits';

let dbInstance: IDBDatabase | null = null;

// In-memory store for Node / test environments without localStorage
const memoryStore: Record<string, string> = {};

function memoryGet(key: string): string | null {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return memoryStore[key] || null;
    }
  }
  return memoryStore[key] || null;
}

function memorySet(key: string, value: string): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(key, value);
      return;
    } catch {
      // fallback to memory
    }
  }
  memoryStore[key] = value;
}

/**
 * Open or initialize IndexedDB instance
 */
function openDB(): Promise<IDBDatabase> {
  if (dbInstance) return Promise.resolve(dbInstance);

  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB not available'));
    }

    try {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Store: Profiles
        if (!db.objectStoreNames.contains(STORE_PROFILES)) {
          db.createObjectStore(STORE_PROFILES, { keyPath: 'id' });
        }

        // Store: Saved Calculations
        if (!db.objectStoreNames.contains(STORE_CALCULATIONS)) {
          const calcStore = db.createObjectStore(STORE_CALCULATIONS, { keyPath: 'id' });
          calcStore.createIndex('by_profile', 'profileId', { unique: false });
          calcStore.createIndex('by_type', 'type', { unique: false });
          calcStore.createIndex('by_updated', 'updatedAt', { unique: false });
        }

        // Store: Credit Progress
        if (!db.objectStoreNames.contains(STORE_CREDITS)) {
          db.createObjectStore(STORE_CREDITS, { keyPath: 'profileId' });
        }
      };

      request.onsuccess = () => {
        dbInstance = request.result;
        resolve(dbInstance);
      };

      request.onerror = () => {
        reject(request.error);
      };
    } catch (err) {
      reject(err);
    }
  });
}

// ================= Fallback Storage Helpers =================
function getFallback<T>(key: string): T[] {
  try {
    const raw = memoryGet(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setFallback<T>(key: string, data: T[]): void {
  try {
    memorySet(key, JSON.stringify(data));
  } catch {
    // ignore
  }
}

// ================= Profiles =================

export async function getAllProfiles(): Promise<StudentProfile[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_PROFILES, 'readonly');
      const store = tx.objectStore(STORE_PROFILES);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return getFallback<StudentProfile>(FALLBACK_PROFILES_KEY);
  }
}

export async function getProfile(id: string): Promise<StudentProfile | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_PROFILES, 'readonly');
      const store = tx.objectStore(STORE_PROFILES);
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    const list = getFallback<StudentProfile>(FALLBACK_PROFILES_KEY);
    return list.find((p) => p.id === id) || null;
  }
}

export async function saveProfile(profile: StudentProfile): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_PROFILES, 'readwrite');
      const store = tx.objectStore(STORE_PROFILES);
      const req = store.put(profile);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    const list = getFallback<StudentProfile>(FALLBACK_PROFILES_KEY);
    const idx = list.findIndex((p) => p.id === profile.id);
    if (idx >= 0) {
      list[idx] = profile;
    } else {
      list.push(profile);
    }
    setFallback(FALLBACK_PROFILES_KEY, list);
  }
}

export async function deleteProfile(id: string): Promise<void> {
  // 1. Delete profile
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_PROFILES, 'readwrite');
      const store = tx.objectStore(STORE_PROFILES);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    const list = getFallback<StudentProfile>(FALLBACK_PROFILES_KEY).filter((p) => p.id !== id);
    setFallback(FALLBACK_PROFILES_KEY, list);
  }

  // 2. Delete all calculations associated with this profile
  try {
    const calcs = await getCalculationsByProfile(id);
    for (const c of calcs) {
      await deleteCalculation(c.id);
    }
  } catch {
    // ignore
  }

  // 3. Delete credit progress
  try {
    await deleteCreditProgress(id);
  } catch {
    // ignore
  }
}

// ================= Saved Calculations =================

export async function getCalculationsByProfile(profileId: string): Promise<SavedCalculation[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_CALCULATIONS, 'readonly');
      const store = tx.objectStore(STORE_CALCULATIONS);
      const index = store.index('by_profile');
      const req = index.getAll(profileId);
      req.onsuccess = () => {
        const results = req.result || [];
        // Sort descending by updatedAt
        results.sort((a, b) => b.updatedAt - a.updatedAt);
        resolve(results);
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    const list = getFallback<SavedCalculation>(FALLBACK_CALCS_KEY);
    return list
      .filter((c) => c.profileId === profileId)
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }
}

export async function getCalculation(id: string): Promise<SavedCalculation | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_CALCULATIONS, 'readonly');
      const store = tx.objectStore(STORE_CALCULATIONS);
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    const list = getFallback<SavedCalculation>(FALLBACK_CALCS_KEY);
    return list.find((c) => c.id === id) || null;
  }
}

export async function saveCalculation(calc: SavedCalculation): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_CALCULATIONS, 'readwrite');
      const store = tx.objectStore(STORE_CALCULATIONS);
      const req = store.put(calc);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    const list = getFallback<SavedCalculation>(FALLBACK_CALCS_KEY);
    const idx = list.findIndex((c) => c.id === calc.id);
    if (idx >= 0) {
      list[idx] = calc;
    } else {
      list.push(calc);
    }
    setFallback(FALLBACK_CALCS_KEY, list);
  }
}

export async function deleteCalculation(id: string): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_CALCULATIONS, 'readwrite');
      const store = tx.objectStore(STORE_CALCULATIONS);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    const list = getFallback<SavedCalculation>(FALLBACK_CALCS_KEY).filter((c) => c.id !== id);
    setFallback(FALLBACK_CALCS_KEY, list);
  }
}

// ================= Credit Progress =================

export async function getCreditProgress(profileId: string): Promise<StudentCreditProgress | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_CREDITS, 'readonly');
      const store = tx.objectStore(STORE_CREDITS);
      const req = store.get(profileId);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    const list = getFallback<StudentCreditProgress>(FALLBACK_CREDITS_KEY);
    return list.find((c) => c.profileId === profileId) || null;
  }
}

export async function saveCreditProgress(progress: StudentCreditProgress): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_CREDITS, 'readwrite');
      const store = tx.objectStore(STORE_CREDITS);
      const req = store.put(progress);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    const list = getFallback<StudentCreditProgress>(FALLBACK_CREDITS_KEY);
    const idx = list.findIndex((c) => c.profileId === progress.profileId);
    if (idx >= 0) {
      list[idx] = progress;
    } else {
      list.push(progress);
    }
    setFallback(FALLBACK_CREDITS_KEY, list);
  }
}

export async function deleteCreditProgress(profileId: string): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_CREDITS, 'readwrite');
      const store = tx.objectStore(STORE_CREDITS);
      const req = store.delete(profileId);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    const list = getFallback<StudentCreditProgress>(FALLBACK_CREDITS_KEY).filter(
      (c) => c.profileId !== profileId
    );
    setFallback(FALLBACK_CREDITS_KEY, list);
  }
}

// ================= Active Profile ID =================

export function getStoredActiveProfileId(): string | null {
  try {
    return memoryGet(ACTIVE_PROFILE_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setStoredActiveProfileId(id: string): void {
  try {
    memorySet(ACTIVE_PROFILE_STORAGE_KEY, id);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('active-profile-changed'));
    }
  } catch {
    // ignore
  }
}

// ================= Migration & Initialization =================

/**
 * Ensures at least one profile exists. Migrates legacy localStorage profile if present.
 */
export async function initializeProfileDatabase(): Promise<{
  profiles: StudentProfile[];
  activeProfile: StudentProfile;
}> {
  let profiles = await getAllProfiles();

  if (profiles.length === 0) {
    // Check for legacy profile data
    let legacyName = '';
    let legacyRoll = '';
    let legacyDept = '';
    let legacyYear = '';
    let legacySem = '';
    let legacyReg = 'VTR21';

    try {
      const legacyRaw = memoryGet(LEGACY_PROFILE_KEY);
      if (legacyRaw) {
        const parsed = JSON.parse(legacyRaw);
        legacyName = parsed.name || '';
        legacyRoll = parsed.rollNumber || '';
        legacyDept = parsed.department || '';
        legacyYear = parsed.year || '';
        legacySem = parsed.semester || '';
        legacyReg = parsed.regulation || 'VTR21';
      }
      if (!legacyName) {
        legacyName = memoryGet(LEGACY_NAME_KEY) || '';
      }
    } catch {
      // ignore
    }

    const defaultProfile: StudentProfile = {
      id: `std-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: legacyName.trim() || 'Primary Student',
      rollNumber: legacyRoll || '',
      collegeName: 'University Academic Framework',
      degree: 'B.Tech',
      department: legacyDept || 'Computer Science & Engineering',
      branch: legacyDept || 'Computer Science & Engineering',
      regulation: legacyReg || 'VTR21',
      admissionYear: '2024',
      academicYear: legacyYear || '2024-2025',
      semester: legacySem || 'Semester 5',
      currentSemester: 5,
      degreePathway: 'standard',
      targetAttendance: 75,
      customGraduationCredits: 160,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await saveProfile(defaultProfile);
    profiles = [defaultProfile];
    setStoredActiveProfileId(defaultProfile.id);
    return { profiles, activeProfile: defaultProfile };
  }

  const storedId = getStoredActiveProfileId();
  let activeProfile = profiles.find((p) => p.id === storedId) || profiles[0];
  setStoredActiveProfileId(activeProfile.id);

  return { profiles, activeProfile };
}

// ================= Export & Import =================

export async function exportProfileData(profileId: string): Promise<ProfileExportData> {
  const profile = await getProfile(profileId);
  if (!profile) {
    throw new Error('Profile not found for export');
  }

  const calculations = await getCalculationsByProfile(profileId);
  const creditProgress = await getCreditProgress(profileId);

  return {
    version: '1.0.0',
    exportDate: new Date().toISOString(),
    app: 'University Academic Calculator',
    profile,
    calculations,
    creditProgress,
  };
}

export async function importProfileData(
  jsonData: string,
  mode: 'create_new' | 'replace' = 'create_new'
): Promise<{ success: boolean; message: string; profileId?: string }> {
  try {
    const data: ProfileExportData = JSON.parse(jsonData);

    if (!data.profile || !data.profile.name) {
      return { success: false, message: 'Invalid data format: Profile information is missing.' };
    }

    let targetProfileId = data.profile.id;

    if (mode === 'create_new') {
      // Generate fresh UUID to prevent collision
      targetProfileId = `std-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    }

    const newProfile: StudentProfile = {
      ...data.profile,
      id: targetProfileId,
      name:
        mode === 'create_new' && (await getProfile(data.profile.id))
          ? `${data.profile.name} (Imported)`
          : data.profile.name,
      updatedAt: Date.now(),
    };

    await saveProfile(newProfile);

    // Import calculations
    if (Array.isArray(data.calculations)) {
      for (const calc of data.calculations) {
        const newCalc: SavedCalculation = {
          ...calc,
          id: `calc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          profileId: targetProfileId,
          updatedAt: Date.now(),
        };
        await saveCalculation(newCalc);
      }
    }

    // Import credit progress
    if (data.creditProgress) {
      const newCredits: StudentCreditProgress = {
        ...data.creditProgress,
        profileId: targetProfileId,
        updatedAt: Date.now(),
      };
      await saveCreditProgress(newCredits);
    }

    setStoredActiveProfileId(targetProfileId);

    return {
      success: true,
      message: `Profile "${newProfile.name}" and ${
        data.calculations?.length || 0
      } calculations imported successfully.`,
      profileId: targetProfileId,
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Failed to import file: ${err.message || 'Invalid JSON file format'}`,
    };
  }
}
