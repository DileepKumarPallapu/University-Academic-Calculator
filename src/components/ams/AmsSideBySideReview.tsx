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
  Eye,
  Maximize2,
} from 'lucide-react';
import type {
  AmsExtractionResult,
  AmsStudentInfo,
  AmsSubject,
  AmsAuditSummary,
  FieldSource,
} from '../../types/ams';
import { REGULATIONS, type RegulationId } from '../../config/university';
import { computeAmsAuditSummary, detectAndFlagDuplicates } from '../../utils/amsExtractor';
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

export const SourceBadge: React.FC<{ source: FieldSource | string; className?: string }> = ({
  source,
  className = '',
}) => {
  let badgeStyle = 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] border-[var(--border-secondary)]';

  if (source.includes('AMS')) {
    badgeStyle = 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20';
  } else if (source.includes('USER')) {
    badgeStyle = 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20';
  } else if (source.includes('REGULATION')) {
    badgeStyle = 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20';
  } else if (source.includes('PROFILE')) {
    badgeStyle = 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20';
  }

  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border shrink-0 ${badgeStyle} ${className}`}
    >
      {source}
    </span>
  );
};

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
  const [isViewerModalOpen, setIsViewerModalOpen] = useState<boolean>(false);
  const [modalZoom, setModalZoom] = useState<number>(1);

  // Editable Student Info State
  const [studentInfo, setStudentInfo] = useState<AmsStudentInfo>({ ...initialResult.studentInfo });

  // Subjects state with audit tracking & original values
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
      regulationSource: 'USER',
    }));

    const config = REGULATIONS[regId];
    setSubjects((prev) => {
      const updated = prev.map((s) => {
        if (!s.grade) return s;
        const matched = config.grades.find((g) => g.grade.toUpperCase() === s.grade.toUpperCase());
        return {
          ...s,
          gradePoint: matched ? matched.points : s.gradePoint,
          gradePointSource: 'REGULATION' as const,
        };
      });
      return detectAndFlagDuplicates(updated);
    });
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
      nameSource: profile.name ? 'PROFILE' : prev.nameSource,
      registerNumber: profile.rollNumber || prev.registerNumber,
      regSource: profile.rollNumber ? 'PROFILE' : prev.regSource,
      department: profile.department || prev.department,
      semester: profile.semester ? parseInt(profile.semester) || prev.semester : prev.semester,
      semesterSource: profile.semester ? 'PROFILE' : prev.semesterSource,
      regulation: (profile.regulation as RegulationId) || prev.regulation,
      regulationSource: profile.regulation ? 'PROFILE' : prev.regulationSource,
    }));
  };

  // Subject field changes (triggers duplicate check)
  const handleSubjectFieldChange = (
    id: string,
    field: keyof AmsSubject,
    value: any
  ) => {
    setSubjects((prev) => {
      const updated = prev.map((s) => {
        if (s.id !== id) return s;
        const modified = { ...s, [field]: value, isManuallyEdited: true };

        // If grade changed, update gradePoint according to active regulation
        if (field === 'grade' && regConfig) {
          const matched = regConfig.grades.find((g) => g.grade.toUpperCase() === String(value).toUpperCase());
          modified.gradePoint = matched ? matched.points : null;
          modified.gradePointSource = 'REGULATION';
        }
        if (field === 'credits') {
          modified.creditsSource = 'USER';
        }

        return modified;
      });
      // Second duplicate check pass after user enters or edits credits/names
      return detectAndFlagDuplicates(updated);
    });
  };

  // Toggle duplicate inclusion
  const handleToggleDuplicateInclusion = (id: string, exclude: boolean) => {
    setSubjects((prev) =>
      prev.map((s) => (s.id === id ? { ...s, isExcluded: exclude, isManuallyEdited: true } : s))
    );
  };

  // Restore imported original values for a subject
  const handleRestoreOriginalValues = (id: string) => {
    setSubjects((prev) =>
      prev.map((s) => {
        if (s.id !== id || !s.originalValues) return s;
        return {
          ...s,
          subjectName: s.originalValues.subjectName,
          subjectCode: s.originalValues.subjectCode,
          credits: s.originalValues.credits,
          grade: s.originalValues.grade,
          gradePoint: s.originalValues.gradePoint,
          isManuallyEdited: false,
        };
      })
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
      hasOriginalCredits: false,
      confidence: {
        code: 'high',
        name: 'high',
        credits: 'high',
        grade: 'high',
        gradePoint: 'high',
      },
    };
    setSubjects((prev) => detectAndFlagDuplicates([...prev, newSub]));
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
    setSubjects((prev) => {
      const updated = prev.map((s) => {
        if (s.isExcluded) return s;
        const newCredit = validBulkCredits[idx++];
        return {
          ...s,
          credits: newCredit,
          creditsSource: 'USER' as const,
          isManuallyEdited: true,
        };
      });
      return detectAndFlagDuplicates(updated);
    });
    setShowBulkCreditModal(false);
    setBulkCreditText('');
  };

  // Comprehensive Audit calculation with accuracy gates
  const audit = computeAmsAuditSummary(subjects, studentInfo);

  // Scanning metadata summary calculations (Requirement 2)
  const totalExtracted = subjects.length;
  const courseNamesCount = subjects.filter((s) => s.subjectName && s.subjectName.trim() !== '').length;
  const courseCodesCount = subjects.filter((s) => s.subjectCode && s.subjectCode.trim() !== '').length;
  const gradesFoundCount = subjects.filter((s) => s.grade && s.grade.trim() !== '').length;
  const creditsAvailableCount = subjects.filter((s) => s.credits !== '' && s.credits !== null && Number(s.credits) >= 0).length;

  const handleConfirm = () => {
    if (!audit.readyToCalculate) return;
    onConfirmCalculation(
      studentInfo,
      subjects,
      audit,
      initialResult.previewUrls[activePageIdx] || initialResult.previewUrls[0]
    );
  };

  if (initialResult.pageType && initialResult.pageType !== 'AMS_RESULT_TABLE') {
    return (
      <div className="w-full max-w-xl mx-auto my-12 p-8 apple-card border border-[var(--border-primary)] flex flex-col items-center text-center gap-5">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <div className="flex flex-col gap-2">
          <h2 className="text-lg font-bold text-[var(--text-primary)]">
            Could not identify an AMS result table
          </h2>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            {initialResult.unrecognizedReason ||
              'The uploaded document does not contain recognizable semester examination result columns (such as Course Code, Subject, Grade, or Register Number).'}
          </p>
        </div>
        <div className="flex items-center gap-3 mt-2">
          <button
            type="button"
            onClick={onCancel}
            className="apple-btn-primary px-6 py-2.5 text-xs font-semibold"
          >
            Upload Another Result
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Top Banner & Header Card */}
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
            Review the extracted student details, subject credits, and grades. Verify every row before calculating SGPA.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {initialResult.previewUrls.length > 0 && (
            <button
              type="button"
              onClick={() => setIsViewerModalOpen(true)}
              className="apple-btn-secondary text-xs h-9 px-3 gap-1.5 flex items-center"
            >
              <Eye className="w-3.5 h-3.5 text-[var(--text-primary)]" />
              <span>View Original AMS Result</span>
            </button>
          )}
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

      {/* 2. SCAN SUMMARY CARD (Requirement 2 & 3) */}
      <div className="apple-card p-5 border border-[var(--border-primary)] flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--border-secondary)] pb-2.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--accent)]">
              SCAN SUMMARY
            </span>
            <span className="text-xs text-[var(--text-secondary)]">• Summary of detected values</span>
          </div>
          <span className="text-[11px] text-[var(--text-tertiary)]">
            Verified across document & result table
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 text-xs">
          {/* Student Name */}
          <div className="p-3 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border-secondary)] flex flex-col gap-1">
            <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)]">Student</span>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-bold text-[var(--text-primary)] truncate">{studentInfo.name || 'Not detected'}</span>
              {studentInfo.name && <SourceBadge source={studentInfo.nameSource || 'AMS'} />}
            </div>
          </div>

          {/* Register Number */}
          <div className="p-3 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border-secondary)] flex flex-col gap-1">
            <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)]">Register No</span>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-bold text-[var(--text-primary)] font-mono">{studentInfo.registerNumber || 'Not detected'}</span>
              {studentInfo.registerNumber && <SourceBadge source={studentInfo.regSource || 'AMS'} />}
            </div>
          </div>

          {/* Subjects Found */}
          <div className="p-3 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border-secondary)] flex flex-col gap-1">
            <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)]">Subjects Found</span>
            <div className="flex items-center gap-1.5">
              <span className="text-base font-bold text-[var(--text-primary)] font-mono">{totalExtracted}</span>
              <SourceBadge source="AMS" />
            </div>
          </div>

          {/* Grades Found */}
          <div className="p-3 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border-secondary)] flex flex-col gap-1">
            <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)]">Grades Found</span>
            <div className="flex items-center gap-1.5">
              <span className="text-base font-bold text-[var(--text-primary)] font-mono">{gradesFoundCount} / {totalExtracted}</span>
              <SourceBadge source="AMS" />
            </div>
          </div>

          {/* Course Names Found */}
          <div className="p-3 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border-secondary)] flex flex-col gap-1">
            <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)]">Course Names Found</span>
            <div className="flex items-center gap-1.5">
              <span className="text-base font-bold text-[var(--text-primary)] font-mono">{courseNamesCount} / {totalExtracted}</span>
              <SourceBadge source="AMS" />
            </div>
          </div>

          {/* Course Codes Found */}
          <div className="p-3 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border-secondary)] flex flex-col gap-1">
            <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)]">Course Codes Found</span>
            <div className="flex items-center gap-1.5">
              <span className="text-base font-bold text-[var(--text-primary)] font-mono">{courseCodesCount} / {totalExtracted}</span>
              <SourceBadge source="AMS" />
            </div>
          </div>

          {/* Credits */}
          <div className="p-3 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border-secondary)] flex flex-col gap-1">
            <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)]">Credits</span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {audit.creditsDetectedInSource ? (
                <>
                  <span className="font-bold text-[var(--text-primary)] font-mono">{creditsAvailableCount} / {totalExtracted}</span>
                  <SourceBadge source="AMS" />
                </>
              ) : (
                <>
                  <span className="font-semibold text-amber-600 dark:text-amber-400">Not available</span>
                  <SourceBadge source="USER" />
                </>
              )}
            </div>
          </div>

          {/* Regulation */}
          <div className="p-3 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border-secondary)] flex flex-col gap-1">
            <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)]">Regulation</span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {studentInfo.regulation ? (
                <>
                  <span className="font-bold text-[var(--text-primary)]">{studentInfo.regulation}</span>
                  <SourceBadge source={studentInfo.regulationSource || 'USER'} />
                </>
              ) : (
                <span className="font-semibold text-amber-600 dark:text-amber-400">Not detected</span>
              )}
            </div>
          </div>

          {/* Semester */}
          <div className="p-3 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border-secondary)] flex flex-col gap-1">
            <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)]">Semester</span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {studentInfo.semester ? (
                <>
                  <span className="font-bold text-[var(--text-primary)]">Semester {studentInfo.semester}</span>
                  <SourceBadge source={studentInfo.semesterSource || 'AMS'} />
                </>
              ) : (
                <span className="font-semibold text-amber-600 dark:text-amber-400">Not detected</span>
              )}
            </div>
          </div>
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

      {/* 4. STUDENT INFORMATION VERIFICATION (Requirement 4) */}
      <div className="apple-main-container p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-[var(--border-secondary)] pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
              STUDENT INFORMATION
            </span>
            <span className="text-[11px] text-[var(--text-tertiary)]">• Verified from AMS source</span>
          </div>
          <span className="text-[11px] text-[var(--text-tertiary)]">
            Only missing data needs user input
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
          {/* Student Name */}
          <div className="flex flex-col gap-1 p-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border-secondary)]">
            <span className="text-[11px] font-semibold text-[var(--text-secondary)]">Student Name</span>
            <div className="flex items-center justify-between gap-2 mt-0.5">
              <span className="font-bold text-sm text-[var(--text-primary)] truncate">{studentInfo.name || 'Not detected'}</span>
              <SourceBadge source={studentInfo.nameSource || (studentInfo.name ? 'AMS' : 'USER')} />
            </div>
          </div>

          {/* Student ID */}
          <div className="flex flex-col gap-1 p-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border-secondary)]">
            <span className="text-[11px] font-semibold text-[var(--text-secondary)]">Student ID</span>
            <div className="flex items-center justify-between gap-2 mt-0.5">
              <span className="font-bold text-sm text-[var(--text-primary)] font-mono truncate">{studentInfo.studentId || 'Not detected'}</span>
              <SourceBadge source={studentInfo.studentIdSource || (studentInfo.studentId ? 'AMS' : 'USER')} />
            </div>
          </div>

          {/* Register Number */}
          <div className="flex flex-col gap-1 p-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border-secondary)]">
            <span className="text-[11px] font-semibold text-[var(--text-secondary)]">Register Number</span>
            <div className="flex items-center justify-between gap-2 mt-0.5">
              <span className="font-bold text-sm text-[var(--text-primary)] font-mono truncate">{studentInfo.registerNumber || 'Not detected'}</span>
              <SourceBadge source={studentInfo.regSource || (studentInfo.registerNumber ? 'AMS' : 'USER')} />
            </div>
          </div>

          {/* Degree */}
          <div className="flex flex-col gap-1 p-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border-secondary)]">
            <span className="text-[11px] font-semibold text-[var(--text-secondary)]">Degree</span>
            <div className="flex items-center justify-between gap-2 mt-0.5">
              <span className="font-bold text-sm text-[var(--text-primary)] truncate">{studentInfo.degree || 'B.Tech'}</span>
              <SourceBadge source={studentInfo.degreeSource || 'AMS'} />
            </div>
          </div>

          {/* Branch */}
          <div className="flex flex-col gap-1 p-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border-secondary)]">
            <span className="text-[11px] font-semibold text-[var(--text-secondary)]">Branch</span>
            <div className="flex items-center justify-between gap-2 mt-0.5">
              <span className="font-bold text-sm text-[var(--text-primary)] truncate">{studentInfo.branch || 'Not detected'}</span>
              <SourceBadge source={studentInfo.branchSource || 'AMS'} />
            </div>
          </div>

          {/* Batch */}
          <div className="flex flex-col gap-1 p-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border-secondary)]">
            <span className="text-[11px] font-semibold text-[var(--text-secondary)]">Batch</span>
            <div className="flex items-center justify-between gap-2 mt-0.5">
              <span className="font-bold text-sm text-[var(--text-primary)] font-mono truncate">{studentInfo.batch || 'Not detected'}</span>
              <SourceBadge source={studentInfo.batchSource || 'AMS'} />
            </div>
          </div>

          {/* Result Month */}
          <div className="flex flex-col gap-1 p-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border-secondary)]">
            <span className="text-[11px] font-semibold text-[var(--text-secondary)]">Result Month</span>
            <div className="flex items-center justify-between gap-2 mt-0.5">
              <span className="font-bold text-sm text-[var(--text-primary)] truncate">{studentInfo.resultMonthYear || 'Not detected'}</span>
              <SourceBadge source={studentInfo.resultMonthYearSource || 'AMS'} />
            </div>
          </div>

          {/* Result Type */}
          <div className="flex flex-col gap-1 p-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border-secondary)]">
            <span className="text-[11px] font-semibold text-[var(--text-secondary)]">Result Type</span>
            <div className="flex items-center justify-between gap-2 mt-0.5">
              <span className="font-bold text-sm text-[var(--text-primary)] truncate">{studentInfo.resultType || 'Regular'}</span>
              <SourceBadge source={studentInfo.resultTypeSource || 'AMS'} />
            </div>
          </div>

          {/* Semester (Required completion if missing) */}
          <div className="flex flex-col gap-1 p-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border-secondary)]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-[var(--text-secondary)]">Semester</span>
              {studentInfo.semester ? (
                <SourceBadge source={studentInfo.semesterSource || 'AMS'} />
              ) : (
                <span className="text-[10px] text-amber-600 font-bold">Select</span>
              )}
            </div>
            <select
              value={studentInfo.semester || 1}
              onChange={(e) =>
                setStudentInfo((prev) => ({
                  ...prev,
                  semester: parseInt(e.target.value) || 1,
                  semesterSource: 'USER',
                }))
              }
              className="apple-input text-xs h-8 mt-0.5 py-0 cursor-pointer"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                <option key={s} value={s}>
                  Semester {s}
                </option>
              ))}
            </select>
          </div>

          {/* Academic Regulation Selector (Required completion) */}
          <div className="flex flex-col gap-1 p-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border-secondary)] sm:col-span-2 lg:col-span-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-[var(--text-primary)]">
                Regulation {studentInfo.regulation ? `(Active: ${studentInfo.regulation})` : '(Selection Required)'}
              </span>
              {studentInfo.regulation ? (
                <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> ✓ {studentInfo.regulation} selected
                </span>
              ) : (
                <span className="text-[11px] font-bold text-rose-600 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> Please select regulation
                </span>
              )}
            </div>
            <div className="grid grid-cols-4 gap-2 mt-1">
              {(['VTR15', 'VTR18', 'VTR21', 'VTR25'] as RegulationId[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => handleRegulationSelect(r)}
                  className={`py-2 rounded-lg text-xs font-bold border transition-all ${
                    studentInfo.regulation === r
                      ? 'bg-[var(--button-primary)] text-[var(--button-primary-text)] border-transparent shadow-xs'
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
                  onClick={() => setIsViewerModalOpen(true)}
                  className="p-1 rounded-md border border-[var(--border-secondary)] hover:bg-[var(--bg-tertiary)]"
                  title="Expand to Fullscreen Modal"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
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
          {/* Subjects Table Card */}
          <div className="apple-main-container p-6 flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--border-secondary)] pb-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                  Subject Verification Table ({subjects.length})
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[var(--bg-tertiary)] text-[var(--text-secondary)]">
                  {audit.creditBearingCount} Credit-bearing • {audit.nonCreditCount} Non-credit
                </span>
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

            {/* Verification Status Badges: Row Coverage, Duplicate Check, Credit Indicator */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {/* Row Coverage (Requirement 10 & 11) */}
              <div className={`px-2.5 py-1 rounded-lg border font-semibold flex items-center gap-1.5 ${
                audit.rowAccountingVerified
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                  : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
              }`}>
                {audit.rowAccountingVerified ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>ROW COVERAGE: {audit.extractedRowsCount} / {audit.detectedRowsCount} ✓ All result rows accounted for</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>ROW COVERAGE: ⚠ Missing result row(s): {(audit.missingRowNumbers ?? []).join(', ')}</span>
                  </>
                )}
              </div>

              {/* Duplicate Check (Requirement 12) */}
              <div className={`px-2.5 py-1 rounded-lg border font-semibold flex items-center gap-1.5 ${
                audit.duplicatesCount === 0
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                  : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
              }`}>
                {audit.duplicatesCount === 0 ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Duplicate Check: ✓ No duplicates detected</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Duplicate Check: ⚠ {audit.duplicatesCount} possible duplicate detected</span>
                  </>
                )}
              </div>

              {/* Credit Completion Indicator (Requirement 15) */}
              <div className={`px-2.5 py-1 rounded-lg border font-semibold flex items-center gap-1.5 ${
                audit.creditsEnteredCount === audit.totalSubjectsCount
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                  : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
              }`}>
                {audit.creditsEnteredCount === audit.totalSubjectsCount ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Credits entered: {audit.creditsEnteredCount} / {audit.totalSubjectsCount} ✓ All credits entered</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Credits entered: {audit.creditsEnteredCount} / {audit.totalSubjectsCount} (Credits are required for SGPA)</span>
                  </>
                )}
              </div>
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[var(--border-secondary)] text-[var(--text-secondary)] font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 px-2 text-center w-8">#</th>
                    <th className="py-2.5 px-2 w-28">Course Code</th>
                    <th className="py-2.5 px-2">Subject</th>
                    <th className="py-2.5 px-2 text-center w-20">Credits</th>
                    <th className="py-2.5 px-2 text-center w-20">Grade</th>
                    <th className="py-2.5 px-2 text-center w-12">GP</th>
                    <th className="py-2.5 px-2 text-right w-20">Credit Points</th>
                    <th className="py-2.5 px-2 text-center w-20">Source</th>
                    <th className="py-2.5 px-2 text-center w-24">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-secondary)]">
                  {subjects.map((s, idx) => {
                    const c = Number(s.credits) || 0;
                    const gp = s.gradePoint ?? 0;
                    const cp = s.credits === 0 ? 0 : c * gp;
                    const isMissingCredit = s.credits === '' || s.credits === null || Number(s.credits) < 0;
                    const isMissingName = !s.subjectName || s.subjectName.trim() === '';
                    const isMissingGrade = !s.grade || s.gradePoint === null;
                    const isComplete = !isMissingCredit && !isMissingName && !isMissingGrade;

                    // Regulation grade validation check
                    const regGrades = regConfig ? new Set(regConfig.grades.map(g => g.grade.toUpperCase())) : null;
                    const isGradeValidUnderReg = !s.grade || (regGrades ? regGrades.has(s.grade.toUpperCase()) : true);

                    const canRestore =
                      s.isManuallyEdited &&
                      Boolean(
                        (s.originalValues?.subjectName && s.originalValues.subjectName !== s.subjectName) ||
                        (s.originalValues?.grade && s.originalValues.grade !== s.grade) ||
                        (s.hasOriginalCredits && s.originalValues?.credits !== s.credits)
                      );

                    return (
                      <tr
                        key={s.id}
                        className={`transition-colors ${
                          s.isExcluded
                            ? 'opacity-40 bg-[var(--bg-secondary)]'
                            : !isComplete
                            ? 'bg-amber-500/5 hover:bg-amber-500/10'
                            : 'hover:bg-[var(--bg-tertiary)]'
                        }`}
                      >
                        {/* 1. S.No */}
                        <td className="py-2.5 px-2 text-center font-mono text-[11px] text-[var(--text-tertiary)]">
                          {s.sno || idx + 1}
                        </td>

                        {/* 2. Course Code (Optional) */}
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
                            title="Course code (optional: displays '—' if absent)"
                          />
                        </td>

                        {/* 3. Subject Name (Required) */}
                        <td className="py-2.5 px-2 font-medium text-[var(--text-primary)]">
                          <input
                            type="text"
                            value={s.subjectName}
                            onChange={(e) => handleSubjectFieldChange(s.id, 'subjectName', e.target.value)}
                            placeholder="Enter subject name"
                            className={`w-full bg-transparent border-b outline-none text-xs font-medium ${
                              isMissingName
                                ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 placeholder:text-amber-600'
                                : 'border-transparent focus:border-[var(--text-primary)]'
                            }`}
                          />
                          {isMissingName && (
                            <span className="text-[10px] text-amber-600 font-semibold block mt-0.5 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" /> ⚠ Subject name not detected
                            </span>
                          )}
                          {s.isManuallyEdited && (
                            <span className="text-[9px] text-blue-600 dark:text-blue-400 font-semibold inline-block mr-1">
                              Manual correction
                            </span>
                          )}
                        </td>

                        {/* 4. Credits (Required for SGPA, no auto-fill default values!) */}
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
                            placeholder="Credits"
                            className={`w-14 h-8 text-center rounded-lg border text-xs font-semibold outline-none ${
                              isMissingCredit
                                ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-700'
                                : 'border-[var(--border-secondary)] bg-[var(--surface)] text-[var(--text-primary)]'
                            }`}
                          />
                        </td>

                        {/* 5. Grade */}
                        <td className="py-2.5 px-2 text-center">
                          <select
                            value={s.grade}
                            onChange={(e) => handleSubjectFieldChange(s.id, 'grade', e.target.value)}
                            className={`w-16 h-8 text-center rounded-lg border text-xs font-semibold cursor-pointer outline-none ${
                              isMissingGrade || !isGradeValidUnderReg
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
                          {!isGradeValidUnderReg && (
                            <span className="text-[9px] text-rose-600 block mt-0.5">
                              ⚠ Invalid
                            </span>
                          )}
                        </td>

                        {/* 6. GP (Grade Point) */}
                        <td className="py-2.5 px-2 text-center font-mono font-bold text-[var(--text-primary)]">
                          {s.gradePoint ?? '—'}
                        </td>

                        {/* 7. Credit Points */}
                        <td className="py-2.5 px-2 text-right font-mono font-bold text-[var(--text-primary)]">
                          {s.isExcluded ? '0.0' : s.credits === 0 ? '0.0 (Non-credit)' : cp.toFixed(1)}
                        </td>

                        {/* 8. Source */}
                        <td className="py-2.5 px-2 text-center">
                          <SourceBadge source={s.creditsSource === 'USER' ? 'AMS + User' : 'AMS'} />
                        </td>

                        {/* 9. Actions */}
                        <td className="py-2.5 px-2 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {canRestore && (
                              <button
                                type="button"
                                onClick={() => handleRestoreOriginalValues(s.id)}
                                className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-800 hover:bg-amber-200 transition-colors"
                                title="Restore imported value"
                              >
                                Restore
                              </button>
                            )}
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

            {/* Mobile Cards View */}
            <div className="md:hidden flex flex-col gap-3">
              {subjects.map((s, idx) => {
                const isMissingCredit = s.credits === '' || s.credits === null || Number(s.credits) < 0;
                const isMissingName = !s.subjectName || s.subjectName.trim() === '';
                const isMissingGrade = !s.grade || s.gradePoint === null;
                const canRestore =
                  s.isManuallyEdited &&
                  Boolean(
                    (s.originalValues?.subjectName && s.originalValues.subjectName !== s.subjectName) ||
                    (s.originalValues?.grade && s.originalValues.grade !== s.grade) ||
                    (s.hasOriginalCredits && s.originalValues?.credits !== s.credits)
                  );

                return (
                  <div
                    key={s.id}
                    className={`p-4 rounded-xl border flex flex-col gap-3 ${
                      s.isExcluded
                        ? 'opacity-40 bg-[var(--bg-secondary)] border-[var(--border-secondary)]'
                        : isMissingCredit || isMissingName || isMissingGrade
                        ? 'bg-amber-500/5 border-amber-500/30'
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
                        <SourceBadge source={s.creditsSource === 'USER' ? 'AMS + User' : 'AMS'} />
                      </div>
                      <div className="flex items-center gap-1">
                        {canRestore && (
                          <button
                            type="button"
                            onClick={() => handleRestoreOriginalValues(s.id)}
                            className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-800"
                          >
                            Restore
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeleteRow(s.id)}
                          className="p-1 text-[var(--text-tertiary)] hover:text-rose-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <input
                      type="text"
                      value={s.subjectName}
                      onChange={(e) => handleSubjectFieldChange(s.id, 'subjectName', e.target.value)}
                      placeholder="Enter subject name"
                      className={`apple-input text-xs h-9 ${
                        isMissingName
                          ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200'
                          : ''
                      }`}
                    />
                    {isMissingName && (
                      <span className="text-[10px] text-amber-600 font-semibold flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> ⚠ Subject name not detected
                      </span>
                    )}

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
                          placeholder="Credits"
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

                    <div className="flex items-center justify-between text-xs pt-1 border-t border-[var(--border-secondary)]">
                      <span className="text-[11px] text-[var(--text-secondary)]">
                        GP: <strong>{s.gradePoint ?? '—'}</strong>
                      </span>
                      <span className="font-mono font-bold text-[var(--text-primary)]">
                        Points: {s.credits === 0 ? '0.0 (Non-credit)' : ((Number(s.credits) || 0) * (s.gradePoint ?? 0)).toFixed(1)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 18 & 19. CALCULATION STATUS & ACCURACY GATE */}
            <div className="p-5 rounded-2xl bg-[var(--surface)] border border-[var(--border-primary)] flex flex-col gap-4 shadow-xs mt-2">
              <div className="flex items-center justify-between border-b border-[var(--border-secondary)] pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-[var(--accent)]">
                    CALCULATION STATUS
                  </span>
                </div>
                {audit.readyToCalculate ? (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5" /> READY
                  </span>
                ) : (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" /> NOT READY
                  </span>
                )}
              </div>

              {/* 10 Checkpoints */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {audit.preCalculationAudit?.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-secondary)]"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {item.status === 'passed' ? (
                        <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : item.status === 'warning' ? (
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      ) : (
                        <X className="w-4 h-4 text-rose-600 shrink-0" />
                      )}
                      <span className="font-semibold text-[var(--text-primary)] truncate">{item.label}</span>
                    </div>
                    <span className="text-[11px] text-[var(--text-secondary)] shrink-0 ml-2">
                      {item.detail}
                    </span>
                  </div>
                ))}
              </div>

              {/* If NOT READY: List ONLY the specific problems */}
              {!audit.readyToCalculate && audit.calculationIssues && audit.calculationIssues.length > 0 && (
                <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 flex flex-col gap-1.5 text-xs text-amber-900 dark:text-amber-200">
                  <span className="font-bold flex items-center gap-1.5 text-amber-800 dark:text-amber-300">
                    <AlertTriangle className="w-3.5 h-3.5" /> Action required before calculation:
                  </span>
                  <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                    {audit.calculationIssues.map((issue, idx) => (
                      <li key={idx}>⚠ {issue}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Calculation Action Button */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-[var(--border-secondary)]">
                <div className="text-xs text-[var(--text-secondary)]">
                  Total Credits to compute: <strong>{audit.totalCredits}</strong> • Included courses: <strong>{audit.subjectsIncluded}</strong>
                </div>
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={!audit.readyToCalculate}
                  className="apple-btn-primary w-full sm:w-auto text-sm h-11 px-8 font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Calculate SGPA from AMS Result
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 25. CLEAN MODAL VIEWER FOR ORIGINAL AMS RESULT */}
      {isViewerModalOpen && initialResult.previewUrls.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-5xl h-[85vh] bg-[var(--surface)] border border-[var(--border-primary)] rounded-2xl flex flex-col overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-[var(--border-secondary)] bg-[var(--surface-secondary)]">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-[var(--text-primary)]">
                  Original AMS Result Document
                </span>
                <span className="text-xs text-[var(--text-secondary)] font-mono">
                  ({initialResult.fileName})
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setModalZoom((z) => Math.max(0.5, z - 0.2))}
                  className="p-1.5 rounded-lg border border-[var(--border-secondary)] hover:bg-[var(--bg-tertiary)] text-[var(--text-primary)]"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setModalZoom(1)}
                  className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-[var(--border-secondary)] hover:bg-[var(--bg-tertiary)] text-[var(--text-primary)]"
                  title="Fit to screen"
                >
                  Fit (100%)
                </button>
                <button
                  type="button"
                  onClick={() => setModalZoom((z) => Math.min(3, z + 0.2))}
                  className="p-1.5 rounded-lg border border-[var(--border-secondary)] hover:bg-[var(--bg-tertiary)] text-[var(--text-primary)]"
                  title="Zoom In"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsViewerModalOpen(false)}
                  className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors ml-2"
                  title="Close viewer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Image Body with full panning */}
            <div className="flex-1 overflow-auto p-4 bg-[var(--bg-tertiary)] flex items-center justify-center">
              <img
                src={initialResult.previewUrls[activePageIdx]}
                alt="AMS Result Full View"
                style={{
                  transform: `scale(${modalZoom})`,
                  transformOrigin: 'center center',
                  transition: 'transform 0.2s ease',
                }}
                className="max-h-full max-w-full object-contain rounded shadow-md"
              />
            </div>
          </div>
        </div>
      )}

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
