import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE_NAME = "hammer_session";

const publicPrefixes = ["/login", "/api/auth", "/_next", "/favicon.ico", "/pdf.worker.min.mjs"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (publicPrefixes.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  if (!isPostgresConfigured()) {
    return NextResponse.next();
  }

  const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (sessionToken && await isValidSessionToken(sessionToken)) return NextResponse.next();

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!.*\\..*).*)"]
};

function isPostgresConfigured() {
  const dataMode = (process.env.GREENLIGHT_DATA_MODE ?? process.env.HAMMER_DATA_MODE ?? "").trim().toLowerCase();
  if (dataMode === "demo" || dataMode === "local") return false;
  if (dataMode === "database" || dataMode === "production") {
    return Boolean(process.env.DATABASE_URL?.startsWith("postgresql://") || process.env.DATABASE_URL?.startsWith("postgres://"));
  }
  if (process.env.NODE_ENV === "development") return false;
  return Boolean(process.env.DATABASE_URL?.startsWith("postgresql://") || process.env.DATABASE_URL?.startsWith("postgres://"));
}

async function isValidSessionToken(token: string) {
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return false;
  const expectedSignature = await sign(encoded);
  if (!safeEqual(signature, expectedSignature)) return false;

  try {
    const payload = JSON.parse(new TextDecoder().decode(base64UrlToBytes(encoded))) as { exp?: number };
    return Boolean(payload.exp && payload.exp > Date.now());
  } catch {
    return false;
  }
}

async function sign(value: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(process.env.SESSION_SECRET ?? "hammer-local-development-session-secret"),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return bytesToBase64Url(new Uint8Array(signature));
}

function safeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let index = 0; index < left.length; index += 1) {
    diff |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return diff === 0;
}

function base64UrlToBytes(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  return Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
}

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
