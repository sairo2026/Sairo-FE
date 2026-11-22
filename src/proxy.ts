import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { WORK_HOME_PATH } from "@/shared/lib/app-paths";
import {
  CSP_NONCE_HEADER,
  buildContentSecurityPolicy,
  createNonce,
  cspHeaderName,
  resolveCspMode,
} from "@/shared/lib/csp";
import {
  COMING_SOON_PATH,
  MEMBER_SESSION_COOKIE,
  isComingSoonMode,
  isGateOpenPath,
  shouldSendToWorkHome,
} from "@/shared/lib/coming-soon-gate";

export const EDGE_TOKEN_HEADER = "x-sairo-edge-token";

function isApiPath(pathname: string): boolean {
  return pathname === "/api" || pathname.startsWith("/api/");
}

// The API origin trusts the client address header from this edge only when this token matches.
function nextWithEdgeToken(request: NextRequest, headers: Headers): NextResponse {
  if (!isApiPath(request.nextUrl.pathname)) {
    return NextResponse.next({ request: { headers } });
  }
  headers.delete(EDGE_TOKEN_HEADER);
  const token = process.env.SAIRO_EDGE_TOKEN;
  if (token) {
    headers.set(EDGE_TOKEN_HEADER, token);
  }
  return NextResponse.next({ request: { headers } });
}

function passOrSendToWorkHome(request: NextRequest, headers: Headers): NextResponse {
  const hasMemberSession = request.cookies.has(MEMBER_SESSION_COOKIE);
  if (!shouldSendToWorkHome(request.nextUrl.pathname, hasMemberSession)) {
    return nextWithEdgeToken(request, headers);
  }
  const response = NextResponse.redirect(new URL(WORK_HOME_PATH, request.url));
  response.headers.set("Cache-Control", "no-store");
  return response;
}

function route(request: NextRequest, headers: Headers): NextResponse {
  if (!isComingSoonMode(process.env)) {
    return passOrSendToWorkHome(request, headers);
  }

  const { pathname } = request.nextUrl;
  if (isGateOpenPath(pathname, request.method, process.env)) {
    return passOrSendToWorkHome(request, headers);
  }
  if (isApiPath(pathname)) {
    return NextResponse.json(
      { message: "서비스 준비 중입니다." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  const response =
    pathname === COMING_SOON_PATH
      ? NextResponse.next({ request: { headers } })
      : NextResponse.rewrite(new URL(COMING_SOON_PATH, request.url), { request: { headers } });
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export function proxy(request: NextRequest) {
  const headers = new Headers(request.headers);
  if (isApiPath(request.nextUrl.pathname)) {
    return route(request, headers);
  }
  const nonce = createNonce();
  const policy = buildContentSecurityPolicy(nonce, process.env.NODE_ENV === "development");
  headers.set(CSP_NONCE_HEADER, nonce);
  headers.set("Content-Security-Policy", policy);
  const response = route(request, headers);
  response.headers.set(cspHeaderName(resolveCspMode(process.env)), policy);
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.png|brand/|email/).*)"],
};
