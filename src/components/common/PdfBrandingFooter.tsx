import React from 'react';

const GithubIcon: React.FC<{ className?: string }> = ({ className = 'w-3 h-3' }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);

const LinkedinIcon: React.FC<{ className?: string }> = ({ className = 'w-3 h-3' }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect width="4" height="12" x="2" y="9" />
    <circle cx="4" cy="4" r="2" />
  </svg>
);

export interface PdfBrandingFooterProps {
  className?: string;
  showSocials?: boolean;
  pageLabel?: string;
  extraNotice?: string;
}

/**
 * Standardized PDF / Print Branding Footer across the application.
 * Developer: Pallapu Dileep Kumar (CSE Student • Developer)
 * Copyright: © 2026 Pallapu Dileep Kumar. All rights reserved.
 */
export const PdfBrandingFooter: React.FC<PdfBrandingFooterProps> = ({
  className = '',
  showSocials = true,
  pageLabel,
  extraNotice,
}) => {
  return (
    <footer className={`print-footer print-branding-footer break-inside-avoid ${className}`} role="contentinfo">
      <div className="print-footer-left">
        <div className="print-footer-title">
          Academic Calculator <span className="font-normal text-[#6E6E73]">| Developed by Pallapu Dileep Kumar</span>
        </div>
        <div className="print-footer-description">
          Simple academic tools for students • Verified University Algorithms
        </div>

        <div className="print-developer-credits flex flex-col gap-0.5">
          <span className="print-footer-role font-medium">
            CSE Student • Developer
          </span>
          <div className="print-footer-copyright">
            © 2026 Pallapu Dileep Kumar. All rights reserved.
          </div>
        </div>

        {extraNotice && (
          <div className="text-[8px] text-[#86868B] mt-1 italic">
            {extraNotice}
          </div>
        )}
      </div>

      <div className="print-footer-right">
        {showSocials && (
          <>
            <div className="print-footer-connect">
              CONNECT WITH DEVELOPER
            </div>
            <div className="print-footer-socials">
              <a
                href="https://github.com/DileepKumarPallapu"
                target="_blank"
                rel="noopener noreferrer"
                className="print-footer-social"
                title="GitHub - DileepKumarPallapu"
              >
                <GithubIcon className="w-3 h-3 text-[#1D1D1F]" />
                <span>GitHub</span>
              </a>

              <a
                href="https://www.linkedin.com/in/dileep-kumar-pallapu"
                target="_blank"
                rel="noopener noreferrer"
                className="print-footer-social"
                title="LinkedIn - Pallapu Dileep Kumar"
              >
                <LinkedinIcon className="w-3 h-3 text-[#1D1D1F]" />
                <span>LinkedIn</span>
              </a>
            </div>
          </>
        )}
        <div className="print-page-number font-mono text-[9px] text-[#6E6E73] mt-1">
          {pageLabel || 'Official Academic Report • Page 1 of 1'}
        </div>
      </div>
    </footer>
  );
};
