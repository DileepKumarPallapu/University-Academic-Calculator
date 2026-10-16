import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Clock,
} from 'lucide-react';
import type { StudySessionLog, SyllabusTopic } from '../../types/examPrep';
import {
  getStudySessionsForProfile,
  logStudySession,
  calculateStudyStats,
} from '../../services/examPrepStorage';
import { useProfile } from '../../context/ProfileContext';
import { useAppToast } from '../layout/AppShell';

interface StudyFocusTimerProps {
  knownSubjects: string[];
  topics: SyllabusTopic[];
  onSessionLogged?: () => void;
}

export const StudyFocusTimer: React.FC<StudyFocusTimerProps> = ({
  knownSubjects,
  topics,
  onSessionLogged,
}) => {
  const { activeProfile } = useProfile();
  const { showToast } = useAppToast();

  const [selectedMinutes, setSelectedMinutes] = useState<number>(25);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(25 * 60);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [selectedSubject, setSelectedSubject] = useState<string>(knownSubjects[0] || '');
  const [selectedTopicId, setSelectedTopicId] = useState<string>('');
  const [sessionNotes, setSessionNotes] = useState<string>('');

  const [recentSessions, setRecentSessions] = useState<StudySessionLog[]>([]);

  // Accurate wall-clock timing refs
  const endTimeRef = useRef<number | null>(null);
  const timerIntervalRef = useRef<any>(null);
  const sessionStartedAtRef = useRef<number | null>(null);

  // Sync selectedSubject default
  useEffect(() => {
    if (!selectedSubject && knownSubjects.length > 0) {
      setSelectedSubject(knownSubjects[0]);
    }
  }, [knownSubjects, selectedSubject]);

  // Load session logs
  const loadSessions = () => {
    const list = getStudySessionsForProfile(activeProfile.id);
    setRecentSessions(list);
  };

  useEffect(() => {
    loadSessions();
  }, [activeProfile.id]);

  // Available topics for selected subject
  const availableTopics = topics.filter(
    (t) => !selectedSubject || t.subjectName.toLowerCase() === selectedSubject.toLowerCase()
  );

  // Sound chime helper
  const playChime = () => {
    try {
      if (typeof window !== 'undefined' && 'AudioContext' in window) {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
        osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.3); // A5
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.8);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.8);
      }
    } catch {
      // Ignore if audio is restricted
    }
  };

  // Timer Tick Handler with Wall-Clock Accuracy
  useEffect(() => {
    if (isRunning) {
      timerIntervalRef.current = setInterval(() => {
        if (endTimeRef.current !== null) {
          const now = Date.now();
          const diff = Math.max(0, Math.ceil((endTimeRef.current - now) / 1000));
          setSecondsRemaining(diff);

          if (diff <= 0) {
            // Completed!
            clearInterval(timerIntervalRef.current);
            setIsRunning(false);
            endTimeRef.current = null;
            handleSessionComplete();
          }
        }
      }, 500);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [isRunning]);

  const handleStart = () => {
    if (!selectedSubject.trim()) {
      showToast('Please select or enter a subject for this focus session.', 'info');
      return;
    }
    const now = Date.now();
    sessionStartedAtRef.current = now;
    endTimeRef.current = now + secondsRemaining * 1000;
    setIsRunning(true);
  };

  const handlePause = () => {
    if (endTimeRef.current !== null) {
      const now = Date.now();
      const diff = Math.max(0, Math.ceil((endTimeRef.current - now) / 1000));
      setSecondsRemaining(diff);
      endTimeRef.current = null;
    }
    setIsRunning(false);
  };

  const handleReset = (newMinutes?: number) => {
    setIsRunning(false);
    endTimeRef.current = null;
    const mins = newMinutes !== undefined ? newMinutes : selectedMinutes;
    setSecondsRemaining(mins * 60);
  };

  const handlePresetChange = (mins: number) => {
    setSelectedMinutes(mins);
    handleReset(mins);
  };

  const handleSessionComplete = () => {
    playChime();
    const linkedTopic = topics.find((t) => t.id === selectedTopicId);
    const now = Date.now();

    logStudySession(activeProfile.id, {
      subjectName: selectedSubject,
      topicId: selectedTopicId || undefined,
      topicTitle: linkedTopic ? `${linkedTopic.unitTitle ? `${linkedTopic.unitTitle}: ` : ''}${linkedTopic.title}` : undefined,
      durationMinutes: selectedMinutes,
      startedAt: sessionStartedAtRef.current || now - selectedMinutes * 60 * 1000,
      completedAt: now,
      isCompleted: true,
      notes: sessionNotes.trim() || undefined,
    });

    showToast(`Great work! Completed ${selectedMinutes} minutes of focused study on ${selectedSubject}.`, 'success');
    loadSessions();
    if (onSessionLogged) onSessionLogged();
    // Reset timer
    setSecondsRemaining(selectedMinutes * 60);
  };

  // Formatting MM:SS
  const minsDisplay = Math.floor(secondsRemaining / 60);
  const secsDisplay = secondsRemaining % 60;
  const timeFormatted = `${String(minsDisplay).padStart(2, '0')}:${String(secsDisplay).padStart(2, '0')}`;

  const stats = calculateStudyStats(recentSessions);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <Clock className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Study Focus Timer
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Build deep study habits with timed sessions linked directly to your subjects and syllabus topics.
          </p>
        </div>

        {/* Stats Pill */}
        <div className="flex items-center gap-3 text-xs bg-slate-50 dark:bg-slate-800/60 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700/60">
          <div>
            <span className="text-slate-400 text-[10px] block">Today's Focus</span>
            <span className="font-bold text-slate-900 dark:text-white">
              {stats.todayMinutes} mins
            </span>
          </div>
          <div className="w-px h-6 bg-slate-200 dark:bg-slate-700" />
          <div>
            <span className="text-slate-400 text-[10px] block">Completed</span>
            <span className="font-bold text-indigo-600 dark:text-indigo-400">
              {stats.totalSessions} sessions
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left: Timer Display & Controls */}
        <div className="lg:col-span-7 flex flex-col items-center justify-center p-6 rounded-2xl bg-slate-50/60 dark:bg-slate-800/30 border border-slate-200/80 dark:border-slate-800 text-center">
          {/* Presets */}
          <div className="flex items-center gap-2 mb-6">
            {[15, 25, 45, 50, 60].map((mins) => (
              <button
                key={mins}
                type="button"
                disabled={isRunning}
                onClick={() => handlePresetChange(mins)}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                  selectedMinutes === mins
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                } ${isRunning ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {mins}m
              </button>
            ))}
          </div>

          {/* Large Countdown Clock */}
          <div className="relative w-48 h-48 sm:w-56 sm:h-56 rounded-full border-8 border-indigo-100 dark:border-indigo-950 flex flex-col items-center justify-center shadow-inner mb-6 bg-white dark:bg-slate-900">
            <span className="text-4xl sm:text-5xl font-black font-mono tracking-tight text-slate-900 dark:text-white">
              {timeFormatted}
            </span>
            <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 mt-1 uppercase tracking-wider">
              {isRunning ? 'Focusing...' : 'Ready'}
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            {!isRunning ? (
              <button
                type="button"
                onClick={handleStart}
                className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-md transition-colors"
              >
                <Play className="w-4 h-4 fill-white" />
                Start Focus Session
              </button>
            ) : (
              <button
                type="button"
                onClick={handlePause}
                className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-bold rounded-xl bg-amber-500 hover:bg-amber-600 text-white shadow-md transition-colors"
              >
                <Pause className="w-4 h-4 fill-white" />
                Pause
              </button>
            )}

            <button
              type="button"
              onClick={() => handleReset()}
              className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
              title="Reset Timer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Right: Subject / Topic Linker & Notes */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Session Details
            </h3>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Subject *
              </label>
              <input
                type="text"
                list="timer-subjects"
                disabled={isRunning}
                value={selectedSubject}
                onChange={(e) => {
                  setSelectedSubject(e.target.value);
                  setSelectedTopicId('');
                }}
                placeholder="e.g. Operating Systems"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {knownSubjects.length > 0 && (
                <datalist id="timer-subjects">
                  {knownSubjects.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Link to Syllabus Topic (Optional)
              </label>
              <select
                disabled={isRunning}
                value={selectedTopicId}
                onChange={(e) => setSelectedTopicId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">-- No specific topic --</option>
                {availableTopics.map((top) => (
                  <option key={top.id} value={top.id}>
                    {top.unitTitle ? `${top.unitTitle}: ` : ''}{top.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Session Goal / Notes (Optional)
              </label>
              <input
                type="text"
                value={sessionNotes}
                onChange={(e) => setSessionNotes(e.target.value)}
                placeholder="e.g. Practice 5 numericals on page 42"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
