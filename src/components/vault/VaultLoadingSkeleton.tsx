import React from 'react';

export const VaultLoadingSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 animate-pulse" aria-label="Loading academic documents">
      {/* Category Pills Skeleton */}
      <div className="flex items-center gap-2 overflow-hidden py-1">
        {[80, 110, 95, 120, 90, 105].map((w, idx) => (
          <div
            key={idx}
            className="h-8 rounded-xl bg-[var(--border-secondary)] shrink-0"
            style={{ width: `${w}px` }}
          />
        ))}
      </div>

      {/* Filter Bar Skeleton */}
      <div className="rounded-2xl border border-[var(--border-secondary)] bg-[var(--surface)] p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="sm:col-span-2 h-9 rounded-xl bg-[var(--border-secondary)]" />
          <div className="h-9 rounded-xl bg-[var(--border-secondary)]" />
          <div className="h-9 rounded-xl bg-[var(--border-secondary)]" />
        </div>
        <div className="flex justify-between pt-2 border-t border-[var(--border-secondary)]">
          <div className="h-5 w-48 rounded bg-[var(--border-secondary)]" />
          <div className="h-5 w-24 rounded bg-[var(--border-secondary)]" />
        </div>
      </div>

      {/* Document Grid Skeleton (6 cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((idx) => (
          <div
            key={idx}
            className="p-4 rounded-2xl border border-[var(--border-secondary)] bg-[var(--surface)] shadow-xs flex flex-col justify-between space-y-4"
          >
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <div className="h-4 w-20 rounded bg-[var(--border-secondary)]" />
                <div className="h-3 w-12 rounded bg-[var(--border-secondary)]" />
              </div>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-[var(--border-secondary)] shrink-0" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 w-3/4 rounded bg-[var(--border-secondary)]" />
                  <div className="h-3 w-1/2 rounded bg-[var(--border-secondary)]" />
                </div>
              </div>
            </div>
            <div className="pt-3 border-t border-[var(--border-secondary)] flex justify-between items-center">
              <div className="h-3 w-24 rounded bg-[var(--border-secondary)]" />
              <div className="flex gap-2">
                <div className="w-6 h-6 rounded bg-[var(--border-secondary)]" />
                <div className="w-6 h-6 rounded bg-[var(--border-secondary)]" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
