"use client";

import { useState } from "react";

export default function LogoutButton() {
  const [isLoading, setIsLoading] = useState(false);

  async function handleLogout() {
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
      });

      const data = await response.json();

      /*
       * =========================
       * ログアウト失敗
       * =========================
       */

      if (!response.ok || !data.success) {
        alert(data.message || "ログアウトに失敗しました");

        return;
      }

      /*
       * =========================
       * ログアウト成功
       * =========================
       *
       * Cookieが削除されたため、
       * ブラウザから新しいリクエストを発生させる。
       *
       * これにより layout.tsx → Header.tsx が
       * 再実行され、ログアウト状態が反映される。
       */

      window.location.href = "/login";
    } catch {
      alert("ログアウト処理でエラーが発生しました");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={isLoading}
      style={{
        border: "none",
        background: "transparent",
        cursor: isLoading ? "default" : "pointer",
        color: "#666",
        padding: 0,
      }}
    >
      {isLoading ? "ログアウト中..." : "ログアウト"}
    </button>
  );
}
