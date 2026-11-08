import { useEffect, useState } from 'react';
import { ArrowRight, Check, Eye, GraduationCap, RefreshCw, X } from 'lucide-react';
import type { QuizQuestion, RotationState } from '../types/rotation';
import { formatNumber } from '../utils/math';
import { buildQuiz } from '../utils/quiz';
import { loadQuizProgress, saveQuizProgress } from '../utils/quizProgress';
import SectionHeading from './SectionHeading';
import Tex from './Tex';

interface QuizEngineProps {
  onVisualize: (state: RotationState, questionIndex: number) => void;
}

interface AnswerRecord {
  correct: boolean;
}

const OPTION_LETTERS = ['A', 'B', 'C', 'D'];

function QuizEngine({ onVisualize }: QuizEngineProps) {
  const [restored] = useState(() => loadQuizProgress());
  const [questions, setQuestions] = useState<QuizQuestion[]>(() => restored?.questions ?? buildQuiz());
  const [index, setIndex] = useState(() => restored?.index ?? 0);
  const [selected, setSelected] = useState<number | null>(() => restored?.selected ?? null);
  const [answers, setAnswers] = useState<AnswerRecord[]>(() => restored?.answers ?? []);
  const [finished, setFinished] = useState(() => restored?.finished ?? false);

  useEffect(() => {
    saveQuizProgress({ version: 1, questions, index, selected, answers, finished });
  }, [questions, index, selected, answers, finished]);

  const question = questions[index];
  const answered = selected !== null;
  const isCorrect = selected === question.correctIndex;
  const score = answers.filter((answer) => answer.correct).length;
  const correctOption = question.options[question.correctIndex];

  const choose = (optionIndex: number) => {
    if (answered) return;
    setSelected(optionIndex);
    setAnswers((previous) => [...previous, { correct: optionIndex === question.correctIndex }]);
  };

  const next = () => {
    if (index + 1 >= questions.length) {
      setFinished(true);
      return;
    }
    setIndex(index + 1);
    setSelected(null);
  };

  const restart = () => {
    setQuestions(buildQuiz());
    setIndex(0);
    setSelected(null);
    setAnswers([]);
    setFinished(false);
  };

  const scoreMessage = () => {
    if (score === questions.length) return 'Sempurna! Pemahaman rotasimu sudah sangat kuat.';
    if (score >= 4) return 'Bagus sekali! Tinggal sedikit lagi menuju sempurna.';
    if (score >= 3) return 'Cukup baik. Ulangi bagian yang masih keliru, ya.';
    return 'Semangat! Coba visualisasikan setiap soal di canvas agar lebih mudah dipahami.';
  };

  return (
    <section id="kuis" className="scroll-mt-28 border-t border-slate-200 py-16 dark:border-slate-800/80">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          icon={GraduationCap}
          eyebrow="Kuis & Evaluasi"
          title="Uji pemahaman rotasimu"
          description="Lima soal acak mencakup rotasi titik dan bangun datar. Jika jawabanmu keliru, buka pembuktiannya langsung di canvas."
        />

        {finished ? (
          <div className="animate-floatIn rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-xl shadow-slate-200/50 dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/20">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/25 dark:shadow-indigo-950/50">
              <GraduationCap size={28} />
            </div>
            <h3 className="mt-4 text-2xl font-extrabold text-slate-900 dark:text-white">
              Skor akhir: {score}/{questions.length}
            </h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-600 dark:text-slate-400">{scoreMessage()}</p>
            <div className="mt-5 flex justify-center gap-2">
              {questions.map((item, i) => (
                <span
                  key={item.id}
                  className={'h-2.5 w-8 rounded-full ' + (answers[i]?.correct ? 'bg-emerald-500' : 'bg-rose-500')}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={restart}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-600/25 transition hover:bg-indigo-500 dark:shadow-indigo-950/50"
            >
              <RefreshCw size={16} /> Ulangi dengan soal baru
            </button>
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/50 transition-colors dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/20">
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-3.5 dark:border-slate-800">
              <span className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 font-mono text-xs font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
                Soal {index + 1} / {questions.length}
              </span>
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  {questions.map((item, i) => (
                    <span
                      key={item.id}
                      className={
                        'h-1.5 w-6 rounded-full transition ' +
                        (i < answers.length
                          ? answers[i]?.correct
                            ? 'bg-emerald-500'
                            : 'bg-rose-500'
                          : i === index
                            ? 'bg-indigo-500'
                            : 'bg-slate-200 dark:bg-slate-800')
                      }
                    />
                  ))}
                </div>
                <span className="hidden font-mono text-xs text-slate-600 sm:inline dark:text-slate-400">
                  skor {score}
                </span>
              </div>
            </div>

            <div className="p-5 sm:p-6">
              <p className="text-base font-semibold leading-relaxed text-slate-900 dark:text-slate-100">
                {question.prompt}
              </p>

              <div className="mt-5 grid gap-2.5">
                {question.options.map((option, i) => {
                  const isRight = i === question.correctIndex;
                  const isPicked = i === selected;
                  let style =
                    'border-slate-200 bg-slate-50 text-slate-700 hover:border-indigo-300 hover:bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:bg-slate-900';

                  if (answered && isRight) {
                    style =
                      'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-500/60 dark:bg-emerald-950/40 dark:text-emerald-300';
                  } else if (answered && isPicked) {
                    style =
                      'border-rose-300 bg-rose-50 text-rose-800 dark:border-rose-500/60 dark:bg-rose-950/40 dark:text-rose-300';
                  } else if (answered) {
                    style =
                      'border-slate-200 bg-slate-50 text-slate-500 opacity-60 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-500';
                  }

                  return (
                    <button
                      key={`${option.x}-${option.y}-${i}`}
                      type="button"
                      disabled={answered}
                      onClick={() => choose(i)}
                      className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition ${style}`}
                    >
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-slate-300 font-mono text-xs font-bold dark:border-slate-700">
                        {OPTION_LETTERS[i]}
                      </span>
                      <span className="font-mono text-sm font-semibold">
                        ({formatNumber(option.x)}, {formatNumber(option.y)})
                      </span>
                      {answered && isRight && <Check size={16} className="ml-auto text-emerald-600 dark:text-emerald-400" />}
                      {answered && isPicked && !isRight && (
                        <X size={16} className="ml-auto text-rose-600 dark:text-rose-400" />
                      )}
                    </button>
                  );
                })}
              </div>

              {answered && (
                <div
                  className={
                    'mt-5 animate-pop rounded-xl border p-4 ' +
                    (isCorrect
                      ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-950/30'
                      : 'border-rose-300 bg-rose-50 dark:border-rose-500/30 dark:bg-rose-950/30')
                  }
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={
                        'grid h-6 w-6 place-items-center rounded-full text-white ' +
                        (isCorrect ? 'bg-emerald-500' : 'bg-rose-500')
                      }
                    >
                      {isCorrect ? <Check size={14} strokeWidth={3} /> : <X size={14} strokeWidth={3} />}
                    </span>
                    <p
                      className={
                        'text-sm font-bold ' +
                        (isCorrect ? 'text-emerald-800 dark:text-emerald-300' : 'text-rose-800 dark:text-rose-300')
                      }
                    >
                      {isCorrect
                        ? 'Tepat sekali!'
                        : `Belum tepat. Jawaban benar: (${formatNumber(correctOption.x)}, ${formatNumber(correctOption.y)})`}
                    </p>
                  </div>

                  {question.answerTex && (
                    <div className="mt-3 overflow-x-auto scrollbar-thin rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-950">
                      <Tex tex={question.answerTex} block />
                    </div>
                  )}
                  <p className="mt-2 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                    {question.explanation}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {!isCorrect && (
                      <button
                        type="button"
                        onClick={() => onVisualize(question.params, index)}
                        className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-indigo-600/25 transition hover:bg-indigo-500 dark:shadow-indigo-950/50"
                      >
                        <Eye size={15} /> Lihat Visualisasi
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={next}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-indigo-500/60 dark:hover:text-indigo-300"
                    >
                      {index + 1 >= questions.length ? 'Lihat hasil' : 'Soal berikutnya'}
                      <ArrowRight size={15} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export default QuizEngine;
