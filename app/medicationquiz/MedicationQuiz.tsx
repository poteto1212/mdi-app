"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./medicationquiz.module.css";

/*
 * ==================================================
 * データ型
 * ==================================================
 */

type MedicationData = {
  [key: string]: string | number | null | undefined;
};

type Props = {
  data: MedicationData[];
};

/*
 * ==================================================
 * 定数
 * ==================================================
 */

const QUESTION_COUNTS = [
  { value: 5, label: "5問" },
  { value: 10, label: "10問" },
  { value: -1, label: "全問" },
];

const DOSAGE_FORMS = ["内服", "注射", "外用"] as const;

type DosageForm = (typeof DOSAGE_FORMS)[number];

type QuizLevel = "large" | "small" | "ingredient";

/*
 * ==================================================
 * クイズ問題
 * ==================================================
 *
 * 1問分の問題情報を保持する。
 *
 * level
 *   → 大分類 / 小分類 / 成分
 *
 * questionValue
 *   → 実際に表示する分類名・成分名
 *
 * dosageForms
 *   → この問題に含まれる薬品の剤型
 *
 * correctMedications
 *   → この問題の正解となる薬品名一覧
 */

type QuizQuestion = {
  id: string;

  level: QuizLevel;

  questionValue: string;

  dosageForms: DosageForm[];

  correctMedications: string[];
};

/*
 * ==================================================
 * 回答情報
 * ==================================================
 *
 * 1問に対するユーザーの回答結果を保持する。
 */

type QuizAnswer = {
  selectedMedications: string[];

  correctMedications: string[];

  missedMedications: string[];

  extraMedications: string[];

  score: number;

  isPerfect: boolean;
};

/*
 * ==================================================
 * クイズ全体の状態
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

const STORAGE_KEY = "medicationQuizState";

/*
 * ==================================================
 * データ取得用関数
 * ==================================================
 */

function getText(item: MedicationData, key: string): string {
  return String(item[key] ?? "").trim();
}

/*
 * ==================================================
 * 剤型判定
 * ==================================================
 *
 * 薬品マスタの「剤型」列から、
 *
 * ・内服
 * ・注射
 * ・外用
 *
 * のいずれかを判定する。
 *
 * 対象外の値は null とする。
 */

function getDosageForm(item: MedicationData): DosageForm | null {
  const value = getText(item, "剤型");

  if (value === "内服" || value === "注射" || value === "外用") {
    return value;
  }

  return null;
}

/*
 * ==================================================
 * 薬品名取得
 * ==================================================
 */

function getMedicationName(item: MedicationData): string {
  return getText(item, "薬品名");
}

/*
 * ==================================================
 * 配列の重複削除
 * ==================================================
 */

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values));
}

/*
 * ==================================================
 * Fisher-Yatesシャッフル
 * ==================================================
 *
 * 配列の順番をランダムに入れ替える。
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
 *
 * localStorageから読み込んだデータが、
 * クイズ状態として利用できる形式か確認する。
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
 * 回答判定
 * ==================================================
 *
 * selectedMedications
 *   → ユーザーが選択した薬品
 *
 * correctMedications
 *   → 本来の正解薬品
 *
 * 判定結果として、
 *
 * ・正しく選択した薬品
 * ・選択できなかった正解薬品
 * ・余計に選択した薬品
 * ・点数
 * ・パーフェクトかどうか
 *
 * を返す。
 *
 * 薬品の選択順は判定に影響しない。
 */

function judgeAnswer(
  selectedMedications: string[],
  correctMedications: string[],
): {
  correctMedications: string[];
  missedMedications: string[];
  extraMedications: string[];
  score: number;
  isPerfect: boolean;
} {
  const selected = uniqueStrings(selectedMedications);
  const correct = uniqueStrings(correctMedications);

  /*
   * ユーザーが選択した薬品のうち、
   * 正解一覧にも存在する薬品を取得する。
   */

  const correctSelected = correct.filter((name) => selected.includes(name));

  /*
   * 正解一覧には存在するが、
   * ユーザーが選択しなかった薬品を取得する。
   */

  const missed = correct.filter((name) => !selected.includes(name));

  /*
   * ユーザーが選択したが、
   * 正解一覧には存在しない薬品を取得する。
   */

  const extra = selected.filter((name) => !correct.includes(name));

  /*
   * 点数計算
   *
   * 正解した薬品数
   * ---------------- × 100
   * 正解薬品の総数
   *
   * 余計な薬品を選択していても、
   * 正解した薬品数に応じた点数は付与する。
   */

  const score =
    correct.length === 0
      ? 0
      : Math.round((correctSelected.length / correct.length) * 100);

  /*
   * パーフェクト条件
   *
   * ・正解薬品をすべて選択
   * ・余計な薬品を選択していない
   */

  const isPerfect =
    correct.length > 0 && missed.length === 0 && extra.length === 0;

  return {
    correctMedications: correctSelected,
    missedMedications: missed,
    extraMedications: extra,
    score,
    isPerfect,
  };
}

/*
 * ==================================================
 * MedicationQuiz
 * ==================================================
 */

export default function MedicationQuiz({ data }: Props) {
  /*
   * ==================================================
   * 出題設定
   * ==================================================
   */

  const [quizLevel, setQuizLevel] = useState<QuizLevel>("large");

  const [questionCount, setQuestionCount] = useState(5);

  /*
   * ==================================================
   * 剤型選択
   * ==================================================
   *
   * 初期状態では、
   *
   * ・内服
   * ・注射
   * ・外用
   *
   * のすべてを選択する。
   */

  const [selectedDosageForms, setSelectedDosageForms] = useState<DosageForm[]>([
    "内服",
    "注射",
    "外用",
  ]);

  /*
   * ==================================================
   * 大分類検索・選択
   * ==================================================
   */

  const [largeCategorySearch, setLargeCategorySearch] = useState("");

  const [selectedLargeCategories, setSelectedLargeCategories] = useState<
    string[]
  >([]);

  /*
   * ==================================================
   * 小分類検索・選択
   * ==================================================
   */

  const [smallCategorySearch, setSmallCategorySearch] = useState("");

  const [selectedSmallCategories, setSelectedSmallCategories] = useState<
    string[]
  >([]);

  /*
   * ==================================================
   * 成分検索・選択
   * ==================================================
   */

  const [ingredientSearch, setIngredientSearch] = useState("");

  const [selectedIngredients, setSelectedIngredients] = useState<string[]>([]);

  /*
   * ==================================================
   * クイズ状態
   * ==================================================
   */

  const [quizState, setQuizState] = useState<QuizState | null>(null);

  const [storageChecked, setStorageChecked] = useState(false);

  /*
   * ==================================================
   * 回答検索
   * ==================================================
   */

  const [answerSearch, setAnswerSearch] = useState("");

  const [selectedAnswers, setSelectedAnswers] = useState<string[]>([]);

  /*
   * ==================================================
   * 回答済み状態
   * ==================================================
   *
   * false
   *   → 回答入力中
   *
   * true
   *   → 正誤判定済み
   */

  const [answerSubmitted, setAnswerSubmitted] = useState(false);

  /*
   * ==================================================
   * localStorage読み込み
   * ==================================================
   *
   * ページを再読み込みした場合でも、
   * 途中まで進めたクイズを復元できるようにする。
   */

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);

      if (!saved) {
        setStorageChecked(true);
        return;
      }

      const parsed: unknown = JSON.parse(saved);

      if (!isValidQuizState(parsed)) {
        localStorage.removeItem(STORAGE_KEY);
        setStorageChecked(true);
        return;
      }

      setQuizState(parsed);

      /*
       * 現在の問題に対する保存済み回答を取得する。
       */

      const currentAnswer = parsed.answers[parsed.currentQuestionIndex];

      if (currentAnswer) {
        setSelectedAnswers(currentAnswer.selectedMedications);

        /*
         * 正解・不正解のいずれかの結果が
         * 保存されている場合は回答済みとする。
         */

        const hasResult =
          currentAnswer.correctMedications.length > 0 ||
          currentAnswer.missedMedications.length > 0 ||
          currentAnswer.extraMedications.length > 0 ||
          currentAnswer.isPerfect;

        if (hasResult) {
          setAnswerSubmitted(true);
        }
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    } finally {
      setStorageChecked(true);
    }
  }, []);

  /*
   * ==================================================
   * localStorage保存
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
   * 大分類一覧
   * ==================================================
   */

  const largeCategories = useMemo(() => {
    return uniqueStrings(
      data.map((item) => getText(item, "大分類")).filter(Boolean),
    ).sort();
  }, [data]);

  /*
   * ==================================================
   * 小分類一覧
   * ==================================================
   */

  const smallCategories = useMemo(() => {
    return uniqueStrings(
      data.map((item) => getText(item, "小分類")).filter(Boolean),
    ).sort();
  }, [data]);

  /*
   * ==================================================
   * 成分一覧
   * ==================================================
   */

  const ingredients = useMemo(() => {
    return uniqueStrings(
      data.map((item) => getText(item, "成分名")).filter(Boolean),
    ).sort();
  }, [data]);

  /*
   * ==================================================
   * 大分類検索候補
   * ==================================================
   */

  const filteredLargeCategories = useMemo(() => {
    const keyword = largeCategorySearch.trim().toLowerCase();

    if (!keyword) {
      return [];
    }

    return largeCategories.filter((value) =>
      value.toLowerCase().includes(keyword),
    );
  }, [largeCategories, largeCategorySearch]);

  /*
   * ==================================================
   * 小分類検索候補
   * ==================================================
   */

  const filteredSmallCategories = useMemo(() => {
    const keyword = smallCategorySearch.trim().toLowerCase();

    if (!keyword) {
      return [];
    }

    return smallCategories.filter((value) =>
      value.toLowerCase().includes(keyword),
    );
  }, [smallCategories, smallCategorySearch]);

  /*
   * ==================================================
   * 成分検索候補
   * ==================================================
   */

  const filteredIngredients = useMemo(() => {
    const keyword = ingredientSearch.trim().toLowerCase();

    if (!keyword) {
      return [];
    }

    return ingredients.filter((value) => value.toLowerCase().includes(keyword));
  }, [ingredients, ingredientSearch]);

  /*
   * ==================================================
   * 剤型選択変更
   * ==================================================
   */

  function toggleDosageForm(dosageForm: DosageForm) {
    setSelectedDosageForms((current) => {
      if (current.includes(dosageForm)) {
        return current.filter((value) => value !== dosageForm);
      }

      return [...current, dosageForm];
    });
  }

  /*
   * ==================================================
   * 大分類選択変更
   * ==================================================
   */

  function toggleLargeCategory(value: string) {
    setSelectedLargeCategories((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value],
    );
  }

  /*
   * ==================================================
   * 小分類選択変更
   * ==================================================
   */

  function toggleSmallCategory(value: string) {
    setSelectedSmallCategories((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value],
    );
  }

  /*
   * ==================================================
   * 成分選択変更
   * ==================================================
   */

  function toggleIngredient(value: string) {
    setSelectedIngredients((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value],
    );
  }

  /*
   * ==================================================
   * 大分類選択解除
   * ==================================================
   */

  function removeLargeCategory(value: string) {
    setSelectedLargeCategories((current) =>
      current.filter((item) => item !== value),
    );
  }

  /*
   * ==================================================
   * 小分類選択解除
   * ==================================================
   */

  function removeSmallCategory(value: string) {
    setSelectedSmallCategories((current) =>
      current.filter((item) => item !== value),
    );
  }

  /*
   * ==================================================
   * 成分選択解除
   * ==================================================
   */

  function removeIngredient(value: string) {
    setSelectedIngredients((current) =>
      current.filter((item) => item !== value),
    );
  }

  /*
   * ==================================================
   * 問題生成
   * ==================================================
   *
   * まず剤型で対象データを絞り込む。
   *
   * その後、
   *
   * 大分類
   * 小分類
   * 成分
   *
   * の選択状態に応じて問題を作成する。
   */

  function createQuestions(): QuizQuestion[] {
    /*
     * --------------------------------------------------
     * 剤型による絞り込み
     * --------------------------------------------------
     */

    let targetData = data.filter((item) => {
      const dosageForm = getDosageForm(item);

      return dosageForm !== null && selectedDosageForms.includes(dosageForm);
    });

    /*
     * --------------------------------------------------
     * 大分類レベル
     * --------------------------------------------------
     *
     * 大分類を1問として扱う。
     *
     * 小分類が選択されている場合は、
     * その小分類に属する薬品だけを対象とする。
     */

    if (quizLevel === "large") {
      if (selectedSmallCategories.length > 0) {
        targetData = targetData.filter((item) =>
          selectedSmallCategories.includes(getText(item, "小分類")),
        );
      }

      const grouped = new Map<string, MedicationData[]>();

      for (const item of targetData) {
        const category = getText(item, "大分類");

        if (!category) {
          continue;
        }

        if (!grouped.has(category)) {
          grouped.set(category, []);
        }

        grouped.get(category)!.push(item);
      }

      return Array.from(grouped.entries()).map(([category, items]) => ({
        id: `large-${category}`,

        level: "large",

        questionValue: category,

        dosageForms: uniqueStrings(
          items
            .map((item) => getDosageForm(item))
            .filter((value): value is DosageForm => value !== null),
        ),

        correctMedications: uniqueStrings(
          items.map(getMedicationName).filter(Boolean),
        ),
      }));
    }

    /*
     * --------------------------------------------------
     * 小分類レベル
     * --------------------------------------------------
     *
     * 小分類を1問として扱う。
     *
     * 大分類が選択されている場合は、
     * その大分類に属する薬品だけを対象とする。
     */

    if (quizLevel === "small") {
      if (selectedLargeCategories.length > 0) {
        targetData = targetData.filter((item) =>
          selectedLargeCategories.includes(getText(item, "大分類")),
        );
      }

      const grouped = new Map<string, MedicationData[]>();

      for (const item of targetData) {
        const category = getText(item, "小分類");

        if (!category) {
          continue;
        }

        if (!grouped.has(category)) {
          grouped.set(category, []);
        }

        grouped.get(category)!.push(item);
      }

      return Array.from(grouped.entries()).map(([category, items]) => ({
        id: `small-${category}`,

        level: "small",

        questionValue: category,

        dosageForms: uniqueStrings(
          items
            .map((item) => getDosageForm(item))
            .filter((value): value is DosageForm => value !== null),
        ),

        correctMedications: uniqueStrings(
          items.map(getMedicationName).filter(Boolean),
        ),
      }));
    }

    /*
     * --------------------------------------------------
     * 成分レベル
     * --------------------------------------------------
     *
     * 成分を1問として扱う。
     *
     * 大分類のみ、
     * 小分類のみ、
     * 大分類 + 小分類、
     * 成分のみ、
     *
     * の組み合わせに対応する。
     */

    if (selectedLargeCategories.length > 0) {
      targetData = targetData.filter((item) =>
        selectedLargeCategories.includes(getText(item, "大分類")),
      );
    }

    if (selectedSmallCategories.length > 0) {
      targetData = targetData.filter((item) =>
        selectedSmallCategories.includes(getText(item, "小分類")),
      );
    }

    if (selectedIngredients.length > 0) {
      targetData = targetData.filter((item) =>
        selectedIngredients.includes(getText(item, "成分名")),
      );
    }

    const grouped = new Map<string, MedicationData[]>();

    for (const item of targetData) {
      const ingredient = getText(item, "成分名");

      if (!ingredient) {
        continue;
      }

      if (!grouped.has(ingredient)) {
        grouped.set(ingredient, []);
      }

      grouped.get(ingredient)!.push(item);
    }

    return Array.from(grouped.entries()).map(([ingredient, items]) => ({
      id: `ingredient-${ingredient}`,

      level: "ingredient",

      questionValue: ingredient,

      dosageForms: uniqueStrings(
        items
          .map((item) => getDosageForm(item))
          .filter((value): value is DosageForm => value !== null),
      ),

      correctMedications: uniqueStrings(
        items.map(getMedicationName).filter(Boolean),
      ),
    }));
  }

  /*
   * ==================================================
   * クイズ開始
   * ==================================================
   */

  function handleStart() {
    /*
     * 剤型が1つも選択されていない場合は、
     * クイズを開始しない。
     */

    if (selectedDosageForms.length === 0) {
      alert("剤型を1つ以上選択してください。");
      return;
    }

    /*
     * 条件に応じて問題を作成する。
     */

    const questions = createQuestions();

    /*
     * 問題が1問も作成できない場合は、
     * クイズを開始しない。
     */

    if (questions.length === 0) {
      alert("条件に該当する問題がありません。");
      return;
    }

    /*
     * 問題をランダムに並び替える。
     */

    const shuffled = shuffle(questions);

    /*
     * 指定問題数を上限として問題を切り出す。
     *
     * -1の場合は全問出題する。
     */

    const finalQuestions =
      questionCount === -1 ? shuffled : shuffled.slice(0, questionCount);

    /*
     * 各問題の回答状態を初期化する。
     */

    const answers: QuizAnswer[] = finalQuestions.map(() => ({
      selectedMedications: [],

      correctMedications: [],

      missedMedications: [],

      extraMedications: [],

      score: 0,

      isPerfect: false,
    }));

    /*
     * 新しいクイズ状態を作成する。
     */

    const newQuizState: QuizState = {
      questionCount,

      questions: finalQuestions,

      currentQuestionIndex: 0,

      answers,
    };

    setQuizState(newQuizState);

    /*
     * 前回の回答入力をクリアする。
     */

    setSelectedAnswers([]);

    setAnswerSearch("");

    setAnswerSubmitted(false);
  }

  /*
   * ==================================================
   * 同じ条件で再出題
   * ==================================================
   *
   * 現在の出題設定をそのまま利用して、
   * 新しい問題セットを作成する。
   */

  function handleRestartSameConditions() {
    handleStart();
  }

  /*
   * ==================================================
   * 出題設定へ戻る
   * ==================================================
   *
   * 現在のクイズ状態を破棄して、
   * 出題設定画面へ戻る。
   */

  function handleBackToSettings() {
    localStorage.removeItem(STORAGE_KEY);

    setQuizState(null);

    setSelectedAnswers([]);

    setAnswerSearch("");

    setAnswerSubmitted(false);
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
     * クイズ終了
     * ==================================================
     *
     * 全問題への回答が終了した場合、
     * 最終結果を表示する。
     */

    if (!currentQuestion) {
      /*
       * 全問題の点数を合計する。
       */

      const totalScore = quizState.answers.reduce(
        (total, answer) => total + answer.score,
        0,
      );

      /*
       * パーフェクトだった問題数を取得する。
       */

      const perfectCount = quizState.answers.filter(
        (answer) => answer.isPerfect,
      ).length;

      /*
       * 平均点を計算する。
       */

      const scoreRate =
        quizState.answers.length === 0
          ? 0
          : Math.round(totalScore / quizState.answers.length);

      /*
       * パーフェクト率を計算する。
       */

      const perfectRate =
        quizState.answers.length === 0
          ? 0
          : Math.round((perfectCount / quizState.answers.length) * 100);

      return (
        <main className={styles.container}>
          <div className={styles.card}>
            <h1 className={styles.heading}>💊 医薬品クイズ 結果</h1>

            <p>クイズが終了しました。</p>

            {/* =========================
                総合結果
            ========================== */}

            <div className={styles.resultSummary}>
              <div className={styles.resultSummaryItem}>
                <span>点数率</span>

                <strong>{scoreRate}%</strong>
              </div>

              <div className={styles.resultSummaryItem}>
                <span>パーフェクト率</span>

                <strong>{perfectRate}%</strong>
              </div>

              <div className={styles.resultSummaryItem}>
                <span>パーフェクト</span>

                <strong>
                  {perfectCount} / {quizState.answers.length}
                </strong>
              </div>
            </div>

            {/* =========================
                問題別結果
            ========================== */}

            <div className={styles.resultSection}>
              <h2 className={styles.resultSectionTitle}>問題別結果</h2>

              <div className={styles.questionResultList}>
                {quizState.questions.map((question, index) => {
                  const answer = quizState.answers[index];

                  return (
                    <div
                      key={question.id}
                      className={styles.questionResultCard}
                    >
                      <div className={styles.questionResultHeader}>
                        <span>問題 {index + 1}</span>

                        <strong>{answer.score}点</strong>
                      </div>

                      <div className={styles.questionResultCondition}>
                        {question.level === "large" && "大分類："}

                        {question.level === "small" && "小分類："}

                        {question.level === "ingredient" && "成分："}

                        {question.questionValue}
                      </div>

                      {answer.isPerfect && (
                        <div className={styles.perfectResult}>
                          🎉 パーフェクト
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* =========================
                操作
            ========================== */}

            <div className={styles.quizActions}>
              <button
                type="button"
                className={styles.primaryButton}
                onClick={handleRestartSameConditions}
              >
                もう一度同じ条件で出題
              </button>

              <button
                type="button"
                className={styles.secondaryButton}
                onClick={handleBackToSettings}
              >
                出題設定に戻る
              </button>
            </div>
          </div>
        </main>
      );
    }

    /*
     * ==================================================
     * 現在の回答状態
     * ==================================================
     */

    const currentAnswer = quizState.answers[quizState.currentQuestionIndex];

    /*
     * ==================================================
     * 回答候補検索
     * ==================================================
     */

    const keyword = answerSearch.trim().toLowerCase();

    /*
     * 現在の問題に設定されている剤型に
     * 該当する薬品を候補として取得する。
     *
     * 検索文字が入力されていない場合は
     * 候補を表示しない。
     */

    const answerCandidates = uniqueStrings(
      data
        .filter((item) => {
          const dosageForm = getDosageForm(item);

          return (
            dosageForm !== null &&
            currentQuestion.dosageForms.includes(dosageForm)
          );
        })
        .map(getMedicationName)
        .filter(Boolean),
    )
      .filter((name) => {
        if (!keyword) {
          return false;
        }

        return name.toLowerCase().includes(keyword);
      })
      /*
       * すでに選択した薬品は
       * 候補一覧から除外する。
       */
      .filter((name) => !selectedAnswers.includes(name))
      .slice(0, 50);

    /*
     * ==================================================
     * 回答選択
     * ==================================================
     */

    function toggleAnswer(medicationName: string) {
      /*
       * 回答済みの場合は、
       * 回答内容を変更できないようにする。
       */

      if (answerSubmitted) {
        return;
      }

      setSelectedAnswers((current) => {
        if (current.includes(medicationName)) {
          return current.filter((name) => name !== medicationName);
        }

        return [...current, medicationName];
      });
    }

    /*
     * ==================================================
     * 回答する
     * ==================================================
     */

    function handleAnswer() {
      /*
       * すでに回答済みの場合は、
       * 二重判定を行わない。
       */

      if (answerSubmitted) {
        return;
      }

      /*
       * 現在の回答を正誤判定する。
       */

      const result = judgeAnswer(
        selectedAnswers,
        currentQuestion.correctMedications,
      );

      /*
       * 判定結果をクイズ状態へ保存する。
       */

      setQuizState((current) => {
        if (!current) {
          return current;
        }

        const answers = [...current.answers];

        answers[current.currentQuestionIndex] = {
          ...answers[current.currentQuestionIndex],

          selectedMedications: [...selectedAnswers],

          correctMedications: result.correctMedications,

          missedMedications: result.missedMedications,

          extraMedications: result.extraMedications,

          score: result.score,

          isPerfect: result.isPerfect,
        };

        return {
          ...current,

          answers,
        };
      });

      /*
       * 回答結果表示へ切り替える。
       */

      setAnswerSubmitted(true);
    }

    /*
     * ==================================================
     * 次の問題へ進む
     * ==================================================
     */

    function handleNextQuestion() {
      /*
       * 回答済みでなければ、
       * 次の問題へ進めない。
       */

      if (!answerSubmitted) {
        return;
      }

      setQuizState((current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,

          currentQuestionIndex: current.currentQuestionIndex + 1,
        };
      });

      /*
       * 次の問題用に回答入力をリセットする。
       */

      setSelectedAnswers([]);

      setAnswerSearch("");

      setAnswerSubmitted(false);
    }

    /*
     * ==================================================
     * 問題画面
     * ==================================================
     */

    return (
      <main className={styles.container}>
        <div className={styles.card}>
          {/* =========================
              問題ヘッダー
          ========================== */}

          <div className={styles.questionHeader}>
            <h1 className={styles.heading}>💊 医薬品クイズ</h1>

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
              次の条件に該当する薬品名を 全て答えてください
            </div>

            <div className={styles.questionCondition}>
              {currentQuestion.level === "large" && "大分類："}

              {currentQuestion.level === "small" && "小分類："}

              {currentQuestion.level === "ingredient" && "成分："}

              {currentQuestion.questionValue}
            </div>
          </div>

          {/* ==================================================
              回答入力画面
          ================================================== */}

          {!answerSubmitted && (
            <div className={styles.answerArea}>
              <div className={styles.answerGuide}>
                薬品名を入力して候補から 選択してください。
              </div>

              <div className={styles.answerSearchGroup}>
                <input
                  type="text"
                  className={styles.searchInput}
                  value={answerSearch}
                  onChange={(event) => setAnswerSearch(event.target.value)}
                  placeholder="薬品名を検索"
                />

                {answerCandidates.length > 0 && (
                  <div className={styles.answerCandidateList}>
                    {answerCandidates.map((name) => (
                      <label key={name} className={styles.answerCandidateItem}>
                        <input
                          type="checkbox"
                          checked={false}
                          onChange={() => toggleAnswer(name)}
                        />

                        <span>{name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* =========================
                  選択中の薬品
              ========================== */}

              {selectedAnswers.length > 0 && (
                <div className={styles.answerSelectedList}>
                  <h2 className={styles.answerSelectedTitle}>選択中</h2>

                  {selectedAnswers.map((name) => (
                    <div key={name} className={styles.answerSelectedCard}>
                      <span className={styles.answerSelectedName}>{name}</span>

                      <button
                        type="button"
                        className={styles.removeButton}
                        onClick={() => toggleAnswer(name)}
                      >
                        チェックを外す
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* =========================
                  回答ボタン
              ========================== */}

              <div className={styles.quizActions}>
                <button
                  type="button"
                  className={styles.primaryButton}
                  onClick={handleAnswer}
                >
                  回答する
                </button>
              </div>
            </div>
          )}

          {/* ==================================================
              回答結果
          ================================================== */}

          {answerSubmitted && (
            <div className={styles.answerResultArea}>
              {/* =========================
                  得点・判定
              ========================== */}

              <div className={styles.answerResultHeader}>
                {currentAnswer.isPerfect ? (
                  <>
                    <div className={styles.perfectResult}>
                      🎉 パーフェクト！
                    </div>

                    <div className={styles.scoreResult}>100点</div>
                  </>
                ) : (
                  <>
                    <div className={styles.normalResult}>結果</div>

                    <div className={styles.scoreResult}>
                      {currentAnswer.score}点
                    </div>
                  </>
                )}
              </div>

              {/* =========================
                  正解薬品
              ========================== */}

              <div className={styles.resultSection}>
                <h2 className={styles.resultSectionTitle}>正解薬品</h2>

                <div className={styles.resultMedicationList}>
                  {currentQuestion.correctMedications.map((name) => (
                    <div
                      key={name}
                      className={`${styles.resultMedicationCard} ${styles.correctMedication}`}
                    >
                      <span>{name}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* =========================
                  追加できなかった薬品
              ========================== */}

              {currentAnswer.missedMedications.length > 0 && (
                <div className={styles.resultSection}>
                  <h2 className={styles.resultSectionTitle}>
                    追加できなかった薬品
                  </h2>

                  <div className={styles.resultMedicationList}>
                    {currentAnswer.missedMedications.map((name) => (
                      <div
                        key={name}
                        className={`${styles.resultMedicationCard} ${styles.missedMedication}`}
                      >
                        <span>{name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* =========================
                  余計に選択した薬品
              ========================== */}

              {currentAnswer.extraMedications.length > 0 && (
                <div className={styles.resultSection}>
                  <h2 className={styles.resultSectionTitle}>
                    余計に選択した薬品
                  </h2>

                  <div className={styles.resultMedicationList}>
                    {currentAnswer.extraMedications.map((name) => (
                      <div
                        key={name}
                        className={`${styles.resultMedicationCard} ${styles.extraMedication}`}
                      >
                        <span>{name}</span>
                      </div>
                    ))}
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
              </div>
            </div>
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
        <h1 className={styles.heading}>💊 医薬品クイズ</h1>

        {/* ==================================================
            1. 出題レベル
        ================================================== */}

        <section className={styles.settingSection}>
          <h2 className={styles.settingTitle}>1. 出題レベル</h2>

          <div className={styles.levelGroup}>
            <label className={styles.levelLabel}>
              <input
                type="radio"
                name="quizLevel"
                checked={quizLevel === "large"}
                onChange={() => setQuizLevel("large")}
              />
              大分類
            </label>

            <label className={styles.levelLabel}>
              <input
                type="radio"
                name="quizLevel"
                checked={quizLevel === "small"}
                onChange={() => setQuizLevel("small")}
              />
              小分類
            </label>

            <label className={styles.levelLabel}>
              <input
                type="radio"
                name="quizLevel"
                checked={quizLevel === "ingredient"}
                onChange={() => setQuizLevel("ingredient")}
              />
              成分
            </label>
          </div>
        </section>

        {/* ==================================================
            2. 剤型
        ================================================== */}

        <section className={styles.settingSection}>
          <h2 className={styles.settingTitle}>2. 剤型</h2>

          <div className={styles.dosageFormGroup}>
            {DOSAGE_FORMS.map((dosageForm) => (
              <label key={dosageForm} className={styles.dosageFormLabel}>
                <input
                  type="checkbox"
                  checked={selectedDosageForms.includes(dosageForm)}
                  onChange={() => toggleDosageForm(dosageForm)}
                />

                {dosageForm}
              </label>
            ))}
          </div>
        </section>

        {/* ==================================================
            大分類絞り込み
        ================================================== */}

        {quizLevel === "large" && (
          <section className={styles.settingSection}>
            <h2 className={styles.settingTitle}>大分類で絞り込み</h2>

            <div className={styles.searchGroup}>
              <input
                type="text"
                className={styles.searchInput}
                value={largeCategorySearch}
                onChange={(event) => setLargeCategorySearch(event.target.value)}
                placeholder="大分類を検索"
              />

              {filteredLargeCategories.length > 0 && (
                <div className={styles.candidateList}>
                  {filteredLargeCategories
                    .filter((value) => !selectedLargeCategories.includes(value))
                    .map((value) => (
                      <label key={value} className={styles.candidateItem}>
                        <input
                          type="checkbox"
                          checked={false}
                          onChange={() => toggleLargeCategory(value)}
                        />

                        {value}
                      </label>
                    ))}
                </div>
              )}
            </div>

            {selectedLargeCategories.length > 0 && (
              <div className={styles.selectedList}>
                <h3 className={styles.selectedListTitle}>選択中</h3>

                {selectedLargeCategories.map((value) => (
                  <div key={value} className={styles.selectedListCard}>
                    <span className={styles.selectedListName}>{value}</span>

                    <button
                      type="button"
                      className={styles.removeButton}
                      onClick={() => removeLargeCategory(value)}
                    >
                      チェックを外す
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* ==================================================
            小分類絞り込み
        ================================================== */}

        {quizLevel === "small" && (
          <section className={styles.settingSection}>
            <h2 className={styles.settingTitle}>小分類で絞り込み</h2>

            <div className={styles.searchGroup}>
              <input
                type="text"
                className={styles.searchInput}
                value={smallCategorySearch}
                onChange={(event) => setSmallCategorySearch(event.target.value)}
                placeholder="小分類を検索"
              />

              {filteredSmallCategories.length > 0 && (
                <div className={styles.candidateList}>
                  {filteredSmallCategories
                    .filter((value) => !selectedSmallCategories.includes(value))
                    .map((value) => (
                      <label key={value} className={styles.candidateItem}>
                        <input
                          type="checkbox"
                          checked={false}
                          onChange={() => toggleSmallCategory(value)}
                        />

                        {value}
                      </label>
                    ))}
                </div>
              )}
            </div>

            {selectedSmallCategories.length > 0 && (
              <div className={styles.selectedList}>
                <h3 className={styles.selectedListTitle}>選択中</h3>

                {selectedSmallCategories.map((value) => (
                  <div key={value} className={styles.selectedListCard}>
                    <span className={styles.selectedListName}>{value}</span>

                    <button
                      type="button"
                      className={styles.removeButton}
                      onClick={() => removeSmallCategory(value)}
                    >
                      チェックを外す
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* ==================================================
            成分絞り込み
        ================================================== */}

        {quizLevel === "ingredient" && (
          <section className={styles.settingSection}>
            <h2 className={styles.settingTitle}>成分で絞り込み</h2>

            <div className={styles.searchGroup}>
              <input
                type="text"
                className={styles.searchInput}
                value={ingredientSearch}
                onChange={(event) => setIngredientSearch(event.target.value)}
                placeholder="成分を検索"
              />

              {filteredIngredients.length > 0 && (
                <div className={styles.candidateList}>
                  {filteredIngredients
                    .filter((value) => !selectedIngredients.includes(value))
                    .map((value) => (
                      <label key={value} className={styles.candidateItem}>
                        <input
                          type="checkbox"
                          checked={false}
                          onChange={() => toggleIngredient(value)}
                        />

                        {value}
                      </label>
                    ))}
                </div>
              )}
            </div>

            {selectedIngredients.length > 0 && (
              <div className={styles.selectedList}>
                <h3 className={styles.selectedListTitle}>選択中</h3>

                {selectedIngredients.map((value) => (
                  <div key={value} className={styles.selectedListCard}>
                    <span className={styles.selectedListName}>{value}</span>

                    <button
                      type="button"
                      className={styles.removeButton}
                      onClick={() => removeIngredient(value)}
                    >
                      チェックを外す
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* ==================================================
            3. 出題問題数
        ================================================== */}

        <section className={styles.settingSection}>
          <h2 className={styles.settingTitle}>3. 出題問題数</h2>

          <div className={styles.levelGroup}>
            {QUESTION_COUNTS.map((item) => (
              <label key={item.value} className={styles.levelLabel}>
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

          <p className={styles.settingDescription}>
            ※指定した問題数を上限として、 条件に該当する問題を出題します。
          </p>
        </section>

        {/* ==================================================
            出題開始
        ================================================== */}

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
