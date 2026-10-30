import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { COMING_SOON_PATH, isComingSoonMode } from "@/shared/lib/coming-soon-gate";

export function proxy(request: NextRequest) {
  if (!isComingSoonMode(process.env)) {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;
  if (pathname === "/api" || pathname.startsWith("/api/")) {
    return NextResponse.json(
      { message: "서비스 준비 중입니다." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  const response =
    pathname === COMING_SOON_PATH
      ? NextResponse.next()
      : NextResponse.rewrite(new URL(COMING_SOON_PATH, request.url));
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
