import { cookies } from "next/headers";
import crypto from "crypto";

const SESSION_COOKIE_NAME = "app_session";

const SESSION_MAX_AGE = 60 * 60 * 24; // 1日

type SessionPayload = {
  nickname: string;
  userType: "一般" | "管理";
  exp: number;
};

function getAuthSecret() {
  const secret = process.env.AUTH_SECRET;

  if (!secret) {
    throw new Error("AUTH_SECRET is not set");
  }

  return secret;
}

/*
 * Base64URLエンコード
 */
function base64UrlEncode(value: string) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

/*
 * Base64URLデコード
 */
function base64UrlDecode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

/*
 * 署名生成
 */
function createSignature(payload: string) {
  return crypto
    .createHmac("sha256", getAuthSecret())
    .update(payload)
    .digest("base64url");
}

/*
 * セッション作成
 */
export async function createSession(
  nickname: string,
  userType: "一般" | "管理",
) {
  const payload: SessionPayload = {
    nickname,
    userType,
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE,
  };

  const encodedPayload = base64UrlEncode(JSON.stringify(payload));

  const signature = createSignature(encodedPayload);

  const token = `${encodedPayload}.${signature}`;

  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });
}

/*
 * セッション取得
 */
export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();

  const cookie = cookieStore.get(SESSION_COOKIE_NAME);

  if (!cookie?.value) {
    return null;
  }

  const [encodedPayload, signature] = cookie.value.split(".");

  if (!encodedPayload || !signature) {
    return null;
  }

  /*
   * 署名検証
   */
  const expectedSignature = createSignature(encodedPayload);

  const signatureBuffer = Buffer.from(signature);

  const expectedSignatureBuffer = Buffer.from(expectedSignature);

  if (signatureBuffer.length !== expectedSignatureBuffer.length) {
    return null;
  }

  if (!crypto.timingSafeEqual(signatureBuffer, expectedSignatureBuffer)) {
    return null;
  }

  /*
   * payload復号
   */
  try {
    const payload = JSON.parse(
      base64UrlDecode(encodedPayload),
    ) as SessionPayload;

    /*
     * 有効期限チェック
     */
    if (payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

/*
 * ログアウト
 */
export async function deleteSession() {
  const cookieStore = await cookies();

  cookieStore.delete(SESSION_COOKIE_NAME);
}
