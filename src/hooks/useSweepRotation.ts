import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import type { RefObject } from 'react';
import { normalizeDegree } from '../utils/math';
import { useOnDemandFrame } from './useOnDemandFrame';
import type { ViewportSize } from './useOnDemandFrame';

/**
 * Waktu (ms) agar kecepatan menyusul nilai target. Dipakai sebagai alpha decay
 * berbasis dt, sehingga percepatan terasa sama di layar 60Hz maupun 120Hz/VRR.
 */
const SPEED_TAU_MS = 700;

export interface SweepFrame {
  /** Sudut ternormalisasi 0…360, sudah diamankan di ingestion layer. */
  angle: number;
  /** Jarak waktu frame dalam ms; 0 saat bangun dari idle. */
  deltaMs: number;
  viewport: ViewportSize;
}

interface UseSweepRotationOptions {
  /** false = animasi berhenti total; loop rAF tidak dijadwalkan (0 FPS). */
  playing: boolean;
  /** Kecepatan target dalam derajat/detik. */
  speed: number;
  /** Elemen yang diamati untuk ukuran + DPR. */
  observe: RefObject<HTMLElement | null>;
  /** Dipanggil sekali per frame animasi (bukan saat idle). */
  onFrame: (frame: SweepFrame) => void;
}

export interface SweepRotation {
  /** Minta satu frame (resize, ganti mode, ganti tema, dsb.). */
  invalidate: () => void;
  /** Kembalikan sudut ke 0 dan gambar ulang. */
  reset: () => void;
}

/**
 * Rotasi kontinu seperti jarum jam dengan dua jaminan performa:
 * 1. `dt`-based alpha decay — kecepatan diinterpolasi per milidetik, bukan per frame.
 * 2. Render-on-demand — saat `playing` false, `useOnDemandFrame` berhenti (0 FPS).
 */
export function useSweepRotation({
  playing,
  speed,
  observe,
  onFrame,
}: UseSweepRotationOptions): SweepRotation {
  const angleRef = useRef(0);
  const velocityRef = useRef(0);
  const playingRef = useRef(playing);
  const speedRef = useRef(speed);
  const onFrameRef = useRef(onFrame);

  useLayoutEffect(() => {
    onFrameRef.current = onFrame;
    speedRef.current = speed;
  }, [onFrame, speed]);

  const { invalidate } = useOnDemandFrame({
    observe,
    onFrame: ({ delta: deltaTime, viewport }) => {
      if (!playingRef.current) {
        /* Tetap gambar satu frame diam (penting setelah resize/theme berubah). */
        onFrameRef.current({ angle: angleRef.current, deltaMs: 0, viewport });
        return false;
      }

      /* Klem dt agar tab yang sempat dibekukan tidak memicu teleportasi fisika. */
      const safeDt = Math.min(Math.max(deltaTime, 0), 64);
      const seconds = safeDt / 1000;

      /*
       * Alpha decay frame-rate independent:
       * alpha = 1 - e^(-dt/tau). Kecepatan menyusul target secara halus tanpa
       * lompatan saat slider kecepatan digeser, dan tetap konsisten di 120Hz.
       */
      const alpha = 1 - Math.exp(-safeDt / SPEED_TAU_MS);
      velocityRef.current += (speedRef.current - velocityRef.current) * alpha;

      /* Normalisasi di titik akumulasi, bukan di safeCos/safeSin. */
      angleRef.current = normalizeDegree(angleRef.current + velocityRef.current * seconds);

      onFrameRef.current({ angle: angleRef.current, deltaMs: safeDt, viewport });
      return true;
    },
  });

  useEffect(() => {
    playingRef.current = playing;
    if (!playing) velocityRef.current = 0;
    /* Satu frame tetap digambar agar tampilan jeda langsung terlihat. */
    invalidate();
  }, [playing, invalidate]);

  const reset = useCallback(() => {
    angleRef.current = 0;
    velocityRef.current = 0;
    invalidate();
  }, [invalidate]);

  return { invalidate, reset };
}
