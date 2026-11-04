import type { Point2D, QuizQuestion, RotationState } from '../types/rotation';
import { rotatePoint, safeCos, safeSin, texNumber, trim } from './math';

export const QUIZ_LENGTH = 5;

const OPTION_COUNT = 4;

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function shuffle<T>(items: readonly T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function nonZero(min: number, max: number): number {
  let value = 0;
  let guard = 0;
  while (value === 0 && guard < 40) {
    value = randomInt(min, max);
    guard += 1;
  }
  return value;
}

function createId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `q-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const keyOf = (point: Point2D): string => `${point.x},${point.y}`;

function buildOptions(correct: Point2D, wrongs: Point2D[]): { options: Point2D[]; correctIndex: number } {
  const seen = new Set([keyOf(correct)]);
  const pool: Point2D[] = [correct];

  for (const candidate of wrongs) {
    if (pool.length >= OPTION_COUNT) break;
    if (!Number.isFinite(candidate.x) || !Number.isFinite(candidate.y)) continue;
    if (seen.has(keyOf(candidate))) continue;
    seen.add(keyOf(candidate));
    pool.push(candidate);
  }

  let guard = 0;
  while (pool.length < OPTION_COUNT && guard < 60) {
    const candidate = { x: correct.x + randomInt(-6, 6), y: correct.y + randomInt(-6, 6) };
    if (!seen.has(keyOf(candidate))) {
      seen.add(keyOf(candidate));
      pool.push(candidate);
    }
    guard += 1;
  }

  const options = shuffle(pool);
  return {
    options,
    correctIndex: options.findIndex((option) => keyOf(option) === keyOf(correct)),
  };
}

function finish(
  base: Omit<QuizQuestion, 'id' | 'options' | 'correctIndex'>,
  correct: Point2D,
  wrongs: Point2D[]
): QuizQuestion {
  const { options, correctIndex } = buildOptions(correct, wrongs);
  return { ...base, id: createId(), options, correctIndex };
}

function params(
  x: number,
  y: number,
  a: number,
  b: number,
  angleDegree: number,
  direction: 1 | -1,
  shape: RotationState['shape']
): RotationState {
  return {
    point: { x, y },
    center: { a, b },
    angleDegree,
    direction,
    shape,
  };
}

/* Soal 1 — sudut istimewa 90°/270° berpusat di O(0,0) */
function originSpecialQuestion(): QuizQuestion {
  const angle = pick([90, 270]);
  const x = nonZero(-5, 5);
  const y = nonZero(-5, 5);
  const correct = rotatePoint({ x, y }, { a: 0, b: 0 }, angle);

  return finish(
    {
      prompt: `Titik P(${x}, ${y}) dirotasikan sebesar ${angle}° berlawanan arah jarum jam terhadap pusat O(0, 0). Koordinat bayangan P′ adalah …`,
      answerTex:
        angle === 90 ? String.raw`(x,\;y) \mapsto (-y,\;x)` : String.raw`(x,\;y) \mapsto (y,\;-x)`,
      explanation: `Pemetaan rotasi ${angle}° menghasilkan P′(${correct.x}, ${correct.y}).`,
      params: params(x, y, 0, 0, angle, 1, 'point'),
    },
    correct,
    [
      { x: y, y: x },
      { x: -x, y: -y },
      { x: -y, y: -x },
      { x, y: -y },
    ]
  );
}

/* Soal 2 — rotasi 180° */
function halfTurnQuestion(): QuizQuestion {
  const x = nonZero(-6, 6);
  const y = nonZero(-6, 6);
  const correct = { x: -x, y: -y };

  return finish(
    {
      prompt: `Titik P(${x}, ${y}) dirotasikan sebesar 180° terhadap pusat O(0, 0). Bayangan P′ terletak di …`,
      answerTex: String.raw`(x,\;y) \mapsto (-x,\;-y)`,
      explanation: `Setengah putaran membalik kedua tanda koordinat, sehingga P′(${correct.x}, ${correct.y}).`,
      params: params(x, y, 0, 0, 180, 1, 'point'),
    },
    correct,
    [
      { x: -y, y: x },
      { x: y, y: -x },
      { x: -x, y },
      { x, y: -y },
    ]
  );
}

/* Soal 3 — rotasi terhadap pusat kustom */
function customCenterQuestion(): QuizQuestion {
  const angle = pick([90, 180, 270]);
  const a = nonZero(-4, 4);
  const b = nonZero(-4, 4);
  let x = nonZero(-5, 5);
  let y = nonZero(-5, 5);
  if (x === a && y === b) x = a + 2;

  const correct = rotatePoint({ x, y }, { a, b }, angle);
  const aboutOrigin = rotatePoint({ x, y }, { a: 0, b: 0 }, angle);
  const forgotCenter = {
    x: trim((x - a) * safeCos(angle) - (y - b) * safeSin(angle)),
    y: trim((x - a) * safeSin(angle) + (y - b) * safeCos(angle)),
  };
  const swapped = { x: correct.y, y: correct.x };

  return finish(
    {
      prompt: `Titik P(${x}, ${y}) dirotasikan sebesar ${angle}° berlawanan arah jarum jam terhadap pusat (${a}, ${b}). Koordinat P′ adalah …`,
      answerTex: String.raw`\begin{pmatrix} x' \\ y' \end{pmatrix} = \begin{pmatrix} \cos ${angle}^\circ & -\sin ${angle}^\circ \\ \sin ${angle}^\circ & \cos ${angle}^\circ \end{pmatrix} \begin{pmatrix} ${x} - ${texNumber(a)} \\ ${y} - ${texNumber(b)} \end{pmatrix} + \begin{pmatrix} ${texNumber(a)} \\ ${texNumber(b)} \end{pmatrix}`,
      explanation: `Hasil akhirnya P′(${correct.x}, ${correct.y}). Setelah matriks dikalikan, offset pusat (a, b) harus ditambahkan kembali.`,
      params: params(x, y, a, b, angle, 1, 'point'),
    },
    correct,
    [forgotCenter, aboutOrigin, swapped]
  );
}

/* Soal 4 — rotasi bangun datar (segitiga) */
function shapeQuestion(): QuizQuestion {
  const angle = pick([90, 180, 270]);
  const baseX = nonZero(-3, 3);
  const baseY = nonZero(-3, 3);

  const A = { x: baseX - 2, y: baseY - 1 };
  const B = { x: baseX + 2, y: baseY - 1 };
  const C = { x: baseX, y: baseY + 2 };

  const correct = rotatePoint(A, { a: 0, b: 0 }, angle);
  const BImage = rotatePoint(B, { a: 0, b: 0 }, angle);
  const CImage = rotatePoint(C, { a: 0, b: 0 }, angle);

  const mapping =
    angle === 90
      ? String.raw`(x,\;y) \mapsto (-y,\;x)`
      : angle === 180
        ? String.raw`(x,\;y) \mapsto (-x,\;-y)`
        : String.raw`(x,\;y) \mapsto (y,\;-x)`;

  return finish(
    {
      prompt: `Segitiga ABC dengan A(${A.x}, ${A.y}), B(${B.x}, ${B.y}), dan C(${C.x}, ${C.y}) dirotasikan sebesar ${angle}° berlawanan arah jarum jam terhadap O(0, 0). Koordinat titik A′ adalah …`,
      answerTex: mapping,
      explanation: `Titik A(${A.x}, ${A.y}) dipetakan menjadi A′(${correct.x}, ${correct.y}). Seluruh bangun berputar kaku mengikuti titik A.`,
      params: params(baseX, baseY, 0, 0, angle, 1, 'triangle'),
    },
    correct,
    [BImage, CImage, { x: A.y, y: A.x }]
  );
}

/* Soal 5 — rotasi searah jarum jam */
function clockwiseQuestion(): QuizQuestion {
  const angle = pick([90, 180]);
  const x = nonZero(-5, 5);
  const y = nonZero(-5, 5);
  const effective = -angle;
  const correct = rotatePoint({ x, y }, { a: 0, b: 0 }, effective);
  const counterClockwise = rotatePoint({ x, y }, { a: 0, b: 0 }, angle);

  const mapping =
    angle === 90 ? String.raw`(x,\;y) \mapsto (y,\;-x)` : String.raw`(x,\;y) \mapsto (-x,\;-y)`;

  return finish(
    {
      prompt: `Titik P(${x}, ${y}) dirotasikan searah jarum jam sebesar ${angle}° terhadap pusat O(0, 0). Koordinat bayangan P′ adalah …`,
      answerTex: mapping,
      explanation: `Rotasi searah jarum jam berarti θ = ${effective}°, sehingga P′(${correct.x}, ${correct.y}).`,
      params: params(x, y, 0, 0, angle, -1, 'point'),
    },
    correct,
    [counterClockwise, { x: -x, y: -y }, { x: y, y: x }]
  );
}

const QUESTION_BUILDERS = [
  originSpecialQuestion,
  halfTurnQuestion,
  customCenterQuestion,
  shapeQuestion,
  clockwiseQuestion,
];

export function buildQuiz(): QuizQuestion[] {
  return shuffle(QUESTION_BUILDERS).map((builder) => builder());
}
