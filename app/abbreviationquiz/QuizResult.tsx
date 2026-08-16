"use client";

type AnswerMode = "abbreviation-to-japanese" | "japanese-to-abbreviation";

type QuizQuestion = {
  rowNumber: number | null;
  abbreviation: string;
  japaneseName: string;
  category: string;
  area: string;
};

type QuizAnswer = {
  selectedValue: string | null;
  isCorrect: boolean | null;
};

type QuizState = {
  questionCount: number;
  answerMode: AnswerMode;
  categoryMode: "all" | "category";
  selectedCategories: string[];

  questions: QuizQuestion[];

  currentQuestionIndex: number;

  answers: QuizAnswer[];
};

type Props = {
  quizState: QuizState;

  onRetry: () => void;

  onClose: () => void;
};

/*
 * ==================================================
 * 結果画面
 * ==================================================
 */

export default function QuizResult({ quizState, onRetry, onClose }: Props) {
  /*
   * =========================
   * 集計
   * =========================
   */

  const correctCount = quizState.answers.filter(
    (answer) => answer.isCorrect === true,
  ).length;

  const incorrectCount = quizState.answers.filter(
    (answer) => answer.isCorrect === false,
  ).length;

  const unansweredCount = quizState.answers.filter(
    (answer) => answer.isCorrect === null,
  ).length;

  /*
   * =========================
   * 出題カテゴリ表示
   * =========================
   */

  const categoryLabel =
    quizState.categoryMode === "all"
      ? "全部"
      : quizState.selectedCategories.join(" / ");

  /*
   * =========================
   * 正誤表示
   * =========================
   */

  function getResultLabel(answer: QuizAnswer) {
    if (answer.isCorrect === true) {
      return "正解";
    }

    if (answer.isCorrect === false) {
      return "不正解";
    }

    return "未回答";
  }

  /*
   * =========================
   * 正答
   * =========================
   */

  function getCorrectAnswer(question: QuizQuestion) {
    if (quizState.answerMode === "abbreviation-to-japanese") {
      return question.japaneseName;
    }

    return question.abbreviation;
  }

  /*
   * =========================
   * ユーザー回答
   * =========================
   */

  function getUserAnswer(answer: QuizAnswer) {
    if (answer.selectedValue === null) {
      return "未回答";
    }

    return answer.selectedValue;
  }

  /*
   * =========================
   * 表示
   * =========================
   */

  return (
    <main>
      <h1>🧠 略語クイズ 結果</h1>

      {/* =========================
          集計
      ========================== */}

      <section>
        <h2>結果</h2>

        <p>出題カテゴリ：{categoryLabel}</p>

        <p>問題数：{quizState.questions.length}問</p>

        <p>正解：{correctCount}問</p>

        <p>不正解：{incorrectCount}問</p>

        <p>未回答：{unansweredCount}問</p>
      </section>

      {/* =========================
          問題一覧
      ========================== */}

      <section>
        <h2>問題別結果</h2>

        <div
          style={{
            width: "100%",
            overflowX: "auto",
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              minWidth: "500px",
            }}
          >
            <thead>
              <tr>
                <th
                  style={{
                    border: "1px solid #ccc",
                    padding: "8px",
                  }}
                >
                  略語
                </th>

                <th
                  style={{
                    border: "1px solid #ccc",
                    padding: "8px",
                  }}
                >
                  日本語
                </th>

                <th
                  style={{
                    border: "1px solid #ccc",
                    padding: "8px",
                  }}
                >
                  ユーザー回答
                </th>

                <th
                  style={{
                    border: "1px solid #ccc",
                    padding: "8px",
                  }}
                >
                  正答
                </th>

                <th
                  style={{
                    border: "1px solid #ccc",
                    padding: "8px",
                  }}
                >
                  正誤
                </th>
              </tr>
            </thead>

            <tbody>
              {quizState.questions.map((question, index) => {
                const answer = quizState.answers[index];

                const resultLabel = getResultLabel(answer);

                return (
                  <tr key={`${question.rowNumber}-${index}`}>
                    {/* 略語 */}

                    <td
                      style={{
                        border: "1px solid #ccc",
                        padding: "8px",
                      }}
                    >
                      {question.abbreviation}
                    </td>

                    {/* 日本語 */}

                    <td
                      style={{
                        border: "1px solid #ccc",
                        padding: "8px",
                      }}
                    >
                      {question.japaneseName}
                    </td>

                    {/* ユーザー回答 */}

                    <td
                      style={{
                        border: "1px solid #ccc",
                        padding: "8px",
                      }}
                    >
                      {getUserAnswer(answer)}
                    </td>

                    {/* 正答 */}

                    <td
                      style={{
                        border: "1px solid #ccc",
                        padding: "8px",
                      }}
                    >
                      {getCorrectAnswer(question)}
                    </td>

                    {/* 正誤 */}

                    <td
                      style={{
                        border: "1px solid #ccc",
                        padding: "8px",
                        fontWeight: "bold",
                      }}
                    >
                      {resultLabel}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* =========================
          操作
      ========================== */}

      <section>
        <button type="button" onClick={onRetry}>
          再度出題
        </button>

        <button
          type="button"
          onClick={onClose}
          style={{
            marginLeft: "10px",
          }}
        >
          閉じる
        </button>
      </section>
    </main>
  );
}
