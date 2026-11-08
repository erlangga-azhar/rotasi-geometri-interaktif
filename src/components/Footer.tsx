import { RotateCw } from 'lucide-react';

const TECHNOLOGIES = ['React', 'TypeScript', 'Tailwind CSS', 'KaTeX', 'Canvas', 'PWA'];

function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white py-8 transition-colors dark:border-slate-800/80 dark:bg-slate-950">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 text-center sm:flex-row sm:px-6 sm:text-left lg:px-8">
        <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-white">
            <RotateCw size={13} strokeWidth={2.4} />
          </span>
          <span>
            <strong className="font-bold text-slate-900 dark:text-slate-200">RotasiLab</strong> — media belajar rotasi
            interaktif yang dapat dipakai offline.
          </span>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-1.5 text-[10px] font-semibold text-slate-600 dark:text-slate-400">
          {TECHNOLOGIES.map((technology) => (
            <span
              key={technology}
              className="rounded-md border border-slate-200 px-2 py-1 dark:border-slate-800"
            >
              {technology}
            </span>
          ))}
        </div>
      </div>
    </footer>
  );
}

export default Footer;
