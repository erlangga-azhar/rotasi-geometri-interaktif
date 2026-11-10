import { useCallback, useEffect, useRef, useState } from 'react';
import { Clock, FerrisWheel, Palette, Pause, Play, Wind } from 'lucide-react';
import type { ThemeMode } from '../types/rotation';
import type { RealWorldMode } from '../contexts/types';
import { REAL_WORLD_MODE_MAP } from '../contexts/modes';
import { renderRealWorldScene, renderRealWorldStatic } from '../contexts/renderRealWorldScene';
import { getStaticLayer } from '../canvas/staticLayer';
import type { StaticLayerCache } from '../canvas/staticLayer';
import type { ViewportSize } from '../hooks/useOnDemandFrame';
import { useSweepRotation } from '../hooks/useSweepRotation';

interface RealWorldCanvasProps {
  mode: RealWorldMode;
  theme: ThemeMode;
}

const MODE_ICON = {
  clock: Clock,
  wheel: FerrisWheel,
  turbine: Wind,
  motif: Palette,
} as const;

const SPEEDS = [0.5, 1, 2];
const MOTIF_STEPS = [45, 60, 90];
/** 1× = satu putaran penuh dalam 6 detik (60°/detik). */
const BASE_DEG_PER_SECOND = 60;

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function RealWorldCanvas({ mode, theme }: RealWorldCanvasProps) {
  const info = REAL_WORLD_MODE_MAP[mode];
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const staticLayerRef = useRef<StaticLayerCache | null>(null);
  const [playing, setPlaying] = useState(() => !prefersReducedMotion());
  const [inView, setInView] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [step, setStep] = useState(90);

  const draw = useCallback(
    (angle: number, viewport: ViewportSize) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const width = Math.max(240, viewport.width);
      const height = Math.max(200, viewport.height);
      /* DPR dibatasi 2: tajam di retina tanpa membebani fill-rate ponsel. */
      const dpr = Math.min(viewport.dpr || 1, 2);
      const pixelWidth = Math.round(width * dpr);
      const pixelHeight = Math.round(height * dpr);

      if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
        canvas.width = pixelWidth;
        canvas.height = pixelHeight;
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const dark = theme === 'dark';
      const layerKey = `${mode}|${dark ? 'dark' : 'light'}|${width.toFixed(1)}x${height.toFixed(1)}@${dpr}`;
      const staticLayer = getStaticLayer(
        staticLayerRef,
        layerKey,
        width,
        height,
        dpr,
        (layerCtx) => renderRealWorldStatic(layerCtx, width, height, { mode, dark })
      );

      renderRealWorldScene(
        ctx,
        width,
        height,
        { mode, angle, step, dark },
        staticLayer
      );
    },
    [mode, step, theme]
  );

  /* Hentikan animasi saat kanvas di luar viewport — baterai tetap hemat. */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || typeof IntersectionObserver === 'undefined') return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry) setInView(entry.isIntersecting);
      },
      { threshold: 0.01 }
    );
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  const { invalidate, reset } = useSweepRotation({
    playing: playing && inView,
    speed: speed * BASE_DEG_PER_SECOND,
    observe: canvasRef,
    onFrame: (frame) => draw(frame.angle, frame.viewport),
  });

  /* Resize/theme/step → satu frame baru; animasi tetap 0 FPS bila dijeda. */
  useEffect(() => {
    invalidate();
  }, [invalidate, draw]);

  /* Mulai ulang sapuan setiap kali mode atau langkah simetri berubah. */
  useEffect(() => {
    reset();
  }, [mode, step, reset]);

  const Icon = MODE_ICON[mode];

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-3 shadow-xl shadow-slate-200/50 transition-colors sm:p-4 dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/20">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3">
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-600 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-400">
            <Icon size={15} />
          </span>
          <div className="leading-tight">
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{info.label}</p>
            <p className="font-mono text-[10px] text-slate-500 dark:text-slate-400">
              {info.center.a === 0 && info.center.b === 0
                ? 'pusat O(0, 0)'
                : `pusat P₀(${info.center.a}, ${info.center.b})`}{' '}
              · R = {info.radius}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setPlaying((previous) => !previous)}
            aria-pressed={playing}
            title={playing ? 'Jeda animasi (0 FPS, hemat baterai)' : 'Putar animasi kontinu'}
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-[11px] font-bold text-slate-700 shadow-sm transition hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:border-indigo-500/50 dark:hover:text-indigo-300"
          >
            {playing ? <Pause size={15} /> : <Play size={15} />}
            <span>{playing ? 'Jeda' : 'Putar'}</span>
          </button>

          <div
            role="group"
            aria-label="Kecepatan animasi"
            className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-950"
          >
            {SPEEDS.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setSpeed(value)}
                aria-pressed={speed === value}
                className={
                  'min-h-[36px] rounded-lg px-2 font-mono text-[11px] font-bold transition ' +
                  (speed === value
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-white hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-200')
                }
              >
                {value}×
              </button>
            ))}
          </div>
        </div>
      </div>

      {mode === 'motif' && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/70 px-2.5 py-2 dark:border-slate-800 dark:bg-slate-950/60">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
            Langkah sapuan
          </span>
          <div role="group" aria-label="Langkah simetri motif" className="flex items-center gap-1">
            {MOTIF_STEPS.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setStep(value)}
                aria-pressed={step === value}
                className={
                  'min-h-[36px] rounded-lg border px-2.5 font-mono text-[11px] font-bold transition ' +
                  (step === value
                    ? 'border-pink-300 bg-pink-50 text-pink-700 dark:border-pink-500/50 dark:bg-pink-500/15 dark:text-pink-300'
                    : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-900 dark:border-slate-800 dark:text-slate-400 dark:hover:border-slate-700 dark:hover:text-slate-200')
                }
              >
                {value}°
              </button>
            ))}
          </div>
          <span className="ml-auto font-mono text-[10px] font-semibold text-slate-500 dark:text-slate-400">
            n = {Math.round(360 / step)} lipat
          </span>
        </div>
      )}

      <div className="relative h-[300px] w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-inner transition-colors sm:h-[360px] lg:h-[400px] dark:border-slate-800/80 dark:bg-slate-950">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 h-full w-full"
          role="img"
          aria-label={`Animasi kontinu ${info.label}. ${info.description}`}
        />

        <div className="pointer-events-none absolute bottom-3 left-3 flex flex-wrap gap-1.5 text-[10px] font-semibold">
          <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white/95 px-2 py-1 text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-900/95 dark:text-slate-300 dark:shadow-none">
            <span className="h-2 w-2 rounded-full bg-blue-500" /> P awal
          </span>
          <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white/95 px-2 py-1 text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-900/95 dark:text-slate-300 dark:shadow-none">
            <span className="h-2 w-2 rounded-full bg-amber-500" /> P′ bergerak
          </span>
        </div>

        <div className="pointer-events-none absolute right-3 top-3 rounded-md border border-slate-200 bg-white/95 px-2 py-1 text-[10px] font-semibold text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900/95 dark:text-slate-400 dark:shadow-none">
          {playing ? 'kontinu · dt-based' : 'dijeda · 0 FPS'}
        </div>
      </div>

      <p className="mt-3 text-[10px] leading-relaxed text-slate-600 dark:text-slate-400">
        Titik P tetap di posisi awal, sedangkan P′ menyapu lintasan lingkaran. Koordinat pada label
        dihitung relatif terhadap pusat rotasi, persis seperti rumus di samping.
      </p>
    </div>
  );
}

export default RealWorldCanvas;
