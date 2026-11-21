import { expect, test } from "@playwright/test";

// 공통 글꼴은 글자 묶음별로 나뉜 서브셋이라 화면 하나가 내려받는 양이 크게 줄어야 한다.
// 전체 글꼴 파일은 약 2MB였다.
const MAX_FONT_BYTES = 800_000;

for (const route of ["/login", "/pricing", "/signup/email"]) {
  test(`${route}: 글꼴을 서브셋으로 받고 Pretendard로 그려진다`, async ({ page }) => {
    const fonts: Array<{ url: string; size: number }> = [];
    page.on("response", async (response) => {
      if (/\.woff2(\?|$)/.test(response.url())) {
        const body = await response.body().catch(() => Buffer.alloc(0));
        fonts.push({ url: response.url(), size: body.length });
      }
    });

    await page.goto(route);
    await page.waitForLoadState("networkidle");
    await page.evaluate(() => document.fonts.ready);

    const total = fonts.reduce((sum, font) => sum + font.size, 0);
    expect(fonts.length).toBeGreaterThan(0);
    expect(total).toBeLessThan(MAX_FONT_BYTES);
    // 같은 파일을 두 번 받지 않는다(미리 받기와 글꼴 정의가 같은 주소를 가리킨다).
    expect(new Set(fonts.map((font) => font.url)).size).toBe(fonts.length);
    expect(fonts.every((font) => /PretendardVariable\.subset\.\d+/.test(font.url))).toBe(true);

    const family = await page.evaluate(() => getComputedStyle(document.body).fontFamily);
    expect(family).toContain("Pretendard Variable");
    const loaded = await page.evaluate(() =>
      document.fonts.check('400 16px "Pretendard Variable"', "사이로 SAIRO 0123"),
    );
    expect(loaded).toBe(true);
  });
}
