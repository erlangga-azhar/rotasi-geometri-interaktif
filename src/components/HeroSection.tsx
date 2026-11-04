import { Sparkles } from 'lucide-react';
import type { RotationState, ThemeMode } from '../types/rotation';
import { angleLabel, formatNumber, rotatePoint } from '../utils/math';
import ControlPanel from './ControlPanel';
import RotationCanvas from './RotationCanvas';

interface HeroSectionProps {
  state: RotationState;
  theme: ThemeMode;
  onChange: (patch: Partial<RotationState>) => void;
}

function HeroSection({ state, theme, onChange }: HeroSectionProps) {
  const effective = state.angleDegree * state.direction;
  const result = rotatePoint(state.point, state.center, effective);

  const stats = [
    {
      label: 'Titik awal',
      value: `(${formatNumber(state.point.x)}, ${formatNumber(state.point.y)})`,
      tone: 'text-blue-600 dark:text-blue-300',
    },
    {
      label: 'Pusat',
      value: `(${formatNumber(state.center.a)}, ${formatNumber(state.center.b)})`,
      tone: 'text-amber-600 dark:text-amber-300',
    },
    {
      label: 'Sudut efektif',
      value: angleLabel(effective),
      tone: 'text-indigo-600 dark:text-indigo-300',
    },
    {
      label: 'Bayangan',
      value: `(${formatNumber(result.x)}, ${formatNumber(result.y)})`,
      tone: 'text-rose-600 dark:text-rose-300',
    },
  ];

  return (
    <section id="visualizer" className="relative scroll-mt-24 overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-60 [mask-image:radial-gradient(ellipse_at_top,black,transparent_75%)]" />
      <div className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-indigo-300/25 blur-3xl dark:bg-indigo-600/15" />
      <div className="pointer-events-none absolute -right-20 top-32 h-72 w-72 rounded-full bg-violet-300/25 blur-3xl dark:bg-violet-600/15" />

      <div className="relative mx-auto max-w-7xl px-4 pb-14 pt-10 sm:px-6 sm:pt-14 lg:px-8">
        <div className="mx-auto mb-8 max-w-3xl text-center">
          <span className="chip">
            <Sparkles size={13} className="text-indigo-500" />
            Matematika SMA/SMK · Transformasi Geometri
          </span>
          <h1 className="mt-4 text-3xl font-extrabold leading-[1.15] tracking-tight text-slate-900 sm:text-4xl lg:text-5xl dark:text-white">
            Rotasi jadi{' '}
            <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-500 bg-clip-text text-transparent">
              terlihat nyata
            </span>
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-slate-600 sm:text-base dark:text-slate-400">
            Geser sudut, pindahkan pusat rotasi, dan pilih bangun datar. Setiap perubahan langsung memperlihatkan
            bayangan, busur sudut, dan matriksnya secara real-time.
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1.45fr_1fr] lg:items-start">
          <div className="space-y-4">
            <RotationCanvas state={state} theme={theme} onChange={onChange} />

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {stats.map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
                >
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    {item.label}
                  </p>
                  <p className={`mt-0.5 font-mono text-sm font-bold ${item.tone}`}>{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          <ControlPanel state={state} onChange={onChange} />
        </div>
      </div>
    </section>
  );
}

export default HeroSection;
