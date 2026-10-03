import { useState, useEffect, useCallback } from 'react';

export const STUDENT_PROFILE_STORAGE_KEY = 'academic-calculator-student-profile';
export const LEGACY_NAME_STORAGE_KEY = 'academic-calculator-student-name';

export interface StudentProfile {
  name: string;
  rollNumber?: string;
  department?: string;
  year?: string;
  semester?: string;
  regulation?: string;
}

const defaultProfile: StudentProfile = {
  name: '',
  rollNumber: '',
  department: '',
  year: '',
  semester: '',
  regulation: '',
};

export const useStudentProfile = () => {
  const [profile, setProfileState] = useState<StudentProfile>(() => {
    try {
      const savedProfile = localStorage.getItem(STUDENT_PROFILE_STORAGE_KEY);
      if (savedProfile) {
        return { ...defaultProfile, ...JSON.parse(savedProfile) };
      }
      const legacyName = localStorage.getItem(LEGACY_NAME_STORAGE_KEY);
      if (legacyName) {
        return { ...defaultProfile, name: legacyName };
      }
      return defaultProfile;
    } catch {
      return defaultProfile;
    }
  });

  const [nameError, setNameError] = useState<string | null>(null);

  // Sync updates to localStorage
  const updateProfile = useCallback((updates: Partial<StudentProfile>) => {
    setProfileState((prev) => {
      const updated = { ...prev, ...updates };
      if (updated.name && updated.name.trim()) {
        setNameError(null);
      }
      try {
        localStorage.setItem(STUDENT_PROFILE_STORAGE_KEY, JSON.stringify(updated));
        if (updates.name !== undefined) {
          localStorage.setItem(LEGACY_NAME_STORAGE_KEY, updates.name);
        }
      } catch {
        // ignore
      }
      return updated;
    });
  }, []);

  // Sync if storage changes in another tab
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STUDENT_PROFILE_STORAGE_KEY && e.newValue) {
        try {
          setProfileState(JSON.parse(e.newValue));
        } catch {
          // ignore
        }
      } else if (e.key === LEGACY_NAME_STORAGE_KEY && e.newValue !== null) {
        setProfileState((prev) => ({ ...prev, name: e.newValue || '' }));
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const validateForPrint = useCallback((): boolean => {
    if (!profile.name.trim()) {
      setNameError('Please enter the student name before printing.');
      return false;
    }
    setNameError(null);
    return true;
  }, [profile.name]);

  return {
    profile,
    studentName: profile.name,
    setStudentName: (name: string) => updateProfile({ name }),
    updateProfile,
    nameError,
    setNameError,
    validateForPrint,
  };
};
