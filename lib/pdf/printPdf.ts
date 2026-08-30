/*
 * ==================================================
 * 共通PDF印刷処理
 * ==================================================
 *
 * 各クイズから生成された印刷用HTMLを
 * ブラウザの印刷ウィンドウへ渡す。
 *
 * 実際のPDF化はブラウザの
 * 「PDFとして保存」を利用する。
 * ==================================================
 */

export function printHtmlDocument(html: string): void {
  const printWindow = window.open("", "_blank", "width=900,height=700");

  if (!printWindow) {
    alert(
      "PDF出力用のウィンドウを開けませんでした。\nブラウザのポップアップブロックを確認してください。",
    );

    return;
  }

  /*
   * ==================================================
   * HTMLを書き込む
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
