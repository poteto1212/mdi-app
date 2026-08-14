import { getAbbreviations } from "@/lib/repositories/abbreviationRepository";
import AbbreviationSearch from "./AbbreviationSearch";
import styles from "./abbreviations.module.css";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AbbreviationsPage() {
  const data = await getAbbreviations();
  console.log(data);

  return (
    <main className={styles.container}>
      {/* =========================
          略語データベース
      ========================== */}
      <div className={styles.card}>
        <h2 className={styles.heading}>📋 略語データベース</h2>
      </div>

      <AbbreviationSearch data={data} />
    </main>
  );
}
