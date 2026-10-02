import React, { useState } from 'react';
import { Plus, Trash2, Edit3, BookmarkPlus, Calculator } from 'lucide-react';
import { Modal } from '../components/common/Modal';
import { NumberInput } from '../components/common/NumberInput';
import { SegmentedControl } from '../components/common/SegmentedControl';
import { useHistory } from '../context/HistoryContext';
import { useAppToast } from '../components/layout/AppShell';
import {
  calculateTheoryInternal,
  calculateIntegratedInternal,
  convertTestMark,
  convertMidMark,
  formatFixed,
} from '../utils/calculations';
import type { SubjectAssessmentItem, InternalType, TheoryInputs, IntegratedInputs } from '../types';

export const SubjectCalculatorPage: React.FC = () => {
  const { addHistory } = useHistory();
  const { showToast } = useAppToast();

  const [subjects, setSubjects] = useState<SubjectAssessmentItem[]>([
    {
      id: 'sub-1',
      name: 'Data Structures',
      code: 'CS201',
      type: 'theory',
      theoryInputs: { test1: 25, test2: 28, test3: 24, attendance: 5, assignment: 4 },
      internalMark: 34.67,
      maxMark: 40,
      percentage: 86.68,
    },
    {
      id: 'sub-2',
      name: 'Computer Networks',
      code: 'CS202',
      type: 'theory',
      theoryInputs: { test1: 22, test2: 25, test3: 20, attendance: 5, assignment: 4 },
      internalMark: 31.33,
      maxMark: 40,
      percentage: 78.33,
    },
    {
      id: 'sub-3',
      name: 'Artificial Intelligence & Lab',
      code: 'CS203',
      type: 'integrated',
      integratedInputs: { mid1: 18, mid2: 17, lab: 19, attendance: 5, assignment: 4 },
      internalMark: 36.75,
      maxMark: 40,
      percentage: 91.88,
    },
  ]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [modalName, setModalName] = useState('');
  const [modalCode, setModalCode] = useState('');
  const [modalType, setModalType] = useState<InternalType>('theory');

  const [modalTheory, setModalTheory] = useState<TheoryInputs>({
    test1: '',
    test2: '',
    test3: '',
    attendance: 5,
    assignment: 4,
  });

  const [modalIntegrated, setModalIntegrated] = useState<IntegratedInputs>({
    mid1: '',
    mid2: '',
    lab: '',
    attendance: 5,
    assignment: 4,
  });

  const openAddModal = () => {
    setEditingId(null);
    setModalName(`Course ${subjects.length + 1}`);
    setModalCode('');
    setModalType('theory');
    setModalTheory({ test1: 24, test2: 24, test3: 24, attendance: 5, assignment: 5 });
    setModalIntegrated({ mid1: 16, mid2: 16, lab: 18, attendance: 5, assignment: 5 });
    setModalOpen(true);
  };

  const openEditModal = (item: SubjectAssessmentItem) => {
    setEditingId(item.id);
    setModalName(item.name);
    setModalCode(item.code || '');
    setModalType(item.type);
    if (item.type === 'theory' && item.theoryInputs) {
      setModalTheory({ ...item.theoryInputs });
    }
    if (item.type === 'integrated' && item.integratedInputs) {
      setModalIntegrated({ ...item.integratedInputs });
    }
    setModalOpen(true);
  };

  const handleSaveModal = () => {
    if (!modalName.trim()) {
      showToast('Please enter a course name', 'error');
      return;
    }

    let internalMark = 0;
    let percentage = 0;

    if (modalType === 'theory') {
      const res = calculateTheoryInternal(modalTheory);
      internalMark = res.totalInternal;
      percentage = res.percentage;
    } else {
      const res = calculateIntegratedInternal(modalIntegrated);
      internalMark = res.totalInternal;
      percentage = res.percentage;
    }

    if (editingId) {
      setSubjects((prev) =>
        prev.map((s) =>
          s.id === editingId
            ? {
                ...s,
                name: modalName,
                code: modalCode,
                type: modalType,
                theoryInputs: modalType === 'theory' ? modalTheory : undefined,
                integratedInputs: modalType === 'integrated' ? modalIntegrated : undefined,
                internalMark,
                percentage,
              }
            : s
        )
      );
      showToast(`Updated ${modalName}`, 'success');
    } else {
      const newItem: SubjectAssessmentItem = {
        id: `sub-${Date.now()}`,
        name: modalName,
        code: modalCode,
        type: modalType,
        theoryInputs: modalType === 'theory' ? modalTheory : undefined,
        integratedInputs: modalType === 'integrated' ? modalIntegrated : undefined,
        internalMark,
        maxMark: 40,
        percentage,
      };
      setSubjects((prev) => [...prev, newItem]);
      showToast(`Added ${modalName}`, 'success');
    }

    setModalOpen(false);
  };

  const handleDeleteSubject = (id: string) => {
    setSubjects((prev) => prev.filter((s) => s.id !== id));
    showToast('Course removed', 'info');
  };

  const handleSaveToHistory = () => {
    if (subjects.length === 0) {
      showToast('No courses to save', 'error');
      return;
    }

    const avg =
      subjects.reduce((sum, s) => sum + s.internalMark, 0) / subjects.length;

    addHistory({
      type: 'subject_manager',
      title: `Course Sheet (${subjects.length} Courses)`,
      resultSummary: `Avg Internal: ${formatFixed(avg, 2)} / 40`,
      score: `${formatFixed(avg, 2)} / 40`,
      percentage: `${formatFixed((avg / 40) * 100, 1)}%`,
      details: {
        subjects,
        averageInternal: formatFixed(avg, 2),
      },
    });

    showToast('Course sheet saved to history', 'success');
  };

  const totalSubjects = subjects.length;
  const avgInternal =
    totalSubjects > 0
      ? subjects.reduce((sum, s) => sum + s.internalMark, 0) / totalSubjects
      : 0;
  const highestInternal =
    totalSubjects > 0 ? Math.max(...subjects.map((s) => s.internalMark)) : 0;

  return (
    <div className="flex flex-col gap-10 sm:gap-14 apple-reveal">
      {/* Page Header */}
      <div className="flex flex-col items-center text-center gap-3">
        <h1 className="text-[34px] sm:text-[48px] font-bold tracking-tight text-[#1D1D1F] dark:text-[#F5F5F7]">
          Subject Calculator
        </h1>
        <p className="text-[16px] text-[#6E6E73] dark:text-[#A1A1A6] max-w-lg leading-relaxed">
          Manage and track internal assessments across all your courses.
        </p>
      </div>

      {/* Summary Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#FFFFFF] dark:bg-[#1D1D1F] p-6 rounded-[24px] border border-black/[0.08] dark:border-white/[0.12] shadow-sm flex flex-col">
          <span className="text-xs uppercase font-semibold tracking-wider text-[#6E6E73] dark:text-[#A1A1A6]">
            Total Courses
          </span>
          <span className="text-3xl font-bold text-[#1D1D1F] dark:text-[#F5F5F7] mt-2 tabular-nums">
            {totalSubjects}
          </span>
          <span className="text-xs text-[#6E6E73] dark:text-[#A1A1A6] mt-1">Configured in sheet</span>
        </div>

        <div className="bg-[#FFFFFF] dark:bg-[#1D1D1F] p-6 rounded-[24px] border border-black/[0.08] dark:border-white/[0.12] shadow-sm flex flex-col">
          <span className="text-xs uppercase font-semibold tracking-wider text-[#6E6E73] dark:text-[#A1A1A6]">
            Average Internal
          </span>
          <span className="text-3xl font-bold text-[#1D1D1F] dark:text-[#F5F5F7] mt-2 tabular-nums">
            {totalSubjects > 0 ? `${formatFixed(avgInternal, 2)} / 40` : '—'}
          </span>
          <span className="text-xs text-[#6E6E73] dark:text-[#A1A1A6] mt-1">
            {totalSubjects > 0 ? `${formatFixed((avgInternal / 40) * 100, 1)}% average score` : 'No courses'}
          </span>
        </div>

        <div className="bg-[#FFFFFF] dark:bg-[#1D1D1F] p-6 rounded-[24px] border border-black/[0.08] dark:border-white/[0.12] shadow-sm flex flex-col">
          <span className="text-xs uppercase font-semibold tracking-wider text-[#6E6E73] dark:text-[#A1A1A6]">
            Highest Internal
          </span>
          <span className="text-3xl font-bold text-[#1D1D1F] dark:text-[#F5F5F7] mt-2 tabular-nums">
            {totalSubjects > 0 ? `${formatFixed(highestInternal, 2)} / 40` : '—'}
          </span>
          <span className="text-xs text-[#6E6E73] dark:text-[#A1A1A6] mt-1">
            {totalSubjects > 0 ? `${formatFixed((highestInternal / 40) * 100, 1)}% highest score` : 'No courses'}
          </span>
        </div>
      </div>

      {/* Main Table / Sheet Card */}
      <div className="bg-[#FFFFFF] dark:bg-[#1D1D1F] rounded-[24px] border border-black/[0.08] dark:border-white/[0.12] shadow-sm p-6 sm:p-8 flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-[22px] font-bold tracking-tight text-[#1D1D1F] dark:text-[#F5F5F7]">
              Course Mark Distribution
            </h2>
            <p className="text-xs text-[#6E6E73] dark:text-[#A1A1A6] mt-0.5">
              Review raw assessment, conversions, and final 40-mark internal standing.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleSaveToHistory}
              className="px-4 py-2 text-xs font-semibold rounded-xl border border-black/[0.1] dark:border-white/[0.15] hover:bg-black/5 dark:hover:bg-white/5 text-[#1D1D1F] dark:text-[#F5F5F7] transition-colors flex items-center gap-1.5 min-h-[44px]"
            >
              <BookmarkPlus className="w-3.5 h-3.5" />
              <span>Save Sheet</span>
            </button>
            <button
              type="button"
              onClick={openAddModal}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-black dark:bg-white text-white dark:text-black apple-button-interaction flex items-center gap-1.5 min-h-[44px]"
            >
              <Plus className="w-4 h-4" />
              <span>Add Subject</span>
            </button>
          </div>
        </div>

        {/* Subjects Table */}
        {subjects.length === 0 ? (
          <div className="py-16 flex flex-col items-center text-center gap-3 text-[#86868B]">
            <Calculator className="w-10 h-10 opacity-30" />
            <p className="text-sm font-medium">No courses added yet.</p>
            <button
              type="button"
              onClick={openAddModal}
              className="text-xs font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] underline underline-offset-4"
            >
              Add your first course
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-black/[0.06] dark:border-white/[0.08] text-[11px] font-semibold text-[#6E6E73] dark:text-[#A1A1A6] uppercase tracking-wider">
                  <th className="py-3 px-4">Subject</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Assessment Breakdown</th>
                  <th className="py-3 px-4 text-right">Internal Mark</th>
                  <th className="py-3 px-4 text-right">Percentage</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.04] dark:divide-white/[0.06]">
                {subjects.map((sub) => {
                  let breakdownText = '';
                  if (sub.type === 'theory' && sub.theoryInputs) {
                    const t1 = convertTestMark(Number(sub.theoryInputs.test1) || 0);
                    const t2 = convertTestMark(Number(sub.theoryInputs.test2) || 0);
                    const t3 = convertTestMark(Number(sub.theoryInputs.test3) || 0);
                    breakdownText = `Tests: ${t1}+${t2}+${t3} / 30 | Att: ${sub.theoryInputs.attendance || 0} | Assn: ${sub.theoryInputs.assignment || 0}`;
                  } else if (sub.type === 'integrated' && sub.integratedInputs) {
                    const m1 = convertMidMark(Number(sub.integratedInputs.mid1) || 0);
                    const m2 = convertMidMark(Number(sub.integratedInputs.mid2) || 0);
                    breakdownText = `Mids: ${m1}+${m2} / 10 | Lab: ${sub.integratedInputs.lab || 0}/20 | Att: 5 | Assn: 4`;
                  }

                  return (
                    <tr key={sub.id} className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors">
                      <td className="py-4 px-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                            {sub.name}
                          </span>
                          {sub.code && (
                            <span className="text-xs text-[#86868B] font-mono">{sub.code}</span>
                          )}
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        <span className="text-[11px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-[#1D1D1F] dark:text-[#F5F5F7]">
                          {sub.type}
                        </span>
                      </td>

                      <td className="py-4 px-4 text-xs text-[#6E6E73] dark:text-[#A1A1A6] font-mono">
                        {breakdownText}
                      </td>

                      <td className="py-4 px-4 text-right">
                        <span className="font-bold text-base text-[#1D1D1F] dark:text-[#F5F5F7] tabular-nums">
                          {formatFixed(sub.internalMark, 2)}
                        </span>
                        <span className="text-xs text-[#86868B] font-normal"> / {sub.maxMark}</span>
                      </td>

                      <td className="py-4 px-4 text-right">
                        <span className="font-semibold text-sm text-[#1D1D1F] dark:text-[#F5F5F7] tabular-nums">
                          {formatFixed(sub.percentage, 1)}%
                        </span>
                      </td>

                      <td className="py-4 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEditModal(sub)}
                            className="p-2 text-[#86868B] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7] rounded-lg transition-colors"
                            aria-label={`Edit ${sub.name}`}
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteSubject(sub.id)}
                            className="p-2 text-[#86868B] hover:text-rose-500 rounded-lg transition-colors"
                            aria-label={`Delete ${sub.name}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Subject Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Edit Course Internal' : 'Add Course Internal'}
        description="Configure course marks according to university grading rules."
        confirmText="Save Course"
        onConfirm={handleSaveModal}
      >
        <div className="flex flex-col gap-4 py-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                Course Title
              </label>
              <input
                type="text"
                value={modalName}
                onChange={(e) => setModalName(e.target.value)}
                placeholder="e.g. Operating Systems"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-[#F5F5F7] dark:bg-[#2C2C2E] border border-black/10 dark:border-white/10 outline-none text-[#1D1D1F] dark:text-[#F5F5F7]"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                Course Code (Optional)
              </label>
              <input
                type="text"
                value={modalCode}
                onChange={(e) => setModalCode(e.target.value)}
                placeholder="e.g. CS302"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-[#F5F5F7] dark:bg-[#2C2C2E] border border-black/10 dark:border-white/10 outline-none text-[#1D1D1F] dark:text-[#F5F5F7]"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
              Assessment Pattern
            </label>
            <SegmentedControl<InternalType>
              fullWidth
              value={modalType}
              onChange={(t) => setModalType(t)}
              options={[
                { value: 'theory', label: 'Theory (40M)' },
                { value: 'integrated', label: 'Integrated (40M)' },
              ]}
            />
          </div>

          {modalType === 'theory' ? (
            <div className="grid grid-cols-2 gap-3 pt-2">
              <NumberInput
                id="modal-t1"
                label="Test 1 (Raw)"
                value={modalTheory.test1}
                onChange={(v) => setModalTheory((p) => ({ ...p, test1: v }))}
                max={30}
              />
              <NumberInput
                id="modal-t2"
                label="Test 2 (Raw)"
                value={modalTheory.test2}
                onChange={(v) => setModalTheory((p) => ({ ...p, test2: v }))}
                max={30}
              />
              <NumberInput
                id="modal-t3"
                label="Test 3 (Raw)"
                value={modalTheory.test3}
                onChange={(v) => setModalTheory((p) => ({ ...p, test3: v }))}
                max={30}
              />
              <NumberInput
                id="modal-att"
                label="Attendance"
                value={modalTheory.attendance}
                onChange={(v) => setModalTheory((p) => ({ ...p, attendance: v }))}
                max={5}
              />
              <div className="col-span-2">
                <NumberInput
                  id="modal-assn"
                  label="Assignment"
                  value={modalTheory.assignment}
                  onChange={(v) => setModalTheory((p) => ({ ...p, assignment: v }))}
                  max={5}
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 pt-2">
              <NumberInput
                id="modal-m1"
                label="Mid 1 (Raw)"
                value={modalIntegrated.mid1}
                onChange={(v) => setModalIntegrated((p) => ({ ...p, mid1: v }))}
                max={20}
              />
              <NumberInput
                id="modal-m2"
                label="Mid 2 (Raw)"
                value={modalIntegrated.mid2}
                onChange={(v) => setModalIntegrated((p) => ({ ...p, mid2: v }))}
                max={20}
              />
              <div className="col-span-2">
                <NumberInput
                  id="modal-lab"
                  label="Integrated Lab"
                  value={modalIntegrated.lab}
                  onChange={(v) => setModalIntegrated((p) => ({ ...p, lab: v }))}
                  max={20}
                />
              </div>
              <NumberInput
                id="modal-integ-att"
                label="Attendance"
                value={modalIntegrated.attendance}
                onChange={(v) => setModalIntegrated((p) => ({ ...p, attendance: v }))}
                max={5}
              />
              <NumberInput
                id="modal-integ-assn"
                label="Assignment"
                value={modalIntegrated.assignment}
                onChange={(v) => setModalIntegrated((p) => ({ ...p, assignment: v }))}
                max={5}
              />
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};
