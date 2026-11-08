import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import type { RefObject } from 'react';

/**
 * Jeda minimum sebelum timestamp frame terakhir dianggap "basi".
 * Selama jeda lebih pendek dari ini, `invalidate()` tidak menyentuh `last`,
 * sehingga dt frame berikutnya tetap akurat di layar 120Hz / VRR.
 */
export const DEFAULT_IDLE_RESET_MS = 100;

/** Batas atas dt: tab yang sempat dibekukan tidak memicu lompatan animasi. */
const DEFAULT_MAX_DELTA_MS = 64;

/** DPR dibatasi 2 agar biaya fill-rate kanvas tetap wajar di ponsel. */
const DPR_CAP = 2;

/** Selisih ukuran di bawah 0,5px dianggap derau subpiksel. */
const SIZE_EPSILON = 0.5;

export interface ViewportSize {
  readonly width: number;
  readonly height: number;
  readonly dpr: number;
}

export interface FrameInfo {
  /** Timestamp rAF (DOMHighResTimeStamp, sama dengan performance.now()). */
  readonly time: number;
  /** Jarak waktu sejak frame sebelumnya dalam ms; 0 saat bangun dari idle. */
  readonly delta: number;
  /** true bila frame ini adalah frame pertama setelah idle panjang. */
  readonly resumed: boolean;
  /** Ukuran CSS + DPR terbaru dari elemen yang diamati. */
  readonly viewport: ViewportSize;
}

export interface UseOnDemandFrameOptions {
  /**
   * Dipanggil satu kali per frame. Kembalikan `true` selama animasi masih
   * berjalan agar frame berikutnya dijadwalkan; `false`/`void` menghentikan loop.
   */
  onFrame: (frame: FrameInfo) => boolean | void;
  /** Elemen yang ukurannya diamati (biasanya elemen <canvas>). */
  observe?: RefObject<HTMLElement | null>;
  /** Default 100ms. Naikkan bila animasi Anda memakai dt dari event terpisah. */
  idleResetMs?: number;
  /** Default 64ms. */
  maxDeltaMs?: number;
}

export interface OnDemandFrame {
  /** Stabil sejak render pertama; aman dipanggil kapan pun, termasuk saat render. */
  invalidate: () => void;
}

/**
 * Loop rAF yang hanya hidup saat ada pekerjaan.
 *
 * - Tidak ada frame sama sekali ketika idle (0 FPS).
 * - `invalidate()` di tengah tick tidak merusak dt: timestamp hanya di-reset
 *   setelah idle panjang, bukan setiap kali invalidasi.
 * - Elemen yang belum terikat saat mount dipasang secara pasif pada
 *   `invalidate()` berikutnya atau pada event resize — tanpa MutationObserver.
 */
export function useOnDemandFrame({
  onFrame,
  observe,
  idleResetMs = DEFAULT_IDLE_RESET_MS,
  maxDeltaMs = DEFAULT_MAX_DELTA_MS,
}: UseOnDemandFrameOptions): OnDemandFrame {
  const onFrameRef = useRef(onFrame);
  const idleResetRef = useRef(idleResetMs);
  const maxDeltaRef = useRef(maxDeltaMs);
  const rafRef = useRef(0);
  const lastTimeRef = useRef<number | null>(null);
  const viewportRef = useRef<ViewportSize>({ width: 0, height: 0, dpr: 1 });
  const disposedRef = useRef(false);
  /* Diisi oleh effect pengamat; dipakai invalidate() untuk memasang observer. */
  const attachRef = useRef<(() => void) | null>(null);

  /* Layout effect: callback terbaru tersedia sebelum frame pertama dipaint. */
  useLayoutEffect(() => {
    onFrameRef.current = onFrame;
    idleResetRef.current = idleResetMs;
    maxDeltaRef.current = maxDeltaMs;
  }, [onFrame, idleResetMs, maxDeltaMs]);

  const runFrame = useCallback((time: number) => {
    rafRef.current = 0;
    if (disposedRef.current) return;

    const previous = lastTimeRef.current;
    const resumed = previous === null;
    const rawDelta = previous === null ? 0 : time - previous;
    const delta = Math.min(Math.max(rawDelta, 0), maxDeltaRef.current);

    lastTimeRef.current = time;

    const keepGoing = onFrameRef.current({
      time,
      delta,
      resumed,
      viewport: viewportRef.current,
    });

    /* `invalidate()` di dalam callback sudah menjadwalkan frame sendiri. */
    if (keepGoing && rafRef.current === 0 && !disposedRef.current) {
      rafRef.current = requestAnimationFrame(runFrame);
    }
  }, []);

  const invalidate = useCallback(() => {
    if (disposedRef.current) return;

    /*
     * Pasang observer bila ref baru terikat (mount bertahap / modal). Operasi
     * ini hanya membaca ref dan, saat elemen benar-benar berubah, melakukan
     * satu pengukuran. Tidak ada pembacaan layout pada setiap invalidasi.
     */
    attachRef.current?.();

    const last = lastTimeRef.current;
    /*
     * JANGAN reset timestamp hanya karena ada invalidasi baru. Di layar 120Hz
     * interval frame 8,3ms; mereset `last` di tengah tick membuat frame
     * berikutnya memakai dt 16,7ms dan memicu micro-stutter. Reset hanya bila
     * loop benar-benar bangun dari idle panjang.
     */
    if (last !== null && performance.now() - last >= idleResetRef.current) {
      lastTimeRef.current = null;
    }

    if (rafRef.current === 0) {
      rafRef.current = requestAnimationFrame(runFrame);
    }
  }, [runFrame]);

  /*
   * Ukuran + DPR: ResizeObserver, window.resize, dan visualViewport.resize.
   * Effect tidak berhenti hanya karena `observe.current` masih null.
   */
  useEffect(() => {
    let observer: ResizeObserver | null = null;
    let observed: HTMLElement | null = null;

    const measure = () => {
      const element = observed;
      if (!element) return;

      const rect = element.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP);
      const previous = viewportRef.current;

      /*
       * Perbandingan ini juga menangkap transisi 0x0 -> ukuran nyata saat modal
       * atau tab tersembunyi dibuka kembali.
       */
      if (
        Math.abs(previous.width - rect.width) < SIZE_EPSILON &&
        Math.abs(previous.height - rect.height) < SIZE_EPSILON &&
        previous.dpr === dpr
      ) {
        return;
      }

      viewportRef.current = { width: rect.width, height: rect.height, dpr };
      invalidate();
    };

    /*
     * Idempoten: hanya menyentuh DOM bila elemen hasil ref berbeda dari yang
     * sedang diamati. Pengukuran dilakukan sekali per pemasangan; ResizeObserver
     * yang menangani perubahan ukuran berikutnya.
     */
    const sync = () => {
      const element = observe?.current;
      if (!element || element === observed) return;

      observer?.disconnect();
      observer = new ResizeObserver(measure);
      observer.observe(element);
      observed = element;
      measure();
    };

    const handleViewportResize = () => {
      sync();
      measure();
    };

    /* Listener viewport selalu terpasang, tidak bergantung pada ref elemen. */
    window.addEventListener('resize', handleViewportResize, { passive: true });
    const visualViewport = window.visualViewport;
    visualViewport?.addEventListener('resize', handleViewportResize, { passive: true });

    attachRef.current = sync;
    sync();

    return () => {
      attachRef.current = null;
      observer?.disconnect();
      window.removeEventListener('resize', handleViewportResize);
      visualViewport?.removeEventListener('resize', handleViewportResize);
      observed = null;
    };
  }, [invalidate, observe]);

  useEffect(() => {
    disposedRef.current = false;
    invalidate();

    return () => {
      disposedRef.current = true;
      if (rafRef.current !== 0) cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
      lastTimeRef.current = null;
    };
  }, [invalidate]);

  return { invalidate };
}
