import { expect, test } from "./support/test";
import { loginViaUi, newMember, pageApi, signupViaUi } from "./support/flows";
import { API_ORIGIN } from "./support/env";
import { PNG_BYTES } from "./support/files";

const member = newMember("실API스모크");

test.describe.configure({ mode: "serial" });

test("스모크 1 헬스", async ({ request }) => {
  const response = await request.get(`${API_ORIGIN}/actuator/health`);
  expect(response.status()).toBe(200);
  expect(((await response.json()) as { status: string }).status).toBe("UP");
});

test("스모크 2 공개 요금은 게시된 요금표를 돌려준다", async ({ request }) => {
  const response = await request.get(`${API_ORIGIN}/api/public/pricing`);
  expect(response.status()).toBe(200);
  const body = (await response.json()) as { plans: { baseAmount: number }[] };
  expect(body.plans.length).toBeGreaterThan(0);
});

test("스모크 3 사업자 정보에 사업자명과 번호가 있다", async ({ request }) => {
  const response = await request.get(`${API_ORIGIN}/api/public/company-info`);
  expect(response.status()).toBe(200);
  const body = (await response.json()) as Record<string, string | null>;
  expect(body.businessName).toBeTruthy();
  expect(body.businessNumber).toBeTruthy();
  expect(body.address).toBeTruthy();
});

test("스모크 4 약관 목록과 약관 페이지", async ({ page, request }) => {
  const terms = await request.get(`${API_ORIGIN}/api/terms`);
  expect(terms.status()).toBe(200);
  for (const path of ["/legal/terms", "/legal/privacy", "/legal/refund-policy", "/pricing"]) {
    const response = await page.goto(path);
    expect(response?.status(), path).toBe(200);
    await expect(page.getByText("704-16-02872").first()).toBeVisible();
  }
});

test("스모크 5 비로그인 컨텍스트는 401이다", async ({ request }) => {
  const response = await request.get(`${API_ORIGIN}/api/auth/context`);
  expect(response.status()).toBe(401);
});

test("스모크 6 가입과 8 로그인과 로그아웃", async ({ page, request }) => {
  await signupViaUi(page, request, member);
  await page.goto("/account");
  await page.getByRole("button", { name: "로그아웃" }).click();
  await expect(page).toHaveURL(/\/login/);
  await loginViaUi(page, member.email, /\/office\/start$/);
  const me = await pageApi<{ email?: string }>(page, "GET", "/api/me");
  expect(me.status).toBe(200);
  await page.goto("/account");
  await page.getByRole("button", { name: "로그아웃" }).click();
  await expect(page).toHaveURL(/\/login/);
  const after = await pageApi(page, "GET", "/api/me");
  expect(after.status).toBe(401);
});

test("스모크 7 카카오 시작은 인가 화면으로 302를 돌려준다", async ({ request }) => {
  const response = await request.get(`${API_ORIGIN}/api/auth/kakao/start`, { maxRedirects: 0 });
  expect(response.status()).toBe(302);
  expect(response.headers()["location"]).toContain("state=");
});

test("스모크 9 카카오 연결 해제 웹훅은 3초 안에 응답한다", async ({ request }) => {
  const started = Date.now();
  const response = await request.post(`${API_ORIGIN}/api/webhooks/kakao/unlink`, {
    data: {},
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
  expect(Date.now() - started).toBeLessThan(3000);
  expect([200, 400, 401, 403]).toContain(response.status());
});

test("스모크 10 첨부 검사는 시험 파일을 거절하고 정상 파일은 통과시킨다", async ({ page }) => {
  await loginViaUi(page, member.email, /\/office\/start$/);
  await page.goto("/support/new");
  await page.getByLabel(/^문의 유형/).selectOption({ index: 1 });
  await page.getByLabel(/^문의 내용/).fill("첨부 검사 스모크 시험");
  await page
    .getByRole("button", { name: /문의 등록|등록|접수/ })
    .last()
    .click();
  await expect(page).toHaveURL(/\/support\/\d+/);
  const inquiryId = new URL(page.url()).pathname.split("/").pop();
  const upload = (name: string, base64: string) =>
    page.evaluate(
      async ({ inquiryId, name, base64 }) => {
        const xsrf = document.cookie
          .split("; ")
          .find((entry) => entry.startsWith("XSRF-TOKEN="))
          ?.split("=")[1];
        const bytes = Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
        const form = new FormData();
        form.append("file", new File([bytes], name, { type: "image/png" }));
        const response = await fetch(`/api/support-inquiries/${inquiryId}/attachments`, {
          method: "POST",
          credentials: "same-origin",
          headers: xsrf ? { "X-XSRF-TOKEN": xsrf } : {},
          body: form,
        });
        const text = await response.text();
        return { status: response.status, body: text.slice(0, 200) };
      },
      { inquiryId, name, base64 },
    );
  const marker = Buffer.from("EICAR-STANDARD-ANTIVIRUS-TEST-FILE");
  const clean = await upload("clean.png", PNG_BYTES.toString("base64"));
  expect(clean.status, clean.body).toBeLessThan(300);
  const infected = await upload(
    "infected.png",
    Buffer.concat([PNG_BYTES, marker]).toString("base64"),
  );
  expect(infected.status, infected.body).toBeLessThan(300);
  type Inquiry = {
    attachments?: { fileName: string; scanStatus: string }[];
    messages?: { attachments?: { fileName: string; scanStatus: string }[] }[];
  };
  const statusOf = async (fileName: string) => {
    const detail = await pageApi<Inquiry>(page, "GET", `/api/support-inquiries/${inquiryId}`);
    const all = [
      ...(detail.body.attachments ?? []),
      ...(detail.body.messages ?? []).flatMap((message) => message.attachments ?? []),
    ];
    return all.find((item) => item.fileName === fileName)?.scanStatus;
  };
  await expect.poll(() => statusOf("clean.png"), { timeout: 20_000 }).toBe("CLEAN");
  await expect.poll(() => statusOf("infected.png"), { timeout: 20_000 }).toBe("REJECTED");
});
