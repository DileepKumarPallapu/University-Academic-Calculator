import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Trash2, ChevronRight, Calculator, AlertTriangle, ArrowRight } from 'lucide-react';
import { useHistory } from '../context/HistoryContext';
import { useAppToast } from '../components/layout/AppShell';
import { Modal } from '../components/common/Modal';
import { SegmentedControl } from '../components/common/SegmentedControl';
import type { HistoryItem } from '../types';

export const HistoryPage: React.FC = () => {
  const { history, deleteHistory, clearHistory } = useHistory();
  const { showToast } = useAppToast();

  const [activeFilter, setActiveFilter] = useState<'all' | 'internals' | 'gpa' | 'cgpa'>('all');
  const [selectedItem, setSelectedItem] = useState<HistoryItem | null>(null);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday =
      date.getDate() === yesterday.getDate() &&
      date.getMonth() === yesterday.getMonth() &&
      date.getFullYear() === yesterday.getFullYear();

    if (isToday) return 'Today';
    if (isYesterday) return 'Yesterday';
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const filteredHistory = history.filter((item) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'internals') return item.type === 'theory' || item.type === 'integrated';
    if (activeFilter === 'gpa') return item.type === 'gpa';
    if (activeFilter === 'cgpa') return item.type === 'cgpa';
    return true;
  });

  const handleClearAll = () => {
    clearHistory();
    setConfirmClearOpen(false);
    showToast('History cleared', 'info');
  };

  return (
    <div className="flex flex-col gap-10 sm:gap-14 apple-reveal max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col items-center text-center gap-3">
        <h1 className="text-[34px] sm:text-[48px] font-bold tracking-tight text-[#1D1D1F] dark:text-[#F5F5F7]">
          Calculation History
        </h1>
        <p className="text-[16px] text-[#6E6E73] dark:text-[#A1A1A6] max-w-lg leading-relaxed">
          Stored locally and privately on your device.
        </p>

        {/* Filter */}
        <div className="mt-4 w-full max-w-md">
          <SegmentedControl<'all' | 'internals' | 'gpa' | 'cgpa'>
            fullWidth
            value={activeFilter}
            onChange={(val) => setActiveFilter(val)}
            options={[
              { value: 'all', label: 'All' },
              { value: 'internals', label: 'Internals' },
              { value: 'gpa', label: 'GPA' },
              { value: 'cgpa', label: 'CGPA' },
            ]}
          />
        </div>
      </div>

      {/* 37. Apple Settings Style History List */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between px-2">
          <span className="text-xs font-semibold uppercase tracking-[0.06em] text-[#6E6E73] dark:text-[#A1A1A6]">
            Stored Records ({filteredHistory.length})
          </span>
          {history.length > 0 && (
            <button
              type="button"
              onClick={() => setConfirmClearOpen(true)}
              className="text-xs font-medium text-rose-500 hover:text-rose-600 transition-colors"
            >
              Clear History
            </button>
          )}
        </div>

        {filteredHistory.length === 0 ? (
          /* 23. Empty State */
          <div className="bg-[#FFFFFF] dark:bg-[#1D1D1F] rounded-[24px] p-12 sm:p-16 border border-black/[0.08] dark:border-white/[0.12] flex flex-col items-center text-center gap-4 shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-black/[0.04] dark:bg-white/[0.08] text-[#86868B] flex items-center justify-center">
              <Calculator className="w-6 h-6" />
            </div>
            <div>
              <p className="text-base font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                Your recent calculations will appear here.
              </p>
              <p className="text-xs text-[#6E6E73] dark:text-[#A1A1A6] mt-1">
                Calculate your internal marks, GPA or CGPA to see your stored results.
              </p>
            </div>
            <Link
              to="/internals"
              className="mt-2 px-5 py-2.5 rounded-full bg-black dark:bg-white text-white dark:text-black text-xs font-semibold apple-button-interaction flex items-center gap-1.5"
            >
              <span>Calculate your first result</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        ) : (
          /* Apple Settings List Card */
          <div className="bg-[#FFFFFF] dark:bg-[#1D1D1F] rounded-[24px] border border-black/[0.08] dark:border-white/[0.12] shadow-sm divide-y divide-black/[0.04] dark:divide-white/[0.06] overflow-hidden">
            {filteredHistory.map((item) => (
              <div
                key={item.id}
                onClick={() => setSelectedItem(item)}
                className="px-6 py-4 flex items-center justify-between hover:bg-black/[0.02] dark:hover:bg-white/[0.02] cursor-pointer transition-colors select-none group min-h-[58px]"
              >
                {/* Left: Type & Date */}
                <div className="flex flex-col">
                  <span className="text-[15px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                    {item.title}
                  </span>
                  <span className="text-xs text-[#6E6E73] dark:text-[#A1A1A6] mt-0.5">
                    {formatDate(item.timestamp)}
                  </span>
                </div>

                {/* Right: Result & Arrow */}
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] tabular-nums">
                    {item.score}
                  </span>
                  <ChevronRight className="w-4 h-4 text-[#86868B] group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedItem && (
        <Modal
          isOpen={Boolean(selectedItem)}
          onClose={() => setSelectedItem(null)}
          title={selectedItem.title}
          description={`Recorded on ${new Date(selectedItem.timestamp).toLocaleDateString([], {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          })}`}
          confirmText="Done"
          onConfirm={() => setSelectedItem(null)}
        >
          <div className="flex flex-col gap-4 py-2">
            <div className="p-4 rounded-2xl bg-[#F5F5F7] dark:bg-[#2C2C2E] flex items-center justify-between">
              <span className="text-xs font-semibold uppercase text-[#6E6E73] dark:text-[#A1A1A6]">
                Calculation Result
              </span>
              <span className="text-2xl font-bold text-[#1D1D1F] dark:text-[#F5F5F7] tabular-nums">
                {selectedItem.score}
              </span>
            </div>

            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-[#6E6E73] dark:text-[#A1A1A6]">
                Calculation Parameters
              </span>
              <pre className="p-4 rounded-2xl bg-[#F5F5F7] dark:bg-[#2C2C2E] text-xs font-mono text-[#1D1D1F] dark:text-[#F5F5F7] overflow-x-auto max-h-56">
                {JSON.stringify(selectedItem.details, null, 2)}
              </pre>
            </div>

            <button
              type="button"
              onClick={() => {
                deleteHistory(selectedItem.id);
                setSelectedItem(null);
                showToast('Record deleted', 'info');
              }}
              className="self-start text-xs font-medium text-rose-500 hover:text-rose-600 flex items-center gap-1.5 pt-2"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete this record</span>
            </button>
          </div>
        </Modal>
      )}

      {/* 26. Modal for Clear History Confirmation */}
      <Modal
        isOpen={confirmClearOpen}
        onClose={() => setConfirmClearOpen(false)}
        title="Clear calculation history?"
        description="This will permanently remove your saved calculations from this device."
        confirmText="Clear History"
        onConfirm={handleClearAll}
        confirmDestructive
      >
        <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/20 text-rose-600 text-xs">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>All saved calculations will be permanently deleted from localStorage.</span>
        </div>
      </Modal>
    </div>
  );
};
