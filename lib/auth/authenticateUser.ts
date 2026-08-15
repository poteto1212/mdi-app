import { getUsers } from "@/lib/repositories/userRepository";

type AuthenticatedUser = {
  nickname: string;
  userType: "一般" | "管理";
};

type AuthenticationResult =
  | {
      success: true;
      user: AuthenticatedUser;
    }
  | {
      success: false;
    };

export async function authenticateUser(
  id: string,
  password: string,
): Promise<AuthenticationResult> {
  const users = await getUsers();

  const inputId = id.trim();
  const inputPassword = password;

  const user = users.find(
    (item) =>
      String(item["ID"] ?? "").trim() === inputId &&
      String(item["パスワード"] ?? "") === inputPassword,
  );

  if (!user) {
    return {
      success: false,
    };
  }

  const userType = String(user["ユーザー種別"] ?? "");

  if (userType !== "一般" && userType !== "管理") {
    return {
      success: false,
    };
  }

  return {
    success: true,
    user: {
      nickname: String(user["ニックネーム"] ?? ""),
      userType,
    },
  };
}
