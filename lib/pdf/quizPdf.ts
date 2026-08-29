/*
 * ==================================================
 * クイズPDF共通モジュール
 * ==================================================
 *
 * 各クイズ画面から呼び出して使用する。
 *
 * PDFそのものを生成するのではなく、
 * 印刷用HTMLを生成してブラウザの印刷機能へ渡す。
 */

/*
 * ==================================================
 * 型
 * ==================================================
 */

export type QuizPdfSummary = {
  questionCount: number;
  correctCount: number;
  incorrectCount: number;
  unansweredCount: number;
};

/*
 * ==================================================
 * HTMLエスケープ
 * ==================================================
 *
 * クイズデータをHTMLへ埋め込む際に使用する。
 */

export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/*
 * ==================================================
 * 共通印刷ウィンドウ
 * ==================================================
 *
 * 各クイズから完成したHTMLを渡す。
 */

export function printQuizPdf(html: string): void {
  const printWindow = window.open("", "_blank", "width=900,height=700");

  if (!printWindow) {
    alert(
      "PDF出力用のウィンドウを開けませんでした。\nブラウザのポップアップブロックを確認してください。",
    );

    return;
  }

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();

  /*
   * DOM描画後に印刷ダイアログを開く。
   */

  printWindow.onload = () => {
    printWindow.focus();
    printWindow.print();
  };
}

/*
 * ==================================================
 * 共通PDF HTML
 * ==================================================
 *
 * 各クイズ固有の内容は bodyContent として渡す。
 */

export function createQuizPdfHtml(params: {
  title: string;
  bodyContent: string;
  fontSize?: string;
}): string {
  const { title, bodyContent, fontSize = "10px" } = params;

  return `
    <!DOCTYPE html>
    <html lang="ja">
      <head>
        <meta charset="UTF-8" />

        <title>${escapeHtml(title)}</title>

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
            font-size: ${fontSize};
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

          /*
           * ==========================================
           * 共通サマリー
           * ==========================================
           */

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

          /*
           * ==========================================
           * 共通テーブル
           * ==========================================
           */

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

          /*
           * ==========================================
           * 正誤
           * ==========================================
           */

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

          /*
           * ==========================================
           * 共通フッター
           * ==========================================
           */

          .footer {
            margin-top: 4mm;
            text-align: right;
            font-size: 7px;
            color: #777;
          }

          /*
           * ==========================================
           * 印刷時
           * ==========================================
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
          }
        </style>
      </head>

      <body>
        <div class="page">

          <h1>${escapeHtml(title)}</h1>

          ${bodyContent}

        </div>
      </body>
    </html>
  `;
}
