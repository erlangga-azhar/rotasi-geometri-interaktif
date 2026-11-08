import { useEffect, useState } from 'react';
import { Clock, Palette, Pause, Play } from 'lucide-react';
import SectionHeading from './SectionHeading';
import Tex from './Tex';
import { angleLabel, formatNumber } from '../utils/math';

const CLOCK_TICKS = Array.from({ length: 12 }, (_, index) => index * 30);

const MOTIF_PRESETS = [
  { folds: 4, name: 'Kawung' },
  { folds: 6, name: 'Ceplok' },
  { folds: 8, name: 'Mandala' },
  { folds: 12, name: 'Ukiran' },
];

const TAB_BASE = 'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition';

function formatClock(minutes: number): string {
  const hour = Math.floor(minutes / 60) % 12;
  const minute = minutes % 60;
  return `${hour === 0 ? 12 : hour}:${String(minute).padStart(2, '0')}`;
}

/** Jam analog: jarum bergerak searah jarum jam, sehingga θ matematisnya negatif. */
function ClockStudio() {
  const [minutes, setMinutes] = useState(15);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!playing) return undefined;
    const timer = window.setInterval(() => setMinutes((previous) => (previous + 1) % 720), 80);
    return () => window.clearInterval(timer);
  }, [playing]);

  const minuteAngle = (minutes % 60) * 6;
  const hourAngle = minutes * 0.5;
  const radian = (minuteAngle * Math.PI) / 180;
  const tip = { x: Math.sin(radian), y: Math.cos(radian) };

  return (
    <div className="rounded-2xl border border-amber-200 bg-white p-5 shadow-xl shadow-slate-200/50 transition-colors dark:border-amber-500/20 dark:bg-slate-950 dark:shadow-black/20">
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-amber-200 bg-amber-50 text-amber-600 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400">
          <Clock size={17} />
        </span>
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Jarum jam = rotasi negatif</h3>
          <p className="mt-0.5 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
            Gerak searah jarum jam adalah rotasi dengan θ negatif terhadap pusat di tengah jam.
          </p>
        </div>
        <span className="ml-auto shrink-0 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 font-mono text-xs font-bold text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
          {formatClock(minutes)}
        </span>
      </div>

      <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row">
        <svg
          viewBox="0 0 200 200"
          className="h-40 w-40 shrink-0"
          role="img"
          aria-label={`Jam analog menunjukkan pukul ${formatClock(minutes)}; jarum menit berada pada ${angleLabel(-minuteAngle)}`}
        >
          <circle
            cx="100"
            cy="100"
            r="88"
            className="fill-white stroke-slate-300 dark:fill-slate-900 dark:stroke-slate-800"
            strokeWidth="2"
          />
          {CLOCK_TICKS.map((deg) => (
            <line
              key={deg}
              x1="100"
              y1="18"
              x2="100"
              y2={deg % 90 === 0 ? 28 : 23}
              className="stroke-slate-300 dark:stroke-slate-700"
              strokeWidth={deg % 90 === 0 ? 2.5 : 1.5}
              strokeLinecap="round"
              transform={`rotate(${deg} 100 100)`}
            />
          ))}
          <line
            x1="100"
            y1="100"
            x2="100"
            y2="58"
            className="stroke-slate-700 dark:stroke-slate-300"
            strokeWidth="6"
            strokeLinecap="round"
            transform={`rotate(${hourAngle} 100 100)`}
          />
          <line
            x1="100"
            y1="100"
            x2="100"
            y2="30"
            className="stroke-indigo-600 dark:stroke-indigo-400"
            strokeWidth="3.5"
            strokeLinecap="round"
            transform={`rotate(${minuteAngle} 100 100)`}
          />
          <circle cx="100" cy="100" r="5" className="fill-amber-500 dark:fill-amber-400" />
        </svg>

        <div className="w-full space-y-1.5">
          <Tex tex={String.raw`\theta_{\text{menit}} = -6^\circ \times m`} />
          <p className="font-mono text-xs text-slate-700 dark:text-slate-300">
            θ menit = {angleLabel(-minuteAngle)} · θ jam = {angleLabel(-hourAngle)}
          </p>
          <p className="font-mono text-xs text-slate-700 dark:text-slate-300">
            ujung jarum menit = ({formatNumber(tip.x)}, {formatNumber(tip.y)})
          </p>
          <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">
            Pukul 12:15 menghasilkan θ = −90° dan ujung jarum di (1, 0).
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <input
          type="range"
          min="0"
          max="719"
          step="1"
          value={minutes}
          onChange={(event) => setMinutes(Number(event.target.value))}
          className="range-rotasi"
          aria-label="Waktu pada jam analog dalam menit sejak pukul 12:00"
        />
        <button
          type="button"
          onClick={() => setPlaying((previous) => !previous)}
          aria-pressed={playing}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-amber-300 hover:text-amber-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:border-amber-500/50 dark:hover:text-amber-300"
        >
          {playing ? <Pause size={14} /> : <Play size={14} />}
          <span className="sr-only">{playing ? 'Jeda animasi jam' : 'Putar animasi jam'}</span>
        </button>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        {[15, 180, 45].map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => setMinutes(preset)}
            className={
              'rounded-lg border px-2 py-1.5 font-mono text-[11px] font-semibold transition ' +
              (minutes === preset
                ? 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/20 dark:text-amber-300'
                : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-900 dark:border-slate-800 dark:text-slate-400 dark:hover:border-slate-700 dark:hover:text-slate-200')
            }
          >
            {formatClock(preset)}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Motif dasar diputar n kali mengelilingi pusat: simetri putar pada batik dan mandala. */
function MotifStudio() {
  const [folds, setFolds] = useState(8);
  const step = 360 / folds;
  const copies = Array.from({ length: folds }, (_, index) => index * step);

  return (
    <div className="rounded-2xl border border-indigo-200 bg-white p-5 shadow-xl shadow-slate-200/50 transition-colors dark:border-indigo-500/20 dark:bg-slate-950 dark:shadow-black/20">
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-600 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-400">
          <Palette size={17} />
        </span>
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Simetri putar motif</h3>
          <p className="mt-0.5 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
            Satu motif dasar diputar berulang mengelilingi pusat yang sama, seperti kawung, ceplok, dan mandala.
          </p>
        </div>
        <span className="ml-auto shrink-0 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 font-mono text-xs font-bold text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
          n = {folds}
        </span>
      </div>

      <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row">
        <svg
          viewBox="0 0 200 200"
          className="h-40 w-40 shrink-0"
          role="img"
          aria-label={`Motif dasar diputar ${folds} kali dengan sudut ${formatNumber(step)} derajat`}
        >
          <circle
            cx="100"
            cy="100"
            r="78"
            fill="none"
            strokeDasharray="4 6"
            className="stroke-slate-300 dark:stroke-slate-800"
          />
          {copies.map((deg) => (
            <g key={deg} transform={`rotate(${deg} 100 100)`}>
              <path
                d="M100 100 C 88 76, 88 48, 100 26 C 112 48, 112 76, 100 100 Z"
                className="fill-indigo-500/20 stroke-indigo-500/70 dark:fill-indigo-500/30 dark:stroke-indigo-400/70"
                strokeWidth="1"
              />
              <circle cx="100" cy="44" r="3.5" className="fill-amber-500/80 dark:fill-amber-400/80" />
            </g>
          ))}
          <circle cx="100" cy="100" r="4" className="fill-amber-500 dark:fill-amber-400" />
        </svg>

        <div className="w-full space-y-1.5">
          <Tex tex={String.raw`\theta = \frac{360^\circ}{n} = ${formatNumber(step)}^\circ`} />
          <p className="font-mono text-xs text-slate-700 dark:text-slate-300">
            bayangan = {folds} · sudut antar bayangan = {formatNumber(step)}°
          </p>
          <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">
            Titik pusat tidak berpindah; hanya arah motif yang berubah. Inilah simetri putar tingkat {folds}.
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-4 gap-2">
        {MOTIF_PRESETS.map((preset) => (
          <button
            key={preset.folds}
            type="button"
            onClick={() => setFolds(preset.folds)}
            className={
              'rounded-lg border px-1 py-1.5 text-[10px] font-bold transition ' +
              (folds === preset.folds
                ? 'border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-500/60 dark:bg-indigo-500/15 dark:text-indigo-300'
                : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-900 dark:border-slate-800 dark:text-slate-400 dark:hover:border-slate-700 dark:hover:text-slate-200')
            }
          >
            {preset.name}
          </button>
        ))}
      </div>

      <div className="mt-3">
        <label htmlFor="lipat-motif" className="field-label">
          Jumlah lipat simetri
        </label>
        <input
          id="lipat-motif"
          type="range"
          min="2"
          max="12"
          step="1"
          value={folds}
          onChange={(event) => setFolds(Number(event.target.value))}
          className="range-rotasi"
        />
      </div>
    </div>
  );
}

function ContextSection() {
  const [tab, setTab] = useState<'clock' | 'motif'>('clock');

  return (
    <section id="konteks" className="scroll-mt-28 border-t border-slate-200 py-16 dark:border-slate-800/80">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          icon={Palette}
          eyebrow="Konteks Nyata"
          title="Rotasi di sekitar kita"
          description="Jarum jam dan motif batik adalah rotasi yang bisa kamu hitung. Geser waktu atau jumlah lipat, lalu hubungkan dengan θ dan pusat yang sama seperti di canvas."
        />

        <div className="mx-auto mb-5 grid max-w-xs grid-cols-2 gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:shadow-none">
          <button
            type="button"
            onClick={() => setTab('clock')}
            aria-pressed={tab === 'clock'}
            className={
              TAB_BASE +
              ' ' +
              (tab === 'clock'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25 dark:shadow-indigo-950/50'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-200')
            }
          >
            <Clock size={14} /> Jarum Jam
          </button>
          <button
            type="button"
            onClick={() => setTab('motif')}
            aria-pressed={tab === 'motif'}
            className={
              TAB_BASE +
              ' ' +
              (tab === 'motif'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25 dark:shadow-indigo-950/50'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-200')
            }
          >
            <Palette size={14} /> Simetri Motif
          </button>
        </div>

        {tab === 'clock' ? <ClockStudio /> : <MotifStudio />}

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
