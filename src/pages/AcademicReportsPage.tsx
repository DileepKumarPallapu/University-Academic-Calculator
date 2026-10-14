import React, { useState, useEffect, useMemo } from 'react';
import {
  Printer,
  Percent,
  Calculator,
  Award,
  GraduationCap,
} from 'lucide-react';
import { useProfile } from '../context/ProfileContext';
import { safeGetItem } from '../services/catalogueStorage';
import { getAmsDashboardData, calculateAmsAttendancePercentage } from '../services/amsStorage';
import { getCalculationsByProfile } from '../services/db';

type ReportSection = 'all' | 'attendance' | 'internals' | 'gpa' | 'credits';

export const AcademicReportsPage: React.FC = () => {
  const { activeProfile } = useProfile();

  const [selectedSection, setSelectedSection] = useState<ReportSection>('all');

  // Load profile-isolated datasets
  const [attendanceData, setAttendanceData] = useState<any[]>([]);
  const [internalsData, setInternalsData] = useState<any[]>([]);
  const [semesterResults, setSemesterResults] = useState<any[]>([]);
  const [creditSubjects, setCreditSubjects] = useState<any[]>([]);
  const [savedCalcs, setSavedCalcs] = useState<any[]>([]);

  useEffect(() => {
    const profileId = activeProfile.id;

    // 1. AMS Dashboard
    const ams = getAmsDashboardData(profileId);
    setInternalsData(ams.internalMarks || []);
    setSemesterResults(ams.semesterResults || []);

    // 2. Attendance (From Attendance page or AMS)
    const rawAtt = safeGetItem(`academic_attendance_subjects_${profileId}`);
    if (rawAtt) {
      try {
        const parsed = JSON.parse(rawAtt);
        setAttendanceData(parsed.length > 0 ? parsed : ams.attendance);
      } catch {
        setAttendanceData(ams.attendance || []);
      }
    } else {
      setAttendanceData(ams.attendance || []);
    }

    // 3. Credits
    const rawCred = safeGetItem(`academic_credits_subjects_${profileId}`);
    if (rawCred) {
      try {
        setCreditSubjects(JSON.parse(rawCred));
      } catch {
        setCreditSubjects([]);
      }
    } else {
      setCreditSubjects([]);
    }

    // 4. Calculations
    getCalculationsByProfile(profileId).then((calcs) => {
      setSavedCalcs(calcs);
    });
  }, [activeProfile.id]);

  // Derived GPA stats
  // Derived GPA stats
  const sgpaCalcs = useMemo(() => {
    return savedCalcs.filter((c) => c.type === 'sgpa');
  }, [savedCalcs]);

  // Derived Credits stats
  const totalEarnedCredits = useMemo(() => {
    let earned = 0;
    for (const c of creditSubjects) {
      const cr = Number(c.credits) || 0;
      if (c.status === 'Passed' || c.earnedCredits > 0) {
        earned += c.earnedCredits !== undefined ? Number(c.earnedCredits) : cr;
      }
    }
    return earned;
  }, [creditSubjects]);

  const targetAttendance = activeProfile.targetAttendance || 75;
  const targetCredits = activeProfile.customGraduationCredits || 160;

  // Print Report Handler
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="w-full max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-8 animate-appleFadeIn">
      {/* 1. Header (No Print on print) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border-secondary)] pb-6 no-print">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-black/5 dark:bg-white/10 text-[var(--text-secondary)]">
              {activeProfile.name} • {activeProfile.regulation}
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              Verified Academic Report
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)]">
            Academic Performance Reports
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1">
            Official summary of attendance, internal evaluations, GPA transcripts, and degree credit progress.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrint}
            className="apple-btn-primary text-xs h-9 px-4 gap-2 font-medium shrink-0"
          >
            <Printer className="w-4 h-4" />
            <span>Print / Save PDF</span>
          </button>
        </div>
      </div>

      {/* 2. Section Selector (No Print) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-[var(--border-secondary)] text-xs no-print">
        {(
          [
            { id: 'all', label: 'All Reports' },
            { id: 'attendance', label: 'Attendance Report' },
            { id: 'internals', label: 'Internal Marks' },
            { id: 'gpa', label: 'SGPA & CGPA' },
            { id: 'credits', label: 'Credit Progress' },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setSelectedSection(tab.id)}
            className={`px-3.5 py-2 rounded-xl font-semibold transition-all whitespace-nowrap ${
              selectedSection === tab.id
                ? 'bg-black text-white dark:bg-white dark:text-black shadow-xs'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 3. REPORT DOCUMENT CONTAINER (Designed for Screen & Print) */}
      <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border-primary)] shadow-sm p-6 sm:p-10 flex flex-col gap-8 text-[var(--text-primary)] print:border-none print:shadow-none print:p-0">
        {/* Document University Letterhead */}
        <div className="border-b-2 border-black dark:border-white pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-[10px] uppercase font-bold tracking-wider text-[var(--text-secondary)]">
              Official Student Academic Performance Record
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)] mt-1">
              {activeProfile.collegeName || 'Vel Tech Rangarajan Dr. Sagunthala R&D Institute of Science and Technology'}
            </h2>
            <div className="text-xs text-[var(--text-secondary)] mt-1">
              Degree: {activeProfile.degree} in {activeProfile.department || activeProfile.branch} • Regulation: {activeProfile.regulation}
            </div>
          </div>

          <div className="text-left sm:text-right text-xs text-[var(--text-secondary)]">
            <div className="font-semibold text-sm text-[var(--text-primary)]">
              {activeProfile.name}
            </div>
            <div>Register No: {activeProfile.rollNumber || 'Not Registered'}</div>
            <div>Current Semester: {activeProfile.currentSemester || 5}</div>
            <div className="text-[10px] text-[var(--text-tertiary)] mt-1">
              Generated: {new Date().toLocaleDateString()}
            </div>
          </div>
        </div>

        {/* SECTION A: ATTENDANCE REPORT */}
        {(selectedSection === 'all' || selectedSection === 'attendance') && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-[var(--border-secondary)] pb-2">
              <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
                <Percent className="w-4 h-4 text-blue-500" />
                <span>Attendance Verification Report</span>
              </h3>
              <span className="text-xs text-[var(--text-secondary)]">
                Target: {targetAttendance}% Minimum
              </span>
            </div>

            {attendanceData.length === 0 ? (
              <div className="p-6 rounded-xl bg-[var(--bg-tertiary)]/50 text-center text-xs text-[var(--text-secondary)]">
                No attendance data recorded. Connect College AMS or enter records in the Attendance Planner.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--border-secondary)] text-[var(--text-secondary)] font-semibold uppercase tracking-wider text-[10px]">
                      <th className="py-2.5 px-3">Subject</th>
                      <th className="py-2.5 px-3">Total Sessions</th>
                      <th className="py-2.5 px-3">Present</th>
                      <th className="py-2.5 px-3">Absent</th>
                      <th className="py-2.5 px-3">Attendance %</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-right">Data Source</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-secondary)]">
                    {attendanceData.map((item, idx) => {
                      const total = item.officialTotalSessions || item.totalSessions || 0;
                      const present = item.presentSessions || item.attendedSessions || 0;
                      const absent = item.absentSessions !== undefined ? item.absentSessions : Math.max(0, total - present);
                      const pct = calculateAmsAttendancePercentage(total, present);

                      return (
                        <tr key={item.id || idx}>
                          <td className="py-2.5 px-3 font-semibold text-[var(--text-primary)]">
                            {item.subjectName || item.name}
                            {item.courseCode && (
                              <span className="font-mono text-[10px] text-[var(--text-secondary)] block">
                                {item.courseCode}
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 tabular-nums">{total}</td>
                          <td className="py-2.5 px-3 tabular-nums text-emerald-600 dark:text-emerald-400 font-semibold">
                            {present}
                          </td>
                          <td className="py-2.5 px-3 tabular-nums text-red-600 dark:text-red-400">
                            {absent}
                          </td>
                          <td className="py-2.5 px-3 font-bold tabular-nums">
                            {pct !== null ? `${pct}%` : '—'}
                          </td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                pct !== null && pct >= targetAttendance
                                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                  : 'bg-red-500/10 text-red-600 dark:text-red-400'
                              }`}
                            >
                              {pct !== null && pct >= targetAttendance ? 'Eligible' : 'Shortage'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-zinc-100 dark:bg-zinc-800 text-[var(--text-secondary)]">
                              {item.source || 'Manual Entry'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* SECTION B: INTERNAL MARKS REPORT */}
        {(selectedSection === 'all' || selectedSection === 'internals') && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-[var(--border-secondary)] pb-2">
              <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
                <Calculator className="w-4 h-4 text-purple-500" />
                <span>Internal Marks & Evaluation Report</span>
              </h3>
            </div>

            {internalsData.length === 0 ? (
              <div className="p-6 rounded-xl bg-[var(--bg-tertiary)]/50 text-center text-xs text-[var(--text-secondary)]">
                No internal marks synced. Connect College AMS to retrieve official internal assessment records.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--border-secondary)] text-[var(--text-secondary)] font-semibold uppercase tracking-wider text-[10px]">
                      <th className="py-2.5 px-3">Subject</th>
                      <th className="py-2.5 px-3">Assessment Type</th>
                      <th className="py-2.5 px-3">Marks Obtained</th>
                      <th className="py-2.5 px-3">Maximum</th>
                      <th className="py-2.5 px-3">Percentage</th>
                      <th className="py-2.5 px-3 text-right">Provenance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-secondary)]">
                    {internalsData.map((item, idx) => {
                      const pct = item.maxMarks > 0 ? Math.round((item.marksObtained / item.maxMarks) * 100) : 0;
                      return (
                        <tr key={item.id || idx}>
                          <td className="py-2.5 px-3 font-semibold text-[var(--text-primary)]">
                            {item.subjectName}
                            {item.courseCode && (
                              <span className="font-mono text-[10px] text-[var(--text-secondary)] block">
                                {item.courseCode}
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-[var(--text-secondary)]">
                            {item.assessmentType}
                          </td>
                          <td className="py-2.5 px-3 font-bold tabular-nums text-purple-600 dark:text-purple-400">
                            {item.marksObtained}
                          </td>
                          <td className="py-2.5 px-3 tabular-nums text-[var(--text-secondary)]">
                            {item.maxMarks}
                          </td>
                          <td className="py-2.5 px-3 font-bold tabular-nums">
                            {pct}%
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400">
                              {item.source || 'Official AMS'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* SECTION C: SGPA / CGPA TRANSCRIPT */}
        {(selectedSection === 'all' || selectedSection === 'gpa') && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-[var(--border-secondary)] pb-2">
              <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-500" />
                <span>GPA & Semester Results Summary</span>
              </h3>
            </div>

            {semesterResults.length === 0 && sgpaCalcs.length === 0 ? (
              <div className="p-6 rounded-xl bg-[var(--bg-tertiary)]/50 text-center text-xs text-[var(--text-secondary)]">
                No GPA or examination results recorded. Calculate SGPA/CGPA or import from College AMS.
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {semesterResults.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-[var(--border-secondary)] text-[var(--text-secondary)] font-semibold uppercase tracking-wider text-[10px]">
                          <th className="py-2.5 px-3">Sem</th>
                          <th className="py-2.5 px-3">Course Title</th>
                          <th className="py-2.5 px-3">Credits</th>
                          <th className="py-2.5 px-3">Grade</th>
                          <th className="py-2.5 px-3">Status</th>
                          <th className="py-2.5 px-3 text-right">Source</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border-secondary)]">
                        {semesterResults.map((r, idx) => (
                          <tr key={r.id || idx}>
                            <td className="py-2.5 px-3 tabular-nums font-semibold">Sem {r.semester}</td>
                            <td className="py-2.5 px-3 font-semibold text-[var(--text-primary)]">
                              {r.courseName}
                            </td>
                            <td className="py-2.5 px-3 tabular-nums">{r.credits}</td>
                            <td className="py-2.5 px-3 font-bold text-amber-600 dark:text-amber-400">
                              {r.grade}
                            </td>
                            <td className="py-2.5 px-3">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                  r.status === 'Pass'
                                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                    : 'bg-red-500/10 text-red-600 dark:text-red-400'
                                }`}
                              >
                                {r.status}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400">
                                {r.source || 'Official AMS'}
                              </span>
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
        )}

        {/* SECTION D: CREDIT PROGRESS REPORT */}
        {(selectedSection === 'all' || selectedSection === 'credits') && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-[var(--border-secondary)] pb-2">
              <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-emerald-500" />
                <span>Credit Accumulation & Graduation Audit</span>
              </h3>
              <span className="text-xs text-[var(--text-secondary)]">
                Earned: {totalEarnedCredits} / {targetCredits} Credits
              </span>
            </div>

            {creditSubjects.length === 0 ? (
              <div className="p-6 rounded-xl bg-[var(--bg-tertiary)]/50 text-center text-xs text-[var(--text-secondary)]">
                No credit records found. Manage your curriculum requirements in the Credits Planner.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--border-secondary)] text-[var(--text-secondary)] font-semibold uppercase tracking-wider text-[10px]">
                      <th className="py-2.5 px-3">Course Name</th>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3">Credits</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-right">Validation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-secondary)]">
                    {creditSubjects.map((c, idx) => (
                      <tr key={c.id || idx}>
                        <td className="py-2.5 px-3 font-semibold text-[var(--text-primary)]">
                          {c.name}
                          {c.code && (
                            <span className="font-mono text-[10px] text-[var(--text-secondary)] block">
                              {c.code}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 capitalize text-[var(--text-secondary)]">
                          {(c.category || '').replace(/_/g, ' ')}
                        </td>
                        <td className="py-2.5 px-3 uppercase text-[10px] font-semibold text-[var(--text-tertiary)]">
                          {c.courseType || 'regular'}
                        </td>
                        <td className="py-2.5 px-3 font-bold tabular-nums">
                          {c.earnedCredits !== undefined ? c.earnedCredits : c.credits}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              c.status === 'Passed'
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                            }`}
                          >
                            {c.status || 'Registered'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-zinc-100 dark:bg-zinc-800 text-[var(--text-secondary)]">
                            {c.isVerified ? 'Verified Curriculum' : 'Student Audit'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Official Footer Notice */}
        <div className="pt-6 border-t border-[var(--border-secondary)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[10px] text-[var(--text-tertiary)]">
          <div>
            Data provenance notice: Records marked "Official AMS" originate from the Vel Tech portal. Records marked "Simulation" or "Manual" are user-managed.
          </div>
          <div className="shrink-0 font-medium">
            Academic Companion • Confidential Student Report
          </div>
        </div>
      </div>
    </div>
  );
};
