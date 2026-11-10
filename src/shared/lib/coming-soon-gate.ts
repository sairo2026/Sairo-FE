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

export function isGateOpenPath(pathname: string, method: string): boolean {
  if (OPEN_PAGE_PATHS.includes(pathname)) return true;
  if (OPEN_PAGE_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return true;
  return method === "GET" && OPEN_PUBLIC_API_PATHS.includes(pathname);
}
