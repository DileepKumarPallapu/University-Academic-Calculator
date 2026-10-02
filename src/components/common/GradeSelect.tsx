import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { UNIVERSITY_CONFIG } from '../../config/university';

interface GradeSelectProps {
  id?: string;
  value: string;
  onChange: (grade: string, points: number) => void;
  disabled?: boolean;
}

export const GradeSelect: React.FC<GradeSelectProps> = ({
  id,
  value,
  onChange,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const options = UNIVERSITY_CONFIG.defaultGradeScale;
  const selectedOption = options.find((opt) => opt.grade === value) || options[0];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (grade: string, points: number) => {
    onChange(grade, points);
    setIsOpen(false);
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      <button
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className="w-full flex items-center justify-between px-3.5 py-3 sm:py-3.5 bg-white dark:bg-[#1C1C1E] border border-black/10 dark:border-white/10 rounded-2xl text-zinc-900 dark:text-zinc-100 hover:border-black/25 dark:hover:border-white/25 transition-all text-left outline-none focus:ring-2 focus:ring-black/10 dark:focus:ring-white/10 min-h-[44px]"
      >
        <div className="flex items-center gap-2">
          <span className="font-semibold text-base sm:text-lg">{selectedOption.grade}</span>
          <span className="text-xs px-2 py-0.5 rounded-md bg-black/5 dark:bg-white/10 text-zinc-600 dark:text-zinc-400 font-medium">
            {selectedOption.points} pts
          </span>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-zinc-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <ul
          role="listbox"
          tabIndex={-1}
          className="absolute z-40 left-0 right-0 mt-2 py-1.5 bg-white dark:bg-[#1C1C1E] rounded-2xl shadow-2xl border border-black/10 dark:border-white/10 max-h-56 overflow-y-auto animate-fade-in-up"
        >
          {options.map((opt) => {
            const isSelected = opt.grade === value;
            return (
              <li
                key={opt.grade}
                role="option"
                aria-selected={isSelected}
                onClick={() => handleSelect(opt.grade, opt.points)}
                className={`flex items-center justify-between px-4 py-2.5 text-sm cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-black/5 dark:bg-white/10 font-semibold text-zinc-900 dark:text-white'
                    : 'text-zinc-700 dark:text-zinc-300 hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-base font-semibold w-7">{opt.grade}</span>
                  <span className="text-xs text-zinc-400">({opt.label || opt.range})</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    {opt.points} pts
                  </span>
                  {isSelected && <Check className="w-4 h-4 text-zinc-900 dark:text-white" />}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
