import React, { useEffect, useState } from 'react';

interface ProgressRingProps {
  score: number;
  maxScore: number;
  percentage: number;
  size?: number;
  strokeWidth?: number;
}

export const ProgressRing: React.FC<ProgressRingProps> = ({
  score,
  maxScore,
  percentage,
  size = 140,
  strokeWidth = 8,
}) => {
  const [animatedPercent, setAnimatedPercent] = useState(0);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  useEffect(() => {
    // Animate smoothly to percentage
    const timer = setTimeout(() => {
      setAnimatedPercent(Math.min(100, Math.max(0, percentage)));
    }, 50);
    return () => clearTimeout(timer);
  }, [percentage]);

  const offset = circumference - (animatedPercent / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg
        width={size}
        height={size}
        className="transform -rotate-90 origin-center"
        aria-hidden="true"
      >
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-black/[0.06] dark:text-white/[0.08]"
        />
        {/* Foreground progress */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="text-black dark:text-white transition-all duration-700 ease-out"
        />
      </svg>

      {/* Center score & percentage */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none pointer-events-none">
        <span className="text-2xl font-bold tracking-tight text-[#1D1D1F] dark:text-[#F5F5F7] tabular-nums">
          {score.toFixed(1)}
        </span>
        <span className="text-[11px] font-medium text-[#6E6E73] dark:text-[#A1A1A6] -mt-0.5">
          / {maxScore}
        </span>
        <span className="text-[10px] font-semibold text-[#86868B] dark:text-[#6E6E73] mt-0.5">
          {percentage.toFixed(1)}%
        </span>
      </div>
    </div>
  );
};
