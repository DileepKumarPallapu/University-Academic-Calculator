import { useState } from 'react';
import { useProfile } from '../context/ProfileContext';

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
  let profileCtx: ReturnType<typeof useProfile> | null = null;
  try {
    profileCtx = useProfile();
  } catch {
    profileCtx = null;
  }

  const [nameError, setNameError] = useState<string | null>(null);

  // Fallback state if outside ProfileProvider
  const [localProfile, setLocalProfile] = useState<StudentProfile>(() => {
    try {
      const saved = localStorage.getItem(STUDENT_PROFILE_STORAGE_KEY);
      if (saved) return { ...defaultProfile, ...JSON.parse(saved) };
      const legacyName = localStorage.getItem(LEGACY_NAME_STORAGE_KEY);
      if (legacyName) return { ...defaultProfile, name: legacyName };
      return defaultProfile;
    } catch {
      return defaultProfile;
    }
  });

  if (profileCtx) {
    const { activeProfile, updateProfile: updateActiveProfile } = profileCtx;

    const profile: StudentProfile = {
      name: activeProfile.name || '',
      rollNumber: activeProfile.rollNumber || '',
      department: activeProfile.department || activeProfile.branch || '',
      year: activeProfile.academicYear || '',
      semester: activeProfile.semester || (activeProfile.currentSemester ? `Semester ${activeProfile.currentSemester}` : ''),
      regulation: activeProfile.regulation || 'VTR21',
    };

    const updateProfile = (updates: Partial<StudentProfile>) => {
      if (updates.name && updates.name.trim()) {
        setNameError(null);
      }
      updateActiveProfile(activeProfile.id, {
        name: updates.name !== undefined ? updates.name : activeProfile.name,
        rollNumber: updates.rollNumber !== undefined ? updates.rollNumber : activeProfile.rollNumber,
        department: updates.department !== undefined ? updates.department : activeProfile.department,
        branch: updates.department !== undefined ? updates.department : activeProfile.branch,
        academicYear: updates.year !== undefined ? updates.year : activeProfile.academicYear,
        semester: updates.semester !== undefined ? updates.semester : activeProfile.semester,
        regulation: updates.regulation !== undefined ? updates.regulation : activeProfile.regulation,
      });
      // also keep legacy storage updated for external scripts
      try {
        localStorage.setItem(STUDENT_PROFILE_STORAGE_KEY, JSON.stringify(updates));
        if (updates.name) localStorage.setItem(LEGACY_NAME_STORAGE_KEY, updates.name);
      } catch {}
    };

    const clearProfile = () => {
      updateActiveProfile(activeProfile.id, {
        name: '',
        rollNumber: '',
        department: '',
        academicYear: '',
        semester: '',
      });
      setNameError(null);
    };

    const validateForPrint = (): boolean => {
      if (!profile.name.trim()) {
        setNameError('Please enter the student name before printing.');
        return false;
      }
      setNameError(null);
      return true;
    };

    return {
      profile,
      studentName: profile.name,
      setStudentName: (name: string) => updateProfile({ name }),
      updateProfile,
      clearProfile,
      hasProfile: Boolean(profile.name.trim()),
      nameError,
      setNameError,
      validateForPrint,
    };
  }

  // Fallback when outside provider
  const updateProfile = (updates: Partial<StudentProfile>) => {
    setLocalProfile((prev) => {
      const updated = { ...prev, ...updates };
      if (updated.name?.trim()) setNameError(null);
      try {
        localStorage.setItem(STUDENT_PROFILE_STORAGE_KEY, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const clearProfile = () => {
    setLocalProfile(defaultProfile);
    setNameError(null);
  };

  const validateForPrint = (): boolean => {
    if (!localProfile.name.trim()) {
      setNameError('Please enter the student name before printing.');
      return false;
    }
    setNameError(null);
    return true;
  };

  return {
    profile: localProfile,
    studentName: localProfile.name,
    setStudentName: (name: string) => updateProfile({ name }),
    updateProfile,
    clearProfile,
    hasProfile: Boolean(localProfile.name.trim()),
    nameError,
    setNameError,
    validateForPrint,
  };
};
