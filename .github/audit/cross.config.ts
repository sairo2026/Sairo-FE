import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "../../e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  use: {baseURL:"http://localhost:3000"},
  projects: ["chromium","firefox","webkit"].map(name => ({
    name, use:{browserName:name as "chromium" | "firefox" | "webkit"}
  })),
  webServer: {command:"npm run start -- --port 3000",url:"http://localhost:3000/coming-soon",timeout:120000},
});
