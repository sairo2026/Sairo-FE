import { readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

export type RouteArea = "public" | "office" | "ops";

export type AppRoute = { path: string; area: RouteArea };

const APP_DIR = join(process.cwd(), "src", "app");

export const MOCK_APPROVER_TOKEN = "approver-token-primary-0001";

const PARAM_VALUES: Record<string, string> = {
  token: MOCK_APPROVER_TOKEN,
  yearMonth: "2026-10",
  kind: "terms",
  version: "1.0",
};

const PUBLIC_ROOTS = [
  "/login",
  "/signup",
  "/password",
  "/legal",
  "/pricing",
  "/coming-soon",
  "/approver",
  "/visit-responses",
  "/grant",
  "/return",
  "/unsubscribe",
  "/support/enterprise",
];

function isPublicPath(path: string): boolean {
  return PUBLIC_ROOTS.some((root) => path === root || path.startsWith(`${root}/`));
}

function collectPageFiles(dir: string, found: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      if (name === "demo") continue;
      collectPageFiles(full, found);
    } else if (name === "page.tsx") {
      found.push(full);
    }
  }
  return found;
}

function toRoute(file: string): AppRoute {
  const segments = relative(APP_DIR, file)
    .split(sep)
    .slice(0, -1)
    .filter((segment) => !/^\(.+\)$/.test(segment))
    .map((segment) => {
      const name = /^\[(.+)\]$/.exec(segment)?.[1];
      return name ? (PARAM_VALUES[name] ?? "1") : segment;
    });
  const path = segments.length === 0 ? "/" : `/${segments.join("/")}`;
  const area: RouteArea =
    path === "/ops" || path.startsWith("/ops/") ? "ops" : isPublicPath(path) ? "public" : "office";
  return { path, area };
}

export function listAppRoutes(): AppRoute[] {
  return collectPageFiles(APP_DIR)
    .map(toRoute)
    .sort((a, b) => a.path.localeCompare(b.path));
}
