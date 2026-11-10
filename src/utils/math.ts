import type { CenterPoint, Point2D, RotationState, ShapeType } from '../types/rotation';

export const EPSILON = 1e-10;
export const DEG = Math.PI / 180;

export const DEFAULT_STATE: RotationState = {
  point: { x: 3, y: 2 },
  center: { a: 0, b: 0 },
  angleDegree: 90,
  direction: 1,
  shape: 'point',
};

export const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

/**
 * Normalisasi sudut ke rentang [0, 360).
 * Rumus `((deg % 360) + 360) % 360` aman untuk sudut negatif maupun > 360.
 */
export function normalizeDegree(deg: number): number {
  if (!Number.isFinite(deg)) return 0;
  return ((deg % 360) + 360) % 360;
}

/** Membulatkan sekaligus menormalkan -0 menjadi 0. */
export const trim = (value: number, precision = 4): number => {
  const rounded = Number(Number(value).toFixed(precision));
  return Object.is(rounded, -0) ? 0 : rounded;
};

/**
 * cosinus dengan toleransi floating point: cos(90°) harus tepat 0.
 */
export function safeCos(deg: number): number {
  const value = Math.cos(normalizeDegree(deg) * DEG);
  if (Math.abs(value) < EPSILON) return 0;
  if (Math.abs(value - 1) < EPSILON) return 1;
  if (Math.abs(value + 1) < EPSILON) return -1;
  return trim(value);
}

/**
 * sinus dengan toleransi floating point: sin(180°) harus tepat 0.
 */
export function safeSin(deg: number): number {
  const value = Math.sin(normalizeDegree(deg) * DEG);
  if (Math.abs(value) < EPSILON) return 0;
  if (Math.abs(value - 1) < EPSILON) return 1;
  if (Math.abs(value + 1) < EPSILON) return -1;
  return trim(value);
}

export function rotatePoint(point: Point2D, center: CenterPoint, angleDegree: number): Point2D {
  const cos = safeCos(angleDegree);
  const sin = safeSin(angleDegree);
  const dx = point.x - center.a;
  const dy = point.y - center.b;

  return {
    x: trim(center.a + dx * cos - dy * sin),
    y: trim(center.b + dx * sin + dy * cos),
  };
}

export function effectiveAngle(state: RotationState): number {
  return state.angleDegree * state.direction;
}

export function shapeVertices(shape: ShapeType, point: Point2D): Point2D[] {
  if (shape === 'triangle') {
    return [
      { x: point.x - 2, y: point.y - 1 },
      { x: point.x + 2, y: point.y - 1 },
      { x: point.x, y: point.y + 2 },
    ];
  }

  if (shape === 'square') {
    return [
      { x: point.x - 1.5, y: point.y - 1.5 },
      { x: point.x + 1.5, y: point.y - 1.5 },
      { x: point.x + 1.5, y: point.y + 1.5 },
      { x: point.x - 1.5, y: point.y + 1.5 },
    ];
  }

  return [{ x: point.x, y: point.y }];
}

export function shapeLabels(shape: ShapeType): string[] {
  if (shape === 'triangle') return ['A', 'B', 'C'];
  if (shape === 'square') return ['A', 'B', 'C', 'D'];
  return ['P'];
}

export const formatNumber = (value: number): string => String(trim(value, 4));

export const texNumber = (value: number): string => {
  const text = formatNumber(value);
  return value < 0 ? `(${text})` : text;
};

export const angleLabel = (deg: number): string => `${trim(deg, 2)}\u00B0`;

export function niceStep(raw: number): number {
  if (!Number.isFinite(raw) || raw <= 0) return 1;
  const exponent = Math.floor(Math.log10(raw));
  const base = 10 ** exponent;
  const fraction = raw / base;
  const multiplier = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10;
  return multiplier * base;
}
