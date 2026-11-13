import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { WORK_HOME_PATH } from "@/shared/lib/app-paths";
import {
  COMING_SOON_PATH,
  MEMBER_SESSION_COOKIE,
  isComingSoonMode,
  isGateOpenPath,
  shouldSendToWorkHome,
} from "@/shared/lib/coming-soon-gate";

function passOrSendToWorkHome(request: NextRequest): NextResponse {
  const hasMemberSession = request.cookies.has(MEMBER_SESSION_COOKIE);
  if (!shouldSendToWorkHome(request.nextUrl.pathname, hasMemberSession)) {
    return NextResponse.next();
  }
  const response = NextResponse.redirect(new URL(WORK_HOME_PATH, request.url));
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export function proxy(request: NextRequest) {
  if (!isComingSoonMode(process.env)) {
    return passOrSendToWorkHome(request);
  }

  const { pathname } = request.nextUrl;
  if (isGateOpenPath(pathname, request.method, process.env)) {
    return passOrSendToWorkHome(request);
  }
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
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.png|brand/).*)"],
};
