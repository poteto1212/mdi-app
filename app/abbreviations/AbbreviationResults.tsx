"use client";

import { useMemo } from "react";
import styles from "./abbreviations.module.css";

type Abbreviation = {
  [key: string]: string | number | null | undefined;
};

type Props = {
  data: Abbreviation[];
  searchText: string;
  searchDomain: string;
  selectedCategories: string[];
};

export default function AbbreviationResults({
  data,
  searchText,
  searchDomain,
  selectedCategories,
}: Props) {
  /*
   * 検索
   */
  const filteredData = useMemo(() => {
    const text = searchText.toLowerCase().trim();
    const domain = searchDomain.toLowerCase().trim();

    return data.filter((item) => {
      /*
       * キーワード検索
       *
       * 略語・日本語名・英語名
       */
      const matchText =
        !text ||
        String(item["略語"] ?? "")
          .toLowerCase()
          .includes(text) ||
        String(item["日本語名"] ?? "")
          .toLowerCase()
          .includes(text) ||
        String(item["英語名"] ?? "")
          .toLowerCase()
          .includes(text);

      /*
       * カテゴリ検索
       */
      const category = String(item["カテゴリ"] ?? "");

      const matchCategory = !category || selectedCategories.includes(category);

      /*
       * 病態領域検索
       */
      const matchDomain =
        !domain ||
        String(item["病態領域"] ?? "")
          .toLowerCase()
          .includes(domain);

      return matchText && matchCategory && matchDomain;
    });
  }, [data, searchText, searchDomain, selectedCategories]);

  /*
   * 検索条件が入力されているか
   */
  const hasSearchCondition =
    searchText.trim() !== "" || searchDomain.trim() !== "";

  return (
    <div className={styles.card}>
      <h3 className={styles.sectionHeading}>📋 検索結果</h3>

      {/*
       * 初期状態
       */}
      {!hasSearchCondition ? (
        <div className={styles.noResult}>キーワードを入力してください</div>
      ) : filteredData.length === 0 ? (
        /*
         * 検索結果なし
         */
        <div className={styles.noResult}>該当するデータがありません</div>
      ) : (
        /*
         * 検索結果
         */
        filteredData.map((item, index) => {
          /*
           * rowNumber
           *
           * 今後の更新・編集・クイズ機能などで
           * 利用できるよう保持しておく
           */
          const rowNumber = item["rowNumber"];

          /*
           * 基本情報
           */
          const abbreviation = String(item["略語"] ?? "");

          const japaneseName = String(item["日本語名"] ?? "");

          const englishName = String(item["英語名"] ?? "");

          const category = String(item["カテゴリ"] ?? "");

          /*
           * 基準値
           */
          const min = item["基準値下限"];

          const max = item["基準値上限"];

          const unit = String(item["単位"] ?? "");

          /*
           * 病態情報
           */
          const domain = String(item["病態領域"] ?? "");

          const description = String(item["解説"] ?? "");

          /*
           * 基準値が存在するか
           */
          const hasMin = min !== "" && min !== null && min !== undefined;

          const hasMax = max !== "" && max !== null && max !== undefined;

          /*
           * カード
           */
          return (
            <div
              className={styles.result}
              key={
                rowNumber !== null && rowNumber !== undefined
                  ? String(rowNumber)
                  : index
              }
            >
              {/* 略語 */}
              <div className={styles.resultTitle}>{abbreviation}</div>

              {/* 日本語名・英語名 */}
              <div className={styles.resultSub}>
                {japaneseName}

                {englishName && (
                  <>
                    {" / "}
                    {englishName}
                  </>
                )}
              </div>

              {/* カテゴリ */}
              {category && (
                <div className={styles.resultCategory}>{category}</div>
              )}

              {/* 基準値：下限＋上限 */}
              {hasMin && hasMax && (
                <div className={styles.resultDetail}>
                  基準値：
                  <span className={styles.range}>
                    {Number(min).toFixed(2)}
                    {" ～ "}
                    {Number(max).toFixed(2)}
                    {unit && ` ${unit}`}
                  </span>
                </div>
              )}

              {/* 基準値：下限のみ */}
              {hasMin && !hasMax && (
                <div className={styles.resultDetail}>
                  基準値：
                  <span className={styles.range}>
                    ≧ {Number(min).toFixed(2)}
                    {unit && ` ${unit}`}
                  </span>
                </div>
              )}

              {/* 基準値：上限のみ */}
              {!hasMin && hasMax && (
                <div className={styles.resultDetail}>
                  基準値：
                  <span className={styles.range}>
                    ≦ {Number(max).toFixed(2)}
                    {unit && ` ${unit}`}
                  </span>
                </div>
              )}

              {/* 病態領域 */}
              {domain && (
                <div className={styles.resultDetail}>
                  病態領域：
                  {domain}
                </div>
              )}

              {/* 解説 */}
              {description && (
                <div className={styles.resultDetail}>{description}</div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
