import { expect, test } from "@playwright/test";

test("PC 설치 안내와 설치 가능한 manifest를 제공한다", async ({ page }) => {
  await page.goto("/install");
  await expect(
    page.getByRole("heading", { level: 1, name: "사이로를 PC에서 이용하세요" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "웹으로 이용하기" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "PC에 설치해 사용하기" })).toBeVisible();
  await expect(page.getByRole("link", { name: "웹에서 로그인하기" })).toHaveAttribute(
    "href",
    "/login",
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
  await expect(page.getByRole("heading", { name: "사이로를 PC에서 이용하세요" })).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(overflow).toBe(false);
});
