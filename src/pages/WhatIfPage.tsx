import React from 'react';
import { Sparkles } from 'lucide-react';
import { WhatIfGpaSimulator } from '../components/intelligence/WhatIfGpaSimulator';

export const WhatIfPage: React.FC = () => {
  return (
    <div className="apple-page-enter flex flex-col gap-8 w-full">
      {/* Header */}
      <div className="flex flex-col items-center text-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-black dark:bg-white text-white dark:text-black flex items-center justify-center shadow-sm">
          <Sparkles className="w-6 h-6" />
        </div>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-[var(--text-primary)]">
          What-If GPA Simulator
        </h1>
        <p className="text-sm sm:text-base text-[var(--text-secondary)] max-w-xl leading-relaxed">
          Experiment with hypothetical grades, credit distributions, and multi-scenario projections without modifying your saved records.
        </p>
      </div>

      {/* Simulator Component */}
      <WhatIfGpaSimulator />
    </div>
  );
};
