import { expect, test } from "@playwright/test";

test("PC 설치 안내와 설치 가능한 manifest를 제공한다", async ({ page }) => {
  await page.goto("/install");
  await expect(page.getByRole("heading", { level: 1, name: "사이로 시작하기" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "설치 없이 웹에서 바로 이용하기" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "PC에 설치하기" })).toBeVisible();
  await expect(page.getByRole("button", { name: "PC에 설치하기" })).toBeVisible();
  await expect(page.getByRole("link", { name: "로그인하러 가기" })).toHaveAttribute(
    "href",
    "/login",
  );
  await expect(page.getByRole("link", { name: "회원가입하러 가기" })).toHaveAttribute(
    "href",
    "/signup",
  );

  const manifestHref = await page.locator('link[rel="manifest"]').getAttribute("href");
  if (!manifestHref) throw new Error("PWA manifest 링크가 없습니다.");
  const response = await page.request.get(manifestHref);
  expect(response.ok()).toBe(true);
  const manifest = await response.json();
  expect(manifest.id).toBe("/");
  expect(manifest.display).toBe("standalone");
  expect(manifest.start_url).toBe("/home");
  expect(manifest.scope).toBe("/");
  expect(manifest.icons.map((icon: { sizes: string }) => icon.sizes)).toEqual([
    "192x192",
    "512x512",
  ]);
  for (const icon of manifest.icons) {
    const asset = await page.request.get(icon.src);
    expect(asset.ok()).toBe(true);
    expect(asset.headers()["content-type"]).toContain("image/svg+xml");
    const decodedWidth = await page.evaluate(
      (src: string) =>
        new Promise<number>((resolve, reject) => {
          const image = new Image();
          image.onload = () => resolve(image.naturalWidth);
          image.onerror = () => reject(new Error("PWA 아이콘을 디코딩할 수 없습니다."));
          image.src = src;
        }),
      icon.src,
    );
    expect(decodedWidth).toBe(Number.parseInt(icon.sizes, 10));
  }
});

test("좁은 PC 창에서도 설치 안내가 잘리지 않는다", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("/install");
  await expect(page.getByRole("heading", { name: "사이로 시작하기" })).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(overflow).toBe(false);
});

test("다른 화면에서 포착한 설치 이벤트를 설치 화면에서 한 번만 사용한다", async ({
  page,
  browserName,
}) => {
  test.skip(browserName !== "chromium", "Chromium PWA 설치 이벤트 경로");
  await page.goto("/");
  await expect
    .poll(() =>
      page.evaluate(() => {
        const event = new Event("beforeinstallprompt", { cancelable: true });
        window.dispatchEvent(event);
        return event.defaultPrevented;
      }),
    )
    .toBe(true);
  await page.evaluate(() => {
    const state = window as Window & { __installPromptCalls?: number; __spa?: boolean };
    state.__installPromptCalls = 0;
    state.__spa = true;
    const event = Object.assign(new Event("beforeinstallprompt", { cancelable: true }), {
      prompt: () => {
        state.__installPromptCalls = (state.__installPromptCalls ?? 0) + 1;
        return Promise.resolve();
      },
      userChoice: Promise.resolve({ outcome: "dismissed" }),
    });
    window.dispatchEvent(event);
  });
  await page.locator('a[href="/install"]').first().click();
  expect(await page.evaluate(() => (window as Window & { __spa?: boolean }).__spa)).toBe(true);
  await page.getByRole("button", { name: "PC에 설치하기" }).click();

  expect(
    await page.evaluate(
      () => (window as Window & { __installPromptCalls?: number }).__installPromptCalls,
    ),
  ).toBe(1);
  await expect(page.getByRole("status")).toContainText("나중에 주소창의 설치 아이콘으로");
});
