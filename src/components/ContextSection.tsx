import { useState } from 'react';
import { Clock, FerrisWheel, Palette, Wind } from 'lucide-react';
import type { ThemeMode } from '../types/rotation';
import type { RealWorldMode } from '../contexts/types';
import { REAL_WORLD_MODES } from '../contexts/modes';
import SectionHeading from './SectionHeading';
import Tex from './Tex';
import RealWorldCanvas from './RealWorldCanvas';

interface ContextSectionProps {
  theme: ThemeMode;
}

const MODE_ICONS = {
  clock: Clock,
  wheel: FerrisWheel,
  turbine: Wind,
  motif: Palette,
} as const;

const TAB_BASE =
  'inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-[11px] font-bold leading-tight transition';

function ContextSection({ theme }: ContextSectionProps) {
  const [mode, setMode] = useState<RealWorldMode>('clock');
  const info = REAL_WORLD_MODES.find((item) => item.id === mode) ?? REAL_WORLD_MODES[0];

  return (
    <section id="konteks" className="scroll-mt-28 border-t border-slate-200 py-16 dark:border-slate-800/80">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          icon={Palette}
          eyebrow="Konteks Nyata"
          title="Rotasi yang bergerak di sekitar kita"
          description="Jarum jam, kincir ria, turbin angin, dan motif batik semuanya berputar terus-menerus. Amati bagaimana sudut θ berubah dan bagaimana koordinat titik ujungnya mengikuti lintasan lingkaran."
        />

        <div className="mb-5 grid grid-cols-2 gap-1.5 rounded-xl border border-slate-200 bg-white p-1.5 shadow-sm sm:grid-cols-4 dark:border-slate-800 dark:bg-slate-950 dark:shadow-none">
          {REAL_WORLD_MODES.map((item) => {
            const Icon = MODE_ICONS[item.id];
            const active = item.id === mode;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setMode(item.id)}
                aria-pressed={active}
                className={
                  TAB_BASE +
                  ' ' +
                  (active
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25 dark:shadow-indigo-950/50'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-200')
                }
              >
                <Icon size={14} className="shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr] lg:items-start">
          <RealWorldCanvas mode={mode} theme={theme} />

          <aside className="flex flex-col gap-3.5 rounded-2xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/50 transition-colors dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/20">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                Yang sedang berputar
              </p>
              <h3 className="mt-1 text-sm font-bold text-slate-900 dark:text-slate-100">{info.label}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                {info.description}
              </p>
            </div>

            <div className="overflow-x-auto scrollbar-thin rounded-xl border border-indigo-200 bg-indigo-50/70 px-3 py-2.5 dark:border-indigo-500/30 dark:bg-indigo-950/30">
              <Tex tex={info.formulaTex} />
            </div>

            <ul className="space-y-2">
              {info.observations.map((text) => (
                <li
                  key={text}
                  className="flex gap-2 text-[11px] leading-relaxed text-slate-600 dark:text-slate-400"
                >
                  <span className="mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500 dark:bg-indigo-400" />
                  {text}
                </li>
              ))}
            </ul>

            <p className="mt-auto rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-[10px] leading-relaxed text-slate-600 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-400">
              Gerak memakai interpolasi berbasis <span className="font-mono">dt</span>, jadi tetap mulus di
              layar 60Hz maupun 120Hz/VRR. Saat animasi dijeda, loop rAF berhenti total (0 FPS) untuk
              menghemat baterai.
            </p>
          </aside>
        </div>

        <p className="mx-auto mt-6 max-w-2xl text-center text-xs leading-relaxed text-slate-600 dark:text-slate-400">
          Di desain grafis dan animasi digital, prinsip yang sama muncul sebagai{' '}
          <span className="font-mono font-semibold text-slate-800 dark:text-slate-300">transform-origin</span> dan{' '}
          <span className="font-mono font-semibold text-slate-800 dark:text-slate-300">rotate()</span>, atau sumbu
          putar pada game engine.
        </p>
      </div>
    </section>
  );
}

export default ContextSection;
