/** Primitif kanvas bersama untuk semua layer konteks & overlay jam. */

export function traceRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

export function drawArrowHead(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  size: number,
  color: string
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-size, size * 0.5);
  ctx.lineTo(-size, -size * 0.5);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}

/** Label kecil dengan kotak rounded, otomatis menghindari tepi kanvas. */
export function drawTag(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  color: string,
  dark: boolean,
  width: number,
  height: number
) {
  ctx.save();
  ctx.font = '600 10px ui-sans-serif, system-ui, sans-serif';
  const boxWidth = ctx.measureText(text).width + 12;
  const boxHeight = 18;
  let left = x + 10;
  let top = y - boxHeight - 9;

  if (left + boxWidth > width - 6) left = x - boxWidth - 10;
  if (left < 6) left = 6;
  if (top < 6) top = y + 9;
  if (top + boxHeight > height - 6) top = height - boxHeight - 6;

  traceRoundRect(ctx, left, top, boxWidth, boxHeight, 6);
  ctx.fillStyle = dark ? 'rgba(15,23,42,0.94)' : 'rgba(255,255,255,0.97)';
  ctx.fill();
  ctx.strokeStyle = `${color}55`;
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = color;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, left + 6, top + boxHeight / 2 + 0.5);
  ctx.restore();
}

/** Ubah #rrggbb menjadi rgba() dengan alfa tertentu. */
export function withAlpha(hex: string, alpha: number): string {
  const value = hex.replace('#', '');
  const full =
    value.length === 3
      ? value
          .split('')
          .map((char) => char + char)
          .join('')
      : value;
  const numeric = Number.parseInt(full, 16);
  if (!Number.isFinite(numeric)) return hex;
  const r = (numeric >> 16) & 255;
  const g = (numeric >> 8) & 255;
  const b = numeric & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
