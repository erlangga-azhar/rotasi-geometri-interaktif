import type { CenterPoint } from '../types/rotation';

export type RealWorldMode = 'clock' | 'wheel' | 'turbine' | 'motif';

export interface RealWorldModeInfo {
  id: RealWorldMode;
  label: string;
  short: string;
  description: string;
  formulaTex: string;
  observations: string[];
  /** Pusat putar P0 dalam koordinat Kartesius. */
  center: CenterPoint;
  /** Jari-jari utama dalam satuan dunia. */
  radius: number;
}

export interface ContextScenePalette {
  grid: string;
  axis: string;
  tick: string;
  label: string;
  muted: string;
}

export interface ContextScene {
  width: number;
  height: number;
  dark: boolean;
  mode: RealWorldMode;
  /** Sudut total terakumulasi (derajat), bisa melewati 360. */
  angle: number;
  /** Langkah simetri motif (45/60/90). */
  step: number;
  center: CenterPoint;
  radius: number;
  scale: number;
  originX: number;
  originY: number;
  palette: ContextScenePalette;
}
