import React, { useState, useEffect } from 'react';
import {
  FileUp,
  Layers,
  History,
  Trash2,
  Calculator,
} from 'lucide-react';
import { AmsUploader } from '../components/ams/AmsUploader';
import { AmsSideBySideReview } from '../components/ams/AmsSideBySideReview';
import { AmsResultReport } from '../components/ams/AmsResultReport';
import { AmsPrintReport } from '../components/ams/AmsPrintReport';
import { AmsCgpaManager } from '../components/ams/AmsCgpaManager';
import {
  getRecentAmsImports,
  deleteRecentAmsImport,
  clearRecentAmsImports,
} from '../utils/recentAmsImports';
import type {
  AmsExtractionResult,
  AmsStudentInfo,
  AmsSubject,
  AmsAuditSummary,
  RecentAmsImport,
} from '../types/ams';
import { useStudentProfile } from '../hooks/useStudentProfile';
import { useAppToast } from '../components/layout/AppShell';
import { formatFixed } from '../utils/calculations';

type AmsPageMode = 'sgpa' | 'cgpa' | 'history';

export const AmsImportPage: React.FC = () => {
  const { profile } = useStudentProfile();
  const { showToast } = useAppToast();

  const [mode, setMode] = useState<AmsPageMode>('sgpa');

  // Single Semester SGPA state
  const [stage, setStage] = useState<'upload' | 'review' | 'result'>('upload');
  const [extractionResult, setExtractionResult] = useState<AmsExtractionResult | null>(null);
  const [confirmedInfo, setConfirmedInfo] = useState<AmsStudentInfo | null>(null);
  const [confirmedSubjects, setConfirmedSubjects] = useState<AmsSubject[]>([]);
  const [auditSummary, setAuditSummary] = useState<AmsAuditSummary | null>(null);
  const [originalPreviewUrl, setOriginalPreviewUrl] = useState<string | undefined>(undefined);
  const [includeOriginalInPdf, setIncludeOriginalInPdf] = useState<boolean>(true);

  // Recent imports list
  const [recentImports, setRecentImports] = useState<RecentAmsImport[]>([]);

  useEffect(() => {
    setRecentImports(getRecentAmsImports());
  }, [mode, stage]);

  const handleExtractionComplete = (res: AmsExtractionResult) => {
    setExtractionResult(res);
    setStage('review');
  };

  const handleReviewConfirm = (
    info: AmsStudentInfo,
    subs: AmsSubject[],
    audit: AmsAuditSummary,
    previewUrl?: string
  ) => {
    setConfirmedInfo(info);
    setConfirmedSubjects(subs);
    setAuditSummary(audit);
    setOriginalPreviewUrl(previewUrl);
    setStage('result');
  };

  const handleReset = () => {
    setStage('upload');
    setExtractionResult(null);
    setConfirmedInfo(null);
    setConfirmedSubjects([]);
    setAuditSummary(null);
    setOriginalPreviewUrl(undefined);
  };

  const handlePrint = (includeOriginal: boolean) => {
    setIncludeOriginalInPdf(includeOriginal);
    const prevTitle = document.title;
    const name = confirmedInfo?.name?.trim() || profile.name.trim() || 'Student';
    const safeName = name.replace(/[^a-zA-Z0-9_-]/g, '_');
    const dateStr = new Date().toISOString().split('T')[0];
    document.title = `${safeName}_AMS_SGPA_${dateStr}.pdf`;
    setTimeout(() => {
      window.print();
      document.title = prevTitle;
    }, 50);
  };

  const handleOpenRecent = (item: RecentAmsImport) => {
    if (item.extractionResult && item.auditSummary) {
      setConfirmedInfo(item.extractionResult.studentInfo);
      setConfirmedSubjects(item.extractionResult.subjects);
      setAuditSummary(item.auditSummary);
      setOriginalPreviewUrl(item.extractionResult.previewUrls[0]);
      setMode('sgpa');
      setStage('result');
      showToast(`Loaded ${item.semesterLabel} calculation for ${item.studentName}.`, 'success');
    }
  };

  const handleDeleteRecent = (id: string) => {
    deleteRecentAmsImport(id);
    setRecentImports(getRecentAmsImports());
    showToast('Import record removed.', 'info');
  };

  const handleClearAllRecent = () => {
    clearRecentAmsImports();
    setRecentImports([]);
    showToast('All recent imports cleared.', 'info');
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-6">
      {/* Page Header (Hidden during Print) */}
      <div className="flex flex-col gap-3 no-print">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-md bg-[var(--accent)]/10 text-[var(--accent)]">
                <FileUp className="w-4 h-4" />
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--accent)]">
                AMS RESULT INTELLIGENCE SYSTEM
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] tracking-tight mt-1">
              AMS Result Import
            </h1>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1 max-w-2xl">
              Import your university result and automatically prepare SGPA / CGPA data with complete table verification, multi-format scanning, and error prevention.
            </p>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex items-center p-1 rounded-xl bg-[var(--border-secondary)] border border-[var(--border-primary)] self-start sm:self-auto shrink-0">
            <button
              type="button"
              onClick={() => {
                setMode('sgpa');
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                mode === 'sgpa'
                  ? 'bg-[var(--surface)] text-[var(--text-primary)] shadow-sm border border-[var(--border-primary)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Calculator className="w-3.5 h-3.5" />
              <span>Calculate SGPA</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('cgpa');
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                mode === 'cgpa'
                  ? 'bg-[var(--surface)] text-[var(--text-primary)] shadow-sm border border-[var(--border-primary)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Calculate CGPA</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('history');
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                mode === 'history'
                  ? 'bg-[var(--surface)] text-[var(--text-primary)] shadow-sm border border-[var(--border-primary)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Recent Imports</span>
              {recentImports.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-[var(--accent)] text-white">
                  {recentImports.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Areas based on Mode */}
      {mode === 'sgpa' && (
        <>
          {stage === 'upload' && (
            <div className="no-print">
              <AmsUploader onExtractionComplete={handleExtractionComplete} />
            </div>
          )}

          {stage === 'review' && extractionResult && (
            <div className="no-print">
              <AmsSideBySideReview
                initialResult={extractionResult}
                onConfirmCalculation={handleReviewConfirm}
                onCancel={handleReset}
              />
            </div>
          )}

          {stage === 'result' && confirmedInfo && auditSummary && (
            <>
              <AmsResultReport
                studentInfo={confirmedInfo}
                subjects={confirmedSubjects}
                auditSummary={auditSummary}
                originalPreviewUrl={originalPreviewUrl}
                onEditData={() => setStage('review')}
                onReset={handleReset}
                onPrint={handlePrint}
              />
              <AmsPrintReport
                studentInfo={confirmedInfo}
                subjects={confirmedSubjects}
                auditSummary={auditSummary}
                originalPreviewUrl={originalPreviewUrl}
                includeOriginalInPdf={includeOriginalInPdf}
              />
            </>
          )}
        </>
      )}

      {mode === 'cgpa' && (
        <div className="no-print">
          <AmsCgpaManager />
        </div>
      )}

      {mode === 'history' && (
        <div className="apple-card p-6 border border-[var(--border-primary)] flex flex-col gap-4 no-print">
          <div className="flex items-center justify-between border-b border-[var(--border-secondary)] pb-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--accent)]">
                RECENT AMS IMPORTS
              </span>
              <span className="text-xs text-[var(--text-secondary)]">
                ({recentImports.length} {recentImports.length === 1 ? 'record' : 'records'} saved locally)
              </span>
            </div>
            {recentImports.length > 0 && (
              <button
                type="button"
                onClick={handleClearAllRecent}
                className="apple-btn-secondary text-xs h-8 px-2.5 text-rose-600 hover:text-rose-700"
              >
                Clear All
              </button>
            )}
          </div>

          {recentImports.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[var(--bg-tertiary)] text-[var(--text-tertiary)] flex items-center justify-center">
                <History className="w-6 h-6" />
              </div>
              <div className="flex flex-col gap-1">
                <h4 className="text-sm font-bold text-[var(--text-primary)]">
                  No Saved Imports Yet
                </h4>
                <p className="text-xs text-[var(--text-secondary)] max-w-sm">
                  After importing an AMS result or computing your SGPA/CGPA, click "Save Calculation" to keep your verified results here.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMode('sgpa')}
                className="apple-btn-primary text-xs h-9 px-4 font-semibold mt-2"
              >
                Import AMS Result Now
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[var(--border-secondary)] text-[10px] uppercase tracking-wider text-[var(--text-tertiary)] font-bold">
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Student</th>
                    <th className="py-2.5 px-3">Register No</th>
                    <th className="py-2.5 px-3">Semester</th>
                    <th className="py-2.5 px-3 text-right">Score</th>
                    <th className="py-2.5 px-3 text-right">Credits</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-secondary)]">
                  {recentImports.map((item) => (
                    <tr key={item.id} className="hover:bg-[var(--surface-secondary)]/50 transition-colors">
                      <td className="py-3 px-3 text-[var(--text-secondary)] font-mono">
                        {new Date(item.timestamp).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[var(--accent)]/10 text-[var(--accent)]">
                          {item.calculationType}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-semibold text-[var(--text-primary)]">
                        {item.studentName}
                      </td>
                      <td className="py-3 px-3 text-[var(--text-secondary)] font-mono">
                        {item.registerNumber}
                      </td>
                      <td className="py-3 px-3 text-[var(--text-secondary)]">
                        {item.semesterLabel}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-[var(--text-primary)] font-bold text-sm">
                        {formatFixed(item.score, 2)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-[var(--text-secondary)]">
                        {item.totalCredits}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {item.extractionResult && (
                            <button
                              type="button"
                              onClick={() => handleOpenRecent(item)}
                              className="apple-btn-secondary text-xs h-7 px-2"
                              title="Open report"
                            >
                              Open
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDeleteRecent(item.id)}
                            className="p-1 rounded hover:bg-rose-500/10 text-[var(--text-tertiary)] hover:text-rose-600 transition-colors"
                            title="Delete record"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
export default AmsImportPage;
