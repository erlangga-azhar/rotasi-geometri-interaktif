import { DEG, normalizeDegree, trim } from '../../utils/math';
import { drawTag, traceRoundRect, withAlpha } from '../primitives';
import { ccwPoint, drawHub, drawSweepArc, toX, toY, worldToPx } from '../scene';
import type { ContextScene } from '../types';

const ACCENT = '#6366f1';
const CABINS = 8;
const fmt = (value: number) => String(trim(value, 2));

function drawCabin(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  highlighted: boolean,
  dark: boolean
) {
  const width = 17;
  const height = 12;
  const top = y + 5;

  ctx.save();
  /* Gantungan dari rim ke kabin */
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, top);
  ctx.strokeStyle = dark ? 'rgba(148,163,184,0.6)' : 'rgba(100,116,139,0.55)';
  ctx.lineWidth = 1.2;
  ctx.stroke();

  /* Badan kabin tetap tegak (tidak ikut berputar). */
  traceRoundRect(ctx, x - width / 2, top, width, height, 3.5);
  ctx.fillStyle = highlighted
    ? dark
      ? 'rgba(99,102,241,0.92)'
      : 'rgba(79,70,229,0.92)'
    : dark
      ? 'rgba(30,41,59,0.95)'
      : 'rgba(255,255,255,0.96)';
  ctx.fill();
  ctx.strokeStyle = highlighted ? '#818cf8' : dark ? 'rgba(148,163,184,0.55)' : 'rgba(100,116,139,0.5)';
  ctx.lineWidth = 1.2;
  ctx.stroke();

  /* Jendela kecil */
  ctx.beginPath();
  ctx.arc(x, top + height / 2, 2.6, 0, Math.PI * 2);
  ctx.fillStyle = highlighted ? '#e0e7ff' : dark ? 'rgba(148,163,184,0.6)' : 'rgba(100,116,139,0.5)';
  ctx.fill();
  ctx.restore();
}

/** Kincir ria: kabin berputar kontinu mengelilingi poros P₀(a, b). */
export function drawWheelLayer(ctx: CanvasRenderingContext2D, scene: ContextScene) {
  const { center, radius, dark, scale, palette } = scene;
  const theta = normalizeDegree(scene.angle);
  const cx = toX(scene, center.a);
  const cy = toY(scene, center.b);
  const rPx = radius * scale;
  const groundPxY = toY(scene, center.b - radius - 0.55);

  /* Tanah + kaki penopang A-frame */
  ctx.save();
  ctx.strokeStyle = dark ? 'rgba(148,163,184,0.3)' : 'rgba(100,116,139,0.3)';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(toX(scene, -3.8), groundPxY);
  ctx.lineTo(toX(scene, 3.8), groundPxY);
  ctx.stroke();

  const legSpread = rPx * 0.72;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx - legSpread, groundPxY);
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + legSpread, groundPxY);
  ctx.strokeStyle = dark ? 'rgba(148,163,184,0.55)' : 'rgba(100,116,139,0.45)';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.stroke();

  /* Rim ganda */
  ctx.beginPath();
  ctx.arc(cx, cy, rPx, 0, Math.PI * 2);
  ctx.strokeStyle = withAlpha(ACCENT, 0.55);
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, rPx * 0.9, 0, Math.PI * 2);
  ctx.strokeStyle = withAlpha(ACCENT, 0.22);
  ctx.lineWidth = 1.2;
  ctx.stroke();

  /* Jejak busur kabin terpilih */
  drawSweepArc(ctx, scene, center, radius, 0, theta, {
    color: withAlpha(ACCENT, 0.38),
    lineWidth: 1.6,
    arrow: false,
    clockwise: false,
  });
  drawSweepArc(ctx, scene, center, radius, theta - 40, theta, {
    color: ACCENT,
    lineWidth: 2.2,
    clockwise: false,
  });

  /* Jari-jari + kabin */
  for (let index = 0; index < CABINS; index += 1) {
    const deg = theta + index * (360 / CABINS);
    const world = ccwPoint(center, radius, deg);
    const point = worldToPx(scene, world);
    const highlighted = index === 0;

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(point.x, point.y);
    ctx.strokeStyle = highlighted
      ? withAlpha(ACCENT, 0.85)
      : dark
        ? 'rgba(148,163,184,0.35)'
        : 'rgba(100,116,139,0.3)';
    ctx.lineWidth = highlighted ? 2 : 1.2;
    ctx.stroke();

    drawCabin(ctx, point.x, point.y, highlighted, dark);
  }

  drawHub(ctx, scene, `P₀(${fmt(center.a)}, ${fmt(center.b)})`);

  /* Posisi awal kabin (θ = 0) */
  const reference = worldToPx(scene, ccwPoint(center, radius, 0));
  ctx.beginPath();
  ctx.arc(reference.x, reference.y, 3.5, 0, Math.PI * 2);
  ctx.fillStyle = '#3b82f6';
  ctx.fill();

  /* Kabin P′ + koordinatnya */
  const tipWorld = ccwPoint(center, radius, theta);
  const tip = worldToPx(scene, tipWorld);
  ctx.save();
  ctx.beginPath();
  ctx.arc(tip.x, tip.y, 8, 0, Math.PI * 2);
  ctx.strokeStyle = withAlpha(ACCENT, 0.7);
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

  /* θ di dekat poros */
  ctx.save();
  ctx.font = '700 10px ui-monospace, SFMono-Regular, Consolas, monospace';
  ctx.fillStyle = dark ? '#a5b4fc' : '#4338ca';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`θ = ${fmt(theta)}°`, cx, cy + rPx * 0.2);
  ctx.restore();

  /* Penanda R */
  const radiusEnd = { x: cx + Math.cos(-18 * DEG) * rPx * 0.55, y: cy + Math.sin(-18 * DEG) * rPx * 0.55 };
  ctx.save();
  ctx.font = '600 9px ui-sans-serif, system-ui, sans-serif';
  ctx.fillStyle = palette.muted;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(`R = ${fmt(radius)}`, radiusEnd.x + 4, radiusEnd.y);
  ctx.restore();
}
