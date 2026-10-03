export interface RecentCalculation {
  id: string;
  type: 'internals' | 'gpa' | 'cgpa' | 'attendance';
  title: string;
  value: string;
  subtext?: string;
  route: string;
  timestamp: number;
}

const STORAGE_KEY = 'academic-calculator-recent-history';

export const getRecentCalculations = (): RecentCalculation[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

export const saveRecentCalculation = (entry: Omit<RecentCalculation, 'id' | 'timestamp'>) => {
  try {
    const list = getRecentCalculations();
    // Prevent immediate duplicate entries
    const filtered = list.filter(
      (item) => !(item.type === entry.type && item.title === entry.title && item.value === entry.value)
    );
    const newEntry: RecentCalculation = {
      ...entry,
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: Date.now(),
    };
    // Keep up to 20 recent calculations
    const updated = [newEntry, ...filtered].slice(0, 20);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event('recent-calculations-updated'));
  } catch {
    // ignore
  }
};

export const deleteRecentCalculation = (id: string) => {
  try {
    const list = getRecentCalculations();
    const updated = list.filter((item) => item.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event('recent-calculations-updated'));
  } catch {
    // ignore
  }
};

export const clearRecentCalculations = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new Event('recent-calculations-updated'));
  } catch {
    // ignore
  }
};

export interface AcademicSummary {
  cgpa?: RecentCalculation;
  sgpa?: RecentCalculation;
  attendance?: RecentCalculation;
  internals?: RecentCalculation;
}

export const getAcademicSummary = (): AcademicSummary => {
  const calculations = getRecentCalculations();
  const summary: AcademicSummary = {};

  for (const item of calculations) {
    if (item.type === 'cgpa' && !summary.cgpa) {
      summary.cgpa = item;
    } else if (item.type === 'gpa' && !summary.sgpa) {
      summary.sgpa = item;
    } else if (item.type === 'attendance' && !summary.attendance) {
      summary.attendance = item;
    } else if (item.type === 'internals' && !summary.internals) {
      summary.internals = item;
    }
  }

  return summary;
};

export const clearAllLocalAcademicData = () => {
  try {
    localStorage.removeItem('academic-calculator-student-profile');
    localStorage.removeItem('academic-calculator-student-name');
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('academic_attendance_history');
    localStorage.removeItem('academic_selected_regulation');
    window.dispatchEvent(new Event('student-profile-updated'));
    window.dispatchEvent(new Event('recent-calculations-updated'));
  } catch {
    // ignore
  }
};
