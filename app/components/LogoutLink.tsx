"use client";
import { useState } from "react";
import Link from "next/link";

export default function LogoutLink() {
  const [isLoading, setIsLoading] = useState(false);
  async function handleLogout() {
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        alert(data.message || "ログアウトに失敗しました");
        return;
      }
      window.location.href = "/login";
    } catch {
      alert("ログアウト処理でエラーが発生しました");
    } finally {
      setIsLoading(false);
    }
  }
  return (
    <Link href="#" onClick={handleLogout}>
      ログアウト
    </Link>
  );
}
