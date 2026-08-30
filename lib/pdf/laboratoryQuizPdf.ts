/*
 * ==================================================
 * 検査値クイズ PDF
 * ==================================================
 *
 * 検査値クイズの
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

export type LaboratoryQuizQuestion = {
  rowNumber: number | null;

  abbreviation: string;

  japaneseName: string;

  lowerLimit: number;

  upperLimit: number;

  unit: string;
};

export type LaboratoryResultLevel = "PERFECT" | "GOOD" | "BAD" | null;

export type LaboratoryQuizAnswer = {
  lowerValue: number | null;

  upperValue: number | null;

  lowerResult: LaboratoryResultLevel;

  upperResult: LaboratoryResultLevel;
};

export type LaboratoryQuizState = {
  questionCount: number;

  questions: LaboratoryQuizQuestion[];

  currentQuestionIndex: number;

  answers: LaboratoryQuizAnswer[];
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
 * 基準値表示
 * ==================================================
 */

function getReferenceRange(question: LaboratoryQuizQuestion): string {
  const hasLower = question.lowerLimit !== 0;
  const hasUpper = question.upperLimit !== 0;

  if (hasLower && hasUpper) {
    return `${question.lowerLimit} ～ ${question.upperLimit}`;
  }

  if (hasLower) {
    return `${question.lowerLimit} ～`;
  }

  if (hasUpper) {
    return `～ ${question.upperLimit}`;
  }

  return "－";
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
 * ==================================================
 */

export function printLaboratoryQuizPaper(quizState: LaboratoryQuizState): void {
  /*
   * ==================================================
   * 問題ページ
   * ==================================================
   */

  const questionRows = quizState.questions
    .map((question, index) => {
      const lowerAnswer = question.lowerLimit !== 0 ? "" : "－";

      const upperAnswer = question.upperLimit !== 0 ? "" : "－";

      return `
        <tr>
          <td class="number">
            ${index + 1}
          </td>

          <td class="question">
            ${escapeHtml(question.abbreviation)}
            <br />
            <span class="japaneseName">
              ${escapeHtml(question.japaneseName)}
            </span>
          </td>

          <td class="unit">
            ${escapeHtml(question.unit)}
          </td>

          <td class="answer">
            ${lowerAnswer}
          </td>

          <td class="answer">
            ${upperAnswer}
          </td>
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
      const lowerAnswer =
        question.lowerLimit !== 0 ? String(question.lowerLimit) : "－";

      const upperAnswer =
        question.upperLimit !== 0 ? String(question.upperLimit) : "－";

      return `
        <tr>
          <td class="number">
            ${index + 1}
          </td>

          <td class="question">
            ${escapeHtml(question.abbreviation)}
            <br />
            <span class="japaneseName">
              ${escapeHtml(question.japaneseName)}
            </span>
          </td>

          <td class="unit">
            ${escapeHtml(question.unit)}
          </td>

          <td class="correctAnswer">
            ${escapeHtml(lowerAnswer)}
          </td>

          <td class="correctAnswer">
            ${escapeHtml(upperAnswer)}
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

        <title>
          検査値クイズ 出題
        </title>

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
            border:
              1px solid #777;

            padding:
              2.5mm 1.5mm;

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
            width: 10%;
          }

          th:nth-child(2) {
            width: 34%;
          }

          th:nth-child(3) {
            width: 16%;
          }

          th:nth-child(4) {
            width: 20%;
          }

          th:nth-child(5) {
            width: 20%;
          }

          td.number {
            text-align: center;

            font-weight: bold;
          }

          td.question {
            font-size: 11px;

            text-align: center;
          }

          .japaneseName {
            font-size: 9px;
          }

          td.unit {
            text-align: center;

            font-size: 9px;
          }

          td.answer {
            height: 15mm;

            text-align: center;

            font-size: 11px;
          }

          td.correctAnswer {
            text-align: center;

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

          <h1>
            検査値クイズ
          </h1>

          <div class="meta">
            問題数：
            ${quizState.questions.length}
            問
          </div>

          <table>

            <thead>

              <tr>

                <th>
                  No.
                </th>

                <th>
                  検査項目
                </th>

                <th>
                  単位
                </th>

                <th>
                  下限回答
                </th>

                <th>
                  上限回答
                </th>

              </tr>

            </thead>

            <tbody>
              ${questionRows}
            </tbody>

          </table>

          <div class="footer">
            検査値クイズ
          </div>

        </div>

        <!-- =========================
             解答ページ
        ========================== -->

        <div class="page answer-page">

          <h1>
            検査値クイズ 解答
          </h1>

          <div class="meta">
            問題数：
            ${quizState.questions.length}
            問
          </div>

          <table>

            <thead>

              <tr>

                <th>
                  No.
                </th>

                <th>
                  検査項目
                </th>

                <th>
                  単位
                </th>

                <th>
                  下限
                </th>

                <th>
                  上限
                </th>

              </tr>

            </thead>

            <tbody>
              ${answerRows}
            </tbody>

          </table>

          <div class="footer">
            検査値クイズ 解答
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

export function printLaboratoryQuizResult(
  quizState: LaboratoryQuizState,
  perfectCount: number,
  correctCount: number,
  incorrectCount: number,
  unansweredCount: number,
  perfectRate: number,
): void {
  /*
   * ==================================================
   * 表のHTML
   * ==================================================
   */

  const rows = quizState.questions
    .map((question, index) => {
      const answer = quizState.answers[index];

      const lowerText =
        question.lowerLimit !== 0
          ? String(answer?.lowerValue ?? "未回答")
          : "－";

      const upperText =
        question.upperLimit !== 0
          ? String(answer?.upperValue ?? "未回答")
          : "－";

      const lowerResult =
        question.lowerLimit !== 0 ? (answer?.lowerResult ?? "未回答") : "－";

      const upperResult =
        question.upperLimit !== 0 ? (answer?.upperResult ?? "未回答") : "－";

      return `
        <tr>

          <td>
            ${escapeHtml(question.abbreviation)}
          </td>

          <td>
            ${escapeHtml(question.japaneseName)}
          </td>

          <td>
            ${escapeHtml(getReferenceRange(question))}
            ${question.unit ? `<br />${escapeHtml(question.unit)}` : ""}
          </td>

          <td>
            ${escapeHtml(lowerText)}
          </td>

          <td>
            ${escapeHtml(upperText)}
          </td>

          <td>
            ${escapeHtml(String(lowerResult))}
            /
            ${escapeHtml(String(upperResult))}
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

        <title>
          検査値クイズ結果
        </title>

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

          .page {
            width: 100%;
            max-width: 190mm;
            margin: 0 auto;
          }

          h1 {
            margin: 0 0 5mm;

            text-align: center;

            font-size: 18px;
          }

          .summary {
            display: grid;

            grid-template-columns:
              repeat(5, 1fr);

            gap: 2mm;

            margin-bottom: 5mm;
          }

          .summary-item {
            border:
              1px solid #999;

            padding:
              2.5mm 1.5mm;

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

            font-size: 12px;

            font-weight: bold;
          }

          table {
            width: 100%;

            border-collapse: collapse;

            table-layout: fixed;
          }

          th,
          td {
            border:
              1px solid #777;

            padding:
              1.5mm 1mm;

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
            width: 15%;
          }

          th:nth-child(2) {
            width: 22%;
          }

          th:nth-child(3) {
            width: 20%;
          }

          th:nth-child(4) {
            width: 13%;
          }

          th:nth-child(5) {
            width: 13%;
          }

          th:nth-child(6) {
            width: 17%;
          }

          td {
            text-align: center;
          }

          .footer {
            margin-top: 4mm;

            text-align: right;

            font-size: 7px;

            color: #777;
          }

        </style>

      </head>

      <body>

        <div class="page">

          <h1>
            検査値クイズ 結果
          </h1>

          <div class="summary">

            <div class="summary-item">

              <span class="summary-label">
                問題数
              </span>

              <span class="summary-value">
                ${quizState.questions.length}
              </span>

            </div>

            <div class="summary-item">

              <span class="summary-label">
                正解
              </span>

              <span class="summary-value">
                ${correctCount}
              </span>

            </div>

            <div class="summary-item">

              <span class="summary-label">
                不正解
              </span>

              <span class="summary-value">
                ${incorrectCount}
              </span>

            </div>

            <div class="summary-item">

              <span class="summary-label">
                未回答
              </span>

              <span class="summary-value">
                ${unansweredCount}
              </span>

            </div>

            <div class="summary-item">

              <span class="summary-label">
                PERFECT率
              </span>

              <span class="summary-value">
                ${perfectRate.toFixed(1)}%
              </span>

            </div>

          </div>

          <table>

            <thead>

              <tr>

                <th>
                  略語
                </th>

                <th>
                  検査項目
                </th>

                <th>
                  正解基準値
                </th>

                <th>
                  下限回答
                </th>

                <th>
                  上限回答
                </th>

                <th>
                  判定
                </th>

              </tr>

            </thead>

            <tbody>
              ${rows}
            </tbody>

          </table>

          <div class="footer">
            検査値クイズ
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
