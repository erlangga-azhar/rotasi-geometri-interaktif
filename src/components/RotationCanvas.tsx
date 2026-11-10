import { useEffect, useRef, useState } from 'react';
import { Download, Pause, Play, Timer } from 'lucide-react';
import type { Point2D, RotationState, ThemeMode } from '../types/rotation';
import { drawClockFace, drawClockHand, clockTip } from '../contexts/clockFace';
import { getStaticLayer } from '../canvas/staticLayer';
import type { StaticLayerCache } from '../canvas/staticLayer';
import { useOnDemandFrame } from '../hooks/useOnDemandFrame';
import {
  DEG,
  angleLabel,
  clamp,
  formatNumber,
  niceStep,
  normalizeDegree,
  rotatePoint,
  shapeLabels,
  shapeVertices,
  trim,
} from '../utils/math';

const BLUE = '#3b82f6';
const RED = '#ef4444';
const AMBER = '#f59e0b';
/* Hit-area minimum 44×44 px: radius 22 px (mouse) dan 28 px (jari). */
const HIT_RADIUS = 22;
const TOUCH_HIT_RADIUS = 28;
const DRAG_SNAP = 0.5;
/** Kecepatan sapuan overlay jam pada kanvas utama (derajat/detik). */
const CLOCK_SWEEP_SPEED = 36;

type DragTarget = 'none' | 'point' | 'center';

interface RotationCanvasProps {
  state: RotationState;
  theme: ThemeMode;
  onChange: (patch: Partial<RotationState>) => void;
  /**
   * Aktifkan overlay jam/kompas yang menyapu kontinu di kanvas utama.
   * @example
   * <RotationCanvas state={state} theme={theme} onChange={onChange} clockOverlay />
   */
  clockOverlay?: boolean;
}

interface SceneConfig {
  state: RotationState;
  /** Sudut manual target dari slider/drag (bukan sudut jam). */
  userAngle: number;
  dark: boolean;
}

interface SceneLayout {
  scale: number;
  originX: number;
  originY: number;
}

interface DragSession {
  target: Exclude<DragTarget, 'none'>;
  layout: SceneLayout;
  offset: Point2D;
  /** ID touch aktif, agar multi-touch tidak mengacaukan drag. */
  touchId?: number;
}

interface RenderOptions {
  background?: string;
  watermark?: boolean;
  interaction?: { drag: DragTarget; hover: DragTarget };
  pulse?: number;
  clock?: { angle: number };
  /** Kanvas cache berisi grid + dial jam; bila ada, konten statis dilewati. */
  staticLayer?: HTMLCanvasElement;
}

function traceRoundRect(
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

function drawArrowHead(
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

function drawTag(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  color: string,
  dark: boolean,
  width: number,
  height: number
) {
  ctx.font = '600 11px ui-sans-serif, system-ui, sans-serif';
  const boxWidth = ctx.measureText(text).width + 14;
  const boxHeight = 20;
  let left = x + 10;
  let top = y - boxHeight - 10;

  if (left + boxWidth > width - 6) left = x - boxWidth - 10;
  if (left < 6) left = 6;
  if (top < 6) top = y + 10;
  if (top + boxHeight > height - 6) top = height - boxHeight - 6;

  traceRoundRect(ctx, left, top, boxWidth, boxHeight, 7);
  ctx.fillStyle = dark ? 'rgba(15,23,42,0.94)' : 'rgba(255,255,255,0.97)';
  ctx.fill();
  ctx.strokeStyle = `${color}55`;
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = color;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, left + 7, top + boxHeight / 2 + 0.5);
}

/** Skala dan titik asal bidang agar seluruh bangun + bayangan selalu terlihat. */
function computeLayout(width: number, height: number, state: RotationState): SceneLayout {
  const vertices = shapeVertices(state.shape, state.point);
  const bounds: Point2D[] = [{ x: 0, y: 0 }];

  vertices.forEach((vertex) => {
    bounds.push(vertex);
    const radius = Math.hypot(vertex.x - state.center.a, vertex.y - state.center.b);
    bounds.push({ x: state.center.a - radius, y: state.center.b - radius });
    bounds.push({ x: state.center.a + radius, y: state.center.b + radius });
  });

  const minX = Math.min(...bounds.map((p) => p.x));
  const maxX = Math.max(...bounds.map((p) => p.x));
  const minY = Math.min(...bounds.map((p) => p.y));
  const maxY = Math.max(...bounds.map((p) => p.y));

  const midX = (minX + maxX) / 2;
  const midY = (minY + maxY) / 2;
  const span = Math.max(maxX - minX, maxY - minY, 5) * 1.35;

  const scale = Math.min(width, height) / span;

  return {
    scale,
    originX: width / 2 - midX * scale,
    originY: height / 2 + midY * scale,
  };
}

function worldToPx(layout: SceneLayout, x: number, y: number): Point2D {
  return { x: layout.originX + x * layout.scale, y: layout.originY - y * layout.scale };
}

/** Inversi koordinat layar (piksel lokal canvas) menjadi koordinat Kartesius. */
function pxToWorld(layout: SceneLayout, pxX: number, pxY: number): Point2D {
  return { x: (pxX - layout.originX) / layout.scale, y: (layout.originY - pxY) / layout.scale };
}

const snapToHalf = (value: number): number => {
  const snapped = Math.round(value / DRAG_SNAP) * DRAG_SNAP;
  return Object.is(snapped, -0) ? 0 : snapped;
};

/** Titik pegangan terdekat dalam radius hit-area (default 22px), prioritas jarak terdekat. */
function resolveHandle(
  layout: SceneLayout,
  state: RotationState,
  pxX: number,
  pxY: number,
  radius = HIT_RADIUS
): DragTarget {
  const anchor = shapeVertices(state.shape, state.point)[0];
  const anchorPx = worldToPx(layout, anchor.x, anchor.y);
  const centerPx = worldToPx(layout, state.center.a, state.center.b);

  const distanceToPoint = Math.hypot(pxX - anchorPx.x, pxY - anchorPx.y);
  const distanceToCenter = Math.hypot(pxX - centerPx.x, pxY - centerPx.y);

  const pointHit = distanceToPoint <= radius;
  const centerHit = distanceToCenter <= radius;

  if (pointHit && centerHit) return distanceToPoint <= distanceToCenter ? 'point' : 'center';
  if (pointHit) return 'point';
  if (centerHit) return 'center';
  return 'none';
}

function drawHalo(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  rgb: string,
  phase: number,
  active: boolean
) {
  ctx.save();

  if (active) {
    const glow = ctx.createRadialGradient(x, y, 2, x, y, 28);
    glow.addColorStop(0, `rgba(${rgb},0.3)`);
    glow.addColorStop(1, `rgba(${rgb},0)`);
    ctx.beginPath();
    ctx.arc(x, y, 28, 0, Math.PI * 2);
    ctx.fillStyle = glow;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(x, y, 15 + phase * 9, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(${rgb},${(0.45 * (1 - phase)).toFixed(3)})`;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(x, y, 13, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(${rgb},0.9)`;
    ctx.lineWidth = 2;
    ctx.stroke();
  } else {
    /* Cincin tipis 44px: menandai hit-area yang bisa disentuh jari. */
    ctx.beginPath();
    ctx.arc(x, y, HIT_RADIUS, 0, Math.PI * 2);
    ctx.setLineDash([3, 4]);
    ctx.strokeStyle = `rgba(${rgb},0.22)`;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.beginPath();
    ctx.arc(x, y, 13, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(${rgb},0.45)`;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  ctx.restore();
}

interface SceneGeometry {
  vertices: Point2D[];
  anchor: Point2D;
  centerX: number;
  centerY: number;
  anchorX: number;
  anchorY: number;
  radiusPx: number;
  dialRadius: number;
}

function computeSceneGeometry(
  width: number,
  height: number,
  state: RotationState,
  layout: SceneLayout
): SceneGeometry {
  const vertices = shapeVertices(state.shape, state.point);
  const anchor = vertices[0];
  const centerX = layout.originX + state.center.a * layout.scale;
  const centerY = layout.originY - state.center.b * layout.scale;
  const anchorX = layout.originX + anchor.x * layout.scale;
  const anchorY = layout.originY - anchor.y * layout.scale;
  const radiusPx = Math.hypot(anchorX - centerX, anchorY - centerY);

  return {
    vertices,
    anchor,
    centerX,
    centerY,
    anchorX,
    anchorY,
    radiusPx,
    dialRadius: clamp(radiusPx, 48, Math.min(width, height) * 0.42),
  };
}

/** Layer statis: grid, sumbu, label tick, dan (opsional) dial jam. */
function drawSceneStatic(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  config: SceneConfig,
  layout: SceneLayout,
  withClockDial: boolean
) {
  const { dark } = config;
  const palette = dark
    ? { grid: 'rgba(148,163,184,0.13)', axis: '#64748b', tick: '#94a3b8', axisLabel: '#94a3b8' }
    : { grid: 'rgba(100,116,139,0.18)', axis: '#64748b', tick: '#475569', axisLabel: '#475569' };

  const toX = (value: number) => layout.originX + value * layout.scale;
  const toY = (value: number) => layout.originY - value * layout.scale;

  const step = niceStep(Math.min(width, height) / layout.scale / 8);
  const xMinWorld = (0 - layout.originX) / layout.scale;
  const xMaxWorld = (width - layout.originX) / layout.scale;
  const yMinWorld = (layout.originY - height) / layout.scale;
  const yMaxWorld = layout.originY / layout.scale;

  /* Grid */
  ctx.lineWidth = 1;
  ctx.strokeStyle = palette.grid;
  for (let i = Math.ceil(xMinWorld / step); i * step <= xMaxWorld; i += 1) {
    const x = toX(i * step);
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let i = Math.ceil(yMinWorld / step); i * step <= yMaxWorld; i += 1) {
    const y = toY(i * step);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  /* Sumbu */
  const axisX = toX(0);
  const axisY = toY(0);
  ctx.strokeStyle = palette.axis;
  ctx.lineWidth = 1.5;
  if (axisX >= 0 && axisX <= width) {
    ctx.beginPath();
    ctx.moveTo(axisX, 0);
    ctx.lineTo(axisX, height);
    ctx.stroke();
  }
  if (axisY >= 0 && axisY <= height) {
    ctx.beginPath();
    ctx.moveTo(0, axisY);
    ctx.lineTo(width, axisY);
    ctx.stroke();
  }

  /* Label tick */
  if (step * layout.scale >= 30) {
    ctx.font = '500 10px ui-monospace, SFMono-Regular, Consolas, monospace';
    ctx.fillStyle = palette.tick;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const labelY = clamp(axisY + 5, 3, height - 16);
    for (let i = Math.ceil(xMinWorld / step); i * step <= xMaxWorld; i += 1) {
      if (i === 0) continue;
      ctx.fillText(formatNumber(i * step), toX(i * step), labelY);
    }
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    const labelX = clamp(axisX - 6, 26, width - 4);
    for (let i = Math.ceil(yMinWorld / step); i * step <= yMaxWorld; i += 1) {
      if (i === 0) continue;
      ctx.fillText(formatNumber(i * step), labelX, toY(i * step));
    }
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.fillText('0', clamp(axisX - 5, 8, width - 4), clamp(axisY + 4, 3, height - 14));
  }

  /* Nama sumbu */
  ctx.fillStyle = palette.axisLabel;
  ctx.font = '600 12px ui-sans-serif, system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'bottom';
  if (axisY >= 0 && axisY <= height) {
    ctx.fillText('x', width - 8, clamp(axisY - 6, 16, height - 4));
  }
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  if (axisX >= 0 && axisX <= width) {
    ctx.fillText('y', clamp(axisX + 8, 4, width - 16), 6);
  }

  if (withClockDial) {
    const geometry = computeSceneGeometry(width, height, config.state, layout);
    drawClockFace(ctx, geometry.centerX, geometry.centerY, geometry.dialRadius, { dark, compass: true });
  }
}

/** Vektor bantu sudut manual — ungu, terpisah dari jarum jam amber. */
function drawUserAngleIndicator(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  length: number,
  angleDeg: number,
  dark: boolean,
  width: number,
  height: number
) {
  if (length < 10) return;
  const color = dark ? '#c4b5fd' : '#7c3aed';
  const canvasAngle = -angleDeg * DEG;
  const endX = centerX + Math.cos(canvasAngle) * length;
  const endY = centerY + Math.sin(canvasAngle) * length;

  ctx.save();
  ctx.setLineDash([5, 5]);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(centerX, centerY);
  ctx.lineTo(endX, endY);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  drawArrowHead(ctx, endX, endY, canvasAngle, 7, color);
  drawTag(
    ctx,
    `θ manual ${angleLabel(angleDeg)}`,
    endX,
    endY,
    color,
    dark,
    width,
    height
  );
}

function renderScene(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  config: SceneConfig,
  animatedAngle: number,
  layout: SceneLayout,
  options: RenderOptions = {}
) {
  const { state, dark } = config;
  const { center, shape } = state;

  ctx.clearRect(0, 0, width, height);
  if (options.background) {
    ctx.fillStyle = options.background;
    ctx.fillRect(0, 0, width, height);
  }

  const geometry = computeSceneGeometry(width, height, state, layout);

  if (options.staticLayer) {
    /* Grid + dial statis ditempel sekali dari kanvas tersembunyi. */
    ctx.drawImage(options.staticLayer, 0, 0, width, height);
  } else {
    drawSceneStatic(ctx, width, height, config, layout, Boolean(options.clock));
  }

  const toX = (value: number) => layout.originX + value * layout.scale;
  const toY = (value: number) => layout.originY - value * layout.scale;
  const { vertices, anchor, centerX, centerY, anchorX, anchorY, radiusPx, dialRadius } = geometry;

  /* Overlay jam/kompas: dial statis ada di layer cache, di sini hanya gerak. */
  if (options.clock) {
    const sweep = normalizeDegree(options.clock.angle);
    const handLength = dialRadius * 0.72;

    /* Vektor sudut manual pengguna (indigo) — bukan jarum jam. */
    drawUserAngleIndicator(
      ctx,
      centerX,
      centerY,
      dialRadius * 0.62,
      animatedAngle,
      dark,
      width,
      height
    );

    /* Jejak 55° terakhir dari jarum. */
    const trailStart = (-90 + sweep - 55) * DEG;
    const trailEnd = (-90 + sweep) * DEG;
    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, handLength, trailStart, trailEnd);
    ctx.strokeStyle = dark ? 'rgba(251,191,36,0.85)' : 'rgba(217,119,6,0.85)';
    ctx.lineWidth = 2.2;
    ctx.stroke();
    ctx.restore();

    drawClockHand(
      ctx,
      centerX,
      centerY,
      handLength * 0.62,
      sweep / 12,
      dark ? '#64748b' : '#94a3b8',
      3.4
    );
    drawClockHand(ctx, centerX, centerY, handLength, sweep, dark ? '#fbbf24' : '#d97706', 2.6);

    const tip = clockTip(centerX, centerY, handLength, sweep);
    ctx.save();
    ctx.beginPath();
    ctx.arc(tip.x, tip.y, 4.5, 0, Math.PI * 2);
    ctx.fillStyle = AMBER;
    ctx.fill();
    ctx.strokeStyle = dark ? '#0f172a' : '#ffffff';
    ctx.lineWidth = 1.8;
    ctx.stroke();
    ctx.restore();

    const tipWorld = pxToWorld(layout, tip.x, tip.y);
    drawTag(
      ctx,
      `P′(${formatNumber(tipWorld.x)}, ${formatNumber(tipWorld.y)})`,
      tip.x,
      tip.y,
      dark ? '#fbbf24' : '#b45309',
      dark,
      width,
      height
    );

    ctx.save();
    ctx.font = '600 9px ui-sans-serif, system-ui, sans-serif';
    ctx.fillStyle = dark ? '#fcd34d' : '#b45309';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText(`θ jam ${angleLabel(sweep)} · sweep kontinu`, centerX + 12, centerY - 12);
    ctx.restore();
  }

  const rotatedVertices = vertices.map((vertex) => rotatePoint(vertex, center, animatedAngle));
  const rotatedAnchor = rotatedVertices[0];

  /* Garis proyeksi putus-putus */
  ctx.save();
  ctx.setLineDash([6, 6]);
  ctx.lineWidth = 1.3;
  ctx.strokeStyle = dark ? 'rgba(59,130,246,0.8)' : 'rgba(29,78,216,0.65)';
  ctx.beginPath();
  ctx.moveTo(centerX, centerY);
  ctx.lineTo(anchorX, anchorY);
  ctx.stroke();
  ctx.strokeStyle = dark ? 'rgba(239,68,68,0.8)' : 'rgba(185,28,28,0.6)';
  ctx.beginPath();
  ctx.moveTo(centerX, centerY);
  ctx.lineTo(toX(rotatedAnchor.x), toY(rotatedAnchor.y));
  ctx.stroke();
  ctx.restore();

  /* Busur rotasi */
  if (radiusPx > 10 && Math.abs(animatedAngle) > 0.4) {
    const startCart = Math.atan2(anchor.y - center.b, anchor.x - center.a);
    const startCanvas = -startCart;
    const endCanvas = startCanvas - animatedAngle * DEG;

    ctx.beginPath();
    ctx.arc(centerX, centerY, radiusPx, startCanvas, endCanvas, animatedAngle > 0);
    ctx.strokeStyle = dark ? 'rgba(99,102,241,0.85)' : 'rgba(79,70,229,0.85)';
    ctx.lineWidth = 2;
    ctx.stroke();

    const direction = animatedAngle > 0 ? 1 : -1;
    const previousAngle = endCanvas + direction * 0.08;
    const endX = centerX + radiusPx * Math.cos(endCanvas);
    const endY = centerY + radiusPx * Math.sin(endCanvas);
    const previousX = centerX + radiusPx * Math.cos(previousAngle);
    const previousY = centerY + radiusPx * Math.sin(previousAngle);
    drawArrowHead(
      ctx,
      endX,
      endY,
      Math.atan2(endY - previousY, endX - previousX),
      8,
      dark ? 'rgba(99,102,241,0.95)' : 'rgba(67,56,202,0.95)'
    );

    const wedgeRadius = clamp(radiusPx * 0.32, 22, 46);
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, wedgeRadius, startCanvas, endCanvas, animatedAngle > 0);
    ctx.closePath();
    ctx.fillStyle = 'rgba(99,102,241,0.10)';
    ctx.fill();

    const midAngle = startCanvas - (animatedAngle * DEG) / 2;
    ctx.font = '600 12px ui-sans-serif, system-ui, sans-serif';
    ctx.fillStyle = dark ? '#a5b4fc' : '#4f46e5';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      angleLabel(animatedAngle),
      clamp(centerX + (wedgeRadius + 18) * Math.cos(midAngle), 30, width - 30),
      clamp(centerY + (wedgeRadius + 18) * Math.sin(midAngle), 14, height - 14)
    );

    /* Busur derajat: tick minor tiap 15°, tick mayor tiap 45° beserta label. */
    if (radiusPx >= 34) {
      const sweep = Math.abs(animatedAngle);
      const directionSign = animatedAngle >= 0 ? 1 : -1;

      ctx.save();
      ctx.strokeStyle = dark ? 'rgba(165,180,252,0.8)' : 'rgba(79,70,229,0.85)';
      ctx.fillStyle = dark ? '#c7d2fe' : '#4338ca';
      ctx.font = '600 9px ui-monospace, SFMono-Regular, Consolas, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      for (let tickDeg = 15; tickDeg <= sweep + 0.01; tickDeg += 15) {
        const tickAngle = startCanvas - directionSign * tickDeg * DEG;
        const major = tickDeg % 45 === 0;
        const inner = radiusPx - (major ? 10 : 5);
        const outer = radiusPx + (major ? 6 : 3);

        ctx.lineWidth = major ? 1.6 : 1;
        ctx.beginPath();
        ctx.moveTo(centerX + inner * Math.cos(tickAngle), centerY + inner * Math.sin(tickAngle));
        ctx.lineTo(centerX + outer * Math.cos(tickAngle), centerY + outer * Math.sin(tickAngle));
        ctx.stroke();

        if (major) {
          const labelRadius = radiusPx + 16;
          ctx.fillText(
            `${tickDeg}\u00B0`,
            clamp(centerX + labelRadius * Math.cos(tickAngle), 20, width - 20),
            clamp(centerY + labelRadius * Math.sin(tickAngle), 12, height - 12)
          );
        }
      }

      ctx.restore();
    }
  }

  const labels = shapeLabels(shape);

  const drawShape = (points: Point2D[], stroke: string, fill: string, prime: boolean) => {
    if (points.length > 1) {
      ctx.beginPath();
      points.forEach((p, index) => {
        const x = toX(p.x);
        const y = toY(p.y);
        if (index === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.closePath();
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 2.5;
      ctx.lineJoin = 'round';
      ctx.stroke();
    }

    points.forEach((p, index) => {
      const x = toX(p.x);
      const y = toY(p.y);
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fillStyle = stroke;
      ctx.fill();
      ctx.strokeStyle = dark ? '#0f172a' : '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      const label = prime ? `${labels[index]}′` : labels[index];
      const text = shape === 'point' ? `${label}(${formatNumber(p.x)}, ${formatNumber(p.y)})` : label;
      const tagColor = dark
        ? stroke === BLUE
          ? '#93c5fd'
          : stroke
        : stroke === BLUE
          ? '#1d4ed8'
          : '#b91c1c';
      drawTag(ctx, text, x, y, tagColor, dark, width, height);
    });
  };

  drawShape(vertices, BLUE, 'rgba(59,130,246,0.13)', false);
  drawShape(rotatedVertices, RED, 'rgba(239,68,68,0.13)', true);

  const centerColor = dark ? AMBER : '#b45309';

  /* Penanda pusat */
  ctx.beginPath();
  ctx.arc(centerX, centerY, 7, 0, Math.PI * 2);
  ctx.fillStyle = dark ? 'rgba(245,158,11,0.22)' : 'rgba(245,158,11,0.18)';
  ctx.fill();
  ctx.strokeStyle = centerColor;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(centerX - 11, centerY);
  ctx.lineTo(centerX + 11, centerY);
  ctx.moveTo(centerX, centerY - 11);
  ctx.lineTo(centerX, centerY + 11);
  ctx.strokeStyle = centerColor;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  if (center.a === 0 && center.b === 0) {
    ctx.font = '600 11px ui-sans-serif, system-ui, sans-serif';
    ctx.fillStyle = dark ? '#fbbf24' : '#b45309';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('O(0, 0)', clamp(centerX + 12, 4, width - 60), clamp(centerY + 10, 4, height - 16));
  } else {
    drawTag(
      ctx,
      `Pusat (${formatNumber(center.a)}, ${formatNumber(center.b)})`,
      centerX,
      centerY,
      centerColor,
      dark,
      width,
      height
    );
  }

  /* Halo interaksi tarik */
  if (options.interaction) {
    const { drag, hover } = options.interaction;
    const pulse = options.pulse ?? 0;
    const anchorPx = worldToPx(layout, anchor.x, anchor.y);
    const centerPx = worldToPx(layout, center.a, center.b);

    if (drag === 'point' || hover === 'point') {
      drawHalo(ctx, anchorPx.x, anchorPx.y, '59,130,246', pulse, drag === 'point');
    }
    if (drag === 'center' || hover === 'center') {
      drawHalo(ctx, centerPx.x, centerPx.y, '245,158,11', pulse, drag === 'center');
    }
  }

  if (options.watermark) {
    ctx.font = '600 11px ui-sans-serif, system-ui, sans-serif';
    ctx.fillStyle = dark ? 'rgba(148,163,184,0.85)' : 'rgba(71,85,105,0.92)';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.fillText('RotasiLab · Transformasi Geometri', width - 10, height - 8);
  }
}

function RotationCanvas({ state, theme, onChange, clockOverlay }: RotationCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const exportingRef = useRef(false);
  const configRef = useRef<SceneConfig | null>(null);
  const staticLayerRef = useRef<StaticLayerCache | null>(null);
  /** Sudut manual yang di-tween — terpisah dari sapuan jam otomatis. */
  const animatedUserAngleRef = useRef<number>(state.angleDegree * state.direction);
  const dragRef = useRef<DragSession | null>(null);
  const frozenLayoutRef = useRef<SceneLayout | null>(null);
  const interactionRef = useRef<{ drag: DragTarget; hover: DragTarget }>({ drag: 'none', hover: 'none' });
  const onChangeRef = useRef(onChange);
  const reducedMotionRef = useRef(false);
  const clockModeRef = useRef(Boolean(clockOverlay));
  const clockPlayingRef = useRef(true);
  /** State animasi waktu; tidak pernah menimpa sudut manual pengguna. */
  const clockSweepAngleRef = useRef(0);
  const visibleRef = useRef(true);
  const [dragTarget, setDragTarget] = useState<DragTarget>('none');
  const [hoverTarget, setHoverTarget] = useState<DragTarget>('none');
  const [printWhite, setPrintWhite] = useState(false);
  const [clockMode, setClockMode] = useState(Boolean(clockOverlay));
  const [clockPlaying, setClockPlaying] = useState(true);

  /*
   * Render-on-demand: loop rAF hanya hidup saat tween, overlay jam, atau drag
   * aktif. Saat idle/dijeda tidak ada frame sama sekali (0 FPS) sehingga
   * baterai ponsel tidak terkuras. Ukuran + DPR diurus ResizeObserver internal.
   */
  const { invalidate } = useOnDemandFrame({
    observe: canvasRef,
    onFrame: ({ delta: deltaTime, viewport }) => {
      const canvas = canvasRef.current;
      const config = configRef.current;
      if (!canvas || !config) return false;
      const ctx = canvas.getContext('2d');
      if (!ctx) return false;

      const width = Math.max(220, viewport.width);
      const height = Math.max(220, viewport.height);
      /* DPR dibatasi 2: garis dan teks tetap tajam tanpa membebani fill-rate. */
      const dpr = Math.min(viewport.dpr || 1, 2);
      const pixelWidth = Math.round(width * dpr);
      const pixelHeight = Math.round(height * dpr);

      if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
        canvas.width = pixelWidth;
        canvas.height = pixelHeight;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      /* Klem dt: tab yang dibekukan tidak boleh membuat fisika melompat. */
      const safeDt = Math.min(Math.max(deltaTime, 0), 64);
      let animating = false;

      /* Alpha decay berbasis dt: kecepatan easing sama di 60Hz maupun 120Hz. */
      const target = config.userAngle;
      if (reducedMotionRef.current) {
        animatedUserAngleRef.current = target;
      } else {
        const diff = target - animatedUserAngleRef.current;
        if (Math.abs(diff) > 0.02) {
          const alpha = 1 - Math.pow(1 - 0.18, Math.max(safeDt, 1) / (1000 / 60));
          animatedUserAngleRef.current += diff * alpha;
          if (Math.abs(target - animatedUserAngleRef.current) <= 0.02) {
            animatedUserAngleRef.current = target;
          }
          animating = true;
        } else if (animatedUserAngleRef.current !== target) {
          animatedUserAngleRef.current = target;
        }
      }

      /* Jarum overlay jam: sapuan kontinu, berhenti total saat dijeda/off-screen. */
      if (clockModeRef.current && clockPlayingRef.current && visibleRef.current) {
        clockSweepAngleRef.current =
          (clockSweepAngleRef.current + (CLOCK_SWEEP_SPEED * safeDt) / 1000) % 360;
        animating = true;
      }

      /* Halo berdenyut saat drag butuh frame kontinu. */
      if (interactionRef.current.drag !== 'none') animating = true;

      const layout = frozenLayoutRef.current ?? computeLayout(width, height, config.state);
      const geometry = computeSceneGeometry(width, height, config.state, layout);
      const dialKey = clockModeRef.current
        ? `${Math.round(geometry.centerX)}:${Math.round(geometry.centerY)}:${Math.round(geometry.dialRadius)}`
        : 'off';
      const layerKey = [
        width.toFixed(1),
        height.toFixed(1),
        dpr,
        config.dark ? 'dark' : 'light',
        layout.scale.toFixed(3),
        layout.originX.toFixed(1),
        layout.originY.toFixed(1),
        dialKey,
      ].join('|');

      const staticLayer = getStaticLayer(staticLayerRef, layerKey, width, height, dpr, (layerCtx) => {
        drawSceneStatic(layerCtx, width, height, config, layout, clockModeRef.current);
      });

      renderScene(ctx, width, height, config, animatedUserAngleRef.current, layout, {
        interaction: interactionRef.current,
        pulse: reducedMotionRef.current ? 0 : (performance.now() % 1200) / 1200,
        clock: clockModeRef.current ? { angle: clockSweepAngleRef.current } : undefined,
        staticLayer: staticLayer ?? undefined,
      });

      return animating;
    },
  });

  /* `userAngle` hanya berasal dari slider/drag; jarum jam punya ref sendiri. */
  const userAngle = state.angleDegree * state.direction;
  const radiusBefore = Math.hypot(state.point.x - state.center.a, state.point.y - state.center.b);
  const rotatedPoint = rotatePoint(state.point, state.center, userAngle);
  const radiusAfter = Math.hypot(rotatedPoint.x - state.center.a, rotatedPoint.y - state.center.b);
  const radiusDelta = trim(radiusAfter - radiusBefore, 2);

  const [announcement, setAnnouncement] = useState('');

  /* Pengumuman koordinat di-debounce agar drag tidak membanjiri screen reader. */
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setAnnouncement(
        `Titik P (${formatNumber(state.point.x)}, ${formatNumber(state.point.y)}). ` +
          `Pusat (${formatNumber(state.center.a)}, ${formatNumber(state.center.b)}). ` +
          `Sudut ${angleLabel(userAngle)}. ` +
          `Bayangan P′ (${formatNumber(rotatedPoint.x)}, ${formatNumber(rotatedPoint.y)}).`
      );
    }, 350);

    return () => window.clearTimeout(timer);
  }, [
    state.point.x,
    state.point.y,
    state.center.a,
    state.center.b,
    userAngle,
    rotatedPoint.x,
    rotatedPoint.y,
  ]);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    configRef.current = {
      state,
      userAngle: state.angleDegree * state.direction,
      dark: theme === 'dark',
    };
    invalidate();
  }, [state, theme, invalidate]);

  useEffect(() => {
    interactionRef.current = { drag: dragTarget, hover: hoverTarget };
    invalidate();
  }, [dragTarget, hoverTarget, invalidate]);

  /* Prop `clockOverlay` menjadi nilai awal; tombol toolbar tetap bisa menimpanya. */
  useEffect(() => {
    setClockMode(Boolean(clockOverlay));
  }, [clockOverlay]);

  useEffect(() => {
    clockModeRef.current = clockMode;
    invalidate();
  }, [clockMode, invalidate]);

  useEffect(() => {
    clockPlayingRef.current = clockPlaying;
    invalidate();
  }, [clockPlaying, invalidate]);

  /* Hentikan jarum overlay ketika kanvas keluar dari viewport. */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || typeof IntersectionObserver === 'undefined') return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        const visible = entry.isIntersecting;
        if (visibleRef.current === visible) return;
        visibleRef.current = visible;
        invalidate();
      },
      { threshold: 0.01 }
    );
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [invalidate]);

  /* Preferensi gerak: lompat langsung ke sudut target, tanpa easing maupun pulse. */
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => {
      reducedMotionRef.current = query.matches;
      const config = configRef.current;
      if (query.matches && config) {
        animatedUserAngleRef.current = config.userAngle;
      }
      invalidate();
    };

    apply();
    query.addEventListener('change', apply);

    return () => query.removeEventListener('change', apply);
  }, [invalidate]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const localPoint = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: clientX - rect.left,
        y: clientY - rect.top,
        width: rect.width,
        height: rect.height,
      };
    };

    const startDragging = (
      px: number,
      py: number,
      width: number,
      height: number,
      radius = HIT_RADIUS
    ): boolean => {
      const config = configRef.current;
      if (!config) return false;

      const layout = computeLayout(width, height, config.state);
      const target = resolveHandle(layout, config.state, px, py, radius);
      if (target === 'none') return false;

      const anchor = shapeVertices(config.state.shape, config.state.point)[0];
      dragRef.current = {
        target,
        layout,
        offset: { x: anchor.x - config.state.point.x, y: anchor.y - config.state.point.y },
      };
      // Bidang "dibekukan" selama drag agar tampilan tidak mengejar kursor.
      frozenLayoutRef.current = layout;
      setDragTarget(target);
      setHoverTarget(target);
      invalidate();
      return true;
    };

    const moveDragging = (px: number, py: number) => {
      const session = dragRef.current;
      if (!session) return;

      const world = pxToWorld(session.layout, px, py);

      if (session.target === 'point') {
        onChangeRef.current({
          point: {
            x: trim(snapToHalf(world.x) - session.offset.x),
            y: trim(snapToHalf(world.y) - session.offset.y),
          },
        });
      } else {
        onChangeRef.current({ center: { a: snapToHalf(world.x), b: snapToHalf(world.y) } });
      }
      /* Jangan menunggu re-render React: kanvas langsung menyusul jari. */
      invalidate();
    };

    const endDragging = () => {
      const session = dragRef.current;
      if (!session) return;
      dragRef.current = null;
      frozenLayoutRef.current = null;
      setDragTarget('none');
      /* Di layar sentuh tidak ada hover: hilangkan cincin setelah jari diangkat. */
      if (session.touchId !== undefined) setHoverTarget('none');
      invalidate();
    };

    const onMouseDown = (event: MouseEvent) => {
      if (event.button !== 0) return;
      const local = localPoint(event.clientX, event.clientY);
      if (startDragging(local.x, local.y, local.width, local.height)) {
        event.preventDefault();
      }
    };

    const onMouseMove = (event: MouseEvent) => {
      const local = localPoint(event.clientX, event.clientY);

      if (dragRef.current) {
        moveDragging(local.x, local.y);
        return;
      }

      const config = configRef.current;
      if (!config) return;
      const nextHover = resolveHandle(
        computeLayout(local.width, local.height, config.state),
        config.state,
        local.x,
        local.y
      );
      setHoverTarget((previous) => {
        if (previous === nextHover) return previous;
        invalidate();
        return nextHover;
      });
    };

    const onMouseUp = () => {
      endDragging();
    };

    const onMouseLeave = () => {
      if (!dragRef.current) setHoverTarget('none');
    };

    const onTouchStart = (event: TouchEvent) => {
      if (event.touches.length !== 1) return;
      const touch = event.touches[0];
      if (!touch) return;

      const local = localPoint(touch.clientX, touch.clientY);
      /*
       * Hanya sentuhan yang mendarat di hit-box kontrol (radius 28px) yang
       * di-preventDefault. Di luar itu, pan-y membiarkan halaman scroll normal.
       */
      if (startDragging(local.x, local.y, local.width, local.height, TOUCH_HIT_RADIUS)) {
        if (dragRef.current) dragRef.current.touchId = touch.identifier;
        event.preventDefault();
      }
    };

    const onTouchMove = (event: TouchEvent) => {
      const session = dragRef.current;
      if (!session) return;

      const touch = Array.from(event.touches).find((item) => item.identifier === session.touchId);
      if (!touch) return;

      /* Selama drag aktif, cegah scroll; touch-action: pan-y mengizinkannya di luar handle. */
      event.preventDefault();
      const local = localPoint(touch.clientX, touch.clientY);
      moveDragging(local.x, local.y);
    };

    const onTouchEnd = (event: TouchEvent) => {
      const session = dragRef.current;
      if (!session) return;
      const stillActive = Array.from(event.touches).some(
        (item) => item.identifier === session.touchId
      );
      if (!stillActive) endDragging();
    };

    canvas.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('mouseleave', onMouseLeave);
    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchend', onTouchEnd);
    canvas.addEventListener('touchcancel', onTouchEnd);

    return () => {
      canvas.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      canvas.removeEventListener('mouseleave', onMouseLeave);
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchmove', onTouchMove);
      canvas.removeEventListener('touchend', onTouchEnd);
      canvas.removeEventListener('touchcancel', onTouchEnd);
      dragRef.current = null;
      frozenLayoutRef.current = null;
    };
  }, []);

  const handleDownload = () => {
    const canvas = canvasRef.current;
    const config = configRef.current;
    if (!canvas || !config || exportingRef.current) return;

    const rect = canvas.getBoundingClientRect();
    const width = Math.max(320, Math.round(rect.width));
    const height = Math.max(240, Math.round(rect.height));
    /* Batasi sisi panjang 2400 px agar ponsel tidak kehabisan memori saat ekspor. */
    const exportScale = Math.min(2, 2400 / Math.max(width, height));

    const offscreen = document.createElement('canvas');
    offscreen.width = Math.round(width * exportScale);
    offscreen.height = Math.round(height * exportScale);

    const ctx = offscreen.getContext('2d');
    if (!ctx) return;

    const exportDark = theme === 'dark' && !printWhite;

    ctx.scale(exportScale, exportScale);
    renderScene(
      ctx,
      width,
      height,
      { ...config, dark: exportDark },
      config.userAngle,
      computeLayout(width, height, config.state),
      {
        background: exportDark ? '#020617' : '#ffffff',
        watermark: true,
        clock: clockModeRef.current ? { angle: clockSweepAngleRef.current } : undefined,
      }
    );

    const suffix = `${formatNumber(config.state.point.x)}_${formatNumber(config.state.point.y)}`.replace(
      /\./g,
      ','
    );

    exportingRef.current = true;

    try {
      offscreen.toBlob((blob) => {
        exportingRef.current = false;
        if (!blob) return;

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `rotasi-geometri-${suffix}${printWhite ? '-putih' : ''}.png`;
        document.body.appendChild(link);
        link.click();
        link.remove();

        /* Lepaskan blob setelah unduhan mulai agar memori tidak tertahan. */
        window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
      }, 'image/png');
    } catch {
      exportingRef.current = false;
      /* kanvas tidak dapat diekspor di lingkungan ini */
    }
  };

  const cursorClass =
    dragTarget !== 'none' ? 'cursor-grabbing' : hoverTarget !== 'none' ? 'cursor-grab' : 'cursor-default';

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-3 shadow-xl shadow-slate-200/50 transition-colors sm:p-4 dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/20">
      <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {announcement}
      </p>
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-200">
          <span className="grid h-7 w-7 place-items-center rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-600 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-400">
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 2" />
            </svg>
          </span>
          Bidang Kartesius
        </div>
        <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
          <span className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
            θ{clockMode ? ' manual' : ''} = {angleLabel(userAngle)}
          </span>
          <span className="hidden rounded-lg border border-indigo-200 bg-indigo-50 px-2 py-1 text-indigo-700 sm:inline dark:border-indigo-500/30 dark:bg-indigo-950/40 dark:text-indigo-300">
            {userAngle >= 0 ? 'berlawanan jarum jam' : 'searah jarum jam'}
          </span>
          <button
            type="button"
            onClick={() => setClockMode((previous) => !previous)}
            aria-pressed={clockMode}
            title="Tampilkan overlay jam/kompas yang menyapu kontinu di kanvas"
            className={
              'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 font-sans text-[11px] font-bold shadow-sm transition ' +
              (clockMode
                ? 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-300'
                : 'border-slate-200 bg-white text-slate-700 hover:border-amber-300 hover:text-amber-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:border-amber-500/50 dark:hover:text-amber-300')
            }
          >
            <Timer size={13} /> Mode jam
          </button>
          {clockMode && (
            <button
              type="button"
              onClick={() => setClockPlaying((previous) => !previous)}
              aria-pressed={!clockPlaying}
              title={clockPlaying ? 'Jeda jarum jam (0 FPS)' : 'Putar jarum jam'}
              className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-white px-2 py-1.5 font-sans text-[11px] font-bold text-amber-700 shadow-sm transition hover:border-amber-300 dark:border-amber-500/30 dark:bg-slate-950 dark:text-amber-300 dark:hover:border-amber-500/60"
            >
              {clockPlaying ? <Pause size={12} /> : <Play size={12} />}
              <span className="sr-only">{clockPlaying ? 'Jeda jarum jam' : 'Putar jarum jam'}</span>
            </button>
          )}
          <label
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 py-1.5 font-sans text-[11px] font-bold text-slate-600 shadow-sm transition hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:border-indigo-500/50 dark:hover:text-indigo-300"
            title="Unduh PNG berlatar putih jernih, khusus untuk cetak"
          >
            <input
              type="checkbox"
              checked={printWhite}
              onChange={(event) => setPrintWhite(event.target.checked)}
              className="h-3.5 w-3.5 accent-indigo-600"
            />
            Latar putih
          </label>
          <button
            type="button"
            onClick={handleDownload}
            title="Unduh bidang kartesius sebagai gambar PNG"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-sans text-[11px] font-bold text-slate-700 shadow-sm transition hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:border-indigo-500/50 dark:hover:text-indigo-300"
          >
            <Download size={13} />
            Unduh Gambar
          </button>
        </div>
      </div>

      <div className="relative h-[330px] w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-inner transition-colors sm:h-[420px] lg:h-[470px] dark:border-slate-800/80 dark:bg-slate-950">
        {/* pan-y: scroll halaman tetap normal di area kanvas yang kosong. */}
        <canvas
          ref={canvasRef}
          className={`absolute inset-0 h-full w-full touch-pan-y select-none ${cursorClass}`}
          role="img"
          aria-describedby="canvas-hint"
          aria-label="Bidang kartesius interaktif dengan busur derajat; tarik titik P atau pusat rotasi untuk memindahkannya"
        />

        {clockMode && (
          <div className="pointer-events-none absolute right-3 top-3 flex flex-col gap-1 rounded-md border border-slate-200 bg-white/95 px-2 py-1 text-[10px] font-semibold shadow-sm dark:border-slate-800 dark:bg-slate-900/95 dark:shadow-none">
            <span className="inline-flex items-center gap-1 text-violet-700 dark:text-violet-300">
              <span className="h-2 w-2 rounded-full bg-violet-500" /> θ manual
            </span>
            <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-300">
              <span className="h-2 w-2 rounded-full bg-amber-500" /> θ jam
            </span>
          </div>
        )}

        <div className="pointer-events-none absolute left-3 top-3 flex flex-wrap gap-1.5 text-[10px] font-semibold">
          <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white/95 px-2 py-1 text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-900/95 dark:text-slate-300 dark:shadow-none">
            <span className="h-2 w-2 rounded-full bg-blue-500" /> Bangun awal
          </span>
          <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white/95 px-2 py-1 text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-900/95 dark:text-slate-300 dark:shadow-none">
            <span className="h-2 w-2 rounded-full bg-red-500" /> Bayangan
          </span>
          <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white/95 px-2 py-1 text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-900/95 dark:text-slate-300 dark:shadow-none">
            <span className="h-2 w-2 rounded-full bg-amber-500" /> Pusat
          </span>
        </div>

        <div
          id="canvas-hint"
          className="pointer-events-none absolute bottom-3 left-3 rounded-md border border-slate-200 bg-white/95 px-2 py-1 text-[10px] font-medium text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900/95 dark:text-slate-400 dark:shadow-none"
        >
          Tarik titik P atau pusat · sentuh & geser di HP · atur sudut lewat slider
        </div>

        <div className="pointer-events-none absolute bottom-3 right-3 hidden rounded-lg border border-slate-200 bg-white/95 px-2.5 py-1.5 shadow-sm sm:block dark:border-slate-800 dark:bg-slate-900/95 dark:shadow-none">
          <p className="text-[9px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
            Invarian rotasi
          </p>
          <p className="mt-0.5 font-mono text-[10px] font-semibold text-slate-700 dark:text-slate-300">
            r = {formatNumber(trim(radiusBefore, 3))} → r′ = {formatNumber(trim(radiusAfter, 3))}
          </p>
          <p className="font-mono text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
            Δr = {formatNumber(radiusDelta)} · jarak tetap
          </p>
        </div>
      </div>
    </div>
  );
}

export default RotationCanvas;
