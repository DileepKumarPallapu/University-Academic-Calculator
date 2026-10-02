import React from 'react';
import { ShieldCheck, Lock, HardDrive, EyeOff } from 'lucide-react';

export const PrivacyPage: React.FC = () => {
  return (
    <div className="flex flex-col gap-10 sm:gap-14 max-w-3xl mx-auto animate-fade-in-up">
      <div className="flex flex-col items-center text-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-black dark:bg-white text-white dark:text-black flex items-center justify-center shadow-sm">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-zinc-900 dark:text-white">
          Privacy & Data Philosophy
        </h1>
        <p className="text-sm sm:text-base text-zinc-500 dark:text-zinc-400 leading-relaxed">
          Your marks and academic evaluations belong exclusively to you.
        </p>
      </div>

      <div className="bg-white dark:bg-[#141416] p-6 sm:p-8 rounded-3xl border border-black/8 dark:border-white/10 shadow-sm flex flex-col gap-6 text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">
        <div className="flex items-start gap-4">
          <div className="p-2.5 rounded-2xl bg-black/5 dark:bg-white/10 text-zinc-900 dark:text-white shrink-0 mt-0.5">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-zinc-900 dark:text-white mb-1">
              100% Local On-Device Execution
            </h2>
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
              All computations, conversions, GPA formulas, and semester weightings run directly in your local browser sandbox using high-precision JavaScript. No marks or student numbers are ever sent to an external server.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-4">
          <div className="p-2.5 rounded-2xl bg-black/5 dark:bg-white/10 text-zinc-900 dark:text-white shrink-0 mt-0.5">
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-zinc-900 dark:text-white mb-1">
              Transparent Local Storage
            </h2>
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
              When you opt to save a calculation, it resides in your browser's private <code className="font-mono text-xs">localStorage</code>. You can inspect or clear your entire history at any moment with a single click.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-4">
          <div className="p-2.5 rounded-2xl bg-black/5 dark:bg-white/10 text-zinc-900 dark:text-white shrink-0 mt-0.5">
            <EyeOff className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-zinc-900 dark:text-white mb-1">
              Zero Analytics & Zero Trackers
            </h2>
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
              This application is designed purely as an educational tool for university students. There are no advertising trackers, analytics scripts, or cookies.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
