import { useState, useEffect, useCallback } from 'react';

export const STUDENT_NAME_STORAGE_KEY = 'academic-calculator-student-name';

/**
 * Custom hook to manage and persist student name in localStorage
 */
export const useStudentName = () => {
  const [studentName, setStudentNameState] = useState<string>(() => {
    try {
      return localStorage.getItem(STUDENT_NAME_STORAGE_KEY) || '';
    } catch {
      return '';
    }
  });

  const [nameError, setNameError] = useState<string | null>(null);

  // Sync to localStorage
  const setStudentName = useCallback((name: string) => {
    setStudentNameState(name);
    if (name.trim()) {
      setNameError(null);
    }
    try {
      localStorage.setItem(STUDENT_NAME_STORAGE_KEY, name);
    } catch {
      // ignore
    }
  }, []);

  // Listen to cross-tab / storage updates
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STUDENT_NAME_STORAGE_KEY && e.newValue !== null) {
        setStudentNameState(e.newValue);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const validateForPrint = useCallback((): boolean => {
    const trimmed = studentName.trim();
    if (!trimmed) {
      setNameError('Please enter the student name before printing.');
      return false;
    }
    setNameError(null);
    return true;
  }, [studentName]);

  return {
    studentName,
    setStudentName,
    nameError,
    setNameError,
    validateForPrint,
  };
};
