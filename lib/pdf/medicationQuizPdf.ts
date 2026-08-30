import { printHtmlDocument } from "./printPdf";

/*
 * ==================================================
 * 薬品クイズPDF用型
 * ==================================================
 */

export type MedicationQuizLevel = "large" | "small" | "ingredient";

export type MedicationQuizPdfQuestion = {
  id: string;

  level: MedicationQuizLevel;

  questionValue: string;

  dosageForms: string[];

  correctMedications: string[];
};

export type MedicationQuizPdfAnswer = {
  selectedMedications: string[];

  correctMedications: string[];

  missedMedications: string[];

  extraMedications: string[];

  score: number;

  isPerfect: boolean;
};

export type MedicationQuizPdfState = {
  questionCount: number;

  questions: MedicationQuizPdfQuestion[];

  currentQuestionIndex: number;

  answers: MedicationQuizPdfAnswer[];
};

/*
 * ==================================================
 * レベル表示
 * ==================================================
 */

function getLevelLabel(level: MedicationQuizLevel): string {
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
 * 紙形式テストPDF出力
 * ==================================================
 *
 * 1ページ目：解答なし
 * 2ページ目：解答あり
 *
 * 渡されたquestionsをそのまま使用する。
 * ここでは再抽選しない。
 * ==================================================
 */

export function printMedicationQuizPaper(
  quizState: MedicationQuizPdfState,
): void {
  /*
   * ==================================================
   * 1ページあたりの問題数
   * ==================================================
   */

  const QUESTIONS_PER_PAGE = 7;

  /*
   * ==================================================
   * 問題を7問ずつに分割
   * ==================================================
   */

  function chunkQuestions(
    questions: MedicationQuizPdfQuestion[],
  ): MedicationQuizPdfQuestion[][] {
    const chunks: MedicationQuizPdfQuestion[][] = [];

    for (let i = 0; i < questions.length; i += QUESTIONS_PER_PAGE) {
      chunks.push(questions.slice(i, i + QUESTIONS_PER_PAGE));
    }

    return chunks;
  }

  const questionChunks = chunkQuestions(quizState.questions);

  /*
   * ==================================================
   * 解答なしページ生成
   * ==================================================
   */

  const testPages = questionChunks
    .map((questions) => {
      const testRows = questions
        .map((question) => {
          const index = quizState.questions.indexOf(question);

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
                <div class="answer-label">
                  薬品名
                </div>

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

      return `
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
      `;
    })
    .join("");

  /*
   * ==================================================
   * 解答ありページ生成
   * ==================================================
   */

  const answerPages = questionChunks
    .map((questions) => {
      const answerRows = questions
        .map((question) => {
          const index = quizState.questions.indexOf(question);

          const correctText =
            question.correctMedications.length > 0
              ? question.correctMedications.join("、")
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
                <div class="answer-label">
                  解答
                </div>

                <div class="answer-text">
                  ${escapeHtml(correctText)}
                </div>
              </td>

            </tr>
          `;
        })
        .join("");

      return `
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

          .page {
            width: 190mm;
            max-width: 190mm;
            height: 277mm;
            max-height: 277mm;

            margin: 0 auto;

            position: relative;
          }

          .page + .page {
            break-before: page;
            page-break-before: always;
          }

          h1 {
            margin: 0 0 3mm;

            text-align: center;

            font-size: 17px;

            line-height: 1.3;
          }

          .test-info {
            display: flex;

            justify-content: space-between;

            margin-bottom: 4mm;

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

          .answer-label {
            margin-bottom: 1mm;

            font-weight: bold;

            color: #555;
          }

          .answer-text {
            font-size: 10px;

            line-height: 1.6;
          }

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

          .footer {
            position: absolute;

            bottom: 0;

            right: 0;

            color: #777;

            font-size: 7px;
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

              height: 277mm;

              max-height: 277mm;
            }

            tr {
              break-inside: avoid;

              page-break-inside: avoid;
            }
          }

        </style>

      </head>

      <body>

        ${testPages}

        ${answerPages}

      </body>

    </html>
  `;

  /*
   * ==================================================
   * 共通印刷処理へ渡す
   * ==================================================
   */

  printHtmlDocument(html);
}

/*
 * ==================================================
 * 結果PDF出力
 * ==================================================
 */

export function printMedicationQuizResult(
  quizState: MedicationQuizPdfState,
): void {
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

  /*
   * ==================================================
   * 共通印刷処理へ渡す
   * ==================================================
   */

  printHtmlDocument(html);
}
