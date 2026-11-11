import { QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, render, waitFor } from "@testing-library/react";
import axe from "axe-core";
import type { ReactElement, ReactNode } from "react";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { AuthEventsProvider } from "@/features/auth/components/auth-events-provider";
import OpsConsoleLayout from "@/app/ops/(console)/layout";
import { createQueryClient } from "@/shared/api/query-client";
import { findLegalDocumentByPolicyKind } from "@/shared/legal/registry";
import { MOCK_ACTIVE_CONTEXT, resetMockAuthState, setMockAuthContext } from "@/mocks/handlers/auth";
import { resetMockOpsSession } from "@/mocks/handlers/ops-session";
import { MOCK_PRIMARY_TOKEN } from "@/mocks/handlers/visit-approver";
import { startMockServer } from "@/mocks/server";
import { RouteInterrupt, navigationState } from "./navigation-mock";

type PageModule = {
  default: (props: {
    params: Promise<Record<string, string>>;
    searchParams: Promise<Record<string, string>>;
  }) => ReactElement | Promise<ReactElement>;
};

type PageLoader = () => Promise<PageModule>;

const pageModules = import.meta.glob<PageModule>("/src/app/**/page.tsx");

const PARAM_VALUES: Record<string, string> = {
  token: MOCK_PRIMARY_TOKEN,
  yearMonth: "2026-10",
  kind: "terms",
  version: findLegalDocumentByPolicyKind("terms")?.version ?? "",
};

export type RouteCase = {
  path: string;
  params: Record<string, string>;
  load: PageLoader;
  isOpsConsole: boolean;
};

function toRouteCase(file: string, load: PageLoader): RouteCase | null {
  const route = file.replace(/^\/src\/app/, "").replace(/\/page\.tsx$/, "");
  if (route.startsWith("/demo")) return null;
  const params: Record<string, string> = {};
  const path =
    route
      .split("/")
      .filter((segment) => segment !== "" && !/^\(.+\)$/.test(segment))
      .map((segment) => {
        const name = /^\[(.+)\]$/.exec(segment)?.[1];
        if (!name) return segment;
        const value = PARAM_VALUES[name] ?? "1";
        params[name] = value;
        return value;
      })
      .map((segment) => `/${segment}`)
      .join("") || "/";
  return { path, params, load, isOpsConsole: route.includes("/ops/(console)") };
}

export const routeCases: RouteCase[] = Object.entries(pageModules)
  .map(([file, load]) => toRouteCase(file, load))
  .filter((item): item is RouteCase => item !== null)
  .sort((a, b) => a.path.localeCompare(b.path));

export const ROUTE_AREAS = {
  office: (route: RouteCase) =>
    !route.isOpsConsole && !route.path.startsWith("/ops") && !isPublicPath(route.path),
  public: (route: RouteCase) =>
    !route.isOpsConsole && !route.path.startsWith("/ops") && isPublicPath(route.path),
  ops: (route: RouteCase) => route.isOpsConsole || route.path.startsWith("/ops"),
} as const;

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

const AXE_OPTIONS: axe.RunOptions = {
  resultTypes: ["violations"],
  rules: {
    "color-contrast": { enabled: false },
  },
};

function describeViolation(violation: axe.Result): string {
  const targets = violation.nodes
    .slice(0, 3)
    .map((node) => node.target.join(" "))
    .join(" | ");
  return `${violation.id} (${violation.impact ?? "unknown"}): ${violation.help} -> ${targets}`;
}

export async function expectNoAxeViolations(container: Element): Promise<void> {
  const result = await axe.run(container, AXE_OPTIONS);
  expect(result.violations.map(describeViolation)).toEqual([]);
}

function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={createQueryClient()}>
      <AuthEventsProvider>{children}</AuthEventsProvider>
    </QueryClientProvider>
  );
}

async function settle(container: HTMLElement): Promise<void> {
  try {
    await waitFor(
      () => {
        expect(container.querySelector('[aria-busy="true"]')).toBeNull();
      },
      { timeout: 8000 },
    );
  } catch {
    return;
  }
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 250));
  });
}

export async function renderRoute(route: RouteCase): Promise<HTMLElement | null> {
  navigationState.pathname = route.path;
  navigationState.params = route.params;
  navigationState.search = "";
  const page = await route.load();
  let element: ReactElement;
  try {
    element = await page.default({
      params: Promise.resolve(route.params),
      searchParams: Promise.resolve({}),
    });
  } catch (error) {
    if (error instanceof RouteInterrupt) return null;
    throw error;
  }
  const tree = route.isOpsConsole ? <OpsConsoleLayout>{element}</OpsConsoleLayout> : element;
  const view = render(<Providers>{tree}</Providers>);
  await settle(view.container);
  return view.container;
}

export function defineRouteA11yTests(
  area: keyof typeof ROUTE_AREAS,
  role: "OWNER" | "AGENT" = "OWNER",
) {
  const routes = routeCases.filter(ROUTE_AREAS[area]);
  let stopServer: () => void;

  describe(`route accessibility (${area})`, () => {
    beforeAll(() => {
      stopServer = startMockServer();
    });

    beforeEach(() => {
      resetMockAuthState();
      resetMockOpsSession();
      setMockAuthContext({ ...MOCK_ACTIVE_CONTEXT, role });
    });

    afterEach(() => {
      cleanup();
    });

    afterAll(() => {
      stopServer();
    });

    it("has routes to audit", () => {
      expect(routes.length).toBeGreaterThan(0);
    });

    for (const route of routes) {
      it(route.path, async () => {
        const container = await renderRoute(route);
        if (container === null) return;
        await expectNoAxeViolations(container);
      });
    }
  });
}
