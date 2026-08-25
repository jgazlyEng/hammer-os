import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { shouldUseSecureCookies } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const callbackUrl = process.env.GOOGLE_CALLBACK_URL;
  const requestUrl = new URL(request.url);
  const baseUrl = process.env.NEXTAUTH_URL ?? `${requestUrl.protocol}//${requestUrl.host}`;

  if (!clientId || !clientSecret || !callbackUrl) {
    return NextResponse.redirect(new URL("/login?error=google_oauth_not_configured", baseUrl));
  }

  const state = randomBytes(24).toString("base64url");
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: callbackUrl,
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    prompt: "select_account",
    state
  });

  const response = NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
  response.cookies.set("google_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: shouldUseSecureCookies(),
    path: "/",
    maxAge: 60 * 10
  });
  return response;
}
