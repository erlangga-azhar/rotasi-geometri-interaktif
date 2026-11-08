import { useCallback, useLayoutEffect, useMemo, useRef } from 'react';

export type SceneValues = Record<string, number>;
export type TweenMode = 'tween' | 'immediate';
export type SceneEpsilon<E extends SceneValues> = Partial<Record<keyof E, number>>;

/**
 * Bentuk ref minimal yang stabil di React 18 maupun 19.
 * `MutableRefObject` sudah tidak dipakai lagi (deprecated di React 19).
 */
export interface SceneValuesRef<E extends SceneValues> {
  readonly current: E;
}

/** Ambang default: 0,005 satuan dunia, cukup untuk 1/100 piksel pada skala umum. */
export const DEFAULT_EPSILON = 0.005;

/** Porsi selisih yang ditempuh per frame 60Hz. */
const DEFAULT_EASING = 0.18;

const FRAME_MS = 1000 / 60;
const MAX_EASING = 0.999;

type EpsilonMap = Record<string, number>;

const EMPTY_EPSILON: EpsilonMap = {};

/** Aman terhadap properti warisan prototype (`toString`, `constructor`, dsb.). */
function hasOwn(record: object, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(record, key);
}

export interface UseTweenedSceneOptions<E extends SceneValues> {
  /** Nilai tujuan. Sebaiknya dimemo agar efek sinkronisasi tidak jalan tiap render. */
  target: E;
  /** Ambang settle per kunci; kunci tanpa override memakai DEFAULT_EPSILON. */
  epsilon?: SceneEpsilon<E>;
  /** 0..1 per frame 60Hz. Default 0,18. */
  easing?: number;
  /**
   * `tween`: interpolasi halus menuju target.
   * `immediate`: lompat ke target, tanpa animasi (dipakai saat drag).
   */
  mode?: TweenMode;
}

export interface TweenedScene<E extends SceneValues> {
  /** Nilai yang sedang digambar. Aman dibaca di dalam callback frame. */
  values: SceneValuesRef<E>;
  /** Majukan animasi sebesar `deltaMs`. Kembalikan true bila masih bergerak. */
  step: (deltaMs: number) => boolean;
  /** Lompat ke target tanpa animasi (untuk prefers-reduced-motion). */
  snapToTarget: () => void;
  /** Apakah semua kunci sudah berada dalam epsilon target. */
  isSettled: () => boolean;
}

function toEpsilonMap<E extends SceneValues>(epsilon?: SceneEpsilon<E>): EpsilonMap {
  if (!epsilon) return EMPTY_EPSILON;

  const map: EpsilonMap = {};
  for (const [key, value] of Object.entries(epsilon)) {
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
      map[key] = value;
    }
  }
  return map;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Scene numerik yang bergerak menuju target secara frame-rate independent.
 * Tidak punya rAF sendiri: `step()` dipanggil dari loop render-on-demand.
 */
export function useTweenedScene<E extends SceneValues>({
  target,
  epsilon,
  easing = DEFAULT_EASING,
  mode = 'tween',
}: UseTweenedSceneOptions<E>): TweenedScene<E> {
  const targetRef = useRef<E>(target);
  const valuesRef = useRef<E>({ ...target } as E);
  /*
   * Daftar kunci di-cache: `step()` tidak boleh memanggil Object.keys() tiap
   * frame (60-120x/detik) karena alokasi array memicu GC pressure.
   */
  const keysRef = useRef<string[]>(Object.keys(target));
  const epsilonRef = useRef<EpsilonMap>(EMPTY_EPSILON);
  const easingRef = useRef(easing);
  const modeRef = useRef<TweenMode>(mode);

  useLayoutEffect(() => {
    epsilonRef.current = toEpsilonMap(epsilon);
    easingRef.current = clamp(easing, 0, MAX_EASING);
    modeRef.current = mode;
  }, [epsilon, easing, mode]);

  /* Sinkronkan kunci target: kunci baru langsung muncul, kunci usang dibuang. */
  useLayoutEffect(() => {
    targetRef.current = target;

    const goal = target as SceneValues;
    const values = valuesRef.current as SceneValues;
    const targetKeys = Object.keys(goal);
    let structuralChange = false;

    /* Object.keys + hasOwn: hanya properti milik sendiri, aman dari prototype. */
    for (const key of targetKeys) {
      if (!hasOwn(values, key)) {
        values[key] = goal[key];
        structuralChange = true;
      }
    }
    for (const key of Object.keys(values)) {
      if (!hasOwn(goal, key)) {
        delete values[key];
        structuralChange = true;
      }
    }

    if (structuralChange) {
      keysRef.current = targetKeys;
    }
  }, [target]);

  const step = useCallback((deltaMs: number): boolean => {
    const goal = targetRef.current as SceneValues;
    const values = valuesRef.current as SceneValues;
    const epsilons = epsilonRef.current;
    const keys = keysRef.current;

    if (modeRef.current === 'immediate') {
      let changed = false;

      for (let index = 0; index < keys.length; index += 1) {
        const key = keys[index];
        const next = goal[key];
        const current = values[key];
        const epsilon = epsilons[key] ?? DEFAULT_EPSILON;

        /* Nilai baru sudah tepat di target: tidak butuh frame tambahan. */
        if (current === undefined) {
          values[key] = next;
          continue;
        }

        if (current === next) continue;

        if (Math.abs(next - current) > epsilon) {
          values[key] = next;
          changed = true;
        } else {
          /*
           * Selisih di bawah epsilon hanyalah derau float (mis. 179.99999999999997
           * vs 180). Ratakan tanpa meminta frame tambahan agar loop bisa 0 FPS.
           */
          values[key] = next;
        }
      }

      return changed;
    }

    const frames = deltaMs > 0 ? deltaMs / FRAME_MS : 1;
    const alpha = 1 - Math.pow(1 - easingRef.current, frames);
    let animating = false;

    for (let index = 0; index < keys.length; index += 1) {
      const key = keys[index];
      const next = goal[key];
      const current = values[key];

      /* Nilai baru sudah tepat di target: tidak memicu frame rAF ekstra. */
      if (current === undefined) {
        values[key] = next;
        continue;
      }

      if (current === next) continue;

      const epsilon = epsilons[key] ?? DEFAULT_EPSILON;
      if (Math.abs(next - current) <= epsilon) {
        values[key] = next;
        continue;
      }

      const stepped = current + (next - current) * alpha;
      if (Math.abs(next - stepped) <= epsilon) {
        values[key] = next;
      } else {
        values[key] = stepped;
        animating = true;
      }
    }

    return animating;
  }, []);

  const snapToTarget = useCallback(() => {
    Object.assign(valuesRef.current, targetRef.current);
  }, []);

  const isSettled = useCallback((): boolean => {
    const goal = targetRef.current as SceneValues;
    const values = valuesRef.current as SceneValues;
    const epsilons = epsilonRef.current;
    const keys = keysRef.current;

    for (let index = 0; index < keys.length; index += 1) {
      const key = keys[index];
      const current = values[key];
      if (current === undefined) return false;
      if (Math.abs(goal[key] - current) > (epsilons[key] ?? DEFAULT_EPSILON)) return false;
    }

    return true;
  }, []);

  return useMemo(
    () => ({ values: valuesRef, step, snapToTarget, isSettled }),
    [step, snapToTarget, isSettled]
  );
}
