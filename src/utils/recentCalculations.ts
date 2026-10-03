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
    // Keep up to 10 recent calculations
    const updated = [newEntry, ...filtered].slice(0, 10);
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
