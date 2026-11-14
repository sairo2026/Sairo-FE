import type { BrowserContext, Route } from "@playwright/test";

const CALLBACKS: Record<string, string> = {
  LOGIN: "/api/auth/kakao/callback",
  STEP_UP: "/api/auth/step-up/kakao/callback",
  OPERATOR: "/api/ops/auth/kakao/callback",
  OPERATOR_INVITATION: "/api/ops/auth/invitations/kakao/callback",
};

function callbackFor(stubUrl: string, kakaoUserId: number, origin: string): string | null {
  const url = new URL(stubUrl);
  const path = CALLBACKS[url.searchParams.get("flow") ?? "LOGIN"];
  if (!path) return null;
  const state = encodeURIComponent(url.searchParams.get("state") ?? "");
  return `${origin}${path}?code=${kakaoUserId}&state=${state}`;
}

export async function routeKakaoStub(context: BrowserContext, kakaoUserId: number, origin: string) {
  await context.route("https://kauth.stub.invalid/**", async (route: Route) => {
    const target = callbackFor(route.request().url(), kakaoUserId, origin);
    if (!target) {
      await route.abort();
      return;
    }
    await route.fulfill({ status: 302, headers: { location: target } });
  });
  await context.route(/\/api\/.*kakao\/start$/, async (route: Route) => {
    const response = await route.fetch({ maxRedirects: 0 });
    const location = response.headers()["location"];
    if (response.status() === 302 && location?.startsWith("https://kauth.stub.invalid/")) {
      const target = callbackFor(location, kakaoUserId, origin);
      if (target) {
        await route.fulfill({
          response,
          headers: { ...response.headers(), location: target },
        });
        return;
      }
    }
    await route.fulfill({ response });
  });
}
