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

function scrollToSection(id: string) {
  const behavior: ScrollBehavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ? 'auto'
    : 'smooth';
  document.getElementById(id)?.scrollIntoView({ behavior, block: 'start' });
}

function App() {
  const [state, setState] = useState<RotationState>(DEFAULT_STATE);
  const [quizReturn, setQuizReturn] = useState<{ index: number } | null>(null);
  const [theme, setTheme] = useState<ThemeMode>(() =>
    document.documentElement.classList.contains('dark') ? 'dark' : 'light'
  );

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    try {
      localStorage.setItem('rotasi-theme', theme);
    } catch {
      /* preferensi tema tidak dapat disimpan */
    }
  }, [theme]);

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

  const toggleTheme = useCallback(() => {
    setTheme((previous) => (previous === 'dark' ? 'light' : 'dark'));
  }, []);

  return (
    <div className="flex min-h-screen flex-col">
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
        <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-4">
          <button
            type="button"
            onClick={backToQuiz}
            className="pointer-events-auto inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-slate-900/25 transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
          >
            <ArrowLeft size={15} /> Kembali ke soal {quizReturn.index + 1}
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
