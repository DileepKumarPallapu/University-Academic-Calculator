import type {
  BankQuestion,
  MockExamConfig,
  QuestionUserAnswer,
  ExamAttemptRecord,
  ActiveExamSession,
  MistakeNotebookItem,
  ExamPerformanceAnalytics,
} from '../types/mockExam';

const QUESTION_BANK_KEY_PREFIX = 'academic_question_bank_';
const MOCK_EXAMS_KEY_PREFIX = 'academic_mock_exams_';
const EXAM_ATTEMPTS_KEY_PREFIX = 'academic_exam_attempts_';
const ACTIVE_ATTEMPT_KEY_PREFIX = 'academic_active_attempt_';
const MISTAKE_NOTEBOOK_KEY_PREFIX = 'academic_mistake_notebook_';

function safeGetItem<T>(key: string, defaultValue: T): T {
  try {
    if (typeof localStorage === 'undefined') return defaultValue;
    const raw = localStorage.getItem(key);
    if (!raw) return defaultValue;
    return JSON.parse(raw) as T;
  } catch {
    return defaultValue;
  }
}

function safeSetItem<T>(key: string, value: T): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error('Failed to save to localStorage:', err);
  }
}

// ==========================================
// 1. QUESTION BANK CRUD & VALIDATION
// ==========================================

export function getQuestionsForProfile(profileId: string): BankQuestion[] {
  if (!profileId) return [];
  return safeGetItem<BankQuestion[]>(`${QUESTION_BANK_KEY_PREFIX}${profileId}`, []);
}

export function saveQuestionsForProfile(profileId: string, questions: BankQuestion[]): void {
  if (!profileId) return;
  safeSetItem(`${QUESTION_BANK_KEY_PREFIX}${profileId}`, questions);
}

export function validateQuestion(q: Partial<BankQuestion>): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!q.subjectName || q.subjectName.trim().length === 0) {
    errors.push('Subject name is required.');
  }

  if (!q.unitOrTopic || q.unitOrTopic.trim().length === 0) {
    errors.push('Unit or topic name is required.');
  }

  if (!q.questionText || q.questionText.trim().length === 0) {
    errors.push('Question text cannot be empty.');
  }

  if (typeof q.marks !== 'number' || q.marks <= 0 || isNaN(q.marks)) {
    errors.push('Marks must be a positive number greater than 0.');
  }

  if (q.type === 'single_mcq' || q.type === 'multiple_mcq') {
    if (!q.options || q.options.length < 2) {
      errors.push('MCQs must have at least 2 options.');
    } else {
      const emptyOpt = q.options.some((opt) => !opt.text || opt.text.trim().length === 0);
      if (emptyOpt) {
        errors.push('All options must have non-empty text.');
      }
    }

    if (!q.correctOptionIndices || q.correctOptionIndices.length === 0) {
      errors.push('Please select at least one correct option.');
    } else if (q.type === 'single_mcq' && q.correctOptionIndices.length !== 1) {
      errors.push('Single MCQ must have exactly one correct option.');
    } else if (q.options) {
      const outOfBounds = q.correctOptionIndices.some(
        (idx) => idx < 0 || idx >= (q.options?.length ?? 0)
      );
      if (outOfBounds) {
        errors.push('Selected correct option index is invalid.');
      }
    }
  }

  if (q.type === 'true_false') {
    if (typeof q.correctBoolean !== 'boolean') {
      errors.push('Please specify whether True or False is the correct answer.');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function addQuestion(
  profileId: string,
  questionData: Omit<BankQuestion, 'id' | 'profileId' | 'createdAt' | 'updatedAt'>
): BankQuestion {
  const questions = getQuestionsForProfile(profileId);
  const now = Date.now();
  const newQuestion: BankQuestion = {
    ...questionData,
    id: `q_${now}_${Math.random().toString(36).substring(2, 7)}`,
    profileId,
    createdAt: now,
    updatedAt: now,
  };

  const updated = [newQuestion, ...questions];
  saveQuestionsForProfile(profileId, updated);
  return newQuestion;
}

export function updateQuestion(
  profileId: string,
  id: string,
  updates: Partial<Omit<BankQuestion, 'id' | 'profileId' | 'createdAt'>>
): BankQuestion | null {
  const questions = getQuestionsForProfile(profileId);
  const index = questions.findIndex((q) => q.id === id);
  if (index === -1) return null;

  const updatedQuestion: BankQuestion = {
    ...questions[index],
    ...updates,
    updatedAt: Date.now(),
  };

  questions[index] = updatedQuestion;
  saveQuestionsForProfile(profileId, questions);
  return updatedQuestion;
}

export function deleteQuestion(profileId: string, id: string): void {
  const questions = getQuestionsForProfile(profileId);
  const filtered = questions.filter((q) => q.id !== id);
  saveQuestionsForProfile(profileId, filtered);
}

// ==========================================
// 2. MOCK EXAM CONFIG CRUD
// ==========================================

export function getMockExamsForProfile(profileId: string): MockExamConfig[] {
  if (!profileId) return [];
  return safeGetItem<MockExamConfig[]>(`${MOCK_EXAMS_KEY_PREFIX}${profileId}`, []);
}

export function saveMockExamsForProfile(profileId: string, exams: MockExamConfig[]): void {
  if (!profileId) return;
  safeSetItem(`${MOCK_EXAMS_KEY_PREFIX}${profileId}`, exams);
}

export function createMockExam(
  profileId: string,
  examData: Omit<MockExamConfig, 'id' | 'profileId' | 'createdAt' | 'updatedAt'>
): MockExamConfig {
  const exams = getMockExamsForProfile(profileId);
  const now = Date.now();
  const newExam: MockExamConfig = {
    ...examData,
    id: `exam_${now}_${Math.random().toString(36).substring(2, 7)}`,
    profileId,
    createdAt: now,
    updatedAt: now,
  };

  const updated = [newExam, ...exams];
  saveMockExamsForProfile(profileId, updated);
  return newExam;
}

export function updateMockExam(
  profileId: string,
  id: string,
  updates: Partial<Omit<MockExamConfig, 'id' | 'profileId' | 'createdAt'>>
): MockExamConfig | null {
  const exams = getMockExamsForProfile(profileId);
  const index = exams.findIndex((e) => e.id === id);
  if (index === -1) return null;

  const updatedExam: MockExamConfig = {
    ...exams[index],
    ...updates,
    updatedAt: Date.now(),
  };

  exams[index] = updatedExam;
  saveMockExamsForProfile(profileId, exams);
  return updatedExam;
}

export function deleteMockExam(profileId: string, id: string): void {
  const exams = getMockExamsForProfile(profileId);
  const filtered = exams.filter((e) => e.id !== id);
  saveMockExamsForProfile(profileId, filtered);
}

// ==========================================
// 3. ACTIVE EXAM SESSION & AUTOSAVE
// ==========================================

export function getActiveExamSession(profileId: string): ActiveExamSession | null {
  if (!profileId) return null;
  const session = safeGetItem<ActiveExamSession | null>(
    `${ACTIVE_ATTEMPT_KEY_PREFIX}${profileId}`,
    null
  );
  if (!session) return null;

  // Refresh remaining seconds against targetEndTime
  const now = Date.now();
  if (session.targetEndTime && !session.isSubmitted) {
    const remaining = Math.max(0, Math.ceil((session.targetEndTime - now) / 1000));
    session.remainingSeconds = remaining;
  }

  return session;
}

export function saveActiveExamSession(session: ActiveExamSession): void {
  if (!session?.profileId) return;
  safeSetItem(`${ACTIVE_ATTEMPT_KEY_PREFIX}${session.profileId}`, session);
}

export function clearActiveExamSession(profileId: string): void {
  if (!profileId) return;
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem(`${ACTIVE_ATTEMPT_KEY_PREFIX}${profileId}`);
  } catch (err) {
    console.error('Failed to clear active exam session:', err);
  }
}

export function startExamSession(
  profileId: string,
  examConfig: MockExamConfig,
  questions: BankQuestion[]
): ActiveExamSession {
  const now = Date.now();
  const durationSeconds = examConfig.durationMinutes * 60;
  const targetEndTime = now + durationSeconds * 1000;

  const defaultAnswers: Record<string, QuestionUserAnswer> = {};
  questions.forEach((q) => {
    defaultAnswers[q.id] = {
      questionId: q.id,
      selectedOptionIndices: [],
      selectedBoolean: undefined,
      descriptiveText: '',
      selfAwardedMarks: undefined,
      isMarkedForReview: false,
      timeSpentSeconds: 0,
      isAnswered: false,
    };
  });

  const session: ActiveExamSession = {
    attemptId: `att_${now}_${Math.random().toString(36).substring(2, 7)}`,
    profileId,
    examConfigId: examConfig.id,
    examTitle: examConfig.title,
    durationMinutes: examConfig.durationMinutes,
    remainingSeconds: durationSeconds,
    targetEndTime,
    questions,
    answers: defaultAnswers,
    currentQuestionIndex: 0,
    enableNegativeMarking: examConfig.enableNegativeMarking,
    negativeMarkingValue: examConfig.negativeMarkingValue || 0,
    isSubmitted: false,
  };

  saveActiveExamSession(session);
  return session;
}

export function updateAnswerInSession(
  profileId: string,
  questionId: string,
  updates: Partial<QuestionUserAnswer>
): ActiveExamSession | null {
  const session = getActiveExamSession(profileId);
  if (!session || session.isSubmitted) return null;

  const existing = session.answers[questionId] || {
    questionId,
    isMarkedForReview: false,
    timeSpentSeconds: 0,
    isAnswered: false,
  };

  const updatedAnswer = { ...existing, ...updates };

  // Calculate isAnswered flag accurately
  let hasAnswer = false;
  if (
    updatedAnswer.selectedOptionIndices &&
    updatedAnswer.selectedOptionIndices.length > 0
  ) {
    hasAnswer = true;
  } else if (typeof updatedAnswer.selectedBoolean === 'boolean') {
    hasAnswer = true;
  } else if (
    updatedAnswer.descriptiveText &&
    updatedAnswer.descriptiveText.trim().length > 0
  ) {
    hasAnswer = true;
  }
  updatedAnswer.isAnswered = hasAnswer;

  session.answers[questionId] = updatedAnswer;
  saveActiveExamSession(session);
  return session;
}

// ==========================================
// 4. OBJECTIVE GRADING & SUBMISSION ENGINE
// ==========================================

export function gradeObjectiveQuestion(
  question: BankQuestion,
  answer?: QuestionUserAnswer,
  enableNegativeMarking = false,
  negativeMarkingValue = 0
): { isCorrect: boolean | null; marksAwarded: number; negativeDeduction: number } {
  // If not answered, 0 marks, 0 deduction, null correctness
  if (!answer || !answer.isAnswered) {
    return { isCorrect: null, marksAwarded: 0, negativeDeduction: 0 };
  }

  // Single MCQ
  if (question.type === 'single_mcq') {
    const selected = answer.selectedOptionIndices ?? [];
    const correct = question.correctOptionIndices ?? [];
    if (selected.length === 1 && correct.length === 1 && selected[0] === correct[0]) {
      return { isCorrect: true, marksAwarded: question.marks, negativeDeduction: 0 };
    } else {
      const deduction = enableNegativeMarking ? negativeMarkingValue : 0;
      return { isCorrect: false, marksAwarded: 0, negativeDeduction: deduction };
    }
  }

  // Multiple MCQ
  if (question.type === 'multiple_mcq') {
    const selected = [...(answer.selectedOptionIndices ?? [])].sort();
    const correct = [...(question.correctOptionIndices ?? [])].sort();
    const isExactMatch =
      selected.length === correct.length &&
      selected.every((val, idx) => val === correct[idx]);

    if (isExactMatch) {
      return { isCorrect: true, marksAwarded: question.marks, negativeDeduction: 0 };
    } else {
      const deduction = enableNegativeMarking ? negativeMarkingValue : 0;
      return { isCorrect: false, marksAwarded: 0, negativeDeduction: deduction };
    }
  }

  // True / False
  if (question.type === 'true_false') {
    if (
      typeof answer.selectedBoolean === 'boolean' &&
      answer.selectedBoolean === question.correctBoolean
    ) {
      return { isCorrect: true, marksAwarded: question.marks, negativeDeduction: 0 };
    } else {
      const deduction = enableNegativeMarking ? negativeMarkingValue : 0;
      return { isCorrect: false, marksAwarded: 0, negativeDeduction: deduction };
    }
  }

  // Descriptive questions are NOT auto-graded as authoritative
  if (question.type === 'descriptive') {
    const selfMarks = Math.min(
      question.marks,
      Math.max(0, answer.selfAwardedMarks ?? 0)
    );
    return {
      isCorrect: null,
      marksAwarded: selfMarks,
      negativeDeduction: 0,
    };
  }

  return { isCorrect: null, marksAwarded: 0, negativeDeduction: 0 };
}

export function getAttemptsForProfile(profileId: string): ExamAttemptRecord[] {
  if (!profileId) return [];
  return safeGetItem<ExamAttemptRecord[]>(`${EXAM_ATTEMPTS_KEY_PREFIX}${profileId}`, []);
}

export function saveAttemptsForProfile(
  profileId: string,
  attempts: ExamAttemptRecord[]
): void {
  if (!profileId) return;
  safeSetItem(`${EXAM_ATTEMPTS_KEY_PREFIX}${profileId}`, attempts);
}

export function gradeAndSubmitExam(session: ActiveExamSession): ExamAttemptRecord {
  const now = Date.now();
  const profileId = session.profileId;
  const questions = session.questions;
  const answers = session.answers;

  let answeredCount = 0;
  let markedForReviewCount = 0;
  let correctCount = 0;
  let incorrectCount = 0;
  let objectiveObtainedMarks = 0;
  let descriptiveObtainedMarks = 0;
  let negativeMarksDeducted = 0;
  let maxMarks = 0;

  const questionResults: ExamAttemptRecord['questionResults'] = {};

  questions.forEach((q) => {
    maxMarks += q.marks;
    const ans = answers[q.id];

    if (ans?.isMarkedForReview) {
      markedForReviewCount++;
    }

    if (ans?.isAnswered) {
      answeredCount++;
    }

    const result = gradeObjectiveQuestion(
      q,
      ans,
      session.enableNegativeMarking,
      session.negativeMarkingValue
    );

    if (q.type === 'descriptive') {
      descriptiveObtainedMarks += result.marksAwarded;
    } else {
      objectiveObtainedMarks += result.marksAwarded;
      negativeMarksDeducted += result.negativeDeduction;

      if (result.isCorrect === true) {
        correctCount++;
      } else if (result.isCorrect === false) {
        incorrectCount++;
      }
    }

    questionResults[q.id] = {
      isCorrect: result.isCorrect,
      marksAwarded: result.marksAwarded,
      negativeDeduction: result.negativeDeduction,
      explanation: q.explanation || q.revisionNotes,
    };
  });

  const unansweredCount = questions.length - answeredCount;
  const netScore = objectiveObtainedMarks + descriptiveObtainedMarks - negativeMarksDeducted;
  const totalObtainedMarks = Math.max(0, Number(netScore.toFixed(2)));
  const percentage = maxMarks > 0 ? Number(((totalObtainedMarks / maxMarks) * 100).toFixed(1)) : 0;
  const isPassed = percentage >= 40;

  const totalDurationSeconds = session.durationMinutes * 60;
  const remainingSeconds = Math.max(0, session.remainingSeconds);
  const durationSecondsTaken = Math.max(0, totalDurationSeconds - remainingSeconds);

  const attemptRecord: ExamAttemptRecord = {
    id: session.attemptId,
    profileId,
    examConfigId: session.examConfigId,
    examTitle: session.examTitle,
    startedAt: now - durationSecondsTaken * 1000,
    submittedAt: now,
    durationSecondsTaken,
    remainingSecondsOnSubmit: remainingSeconds,
    questions,
    answers,
    isSubmitted: true,
    totalQuestions: questions.length,
    answeredCount,
    unansweredCount,
    markedForReviewCount,
    correctCount,
    incorrectCount,
    objectiveObtainedMarks,
    descriptiveObtainedMarks,
    negativeMarksDeducted,
    totalObtainedMarks,
    maxMarks,
    percentage,
    isPassed,
    questionResults,
  };

  // Prevent duplicate submission and clear active session
  clearActiveExamSession(profileId);

  // Save to attempts list
  const existingAttempts = getAttemptsForProfile(profileId);
  // Avoid duplicate attempt ID
  const filtered = existingAttempts.filter((att) => att.id !== attemptRecord.id);
  const updatedAttempts = [attemptRecord, ...filtered];
  saveAttemptsForProfile(profileId, updatedAttempts);

  return attemptRecord;
}

export function updateDescriptiveEvaluation(
  profileId: string,
  attemptId: string,
  questionId: string,
  selfAwardedMarks: number
): ExamAttemptRecord | null {
  const attempts = getAttemptsForProfile(profileId);
  const attemptIndex = attempts.findIndex((att) => att.id === attemptId);
  if (attemptIndex === -1) return null;

  const attempt = attempts[attemptIndex];
  const question = attempt.questions.find((q) => q.id === questionId);
  if (!question || question.type !== 'descriptive') return null;

  const boundedMarks = Math.min(question.marks, Math.max(0, selfAwardedMarks));

  if (!attempt.answers[questionId]) {
    attempt.answers[questionId] = {
      questionId,
      isMarkedForReview: false,
      timeSpentSeconds: 0,
      isAnswered: true,
    };
  }
  attempt.answers[questionId].selfAwardedMarks = boundedMarks;

  if (attempt.questionResults[questionId]) {
    attempt.questionResults[questionId].marksAwarded = boundedMarks;
  }

  // Recalculate totals
  let newDescriptiveMarks = 0;
  attempt.questions.forEach((q) => {
    if (q.type === 'descriptive') {
      newDescriptiveMarks += attempt.answers[q.id]?.selfAwardedMarks ?? 0;
    }
  });

  attempt.descriptiveObtainedMarks = newDescriptiveMarks;
  const net =
    attempt.objectiveObtainedMarks +
    attempt.descriptiveObtainedMarks -
    attempt.negativeMarksDeducted;
  attempt.totalObtainedMarks = Math.max(0, Number(net.toFixed(2)));
  attempt.percentage =
    attempt.maxMarks > 0
      ? Number(((attempt.totalObtainedMarks / attempt.maxMarks) * 100).toFixed(1))
      : 0;
  attempt.isPassed = attempt.percentage >= 40;

  attempts[attemptIndex] = attempt;
  saveAttemptsForProfile(profileId, attempts);
  return attempt;
}

export function deleteAttempt(profileId: string, attemptId: string): void {
  const attempts = getAttemptsForProfile(profileId);
  const filtered = attempts.filter((att) => att.id !== attemptId);
  saveAttemptsForProfile(profileId, filtered);
}

// ==========================================
// 5. MISTAKE NOTEBOOK & REVISION
// ==========================================

export function getMistakeNotebook(profileId: string): MistakeNotebookItem[] {
  if (!profileId) return [];
  return safeGetItem<MistakeNotebookItem[]>(
    `${MISTAKE_NOTEBOOK_KEY_PREFIX}${profileId}`,
    []
  );
}

export function saveMistakeNotebook(
  profileId: string,
  items: MistakeNotebookItem[]
): void {
  if (!profileId) return;
  safeSetItem(`${MISTAKE_NOTEBOOK_KEY_PREFIX}${profileId}`, items);
}

export function addToMistakeNotebook(
  profileId: string,
  question: BankQuestion,
  reasonForMistake?: string,
  personalNotes?: string
): MistakeNotebookItem {
  const items = getMistakeNotebook(profileId);
  const now = Date.now();

  // If already exists, update it rather than duplicating
  const existingIndex = items.findIndex((i) => i.questionId === question.id);
  if (existingIndex !== -1) {
    const updated: MistakeNotebookItem = {
      ...items[existingIndex],
      reasonForMistake: reasonForMistake ?? items[existingIndex].reasonForMistake,
      personalNotes: personalNotes ?? items[existingIndex].personalNotes,
      savedAt: now,
      isMastered: false,
    };
    items[existingIndex] = updated;
    saveMistakeNotebook(profileId, items);
    return updated;
  }

  const newItem: MistakeNotebookItem = {
    id: `mistake_${now}_${Math.random().toString(36).substring(2, 7)}`,
    profileId,
    questionId: question.id,
    question,
    reasonForMistake,
    personalNotes,
    savedAt: now,
    isMastered: false,
  };

  const updated = [newItem, ...items];
  saveMistakeNotebook(profileId, updated);
  return newItem;
}

export function removeFromMistakeNotebook(profileId: string, itemId: string): void {
  const items = getMistakeNotebook(profileId);
  const filtered = items.filter((i) => i.id !== itemId);
  saveMistakeNotebook(profileId, filtered);
}

export function toggleMistakeMastered(
  profileId: string,
  itemId: string,
  isMastered?: boolean
): MistakeNotebookItem | null {
  const items = getMistakeNotebook(profileId);
  const index = items.findIndex((i) => i.id === itemId);
  if (index === -1) return null;

  const current = items[index];
  const nextMastered = typeof isMastered === 'boolean' ? isMastered : !current.isMastered;

  const updated: MistakeNotebookItem = {
    ...current,
    isMastered: nextMastered,
    masteredAt: nextMastered ? Date.now() : undefined,
  };

  items[index] = updated;
  saveMistakeNotebook(profileId, items);
  return updated;
}

export function updateMistakeItem(
  profileId: string,
  itemId: string,
  updates: Partial<MistakeNotebookItem>
): MistakeNotebookItem | null {
  const items = getMistakeNotebook(profileId);
  const index = items.findIndex((i) => i.id === itemId);
  if (index === -1) return null;

  const updated: MistakeNotebookItem = {
    ...items[index],
    ...updates,
  };

  items[index] = updated;
  saveMistakeNotebook(profileId, items);
  return updated;
}

// ==========================================
// 6. PERFORMANCE ANALYTICS
// ==========================================

export function calculateExamAnalytics(
  attempts: ExamAttemptRecord[],
  allQuestions: BankQuestion[]
): ExamPerformanceAnalytics {
  if (attempts.length === 0) {
    return {
      totalAttempts: 0,
      averageScorePercentage: 0,
      highestScorePercentage: 0,
      totalQuestionsAnswered: 0,
      overallAccuracyPercentage: 0,
      subjectAccuracy: {},
      topicAccuracy: {},
      strongTopics: [],
      weakTopics: [],
      scoreTrends: [],
      suggestedQuestionsToRetry: [],
    };
  }

  let totalPercentageSum = 0;
  let highestPercentage = 0;
  let totalAnswered = 0;
  let totalCorrect = 0;

  const subjectMap: Record<
    string,
    { subjectName: string; totalAnswered: number; correctCount: number }
  > = {};

  const topicMap: Record<
    string,
    { topicName: string; subjectName: string; totalAnswered: number; correctCount: number }
  > = {};

  const missedQuestionIds = new Set<string>();

  // Process chronological order for trends
  const sortedAttempts = [...attempts].sort((a, b) => a.submittedAt - b.submittedAt);
  const scoreTrends = sortedAttempts.map((att) => ({
    attemptId: att.id,
    examTitle: att.examTitle,
    date: new Date(att.submittedAt).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    }),
    percentage: att.percentage,
  }));

  attempts.forEach((att) => {
    totalPercentageSum += att.percentage;
    if (att.percentage > highestPercentage) {
      highestPercentage = att.percentage;
    }

    att.questions.forEach((q) => {
      const res = att.questionResults[q.id];
      const ans = att.answers[q.id];

      if (ans && ans.isAnswered) {
        totalAnswered++;

        // Subject tracking
        if (!subjectMap[q.subjectName]) {
          subjectMap[q.subjectName] = {
            subjectName: q.subjectName,
            totalAnswered: 0,
            correctCount: 0,
          };
        }
        subjectMap[q.subjectName].totalAnswered++;

        // Topic tracking
        const topicKey = `${q.subjectName}::${q.unitOrTopic}`;
        if (!topicMap[topicKey]) {
          topicMap[topicKey] = {
            topicName: q.unitOrTopic,
            subjectName: q.subjectName,
            totalAnswered: 0,
            correctCount: 0,
          };
        }
        topicMap[topicKey].totalAnswered++;

        if (res && res.isCorrect === true) {
          totalCorrect++;
          subjectMap[q.subjectName].correctCount++;
          topicMap[topicKey].correctCount++;
        } else if (res && res.isCorrect === false) {
          missedQuestionIds.add(q.id);
        }
      }
    });
  });

  const subjectAccuracy: ExamPerformanceAnalytics['subjectAccuracy'] = {};
  Object.keys(subjectMap).forEach((subj) => {
    const item = subjectMap[subj];
    const acc =
      item.totalAnswered > 0
        ? Number(((item.correctCount / item.totalAnswered) * 100).toFixed(1))
        : 0;
    subjectAccuracy[subj] = {
      subjectName: item.subjectName,
      totalAnswered: item.totalAnswered,
      correctCount: item.correctCount,
      accuracyPercentage: acc,
    };
  });

  const topicAccuracy: ExamPerformanceAnalytics['topicAccuracy'] = {};
  const strongTopics: string[] = [];
  const weakTopics: string[] = [];

  Object.keys(topicMap).forEach((key) => {
    const item = topicMap[key];
    const acc =
      item.totalAnswered > 0
        ? Number(((item.correctCount / item.totalAnswered) * 100).toFixed(1))
        : 0;
    topicAccuracy[key] = {
      topicName: item.topicName,
      subjectName: item.subjectName,
      totalAnswered: item.totalAnswered,
      correctCount: item.correctCount,
      accuracyPercentage: acc,
    };

    if (item.totalAnswered >= 1) {
      if (acc >= 75) {
        strongTopics.push(`${item.subjectName} - ${item.topicName} (${acc}%)`);
      } else if (acc < 60) {
        weakTopics.push(`${item.subjectName} - ${item.topicName} (${acc}%)`);
      }
    }
  });

  const averageScorePercentage = Number(
    (totalPercentageSum / attempts.length).toFixed(1)
  );
  const overallAccuracyPercentage =
    totalAnswered > 0 ? Number(((totalCorrect / totalAnswered) * 100).toFixed(1)) : 0;

  // Find suggested questions to retry from missed IDs
  const suggestedQuestionsToRetry = allQuestions.filter((q) =>
    missedQuestionIds.has(q.id)
  );

  return {
    totalAttempts: attempts.length,
    averageScorePercentage,
    highestScorePercentage: highestPercentage,
    totalQuestionsAnswered: totalAnswered,
    overallAccuracyPercentage,
    subjectAccuracy,
    topicAccuracy,
    strongTopics,
    weakTopics,
    scoreTrends,
    suggestedQuestionsToRetry,
  };
}
