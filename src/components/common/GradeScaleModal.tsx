import React from 'react';
import { X, Award } from 'lucide-react';
import { REGULATIONS, type RegulationId } from '../../config/university';

interface GradeScaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  regulation: RegulationId;
}

export const GradeScaleModal: React.FC<GradeScaleModalProps> = ({
  isOpen,
  onClose,
  regulation,
}) => {
  if (!isOpen) return null;

  const regConfig = REGULATIONS[regulation] || REGULATIONS.VTR21;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="grade-scale-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-appleFadeIn"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-[var(--surface)] border border-[var(--border-primary)] shadow-2xl p-6 flex flex-col gap-5 text-[var(--text-primary)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-secondary)] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-primary)] flex items-center justify-center">
              <Award className="w-5 h-5 text-[var(--text-primary)]" />
            </div>
            <div>
              <h2 id="grade-scale-title" className="text-lg font-semibold tracking-tight text-[var(--text-primary)]">
                {regConfig.name} Grade Scale
              </h2>
              <p className="text-xs text-[var(--text-secondary)]">
                {regConfig.years} • {regConfig.description}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Grade Scale Table */}
        <div className="overflow-x-auto rounded-xl border border-[var(--border-primary)]">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[var(--bg-primary)] border-b border-[var(--border-primary)] text-[11px] font-semibold text-[var(--text-primary)] uppercase">
                <th className="py-2.5 px-3">Marks Range</th>
                <th className="py-2.5 px-3 text-center">Grade</th>
                <th className="py-2.5 px-3 text-center">Grade Point</th>
                <th className="py-2.5 px-3">Standing</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-secondary)]">
              {regConfig.grades.map((g) => (
                <tr key={g.grade} className="hover:bg-[var(--bg-tertiary)] transition-colors">
                  <td className="py-2.5 px-3 font-mono font-medium text-[var(--text-primary)]">
                    {g.range}
                  </td>
                  <td className="py-2.5 px-3 text-center font-bold text-[var(--text-primary)]">
                    {g.grade}
                  </td>
                  <td className="py-2.5 px-3 text-center font-bold text-[var(--text-primary)] tabular-nums font-mono">
                    {g.points}
                  </td>
                  <td className="py-2.5 px-3 text-[var(--text-secondary)]">
                    {g.label.split('—')[1]?.trim() || g.label}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={onClose}
            className="apple-btn-secondary h-10 px-5 text-xs font-semibold cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
