import React, { useState } from 'react';
import { Copy, Check, Share2, LayoutTemplate, X } from 'lucide-react';

interface ResultItem {
  label: string;
  value: string | number;
}

interface ResultActionButtonsProps {
  title: string;
  studentName?: string;
  rollNumber?: string;
  items: ResultItem[];
  resultLabel: string;
  resultValue: string | number;
  className?: string;
}

export const ResultActionButtons: React.FC<ResultActionButtonsProps> = ({
  title,
  studentName = '',
  rollNumber = '',
  items,
  resultLabel,
  resultValue,
  className = '',
}) => {
  const [copied, setCopied] = useState<boolean>(false);
  const [cardModalOpen, setCardModalOpen] = useState<boolean>(false);
  const [includeRollNumber, setIncludeRollNumber] = useState<boolean>(false);
  const [cardCopied, setCardCopied] = useState<boolean>(false);

  const generateFormattedText = (withRoll: boolean = false): string => {
    const lines = [
      'ACADEMIC CALCULATOR',
      `${title.toUpperCase()}`,
      '',
    ];

    if (studentName.trim()) {
      lines.push(`Student:\n${studentName.trim()}`, '');
    }

    if (withRoll && rollNumber.trim()) {
      lines.push(`Register Number:\n${rollNumber.trim()}`, '');
    }

    items.forEach((item) => {
      lines.push(`${item.label}:\n${item.value}`, '');
    });

    lines.push(`${resultLabel}:\n${resultValue}`, '');

    const dateFormatted = new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }).format(new Date());

    lines.push(`Generated:\n${dateFormatted}`);
    return lines.join('\n');
  };

  const handleCopy = async () => {
    const text = generateFormattedText(false);
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const handleShare = async () => {
    const text = generateFormattedText(false);
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `Academic Calculator - ${title}`,
          text,
          url: 'https://university-academic-calculator.vercel.app/',
        });
        return;
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          handleCopy();
        }
      }
    } else {
      handleCopy();
    }
  };

  const handleCopyCard = async () => {
    const text = generateFormattedText(includeRollNumber);
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      }
      setCardCopied(true);
      setTimeout(() => setCardCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const handleShareCard = async () => {
    const text = generateFormattedText(includeRollNumber);
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `Academic Calculator - ${title}`,
          text,
          url: 'https://university-academic-calculator.vercel.app/',
        });
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          handleCopyCard();
        }
      }
    } else {
      handleCopyCard();
    }
  };

  return (
    <>
      <div className={`no-print flex items-center gap-2 ${className}`}>
        <button
          type="button"
          onClick={handleCopy}
          className="flex-1 apple-btn-secondary text-xs h-[42px] gap-1.5 font-semibold cursor-pointer"
          aria-label="Copy calculation result to clipboard"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-emerald-600 font-semibold">Copied ✓</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 text-[var(--text-primary)]" />
              <span>Copy Result</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={handleShare}
          className="flex-1 apple-btn-secondary text-xs h-[42px] gap-1.5 font-semibold cursor-pointer"
          aria-label="Share calculation result"
        >
          <Share2 className="w-3.5 h-3.5 text-[var(--text-primary)]" />
          <span>Share Result</span>
        </button>

        <button
          type="button"
          onClick={() => setCardModalOpen(true)}
          className="apple-btn-secondary text-xs h-[42px] px-3 gap-1.5 font-semibold cursor-pointer"
          title="View shareable result card"
          aria-label="View shareable result card"
        >
          <LayoutTemplate className="w-3.5 h-3.5 text-[var(--text-primary)]" />
          <span className="hidden sm:inline">Card</span>
        </button>
      </div>

      {/* Shareable Result Card Modal */}
      {cardModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="result-card-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 dark:bg-black/60 backdrop-blur-sm animate-appleFadeIn"
          onClick={() => setCardModalOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-[var(--surface)] border border-[var(--border-primary)] shadow-2xl p-6 flex flex-col gap-4 text-[var(--text-primary)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[var(--border-secondary)] pb-3">
              <h3 id="result-card-modal-title" className="text-sm font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                Shareable Result Card
              </h3>
              <button
                type="button"
                onClick={() => setCardModalOpen(false)}
                aria-label="Close card modal"
                className="p-1 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Apple Minimalist Visual Result Card */}
            <div className="rounded-xl border border-[var(--border-primary)] bg-[var(--bg-tertiary)] p-6 text-center flex flex-col items-center gap-3 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)]">
                ACADEMIC CALCULATOR
              </span>

              <div className="flex flex-col items-center mt-1">
                <span className="text-xs font-bold uppercase text-[var(--text-secondary)]">
                  {resultLabel}
                </span>
                <span className="text-[40px] font-bold tracking-tight text-[var(--text-primary)] font-mono leading-none mt-1">
                  {resultValue}
                </span>
              </div>

              <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 text-xs text-[var(--text-secondary)] pt-2 border-t border-[var(--border-secondary)] w-full">
                {items.slice(0, 3).map((item, idx) => (
                  <span key={idx}>
                    {item.value}
                  </span>
                ))}
              </div>

              {studentName.trim() && (
                <div className="pt-2 border-t border-[var(--border-secondary)] w-full text-xs">
                  <div className="font-bold text-[var(--text-primary)]">
                    {studentName.trim()}
                  </div>
                  {includeRollNumber && rollNumber.trim() && (
                    <div className="text-[11px] text-[var(--text-secondary)] font-mono mt-0.5">
                      {rollNumber.trim()}
                    </div>
                  )}
                  <div className="text-[10px] text-[var(--text-tertiary)] mt-1 font-mono">
                    Generated {new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date())}
                  </div>
                </div>
              )}
            </div>

            {/* Privacy toggle: include roll number */}
            {rollNumber.trim() && (
              <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)] cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeRollNumber}
                  onChange={(e) => setIncludeRollNumber(e.target.checked)}
                  className="rounded border-[var(--border-primary)] text-black focus:ring-black"
                />
                <span>Include Register / Roll Number on card</span>
              </label>
            )}

            {/* Modal Actions */}
            <div className="flex items-center gap-2 pt-2 border-t border-[var(--border-secondary)]">
              <button
                type="button"
                onClick={handleCopyCard}
                className="flex-1 apple-btn-secondary text-xs h-10 gap-1.5 font-semibold"
              >
                {cardCopied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Copied ✓</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Card</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleShareCard}
                className="flex-1 apple-btn-primary text-xs h-10 gap-1.5 font-semibold"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Share Card</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
