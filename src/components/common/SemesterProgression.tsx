import React from 'react';
import type { SemesterItem } from '../../types';
import { formatFixed } from '../../utils/calculations';

interface SemesterProgressionProps {
  semesters: SemesterItem[];
}

export const SemesterProgression: React.FC<SemesterProgressionProps> = ({ semesters }) => {
  const validSemesters = semesters.filter(
    (s) => typeof s.gpa === 'number' && !isNaN(s.gpa) && s.gpa > 0
  );

  if (validSemesters.length === 0) return null;

  const minGpa = Math.max(0, Math.min(...validSemesters.map((s) => s.gpa as number)) - 0.5);
  const maxGpa = Math.min(10, Math.max(...validSemesters.map((s) => s.gpa as number)) + 0.5);
  const range = maxGpa - minGpa || 1;

  const width = 280;
  const height = 70;
  const paddingX = 16;
  const paddingY = 12;

  const points = validSemesters.map((s, idx) => {
    const x =
      validSemesters.length === 1
        ? width / 2
        : paddingX + (idx / (validSemesters.length - 1)) * (width - 2 * paddingX);
    const gpa = s.gpa as number;
    const y = height - paddingY - ((gpa - minGpa) / range) * (height - 2 * paddingY);
    return { x, y, gpa, num: s.semesterNumber };
  });

  const pathD = points.reduce((acc, pt, idx) => {
    return idx === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
  }, '');

  return (
    <div className="flex flex-col gap-3 p-4 rounded-2xl bg-[#F5F5F7] dark:bg-[#2C2C2E] border border-black/[0.04] dark:border-white/[0.06]">
      <div className="flex items-center justify-between text-xs font-semibold text-[#6E6E73] dark:text-[#A1A1A6]">
        <span>Semester Progression</span>
        <span className="text-[11px] font-mono">GPA Trend</span>
      </div>

      {/* Minimal SVG Sparkline */}
      <div className="w-full flex items-center justify-center py-1">
        <svg width={width} height={height} className="overflow-visible">
          {/* Connecting line */}
          <path
            d={pathD}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-black dark:text-white"
          />
          {/* Data points */}
          {points.map((pt, i) => (
            <circle
              key={i}
              cx={pt.x}
              cy={pt.y}
              r="3.5"
              className="fill-black dark:fill-white"
            />
          ))}
        </svg>
      </div>

      {/* Text summary row */}
      <div className="flex flex-col divide-y divide-black/[0.04] dark:divide-white/[0.06] text-xs pt-1">
        {validSemesters.map((s) => (
          <div key={s.id} className="py-1.5 flex items-center justify-between text-[#1D1D1F] dark:text-[#F5F5F7]">
            <span className="text-[#6E6E73] dark:text-[#A1A1A6]">Semester {s.semesterNumber}</span>
            <span className="font-semibold tabular-nums">{formatFixed(s.gpa as number, 2)}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
