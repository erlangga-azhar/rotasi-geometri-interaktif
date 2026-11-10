import { createContextScene, drawGridAndAxes } from './scene';
import { drawClockLayer, drawClockStatic } from './layers/clock';
import { drawMotifLayer } from './layers/motif';
import { drawTurbineLayer } from './layers/turbine';
import { drawWheelLayer } from './layers/wheel';
import { REAL_WORLD_MODE_MAP } from './modes';
import type { ContextScene, RealWorldMode } from './types';

export interface RealWorldSceneFrame {
  mode: RealWorldMode;
  /** Sudut total terakumulasi (derajat). */
  angle: number;
  /** Langkah simetri untuk mode motif. */
  step: number;
  dark: boolean;
}

export interface RealWorldStaticFrame {
  mode: RealWorldMode;
  dark: boolean;
}

interface ContextLayerOptions {
  staticFaceReady?: boolean;
}

const LAYERS: Record<
  RealWorldMode,
  (ctx: CanvasRenderingContext2D, scene: ContextScene, options?: ContextLayerOptions) => void
> = {
  clock: drawClockLayer,
  wheel: drawWheelLayer,
  turbine: drawTurbineLayer,
  motif: drawMotifLayer,
};

function createSceneFor(width: number, height: number, frame: RealWorldSceneFrame) {
  const info = REAL_WORLD_MODE_MAP[frame.mode];
  return createContextScene(width, height, {
    mode: frame.mode,
    angle: frame.angle,
    step: frame.step,
    center: info?.center ?? { a: 0, b: 0 },
    radius: info?.radius ?? 3,
    dark: frame.dark,
  });
}

/** Hanya konten diam: grid, sumbu, label, dan dial jam. */
function paintStaticLayer(
  ctx: CanvasRenderingContext2D,
  scene: ContextScene,
  frame: RealWorldStaticFrame
) {
  drawGridAndAxes(ctx, scene);
  if (frame.mode === 'clock') drawClockStatic(ctx, scene);
}

/** Render layer statis sekali untuk kanvas cache tersembunyi. */
export function renderRealWorldStatic(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  frame: RealWorldStaticFrame
) {
  const scene = createSceneFor(width, height, {
    mode: frame.mode,
    angle: 0,
    step: 90,
    dark: frame.dark,
  });
  paintStaticLayer(ctx, scene, frame);
}

/**
 * Renderer murni: bila `staticLayer` diberikan, grid + dial ditempel via
 * drawImage dan hanya elemen bergerak yang digambar ulang.
 */
export function renderRealWorldScene(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  frame: RealWorldSceneFrame,
  staticLayer?: HTMLCanvasElement | null
) {
  const scene = createSceneFor(width, height, frame);

  ctx.clearRect(0, 0, width, height);

  if (staticLayer) {
    ctx.drawImage(staticLayer, 0, 0, width, height);
  } else {
    paintStaticLayer(ctx, scene, frame);
  }

  /* Grid + dial sudah dilukis oleh layer cache maupun fallback statis. */
  LAYERS[frame.mode](ctx, scene, { staticFaceReady: true });

  /* Tanda aplikasi kecil agar ekspor/screenshot tetap jelas asalnya. */
  ctx.save();
  ctx.font = '600 9px ui-sans-serif, system-ui, sans-serif';
  ctx.fillStyle = frame.dark ? 'rgba(148,163,184,0.7)' : 'rgba(100,116,139,0.75)';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'bottom';
  ctx.fillText('RotasiLab · konteks nyata', width - 8, height - 6);
  ctx.restore();
}
