import React from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useAcademic } from '../context/AcademicContext';
import { formatFixed } from '../utils/calculations';

export const SemesterDashboardPage: React.FC = () => {
  const { profile, subjects } = useAcademic();

  const totalCredits = subjects.reduce((sum, s) => sum + (s.credits || 0), 0);
  const avgInternal =
    subjects.length > 0
      ? subjects.reduce((sum, s) => sum + (s.internalMark || 0), 0) / subjects.length
      : 0;

  return (
    <div className="flex flex-col gap-10 sm:gap-14 apple-reveal max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-black/[0.06] dark:border-white/[0.08] pb-6">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-[#86868B]">
            {profile.branch} • {profile.academicYear}
          </span>
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-[#1D1D1F] dark:text-[#F5F5F7] mt-1">
            Semester {profile.currentSemester} Dashboard
          </h1>
        </div>
        <Link
          to="/subjects"
          className="px-4 py-2 rounded-full bg-black dark:bg-white text-white dark:text-black font-semibold text-xs apple-button-interaction flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Manage Courses</span>
        </Link>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-[#FFFFFF] dark:bg-[#1D1D1F] p-5 rounded-[24px] border border-black/[0.08] dark:border-white/[0.12] shadow-sm flex flex-col">
          <span className="text-xs uppercase font-semibold text-[#86868B]">Semester</span>
          <span className="text-3xl font-bold text-[#1D1D1F] dark:text-[#F5F5F7] mt-1">
            Sem {profile.currentSemester}
          </span>
          <span className="text-[11px] text-[#6E6E73] dark:text-[#A1A1A6] mt-0.5">{profile.branch}</span>
        </div>

        <div className="bg-[#FFFFFF] dark:bg-[#1D1D1F] p-5 rounded-[24px] border border-black/[0.08] dark:border-white/[0.12] shadow-sm flex flex-col">
          <span className="text-xs uppercase font-semibold text-[#86868B]">Internal Avg</span>
          <span className="text-3xl font-bold text-[#1D1D1F] dark:text-[#F5F5F7] mt-1 tabular-nums">
            {subjects.length > 0 ? `${formatFixed(avgInternal, 1)}` : '—'}
          </span>
          <span className="text-[11px] text-[#6E6E73] dark:text-[#A1A1A6] mt-0.5">out of 40</span>
        </div>

        <div className="bg-[#FFFFFF] dark:bg-[#1D1D1F] p-5 rounded-[24px] border border-black/[0.08] dark:border-white/[0.12] shadow-sm flex flex-col">
          <span className="text-xs uppercase font-semibold text-[#86868B]">Credits</span>
          <span className="text-3xl font-bold text-[#1D1D1F] dark:text-[#F5F5F7] mt-1 tabular-nums">
            {totalCredits}
          </span>
          <span className="text-[11px] text-[#6E6E73] dark:text-[#A1A1A6] mt-0.5">Semester registered</span>
        </div>

        <div className="bg-[#FFFFFF] dark:bg-[#1D1D1F] p-5 rounded-[24px] border border-black/[0.08] dark:border-white/[0.12] shadow-sm flex flex-col">
          <span className="text-xs uppercase font-semibold text-[#86868B]">Courses</span>
          <span className="text-3xl font-bold text-[#1D1D1F] dark:text-[#F5F5F7] mt-1 tabular-nums">
            {subjects.length}
          </span>
          <span className="text-[11px] text-[#6E6E73] dark:text-[#A1A1A6] mt-0.5">Active curriculum</span>
        </div>
      </div>

      {/* Courses Table / List */}
      <div className="bg-[#FFFFFF] dark:bg-[#1D1D1F] rounded-[24px] border border-black/[0.08] dark:border-white/[0.12] shadow-sm p-6 sm:p-8 flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-[#1D1D1F] dark:text-[#F5F5F7]">
            Active Semester Courses
          </h2>
          <span className="text-xs text-[#86868B]">
            Official 40-mark standing
          </span>
        </div>

        {subjects.length === 0 ? (
          <div className="py-12 text-center text-sm text-[#86868B]">
            No courses configured for this semester.
          </div>
        ) : (
          <div className="divide-y divide-black/[0.04] dark:divide-white/[0.06]">
            {subjects.map((s) => (
              <div
                key={s.id}
                className="py-4 flex items-center justify-between first:pt-0 last:pb-0 hover:bg-black/[0.01] dark:hover:bg-white/[0.01] -mx-4 px-4 rounded-xl transition-colors"
              >
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-[#1D1D1F] dark:text-[#F5F5F7]">
                      {s.name}
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-[#6E6E73] dark:text-[#A1A1A6]">
                      {s.type}
                    </span>
                  </div>
                  <span className="text-xs text-[#86868B] font-mono mt-0.5">
                    {s.code || 'COURSE'} • {s.credits || 3} Credits
                  </span>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className="text-base font-bold text-[#1D1D1F] dark:text-[#F5F5F7] tabular-nums">
                      {formatFixed(s.internalMark, 2)}
                    </span>
                    <span className="text-xs text-[#86868B]"> / 40</span>
                    <div className="text-[11px] text-[#6E6E73] dark:text-[#A1A1A6] font-medium">
                      {formatFixed(s.percentage, 1)}%
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
