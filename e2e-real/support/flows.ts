import {
  expect,
  type APIRequestContext,
  type Browser,
  type Locator,
  type Page,
} from "@playwright/test";
import { capturedMessage } from "./messages";

export const PASSWORD = "RealApi1234!";

export type Member = { name: string; email: string; phone: string };

export function newMember(label: string): Member {
  const suffix = `${Date.now()}${Math.floor(Math.random() * 90 + 10)}`;
  return {
    name: label,
    email: `e2e+${suffix}@example.com`,
    phone: `010-${suffix.slice(-8, -4)}-${suffix.slice(-4)}`,
  };
}

export async function signupViaUi(page: Page, request: APIRequestContext, member: Member) {
  await page.goto("/signup");
  await page.getByRole("link", { name: "이메일로 시작하기" }).click();
  await page.getByLabel(/^이름/).fill(member.name);
  await page.getByLabel(/^이메일 인증/).fill(member.email);
  await page.getByRole("button", { name: "인증 링크 받기" }).click();
  await expect(page.getByText(/인증 링크를 보냈습니다/)).toBeVisible();

  const mail = await capturedMessage(request, "mail", member.email, {
    match: /signup\/verify-email\?token=/,
  });
  const link = mail.body.match(/https?:\/\/\S+\/signup\/verify-email\?token=[^\s]+/)?.[0];
  if (!link) throw new Error("issued email link is missing");
  const verification = new URL(link);
  await page.goto(verification.pathname + verification.search);
  await expect(page.getByText("인증이 완료되었습니다.").first()).toBeVisible();

  await page.getByLabel(/^휴대폰 번호 인증/).fill(member.phone);
  await page.getByRole("button", { name: "인증번호 받기" }).click();
  const sms = await capturedMessage(request, "sms", member.phone);
  const code = sms.body.match(/\b\d{6}\b/)?.[0];
  if (!code) throw new Error("issued phone code is missing");
  await page.getByLabel(/^인증번호/).fill(code);
  await page.getByRole("button", { name: "확인", exact: true }).click();
  await expect(page.getByText("인증이 완료되었습니다.")).toHaveCount(2);
  await page.getByLabel(/이용약관에 동의합니다/).check({ force: true });
  await page.getByRole("button", { name: "다음" }).click();
  await page.getByLabel(/^비밀번호\*?$/).fill(PASSWORD);
  await page.getByLabel(/^비밀번호 확인/).fill(PASSWORD);
  await page.getByRole("button", { name: "가입하기" }).click();
  await expect(page).toHaveURL(/\/office\/start$/);
}

export async function loginViaUi(page: Page, email: string, expectedPath: RegExp = /\/home$/) {
  await page.goto("/login");
  await page.getByRole("link", { name: "이메일로 시작하기" }).click();
  await page.getByLabel(/^이메일/).fill(email);
  await page.getByLabel(/^비밀번호/).fill(PASSWORD);
  await page.getByRole("button", { name: "로그인", exact: true }).click();
  await expect(page).toHaveURL(expectedPath);
}

export type ApiResult<T> = { status: number; body: T };

export async function pageApi<T = unknown>(
  page: Page,
  method: string,
  path: string,
  body?: unknown,
): Promise<ApiResult<T>> {
  return page.evaluate(
    async ({ method, path, body }) => {
      const xsrf = document.cookie
        .split("; ")
        .find((entry) => entry.startsWith("XSRF-TOKEN="))
        ?.split("=")[1];
      const response = await fetch(path, {
        method,
        credentials: "same-origin",
        headers: {
          ...(body === undefined ? {} : { "Content-Type": "application/json" }),
          ...(xsrf ? { "X-XSRF-TOKEN": xsrf } : {}),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const text = await response.text();
      let parsed: unknown = text;
      try {
        parsed = text ? JSON.parse(text) : null;
      } catch {
        parsed = text;
      }
      return { status: response.status, body: parsed };
    },
    { method, path, body },
  ) as Promise<ApiResult<T>>;
}

export async function forceCheck(locator: Locator) {
  await expect(async () => {
    if (!(await locator.isChecked())) await locator.click({ force: true });
    await expect(locator).toBeChecked({ timeout: 1000 });
  }).toPass({ timeout: 10_000 });
}

export async function openPublicPage(browser: Browser) {
  const context = await browser.newContext({
    baseURL: "http://localhost:3000",
    locale: "ko-KR",
    timezoneId: "Asia/Seoul",
  });
  const page = await context.newPage();
  page.on("response", async (response) => {
    const url = new URL(response.url());
    if (!url.pathname.startsWith("/api/")) return;
    const text = await response.text().catch(() => "");
    console.log(
      `${response.request().method()} ${url.pathname} ${response.status()} ${text.slice(0, 300)}`,
    );
  });
  return { context, page };
}
