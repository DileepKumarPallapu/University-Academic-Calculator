import React, { useState, useRef } from 'react';
import { Upload, FileText, Image as ImageIcon, AlertCircle, RefreshCw, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';
import { validateAmsFile, processAmsDocument } from '../../utils/amsExtractor';
import type { AmsExtractionResult } from '../../types/ams';
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

    try {
      const result = await processAmsDocument(
        selectedFile,
        selectedRegulation,
        (stage, pct) => {
          setProgressStage(stage);
          setProgressPercent(pct);
        }
      );
      onExtractionComplete(result);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to process AMS result. Please try uploading a clearer image or PDF.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(null);
    setPreviewUrl(null);
    setRotation(0);
    setZoom(1);
    setErrorMsg(null);
    setIsProcessing(false);
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
            accept=".png,.jpg,.jpeg,.webp,.pdf,image/png,image/jpeg,application/pdf"
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

          <h3 className="text-lg font-semibold text-[var(--text-primary)]">
            Upload AMS Examination Result
          </h3>
          <p className="text-sm text-[var(--text-secondary)] mt-1.5 max-w-md">
            Drag and drop your result screenshot or PDF, or click to browse files.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-2 mt-5 text-[11px] font-semibold text-[var(--text-tertiary)]">
            <span className="px-2.5 py-1 rounded-md bg-[var(--bg-secondary)] border border-[var(--border-secondary)]">
              PNG
            </span>
            <span className="px-2.5 py-1 rounded-md bg-[var(--bg-secondary)] border border-[var(--border-secondary)]">
              JPG / JPEG
            </span>
            <span className="px-2.5 py-1 rounded-md bg-[var(--bg-secondary)] border border-[var(--border-secondary)]">
              PDF (Text & Scanned)
            </span>
            <span className="px-2.5 py-1 rounded-md bg-[var(--bg-secondary)] border border-[var(--border-secondary)]">
              Up to 30 MB
            </span>
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
                {selectedFile.type.includes('pdf') || selectedFile.name.endsWith('.pdf') ? (
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
                  {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Ready for extraction
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

          {/* Processing Progress Bar */}
          {isProcessing ? (
            <div className="flex flex-col gap-2.5 py-4">
              <div className="flex items-center justify-between text-xs font-semibold text-[var(--text-primary)]">
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-[var(--text-primary)]" />
                  <span>{progressStage}</span>
                </div>
                <span>{progressPercent}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-[var(--border-secondary)] overflow-hidden">
                <div
                  className="h-full bg-[var(--button-primary)] transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <span className="text-[11px] text-[var(--text-secondary)]">
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
                Extract Academic Result
              </button>
            </div>
          )}
        </div>
      )}

      {/* Error Notice */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 flex items-start gap-3 text-xs text-rose-700 dark:text-rose-300">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
          <div className="flex flex-col gap-1">
            <span className="font-semibold">Unable to process document</span>
            <span>{errorMsg}</span>
          </div>
        </div>
      )}
    </div>
  );
};
