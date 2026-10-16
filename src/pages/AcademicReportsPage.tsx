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
import { getCalculationsByProfile } from '../services/db';
import {
  calculateCreditSummary,
  calculateCategoryProgress,
  COLLEGE_CHART_TEMPLATE,
} from '../utils/creditCalculations';
import { extractPriorSemestersSummary } from '../utils/academicIntelligence';
import { PdfBrandingFooter } from '../components/common/PdfBrandingFooter';

type ReportSection = 'all' | 'attendance' | 'internals' | 'gpa' | 'credits';

export const AcademicReportsPage: React.FC = () => {
  const { activeProfile } = useProfile();
  const [selectedSection, setSelectedSection] = useState<ReportSection>('all');
  const [reportDate, setReportDate] = useState<string>('');

  // Load profile-isolated datasets
  const [attendanceData, setAttendanceData] = useState<any[]>([]);
  const [creditSubjects, setCreditSubjects] = useState<any[]>([]);
  const [savedCalcs, setSavedCalcs] = useState<any[]>([]);
  const [internalDraft, setInternalDraft] = useState<any>(null);

  useEffect(() => {
    setReportDate(new Date().toLocaleString());
    const profileId = activeProfile.id;

    // 1. Attendance (From profile's attendance storage)
    const rawAtt = safeGetItem(`academic_attendance_subjects_${profileId}`);
    if (rawAtt) {
      try {
        setAttendanceData(JSON.parse(rawAtt));
      } catch {
        setAttendanceData([]);
      }
    } else {
      setAttendanceData([]);
    }

    // 2. Credits (From profile's credits storage)
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

    // 3. Saved Calculations
    getCalculationsByProfile(profileId).then((calcs) => {
      setSavedCalcs(calcs);
    });

    // 4. Internal Draft (if user calculated internals)
    const rawInt = safeGetItem(`academic_draft_internal_${profileId}`);
    if (rawInt) {
      try {
        setInternalDraft(JSON.parse(rawInt));
      } catch {
        setInternalDraft(null);
      }
    }
  }, [activeProfile.id]);

  // Derived GPA stats
  const sgpaCalcs = useMemo(() => {
    return savedCalcs.filter((c) => c.type === 'sgpa');
  }, [savedCalcs]);

  const cgpaCalcs = useMemo(() => {
    return savedCalcs.filter((c) => c.type === 'cgpa');
  }, [savedCalcs]);

  const priorSummary = useMemo(() => {
    return extractPriorSemestersSummary(savedCalcs, creditSubjects);
  }, [savedCalcs, creditSubjects]);

  // Derived Credits stats
  const targetCredits = activeProfile.customGraduationCredits || 160;
  const creditSummary = useMemo(() => {
    return calculateCreditSummary(creditSubjects, targetCredits, COLLEGE_CHART_TEMPLATE);
  }, [creditSubjects, targetCredits]);

  const categoryProgress = useMemo(() => {
    return calculateCategoryProgress(COLLEGE_CHART_TEMPLATE, creditSubjects);
  }, [creditSubjects]);

  // Derived Attendance stats
  const attendanceSummary = useMemo(() => {
    let totalConducted = 0;
    let totalAttended = 0;
    for (const item of attendanceData) {
      const cond = Number(item.conducted || item.totalSessions) || 0;
      const att = Number(item.attended || item.presentSessions) || 0;
      if (cond > 0) {
        totalConducted += cond;
        totalAttended += Math.min(cond, att);
      }
    }
    const pct = totalConducted > 0 ? Math.min(100, Math.round((totalAttended / totalConducted) * 10000) / 100) : null;
    return {
      totalConducted,
      totalAttended,
      percentage: pct,
    };
  }, [attendanceData]);

  const targetAttendance = activeProfile.targetAttendance || 75;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="apple-page-enter flex flex-col gap-8 w-full">
      {/* 1. Header (Excluded on print) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border-secondary)] pb-6 no-print">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-black/5 dark:bg-white/10 text-[var(--text-secondary)]">
              {activeProfile.name} • {activeProfile.regulation}
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400">
              Printable Summary
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--text-primary)]">
            Academic Performance Summary
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1">
            Generated summary of student-entered calculations, attendance records, and curriculum credits.
          </p>
        </div>

        <button
          type="button"
          onClick={handlePrint}
          className="apple-btn-primary text-xs h-10 px-5 gap-2 font-semibold shadow-xs"
        >
          <Printer className="w-4 h-4" />
          <span>Print / Save as PDF</span>
        </button>
      </div>

      {/* 2. Section Selector (Excluded on print) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-[var(--border-secondary)] text-xs no-print">
        {(
          [
            { id: 'all', label: 'All Sections' },
            { id: 'attendance', label: 'Attendance' },
            { id: 'internals', label: 'Internal Marks' },
            { id: 'gpa', label: 'SGPA & CGPA' },
            { id: 'credits', label: 'Credit Audit' },
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

      {/* 3. REPORT DOCUMENT CONTAINER */}
      <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border-primary)] shadow-sm p-6 sm:p-10 flex flex-col gap-8 text-[var(--text-primary)] print:border-none print:shadow-none print:p-0">
        {/* Document Header */}
        <div className="border-b-2 border-black dark:border-white pb-6 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="text-[10px] uppercase font-bold tracking-wider text-[var(--text-tertiary)]">
              Student Academic Performance Summary
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)] mt-1">
              {activeProfile.collegeName || 'Vel Tech Rangarajan Dr. Sagunthala R&D Institute of Science and Technology'}
            </h2>
            <div className="text-xs text-[var(--text-secondary)] mt-1.5 space-y-0.5">
              <div>
                <strong>Program:</strong> {activeProfile.degree || 'B.Tech'} in{' '}
                {activeProfile.department || activeProfile.branch || 'Engineering'}
              </div>
              <div>
                <strong>Regulation:</strong> {activeProfile.regulation || 'VTR21'} •{' '}
                <strong>Degree Pathway:</strong> {activeProfile.degreePathway.toUpperCase()}
              </div>
            </div>
          </div>

          <div className="text-left sm:text-right text-xs text-[var(--text-secondary)] space-y-0.5">
            <div className="font-bold text-sm text-[var(--text-primary)]">
              {activeProfile.name}
            </div>
            <div>
              <strong>Roll / Register No:</strong> {activeProfile.rollNumber || 'Not Specified'}
            </div>
            <div>
              <strong>Current Semester:</strong> Semester {activeProfile.currentSemester || 1}
            </div>
            {activeProfile.academicYear && (
              <div>
                <strong>Academic Year:</strong> {activeProfile.academicYear}
              </div>
            )}
            <div className="text-[10px] text-[var(--text-tertiary)] pt-1 font-mono">
              Generated: {reportDate}
            </div>
          </div>
        </div>

        {/* SECTION A: ATTENDANCE SUMMARY */}
        {(selectedSection === 'all' || selectedSection === 'attendance') && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-[var(--border-secondary)] pb-2">
              <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--text-primary)] flex items-center gap-2">
                <Percent className="w-4 h-4 text-emerald-500" />
                <span>Attendance Summary</span>
              </h3>
              <div className="flex items-center gap-3 text-xs">
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-[var(--text-secondary)]">
                  Source: Local Attendance Calculator
                </span>
                <span className="font-semibold text-[var(--text-secondary)]">
                  Requirement: {targetAttendance}%
                </span>
              </div>
            </div>

            {attendanceData.length === 0 ? (
              <div className="p-4 rounded-xl bg-[var(--bg-secondary)] text-center text-xs text-[var(--text-secondary)]">
                No attendance records saved.
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="grid grid-cols-3 gap-3 p-3 rounded-xl bg-[var(--bg-secondary)] text-xs">
                  <div>
                    <span className="text-[10px] text-[var(--text-tertiary)] uppercase font-semibold block">
                      Total Sessions
                    </span>
                    <span className="text-base font-bold text-[var(--text-primary)] font-mono">
                      {attendanceSummary.totalConducted}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[var(--text-tertiary)] uppercase font-semibold block">
                      Attended Sessions
                    </span>
                    <span className="text-base font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                      {attendanceSummary.totalAttended}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[var(--text-tertiary)] uppercase font-semibold block">
                      Overall Percentage
                    </span>
                    <span className="text-base font-bold text-[var(--text-primary)] font-mono">
                      {attendanceSummary.percentage !== null ? `${attendanceSummary.percentage}%` : '—'}
                    </span>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-[var(--border-secondary)] text-[var(--text-secondary)] font-semibold uppercase tracking-wider text-[10px]">
                        <th className="py-2 px-3">Subject / Course</th>
                        <th className="py-2 px-3">Conducted</th>
                        <th className="py-2 px-3">Attended</th>
                        <th className="py-2 px-3">Percentage</th>
                        <th className="py-2 px-3">Standing</th>
                        <th className="py-2 px-3 text-right">Data Source</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-secondary)]">
                      {attendanceData.map((item, idx) => {
                        const total = Number(item.conducted || item.totalSessions) || 0;
                        const present = Number(item.attended || item.presentSessions) || 0;
                        const pct = total > 0 ? Math.min(100, Math.round((present / total) * 10000) / 100) : 0;
                        const isEligible = pct >= targetAttendance;

                        return (
                          <tr key={item.id || idx}>
                            <td className="py-2.5 px-3 font-semibold text-[var(--text-primary)]">
                              {item.name || item.subjectName}
                              {item.code && (
                                <span className="font-mono text-[10px] text-[var(--text-secondary)] block">
                                  {item.code}
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 font-mono">{total}</td>
                            <td className="py-2.5 px-3 font-mono text-emerald-600 dark:text-emerald-400">
                              {present}
                            </td>
                            <td className="py-2.5 px-3 font-mono font-bold">
                              {total > 0 ? `${pct}%` : '—'}
                            </td>
                            <td className="py-2.5 px-3">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                  isEligible
                                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                    : 'bg-red-500/10 text-red-600 dark:text-red-400'
                                }`}
                              >
                                {isEligible ? 'On Track' : 'Below Target'}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-[10px] text-[var(--text-secondary)]">
                              User Manual Entry
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* SECTION B: INTERNAL MARKS */}
        {(selectedSection === 'all' || selectedSection === 'internals') && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-[var(--border-secondary)] pb-2">
              <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--text-primary)] flex items-center gap-2">
                <Calculator className="w-4 h-4 text-purple-500" />
                <span>Internal Assessment Standing</span>
              </h3>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-[var(--text-secondary)]">
                Source: Internal Marks Calculator
              </span>
            </div>

            {savedCalcs.filter((c) => c.type === 'internals').length === 0 && !internalDraft ? (
              <div className="p-4 rounded-xl bg-[var(--bg-secondary)] text-center text-xs text-[var(--text-secondary)]">
                No internal marks calculations saved for this profile.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--border-secondary)] text-[var(--text-secondary)] font-semibold uppercase tracking-wider text-[10px]">
                      <th className="py-2 px-3">Calculation Title</th>
                      <th className="py-2 px-3">Total Internal</th>
                      <th className="py-2 px-3">Max Marks</th>
                      <th className="py-2 px-3">Performance Tier</th>
                      <th className="py-2 px-3 text-right">Data Source</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-secondary)]">
                    {savedCalcs
                      .filter((c) => c.type === 'internals')
                      .map((c) => (
                        <tr key={c.id}>
                          <td className="py-2.5 px-3 font-semibold text-[var(--text-primary)]">
                            {c.title}
                          </td>
                          <td className="py-2.5 px-3 font-bold font-mono text-purple-600 dark:text-purple-400">
                            {c.resultValue}
                          </td>
                          <td className="py-2.5 px-3 font-mono">40</td>
                          <td className="py-2.5 px-3">{c.resultSummary || 'Evaluated'}</td>
                          <td className="py-2.5 px-3 text-right font-mono text-[10px] text-[var(--text-secondary)]">
                            Local Calculation
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* SECTION C: SGPA & CGPA SUMMARY */}
        {(selectedSection === 'all' || selectedSection === 'gpa') && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-[var(--border-secondary)] pb-2">
              <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--text-primary)] flex items-center gap-2">
                <Award className="w-4 h-4 text-blue-500" />
                <span>Semester SGPA & Cumulative CGPA</span>
              </h3>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-[var(--text-secondary)]">
                Source: GPA / CGPA Calculators
              </span>
            </div>

            {sgpaCalcs.length === 0 && cgpaCalcs.length === 0 ? (
              <div className="p-4 rounded-xl bg-[var(--bg-secondary)] text-center text-xs text-[var(--text-secondary)]">
                No GPA records saved for this profile.
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-[var(--bg-secondary)] text-xs">
                  <div>
                    <span className="text-[10px] text-[var(--text-tertiary)] uppercase font-semibold block">
                      Cumulative CGPA
                    </span>
                    <span className="text-xl font-bold text-blue-600 dark:text-blue-400 font-mono">
                      {priorSummary.priorCgpa !== null
                        ? priorSummary.priorCgpa.toFixed(2)
                        : cgpaCalcs[0]
                        ? cgpaCalcs[0].resultValue
                        : '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[var(--text-tertiary)] uppercase font-semibold block">
                      Eligible Credits Accounted
                    </span>
                    <span className="text-xl font-bold text-[var(--text-primary)] font-mono">
                      {priorSummary.priorCredits > 0 ? priorSummary.priorCredits : '—'}
                    </span>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-[var(--border-secondary)] text-[var(--text-secondary)] font-semibold uppercase tracking-wider text-[10px]">
                        <th className="py-2 px-3">Term / Title</th>
                        <th className="py-2 px-3">Grade Point Average</th>
                        <th className="py-2 px-3">Credits</th>
                        <th className="py-2 px-3">Summary</th>
                        <th className="py-2 px-3 text-right">Data Source</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-secondary)]">
                      {sgpaCalcs.map((c) => (
                        <tr key={c.id}>
                          <td className="py-2.5 px-3 font-semibold text-[var(--text-primary)]">
                            {c.title}
                          </td>
                          <td className="py-2.5 px-3 font-bold font-mono text-blue-600 dark:text-blue-400">
                            {c.resultValue}
                          </td>
                          <td className="py-2.5 px-3 font-mono">
                            {c.inputs?.totalCredits || '—'}
                          </td>
                          <td className="py-2.5 px-3 text-[var(--text-secondary)]">
                            {c.resultSummary || 'Calculated SGPA'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-[10px] text-[var(--text-secondary)]">
                            Local Calculation
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* SECTION D: CREDIT ACCUMULATION BY CATEGORY */}
        {(selectedSection === 'all' || selectedSection === 'credits') && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-[var(--border-secondary)] pb-2">
              <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--text-primary)] flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-emerald-500" />
                <span>Credit Progress by Curriculum Category</span>
              </h3>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-[var(--text-secondary)]">
                Source: Credit Planner
              </span>
            </div>

            {creditSubjects.length === 0 ? (
              <div className="p-4 rounded-xl bg-[var(--bg-secondary)] text-center text-xs text-[var(--text-secondary)]">
                No credit courses recorded for this profile.
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 rounded-xl bg-[var(--bg-secondary)] text-xs">
                  <div>
                    <span className="text-[10px] text-[var(--text-tertiary)] uppercase font-semibold block">
                      Total Earned
                    </span>
                    <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                      {creditSummary.totalEarnedCredits} / {targetCredits}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[var(--text-tertiary)] uppercase font-semibold block">
                      Pending Credits
                    </span>
                    <span className="text-xl font-bold text-[var(--text-primary)] font-mono">
                      {creditSummary.creditsRemaining}
                    </span>
                  </div>
                  <div className="hidden sm:block">
                    <span className="text-[10px] text-[var(--text-tertiary)] uppercase font-semibold block">
                      Completion Rate
                    </span>
                    <span className="text-xl font-bold text-blue-600 dark:text-blue-400 font-mono">
                      {creditSummary.completionPercentage}%
                    </span>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-[var(--border-secondary)] text-[var(--text-secondary)] font-semibold uppercase tracking-wider text-[10px]">
                        <th className="py-2 px-3">Curriculum Category</th>
                        <th className="py-2 px-3">Earned Credits</th>
                        <th className="py-2 px-3">Requirement</th>
                        <th className="py-2 px-3">Status</th>
                        <th className="py-2 px-3 text-right">Data Source</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-secondary)]">
                      {categoryProgress.map((item) => {
                        if (item.earnedCredits === 0 && item.category.requiredCredits === 0) return null;

                        return (
                          <tr key={item.category.id}>
                            <td className="py-2 px-3 font-semibold text-[var(--text-primary)]">
                              {item.category.name}
                            </td>
                            <td className="py-2 px-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                              {item.earnedCredits}
                            </td>
                            <td className="py-2 px-3 font-mono text-[var(--text-secondary)]">
                              {item.category.requiredCredits > 0 ? item.category.requiredCredits : '—'}
                            </td>
                            <td className="py-2 px-3">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                  item.isSatisfied
                                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                    : 'bg-zinc-100 dark:bg-zinc-800 text-[var(--text-secondary)]'
                                }`}
                              >
                                {item.isSatisfied ? 'Completed' : 'In Progress'}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-[10px] text-[var(--text-secondary)]">
                              Curriculum Planner
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Official Disclaimer & Provenance Notice */}
        <div className="pt-6 border-t-2 border-black/10 dark:border-white/10 flex flex-col gap-2 text-[10px] text-[var(--text-secondary)] leading-relaxed">
          <div className="font-semibold text-[var(--text-primary)]">
            Notice & Academic Disclaimer:
          </div>
          <p>
            This document is a student-generated academic summary compiled from local device records and user manual inputs. It does not represent an official university marksheet, degree certificate, or transcript. For official academic transcripts, grade cards, or attendance attestations, contact your institution's Office of the Controller of Examinations.
          </p>
          <div className="flex items-center justify-between text-[9px] text-[var(--text-tertiary)] pt-2 border-t border-[var(--border-secondary)]">
            <span>Client-Side Local Storage • Isolated Profile ID: {activeProfile.id.slice(0, 8)}...</span>
            <span>Generated on {reportDate}</span>
          </div>
        </div>

        {/* Standardized Pallapu Dileep Kumar PDF Branding Footer */}
        <PdfBrandingFooter className="mt-4 pt-4 border-t border-[var(--border-secondary)]" />
      </div>
    </div>
  );
};
