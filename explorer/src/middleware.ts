import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ADMIN_USER = process.env.ADMIN_BASIC_USER ?? "superadmin";
const ADMIN_PASS = process.env.ADMIN_BASIC_PASSWORD ?? "superpass";

function isAdminPath(pathname: string): boolean {
  return pathname.startsWith("/admin") || pathname.startsWith("/api/admin");
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

export function middleware(request: NextRequest) {
  if (!isAdminPath(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  if (!checkBasicAuth(request)) {
    return new NextResponse("Authentication required", {
      status: 401,
      headers: {
        "WWW-Authenticate": "Basic realm=\"Admin\", charset=\"UTF-8\"",
      },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
