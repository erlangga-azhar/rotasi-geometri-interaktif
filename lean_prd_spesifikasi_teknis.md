# Lean PRD & Spesifikasi Teknis: Web Rotasi Geometri

Dokumen ini berisi spesifikasi produk, arsitektur data TypeScript, penanganan matematika, serta struktur folder proyek berbasis **Vite + React + TypeScript**.

---

## 1. PRODUCT REQUIREMENT DOCUMENT (PRD)

### 1.1 Tujuan Produk
Menyediakan media peraga matematika digital yang responsif, presisi, dan bekerja 100% secara *offline* untuk membantu siswa SMA/SMK memahami konsep Rotasi Geometri melalui manipulasi visual interaktif secara *real-time*.

### 1.2 Target Pengguna
* **Siswa SMA/SMK (Kelas XI/XII)**: Belajar mandiri dan melatih kemampuan pemecahan soal rotasi.
* **Guru Matematika**: Alat bantu visualisasi saat mengajar di kelas tanpa terkendala koneksi internet.

### 1.3 Matriks Fitur (MVP vs Post-MVP)

| Fitur | Prioritas | Detail Spesifikasi Teknis |
| :--- | :--- | :--- |
| **PWA & Offline Support** | Must-Have (MVP) | Caching statis & font KaTeX menggunakan `vite-plugin-pwa`. |
| **High-DPI Canvas Visualizer** | Must-Have (MVP) | Render Kartesius 2D teranimasi tanpa kedipan (*flicker*). |
| **Control Panel & Presets** | Must-Have (MVP) | Slider $\theta$, preset sudut, dan switch arah rotasi. |
| **Matriks KaTeX Dinamis** | Must-Have (MVP) | Substitusi variabel matriks secara instan via React state. |
| **Step-by-Step Solver** | Must-Have (MVP) | Uraian aljabar rotasi terhadap pusat $O(0,0)$ dan $P(a,b)$. |
| **Kuis & Visual Link** | Must-Have (MVP) | Bank soal acak terintegrasi penuh ke canvas visualizer. |
| **Export Canvas (PNG/SVG)** | Post-MVP | Menyimpan gambar grafik Kartesius untuk lampiran tugas. |

---

## 2. ARSITEKTUR DATA & TYPESCRIPT DEFINITIONS

### 2.1 File Tipe Data (`src/types/rotation.ts`)

```typescript
export type ShapeType = 'point' | 'triangle' | 'square';

export interface Point2D {
  x: number;
  y: number;
}

export interface CenterPoint {
  a: number;
  b: number;
}

export interface RotationState {
  point: Point2D;
  center: CenterPoint;
  angleDegree: number;
  direction: 1 | -1; // 1: CCW (positif), -1: CW (negatif)
  shape: ShapeType;
}

export interface QuizQuestion {
  id: string;
  prompt: string;
  answerTex?: string;
  options: Point2D[];
  correctIndex: number;
  explanation: string;
  params: RotationState;
}
```

---

## 3. LOGIKA MATEMATIKA & PENANGANAN EPSILON

### 3.1 Helper Trigonometri (`src/lib/mathHelpers.ts`)

```typescript
import { Point2D, CenterPoint } from '../types/rotation';

const EPSILON = 1e-10;
const DEG_TO_RAD = Math.PI / 180;

export function safeCos(deg: number): number {
  const rad = deg * DEG_TO_RAD;
  const val = Math.cos(rad);
  if (Math.abs(val) < EPSILON) return 0;
  if (Math.abs(val - 1) < EPSILON) return 1;
  if (Math.abs(val + 1) < EPSILON) return -1;
  return Number(val.toFixed(4));
}

export function safeSin(deg: number): number {
  const rad = deg * DEG_TO_RAD;
  const val = Math.sin(rad);
  if (Math.abs(val) < EPSILON) return 0;
  if (Math.abs(val - 1) < EPSILON) return 1;
  if (Math.abs(val + 1) < EPSILON) return -1;
  return Number(val.toFixed(4));
}

export function rotatePoint(pt: Point2D, center: CenterPoint, deg: number): Point2D {
  const c = safeCos(deg);
  const s = safeSin(deg);
  const dx = pt.x - center.a;
  const dy = pt.y - center.b;

  return {
    x: Number((center.a + dx * c - dy * s).toFixed(4)),
    y: Number((center.b + dx * s + dy * c).toFixed(4))
  };
}
```

---

## 4. STRUKTUR DIREKTORI PROYEK MODULAR

```text
rotasi-geometri-app/
├── public/
│   ├── favicon.ico
│   └── pwa-icon-512.png
├── src/
│   ├── components/
│   │   ├── Header.tsx             # Navbar, PWA Status, Theme Toggle
│   │   ├── RotationCanvas.tsx     # Renderer Bidang Kartesius HTML5
│   │   ├── ControlPanel.tsx       # Sliders, Angle Presets, Coordinates
│   │   ├── TheorySection.tsx      # KaTeX Matrices & Cheat Sheet Table
│   │   ├── StepSolver.tsx         # Uraian Aljabar 4 Langkah
│   │   ├── QuizEngine.tsx         # Kuis Interaktif & Visual Link
│   │   └── MathBlock.tsx          # Wrapper Render KaTeX Memoized
│   ├── lib/
│   │   ├── mathHelpers.ts         # Logic Epsilon & Math Functions
│   │   └── quizGenerator.ts       # Generator Soal Acak
│   ├── types/
│   │   └── rotation.ts            # TypeScript Interfaces
│   ├── App.tsx                    # Main Layout & Shared State
│   ├── main.tsx                   # Entry Point React
│   └── index.css                  # Tailwind Directives & Custom Range Styling
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts                 # Config Vite + PWA Plugin
```