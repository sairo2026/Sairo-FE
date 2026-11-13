import { test as base } from "@playwright/test";

export { expect } from "@playwright/test";

export const test = base.extend<{ apiFailures: void }>({
  apiFailures: [
    async ({ page }, use, testInfo) => {
      const failures: string[] = [];
      page.on("response", async (response) => {
        const url = new URL(response.url());
        if (!url.pathname.startsWith("/api/") || response.status() < 400) return;
        const text = await response.text().catch(() => "");
        failures.push(
          `${response.request().method()} ${url.pathname} ${response.status()} ${text.slice(0, 300)}`,
        );
      });
      await use();
      if (failures.length > 0) {
        await testInfo.attach("api-failures", {
          body: failures.join("\n"),
          contentType: "text/plain",
        });
        if (testInfo.status !== testInfo.expectedStatus) console.log(failures.join("\n"));
      }
    },
    { auto: true },
  ],
});
