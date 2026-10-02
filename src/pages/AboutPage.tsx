import React from 'react';

export const AboutPage: React.FC = () => {
  return (
    <div className="flex flex-col gap-10 sm:gap-14 apple-reveal max-w-3xl mx-auto">
      <div className="flex flex-col items-center text-center gap-3">
        <h1 className="text-[34px] sm:text-[48px] font-bold tracking-tight text-[#1D1D1F] dark:text-[#F5F5F7]">
          About Academic Calculator
        </h1>
        <p className="text-[16px] text-[#6E6E73] dark:text-[#A1A1A6] max-w-lg leading-relaxed">
          A focused academic utility for calculating internal marks, GPA and CGPA.
        </p>
      </div>

      <div className="bg-[#FFFFFF] dark:bg-[#1D1D1F] rounded-[24px] p-6 sm:p-8 border border-black/[0.08] dark:border-white/[0.12] shadow-sm flex flex-col gap-6 text-sm text-[#6E6E73] dark:text-[#A1A1A6] leading-relaxed">
        <div>
          <h2 className="text-base font-bold text-[#1D1D1F] dark:text-[#F5F5F7] mb-1">
            Version & Architecture
          </h2>
          <p>
            Version 2.0.0 (Apple Edition) • Built with React 19, TypeScript, Vite, Tailwind CSS, and Lucide icons.
          </p>
        </div>

        <div>
          <h2 className="text-base font-bold text-[#1D1D1F] dark:text-[#F5F5F7] mb-1">
            University Marking Configuration
          </h2>
          <div className="p-4 rounded-2xl bg-[#F5F5F7] dark:bg-[#2C2C2E] font-mono text-xs space-y-2 text-[#1D1D1F] dark:text-[#F5F5F7]">
            <div>• Theory Total: 40 Marks [3 Tests of 30 → 10 each + 5 Attendance + 5 Assignment]</div>
            <div>• Integrated Total: 40 Marks [2 Mids of 20 → 5 each + 20 Lab + 5 Attendance + 5 Assignment]</div>
            <div>• GPA Formula: Σ(Course Credits × Grade Points) ÷ Σ(Course Credits)</div>
            <div>• CGPA Formula: Σ(Semester GPA × Semester Credits) ÷ Σ(Semester Credits)</div>
          </div>
        </div>

        <div>
          <h2 className="text-base font-bold text-[#1D1D1F] dark:text-[#F5F5F7] mb-1">
            Privacy Philosophy
          </h2>
          <p>
            100% on-device local computation. No external analytics, telemetry, or server database.
          </p>
        </div>
      </div>
    </div>
  );
};
