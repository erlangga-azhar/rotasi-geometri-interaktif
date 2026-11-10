import { normalizeDegree, trim } from '../../utils/math';
import { drawClockFace, drawClockHand } from '../clockFace';
import { drawTag, withAlpha } from '../primitives';
import { clockwisePoint, drawHub, drawSweepArc, toX, toY, worldToPx } from '../scene';
import type { ContextScene } from '../types';

const ACCENT = '#f59e0b';
const REFERENCE = '#3b82f6';
const fmt = (value: number) => String(trim(value, 2));

/** Dial jam adalah layer statis: bisa dirender ke kanvas cache. */
export function drawClockStatic(ctx: CanvasRenderingContext2D, scene: ContextScene) {
  drawClockFace(ctx, toX(scene, scene.center.a), toY(scene, scene.center.b), scene.radius * scene.scale, {
    dark: scene.dark,
    compass: true,
  });
}

export interface ClockLayerOptions {
  /** Dial sudah ada di layer statis; lewati penggambaran ulang. */
  staticFaceReady?: boolean;
}

/** Jam dinding + kompas: jarum menyapu kontinu dari posisi P di puncak dial. */
export function drawClockLayer(
  ctx: CanvasRenderingContext2D,
  scene: ContextScene,
  options: ClockLayerOptions = {}
) {
  const { center, radius, dark, scale } = scene;
  const theta = normalizeDegree(scene.angle);
  const cx = toX(scene, center.a);
  const cy = toY(scene, center.b);
  const rPx = radius * scale;

  if (!options.staticFaceReady) drawClockStatic(ctx, scene);

  /* Busur penuh P → P′ (redup) + jejak terang 45° terakhir. */
  drawSweepArc(ctx, scene, center, radius * 0.8, 0, theta, {
    color: withAlpha(ACCENT, 0.4),
    lineWidth: 1.6,
    arrow: false,
  });
  drawSweepArc(ctx, scene, center, radius * 0.8, theta - 45, theta, {
    color: ACCENT,
    lineWidth: 2.4,
  });

  /* Jarum jam & jarum menit. θ = 0 di puncak dial. */
  drawClockHand(ctx, cx, cy, rPx * 0.5, theta / 12, dark ? '#94a3b8' : '#64748b', 5);
  drawClockHand(ctx, cx, cy, rPx * 0.78, theta, dark ? '#fbbf24' : '#d97706', 3);

  /* Titik awal P tetap di puncak dial. */
  const reference = worldToPx(scene, clockwisePoint(center, radius * 0.78, 0));
  ctx.beginPath();
  ctx.arc(reference.x, reference.y, 4, 0, Math.PI * 2);
  ctx.fillStyle = REFERENCE;
  ctx.fill();
  drawTag(ctx, `P(0, ${fmt(radius * 0.78)})`, reference.x, reference.y, REFERENCE, dark, scene.width, scene.height);

  /* Ujung jarum yang bergerak = P′ dengan koordinat real-time. */
  const tipWorld = clockwisePoint(center, radius * 0.78, theta);
  const tip = worldToPx(scene, tipWorld);

  ctx.save();
  ctx.beginPath();
  ctx.arc(tip.x, tip.y, 10, 0, Math.PI * 2);
  ctx.fillStyle = withAlpha(ACCENT, 0.18);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(tip.x, tip.y, 5, 0, Math.PI * 2);
  ctx.fillStyle = ACCENT;
  ctx.fill();
  ctx.strokeStyle = dark ? '#0f172a' : '#ffffff';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  drawTag(
    ctx,
    `P′(${fmt(tipWorld.x)}, ${fmt(tipWorld.y)})`,
    tip.x,
    tip.y,
    ACCENT,
    dark,
    scene.width,
    scene.height
  );

  drawHub(ctx, scene);

  /* Sudut sweep berjalan di dekat poros. */
  ctx.save();
  ctx.font = '700 11px ui-monospace, SFMono-Regular, Consolas, monospace';
  ctx.fillStyle = dark ? '#fcd34d' : '#b45309';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(theta < 0.5 ? 'θ = 0°' : `θ = −${fmt(theta)}°`, cx, cy + rPx * 0.42);
  ctx.fillStyle = dark ? '#94a3b8' : '#64748b';
  ctx.font = '600 9px ui-sans-serif, system-ui, sans-serif';
  ctx.fillText('searah jarum jam · negatif', cx, cy + rPx * 0.52);
  ctx.restore();
}
