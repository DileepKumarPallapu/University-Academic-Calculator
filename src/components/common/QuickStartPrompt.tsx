import React from 'react';
import { Info } from 'lucide-react';

interface QuickStartPromptProps {
  message: string;
  className?: string;
}

export const QuickStartPrompt: React.FC<QuickStartPromptProps> = ({ message, className = '' }) => {
  return (
    <div className={`flex items-center gap-2 py-2 px-3.5 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-secondary)] text-xs text-[var(--text-secondary)] font-medium no-print ${className}`}>
      <Info className="w-3.5 h-3.5 text-[var(--text-tertiary)] shrink-0" />
      <span>{message}</span>
    </div>
  );
};
