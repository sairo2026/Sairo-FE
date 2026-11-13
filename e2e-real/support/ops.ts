import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { expect, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { routeKakaoStub } from "./kakao-stub";
import { requireEnv } from "./env";
import { totpCode } from "./totp";

export const FRONT_ORIGIN = "http://localhost:3000";

export type OperatorSession = {
  context: BrowserContext;
  page: Page;
  kakaoUserId: number;
  secret: string;
};

export function bootstrapInvitationPath(): string {
  const file = readFileSync(requireEnv("E2E_BOOTSTRAP_INVITATION_FILE"), "utf-8");
  const link = file.match(/http:\/\/\S+\/ops\/invitations\/accept\?token=\S+/)?.[0];
  if (!link) throw new Error("bootstrap invitation link is missing");
  const url = new URL(link);
  return url.pathname + url.search;
}

async function newOperatorContext(browser: Browser, kakaoUserId: number) {
  const context = await browser.newContext({
    baseURL: FRONT_ORIGIN,
    locale: "ko-KR",
    timezoneId: "Asia/Seoul",
  });
  await routeKakaoStub(context, kakaoUserId, FRONT_ORIGIN);
  return context;
}

export async function acceptInvitation(
  browser: Browser,
  invitationPath: string,
  kakaoUserId: number,
): Promise<OperatorSession> {
  const context = await newOperatorContext(browser, kakaoUserId);
  const page = await context.newPage();
  await page.goto(invitationPath);
  await expect(page.getByRole("heading", { name: "운영자 초대" })).toBeVisible();
  await page.getByRole("button", { name: "카카오로 인증하고 계속" }).click();
  await expect(page).toHaveURL(/\/ops\/invitations\/enroll/);
  const secretText = await page.getByLabel("수동 입력 비밀값").textContent();
  const secret = (secretText ?? "").replace(/\s/g, "");
  expect(secret).toMatch(/^[A-Z2-7]{16,}$/);
  await page.getByLabel(/^확인 코드/).fill(totpCode(secret));
  await page.getByRole("button", { name: "등록 완료" }).click();
  await expect(page).toHaveURL(/\/ops$/);
  return { context, page, kakaoUserId, secret };
}

export async function loginOperator(
  browser: Browser,
  kakaoUserId: number,
  secret: string,
): Promise<OperatorSession> {
  const context = await newOperatorContext(browser, kakaoUserId);
  const page = await context.newPage();
  await page.goto("/ops/login");
  await page.getByRole("link", { name: "카카오로 시작" }).click();
  await expect(page).toHaveURL(/\/ops\/mfa/);
  await page.getByLabel(/^확인 코드/).fill(totpCode(secret));
  await page.getByRole("button", { name: "확인", exact: true }).click();
  await expect(page).toHaveURL(/\/ops$/);
  return { context, page, kakaoUserId, secret };
}

type StoredOperators = Record<string, { kakaoUserId: number; secret: string }>;

function readStored(): StoredOperators {
  const stateFile = process.env.E2E_OPERATOR_STATE;
  if (stateFile && existsSync(stateFile)) {
    return JSON.parse(readFileSync(stateFile, "utf-8")) as StoredOperators;
  }
  return {};
}

function writeStored(name: string, value: StoredOperators[string]) {
  const stateFile = process.env.E2E_OPERATOR_STATE;
  if (stateFile) writeFileSync(stateFile, JSON.stringify({ ...readStored(), [name]: value }));
}

export function hasStoredOperator(name: string): boolean {
  return name in readStored();
}

export async function storedOperatorLogin(browser: Browser, name: string) {
  const stored = readStored()[name];
  if (!stored) throw new Error(`operator ${name} is not enrolled`);
  return loginOperator(browser, stored.kakaoUserId, stored.secret);
}

export async function enrollOperator(browser: Browser, name: string, invitationPath: string) {
  const kakaoUserId = 710_000_000 + Math.floor(Math.random() * 1_000_000);
  const session = await acceptInvitation(browser, invitationPath, kakaoUserId);
  writeStored(name, { kakaoUserId, secret: session.secret });
  return session;
}

export async function adminSession(browser: Browser): Promise<OperatorSession> {
  if (hasStoredOperator("admin")) return storedOperatorLogin(browser, "admin");
  return enrollOperator(browser, "admin", bootstrapInvitationPath());
}

export async function xsrfHeaders(context: BrowserContext): Promise<Record<string, string>> {
  const cookies = await context.cookies(FRONT_ORIGIN);
  const token = cookies.find((cookie) => cookie.name === "XSRF-TOKEN")?.value;
  return token ? { "X-XSRF-TOKEN": token } : {};
}

export async function operatorStepUp(session: OperatorSession) {
  const response = await session.context.request.post(`${FRONT_ORIGIN}/api/ops/auth/step-up`, {
    data: { otpCode: totpCode(session.secret) },
    headers: await xsrfHeaders(session.context),
  });
  expect(response.status()).toBeLessThan(300);
}
