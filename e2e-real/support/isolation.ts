import type { BrowserContext } from "@playwright/test";
import { API_ORIGIN, FRONT_ORIGIN } from "./env";

export async function protectLocalContext(context: BrowserContext) {
  const allowed = new Set([API_ORIGIN, FRONT_ORIGIN]);
  // Register before the Kakao stub, so its explicitly mocked requests take precedence.
  await context.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (!allowed.has(url.origin)) {
      await route.abort("blockedbyclient");
      return;
    }
    const response = await route.fetch({ maxRedirects: 0 });
    const location = response.headers()["location"];
    if (response.status() >= 300 && response.status() < 400 && location) {
      const target = new URL(location, url);
      if (!allowed.has(target.origin)) {
        await route.abort("blockedbyclient");
        return;
      }
    }
    await route.fulfill({ response });
  });
}
