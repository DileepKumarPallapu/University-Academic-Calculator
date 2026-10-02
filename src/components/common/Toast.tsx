import React, { useEffect } from 'react';
import { Check, AlertCircle, Info, X } from 'lucide-react';

export interface ToastProps {
  id: string;
  type?: 'success' | 'error' | 'info';
  message: string;
  onClose: (id: string) => void;
  duration?: number;
}

export const Toast: React.FC<ToastProps> = ({
  id,
  type = 'info',
  message,
  onClose,
  duration = 2800,
}) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(id);
    }, duration);
    return () => clearTimeout(timer);
  }, [id, duration, onClose]);

  const icons = {
    success: <Check className="w-4 h-4 text-emerald-600 shrink-0" />,
    error: <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />,
    info: <Info className="w-4 h-4 text-[var(--text-primary)] shrink-0" />,
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center gap-3 px-4 py-3 bg-[var(--surface)] text-[var(--text-primary)] rounded-full shadow-[var(--shadow-large)] border border-[var(--border-primary)] text-xs sm:text-sm font-medium animate-appleFadeIn"
    >
      {icons[type]}
      <span className="flex-1 whitespace-nowrap">{message}</span>
      <button
        type="button"
        onClick={() => onClose(id)}
        className="p-1 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] rounded-full transition-colors ml-1"
        aria-label="Dismiss notification"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

export const ToastContainer: React.FC<{
  toasts: Array<{ id: string; type?: 'success' | 'error' | 'info'; message: string }>;
  onClose: (id: string) => void;
}> = ({ toasts, onClose }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 sm:left-auto sm:translate-x-0 sm:right-6 z-50 flex flex-col gap-2 pointer-events-auto max-w-sm w-auto">
      {toasts.map((toast) => (
        <Toast key={toast.id} {...toast} onClose={onClose} />
      ))}
    </div>
  );
};
