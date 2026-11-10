import { DEG, normalizeDegree, trim } from '../../utils/math';
import { drawTag, withAlpha } from '../primitives';
import { ccwPoint, drawHub, drawSweepArc, toX, toY, worldToPx } from '../scene';
import type { ContextScene } from '../types';

const ACCENT = '#06b6d4';
const BLADES = 3;
const fmt = (value: number) => String(trim(value, 2));

function drawBlade(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rPx: number,
  angleDeg: number,
  highlighted: boolean,
  dark: boolean
) {
  ctx.save();
  ctx.translate(cx, cy);
  /* Sudut matematis CCW → rotasi kanvas negatif. */
  ctx.rotate(-angleDeg * DEG);

  ctx.beginPath();
  ctx.moveTo(0, -4);
  ctx.bezierCurveTo(rPx * 0.2, -rPx * 0.26, rPx * 0.55, -rPx * 0.2, rPx, 0);
  ctx.bezierCurveTo(rPx * 0.56, 0, rPx * 0.26, 0, 0, 5);
  ctx.closePath();

  ctx.fillStyle = highlighted
    ? withAlpha(ACCENT, dark ? 0.7 : 0.62)
    : dark
      ? 'rgba(148,163,184,0.2)'
      : 'rgba(148,163,184,0.3)';
  ctx.fill();
  ctx.strokeStyle = highlighted ? ACCENT : dark ? 'rgba(148,163,184,0.55)' : 'rgba(100,116,139,0.5)';
  ctx.lineWidth = highlighted ? 1.8 : 1.2;
  ctx.stroke();
  ctx.restore();
}

/** Turbin angin: bilah berputar mengelilingi hub P₀(a, b). */
export function drawTurbineLayer(ctx: CanvasRenderingContext2D, scene: ContextScene) {
  const { center, radius, dark, scale, palette } = scene;
  const theta = normalizeDegree(scene.angle);
  const cx = toX(scene, center.a);
  const cy = toY(scene, center.b);
  const rPx = radius * scale;
  const groundPxY = toY(scene, -3.4);
  const baseHalf = Math.max(8, rPx * 0.075);

  /* Menara + tanah */
  ctx.save();
  ctx.strokeStyle = dark ? 'rgba(148,163,184,0.28)' : 'rgba(100,116,139,0.28)';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(toX(scene, -3.8), groundPxY);
  ctx.lineTo(toX(scene, 3.8), groundPxY);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cx - 3.5, cy);
  ctx.lineTo(cx + 3.5, cy);
  ctx.lineTo(cx + baseHalf, groundPxY);
  ctx.lineTo(cx - baseHalf, groundPxY);
  ctx.closePath();
  ctx.fillStyle = dark ? 'rgba(51,65,85,0.9)' : 'rgba(203,213,225,0.9)';
  ctx.fill();
  ctx.strokeStyle = dark ? 'rgba(148,163,184,0.5)' : 'rgba(100,116,139,0.45)';
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.restore();

  /* Jejak busur ujung bilah utama */
  drawSweepArc(ctx, scene, center, radius, 0, theta, {
    color: withAlpha(ACCENT, 0.36),
    lineWidth: 1.6,
    arrow: false,
    clockwise: false,
  });
  drawSweepArc(ctx, scene, center, radius, theta - 40, theta, {
    color: ACCENT,
    lineWidth: 2.2,
    clockwise: false,
  });

  /* Bilah */
  for (let index = 0; index < BLADES; index += 1) {
    drawBlade(ctx, cx, cy, rPx, theta + index * (360 / BLADES), index === 0, dark);
  }

  /* Nacelle / hub */
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, Math.max(9, rPx * 0.1), 0, Math.PI * 2);
  ctx.fillStyle = dark ? '#0f172a' : '#ffffff';
  ctx.fill();
  ctx.strokeStyle = ACCENT;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  drawHub(ctx, scene, `P₀(${fmt(center.a)}, ${fmt(center.b)})`);

  /* Titik awal bilah utama (θ = 0) */
  const reference = worldToPx(scene, ccwPoint(center, radius, 0));
  ctx.beginPath();
  ctx.arc(reference.x, reference.y, 3.5, 0, Math.PI * 2);
  ctx.fillStyle = '#3b82f6';
  ctx.fill();

  /* Ujung bilah yang bergerak */
  const tipWorld = ccwPoint(center, radius, theta);
  const tip = worldToPx(scene, tipWorld);
  ctx.beginPath();
  ctx.arc(tip.x, tip.y, 5, 0, Math.PI * 2);
  ctx.fillStyle = ACCENT;
  ctx.fill();
  ctx.strokeStyle = dark ? '#0f172a' : '#ffffff';
  ctx.lineWidth = 2;
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

  /* θ + jumlah bilah */
  ctx.save();
  ctx.font = '700 10px ui-monospace, SFMono-Regular, Consolas, monospace';
  ctx.fillStyle = dark ? '#67e8f9' : '#0e7490';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`θ = ${fmt(theta)}°`, cx, cy + Math.max(18, rPx * 0.18));
  ctx.font = '600 9px ui-sans-serif, system-ui, sans-serif';
  ctx.fillStyle = palette.muted;
  ctx.textAlign = 'left';
  ctx.fillText('3 bilah · 120°', 10, 14);
  ctx.restore();
}
