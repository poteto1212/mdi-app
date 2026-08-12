import { getAbbreviations } from "@/lib/repositories/abbreviationRepository";
import AbbreviationSearch from "./AbbreviationSearch";
import styles from "./abbreviations.module.css";

export default async function AbbreviationsPage() {
  const data = await getAbbreviations();

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
