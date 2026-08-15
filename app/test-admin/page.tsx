import { requireAdmin } from "@/lib/auth/authorization";

export default async function TestAdminPage() {
  const session = await requireAdmin();

  return (
    <main
      style={{
        padding: "40px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <h1>管理者権限テスト</h1>

      <p>管理者としてアクセスできています。</p>

      <p>ニックネーム：{session.nickname}</p>

      <p>ユーザー種別：{session.userType}</p>
    </main>
  );
}
