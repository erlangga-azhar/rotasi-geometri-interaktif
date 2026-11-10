import { DEG, normalizeDegree, trim } from '../../utils/math';
import { drawTag, withAlpha } from '../primitives';
import { ccwPoint, drawSweepArc, toX, toY, worldToPx } from '../scene';
import type { ContextScene } from '../types';

const ACCENT = '#ec4899';
const START_DEG = 90;
const fmt = (value: number) => String(trim(value, 2));

/** Satu helai motif dasar, digambar dalam frame yang sudah diputar. */
function tracePetal(ctx: CanvasRenderingContext2D, size: number) {
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(-0.72 * size, -0.95 * size, -0.6 * size, -2.15 * size, 0, -2.9 * size);
  ctx.bezierCurveTo(0.6 * size, -2.15 * size, 0.72 * size, -0.95 * size, 0, 0);
  ctx.closePath();
}

function traceVein(ctx: CanvasRenderingContext2D, size: number) {
  ctx.beginPath();
  ctx.moveTo(0, -0.55 * size);
  ctx.quadraticCurveTo(0.32 * size, -1.5 * size, 0, -2.35 * size);
}

function drawMotif(
  ctx: CanvasRenderingContext2D,
  scene: ContextScene,
  deg: number,
  options: { filled: boolean; opacity: number }
) {
  const size = scene.radius;
  const cx = toX(scene, scene.center.a);
  const cy = toY(scene, scene.center.b);
  const color = options.filled ? ACCENT : withAlpha(ACCENT, options.opacity);

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-deg * DEG);

  tracePetal(ctx, size);
  if (options.filled) {
    ctx.fillStyle = withAlpha(ACCENT, scene.dark ? 0.3 : 0.2);
    ctx.fill();
  }
  ctx.strokeStyle = color;
  ctx.lineWidth = options.filled ? 2 : 1.1;
  ctx.stroke();

  /* Tulang daun */
  traceVein(ctx, size);
  ctx.strokeStyle = options.filled
    ? scene.dark
      ? 'rgba(251,207,232,0.85)'
      : 'rgba(157,23,77,0.6)'
    : withAlpha(ACCENT, options.opacity * 0.7);
  ctx.lineWidth = options.filled ? 1.4 : 0.9;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(0, -2.52 * size, Math.max(2, 0.07 * size), 0, Math.PI * 2);
  ctx.fillStyle = options.filled ? '#f59e0b' : withAlpha(ACCENT, options.opacity);
  ctx.fill();

  ctx.restore();
}

/**
 * Simetri motif berputar: motif aktif menyapu penuh, sementara setiap langkah
 * yang sudah dilewati meninggalkan bayangan + busur simetri putar.
 */
export function drawMotifLayer(ctx: CanvasRenderingContext2D, scene: ContextScene) {
  const { center, radius, dark, palette, step } = scene;
  const theta = normalizeDegree(scene.angle);
  const cx = toX(scene, center.a);
  const cy = toY(scene, center.b);
  const stepDeg = Math.max(15, step);

  /* Panduan simetri: lingkaran + jari-jari tiap langkah */
  ctx.save();
  ctx.strokeStyle = dark ? 'rgba(148,163,184,0.18)' : 'rgba(100,116,139,0.18)';
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 6]);
  ctx.beginPath();
  ctx.arc(cx, cy, radius * scene.scale, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.45 * scene.scale, 0, Math.PI * 2);
  ctx.stroke();

  for (let deg = START_DEG; deg < START_DEG + 360; deg += stepDeg) {
    const point = worldToPx(scene, ccwPoint(center, radius, deg));
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
  }
  ctx.restore();

  /* Busur simetri putar dari posisi awal ke posisi sekarang */
  drawSweepArc(ctx, scene, center, radius, START_DEG, START_DEG + theta, {
    color: withAlpha(ACCENT, 0.45),
    lineWidth: 1.8,
    dashed: true,
    arrow: false,
    clockwise: false,
  });

  /* Jejak bayangan pada setiap langkah yang sudah dilewati */
  for (let deg = 0; deg <= theta + 0.001; deg += stepDeg) {
    const age = Math.max(0, theta - deg);
    const opacity = Math.max(0.12, 0.42 - age / 720);
    drawMotif(ctx, scene, deg, { filled: false, opacity });
  }

  /* Motif aktif */
  drawMotif(ctx, scene, theta, { filled: true, opacity: 1 });

  /* Titik ujung motif + koordinatnya */
  const tipWorld = ccwPoint(center, radius - 0.05, START_DEG + theta);
  const tip = worldToPx(scene, tipWorld);
  ctx.beginPath();
  ctx.arc(tip.x, tip.y, 4.5, 0, Math.PI * 2);
  ctx.fillStyle = '#f59e0b';
  ctx.fill();
  ctx.strokeStyle = dark ? '#0f172a' : '#ffffff';
  ctx.lineWidth = 1.8;
  ctx.stroke();

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

  /* Pusat simetri */
  ctx.beginPath();
  ctx.arc(cx, cy, 4, 0, Math.PI * 2);
  ctx.fillStyle = '#f59e0b';
  ctx.fill();

  /* θ dan jumlah lipat */
  ctx.save();
  ctx.font = '700 10px ui-monospace, SFMono-Regular, Consolas, monospace';
  ctx.fillStyle = dark ? '#f9a8d4' : '#be185d';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`θ = ${fmt(theta)}°`, cx, cy + radius * scene.scale * 0.28);

  ctx.font = '600 9px ui-sans-serif, system-ui, sans-serif';
  ctx.fillStyle = palette.muted;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(`n = ${Math.round(360 / stepDeg)} lipat · langkah ${stepDeg}°`, 10, 12);
  ctx.restore();
}
