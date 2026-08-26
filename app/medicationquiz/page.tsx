import { getMedications } from "@/lib/repositories/medicationRepository";
import MedicationQuiz from "./MedicationQuiz";
import { requireLogin } from "@/lib/auth/authorization";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type MedicationData = {
  [key: string]: string | number | null | undefined;
};

export default async function MedicationQuizPage() {
  await requireLogin();
  const data = await getMedications();
  /*
   * =========================
   * クイズ対象データ
   * =========================
   *
   * 薬品名が空欄のレコードは
   * クイズ対象外とする。
   */

  const quizData = data.filter((item: MedicationData) => {
    const medicationName = String(item["薬品名"] ?? "").trim();

    return medicationName !== "";
  });

  /*
   * =========================
   * 重複統合
   * =========================
   *
   * 以下が完全一致するレコードは
   * 同一レコードとして扱う。
   *
   * ・成分
   * ・大分類
   * ・小分類
   * ・剤型
   *
   * ※薬品名・規格などは重複判定に使用しない。
   */

  const uniqueMap = new Map<string, MedicationData>();

  for (const item of quizData) {
    const ingredient = String(item["成分名"] ?? "").trim();

    const largeCategory = String(item["大分類"] ?? "").trim();

    const smallCategory = String(item["小分類"] ?? "").trim();

    const dosageForm = String(item["剤型"] ?? "").trim();

    const key = [ingredient, largeCategory, smallCategory, dosageForm].join(
      "|||",
    );

    if (!uniqueMap.has(key)) {
      uniqueMap.set(key, item);
    }
  }

  const uniqueQuizData = Array.from(uniqueMap.values());

  return (
    <main>
      <MedicationQuiz data={uniqueQuizData} />
    </main>
  );
}
