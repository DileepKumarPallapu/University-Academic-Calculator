import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { StudentProfile } from '../../hooks/useStudentProfile';

interface StudentNameInputProps {
  value: string;
  onChange: (value: string) => void;
  errorMessage?: string | null;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  className?: string;
  profile?: StudentProfile;
  onProfileChange?: (updates: Partial<StudentProfile>) => void;
}

export const StudentNameInput: React.FC<StudentNameInputProps> = ({
  value,
  onChange,
  errorMessage,
  inputRef,
  className = '',
  profile,
  onProfileChange,
}) => {
  const [showOptionalDetails, setShowOptionalDetails] = useState<boolean>(false);

  return (
    <div className={`apple-main-container p-6 sm:p-7 flex flex-col gap-4 ${className}`}>
      {/* Primary Required Field: Student Name */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label
            htmlFor="student-name-input"
            className="text-base font-semibold text-[var(--text-primary)]"
          >
            Student Name
          </label>
          {errorMessage && (
            <span className="text-xs font-semibold text-[var(--danger)] animate-appleFadeIn">
              {errorMessage}
            </span>
          )}
        </div>

        <input
          ref={inputRef as React.RefObject<HTMLInputElement>}
          id="student-name-input"
          type="text"
          maxLength={100}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Enter student name"
          aria-label="Student Name"
          aria-required="true"
          aria-invalid={!!errorMessage}
          className={`w-full h-[52px] rounded-[12px] bg-[var(--surface)] text-[var(--text-primary)] border ${
            errorMessage
              ? 'border-[var(--danger)] focus:border-[var(--danger)]'
              : 'border-[var(--input-border)] focus:border-[var(--text-primary)]'
          } px-4 text-[16px] font-medium outline-none focus:border-2 shadow-sm transition-all placeholder:text-[var(--input-placeholder)]`}
        />

        <div className="flex items-center justify-between text-xs text-[var(--text-secondary)] pt-1">
          <span>Required for official printable academic reports and PDF identification.</span>
          {onProfileChange && (
            <button
              type="button"
              onClick={() => setShowOptionalDetails((prev) => !prev)}
              className="font-medium text-[var(--text-primary)] hover:underline inline-flex items-center gap-1 cursor-pointer ml-2"
            >
              <span>{showOptionalDetails ? 'Hide Details' : 'More Student Details'}</span>
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform duration-200 ${
                  showOptionalDetails ? 'rotate-180' : ''
                }`}
              />
            </button>
          )}
        </div>
      </div>

      {/* Optional Student Profile Details (Roll No, Dept, Year, Semester) */}
      {onProfileChange && showOptionalDetails && (
        <div className="pt-4 border-t border-[var(--border-secondary)] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs animate-appleFadeIn">
          <div className="flex flex-col gap-1">
            <label htmlFor="student-roll" className="font-medium text-[var(--text-secondary)]">
              Register / Roll No
            </label>
            <input
              id="student-roll"
              type="text"
              maxLength={30}
              placeholder="e.g. 21CS101"
              value={profile?.rollNumber || ''}
              onChange={(e) => onProfileChange({ rollNumber: e.target.value })}
              className="apple-input h-10 text-xs px-3"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="student-dept" className="font-medium text-[var(--text-secondary)]">
              Department
            </label>
            <input
              id="student-dept"
              type="text"
              maxLength={40}
              placeholder="e.g. CSE / IT / ECE"
              value={profile?.department || ''}
              onChange={(e) => onProfileChange({ department: e.target.value })}
              className="apple-input h-10 text-xs px-3"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="student-year" className="font-medium text-[var(--text-secondary)]">
              Academic Year
            </label>
            <input
              id="student-year"
              type="text"
              maxLength={15}
              placeholder="e.g. III Year"
              value={profile?.year || ''}
              onChange={(e) => onProfileChange({ year: e.target.value })}
              className="apple-input h-10 text-xs px-3"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="student-sem" className="font-medium text-[var(--text-secondary)]">
              Semester
            </label>
            <input
              id="student-sem"
              type="text"
              maxLength={15}
              placeholder="e.g. Semester 5"
              value={profile?.semester || ''}
              onChange={(e) => onProfileChange({ semester: e.target.value })}
              className="apple-input h-10 text-xs px-3"
            />
          </div>
        </div>
      )}
    </div>
  );
};
