export interface SegmentOption<T extends string = string> {
  value: T;
  label: string;
  badge?: string;
}

interface SegmentedControlProps<T extends string = string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel?: string;
  fullWidth?: boolean;
}

export function SegmentedControl<T extends string = string>({
  options,
  value,
  onChange,
  ariaLabel = 'Segmented options',
  fullWidth = false,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={`relative inline-flex p-1 bg-[var(--border-secondary)] rounded-xl border border-[var(--border-primary)] ${
        fullWidth ? 'w-full' : ''
      }`}
    >
      {options.map((opt) => {
        const isSelected = opt.value === value;
        return (
          <button
            key={opt.value}
            role="tab"
            type="button"
            aria-selected={isSelected}
            onClick={() => onChange(opt.value)}
            className={`relative z-10 flex-1 flex items-center justify-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold tracking-tight transition-all duration-150 select-none rounded-lg min-h-[40px] ${
              isSelected
                ? 'text-[var(--text-primary)] bg-[var(--surface)] shadow-sm border border-[var(--border-primary)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface)]/50'
            }`}
          >
            <span>{opt.label}</span>
            {opt.badge && (
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                  isSelected
                    ? 'bg-[var(--border-secondary)] text-[var(--text-primary)]'
                    : 'bg-[var(--border-primary)] text-[var(--text-secondary)]'
                }`}
              >
                {opt.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
