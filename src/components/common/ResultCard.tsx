import React, { useState, useEffect } from 'react';
import { Share2, Copy, Download, RotateCcw, ChevronDown, Check } from 'lucide-react';
import { formatFixed } from '../../utils/calculations';
import { ProgressRing } from './ProgressRing';
import { UNIVERSITY_CONFIG } from '../../config/university';

export interface BreakdownItem {
  label: string;
  raw?: number | '';
  rawMax?: number;
  obtained: number;
  max: number;
  info?: string;
}

interface ResultCardProps {
  title?: string;
  score: number;
  maxScore: number;
  percentage?: number;
  tier?: string;
  breakdown: BreakdownItem[];
  onReset: () => void;
  onRecalculate?: () => void;
  calculatorType: string;
  onToast: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

export const ResultCard: React.FC<ResultCardProps> = ({
  title = 'YOUR INTERNAL',
  score,
  maxScore,
  percentage,
  tier,
  breakdown,
  onReset,
  onRecalculate,
  calculatorType,
  onToast,
}) => {
  const [showBreakdown, setShowBreakdown] = useState(true);
  const [displayScore, setDisplayScore] = useState<number>(score);
  const [copied, setCopied] = useState(false);

  // Smooth number count-up animation
  useEffect(() => {
    let start = displayScore;
    const end = score;
    if (start === end) return;

    const duration = 350; // ms
    const startTime = performance.now();

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      const current = start + (end - start) * ease;
      setDisplayScore(current);

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        setDisplayScore(end);
      }
    };

    const animId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animId);
  }, [score]);

  const calcPercentage = percentage ?? (maxScore > 0 ? (score / maxScore) * 100 : 0);
  const effectiveTier = tier ?? UNIVERSITY_CONFIG.getPerformanceTier(calcPercentage).label;

  const getSummaryText = () => {
    let text = `Academic Calculator — ${calculatorType}\n`;
    text += `====================================\n`;
    text += `${title}: ${formatFixed(score, 2)} / ${maxScore} (${formatFixed(calcPercentage, 1)}%)\n`;
    text += `Performance Indicator: ${effectiveTier}\n`;
    text += `\nBreakdown:\n`;
    breakdown.forEach((item) => {
      text += `• ${item.label}: ${formatFixed(item.obtained, 2)} / ${item.max}`;
      if (item.raw !== undefined && item.raw !== '' && item.rawMax) {
        text += ` (Raw: ${item.raw}/${item.rawMax})`;
      }
      text += `\n`;
    });
    text += `\nCalculated using university marking rules via Academic Calculator.`;
    return text;
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(getSummaryText());
      setCopied(true);
      onToast('Result copied', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      onToast('Could not copy to clipboard', 'error');
    }
  };

  const handleShare = async () => {
    const text = getSummaryText();
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Academic Result — ${calculatorType}`,
          text,
        });
        onToast('Shared successfully', 'success');
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          handleCopy();
        }
      }
    } else {
      handleCopy();
    }
  };

  const handleDownload = () => {
    try {
      const text = getSummaryText();
      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${calculatorType.toLowerCase().replace(/\s+/g, '_')}_result.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      onToast('Result downloaded', 'success');
    } catch {
      onToast('Download failed', 'error');
    }
  };

  return (
    <div className="w-full bg-[var(--surface)] rounded-[24px] p-6 sm:p-8 border border-[var(--border-primary)] shadow-[var(--shadow-card)] flex flex-col gap-6 apple-reveal">
      {/* Header Label & Performance Tag */}
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-semibold tracking-wider uppercase text-[var(--text-secondary)]">
          {title}
        </span>
        <div className="flex items-center gap-1.5">
          <span className="text-[12px] text-[var(--text-tertiary)]">
            {UNIVERSITY_CONFIG.performanceIndicatorLabel}:
          </span>
          <span className="text-[12px] font-semibold px-2.5 py-0.5 rounded-full bg-[var(--border-secondary)] text-[var(--text-primary)] border border-[var(--border-primary)]">
            {effectiveTier}
          </span>
        </div>
      </div>

      {/* Hero Display: Score + SVG Progress Ring */}
      <div className="flex items-center justify-between gap-6 py-2 border-b border-[var(--border-primary)]">
        <div className="flex flex-col">
          <div className="flex items-baseline gap-2">
            <span className="text-5xl sm:text-6xl font-bold tracking-tight text-[var(--text-primary)] tabular-nums">
              {formatFixed(displayScore, 2)}
            </span>
            <span className="text-xl sm:text-2xl text-[var(--text-secondary)] font-medium">
              / {maxScore}
            </span>
          </div>
          <span className="text-base sm:text-lg font-semibold text-[var(--text-secondary)] mt-1">
            {formatFixed(calcPercentage, 2)}%
          </span>
        </div>

        {/* Minimal Progress Ring */}
        <div className="shrink-0 hidden sm:block">
          <ProgressRing
            score={displayScore}
            maxScore={maxScore}
            percentage={calcPercentage}
            size={108}
            strokeWidth={7}
          />
        </div>
      </div>

      {/* Breakdown Accordion */}
      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={() => setShowBreakdown((prev) => !prev)}
          className="flex items-center justify-between text-xs sm:text-sm font-semibold tracking-wide text-[var(--text-primary)] hover:opacity-80 transition-opacity"
          aria-expanded={showBreakdown}
        >
          <span>Breakdown</span>
          <div className="flex items-center gap-1 text-xs text-[var(--text-secondary)]">
            <span>{showBreakdown ? 'Hide' : 'View Breakdown'}</span>
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform duration-200 ${
                showBreakdown ? 'rotate-180' : ''
              }`}
            />
          </div>
        </button>

        {showBreakdown && (
          <div className="flex flex-col divide-y divide-[var(--border-secondary)] rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] p-4 text-xs sm:text-sm">
            {breakdown.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0"
              >
                <div className="flex flex-col">
                  <span className="font-semibold text-[var(--text-primary)]">
                    {item.label}
                  </span>
                  {item.raw !== undefined && item.raw !== '' && item.rawMax && (
                    <span className="text-[11px] text-[var(--text-secondary)]">
                      Raw: {item.raw} / {item.rawMax}
                    </span>
                  )}
                  {item.info && (
                    <span className="text-[11px] text-[var(--text-secondary)]">
                      {item.info}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 font-semibold text-[var(--text-primary)] tabular-nums">
                  <span>{formatFixed(item.obtained, 2)}</span>
                  <span className="text-[var(--text-secondary)] font-normal">
                    / {item.max}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Action Row */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-2">
          {onRecalculate && (
            <button
              type="button"
              onClick={onRecalculate}
              className="px-5 py-2.5 text-xs font-semibold rounded-xl bg-[var(--btn-primary-bg)] hover:bg-[var(--btn-primary-hover)] text-[var(--btn-primary-text)] min-h-[44px] shadow-sm transition-all"
            >
              Recalculate
            </button>
          )}
          <button
            type="button"
            onClick={onReset}
            className="px-4 py-2.5 text-xs font-semibold rounded-xl border border-[var(--border-primary)] text-[var(--text-primary)] hover:bg-[var(--border-secondary)] min-h-[44px] flex items-center gap-1.5 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        </div>

        {/* Sharing options */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleCopy}
            title="Copy Result"
            className="p-2.5 rounded-xl border border-[var(--border-primary)] hover:bg-[var(--border-secondary)] text-[var(--text-primary)] transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Copy Result"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
          </button>
          <button
            type="button"
            onClick={handleShare}
            title="Share Result"
            className="p-2.5 rounded-xl border border-[var(--border-primary)] hover:bg-[var(--border-secondary)] text-[var(--text-primary)] transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Share Result"
          >
            <Share2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleDownload}
            title="Download Result"
            className="p-2.5 rounded-xl border border-[var(--border-primary)] hover:bg-[var(--border-secondary)] text-[var(--text-primary)] transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Download Result"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
