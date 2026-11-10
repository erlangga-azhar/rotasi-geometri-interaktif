import { useEffect, useRef, useState } from 'react';
import { ChevronUp, SlidersHorizontal, X } from 'lucide-react';
import type { RotationState } from '../types/rotation';
import { angleLabel, formatNumber, rotatePoint } from '../utils/math';
import ControlPanel from './ControlPanel';

interface MobileControlSheetProps {
  state: RotationState;
  onChange: (patch: Partial<RotationState>) => void;
}

/**
 * Panel kontrol versi ponsel: bar ringkas yang menempel di bawah, lalu membuka
 * bottom sheet penuh. Kanvas tetap dominan dan tidak pernah terdorong ke bawah.
 */
function MobileControlSheet({ state, onChange }: MobileControlSheetProps) {
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(true);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const wasOpenRef = useRef(false);

  /* Bar hanya tampil selama bagian visualizer ada di layar. */
  useEffect(() => {
    const section = document.getElementById('visualizer');
    if (!section || typeof IntersectionObserver === 'undefined') return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry) setVisible(entry.isIntersecting);
      },
      { threshold: 0.02, rootMargin: '0px 0px -15% 0px' }
    );
    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  /* Kunci scroll halaman + tutup dengan Escape selama sheet terbuka. */
  useEffect(() => {
    if (!open) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handleKey);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  useEffect(() => {
    if (open) closeRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (wasOpenRef.current && !open) triggerRef.current?.focus();
    wasOpenRef.current = open;
  }, [open]);

  const effective = state.angleDegree * state.direction;
  const result = rotatePoint(state.point, state.center, effective);

  return (
    <div className="lg:hidden">
      {visible && !open && (
        <div className="fixed inset-x-0 bottom-0 z-30 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <button
            ref={triggerRef}
            type="button"
            onClick={() => setOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={open}
            className="mx-auto flex min-h-[56px] w-full max-w-lg items-center gap-3 rounded-2xl border border-indigo-200 bg-white/95 px-3.5 py-2 text-left shadow-2xl shadow-slate-900/15 backdrop-blur-md transition active:scale-[0.99] dark:border-indigo-500/30 dark:bg-slate-900/95 dark:shadow-black/40"
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/25">
              <SlidersHorizontal size={17} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                Atur rotasi
              </span>
              <span className="mt-0.5 block truncate font-mono text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                P({formatNumber(state.point.x)}, {formatNumber(state.point.y)}) → P′(
                {formatNumber(result.x)}, {formatNumber(result.y)}) · {angleLabel(effective)}
              </span>
            </span>
            <span className="inline-flex shrink-0 items-center gap-0.5 rounded-lg border border-slate-200 px-2 py-1.5 text-[10px] font-bold text-slate-600 dark:border-slate-700 dark:text-slate-300">
              Buka <ChevronUp size={13} />
            </span>
          </button>
        </div>
      )}

      {open && (
        <>
          <div
            className="fixed inset-0 z-40 bg-slate-950/55 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Panel kontrol rotasi"
            className="fixed inset-x-0 bottom-0 z-50 flex max-h-[86dvh] flex-col overflow-hidden rounded-t-3xl border-t border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
          >
            <div className="shrink-0 border-b border-slate-200 px-4 pb-2.5 pt-2 dark:border-slate-800">
              <div className="mx-auto mb-2 h-1.5 w-12 rounded-full bg-slate-300 dark:bg-slate-700" />
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Panel Kontrol</p>
                <button
                  ref={closeRef}
                  type="button"
                  onClick={() => setOpen(false)}
                  className="grid h-11 w-11 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:border-indigo-500/50 dark:hover:text-indigo-300"
                >
                  <X size={17} />
                  <span className="sr-only">Tutup panel kontrol</span>
                </button>
              </div>
            </div>

            <div className="overflow-y-auto overscroll-contain px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <ControlPanel state={state} onChange={onChange} embedded />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default MobileControlSheet;
