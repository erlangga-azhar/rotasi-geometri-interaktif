import { useCallback, useEffect, useState } from 'react';
import Header from './components/Header';
import HeroSection from './components/HeroSection';
import TheorySection from './components/TheorySection';
import StepSolver from './components/StepSolver';
import QuizEngine from './components/QuizEngine';
import Footer from './components/Footer';
import type { RotationState, ThemeMode } from './types/rotation';
import { DEFAULT_STATE } from './utils/math';

function App() {
  const [state, setState] = useState<RotationState>(DEFAULT_STATE);
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
    setState((previous) => ({ ...previous, ...patch }));
  }, []);

  const visualizeFromQuiz = useCallback((next: RotationState) => {
    setState(next);
    document.getElementById('visualizer')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
        <QuizEngine onVisualize={visualizeFromQuiz} />
      </main>
      <Footer />
    </div>
  );
}

export default App;
