import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import LogoutButton from "./LogoutButton";
import styles from "./Header.module.css";

export default async function Header() {
  const session = await getSession();

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        {/* =========================
            左側
        ========================== */}

        <Link href="/" className={styles.homeButton}>
          🏠 ホーム
        </Link>

        {/* =========================
            右側
        ========================== */}

        {session && (
          <div className={styles.right}>
            <span className={styles.nickname}>{session.nickname} さん</span>

            <LogoutButton />
          </div>
        )}
      </div>
    </header>
  );
}
