import React, { useEffect, useState } from 'react';
import { Check } from 'lucide-react';

interface CalculationStatusProps {
  show: boolean;
  onHide?: () => void;
  className?: string;
}

export const CalculationStatus: React.FC<CalculationStatusProps> = ({ show, onHide, className = '' }) => {
  const [visible, setVisible] = useState(show);

  useEffect(() => {
    if (show) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        if (onHide) onHide();
      }, 3000);
      return () => clearTimeout(timer);
    } else {
      setVisible(false);
    }
  }, [show, onHide]);

  if (!visible) return null;

  return (
    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-semibold border border-emerald-200 dark:border-emerald-800 transition-opacity animate-appleFadeIn no-print ${className}`}>
      <Check className="w-3.5 h-3.5" />
      <span>Calculation complete</span>
    </div>
  );
};
