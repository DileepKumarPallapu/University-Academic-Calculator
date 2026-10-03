import React from 'react';
import { Printer } from 'lucide-react';

interface PrintButtonProps {
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
  label?: string;
  studentName?: string;
  calculatorType?: string;
  onValidationError?: (errorMessage: string) => void;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}

export const PrintButton: React.FC<PrintButtonProps> = ({
  className = '',
  onClick,
  disabled = false,
  label = 'Print / Save PDF',
  studentName = '',
  calculatorType = 'Academic Report',
  onValidationError,
  inputRef,
}) => {
  const handlePrint = () => {
    if (disabled) return;

    // Validate Student Name
    const trimmed = studentName.trim();
    if (!trimmed) {
      const error = 'Please enter the student name before printing.';
      if (onValidationError) {
        onValidationError(error);
      }
      if (inputRef?.current) {
        inputRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        inputRef.current.focus();
      }
      return;
    }

    // Clear validation error if valid
    if (onValidationError) {
      onValidationError('');
    }

    if (onClick) {
      onClick();
    }

    // Configure dynamic document title for browser Save as PDF naming
    const originalTitle = document.title;
    const cleanName = trimmed.replace(/[<>:"/\\|?*]/g, '');
    document.title = `${cleanName} - ${calculatorType} - Academic Calculator`;

    // Small delay to allow state/DOM to settle before opening browser print preview
    setTimeout(() => {
      window.print();

      // Restore document title after print dialog
      const handleAfterPrint = () => {
        document.title = originalTitle;
        window.removeEventListener('afterprint', handleAfterPrint);
      };
      window.addEventListener('afterprint', handleAfterPrint);

      setTimeout(() => {
        document.title = originalTitle;
      }, 2000);
    }, 60);
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
