import { useState } from 'react';
import { ArrowRight, Check, Eye, GraduationCap, RefreshCw, X } from 'lucide-react';
import type { QuizQuestion, RotationState } from '../types/rotation';
import { formatNumber } from '../utils/math';
import { buildQuiz } from '../utils/quiz';
import SectionHeading from './SectionHeading';
import Tex from './Tex';

interface QuizEngineProps {
  onVisualize: (state: RotationState) => void;
}

interface AnswerRecord {
  correct: boolean;
}

const OPTION_LETTERS = ['A', 'B', 'C', 'D'];

function QuizEngine({ onVisualize }: QuizEngineProps) {
  const [questions, setQuestions] = useState<QuizQuestion[]>(() => buildQuiz());
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);
  const [finished, setFinished] = useState(false);

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
    <section id="kuis" className="scroll-mt-28 border-t border-slate-200/70 py-16 dark:border-slate-800/80">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          icon={GraduationCap}
          eyebrow="Kuis & Evaluasi"
          title="Uji pemahaman rotasimu"
          description="Lima soal acak mencakup rotasi titik dan bangun datar. Jika jawabanmu keliru, buka pembuktiannya langsung di canvas."
        />

        {finished ? (
          <div className="animate-floatIn rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl shadow-slate-200/60 dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/40">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/30">
              <GraduationCap size={28} />
            </div>
            <h3 className="mt-4 text-2xl font-extrabold text-slate-900 dark:text-white">
              Skor akhir: {score}/{questions.length}
            </h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">{scoreMessage()}</p>
            <div className="mt-5 flex justify-center gap-2">
              {questions.map((item, i) => (
                <span
                  key={item.id}
                  className={
                    'h-2.5 w-8 rounded-full ' +
                    (answers[i]?.correct ? 'bg-emerald-500' : 'bg-rose-400')
                  }
                />
              ))}
            </div>
            <button
              type="button"
              onClick={restart}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
            >
              <RefreshCw size={16} /> Ulangi dengan soal baru
            </button>
          </div>
        ) : (
          <div className="rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/60 dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/40">
            <div className="flex items-center justify-between gap-3 border-b border-slate-200/80 px-5 py-3.5 dark:border-slate-800">
              <span className="rounded-lg bg-slate-100 px-2.5 py-1 font-mono text-xs font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
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
                            : 'bg-rose-400'
                          : i === index
                            ? 'bg-indigo-500'
                            : 'bg-slate-200 dark:bg-slate-700')
                      }
                    />
                  ))}
                </div>
                <span className="hidden font-mono text-xs text-slate-400 sm:inline dark:text-slate-500">
                  skor {score}
                </span>
              </div>
            </div>

            <div className="p-5 sm:p-6">
              <p className="text-base font-semibold leading-relaxed text-slate-800 dark:text-slate-100">
                {question.prompt}
              </p>

              <div className="mt-5 grid gap-2.5">
                {question.options.map((option, i) => {
                  const isRight = i === question.correctIndex;
                  const isPicked = i === selected;
                  let style =
                    'border-slate-200 bg-white text-slate-700 hover:border-indigo-400 hover:bg-indigo-50/50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-indigo-500/60 dark:hover:bg-indigo-500/5';

                  if (answered && isRight) {
                    style =
                      'border-emerald-500 bg-emerald-50 text-emerald-800 dark:border-emerald-500/60 dark:bg-emerald-500/10 dark:text-emerald-200';
                  } else if (answered && isPicked) {
                    style =
                      'border-rose-400 bg-rose-50 text-rose-700 dark:border-rose-500/60 dark:bg-rose-500/10 dark:text-rose-200';
                  } else if (answered) {
                    style =
                      'border-slate-200 bg-white text-slate-400 opacity-70 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-500';
                  }

                  return (
                    <button
                      key={`${option.x}-${option.y}-${i}`}
                      type="button"
                      disabled={answered}
                      onClick={() => choose(i)}
                      className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition ${style}`}
                    >
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-black/10 font-mono text-xs font-bold dark:border-white/20">
                        {OPTION_LETTERS[i]}
                      </span>
                      <span className="font-mono text-sm font-semibold">
                        ({formatNumber(option.x)}, {formatNumber(option.y)})
                      </span>
                      {answered && isRight && (
                        <Check size={16} className="ml-auto text-emerald-600 dark:text-emerald-400" />
                      )}
                      {answered && isPicked && !isRight && <X size={16} className="ml-auto text-rose-500" />}
                    </button>
                  );
                })}
              </div>

              {answered && (
                <div
                  className={
                    'mt-5 animate-pop rounded-2xl border p-4 ' +
                    (isCorrect
                      ? 'border-emerald-200 bg-emerald-50/70 dark:border-emerald-500/30 dark:bg-emerald-500/10'
                      : 'border-rose-200 bg-rose-50/70 dark:border-rose-500/30 dark:bg-rose-500/10')
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
                        (isCorrect
                          ? 'text-emerald-800 dark:text-emerald-200'
                          : 'text-rose-800 dark:text-rose-200')
                      }
                    >
                      {isCorrect
                        ? 'Tepat sekali!'
                        : `Belum tepat. Jawaban benar: (${formatNumber(correctOption.x)}, ${formatNumber(correctOption.y)})`}
                    </p>
                  </div>

                  {question.answerTex && (
                    <div className="mt-3 overflow-x-auto scrollbar-thin rounded-xl bg-white/70 px-3 py-2 dark:bg-slate-950/50">
                      <Tex tex={question.answerTex} block />
                    </div>
                  )}
                  <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                    {question.explanation}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {!isCorrect && (
                      <button
                        type="button"
                        onClick={() => onVisualize(question.params)}
                        className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-sm shadow-indigo-600/30 transition hover:bg-indigo-500"
                      >
                        <Eye size={15} /> Tampilkan di Canvas
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={next}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition hover:border-indigo-400 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-indigo-500/60"
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
