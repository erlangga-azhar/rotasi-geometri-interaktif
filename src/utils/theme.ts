import type { ThemeMode } from '../types/rotation';

export const THEME_STORAGE_KEY = 'rotasi-theme';

const THEME_COLOR: Record<ThemeMode, string> = {
  light: '#f8fafc',
  dark: '#020617',
};

/** Tema awal: pilihan tersimpan, lalu preferensi sistem, dengan fallback gelap. */
export function getInitialTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'dark';

  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {
    /* localStorage diblokir; lanjut ke preferensi sistem */
  }

  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

/** Menyinkronkan kelas `dark` pada <html>, color-scheme, meta theme-color, dan penyimpanan. */
export function applyTheme(theme: ThemeMode): void {
  const root = document.documentElement;
  const dark = theme === 'dark';

  root.classList.toggle('dark', dark);
  root.dataset.theme = theme;
  root.style.colorScheme = theme;

  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (meta) meta.content = THEME_COLOR[theme];

  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    /* penyimpanan penuh atau diblokir browser */
  }
}
