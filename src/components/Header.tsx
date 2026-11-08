import { useEffect, useState } from 'react';
import {
  BookOpen,
  Calculator,
  GraduationCap,
  Moon,
  Move,
  Palette,
  RotateCw,
  Sun,
  Wifi,
  WifiOff,
  type LucideIcon,
} from 'lucide-react';
import type { ThemeMode } from '../types/rotation';

interface HeaderProps {
  theme: ThemeMode;
  onToggleTheme: () => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'visualizer', label: 'Visualizer', icon: Move },
  { id: 'teori', label: 'Teori & Rumus', icon: BookOpen },
  { id: 'kalkulator', label: 'Kalkulator', icon: Calculator },
  { id: 'konteks', label: 'Konteks', icon: Palette },
  { id: 'kuis', label: 'Kuis', icon: GraduationCap },
];

function useOfflineStatus() {
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));
  const [offlineReady, setOfflineReady] = useState(false);

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    let cancelled = false;
    const updateReady = () => {
      if (!cancelled) setOfflineReady(Boolean(navigator.serviceWorker?.controller));
    };

    if ('serviceWorker' in navigator) {
      updateReady();
      navigator.serviceWorker.addEventListener('controllerchange', updateReady);
      navigator.serviceWorker.ready
        .then(() => {
          if (!cancelled) setOfflineReady(true);
        })
        .catch(() => {
          /* service worker belum aktif */
        });
      navigator.serviceWorker
        .getRegistration()
        .then((registration) => {
          if (!cancelled) setOfflineReady(Boolean(registration?.active));
        })
        .catch(() => {
          /* status offline tidak dapat dipastikan */
        });
    }

    return () => {
      cancelled = true;
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('controllerchange', updateReady);
      }
    };
  }, []);

  return { online, offlineReady };
}

function Header({ theme, onToggleTheme }: HeaderProps) {
  const { online, offlineReady } = useOfflineStatus();

  const status = !online
    ? {
        label: 'Mode offline',
        Icon: WifiOff,
        className:
          'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300',
      }
    : offlineReady
      ? {
          label: 'Siap offline',
          Icon: Wifi,
          className:
            'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300',
        }
      : {
          label: 'Online',
          Icon: Wifi,
          className:
            'border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400',
        };

  const StatusIcon = status.Icon;

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/85 backdrop-blur-lg dark:border-slate-800/80 dark:bg-slate-950/80">
      <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-2.5 sm:gap-3 sm:px-6 lg:px-8">
        <a href="#visualizer" className="flex shrink-0 items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-600/30">
            <RotateCw size={18} strokeWidth={2.4} />
          </span>
          <span className="leading-tight">
            <span className="block text-sm font-extrabold tracking-tight text-slate-900 dark:text-white">
              RotasiLab
            </span>
            <span className="hidden text-[10px] font-medium text-slate-500 sm:block dark:text-slate-400">
              Transformasi Geometri
            </span>
          </span>
        </a>

        <nav className="ml-auto flex max-w-full items-center gap-1 overflow-x-auto scrollbar-thin">
          {NAV_ITEMS.map((item) => {
            const NavIcon = item.icon;
            return (
              <a
                key={item.id}
                href={`#${item.id}`}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-indigo-600 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-indigo-300"
              >
                <NavIcon size={14} />
                <span className="hidden md:inline">{item.label}</span>
              </a>
            );
          })}
        </nav>

        <span
          className={`hidden shrink-0 items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-semibold sm:inline-flex ${status.className}`}
          title="Status ketersediaan offline (service worker)"
        >
          <StatusIcon size={11} />
          {status.label}
        </span>

        <button
          type="button"
          onClick={onToggleTheme}
          aria-label={theme === 'dark' ? 'Aktifkan mode terang' : 'Aktifkan mode gelap'}
          className="ml-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-indigo-500/50"
        >
          {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
        </button>
      </div>
    </header>
  );
}

export default Header;
