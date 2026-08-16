import { getAbbreviations } from "@/lib/repositories/abbreviationRepository";

/*
 * ==================================================
 * クイズ問題データ
 * ==================================================
 *
 * 1レコード = 1問
 *
 * rowNumber は元のスプレッドシート上の行番号。
 * 将来的な問題管理などに利用できるよう保持する。
 */

export type AbbreviationQuizQuestion = {
  rowNumber: number | null;
  abbreviation: string;
  japaneseName: string;
  category: string;
  area: string;
};

/*
 * ==================================================
 * 元データの型
 * ==================================================
 */

type AbbreviationRecord = {
  [key: string]: string | number | null | undefined;
};

/*
 * ==================================================
 * 表記補正
 * ==================================================
 *
 * クイズ対象データの重複判定用。
 *
 * ・前後の空白を除去
 * ・ひらがな / カタカナを同一視
 * ・大文字 / 小文字を同一視
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
 * クイズ対象データ取得
 * ==================================================
 *
 * 以下を満たすレコードだけを返す。
 *
 * 1. カテゴリ「検査値」を除外
 * 2. 略語が空欄なら除外
 * 3. 日本語名が空欄なら除外
 * 4. 略語＋日本語名が完全一致する重複を統合
 */

export async function getAbbreviationQuizQuestions(): Promise<
  AbbreviationQuizQuestion[]
> {
  const data = (await getAbbreviations()) as AbbreviationRecord[];

  /*
   * 重複排除用Map
   *
   * キー：
   *   正規化した略語 + 日本語名
   */
  const questionMap = new Map<string, AbbreviationQuizQuestion>();

  for (const item of data) {
    /*
     * =========================
     * 基本データ
     * =========================
     */

    const abbreviation = String(item["略語"] ?? "").trim();

    const japaneseName = String(item["日本語名"] ?? "").trim();

    const category = String(item["カテゴリ"] ?? "").trim();

    const area = String(item["病態領域"] ?? "").trim();

    /*
     * =========================
     * クイズ対象外
     * =========================
     */

    // 略語が空欄
    if (!abbreviation) {
      continue;
    }

    // 日本語名が空欄
    if (!japaneseName) {
      continue;
    }

    // 検査値カテゴリ
    if (category === "検査値") {
      continue;
    }

    /*
     * =========================
     * 重複判定
     * =========================
     *
     * 略語＋日本語名の完全一致を
     * 1問に統合する。
     */

    const key = `${normalize(abbreviation)}|||${normalize(japaneseName)}`;

    /*
     * すでに存在する場合は追加しない
     */

    if (questionMap.has(key)) {
      continue;
    }

    /*
     * =========================
     * rowNumber
     * =========================
     */

    const rawRowNumber = item["rowNumber"];

    const rowNumber =
      rawRowNumber !== null &&
      rawRowNumber !== undefined &&
      String(rawRowNumber).trim() !== ""
        ? Number(rawRowNumber)
        : null;

    /*
     * =========================
     * 問題作成
     * =========================
     */

    questionMap.set(key, {
      rowNumber: Number.isFinite(rowNumber) ? rowNumber : null,
      abbreviation,
      japaneseName,
      category,
      area,
    });
  }

  return Array.from(questionMap.values());
}
