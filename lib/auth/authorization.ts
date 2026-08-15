import { redirect } from "next/navigation";
import { getSession } from "./session";

/*
 * ログイン必須
 *
 * 未ログインの場合はログイン画面へ移動
 *
 * 戻り値：
 * ログイン済み → Session
 */
export async function requireLogin() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  return session;
}

/*
 * 管理ユーザー必須
 *
 * 未ログイン
 * → ログイン画面へ
 *
 * 一般ユーザー
 * → ホーム画面へ
 *
 * 管理ユーザー
 * → Sessionを返す
 */
export async function requireAdmin() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  if (session.userType !== "管理") {
    redirect("/");
  }

  return session;
}
