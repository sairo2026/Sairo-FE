import { expect, test, type APIRequestContext } from "@playwright/test";

const api = "http://127.0.0.1:8080";

async function capturedMessage(
  request: APIRequestContext,
  type: "mail" | "sms",
  recipient: string,
) {
  const fixtureToken = process.env.E2E_FIXTURE_TOKEN;
  if (!fixtureToken) throw new Error("E2E_FIXTURE_TOKEN is required");
  const parameter = type === "mail" ? "to" : "toPhone";
  const url = `${api}/api/__e2e/messages/${type}/latest?${parameter}=${encodeURIComponent(recipient)}`;
  await expect.poll(async () =>
    (await request.get(url, { headers: { "X-E2E-Token": fixtureToken } })).status(),
    { timeout: 10_000 },
  ).toBe(200);
  const response = await request.get(url, { headers: { "X-E2E-Token": fixtureToken } });
  return (await response.json()) as { body: string };
}

test("signup uses actual email and phone codes from the local backend", async ({ page, request }) => {
  const suffix = String(Date.now());
  const email = `e2e+${suffix}@example.com`;
  const phone = `010-${suffix.slice(-8, -4)}-${suffix.slice(-4)}`;

  await page.goto("/signup");
  await page.getByRole("link", { name: "이메일로 계속하기" }).click();
  await page.getByLabel(/^이름/).fill("실API검증");
  await page.getByLabel(/^이메일 인증/).fill(email);
  await page.getByRole("button", { name: "인증 링크 받기" }).click();
  await expect(page.getByText(/인증 링크를 보냈습니다/)).toBeVisible();

  const mail = await capturedMessage(request, "mail", email);
  const link = mail.body.match(/https?:\/\/\S+\/signup\/verify-email\?token=[^\s]+/)?.[0];
  expect(link, "actual issued email link").toBeTruthy();
  const verification = new URL(link!);
  await page.goto(verification.pathname + verification.search);
  await expect(page.getByText("인증이 완료되었습니다.").first()).toBeVisible();

  await page.getByLabel(/^휴대폰 번호 인증/).fill(phone);
  await page.getByRole("button", { name: "인증번호 받기" }).click();
  const sms = await capturedMessage(request, "sms", phone);
  const code = sms.body.match(/\b\d{6}\b/)?.[0];
  expect(code, "actual issued phone code").toBeTruthy();
  await page.getByLabel(/^인증번호/).fill(code!);
  await page.getByRole("button", { name: "확인", exact: true }).click();
  await expect(page.getByText("인증이 완료되었습니다.")).toHaveCount(2);
  await page.getByLabel(/이용약관에 동의합니다/).check({ force: true });
  await page.getByRole("button", { name: "다음" }).click();
  await page.getByLabel(/^비밀번호\*?$/).fill("RealApi1234!");
  await page.getByLabel(/^비밀번호 확인/).fill("RealApi1234!");
  await page.getByRole("button", { name: "가입하기" }).click();
  await expect(page).toHaveURL(/\/office\/start$/);
});

test("unpublished pricing stays unavailable through the real API", async ({ page, request }) => {
  const response = await request.get("/api/public/pricing");
  expect(response.status()).toBe(404);
  const body = await response.json();
  expect(body.code).toBe("PRICE_SCHEDULE_NOT_PUBLISHED");

  await page.goto("/pricing");
  await expect(page.locator("section[role='alert']")).toContainText("요금");
  await expect(page.getByRole("button", { name: "다시 시도" })).toBeVisible();
});
