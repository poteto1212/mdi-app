import { getAbbreviations } from "@/lib/repositories/abbreviationRepository";
import AbbreviationSearch from "./AbbreviationSearch";

export default async function AbbreviationsPage() {
  const data = await getAbbreviations();

  return (
    <main className="container">
      {/* =========================
          検索
      ========================== */}
      <div className="card">
        <h2>📋 略語データベース</h2>
      </div>

      <AbbreviationSearch data={data}/>

      {/* =========================
          検索結果
      ========================== */}
    </main>
  );
}
