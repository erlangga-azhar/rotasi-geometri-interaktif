/**
 * Layer statis (grid, sumbu, label, dial jam) dirender sekali ke kanvas
 * tersembunyi, lalu ditempel ke kanvas utama dengan `drawImage()`.
 *
 * Cache dibandingkan lewat properti numerik/boolean — tidak ada string key
 * atau `.join('|')` yang dibuat pada setiap frame rAF.
 */
export interface LayerCacheSpec {
  width: number;
  height: number;
  dpr: number;
  scale: number;
  originX: number;
  originY: number;
  dark: boolean;
  clockMode: boolean;
  /** Geometri dial jam; 0 bila overlay jam tidak aktif. */
  dialX: number;
  dialY: number;
  dialRadius: number;
}

export interface StaticLayerCache extends LayerCacheSpec {
  canvas: HTMLCanvasElement;
}

type LayerCacheRef = { current: StaticLayerCache | null };

/** Spec awal untuk dijadikan `useRef`; properti diperbarui di tempat per frame. */
export function createLayerSpec(overrides: Partial<LayerCacheSpec> = {}): LayerCacheSpec {
  return {
    width: 0,
    height: 0,
    dpr: 1,
    scale: 1,
    originX: 0,
    originY: 0,
    dark: false,
    clockMode: false,
    dialX: 0,
    dialY: 0,
    dialRadius: 0,
    ...overrides,
  };
}

/** Toleransi sub-piksel agar jitter float tidak memicu rebuild. */
const EPSILON = 0.01;
/** Toleransi DPR lebih ketat (0,5 / 1 / 1,25 / 2 / 3). */
const DPR_EPSILON = 0.001;

const nearlyEqual = (a: number, b: number, epsilon = EPSILON): boolean =>
  Math.abs(a - b) < epsilon;

function cacheMatches(cache: LayerCacheSpec, spec: LayerCacheSpec): boolean {
  return (
    nearlyEqual(cache.width, spec.width) &&
    nearlyEqual(cache.height, spec.height) &&
    nearlyEqual(cache.dpr, spec.dpr, DPR_EPSILON) &&
    nearlyEqual(cache.scale, spec.scale) &&
    nearlyEqual(cache.originX, spec.originX) &&
    nearlyEqual(cache.originY, spec.originY) &&
    cache.dark === spec.dark &&
    cache.clockMode === spec.clockMode &&
    nearlyEqual(cache.dialX, spec.dialX) &&
    nearlyEqual(cache.dialY, spec.dialY) &&
    nearlyEqual(cache.dialRadius, spec.dialRadius)
  );
}

/**
 * Ambil layer dari cache bila semua properti cocok. `spec` boleh berupa objek
 * mutable yang dipakai ulang komponen; ia hanya disalin saat rebuild.
 */
export function getStaticLayer(
  cacheRef: LayerCacheRef,
  spec: LayerCacheSpec,
  paint: (ctx: CanvasRenderingContext2D) => void
): HTMLCanvasElement | null {
  const cached = cacheRef.current;
  if (cached && cacheMatches(cached, spec)) return cached.canvas;
  if (typeof document === 'undefined') return null;

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(spec.width * spec.dpr));
  canvas.height = Math.max(1, Math.round(spec.height * spec.dpr));

  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  /* Render dalam satuan CSS; drawImage nanti mengembalikannya ke ukuran CSS. */
  ctx.setTransform(spec.dpr, 0, 0, spec.dpr, 0, 0);
  paint(ctx);

  cacheRef.current = { ...spec, canvas };
  return canvas;
}
