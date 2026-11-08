import type { QuizQuestion, RotationState } from '../types/rotation';

export interface QuizAnswerRecord {
  correct: boolean;
}

export interface QuizProgressV1 {
  version: 1;
  questions: QuizQuestion[];
  index: number;
  selected: number | null;
  answers: QuizAnswerRecord[];
  finished: boolean;
}

const STORAGE_KEY = 'rotasi-quiz-v1';
const VERSION = 1;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const isPoint = (value: unknown): boolean =>
  isRecord(value) && isFiniteNumber(value.x) && isFiniteNumber(value.y);

function isRotationState(value: unknown): value is RotationState {
  if (!isRecord(value)) return false;
  const { point, center, angleDegree, direction, shape } = value;

  return (
    isPoint(point) &&
    isRecord(center) &&
    isFiniteNumber(center.a) &&
    isFiniteNumber(center.b) &&
    isFiniteNumber(angleDegree) &&
    (direction === 1 || direction === -1) &&
    (shape === 'point' || shape === 'triangle' || shape === 'square')
  );
}

function isQuestion(value: unknown): value is QuizQuestion {
  if (!isRecord(value)) return false;

  const options = value.options;
  const correctIndex = value.correctIndex;

  return (
    typeof value.id === 'string' &&
    typeof value.prompt === 'string' &&
    (value.answerTex === undefined || typeof value.answerTex === 'string') &&
    Array.isArray(options) &&
    options.length >= 2 &&
    options.every(isPoint) &&
    isFiniteNumber(correctIndex) &&
    Number.isInteger(correctIndex) &&
    correctIndex >= 0 &&
    correctIndex < options.length &&
    typeof value.explanation === 'string' &&
    isRotationState(value.params)
  );
}

const isAnswerRecord = (value: unknown): value is QuizAnswerRecord =>
  isRecord(value) && typeof value.correct === 'boolean';

/**
 * Membaca progres kuis dari localStorage. Data yang tidak konsisten diabaikan
 * agar soal yang diregenerasi tidak pernah tampil dengan jawaban basi.
 */
export function loadQuizProgress(): QuizProgressV1 | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed) || parsed.version !== VERSION) return null;

    const rawQuestions = parsed.questions;
    if (!Array.isArray(rawQuestions)) return null;
    const questions = rawQuestions.filter(isQuestion);
    if (questions.length === 0 || questions.length !== rawQuestions.length) return null;

    const index = parsed.index;
    if (!isFiniteNumber(index) || !Number.isInteger(index) || index < 0 || index >= questions.length) {
      return null;
    }

    const selected = parsed.selected;
    if (
      selected !== null &&
      (!isFiniteNumber(selected) ||
        !Number.isInteger(selected) ||
        selected < 0 ||
        selected >= questions[index].options.length)
    ) {
      return null;
    }

    const rawAnswers = parsed.answers;
    if (!Array.isArray(rawAnswers)) return null;
    const answers = rawAnswers.filter(isAnswerRecord);
    if (answers.length !== rawAnswers.length || answers.length > questions.length) return null;
    if (typeof parsed.finished !== 'boolean') return null;

    /* Jawaban harus tepat selaras dengan posisi soal dan pilihan yang tersimpan. */
    const expectedAnswers = index + (selected !== null ? 1 : 0);
    if (answers.length !== expectedAnswers) return null;
    if (parsed.finished && (selected === null || index !== questions.length - 1)) return null;

    return { version: VERSION, questions, index, selected, answers, finished: parsed.finished };
  } catch {
    return null;
  }
}

export function saveQuizProgress(progress: QuizProgressV1): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    /* penyimpanan penuh atau diblokir browser */
  }
}

