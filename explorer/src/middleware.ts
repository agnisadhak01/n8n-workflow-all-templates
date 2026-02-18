import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ADMIN_USER = process.env.ADMIN_BASIC_USER ?? "superadmin";
const ADMIN_PASS = process.env.ADMIN_BASIC_PASSWORD ?? "superpass";
const SESSION_COOKIE = "admin_session";

function isAdminPath(pathname: string): boolean {
  return pathname.startsWith("/admin") || pathname.startsWith("/api/admin");
}

function isLoginPath(pathname: string): boolean {
  return pathname === "/admin/login" || pathname === "/api/admin/auth/login";
}

function isLogoutPath(pathname: string): boolean {
  return pathname === "/api/admin/auth/logout";
}

function checkBasicAuth(request: NextRequest): boolean {
  const auth = request.headers.get("authorization");
  if (!auth?.startsWith("Basic ")) return false;
  try {
    const base64 = auth.slice(6);
    const decoded = atob(base64);
    const [user, pass] = decoded.split(":", 2);
    return user === ADMIN_USER && pass === ADMIN_PASS;
  } catch {
    return false;
  }
}

function base64UrlDecodeToBytes(str: string): Uint8Array {
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function base64UrlDecodeToString(str: string): string {
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  return atob(base64);
}

async function verifySessionCookie(cookieValue: string): Promise<boolean> {
  const secret =
    process.env.ADMIN_SESSION_SECRET ??
    process.env.ENRICHMENT_ADMIN_SECRET ??
    "dev-session-secret-change-in-production";
  const parts = cookieValue.split(".");
  if (parts.length !== 2) return false;
  const [payloadB64, sigB64] = parts;
  let payloadStr: string;
  try {
    payloadStr = base64UrlDecodeToString(payloadB64);
  } catch {
    return false;
  }
  let payload: { u?: string; exp?: number };
  try {
    payload = JSON.parse(payloadStr) as { u?: string; exp?: number };
  } catch {
    return false;
  }
  if (!payload.exp || payload.exp < Date.now()) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sigBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payloadStr)
  );
  const sigBytes = new Uint8Array(sigBuffer);
  const expectedB64 = btoa(String.fromCharCode(...sigBytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  const receivedB64 = sigB64.replace(/=+$/, "");
  if (expectedB64.length !== receivedB64.length) return false;
  for (let i = 0; i < expectedB64.length; i++) {
    if (expectedB64[i] !== receivedB64[i]) return false;
  }
  return true;
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (!isAdminPath(pathname)) {
    return NextResponse.next();
  }

  if (isLoginPath(pathname) || isLogoutPath(pathname)) {
    return NextResponse.next();
  }

  if (checkBasicAuth(request)) {
    return NextResponse.next();
  }

  const sessionCookie = request.cookies.get(SESSION_COOKIE)?.value;
  if (sessionCookie && (await verifySessionCookie(sessionCookie))) {
    return NextResponse.next();
  }

  const isHtmlRequest =
    request.headers.get("accept")?.includes("text/html") ?? false;
  if (isHtmlRequest) {
    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return new NextResponse("Authentication required", {
    status: 401,
    headers: {
      "WWW-Authenticate": "Basic realm=\"Admin\", charset=\"UTF-8\"",
    },
  });
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
