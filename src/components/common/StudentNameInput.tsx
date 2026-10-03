import React from 'react';

interface StudentNameInputProps {
  value: string;
  onChange: (value: string) => void;
  errorMessage?: string | null;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  className?: string;
}

export const StudentNameInput: React.FC<StudentNameInputProps> = ({
  value,
  onChange,
  errorMessage,
  inputRef,
  className = '',
}) => {
  return (
    <div className={`apple-main-container p-6 sm:p-7 flex flex-col gap-3 ${className}`}>
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

      <span className="text-xs text-[var(--text-secondary)]">
        Required for official printable academic reports and PDF identification.
      </span>
    </div>
  );
};
