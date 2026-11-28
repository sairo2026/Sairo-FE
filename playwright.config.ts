import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3000);
const visualCaptureIgnore = process.env.VISUAL_CAPTURE ? [] : ["**/visual/**"];

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  timeout: 60_000,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    locale: "ko-KR",
    timezoneId: "Asia/Seoul",
  },
  projects: [
    {
      name: "desktop",
      testIgnore: visualCaptureIgnore,
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } },
    },
    {
      name: "mobile",
      // 시나리오, 역할 순회, 랜드마크 구조는 데스크톱에서 검사한다.
      testIgnore: [...visualCaptureIgnore, /(scenarios|roles)\//, "**/landmarks.spec.ts"],
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 360, height: 740 },
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: "firefox-smoke",
      testMatch:
        /(report-only-csp|ops-refund-reprocess|office-start-mobile|auth-purpose-copy|install-pwa|customer-time-reuse|customer-portal-index)\.spec\.ts/,
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "webkit-smoke",
      testMatch:
        /(report-only-csp|ops-refund-reprocess|office-start-mobile|auth-purpose-copy|install-pwa|customer-time-reuse|customer-portal-index)\.spec\.ts/,
      use: { ...devices["Desktop Safari"] },
    },
    {
      name: "mobile-webkit-smoke",
      testMatch:
        /(report-only-csp|ops-refund-reprocess|office-start-mobile|auth-purpose-copy|install-pwa|customer-time-reuse|customer-portal-index)\.spec\.ts/,
      use: { ...devices["iPhone 13"] },
    },
  ],
  webServer: {
    command: `npm run start -- --port ${PORT}`,
    url: `http://localhost:${PORT}/coming-soon`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
