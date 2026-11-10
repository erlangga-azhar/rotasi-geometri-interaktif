<div align="center">

# 🔄 RotasiLab

### Web aplikasi edukasi interaktif & kalkulator step-by-step materi **rotasi (perputaran)** transformasi geometri

[![Vite](https://img.shields.io/badge/Vite-5.4-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/React-18.3-61DAFB?logo=react&logoColor=0b1220)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![PWA](https://img.shields.io/badge/PWA-Offline--Ready-5A0FC8?logo=pwa&logoColor=white)](https://web.dev/progressive-web-apps/)
[![License](https://img.shields.io/badge/License-MIT-22C55E)](#lisensi)

**Visualizer Kartesius · Matriks dinamis · Kalkulator 4 langkah · Kuis acak · 100% offline**

</div>

---

RotasiLab mengubah materi rotasi yang abstrak menjadi sesuatu yang bisa **disentuh**: tarik titik P atau pusat rotasi langsung di kanvas, lihat matriksnya berubah seketika, lalu buktikan hasilnya lewat perhitungan langkah demi langkah yang bisa disalin atau diekspor menjadi gambar.

Dirancang untuk siswa SMA/SMK, guru, dan siapa pun yang ingin memahami *mengapa* `(x, y) → (−y, x)` benar — bukan sekadar menghafalnya.

---

## Daftar Isi

- [Fitur Utama](#fitur-utama)
- [Tech Stack](#tech-stack)
- [Memulai](#memulai)
- [Struktur Proyek](#struktur-proyek)
- [Matematika dan Engine Logic](#matematika-dan-engine-logic)
- [PWA dan Mode Offline](#pwa-dan-mode-offline)
- [Lisensi](#lisensi)

---

## Fitur Utama

### 🖐️ 1. Kanvas Drag-and-Drop Interaktif

Kanvas HTML5 2D yang benar-benar bisa dimanipulasi, bukan gambar statis.

| Kemampuan | Detail implementasi |
| --- | --- |
| **High-DPI 2×** | `devicePixelRatio` dibatasi maksimum 2, lalu `ctx.setTransform(dpr, …)` menjaga garis tetap tajam di layar Retina. |
| **Mouse & touch** | `mousedown/mousemove/mouseup/mouseleave` + `touchstart/touchmove/touchend/touchcancel` dengan `{ passive: false }`. `touch-action: pan-y pinch-zoom` menjaga scroll vertikal/pinch dan memblokir swipe back/forward browser; `preventDefault()` hanya dipanggil saat jari mendarat di hit-box kontrol. `activeTouchId` dilacak lewat `changedTouches` agar jari kedua tidak menggeser P. |
| **Hit-area 44px** | Kursor/jari dikonversi ke koordinat Kartesius lewat `pxToWorld()`, lalu jarak ke pegangan titik dan pusat diukur. Radius 22px untuk mouse dan 28px untuk sentuhan, sehingga target selalu ≥ 44×44px. |
| **Presisi 0,5** | `snapToHalf()` membulatkan koordinat ke kelipatan `0.5`, dan `trim()` menormalkan `-0` menjadi `0`. |
| **Anti-jitter** | `frozenLayoutRef` membekukan skala & origin selama drag, sehingga kamera tidak "mengejar" kursor; bidang di-fit ulang setelah pointer dilepas. |
| **Umpan balik visual** | Kursor `cursor-grab` saat hover dan `cursor-grabbing` saat menyeret, plus halo/glow berdenyut yang digambar langsung di kanvas pada pegangan aktif. |
| **Tiga bangun** | Titik **P**, segitiga **ABC**, dan persegi **ABCD** — semuanya berputar kaku mengikuti pusat rotasi. |

> [!TIP]
> Untuk bangun non-titik, pegangan mengikuti vertex berlabel (A), dan offset vertex disimpan saat drag dimulai agar bangun tidak melompat ketika disentuh.

### 🧮 2. Math Engine dengan Epsilon Guard

JavaScript mengembalikan `Math.cos(90°)` sebagai `6.123233995736766e-17`, bukan `0`. Angka hantu ini merusak tampilan matriks dan membuat hasil kalkulator terlihat "kotor".

RotasiLab menyaringnya dengan toleransi `1e-10`:

```ts
export const EPSILON = 1e-10;

export function safeCos(deg: number): number {
  const value = Math.cos(deg * DEG);
  if (Math.abs(value) < EPSILON) return 0;   // cos 90°  → 0
  if (Math.abs(value - 1) < EPSILON) return 1;
  if (Math.abs(value + 1) < EPSILON) return -1;
  return trim(value);                        // -0 → 0
}
```

Hasilnya: `cos 90° = 0`, `sin 180° = 0`, `cos 180° = −1` — matriks selalu bersih, dan hasil rotasi berupa bilangan bulat untuk sudut kelipatan 90°.

### 📐 3. Matriks KaTeX Dinamis & Cheat Sheet

- Rumus umum dan **substitusi numerik real-time** dirender dengan KaTeX saat slider sudut atau pusat berubah.
- Dua kartu berdampingan: kasus dasar pusat `O(0, 0)` dan kasus umum pusat `(a, b)`.
- **Cheat sheet sudut istimewa** (90°, 180°, 270°, −90°, −180°, −270°) dengan baris aktif yang otomatis ter-highlight mengikuti sudut saat ini.

### 🪜 4. Step-by-Step Solver + Markdown Exporter

Kalkulator memecah komputasi menjadi empat kartu yang tidak melompati proses:

1. **Substitusi** nilai ke matriks rotasi (termasuk pergeseran relatif terhadap pusat).
2. **Evaluasi** `cos θ` dan `sin θ`.
3. **Perkalian matriks** 2 × 2 dan penambahan kembali offset `(a, b)`.
4. **Koordinat akhir** `P′`, disertai pembuktian bahwa jarak ke pusat tidak berubah.

Tombol **Salin Langkah** mengekspor seluruh ringkasan sebagai Markdown (siap tempel ke WhatsApp, Notion, atau laporan), dengan badge status **“Tersalin!”** selama 2 detik. Timer dibersihkan saat unmount agar tidak ada state update setelah komponen hilang.

### 🖼️ 5. Canvas PNG Exporter

Tombol **Unduh Gambar** tidak sekadar menyalin kanvas yang terlihat:

- Merender ulang seluruh bidang di **offscreen canvas 2×** (High-DPI).
- Mengisi latar solid (`#ffffff` / `#0f172a`) agar gambar tetap terbaca di mana pun.
- Menambahkan watermark resmi **“RotasiLab · Transformasi Geometri”**.
- Menyimpan sebagai `rotasi-geometri-[x]_[y].png` (desimal ditulis dengan koma, mengikuti notasi Indonesia).
- Diekspor pada sudut final, bukan sudut animasi di tengah jalan.

### 🕰️ 6. Konteks Dunia Nyata Beranimasi

Empat visualisasi kanvas yang bergerak terus-menerus seperti jarum jam:

| Mode | Pusat | Animasi |
| --- | --- | --- |
| **Jam & Kompas** | `O(0, 0)` | Jarum menit menyapu 360°, ujung jarum menampilkan koordinat `P′` real-time. |
| **Kincir Ria** | `P₀(1.15, −0.55)` | 8 kabin berputar mengelilingi poros; kabin terpilih menyisakan busur jejak. |
| **Turbin Angin** | `P₀(−1.35, 0.95)` | 3 bilah berputar dengan sudut 120°; ujung bilah utama diberi label koordinat. |
| **Simetri Motif** | `O(0, 0)` | Motif batik disapu kontinu; setiap langkah 45°/60°/90° meninggalkan bayangan dan busur simetri putar. |

Semua layer memakai `useSweepRotation()`: kecepatan diinterpolasi dengan alpha decay berbasis `dt`,
dan loop rAF dimatikan total (0 FPS) ketika animasi dijeda. Kanvas merender ulang dengan
`devicePixelRatio` (maks. 2) melalui `ResizeObserver`.

```tsx
import RealWorldCanvas from './components/RealWorldCanvas';

<RealWorldCanvas mode="clock" theme={theme} />
```

Ingin lapisan jam yang sama di kanvas utama? Cukup aktifkan prop `clockOverlay`:

```tsx
<RotationCanvas
  state={state}
  theme={theme}
  onChange={updateState}
  clockOverlay // jarum menyapu kontinu + label P′
/>
```

### 🎯 7. Quiz Engine Interaktif

- **5 soal** yang diacak dari lima tipe: sudut istimewa di titik asal, setengah putaran, pusat kustom, rotasi bangun datar, dan rotasi searah jarum jam.
- Nilai soal di-generate acak, pengecoh dibuat dari kesalahan yang paling umum (lupa menambahkan pusat, tertukar sumbu, salah arah).
- Umpan balik instan: jawaban benar disorot hijau, jawaban salah merah, plus penjelasan dan rumus KaTeX.
- Jawaban salah menampilkan tombol **“Tampilkan di Canvas”** yang mengunci state soal tersebut ke visualizer dan melakukan *smooth scroll* ke kanvas — jembatan langsung dari kesalahan menuju pembuktian visual.
- Skor akhir dengan indikator per soal dan tombol **“Ulangi dengan soal baru”**.

### 📴 8. 100% Offline PWA

Seluruh aplikasi — JS, CSS, ikon, dan **font KaTeX yang di-bundle lokal** — di-precache oleh Workbox. Tidak ada permintaan ke Google Fonts atau CDN mana pun; tipografi memakai system font stack. Setelah kunjungan pertama, RotasiLab dapat dibuka tanpa koneksi dan tetap menampilkan seluruh rumus, kanvas, serta kuis.

---

## Tech Stack

| Lapisan | Teknologi | Peran dalam proyek |
| --- | --- | --- |
| **Build tool** | Vite 5.4 | Dev server instan, HMR, build produksi `es2020`. |
| **UI runtime** | React 18.3 | Komponen fungsional, state terpusat di `App.tsx`. |
| **Bahasa** | TypeScript 5.6 (strict) | `strict`, `noUnusedLocals`, `noUnusedParameters`; build gagal jika ada error tipe. |
| **Styling** | Tailwind CSS 3.4 | `darkMode: 'class'`, token warna indigo/slate, komponen `card`, `chip`, `field-label`. |
| **Ikon** | Lucide React | Ikon konsisten dan ringan (tree-shaken). |
| **Matematika** | HTML5 Canvas 2D API | Render bidang, bangun, busur rotasi, halo, dan ekspor PNG. |
| **Rumus** | KaTeX 0.16 | Matriks dan notasi Matematika; font woff2 ikut di-precache. |
| **PWA** | vite-plugin-pwa 0.21 + Workbox | Manifest, service worker, precache, update otomatis. |

---

## Memulai

### Prasyarat

- **Node.js** ≥ 18 (disarankan 20/22)
- **npm** ≥ 9

### Instalasi

```bash
# 1. Clone repositori
git clone https://github.com/<username>/RotasiLab.git
cd RotasiLab

# 2. Pasang dependensi
npm install

# 3. Jalankan dev server
npm run dev
```

Buka `http://localhost:5173`.

> [!NOTE]
> Jika npm melaporkan `ERESOLVE` seputar peer dependency Vite, gunakan `npm install --legacy-peer-deps`. Konfigurasi proyek ini sudah terbukti berjalan dengan kombinasi versi yang terpasang.

### Skrip

| Perintah | Fungsi |
| --- | --- |
| `npm run dev` | Dev server dengan HMR. |
| `npm run build` | Type-check (`tsc --noEmit`) **lalu** build produksi ke `dist/`. |
| `npm run preview` | Menyajikan hasil build (diperlukan untuk menguji service worker). |
| `npm run typecheck` | Pemeriksaan tipe saja, tanpa output. |

> [!IMPORTANT]
> Service worker hanya aktif pada hasil build. Untuk menguji mode offline, jalankan `npm run build` lalu `npm run preview` — bukan `npm run dev`.

---

## Struktur Proyek

```text
RotasiLab/
├── public/
│   ├── favicon.svg
│   └── icons/
│       ├── apple-touch-icon.png      # 180×180
│       ├── icon-192.png              # any
│       ├── icon-512.png              # any
│       └── icon-512-maskable.png     # maskable
│
├── src/
│   ├── components/
│   │   ├── Header.tsx                # Navigasi + toggle tema + badge status offline
│   │   ├── HeroSection.tsx           # Kanvas + panel kontrol (pemilik interaksi utama)
│   │   ├── RotationCanvas.tsx        # Render 2D, drag mouse/touch, ekspor PNG
│   │   ├── ControlPanel.tsx          # Input x, y, a, b, slider θ, pilihan bangun
│   │   ├── NumberField.tsx           # Input angka dengan validasi & step
│   │   ├── TheorySection.tsx         # Matriks KaTeX dinamis + cheat sheet
│   │   ├── StepSolver.tsx            # Solver 4 langkah + salin Markdown
│   │   ├── QuizEngine.tsx            # Kuis 5 soal + umpan balik + skor
│   │   ├── SectionHeading.tsx        # Heading dengan slot `action`
│   │   ├── Tex.tsx                   # Pembungkus KaTeX (inline/block)
│   │   └── Footer.tsx
│   ├── types/
│   │   └── rotation.ts               # Point2D, CenterPoint, RotationState, QuizQuestion
│   ├── utils/
│   │   ├── math.ts                   # safeCos/safeSin, trim, rotatePoint, shapeVertices
│   │   └── quiz.ts                   # Generator 5 tipe soal + pengecoh
│   ├── App.tsx                       # State rotasi & tema, komposisi section
│   ├── main.tsx                      # Bootstrap React
│   ├── index.css                     # Tailwind layers, KaTeX, slider, reduced-motion
│   └── vite-env.d.ts
│
├── index.html                        # Meta, theme-color, skrip anti-FOUC tema
├── vite.config.ts                    # Plugin React, konfigurasi VitePWA/Workbox
├── tailwind.config.cjs               # darkMode class, font stack, animasi
├── postcss.config.cjs
├── tsconfig.json                     # strict + noUnusedLocals
├── standalone.html                   # Prototipe single-file (arsip, bukan entry point)
└── package.json
```

### Alur data

```text
App.tsx  ──state──▶  HeroSection  ──▶  RotationCanvas
   │                     │                  │
   │                     └──▶ ControlPanel  └─ onChange(patch) ─┐
   │                                                            │
   ├──state──▶ TheorySection (matriks real-time)                │
   ├──state──▶ QuizEngine ──onVisualize(state)──▶ scroll ke kanvas
   │                                                            │
   └◀──────────────────── updateState(patch) ◀──────────────────┘
```

`RotationState` adalah satu-satunya sumber kebenaran untuk visualizer dan teori, sehingga menggeser titik di kanvas langsung memperbarui matriks dan hasil kalkulasi visual.

---

## Matematika dan Engine Logic

### Rumus rotasi

Untuk titik `P(x, y)` yang dirotasikan sebesar `θ` terhadap pusat `(a, b)`:

$$
\begin{pmatrix} x' \\ y' \end{pmatrix}
=
\begin{pmatrix} \cos\theta & -\sin\theta \\ \sin\theta & \cos\theta \end{pmatrix}
\begin{pmatrix} x-a \\ y-b \end{pmatrix}
+
\begin{pmatrix} a \\ b \end{pmatrix}
$$

Sudut positif berarti **berlawanan arah jarum jam**; arah jarum jam dicapai dengan `effectiveAngle = angleDegree × direction`, di mana `direction` bernilai `1` atau `-1`.

### Tiga pilar engine

**1. Epsilon guard & normalisasi angka**

```ts
safeCos(90)   // 0   (bukan 6.12e-17)
safeSin(180)  // 0
trim(-0)      // 0
```

**2. Animasi dengan alpha decay berbasis `dt`**

Sudut tidak berpindah secara instan. Setiap frame, selisih sudut didekati secara eksponensial
dengan porsi yang bergantung pada jarak waktu antar-frame, bukan jumlah frame:

```ts
const alpha = 1 - Math.pow(1 - 0.18, deltaMs / (1000 / 60));
animatedAngle += (targetAngle - animatedAngle) * alpha;
```

Hasilnya sama mulus di layar 60Hz maupun 120Hz/VRR. Kanvas memakai `useOnDemandFrame()`:
loop rAF hanya hidup selama tween, drag, atau animasi konteks berjalan, lalu berhenti total
(0 FPS) ketika idle/dijeda.

**3. Layout & konversi koordinat**

`computeLayout()` menghitung `scale` dan origin dari bounding box seluruh elemen (titik, bayangan, pusat, lingkaran jari-jari). `pxToWorld()` adalah invers persisnya, sehingga hit-test 18px selalu selaras dengan apa yang terlihat — bahkan setelah resize (`ResizeObserver`) atau perpindahan tema.

### Pipeline ekspor PNG

```text
state + targetAngle
      │
      ├─▶ computeLayout(width, height)
      ├─▶ offscreen canvas (2×)
      ├─▶ renderScene(ctx, …, { background, watermark })
      └─▶ toDataURL('image/png') ──▶ <a download="rotasi-geometri-x_y.png">
```

Karena `renderScene()` menerima layout eksplisit dan bukan membaca DOM, gambar ekspor identik dengan tampilan — hanya tanpa elemen interaksi dan dengan latar solid.

---

## PWA dan Mode Offline

RotasiLab dirancang agar tetap utuh ketika internet mati.

| Aspek | Konfigurasi |
| --- | --- |
| **Registrasi** | `registerType: 'autoUpdate'` — versi baru langsung aktif tanpa prompt. |
| **Precache** | `globPatterns: ['**/*.{js,css,html,svg,png,woff,woff2,ttf}']` (≈74 entri, ±1,6 MB pada build produksi). |
| **Strategi** | Precaching Workbox untuk seluruh aset; `navigateFallback: 'index.html'` menjaga deep link. |
| **Update** | `clientsClaim` + `skipWaiting` + `cleanupOutdatedCaches`. |
| **Manifest** | `display: standalone`, `lang: id`, `theme_color: #4f46e5`, ikon 192/512 + maskable. |
| **Font** | KaTeX woff2 dibundel; UI memakai `system-ui` — **nol permintaan jaringan eksternal**. |
| **Batas ukuran** | `maximumFileSizeToCacheInBytes: 4 MB` memberi ruang untuk bundel KaTeX. |

**Cara menguji:**

1. `npm run build && npm run preview`
2. Buka aplikasi, tunggu hingga badge header berubah menjadi **“Siap offline”**.
3. Hentikan server, lalu muat ulang halaman: visualizer, 20+ rumus KaTeX, kuis, dan kanvas tetap tampil.

> [!NOTE]
> Badge status di header membaca `navigator.onLine` dan status service worker, sehingga pengguna tahu pasti apakah aplikasi siap dipakai tanpa jaringan.

---

## Lisensi

Dirilis di bawah **MIT License** — bebas digunakan, dimodifikasi, dan didistribusikan untuk keperluan belajar maupun mengajar, dengan tetap menyertakan atribusi.

```text
MIT License · Copyright (c) 2026 RotasiLab
```

---

<div align="center">

**Dibuat untuk membuat rotasi terasa nyata — bukan sekadar rumus di buku.**

⭐ Beri bintang jika proyek ini membantu proses belajarmu.

</div>
