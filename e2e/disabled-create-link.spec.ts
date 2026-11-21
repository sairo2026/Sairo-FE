import { expect, test } from "@playwright/test";
import { settle, useMockOfficeRole } from "./support/app";
import { fixMockClock } from "./support/scenario";

// 결제 지연으로 읽기 전용인 사무소에서 비활성 등록 버튼이 키보드로도 열리지 않는지 확인한다.
for (const [route, name] of [
  ["/properties", "매물 등록"],
  ["/customers", "고객 등록"],
  ["/contracts", "계약 등록"],
  ["/coordinations", "조율 만들기"],
] as const) {
  test(`${route}: 읽기 전용에서 ${name}은 Tab으로 닿지 않고 이동 주소가 없다`, async ({ page }) => {
    await fixMockClock(page);
    await useMockOfficeRole(page, "OWNER_OVERDUE");
    await page.goto(route);
    await settle(page);

    const link = page.getByRole("link", { name, exact: true });
    await expect(link).toHaveAttribute("aria-disabled", "true");
    await expect(link).not.toHaveAttribute("href", /.+/);

    for (let i = 0; i < 40; i += 1) {
      await page.keyboard.press("Tab");
      const focused = await page.evaluate(() => document.activeElement?.textContent ?? "");
      expect(focused.trim()).not.toBe(name);
    }
    await expect(link).toHaveCount(1);
  });
}
