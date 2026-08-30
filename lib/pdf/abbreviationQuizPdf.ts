/*
 * ==================================================
 * 略語クイズ PDF
 * ==================================================
 *
 * 略語クイズの
 *
 * ・出題PDF
 * ・結果PDF
 *
 * の印刷用HTMLを生成する。
 *
 * 実際の印刷処理は
 * printPdf.ts の共通処理を利用する。
 * ==================================================
 */

import { printHtmlDocument } from "@/lib/pdf/printPdf";

/*
 * ==================================================
 * 型
 * ==================================================
 */

export type AbbreviationQuizQuestion = {
  rowNumber: number | null;
  abbreviation: string;
  japaneseName: string;
  category: string;
  area: string;
};

export type AbbreviationQuizAnswer = {
  selectedValue: string | null;
  isCorrect: boolean | null;
};

export type AbbreviationQuizState = {
  questionCount: number;

  answerMode: "abbreviation-to-japanese" | "japanese-to-abbreviation";

  categoryMode: "all" | "category" | "law";

  selectedCategories: string[];

  questions: AbbreviationQuizQuestion[];

  currentQuestionIndex: number;

  answers: AbbreviationQuizAnswer[];
};

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
 * 問題文
 * ==================================================
 */

function getQuestionText(
  question: AbbreviationQuizQuestion,
  answerMode: AbbreviationQuizState["answerMode"],
): string {
  return answerMode === "abbreviation-to-japanese"
    ? question.abbreviation
    : question.japaneseName;
}

/*
 * ==================================================
 * 正答
 * ==================================================
 */

function getCorrectAnswer(
  question: AbbreviationQuizQuestion,
  answerMode: AbbreviationQuizState["answerMode"],
): string {
  return answerMode === "abbreviation-to-japanese"
    ? question.japaneseName
    : question.abbreviation;
}

/*
 * ==================================================
 * 出題PDF
 * ==================================================
 *
 * 問題ページ
 * ↓
 * 改ページ
 * ↓
 * 解答ページ
 *
 * 問題と解答には同じquestionsを使用するため、
 * 順番が完全に同期する。
 */

export function printAbbreviationQuizPaper(
  quizState: AbbreviationQuizState,
): void {
  /*
   * ==================================================
   * 問題ページ
   * ==================================================
   */

  const questionRows = quizState.questions
    .map((question, index) => {
      const questionText = getQuestionText(question, quizState.answerMode);

      return `
        <tr>
          <td class="number">${index + 1}</td>
          <td class="question">
            ${escapeHtml(questionText)}
          </td>
          <td class="answer"></td>
        </tr>
      `;
    })
    .join("");

  /*
   * ==================================================
   * 解答ページ
   * ==================================================
   */

  const answerRows = quizState.questions
    .map((question, index) => {
      const questionText = getQuestionText(question, quizState.answerMode);

      const correctAnswer = getCorrectAnswer(question, quizState.answerMode);

      return `
        <tr>
          <td class="number">${index + 1}</td>
          <td class="question">
            ${escapeHtml(questionText)}
          </td>
          <td class="correctAnswer">
            ${escapeHtml(correctAnswer)}
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

  const modeText =
    quizState.answerMode === "abbreviation-to-japanese"
      ? "略語名 → 日本語名"
      : "日本語名 → 略語";

  const html = `
    <!DOCTYPE html>
    <html lang="ja">
      <head>
        <meta charset="UTF-8" />

        <title>略語クイズ 出題</title>

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

          .answer-page {
            page-break-before: always;
          }

          h1 {
            margin: 0 0 3mm;
            text-align: center;
            font-size: 18px;
            line-height: 1.3;
          }

          .meta {
            margin-bottom: 5mm;
            text-align: center;
            font-size: 10px;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
          }

          th,
          td {
            border: 1px solid #777;
            padding: 2.5mm 2mm;
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
            width: 12%;
          }

          th:nth-child(2) {
            width: 53%;
          }

          th:nth-child(3) {
            width: 35%;
          }

          td.number {
            text-align: center;
            font-weight: bold;
          }

          td.question {
            font-size: 11px;
          }

          td.answer {
            height: 12mm;
          }

          td.correctAnswer {
            font-size: 11px;
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

        <!-- =========================
             問題ページ
        ========================== -->

        <div class="page">

          <h1>略語クイズ</h1>

          <div class="meta">
            回答形式：${escapeHtml(modeText)}
            　
            問題数：${quizState.questions.length}問
          </div>

          <table>
            <thead>
              <tr>
                <th>No.</th>
                <th>問題</th>
                <th>回答</th>
              </tr>
            </thead>

            <tbody>
              ${questionRows}
            </tbody>
          </table>

          <div class="footer">
            略語クイズ
          </div>

        </div>

        <!-- =========================
             解答ページ
        ========================== -->

        <div class="page answer-page">

          <h1>略語クイズ 解答</h1>

          <div class="meta">
            回答形式：${escapeHtml(modeText)}
          </div>

          <table>
            <thead>
              <tr>
                <th>No.</th>
                <th>問題</th>
                <th>正答</th>
              </tr>
            </thead>

            <tbody>
              ${answerRows}
            </tbody>
          </table>

          <div class="footer">
            略語クイズ 解答
          </div>

        </div>

      </body>
    </html>
  `;

  /*
   * ==================================================
   * 共通印刷処理
   * ==================================================
   */

  printHtmlDocument(html);
}

/*
 * ==================================================
 * 結果PDF
 * ==================================================
 */

export function printAbbreviationQuizResult(
  quizState: AbbreviationQuizState,
  correctCount: number,
  incorrectCount: number,
  unansweredCount: number,
): void {
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

          <td>
            ${escapeHtml(answer?.selectedValue ?? "未回答")}
          </td>

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
   * 共通印刷処理
   * ==================================================
   */

  printHtmlDocument(html);
}
