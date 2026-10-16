import { describe, it, expect, beforeEach } from 'vitest';
import {
  validateQuestion,
  addQuestion,
  getQuestionsForProfile,
  updateQuestion,
  deleteQuestion,
  createMockExam,
  startExamSession,
  getActiveExamSession,
  updateAnswerInSession,
  gradeObjectiveQuestion,
  gradeAndSubmitExam,
  updateDescriptiveEvaluation,
  addToMistakeNotebook,
  getMistakeNotebook,
  toggleMistakeMastered,
  removeFromMistakeNotebook,
  calculateExamAnalytics,
} from '../services/mockExamStorage';
import type { BankQuestion, MockExamConfig } from '../types/mockExam';

const mockStorage: Record<string, string> = {};
if (typeof globalThis.localStorage === 'undefined') {
  (globalThis as any).localStorage = {
    getItem: (k: string) => mockStorage[k] ?? null,
    setItem: (k: string, v: string) => {
      mockStorage[k] = String(v);
    },
    removeItem: (k: string) => {
      delete mockStorage[k];
    },
    clear: () => {
      Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);
    },
  };
}

describe('Mock Exam Center & Question Bank Engine', () => {
  const profileA = 'student_profile_A';
  const profileB = 'student_profile_B';

  beforeEach(() => {
    localStorage.clear();
  });

  describe('1. Question Bank CRUD & Validation', () => {
    it('starts with completely clean, zero questions for new profiles', () => {
      expect(getQuestionsForProfile(profileA)).toEqual([]);
      expect(getQuestionsForProfile(profileB)).toEqual([]);
    });

    it('validates question fields correctly for single MCQ', () => {
      // Missing subject & topic
      const inv1 = validateQuestion({
        subjectName: '',
        unitOrTopic: '',
        marks: 0,
        questionText: '',
      });
      expect(inv1.isValid).toBe(false);
      expect(inv1.errors).toContain('Subject name is required.');
      expect(inv1.errors).toContain('Unit or topic name is required.');
      expect(inv1.errors).toContain('Question text cannot be empty.');
      expect(inv1.errors).toContain('Marks must be a positive number greater than 0.');

      // MCQ missing options
      const inv2 = validateQuestion({
        subjectName: 'DSA',
        unitOrTopic: 'Trees',
        marks: 2,
        questionText: 'What is an AVL tree?',
        type: 'single_mcq',
        options: [{ id: '1', text: 'Option 1' }], // only 1 option
      });
      expect(inv2.isValid).toBe(false);
      expect(inv2.errors).toContain('MCQs must have at least 2 options.');

      // Valid single MCQ
      const valid = validateQuestion({
        subjectName: 'DSA',
        unitOrTopic: 'Trees',
        marks: 2,
        questionText: 'What is an AVL tree?',
        type: 'single_mcq',
        options: [
          { id: '1', text: 'Self-balancing BST' },
          { id: '2', text: 'Heap' },
        ],
        correctOptionIndices: [0],
      });
      expect(valid.isValid).toBe(true);
      expect(valid.errors).toHaveLength(0);
    });

    it('validates True/False questions correctly', () => {
      const inv = validateQuestion({
        subjectName: 'OS',
        unitOrTopic: 'Deadlocks',
        marks: 1,
        questionText: 'Deadlock can occur with 1 process.',
        type: 'true_false',
      });
      expect(inv.isValid).toBe(false);
      expect(inv.errors).toContain(
        'Please specify whether True or False is the correct answer.'
      );

      const valid = validateQuestion({
        subjectName: 'OS',
        unitOrTopic: 'Deadlocks',
        marks: 1,
        questionText: 'Deadlock can occur with 1 process.',
        type: 'true_false',
        correctBoolean: false,
      });
      expect(valid.isValid).toBe(true);
    });

    it('supports add, update, delete with profile isolation', () => {
      const qA = addQuestion(profileA, {
        subjectName: 'Algorithms',
        unitOrTopic: 'Sorting',
        type: 'single_mcq',
        difficulty: 'moderate',
        marks: 2,
        questionText: 'Time complexity of QuickSort average case?',
        options: [
          { id: '1', text: 'O(n log n)' },
          { id: '2', text: 'O(n^2)' },
        ],
        correctOptionIndices: [0],
      });

      expect(qA.id).toBeDefined();
      expect(getQuestionsForProfile(profileA)).toHaveLength(1);
      // Profile B must remain empty
      expect(getQuestionsForProfile(profileB)).toHaveLength(0);

      // Update question
      const updated = updateQuestion(profileA, qA.id, { marks: 4 });
      expect(updated?.marks).toBe(4);
      expect(getQuestionsForProfile(profileA)[0].marks).toBe(4);

      // Delete question
      deleteQuestion(profileA, qA.id);
      expect(getQuestionsForProfile(profileA)).toHaveLength(0);
    });
  });

  describe('2. Objective Grading Engine & Negative Marking', () => {
    const singleMCQ: BankQuestion = {
      id: 'q1',
      profileId: profileA,
      subjectName: 'Math',
      unitOrTopic: 'Calculus',
      type: 'single_mcq',
      difficulty: 'easy',
      marks: 4,
      questionText: 'Derivative of x^2?',
      options: [
        { id: '1', text: '2x' },
        { id: '2', text: 'x' },
        { id: '3', text: 'x^3 / 3' },
      ],
      correctOptionIndices: [0],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const multiMCQ: BankQuestion = {
      id: 'q2',
      profileId: profileA,
      subjectName: 'Networks',
      unitOrTopic: 'OSI',
      type: 'multiple_mcq',
      difficulty: 'moderate',
      marks: 3,
      questionText: 'Which are transport layer protocols?',
      options: [
        { id: '1', text: 'TCP' },
        { id: '2', text: 'UDP' },
        { id: '3', text: 'IP' },
      ],
      correctOptionIndices: [0, 1],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const tfQuestion: BankQuestion = {
      id: 'q3',
      profileId: profileA,
      subjectName: 'DBMS',
      unitOrTopic: 'ACID',
      type: 'true_false',
      difficulty: 'easy',
      marks: 1,
      questionText: 'SQL is a NoSQL database.',
      correctBoolean: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const descQuestion: BankQuestion = {
      id: 'q4',
      profileId: profileA,
      subjectName: 'Software Engineering',
      unitOrTopic: 'SDLC',
      type: 'descriptive',
      difficulty: 'hard',
      marks: 10,
      questionText: 'Explain the phases of the Waterfall model.',
      modelAnswer: 'Requirements, Design, Implementation, Verification, Maintenance.',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    it('grades single MCQ correctly and applies negative marking only on wrong attempts', () => {
      // Correct attempt
      const correct = gradeObjectiveQuestion(
        singleMCQ,
        {
          questionId: singleMCQ.id,
          selectedOptionIndices: [0],
          isMarkedForReview: false,
          timeSpentSeconds: 15,
          isAnswered: true,
        },
        true,
        1.0
      );
      expect(correct.isCorrect).toBe(true);
      expect(correct.marksAwarded).toBe(4);
      expect(correct.negativeDeduction).toBe(0);

      // Incorrect attempt with negative marking
      const wrong = gradeObjectiveQuestion(
        singleMCQ,
        {
          questionId: singleMCQ.id,
          selectedOptionIndices: [1],
          isMarkedForReview: false,
          timeSpentSeconds: 20,
          isAnswered: true,
        },
        true,
        1.0
      );
      expect(wrong.isCorrect).toBe(false);
      expect(wrong.marksAwarded).toBe(0);
      expect(wrong.negativeDeduction).toBe(1.0);

      // Skipped / Unanswered question: NO negative marks deducted
      const skipped = gradeObjectiveQuestion(
        singleMCQ,
        {
          questionId: singleMCQ.id,
          selectedOptionIndices: [],
          isMarkedForReview: false,
          timeSpentSeconds: 5,
          isAnswered: false,
        },
        true,
        1.0
      );
      expect(skipped.isCorrect).toBe(null);
      expect(skipped.marksAwarded).toBe(0);
      expect(skipped.negativeDeduction).toBe(0);
    });

    it('grades multiple MCQ with exact match requirement', () => {
      // Partial attempt (only selected 0, missed 1) -> incorrect
      const partial = gradeObjectiveQuestion(multiMCQ, {
        questionId: multiMCQ.id,
        selectedOptionIndices: [0],
        isMarkedForReview: false,
        timeSpentSeconds: 30,
        isAnswered: true,
      });
      expect(partial.isCorrect).toBe(false);
      expect(partial.marksAwarded).toBe(0);

      // Full correct attempt
      const full = gradeObjectiveQuestion(multiMCQ, {
        questionId: multiMCQ.id,
        selectedOptionIndices: [0, 1],
        isMarkedForReview: false,
        timeSpentSeconds: 30,
        isAnswered: true,
      });
      expect(full.isCorrect).toBe(true);
      expect(full.marksAwarded).toBe(3);
    });

    it('grades True/False correctly', () => {
      const wrong = gradeObjectiveQuestion(
        tfQuestion,
        {
          questionId: tfQuestion.id,
          selectedBoolean: true,
          isMarkedForReview: false,
          timeSpentSeconds: 10,
          isAnswered: true,
        },
        true,
        0.5
      );
      expect(wrong.isCorrect).toBe(false);
      expect(wrong.negativeDeduction).toBe(0.5);

      const right = gradeObjectiveQuestion(tfQuestion, {
        questionId: tfQuestion.id,
        selectedBoolean: false,
        isMarkedForReview: false,
        timeSpentSeconds: 10,
        isAnswered: true,
      });
      expect(right.isCorrect).toBe(true);
      expect(right.marksAwarded).toBe(1);
    });

    it('never pretends descriptive answers are auto-evaluated; supports self-awarding marks', () => {
      const descRes = gradeObjectiveQuestion(descQuestion, {
        questionId: descQuestion.id,
        descriptiveText: 'Waterfall is a sequential process...',
        selfAwardedMarks: 8,
        isMarkedForReview: false,
        timeSpentSeconds: 200,
        isAnswered: true,
      });
      expect(descRes.isCorrect).toBe(null); // not automated
      expect(descRes.marksAwarded).toBe(8);
      expect(descRes.negativeDeduction).toBe(0);
    });
  });

  describe('3. Session Autosave, Submission & Recovery', () => {
    it('creates active session, updates answers, and prevents duplicate submissions', () => {
      const q1 = addQuestion(profileA, {
        subjectName: 'Physics',
        unitOrTopic: 'Optics',
        type: 'single_mcq',
        difficulty: 'easy',
        marks: 2,
        questionText: 'Speed of light in vacuum?',
        options: [
          { id: '1', text: '3x10^8 m/s' },
          { id: '2', text: '3x10^6 m/s' },
        ],
        correctOptionIndices: [0],
      });

      const q2 = addQuestion(profileA, {
        subjectName: 'Physics',
        unitOrTopic: 'Optics',
        type: 'descriptive',
        difficulty: 'moderate',
        marks: 5,
        questionText: 'Derive Snell law of refraction.',
      });

      const examConfig: MockExamConfig = createMockExam(profileA, {
        title: 'Physics Mock 1',
        durationMinutes: 30,
        totalMarks: 7,
        subjects: ['Physics'],
        questionIds: [q1.id, q2.id],
        enableNegativeMarking: true,
        negativeMarkingValue: 0.5,
      });

      // Start Exam
      const session = startExamSession(profileA, examConfig, [q1, q2]);
      expect(session).toBeDefined();
      expect(session.isSubmitted).toBe(false);
      expect(getActiveExamSession(profileA)).not.toBeNull();

      // Update answer in session
      updateAnswerInSession(profileA, q1.id, { selectedOptionIndices: [0] });
      const refreshedSession = getActiveExamSession(profileA);
      expect(refreshedSession?.answers[q1.id].isAnswered).toBe(true);

      // Submit exam
      const attemptRecord = gradeAndSubmitExam(refreshedSession!);
      expect(attemptRecord.isSubmitted).toBe(true);
      expect(attemptRecord.totalQuestions).toBe(2);
      expect(attemptRecord.answeredCount).toBe(1); // q1 answered, q2 left empty
      expect(attemptRecord.correctCount).toBe(1);
      expect(attemptRecord.totalObtainedMarks).toBe(2);

      // Active session should be cleared after submit
      expect(getActiveExamSession(profileA)).toBeNull();

      // Student later evaluates their descriptive question q2
      const updatedAttempt = updateDescriptiveEvaluation(
        profileA,
        attemptRecord.id,
        q2.id,
        4
      );
      expect(updatedAttempt?.descriptiveObtainedMarks).toBe(4);
      expect(updatedAttempt?.totalObtainedMarks).toBe(6); // 2 objective + 4 descriptive
      expect(updatedAttempt?.percentage).toBe(85.7);
    });
  });

  describe('4. Mistake Notebook', () => {
    it('saves missed questions, prevents duplicate rows, and toggles mastery', () => {
      const q = addQuestion(profileA, {
        subjectName: 'Operating Systems',
        unitOrTopic: 'Scheduling',
        type: 'single_mcq',
        difficulty: 'hard',
        marks: 2,
        questionText: 'Which scheduling algorithm can cause starvation?',
        options: [
          { id: '1', text: 'Round Robin' },
          { id: '2', text: 'SJF Priority' },
        ],
        correctOptionIndices: [1],
      });

      // Add to mistakes
      const item1 = addToMistakeNotebook(
        profileA,
        q,
        'Confused Round Robin with Priority',
        'Remember priority without aging causes starvation.'
      );
      expect(item1.isMastered).toBe(false);
      expect(getMistakeNotebook(profileA)).toHaveLength(1);

      // Add same question again: updates notes rather than creating duplicate
      addToMistakeNotebook(
        profileA,
        q,
        'Revised reason',
        'Updated personal tip'
      );
      expect(getMistakeNotebook(profileA)).toHaveLength(1);
      expect(getMistakeNotebook(profileA)[0].reasonForMistake).toBe('Revised reason');

      // Toggle mastery
      toggleMistakeMastered(profileA, item1.id, true);
      expect(getMistakeNotebook(profileA)[0].isMastered).toBe(true);

      // Remove from notebook
      removeFromMistakeNotebook(profileA, item1.id);
      expect(getMistakeNotebook(profileA)).toHaveLength(0);
    });
  });

  describe('5. Performance Analytics Engine', () => {
    it('correctly calculates accuracy, weak topics, and strong topics', () => {
      const qMath1: BankQuestion = {
        id: 'qm1',
        profileId: profileA,
        subjectName: 'Mathematics',
        unitOrTopic: 'Matrices',
        type: 'single_mcq',
        difficulty: 'easy',
        marks: 2,
        questionText: 'Identity matrix determinant?',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const qMath2: BankQuestion = {
        id: 'qm2',
        profileId: profileA,
        subjectName: 'Mathematics',
        unitOrTopic: 'Calculus',
        type: 'single_mcq',
        difficulty: 'hard',
        marks: 2,
        questionText: 'Integral of sin(x)?',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const mockAttemptRecord = {
        id: 'att_1',
        profileId: profileA,
        examConfigId: 'cfg_1',
        examTitle: 'Math Mock 1',
        startedAt: Date.now() - 100000,
        submittedAt: Date.now(),
        durationSecondsTaken: 900,
        remainingSecondsOnSubmit: 300,
        questions: [qMath1, qMath2],
        answers: {
          qm1: {
            questionId: 'qm1',
            isMarkedForReview: false,
            timeSpentSeconds: 30,
            isAnswered: true,
          },
          qm2: {
            questionId: 'qm2',
            isMarkedForReview: false,
            timeSpentSeconds: 40,
            isAnswered: true,
          },
        },
        isSubmitted: true,
        totalQuestions: 2,
        answeredCount: 2,
        unansweredCount: 0,
        markedForReviewCount: 0,
        correctCount: 1,
        incorrectCount: 1,
        objectiveObtainedMarks: 2,
        descriptiveObtainedMarks: 0,
        negativeMarksDeducted: 0,
        totalObtainedMarks: 2,
        maxMarks: 4,
        percentage: 50,
        isPassed: true,
        questionResults: {
          qm1: { isCorrect: true, marksAwarded: 2, negativeDeduction: 0 },
          qm2: { isCorrect: false, marksAwarded: 0, negativeDeduction: 0 },
        },
      };

      const analytics = calculateExamAnalytics([mockAttemptRecord], [qMath1, qMath2]);

      expect(analytics.totalAttempts).toBe(1);
      expect(analytics.averageScorePercentage).toBe(50);
      expect(analytics.overallAccuracyPercentage).toBe(50);
      expect(analytics.subjectAccuracy['Mathematics'].accuracyPercentage).toBe(50);

      // Matrices accuracy: 100% -> strong topic
      expect(analytics.strongTopics.some((t) => t.includes('Matrices'))).toBe(true);
      // Calculus accuracy: 0% -> weak topic (< 60%)
      expect(analytics.weakTopics.some((t) => t.includes('Calculus'))).toBe(true);

      // Suggested questions to retry should include missed Calculus question
      expect(analytics.suggestedQuestionsToRetry.some((q) => q.id === 'qm2')).toBe(true);
    });
  });
});
