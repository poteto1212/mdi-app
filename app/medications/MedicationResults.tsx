"use client";

import { useMemo, useState } from "react";
import styles from "./medications.module.css";

type Medication = {
  [key: string]: string | number | null | undefined;
};

type Props = {
  data: Medication[];
  searchName: string;
  searchCategory: string;
  searchSubcategory: string;
  selectedForms: string[];
};

export default function MedicationResults({
  data,
  searchName,
  searchCategory,
  searchSubcategory,
  selectedForms,
}: Props) {
  /*
   * =========================
   * 選択中の薬品
   * =========================
   */

  const [selectedMedication, setSelectedMedication] =
    useState<Medication | null>(null);

  /*
   * =========================
   * 表記正規化
   * =========================
   *
   * ・英字 → 小文字
   * ・カタカナ → ひらがな
   *
   * 例：
   *
   * ロキソプロフェン
   * ↓
   * ろきそぷろふぇん
   */

  function normalize(value: unknown) {
    return String(value ?? "")
      .toLowerCase()
      .replace(/[ァ-ヶ]/g, (char) =>
        String.fromCharCode(char.charCodeAt(0) - 0x60),
      );
  }

  /*
   * =========================
   * 検索
   * =========================
   */

  const filteredData = useMemo(() => {
    const text = normalize(searchName.trim());

    const category = searchCategory.trim();

    const subcategory = searchSubcategory.trim();

    return data.filter((item) => {
      /*
       * =========================
       * 薬品名・成分名
       * =========================
       */

      const name = normalize(item["薬品名"]);

      const ingredient = normalize(item["成分名"]);

      const matchText =
        !text ||
        name.includes(text) ||
        ingredient.includes(text) ||
        text.includes(name) ||
        text.includes(ingredient);

      /*
       * =========================
       * 大分類
       * =========================
       */

      const itemCategory = String(item["大分類"] ?? "").trim();

      const matchCategory = !category || itemCategory === category;

      /*
       * =========================
       * 小分類
       * =========================
       */

      const itemSubcategory = String(item["小分類"] ?? "").trim();

      const matchSubcategory = !subcategory || itemSubcategory === subcategory;

      /*
       * =========================
       * 剤型
       * =========================
       *
       * ★重要
       *
       * スプレッドシートの列名は
       *
       * 「剤型」
       *
       * なので「剤形」ではなく
       * 「剤型」を使用する。
       */

      const form = String(item["剤型"] ?? "").trim();

      const matchForm = selectedForms.includes(form);

      /*
       * =========================
       * AND条件
       * =========================
       */

      return matchText && matchCategory && matchSubcategory && matchForm;
    });
  }, [data, searchName, searchCategory, searchSubcategory, selectedForms]);

  /*
   * =========================
   * 検索条件があるか
   * =========================
   *
   * 剤型だけでは検索開始しない。
   */

  const hasSearchCondition =
    searchName.trim() !== "" ||
    searchCategory.trim() !== "" ||
    searchSubcategory.trim() !== "";

  /*
   * =========================
   * 薬品選択
   * =========================
   */

  function selectMedication(medication: Medication) {
    setSelectedMedication(medication);
  }

  return (
    <>
      {/* =========================
          検索結果
      ========================== */}

      <div className={styles.card}>
        <h3 className={styles.sectionHeading}>📋 検索結果</h3>

        {!hasSearchCondition ? (
          <div className={styles.noResult}>キーワードを入力してください</div>
        ) : filteredData.length === 0 ? (
          <div className={styles.noResult}>該当する薬品がありません</div>
        ) : (
          <>
            <div className={styles.resultCount}>{filteredData.length}件</div>

            {filteredData.map((item, index) => {
              const rowNumber = item["rowNumber"];

              const medicationName = String(item["薬品名"] ?? "");

              const ingredient = String(item["成分名"] ?? "");

              const category = String(item["大分類"] ?? "");

              const subcategory = String(item["小分類"] ?? "");

              /*
               * ★「剤型」に統一
               */
              const form = String(item["剤型"] ?? "");

              return (
                <button
                  type="button"
                  className={styles.result}
                  key={
                    rowNumber !== null && rowNumber !== undefined
                      ? String(rowNumber)
                      : `${medicationName}-${index}`
                  }
                  onClick={() => selectMedication(item)}
                >
                  {/* 薬品名 */}

                  <div className={styles.resultTitle}>{medicationName}</div>

                  {/* 成分 */}

                  <div className={styles.resultSub}>成分：{ingredient}</div>

                  {/* 大分類 */}

                  <div className={styles.resultDetail}>大分類：{category}</div>

                  {/* 小分類 */}

                  <div className={styles.resultDetail}>
                    小分類：{subcategory}
                  </div>

                  {/* 剤型 */}

                  <div className={styles.resultDetail}>剤型：{form}</div>
                </button>
              );
            })}
          </>
        )}
      </div>

      {/* =========================
          選択した薬品の詳細
      ========================== */}

      {selectedMedication && (
        <MedicationDetail medication={selectedMedication} />
      )}
    </>
  );
}

/*
 * ==================================================
 * 薬品詳細
 * ==================================================
 */

type MedicationDetailProps = {
  medication: Medication;
};

function MedicationDetail({ medication }: MedicationDetailProps) {
  /*
   * ★「剤型」に統一
   */
  const form = String(medication["剤型"] ?? "");

  return (
    <div className={styles.card}>
      <h3 className={styles.sectionHeading}>💊 薬品情報</h3>

      {/* =========================
          基本情報
      ========================== */}

      <div className={styles.detailGroup}>
        <div className={styles.detailLabel}>薬品名</div>

        <div className={styles.detailValue}>
          {String(medication["薬品名"] ?? "")}
        </div>
      </div>

      <div className={styles.detailGroup}>
        <div className={styles.detailLabel}>成分名</div>

        <div className={styles.detailValue}>
          {String(medication["成分名"] ?? "")}
        </div>
      </div>

      <div className={styles.detailGroup}>
        <div className={styles.detailLabel}>大分類</div>

        <div className={styles.detailValue}>
          {String(medication["大分類"] ?? "")}
        </div>
      </div>

      <div className={styles.detailGroup}>
        <div className={styles.detailLabel}>小分類</div>

        <div className={styles.detailValue}>
          {String(medication["小分類"] ?? "")}
        </div>
      </div>

      <div className={styles.detailGroup}>
        <div className={styles.detailLabel}>剤型</div>

        <div className={styles.detailValue}>{form}</div>
      </div>

      <div className={styles.detailGroup}>
        <div className={styles.detailLabel}>用法用量</div>

        <div className={styles.detailValue}>
          {String(medication["用法用量"] ?? "")}
        </div>
      </div>

      <div className={styles.detailGroup}>
        <div className={styles.detailLabel}>治療的位置付け</div>

        <div className={styles.detailValue}>
          {String(medication["治療的位置付け"] ?? "")}
        </div>
      </div>

      {/* =========================
          内服情報
      ========================== */}

      {form === "内服" && (
        <>
          <h4 className={styles.subHeading}>💊 内服情報</h4>

          <div className={styles.detailGroup}>
            <div className={styles.detailLabel}>主な同効薬</div>

            <div className={styles.detailValue}>
              {String(medication["主な同効薬"] ?? "")}
            </div>
          </div>

          <div className={styles.detailGroup}>
            <div className={styles.detailLabel}>粉砕可否</div>

            <div className={styles.detailValue}>
              {String(medication["粉砕可否"] ?? "")}
            </div>
          </div>

          <div className={styles.detailGroup}>
            <div className={styles.detailLabel}>簡易懸濁可否</div>

            <div className={styles.detailValue}>
              {String(medication["簡易懸濁可否"] ?? "")}
            </div>
          </div>
        </>
      )}

      {/* =========================
          注射情報
      ========================== */}

      {form === "注射" && (
        <>
          <h4 className={styles.subHeading}>💉 注射情報</h4>

          <div className={styles.detailGroup}>
            <div className={styles.detailLabel}>生食配合可否</div>

            <div className={styles.detailValue}>
              {String(medication["生食配合可否"] ?? "")}
            </div>
          </div>

          <div className={styles.detailGroup}>
            <div className={styles.detailLabel}>ブドウ糖配合可否</div>

            <div className={styles.detailValue}>
              {String(medication["ブドウ糖配合可否"] ?? "")}
            </div>
          </div>

          <div className={styles.detailGroup}>
            <div className={styles.detailLabel}>配合注意</div>

            <div className={styles.detailValue}>
              {String(medication["配合注意"] ?? "")}
            </div>
          </div>
        </>
      )}

      {/* =========================
          その他
      ========================== */}

      <h4 className={styles.subHeading}>その他</h4>

      <div className={styles.detailGroup}>
        <div className={styles.detailLabel}>その他注意</div>

        <div className={styles.detailValue}>
          {String(medication["その他注意"] ?? "")}
        </div>
      </div>
    </div>
  );
}
