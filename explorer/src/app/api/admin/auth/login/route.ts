import { NextResponse } from "next/server";
import {
  createSessionToken,
  getSessionCookieName,
  getSessionCookieOptions,
} from "@/lib/auth-session";

const ADMIN_USER =
  process.env.ADMIN_BASIC_USER ?? "superadmin";
const ADMIN_PASS =
  process.env.ADMIN_BASIC_PASSWORD ?? "superpass";

export async function POST(request: Request) {
  const formData = await request.formData();
  const username = (formData.get("username") as string)?.trim() ?? "";
  const password = (formData.get("password") as string) ?? "";
  const redirectTo = (formData.get("redirect") as string)?.trim() || "/admin/enrichment";

  if (username !== ADMIN_USER || password !== ADMIN_PASS) {
    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("error", "invalid");
    return NextResponse.redirect(loginUrl);
  }

  const token = createSessionToken(username);
  const opts = getSessionCookieOptions(request);
  const response = NextResponse.redirect(new URL(redirectTo, request.url));
  response.cookies.set({
    ...opts,
    value: token,
  });
  return response;
}
