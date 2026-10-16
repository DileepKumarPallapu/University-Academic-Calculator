import React from 'react';
import { HardDrive, ShieldCheck, AlertTriangle, Database } from 'lucide-react';
import type { VaultStorageStats } from '../../types/vault';
import { formatFileSize } from '../../services/vaultStorage';

interface StorageUsageBannerProps {
  stats: VaultStorageStats;
}

export const StorageUsageBanner: React.FC<StorageUsageBannerProps> = ({ stats }) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 sm:p-5 shadow-sm space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Left: Storage Usage Metric */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 shrink-0">
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Academic Vault Storage
              </span>
              {stats.isNearQuota && (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Near Browser Limit
                </span>
              )}
            </div>
            <div className="text-sm font-bold text-gray-900 dark:text-white mt-0.5">
              {stats.formattedTotalBytes} Used ({stats.totalFiles} {stats.totalFiles === 1 ? 'document' : 'documents'})
              {stats.storageQuotaBytes ? (
                <span className="text-xs font-normal text-gray-500 dark:text-gray-400 ml-1.5">
                  &bull; Available Device Quota: {formatFileSize(stats.storageQuotaBytes)}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        {/* Right: Privacy Notice */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-800/40 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 shrink-0">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-semibold text-[11px]">
            100% Client-Side Private &bull; IndexedDB Local Storage
          </span>
        </div>
      </div>

      {/* Progress Bar (if quota available) */}
      {stats.storageUsagePercent !== undefined && (
        <div className="space-y-1">
          <div className="flex justify-between text-[11px] text-gray-400">
            <span className="flex items-center gap-1">
              <Database className="w-3 h-3" />
              Browser Storage Allocation
            </span>
            <span>{stats.storageUsagePercent}% Used</span>
          </div>
          <div className="h-1.5 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                stats.isNearQuota
                  ? 'bg-rose-500'
                  : stats.storageUsagePercent > 50
                  ? 'bg-amber-500'
                  : 'bg-indigo-600'
              }`}
              style={{ width: `${Math.min(100, Math.max(1, stats.storageUsagePercent))}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
