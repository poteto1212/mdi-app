"use client";

import { useMemo, useState } from "react";
import AbbreviationResults from "./AbbreviationResults";
import styles from "./abbreviations.module.css";

type Abbreviation = {
  [key: string]: string | number | null | undefined;
};

type Props = {
  data: Abbreviation[];
};

export default function AbbreviationSearch({ data }: Props) {
  const [searchText, setSearchText] = useState("");
  const [searchDomain, setSearchDomain] = useState("");

  const [categories, setCategories] = useState(["検査値", "病態", "法規制度"]);

  /*
   * カテゴリ切り替え
   */
  function toggleCategory(category: string) {
    setCategories((current) =>
      current.includes(category)
        ? current.filter((item) => item !== category)
        : [...current, category],
    );
  }

  /*
   * 登録済みの病態領域を取得
   * 重複は除外する
   */
  const domains = useMemo(() => {
    return Array.from(
      new Set(
        data
          .map((item) => String(item["病態領域"] ?? "").trim())
          .filter((domain) => domain !== ""),
      ),
    );
  }, [data]);

  /*
   * 病態領域の検索候補
   */
  const domainSuggestions = useMemo(() => {
    const input = searchDomain.toLowerCase().trim();

    if (!input) {
      return [];
    }

    return domains.filter((domain) => domain.toLowerCase().includes(input));
  }, [domains, searchDomain]);

  /*
   * 病態領域候補を選択
   *
   * 選択した候補を
   * 検索ボックスへ自動入力する
   */
  function selectDomain(domain: string) {
    setSearchDomain(domain);
  }

  return (
    <>
      {/* =========================
          検索
      ========================== */}

      <div className={styles.card}>
        <h3 className={styles.sectionHeading}>🔎 検索</h3>

        <label className={styles.label} htmlFor="searchText">
          キーワード
        </label>

        <input
          className={styles.input}
          id="searchText"
          placeholder="略語・日本語名・英語名を入力"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
        />

        <label className={styles.label}>カテゴリ</label>

        <div className={styles.categoryChecks}>
          {["検査値", "病態", "法規制度"].map((category) => (
            <label className={styles.categoryLabel} key={category}>
              <input
                className={styles.categoryInput}
                type="checkbox"
                value={category}
                checked={categories.includes(category)}
                onChange={() => toggleCategory(category)}
              />

              {category}
            </label>
          ))}
        </div>

        <label className={styles.label} htmlFor="searchDomain">
          病態領域で絞り込み
        </label>

        <input
          className={styles.input}
          id="searchDomain"
          placeholder="病態領域を入力"
          autoComplete="off"
          value={searchDomain}
          onChange={(e) => setSearchDomain(e.target.value)}
        />

        {/* =========================
            病態領域候補
        ========================== */}

        {searchDomain.trim() !== "" && domainSuggestions.length > 0 && (
          <div className={styles.domainSuggestions}>
            <div className={styles.domainSuggestionTitle}>
              登録済みの病態領域
            </div>

            {domainSuggestions.map((domain) => (
              <div
                key={domain}
                className={styles.domainSuggestion}
                onClick={() => selectDomain(domain)}
              >
                {domain}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* =========================
          検索結果
      ========================== */}

      <AbbreviationResults
        data={data}
        searchText={searchText}
        searchDomain={searchDomain}
        selectedCategories={categories}
      />
    </>
  );
}
