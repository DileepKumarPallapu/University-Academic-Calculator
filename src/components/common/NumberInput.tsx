import React, { useRef } from 'react';
import { AlertCircle } from 'lucide-react';

interface NumberInputProps {
  id: string;
  label: string;
  sublabel?: string;
  value: number | '';
  onChange: (val: number | '') => void;
  max: number;
  min?: number;
  step?: number;
  placeholder?: string;
  convertedDisplay?: string;
  error?: string;
  autoFocus?: boolean;
}

export const NumberInput: React.FC<NumberInputProps> = ({
  id,
  label,
  sublabel = 'Marks Obtained',
  value,
  onChange,
  max,
  min = 0,
  step = 0.5,
  placeholder = '0',
  convertedDisplay,
  error,
  autoFocus = false,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    if (rawVal === '') {
      onChange('');
      return;
    }
    const num = parseFloat(rawVal);
    if (!isNaN(num)) {
      onChange(num);
    }
  };

  const handleFocus = () => {
    // On mobile, gently scroll active element into center of view
    if (typeof window !== 'undefined' && window.innerWidth < 768 && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 250);
    }
  };

  const hasError = Boolean(error);

  return (
    <div className="flex flex-col gap-2 w-full">
      {/* Label Row */}
      <div className="flex items-center justify-between">
        <label
          htmlFor={id}
          className="text-[15px] font-semibold tracking-tight text-[var(--text-primary)] flex items-center gap-1.5"
        >
          <span>{label}</span>
          <span className="text-[12px] font-normal text-[var(--text-secondary)]">
            ({sublabel})
          </span>
        </label>
        <span className="text-[12px] font-medium px-2.5 py-0.5 rounded-full bg-[var(--border-secondary)] text-[var(--text-secondary)] border border-[var(--border-primary)]">
          Max {max}
        </span>
      </div>

      {/* Input Row with / max badge */}
      <div className="relative flex items-center">
        <input
          ref={inputRef}
          id={id}
          type="number"
          inputMode="decimal"
          min={min}
          max={max}
          step={step}
          value={value === '' ? '' : value}
          onChange={handleChange}
          onFocus={handleFocus}
          placeholder={placeholder}
          autoFocus={autoFocus}
          aria-invalid={hasError}
          aria-describedby={hasError ? `${id}-error` : convertedDisplay ? `${id}-converted` : undefined}
          className={`w-full min-h-[52px] h-[52px] px-4 pr-14 text-base font-medium rounded-xl bg-[var(--input-bg)] border transition-all duration-150 outline-none text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
            hasError
              ? 'border-rose-500 focus:border-rose-600 focus:ring-2 focus:ring-rose-500/20'
              : 'border-[var(--input-border)] hover:border-[var(--text-secondary)] focus:border-[var(--input-focus)] focus:ring-2 focus:ring-black/10 dark:focus:ring-white/10'
          }`}
        />
        <div className="absolute right-4 pointer-events-none flex items-center gap-1 text-sm font-semibold text-[var(--text-secondary)]">
          <span>/</span>
          <span>{max}</span>
        </div>
      </div>

      {/* Helper text or Inline Error */}
      <div className="flex items-center justify-between min-h-[18px] px-0.5 text-xs">
        {hasError ? (
          <span id={`${id}-error`} className="flex items-center gap-1 text-rose-500 font-medium">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{error}</span>
          </span>
        ) : convertedDisplay ? (
          <span id={`${id}-converted`} className="text-[#6E6E73] dark:text-[#A1A1A6] font-normal">
            {convertedDisplay}
          </span>
        ) : (
          <span />
        )}
      </div>
    </div>
  );
};
