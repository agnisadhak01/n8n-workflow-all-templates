import { NextResponse } from "next/server";
import { getSessionCookieName } from "@/lib/auth-session";

export async function POST(request: Request) {
  const response = NextResponse.redirect(new URL("/admin/login", request.url));
  response.cookies.set({
    name: getSessionCookieName(),
    value: "",
    path: "/",
    maxAge: 0,
  });
  return response;
}

export async function GET(request: Request) {
  const response = NextResponse.redirect(new URL("/admin/login", request.url));
  response.cookies.set({
    name: getSessionCookieName(),
    value: "",
    path: "/",
    maxAge: 0,
  });
  return response;
}
