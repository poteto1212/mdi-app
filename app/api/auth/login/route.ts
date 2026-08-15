import { NextResponse } from "next/server";
import { authenticateUser } from "@/lib/auth/authenticateUser";
import { createSession } from "@/lib/auth/session";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const id = String(body.id ?? "");
    const password = String(body.password ?? "");

    if (!id || !password) {
      return NextResponse.json(
        {
          success: false,
          message: "IDとパスワードを入力してください",
        },
        { status: 400 },
      );
    }

    const result = await authenticateUser(id, password);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          message: "IDまたはパスワードが正しくありません",
        },
        { status: 401 },
      );
    }

    await createSession(result.user.nickname, result.user.userType);

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("Login error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "ログイン処理でエラーが発生しました",
      },
      { status: 500 },
    );
  }
}
