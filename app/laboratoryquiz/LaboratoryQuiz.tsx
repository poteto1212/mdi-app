"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./laboratoryquiz.module.css";

import {
  printLaboratoryQuizPaper,
  printLaboratoryQuizResult,
} from "@/lib/pdf/laboratoryQuizPdf";

type LaboratoryData = {
  [key: string]: string | number | null | undefined;
};

type Props = {
  data: LaboratoryData[];
};

/*
 * ==================================================
 * 出題問題数
 * ==================================================
 */

const QUESTION_COUNTS = [
  { value: 5, label: "5問" },
  { value: 10, label: "10問" },
  { value: -1, label: "全問" },
];

/*
 * ==================================================
 * クイズ問題
 * ==================================================
 */

type QuizQuestion = {
  rowNumber: number | null;

  abbreviation: string;

  japaneseName: string;

  lowerLimit: number;

  upperLimit: number;

  unit: string;
};

/*
 * ==================================================
 * 回答結果
 * ==================================================
 *
 * 下限・上限それぞれについて
 *
 * PERFECT
 * GOOD
 * BAD
 * 未回答
 *
 * を保持する。
 */

type ResultLevel = "PERFECT" | "GOOD" | "BAD" | null;

type QuizAnswer = {
  lowerValue: number | null;

  upperValue: number | null;

  lowerResult: ResultLevel;

  upperResult: ResultLevel;
};

/*
 * ==================================================
 * localStorageに保存するクイズ状態
 * ==================================================
 */

type QuizState = {
  questionCount: number;

  questions: QuizQuestion[];

  currentQuestionIndex: number;

  answers: QuizAnswer[];
};

/*
 * ==================================================
 * localStorage
 * ==================================================
 */

const STORAGE_KEY = "laboratoryQuizState";

/*
 * ==================================================
 * 数値変換
 * ==================================================
 *
 * Google Sheets APIから取得した値は
 * 文字列として渡ってくる。
 *
 * そのためここでNumber()を使って
 * 数値へ変換する。
 */

function parseNumber(value: unknown): number {
  if (value === null || value === undefined) {
    return 0;
  }

  const text = String(value).trim();

  if (text === "") {
    return 0;
  }

  const number = Number(text);

  if (!Number.isFinite(number)) {
    return 0;
  }

  return number;
}

/*
 * ==================================================
 * 問題変換
 * ==================================================
 */

function convertToQuestion(item: LaboratoryData): QuizQuestion {
  const rawRowNumber = item["rowNumber"];

  const rowNumber =
    rawRowNumber !== null &&
    rawRowNumber !== undefined &&
    String(rawRowNumber).trim() !== ""
      ? Number(rawRowNumber)
      : null;

  return {
    rowNumber: Number.isFinite(rowNumber) ? rowNumber : null,

    abbreviation: String(item["略語"] ?? "").trim(),

    japaneseName: String(item["日本語名"] ?? "").trim(),

    lowerLimit: parseNumber(item["基準値下限"]),

    upperLimit: parseNumber(item["基準値上限"]),

    unit: String(item["単位"] ?? "").trim(),
  };
}

/*
 * ==================================================
 * Fisher-Yatesシャッフル
 * ==================================================
 */

function shuffle<T>(items: T[]): T[] {
  const result = [...items];

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));

    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}

/*
 * ==================================================
 * QuizState検証
 * ==================================================
 */

function isValidQuizState(value: unknown): value is QuizState {
  if (!value || typeof value !== "object") {
    return false;
  }

  const state = value as Partial<QuizState>;

  if (!Array.isArray(state.questions)) {
    return false;
  }

  if (!Array.isArray(state.answers)) {
    return false;
  }

  if (
    typeof state.currentQuestionIndex !== "number" ||
    state.currentQuestionIndex < 0
  ) {
    return false;
  }

  if (state.answers.length !== state.questions.length) {
    return false;
  }

  return true;
}

/*
 * ==================================================
 * 正誤判定
 * ==================================================
 *
 * 完全一致
 * → PERFECT
 *
 * 誤差10%以内
 * → GOOD
 *
 * それ以上
 * → BAD
 *
 * 0除算対策として
 * 正解値が0の場合は
 * 特別処理する。
 */

function judgeValue(input: number | null, correct: number): ResultLevel {
  if (input === null || !Number.isFinite(input)) {
    return null;
  }

  if (!Number.isFinite(correct)) {
    return "BAD";
  }

  /*
   * 正解値が0の場合
   *
   * 通常の検査値では基本的に発生しないが、
   * 0除算を防ぐため安全に処理する。
   *
   * 入力0なら完全一致。
   * それ以外はBAD。
   */

  if (correct === 0) {
    return input === 0 ? "PERFECT" : "BAD";
  }

  /*
   * 完全一致
   */

  if (input === correct) {
    return "PERFECT";
  }

  /*
   * 相対誤差
   */

  const errorRate = Math.abs(input - correct) / Math.abs(correct);

  if (errorRate <= 0.1) {
    return "GOOD";
  }

  return "BAD";
}

/*
 * ==================================================
 * PDF出力
 * ==================================================
 */

/*
 * ==================================================
 * コンポーネント
 * ==================================================
 */

export default function LaboratoryQuiz({ data }: Props) {
  /*
   * =========================
   * 出題問題数
   * =========================
   */

  const [questionCount, setQuestionCount] = useState(5);

  /*
   * =========================
   * クイズ状態
   * =========================
   */

  const [quizState, setQuizState] = useState<QuizState | null>(null);

  /*
   * =========================
   * 入力値
   * =========================
   */

  const [lowerInput, setLowerInput] = useState("");

  const [upperInput, setUpperInput] = useState("");

  /*
   * =========================
   * localStorage確認
   * =========================
   */

  const [storageChecked, setStorageChecked] = useState(false);

  /*
   * ==================================================
   * 初回読み込み
   * ==================================================
   */

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);

      if (!saved) {
        setStorageChecked(true);

        return;
      }

      const parsed: unknown = JSON.parse(saved);

      if (isValidQuizState(parsed)) {
        setQuizState(parsed);

        const answer = parsed.answers[parsed.currentQuestionIndex];

        if (answer) {
          setLowerInput(
            answer.lowerValue !== null ? String(answer.lowerValue) : "",
          );

          setUpperInput(
            answer.upperValue !== null ? String(answer.upperValue) : "",
          );
        }
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    } finally {
      setStorageChecked(true);
    }
  }, []);

  /*
   * ==================================================
   * クイズ状態保存
   * ==================================================
   */

  useEffect(() => {
    if (!storageChecked) {
      return;
    }

    if (quizState === null) {
      localStorage.removeItem(STORAGE_KEY);

      return;
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(quizState));
  }, [quizState, storageChecked]);

  /*
   * ==================================================
   * 出題開始
   * ==================================================
   */

  function handleStart() {
    /*
     * =========================
     * 問題変換
     * =========================
     */

    const targetQuestions = data.map(convertToQuestion);

    /*
     * =========================
     * シャッフル
     * =========================
     */

    const shuffled = shuffle(targetQuestions);

    /*
     * =========================
     * 問題数決定
     * =========================
     */

    const finalQuestions =
      questionCount === -1 ? shuffled : shuffled.slice(0, questionCount);

    /*
     * =========================
     * 回答状態
     * =========================
     */

    const answers = finalQuestions.map(() => ({
      lowerValue: null,

      upperValue: null,

      lowerResult: null,

      upperResult: null,
    }));

    /*
     * =========================
     * クイズ状態
     * =========================
     */

    const newQuizState: QuizState = {
      questionCount,

      questions: finalQuestions,

      currentQuestionIndex: 0,

      answers,
    };

    /*
     * =========================
     * 入力欄リセット
     * =========================
     */

    setLowerInput("");

    setUpperInput("");

    /*
     * =========================
     * クイズ開始
     * =========================
     */

    setQuizState(newQuizState);
  }

  /*
   * ==================================================
   * localStorage確認中
   * ==================================================
   */

  if (!storageChecked) {
    return null;
  }

  /*
   * ==================================================
   * クイズ中
   * ==================================================
   */

  if (quizState !== null) {
    const currentQuestion = quizState.questions[quizState.currentQuestionIndex];

    /*
     * ==================================================
     * 結果画面
     * ==================================================
     */

    if (!currentQuestion) {
      /*
       * =========================
       * PERFECT数
       * =========================
       */

      const perfectCount = quizState.answers.filter(
        (answer) =>
          answer.lowerResult === "PERFECT" || answer.upperResult === "PERFECT",
      ).length;

      /*
       * =========================
       * 正解問題数
       * =========================
       *
       * GOOD以上なら正解。
       *
       * 両方ある場合は
       * 下限・上限ともGOOD以上
       * で正解とする。
       */

      const correctCount = quizState.questions.filter((question, index) => {
        const answer = quizState.answers[index];

        const lowerCorrect =
          question.lowerLimit === 0 ||
          answer.lowerResult === "PERFECT" ||
          answer.lowerResult === "GOOD";

        const upperCorrect =
          question.upperLimit === 0 ||
          answer.upperResult === "PERFECT" ||
          answer.upperResult === "GOOD";

        return lowerCorrect && upperCorrect;
      }).length;

      /*
       * =========================
       * 不正解
       * =========================
       */

      const incorrectCount = quizState.questions.filter((question, index) => {
        const answer = quizState.answers[index];

        const lowerAnswered =
          question.lowerLimit === 0 || answer.lowerValue !== null;

        const upperAnswered =
          question.upperLimit === 0 || answer.upperValue !== null;

        const lowerCorrect =
          question.lowerLimit === 0 ||
          answer.lowerResult === "PERFECT" ||
          answer.lowerResult === "GOOD";

        const upperCorrect =
          question.upperLimit === 0 ||
          answer.upperResult === "PERFECT" ||
          answer.upperResult === "GOOD";

        return (
          lowerAnswered && upperAnswered && (!lowerCorrect || !upperCorrect)
        );
      }).length;

      /*
       * =========================
       * 未回答
       * =========================
       */

      const unansweredCount = quizState.questions.filter((question, index) => {
        const answer = quizState.answers[index];

        const lowerUnanswered =
          question.lowerLimit !== 0 && answer.lowerValue === null;

        const upperUnanswered =
          question.upperLimit !== 0 && answer.upperValue === null;

        return lowerUnanswered || upperUnanswered;
      }).length;

      /*
       * =========================
       * PERFECT率
       * =========================
       *
       * 問題数を分母とする。
       *
       * 未回答も分母から除外しない。
       */

      const perfectRate =
        quizState.questions.length > 0
          ? (perfectCount / quizState.questions.length) * 100
          : 0;

      return (
        <main className={styles.container}>
          <div className={styles.card}>
            <h1 className={styles.heading}>🧪 検査値クイズ 結果</h1>

            {/* =========================
                集計
            ========================== */}

            <div className={styles.resultSummary}>
              <div className={styles.summaryItem}>
                <span className={styles.summaryLabel}>問題数</span>

                <span className={styles.summaryValue}>
                  {quizState.questions.length}
                </span>
              </div>

              <div className={styles.summaryItem}>
                <span className={styles.summaryLabel}>正解</span>

                <span className={styles.summaryValue}>{correctCount}</span>
              </div>

              <div className={styles.summaryItem}>
                <span className={styles.summaryLabel}>不正解</span>

                <span className={styles.summaryValue}>{incorrectCount}</span>
              </div>

              <div className={styles.summaryItem}>
                <span className={styles.summaryLabel}>未回答</span>

                <span className={styles.summaryValue}>{unansweredCount}</span>
              </div>

              <div className={styles.summaryItem}>
                <span className={styles.summaryLabel}>PERFECT率</span>

                <span className={styles.summaryValue}>
                  {perfectRate.toFixed(1)}%
                </span>
              </div>
            </div>

            {/* =========================
                結果表
            ========================== */}

            <div className={styles.resultTableWrapper}>
              <table className={styles.resultTable}>
                <thead>
                  <tr>
                    <th>問題</th>

                    <th>正解基準値</th>

                    <th>回答</th>

                    <th>判定</th>
                  </tr>
                </thead>

                <tbody>
                  {quizState.questions.map((question, index) => {
                    const answer = quizState.answers[index];

                    const correctRange =
                      question.lowerLimit !== 0 && question.upperLimit !== 0
                        ? `${question.lowerLimit} ～ ${question.upperLimit}`
                        : question.lowerLimit !== 0
                          ? `${question.lowerLimit} ～`
                          : `～ ${question.upperLimit}`;

                    const lowerAnswer =
                      question.lowerLimit !== 0
                        ? (answer.lowerValue ?? "未回答")
                        : "－";

                    const upperAnswer =
                      question.upperLimit !== 0
                        ? (answer.upperValue ?? "未回答")
                        : "－";

                    const lowerResult =
                      question.lowerLimit !== 0
                        ? (answer.lowerResult ?? "未回答")
                        : "－";

                    const upperResult =
                      question.upperLimit !== 0
                        ? (answer.upperResult ?? "未回答")
                        : "－";

                    return (
                      <tr key={`${question.rowNumber}-${index}`}>
                        <td>
                          {question.abbreviation}
                          <br />
                          {question.japaneseName}
                        </td>

                        <td>
                          {correctRange}
                          <br />
                          {question.unit}
                        </td>

                        <td>
                          下限：
                          {lowerAnswer}
                          <br />
                          上限：
                          {upperAnswer}
                        </td>

                        <td>
                          下限：
                          {lowerResult}
                          <br />
                          上限：
                          {upperResult}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* =========================
                結果操作
            ========================== */}

            <div className={styles.resultActions}>
              <button
                type="button"
                className={styles.primaryButton}
                onClick={() =>
                  printLaboratoryQuizResult(
                    quizState,
                    perfectCount,
                    correctCount,
                    incorrectCount,
                    unansweredCount,
                    perfectRate,
                  )
                }
              >
                PDF出力
              </button>

              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => {
                  localStorage.removeItem(STORAGE_KEY);

                  setQuizState(null);

                  setLowerInput("");

                  setUpperInput("");
                }}
              >
                再度出題
              </button>

              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => {
                  localStorage.removeItem(STORAGE_KEY);

                  setQuizState(null);

                  setLowerInput("");

                  setUpperInput("");
                }}
              >
                閉じる
              </button>
            </div>
          </div>
        </main>
      );
    }

    /*
     * ==================================================
     * 現在の回答
     * ==================================================
     */

    const currentAnswer = quizState.answers[quizState.currentQuestionIndex];

    /*
     * ==================================================
     * 回答済みか
     * ==================================================
     */

    const hasAnswered =
      currentAnswer?.lowerResult !== null ||
      currentAnswer?.upperResult !== null;

    /*
     * ==================================================
     * 回答処理
     * ==================================================
     */

    function handleAnswer() {
      /*
       * =========================
       * 入力値取得
       * =========================
       */

      const lowerValue =
        currentQuestion.lowerLimit !== 0 ? Number(lowerInput) : null;

      const upperValue =
        currentQuestion.upperLimit !== 0 ? Number(upperInput) : null;

      /*
       * =========================
       * 入力チェック
       * =========================
       */

      if (
        currentQuestion.lowerLimit !== 0 &&
        (!Number.isFinite(lowerValue) || lowerInput.trim() === "")
      ) {
        alert("下限値を入力してください。");

        return;
      }

      if (
        currentQuestion.upperLimit !== 0 &&
        (!Number.isFinite(upperValue) || upperInput.trim() === "")
      ) {
        alert("上限値を入力してください。");

        return;
      }

      /*
       * =========================
       * 正誤判定
       * =========================
       */

      const lowerResult =
        currentQuestion.lowerLimit !== 0
          ? judgeValue(lowerValue, currentQuestion.lowerLimit)
          : null;

      const upperResult =
        currentQuestion.upperLimit !== 0
          ? judgeValue(upperValue, currentQuestion.upperLimit)
          : null;

      /*
       * =========================
       * 保存
       * =========================
       */

      setQuizState((current) => {
        if (!current) {
          return current;
        }

        const answers = [...current.answers];

        answers[current.currentQuestionIndex] = {
          lowerValue,

          upperValue,

          lowerResult,

          upperResult,
        };

        return {
          ...current,

          answers,
        };
      });
    }

    /*
     * ==================================================
     * 次の問題
     * ==================================================
     */

    function handleNextQuestion() {
      setLowerInput("");

      setUpperInput("");

      setQuizState((current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,

          currentQuestionIndex: current.currentQuestionIndex + 1,
        };
      });
    }

    /*
     * ==================================================
     * 問題スキップ
     * ==================================================
     *
     * 回答せず次へ進む。
     *
     * 回答状態はnullのまま。
     */

    function handleSkip() {
      setLowerInput("");

      setUpperInput("");

      setQuizState((current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,

          currentQuestionIndex: current.currentQuestionIndex + 1,
        };
      });
    }

    /*
     * ==================================================
     * 中断
     * ==================================================
     */

    function handleAbort() {
      if (window.confirm("クイズを中断して結果画面へ移動しますか？")) {
        setQuizState((current) => {
          if (!current) {
            return current;
          }

          return {
            ...current,

            currentQuestionIndex: current.questions.length,
          };
        });
      }
    }

    /*
     * ==================================================
     * クイズ画面
     * ==================================================
     */

    return (
      <main className={styles.container}>
        <div className={styles.card}>
          {/* =========================
              ヘッダー
          ========================== */}

          <div className={styles.questionHeader}>
            <h1 className={styles.heading}>🧪 検査値クイズ</h1>

            <div className={styles.questionNumber}>
              {quizState.currentQuestionIndex + 1} /{" "}
              {quizState.questions.length}
            </div>
          </div>

          {/* =========================
              問題
          ========================== */}

          <div className={styles.question}>
            <div className={styles.questionLabel}>この検査値の基準値は？</div>

            <p className={styles.questionText}>
              {currentQuestion.abbreviation}
            </p>

            <div className={styles.questionName}>
              {currentQuestion.japaneseName}
            </div>

            {currentQuestion.unit && (
              <div className={styles.unit}>
                単位：
                {currentQuestion.unit}
              </div>
            )}
          </div>

          {/* =========================
              未回答
          ========================== */}

          {!hasAnswered && (
            <div className={styles.answerArea}>
              {/* =========================
                  下限
              ========================== */}

              {currentQuestion.lowerLimit !== 0 && (
                <div className={styles.valueInputGroup}>
                  <label className={styles.valueLabel}>下限</label>

                  <input
                    type="text"
                    inputMode="decimal"
                    className={styles.answerInput}
                    value={lowerInput}
                    onChange={(e) => setLowerInput(e.target.value)}
                    placeholder="下限値"
                  />
                </div>
              )}

              {/* =========================
                  上限
              ========================== */}

              {currentQuestion.upperLimit !== 0 && (
                <div className={styles.valueInputGroup}>
                  <label className={styles.valueLabel}>上限</label>

                  <input
                    type="text"
                    inputMode="decimal"
                    className={styles.answerInput}
                    value={upperInput}
                    onChange={(e) => setUpperInput(e.target.value)}
                    placeholder="上限値"
                  />
                </div>
              )}

              {/* =========================
                  操作
              ========================== */}

              <div className={styles.quizActions}>
                <button
                  type="button"
                  className={styles.primaryButton}
                  onClick={handleAnswer}
                >
                  回答する
                </button>

                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={handleSkip}
                >
                  次の問題へスキップ
                </button>

                <button
                  type="button"
                  className={styles.dangerButton}
                  onClick={handleAbort}
                >
                  中断
                </button>
              </div>
            </div>
          )}

          {/* =========================
              正誤表示
          ========================== */}

          {hasAnswered && (
            <>
              {/* =========================
                  下限判定
              ========================== */}

              {currentQuestion.lowerLimit !== 0 && (
                <div
                  className={
                    currentAnswer.lowerResult === "PERFECT"
                      ? styles.correct
                      : currentAnswer.lowerResult === "GOOD"
                        ? styles.good
                        : styles.incorrect
                  }
                >
                  <div>
                    {currentAnswer.lowerResult === "PERFECT"
                      ? "⭕ PERFECT"
                      : currentAnswer.lowerResult === "GOOD"
                        ? "🟢 GOOD"
                        : "❌ BAD"}
                  </div>

                  <div className={styles.correctAnswer}>
                    下限：
                    {currentQuestion.lowerLimit}
                  </div>
                </div>
              )}

              {/* =========================
                  上限判定
              ========================== */}

              {currentQuestion.upperLimit !== 0 && (
                <div
                  className={
                    currentAnswer.upperResult === "PERFECT"
                      ? styles.correct
                      : currentAnswer.upperResult === "GOOD"
                        ? styles.good
                        : styles.incorrect
                  }
                >
                  <div>
                    {currentAnswer.upperResult === "PERFECT"
                      ? "⭕ PERFECT"
                      : currentAnswer.upperResult === "GOOD"
                        ? "🟢 GOOD"
                        : "❌ BAD"}
                  </div>

                  <div className={styles.correctAnswer}>
                    上限：
                    {currentQuestion.upperLimit}
                  </div>
                </div>
              )}

              {/* =========================
                  次の問題
              ========================== */}

              <div className={styles.quizActions}>
                <button
                  type="button"
                  className={styles.primaryButton}
                  onClick={handleNextQuestion}
                >
                  {quizState.currentQuestionIndex + 1 <
                  quizState.questions.length
                    ? "次の問題へ"
                    : "結果を見る"}
                </button>

                <button
                  type="button"
                  className={styles.dangerButton}
                  onClick={handleAbort}
                >
                  中断
                </button>
              </div>
            </>
          )}
        </div>
      </main>
    );
  }

  /*
   * ==================================================
   * 出題設定画面
   * ==================================================
   */

  return (
    <main className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.heading}>🧪 検査値クイズ</h1>

        {/* =========================
            出題問題数
        ========================== */}

        <section className={styles.settingSection}>
          <h2 className={styles.settingTitle}>1. 出題問題数</h2>

          <div className={styles.radioGroup}>
            {QUESTION_COUNTS.map((item) => (
              <label key={item.value} className={styles.radioLabel}>
                <input
                  type="radio"
                  name="questionCount"
                  value={item.value}
                  checked={questionCount === item.value}
                  onChange={() => setQuestionCount(item.value)}
                />

                {item.label}
              </label>
            ))}
          </div>
        </section>

        {/* =========================
            出題開始
        ========================== */}

        <button
          type="button"
          className={styles.primaryButton}
          onClick={handleStart}
        >
          出題開始
        </button>
      </div>
    </main>
  );
}
