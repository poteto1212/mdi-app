"use client";

import { useState } from "react";
import styles from "./login.module.css";

export default function LoginPage() {
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleLogin() {
    setError("");

    if (!id.trim() || !password) {
      setError("IDとパスワードを入力してください");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: id.trim(),
          password,
        }),
      });

      const data = await response.json();

      /*
       * =========================
       * ログイン失敗
       * =========================
       */

      if (!response.ok || !data.success) {
        setError(data.message || "IDまたはパスワードが正しくありません");

        return;
      }

      /*
       * =========================
       * ログイン成功
       * =========================
       *
       * Cookieが更新されたため、
       * ブラウザから新しいリクエストを発生させる。
       *
       * これにより layout.tsx → Header.tsx が
       * 再実行され、最新のセッション情報が取得される。
       */

      window.location.href = "/";
    } catch {
      setError("ログイン処理でエラーが発生しました");
    } finally {
      setIsLoading(false);
    }
  }

  /*
   * =========================
   * Enterキーでログイン
   * =========================
   */

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      handleLogin();
    }
  }

  return (
    <main className={styles.container}>
      <div className={styles.card}>
        <h2 className={styles.heading}>🔐 ログイン</h2>

        {/* =========================
            ID
        ========================== */}

        <div className={styles.formGroup}>
          <label className={styles.label} htmlFor="loginId">
            ID
          </label>

          <input
            className={styles.input}
            id="loginId"
            type="text"
            value={id}
            onChange={(e) => setId(e.target.value)}
            onKeyDown={handleKeyDown}
            autoComplete="username"
            placeholder="IDを入力"
            disabled={isLoading}
          />
        </div>

        {/* =========================
            パスワード
        ========================== */}

        <div className={styles.formGroup}>
          <label className={styles.label} htmlFor="password">
            パスワード
          </label>

          <input
            className={styles.input}
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={handleKeyDown}
            autoComplete="current-password"
            placeholder="パスワードを入力"
            disabled={isLoading}
          />
        </div>

        {/* =========================
            エラー
        ========================== */}

        {error && <div className={styles.error}>{error}</div>}

        {/* =========================
            ログインボタン
        ========================== */}

        <button
          className={styles.loginButton}
          type="button"
          onClick={handleLogin}
          disabled={isLoading}
        >
          {isLoading ? "ログイン中..." : "ログイン"}
        </button>
      </div>
    </main>
  );
}
