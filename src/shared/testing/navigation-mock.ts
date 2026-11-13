import { vi } from "vitest";

export class RouteInterrupt extends Error {
  constructor(public readonly kind: "notFound" | "redirect") {
    super(kind);
  }
}

export const navigationState = {
  pathname: "/",
  search: "",
  params: {} as Record<string, string>,
  replace: vi.fn(),
  push: vi.fn(),
  back: vi.fn(),
  refresh: vi.fn(),
};

export const navigationMock = {
  useRouter: () => ({
    replace: navigationState.replace,
    push: navigationState.push,
    back: navigationState.back,
    refresh: navigationState.refresh,
    prefetch: vi.fn(),
  }),
  usePathname: () => navigationState.pathname,
  useSearchParams: () => new URLSearchParams(navigationState.search),
  useParams: () => navigationState.params,
  useServerInsertedHTML: () => undefined,
  notFound: () => {
    throw new RouteInterrupt("notFound");
  },
  redirect: () => {
    throw new RouteInterrupt("redirect");
  },
};
