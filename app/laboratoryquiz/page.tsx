import { getAbbreviations } from "@/lib/repositories/abbreviationRepository";
import LaboratoryQuiz from "./LaboratoryQuiz";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type LaboratoryData = {
  [key: string]: string | number | null | undefined;
};

export default async function LaboratoryQuizPage() {
  /*
   * =========================
   * スプレッドシートから取得
   * =========================
   *
   * 略語クイズと同じく、
   * 既存の getAbbreviations() で
   * 用語マスタを全件取得する。
   */
  const data = await getAbbreviations();

  /*
   * =========================
   * クイズ対象データ
   * =========================
   *
   * カテゴリ「検査値」のみを対象とする。
   *
   * 病態領域はデータ上空欄なので、
   * クイズ側では使用しない。
   */
  const quizData = data.filter((item: LaboratoryData) => {
    const category = String(item["カテゴリ"] ?? "").trim();

    return category === "検査値";
  });

  /*
   * =========================
   * 重複統合
   * =========================
   *
   * 同じ検査値が重複登録されている場合、
   * 「略語 + 日本語名 + 基準値下限 + 基準値上限 + 単位」
   * が同じものは1件にまとめる。
   *
   * 例：
   *
   * Na | ナトリウム | 138 | 146 | mEq/L
   *
   * が複数存在しても1問として扱う。
   */
  const uniqueMap = new Map<string, LaboratoryData>();

  for (const item of quizData) {
    const abbreviation = String(item["略語"] ?? "").trim();

    const japaneseName = String(item["日本語名"] ?? "").trim();

    const lowerLimit = String(item["基準値下限"] ?? "").trim();

    const upperLimit = String(item["基準値上限"] ?? "").trim();

    const unit = String(item["単位"] ?? "").trim();

    const key = [abbreviation, japaneseName, lowerLimit, upperLimit, unit].join(
      "|||",
    );

    if (!uniqueMap.has(key)) {
      uniqueMap.set(key, item);
    }
  }

  const uniqueQuizData = Array.from(uniqueMap.values());

  return (
    <main>
      <LaboratoryQuiz data={uniqueQuizData} />
    </main>
  );
}
