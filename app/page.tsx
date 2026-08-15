import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import styles from "./page.module.css";

export default async function Home() {
  const session = await getSession();

  const isLoggedIn = session !== null;
  const isAdmin = session?.userType === "管理";

  return (
    <main className={styles.container}>
      {/* =========================
          ヘッダー
      ========================== */}
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>💊 医療データベース</h1>
          <p className={styles.subtitle}>医療用語・採用薬データベース</p>
        </div>

        {/* ログインユーザー */}
        {isLoggedIn && (
          <div className={styles.userArea}>
            <span className={styles.userNickname}>{session.nickname}</span>

            <span className={styles.userType}>{session.userType}</span>

            <Link href="/api/auth/logout" className={styles.logoutButton}>
              ログアウト
            </Link>
          </div>
        )}
      </header>

      {/* =========================
          データベース
      ========================== */}
      <section className={styles.card}>
        <h2 className={styles.sectionHeading}>📚 データベース</h2>

        <div className={styles.menuGrid}>
          {/* 略語検索 */}
          <Link href="/abbreviations" className={styles.menuItem}>
            <div className={styles.menuIcon}>📋</div>

            <div>
              <div className={styles.menuTitle}>略語検索</div>

              <div className={styles.menuDescription}>
                医療略語・日本語名・英語名を検索
              </div>
            </div>
          </Link>

          {/* 採用薬検索 */}
          {isLoggedIn && (
            <Link href="/medications" className={styles.menuItem}>
              <div className={styles.menuIcon}>💊</div>

              <div>
                <div className={styles.menuTitle}>採用薬検索</div>

                <div className={styles.menuDescription}>
                  採用薬の薬品情報を検索
                </div>
              </div>
            </Link>
          )}
        </div>
      </section>

      {/* =========================
          クイズ
      ========================== */}
      <section className={styles.card}>
        <h2 className={styles.sectionHeading}>🧠 クイズ</h2>

        <div className={styles.menuGrid}>
          {/* 略語クイズ */}
          <Link href="/quiz/abbreviations" className={styles.menuItem}>
            <div className={styles.menuIcon}>📋</div>

            <div>
              <div className={styles.menuTitle}>略語クイズ</div>

              <div className={styles.menuDescription}>
                医療略語に関するクイズ
              </div>
            </div>
          </Link>

          {/* 検査クイズ */}
          <Link href="/quiz/laboratory" className={styles.menuItem}>
            <div className={styles.menuIcon}>🧪</div>

            <div>
              <div className={styles.menuTitle}>検査クイズ</div>

              <div className={styles.menuDescription}>
                検査値・基準値に関するクイズ
              </div>
            </div>
          </Link>

          {/* 薬品クイズ */}
          {isLoggedIn && (
            <Link href="/quiz/medications" className={styles.menuItem}>
              <div className={styles.menuIcon}>💊</div>

              <div>
                <div className={styles.menuTitle}>薬品クイズ</div>

                <div className={styles.menuDescription}>
                  採用薬に関するクイズ
                </div>
              </div>
            </Link>
          )}
        </div>
      </section>

      {/* =========================
          管理画面
      ========================== */}
      {isAdmin && (
        <section className={styles.card}>
          <h2 className={styles.sectionHeading}>⚙️ 管理画面</h2>

          <div className={styles.menuGrid}>
            {/* 薬品管理 */}
            <a
              href={process.env.GAS_MEDICATION_ADMIN_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.menuItem}
            >
              <div className={styles.menuIcon}>💊</div>

              <div>
                <div className={styles.menuTitle}>薬品管理</div>

                <div className={styles.menuDescription}>薬品管理GASを開く</div>
              </div>
            </a>

            {/* 略語管理 */}
            <a
              href={process.env.GAS_ABBREVIATION_ADMIN_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.menuItem}
            >
              <div className={styles.menuIcon}>📋</div>

              <div>
                <div className={styles.menuTitle}>略語管理</div>

                <div className={styles.menuDescription}>略語管理GASを開く</div>
              </div>
            </a>
          </div>
        </section>
      )}
    </main>
  );
}
