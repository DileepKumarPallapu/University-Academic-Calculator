import React, { useState } from 'react';
import { X, Calendar, AlertTriangle, CheckCircle, Clock, ArrowRight } from 'lucide-react';
import type {
  ExamRecord,
  SyllabusTopic,
  ScheduleGeneratorConfig,
  StudyScheduleResult,
} from '../../types/examPrep';
import { generateStudySchedule, saveSchedule } from '../../services/examPrepStorage';
import { useProfile } from '../../context/ProfileContext';
import { useAppToast } from '../layout/AppShell';

interface ScheduleGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  exams: ExamRecord[];
  topics: SyllabusTopic[];
  onScheduleGenerated: (result: StudyScheduleResult) => void;
}

export const ScheduleGeneratorModal: React.FC<ScheduleGeneratorModalProps> = ({
  isOpen,
  onClose,
  exams,
  topics,
  onScheduleGenerated,
}) => {
  const { activeProfile } = useProfile();
  const { showToast } = useAppToast();

  const [dailyHours, setDailyHours] = useState<number>(3);
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5, 6]); // Mon-Sat
  const [maxSessionMinutes, setMaxSessionMinutes] = useState<number>(50);
  const [breakMinutes, setBreakMinutes] = useState<number>(10);
  const [reserveDays, setReserveDays] = useState<number>(1);
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().slice(0, 10));

  const [previewResult, setPreviewResult] = useState<StudyScheduleResult | null>(null);

  if (!isOpen) return null;

  const dayLabels = [
    { day: 0, label: 'Sun' },
    { day: 1, label: 'Mon' },
    { day: 2, label: 'Tue' },
    { day: 3, label: 'Wed' },
    { day: 4, label: 'Thu' },
    { day: 5, label: 'Fri' },
    { day: 6, label: 'Sat' },
  ];

  const toggleDay = (day: number) => {
    if (selectedDays.includes(day)) {
      if (selectedDays.length === 1) return; // Must have at least 1 day
      setSelectedDays(selectedDays.filter((d) => d !== day));
    } else {
      setSelectedDays([...selectedDays, day].sort());
    }
  };

  const handleGeneratePreview = (e: React.FormEvent) => {
    e.preventDefault();

    const config: ScheduleGeneratorConfig = {
      dailyStudyHours: Number(dailyHours) || 3,
      selectedDays,
      maxSessionMinutes: Number(maxSessionMinutes) || 50,
      breakMinutes: Number(breakMinutes) || 10,
      reserveRevisionDaysBeforeExam: Number(reserveDays) || 1,
      startDate: startDate || new Date().toISOString().slice(0, 10),
    };

    const result = generateStudySchedule(exams, topics, config);
    setPreviewResult(result);
  };

  const handleApplySchedule = () => {
    if (!previewResult) return;
    saveSchedule(activeProfile.id, previewResult);
    onScheduleGenerated(previewResult);
    showToast(`Generated personalized schedule with ${previewResult.slots.length} study slots.`, 'success');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-xl w-full border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-lg">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white">
                Personalized Study Schedule Generator
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Calculates daily timetable prioritizing urgent exams, high difficulty topics, and pre-exam revisions.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-5 overflow-y-auto space-y-5 text-xs flex-1">
          <form onSubmit={handleGeneratePreview} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Daily Study Hours Budget
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="1"
                    max="10"
                    step="0.5"
                    value={dailyHours}
                    onChange={(e) => setDailyHours(parseFloat(e.target.value))}
                    className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                  <span className="font-bold text-slate-900 dark:text-white text-sm w-12 text-right">
                    {dailyHours}h
                  </span>
                </div>
                <span className="text-[10px] text-slate-500">Realistic hours you can study daily.</span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Start Schedule From
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Active Study Days
              </label>
              <div className="flex items-center gap-1.5 flex-wrap">
                {dayLabels.map(({ day, label }) => {
                  const isChecked = selectedDays.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleDay(day)}
                      className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-colors ${
                        isChecked
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Session Duration
                </label>
                <select
                  value={maxSessionMinutes}
                  onChange={(e) => setMaxSessionMinutes(Number(e.target.value))}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value={30}>30 Minutes</option>
                  <option value={45}>45 Minutes</option>
                  <option value={50}>50 Minutes (Standard)</option>
                  <option value={60}>60 Minutes</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Break Duration
                </label>
                <select
                  value={breakMinutes}
                  onChange={(e) => setBreakMinutes(Number(e.target.value))}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value={5}>5 Minutes</option>
                  <option value={10}>10 Minutes</option>
                  <option value={15}>15 Minutes</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Reserve Revision Days
                </label>
                <select
                  value={reserveDays}
                  onChange={(e) => setReserveDays(Number(e.target.value))}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value={0}>0 Days</option>
                  <option value={1}>1 Day Prior</option>
                  <option value={2}>2 Days Prior</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 font-bold rounded-xl text-white bg-slate-900 dark:bg-indigo-600 hover:bg-slate-800 dark:hover:bg-indigo-700 transition-colors shadow-sm flex items-center justify-center gap-2"
            >
              <Clock className="w-4 h-4" />
              Calculate & Preview Schedule
            </button>
          </form>

          {/* Schedule Preview & Workload Feasibility Report */}
          {previewResult && (
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  Feasibility & Workload Analysis
                </span>
                {previewResult.isFeasible ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300">
                    <CheckCircle className="w-3.5 h-3.5" /> Plan Fits Comfortably
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300">
                    <AlertTriangle className="w-3.5 h-3.5" /> Time Deficit Warning
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] py-1 border-y border-slate-200 dark:border-slate-700/60">
                <div>
                  <span className="text-slate-400 block">Required Hours</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {previewResult.totalRequiredHours.toFixed(1)} hrs
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Available Budget</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {previewResult.totalAvailableHours.toFixed(1)} hrs
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Generated Slots</span>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">
                    {previewResult.slots.length} slots
                  </span>
                </div>
              </div>

              {/* Conflict / Advisory Notice */}
              {previewResult.conflictWarning && (
                <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-800 dark:text-rose-300 space-y-1">
                  <p className="font-semibold">{previewResult.conflictWarning}</p>
                  <div className="text-[10px] space-y-0.5 pt-1">
                    <p className="font-bold uppercase tracking-wider text-rose-900 dark:text-rose-200">
                      Suggested Priorities:
                    </p>
                    {previewResult.suggestedPriorities.map((item, idx) => (
                      <p key={idx}>• {item}</p>
                    ))}
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={handleApplySchedule}
                className="w-full py-2.5 font-bold rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 shadow-md transition-colors flex items-center justify-center gap-2 mt-2"
              >
                <span>Save & Apply Timetable</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
