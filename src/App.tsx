import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import Header from './components/Header';
import HeroSection from './components/HeroSection';
import TheorySection from './components/TheorySection';
import StepSolver from './components/StepSolver';
import ContextSection from './components/ContextSection';
import QuizEngine from './components/QuizEngine';
import Footer from './components/Footer';
import type { RotationState, ThemeMode } from './types/rotation';
import { DEFAULT_STATE } from './utils/math';
import { THEME_STORAGE_KEY, applyTheme, getInitialTheme } from './utils/theme';

function scrollToSection(id: string) {
  const behavior: ScrollBehavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ? 'auto'
    : 'smooth';
  document.getElementById(id)?.scrollIntoView({ behavior, block: 'start' });
}

function App() {
  const [state, setState] = useState<RotationState>(DEFAULT_STATE);
  const [theme, setTheme] = useState<ThemeMode>(getInitialTheme);
  const [quizReturn, setQuizReturn] = useState<{ index: number } | null>(null);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  /* Sinkronisasi lintas-tab: tab lain yang mengubah tema langsung diikuti. */
  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== THEME_STORAGE_KEY) return;
      if (event.newValue === 'light' || event.newValue === 'dark') {
        setTheme((previous) => (previous === event.newValue ? previous : (event.newValue as ThemeMode)));
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((previous) => (previous === 'dark' ? 'light' : 'dark'));
  }, []);

  const updateState = useCallback((patch: Partial<RotationState>) => {
    setQuizReturn(null);
    setState((previous) => ({ ...previous, ...patch }));
  }, []);

  const visualizeFromQuiz = useCallback((next: RotationState, questionIndex: number) => {
    setState(next);
    setQuizReturn({ index: questionIndex });
    scrollToSection('visualizer');
  }, []);

  const backToQuiz = useCallback(() => {
    setQuizReturn(null);
    scrollToSection('kuis');
  }, []);

  return (
    <div className="flex min-h-screen flex-col transition-colors">
      <Header theme={theme} onToggleTheme={toggleTheme} />
      <main className="flex-1">
        <HeroSection state={state} theme={theme} onChange={updateState} />
        <TheorySection state={state} />
        <StepSolver />
        <ContextSection />
        <QuizEngine onVisualize={visualizeFromQuiz} />
      </main>
      <Footer />

      {quizReturn !== null && (
        <button
          type="button"
          onClick={backToQuiz}
          className="fixed bottom-6 right-6 z-50 inline-flex items-center gap-2 rounded-full border border-indigo-400/30 bg-indigo-600/90 px-5 py-2.5 text-xs font-bold text-white shadow-2xl backdrop-blur-md transition hover:bg-indigo-700"
        >
          <ArrowLeft size={15} /> Kembali ke soal {quizReturn.index + 1}
        </button>
      )}
    </div>
  );
}

export default App;
