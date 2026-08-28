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
 * 剤型配列の重複削除
 * ==================================================
 */

function uniqueDosageForms(values: Array<DosageForm | null>): DosageForm[] {
  return Array.from(
    new Set(values.filter((value): value is DosageForm => value !== null)),
  );
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
 * 回答判定
 * ==================================================
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

  const correctSelected = correct.filter((name) => selected.includes(name));

  const missed = correct.filter((name) => !selected.includes(name));

  const extra = selected.filter((name) => !correct.includes(name));

  const score =
    correct.length === 0
      ? 0
      : Math.round((correctSelected.length / correct.length) * 100);

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
 * レベル表示
 * ==================================================
 */

function getLevelLabel(level: QuizLevel): string {
  if (level === "large") {
    return "大分類";
  }

  if (level === "small") {
    return "小分類";
  }

  return "成分";
}

/*
 * ==================================================
 * 紙形式テストPDF出力
 *
 * 1ページ目：解答なし
 * 2ページ目：解答あり
 *
 * 渡されたquizState.questionsをそのまま使用する。
 * ここでは再抽選しない。
 * ==================================================
 */

function printQuizPaper(quizState: QuizState) {
  const printWindow = window.open("", "_blank", "width=900,height=700");

  if (!printWindow) {
    alert(
      "PDF出力用のウィンドウを開けませんでした。\nブラウザのポップアップブロックを確認してください。",
    );

    return;
  }

  /*
   * ==================================================
   * 1ページ目：解答なし
   * ==================================================
   */

  const testRows = quizState.questions
    .map((question, index) => {
      return `
        <tr>
          <td class="number">${index + 1}</td>

          <td>
            <div class="condition">
              ${escapeHtml(getLevelLabel(question.level))}：
              ${escapeHtml(question.questionValue)}
            </div>
          </td>

          <td>
            <div class="answer-label">薬品名</div>

            <div class="answer-lines">
              <div></div>
              <div></div>
              <div></div>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");

  /*
   * ==================================================
   * 2ページ目：解答あり
   * ==================================================
   */

  const answerRows = quizState.questions
    .map((question, index) => {
      const correctText =
        question.correctMedications.length > 0
          ? question.correctMedications.join("、")
          : "―";

      return `
        <tr>
          <td class="number">${index + 1}</td>

          <td>
            <div class="condition">
              ${escapeHtml(getLevelLabel(question.level))}：
              ${escapeHtml(question.questionValue)}
            </div>
          </td>

          <td>
            <div class="answer-label">解答</div>

            <div class="answer-text">
              ${escapeHtml(correctText)}
            </div>
          </td>
        </tr>
      `;
    })
    .join("");

  /*
   * ==================================================
   * 印刷用HTML
   * ==================================================
   */

  const html = `
    <!DOCTYPE html>

    <html lang="ja">

      <head>

        <meta charset="UTF-8" />

        <title>医薬品クイズ テスト・解答</title>

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
            font-size: 9px;
          }

          /*
           * ==================================================
           * A4縦
           * ==================================================
           */

          .page {
            width: 190mm;
            max-width: 190mm;
            margin: 0 auto;
          }

          /*
           * ==================================================
           * タイトル
           * ==================================================
           */

          h1 {
            margin: 0 0 3mm;
            text-align: center;
            font-size: 17px;
            line-height: 1.3;
          }

          /*
           * ==================================================
           * 氏名・日付
           * ==================================================
           */

          .test-info {
            display: flex;
            justify-content: space-between;
            margin-bottom: 4mm;
            font-size: 10px;
          }

          /*
           * ==================================================
           * テーブル
           * ==================================================
           */

          table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
          }

          th,
          td {
            border: 1px solid #777;
            padding: 2mm;
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
            width: 7%;
          }

          th:nth-child(2) {
            width: 28%;
          }

          th:nth-child(3) {
            width: 65%;
          }

          td.number {
            text-align: center;
            font-weight: bold;
            font-size: 11px;
          }

          .condition {
            font-weight: bold;
            font-size: 10px;
          }

          /*
           * ==================================================
           * 解答欄
           * ==================================================
           */

          .answer-label {
            margin-bottom: 1mm;
            font-weight: bold;
            color: #555;
          }

          .answer-text {
            font-size: 10px;
            line-height: 1.6;
          }

          /*
           * ==================================================
           * 解答なしの記入欄
           * ==================================================
           */

          .answer-lines {
            display: flex;
            flex-direction: column;
            gap: 4mm;
            padding: 1mm 0;
          }

          .answer-lines div {
            height: 6mm;
            border-bottom: 1px solid #777;
          }

          /*
           * ==================================================
           * フッター
           * ==================================================
           */

          .footer {
            margin-top: 3mm;
            text-align: right;
            color: #777;
            font-size: 7px;
          }

          /*
           * ==================================================
           * 改ページ
           * ==================================================
           */

          .page-break {
            break-before: page;
            page-break-before: always;
          }

          /*
           * ==================================================
           * 印刷設定
           * ==================================================
           */

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

            tr {
              break-inside: avoid;
              page-break-inside: avoid;
            }
          }

        </style>

      </head>

      <body>

        <!-- ==================================================
             1ページ目：解答なし
        ================================================== -->

        <div class="page">

          <h1>
            医薬品クイズ（テスト）
          </h1>

          <div class="test-info">

            <span>
              氏名： ______________________________
            </span>

            <span>
              日付： ______ / ______ / ______
            </span>

          </div>

          <table>

            <thead>

              <tr>

                <th>問題</th>

                <th>出題条件</th>

                <th>薬品名</th>

              </tr>

            </thead>

            <tbody>
              ${testRows}
            </tbody>

          </table>

          <div class="footer">
            医薬品クイズ
          </div>

        </div>


        <!-- ==================================================
             改ページ
        ================================================== -->

        <div class="page-break"></div>


        <!-- ==================================================
             2ページ目：解答
        ================================================== -->

        <div class="page">

          <h1>
            医薬品クイズ（解答）
          </h1>

          <table>

            <thead>

              <tr>

                <th>問題</th>

                <th>出題条件</th>

                <th>解答</th>

              </tr>

            </thead>

            <tbody>
              ${answerRows}
            </tbody>

          </table>

          <div class="footer">
            医薬品クイズ（解答）
          </div>

        </div>

      </body>

    </html>
  `;

  printWindow.document.open();

  printWindow.document.write(html);

  printWindow.document.close();

  printWindow.onload = () => {
    printWindow.focus();

    printWindow.print();
  };
}

/*
 * ==================================================
 * 結果PDF出力
 * ==================================================
 */

function printQuizResult(quizState: QuizState) {
  const printWindow = window.open("", "_blank", "width=900,height=700");

  if (!printWindow) {
    alert(
      "PDF出力用のウィンドウを開けませんでした。\nブラウザのポップアップブロックを確認してください。",
    );

    return;
  }

  const totalScore = quizState.answers.reduce(
    (total, answer) => total + answer.score,
    0,
  );

  const perfectCount = quizState.answers.filter(
    (answer) => answer.isPerfect,
  ).length;

  const scoreRate =
    quizState.answers.length === 0
      ? 0
      : Math.round(totalScore / quizState.answers.length);

  const perfectRate =
    quizState.answers.length === 0
      ? 0
      : Math.round((perfectCount / quizState.answers.length) * 100);

  const rows = quizState.questions
    .map((question, index) => {
      const answer = quizState.answers[index];

      const resultText = answer.isPerfect
        ? "パーフェクト"
        : answer.score > 0
          ? `${answer.score}点`
          : answer.selectedMedications.length === 0
            ? "未回答"
            : "不正解";

      const resultClass = answer.isPerfect
        ? "perfect"
        : answer.score > 0
          ? "partial"
          : answer.selectedMedications.length === 0
            ? "unanswered"
            : "incorrect";

      const selectedText =
        answer.selectedMedications.length > 0
          ? answer.selectedMedications.join("、")
          : "未回答";

      const correctText =
        question.correctMedications.length > 0
          ? question.correctMedications.join("、")
          : "―";

      const missedText =
        answer.missedMedications.length > 0
          ? answer.missedMedications.join("、")
          : "―";

      const extraText =
        answer.extraMedications.length > 0
          ? answer.extraMedications.join("、")
          : "―";

      return `
        <tr>

          <td class="number">
            ${index + 1}
          </td>

          <td>
            <div class="condition">
              ${escapeHtml(getLevelLabel(question.level))}：
              ${escapeHtml(question.questionValue)}
            </div>
          </td>

          <td>
            ${escapeHtml(selectedText)}
          </td>

          <td>
            ${escapeHtml(correctText)}
          </td>

          <td>
            ${escapeHtml(missedText)}
          </td>

          <td>
            ${escapeHtml(extraText)}
          </td>

          <td class="${resultClass}">
            ${escapeHtml(resultText)}
          </td>

        </tr>
      `;
    })
    .join("");

  const html = `
    <!DOCTYPE html>

    <html lang="ja">

      <head>

        <meta charset="UTF-8" />

        <title>医薬品クイズ 結果</title>

        <style>

          @page {
            size: A4 landscape;
            margin: 8mm;
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
            font-size: 9px;
          }

          .page {
            width: 100%;
            max-width: 281mm;
            margin: 0 auto;
          }

          h1 {
            margin: 0 0 3mm;
            text-align: center;
            font-size: 17px;
            line-height: 1.3;
          }

          .summary {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 3mm;
            margin-bottom: 4mm;
          }

          .summary-item {
            border: 1px solid #999;
            padding: 2mm;
            text-align: center;
          }

          .summary-label {
            display: block;
            margin-bottom: 1mm;
            color: #555;
            font-size: 8px;
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
            padding: 1.4mm 1.2mm;
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
            width: 5%;
          }

          th:nth-child(2) {
            width: 17%;
          }

          th:nth-child(3) {
            width: 18%;
          }

          th:nth-child(4) {
            width: 18%;
          }

          th:nth-child(5) {
            width: 15%;
          }

          th:nth-child(6) {
            width: 15%;
          }

          th:nth-child(7) {
            width: 12%;
          }

          td.number,
          td.perfect,
          td.partial,
          td.incorrect,
          td.unanswered {
            text-align: center;
          }

          .condition {
            font-weight: bold;
          }

          .perfect {
            color: #008000;
            font-weight: bold;
          }

          .partial {
            color: #b36b00;
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
            margin-top: 3mm;
            text-align: right;
            color: #777;
            font-size: 7px;
          }

          @media print {

            html,
            body {
              width: 297mm;
              min-height: 210mm;
            }

            .page {
              width: 281mm;
              max-width: 281mm;
            }
          }

        </style>

      </head>

      <body>

        <div class="page">

          <h1>
            医薬品クイズ 結果
          </h1>

          <div class="summary">

            <div class="summary-item">

              <span class="summary-label">
                出題数
              </span>

              <span class="summary-value">
                ${quizState.questions.length}問
              </span>

            </div>

            <div class="summary-item">

              <span class="summary-label">
                点数率
              </span>

              <span class="summary-value">
                ${scoreRate}%
              </span>

            </div>

            <div class="summary-item">

              <span class="summary-label">
                パーフェクト率
              </span>

              <span class="summary-value">
                ${perfectRate}%
              </span>

            </div>

            <div class="summary-item">

              <span class="summary-label">
                パーフェクト
              </span>

              <span class="summary-value">
                ${perfectCount} / ${quizState.answers.length}
              </span>

            </div>

          </div>

          <table>

            <thead>

              <tr>

                <th>問題</th>

                <th>出題条件</th>

                <th>ユーザー回答</th>

                <th>正解薬品</th>

                <th>未選択</th>

                <th>余計に選択</th>

                <th>結果</th>

              </tr>

            </thead>

            <tbody>
              ${rows}
            </tbody>

          </table>

          <div class="footer">
            医薬品クイズ
          </div>

        </div>

      </body>

    </html>
  `;

  printWindow.document.open();

  printWindow.document.write(html);

  printWindow.document.close();

  printWindow.onload = () => {
    printWindow.focus();

    printWindow.print();
  };
}

/*
 * ==================================================
 * HTMLエスケープ
 * ==================================================
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
   */

  const [answerSubmitted, setAnswerSubmitted] = useState(false);

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

      if (!isValidQuizState(parsed)) {
        localStorage.removeItem(STORAGE_KEY);
        setStorageChecked(true);
        return;
      }

      setQuizState(parsed);

      const currentAnswer = parsed.answers[parsed.currentQuestionIndex];

      if (currentAnswer) {
        setSelectedAnswers(currentAnswer.selectedMedications);

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
   * 大分類選択
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
   * 小分類選択
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
   * 成分選択
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
   */

  function createQuestions(): QuizQuestion[] {
    let targetData = data.filter((item) => {
      const dosageForm = getDosageForm(item);

      return dosageForm !== null && selectedDosageForms.includes(dosageForm);
    });

    /*
     * --------------------------------------------------
     * 大分類
     * --------------------------------------------------
     */

    if (quizLevel === "large") {
      if (selectedLargeCategories.length > 0) {
        targetData = targetData.filter((item) =>
          selectedLargeCategories.includes(getText(item, "大分類")),
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

        dosageForms: uniqueDosageForms(
          items.map((item) => getDosageForm(item)),
        ),

        correctMedications: uniqueStrings(
          items.map(getMedicationName).filter(Boolean),
        ),
      }));
    }

    /*
     * --------------------------------------------------
     * 小分類
     * --------------------------------------------------
     */

    if (quizLevel === "small") {
      if (selectedSmallCategories.length > 0) {
        targetData = targetData.filter((item) =>
          selectedSmallCategories.includes(getText(item, "小分類")),
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

        dosageForms: uniqueDosageForms(
          items.map((item) => getDosageForm(item)),
        ),

        correctMedications: uniqueStrings(
          items.map(getMedicationName).filter(Boolean),
        ),
      }));
    }

    /*
     * --------------------------------------------------
     * 成分
     * --------------------------------------------------
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

      dosageForms: uniqueDosageForms(items.map((item) => getDosageForm(item))),

      correctMedications: uniqueStrings(
        items.map(getMedicationName).filter(Boolean),
      ),
    }));
  }

  /*
   * ==================================================
   * 問題数に応じて問題を作成
   *
   * 通常クイズはランダム
   * ==================================================
   */

  function createFinalQuestions(): QuizQuestion[] {
    const questions = createQuestions();

    const shuffled = shuffle(questions);

    return questionCount === -1 ? shuffled : shuffled.slice(0, questionCount);
  }

  /*
   * ==================================================
   * PDF用問題作成
   *
   * ★重要
   *
   * ここではシャッフルしない。
   *
   * 選択されたチェックボックスの順番を
   * そのまま問題順として使用する。
   * ==================================================
   */

  function createPaperTestQuestions(): QuizQuestion[] {
    let targetData = data.filter((item) => {
      const dosageForm = getDosageForm(item);

      return dosageForm !== null && selectedDosageForms.includes(dosageForm);
    });

    /*
     * --------------------------------------------------
     * 大分類
     * --------------------------------------------------
     */

    if (quizLevel === "large") {
      const selected =
        selectedLargeCategories.length > 0
          ? selectedLargeCategories
          : uniqueStrings(
              targetData.map((item) => getText(item, "大分類")).filter(Boolean),
            );

      return selected
        .map((category) => {
          const items = targetData.filter(
            (item) => getText(item, "大分類") === category,
          );

          if (items.length === 0) {
            return null;
          }

          return {
            id: `large-${category}`,

            level: "large",

            questionValue: category,

            dosageForms: uniqueDosageForms(
              items.map((item) => getDosageForm(item)),
            ),

            correctMedications: uniqueStrings(
              items.map(getMedicationName).filter(Boolean),
            ),
          };
        })
        .filter((question): question is QuizQuestion => question !== null);
    }

    /*
     * --------------------------------------------------
     * 小分類
     * --------------------------------------------------
     */

    if (quizLevel === "small") {
      const selected =
        selectedSmallCategories.length > 0
          ? selectedSmallCategories
          : uniqueStrings(
              targetData.map((item) => getText(item, "小分類")).filter(Boolean),
            );

      return selected
        .map((category) => {
          const items = targetData.filter(
            (item) => getText(item, "小分類") === category,
          );

          if (items.length === 0) {
            return null;
          }

          return {
            id: `small-${category}`,

            level: "small",

            questionValue: category,

            dosageForms: uniqueDosageForms(
              items.map((item) => getDosageForm(item)),
            ),

            correctMedications: uniqueStrings(
              items.map(getMedicationName).filter(Boolean),
            ),
          };
        })
        .filter((question): question is QuizQuestion => question !== null);
    }

    /*
     * --------------------------------------------------
     * 成分
     * --------------------------------------------------
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

    /*
     * --------------------------------------------------
     * 成分の選択順を維持
     * --------------------------------------------------
     */

    const selected =
      selectedIngredients.length > 0
        ? selectedIngredients
        : uniqueStrings(
            targetData.map((item) => getText(item, "成分名")).filter(Boolean),
          );

    return selected
      .map((ingredient) => {
        const items = targetData.filter(
          (item) => getText(item, "成分名") === ingredient,
        );

        if (items.length === 0) {
          return null;
        }

        return {
          id: `ingredient-${ingredient}`,

          level: "ingredient",

          questionValue: ingredient,

          dosageForms: uniqueDosageForms(
            items.map((item) => getDosageForm(item)),
          ),

          correctMedications: uniqueStrings(
            items.map(getMedicationName).filter(Boolean),
          ),
        };
      })
      .filter((question): question is QuizQuestion => question !== null);
  }

  /*
   * ==================================================
   * クイズ開始
   * ==================================================
   */

  function handleStart() {
    if (selectedDosageForms.length === 0) {
      alert("剤型を1つ以上選択してください。");
      return;
    }

    const finalQuestions = createFinalQuestions();

    if (finalQuestions.length === 0) {
      alert("条件に該当する問題がありません。");
      return;
    }

    const answers: QuizAnswer[] = finalQuestions.map(() => ({
      selectedMedications: [],
      correctMedications: [],
      missedMedications: [],
      extraMedications: [],
      score: 0,
      isPerfect: false,
    }));

    const newQuizState: QuizState = {
      questionCount,

      questions: finalQuestions,

      currentQuestionIndex: 0,

      answers,
    };

    setQuizState(newQuizState);

    setSelectedAnswers([]);

    setAnswerSearch("");

    setAnswerSubmitted(false);
  }

  /*
   * ==================================================
   * 同じ条件で再出題
   * ==================================================
   */

  function handleRestartSameConditions() {
    handleStart();
  }

  /*
   * ==================================================
   * 出題設定へ戻る
   * ==================================================
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
   * クイズ中止
   * ==================================================
   */

  function handleStopQuiz() {
    const confirmed = window.confirm(
      "現在のクイズを中止しますか？\n\n途中までの回答内容は破棄され、出題設定画面に戻ります。",
    );

    if (!confirmed) {
      return;
    }

    localStorage.removeItem(STORAGE_KEY);

    setQuizState(null);

    setSelectedAnswers([]);

    setAnswerSearch("");

    setAnswerSubmitted(false);
  }

  /*
   * ==================================================
   * 結果PDF出力
   * ==================================================
   */

  function handlePrintResult() {
    if (!quizState) {
      return;
    }

    printQuizResult(quizState);
  }

  /*
   * ==================================================
   * 紙テスト作成
   *
   * printQuizPaper()方式
   * ==================================================
   */

  function handleCreatePaperTest() {
    if (selectedDosageForms.length === 0) {
      alert("剤型を1つ以上選択してください。");
      return;
    }

    const questions = createPaperTestQuestions();

    if (questions.length === 0) {
      alert("条件に該当する問題がありません。");
      return;
    }

    /*
     * --------------------------------------------------
     * 出題問題数を適用
     *
     * PDFではランダム化しない
     * --------------------------------------------------
     */

    const finalQuestions =
      questionCount === -1 ? questions : questions.slice(0, questionCount);

    /*
     * --------------------------------------------------
     * PDF用QuizState
     * --------------------------------------------------
     */

    const answers: QuizAnswer[] = finalQuestions.map((question) => ({
      selectedMedications: [],

      correctMedications: question.correctMedications,

      missedMedications: [],

      extraMedications: [],

      score: 0,

      isPerfect: false,
    }));

    const paperQuizState: QuizState = {
      questionCount: finalQuestions.length,

      questions: finalQuestions,

      currentQuestionIndex: finalQuestions.length,

      answers,
    };

    /*
     * --------------------------------------------------
     * PDF出力
     *
     * ここで作成した問題をそのまま使用する。
     *
     * 再抽選されないため、
     *
     * 1ページ目 問題
     * 2ページ目 解答
     *
     * が完全に同期する。
     * --------------------------------------------------
     */

    printQuizPaper(paperQuizState);
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
     */

    if (!currentQuestion) {
      const totalScore = quizState.answers.reduce(
        (total, answer) => total + answer.score,
        0,
      );

      const perfectCount = quizState.answers.filter(
        (answer) => answer.isPerfect,
      ).length;

      const scoreRate =
        quizState.answers.length === 0
          ? 0
          : Math.round(totalScore / quizState.answers.length);

      const perfectRate =
        quizState.answers.length === 0
          ? 0
          : Math.round((perfectCount / quizState.answers.length) * 100);

      return (
        <main className={styles.container}>
          <div className={styles.card}>
            <h1 className={styles.heading}>💊 医薬品クイズ 結果</h1>

            <p>クイズが終了しました。</p>

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
                        {getLevelLabel(question.level)}：
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

            <div className={styles.quizActions}>
              <button
                type="button"
                className={styles.primaryButton}
                onClick={handlePrintResult}
              >
                🖨️ 結果をPDF出力
              </button>

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
      .filter((name) => !selectedAnswers.includes(name))
      .slice(0, 50);

    /*
     * ==================================================
     * 回答選択
     * ==================================================
     */

    function toggleAnswer(medicationName: string) {
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
      if (answerSubmitted) {
        return;
      }

      const result = judgeAnswer(
        selectedAnswers,
        currentQuestion.correctMedications,
      );

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

      setAnswerSubmitted(true);
    }

    /*
     * ==================================================
     * 次の問題
     * ==================================================
     */

    function handleNextQuestion() {
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
          <div className={styles.questionHeader}>
            <h1 className={styles.heading}>💊 医薬品クイズ</h1>

            <div className={styles.questionHeaderRight}>
              <div className={styles.questionNumber}>
                {quizState.currentQuestionIndex + 1} /{" "}
                {quizState.questions.length}
              </div>

              <button
                type="button"
                className={styles.stopButton}
                onClick={handleStopQuiz}
              >
                クイズを中止
              </button>
            </div>
          </div>

          <div className={styles.question}>
            <div className={styles.questionLabel}>
              次の条件に該当する薬品名を 全て答えてください
            </div>

            <div className={styles.questionCondition}>
              {getLevelLabel(currentQuestion.level)}：
              {currentQuestion.questionValue}
            </div>
          </div>

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
                  className={styles.stopButton}
                  onClick={handleStopQuiz}
                >
                  クイズを中止
                </button>
              </div>
            </div>
          )}

          {answerSubmitted && (
            <div className={styles.answerResultArea}>
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
                  className={styles.stopButton}
                  onClick={handleStopQuiz}
                >
                  クイズを中止
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
            ※指定した問題数を上限として、条件に該当する問題を出題します。
          </p>
        </section>

        {/* ==================================================
            4. 紙形式テスト
        ================================================== */}

        <section className={styles.paperTestSection}>
          <h2 className={styles.settingTitle}>4. 紙形式テスト</h2>

          <p className={styles.settingDescription}>
            現在の出題条件から紙形式のテストを作成します。
            ブラウザの印刷画面で「PDFに保存」を選択できます。
            <br />
            1ページ目がテスト、2ページ目が解答になります。
          </p>

          <div className={styles.paperTestActions}>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={handleCreatePaperTest}
            >
              📝 紙形式のテスト作成
              <br />
              PDF出力
            </button>
          </div>
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
