import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, RotateCcw, BookmarkPlus, Calendar } from 'lucide-react';
import {
  calculateAttendance,
  calculateRequiredAttendance,
  calculateProjectedAttendance,
  formatFixed,
} from '../utils/calculations';
import { PrintButton } from '../components/common/PrintButton';
import { AcademicPrintReport } from '../components/common/AcademicPrintReport';
import { useStudentProfile } from '../hooks/useStudentProfile';
import { StudentNameInput } from '../components/common/StudentNameInput';
import { ResultActionButtons } from '../components/common/ResultActionButtons';
import { saveRecentCalculation } from '../utils/recentCalculations';

interface AttendanceRecord {
  id: string;
  date: string;
  totalSessions: number;
  facultySessions: number;
  attended: number;
  absent: number;
  percentage: number;
}

export const AttendancePage: React.FC = () => {
  const { profile, studentName, setStudentName, updateProfile, nameError, setNameError } = useStudentProfile();
  const studentNameInputRef = useRef<HTMLInputElement>(null);

  // Primary inputs defaulted to 0
  const [totalSessionsInput, setTotalSessionsInput] = useState<string>('0');
  const [facultySessionsInput, setFacultySessionsInput] = useState<string>('0');
  const [attendedInput, setAttendedInput] = useState<string>('0');

  // Error message state
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Planning expandable state
  const [planExpanded, setPlanExpanded] = useState<boolean>(false);
  const [targetPercentageInput, setTargetPercentageInput] = useState<string>('75');
  const [futureSessionsInput, setFutureSessionsInput] = useState<string>('0');
  const [futureAbsencesInput, setFutureAbsencesInput] = useState<string>('0');

  // History state saved in localStorage
  const [history, setHistory] = useState<AttendanceRecord[]>(() => {
    try {
      const saved = localStorage.getItem('academic_attendance_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('academic_attendance_history', JSON.stringify(history));
    } catch {
      // ignore
    }
  }, [history]);

  // Numeric parsing
  const totalSessions = parseFloat(totalSessionsInput) || 0;
  const facultySessions = parseFloat(facultySessionsInput) || 0;
  const attended = parseFloat(attendedInput) || 0;

  // Validation logic - zero is a valid default, not an error
  useEffect(() => {
    if (totalSessions < 0 || facultySessions < 0 || attended < 0) {
      setErrorMsg('Session counts cannot be negative.');
    } else if (totalSessions > 0 && facultySessions > totalSessions) {
      setErrorMsg('Faculty sessions cannot exceed total sessions.');
    } else if (facultySessions > 0 && attended > facultySessions) {
      setErrorMsg('Sessions attended cannot exceed faculty sessions.');
    } else {
      setErrorMsg(null);
    }
  }, [totalSessions, facultySessions, attended]);

  // Valid calculation result
  const isValid = !errorMsg && attended <= (facultySessions || 0);
  const attendanceResult = calculateAttendance({ totalSessions, facultySessions, attended });

  // Status Indicator
  const getAttendanceStatus = (pct: number) => {
    if (pct >= 90) return { label: 'Excellent Attendance', style: 'text-emerald-700 dark:text-emerald-400' };
    if (pct >= 85) return { label: 'Good Attendance', style: 'text-emerald-700 dark:text-emerald-400' };
    if (pct >= 75) return { label: 'Attendance Requirement Range', style: 'text-amber-700 dark:text-amber-400' };
    return { label: 'Below 75%', style: 'text-red-700 dark:text-red-400' };
  };

  const status = getAttendanceStatus(attendanceResult.percentage);

  // Target Attendance Projection
  const targetPct = parseFloat(targetPercentageInput) || 75;
  const targetCalc = isValid && facultySessions > 0
    ? calculateRequiredAttendance({
        currentAttended: attended,
        currentFacultySessions: facultySessions,
        targetPercentage: targetPct,
      })
    : { requiredSessions: 0, projectedPercentage: 0 };

  // Future Absences Projection
  const futureSessions = parseFloat(futureSessionsInput) || 0;
  const futureAbsences = parseFloat(futureAbsencesInput) || 0;
  const futureCalc = isValid
    ? calculateProjectedAttendance({
        attended,
        facultySessions,
        futureSessions,
        futureAbsences,
      })
    : { futureAttended: attended, futureTotal: facultySessions, projectedPercentage: attendanceResult.percentage };

  // Save result to history
  const handleSaveResult = () => {
    if (!isValid || facultySessions === 0) return;
    const newRecord: AttendanceRecord = {
      id: `att-${Date.now()}`,
      date: new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }),
      totalSessions,
      facultySessions,
      attended,
      absent: attendanceResult.absent,
      percentage: attendanceResult.percentage,
    };
    setHistory((prev) => [newRecord, ...prev.slice(0, 9)]);
  };

  // Reset action - sets everything to 0
  const handleReset = () => {
    setTotalSessionsInput('0');
    setFacultySessionsInput('0');
    setAttendedInput('0');
    setTargetPercentageInput('75');
    setFutureSessionsInput('0');
    setFutureAbsencesInput('0');
    setErrorMsg(null);
  };

  return (
    <>
      <div className="apple-page-enter flex flex-col gap-8 max-w-[1200px] mx-auto print:hidden">
        {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-[32px] sm:text-[40px] font-semibold tracking-tight text-[var(--text-primary)]">
          Attendance
        </h1>
        <p className="text-[17px] text-[var(--text-secondary)]">
          Calculate your current attendance percentage.
        </p>
      </div>

      {/* Main Grid: Form LEFT, Result RIGHT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Form: 7 cols */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          {/* Student Name Input */}
          <StudentNameInput
            value={studentName}
            onChange={setStudentName}
            errorMessage={nameError}
            inputRef={studentNameInputRef}
            profile={profile}
            onProfileChange={updateProfile}
          />

          <div className="apple-main-container p-6 sm:p-8 flex flex-col gap-6">
            <div className="flex items-center justify-between border-b border-[var(--border-primary)] pb-4">
              <span className="text-sm font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                Session Counts
              </span>
              <button
                type="button"
                onClick={handleReset}
                className="text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset to 0</span>
              </button>
            </div>

            {/* Error banner if validation fails */}
            {errorMsg && (
              <div
                role="alert"
                className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-[var(--danger)] text-sm font-semibold animate-appleFadeIn"
              >
                {errorMsg}
              </div>
            )}

            {/* Input 1: Total Sessions */}
            <div className="flex flex-col gap-2">
              <label htmlFor="total-sessions" className="apple-label">
                Total Sessions
              </label>
              <input
                id="total-sessions"
                type="number"
                inputMode="decimal"
                min={0}
                placeholder="0"
                value={totalSessionsInput}
                onChange={(e) => setTotalSessionsInput(e.target.value)}
                className="apple-input"
              />
              <span className="text-xs text-[var(--text-secondary)]">
                Total sessions shown for the subject.
              </span>
            </div>

            {/* Input 2: Faculty Sessions */}
            <div className="flex flex-col gap-2">
              <label htmlFor="faculty-sessions" className="apple-label">
                Faculty Sessions
              </label>
              <input
                id="faculty-sessions"
                type="number"
                inputMode="decimal"
                min={0}
                placeholder="0"
                value={facultySessionsInput}
                onChange={(e) => setFacultySessionsInput(e.target.value)}
                className="apple-input"
              />
              <span className="text-xs text-[var(--text-secondary)]">
                Sessions actually conducted/taken by faculty.
              </span>
            </div>

            {/* Input 3: Sessions Attended */}
            <div className="flex flex-col gap-2">
              <label htmlFor="sessions-attended" className="apple-label">
                Sessions Attended
              </label>
              <input
                id="sessions-attended"
                type="number"
                inputMode="decimal"
                min={0}
                placeholder="0"
                value={attendedInput}
                onChange={(e) => setAttendedInput(e.target.value)}
                className="apple-input"
              />
              <span className="text-xs text-[var(--text-secondary)]">
                Number of faculty sessions you attended.
              </span>
            </div>

            {/* Primary Calculate Attendance Button */}
            <div className="pt-2 border-t border-[var(--border-primary)]">
              <button
                type="button"
                className="apple-btn-primary w-full h-[52px]"
                onClick={() => {
                  if (isValid && facultySessions > 0) {
                    saveRecentCalculation({
                      type: 'attendance',
                      title: 'Attendance Calculation',
                      value: `${formatFixed(attendanceResult.percentage, 2)}%`,
                      subtext: `${attended} / ${facultySessions} Attended • ${status.label}`,
                      route: '/attendance',
                    });
                  }
                  const el = document.getElementById('attendance-result-section');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                Calculate Attendance
              </button>
            </div>
          </div>

          {/* Expandable Planning Section: Plan your attendance */}
          <div className="apple-main-container p-6 flex flex-col gap-4">
            <button
              type="button"
              onClick={() => setPlanExpanded((prev) => !prev)}
              className="flex items-center justify-between text-base font-semibold text-[var(--text-primary)]"
              aria-expanded={planExpanded}
            >
              <span>Plan your attendance</span>
              <ChevronDown
                className={`w-4 h-4 text-[var(--text-tertiary)] transition-transform ${
                  planExpanded ? 'rotate-180' : ''
                }`}
              />
            </button>

            {planExpanded && (
              <div className="pt-4 border-t border-[var(--border-secondary)] flex flex-col gap-6 text-sm animate-appleFadeIn">
                {/* 1. Target Attendance */}
                <div className="flex flex-col gap-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                    1. Target Attendance
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="target-pct" className="apple-label text-xs">
                        Target Attendance %
                      </label>
                      <input
                        id="target-pct"
                        type="number"
                        inputMode="decimal"
                        min={1}
                        max={100}
                        value={targetPercentageInput}
                        onChange={(e) => setTargetPercentageInput(e.target.value)}
                        className="apple-input h-11 text-sm"
                      />
                    </div>
                    <div className="p-3.5 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-primary)] text-xs">
                      {isValid && (
                        <div>
                          <div>
                            Target: <strong className="text-[var(--text-primary)]">{targetPct}%</strong>
                          </div>
                          <div className="mt-1">
                            Future Sessions Needed:{' '}
                            <strong className="text-[var(--text-primary)] text-sm">
                              {facultySessions === 0 ? '0' : (targetCalc.requiredSessions === Infinity ? 'Unreachable' : targetCalc.requiredSessions)}
                            </strong>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 2. Future Absence Projection */}
                <div className="flex flex-col gap-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                    2. Planned Future Absences
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="future-sessions" className="apple-label text-xs">
                        Upcoming Faculty Sessions
                      </label>
                      <input
                        id="future-sessions"
                        type="number"
                        inputMode="decimal"
                        min={0}
                        value={futureSessionsInput}
                        onChange={(e) => setFutureSessionsInput(e.target.value)}
                        className="apple-input h-11 text-sm"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="future-absences" className="apple-label text-xs">
                        Planned Future Absences
                      </label>
                      <input
                        id="future-absences"
                        type="number"
                        inputMode="decimal"
                        min={0}
                        value={futureAbsencesInput}
                        onChange={(e) => setFutureAbsencesInput(e.target.value)}
                        className="apple-input h-11 text-sm"
                      />
                    </div>
                  </div>

                  {isValid && (
                    <div className="p-3.5 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-primary)] flex items-center justify-between text-xs">
                      <span className="text-[var(--text-secondary)] font-medium">
                        Projected Attendance ({futureCalc.futureAttended} / {futureCalc.futureTotal})
                      </span>
                      <span className="font-bold text-[var(--text-primary)] text-sm tabular-nums">
                        {formatFixed(futureCalc.projectedPercentage, 2)}%
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Attendance History */}
          {history.length > 0 && (
            <div className="apple-main-container p-6 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                  Recent Calculations
                </span>
                <button
                  type="button"
                  onClick={() => setHistory([])}
                  className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                >
                  Clear History
                </button>
              </div>
              <div className="flex flex-col divide-y divide-[var(--border-secondary)] text-xs">
                {history.map((item) => (
                  <div key={item.id} className="py-2.5 flex items-center justify-between first:pt-1 last:pb-1">
                    <div className="flex flex-col">
                      <span className="font-semibold text-[var(--text-primary)] text-sm">
                        {formatFixed(item.percentage, 2)}%
                      </span>
                      <span className="text-[var(--text-secondary)]">
                        {item.attended} / {item.facultySessions} attended • {item.absent} absent
                      </span>
                    </div>
                    <span className="text-[var(--text-secondary)] text-[11px] flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{item.date}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Result Panel: 5 cols (Sticky on desktop) */}
        <div id="attendance-result-section" className="lg:col-span-5 lg:sticky lg:top-24">
          <div className="apple-result-card flex flex-col gap-6">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                ATTENDANCE PERCENTAGE
              </span>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-[44px] sm:text-[56px] font-bold tracking-tight text-[var(--text-primary)] tabular-nums leading-none">
                  {formatFixed(attendanceResult.percentage, 2)}%
                </span>
              </div>
              <div className="text-[15px] font-medium text-[var(--text-secondary)] mt-2 tabular-nums">
                {`${attendanceResult.attended} / ${attendanceResult.facultySessions} attended`}
              </div>
            </div>

            {/* Apple Monochrome Progress Bar */}
            <div className="w-full bg-[var(--border-secondary)] h-3 rounded-full overflow-hidden border border-[var(--border-primary)]">
              <div
                className="bg-[var(--button-primary)] h-full rounded-full transition-all duration-300"
                style={{
                  width: `${Math.min(100, Math.max(0, attendanceResult.percentage))}%`,
                }}
              />
            </div>

            {/* Attendance Status Badge */}
            <div className="flex items-center justify-between text-xs pt-1">
              <span className={`font-semibold ${status.style}`}>{status.label}</span>
              <span className="text-[var(--text-secondary)] text-[11px]">
                {attendanceResult.percentage >= 75 ? 'Requirement range' : 'Under 75%'}
              </span>
            </div>

            {/* Summary Breakdown Table */}
            <div className="border-t border-[var(--border-primary)] pt-4 flex flex-col divide-y divide-[var(--border-secondary)] text-sm">
              <div className="flex justify-between py-2.5">
                <span className="text-[var(--text-secondary)] font-medium">Total Sessions</span>
                <span className="font-semibold text-[var(--text-primary)] tabular-nums">
                  {totalSessions}
                </span>
              </div>
              <div className="flex justify-between py-2.5">
                <span className="text-[var(--text-secondary)] font-medium">Faculty Sessions</span>
                <span className="font-semibold text-[var(--text-primary)] tabular-nums">
                  {facultySessions}
                </span>
              </div>
              <div className="flex justify-between py-2.5">
                <span className="text-[var(--text-secondary)] font-medium">Attended</span>
                <span className="font-semibold text-[var(--text-primary)] tabular-nums">
                  {attended}
                </span>
              </div>
              <div className="flex justify-between py-2.5">
                <span className="text-[var(--text-secondary)] font-medium">Absent</span>
                <span className="font-semibold text-[var(--text-primary)] tabular-nums">
                  {attendanceResult.absent}
                </span>
              </div>
            </div>

            {/* Result Action Buttons: Copy & Share */}
            <div className="pt-2">
              <ResultActionButtons
                title="Attendance Calculation"
                studentName={studentName}
                items={[
                  { label: 'Total Sessions', value: `${totalSessions}` },
                  { label: 'Faculty Sessions', value: `${facultySessions}` },
                  { label: 'Attended Sessions', value: `${attended}` },
                  { label: 'Absent Sessions', value: `${attendanceResult.absent}` },
                  { label: 'Attendance Status', value: status.label },
                ]}
                resultLabel="Attendance"
                resultValue={`${formatFixed(attendanceResult.percentage, 2)}%`}
              />
            </div>

            {/* Save to History Button */}
            <div className="pt-1">
              <button
                type="button"
                onClick={handleSaveResult}
                disabled={facultySessions === 0}
                className="w-full apple-btn-secondary text-xs h-10 gap-1.5 disabled:opacity-40"
              >
                <BookmarkPlus className="w-3.5 h-3.5" />
                <span>Save to Local History</span>
              </button>
            </div>

            {/* Formula box */}
            <div className="rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-primary)] p-4 text-xs text-[var(--text-primary)] font-mono leading-relaxed">
              <strong className="block mb-1 text-[13px] text-[var(--text-primary)]">Calculation Rule:</strong>
              <div>Percentage = (Sessions Attended ÷ Faculty Sessions) × 100</div>
              <div className="mt-1 font-semibold">
                {attended} ÷ {facultySessions || 0} × 100 = {formatFixed(attendanceResult.percentage, 2)}%
              </div>
            </div>

            {/* Print / Save PDF Action Button */}
            <div className="pt-2">
              <PrintButton
                studentName={studentName}
                calculatorType="Attendance"
                onValidationError={setNameError}
                inputRef={studentNameInputRef}
                disabled={facultySessions === 0}
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* Dedicated A4 Print Report */}
    <AcademicPrintReport
      reportTitle="Attendance Report"
      calculatorName="Attendance Calculator"
      studentName={studentName}
      profile={profile}
      resultLabel="ATTENDANCE PERCENTAGE"
      resultValue={`${formatFixed(attendanceResult.percentage, 2)}%`}
      resultSubtext={`${attended} / ${facultySessions} sessions attended • ${status.label}`}
      formulaTitle="Attendance Calculation Summary"
      formulaRule="Formula: (Sessions Attended ÷ Faculty Sessions) × 100"
      formulaCalculation={`${attended} ÷ ${facultySessions || 0} × 100 = ${formatFixed(attendanceResult.percentage, 2)}%`}
      isEmpty={facultySessions === 0}
      emptyNotice="Please enter total faculty sessions and attended sessions before printing."
    >
      <table className="w-full text-left border-collapse border border-[#D2D2D7]">
        <thead>
          <tr className="bg-[#F5F5F7] border-b-2 border-[#D2D2D7]">
            <th className="py-2.5 px-3 text-[12px] font-bold text-[#1D1D1F] uppercase">Session Category</th>
            <th className="py-2.5 px-3 text-[12px] font-bold text-[#1D1D1F] uppercase text-right w-[180px]">Sessions Count</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#E5E5EA] text-[13px]">
          <tr>
            <td className="py-2.5 px-3 font-medium text-[#1D1D1F]">Total Sessions (Course Syllabus Schedule)</td>
            <td className="py-2.5 px-3 text-right font-semibold text-[#1D1D1F] tabular-nums font-mono">{totalSessions}</td>
          </tr>
          <tr>
            <td className="py-2.5 px-3 font-medium text-[#1D1D1F]">Faculty Sessions (Conducted by Faculty)</td>
            <td className="py-2.5 px-3 text-right font-semibold text-[#1D1D1F] tabular-nums font-mono">{facultySessions}</td>
          </tr>
          <tr>
            <td className="py-2.5 px-3 font-medium text-[#1D1D1F]">Sessions Attended</td>
            <td className="py-2.5 px-3 text-right font-semibold text-[#1D1D1F] tabular-nums font-mono">{attended}</td>
          </tr>
          <tr>
            <td className="py-2.5 px-3 font-medium text-[#1D1D1F]">Sessions Absent</td>
            <td className="py-2.5 px-3 text-right font-semibold text-[#1D1D1F] tabular-nums font-mono">{attendanceResult.absent}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr className="bg-[#FAFAFA] font-bold border-t-2 border-[#D2D2D7]">
            <td className="py-3 px-3 text-[#1D1D1F]">ATTENDANCE STATUS</td>
            <td className="py-3 px-3 text-right text-[14px] text-[#1D1D1F]">
              {status.label}
            </td>
          </tr>
        </tfoot>
      </table>
    </AcademicPrintReport>
    </>
  );
};
