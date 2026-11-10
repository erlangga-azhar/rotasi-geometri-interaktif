/**
 * Layer statis (grid, sumbu, label, dial jam) dirender sekali ke kanvas
 * tersembunyi, lalu ditempel ke kanvas utama dengan `drawImage()`.
 *
 * Kanvas HTML biasa dipakai (bukan `OffscreenCanvas`) agar kompatibel dengan
 * Safari lama dan context 2D-nya identik dengan tipe `CanvasRenderingContext2D`.
 */
export interface StaticLayerCache {
  key: string;
  canvas: HTMLCanvasElement;
}

type LayerCacheRef = { current: StaticLayerCache | null };

export function getStaticLayer(
  cacheRef: LayerCacheRef,
  key: string,
  width: number,
  height: number,
  dpr: number,
  paint: (ctx: CanvasRenderingContext2D) => void
): HTMLCanvasElement | null {
  const cached = cacheRef.current;
  if (cached && cached.key === key) return cached.canvas;
  if (typeof document === 'undefined') return null;

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width * dpr));
  canvas.height = Math.max(1, Math.round(height * dpr));

  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  /* Render dalam satuan CSS; drawImage nanti mengembalikannya ke ukuran CSS. */
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  paint(ctx);

  cacheRef.current = { key, canvas };
  return canvas;
}
