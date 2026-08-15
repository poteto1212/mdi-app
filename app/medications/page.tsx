import { requireLogin } from "@/lib/auth/authorization";
import { getMedications } from "@/lib/repositories/medicationRepository";
import MedicationSearch from "./MedicationSearch";
import styles from "./medications.module.css";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function MedicationsPage() {
  await requireLogin();
  const data = await getMedications();
  return (
    <main className={styles.container}>
      {/* =========================
          採用薬データベース
      ========================== */}
      <div className={styles.card}>
        <h2 className={styles.heading}>💊 採用薬データベース</h2>
      </div>

      <MedicationSearch data={data} />
    </main>
  );
}
