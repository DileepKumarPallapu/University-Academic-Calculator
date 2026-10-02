import React, { useState } from 'react';
import { Copy, Share2, Printer, Check, X } from 'lucide-react';
import { formatFixed } from '../../utils/calculations';

interface CalculationReceiptProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subjectName?: string;
  score: number;
  maxScore: number;
  percentage: number;
  breakdown: Array<{ label: string; raw?: number | ''; rawMax?: number; obtained: number; max: number }>;
  onToast: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

export const CalculationReceiptModal: React.FC<CalculationReceiptProps> = ({
  isOpen,
  onClose,
  title,
  subjectName,
  score,
  maxScore,
  percentage,
  breakdown,
  onToast,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const monthYear = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(new Date());

  const getPlainText = () => {
    let t = `ACADEMIC CALCULATOR\n`;
    t += `${title.toUpperCase()}\n`;
    if (subjectName) t += `Subject: ${subjectName}\n`;
    t += `------------------------------------\n`;
    breakdown.forEach((item) => {
      if (item.raw !== undefined && item.raw !== '' && item.rawMax) {
        t += `${item.label}: ${item.raw} / ${item.rawMax} → ${formatFixed(item.obtained, 2)} / ${item.max}\n`;
      } else {
        t += `${item.label}: ${formatFixed(item.obtained, 2)} / ${item.max}\n`;
      }
    });
    t += `------------------------------------\n`;
    t += `TOTAL: ${formatFixed(score, 2)} / ${maxScore} (${formatFixed(percentage, 1)}%)\n`;
    t += `------------------------------------\n`;
    t += `Generated: ${monthYear}\n`;
    return t;
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(getPlainText());
      setCopied(true);
      onToast('Receipt copied to clipboard', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      onToast('Failed to copy', 'error');
    }
  };

  const handleShare = async () => {
    const text = getPlainText();
    if (navigator.share) {
      try {
        await navigator.share({ title: `Calculation Receipt — ${title}`, text });
      } catch (e: any) {
        if (e.name !== 'AbortError') handleCopy();
      }
    } else {
      handleCopy();
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 dark:bg-black/70 backdrop-blur-md animate-fade-in-up"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md bg-[var(--surface)] rounded-[24px] p-8 border border-[var(--border-primary)] shadow-2xl flex flex-col gap-6 relative">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-full text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--border-secondary)] transition-colors"
          aria-label="Close receipt"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Receipt Header */}
        <div className="flex flex-col text-center border-b border-[var(--border-primary)] pb-5">
          <span className="text-[11px] font-bold tracking-[0.14em] uppercase text-[var(--text-tertiary)]">
            ACADEMIC CALCULATOR
          </span>
          <h2 className="text-xl font-bold tracking-tight text-[var(--text-primary)] mt-1 uppercase">
            {title}
          </h2>
          {subjectName && (
            <span className="text-xs text-[var(--text-secondary)] mt-0.5">
              Subject: {subjectName}
            </span>
          )}
        </div>

        {/* Breakdown Items */}
        <div className="flex flex-col divide-y divide-[var(--border-secondary)] text-xs font-mono py-1">
          {breakdown.map((item, idx) => (
            <div key={idx} className="py-2.5 flex items-center justify-between first:pt-0 last:pb-0">
              <span className="text-[var(--text-secondary)]">{item.label}</span>
              <span className="text-[var(--text-primary)] font-semibold tabular-nums">
                {item.raw !== undefined && item.raw !== '' && item.rawMax
                  ? `${item.raw}/${item.rawMax} → ${formatFixed(item.obtained, 2)}/${item.max}`
                  : `${formatFixed(item.obtained, 2)} / ${item.max}`}
              </span>
            </div>
          ))}
        </div>

        {/* Total Box */}
        <div className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
              FINAL RESULT
            </span>
            <span className="text-xs text-[var(--text-secondary)]">
              {formatFixed(percentage, 1)}% standing
            </span>
          </div>
          <div className="text-right">
            <span className="text-2xl font-bold text-[var(--text-primary)] tabular-nums">
              {formatFixed(score, 2)}
            </span>
            <span className="text-xs text-[var(--text-tertiary)] ml-1">/ {maxScore}</span>
          </div>
        </div>

        <div className="text-[11px] text-center text-[var(--text-tertiary)]">
          Generated: {monthYear}
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[var(--border-primary)]">
          <button
            type="button"
            onClick={handleCopy}
            className="py-2.5 px-3 text-xs font-semibold rounded-xl border border-[var(--border-primary)] hover:bg-[var(--border-secondary)] text-[var(--text-primary)] flex items-center justify-center gap-1.5 min-h-[44px] transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
          <button
            type="button"
            onClick={handleShare}
            className="py-2.5 px-3 text-xs font-semibold rounded-xl border border-[var(--border-primary)] hover:bg-[var(--border-secondary)] text-[var(--text-primary)] flex items-center justify-center gap-1.5 min-h-[44px] transition-colors"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Share</span>
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="py-2.5 px-3 text-xs font-semibold rounded-xl bg-[var(--btn-primary-bg)] hover:bg-[var(--btn-primary-hover)] text-[var(--btn-primary-text)] flex items-center justify-center gap-1.5 min-h-[44px] transition-colors shadow-sm"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print</span>
          </button>
        </div>
      </div>
    </div>
  );
};
