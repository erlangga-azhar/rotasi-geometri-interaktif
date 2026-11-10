import type { RealWorldModeInfo } from './types';

/**
 * Konteks dunia nyata. Pusat P0 dan jari-jari dinyatakan dalam satuan
 * Kartesius agar koordinat di kanvas bisa dibaca seperti soal matematika.
 */
export const REAL_WORLD_MODES: readonly RealWorldModeInfo[] = [
  {
    id: 'clock',
    label: 'Jam Dinding & Kompas',
    short: 'Jam',
    description:
      'Jarum menit menyapu dial secara kontinu searah jarum jam. Titik ujung jarum adalah P′ yang koordinatnya berubah setiap saat, sementara P di puncak dial adalah posisi awalnya.',
    formulaTex: String.raw`\theta = -6^\circ \times m,\qquad P'(x',y') = (a - r\sin\theta,\; b + r\cos\theta)`,
    observations: [
      'Satu putaran penuh = 360°, sama dengan 60 menit.',
      'Arah jarum jam berarti sudut matematisnya negatif (θ = −α).',
      'Jarak ujung jarum ke pusat selalu r (invarian rotasi).',
    ],
    center: { a: 0, b: 0 },
    radius: 3.1,
  },
  {
    id: 'wheel',
    label: 'Kincir Ria / Bianglala',
    short: 'Kincir',
    description:
      'Kabin penumpang bergerak melingkar mengelilingi poros P₀(a, b). Setiap kabin menempuh busur yang sama, tetapi koordinatnya berbeda karena sudut awalnya berbeda.',
    formulaTex: String.raw`P' = P_0 + R\,(\cos\theta,\;\sin\theta),\qquad P_0(a,b)`,
    observations: [
      'θ terus bertambah, sehingga posisi kabin berubah mulus.',
      'Poros P₀ bukan titik asal: koordinat dihitung relatif terhadap (a, b).',
      'Semua kabin berjarak R dari poros.',
    ],
    center: { a: 1.15, b: -0.55 },
    radius: 2.45,
  },
  {
    id: 'turbine',
    label: 'Turbin Angin / Kipas',
    short: 'Turbin',
    description:
      'Tiga bilah berputar mengelilingi hub. Ujung tiap bilah adalah bayangan dari titik yang sama setelah diputar θ, θ + 120°, dan θ + 240°.',
    formulaTex: String.raw`P'_k = P_0 + R\,(\cos(\theta + k\cdot120^\circ),\;\sin(\theta + k\cdot120^\circ))`,
    observations: [
      'Bilah identik, sehingga cukup satu titik diputar berulang.',
      'Sudut antar bilah 360° / 3 = 120°.',
      'Kecepatan sudut ω menentukan besar θ = ω·t.',
    ],
    center: { a: -1.35, b: 0.95 },
    radius: 2.35,
  },
  {
    id: 'motif',
    label: 'Simetri Motif / Batik',
    short: 'Motif',
    description:
      'Satu motif dasar disapu berputar mengelilingi pusat simetri. Jejak bayangan pada setiap langkah (45°, 60°, atau 90°) memperlihatkan bagaimana simetri putar terbentuk.',
    formulaTex: String.raw`\theta_k = k\cdot\frac{360^\circ}{n},\qquad n = \frac{360^\circ}{\text{langkah}}`,
    observations: [
      'Motif kembali menutupi dirinya setelah satu putaran penuh.',
      'Jumlah salinan = 360° / langkah simetri.',
      'Pusat simetri tidak pernah berpindah.',
    ],
    center: { a: 0, b: 0 },
    radius: 2.95,
  },
];

export const REAL_WORLD_MODE_MAP: Record<string, RealWorldModeInfo> = Object.fromEntries(
  REAL_WORLD_MODES.map((mode) => [mode.id, mode])
);
