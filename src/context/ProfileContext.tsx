import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type {
  StudentProfile,
  SavedCalculation,
  CalculationType,
  StudentCreditProgress,
} from '../types/profile';
import * as db from '../services/db';

interface ProfileContextType {
  profiles: StudentProfile[];
  activeProfile: StudentProfile;
  activeProfileId: string;
  isLoading: boolean;
  switchProfile: (profileId: string) => Promise<void>;
  createProfile: (data?: Partial<StudentProfile>) => Promise<StudentProfile>;
  updateProfile: (profileId: string, updates: Partial<StudentProfile>) => Promise<StudentProfile>;
  duplicateProfile: (profileId: string) => Promise<StudentProfile>;
  deleteProfile: (profileId: string) => Promise<void>;
  
  // Calculations (isolated to active profile)
  saveCalculation: (
    data: Omit<SavedCalculation, 'id' | 'profileId' | 'createdAt' | 'updatedAt'> & { id?: string }
  ) => Promise<SavedCalculation>;
  getCalculations: (type?: CalculationType) => Promise<SavedCalculation[]>;
  getCalculation: (id: string) => Promise<SavedCalculation | null>;
  deleteCalculation: (id: string) => Promise<void>;
  toggleFavoriteCalculation: (id: string) => Promise<void>;
  renameCalculation: (id: string, newTitle: string) => Promise<void>;

  // Credit progress
  getCreditProgress: () => Promise<StudentCreditProgress | null>;
  saveCreditProgress: (progress: StudentCreditProgress) => Promise<void>;

  // Data management
  exportProfileData: (profileId?: string) => Promise<string>;
  importProfileData: (
    jsonData: string,
    mode?: 'create_new' | 'replace'
  ) => Promise<{ success: boolean; message: string; profileId?: string }>;
  clearActiveProfileData: () => Promise<void>;

  // Refresh
  refreshProfiles: () => Promise<void>;
}

const fallbackDefaultProfile: StudentProfile = {
  id: 'default-profile',
  name: 'Primary Student',
  rollNumber: '',
  collegeName: 'University Academic Framework',
  degree: 'B.Tech',
  department: 'Computer Science & Engineering',
  branch: 'Computer Science & Engineering',
  regulation: 'VTR21',
  admissionYear: '2024',
  academicYear: '2024-2025',
  semester: 'Semester 5',
  currentSemester: 5,
  degreePathway: 'standard',
  targetAttendance: 75,
  customGraduationCredits: 160,
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export const ProfileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [profiles, setProfiles] = useState<StudentProfile[]>([fallbackDefaultProfile]);
  const [activeProfile, setActiveProfile] = useState<StudentProfile>(fallbackDefaultProfile);
  const [activeProfileId, setActiveProfileId] = useState<string>(fallbackDefaultProfile.id);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshProfiles = useCallback(async () => {
    try {
      const { profiles: allProfiles, activeProfile: currentActive } =
        await db.initializeProfileDatabase();
      setProfiles(allProfiles);
      setActiveProfile(currentActive);
      setActiveProfileId(currentActive.id);
    } catch {
      // Keep fallback
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshProfiles();

    const handleStorageChange = () => {
      refreshProfiles();
    };

    window.addEventListener('active-profile-changed', handleStorageChange);
    window.addEventListener('student-profile-updated', handleStorageChange);
    return () => {
      window.removeEventListener('active-profile-changed', handleStorageChange);
      window.removeEventListener('student-profile-updated', handleStorageChange);
    };
  }, [refreshProfiles]);

  const switchProfile = useCallback(
    async (profileId: string) => {
      const found = profiles.find((p) => p.id === profileId) || (await db.getProfile(profileId));
      if (found) {
        setActiveProfile(found);
        setActiveProfileId(found.id);
        db.setStoredActiveProfileId(found.id);
      }
    },
    [profiles]
  );

  const createProfile = useCallback(
    async (data?: Partial<StudentProfile>): Promise<StudentProfile> => {
      const newId = `std-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const newProfile: StudentProfile = {
        id: newId,
        name: data?.name?.trim() || `Student ${profiles.length + 1}`,
        rollNumber: data?.rollNumber || '',
        collegeName: data?.collegeName || activeProfile.collegeName || 'University Academic Framework',
        degree: data?.degree || activeProfile.degree || 'B.Tech',
        department: data?.department || activeProfile.department || 'Computer Science & Engineering',
        branch: data?.branch || data?.department || activeProfile.branch || 'Computer Science & Engineering',
        regulation: data?.regulation || activeProfile.regulation || 'VTR21',
        admissionYear: data?.admissionYear || activeProfile.admissionYear || '2024',
        academicYear: data?.academicYear || activeProfile.academicYear || '2024-2025',
        semester: data?.semester || 'Semester 1',
        currentSemester: data?.currentSemester || 1,
        degreePathway: data?.degreePathway || 'standard',
        targetAttendance: data?.targetAttendance || 75,
        customGraduationCredits: data?.customGraduationCredits || 160,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        ...data,
      };

      await db.saveProfile(newProfile);
      await refreshProfiles();
      await switchProfile(newId);
      return newProfile;
    },
    [profiles.length, activeProfile, refreshProfiles, switchProfile]
  );

  const updateProfile = useCallback(
    async (profileId: string, updates: Partial<StudentProfile>): Promise<StudentProfile> => {
      const current = profiles.find((p) => p.id === profileId) || (await db.getProfile(profileId));
      if (!current) throw new Error('Profile not found');

      const updated: StudentProfile = {
        ...current,
        ...updates,
        branch: updates.branch || updates.department || current.branch,
        updatedAt: Date.now(),
      };

      await db.saveProfile(updated);
      setProfiles((prev) => prev.map((p) => (p.id === profileId ? updated : p)));
      if (activeProfileId === profileId) {
        setActiveProfile(updated);
      }
      return updated;
    },
    [profiles, activeProfileId]
  );

  const duplicateProfile = useCallback(
    async (profileId: string): Promise<StudentProfile> => {
      const source = profiles.find((p) => p.id === profileId) || (await db.getProfile(profileId));
      if (!source) throw new Error('Source profile not found');

      const newId = `std-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const duplicated: StudentProfile = {
        ...source,
        id: newId,
        name: `${source.name} (Copy)`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await db.saveProfile(duplicated);

      // Copy calculations
      const sourceCalcs = await db.getCalculationsByProfile(profileId);
      for (const calc of sourceCalcs) {
        await db.saveCalculation({
          ...calc,
          id: `calc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          profileId: newId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      }

      await refreshProfiles();
      await switchProfile(newId);
      return duplicated;
    },
    [profiles, refreshProfiles, switchProfile]
  );

  const deleteProfile = useCallback(
    async (profileId: string): Promise<void> => {
      if (profiles.length <= 1) {
        throw new Error('Cannot delete the only remaining profile. You can edit it or reset its data instead.');
      }

      await db.deleteProfile(profileId);
      const remaining = profiles.filter((p) => p.id !== profileId);
      setProfiles(remaining);

      if (activeProfileId === profileId) {
        const nextProfile = remaining[0];
        setActiveProfile(nextProfile);
        setActiveProfileId(nextProfile.id);
        db.setStoredActiveProfileId(nextProfile.id);
      }
    },
    [profiles, activeProfileId]
  );

  // ================= Calculations =================

  const saveCalculation = useCallback(
    async (
      data: Omit<SavedCalculation, 'id' | 'profileId' | 'createdAt' | 'updatedAt'> & { id?: string }
    ): Promise<SavedCalculation> => {
      const calcId = data.id || `calc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const existing = data.id ? await db.getCalculation(data.id) : null;

      const calc: SavedCalculation = {
        ...data,
        id: calcId,
        profileId: activeProfileId,
        isFavorite: data.isFavorite ?? existing?.isFavorite ?? false,
        createdAt: existing?.createdAt || Date.now(),
        updatedAt: Date.now(),
      };

      await db.saveCalculation(calc);
      return calc;
    },
    [activeProfileId]
  );

  const getCalculations = useCallback(
    async (type?: CalculationType): Promise<SavedCalculation[]> => {
      const all = await db.getCalculationsByProfile(activeProfileId);
      if (type) {
        return all.filter((c) => c.type === type);
      }
      return all;
    },
    [activeProfileId]
  );

  const getCalculation = useCallback(async (id: string): Promise<SavedCalculation | null> => {
    return db.getCalculation(id);
  }, []);

  const deleteCalculation = useCallback(async (id: string): Promise<void> => {
    await db.deleteCalculation(id);
  }, []);

  const toggleFavoriteCalculation = useCallback(async (id: string): Promise<void> => {
    const calc = await db.getCalculation(id);
    if (calc) {
      calc.isFavorite = !calc.isFavorite;
      calc.updatedAt = Date.now();
      await db.saveCalculation(calc);
    }
  }, []);

  const renameCalculation = useCallback(async (id: string, newTitle: string): Promise<void> => {
    const calc = await db.getCalculation(id);
    if (calc) {
      calc.title = newTitle.trim();
      calc.updatedAt = Date.now();
      await db.saveCalculation(calc);
    }
  }, []);

  // ================= Credit Progress =================

  const getCreditProgress = useCallback(async (): Promise<StudentCreditProgress | null> => {
    return db.getCreditProgress(activeProfileId);
  }, [activeProfileId]);

  const saveCreditProgress = useCallback(
    async (progress: StudentCreditProgress): Promise<void> => {
      await db.saveCreditProgress({
        ...progress,
        profileId: activeProfileId,
        updatedAt: Date.now(),
      });
    },
    [activeProfileId]
  );

  // ================= Data Management =================

  const exportProfileData = useCallback(
    async (profileId?: string): Promise<string> => {
      const targetId = profileId || activeProfileId;
      const data = await db.exportProfileData(targetId);
      return JSON.stringify(data, null, 2);
    },
    [activeProfileId]
  );

  const importProfileData = useCallback(
    async (jsonData: string, mode: 'create_new' | 'replace' = 'create_new') => {
      const res = await db.importProfileData(jsonData, mode);
      await refreshProfiles();
      if (res.profileId) {
        await switchProfile(res.profileId);
      }
      return res;
    },
    [refreshProfiles, switchProfile]
  );

  const clearActiveProfileData = useCallback(async (): Promise<void> => {
    const calcs = await db.getCalculationsByProfile(activeProfileId);
    for (const c of calcs) {
      await db.deleteCalculation(c.id);
    }
    await db.deleteCreditProgress(activeProfileId);
  }, [activeProfileId]);

  return (
    <ProfileContext.Provider
      value={{
        profiles,
        activeProfile,
        activeProfileId,
        isLoading,
        switchProfile,
        createProfile,
        updateProfile,
        duplicateProfile,
        deleteProfile,
        saveCalculation,
        getCalculations,
        getCalculation,
        deleteCalculation,
        toggleFavoriteCalculation,
        renameCalculation,
        getCreditProgress,
        saveCreditProgress,
        exportProfileData,
        importProfileData,
        clearActiveProfileData,
        refreshProfiles,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
};

export const useProfile = () => {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
};
