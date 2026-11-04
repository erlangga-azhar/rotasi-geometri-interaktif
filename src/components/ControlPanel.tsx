import { RotateCcw, RotateCw } from 'lucide-react';
import type { RotationState, ShapeType } from '../types/rotation';
import { angleLabel, formatNumber, rotatePoint } from '../utils/math';
import NumberField from './NumberField';

interface ControlPanelProps {
  state: RotationState;
  onChange: (patch: Partial<RotationState>) => void;
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

function ControlPanel({ state, onChange }: ControlPanelProps) {
  const effective = state.angleDegree * state.direction;
  const result = rotatePoint(state.point, state.center, effective);

  return (
    <div className="flex flex-col gap-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/60 dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/40">
      <div>
        <p className="field-label">Objek yang dirotasi</p>
        <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
          {SHAPE_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => onChange({ shape: option.id })}
              className={
                'rounded-lg px-2 py-2 text-[11px] font-bold transition sm:text-xs ' +
                (state.shape === option.id
                  ? 'bg-white text-indigo-600 shadow-sm dark:bg-slate-950 dark:text-indigo-300'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200')
              }
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="field-label">Titik awal P(x, y)</p>
        <div className="grid grid-cols-2 gap-3">
          <NumberField
            label="x"
            value={state.point.x}
            onChange={(value) => onChange({ point: { ...state.point, x: value } })}
          />
          <NumberField
            label="y"
            value={state.point.y}
            onChange={(value) => onChange({ point: { ...state.point, y: value } })}
          />
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Pusat rotasi (a, b)
          </p>
          <button
            type="button"
            onClick={() => onChange({ center: { a: 0, b: 0 } })}
            className="rounded-md border border-slate-200 px-2 py-0.5 font-mono text-[10px] font-semibold text-slate-500 transition hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700 dark:text-slate-400 dark:hover:border-indigo-500/50 dark:hover:text-indigo-300"
          >
            preset O(0,0)
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <NumberField
            label="a"
            value={state.center.a}
            onChange={(value) => onChange({ center: { ...state.center, a: value } })}
          />
          <NumberField
            label="b"
            value={state.center.b}
            onChange={(value) => onChange({ center: { ...state.center, b: value } })}
          />
        </div>
      </div>

      <div>
        <div className="mb-1 flex items-end justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Sudut rotasi θ
          </p>
          <span className="font-mono text-lg font-bold text-indigo-600 dark:text-indigo-300">
            {angleLabel(state.angleDegree)}
          </span>
        </div>
        <input
          type="range"
          min="-360"
          max="360"
          step="1"
          value={state.angleDegree}
          onChange={(event) => onChange({ angleDegree: Number(event.target.value) })}
          className="range-rotasi mt-2"
          aria-label="Sudut rotasi dalam derajat"
        />
        <div className="mt-1 flex justify-between font-mono text-[10px] text-slate-400 dark:text-slate-500">
          <span>-360°</span>
          <span>0°</span>
          <span>+360°</span>
        </div>
      </div>

      <div>
        <p className="field-label">Arah perputaran</p>
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
          <button
            type="button"
            onClick={() => onChange({ direction: 1 })}
            className={
              'flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-[11px] font-bold transition ' +
              (state.direction === 1
                ? 'bg-white text-indigo-600 shadow-sm dark:bg-slate-950 dark:text-indigo-300'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200')
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
                ? 'bg-white text-rose-600 shadow-sm dark:bg-slate-950 dark:text-rose-300'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200')
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
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-600 dark:border-indigo-500/60 dark:bg-indigo-500/15 dark:text-indigo-300'
                  : 'border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700 dark:text-slate-300 dark:hover:border-indigo-500/50')
              }
            >
              {deg > 0 ? '+' : ''}
              {deg}°
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-violet-50 p-3.5 dark:border-indigo-500/20 dark:from-indigo-500/10 dark:to-violet-500/10">
        <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-indigo-500 dark:text-indigo-300">
          Hasil bayangan
        </p>
        <p className="font-mono text-sm font-semibold text-slate-700 dark:text-slate-200">
          P({formatNumber(state.point.x)}, {formatNumber(state.point.y)}) → P′({formatNumber(result.x)},{' '}
          {formatNumber(result.y)})
        </p>
        <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
          Rotasi {angleLabel(Math.abs(effective))} {effective >= 0 ? 'berlawanan' : 'searah'} jarum jam terhadap (
          {formatNumber(state.center.a)}, {formatNumber(state.center.b)})
        </p>
      </div>
    </div>
  );
}

export default ControlPanel;
