import type { CenterPoint, Point2D } from '../types/rotation';
import { DEG, formatNumber, niceStep } from '../utils/math';
import { drawArrowHead, drawTag } from './primitives';
import type { ContextScene, ContextScenePalette, RealWorldMode } from './types';

/**
 * Jendela koordinat tetap untuk semua konteks. Simetris terhadap titik asal
 * sehingga pusat kanvas selalu sama dengan (0, 0) dan grid tidak "melompat".
 */
export const CONTEXT_VIEW = { minX: -4, maxX: 4, minY: -3.75, maxY: 3.75 };

export interface ContextLayout {
  scale: number;
  originX: number;
  originY: number;
}

export function computeContextLayout(width: number, height: number): ContextLayout {
  const spanX = CONTEXT_VIEW.maxX - CONTEXT_VIEW.minX;
  const spanY = CONTEXT_VIEW.maxY - CONTEXT_VIEW.minY;
  const scale = Math.min(width / spanX, height / spanY) * 0.94;
  return { scale, originX: width / 2, originY: height / 2 };
}

export function getContextPalette(dark: boolean): ContextScenePalette {
  return dark
    ? {
        grid: 'rgba(148,163,184,0.12)',
        axis: '#64748b',
        tick: '#94a3b8',
        label: '#e2e8f0',
        muted: '#94a3b8',
      }
    : {
        grid: 'rgba(100,116,139,0.16)',
        axis: '#64748b',
        tick: '#475569',
        label: '#0f172a',
        muted: '#475569',
      };
}

export function createContextScene(
  width: number,
  height: number,
  config: {
    mode: RealWorldMode;
    angle: number;
    step: number;
    center: CenterPoint;
    radius: number;
    dark: boolean;
  }
): ContextScene {
  const layout = computeContextLayout(width, height);
  return {
    width,
    height,
    dark: config.dark,
    mode: config.mode,
    angle: config.angle,
    step: config.step,
    center: config.center,
    radius: config.radius,
    scale: layout.scale,
    originX: layout.originX,
    originY: layout.originY,
    palette: getContextPalette(config.dark),
  };
}

export const toX = (scene: ContextScene, x: number): number => scene.originX + x * scene.scale;
export const toY = (scene: ContextScene, y: number): number => scene.originY - y * scene.scale;

export function worldToPx(scene: ContextScene, point: Point2D): Point2D {
  return { x: toX(scene, point.x), y: toY(scene, point.y) };
}

/** Titik pada lingkaran, sudut diukur searah jarum jam dari arah jam 12. */
export function clockwisePoint(center: CenterPoint, radius: number, deg: number): Point2D {
  const rad = deg * DEG;
  return { x: center.a + radius * Math.sin(rad), y: center.b + radius * Math.cos(rad) };
}

/** Titik pada lingkaran dengan sudut matematis standar (berlawanan jarum jam). */
export function ccwPoint(center: CenterPoint, radius: number, deg: number): Point2D {
  const rad = deg * DEG;
  return { x: center.a + radius * Math.cos(rad), y: center.b + radius * Math.sin(rad) };
}

export function drawGridAndAxes(ctx: CanvasRenderingContext2D, scene: ContextScene) {
  const { palette, width, height, scale, originX, originY } = scene;
  if (scale <= 0) return;

  const step = niceStep((CONTEXT_VIEW.maxX - CONTEXT_VIEW.minX) / 8);
  const xMinWorld = (0 - originX) / scale;
  const xMaxWorld = (width - originX) / scale;
  const yMinWorld = (originY - height) / scale;
  const yMaxWorld = originY / scale;

  ctx.save();
  ctx.lineWidth = 1;
  ctx.strokeStyle = palette.grid;
  for (let i = Math.ceil(xMinWorld / step); i * step <= xMaxWorld; i += 1) {
    const x = toX(scene, i * step);
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let i = Math.ceil(yMinWorld / step); i * step <= yMaxWorld; i += 1) {
    const y = toY(scene, i * step);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  /* Sumbu x & y */
  ctx.strokeStyle = palette.axis;
  ctx.lineWidth = 1.4;
  if (originX >= 0 && originX <= width) {
    ctx.beginPath();
    ctx.moveTo(originX, 0);
    ctx.lineTo(originX, height);
    ctx.stroke();
  }
  if (originY >= 0 && originY <= height) {
    ctx.beginPath();
    ctx.moveTo(0, originY);
    ctx.lineTo(width, originY);
    ctx.stroke();
  }

  /* Label tick */
  if (step * scale >= 26) {
    ctx.font = '500 9px ui-monospace, SFMono-Regular, Consolas, monospace';
    ctx.fillStyle = palette.tick;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const labelY = Math.min(Math.max(originY + 4, 2), height - 13);
    for (let i = Math.ceil(xMinWorld / step); i * step <= xMaxWorld; i += 1) {
      if (i === 0) continue;
      ctx.fillText(formatNumber(i * step), toX(scene, i * step), labelY);
    }
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    const labelX = Math.min(Math.max(originX - 5, 20), width - 3);
    for (let i = Math.ceil(yMinWorld / step); i * step <= yMaxWorld; i += 1) {
      if (i === 0) continue;
      ctx.fillText(formatNumber(i * step), labelX, toY(scene, i * step));
    }
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.fillText('0', Math.max(originX - 4, 6), Math.min(Math.max(originY + 3, 2), height - 12));
  }

  ctx.restore();
}

export function drawHub(
  ctx: CanvasRenderingContext2D,
  scene: ContextScene,
  label?: string,
  color = scene.dark ? '#fbbf24' : '#b45309'
) {
  const x = toX(scene, scene.center.a);
  const y = toY(scene, scene.center.b);
  const { palette, width, height } = scene;

  ctx.save();
  /* Lingkaran poros */
  ctx.beginPath();
  ctx.arc(x, y, scene.dark ? 7 : 6.5, 0, Math.PI * 2);
  ctx.fillStyle = scene.dark ? 'rgba(245,158,11,0.2)' : 'rgba(245,158,11,0.16)';
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.stroke();

  /* Crosshair */
  ctx.beginPath();
  ctx.moveTo(x - 10, y);
  ctx.lineTo(x + 10, y);
  ctx.moveTo(x, y - 10);
  ctx.lineTo(x, y + 10);
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.restore();

  if (label) {
    drawTag(ctx, label, x, y, color, scene.dark, width, height);
  } else {
    ctx.save();
    ctx.font = '600 9px ui-sans-serif, system-ui, sans-serif';
    ctx.fillStyle = palette.muted;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(
      `P₀(${formatNumber(scene.center.a)}, ${formatNumber(scene.center.b)})`,
      Math.min(x + 12, width - 70),
      Math.min(y + 9, height - 14)
    );
    ctx.restore();
  }
}

export interface SweepArcOptions {
  color: string;
  lineWidth?: number;
  dashed?: boolean;
  arrow?: boolean;
  /** true = sudut diukur dari jam 12 searah jarum jam. */
  clockwise?: boolean;
}

/** Busur jejak rotasi + panah arah, dipakai semua layer konteks. */
export function drawSweepArc(
  ctx: CanvasRenderingContext2D,
  scene: ContextScene,
  center: CenterPoint,
  radius: number,
  fromDeg: number,
  toDeg: number,
  options: SweepArcOptions
) {
  if (!Number.isFinite(fromDeg) || !Number.isFinite(toDeg)) return;
  if (Math.abs(toDeg - fromDeg) < 0.1 || radius <= 0) return;

  const clockwise = options.clockwise ?? true;
  const cx = toX(scene, center.a);
  const cy = toY(scene, center.b);
  const r = radius * scene.scale;
  if (r < 2) return;

  const start = clockwise ? (-90 + fromDeg) * DEG : -fromDeg * DEG;
  const end = clockwise ? (-90 + toDeg) * DEG : -toDeg * DEG;
  const anticlockwise = clockwise ? toDeg < fromDeg : toDeg > fromDeg;

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, start, end, anticlockwise);
  ctx.strokeStyle = options.color;
  ctx.lineWidth = options.lineWidth ?? 2;
  if (options.dashed) ctx.setLineDash([4, 5]);
  ctx.stroke();
  ctx.restore();

  if (options.arrow !== false && Math.abs(toDeg - fromDeg) > 6) {
    const tangent = end + (anticlockwise ? -1 : 1) * (Math.PI / 2);
    drawArrowHead(
      ctx,
      cx + r * Math.cos(end),
      cy + r * Math.sin(end),
      tangent,
      7,
      options.color
    );
  }
}
