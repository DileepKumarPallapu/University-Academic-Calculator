import React, { useState, useRef } from 'react';
import { Upload, FileText, Image as ImageIcon, FileSpreadsheet, AlertCircle, RefreshCw, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';
import { validateAmsFile, processAmsDocument } from '../../utils/amsExtractor';
import type { AmsExtractionResult, ScanStepItem } from '../../types/ams';
import type { RegulationId } from '../../config/university';

interface AmsUploaderProps {
  onExtractionComplete: (result: AmsExtractionResult) => void;
  selectedRegulation?: RegulationId | null;
}

export const AmsUploader: React.FC<AmsUploaderProps> = ({
  onExtractionComplete,
  selectedRegulation,
}) => {
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [rotation, setRotation] = useState<number>(0);
  const [zoom, setZoom] = useState<number>(1);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progressStage, setProgressStage] = useState<string>('');
  const [progressPercent, setProgressPercent] = useState<number>(0);

  const [scanSteps, setScanSteps] = useState<ScanStepItem[]>([
    { step: 1, title: 'Result page detected', status: 'pending' },
    { step: 2, title: 'Student information detected', status: 'pending' },
    { step: 3, title: 'Result table detected', status: 'pending' },
    { step: 4, title: 'Course rows detected', status: 'pending' },
    { step: 5, title: 'Grades detected', status: 'pending' },
    { step: 6, title: 'Checking missing information...', status: 'pending' },
  ]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    setErrorMsg(null);
    const validation = validateAmsFile(file);
    if (!validation.valid) {
      setErrorMsg(validation.error || 'Invalid file format.');
      return;
    }

    setSelectedFile(file);
    if (validation.fileType === 'image') {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  };

  const startExtraction = async () => {
    if (!selectedFile) return;
    setIsProcessing(true);
    setErrorMsg(null);
    setProgressPercent(10);
    setProgressStage('Initializing document reader...');

    setScanSteps([
      { step: 1, title: 'Result page detected', status: 'in_progress', detail: 'Reading document...' },
      { step: 2, title: 'Student information detected', status: 'pending' },
      { step: 3, title: 'Result table detected', status: 'pending' },
      { step: 4, title: 'Course rows detected', status: 'pending' },
      { step: 5, title: 'Grades detected', status: 'pending' },
      { step: 6, title: 'Checking missing information...', status: 'pending' },
    ]);

    try {
      const result = await processAmsDocument(
        selectedFile,
        selectedRegulation,
        (stage, pct) => {
          setProgressStage(stage);
          setProgressPercent(pct);
        },
        (updatedSteps) => {
          setScanSteps(updatedSteps);
        }
      );
      onExtractionComplete(result);
    } catch (err: any) {
      setErrorMsg(err?.message || 'We could not reliably read all result rows. Please try uploading a clearer image or PDF.');
      setScanSteps((prev) =>
        prev.map((s) => (s.status === 'in_progress' ? { ...s, status: 'failed' } : s))
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReviewManually = () => {
    if (!selectedFile) return;
    // Build an empty manual verification container for the user
    const manualResult: AmsExtractionResult = {
      studentInfo: {
        name: '',
        nameConfidence: 'none',
        registerNumber: '',
        regConfidence: 'none',
        department: '',
        program: '',
        academicYear: '',
        regulation: selectedRegulation || null,
        regulationConfidence: 'none',
        semester: null,
        semesterConfidence: 'none',
        college: '',
      },
      subjects: [],
      duplicatesDetected: 0,
      duplicatesExcluded: 0,
      fileType: selectedFile.type.includes('pdf') ? 'pdf' : 'image',
      fileName: selectedFile.name,
      fileSize: selectedFile.size,
      pageCount: 1,
      previewUrls: previewUrl ? [previewUrl] : [],
      rawText: '',
      importedAt: Date.now(),
      pageType: 'AMS_RESULT_TABLE',
      tableDetected: true,
      detectedColumns: ['Coursecode', 'Coursename', 'Grade', 'Credits'],
      detectedRowsCount: 0,
      extractedRowsCount: 0,
      missingRowNumbers: [],
      rowAccountingVerified: true,
      scanSteps: scanSteps,
    };
    onExtractionComplete(manualResult);
  };

  const handleReset = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(null);
    setPreviewUrl(null);
    setRotation(0);
    setZoom(1);
    setErrorMsg(null);
    setIsProcessing(false);
    setScanSteps([
      { step: 1, title: 'Result page detected', status: 'pending' },
      { step: 2, title: 'Student information detected', status: 'pending' },
      { step: 3, title: 'Result table detected', status: 'pending' },
      { step: 4, title: 'Course rows detected', status: 'pending' },
      { step: 5, title: 'Grades detected', status: 'pending' },
      { step: 6, title: 'Checking missing information...', status: 'pending' },
    ]);
  };

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Upload Zone */}
      {!selectedFile ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`apple-card p-8 sm:p-12 border-2 border-dashed flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
            dragActive
              ? 'border-[var(--text-primary)] bg-[var(--bg-tertiary)] scale-[0.99]'
              : 'border-[var(--border-secondary)] hover:border-[var(--border-primary)] bg-[var(--surface)]'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".png,.jpg,.jpeg,.webp,.pdf,.csv,.xlsx,.xls,image/png,image/jpeg,image/webp,application/pdf,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFile(e.target.files[0]);
              }
            }}
          />

          <div className="w-14 h-14 rounded-2xl bg-[var(--bg-tertiary)] border border-[var(--border-secondary)] flex items-center justify-center text-[var(--text-primary)] mb-4 shadow-xs">
            <Upload className="w-7 h-7 text-[var(--text-primary)]" />
          </div>

          <span className="text-xs font-bold tracking-wider uppercase text-[var(--accent)] mb-1">
            AMS RESULT IMPORT
          </span>
          <h3 className="text-lg sm:text-xl font-bold text-[var(--text-primary)]">
            Upload AMS Examination Result
          </h3>
          <p className="text-sm font-medium text-[var(--text-secondary)] mt-1 max-w-md">
            Import your university result and automatically prepare SGPA / CGPA data.
          </p>
          <p className="text-xs text-[var(--text-tertiary)] mt-1.5 max-w-md leading-relaxed">
            Upload an AMS screenshot, PDF, or supported result file. We'll extract available academic information and ask only for information that is missing.
          </p>

          {/* Supported Inputs Priority & Badges (Requirement 2) */}
          <div className="flex flex-col items-center gap-2 mt-5">
            <span className="text-[10px] font-semibold tracking-wider uppercase text-[var(--text-tertiary)]">
              Input Priority: 1. PDF • 2. Image • 3. Excel / CSV
            </span>
            <div className="flex flex-wrap items-center justify-center gap-2 text-[11px] font-semibold text-[var(--text-secondary)]">
              <span className="px-2.5 py-1 rounded-md bg-[var(--bg-secondary)] border border-[var(--border-secondary)]">
                PDF (Text & Scanned)
              </span>
              <span className="px-2.5 py-1 rounded-md bg-[var(--bg-secondary)] border border-[var(--border-secondary)]">
                PNG / JPG / WEBP
              </span>
              <span className="px-2.5 py-1 rounded-md bg-[var(--bg-secondary)] border border-[var(--border-secondary)]">
                Excel (XLSX, XLS)
              </span>
              <span className="px-2.5 py-1 rounded-md bg-[var(--bg-secondary)] border border-[var(--border-secondary)]">
                CSV
              </span>
              <span className="px-2.5 py-1 rounded-md bg-[var(--bg-secondary)] border border-[var(--border-secondary)]">
                Up to 30 MB
              </span>
            </div>
          </div>

          <div className="mt-6">
            <button
              type="button"
              className="apple-btn-primary text-xs h-10 px-5"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
            >
              Choose File
            </button>
          </div>
        </div>
      ) : (
        <div className="apple-card p-6 flex flex-col gap-5 border border-[var(--border-primary)]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border-secondary)] pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-secondary)] flex items-center justify-center text-[var(--text-primary)] shrink-0">
                {selectedFile.name.endsWith('.xlsx') || selectedFile.name.endsWith('.xls') || selectedFile.name.endsWith('.csv') ? (
                  <FileSpreadsheet className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                ) : selectedFile.type.includes('pdf') || selectedFile.name.endsWith('.pdf') ? (
                  <FileText className="w-5 h-5 text-[var(--text-primary)]" />
                ) : (
                  <ImageIcon className="w-5 h-5 text-[var(--text-primary)]" />
                )}
              </div>
              <div className="min-w-0">
                <span className="font-semibold text-sm text-[var(--text-primary)] block truncate">
                  {selectedFile.name}
                </span>
                <span className="text-xs text-[var(--text-secondary)]">
                  {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • {selectedFile.name.endsWith('.xlsx') || selectedFile.name.endsWith('.csv') ? 'Structured spreadsheet (No OCR required)' : 'Ready for extraction'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                type="button"
                onClick={handleReset}
                disabled={isProcessing}
                className="apple-btn-secondary text-xs h-9 px-3 disabled:opacity-50"
              >
                Change File
              </button>
            </div>
          </div>

          {/* Image preview with rotation/zoom controls */}
          {previewUrl && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
                <span>Preview</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setRotation((prev) => (prev + 90) % 360)}
                    disabled={isProcessing}
                    className="p-1.5 rounded-lg border border-[var(--border-secondary)] hover:bg-[var(--bg-tertiary)] text-[var(--text-primary)]"
                    title="Rotate 90 degrees"
                  >
                    <RotateCw className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setZoom((prev) => Math.max(0.5, prev - 0.2))}
                    disabled={isProcessing}
                    className="p-1.5 rounded-lg border border-[var(--border-secondary)] hover:bg-[var(--bg-tertiary)] text-[var(--text-primary)]"
                    title="Zoom out"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setZoom((prev) => Math.min(2.5, prev + 0.2))}
                    disabled={isProcessing}
                    className="p-1.5 rounded-lg border border-[var(--border-secondary)] hover:bg-[var(--bg-tertiary)] text-[var(--text-primary)]"
                    title="Zoom in"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="relative w-full h-64 sm:h-80 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-secondary)] overflow-hidden flex items-center justify-center p-4">
                <img
                  src={previewUrl}
                  alt="AMS Result Preview"
                  style={{
                    transform: `rotate(${rotation}deg) scale(${zoom})`,
                    transition: 'transform 0.2s ease',
                  }}
                  className="max-h-full max-w-full object-contain rounded shadow-xs"
                />
              </div>
            </div>
          )}

          {/* SCAN RESULT EXPERIENCE */}
          {isProcessing ? (
            <div className="flex flex-col gap-4 py-3 bg-[var(--surface-secondary)] p-4 rounded-xl border border-[var(--border-secondary)]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-[var(--text-primary)]" />
                  <h4 className="text-sm font-semibold text-[var(--text-primary)]">Scanning AMS Result...</h4>
                </div>
                <span className="text-xs text-[var(--text-secondary)] font-mono">
                  {progressStage ? `${progressStage} • ${progressPercent}%` : `${progressPercent}%`}
                </span>
              </div>

              <div className="w-full h-1.5 rounded-full bg-[var(--border-secondary)] overflow-hidden">
                <div
                  className="h-full bg-[var(--button-primary)] transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              {/* The 6 Real Scan Steps */}
              <div className="flex flex-col gap-2 pt-1">
                {scanSteps.map((st) => (
                  <div key={st.step} className="flex items-center justify-between text-xs py-1 border-b border-[var(--border-secondary)]/40 last:border-0">
                    <div className="flex items-center gap-2.5">
                      {st.status === 'completed' ? (
                        <span className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-[11px] shrink-0">
                          ✓
                        </span>
                      ) : st.status === 'in_progress' ? (
                        <span className="w-5 h-5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                          <RefreshCw className="w-3 h-3 animate-spin" />
                        </span>
                      ) : st.status === 'failed' ? (
                        <span className="w-5 h-5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold text-[11px] shrink-0">
                          ✕
                        </span>
                      ) : (
                        <span className="w-5 h-5 rounded-full bg-[var(--bg-tertiary)] border border-[var(--border-secondary)] text-[var(--text-tertiary)] flex items-center justify-center text-[10px] shrink-0 font-mono">
                          {st.step}
                        </span>
                      )}
                      <span className={`font-medium ${
                        st.status === 'completed'
                          ? 'text-[var(--text-primary)]'
                          : st.status === 'in_progress'
                          ? 'text-blue-600 dark:text-blue-400 font-semibold'
                          : 'text-[var(--text-tertiary)]'
                      }`}>
                        Step {st.step} &bull; {st.title}
                      </span>
                    </div>
                    {st.detail && (
                      <span className="text-[11px] text-[var(--text-tertiary)] font-normal hidden sm:inline truncate max-w-xs">
                        {st.detail}
                      </span>
                    )}
                  </div>
                ))}
              </div>

              <span className="text-[11px] text-[var(--text-secondary)] mt-1">
                Processing locally in your browser. No files are uploaded to any external server.
              </span>
            </div>
          ) : (
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={startExtraction}
                className="apple-btn-primary w-full sm:w-auto text-sm h-11 px-6 font-semibold"
              >
                Scan Result
              </button>
            </div>
          )}
        </div>
      )}

      {/* Error Notice / OCR Failure Recovery */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 flex flex-col gap-3 text-xs text-rose-700 dark:text-rose-300">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
            <div className="flex flex-col gap-1">
              <span className="font-semibold text-sm">We could not reliably read all result rows.</span>
              <span>{errorMsg}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end pt-1">
            <button
              type="button"
              onClick={startExtraction}
              className="apple-btn-secondary text-xs h-8 px-3"
            >
              Try Again
            </button>
            <button
              type="button"
              onClick={handleReviewManually}
              className="apple-btn-primary text-xs h-8 px-3"
            >
              Review Manually
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
