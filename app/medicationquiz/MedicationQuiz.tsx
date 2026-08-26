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
 * 問題
 * ==================================================
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
 * クイズ状態
 * ==================================================
 */

type QuizAnswer = {
  selectedMedications: string[];

  correctMedications: string[];

  missedMedications: string[];

  extraMedications: string[];

  score: number;

  isPerfect: boolean;
};

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
 * データ取得用
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
 * 薬品マスタの「剤型」は
 * 内服 / 注射 / 外用を識別するために使用する。
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
 * Fisher-Yates
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
   * 剤型
   * ==================================================
   *
   * 初期状態は
   *
   * 内服
   * 注射
   * 外用
   *
   * 全て選択。
   */

  const [selectedDosageForms, setSelectedDosageForms] = useState<DosageForm[]>([
    "内服",
    "注射",
    "外用",
  ]);

  /*
   * ==================================================
   * 大分類絞り込み
   * ==================================================
   */

  const [largeCategorySearch, setLargeCategorySearch] = useState("");

  const [selectedLargeCategories, setSelectedLargeCategories] = useState<
    string[]
  >([]);

  /*
   * ==================================================
   * 小分類絞り込み
   * ==================================================
   */

  const [smallCategorySearch, setSmallCategorySearch] = useState("");

  const [selectedSmallCategories, setSelectedSmallCategories] = useState<
    string[]
  >([]);

  /*
   * ==================================================
   * 成分絞り込み
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
   * localStorage読み込み
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
   * 検索候補
   * ==================================================
   */

  const filteredLargeCategories = useMemo(() => {
    const keyword = largeCategorySearch.trim().toLowerCase();

    if (!keyword) {
      return largeCategories;
    }

    return largeCategories.filter((value) =>
      value.toLowerCase().includes(keyword),
    );
  }, [largeCategories, largeCategorySearch]);

  const filteredSmallCategories = useMemo(() => {
    const keyword = smallCategorySearch.trim().toLowerCase();

    if (!keyword) {
      return smallCategories;
    }

    return smallCategories.filter((value) =>
      value.toLowerCase().includes(keyword),
    );
  }, [smallCategories, smallCategorySearch]);

  const filteredIngredients = useMemo(() => {
    const keyword = ingredientSearch.trim().toLowerCase();

    if (!keyword) {
      return ingredients;
    }

    return ingredients.filter((value) => value.toLowerCase().includes(keyword));
  }, [ingredients, ingredientSearch]);

  /*
   * ==================================================
   * 剤型変更
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
   * 絞り込み選択
   * ==================================================
   */

  function toggleLargeCategory(value: string) {
    setSelectedLargeCategories((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value],
    );
  }

  function toggleSmallCategory(value: string) {
    setSelectedSmallCategories((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value],
    );
  }

  function toggleIngredient(value: string) {
    setSelectedIngredients((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value],
    );
  }

  /*
   * ==================================================
   * 絞り込み候補から削除
   * ==================================================
   */

  function removeLargeCategory(value: string) {
    setSelectedLargeCategories((current) =>
      current.filter((item) => item !== value),
    );
  }

  function removeSmallCategory(value: string) {
    setSelectedSmallCategories((current) =>
      current.filter((item) => item !== value),
    );
  }

  function removeIngredient(value: string) {
    setSelectedIngredients((current) =>
      current.filter((item) => item !== value),
    );
  }

  /*
   * ==================================================
   * クイズ問題生成
   * ==================================================
   */

  function createQuestions(): QuizQuestion[] {
    /*
     * 剤型による絞り込み
     */

    let targetData = data.filter((item) => {
      const dosageForm = getDosageForm(item);

      return dosageForm !== null && selectedDosageForms.includes(dosageForm);
    });

    /*
     * ==================================================
     * 大分類レベル
     * ==================================================
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

        correctMedications: uniqueStrings(items.map(getMedicationName)),
      }));
    }

    /*
     * ==================================================
     * 小分類レベル
     * ==================================================
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

        correctMedications: uniqueStrings(items.map(getMedicationName)),
      }));
    }

    /*
     * ==================================================
     * 成分レベル
     * ==================================================
     *
     * 大分類のみ
     * 小分類のみ
     * 大分類 + 小分類
     *
     * のいずれにも対応する。
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

      correctMedications: uniqueStrings(items.map(getMedicationName)),
    }));
  }

  /*
   * ==================================================
   * 出題開始
   * ==================================================
   */

  function handleStart() {
    /*
     * 剤型を1つも選択していない場合
     */

    if (selectedDosageForms.length === 0) {
      alert("剤型を1つ以上選択してください。");

      return;
    }

    /*
     * 問題生成
     */

    const questions = createQuestions();

    /*
     * 問題が存在しない場合
     */

    if (questions.length === 0) {
      alert("条件に該当する問題がありません。");

      return;
    }

    /*
     * ランダム出題
     *
     * 5問 / 10問 / 全問は上限。
     */

    const shuffled = shuffle(questions);

    const finalQuestions =
      questionCount === -1 ? shuffled : shuffled.slice(0, questionCount);

    /*
     * 回答状態初期化
     */

    const answers = finalQuestions.map(() => ({
      selectedMedications: [],

      correctMedications: [],

      missedMedications: [],

      extraMedications: [],

      score: 0,

      isPerfect: false,
    }));

    /*
     * クイズ状態
     */

    const newQuizState: QuizState = {
      questionCount,

      questions: finalQuestions,

      currentQuestionIndex: 0,

      answers,
    };

    setQuizState(newQuizState);

    setSelectedAnswers([]);

    setAnswerSearch("");
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
   * クイズ画面
   * ==================================================
   */

  if (quizState !== null) {
    const currentQuestion = quizState.questions[quizState.currentQuestionIndex];

    /*
     * ==================================================
     * 問題終了
     * ==================================================
     */

    if (!currentQuestion) {
      return (
        <main className={styles.container}>
          <div className={styles.card}>
            <h1 className={styles.heading}>💊 医薬品クイズ 結果</h1>

            <p>クイズが終了しました。</p>

            <div className={styles.quizActions}>
              <button
                type="button"
                className={styles.primaryButton}
                onClick={() => {
                  localStorage.removeItem(STORAGE_KEY);

                  setQuizState(null);

                  setSelectedAnswers([]);

                  setAnswerSearch("");
                }}
              >
                再度出題
              </button>
            </div>
          </div>
        </main>
      );
    }

    /*
     * ==================================================
     * 回答候補
     * ==================================================
     */

    const keyword = answerSearch.trim().toLowerCase();

    /*
     * 現在の問題に関係する薬品を
     * 全データから候補として取得する。
     *
     * 剤型条件も適用。
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
          return true;
        }

        return name.toLowerCase().includes(keyword);
      })
      /*
       * 既に選択した薬品は
       * 候補リストから消す。
       */
      .filter((name) => !selectedAnswers.includes(name))
      .slice(0, 50);

    /*
     * ==================================================
     * 薬品選択
     * ==================================================
     */

    function toggleAnswer(medicationName: string) {
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
       * Step 5では
       * 回答状態を保存するところまで。
       *
       * 正誤判定は次Stepで実装。
       */

      setQuizState((current) => {
        if (!current) {
          return current;
        }

        const answers = [...current.answers];

        answers[current.currentQuestionIndex] = {
          ...answers[current.currentQuestionIndex],

          selectedMedications: selectedAnswers,
        };

        return {
          ...current,

          answers,
        };
      });
    }

    /*
     * ==================================================
     * 問題画面
     * ==================================================
     */

    return (
      <main className={styles.container}>
        <div className={styles.card}>
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
              次の条件に該当する 薬品名を全て答えてください
            </div>

            <div className={styles.questionCondition}>
              {currentQuestion.level === "large" && "大分類："}

              {currentQuestion.level === "small" && "小分類："}

              {currentQuestion.level === "ingredient" && "成分："}

              {currentQuestion.questionValue}
            </div>
          </div>

          {/* =========================
              回答
          ========================== */}

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
                選択中
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
            </div>
          </div>
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

        {/* =========================
            出題レベル
        ========================== */}

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

        {/* =========================
            剤型
        ========================== */}

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
            出題問題数
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
