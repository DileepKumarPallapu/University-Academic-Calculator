import React, { useState } from 'react';
import {
  AlertTriangle,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Check,
  CheckCircle2,
  Sparkles,
  X,
} from 'lucide-react';
import type {
  AmsExtractionResult,
  AmsStudentInfo,
  AmsSubject,
  AmsAuditSummary,
} from '../../types/ams';
import { REGULATIONS, type RegulationId } from '../../config/university';
import { computeAmsAuditSummary } from '../../utils/amsExtractor';
import { useStudentProfile } from '../../hooks/useStudentProfile';

interface AmsSideBySideReviewProps {
  initialResult: AmsExtractionResult;
  onConfirmCalculation: (
    confirmedInfo: AmsStudentInfo,
    confirmedSubjects: AmsSubject[],
    auditSummary: AmsAuditSummary,
    originalPreviewUrl?: string
  ) => void;
  onCancel: () => void;
}

export const AmsSideBySideReview: React.FC<AmsSideBySideReviewProps> = ({
  initialResult,
  onConfirmCalculation,
  onCancel,
}) => {
  const { profile } = useStudentProfile();

  // Active view tab on mobile: 'preview' or 'review'
  const [mobileTab, setMobileTab] = useState<'preview' | 'review'>('review');

  // Preview controls
  const [activePageIdx, setActivePageIdx] = useState<number>(0);
  const [previewZoom, setPreviewZoom] = useState<number>(1);
  const [previewRotation, setPreviewRotation] = useState<number>(0);

  // Editable Student Info State
  const [studentInfo, setStudentInfo] = useState<AmsStudentInfo>({ ...initialResult.studentInfo });

  // Subjects state with audit tracking
  const [subjects, setSubjects] = useState<AmsSubject[]>(
    initialResult.subjects.map((s) => ({
      ...s,
      originalValues: {
        subjectCode: s.subjectCode,
        subjectName: s.subjectName,
        credits: s.credits,
        grade: s.grade,
        gradePoint: s.gradePoint,
      },
    }))
  );

  const activeRegulation = studentInfo.regulation;
  const regConfig = activeRegulation ? REGULATIONS[activeRegulation] : null;

  // Grade point recalculation helper when regulation changes
  const handleRegulationSelect = (regId: RegulationId) => {
    setStudentInfo((prev) => ({
      ...prev,
      regulation: regId,
      regulationConfidence: 'high',
    }));

    const config = REGULATIONS[regId];
    setSubjects((prev) =>
      prev.map((s) => {
        if (!s.grade) return s;
        const matched = config.grades.find((g) => g.grade.toUpperCase() === s.grade.toUpperCase());
        return {
          ...s,
          gradePoint: matched ? matched.points : s.gradePoint,
        };
      })
    );
  };

  // Student Profile comparison check
  const profileDiffers =
    Boolean(profile?.name && studentInfo.name && profile.name.trim().toLowerCase() !== studentInfo.name.trim().toLowerCase()) ||
    Boolean(profile?.rollNumber && studentInfo.registerNumber && profile.rollNumber.trim().toUpperCase() !== studentInfo.registerNumber.trim().toUpperCase());

  const applySavedProfile = () => {
    if (!profile) return;
    setStudentInfo((prev) => ({
      ...prev,
      name: profile.name || prev.name,
      registerNumber: profile.rollNumber || prev.registerNumber,
      department: profile.department || prev.department,
      semester: profile.semester ? parseInt(profile.semester) || prev.semester : prev.semester,
      regulation: (profile.regulation as RegulationId) || prev.regulation,
    }));
  };

  // Subject field changes
  const handleSubjectFieldChange = (
    id: string,
    field: keyof AmsSubject,
    value: any
  ) => {
    setSubjects((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        const updated = { ...s, [field]: value, isManuallyEdited: true };

        // If grade changed, update gradePoint according to active regulation
        if (field === 'grade' && regConfig) {
          const matched = regConfig.grades.find((g) => g.grade.toUpperCase() === String(value).toUpperCase());
          updated.gradePoint = matched ? matched.points : null;
        }

        return updated;
      })
    );
  };

  // Toggle duplicate inclusion
  const handleToggleDuplicateInclusion = (id: string, exclude: boolean) => {
    setSubjects((prev) =>
      prev.map((s) => (s.id === id ? { ...s, isExcluded: exclude, isManuallyEdited: true } : s))
    );
  };

  // Add new manual row
  const handleAddSubjectRow = () => {
    const defaultGrade = regConfig ? regConfig.grades[0].grade : 'A';
    const defaultGP = regConfig ? regConfig.grades[0].points : 9;

    const newSub: AmsSubject = {
      id: `ams-manual-${Date.now()}`,
      subjectCode: '',
      subjectName: `Subject ${subjects.length + 1}`,
      credits: 3,
      grade: defaultGrade,
      gradePoint: defaultGP,
      status: 'Pass',
      source: 'USER',
      creditsSource: 'USER',
      gradePointSource: 'REGULATION',
      isDuplicate: false,
      isExcluded: false,
      isManuallyEdited: true,
      confidence: {
        code: 'high',
        name: 'high',
        credits: 'high',
        grade: 'high',
        gradePoint: 'high',
      },
    };
    setSubjects((prev) => [...prev, newSub]);
  };

  // Delete subject row
  const handleDeleteRow = (id: string) => {
    setSubjects((prev) => prev.filter((s) => s.id !== id));
  };

  // Reset to original extracted values
  const handleResetToImported = () => {
    setStudentInfo({ ...initialResult.studentInfo });
    setSubjects(
      initialResult.subjects.map((s) => ({
        ...s,
        originalValues: {
          subjectCode: s.subjectCode,
          subjectName: s.subjectName,
          credits: s.credits,
          grade: s.grade,
          gradePoint: s.gradePoint,
        },
      }))
    );
  };

  // Bulk credit entry state
  const [showBulkCreditModal, setShowBulkCreditModal] = useState<boolean>(false);
  const [bulkCreditText, setBulkCreditText] = useState<string>('');
  const [profileDiffDismissed, setProfileDiffDismissed] = useState<boolean>(false);

  const includedSubjects = subjects.filter((s) => !s.isExcluded);
  const parsedBulkTokens = bulkCreditText
    .trim()
    .split(/[\s,;\t\n]+/)
    .filter(Boolean);
  const validBulkCredits = parsedBulkTokens.map(Number).filter((n) => !isNaN(n) && n >= 0);
  const bulkCreditCountMatches =
    parsedBulkTokens.length > 0 &&
    validBulkCredits.length === includedSubjects.length &&
    parsedBulkTokens.length === validBulkCredits.length;

  const handleApplyBulkCredits = () => {
    if (!bulkCreditCountMatches) return;
    let idx = 0;
    setSubjects((prev) =>
      prev.map((s) => {
        if (s.isExcluded) return s;
        const newCredit = validBulkCredits[idx++];
        return {
          ...s,
          credits: newCredit,
          creditsSource: 'USER',
          isManuallyEdited: true,
        };
      })
    );
    setShowBulkCreditModal(false);
    setBulkCreditText('');
  };

  // Audit calculations
  const audit = computeAmsAuditSummary(subjects, studentInfo);

  // Validation before calculation:
  // 1. Regulation must be selected
  // 2. All included subjects must have numeric credits >= 0
  // 3. All included subjects must have valid grade and grade point
  const hasMissingCredits = subjects.some(
    (s) => !s.isExcluded && (s.credits === '' || s.credits === null || Number(s.credits) < 0)
  );
  const hasMissingGrades = subjects.some((s) => !s.isExcluded && (!s.grade || s.gradePoint === null));
  const canCalculate = Boolean(studentInfo.regulation) && !hasMissingCredits && !hasMissingGrades;

  const handleConfirm = () => {
    if (!canCalculate) return;
    onConfirmCalculation(
      studentInfo,
      subjects,
      audit,
      initialResult.previewUrls[activePageIdx] || initialResult.previewUrls[0]
    );
  };

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Top Banner & Audit Overview */}
      <div className="apple-card p-6 border border-[var(--border-primary)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--accent)]">
              REVIEW IMPORTED RESULT
            </span>
            <span className="text-[var(--text-tertiary)]">•</span>
            <span className="text-xs text-[var(--text-secondary)]">{initialResult.fileName}</span>
          </div>
          <h2 className="text-xl font-bold text-[var(--text-primary)] mt-1">
            Verify Extracted Academic Information
          </h2>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Review the extracted student details, subject credits, and grades. Please confirm all fields before calculating SGPA.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleResetToImported}
            className="apple-btn-secondary text-xs h-9 px-3"
            title="Reset any manual corrections back to original extracted text"
          >
            Reset to Imported
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="apple-btn-secondary text-xs h-9 px-3 text-[var(--text-secondary)] hover:text-rose-600"
          >
            Cancel
          </button>
        </div>
      </div>

      {/* Profile Mismatch Notice */}
      {profileDiffers && profile && !profileDiffDismissed && (
        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-900 dark:text-amber-200">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              Imported student details differ from your locally saved profile (
              <strong>{profile.name}</strong>{profile.rollNumber ? `, ${profile.rollNumber}` : ''}).
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={applySavedProfile}
              className="px-3 py-1.5 rounded-lg bg-amber-200/60 dark:bg-amber-900/60 hover:bg-amber-200 font-semibold transition-colors"
            >
              Keep Saved Profile
            </button>
            <button
              type="button"
              onClick={() => setProfileDiffDismissed(true)}
              className="px-3 py-1.5 rounded-lg border border-amber-300 dark:border-amber-800 font-semibold"
            >
              Use Imported
            </button>
          </div>
        </div>
      )}

      {/* Mobile Switcher (Preview vs Review) */}
      <div className="lg:hidden flex rounded-xl bg-[var(--border-secondary)] p-1 border border-[var(--border-primary)]">
        <button
          type="button"
          onClick={() => setMobileTab('review')}
          className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
            mobileTab === 'review'
              ? 'bg-[var(--surface)] text-[var(--text-primary)] shadow-sm'
              : 'text-[var(--text-secondary)]'
          }`}
        >
          Extracted Data Table ({subjects.length})
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('preview')}
          className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
            mobileTab === 'preview'
              ? 'bg-[var(--surface)] text-[var(--text-primary)] shadow-sm'
              : 'text-[var(--text-secondary)]'
          }`}
        >
          Original AMS Document
        </button>
      </div>

      {/* Side-by-Side Grid Layout: 5 cols PREVIEW (Left), 7 cols EXTRACTED DATA (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Original AMS Document Preview */}
        <div
          className={`lg:col-span-5 flex-col gap-4 ${
            mobileTab === 'preview' ? 'flex' : 'hidden lg:flex'
          }`}
        >
          <div className="apple-card p-5 border border-[var(--border-primary)] flex flex-col gap-3">
            <div className="flex items-center justify-between text-xs text-[var(--text-secondary)] border-b border-[var(--border-secondary)] pb-3">
              <span className="font-bold uppercase tracking-wider text-[var(--text-primary)]">
                Original AMS Document
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setPreviewRotation((prev) => (prev + 90) % 360)}
                  className="p-1 rounded-md border border-[var(--border-secondary)] hover:bg-[var(--bg-tertiary)]"
                  title="Rotate"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewZoom((prev) => Math.max(0.6, prev - 0.2))}
                  className="p-1 rounded-md border border-[var(--border-secondary)] hover:bg-[var(--bg-tertiary)]"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewZoom((prev) => Math.min(2.5, prev + 0.2))}
                  className="p-1 rounded-md border border-[var(--border-secondary)] hover:bg-[var(--bg-tertiary)]"
                  title="Zoom In"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Canvas/Image Container */}
            <div className="relative w-full h-[450px] sm:h-[550px] rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-secondary)] overflow-auto flex items-center justify-center p-2">
              {initialResult.previewUrls.length > 0 ? (
                <img
                  src={initialResult.previewUrls[activePageIdx]}
                  alt="Original Document Page"
                  style={{
                    transform: `rotate(${previewRotation}deg) scale(${previewZoom})`,
                    transformOrigin: 'top center',
                    transition: 'transform 0.2s ease',
                  }}
                  className="max-w-none shadow-sm rounded"
                />
              ) : (
                <div className="text-xs text-[var(--text-tertiary)]">No visual preview available</div>
              )}
            </div>

            {/* Multi-page switcher if PDF has multiple pages */}
            {initialResult.previewUrls.length > 1 && (
              <div className="flex items-center justify-between text-xs pt-1">
                <button
                  type="button"
                  disabled={activePageIdx === 0}
                  onClick={() => setActivePageIdx((p) => Math.max(0, p - 1))}
                  className="apple-btn-secondary h-8 px-2.5 text-xs flex items-center gap-1 disabled:opacity-40"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Previous Page</span>
                </button>
                <span className="font-semibold text-[var(--text-secondary)]">
                  Page {activePageIdx + 1} of {initialResult.previewUrls.length}
                </span>
                <button
                  type="button"
                  disabled={activePageIdx === initialResult.previewUrls.length - 1}
                  onClick={() => setActivePageIdx((p) => Math.min(initialResult.previewUrls.length - 1, p + 1))}
                  className="apple-btn-secondary h-8 px-2.5 text-xs flex items-center gap-1 disabled:opacity-40"
                >
                  <span>Next Page</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right: Extracted Data Review Section */}
        <div
          className={`lg:col-span-7 flex-col gap-6 ${
            mobileTab === 'review' ? 'flex' : 'hidden lg:flex'
          }`}
        >
          {/* Information Required for SGPA Checklist Card */}
          <div className="apple-main-container p-5 flex flex-col gap-3 border border-[var(--border-primary)]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--border-secondary)] pb-2.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--accent)]">
                  Information Required for SGPA
                </span>
                <span className="text-xs text-[var(--text-secondary)]">
                  {canCalculate ? '✓ All requirements met' : '⚠ Action required below'}
                </span>
              </div>
              <span className="text-[11px] text-[var(--text-tertiary)]">
                Source: AMS Examination Portal
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              {/* 1. Student Details */}
              <div className="p-3 rounded-xl bg-[var(--surface)] border border-[var(--border-secondary)] flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[var(--text-primary)]">1. Student Details</span>
                  <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                    <Check className="w-3 h-3" /> Auto-detected
                  </span>
                </div>
                <p className="text-[11px] text-[var(--text-secondary)] line-clamp-2">
                  {studentInfo.name || 'Student Name'} {studentInfo.registerNumber ? `(${studentInfo.registerNumber})` : ''}
                  {studentInfo.degree ? ` • ${studentInfo.degree}` : ''}
                  {studentInfo.branch ? ` • ${studentInfo.branch}` : ''}
                </p>
              </div>

              {/* 2. Course Credits */}
              <div className={`p-3 rounded-xl border flex flex-col gap-1.5 ${
                hasMissingCredits
                  ? 'bg-amber-500/5 border-amber-500/30'
                  : 'bg-[var(--surface)] border-[var(--border-secondary)]'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[var(--text-primary)]">2. Course Credits</span>
                  {hasMissingCredits ? (
                    <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-0.5">
                      <AlertTriangle className="w-3 h-3" /> Missing in AMS
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                      <Check className="w-3 h-3" /> All {includedSubjects.length} entered
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between gap-2 mt-auto">
                  <span className="text-[11px] text-[var(--text-secondary)]">
                    {hasMissingCredits
                      ? `${subjects.filter(s => !s.isExcluded && (s.credits === '' || s.credits === null)).length} need credits`
                      : `${audit.totalCredits} total credits`}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowBulkCreditModal(true)}
                    className="text-[10px] font-bold px-2 py-1 rounded-md bg-[var(--bg-tertiary)] hover:bg-[var(--border-secondary)] text-[var(--text-primary)] flex items-center gap-1 transition-colors"
                  >
                    <Sparkles className="w-3 h-3 text-[var(--accent)]" />
                    <span>Enter quickly</span>
                  </button>
                </div>
              </div>

              {/* 3. Academic Regulation */}
              <div className={`p-3 rounded-xl border flex flex-col gap-1.5 ${
                !studentInfo.regulation
                  ? 'bg-rose-500/5 border-rose-500/30'
                  : 'bg-[var(--surface)] border-[var(--border-secondary)]'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[var(--text-primary)]">3. Regulation</span>
                  {studentInfo.regulation ? (
                    <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                      <Check className="w-3 h-3" /> {studentInfo.regulation} (GP Derived)
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 flex items-center gap-0.5">
                      <AlertTriangle className="w-3 h-3" /> Select below
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-[var(--text-secondary)]">
                  {studentInfo.regulation
                    ? `Grade points derived automatically using ${studentInfo.regulation} rules.`
                    : 'Choose regulation below to derive Grade Points.'}
                </p>
              </div>
            </div>
          </div>

          {/* Student Information Card */}
          <div className="apple-main-container p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-[var(--border-secondary)] pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                Student & Examination Information
              </span>
              <span className="text-[11px] text-[var(--text-tertiary)]">
                Auto-extracted from AMS document
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-[var(--text-primary)] flex items-center justify-between">
                  <span>Student Name</span>
                  {studentInfo.nameVerified ? (
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5 font-medium">
                      <Check className="w-3 h-3" /> Verified across table
                    </span>
                  ) : studentInfo.nameConfidence === 'high' ? (
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                      <Check className="w-3 h-3" /> Confidently detected
                    </span>
                  ) : (
                    <span className="text-[10px] text-amber-600 dark:text-amber-400">
                      ⚠ Please verify
                    </span>
                  )}
                </label>
                <input
                  type="text"
                  value={studentInfo.name}
                  onChange={(e) =>
                    setStudentInfo((prev) => ({
                      ...prev,
                      name: e.target.value,
                      nameConfidence: 'high',
                    }))
                  }
                  placeholder="Enter student name"
                  className="apple-input text-sm h-10"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-[var(--text-primary)] flex items-center justify-between">
                  <span>Register Number</span>
                  {studentInfo.regConfidence === 'high' ? (
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                      <Check className="w-3 h-3" /> Confidently detected
                    </span>
                  ) : (
                    <span className="text-[10px] text-amber-600 dark:text-amber-400">
                      ⚠ Please verify
                    </span>
                  )}
                </label>
                <input
                  type="text"
                  value={studentInfo.registerNumber}
                  onChange={(e) =>
                    setStudentInfo((prev) => ({
                      ...prev,
                      registerNumber: e.target.value,
                      regConfidence: 'high',
                    }))
                  }
                  placeholder="e.g. 24UECS0805"
                  className="apple-input text-sm h-10 font-mono"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-[var(--text-primary)] flex items-center justify-between">
                  <span>Student ID (Stu Id)</span>
                  {studentInfo.studentId && studentInfo.studentId.startsWith('VTU') && (
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">
                      VTU Portal
                    </span>
                  )}
                </label>
                <input
                  type="text"
                  value={studentInfo.studentId || ''}
                  onChange={(e) =>
                    setStudentInfo((prev) => ({
                      ...prev,
                      studentId: e.target.value,
                    }))
                  }
                  placeholder="e.g. VTU29962"
                  className="apple-input text-sm h-10 font-mono"
                />
              </div>

              <div className="flex flex-col gap-1.5 sm:col-span-2 lg:col-span-1">
                <label className="text-xs font-semibold text-[var(--text-primary)]">
                  Degree & Branch
                </label>
                <input
                  type="text"
                  value={
                    studentInfo.degree && studentInfo.branch
                      ? `${studentInfo.degree} - ${studentInfo.branch}`
                      : studentInfo.branch || studentInfo.degree || ''
                  }
                  onChange={(e) => {
                    const val = e.target.value;
                    const parts = val.split('-');
                    if (parts.length > 1) {
                      setStudentInfo((prev) => ({
                        ...prev,
                        degree: parts[0].trim(),
                        branch: parts.slice(1).join('-').trim(),
                        department: parts.slice(1).join('-').trim(),
                      }));
                    } else {
                      setStudentInfo((prev) => ({
                        ...prev,
                        branch: val.trim(),
                        department: val.trim(),
                      }));
                    }
                  }}
                  placeholder="e.g. B.Tech - CSE (AIML)"
                  className="apple-input text-sm h-10"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-[var(--text-primary)]">
                  Batch & Result Period
                </label>
                <input
                  type="text"
                  value={
                    studentInfo.batch && studentInfo.resultMonthYear
                      ? `${studentInfo.batch} (${studentInfo.resultMonthYear})`
                      : studentInfo.batch || studentInfo.resultMonthYear || ''
                  }
                  onChange={(e) =>
                    setStudentInfo((prev) => ({
                      ...prev,
                      batch: e.target.value,
                    }))
                  }
                  placeholder="e.g. 2024-2025 (Nov.2024)"
                  className="apple-input text-sm h-10"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-[var(--text-primary)]">
                  Semester
                </label>
                <select
                  value={studentInfo.semester || 1}
                  onChange={(e) =>
                    setStudentInfo((prev) => ({
                      ...prev,
                      semester: parseInt(e.target.value) || 1,
                    }))
                  }
                  className="apple-input text-sm h-10 py-0 cursor-pointer"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                    <option key={s} value={s}>
                      Semester {s}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-[var(--text-primary)] flex items-center justify-between">
                  <span>Academic Regulation</span>
                  {!studentInfo.regulation && (
                    <span className="text-[10px] text-rose-600 font-semibold">
                      Required
                    </span>
                  )}
                </label>
                <div className="flex gap-1.5">
                  {(['VTR15', 'VTR18', 'VTR21', 'VTR25'] as RegulationId[]).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => handleRegulationSelect(r)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                        studentInfo.regulation === r
                          ? 'bg-[var(--button-primary)] text-[var(--button-primary-text)] border-transparent'
                          : 'bg-[var(--surface)] text-[var(--text-secondary)] border-[var(--border-secondary)] hover:bg-[var(--bg-tertiary)]'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Duplicate Warning Alert if any duplicate subjects detected */}
          {audit.duplicatesCount > 0 && (
            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 flex items-start gap-3 text-xs text-amber-900 dark:text-amber-200">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="flex flex-col gap-1">
                <span className="font-bold">Possible duplicate subjects detected</span>
                <span>
                  {audit.duplicatesCount} {audit.duplicatesCount === 1 ? 'subject appears' : 'subjects appear'} multiple times in the document. Duplicates have been automatically excluded from the calculation to prevent double-counting.
                </span>
              </div>
            </div>
          )}

          {/* Subjects Table Card */}
          <div className="apple-main-container p-6 flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--border-secondary)] pb-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                  Extracted Subjects ({subjects.length})
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[var(--bg-tertiary)] text-[var(--text-secondary)]">
                  {audit.creditBearingCount} Credit-bearing • {audit.nonCreditCount} Non-credit
                </span>
                {(audit.detectedRowsCount ?? 0) > 0 && (
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                      audit.rowAccountingVerified
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                        : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                    }`}
                  >
                    {audit.rowAccountingVerified ? (
                      <>
                        <Check className="w-3 h-3" /> All {audit.detectedRowsCount} rows accounted for
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-3 h-3" /> Missing row(s): {(audit.missingRowNumbers ?? []).join(', ')}
                      </>
                    )}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setShowBulkCreditModal(true)}
                  className="apple-btn-secondary text-xs h-8 px-2.5 gap-1.5 text-[var(--accent)] hover:border-[var(--accent)]"
                  title="Paste or enter credits for all subjects quickly"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Enter Credits Quickly</span>
                </button>
                <button
                  type="button"
                  onClick={handleAddSubjectRow}
                  className="apple-btn-secondary text-xs h-8 px-3 gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Subject</span>
                </button>
              </div>
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[var(--border-secondary)] text-[var(--text-secondary)] font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 px-2 text-center w-10">#</th>
                    <th className="py-2.5 px-2 w-28">Code</th>
                    <th className="py-2.5 px-2">Subject Name</th>
                    <th className="py-2.5 px-2 text-center w-20">Credits</th>
                    <th className="py-2.5 px-2 text-center w-20">Grade</th>
                    <th className="py-2.5 px-2 text-center w-16">GP</th>
                    <th className="py-2.5 px-2 text-right w-20">Credit Pts</th>
                    <th className="py-2.5 px-2 text-center w-20">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-secondary)]">
                  {subjects.map((s, idx) => {
                    const c = Number(s.credits) || 0;
                    const gp = s.gradePoint ?? 0;
                    const cp = c * gp;
                    const isMissingCredit = s.credits === '' || s.credits === null;
                    const isMissingGrade = !s.grade || s.gradePoint === null;

                    return (
                      <tr
                        key={s.id}
                        className={`transition-colors ${
                          s.isExcluded
                            ? 'opacity-40 bg-[var(--bg-secondary)]'
                            : 'hover:bg-[var(--bg-tertiary)]'
                        }`}
                      >
                        {/* S.No */}
                        <td className="py-2.5 px-2 text-center font-mono text-[11px] text-[var(--text-tertiary)]">
                          {s.sno || idx + 1}
                        </td>

                        {/* Code */}
                        <td className="py-2.5 px-2 font-mono font-semibold text-[var(--text-primary)]">
                          <input
                            type="text"
                            value={s.subjectCode || ''}
                            onChange={(e) =>
                              handleSubjectFieldChange(
                                s.id,
                                'subjectCode',
                                e.target.value.trim() ? e.target.value.toUpperCase() : null
                              )
                            }
                            placeholder="—"
                            className="w-24 bg-transparent border-b border-transparent focus:border-[var(--text-primary)] outline-none font-mono font-bold text-xs"
                            title="Course code (optional)"
                          />
                        </td>

                        {/* Name */}
                        <td className="py-2.5 px-2 font-medium text-[var(--text-primary)]">
                          <input
                            type="text"
                            value={s.subjectName}
                            onChange={(e) => handleSubjectFieldChange(s.id, 'subjectName', e.target.value)}
                            placeholder="Subject Title"
                            className="w-full bg-transparent border-b border-transparent focus:border-[var(--text-primary)] outline-none text-xs"
                          />
                          {s.isDuplicate && (
                            <span className="text-[10px] text-amber-600 block mt-0.5">
                              Duplicate record ({s.isExcluded ? 'Excluded' : 'Included'})
                            </span>
                          )}
                        </td>

                        {/* Credits */}
                        <td className="py-2.5 px-2 text-center">
                          <input
                            type="number"
                            min={0}
                            max={12}
                            step="any"
                            value={s.credits ?? ''}
                            onChange={(e) => {
                              const v = e.target.value === '' ? '' : Math.max(0, parseFloat(e.target.value) || 0);
                              handleSubjectFieldChange(s.id, 'credits', v);
                            }}
                            className={`w-14 h-8 text-center rounded-lg border text-xs font-semibold outline-none ${
                              isMissingCredit
                                ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-700'
                                : 'border-[var(--border-secondary)] bg-[var(--surface)] text-[var(--text-primary)]'
                            }`}
                          />
                        </td>

                        {/* Grade */}
                        <td className="py-2.5 px-2 text-center">
                          <select
                            value={s.grade}
                            onChange={(e) => handleSubjectFieldChange(s.id, 'grade', e.target.value)}
                            className={`w-16 h-8 text-center rounded-lg border text-xs font-semibold cursor-pointer outline-none ${
                              isMissingGrade
                                ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-700'
                                : 'border-[var(--border-secondary)] bg-[var(--surface)] text-[var(--text-primary)]'
                            }`}
                          >
                            <option value="">Select</option>
                            {regConfig?.grades.map((g) => (
                              <option key={g.grade} value={g.grade}>
                                {g.grade}
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* Grade Point */}
                        <td className="py-2.5 px-2 text-center font-mono font-bold text-[var(--text-primary)]">
                          {s.gradePoint ?? '—'}
                        </td>

                        {/* Credit Points */}
                        <td className="py-2.5 px-2 text-right font-mono font-bold text-[var(--text-primary)]">
                          {s.isExcluded ? '0.0' : cp.toFixed(1)}
                        </td>

                        {/* Actions */}
                        <td className="py-2.5 px-2 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {s.isDuplicate ? (
                              <button
                                type="button"
                                onClick={() => handleToggleDuplicateInclusion(s.id, !s.isExcluded)}
                                className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                                  s.isExcluded
                                    ? 'bg-amber-100 dark:bg-amber-950 text-amber-800'
                                    : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800'
                                }`}
                              >
                                {s.isExcluded ? 'Include' : 'Exclude'}
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleDeleteRow(s.id)}
                                className="p-1 text-[var(--text-tertiary)] hover:text-rose-600 rounded transition-colors"
                                title="Remove row"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Stacked View */}
            <div className="md:hidden flex flex-col gap-3">
              {subjects.map((s, idx) => {
                return (
                  <div
                    key={s.id}
                    className={`p-4 rounded-xl border flex flex-col gap-3 ${
                      s.isExcluded
                        ? 'opacity-40 bg-[var(--bg-secondary)] border-[var(--border-secondary)]'
                        : 'bg-[var(--surface)] border-[var(--border-primary)]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[var(--bg-tertiary)] text-[var(--text-tertiary)] font-mono">
                          #{s.sno || idx + 1}
                        </span>
                        <span className="font-mono text-xs font-bold text-[var(--text-primary)]">
                          {s.subjectCode || '—'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteRow(s.id)}
                        className="p-1 text-[var(--text-tertiary)] hover:text-rose-600"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <input
                      type="text"
                      value={s.subjectName}
                      onChange={(e) => handleSubjectFieldChange(s.id, 'subjectName', e.target.value)}
                      placeholder="Subject Name"
                      className="apple-input text-xs h-9"
                    />

                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-[var(--text-secondary)]">Credits</label>
                        <input
                          type="number"
                          min={0}
                          value={s.credits ?? ''}
                          onChange={(e) => {
                            const v = e.target.value === '' ? '' : Math.max(0, parseFloat(e.target.value) || 0);
                            handleSubjectFieldChange(s.id, 'credits', v);
                          }}
                          className="apple-input text-xs h-9 text-center"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-[var(--text-secondary)]">Grade</label>
                        <select
                          value={s.grade}
                          onChange={(e) => handleSubjectFieldChange(s.id, 'grade', e.target.value)}
                          className="apple-input text-xs h-9 text-center py-0"
                        >
                          <option value="">Select</option>
                          {regConfig?.grades.map((g) => (
                            <option key={g.grade} value={g.grade}>
                              {g.grade}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Validation Notice if missing fields exist */}
            {!canCalculate && (
              <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>
                  {!studentInfo.regulation
                    ? 'Please choose your regulation above to derive grade points.'
                    : hasMissingCredits
                    ? 'Certain subjects are missing credits. Please enter credits (0 is valid) before calculating.'
                    : 'Please select a valid grade for all included subjects.'}
                </span>
              </div>
            )}

            {/* Primary Action Button */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-[var(--border-secondary)]">
              <div className="text-xs text-[var(--text-secondary)]">
                Total Credits to compute: <strong>{audit.totalCredits}</strong> • Included subjects: <strong>{audit.subjectsIncluded}</strong>
              </div>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={!canCalculate}
                className="apple-btn-primary w-full sm:w-auto text-sm h-11 px-6 font-semibold disabled:opacity-40"
              >
                Confirm & Calculate SGPA
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bulk Credit Entry Modal */}
      {showBulkCreditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-[var(--surface)] border border-[var(--border-primary)] rounded-2xl p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-[var(--border-secondary)] pb-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-[var(--bg-tertiary)] text-[var(--accent)]">
                  <Sparkles className="w-4 h-4" />
                </span>
                <h3 className="font-bold text-sm text-[var(--text-primary)]">
                  Bulk Credit Entry
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowBulkCreditModal(false)}
                className="p-1 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Paste or enter the credit values for all <strong>{includedSubjects.length}</strong> included subjects in order, separated by spaces, commas, or newlines. 0-credit subjects are valid.
            </p>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[var(--text-primary)]">
                Credit Sequence
              </label>
              <textarea
                rows={3}
                value={bulkCreditText}
                onChange={(e) => setBulkCreditText(e.target.value)}
                placeholder={`e.g. 3 3 1.5 4 1.5 2 4 3 1.5 0 0 (${includedSubjects.length} values)`}
                className="apple-input text-xs font-mono p-3 resize-none"
                autoFocus
              />
            </div>

            {/* Validation badge */}
            <div className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-secondary)]">
              <span className="text-[var(--text-secondary)]">
                Count: <strong>{validBulkCredits.length}</strong> / {includedSubjects.length}
              </span>
              {bulkCreditCountMatches ? (
                <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Ready to apply
                </span>
              ) : (
                <span className="font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {validBulkCredits.length > includedSubjects.length
                    ? `${validBulkCredits.length - includedSubjects.length} extra`
                    : `Needs ${includedSubjects.length - validBulkCredits.length} more`}
                </span>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border-secondary)]">
              <button
                type="button"
                onClick={() => setShowBulkCreditModal(false)}
                className="apple-btn-secondary text-xs h-9 px-3.5"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyBulkCredits}
                disabled={!bulkCreditCountMatches}
                className="apple-btn-primary text-xs h-9 px-4 disabled:opacity-40 font-semibold"
              >
                Apply Credits
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
