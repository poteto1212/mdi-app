"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./abbreviationquiz.module.css";
import {
  printAbbreviationQuizPaper,
  printAbbreviationQuizResult,
} from "@/lib/pdf/abbreviationQuizPdf";

/*

==================================================
データ型
==================================================
*/

type Abbreviation = {
  [key: string]: string | number | null | undefined;
};

type Props = {
  data: Abbreviation[];
};

/*

==================================================
出題問題数
==================================================
*/

const QUESTION_COUNTS = [
  { value: 5, label: "5問" },
  { value: 10, label: "10問" },
  { value: -1, label: "全問" },
];

/*

==================================================
回答形式
==================================================
*/

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

/*

==================================================
出題カテゴリ
==================================================
*/

type CategoryMode = "all" | "category" | "law";

/*

==================================================
クイズ問題
==================================================
*/

type QuizQuestion = {
  rowNumber: number | null;

  abbreviation: string;

  japaneseName: string;

  category: string;

  area: string;
};

/*

==================================================
クイズ回答
==================================================
*/

type QuizAnswer = {
  /*

ユーザーが実際に選択した回答


未回答
→ null
*/
  selectedValue: string | null;

  /*

正誤判定


未回答
→ null
正解
→ true
不正解
→ false
*/
  isCorrect: boolean | null;
};

/*

==================================================
クイズ状態
==================================================
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

==================================================
localStorage
==================================================
*/

const STORAGE_KEY = "abbreviationQuizState";

/*

==================================================
表記補正
==================================================


・前後空白を除去
・大文字 / 小文字を無視
・ひらがな / カタカナを同一視
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

==================================================
正答取得
==================================================


回答形式によって
正しい答えを取得する。
*/

function getCorrectAnswer(
  question: QuizQuestion,
  answerMode: AnswerMode,
): string {
  if (answerMode === "abbreviation-to-japanese") {
    return question.japaneseName;
  }

  return question.abbreviation;
}

/*

==================================================
正誤判定
==================================================
*/

function judgeAnswer(
  selectedValue: string | null,
  question: QuizQuestion,
  answerMode: AnswerMode,
): boolean | null {
  /*

回答がない場合
*/

  if (!selectedValue) {
    return null;
  }

  /*

正答取得
*/

  const correctAnswer = getCorrectAnswer(question, answerMode);

  /*

表記を補正して比較
*/

  return normalize(selectedValue) === normalize(correctAnswer);
}

/*

==================================================
元データ → クイズ問題
==================================================
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

==================================================
Fisher-Yatesシャッフル
==================================================
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

==================================================
QuizState検証
==================================================
*/

function isValidQuizState(value: unknown): value is QuizState {
  if (!value || typeof value !== "object") {
    return false;
  }

  const state = value as Partial<QuizState>;

  /*

回答形式
*/

  if (
    state.answerMode !== "abbreviation-to-japanese" &&
    state.answerMode !== "japanese-to-abbreviation"
  ) {
    return false;
  }

  /*

カテゴリモード
*/

  if (
    state.categoryMode !== "all" &&
    state.categoryMode !== "category" &&
    state.categoryMode !== "law"
  ) {
    return false;
  }

  /*

選択カテゴリ
*/

  if (!Array.isArray(state.selectedCategories)) {
    return false;
  }

  /*

問題
*/

  if (!Array.isArray(state.questions)) {
    return false;
  }

  /*

現在の問題番号
*/

  if (
    typeof state.currentQuestionIndex !== "number" ||
    state.currentQuestionIndex < 0
  ) {
    return false;
  }

  /*

回答
*/

  if (!Array.isArray(state.answers)) {
    return false;
  }

  if (state.answers.length !== state.questions.length) {
    return false;
  }

  /*

各回答の形式も確認
*/

  for (const answer of state.answers) {
    if (!answer || typeof answer !== "object") {
      return false;
    }

    if (
      answer.selectedValue !== null &&
      typeof answer.selectedValue !== "string"
    ) {
      return false;
    }

    if (answer.isCorrect !== null && typeof answer.isCorrect !== "boolean") {
      return false;
    }
  }

  return true;
}

/*

==================================================
コンポーネント
==================================================
*/

export default function AbbreviationQuiz({ data }: Props) {
  /*

==================================================
出題設定
==================================================
*/

  const [questionCount, setQuestionCount] = useState(5);

  const [answerMode, setAnswerMode] = useState<AnswerMode>(
    "abbreviation-to-japanese",
  );

  const [categoryMode, setCategoryMode] = useState<CategoryMode>("all");

  const [categorySearch, setCategorySearch] = useState("");

  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  /*

==================================================
クイズ状態
==================================================
*/

  const [quizState, setQuizState] = useState<QuizState | null>(null);

  /*

==================================================
回答検索
==================================================
*/

  const [answerSearch, setAnswerSearch] = useState("");

  /*

==================================================
localStorage確認
==================================================
*/

  const [storageChecked, setStorageChecked] = useState(false);

  /*

==================================================
初回読み込み
==================================================
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

        /*
         * 復元時、
         * 現在の回答があれば検索欄にも表示する。
         */

        const currentAnswer = parsed.answers[parsed.currentQuestionIndex];

        if (currentAnswer?.selectedValue) {
          setAnswerSearch(currentAnswer.selectedValue);
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

==================================================
クイズ状態保存
==================================================
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

==================================================
病態領域一覧
==================================================
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

==================================================
病態領域候補
==================================================
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

==================================================
カテゴリ切り替え
==================================================
*/

  function changeCategoryMode(mode: CategoryMode) {
    setCategoryMode(mode);

    /*
     * モード変更時は
     * 領域選択をリセットする。
     */

    setSelectedCategories([]);

    setCategorySearch("");
  }

  /*

==================================================
領域選択
==================================================
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

==================================================
クイズ問題作成
==================================================
*/

  function createQuizQuestions(): QuizQuestion[] | null {
    /*
     * ==================================================
     * 病態領域別なのに未選択
     * ==================================================
     */

    if (categoryMode === "category" && selectedCategories.length === 0) {
      alert("領域を1つ以上選択してください");

      return null;
    }

    /*
     * ==================================================
     * 出題対象
     * ==================================================
     */

    let targetData = data;

    /*
     * ==================================================
     * 病態領域別
     * ==================================================
     */

    if (categoryMode === "category") {
      targetData = data.filter((item) => {
        const area = String(item["病態領域"] ?? "").trim();

        return selectedCategories.includes(area);
      });
    }

    /*
     * ==================================================
     * 法規制度
     * ==================================================
     */

    if (categoryMode === "law") {
      targetData = data.filter((item) => {
        return String(item["カテゴリ"] ?? "").trim() === "法規制度";
      });
    }

    /*
     * ==================================================
     * クイズ問題へ変換
     * ==================================================
     */

    const targetQuestions = targetData.map(convertToQuestion);

    /*
     * ==================================================
     * ランダム抽選
     * ==================================================
     */

    const shuffled = shuffle(targetQuestions);

    /*
     * ==================================================
     * 問題数決定
     * ==================================================
     */

    const finalQuestions =
      questionCount === -1 ? shuffled : shuffled.slice(0, questionCount);

    return finalQuestions;
  }

  /*

==================================================
出題開始
==================================================
*/

  function handleStart() {
    const finalQuestions = createQuizQuestions();

    if (!finalQuestions) {
      return;
    }

    /*
     * =========================
     * 回答状態
     * =========================
     */

    const answers: QuizAnswer[] = finalQuestions.map(() => ({
      selectedValue: null,

      isCorrect: null,
    }));

    /*
     * =========================
     * クイズ状態
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
     * =========================
     * 回答検索欄リセット
     * =========================
     */

    setAnswerSearch("");

    /*
     * =========================
     * クイズ開始
     * =========================
     */

    setQuizState(newQuizState);
  }

  /*

==================================================
出題PDF
==================================================
*/

  function handlePrintPaper() {
    const finalQuestions = createQuizQuestions();

    if (!finalQuestions) {
      return;
    }

    const paperQuizState: QuizState = {
      questionCount,

      answerMode,

      categoryMode,

      selectedCategories: [...selectedCategories],

      questions: finalQuestions,

      currentQuestionIndex: 0,

      answers: finalQuestions.map(() => ({
        selectedValue: null,

        isCorrect: null,
      })),
    };

    printAbbreviationQuizPaper(paperQuizState);
  }

  /*

==================================================
回答候補
==================================================


今回の出題問題だけではなく、
全データから候補を取得する。
*/

  const answerCandidates = useMemo(() => {
    if (!quizState) {
      return [];
    }

    const searchText = normalize(answerSearch);

    /*
     * 検索文字がなければ候補を表示しない。
     */

    if (!searchText) {
      return [];
    }

    /*
     * ==================================================
     * 略語 → 日本語名
     * ==================================================
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
     * ==================================================
     * 日本語名 → 略語
     * ==================================================
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

==================================================
回答候補選択
==================================================
*/

  function handleSelectAnswer(candidate: string) {
    setQuizState((current) => {
      if (!current) {
        return current;
      }

      const currentAnswer = current.answers[current.currentQuestionIndex];

      /*
       * すでに回答済みなら変更しない。
       */

      if (currentAnswer?.isCorrect !== null) {
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

    setAnswerSearch(candidate);
  }

  /*

==================================================
回答する
==================================================
*/

  function handleAnswer() {
    setQuizState((current) => {
      if (!current) {
        return current;
      }

      const question = current.questions[current.currentQuestionIndex];

      const answer = current.answers[current.currentQuestionIndex];

      /*
       * 問題または回答が存在しない場合
       */

      if (!question || !answer) {
        return current;
      }

      /*
       * 回答未選択
       */

      if (!answer.selectedValue) {
        return current;
      }

      /*
       * すでに回答済み
       */

      if (answer.isCorrect !== null) {
        return current;
      }

      /*
       * ==================================================
       * 正誤判定
       * ==================================================
       */

      const isCorrect = judgeAnswer(
        answer.selectedValue,

        question,

        current.answerMode,
      );

      /*
       * ==================================================
       * 回答結果保存
       * ==================================================
       */

      const answers = [...current.answers];

      answers[current.currentQuestionIndex] = {
        selectedValue: answer.selectedValue,

        isCorrect,
      };

      return {
        ...current,

        answers,
      };
    });
  }

  /*

==================================================
次の問題
==================================================
*/

  function handleNextQuestion() {
    setAnswerSearch("");

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

==================================================
スキップ
==================================================
*/

  function handleSkip() {
    setAnswerSearch("");

    setQuizState((current) => {
      if (!current) {
        return current;
      }

      /*
       * 回答状態は変更しない。
       *
       * selectedValue: null
       * isCorrect: null
       *
       * のまま次へ進む。
       */

      return {
        ...current,

        currentQuestionIndex: current.currentQuestionIndex + 1,
      };
    });
  }

  /*

==================================================
中断
==================================================
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

==================================================
localStorage確認中
==================================================
*/

  if (!storageChecked) {
    return null;
  }

  /*

==================================================
クイズ中
==================================================
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
       * 正解数
       * =========================
       */

      const correctCount = quizState.answers.filter(
        (answer) => answer.isCorrect === true,
      ).length;

      /*
       * =========================
       * 不正解数
       * =========================
       */

      const incorrectCount = quizState.answers.filter(
        (answer) => answer.isCorrect === false,
      ).length;

      /*
       * =========================
       * 未回答数
       * =========================
       */

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

                    const correctAnswer = getCorrectAnswer(
                      question,

                      quizState.answerMode,
                    );

                    return (
                      <tr key={`${question.rowNumber}-${index}`}>
                        {/* 問題 */}

                        <td>{questionText}</td>

                        {/* 回答 */}

                        <td>{answer.selectedValue || "未回答"}</td>

                        {/* 正答 */}

                        <td>{correctAnswer}</td>

                        {/* 正誤 */}

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
              {/* PDF */}

              <button
                type="button"
                className={styles.primaryButton}
                onClick={() =>
                  printAbbreviationQuizResult(
                    quizState,

                    correctCount,

                    incorrectCount,

                    unansweredCount,
                  )
                }
              >
                結果PDF
              </button>

              {/* 再度出題 */}

              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => {
                  localStorage.removeItem(STORAGE_KEY);

                  setQuizState(null);

                  setAnswerSearch("");
                }}
              >
                再度出題
              </button>

              {/* 閉じる */}

              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => {
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

    const correctAnswer = getCorrectAnswer(
      currentQuestion,

      quizState.answerMode,
    );

    /*
     * ==================================================
     * 回答済みか
     * ==================================================
     */

    const hasAnswered = currentAnswer?.isCorrect !== null;

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
          回答前
      ========================== */}

          {!hasAnswered && (
            <div className={styles.answerArea}>
              {/* =========================
              回答検索
          ========================== */}

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
                  setAnswerSearch(e.target.value);

                  /*
                   * 検索文字を変更したら
                   * 現在の選択を解除する。
                   */

                  setQuizState((current) => {
                    if (!current) {
                      return current;
                    }

                    const currentAnswer =
                      current.answers[current.currentQuestionIndex];

                    /*
                     * すでに回答済みなら変更しない。
                     */

                    if (currentAnswer?.isCorrect !== null) {
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
                      onClick={() => handleSelectAnswer(candidate)}
                    >
                      {candidate}
                    </button>
                  ))}
                </div>
              )}

              {/* =========================
              候補なし
          ========================== */}

              {answerSearch.trim() !== "" && answerCandidates.length === 0 && (
                <div className={styles.noCategory}>
                  該当する候補がありません
                </div>
              )}

              {/* =========================
              選択中
          ========================== */}

              {currentAnswer?.selectedValue && (
                <div className={styles.selectedCandidate}>
                  選択中：
                  {currentAnswer.selectedValue}
                </div>
              )}

              {/* =========================
              操作
          ========================== */}

              <div className={styles.quizActions}>
                {/* 回答 */}

                <button
                  type="button"
                  className={styles.primaryButton}
                  disabled={!currentAnswer?.selectedValue}
                  onClick={handleAnswer}
                >
                  回答する
                </button>

                {/* スキップ */}

                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={handleSkip}
                >
                  {quizState.currentQuestionIndex + 1 <
                  quizState.questions.length
                    ? "次の問題へスキップ"
                    : "スキップして結果を見る"}
                </button>

                {/* 中断 */}

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
          回答後
      ========================== */}

          {hasAnswered && (
            <>
              {/* =========================
              正誤
          ========================== */}

              {currentAnswer.isCorrect ? (
                <div className={styles.correct}>
                  <div>⭕ 正解！</div>

                  <div className={styles.correctAnswer}>
                    あなたの回答：
                    {currentAnswer.selectedValue}
                  </div>

                  <div className={styles.correctAnswer}>
                    正答：
                    {correctAnswer}
                  </div>
                </div>
              ) : (
                <div className={styles.incorrect}>
                  <div>❌ 不正解</div>

                  <div className={styles.correctAnswer}>
                    あなたの回答：
                    {currentAnswer.selectedValue}
                  </div>

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
                  onClick={handleNextQuestion}
                >
                  {quizState.currentQuestionIndex + 1 <
                  quizState.questions.length
                    ? "次の問題へ"
                    : "結果を見る"}
                </button>

                {/* =========================
                中断
            ========================== */}

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

==================================================
出題設定画面
==================================================
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
        病態領域別設定
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
          className={styles.secondaryButton}
          onClick={handlePrintPaper}
        >
          問題をPDF出力
        </button>

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
