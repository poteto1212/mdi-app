"use client";

import { useMemo, useState } from "react";
import MedicationResults from "./MedicationResults";
import styles from "./medications.module.css";

type Medication = {
  [key: string]: string | number | null | undefined;
};

type Props = {
  data: Medication[];
};

const FORM_OPTIONS = ["内服", "外用", "注射"];

export default function MedicationSearch({ data }: Props) {
  const [searchName, setSearchName] = useState("");
  const [searchCategory, setSearchCategory] = useState("");
  const [searchSubcategory, setSearchSubcategory] = useState("");

  /*
   * =========================
   * 剤型
   * =========================
   *
   * 初期状態はすべて選択
   */

  const [selectedForms, setSelectedForms] = useState<string[]>([
    "内服",
    "外用",
    "注射",
  ]);

  /*
   * =========================
   * 大分類一覧
   * =========================
   */

  const categories = useMemo(() => {
    return Array.from(
      new Set(
        data
          .map((item) => String(item["大分類"] ?? "").trim())
          .filter((value) => value !== ""),
      ),
    ).sort((a, b) => a.localeCompare(b, "ja"));
  }, [data]);

  /*
   * =========================
   * 小分類一覧
   * =========================
   */

  const subcategories = useMemo(() => {
    return Array.from(
      new Set(
        data
          .map((item) => String(item["小分類"] ?? "").trim())
          .filter((value) => value !== ""),
      ),
    ).sort((a, b) => a.localeCompare(b, "ja"));
  }, [data]);

  /*
   * =========================
   * 大分類候補
   * =========================
   */

  const categorySuggestions = useMemo(() => {
    const input = searchCategory.toLowerCase().trim();

    if (!input) {
      return [];
    }

    return categories.filter((category) =>
      category.toLowerCase().includes(input),
    );
  }, [categories, searchCategory]);

  /*
   * =========================
   * 小分類候補
   * =========================
   */

  const subcategorySuggestions = useMemo(() => {
    const input = searchSubcategory.toLowerCase().trim();

    if (!input) {
      return [];
    }

    return subcategories.filter((subcategory) =>
      subcategory.toLowerCase().includes(input),
    );
  }, [subcategories, searchSubcategory]);

  /*
   * =========================
   * 剤型切り替え
   * =========================
   */

  function toggleForm(form: string) {
    setSelectedForms((current) => {
      if (current.includes(form)) {
        return current.filter((item) => item !== form);
      }

      return [...current, form];
    });
  }

  /*
   * =========================
   * 検索条件リセット
   * =========================
   */

  function resetSearch() {
    setSearchName("");
    setSearchCategory("");
    setSearchSubcategory("");

    setSelectedForms(["内服", "外用", "注射"]);
  }

  /*
   * =========================
   * 大分類候補選択
   * =========================
   */

  function selectCategory(category: string) {
    setSearchCategory(category);
  }

  /*
   * =========================
   * 小分類候補選択
   * =========================
   */

  function selectSubcategory(subcategory: string) {
    setSearchSubcategory(subcategory);
  }

  return (
    <>
      {/* =========================
          検索条件
      ========================== */}

      <div className={styles.card}>
        <div className={styles.searchHeader}>
          <h3 className={styles.sectionHeading}>🔎 薬品検索</h3>

          <button
            type="button"
            className={styles.resetButton}
            onClick={resetSearch}
          >
            条件をリセット
          </button>
        </div>

        {/* =========================
            薬品名・成分名
        ========================== */}

        <label className={styles.label} htmlFor="searchName">
          薬品名・成分名
        </label>

        <input
          className={styles.input}
          id="searchName"
          type="text"
          placeholder="薬品名または成分名を検索"
          autoComplete="off"
          value={searchName}
          onChange={(e) => setSearchName(e.target.value)}
        />

        {/* =========================
            大分類
        ========================== */}

        <label className={styles.label} htmlFor="searchCategory">
          大分類
        </label>

        <input
          className={styles.input}
          id="searchCategory"
          type="text"
          placeholder="大分類を入力"
          autoComplete="off"
          value={searchCategory}
          onChange={(e) => setSearchCategory(e.target.value)}
        />

        {searchCategory.trim() !== "" && categorySuggestions.length > 0 && (
          <div className={styles.suggestions}>
            <div className={styles.suggestionTitle}>登録済みの候補</div>

            {categorySuggestions.map((category) => (
              <button
                type="button"
                key={category}
                className={styles.suggestion}
                onClick={() => selectCategory(category)}
              >
                {category}
              </button>
            ))}
          </div>
        )}

        {/* =========================
            小分類
        ========================== */}

        <label className={styles.label} htmlFor="searchSubcategory">
          小分類
        </label>

        <input
          className={styles.input}
          id="searchSubcategory"
          type="text"
          placeholder="小分類を入力"
          autoComplete="off"
          value={searchSubcategory}
          onChange={(e) => setSearchSubcategory(e.target.value)}
        />

        {searchSubcategory.trim() !== "" &&
          subcategorySuggestions.length > 0 && (
            <div className={styles.suggestions}>
              <div className={styles.suggestionTitle}>登録済みの候補</div>

              {subcategorySuggestions.map((subcategory) => (
                <button
                  type="button"
                  key={subcategory}
                  className={styles.suggestion}
                  onClick={() => selectSubcategory(subcategory)}
                >
                  {subcategory}
                </button>
              ))}
            </div>
          )}

        {/* =========================
            剤型
        ========================== */}

        <label className={styles.label}>剤型</label>

        <div className={styles.formChecks}>
          {FORM_OPTIONS.map((form) => (
            <label className={styles.formLabel} key={form}>
              <input
                className={styles.formInput}
                type="checkbox"
                checked={selectedForms.includes(form)}
                onChange={() => toggleForm(form)}
              />

              {form}
            </label>
          ))}
        </div>
      </div>

      {/* =========================
          検索結果
      ========================== */}

      <MedicationResults
        data={data}
        searchName={searchName}
        searchCategory={searchCategory}
        searchSubcategory={searchSubcategory}
        selectedForms={selectedForms}
      />
    </>
  );
}
