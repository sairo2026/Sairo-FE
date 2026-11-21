import { expect, test } from "@playwright/test";
import { settle, useMockOfficeRole } from "./support/app";
import { measureTextContrast } from "./support/contrast";

const PUBLIC_PATHS = [
  "/",
  "/login",
  "/login/email",
  "/signup",
  "/signup/email",
  "/signup/kakao",
  "/pricing",
  "/legal",
  "/legal/terms",
  "/legal/privacy",
  "/legal/refund-policy",
  "/legal/subscription-terms",
];

test.describe("공개 화면 글자 대비", () => {
  for (const path of PUBLIC_PATHS) {
    test(`${path} 의 보이는 글자는 기준 대비를 만족한다`, async ({ page }) => {
      await useMockOfficeRole(page, null);
      await page.goto(path);
      await settle(page);
      expect(await measureTextContrast(page)).toEqual([]);
    });
  }

  test("측정 도구는 낮은 대비의 글자를 실제로 잡아낸다", async ({ page }) => {
    await useMockOfficeRole(page, null);
    await page.goto("/login");
    await page.evaluate(() => {
      const probe = document.createElement("p");
      probe.textContent = "대비 측정 확인용 문구";
      probe.style.cssText =
        "color:#9ca3af;background:#ffffff;font-size:14px;position:fixed;top:0;left:0";
      document.body.appendChild(probe);
    });
    const failures = await measureTextContrast(page);
    expect(failures.map((item) => item.text)).toContain("대비 측정 확인용 문구");
  });

  test("보조 문구와 오류 색은 공개 화면에도 같은 값을 쓴다", async ({ page }) => {
    await useMockOfficeRole(page, null);
    await page.goto("/login/email");
    const tokens = await page.evaluate(() => {
      const style = getComputedStyle(document.documentElement);
      return {
        muted: style.getPropertyValue("--text-muted").trim(),
        danger: style.getPropertyValue("--danger").trim(),
      };
    });
    expect(tokens).toEqual({ muted: "#596273", danger: "#b42318" });
  });
});
