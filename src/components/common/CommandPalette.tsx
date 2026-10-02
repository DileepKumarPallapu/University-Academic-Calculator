import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Calculator,
  Award,
  Layers,
  BookOpen,
  History,
  Settings,
  Target,
  Clock,
  Sparkles,
  Sun,
  Moon,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAcademic } from '../../context/AcademicContext';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const { setTheme, resolvedTheme } = useTheme();
  const { subjects } = useAcademic();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else {
          // Open handled by parent or toggle
        }
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const defaultActions = [
    { id: 'internals', title: 'Calculate Internal Marks', to: '/internals', icon: Calculator, category: 'Calculators' },
    { id: 'gpa', title: 'Calculate Semester GPA', to: '/gpa', icon: Award, category: 'Calculators' },
    { id: 'cgpa', title: 'Calculate Cumulative CGPA', to: '/cgpa', icon: Layers, category: 'Calculators' },
    { id: 'target', title: 'Target GPA Calculator', to: '/target-gpa', icon: Target, category: 'Tools' },
    { id: 'attendance', title: 'Attendance Planner', to: '/attendance', icon: Clock, category: 'Tools' },
    { id: 'what-if', title: 'What-If Scenarios', to: '/what-if', icon: Sparkles, category: 'Tools' },
    { id: 'subjects', title: 'My Subjects', to: '/subjects', icon: BookOpen, category: 'Academic' },
    { id: 'dashboard', title: 'Semester Dashboard', to: '/dashboard', icon: Layers, category: 'Academic' },
    { id: 'history', title: 'Open History', to: '/history', icon: History, category: 'Navigation' },
    { id: 'settings', title: 'Open Settings', to: '/settings', icon: Settings, category: 'Navigation' },
  ];

  // Dynamic filter
  const q = query.toLowerCase().trim();
  const filteredActions = defaultActions.filter(
    (a) => a.title.toLowerCase().includes(q) || a.category.toLowerCase().includes(q)
  );

  const filteredSubjects = subjects.filter(
    (s) => s.name.toLowerCase().includes(q) || (s.code && s.code.toLowerCase().includes(q))
  );

  const handleSelect = (to: string) => {
    navigate(to);
    onClose();
  };

  const handleToggleTheme = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/40 dark:bg-black/70 backdrop-blur-md animate-fade-in-up"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-xl bg-[#FFFFFF] dark:bg-[#1D1D1F] rounded-[24px] border border-black/[0.08] dark:border-white/[0.12] shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-black/[0.06] dark:border-white/[0.08]">
          <Search className="w-5 h-5 text-[#86868B]" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or search subjects..."
            className="w-full bg-transparent text-sm font-medium text-[#1D1D1F] dark:text-[#F5F5F7] outline-none placeholder:text-[#86868B]"
          />
          <kbd className="hidden sm:inline-block text-[10px] font-mono px-2 py-0.5 rounded bg-black/5 dark:bg-white/10 text-[#86868B]">
            ESC
          </kbd>
        </div>

        {/* Action list */}
        <div className="max-h-80 overflow-y-auto p-2 flex flex-col gap-1 text-xs">
          {/* Quick theme toggle action */}
          {q === '' || 'theme'.includes(q) ? (
            <button
              type="button"
              onClick={handleToggleTheme}
              className="flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 text-[#1D1D1F] dark:text-[#F5F5F7] text-left transition-colors"
            >
              {resolvedTheme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-500" />
              ) : (
                <Moon className="w-4 h-4 text-zinc-700" />
              )}
              <span className="font-medium">
                Switch to {resolvedTheme === 'dark' ? 'Light' : 'Dark'} Mode
              </span>
            </button>
          ) : null}

          {/* Navigation and Calculators */}
          {filteredActions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.id}
                type="button"
                onClick={() => handleSelect(action.to)}
                className="flex items-center justify-between px-4 py-2.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 text-[#1D1D1F] dark:text-[#F5F5F7] text-left transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4 text-[#86868B]" />
                  <span className="font-medium">{action.title}</span>
                </div>
                <span className="text-[10px] text-[#86868B] font-medium uppercase tracking-wider">
                  {action.category}
                </span>
              </button>
            );
          })}

          {/* Subjects Matching */}
          {filteredSubjects.length > 0 && (
            <div className="pt-2 border-t border-black/[0.04] dark:border-white/[0.06]">
              <span className="px-4 py-1 block text-[10px] font-semibold text-[#86868B] uppercase tracking-wider">
                Subjects
              </span>
              {filteredSubjects.map((sub) => (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => handleSelect('/subjects')}
                  className="w-full flex items-center justify-between px-4 py-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 text-[#1D1D1F] dark:text-[#F5F5F7] text-left transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-3.5 h-3.5 text-[#86868B]" />
                    <span>{sub.name}</span>
                    {sub.code && <span className="text-[10px] text-[#86868B] font-mono">{sub.code}</span>}
                  </div>
                  <span className="text-[11px] font-medium tabular-nums">{sub.internalMark}/40</span>
                </button>
              ))}
            </div>
          )}

          {filteredActions.length === 0 && filteredSubjects.length === 0 && (
            <div className="py-8 text-center text-xs text-[#86868B]">
              No matching commands or subjects found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
