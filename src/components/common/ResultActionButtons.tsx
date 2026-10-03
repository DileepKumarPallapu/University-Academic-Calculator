import React, { useState } from 'react';
import { Copy, Check, Share2 } from 'lucide-react';

interface ResultItem {
  label: string;
  value: string | number;
}

interface ResultActionButtonsProps {
  title: string;
  studentName?: string;
  items: ResultItem[];
  resultLabel: string;
  resultValue: string | number;
  className?: string;
}

export const ResultActionButtons: React.FC<ResultActionButtonsProps> = ({
  title,
  studentName = '',
  items,
  resultLabel,
  resultValue,
  className = '',
}) => {
  const [copied, setCopied] = useState<boolean>(false);

  const generateFormattedText = (): string => {
    const lines = [
      'Academic Calculator',
      title,
      '--------------------------------',
    ];

    if (studentName.trim()) {
      lines.push(`Student: ${studentName.trim()}`);
    }

    items.forEach((item) => {
      lines.push(`${item.label}: ${item.value}`);
    });

    lines.push('--------------------------------');
    lines.push(`${resultLabel}: ${resultValue}`);
    lines.push('');
    lines.push('Calculated at: https://university-academic-calculator.vercel.app/');

    return lines.join('\n');
  };

  const handleCopy = async () => {
    const text = generateFormattedText();
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
    const text = generateFormattedText();
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

  return (
    <div className={`no-print flex items-center gap-2.5 ${className}`}>
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
    </div>
  );
};
