import React, { createContext, useContext, useEffect, useState } from 'react';
import type { HistoryItem } from '../types';

interface HistoryContextType {
  history: HistoryItem[];
  addHistory: (item: Omit<HistoryItem, 'id' | 'timestamp'>) => void;
  deleteHistory: (id: string) => void;
  clearHistory: () => void;
  getLatestStats: () => {
    latestGpa: number | null;
    latestCgpa: number | null;
    totalCredits: number;
    avgInternal: number | null;
    subjectsRecorded: number;
  };
}

const STORAGE_KEY = 'academic_calc_history_v1';

const HistoryContext = createContext<HistoryContextType | undefined>(undefined);

export const HistoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [history, setHistory] = useState<HistoryItem[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Failed to load history from localStorage', e);
    }
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch (e) {
      console.error('Failed to save history to localStorage', e);
    }
  }, [history]);

  const addHistory = (item: Omit<HistoryItem, 'id' | 'timestamp'>) => {
    const newItem: HistoryItem = {
      ...item,
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: Date.now(),
    };
    // Keep most recent first, max 100 items
    setHistory((prev) => [newItem, ...prev.slice(0, 99)]);
  };

  const deleteHistory = (id: string) => {
    setHistory((prev) => prev.filter((item) => item.id !== id));
  };

  const clearHistory = () => {
    setHistory([]);
  };

  const getLatestStats = () => {
    let latestGpa: number | null = null;
    let latestCgpa: number | null = null;
    let totalCredits = 0;
    const internalScores: number[] = [];
    let subjectsRecorded = 0;

    for (const item of history) {
      if (item.type === 'gpa' && latestGpa === null && item.details?.gpa !== undefined) {
        latestGpa = item.details.gpa;
      }
      if (item.type === 'cgpa' && latestCgpa === null && item.details?.cgpa !== undefined) {
        latestCgpa = item.details.cgpa;
        if (item.details?.totalCredits) {
          totalCredits = Math.max(totalCredits, item.details.totalCredits);
        }
      }
      if ((item.type === 'theory' || item.type === 'integrated') && item.details?.totalInternal !== undefined) {
        internalScores.push(item.details.totalInternal);
      }
      if (item.type === 'subject_manager' && Array.isArray(item.details?.subjects)) {
        subjectsRecorded = Math.max(subjectsRecorded, item.details.subjects.length);
        item.details.subjects.forEach((s: any) => {
          if (s.internalMark !== undefined) internalScores.push(s.internalMark);
        });
      }
    }

    const avgInternal =
      internalScores.length > 0
        ? Math.round((internalScores.reduce((a, b) => a + b, 0) / internalScores.length) * 10) / 10
        : null;

    return {
      latestGpa,
      latestCgpa,
      totalCredits,
      avgInternal,
      subjectsRecorded,
    };
  };

  return (
    <HistoryContext.Provider
      value={{
        history,
        addHistory,
        deleteHistory,
        clearHistory,
        getLatestStats,
      }}
    >
      {children}
    </HistoryContext.Provider>
  );
};

export function useHistory(): HistoryContextType {
  const context = useContext(HistoryContext);
  if (!context) {
    throw new Error('useHistory must be used within a HistoryProvider');
  }
  return context;
}
