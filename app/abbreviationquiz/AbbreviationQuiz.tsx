"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./abbreviationquiz.module.css";

type Abbreviation = {
  [key: string]: string | number | null | undefined;
};

type Props = {
  data: Abbreviation[];
};

const QUESTION_COUNTS = [
  { value: 5, label: "5問" },
  { value: 10, label: "10問" },
  { value: -1, label: "全問" },
];

const ANSWER_MODES = [
  {
    value: "abbreviation-to-japanese",
    label: "略語名出題 → 日本語名回答",
  },
  {
    value: "japanese-to-abbreviation",
    label: "日本語名出題 → 略語回答",
  },
] as const;

type AnswerMode = (typeof ANSWER_MODES)[number]["value"];

type CategoryMode = "all" | "category" | "law";

/*
 * ==================================================
 * クイズ問題
 * ==================================================
 */

type QuizQuestion = {
  rowNumber: number | null;
  abbreviation: string;
  japaneseName: string;
  category: string;
  area: string;
};

/*
 * ==================================================
 * クイズ回答
 * ==================================================
 */

type QuizAnswer = {
  /*
   * 実際に候補から選択された値
   *
   * 未回答
   * → null
   */
  selectedValue: string | null;

  /*
   * 正誤
   *
   * 未回答
   * → null
   * 正解
   * → true
   * 不正解
   * → false
   */
  isCorrect: boolean | null;
};

/*
 * ==================================================
 * localStorageに保存するクイズ状態
 * ==================================================
 */

type QuizState = {
  questionCount: number;

  answerMode: AnswerMode;

  categoryMode: CategoryMode;

  selectedCategories: string[];

  questions: QuizQuestion[];

  currentQuestionIndex: number;

  answers: QuizAnswer[];
};

/*
 * ==================================================
 * localStorage
 * ==================================================
 */

const STORAGE_KEY = "abbreviationQuizState";

/*
 * ==================================================
 * 表記補正
 * ==================================================
 *
 * ・ひらがな / カタカナを同一視
 * ・大文字 / 小文字を無視
 * ・前後空白を除去
 */

function normalize(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[ァ-ヶ]/g, (char) =>
      String.fromCharCode(char.charCodeAt(0) - 0x60),
    );
}

/*
 * ==================================================
 * 元データ → クイズ問題
 * ==================================================
 */

function convertToQuestion(item: Abbreviation): QuizQuestion {
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

    category: String(item["カテゴリ"] ?? "").trim(),

    area: String(item["病態領域"] ?? "").trim(),
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
 * クイズ状態の検証
 * ==================================================
 */

function isValidQuizState(value: unknown): value is QuizState {
  if (!value || typeof value !== "object") {
    return false;
  }

  const state = value as Partial<QuizState>;

  if (
    state.answerMode !== "abbreviation-to-japanese" &&
    state.answerMode !== "japanese-to-abbreviation"
  ) {
    return false;
  }

  if (
    state.categoryMode !== "all" &&
    state.categoryMode !== "category" &&
    state.categoryMode !== "law"
  ) {
    return false;
  }

  if (!Array.isArray(state.selectedCategories)) {
    return false;
  }

  if (!Array.isArray(state.questions)) {
    return false;
  }

  if (
    typeof state.currentQuestionIndex !== "number" ||
    state.currentQuestionIndex < 0
  ) {
    return false;
  }

  if (!Array.isArray(state.answers)) {
    return false;
  }

  if (state.answers.length !== state.questions.length) {
    return false;
  }

  return true;
}

/*
 * ==================================================
 * PDF出力
 * ==================================================
 *
 * ブラウザの印刷機能を利用する。
 *
 * 印刷画面で
 * 「PDFとして保存」
 * を選択することでPDF化できる。
 *
 * A4縦・20問程度を1ページに収める。
 */

function printQuizResult(
  quizState: QuizState,
  correctCount: number,
  incorrectCount: number,
  unansweredCount: number,
) {
  const printWindow = window.open("", "_blank", "width=900,height=700");

  if (!printWindow) {
    alert(
      "PDF出力用のウィンドウを開けませんでした。\nブラウザのポップアップブロックを確認してください。",
    );

    return;
  }

  /*
   * ==================================================
   * 表のHTML
   * ==================================================
   */

  const rows = quizState.questions
    .map((question, index) => {
      const answer = quizState.answers[index];

      const resultText =
        answer?.isCorrect === true
          ? "正解"
          : answer?.isCorrect === false
            ? "不正解"
            : "未回答";

      const resultClass =
        answer?.isCorrect === true
          ? "correct"
          : answer?.isCorrect === false
            ? "incorrect"
            : "unanswered";

      return `
        <tr>
          <td>${escapeHtml(question.abbreviation)}</td>
          <td>${escapeHtml(question.japaneseName)}</td>
          <td>${escapeHtml(answer?.selectedValue ?? "未回答")}</td>
          <td class="${resultClass}">
            ${resultText}
          </td>
        </tr>
      `;
    })
    .join("");

  /*
   * ==================================================
   * PDF用HTML
   * ==================================================
   */

  const html = `
    <!DOCTYPE html>
    <html lang="ja">
      <head>
        <meta charset="UTF-8" />

        <title>略語クイズ結果</title>

        <style>
          @page {
            size: A4 portrait;
            margin: 10mm;
          }

          * {
            box-sizing: border-box;
          }

          html,
          body {
            margin: 0;
            padding: 0;
            width: 100%;
            font-family:
              -apple-system,
              BlinkMacSystemFont,
              "Noto Sans JP",
              "Yu Gothic",
              "Hiragino Kaku Gothic ProN",
              Meiryo,
              sans-serif;
            color: #222;
            background: #fff;
          }

          body {
            font-size: 10px;
          }

          .page {
            width: 100%;
            max-width: 190mm;
            margin: 0 auto;
          }

          h1 {
            margin: 0 0 5mm;
            text-align: center;
            font-size: 18px;
            line-height: 1.3;
          }

          .summary {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 3mm;
            margin-bottom: 5mm;
          }

          .summary-item {
            border: 1px solid #999;
            padding: 2.5mm 2mm;
            text-align: center;
          }

          .summary-label {
            display: block;
            font-size: 8px;
            margin-bottom: 1mm;
            color: #555;
          }

          .summary-value {
            display: block;
            font-size: 13px;
            font-weight: bold;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
          }

          th,
          td {
            border: 1px solid #777;
            padding: 1.8mm 1.5mm;
            vertical-align: middle;
            overflow-wrap: anywhere;
            word-break: break-word;
          }

          th {
            background: #eeeeee;
            text-align: center;
            font-weight: bold;
          }

          th:nth-child(1) {
            width: 22%;
          }

          th:nth-child(2) {
            width: 34%;
          }

          th:nth-child(3) {
            width: 29%;
          }

          th:nth-child(4) {
            width: 15%;
          }

          td:nth-child(1),
          td:nth-child(4) {
            text-align: center;
          }

          .correct {
            color: #008000;
            font-weight: bold;
          }

          .incorrect {
            color: #cc0000;
            font-weight: bold;
          }

          .unanswered {
            color: #777;
            font-weight: bold;
          }

          .footer {
            margin-top: 4mm;
            text-align: right;
            font-size: 7px;
            color: #777;
          }

          @media print {
            html,
            body {
              width: 210mm;
              min-height: 297mm;
            }

            .page {
              width: 190mm;
              max-width: 190mm;
            }
          }
        </style>
      </head>

      <body>
        <div class="page">

          <h1>略語クイズ 結果</h1>

          <div class="summary">
            <div class="summary-item">
              <span class="summary-label">問題数</span>
              <span class="summary-value">
                ${quizState.questions.length}
              </span>
            </div>

            <div class="summary-item">
              <span class="summary-label">正解数</span>
              <span class="summary-value">
                ${correctCount}
              </span>
            </div>

            <div class="summary-item">
              <span class="summary-label">不正解数</span>
              <span class="summary-value">
                ${incorrectCount}
              </span>
            </div>

            <div class="summary-item">
              <span class="summary-label">未回答数</span>
              <span class="summary-value">
                ${unansweredCount}
              </span>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>略語</th>
                <th>日本語</th>
                <th>ユーザー回答</th>
                <th>正誤</th>
              </tr>
            </thead>

            <tbody>
              ${rows}
            </tbody>
          </table>

          <div class="footer">
            略語クイズ
          </div>

        </div>
      </body>
    </html>
  `;

  /*
   * ==================================================
   * 印刷ウィンドウへ書き込み
   * ==================================================
   */

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();

  /*
   * ==================================================
   * 印刷
   * ==================================================
   *
   * DOM描画後に印刷ダイアログを開く。
   */

  printWindow.onload = () => {
    printWindow.focus();
    printWindow.print();
  };
}

/*
 * ==================================================
 * HTMLエスケープ
 * ==================================================
 *
 * スプレッドシートの値を
 * PDF用HTMLへ安全に埋め込む。
 */

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/*
 * ==================================================
 * コンポーネント
 * ==================================================
 */

export default function AbbreviationQuiz({ data }: Props) {
  /*
   * =========================
   * 出題設定
   * =========================
   */

  const [questionCount, setQuestionCount] = useState(5);

  const [answerMode, setAnswerMode] = useState<AnswerMode>(
    "abbreviation-to-japanese",
  );

  const [categoryMode, setCategoryMode] = useState<CategoryMode>("all");

  const [categorySearch, setCategorySearch] = useState("");

  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  /*
   * =========================
   * クイズ状態
   * =========================
   */

  const [quizState, setQuizState] = useState<QuizState | null>(null);

  /*
   * =========================
   * 回答候補検索文字列
   * =========================
   */

  const [answerSearch, setAnswerSearch] = useState("");

  /*
   * =========================
   * localStorage確認完了
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
   * 領域一覧
   * ==================================================
   */

  const categories = useMemo(() => {
    return Array.from(
      new Set(
        data
          .map((item) => String(item["病態領域"] ?? "").trim())
          .filter((value) => value !== ""),
      ),
    ).sort((a, b) => a.localeCompare(b, "ja"));
  }, [data]);

  /*
   * ==================================================
   * 領域候補
   * ==================================================
   */

  const filteredCategories = useMemo(() => {
    const input = categorySearch.trim().toLowerCase();

    if (!input) {
      return categories;
    }

    return categories.filter((category) =>
      category.toLowerCase().includes(input),
    );
  }, [categories, categorySearch]);

  /*
   * ==================================================
   * カテゴリ切り替え
   * ==================================================
   */

  function changeCategoryMode(mode: CategoryMode) {
    setCategoryMode(mode);

    /*
     * 全部 ↔ 領域別
     *
     * 切り替えるたびに領域選択をリセット
     */

    setSelectedCategories([]);

    setCategorySearch("");
  }

  /*
   * ==================================================
   * 領域選択
   * ==================================================
   */

  function toggleCategory(category: string) {
    setSelectedCategories((current) => {
      if (current.includes(category)) {
        return current.filter((item) => item !== category);
      }

      return [...current, category];
    });
  }

  /*
   * ==================================================
   * 出題開始
   * ==================================================
   */

  function handleStart() {
    /*
     * 領域別なのに未選択
     */

    if (categoryMode === "category" && selectedCategories.length === 0) {
      alert("領域を1つ以上選択してください");
      return;
    }

    /*
     * =========================
     * 出題対象
     * =========================
     */

    let targetData = data;

    /*
     * 領域別
     *
     * OR条件
     */

    if (categoryMode === "category") {
      targetData = data.filter((item) => {
        const area = String(item["病態領域"] ?? "").trim();

        return selectedCategories.includes(area);
      });
    }

    if (categoryMode === "law") {
      targetData = data.filter((item) => {
        return String(item["カテゴリ"] ?? "").trim() === "法規制度";
      });
    }
    /*
     * =========================
     * クイズ問題へ変換
     * =========================
     */

    const targetQuestions = targetData.map(convertToQuestion);

    /*
     * =========================
     * ランダム抽選
     * =========================
     *
     * この時点で一度だけ抽選。
     *
     * 以後はlocalStorageに保存された
     * 問題セットをそのまま使用する。
     */

    const shuffled = shuffle(targetQuestions);

    /*
     * =========================
     * 問題数決定
     * =========================
     *
     * -1 = 全問
     *
     * 問題数が足りない場合は
     * 現在ある問題をすべて使用する。
     */

    const finalQuestions =
      questionCount === -1 ? shuffled : shuffled.slice(0, questionCount);

    /*
     * =========================
     * 回答状態作成
     * =========================
     */

    const answers: QuizAnswer[] = finalQuestions.map(() => ({
      selectedValue: null,
      isCorrect: null,
    }));

    /*
     * =========================
     * クイズ状態作成
     * =========================
     */

    const newQuizState: QuizState = {
      questionCount,

      answerMode,

      categoryMode,

      selectedCategories: [...selectedCategories],

      questions: finalQuestions,

      currentQuestionIndex: 0,

      answers,
    };

    /*
     * 回答検索欄もリセット
     */

    setAnswerSearch("");

    /*
     * 問題セットを固定
     */

    setQuizState(newQuizState);
  }

  /*
   * ==================================================
   * 現在の問題の回答候補
   * ==================================================
   *
   * 回答候補は今回の出題問題だけではなく、
   * 登録されている全データから取得する。
   */

  const answerCandidates = useMemo(() => {
    if (!quizState) {
      return [];
    }

    const searchText = normalize(answerSearch);

    /*
     * 検索文字列が空なら候補を表示しない。
     */

    if (!searchText) {
      return [];
    }

    /*
     * =========================
     * 略語 → 日本語名
     * =========================
     */

    if (quizState.answerMode === "abbreviation-to-japanese") {
      const candidates = data
        .map((item) => String(item["日本語名"] ?? "").trim())
        .filter((value) => value !== "");

      const uniqueCandidates = Array.from(new Set(candidates));

      return uniqueCandidates.filter((value) =>
        normalize(value).includes(searchText),
      );
    }

    /*
     * =========================
     * 日本語名 → 略語
     * =========================
     */

    const candidates = data
      .map((item) => String(item["略語"] ?? "").trim())
      .filter((value) => value !== "");

    const uniqueCandidates = Array.from(new Set(candidates));

    return uniqueCandidates.filter((value) =>
      normalize(value).includes(searchText),
    );
  }, [data, quizState, answerSearch]);

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
      const correctCount = quizState.answers.filter(
        (answer) => answer.isCorrect === true,
      ).length;

      const incorrectCount = quizState.answers.filter(
        (answer) => answer.isCorrect === false,
      ).length;

      const unansweredCount = quizState.answers.filter(
        (answer) => answer.isCorrect === null,
      ).length;

      return (
        <main className={styles.container}>
          <div className={styles.card}>
            <h1 className={styles.heading}>🧠 略語クイズ 結果</h1>

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
            </div>

            {/* =========================
                結果表
            ========================== */}

            <div className={styles.resultTableWrapper}>
              <table className={styles.resultTable}>
                <thead>
                  <tr>
                    <th>問題</th>
                    <th>回答</th>
                    <th>正答</th>
                    <th>正誤</th>
                  </tr>
                </thead>

                <tbody>
                  {quizState.questions.map((question, index) => {
                    const answer = quizState.answers[index];

                    const questionText =
                      quizState.answerMode === "abbreviation-to-japanese"
                        ? question.abbreviation
                        : question.japaneseName;

                    const correctAnswer =
                      quizState.answerMode === "abbreviation-to-japanese"
                        ? question.japaneseName
                        : question.abbreviation;

                    return (
                      <tr key={`${question.rowNumber}-${index}`}>
                        <td>{questionText}</td>

                        <td>{answer.selectedValue || "未回答"}</td>

                        <td>{correctAnswer}</td>

                        <td>
                          {answer.isCorrect === true ? (
                            <span className={styles.resultCorrect}>正解</span>
                          ) : answer.isCorrect === false ? (
                            <span className={styles.resultIncorrect}>
                              不正解
                            </span>
                          ) : (
                            <span className={styles.resultUnanswered}>
                              未回答
                            </span>
                          )}
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
              {/* =========================
                  PDF出力
              ========================== */}

              <button
                type="button"
                className={styles.primaryButton}
                onClick={() =>
                  printQuizResult(
                    quizState,
                    correctCount,
                    incorrectCount,
                    unansweredCount,
                  )
                }
              >
                PDF出力
              </button>

              {/* =========================
                  再度出題
              ========================== */}

              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => {
                  /*
                   * 古いクイズ状態を削除
                   */

                  localStorage.removeItem(STORAGE_KEY);

                  setQuizState(null);

                  setAnswerSearch("");
                }}
              >
                再度出題
              </button>

              {/* =========================
                  閉じる
              ========================== */}

              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => {
                  /*
                   * 古いクイズ状態を削除
                   */

                  localStorage.removeItem(STORAGE_KEY);

                  setQuizState(null);

                  setAnswerSearch("");
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
     * 問題文
     * ==================================================
     */

    const questionText =
      quizState.answerMode === "abbreviation-to-japanese"
        ? currentQuestion.abbreviation
        : currentQuestion.japaneseName;

    /*
     * ==================================================
     * 正答
     * ==================================================
     */

    const correctAnswer =
      quizState.answerMode === "abbreviation-to-japanese"
        ? currentQuestion.japaneseName
        : currentQuestion.abbreviation;

    /*
     * ==================================================
     * 回答済みか
     * ==================================================
     */

    const hasAnswered = currentAnswer?.isCorrect !== null;

    return (
      <main className={styles.container}>
        <div className={styles.card}>
          {/* =========================
              ヘッダー
          ========================== */}

          <div className={styles.questionHeader}>
            <h1 className={styles.heading}>🧠 略語クイズ</h1>

            <div className={styles.questionNumber}>
              {quizState.currentQuestionIndex + 1} /{" "}
              {quizState.questions.length}
            </div>
          </div>

          {/* =========================
              問題
          ========================== */}

          <div className={styles.question}>
            <div className={styles.questionLabel}>
              {quizState.answerMode === "abbreviation-to-japanese"
                ? "この略語の意味は？"
                : "この日本語名の略語は？"}
            </div>

            <p className={styles.questionText}>{questionText}</p>
          </div>

          {/* =========================
              回答
          ========================== */}

          {!hasAnswered && (
            <div className={styles.answerArea}>
              <input
                type="text"
                className={styles.answerInput}
                placeholder={
                  quizState.answerMode === "abbreviation-to-japanese"
                    ? "日本語名を検索"
                    : "略語を検索"
                }
                value={answerSearch}
                onChange={(e) => {
                  /*
                   * 入力中は回答として保存しない。
                   */

                  setAnswerSearch(e.target.value);

                  /*
                   * 新しい検索を開始した場合、
                   * 現在の候補選択を解除。
                   */

                  setQuizState((current) => {
                    if (!current) {
                      return current;
                    }

                    const answers = [...current.answers];

                    answers[current.currentQuestionIndex] = {
                      selectedValue: null,
                      isCorrect: null,
                    };

                    return {
                      ...current,
                      answers,
                    };
                  });
                }}
                disabled={hasAnswered}
              />

              {/* =========================
                  検索候補
              ========================== */}

              {answerSearch.trim() !== "" && answerCandidates.length > 0 && (
                <div className={styles.candidateList}>
                  {answerCandidates.map((candidate) => (
                    <button
                      key={candidate}
                      type="button"
                      className={styles.candidate}
                      onClick={() => {
                        /*
                         * 候補クリック時に
                         * 元データの値を保存。
                         */

                        setQuizState((current) => {
                          if (!current) {
                            return current;
                          }

                          const answers = [...current.answers];

                          answers[current.currentQuestionIndex] = {
                            selectedValue: candidate,
                            isCorrect: null,
                          };

                          return {
                            ...current,
                            answers,
                          };
                        });

                        /*
                         * 入力欄にも
                         * 選択値を表示。
                         */

                        setAnswerSearch(candidate);
                      }}
                    >
                      {candidate}
                    </button>
                  ))}
                </div>
              )}

              {answerSearch.trim() !== "" && answerCandidates.length === 0 && (
                <div className={styles.noCategory}>
                  該当する候補がありません
                </div>
              )}

              {/* =========================
                  選択済み候補
              ========================== */}

              {currentAnswer?.selectedValue && (
                <div className={styles.selectedCandidate}>
                  選択中：
                  {currentAnswer.selectedValue}
                </div>
              )}

              {/* =========================
                  操作ボタン
              ========================== */}

              <div className={styles.quizActions}>
                {/* =========================
                    回答する
                ========================== */}

                <button
                  type="button"
                  className={styles.primaryButton}
                  disabled={!currentAnswer?.selectedValue}
                  onClick={() => {
                    setQuizState((current) => {
                      if (!current) {
                        return current;
                      }

                      const question =
                        current.questions[current.currentQuestionIndex];

                      const answer =
                        current.answers[current.currentQuestionIndex];

                      /*
                       * 候補未選択なら回答不可。
                       */

                      if (!answer?.selectedValue) {
                        return current;
                      }

                      /*
                       * 正誤判定。
                       *
                       * 問題元レコードの
                       * 正答値と比較する。
                       */

                      const correct =
                        normalize(answer.selectedValue) ===
                        normalize(
                          current.answerMode === "abbreviation-to-japanese"
                            ? question.japaneseName
                            : question.abbreviation,
                        );

                      const answers = [...current.answers];

                      answers[current.currentQuestionIndex] = {
                        selectedValue: answer.selectedValue,
                        isCorrect: correct,
                      };

                      return {
                        ...current,
                        answers,
                      };
                    });
                  }}
                >
                  回答する
                </button>

                {/* =========================
                    次の問題へスキップ
                ========================== */}

                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={() => {
                    /*
                     * 検索欄をリセット
                     */

                    setAnswerSearch("");

                    /*
                     * 回答状態は変更しない。
                     *
                     * selectedValue: null
                     * isCorrect: null
                     *
                     * のまま次の問題へ進むため、
                     * 結果画面では「未回答」として扱われる。
                     */

                    setQuizState((current) => {
                      if (!current) {
                        return current;
                      }

                      const nextIndex = current.currentQuestionIndex + 1;

                      return {
                        ...current,
                        currentQuestionIndex: nextIndex,
                      };
                    });
                  }}
                >
                  {quizState.currentQuestionIndex + 1 <
                  quizState.questions.length
                    ? "次の問題へスキップ"
                    : "スキップして結果を見る"}
                </button>

                {/* =========================
                    中断
                ========================== */}

                <button
                  type="button"
                  className={styles.dangerButton}
                  onClick={() => {
                    if (
                      window.confirm("クイズを中断して結果画面へ移動しますか？")
                    ) {
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
                  }}
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
              {currentAnswer.isCorrect ? (
                <div className={styles.correct}>
                  <div>⭕ 正解！</div>

                  <div className={styles.correctAnswer}>
                    正答：
                    {correctAnswer}
                  </div>
                </div>
              ) : (
                <div className={styles.incorrect}>
                  <div>❌ 不正解</div>

                  <div className={styles.correctAnswer}>
                    正答：
                    {correctAnswer}
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
                  onClick={() => {
                    setAnswerSearch("");

                    setQuizState((current) => {
                      if (!current) {
                        return current;
                      }

                      const nextIndex = current.currentQuestionIndex + 1;

                      return {
                        ...current,
                        currentQuestionIndex: nextIndex,
                      };
                    });
                  }}
                >
                  {quizState.currentQuestionIndex + 1 <
                  quizState.questions.length
                    ? "次の問題へ"
                    : "結果を見る"}
                </button>

                <button
                  type="button"
                  className={styles.dangerButton}
                  onClick={() => {
                    if (
                      window.confirm("クイズを中断して結果画面へ移動しますか？")
                    ) {
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
                  }}
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
        <h1 className={styles.heading}>🧠 略語クイズ</h1>

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
            回答形式
        ========================== */}

        <section className={styles.settingSection}>
          <h2 className={styles.settingTitle}>2. 回答形式</h2>

          <div className={styles.radioGroup}>
            {ANSWER_MODES.map((item) => (
              <label key={item.value} className={styles.radioLabel}>
                <input
                  type="radio"
                  name="answerMode"
                  value={item.value}
                  checked={answerMode === item.value}
                  onChange={() => setAnswerMode(item.value)}
                />

                {item.label}
              </label>
            ))}
          </div>
        </section>

        {/* =========================
            出題カテゴリ
        ========================== */}

        <section className={styles.settingSection}>
          <h2 className={styles.settingTitle}>3. 出題カテゴリ</h2>

          <div className={styles.radioGroup}>
            <label className={styles.radioLabel}>
              <input
                type="radio"
                name="categoryMode"
                checked={categoryMode === "all"}
                onChange={() => changeCategoryMode("all")}
              />
              全部
            </label>

            <label className={styles.radioLabel}>
              <input
                type="radio"
                name="categoryMode"
                checked={categoryMode === "category"}
                onChange={() => changeCategoryMode("category")}
              />
              病態領域別
            </label>
            <label className={styles.radioLabel}>
              <input
                type="radio"
                name="categoryMode"
                checked={categoryMode === "law"}
                onChange={() => changeCategoryMode("law")}
              />
              法規制度
            </label>
          </div>
        </section>

        {/* =========================
            領域別設定
        ========================== */}

        {categoryMode === "category" && (
          <section className={styles.settingSection}>
            <h3 className={styles.subHeading}>領域を選択</h3>

            <input
              type="text"
              className={styles.categorySearch}
              value={categorySearch}
              onChange={(e) => setCategorySearch(e.target.value)}
              placeholder="領域を検索"
            />

            <div className={styles.categoryList}>
              {filteredCategories.map((category) => (
                <label key={category} className={styles.categoryLabel}>
                  <input
                    type="checkbox"
                    checked={selectedCategories.includes(category)}
                    onChange={() => toggleCategory(category)}
                  />{" "}
                  {category}
                </label>
              ))}

              {filteredCategories.length === 0 && (
                <div className={styles.noCategory}>
                  該当する領域がありません
                </div>
              )}
            </div>
          </section>
        )}

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
