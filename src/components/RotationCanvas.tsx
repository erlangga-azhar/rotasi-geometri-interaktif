import { useEffect, useRef, useState } from 'react';
import { Download } from 'lucide-react';
import type { Point2D, RotationState, ThemeMode } from '../types/rotation';
import {
  DEG,
  angleLabel,
  clamp,
  formatNumber,
  niceStep,
  rotatePoint,
  shapeLabels,
  shapeVertices,
  trim,
} from '../utils/math';

const BLUE = '#3b82f6';
const RED = '#ef4444';
const AMBER = '#f59e0b';
const HIT_THRESHOLD = 18;
const DRAG_SNAP = 0.5;

type DragTarget = 'none' | 'point' | 'center';

interface RotationCanvasProps {
  state: RotationState;
  theme: ThemeMode;
  onChange: (patch: Partial<RotationState>) => void;
}

interface SceneConfig {
  state: RotationState;
  targetAngle: number;
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
}

interface RenderOptions {
  background?: string;
  watermark?: boolean;
  interaction?: { drag: DragTarget; hover: DragTarget };
  pulse?: number;
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

/** Titik pegangan yang terdekat dalam radius 18px, dengan prioritas jarak terdekat. */
function resolveHandle(layout: SceneLayout, state: RotationState, pxX: number, pxY: number): DragTarget {
  const anchor = shapeVertices(state.shape, state.point)[0];
  const anchorPx = worldToPx(layout, anchor.x, anchor.y);
  const centerPx = worldToPx(layout, state.center.a, state.center.b);

  const distanceToPoint = Math.hypot(pxX - anchorPx.x, pxY - anchorPx.y);
  const distanceToCenter = Math.hypot(pxX - centerPx.x, pxY - centerPx.y);

  const pointHit = distanceToPoint <= HIT_THRESHOLD;
  const centerHit = distanceToCenter <= HIT_THRESHOLD;

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
    ctx.beginPath();
    ctx.arc(x, y, 13, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(${rgb},0.45)`;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  ctx.restore();
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
  const { point, center, shape } = state;
  const palette = dark
    ? { grid: 'rgba(148,163,184,0.13)', axis: '#64748b', tick: '#94a3b8', axisLabel: '#94a3b8' }
    : { grid: 'rgba(100,116,139,0.18)', axis: '#64748b', tick: '#475569', axisLabel: '#475569' };

  ctx.clearRect(0, 0, width, height);
  if (options.background) {
    ctx.fillStyle = options.background;
    ctx.fillRect(0, 0, width, height);
  }

  const vertices = shapeVertices(shape, point);

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

  const anchor = vertices[0];
  const centerX = toX(center.a);
  const centerY = toY(center.b);
  const anchorX = toX(anchor.x);
  const anchorY = toY(anchor.y);
  const radiusPx = Math.hypot(anchorX - centerX, anchorY - centerY);

  const rotatedVertices = vertices.map((vertex) => rotatePoint(vertex, center, animatedAngle));
  const rotatedAnchor = rotatedVertices[0];

  /* Garis proyeksi putus-putus */
  ctx.save();
  ctx.setLineDash([6, 6]);
  ctx.lineWidth = 1.3;
  ctx.strokeStyle = 'rgba(59,130,246,0.5)';
  ctx.beginPath();
  ctx.moveTo(centerX, centerY);
  ctx.lineTo(anchorX, anchorY);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(239,68,68,0.5)';
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
    ctx.strokeStyle = 'rgba(99,102,241,0.65)';
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
      'rgba(99,102,241,0.95)'
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
      ctx.strokeStyle = dark ? 'rgba(165,180,252,0.8)' : 'rgba(79,70,229,0.6)';
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
      const tagColor = dark ? stroke : stroke === BLUE ? '#1d4ed8' : '#b91c1c';
      drawTag(ctx, text, x, y, tagColor, dark, width, height);
    });
  };

  drawShape(vertices, BLUE, 'rgba(59,130,246,0.13)', false);
  drawShape(rotatedVertices, RED, 'rgba(239,68,68,0.13)', true);

  /* Penanda pusat */
  ctx.beginPath();
  ctx.arc(centerX, centerY, 7, 0, Math.PI * 2);
  ctx.fillStyle = dark ? 'rgba(245,158,11,0.22)' : 'rgba(245,158,11,0.18)';
  ctx.fill();
  ctx.strokeStyle = AMBER;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(centerX - 11, centerY);
  ctx.lineTo(centerX + 11, centerY);
  ctx.moveTo(centerX, centerY - 11);
  ctx.lineTo(centerX, centerY + 11);
  ctx.strokeStyle = AMBER;
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
      dark ? AMBER : '#b45309',
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
    ctx.fillStyle = dark ? 'rgba(148,163,184,0.8)' : 'rgba(100,116,139,0.72)';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.fillText('RotasiLab · Transformasi Geometri', width - 10, height - 8);
  }
}

function RotationCanvas({ state, theme, onChange }: RotationCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const configRef = useRef<SceneConfig | null>(null);
  const animatedRef = useRef<number>(state.angleDegree * state.direction);
  const dirtyRef = useRef(true);
  const dragRef = useRef<DragSession | null>(null);
  const frozenLayoutRef = useRef<SceneLayout | null>(null);
  const interactionRef = useRef<{ drag: DragTarget; hover: DragTarget }>({ drag: 'none', hover: 'none' });
  const onChangeRef = useRef(onChange);
  const reducedMotionRef = useRef(false);
  const [dragTarget, setDragTarget] = useState<DragTarget>('none');
  const [hoverTarget, setHoverTarget] = useState<DragTarget>('none');
  const [printWhite, setPrintWhite] = useState(false);

  const targetAngle = state.angleDegree * state.direction;
  const radiusBefore = Math.hypot(state.point.x - state.center.a, state.point.y - state.center.b);
  const rotatedPoint = rotatePoint(state.point, state.center, targetAngle);
  const radiusAfter = Math.hypot(rotatedPoint.x - state.center.a, rotatedPoint.y - state.center.b);
  const radiusDelta = trim(radiusAfter - radiusBefore, 2);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    configRef.current = {
      state,
      targetAngle: state.angleDegree * state.direction,
      dark: theme === 'dark',
    };
    dirtyRef.current = true;
  }, [state, theme]);

  useEffect(() => {
    interactionRef.current = { drag: dragTarget, hover: hoverTarget };
    dirtyRef.current = true;
  }, [dragTarget, hoverTarget]);

  /* Preferensi gerak: lompat langsung ke sudut target, tanpa easing maupun pulse. */
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => {
      reducedMotionRef.current = query.matches;
      const config = configRef.current;
      if (query.matches && config) {
        animatedRef.current = config.targetAngle;
      }
      dirtyRef.current = true;
    };

    apply();
    query.addEventListener('change', apply);

    return () => query.removeEventListener('change', apply);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return undefined;

    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    let frame = 0;
    let lastWidth = 0;
    let lastHeight = 0;

    const draw = () => {
      const config = configRef.current;
      if (!config) return;

      const rect = canvas.getBoundingClientRect();
      const width = Math.max(220, rect.width);
      const height = Math.max(220, rect.height);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      if (lastWidth !== width || lastHeight !== height) {
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
        lastWidth = width;
        lastHeight = height;
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const layout = frozenLayoutRef.current ?? computeLayout(width, height, config.state);
      renderScene(ctx, width, height, config, animatedRef.current, layout, {
        interaction: interactionRef.current,
        pulse: reducedMotionRef.current ? 0 : (performance.now() % 1200) / 1200,
      });
    };

    const tick = () => {
      const config = configRef.current;
      if (config) {
        if (reducedMotionRef.current) {
          if (animatedRef.current !== config.targetAngle) {
            animatedRef.current = config.targetAngle;
            dirtyRef.current = true;
          }
        } else {
          const diff = config.targetAngle - animatedRef.current;
          if (Math.abs(diff) > 0.02) {
            animatedRef.current += diff * 0.18;
            dirtyRef.current = true;
          } else if (animatedRef.current !== config.targetAngle) {
            animatedRef.current = config.targetAngle;
            dirtyRef.current = true;
          }
        }
      }

      if (interactionRef.current.drag !== 'none') dirtyRef.current = true;

      if (dirtyRef.current) {
        draw();
        dirtyRef.current = false;
      }

      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);

    const observer = new ResizeObserver(() => {
      dirtyRef.current = true;
    });
    observer.observe(container);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);

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

    const startDragging = (px: number, py: number, width: number, height: number): boolean => {
      const config = configRef.current;
      if (!config) return false;

      const layout = computeLayout(width, height, config.state);
      const target = resolveHandle(layout, config.state, px, py);
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
      dirtyRef.current = true;
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
    };

    const endDragging = () => {
      if (!dragRef.current) return;
      dragRef.current = null;
      frozenLayoutRef.current = null;
      setDragTarget('none');
      dirtyRef.current = true;
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
      setHoverTarget((previous) => (previous === nextHover ? previous : nextHover));
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
      if (startDragging(local.x, local.y, local.width, local.height)) {
        event.preventDefault();
      }
    };

    const onTouchMove = (event: TouchEvent) => {
      if (!dragRef.current) return;
      const touch = event.touches[0];
      if (!touch) return;

      event.preventDefault();
      const local = localPoint(touch.clientX, touch.clientY);
      moveDragging(local.x, local.y);
    };

    const onTouchEnd = () => {
      endDragging();
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
    if (!canvas || !config) return;

    const rect = canvas.getBoundingClientRect();
    const width = Math.max(320, Math.round(rect.width));
    const height = Math.max(240, Math.round(rect.height));
    const exportScale = 2;

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
      config.targetAngle,
      computeLayout(width, height, config.state),
      { background: exportDark ? '#020617' : '#ffffff', watermark: true }
    );

    const suffix = `${formatNumber(config.state.point.x)}_${formatNumber(config.state.point.y)}`.replace(
      /\./g,
      ','
    );

    try {
      const link = document.createElement('a');
      link.href = offscreen.toDataURL('image/png');
      link.download = `rotasi-geometri-${suffix}${printWhite ? '-putih' : ''}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      /* kanvas tidak dapat diekspor di lingkungan ini */
    }
  };

  const cursorClass =
    dragTarget !== 'none' ? 'cursor-grabbing' : hoverTarget !== 'none' ? 'cursor-grab' : 'cursor-default';

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-3 shadow-xl shadow-slate-200/50 transition-colors sm:p-4 dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/20">
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
            θ = {angleLabel(targetAngle)}
          </span>
          <span className="hidden rounded-lg border border-indigo-200 bg-indigo-50 px-2 py-1 text-indigo-700 sm:inline dark:border-indigo-500/30 dark:bg-indigo-950/40 dark:text-indigo-300">
            {targetAngle >= 0 ? 'berlawanan jarum jam' : 'searah jarum jam'}
          </span>
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

      <div
        ref={containerRef}
        className="relative h-[330px] w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-inner transition-colors sm:h-[420px] lg:h-[470px] dark:border-slate-800/80 dark:bg-slate-950"
      >
        <canvas
          ref={canvasRef}
          className={`absolute inset-0 h-full w-full ${cursorClass}`}
          role="img"
          aria-label="Bidang kartesius interaktif dengan busur derajat; tarik titik P atau pusat rotasi untuk memindahkannya"
        />

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

        <div className="pointer-events-none absolute bottom-3 left-3 rounded-md border border-slate-200 bg-white/95 px-2 py-1 text-[10px] font-medium text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900/95 dark:text-slate-400 dark:shadow-none">
          Tarik titik P atau pusat · atur sudut lewat slider
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
