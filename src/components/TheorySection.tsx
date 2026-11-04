import { BookOpen, Lightbulb } from 'lucide-react';
import type { RotationState } from '../types/rotation';
import { angleLabel, effectiveAngle, formatNumber, rotatePoint, safeCos, safeSin, texNumber, trim } from '../utils/math';
import Tex from './Tex';
import SectionHeading from './SectionHeading';

interface TheorySectionProps {
  state: RotationState;
}

interface CheatRow {
  deg: number;
  cos: string;
  sin: string;
  matrix: string;
  map: string;
}

const CHEATS: CheatRow[] = [
  { deg: 90, cos: '0', sin: '1', matrix: String.raw`\begin{pmatrix}0 & -1\\ 1 & 0\end{pmatrix}`, map: String.raw`(-y,\; x)` },
  { deg: 180, cos: '-1', sin: '0', matrix: String.raw`\begin{pmatrix}-1 & 0\\ 0 & -1\end{pmatrix}`, map: String.raw`(-x,\; -y)` },
  { deg: 270, cos: '0', sin: '-1', matrix: String.raw`\begin{pmatrix}0 & 1\\ -1 & 0\end{pmatrix}`, map: String.raw`(y,\; -x)` },
  { deg: -90, cos: '0', sin: '-1', matrix: String.raw`\begin{pmatrix}0 & 1\\ -1 & 0\end{pmatrix}`, map: String.raw`(y,\; -x)` },
  { deg: -180, cos: '-1', sin: '0', matrix: String.raw`\begin{pmatrix}-1 & 0\\ 0 & -1\end{pmatrix}`, map: String.raw`(-x,\; -y)` },
  { deg: -270, cos: '0', sin: '1', matrix: String.raw`\begin{pmatrix}0 & -1\\ 1 & 0\end{pmatrix}`, map: String.raw`(-y,\; x)` },
];

const GENERIC_ORIGIN = String.raw`\begin{pmatrix} x' \\ y' \end{pmatrix} = \begin{pmatrix} \cos\theta & -\sin\theta \\ \sin\theta & \cos\theta \end{pmatrix} \begin{pmatrix} x \\ y \end{pmatrix}`;

const GENERIC_CENTER = String.raw`\begin{pmatrix} x' \\ y' \end{pmatrix} = \begin{pmatrix} \cos\theta & -\sin\theta \\ \sin\theta & \cos\theta \end{pmatrix} \begin{pmatrix} x-a \\ y-b \end{pmatrix} + \begin{pmatrix} a \\ b \end{pmatrix}`;

function TheorySection({ state }: TheorySectionProps) {
  const effective = effectiveAngle(state);
  const cos = safeCos(effective);
  const sin = safeSin(effective);
  const result = rotatePoint(state.point, state.center, effective);

  const innerX = trim(state.point.x - state.center.a);
  const innerY = trim(state.point.y - state.center.b);

  const numericOrigin = String.raw`\begin{pmatrix} x' \\ y' \end{pmatrix} = \begin{pmatrix} ${cos} & ${trim(-sin)} \\ ${sin} & ${cos} \end{pmatrix} \begin{pmatrix} ${texNumber(state.point.x)} \\ ${texNumber(state.point.y)} \end{pmatrix} = \begin{pmatrix} ${texNumber(result.x)} \\ ${texNumber(result.y)} \end{pmatrix}`;

  const numericCenter = String.raw`\begin{pmatrix} x' \\ y' \end{pmatrix} = \begin{pmatrix} ${cos} & ${trim(-sin)} \\ ${sin} & ${cos} \end{pmatrix} \begin{pmatrix} ${texNumber(innerX)} \\ ${texNumber(innerY)} \end{pmatrix} + \begin{pmatrix} ${texNumber(state.center.a)} \\ ${texNumber(state.center.b)} \end{pmatrix} = \begin{pmatrix} ${texNumber(result.x)} \\ ${texNumber(result.y)} \end{pmatrix}`;

  return (
    <section id="teori" className="scroll-mt-28 border-t border-slate-200/70 py-16 dark:border-slate-800/80">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          icon={BookOpen}
          eyebrow="Teori & Rumus"
          title="Matriks rotasi yang ikut berubah"
          description="Angka pada matriks di bawah mengikuti slider di visualizer. Ubah sudut atau pusat rotasi, lalu lihat bagaimana matriksnya berevolusi."
        />

        <div className="grid gap-5 lg:grid-cols-2">
          <div className="card p-5 sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Pusat di O(0, 0)</h3>
              <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:bg-blue-500/10 dark:text-blue-300">
                Kasus dasar
              </span>
            </div>
            <div className="rounded-2xl bg-slate-50 px-3 py-3 dark:bg-slate-950/60">
              <Tex tex={GENERIC_ORIGIN} block className="text-slate-800 dark:text-slate-100" />
            </div>
            <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Substitusi θ = {angleLabel(effective)} dan P({formatNumber(state.point.x)},{' '}
              {formatNumber(state.point.y)})
            </p>
            <div className="mt-2 rounded-2xl border border-indigo-100 bg-indigo-50/60 px-3 py-3 dark:border-indigo-500/20 dark:bg-indigo-500/5">
              <Tex tex={numericOrigin} block className="text-indigo-900 dark:text-indigo-100" />
            </div>
            <p className="mt-3 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              Nilai cos θ = <span className="font-mono font-semibold">{cos}</span> dan sin θ ={' '}
              <span className="font-mono font-semibold">{sin}</span>. Karena itu matriksnya menjadi bilangan bulat
              untuk sudut kelipatan 90°.
            </p>
          </div>

          <div className="card p-5 sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                Pusat di (a, b) = ({formatNumber(state.center.a)}, {formatNumber(state.center.b)})
              </h3>
              <span className="rounded-full bg-violet-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-violet-600 dark:bg-violet-500/10 dark:text-violet-300">
                Umum
              </span>
            </div>
            <div className="rounded-2xl bg-slate-50 px-3 py-3 dark:bg-slate-950/60">
              <Tex tex={GENERIC_CENTER} block className="text-slate-800 dark:text-slate-100" />
            </div>
            <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Substitusi nilai saat ini
            </p>
            <div className="mt-2 rounded-2xl border border-violet-100 bg-violet-50/60 px-3 py-3 dark:border-violet-500/20 dark:bg-violet-500/5">
              <Tex tex={numericCenter} block className="text-violet-900 dark:text-violet-100" />
            </div>
            <p className="mt-3 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              {state.center.a === 0 && state.center.b === 0
                ? 'Pusat saat ini (0, 0), sehingga rumus umum ini tepat sama dengan kasus pertama.'
                : 'Geser titik pusat untuk melihat bahwa bentuk matriksnya tetap, hanya offset (a, b) yang berubah.'}
            </p>
          </div>
        </div>

        <div className="card mt-8 overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 px-5 py-4 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300">
                <Lightbulb size={15} />
              </span>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Cheat Sheet Sudut Istimewa</h3>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Sudut positif = berlawanan arah jarum jam
            </p>
          </div>

          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200/80 bg-slate-50/70 text-[11px] uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-400">
                  <th className="px-5 py-3 font-bold">Sudut θ</th>
                  <th className="px-5 py-3 font-bold">cos θ</th>
                  <th className="px-5 py-3 font-bold">sin θ</th>
                  <th className="px-5 py-3 font-bold">Matriks rotasi</th>
                  <th className="px-5 py-3 font-bold">(x, y) → (x′, y′)</th>
                </tr>
              </thead>
              <tbody>
                {CHEATS.map((row) => (
                  <tr
                    key={row.deg}
                    className={
                      'border-b border-slate-100 transition last:border-0 dark:border-slate-800/70 ' +
                      (row.deg === effective
                        ? 'bg-indigo-50/70 dark:bg-indigo-500/10'
                        : 'hover:bg-slate-50/70 dark:hover:bg-slate-950/30')
                    }
                  >
                    <td className="px-5 py-3 font-mono text-xs font-semibold text-slate-700 dark:text-slate-200">
                      {row.deg > 0 ? '+' : ''}
                      {row.deg}°
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-slate-600 dark:text-slate-300">{row.cos}</td>
                    <td className="px-5 py-3 font-mono text-xs text-slate-600 dark:text-slate-300">{row.sin}</td>
                    <td className="px-5 py-3">
                      <Tex tex={row.matrix} />
                    </td>
                    <td className="px-5 py-3">
                      <Tex tex={row.map} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}

export default TheorySection;
