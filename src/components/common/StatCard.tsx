import React from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  badge?: string;
  icon?: React.ReactNode;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  subtext,
  badge,
  icon,
}) => {
  return (
    <div className="bg-[var(--surface)] p-5 sm:p-6 rounded-2xl border border-[var(--border-primary)] shadow-[var(--shadow-card)] flex flex-col justify-between transition-all">
      <div className="flex items-center justify-between gap-2 mb-3">
        <span className="text-[12px] uppercase tracking-wider font-semibold text-[var(--text-secondary)]">
          {label}
        </span>
        {icon && <div className="text-[var(--text-secondary)]">{icon}</div>}
      </div>

      <div className="flex items-baseline gap-2">
        <span className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--text-primary)] tabular-nums">
          {value}
        </span>
        {badge && (
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[var(--border-secondary)] text-[var(--text-primary)] border border-[var(--border-primary)]">
            {badge}
          </span>
        )}
      </div>

      {subtext && (
        <p className="text-xs text-[var(--text-secondary)] mt-2 leading-relaxed">
          {subtext}
        </p>
      )}
    </div>
  );
};
