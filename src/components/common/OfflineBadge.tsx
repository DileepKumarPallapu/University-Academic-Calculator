import React, { useState, useEffect } from 'react';
import { WifiOff, Download } from 'lucide-react';

export const OfflineBadge: React.FC = () => {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [dismissedInstall, setDismissedInstall] = useState<boolean>(() => {
    try {
      return localStorage.getItem('academic_pwa_install_dismissed') === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      setInstallPrompt(null);
    }
    try {
      localStorage.setItem('academic_pwa_install_dismissed', 'true');
    } catch {
      // ignore
    }
    setDismissedInstall(true);
  };

  return (
    <>
      {/* Subtle Offline Notice */}
      {!isOnline && (
        <div className="w-full bg-[var(--surface)] border-b border-[var(--border-secondary)] text-[var(--text-secondary)] text-xs py-2 px-4 flex items-center justify-center gap-2 transition-all">
          <WifiOff className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
          <span>Offline — calculations still work</span>
        </div>
      )}

      {/* Optional Install Prompt (only when supported, uninstalled & not dismissed) */}
      {installPrompt && !dismissedInstall && (
        <div className="w-full bg-[var(--surface)] border-b border-[var(--border-primary)] py-2 px-4 flex items-center justify-center gap-3 text-xs text-[var(--text-primary)] transition-all no-print">
          <span>Install Academic Calculator for faster offline access</span>
          <button
            type="button"
            onClick={handleInstallClick}
            className="px-2.5 py-1 rounded-lg bg-[var(--button-primary)] text-[var(--button-primary-text)] font-semibold flex items-center gap-1.5 cursor-pointer text-xs"
          >
            <Download className="w-3 h-3" />
            <span>Install</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setDismissedInstall(true);
              try {
                localStorage.setItem('academic_pwa_install_dismissed', 'true');
              } catch {
                // ignore
              }
            }}
            className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] text-xs cursor-pointer ml-1"
          >
            ✕
          </button>
        </div>
      )}
    </>
  );
};
