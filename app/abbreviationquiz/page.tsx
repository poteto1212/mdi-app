import { getAbbreviations } from "@/lib/repositories/abbreviationRepository";
import AbbreviationQuiz from "./AbbreviationQuiz";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Abbreviation = {
  [key: string]: string | number | null | undefined;
};

export default async function AbbreviationQuizPage() {
  /*
   * =========================
   * スプレッドシートから取得
   * =========================
   */
  const data = await getAbbreviations();

  /*
   * =========================
   * クイズ対象データ
   * =========================
   *
   * ・カテゴリ「検査値」 → 除外
   * ・略語が空欄 → 除外
   * ・日本語名が空欄 → 除外
   */
  const quizData = data.filter((item: Abbreviation) => {
    const category = String(item["カテゴリ"] ?? "").trim();
    const abbreviation = String(item["略語"] ?? "").trim();
    const japaneseName = String(item["日本語名"] ?? "").trim();

    if (category === "検査値") {
      return false;
    }

    if (!abbreviation || !japaneseName) {
      return false;
    }

    return true;
  });

  /*
   * =========================
   * 重複統合
   * =========================
   */
  const uniqueMap = new Map<string, Abbreviation>();

  for (const item of quizData) {
    const abbreviation = String(item["略語"] ?? "").trim();
    const japaneseName = String(item["日本語名"] ?? "").trim();

    const key = `${abbreviation}|||${japaneseName}`;

    if (!uniqueMap.has(key)) {
      uniqueMap.set(key, item);
    }
  }

  const uniqueQuizData = Array.from(uniqueMap.values());

  return (
    <main>
      <AbbreviationQuiz data={uniqueQuizData} />
    </main>
  );
}
