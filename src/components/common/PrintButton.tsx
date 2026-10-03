import React from 'react';
import { Printer } from 'lucide-react';

interface PrintButtonProps {
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
  label?: string;
}

export const PrintButton: React.FC<PrintButtonProps> = ({
  className = '',
  onClick,
  disabled = false,
  label = 'Print / Save PDF',
}) => {
  const handlePrint = () => {
    if (disabled) return;
    if (onClick) {
      onClick();
    }
    // Small timeout to allow state/DOM to settle if any click handler runs
    setTimeout(() => {
      window.print();
    }, 50);
  };

  return (
    <button
      type="button"
      onClick={handlePrint}
      disabled={disabled}
      aria-label="Print or save academic report as PDF"
      className={`no-print apple-btn-primary w-full h-[50px] rounded-xl text-[15px] sm:text-[16px] font-semibold flex items-center justify-center gap-2.5 shadow-sm transition-all hover:bg-[#1D1D1F] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      <Printer className="w-4 h-4 text-white" aria-hidden="true" />
      <span>{label}</span>
    </button>
  );
};
