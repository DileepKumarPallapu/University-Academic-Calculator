import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center gap-4 apple-reveal">
      <span className="text-xs font-mono font-bold text-[#86868B]">404</span>
      <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-[#1D1D1F] dark:text-[#F5F5F7]">
        Page not found.
      </h1>
      <p className="text-sm text-[#6E6E73] dark:text-[#A1A1A6] max-w-sm">
        The academic calculator or resource you are looking for does not exist.
      </p>
      <Link
        to="/"
        className="mt-4 px-6 py-2.5 rounded-full bg-black dark:bg-white text-white dark:text-black font-semibold text-xs apple-button-interaction flex items-center gap-1.5"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Return Home</span>
      </Link>
    </div>
  );
};
