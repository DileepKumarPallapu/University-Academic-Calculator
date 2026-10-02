import React, { createContext, useContext, useEffect, useState } from 'react';
import type { UserProfile, GradeScaleItem, SubjectAssessmentItem, BackupData } from '../types';
import { UNIVERSITY_CONFIG } from '../config/university';

interface AcademicContextType {
  profile: UserProfile;
  updateProfile: (updates: Partial<UserProfile>) => void;
  subjects: SubjectAssessmentItem[];
  addSubject: (subject: Omit<SubjectAssessmentItem, 'id'>) => void;
  updateSubject: (id: string, updates: Partial<SubjectAssessmentItem>) => void;
  deleteSubject: (id: string) => void;
  favorites: string[];
  toggleFavorite: (calculatorId: string) => void;
  gradeScale: GradeScaleItem[];
  updateGradeScale: (scale: GradeScaleItem[]) => void;
  restoreDefaultGradeScale: () => void;
  hasCompletedOnboarding: boolean;
  completeOnboarding: () => void;
  exportBackupJSON: () => string;
  exportHistoryCSV: () => string;
  importBackupJSON: (jsonString: string) => { success: boolean; message: string };
  clearAllPlatformData: () => void;
}

const PROFILE_KEY = 'academic_calc_profile_v2';
const SUBJECTS_KEY = 'academic_calc_subjects_v2';
const FAVORITES_KEY = 'academic_calc_favorites_v2';
const GRADE_SCALE_KEY = 'academic_calc_gradescale_v2';
const ONBOARDING_KEY = 'academic_calc_onboarding_v2';

const AcademicContext = createContext<AcademicContextType | undefined>(undefined);

export const AcademicProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Profile
  const [profile, setProfile] = useState<UserProfile>(() => {
    try {
      const stored = localStorage.getItem(PROFILE_KEY);
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.error(e);
    }
    return {
      name: '',
      college: '',
      branch: 'CSE',
      currentSemester: 5,
      academicYear: '2026–27',
    };
  });

  // Subjects
  const [subjects, setSubjects] = useState<SubjectAssessmentItem[]>(() => {
    try {
      const stored = localStorage.getItem(SUBJECTS_KEY);
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.error(e);
    }
    return [
      {
        id: 'sub-1',
        name: 'Data Structures',
        code: 'CS2203',
        type: 'theory',
        credits: 4,
        theoryInputs: { test1: 25, test2: 28, test3: 24, attendance: 5, assignment: 4 },
        internalMark: 34.67,
        maxMark: 40,
        percentage: 86.68,
      },
      {
        id: 'sub-2',
        name: 'Operating Systems',
        code: 'CS2204',
        type: 'theory',
        credits: 3,
        theoryInputs: { test1: 22, test2: 25, test3: 20, attendance: 5, assignment: 4 },
        internalMark: 31.33,
        maxMark: 40,
        percentage: 78.33,
      },
      {
        id: 'sub-3',
        name: 'Machine Learning Lab',
        code: 'CS2215',
        type: 'integrated',
        credits: 2,
        integratedInputs: { mid1: 18, mid2: 17, lab: 19, attendance: 5, assignment: 4 },
        internalMark: 36.75,
        maxMark: 40,
        percentage: 91.88,
      },
    ];
  });

  // Favorites
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(FAVORITES_KEY);
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.error(e);
    }
    return ['theory', 'gpa'];
  });

  // Grade Scale
  const [gradeScale, setGradeScale] = useState<GradeScaleItem[]>(() => {
    try {
      const stored = localStorage.getItem(GRADE_SCALE_KEY);
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.error(e);
    }
    return UNIVERSITY_CONFIG.defaultGradeScale;
  });

  // Onboarding
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState<boolean>(() => {
    try {
      return localStorage.getItem(ONBOARDING_KEY) === 'true';
    } catch {
      return true;
    }
  });

  // Persistence
  useEffect(() => {
    try {
      localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    } catch (e) {
      console.error(e);
    }
  }, [profile]);

  useEffect(() => {
    try {
      localStorage.setItem(SUBJECTS_KEY, JSON.stringify(subjects));
    } catch (e) {
      console.error(e);
    }
  }, [subjects]);

  useEffect(() => {
    try {
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
    } catch (e) {
      console.error(e);
    }
  }, [favorites]);

  useEffect(() => {
    try {
      localStorage.setItem(GRADE_SCALE_KEY, JSON.stringify(gradeScale));
    } catch (e) {
      console.error(e);
    }
  }, [gradeScale]);

  const updateProfile = (updates: Partial<UserProfile>) => {
    setProfile((prev) => ({ ...prev, ...updates }));
  };

  const addSubject = (newSubject: Omit<SubjectAssessmentItem, 'id'>) => {
    const item: SubjectAssessmentItem = {
      ...newSubject,
      id: `sub-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    };
    setSubjects((prev) => [...prev, item]);
  };

  const updateSubject = (id: string, updates: Partial<SubjectAssessmentItem>) => {
    setSubjects((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));
  };

  const deleteSubject = (id: string) => {
    setSubjects((prev) => prev.filter((s) => s.id !== id));
  };

  const toggleFavorite = (calculatorId: string) => {
    setFavorites((prev) =>
      prev.includes(calculatorId) ? prev.filter((id) => id !== calculatorId) : [...prev, calculatorId]
    );
  };

  const updateGradeScale = (scale: GradeScaleItem[]) => {
    setGradeScale(scale);
  };

  const restoreDefaultGradeScale = () => {
    setGradeScale(UNIVERSITY_CONFIG.defaultGradeScale);
  };

  const completeOnboarding = () => {
    setHasCompletedOnboarding(true);
    try {
      localStorage.setItem(ONBOARDING_KEY, 'true');
    } catch (e) {
      console.error(e);
    }
  };

  // Export JSON
  const exportBackupJSON = (): string => {
    let historyData = [];
    try {
      const stored = localStorage.getItem('academic_calc_history_v1');
      if (stored) historyData = JSON.parse(stored);
    } catch (e) {
      console.error(e);
    }

    const backup: BackupData = {
      version: '2.0.0',
      exportDate: new Date().toISOString(),
      profile,
      subjects,
      history: historyData,
      gradeScale,
      favorites,
    };
    return JSON.stringify(backup, null, 2);
  };

  // Export CSV
  const exportHistoryCSV = (): string => {
    let historyData: any[] = [];
    try {
      const stored = localStorage.getItem('academic_calc_history_v1');
      if (stored) historyData = JSON.parse(stored);
    } catch (e) {
      console.error(e);
    }

    let csv = 'ID,Type,Title,Result,Score,Date\n';
    historyData.forEach((item) => {
      const date = new Date(item.timestamp).toLocaleDateString();
      const cleanTitle = `"${(item.title || '').replace(/"/g, '""')}"`;
      const cleanResult = `"${(item.resultSummary || '').replace(/"/g, '""')}"`;
      csv += `${item.id},${item.type},${cleanTitle},${cleanResult},${item.score},${date}\n`;
    });
    return csv;
  };

  // Import JSON with validation
  const importBackupJSON = (jsonString: string): { success: boolean; message: string } => {
    try {
      const data = JSON.parse(jsonString);
      if (!data || typeof data !== 'object') {
        return { success: false, message: 'Invalid JSON format.' };
      }

      if (data.profile) {
        setProfile((prev) => ({ ...prev, ...data.profile }));
      }
      if (Array.isArray(data.subjects)) {
        setSubjects(data.subjects);
      }
      if (Array.isArray(data.gradeScale)) {
        setGradeScale(data.gradeScale);
      }
      if (Array.isArray(data.favorites)) {
        setFavorites(data.favorites);
      }
      if (Array.isArray(data.history)) {
        localStorage.setItem('academic_calc_history_v1', JSON.stringify(data.history));
      }

      return { success: true, message: 'Academic data restored successfully.' };
    } catch (e: any) {
      return { success: false, message: `Import error: ${e.message || 'Corrupted file'}` };
    }
  };

  // Clear all platform data (Danger Zone)
  const clearAllPlatformData = () => {
    try {
      localStorage.clear();
    } catch (e) {
      console.error(e);
    }
    setProfile({
      name: '',
      college: '',
      branch: 'CSE',
      currentSemester: 1,
      academicYear: '2026–27',
    });
    setSubjects([]);
    setFavorites(['theory', 'gpa']);
    setGradeScale(UNIVERSITY_CONFIG.defaultGradeScale);
    setHasCompletedOnboarding(false);
  };

  return (
    <AcademicContext.Provider
      value={{
        profile,
        updateProfile,
        subjects,
        addSubject,
        updateSubject,
        deleteSubject,
        favorites,
        toggleFavorite,
        gradeScale,
        updateGradeScale,
        restoreDefaultGradeScale,
        hasCompletedOnboarding,
        completeOnboarding,
        exportBackupJSON,
        exportHistoryCSV,
        importBackupJSON,
        clearAllPlatformData,
      }}
    >
      {children}
    </AcademicContext.Provider>
  );
};

export function useAcademic(): AcademicContextType {
  const context = useContext(AcademicContext);
  if (!context) {
    throw new Error('useAcademic must be used within an AcademicProvider');
  }
  return context;
}
