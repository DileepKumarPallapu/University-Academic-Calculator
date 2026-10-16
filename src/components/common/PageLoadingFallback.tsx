import React from 'react';
import { Loader2 } from 'lucide-react';

interface PageLoadingFallbackProps {
  message?: string;
}

export const PageLoadingFallback: React.FC<PageLoadingFallbackProps> = ({
  message = 'Loading workspace...',
}) => (
  <div
    className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center"
    role="status"
    aria-live="polite"
  >
    <Loader2 className="w-8 h-8 text-[#0071e3] dark:text-[#2997ff] animate-spin mb-3" />
    <span className="text-sm font-medium text-[var(--text-secondary)]">{message}</span>
  </div>
);
