import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";

export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({
        authenticated: false,
      });
    }

    return NextResponse.json({
      authenticated: true,
      nickname: session.nickname,
      userType: session.userType,
    });
  } catch (error) {
    console.error("Session error:", error);

    return NextResponse.json(
      {
        authenticated: false,
        message: "セッション取得でエラーが発生しました",
      },
      { status: 500 },
    );
  }
}
