import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Clock,
  RotateCcw,
  BookOpen,
  Calendar as CalendarIcon,
  AlertTriangle,
  BookmarkPlus,
} from 'lucide-react';
import { PrintButton } from '../components/common/PrintButton';
import { AcademicPrintReport } from '../components/common/AcademicPrintReport';
import { useStudentProfile } from '../hooks/useStudentProfile';
import { useProfile } from '../context/ProfileContext';
import { StudentNameInput } from '../components/common/StudentNameInput';
import { ResultActionButtons } from '../components/common/ResultActionButtons';
import { SaveCalculationButton } from '../components/common/SaveCalculationModal';
import { ResetConfirmModal } from '../components/common/ResetConfirmModal';
import { saveRecentCalculation } from '../utils/recentCalculations';
import { useAppToast } from '../components/layout/AppShell';
import { DraftIndicator } from '../components/common/DraftIndicator';
import { CalculationStatus } from '../components/common/CalculationStatus';

import {
  calculateCurrentAttendance,
  calculateBunkMargin,
  calculateRecoveryRequired,
  validateAttendanceInputs,
  type SubjectAttendanceItem,
  type ClassLogEntry,
} from '../utils/attendancePlanner';
import { AttendanceSummaryCard } from '../components/attendance/AttendanceSummaryCard';
import { SmartBunkPlanner } from '../components/attendance/SmartBunkPlanner';
import { AttendanceRecoveryPlanner } from '../components/attendance/AttendanceRecoveryPlanner';
import { FutureSimulator } from '../components/attendance/FutureSimulator';
import { SubjectWiseTracker } from '../components/attendance/SubjectWiseTracker';
import { WeeklyPlannerCalendar } from '../components/attendance/WeeklyPlannerCalendar';

type ActiveTab = 'planner' | 'subjects' | 'calendar';

export const AttendancePage: React.FC = () => {
  const { profile, studentName, setStudentName, updateProfile, nameError, setNameError } = useStudentProfile();
  const { getCalculation } = useProfile();
  const { showToast } = useAppToast();
  const [searchParams] = useSearchParams();
  const calcIdParam = searchParams.get('calcId');
  const [loadedCalcId, setLoadedCalcId] = useState<string | null>(calcIdParam);

  const studentNameInputRef = useRef<HTMLInputElement>(null);
  const [calcSuccess, setCalcSuccess] = useState<boolean>(false);

  // Active Tab
  const [activeTab, setActiveTab] = useState<ActiveTab>('planner');

  // Primary Inputs
  const [subjectName, setSubjectName] = useState<string>(() => {
    try {
      const draft = localStorage.getItem('academic_draft_attendance');
      if (draft) {
        const parsed = JSON.parse(draft);
        if (parsed.subjectName !== undefined) return parsed.subjectName;
      }
    } catch {}
    return '';
  });

  const [totalSessionsInput, setTotalSessionsInput] = useState<string>(() => {
    try {
      const draft = localStorage.getItem('academic_draft_attendance');
      if (draft) {
        const parsed = JSON.parse(draft);
        if (parsed.totalSessionsInput !== undefined) return parsed.totalSessionsInput;
      }
    } catch {}
    return '50';
  });

  const [useFacultySessions, setUseFacultySessions] = useState<boolean>(() => {
    try {
      const draft = localStorage.getItem('academic_draft_attendance');
      if (draft) {
        const parsed = JSON.parse(draft);
        if (parsed.useFacultySessions !== undefined) return parsed.useFacultySessions;
      }
    } catch {}
    return false;
  });

  const [facultySessionsInput, setFacultySessionsInput] = useState<string>(() => {
    try {
      const draft = localStorage.getItem('academic_draft_attendance');
      if (draft) {
        const parsed = JSON.parse(draft);
        if (parsed.facultySessionsInput !== undefined) return parsed.facultySessionsInput;
      }
    } catch {}
    return '50';
  });

  const [attendedInput, setAttendedInput] = useState<string>(() => {
    try {
      const draft = localStorage.getItem('academic_draft_attendance');
      if (draft) {
        const parsed = JSON.parse(draft);
        if (parsed.attendedInput !== undefined) return parsed.attendedInput;
      }
    } catch {}
    return '42';
  });

  const [targetPercentageInput, setTargetPercentageInput] = useState<string>(() => {
    try {
      const draft = localStorage.getItem('academic_draft_attendance');
      if (draft) {
        const parsed = JSON.parse(draft);
        if (parsed.targetPercentageInput !== undefined) return parsed.targetPercentageInput;
      }
    } catch {}
    return '75';
  });

  // Numeric parsing
  const totalConducted = Math.max(0, parseInt(totalSessionsInput) || 0);
  const facultyConducted = Math.max(0, parseInt(facultySessionsInput) || 0);
  const attended = Math.max(0, parseInt(attendedInput) || 0);
  const targetPercentage = Math.max(1, Math.min(100, parseFloat(targetPercentageInput) || 75));

  // Denominator logic: use faculty sessions if toggle is active, otherwise institutional total
  const effectiveConducted = useFacultySessions ? facultyConducted : totalConducted;
  const denominatorLabel = useFacultySessions
    ? 'Faculty conducted sessions'
    : 'Institutional total sessions';

  // Validation
  const validation = validateAttendanceInputs(effectiveConducted, attended, targetPercentage);
  const hasError = !validation.isValid;
  const errorMsg = validation.error || null;

  // Calculations
  const attendanceData = calculateCurrentAttendance(effectiveConducted, attended, targetPercentage);
  const bunkResult = calculateBunkMargin(effectiveConducted, attended, targetPercentage);
  const recoveryResult = calculateRecoveryRequired(effectiveConducted, attended, targetPercentage);

  // Reopen saved Attendance calculation from profile
  useEffect(() => {
    if (!calcIdParam) return;
    (async () => {
      const saved = await getCalculation(calcIdParam);
      if (saved && saved.inputs && saved.type === 'attendance') {
        if (saved.inputs.subjectName !== undefined) setSubjectName(saved.inputs.subjectName);
        if (saved.inputs.totalSessionsInput !== undefined) setTotalSessionsInput(String(saved.inputs.totalSessionsInput));
        if (saved.inputs.attendedInput !== undefined) setAttendedInput(String(saved.inputs.attendedInput));
        if (saved.inputs.targetPercentageInput !== undefined) setTargetPercentageInput(String(saved.inputs.targetPercentageInput));
        if (saved.inputs.useFacultySessions !== undefined) setUseFacultySessions(Boolean(saved.inputs.useFacultySessions));
        if (saved.inputs.facultySessionsInput !== undefined) setFacultySessionsInput(String(saved.inputs.facultySessionsInput));
        setLoadedCalcId(saved.id);
        showToast(`Loaded saved Attendance: "${saved.title}"`, 'success');
      }
    })();
  }, [calcIdParam, getCalculation, showToast]);

  // Subject-Wise Tracker State with localStorage persistence
  const [subjects, setSubjects] = useState<SubjectAttendanceItem[]>(() => {
    try {
      const saved = localStorage.getItem('academic_attendance_subjects_v2');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      { id: 'sub-1', name: 'Data Structures & Algorithms', conducted: 45, attended: 40, targetPercentage: 75 },
      { id: 'sub-2', name: 'Computer Networks', conducted: 40, attended: 28, targetPercentage: 75 },
      { id: 'sub-3', name: 'Operating Systems', conducted: 50, attended: 42, targetPercentage: 80 },
    ];
  });

  useEffect(() => {
    try {
      localStorage.setItem('academic_attendance_subjects_v2', JSON.stringify(subjects));
    } catch {}
  }, [subjects]);

  // Weekly Planner Log State with localStorage persistence
  const [classLogs, setClassLogs] = useState<ClassLogEntry[]>(() => {
    try {
      const saved = localStorage.getItem('academic_attendance_logs_v2');
      if (saved) return JSON.parse(saved);
    } catch {}
    const today = new Date().toISOString().split('T')[0];
    return [
      { id: 'log-1', date: today, subject: 'Computer Networks', status: 'attended' },
      { id: 'log-2', date: today, subject: 'Operating Systems', status: 'planned', notes: 'Period 3' },
    ];
  });

  useEffect(() => {
    try {
      localStorage.setItem('academic_attendance_logs_v2', JSON.stringify(classLogs));
    } catch {}
  }, [classLogs]);

  // Draft persistence for Planner
  const isDirty =
    totalSessionsInput !== '50' ||
    attendedInput !== '42' ||
    targetPercentageInput !== '75' ||
    subjectName !== '';

  const [hasDraft, setHasDraft] = useState<boolean>(() => {
    try {
      return !!localStorage.getItem('academic_draft_attendance');
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (isDirty) {
      try {
        localStorage.setItem(
          'academic_draft_attendance',
          JSON.stringify({
            subjectName,
            totalSessionsInput,
            useFacultySessions,
            facultySessionsInput,
            attendedInput,
            targetPercentageInput,
          })
        );
        setHasDraft(true);
      } catch {}
    }
  }, [subjectName, totalSessionsInput, useFacultySessions, facultySessionsInput, attendedInput, targetPercentageInput, isDirty]);

  // Reset confirmation modals
  const [showResetModal, setShowResetModal] = useState(false);
  const [showClearAllModal, setShowClearAllModal] = useState(false);

  const handleReset = () => {
    try {
      localStorage.removeItem('academic_draft_attendance');
    } catch {}
    setSubjectName('');
    setTotalSessionsInput('50');
    setUseFacultySessions(false);
    setFacultySessionsInput('50');
    setAttendedInput('42');
    setTargetPercentageInput('75');
    setHasDraft(false);
    setShowResetModal(false);
    showToast('Attendance calculator reset to defaults.', 'info');
  };

  const handleClearAllData = () => {
    try {
      localStorage.removeItem('academic_draft_attendance');
      localStorage.removeItem('academic_attendance_subjects_v2');
      localStorage.removeItem('academic_attendance_logs_v2');
    } catch {}
    setSubjects([]);
    setClassLogs([]);
    handleReset();
    setShowClearAllModal(false);
    showToast('All stored attendance data and logs cleared.', 'info');
  };

  // Subject management actions
  const handleAddSubject = (newSub: Omit<SubjectAttendanceItem, 'id'>) => {
    const item: SubjectAttendanceItem = {
      ...newSub,
      id: `sub-${Date.now()}`,
    };
    setSubjects((prev) => [item, ...prev]);
    showToast(`Added "${newSub.name}" to subjects.`, 'success');
  };

  const handleUpdateSubject = (updated: SubjectAttendanceItem) => {
    setSubjects((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    showToast(`Updated "${updated.name}".`, 'success');
  };

  const handleDeleteSubject = (id: string) => {
    setSubjects((prev) => prev.filter((s) => s.id !== id));
    showToast('Subject removed.', 'info');
  };

  const handleSelectSubjectForCalculator = (sub: SubjectAttendanceItem) => {
    setSubjectName(sub.name);
    setTotalSessionsInput(sub.conducted.toString());
    setAttendedInput(sub.attended.toString());
    setTargetPercentageInput(sub.targetPercentage.toString());
    setUseFacultySessions(false);
    setActiveTab('planner');
    showToast(`Loaded "${sub.name}" into Planner.`, 'success');
  };

  // Log management actions
  const handleAddLogEntry = (newEntry: Omit<ClassLogEntry, 'id'>) => {
    const item: ClassLogEntry = {
      ...newEntry,
      id: `log-${Date.now()}`,
    };
    setClassLogs((prev) => [item, ...prev]);
    showToast(`Session logged for ${newEntry.subject}.`, 'success');
  };

  const handleUpdateLogStatus = (id: string, status: 'attended' | 'missed' | 'planned') => {
    setClassLogs((prev) =>
      prev.map((l) => (l.id === id ? { ...l, status } : l))
    );
  };

  const handleDeleteLogEntry = (id: string) => {
    setClassLogs((prev) => prev.filter((l) => l.id !== id));
  };

  // Save to recent calculations
  const handleSaveToRecent = () => {
    if (hasError || effectiveConducted === 0 || attendanceData.percentage === null) return;
    saveRecentCalculation({
      type: 'attendance',
      title: subjectName.trim() ? `Attendance (${subjectName.trim()})` : 'Attendance Plan',
      value: `${attendanceData.percentage.toFixed(1)}%`,
      subtext: `${attended}/${effectiveConducted} Attended • Target ${targetPercentage}% • ${attendanceData.statusDetails.label}`,
      route: '/attendance',
    });
    setCalcSuccess(true);
    showToast('Saved to recent calculations.', 'success');
  };

  // Subject counts for badge
  const subjectsBelowTarget = subjects.filter((s) => {
    const p = s.conducted > 0 ? (s.attended / s.conducted) * 100 : 100;
    return p < s.targetPercentage;
  }).length;

  return (
    <>
      <div className="apple-page-enter flex flex-col gap-8 max-w-[1200px] mx-auto print:hidden">
        {/* Page Header */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-[32px] sm:text-[40px] font-semibold tracking-tight text-[var(--text-primary)]">
              Smart Attendance Planner
            </h1>
            {hasDraft && (
              <DraftIndicator
                hasDraft={hasDraft}
                onClear={() => {
                  try {
                    localStorage.removeItem('academic_draft_attendance');
                  } catch {}
                  setHasDraft(false);
                  handleReset();
                }}
              />
            )}
          </div>
          <p className="text-[17px] text-[var(--text-secondary)]">
            Track your attendance, plan your classes, and stay on target.
          </p>
        </div>

        {/* Tab Navigation Controls */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-[var(--surface-sunken)] border border-[var(--border-secondary)] max-w-lg w-full">
          <button
            type="button"
            onClick={() => setActiveTab('planner')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              activeTab === 'planner'
                ? 'bg-[var(--surface)] text-[var(--text-primary)] shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Clock className="w-4 h-4 text-[var(--accent)]" />
            <span>Planner</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('subjects')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              activeTab === 'subjects'
                ? 'bg-[var(--surface)] text-[var(--text-primary)] shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <BookOpen className="w-4 h-4 text-indigo-500" />
            <span>Subjects</span>
            {subjects.length > 0 && (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  subjectsBelowTarget > 0
                    ? 'bg-amber-500 text-white'
                    : 'bg-[var(--border-secondary)] text-[var(--text-secondary)]'
                }`}
              >
                {subjects.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('calendar')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              activeTab === 'calendar'
                ? 'bg-[var(--surface)] text-[var(--text-primary)] shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <CalendarIcon className="w-4 h-4 text-teal-500" />
            <span>Class Log</span>
            {classLogs.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-[var(--border-secondary)] text-[var(--text-secondary)]">
                {classLogs.length}
              </span>
            )}
          </button>
        </div>

        {/* Tab 1: Planner & Calculator */}
        {activeTab === 'planner' && (
          <div className="flex flex-col gap-8">
            {/* Student Profile Input */}
            <StudentNameInput
              value={studentName}
              onChange={setStudentName}
              errorMessage={nameError}
              inputRef={studentNameInputRef}
              profile={profile}
              onProfileChange={updateProfile}
            />

            {/* Inputs & Visual Attendance Summary Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left Column: Form Parameters (7 cols) */}
              <div className="lg:col-span-6 flex flex-col gap-6">
                <div className="apple-main-container p-6 sm:p-7 flex flex-col gap-5 border border-[var(--border-primary)] bg-[var(--surface)] shadow-xs">
                  <div className="flex items-center justify-between border-b border-[var(--border-secondary)] pb-3">
                    <span className="text-sm font-bold text-[var(--text-primary)]">
                      Class Attendance Parameters
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowResetModal(true)}
                      className="text-xs text-[var(--text-secondary)] hover:text-[var(--danger)] flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reset</span>
                    </button>
                  </div>

                  {/* Optional Subject Name */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-[var(--text-primary)]">
                      Subject / Course Name <span className="text-[var(--text-tertiary)] font-normal">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      value={subjectName}
                      onChange={(e) => setSubjectName(e.target.value)}
                      placeholder="e.g. Artificial Intelligence or All Subjects Average"
                      className="h-11 px-3.5 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-primary)] text-sm text-[var(--text-primary)] outline-none focus:border-[var(--text-primary)] transition-all"
                    />
                  </div>

                  {/* Total Classes Conducted */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-[var(--text-primary)]">
                        Total Classes Conducted
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={totalSessionsInput}
                        onChange={(e) => setTotalSessionsInput(e.target.value)}
                        className="h-11 px-3.5 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-primary)] text-sm font-semibold text-[var(--text-primary)] outline-none focus:border-[var(--text-primary)] transition-all"
                        placeholder="0"
                      />
                      <span className="text-[11px] text-[var(--text-tertiary)]">Institutional schedule sessions</span>
                    </div>

                    {/* Classes Attended */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-[var(--text-primary)]">
                        Classes Attended
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={attendedInput}
                        onChange={(e) => setAttendedInput(e.target.value)}
                        className="h-11 px-3.5 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-primary)] text-sm font-semibold text-[var(--text-primary)] outline-none focus:border-[var(--text-primary)] transition-all"
                        placeholder="0"
                      />
                      <span className="text-[11px] text-[var(--text-tertiary)]">Actual attended sessions</span>
                    </div>
                  </div>

                  {/* Toggle: Faculty conducted differs from institutional */}
                  <div className="p-3.5 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-secondary)] flex flex-col gap-3">
                    <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-[var(--text-primary)]">
                      <input
                        type="checkbox"
                        checked={useFacultySessions}
                        onChange={(e) => setUseFacultySessions(e.target.checked)}
                        className="w-4 h-4 rounded text-[var(--accent)] focus:ring-0 cursor-pointer"
                      />
                      <span>Faculty sessions conducted differ from total institutional sessions</span>
                    </label>

                    {useFacultySessions && (
                      <div className="flex flex-col gap-1.5 pt-2 border-t border-[var(--border-secondary)] animate-appleFadeIn">
                        <label className="text-xs font-semibold text-[var(--text-primary)]">
                          Classes Conducted by Faculty (Denominator)
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={facultySessionsInput}
                          onChange={(e) => setFacultySessionsInput(e.target.value)}
                          className="h-10 px-3.5 rounded-xl bg-[var(--surface)] border border-[var(--border-primary)] text-sm font-semibold text-[var(--text-primary)] outline-none focus:border-[var(--text-primary)] transition-all"
                          placeholder="0"
                        />
                        <span className="text-[11px] text-amber-700 dark:text-amber-400 font-medium">
                          Using faculty sessions ({facultyConducted}) as the denominator for attendance percentage.
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Required Target Attendance Percentage */}
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-[var(--text-primary)]">
                        Required Target Attendance
                      </label>
                      <span className="text-xs font-bold text-[var(--accent)] tabular-nums">
                        {targetPercentage}%
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        min={1}
                        max={100}
                        value={targetPercentageInput}
                        onChange={(e) => setTargetPercentageInput(e.target.value)}
                        className="h-11 w-24 px-3 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-primary)] text-sm font-bold text-[var(--text-primary)] text-center outline-none focus:border-[var(--text-primary)] transition-all"
                      />

                      {/* Preset Pills */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {['75', '80', '85', '90'].map((val) => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => setTargetPercentageInput(val)}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                              targetPercentageInput === val
                                ? 'bg-[var(--button-primary)] text-[var(--button-primary-text)] shadow-xs'
                                : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                            }`}
                          >
                            {val}%
                          </button>
                        ))}
                      </div>
                    </div>
                    <span className="text-[11px] text-[var(--text-tertiary)]">
                      Set this according to your college / university examination rules.
                    </span>
                  </div>

                  {/* Validation Error Message */}
                  {hasError && (
                    <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-700 dark:text-red-400 font-semibold flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>{errorMsg}</span>
                    </div>
                  )}
                </div>

                {/* Actions & Report Generation Card */}
                <div className="apple-main-container p-6 flex flex-col gap-4 border border-[var(--border-primary)] bg-[var(--surface)] shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
                      Export & Actions
                    </span>
                    <CalculationStatus show={calcSuccess} onHide={() => setCalcSuccess(false)} />
                  </div>

                  {/* Save Calculation to Student Profile */}
                  <div className="pt-2">
                    <SaveCalculationButton
                      type="attendance"
                      defaultTitle={`Attendance — ${subjectName.trim() || 'General'} (${attendanceData.percentage !== null ? attendanceData.percentage.toFixed(1) : 0}%)`}
                      resultValue={attendanceData.percentage !== null ? `${attendanceData.percentage.toFixed(2)}%` : '0.00%'}
                      resultSummary={`${attended}/${effectiveConducted} classes attended • Target: ${targetPercentage}%`}
                      inputs={{
                        subjectName,
                        totalSessionsInput,
                        attendedInput,
                        targetPercentageInput,
                        useFacultySessions,
                        facultySessionsInput,
                      }}
                      existingCalcId={loadedCalcId}
                      onSaved={(id) => setLoadedCalcId(id)}
                      className="w-full h-11"
                    />
                  </div>

                  {/* Result Actions: Copy & Share */}
                  <ResultActionButtons
                    title={subjectName.trim() ? `Attendance - ${subjectName.trim()}` : 'Attendance Calculation'}
                    studentName={studentName}
                    items={[
                      { label: 'Subject', value: subjectName.trim() || 'General' },
                      { label: 'Classes Attended', value: `${attended}` },
                      { label: 'Classes Missed', value: `${attendanceData.missed}` },
                      { label: 'Classes Counted', value: `${effectiveConducted} (${denominatorLabel})` },
                      { label: 'Target Percentage', value: `${targetPercentage}%` },
                      { label: 'Attendance Status', value: attendanceData.statusDetails.label },
                      { label: 'Safe Missable Classes', value: `${bunkResult.maxBunk}` },
                      { label: 'Classes to Recover', value: `${recoveryResult.requiredSessions}` },
                    ]}
                    resultLabel="Attendance"
                    resultValue={attendanceData.percentage !== null ? `${attendanceData.percentage.toFixed(2)}%` : 'Insufficient Data'}
                  />

                  {/* Save to History Button */}
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={handleSaveToRecent}
                      disabled={effectiveConducted === 0 || hasError || attendanceData.percentage === null}
                      className="w-full apple-btn-secondary text-xs h-10 gap-1.5 disabled:opacity-40 flex items-center justify-center cursor-pointer"
                    >
                      <BookmarkPlus className="w-3.5 h-3.5" />
                      <span>Save to Recent Calculations</span>
                    </button>
                  </div>

                  {/* Print / Save PDF Button */}
                  <div className="pt-2 border-t border-[var(--border-secondary)]">
                    <PrintButton
                      studentName={studentName}
                      calculatorType="Attendance"
                      onValidationError={setNameError}
                      inputRef={studentNameInputRef}
                      disabled={effectiveConducted === 0 || hasError}
                    />
                  </div>

                  {/* Clear all storage data */}
                  <div className="pt-2 border-t border-[var(--border-secondary)] flex justify-end">
                    <button
                      type="button"
                      onClick={() => setShowClearAllModal(true)}
                      className="text-[11px] text-[var(--text-tertiary)] hover:text-red-500 transition-colors cursor-pointer"
                    >
                      Clear All Stored Attendance Data
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Column: Visual Summary Card & Quick Plans (6 cols) */}
              <div className="lg:col-span-6 flex flex-col gap-6">
                <AttendanceSummaryCard
                  percentage={hasError ? null : attendanceData.percentage}
                  attended={attended}
                  missed={attendanceData.missed}
                  conducted={effectiveConducted}
                  targetPercentage={targetPercentage}
                  differenceFromTarget={hasError ? null : attendanceData.differenceFromTarget}
                  statusDetails={
                    hasError
                      ? {
                          status: 'Insufficient Data',
                          label: 'Invalid Inputs',
                          badgeClass: 'bg-red-500/10 text-red-600 border-red-500/30',
                          description: errorMsg || 'Please correct inputs to calculate.',
                        }
                      : attendanceData.statusDetails
                  }
                  denominatorLabel={denominatorLabel}
                  subjectName={subjectName.trim() || undefined}
                />

                {/* Bunk Planner & Recovery Planner Cards */}
                {!hasError && (
                  <>
                    <SmartBunkPlanner
                      conducted={effectiveConducted}
                      attended={attended}
                      targetPercentage={targetPercentage}
                    />

                    <AttendanceRecoveryPlanner
                      conducted={effectiveConducted}
                      attended={attended}
                      targetPercentage={targetPercentage}
                    />
                  </>
                )}
              </div>
            </div>

            {/* Future Attendance Simulator (Full Width) */}
            {!hasError && (
              <FutureSimulator
                currentConducted={effectiveConducted}
                currentAttended={attended}
                targetPercentage={targetPercentage}
              />
            )}
          </div>
        )}

        {/* Tab 2: Subject-Wise Attendance Tracker */}
        {activeTab === 'subjects' && (
          <SubjectWiseTracker
            subjects={subjects}
            onAddSubject={handleAddSubject}
            onUpdateSubject={handleUpdateSubject}
            onDeleteSubject={handleDeleteSubject}
            onSelectSubjectForCalculator={handleSelectSubjectForCalculator}
          />
        )}

        {/* Tab 3: Attendance Calendar & Weekly Class Log */}
        {activeTab === 'calendar' && (
          <WeeklyPlannerCalendar
            entries={classLogs}
            onAddEntry={handleAddLogEntry}
            onUpdateStatus={handleUpdateLogStatus}
            onDeleteEntry={handleDeleteLogEntry}
            availableSubjectNames={subjects.map((s) => s.name)}
          />
        )}
      </div>

      {/* Dedicated A4 Print Report for Attendance */}
      <AcademicPrintReport
        reportTitle="Attendance Planning Report"
        calculatorName="Smart Attendance Planner"
        reportType="ATTENDANCE"
        studentName={studentName}
        profile={profile}
        resultLabel="ATTENDANCE PERCENTAGE"
        resultValue={attendanceData.percentage !== null ? `${attendanceData.percentage.toFixed(2)}%` : 'N/A'}
        resultSubtext={`${attended} of ${effectiveConducted} sessions attended • Status: ${attendanceData.statusDetails.label}`}
        formulaTitle="Attendance Calculation Summary"
        formulaRule="Formula: Attendance % = (Classes Attended ÷ Classes Conducted) × 100"
        formulaCalculation={
          effectiveConducted > 0
            ? `${attended} ÷ ${effectiveConducted} × 100 = ${attendanceData.percentage?.toFixed(2)}%`
            : 'No sessions conducted'
        }
        isEmpty={effectiveConducted === 0 || hasError}
        emptyNotice="Please enter conducted sessions and attended sessions before generating or printing your report."
      >
        <div className="flex flex-col gap-4">
          <table className="w-full text-left border-collapse border border-[#D2D2D7]">
            <thead>
              <tr className="bg-[#F5F5F7] border-b-2 border-[#D2D2D7]">
                <th className="py-2.5 px-3 text-[12px] font-bold text-[#1D1D1F] uppercase">Parameter</th>
                <th className="py-2.5 px-3 text-[12px] font-bold text-[#1D1D1F] uppercase text-right w-[180px]">Session Data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E5EA] text-[13px]">
              {subjectName.trim() && (
                <tr>
                  <td className="py-2.5 px-3 font-medium text-[#1D1D1F]">Subject / Course</td>
                  <td className="py-2.5 px-3 text-right font-semibold text-[#1D1D1F]">{subjectName.trim()}</td>
                </tr>
              )}
              <tr>
                <td className="py-2.5 px-3 font-medium text-[#1D1D1F]">Classes Conducted ({denominatorLabel})</td>
                <td className="py-2.5 px-3 text-right font-semibold text-[#1D1D1F] tabular-nums font-mono">{effectiveConducted}</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-medium text-[#1D1D1F]">Classes Attended</td>
                <td className="py-2.5 px-3 text-right font-semibold text-[#1D1D1F] tabular-nums font-mono">{attended}</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-medium text-[#1D1D1F]">Classes Missed</td>
                <td className="py-2.5 px-3 text-right font-semibold text-[#1D1D1F] tabular-nums font-mono">{attendanceData.missed}</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-medium text-[#1D1D1F]">Configured Target Attendance</td>
                <td className="py-2.5 px-3 text-right font-semibold text-[#1D1D1F] tabular-nums font-mono">{targetPercentage}%</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-medium text-[#1D1D1F]">Safe Absence Buffer (Consecutive Bunks)</td>
                <td className="py-2.5 px-3 text-right font-semibold text-[#1D1D1F] tabular-nums font-mono">{bunkResult.maxBunk} classes</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-medium text-[#1D1D1F]">Classes Required to Recover Target</td>
                <td className="py-2.5 px-3 text-right font-semibold text-[#1D1D1F] tabular-nums font-mono">
                  {recoveryResult.requiredSessions === Infinity ? 'Unattainable' : `${recoveryResult.requiredSessions} classes`}
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr className="bg-[#FAFAFA] font-bold border-t-2 border-[#D2D2D7]">
                <td className="py-3 px-3 text-[#1D1D1F]">ATTENDANCE STATUS</td>
                <td className="py-3 px-3 text-right text-[14px] text-[#1D1D1F]">
                  {attendanceData.statusDetails.label}
                </td>
              </tr>
            </tfoot>
          </table>

          {/* Subject Tracker Summary in Print Report if multiple subjects tracked */}
          {subjects.length > 0 && (
            <div className="mt-4 flex flex-col gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#1D1D1F]">
                Course-Wise Breakdown
              </span>
              <table className="w-full text-left border-collapse border border-[#D2D2D7]">
                <thead>
                  <tr className="bg-[#F5F5F7] border-b-2 border-[#D2D2D7] text-[11px]">
                    <th className="py-2 px-2.5 font-bold text-[#1D1D1F] uppercase">Subject Name</th>
                    <th className="py-2 px-2.5 font-bold text-[#1D1D1F] uppercase text-center w-[75px]">Attended</th>
                    <th className="py-2 px-2.5 font-bold text-[#1D1D1F] uppercase text-center w-[85px]">Conducted</th>
                    <th className="py-2 px-2.5 font-bold text-[#1D1D1F] uppercase text-center w-[70px]">Target</th>
                    <th className="py-2 px-2.5 font-bold text-[#1D1D1F] uppercase text-right w-[85px]">Current %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E5EA] text-[12px]">
                  {subjects.map((sub) => {
                    const pct = sub.conducted > 0 ? (sub.attended / sub.conducted) * 100 : null;
                    return (
                      <tr key={sub.id}>
                        <td className="py-2 px-2.5 font-medium text-[#1D1D1F]">{sub.name}</td>
                        <td className="py-2 px-2.5 text-center font-mono">{sub.attended}</td>
                        <td className="py-2 px-2.5 text-center font-mono">{sub.conducted}</td>
                        <td className="py-2 px-2.5 text-center font-mono">{sub.targetPercentage}%</td>
                        <td className="py-2 px-2.5 text-right font-bold font-mono">
                          {pct !== null ? `${pct.toFixed(1)}%` : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </AcademicPrintReport>

      {/* Reset Confirmation Modal */}
      <ResetConfirmModal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
        onConfirm={handleReset}
        title="Reset Attendance Planner?"
        description="Are you sure you want to reset current attendance inputs to default values? This action cannot be undone."
      />

      {/* Clear All Stored Data Confirmation Modal */}
      <ResetConfirmModal
        isOpen={showClearAllModal}
        onClose={() => setShowClearAllModal(false)}
        onConfirm={handleClearAllData}
        title="Clear All Stored Attendance Data?"
        description="This will permanently delete all saved subjects, weekly logs, and drafts from your local browser storage. Are you sure?"
      />
    </>
  );
};
