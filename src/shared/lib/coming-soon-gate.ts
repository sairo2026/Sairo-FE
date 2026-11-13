import { LANDING_PATH } from "./app-paths";

type GateEnv = Readonly<Record<string, string | undefined>>;

export const COMING_SOON_PATH = "/coming-soon";

export function isComingSoonMode(env: GateEnv): boolean {
  if (env.COMING_SOON === "true") {
    return true;
  }
  if (env.COMING_SOON === "false") {
    return false;
  }
  return env.VERCEL_ENV === "production";
}

const OPEN_PAGE_PATHS: readonly string[] = ["/pricing", "/legal"];
const OPEN_PAGE_PREFIXES: readonly string[] = ["/legal/"];
const OPEN_PUBLIC_API_PATHS: readonly string[] = [
  "/api/public/pricing",
  "/api/public/company-info",
];

export function isReviewMode(env: GateEnv): boolean {
  return env.REVIEW_MODE === "true";
}

const REVIEW_PAGE_ROOTS: readonly string[] = [
  "/home",
  "/login",
  "/signup",
  "/password",
  "/reconsent",
  "/office",
  "/billing",
  "/account",
  "/support",
  "/settings",
  "/access",
  "/removed",
  "/members",
];

function isReviewPagePath(pathname: string): boolean {
  if (pathname === "/") return true;
  return REVIEW_PAGE_ROOTS.some((root) => pathname === root || pathname.startsWith(`${root}/`));
}

function isApiPath(pathname: string): boolean {
  return pathname === "/api" || pathname.startsWith("/api/");
}

export function isGateOpenPath(pathname: string, method: string, env: GateEnv = {}): boolean {
  if (isReviewMode(env) && (isReviewPagePath(pathname) || isApiPath(pathname))) return true;
  if (OPEN_PAGE_PATHS.includes(pathname)) return true;
  if (OPEN_PAGE_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return true;
  return method === "GET" && OPEN_PUBLIC_API_PATHS.includes(pathname);
}

export const MEMBER_SESSION_COOKIE = "__Host-sairo_session";

export function shouldSendToWorkHome(pathname: string, hasMemberSession: boolean): boolean {
  return pathname === LANDING_PATH && hasMemberSession;
}
