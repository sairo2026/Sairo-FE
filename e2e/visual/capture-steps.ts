import { expect, type Page } from "@playwright/test";
import { settle } from "../support/app";

const PHONE = "010-1234-5678";
const PASSWORD_PLACEHOLDER = "8~12자 이내의 비밀번호를 입력해 주세요.";
const CONFIRM_PLACEHOLDER = "설정한 비밀번호를 다시 입력해 주세요.";
const BUSINESS_PLACEHOLDER = "중개사무소의 사업자등록번호를 입력해 주세요.";
const AUTHORITY_PLACEHOLDER = "중개사무소를 등록한 관청을 입력해 주세요.";
const LICENSE_PLACEHOLDER = "중개사무소의 개설등록번호를 입력해 주세요.";

const EVIDENCE_FILE = {
  name: "증빙.pdf",
  mimeType: "application/pdf",
  buffer: Buffer.from("%PDF-1.4\n%mock\n"),
};

export async function sendEmailLink(page: Page): Promise<void> {
  await page.getByLabel(/^이름/).fill("김이름");
  await page.getByLabel(/^이메일 인증/).fill("email@email.com");
  await page.getByRole("button", { name: "인증 링크 받기" }).click();
  await page.getByRole("button", { name: "재발송" }).waitFor();
}

export async function sendPhoneCode(page: Page, phone = PHONE): Promise<void> {
  await page.getByLabel(/^휴대폰 번호 인증/).fill(phone);
  await page.getByRole("button", { name: "인증번호 받기" }).click();
  await page.getByLabel(/^인증번호/).waitFor();
}

export async function typePartialCode(page: Page): Promise<void> {
  await page.getByLabel(/^인증번호/).fill("123");
}

export async function verifyPhone(page: Page, phone = PHONE): Promise<void> {
  await sendPhoneCode(page, phone);
  await page.getByLabel(/^인증번호/).fill("123456");
  await page.getByRole("button", { name: "확인", exact: true }).click();
  await page.getByText("인증이 완료되었습니다.").first().waitFor();
}

/** 메일 링크를 연 것처럼 이메일 인증을 마친 가입 화면으로 다시 연다. */
export async function openEmailVerified(page: Page): Promise<void> {
  await page.evaluate(() =>
    window.localStorage.setItem(
      "sairo.signup.draft",
      JSON.stringify({ name: "김이름", email: "email@email.com", phone: "" }),
    ),
  );
  await page.goto("/signup/verify-email?token=valid-token-0000000000");
  await settle(page);
}

export async function emailAndPhoneVerified(page: Page): Promise<void> {
  await openEmailVerified(page);
  await verifyPhone(page);
}

export async function agreeAllTerms(page: Page): Promise<void> {
  const checkbox = page.getByRole("checkbox", { name: /필수 약관 전체 동의/ });
  await expect(checkbox).toBeEnabled();
  await checkbox.check();
  await expect(checkbox).toBeChecked();
}

export async function openTermsPopup(page: Page): Promise<void> {
  await page
    .getByRole("button", { name: /전문 보기/ })
    .first()
    .click();
}

export async function toPasswordStep(page: Page): Promise<void> {
  await emailAndPhoneVerified(page);
  await agreeAllTerms(page);
  await page.getByRole("button", { name: "다음", exact: true }).click();
  await page.getByPlaceholder(PASSWORD_PLACEHOLDER).waitFor();
}

async function submitPasswords(page: Page, password: string, confirm: string): Promise<void> {
  await toPasswordStep(page);
  await page.getByPlaceholder(PASSWORD_PLACEHOLDER).fill(password);
  await page.getByPlaceholder(CONFIRM_PLACEHOLDER).fill(confirm);
  await page.getByRole("button", { name: "회원가입하기" }).click();
}

export const passwordMismatch = (page: Page) => submitPasswords(page, "abcd1234!x", "different1!");
export const passwordTooShort = (page: Page) => submitPasswords(page, "abc12", "abc12");

export async function kakaoDuplicate(page: Page): Promise<void> {
  await verifyPhone(page, "010-1111-1111");
  await agreeAllTerms(page);
  await page.getByRole("button", { name: "회원가입하기" }).click();
  await page.getByText("이미 가입된 계정이 있습니다").waitFor();
}

export async function wrongPasswordLogin(page: Page): Promise<void> {
  await page.getByPlaceholder("이메일 주소를 입력해 주세요.").fill("agent@example.com");
  await page.getByPlaceholder("비밀번호를 입력해 주세요.").fill("wrong-password-1");
  await page.getByRole("button", { name: "로그인하기", exact: true }).click();
  await page.getByText("남은 시도 4회").waitFor();
}

export async function lockedLogin(page: Page): Promise<void> {
  await page.getByPlaceholder("이메일 주소를 입력해 주세요.").fill("agent@example.com");
  await page.getByPlaceholder("비밀번호를 입력해 주세요.").fill("wrong-password-1");
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const response = page.waitForResponse("**/api/auth/login");
    await page.getByRole("button", { name: "로그인하기", exact: true }).click();
    await response;
  }
  await page.getByRole("timer").waitFor();
}

export async function forgotPasswordSent(page: Page): Promise<void> {
  await page.getByPlaceholder("email@email.com").fill("email@email.com");
  await page.getByRole("button", { name: "재설정 링크 받기" }).click();
  await page.getByRole("button", { name: "재발송" }).waitFor();
}

export async function searchJoinOffice(page: Page): Promise<void> {
  await page.getByPlaceholder("000-00-00000").fill("1234567890");
  await page.getByRole("button", { name: "검색", exact: true }).click();
  await page
    .getByRole("button", { name: /참여 신청/ })
    .first()
    .waitFor();
}

export async function openJoinForm(page: Page): Promise<void> {
  await searchJoinOffice(page);
  await page
    .getByRole("button", { name: /참여 신청/ })
    .first()
    .click();
  await page.getByRole("button", { name: "참여 요청", exact: true }).waitFor();
}

export async function joinRequested(page: Page): Promise<void> {
  await openJoinForm(page);
  await page.getByLabel(/^자격증 번호/).fill("2026-12345");
  await page.getByLabel("고용신고를 확인했습니다").check({ force: true });
  await page.getByLabel("필요한 교육을 이수했습니다").check({ force: true });
  await page.getByRole("button", { name: "참여 요청", exact: true }).click();
  await page.getByRole("dialog").waitFor();
}

export async function fillRegisterLookup(page: Page): Promise<void> {
  await page.getByPlaceholder(BUSINESS_PLACEHOLDER).fill("1234567891");
  await page.getByPlaceholder(AUTHORITY_PLACEHOLDER).fill("서울특별시 종로구");
  await page.getByPlaceholder(LICENSE_PLACEHOLDER).fill("11110-2026-00002");
}

export async function toRegisterDetails(page: Page): Promise<void> {
  await fillRegisterLookup(page);
  await page.getByRole("button", { name: "다음", exact: true }).click();
  await page.getByPlaceholder("예시: 김땡땡사무소").waitFor();
}

export async function fillRegisterDetails(page: Page): Promise<void> {
  await toRegisterDetails(page);
  await page.getByPlaceholder("예시: 김땡땡사무소").fill("김땡땡사무소");
  await page.getByPlaceholder("예시: 김땡땡", { exact: true }).fill("김땡땡");
  await page.getByPlaceholder("예시: 010-0000-0000").fill("01058153333");
  await page.getByPlaceholder("예시: 서울시 땡땡구 땡땡동").fill("서울시 땡땡구 땡땡동");
}

export async function attachEvidence(page: Page): Promise<void> {
  const inputs = page.locator('input[type="file"]');
  const count = await inputs.count();
  for (let index = 0; index < count; index += 1) {
    await inputs.nth(index).setInputFiles(EVIDENCE_FILE);
  }
}

export async function submitEvidence(page: Page): Promise<void> {
  await attachEvidence(page);
  await page.getByRole("button", { name: "등록", exact: true }).click();
  await page.waitForURL(/\/office\/review/);
  await settle(page);
}

export async function duplicatePropertyDialog(page: Page): Promise<void> {
  await page.getByLabel(/^매물 주소/).fill("서울특별시 성북구 정릉로 77");
  await page.getByLabel(/^매물명/).fill("중복 확인 매물");
  await page.getByLabel(/^건물 카테고리/).selectOption({ label: "아파트" });
  await page.getByRole("button", { name: "임시저장" }).click();
  await page.getByRole("dialog").waitFor();
}

export async function openArchiveDialog(page: Page): Promise<void> {
  await page.getByRole("button", { name: "보관", exact: true }).click();
}

export async function archiveCompleted(page: Page): Promise<void> {
  await page.getByRole("button", { name: "보관", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "보관", exact: true }).click();
  await page.getByRole("dialog", { name: "매물 보관이 완료되었습니다." }).waitFor();
}

export async function selectAllProperties(page: Page): Promise<void> {
  await page.getByRole("link", { name: "국민대 앞 아파트" }).waitFor();
  await page.getByLabel("전체 선택").check();
}

export async function phoneCodeSent(page: Page): Promise<void> {
  await sendEmailLink(page);
  await sendPhoneCode(page);
}

export async function phoneCodeTyping(page: Page): Promise<void> {
  await phoneCodeSent(page);
  await typePartialCode(page);
}
