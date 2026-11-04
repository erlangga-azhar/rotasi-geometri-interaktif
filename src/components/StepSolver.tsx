import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Calculator, Check, Copy } from 'lucide-react';
import NumberField from './NumberField';
import SectionHeading from './SectionHeading';
import Tex from './Tex';
import { angleLabel, formatNumber, safeCos, safeSin, texNumber, trim } from '../utils/math';

interface SolverForm {
  x: number;
  y: number;
  a: number;
  b: number;
  angle: number;
}

interface StepCardProps {
  step: number;
  title: string;
  description: string;
  children: ReactNode;
}

function StepCard({ step, title, description, children }: StepCardProps) {
  return (
    <div className="card p-5">
      <div className="mb-3 flex items-start gap-3">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-indigo-600 font-mono text-sm font-bold text-white shadow-md shadow-indigo-600/30">
          {step}
        </span>
        <div>
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">{title}</h3>
          <p className="mt-0.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{description}</p>
        </div>
      </div>
      <div className="rounded-2xl bg-slate-50 px-3 py-3 dark:bg-slate-950/60">{children}</div>
    </div>
  );
}

type CopyStatus = 'idle' | 'copied' | 'error';

function StepSolver() {
  const [form, setForm] = useState<SolverForm>({ x: 3, y: 2, a: 0, b: 0, angle: 90 });
  const [copyStatus, setCopyStatus] = useState<CopyStatus>('idle');
  const copyTimer = useRef<number | null>(null);

  const update = (patch: Partial<SolverForm>) => setForm((previous) => ({ ...previous, ...patch }));

  useEffect(
    () => () => {
      if (copyTimer.current !== null) window.clearTimeout(copyTimer.current);
    },
    []
  );

  const { x, y, a, b, angle } = form;
  const cos = safeCos(angle);
  const sin = safeSin(angle);
  const dx = trim(x - a);
  const dy = trim(y - b);
  const innerX = trim(dx * cos - dy * sin);
  const innerY = trim(dx * sin + dy * cos);
  const finalX = trim(a + innerX);
  const finalY = trim(b + innerY);
  const radiusBefore = trim(Math.hypot(dx, dy), 3);
  const radiusAfter = trim(Math.hypot(finalX - a, finalY - b), 3);

  const thetaTex = angle < 0 ? String.raw`\left(${angle}^\circ\right)` : String.raw`${angle}^\circ`;

  const step1 = String.raw`\begin{pmatrix} x' \\ y' \end{pmatrix} = \begin{pmatrix} \cos ${thetaTex} & -\sin ${thetaTex} \\ \sin ${thetaTex} & \cos ${thetaTex} \end{pmatrix} \begin{pmatrix} ${formatNumber(x)} - ${texNumber(a)} \\ ${formatNumber(y)} - ${texNumber(b)} \end{pmatrix} + \begin{pmatrix} ${texNumber(a)} \\ ${texNumber(b)} \end{pmatrix}`;

  const step2 = String.raw`\cos ${thetaTex} = ${cos} \qquad \sin ${thetaTex} = ${sin} \qquad \begin{pmatrix} x-a \\ y-b \end{pmatrix} = \begin{pmatrix} ${texNumber(dx)} \\ ${texNumber(dy)} \end{pmatrix}`;

  const step3 = String.raw`\begin{pmatrix} x' \\ y' \end{pmatrix} = \begin{pmatrix} ${cos} & ${trim(-sin)} \\ ${sin} & ${cos} \end{pmatrix} \begin{pmatrix} ${texNumber(dx)} \\ ${texNumber(dy)} \end{pmatrix} + \begin{pmatrix} ${texNumber(a)} \\ ${texNumber(b)} \end{pmatrix} = \begin{pmatrix} ${texNumber(innerX)} \\ ${texNumber(innerY)} \end{pmatrix} + \begin{pmatrix} ${texNumber(a)} \\ ${texNumber(b)} \end{pmatrix}`;

  const step4 = String.raw`P'(${texNumber(finalX)},\; ${texNumber(finalY)})`;

  const directionText = angle === 0 ? '' : angle > 0 ? 'berlawanan arah jarum jam' : 'searah jarum jam';

  const markdown = [
    '## Penyelesaian Rotasi',
    '',
    `**Diketahui:** P(${formatNumber(x)}, ${formatNumber(y)}), pusat (${formatNumber(a)}, ${formatNumber(b)}), θ = ${angleLabel(angle)}${directionText ? ` (${directionText})` : ''}.`,
    '',
    '### Langkah 1 — Substitusi nilai ke matriks rotasi',
    '```',
    "(x')   ( cos θ  -sin θ ) ( x - a )   ( a )",
    "(y') = ( sin θ   cos θ ) ( y - b ) + ( b )",
    '```',
    `Substitusi: x = ${formatNumber(x)}, y = ${formatNumber(y)}, a = ${formatNumber(a)}, b = ${formatNumber(b)}, θ = ${angleLabel(angle)}.`,
    `(x − a, y − b) = (${formatNumber(dx)}, ${formatNumber(dy)}).`,
    '',
    '### Langkah 2 — Evaluasi nilai trigonometri',
    `cos ${angleLabel(angle)} = ${cos}`,
    `sin ${angleLabel(angle)} = ${sin}`,
    '',
    '### Langkah 3 — Perkalian matriks 2 × 2',
    `x′ = cos ${angleLabel(angle)} · (x − a) − sin ${angleLabel(angle)} · (y − b) = ${cos} · (${formatNumber(dx)}) − (${sin}) · (${formatNumber(dy)}) = ${formatNumber(innerX)}`,
    `y′ = sin ${angleLabel(angle)} · (x − a) + cos ${angleLabel(angle)} · (y − b) = ${sin} · (${formatNumber(dx)}) + (${cos}) · (${formatNumber(dy)}) = ${formatNumber(innerY)}`,
    `(x′, y′) = (${formatNumber(innerX)}, ${formatNumber(innerY)}) + (${formatNumber(a)}, ${formatNumber(b)}) = (${formatNumber(finalX)}, ${formatNumber(finalY)})`,
    '',
    '### Langkah 4 — Koordinat akhir bayangan',
    `P′(${formatNumber(finalX)}, ${formatNumber(finalY)})`,
    `Jarak P ke pusat = ${radiusBefore}; jarak P′ ke pusat = ${radiusAfter}.`,
    '',
    '_Dibuat dengan RotasiLab._',
  ].join('\n');

  const handleCopy = async () => {
    try {
      if (!navigator.clipboard) throw new Error('Clipboard API tidak tersedia');
      await navigator.clipboard.writeText(markdown);
      setCopyStatus('copied');
    } catch {
      setCopyStatus('error');
    }

    if (copyTimer.current !== null) window.clearTimeout(copyTimer.current);
    copyTimer.current = window.setTimeout(() => {
      setCopyStatus('idle');
      copyTimer.current = null;
    }, 2000);
  };

  return (
    <section
      id="kalkulator"
      className="scroll-mt-28 border-t border-slate-200/70 bg-white/60 py-16 dark:border-slate-800/80 dark:bg-slate-900/20"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          icon={Calculator}
          eyebrow="Kalkulator Step-by-Step"
          title="Buktikan sendiri, langkah demi langkah"
          description="Masukkan nilai x, y, a, b, dan θ. Kalkulator ini menampilkan seluruh alur komputasi matriks tanpa lompatan."
          action={
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-bold text-slate-600 shadow-sm transition hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-indigo-500/50 dark:hover:text-indigo-300"
              >
                {copyStatus === 'copied' ? <Check size={13} /> : <Copy size={13} />}
                Salin Langkah
              </button>
              <span
                role="status"
                aria-live="polite"
                className={
                  copyStatus === 'copied'
                    ? 'rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-bold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
                    : 'rounded-full bg-rose-100 px-2.5 py-1 text-[11px] font-bold text-rose-700 dark:bg-rose-500/15 dark:text-rose-300'
                }
              >
                {copyStatus === 'copied' ? 'Tersalin!' : copyStatus === 'error' ? 'Gagal menyalin' : ''}
              </span>
            </div>
          }
        />

        <div className="grid gap-5 lg:grid-cols-[340px_1fr]">
          <div className="card h-fit p-5 lg:sticky lg:top-24">
            <div className="mb-4 flex items-center gap-2">
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                <Calculator size={15} />
              </span>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Data Soal</h3>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <NumberField label="x (titik awal)" value={x} onChange={(value) => update({ x: value })} />
              <NumberField label="y (titik awal)" value={y} onChange={(value) => update({ y: value })} />
              <NumberField label="a (pusat)" value={a} onChange={(value) => update({ a: value })} />
              <NumberField label="b (pusat)" value={b} onChange={(value) => update({ b: value })} />
            </div>

            <div className="mt-4">
              <NumberField
                label="θ (derajat)"
                value={angle}
                min={-360}
                max={360}
                onChange={(value) => update({ angle: value })}
              />
              <div className="mt-2 grid grid-cols-4 gap-1.5">
                {[90, 180, 270, -90].map((deg) => (
                  <button
                    key={deg}
                    type="button"
                    onClick={() => update({ angle: deg })}
                    className={
                      'rounded-md border px-1 py-1.5 font-mono text-[11px] font-semibold transition ' +
                      (angle === deg
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-600 dark:border-indigo-500/60 dark:bg-indigo-500/15 dark:text-indigo-300'
                        : 'border-slate-200 text-slate-500 hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700 dark:text-slate-400')
                    }
                  >
                    {deg > 0 ? '+' : ''}
                    {deg}°
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-5 rounded-2xl bg-slate-50 p-3 dark:bg-slate-950/60">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Variabel terhitung
              </p>
              <p className="mt-1.5 font-mono text-xs text-slate-600 dark:text-slate-300">
                (x − a, y − b) = ({formatNumber(dx)}, {formatNumber(dy)})
              </p>
              <p className="mt-1 font-mono text-xs text-slate-600 dark:text-slate-300">
                cos θ = {cos}, sin θ = {sin}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-3xl bg-gradient-to-r from-indigo-600 to-violet-600 p-5 text-white shadow-lg shadow-indigo-600/25">
              <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-100">Hasil akhir</p>
              <div className="mt-1 flex flex-wrap items-baseline gap-2">
                <span className="font-mono text-3xl font-bold">
                  P′({formatNumber(finalX)}, {formatNumber(finalY)})
                </span>
                <span className="text-sm text-indigo-100">
                  dari P({formatNumber(x)}, {formatNumber(y)}) diputar {angleLabel(angle)} terhadap (
                  {formatNumber(a)}, {formatNumber(b)})
                </span>
              </div>
            </div>

            <StepCard
              step={1}
              title="Substitusi nilai ke matriks rotasi"
              description="Titik digeser dulu relatif terhadap pusat, sehingga koordinat menjadi (x − a, y − b)."
            >
              <Tex tex={step1} block />
            </StepCard>

            <StepCard
              step={2}
              title="Evaluasi nilai trigonometri"
              description="Hitung cosinus dan sinus dari sudut θ, lalu sederhanakan komponen titik relatif."
            >
              <Tex tex={step2} block />
            </StepCard>

            <StepCard
              step={3}
              title="Perkalian matriks 2 × 2"
              description="Kalikan baris matriks dengan kolom vektor, kemudian tambahkan kembali offset pusat (a, b)."
            >
              <Tex tex={step3} block />
              <div className="mt-3 grid gap-2 border-t border-slate-200 pt-3 text-xs text-slate-600 sm:grid-cols-2 dark:border-slate-800 dark:text-slate-300">
                <p className="font-mono">
                  x′ = {cos}·({formatNumber(dx)}) + ({trim(-sin)})·({formatNumber(dy)}) + {formatNumber(a)} ={' '}
                  {formatNumber(finalX)}
                </p>
                <p className="font-mono">
                  y′ = {sin}·({formatNumber(dx)}) + {cos}·({formatNumber(dy)}) + {formatNumber(b)} ={' '}
                  {formatNumber(finalY)}
                </p>
              </div>
            </StepCard>

            <StepCard
              step={4}
              title="Koordinat akhir bayangan"
              description="Rotasi tidak mengubah jarak titik terhadap pusat rotasi — inilah bukti hasilnya konsisten."
            >
              <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                <Tex tex={step4} block className="text-indigo-700 dark:text-indigo-200" />
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  <p>
                    Jarak P ke pusat = <span className="font-mono font-semibold">{radiusBefore}</span>
                  </p>
                  <p>
                    Jarak P′ ke pusat = <span className="font-mono font-semibold">{radiusAfter}</span>
                  </p>
                </div>
              </div>
            </StepCard>
          </div>
        </div>
      </div>
    </section>
  );
}

export default StepSolver;
