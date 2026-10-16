import React, { useState, useMemo } from 'react';
import {
  BookMarked,
  CheckCircle,
  RotateCcw,
  Trash2,
  Edit2,
  Save,
  Search,
  ExternalLink,
} from 'lucide-react';
import type { MistakeNotebookItem, BankQuestion } from '../../types/mockExam';

interface MistakeNotebookCardProps {
  items: MistakeNotebookItem[];
  onToggleMastered: (itemId: string, isMastered?: boolean) => void;
  onRemoveItem: (itemId: string) => void;
  onUpdateNotes: (itemId: string, newNotes: string) => void;
  onPracticeMistakes?: (questions: BankQuestion[]) => void;
}

export const MistakeNotebookCard: React.FC<MistakeNotebookCardProps> = ({
  items,
  onToggleMastered,
  onRemoveItem,
  onUpdateNotes,
  onPracticeMistakes,
}) => {
  const [filterMastery, setFilterMastery] = useState<'all' | 'needs_revision' | 'mastered'>(
    'needs_revision'
  );
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState<string>('');

  // Extract distinct subjects
  const subjects = useMemo(() => {
    const set = new Set<string>();
    items.forEach((item) => set.add(item.question.subjectName));
    return Array.from(set).sort();
  }, [items]);

  // Filter items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (filterMastery === 'needs_revision' && item.isMastered) return false;
      if (filterMastery === 'mastered' && !item.isMastered) return false;
      if (subjectFilter !== 'all' && item.question.subjectName !== subjectFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesQuestion = item.question.questionText.toLowerCase().includes(q);
        const matchesSubj = item.question.subjectName.toLowerCase().includes(q);
        const matchesNotes = item.personalNotes?.toLowerCase().includes(q);
        if (!matchesQuestion && !matchesSubj && !matchesNotes) return false;
      }

      return true;
    });
  }, [items, filterMastery, subjectFilter, searchQuery]);

  const handleStartEdit = (item: MistakeNotebookItem) => {
    setEditingId(item.id);
    setEditingText(item.personalNotes || '');
  };

  const handleSaveEdit = (itemId: string) => {
    onUpdateNotes(itemId, editingText.trim());
    setEditingId(null);
  };

  const activeMistakesToPractice = useMemo(() => {
    return filteredItems.filter((i) => !i.isMastered).map((i) => i.question);
  }, [filteredItems]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm space-y-6">
      {/* Header & Practice Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100 dark:border-gray-700">
        <div>
          <div className="flex items-center gap-2">
            <BookMarked className="w-5 h-5 text-rose-500" />
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              Mistake Notebook & Error Log
            </h2>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Review questions you struggled with, identify patterns, and master difficult concepts.
          </p>
        </div>

        {onPracticeMistakes && activeMistakesToPractice.length > 0 && (
          <button
            onClick={() => onPracticeMistakes(activeMistakesToPractice)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl shadow-md shadow-rose-500/20 transition self-start sm:self-auto"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Practice These {activeMistakesToPractice.length} Questions</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
          <input
            type="text"
            placeholder="Search saved mistakes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>

        <select
          value={filterMastery}
          onChange={(e) =>
            setFilterMastery(e.target.value as 'all' | 'needs_revision' | 'mastered')
          }
          className="px-3 py-1.5 text-xs rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        >
          <option value="needs_revision">Needs Revision ({items.filter((i) => !i.isMastered).length})</option>
          <option value="mastered">Mastered ({items.filter((i) => i.isMastered).length})</option>
          <option value="all">All Mistakes ({items.length})</option>
        </select>

        <select
          value={subjectFilter}
          onChange={(e) => setSubjectFilter(e.target.value)}
          className="px-3 py-1.5 text-xs rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        >
          <option value="all">All Subjects ({subjects.length})</option>
          {subjects.map((s, idx) => (
            <option key={idx} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {/* Items List */}
      {items.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl p-6">
          <BookMarked className="w-8 h-8 text-gray-400 mx-auto mb-2 opacity-50" />
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            Your Mistake Notebook is empty.
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-sm mx-auto">
            When reviewing mock exam results, click "Save to Mistake Notebook" on questions you missed to review them here.
          </p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-8 text-xs text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-xl">
          No mistakes found matching current filters.
        </div>
      ) : (
        <div className="space-y-4">
          {filteredItems.map((item) => {
            const q = item.question;
            const isEditing = editingId === item.id;

            return (
              <div
                key={item.id}
                className={`p-5 rounded-2xl border transition space-y-3 ${
                  item.isMastered
                    ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/40'
                    : 'bg-white dark:bg-gray-750 border-gray-200 dark:border-gray-700'
                }`}
              >
                {/* Item Meta */}
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                      {q.subjectName}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {q.unitOrTopic}
                    </span>
                    <span className="text-xs text-gray-400">
                      Saved {new Date(item.savedAt).toLocaleDateString()}
                    </span>
                  </div>

                  {/* Mastery and Delete Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onToggleMastered(item.id)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                        item.isMastered
                          ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-emerald-50 hover:text-emerald-700'
                      }`}
                    >
                      {item.isMastered ? (
                        <>
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Mastered</span>
                        </>
                      ) : (
                        <>
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Mark Mastered</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => onRemoveItem(item.id)}
                      className="p-1.5 text-gray-400 hover:text-rose-600 rounded-lg transition"
                      title="Remove from Mistake Notebook"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Question Statement */}
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 leading-relaxed">
                  {q.questionText}
                </p>

                {/* Answer Key / Explanation */}
                {(q.explanation || q.modelAnswer) && (
                  <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-xl text-xs text-gray-700 dark:text-gray-300 space-y-1">
                    <span className="font-bold text-gray-800 dark:text-gray-200">
                      Key / Explanation:
                    </span>
                    <p className="whitespace-pre-wrap">{q.explanation || q.modelAnswer}</p>
                  </div>
                )}

                {/* Reflection Notes */}
                <div className="pt-2 border-t border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  {isEditing ? (
                    <div className="flex-1 flex items-center gap-2">
                      <input
                        type="text"
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        placeholder="Add personal note, why you made this mistake..."
                        className="flex-1 px-3 py-1 text-xs rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                      <button
                        onClick={() => handleSaveEdit(item.id)}
                        className="px-2.5 py-1 bg-indigo-600 text-white rounded-lg text-xs font-semibold flex items-center gap-1"
                      >
                        <Save className="w-3 h-3" />
                        <span>Save</span>
                      </button>
                    </div>
                  ) : (
                    <div className="flex-1 flex items-center justify-between gap-2">
                      <p className="text-xs text-gray-600 dark:text-gray-400 italic">
                        {item.personalNotes ? (
                          <>
                            <span className="font-semibold not-italic text-gray-700 dark:text-gray-300">
                              Your Note:
                            </span>{' '}
                            {item.personalNotes}
                          </>
                        ) : (
                          <span className="text-gray-400">No personal reflection note added.</span>
                        )}
                      </p>
                      <button
                        onClick={() => handleStartEdit(item)}
                        className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 shrink-0"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>Edit Note</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
