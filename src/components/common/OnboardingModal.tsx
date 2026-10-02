import React, { useState } from 'react';
import { useAcademic } from '../../context/AcademicContext';
import { Sparkles, CheckCircle2, ShieldCheck, ArrowRight, X } from 'lucide-react';

export const OnboardingModal: React.FC = () => {
  const { hasCompletedOnboarding, completeOnboarding } = useAcademic();
  const [step, setStep] = useState(0);

  if (hasCompletedOnboarding) return null;

  const screens = [
    {
      title: 'Welcome to Academic Calculator.',
      subtitle: 'A focused, Apple-inspired academic utility engineered for clarity in your university grading.',
      icon: <Sparkles className="w-8 h-8 text-black dark:text-white" />,
    },
    {
      title: "Built around your university's marking structure.",
      subtitle: 'Accurately converts raw marks for both Theory and Integrated subjects into official 40-mark internal standing.',
      icon: <CheckCircle2 className="w-8 h-8 text-black dark:text-white" />,
    },
    {
      title: 'Calculate internals, GPA and CGPA.',
      subtitle: 'Weighted credit formulas prevent calculation errors and keep your academic record perfectly on track.',
      icon: <Sparkles className="w-8 h-8 text-black dark:text-white" />,
    },
    {
      title: 'Everything stays on your device.',
      subtitle: 'Your scores and records remain 100% private in local storage with zero server telemetry or ads.',
      icon: <ShieldCheck className="w-8 h-8 text-black dark:text-white" />,
    },
  ];

  const currentScreen = screens[step];

  const handleNext = () => {
    if (step < screens.length - 1) {
      setStep(step + 1);
    } else {
      completeOnboarding();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 dark:bg-black/70 backdrop-blur-md animate-fade-in-up"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md bg-[#FFFFFF] dark:bg-[#1D1D1F] rounded-[28px] p-8 border border-black/[0.08] dark:border-white/[0.12] shadow-2xl flex flex-col gap-6 relative">
        <button
          type="button"
          onClick={completeOnboarding}
          className="absolute top-6 right-6 p-2 rounded-full text-[#86868B] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7] transition-colors"
          aria-label="Skip onboarding"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="w-14 h-14 rounded-2xl bg-black/[0.04] dark:bg-white/[0.08] flex items-center justify-center">
          {currentScreen.icon}
        </div>

        <div className="flex flex-col gap-2">
          <h2 className="text-2xl font-bold tracking-tight text-[#1D1D1F] dark:text-[#F5F5F7] leading-snug">
            {currentScreen.title}
          </h2>
          <p className="text-sm text-[#6E6E73] dark:text-[#A1A1A6] leading-relaxed">
            {currentScreen.subtitle}
          </p>
        </div>

        {/* Step indicators */}
        <div className="flex items-center gap-1.5 pt-2">
          {screens.map((_, idx) => (
            <div
              key={idx}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                idx === step
                  ? 'w-6 bg-black dark:bg-white'
                  : 'w-1.5 bg-black/15 dark:bg-white/20'
              }`}
            />
          ))}
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={completeOnboarding}
            className="text-xs font-semibold text-[#86868B] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7] transition-colors"
          >
            Skip
          </button>
          <button
            type="button"
            onClick={handleNext}
            className="px-6 py-2.5 rounded-full bg-black dark:bg-white text-white dark:text-black font-semibold text-xs apple-button-interaction flex items-center gap-1.5"
          >
            <span>{step === screens.length - 1 ? 'Get Started' : 'Next'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
