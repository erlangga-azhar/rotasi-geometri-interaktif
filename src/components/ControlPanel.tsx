import { useId, useRef } from 'react';
import { RotateCcw, RotateCw } from 'lucide-react';
import type { CenterPoint, RotationState, ShapeType } from '../types/rotation';
import { angleLabel, formatNumber, normalizeSignedDegree, rotatePoint } from '../utils/math';
import NumberField from './NumberField';

interface ControlPanelProps {
  state: RotationState;
  onChange: (patch: Partial<RotationState>) => void;
  /** Tanpa kartu luar — dipakai di dalam bottom sheet ponsel. */
  embedded?: boolean;
}

interface ShapeOption {
  id: ShapeType;
  label: string;
}

const SHAPE_OPTIONS: ShapeOption[] = [
  { id: 'point', label: 'Titik P' },
  { id: 'triangle', label: 'Segitiga ABC' },
  { id: 'square', label: 'Persegi ABCD' },
];

const SEGMENT_BASE = 'rounded-lg px-2 py-2 text-[11px] font-bold transition sm:text-xs';
const SEGMENT_INACTIVE =
  'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-200';

function ControlPanel({ state, onChange, embedded = false }: ControlPanelProps) {
  /* Desktop & mobile sheet dapat hidup bersamaan → semua ID form harus unik. */
  const uid = useId();
  const pointXId = `${uid}-point-x`;
  const pointYId = `${uid}-point-y`;
  const centerAId = `${uid}-center-a`;
  const centerBId = `${uid}-center-b`;
  const angleId = `${uid}-angle`;

  const effective = state.angleDegree * state.direction;
  const result = rotatePoint(state.point, state.center, effective);
  const isOrigin = state.center.a === 0 && state.center.b === 0;
  const lastCustomCenter = useRef<CenterPoint>({ a: 2, b: 1 });

  const selectOrigin = () => {
    if (!isOrigin) lastCustomCenter.current = state.center;
    onChange({ center: { a: 0, b: 0 } });
  };

  const selectCustom = () => {
    if (isOrigin) onChange({ center: lastCustomCenter.current });
  };

  return (
    <div
      className={
        embedded
          ? 'flex flex-col gap-4'
          : 'flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/50 transition-colors dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/20'
      }
    >
      <div>
        <p className="field-label">Objek yang dirotasi</p>
        <div className="grid grid-cols-3 gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-950">
          {SHAPE_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => onChange({ shape: option.id })}
              className={
                SEGMENT_BASE +
                ' ' +
                (state.shape === option.id
                  ? 'border border-indigo-200 bg-indigo-50 text-indigo-700 shadow-sm dark:border-indigo-500/30 dark:bg-slate-800 dark:text-indigo-300'
                  : SEGMENT_INACTIVE)
              }
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 dark:border-slate-800/60 dark:bg-slate-950/60">
        <p className="field-label">Titik awal P(x, y)</p>
        <div className="grid grid-cols-2 gap-3">
          <NumberField
            id={pointXId}
            label="x"
            value={state.point.x}
            onChange={(value) => onChange({ point: { ...state.point, x: value } })}
          />
          <NumberField
            id={pointYId}
            label="y"
            value={state.point.y}
            onChange={(value) => onChange({ point: { ...state.point, y: value } })}
          />
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 dark:border-slate-800/60 dark:bg-slate-950/60">
        <p className="field-label">Pusat rotasi</p>
        <div
          role="group"
          aria-label="Jenis pusat rotasi"
          className="mb-2 grid grid-cols-2 gap-1 rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-slate-950"
        >
          <button
            type="button"
            onClick={selectOrigin}
            aria-pressed={isOrigin}
            className={
              'rounded-lg px-2 py-1.5 font-mono text-[11px] font-bold transition ' +
              (isOrigin
                ? 'border border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/20 dark:text-amber-300'
                : SEGMENT_INACTIVE)
            }
          >
            O(0, 0)
          </button>
          <button
            type="button"
            onClick={selectCustom}
            aria-pressed={!isOrigin}
            className={
              'rounded-lg px-2 py-1.5 font-mono text-[11px] font-bold transition ' +
              (!isOrigin
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25 dark:shadow-indigo-950/50'
                : SEGMENT_INACTIVE)
            }
          >
            P(a, b)
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <NumberField
            id={centerAId}
            label="a"
            value={state.center.a}
            onChange={(value) => onChange({ center: { ...state.center, a: value } })}
          />
          <NumberField
            id={centerBId}
            label="b"
            value={state.center.b}
            onChange={(value) => onChange({ center: { ...state.center, b: value } })}
          />
        </div>
        <p className="mt-2 text-[10px] leading-relaxed text-slate-600 dark:text-slate-400">
          {isOrigin
            ? 'Pusat di titik asal: 90° memetakan (x, y) → (−y, x).'
            : 'Pusat kustom: geser ke (x − a, y − b), putar, lalu geser balik.'}
        </p>
      </div>

      <div>
        <div className="mb-1 flex items-end justify-between">
          <label
            htmlFor={angleId}
            className="text-[11px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400"
          >
            Sudut rotasi θ
          </label>
          <span className="font-mono text-lg font-bold text-indigo-600 dark:text-indigo-400">
            {angleLabel(state.angleDegree)}
          </span>
        </div>
        <input
          id={angleId}
          type="range"
          min="-360"
          max="360"
          step="1"
          value={state.angleDegree}
          onChange={(event) =>
            onChange({ angleDegree: normalizeSignedDegree(Number(event.target.value)) })
          }
          className="range-rotasi mt-2"
        />
        <div className="mt-1 flex justify-between font-mono text-[10px] text-slate-600 dark:text-slate-400">
          <span>-360°</span>
          <span>0°</span>
          <span>+360°</span>
        </div>

        <div className="mt-3 rounded-xl border border-indigo-200 bg-indigo-50 p-3 dark:border-indigo-500/30 dark:bg-indigo-950/30">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400">
              θ efektif
            </p>
            <p className="font-mono text-xs font-bold text-indigo-700 dark:text-indigo-300">
              {angleLabel(effective)}
            </p>
          </div>
          <p className="mt-1 font-mono text-[10px] text-indigo-700 dark:text-indigo-300">
            {angleLabel(state.angleDegree)} × {state.direction === 1 ? '+1 (berlawanan)' : '−1 (searah)'}
          </p>
        </div>
      </div>

      <div>
        <p className="field-label">Arah perputaran</p>
        <div className="grid grid-cols-2 gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-950">
          <button
            type="button"
            onClick={() => onChange({ direction: 1 })}
            className={
              'flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-[11px] font-bold transition ' +
              (state.direction === 1
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25 dark:shadow-indigo-950/50'
                : SEGMENT_INACTIVE)
            }
          >
            <RotateCcw size={13} /> Berlawanan (+θ)
          </button>
          <button
            type="button"
            onClick={() => onChange({ direction: -1 })}
            className={
              'flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-[11px] font-bold transition ' +
              (state.direction === -1
                ? 'border border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/20 dark:text-amber-300'
                : SEGMENT_INACTIVE)
            }
          >
            <RotateCw size={13} /> Searah (−θ)
          </button>
        </div>
      </div>

      <div>
        <p className="field-label">Preset sudut istimewa</p>
        <div className="grid grid-cols-4 gap-2">
          {[90, 180, 270, -90].map((deg) => (
            <button
              key={deg}
              type="button"
              onClick={() => onChange({ angleDegree: deg, direction: 1 })}
              className={
                'rounded-lg border px-1 py-2 font-mono text-xs font-bold transition ' +
                (state.angleDegree === deg && state.direction === 1
                  ? 'border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-500/60 dark:bg-indigo-500/15 dark:text-indigo-300'
                  : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-900 dark:border-slate-800 dark:text-slate-400 dark:hover:border-slate-700 dark:hover:text-slate-200')
              }
            >
              {deg > 0 ? '+' : ''}
              {deg}°
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-indigo-200 bg-gradient-to-br from-white via-indigo-50 to-white p-3.5 dark:border-indigo-500/30 dark:from-slate-900 dark:via-indigo-950/40 dark:to-slate-900">
        <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400">
          Hasil bayangan
        </p>
        <p className="font-mono text-sm font-semibold text-slate-900 dark:text-slate-100">
          P({formatNumber(state.point.x)}, {formatNumber(state.point.y)}) → P′({formatNumber(result.x)},{' '}
          {formatNumber(result.y)})
        </p>
        <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-400">
          Rotasi {angleLabel(Math.abs(effective))} {effective >= 0 ? 'berlawanan' : 'searah'} jarum jam terhadap (
          {formatNumber(state.center.a)}, {formatNumber(state.center.b)})
        </p>
      </div>
    </div>
  );
}

export default ControlPanel;
