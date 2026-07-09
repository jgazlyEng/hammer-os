import { NextResponse } from "next/server";
import { createSessionCookie, SESSION_COOKIE_NAME, shouldUseSecureCookies, upsertGoogleUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const expectedState = request.headers.get("cookie")
    ?.split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith("google_oauth_state="))
    ?.slice("google_oauth_state=".length);
  const baseUrl = process.env.NEXTAUTH_URL ?? `${url.protocol}//${url.host}`;

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=missing_code", baseUrl));
  }
  if (!state || !expectedState || state !== expectedState) {
    return NextResponse.redirect(new URL("/login?error=invalid_google_state", baseUrl));
  }

  try {
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID ?? "",
        client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
        redirect_uri: process.env.GOOGLE_CALLBACK_URL ?? "",
        grant_type: "authorization_code"
      })
    });

    if (!tokenResponse.ok) throw new Error("Google token exchange failed.");
    const tokenData = await tokenResponse.json() as { access_token?: string };
    if (!tokenData.access_token) throw new Error("Google did not return an access token.");

    const profileResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });
    if (!profileResponse.ok) throw new Error("Google profile lookup failed.");

    const profile = await profileResponse.json() as { id: string; email: string; name?: string; picture?: string };
    const user = await upsertGoogleUser(profile);
    const response = NextResponse.redirect(new URL("/dashboard", baseUrl));
    response.cookies.delete("google_oauth_state");
    response.cookies.set(SESSION_COOKIE_NAME, createSessionCookie(user), {
      httpOnly: true,
      sameSite: "lax",
      secure: shouldUseSecureCookies(),
      path: "/",
      maxAge: 60 * 60 * 12
    });
    return response;
  } catch {
    return NextResponse.redirect(new URL("/login?error=google_signin_failed", baseUrl));
  }
}
