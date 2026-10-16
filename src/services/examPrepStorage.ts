import type {
  ExamRecord,
  SyllabusTopic,
  SyllabusSubjectProgress,
  ScheduleGeneratorConfig,
  ScheduledStudySlot,
  StudyScheduleResult,
  StudySessionLog,
  ExamCountdownInfo,
} from '../types/examPrep';
import { safeGetItem, safeSetItem, sanitizeCourseTitle } from './catalogueStorage';

const EXAMS_PREFIX = 'academic_exams_';
const SYLLABUS_PREFIX = 'academic_syllabus_topics_';
const SCHEDULE_PREFIX = 'academic_study_schedule_';
const SESSIONS_PREFIX = 'academic_study_sessions_';

// ==========================================
// 1. EXAM MANAGEMENT
// ==========================================

export function getExamsForProfile(profileId: string): ExamRecord[] {
  if (!profileId) return [];
  const raw = safeGetItem(`${EXAMS_PREFIX}${profileId}`);
  if (!raw) return [];
  try {
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function saveExamsForProfile(profileId: string, exams: ExamRecord[]): void {
  if (!profileId) return;
  safeSetItem(`${EXAMS_PREFIX}${profileId}`, JSON.stringify(exams));
}

export function addExam(
  profileId: string,
  exam: Omit<ExamRecord, 'id' | 'profileId' | 'createdAt' | 'updatedAt'>
): ExamRecord {
  const current = getExamsForProfile(profileId);
  const now = Date.now();
  const newExam: ExamRecord = {
    ...exam,
    id: `exam-${now}-${Math.random().toString(36).slice(2, 6)}`,
    profileId,
    subjectName: sanitizeCourseTitle(exam.subjectName),
    preparationProgress: Math.max(0, Math.min(100, Number(exam.preparationProgress) || 0)),
    createdAt: now,
    updatedAt: now,
  };
  saveExamsForProfile(profileId, [...current, newExam]);
  return newExam;
}

export function updateExam(
  profileId: string,
  examId: string,
  updates: Partial<ExamRecord>
): ExamRecord | null {
  const current = getExamsForProfile(profileId);
  const idx = current.findIndex((e) => e.id === examId);
  if (idx < 0) return null;

  const updated: ExamRecord = {
    ...current[idx],
    ...updates,
    updatedAt: Date.now(),
  };
  current[idx] = updated;
  saveExamsForProfile(profileId, current);
  return updated;
}

export function deleteExam(profileId: string, examId: string): boolean {
  const current = getExamsForProfile(profileId);
  const filtered = current.filter((e) => e.id !== examId);
  if (filtered.length !== current.length) {
    saveExamsForProfile(profileId, filtered);
    return true;
  }
  return false;
}

export function calculateExamCountdowns(
  exams: ExamRecord[],
  referenceDateStr?: string
): ExamCountdownInfo[] {
  const today = referenceDateStr
    ? new Date(referenceDateStr + 'T00:00:00')
    : new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00');

  return exams.map((exam) => {
    if (!exam.examDate) {
      return {
        exam,
        hasDate: false,
        isPast: false,
        daysRemaining: 0,
        formattedCountdown: 'Date Not Scheduled',
      };
    }

    const examDate = new Date(exam.examDate + 'T00:00:00');
    const diffTime = examDate.getTime() - today.getTime();
    const daysRemaining = Math.round(diffTime / (1000 * 60 * 60 * 24));
    const isPast = daysRemaining < 0;

    let formattedCountdown = '';
    if (daysRemaining === 0) {
      formattedCountdown = 'Today';
    } else if (daysRemaining === 1) {
      formattedCountdown = 'Tomorrow';
    } else if (daysRemaining > 1) {
      formattedCountdown = `In ${daysRemaining} days`;
    } else {
      formattedCountdown = `Past exam (${Math.abs(daysRemaining)} day${Math.abs(daysRemaining) === 1 ? '' : 's'} ago)`;
    }

    return {
      exam,
      hasDate: true,
      isPast,
      daysRemaining,
      formattedCountdown,
    };
  });
}

// ==========================================
// 2. SYLLABUS TRACKER
// ==========================================

export function getSyllabusTopicsForProfile(profileId: string): SyllabusTopic[] {
  if (!profileId) return [];
  const raw = safeGetItem(`${SYLLABUS_PREFIX}${profileId}`);
  if (!raw) return [];
  try {
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function saveSyllabusTopicsForProfile(profileId: string, topics: SyllabusTopic[]): void {
  if (!profileId) return;
  safeSetItem(`${SYLLABUS_PREFIX}${profileId}`, JSON.stringify(topics));
}

export function addSyllabusTopic(
  profileId: string,
  topic: Omit<SyllabusTopic, 'id' | 'profileId' | 'createdAt' | 'updatedAt'>
): SyllabusTopic {
  const current = getSyllabusTopicsForProfile(profileId);
  const now = Date.now();
  const newTopic: SyllabusTopic = {
    ...topic,
    id: `topic-${now}-${Math.random().toString(36).slice(2, 6)}`,
    profileId,
    subjectName: sanitizeCourseTitle(topic.subjectName),
    title: topic.title.trim(),
    estimatedHours: Math.max(0.5, Number(topic.estimatedHours) || 1.5),
    createdAt: now,
    updatedAt: now,
  };
  saveSyllabusTopicsForProfile(profileId, [...current, newTopic]);
  return newTopic;
}

export function updateSyllabusTopic(
  profileId: string,
  topicId: string,
  updates: Partial<SyllabusTopic>
): SyllabusTopic | null {
  const current = getSyllabusTopicsForProfile(profileId);
  const idx = current.findIndex((t) => t.id === topicId);
  if (idx < 0) return null;

  const updated: SyllabusTopic = {
    ...current[idx],
    ...updates,
    updatedAt: Date.now(),
  };
  current[idx] = updated;
  saveSyllabusTopicsForProfile(profileId, current);
  return updated;
}

export function deleteSyllabusTopic(profileId: string, topicId: string): boolean {
  const current = getSyllabusTopicsForProfile(profileId);
  const filtered = current.filter((t) => t.id !== topicId);
  if (filtered.length !== current.length) {
    saveSyllabusTopicsForProfile(profileId, filtered);
    return true;
  }
  return false;
}

export function calculateSyllabusProgress(
  topics: SyllabusTopic[],
  filterSubject?: string
): SyllabusSubjectProgress[] {
  const map: Record<string, SyllabusTopic[]> = {};

  topics.forEach((t) => {
    const sub = t.subjectName.trim();
    if (!sub) return;
    if (filterSubject && sub.toLowerCase() !== filterSubject.trim().toLowerCase()) return;
    if (!map[sub]) map[sub] = [];
    map[sub].push(t);
  });

  return Object.keys(map).map((subjectName) => {
    const subTopics = map[subjectName];
    const totalTopics = subTopics.length;
    const completedTopics = subTopics.filter((t) => t.status === 'completed').length;
    const needsRevisionTopics = subTopics.filter((t) => t.status === 'needs_revision').length;
    const learningTopics = subTopics.filter((t) => t.status === 'learning').length;
    const notStartedTopics = subTopics.filter((t) => t.status === 'not_started').length;

    const completionPercentage =
      totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

    const difficultPendingTopicsCount = subTopics.filter(
      (t) => (t.difficulty === 'hard' || t.difficulty === 'very_hard') && t.status !== 'completed'
    ).length;

    return {
      subjectName,
      totalTopics,
      completedTopics,
      needsRevisionTopics,
      learningTopics,
      notStartedTopics,
      completionPercentage,
      difficultPendingTopicsCount,
    };
  });
}

// ==========================================
// 3. PERSONALIZED STUDY SCHEDULE GENERATOR
// ==========================================

export function generateStudySchedule(
  exams: ExamRecord[],
  topics: SyllabusTopic[],
  config: ScheduleGeneratorConfig
): StudyScheduleResult {
  const slots: ScheduledStudySlot[] = [];
  const todayStr = config.startDate || new Date().toISOString().slice(0, 10);
  const today = new Date(todayStr + 'T00:00:00');

  // Filter exams that have dates and are in future or today
  const activeExams = exams
    .filter((e) => e.examDate && e.examDate >= todayStr)
    .sort((a, b) => (a.examDate || '').localeCompare(b.examDate || ''));

  // Pending topics to study
  const pendingTopics = topics.filter((t) => t.status !== 'completed');

  // Calculate required study hours
  const totalRequiredHours = pendingTopics.reduce(
    (sum, t) => sum + (Number(t.estimatedHours) || 1.5),
    0
  );

  // Available days between today and the latest exam date (or default 14 days)
  let latestExamDate = new Date(today);
  if (activeExams.length > 0) {
    const latestExamStr = activeExams[activeExams.length - 1].examDate!;
    latestExamDate = new Date(latestExamStr + 'T00:00:00');
  } else {
    latestExamDate.setDate(latestExamDate.getDate() + 14);
  }

  // Determine study dates matching config.selectedDays
  const studyDates: string[] = [];
  const cur = new Date(today);
  while (cur <= latestExamDate) {
    const dayOfWeek = cur.getDay(); // 0 = Sun, 1 = Mon ...
    if (config.selectedDays.includes(dayOfWeek)) {
      studyDates.push(cur.toISOString().slice(0, 10));
    }
    cur.setDate(cur.getDate() + 1);
  }

  const totalAvailableHours = studyDates.length * config.dailyStudyHours;
  const isFeasible = totalAvailableHours >= totalRequiredHours;

  const conflictWarning = !isFeasible
    ? `Schedule Conflict: You need approximately ${totalRequiredHours.toFixed(1)} study hours to cover all ${pendingTopics.length} unfinished topics, but only ${totalAvailableHours.toFixed(1)} hours are available in your study window before exams. Workload exceeds available time by ${(totalRequiredHours - totalAvailableHours).toFixed(1)} hours.`
    : undefined;

  const suggestedPriorities: string[] = [];
  if (!isFeasible) {
    suggestedPriorities.push(
      'Prioritize high-difficulty core topics first and skip minor non-core topics.'
    );
    suggestedPriorities.push(
      `Consider increasing your daily study time by ${Math.ceil((totalRequiredHours - totalAvailableHours) / Math.max(1, studyDates.length))} hour(s) per day.`
    );
    suggestedPriorities.push(
      'Utilize fast revision summaries instead of learning entire units from scratch.'
    );
  }

  // Schedule allocation algorithm:
  // 1. Mark exam day slots
  activeExams.forEach((exam) => {
    if (exam.examDate) {
      slots.push({
        id: `slot-exam-${exam.id}`,
        date: exam.examDate,
        subjectName: exam.subjectName,
        topicTitle: `EXAM: ${exam.subjectName} (${exam.examType.toUpperCase().replace(/_/g, ' ')})`,
        activityType: 'exam_day',
        durationMinutes: 180,
        difficulty: exam.difficulty,
        completed: false,
        notes: `Exam Scheduled at ${exam.examTime || 'TBD'}`,
      });
    }
  });

  // 2. Reserve 1-2 days before each exam for Final Subject Revision
  const revisionDatesSet = new Set<string>();
  activeExams.forEach((exam) => {
    if (exam.examDate && config.reserveRevisionDaysBeforeExam > 0) {
      const eDate = new Date(exam.examDate + 'T00:00:00');
      for (let r = 1; r <= config.reserveRevisionDaysBeforeExam; r++) {
        const revDate = new Date(eDate);
        revDate.setDate(revDate.getDate() - r);
        const revDateStr = revDate.toISOString().slice(0, 10);
        if (revDateStr >= todayStr) {
          revisionDatesSet.add(`${revDateStr}::${exam.subjectName}`);
          slots.push({
            id: `slot-rev-${exam.id}-${revDateStr}`,
            date: revDateStr,
            subjectName: exam.subjectName,
            topicTitle: `Final Revision & Key Formula Review for ${exam.subjectName}`,
            activityType: 'revision',
            durationMinutes: 90,
            difficulty: exam.difficulty,
            completed: false,
            notes: 'High-yield problem solving and formula sheet review before the exam.',
          });
        }
      }
    }
  });

  // 3. Allocate pending topics prioritized by exam urgency and topic difficulty
  // Rank topics:
  const rankedTopics = [...pendingTopics].sort((a, b) => {
    // 1. Proximity of subject's exam
    const examA = activeExams.find((e) => e.subjectName === a.subjectName);
    const examB = activeExams.find((e) => e.subjectName === b.subjectName);
    const dateA = examA?.examDate || '9999-99-99';
    const dateB = examB?.examDate || '9999-99-99';
    if (dateA !== dateB) return dateA.localeCompare(dateB);

    // 2. Difficulty weight (very_hard > hard > moderate > easy)
    const diffWeight: Record<string, number> = { very_hard: 4, hard: 3, moderate: 2, easy: 1 };
    const diffDiff = (diffWeight[b.difficulty] || 2) - (diffWeight[a.difficulty] || 2);
    if (diffDiff !== 0) return diffDiff;

    // 3. Status weight (needs_revision > learning > not_started)
    const statusWeight: Record<string, number> = {
      needs_revision: 3,
      learning: 2,
      not_started: 1,
      completed: 0,
    };
    return (statusWeight[b.status] || 1) - (statusWeight[a.status] || 1);
  });

  // Distribute topics across studyDates
  let topicIdx = 0;
  studyDates.forEach((dateStr) => {
    let dayRemainingMinutes = config.dailyStudyHours * 60;

    // Deduct any revision slots already assigned to this day
    const dayExisting = slots.filter((s) => s.date === dateStr);
    const usedMinutes = dayExisting.reduce((sum, s) => sum + s.durationMinutes, 0);
    dayRemainingMinutes -= usedMinutes;

    while (dayRemainingMinutes >= 30 && topicIdx < rankedTopics.length) {
      const topic = rankedTopics[topicIdx];
      const slotDuration = Math.min(
        config.maxSessionMinutes || 50,
        Math.max(30, Math.round(topic.estimatedHours * 60)),
        dayRemainingMinutes
      );

      slots.push({
        id: `slot-study-${topic.id}-${dateStr}-${topicIdx}`,
        date: dateStr,
        subjectName: topic.subjectName,
        topicId: topic.id,
        topicTitle: `${topic.unitTitle ? `${topic.unitTitle}: ` : ''}${topic.title}`,
        activityType: topic.status === 'needs_revision' ? 'revision' : 'learning',
        durationMinutes: slotDuration,
        difficulty: topic.difficulty,
        completed: false,
        notes: topic.revisionNotes || undefined,
      });

      dayRemainingMinutes -= slotDuration + (config.breakMinutes || 10);
      topicIdx++;
    }
  });

  // Sort all slots by date
  slots.sort((a, b) => a.date.localeCompare(b.date));

  return {
    slots,
    totalAvailableHours,
    totalRequiredHours,
    isFeasible,
    conflictWarning,
    suggestedPriorities,
    generatedAt: Date.now(),
  };
}

export function getSavedSchedule(profileId: string): StudyScheduleResult | null {
  if (!profileId) return null;
  const raw = safeGetItem(`${SCHEDULE_PREFIX}${profileId}`);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed as StudyScheduleResult;
  } catch {
    return null;
  }
}

export function saveSchedule(profileId: string, schedule: StudyScheduleResult): void {
  if (!profileId) return;
  safeSetItem(`${SCHEDULE_PREFIX}${profileId}`, JSON.stringify(schedule));
}

export function toggleSlotCompletion(
  profileId: string,
  slotId: string
): StudyScheduleResult | null {
  const current = getSavedSchedule(profileId);
  if (!current || !Array.isArray(current.slots)) return null;

  const idx = current.slots.findIndex((s) => s.id === slotId);
  if (idx < 0) return null;

  current.slots[idx].completed = !current.slots[idx].completed;
  saveSchedule(profileId, current);
  return current;
}

// ==========================================
// 4. STUDY FOCUS TIMER & SESSION LOG
// ==========================================

export function getStudySessionsForProfile(profileId: string): StudySessionLog[] {
  if (!profileId) return [];
  const raw = safeGetItem(`${SESSIONS_PREFIX}${profileId}`);
  if (!raw) return [];
  try {
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function saveStudySessionsForProfile(
  profileId: string,
  sessions: StudySessionLog[]
): void {
  if (!profileId) return;
  safeSetItem(`${SESSIONS_PREFIX}${profileId}`, JSON.stringify(sessions));
}

export function logStudySession(
  profileId: string,
  session: Omit<StudySessionLog, 'id' | 'profileId'>
): StudySessionLog {
  const current = getStudySessionsForProfile(profileId);
  const now = Date.now();
  const newLog: StudySessionLog = {
    ...session,
    id: `sess-${now}-${Math.random().toString(36).slice(2, 6)}`,
    profileId,
    subjectName: sanitizeCourseTitle(session.subjectName),
  };
  saveStudySessionsForProfile(profileId, [newLog, ...current]);
  return newLog;
}

export function clearStudySessionsForProfile(profileId: string): void {
  if (!profileId) return;
  safeSetItem(`${SESSIONS_PREFIX}${profileId}`, JSON.stringify([]));
}

export function calculateStudyStats(sessions: StudySessionLog[]) {
  const todayStr = new Date().toISOString().slice(0, 10);

  let totalMinutes = 0;
  let todayMinutes = 0;
  const subjectBreakdown: Record<string, number> = {};

  sessions.forEach((s) => {
    if (s.isCompleted && s.durationMinutes > 0) {
      totalMinutes += s.durationMinutes;
      const sessionDateStr = new Date(s.completedAt).toISOString().slice(0, 10);
      if (sessionDateStr === todayStr) {
        todayMinutes += s.durationMinutes;
      }
      subjectBreakdown[s.subjectName] = (subjectBreakdown[s.subjectName] || 0) + s.durationMinutes;
    }
  });

  return {
    totalMinutes,
    totalSessions: sessions.filter((s) => s.isCompleted).length,
    todayMinutes,
    subjectBreakdown,
  };
}
