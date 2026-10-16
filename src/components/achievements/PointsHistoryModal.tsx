import React, { useState } from 'react';
import type { PointsTransaction } from '../../types/achievements';
import { X, Search, Sparkles, Clock, History } from 'lucide-react';

interface PointsHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: PointsTransaction[];
  totalPoints: number;
}

export const PointsHistoryModal: React.FC<PointsHistoryModalProps> = ({
  isOpen,
  onClose,
  transactions,
  totalPoints,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  if (!isOpen) return null;

  const filteredTransactions = transactions.filter((t) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      t.description.toLowerCase().includes(term) ||
      t.actionType.toLowerCase().includes(term)
    );
  });

  const getActionBadgeColor = (actionType: string) => {
    switch (actionType) {
      case 'study_session':
        return 'bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800';
      case 'task_completed':
        return 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800';
      case 'topic_completed':
        return 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800';
      case 'mock_exam_completed':
      case 'mock_exam_high_score':
        return 'bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800';
      case 'mistake_mastered':
        return 'bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800';
      case 'achievement_unlocked':
        return 'bg-yellow-50 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-400 border-yellow-300 dark:border-yellow-700 font-bold';
      case 'weekly_challenge':
        return 'bg-cyan-50 dark:bg-cyan-950/30 text-cyan-600 dark:text-cyan-400 border-cyan-200 dark:border-cyan-800';
      default:
        return 'bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600';
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">
                Experience Points History
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Audited ledger of verifiable learning activities ({totalPoints.toLocaleString()} Total XP)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 bg-gray-50/50 dark:bg-gray-750 border-b border-gray-100 dark:border-gray-700">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filter by activity name or type..."
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-white"
            />
          </div>
        </div>

        {/* List */}
        <div className="p-4 overflow-y-auto flex-1 space-y-2.5">
          {filteredTransactions.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Sparkles className="w-10 h-10 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
              <p className="text-xs font-semibold">No points transactions recorded yet.</p>
              <p className="text-[11px] text-gray-400 mt-1">
                Complete focus sessions, tasks, syllabus topics, and mock exams to earn points.
              </p>
            </div>
          ) : (
            filteredTransactions.map((tx) => (
              <div
                key={tx.id}
                className="p-3 rounded-xl border border-gray-100 dark:border-gray-700/80 bg-white dark:bg-gray-800 flex items-center justify-between gap-3 hover:border-indigo-200 dark:hover:border-indigo-800 transition-colors"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${getActionBadgeColor(
                        tx.actionType
                      )}`}
                    >
                      {tx.actionType.replace(/_/g, ' ')}
                    </span>
                    <span className="text-[11px] text-gray-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(tx.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate">
                    {tx.description}
                  </p>
                </div>

                <div className="flex-shrink-0">
                  <span className="inline-flex items-center gap-1 font-black text-xs text-indigo-600 dark:text-indigo-400 px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800">
                    <Sparkles className="w-3 h-3 text-amber-500 fill-amber-500" />
                    +{tx.points} XP
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-750 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>Showing {filteredTransactions.length} of {transactions.length} activities</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-bold rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
