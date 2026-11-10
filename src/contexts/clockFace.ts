import { DEG } from '../utils/math';

/** Dial jam/kompas yang dipakai layer konteks maupun overlay kanvas utama. */

export interface ClockFaceOptions {
  dark: boolean;
  /** Tampilkan huruf mata angin U/T/S/B. */
  compass?: boolean;
  /** Tampilkan 60 tick menit (default true). */
  minuteTicks?: boolean;
}

export function drawClockFace(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  options: ClockFaceOptions
) {
  if (radius < 8) return;
  const { dark } = options;

  ctx.save();

  /* Muka dial */
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fillStyle = dark ? 'rgba(15,23,42,0.72)' : 'rgba(255,255,255,0.88)';
  ctx.fill();
  ctx.strokeStyle = dark ? 'rgba(148,163,184,0.45)' : 'rgba(100,116,139,0.4)';
  ctx.lineWidth = 2;
  ctx.stroke();

  /* Lingkaran dalam tipis */
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.86, 0, Math.PI * 2);
  ctx.strokeStyle = dark ? 'rgba(148,163,184,0.18)' : 'rgba(100,116,139,0.16)';
  ctx.lineWidth = 1;
  ctx.stroke();

  /* Tick menit + tick jam */
  if (options.minuteTicks !== false) {
    for (let index = 0; index < 60; index += 1) {
      const angle = (-90 + index * 6) * DEG;
      const major = index % 5 === 0;
      const inner = radius - (major ? Math.max(9, radius * 0.09) : Math.max(4, radius * 0.035));
      const outer = radius - 3;
      ctx.beginPath();
      ctx.moveTo(cx + inner * Math.cos(angle), cy + inner * Math.sin(angle));
      ctx.lineTo(cx + outer * Math.cos(angle), cy + outer * Math.sin(angle));
      ctx.strokeStyle = major
        ? dark
          ? 'rgba(203,213,225,0.75)'
          : 'rgba(51,65,85,0.7)'
        : dark
          ? 'rgba(148,163,184,0.35)'
          : 'rgba(100,116,139,0.3)';
      ctx.lineWidth = major ? 1.8 : 1;
      ctx.stroke();
    }
  }

  if (options.compass) {
    const labels: Array<[string, number]> = [
      ['U', 0],
      ['T', 90],
      ['S', 180],
      ['B', 270],
    ];
    ctx.font = `700 ${Math.max(7, Math.round(radius * 0.1))}px ui-sans-serif, system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = dark ? '#fbbf24' : '#b45309';
    for (const [label, deg] of labels) {
      const angle = (-90 + deg) * DEG;
      const distance = radius * 0.74;
      ctx.fillText(label, cx + distance * Math.cos(angle), cy + distance * Math.sin(angle));
    }
  }

  ctx.restore();
}

/** Ujung jarum dalam koordinat piksel lokal kanvas. */
export function clockTip(cx: number, cy: number, length: number, angleDeg: number) {
  const angle = (-90 + angleDeg) * DEG;
  return { x: cx + length * Math.cos(angle), y: cy + length * Math.sin(angle) };
}

export function drawClockHand(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  length: number,
  angleDeg: number,
  color: string,
  width: number,
  /** Warna halo kontras di bawah jarum; opsional. */
  outlineColor?: string
) {
  const angle = (-90 + angleDeg) * DEG;
  const tail = Math.min(length * 0.18, 10);
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(cx - Math.cos(angle) * tail, cy - Math.sin(angle) * tail);
  ctx.lineTo(cx + Math.cos(angle) * length, cy + Math.sin(angle) * length);
  ctx.lineCap = 'round';
  if (outlineColor) {
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = width + 2.4;
    ctx.stroke();
  }
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke();
  ctx.restore();
}
