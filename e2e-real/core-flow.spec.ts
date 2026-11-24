import { expect, test } from "./support/test";
import { PNG_BYTES } from "./support/files";
import { capturedMessage } from "./support/messages";
import {
  adminSession,
  enrollOperator,
  hasStoredOperator,
  operatorStepUp,
  storedOperatorLogin,
  xsrfHeaders,
} from "./support/ops";
import {
  forceCheck,
  loginViaUi,
  openPublicPage,
  PASSWORD,
  pageApi,
  newMember,
  signupViaUi,
} from "./support/flows";
import { API_ORIGIN, FRONT_ORIGIN, requireEnv } from "./support/env";

const owner = newMember("실API대표");
const registrationNumber = `11110-2026-${String(Date.now()).slice(-5)}`;
const businessNumber = String(Date.now()).slice(-10);

const REVIEWER_EMAIL = "e2e-reviewer@example.com";
let registrationId = "";

test.describe.configure({ mode: "serial" });

test("가입과 로그아웃과 로그인", async ({ page, request }) => {
  await signupViaUi(page, request, owner);
  await page.goto("/account");
  await page.getByRole("button", { name: "로그아웃" }).click();
  await expect(page).toHaveURL(/\/login/);
  await loginViaUi(page, owner.email, /\/office\/start$/);
});

test("사무소 등록 신청과 증빙 제출", async ({ page }) => {
  await loginViaUi(page, owner.email, /\/office\/start$/);
  await page.getByRole("radio", { name: /새 사무소 생성/ }).click();
  await page.getByRole("button", { name: "다음" }).click();
  await expect(page).toHaveURL(/\/office\/register/);
  const business = page.getByLabel("중개사무소 사업자등록번호");
  await page.getByRole("button", { name: "다음" }).click();
  await expect(business).toHaveAttribute("aria-invalid", "true");
  await business.fill(businessNumber);
  await page.getByLabel("등록관청").fill("서울특별시 종로구");
  await page.getByLabel("개설등록번호").fill(registrationNumber);
  await page.getByRole("button", { name: "다음" }).click();
  await page.getByLabel("사무소명").fill("실API공인중개사사무소");
  await page.getByLabel("사무소 대표자명").fill(owner.name);
  await page.getByLabel("사무소 대표 연락처").fill(owner.phone.replaceAll("-", ""));
  await page.getByLabel("중개사무소 주소").fill("서울특별시 종로구 시험로 1");
  await page.getByLabel("신청자의 등록관계").selectOption({ label: "대표 본인" });
  await page.getByRole("button", { name: "다음" }).click();
  await expect(page).toHaveURL(/\/office\/register\/evidence\?registrationId=\d+/);
  registrationId = new URL(page.url()).searchParams.get("registrationId") ?? "";
  for (const type of [
    "BROKERAGE_LICENSE",
    "BUSINESS_CERTIFICATE",
    "REPRESENTATIVE_QUALIFICATION",
  ]) {
    await page.locator(`input[data-evidence-type="${type}"]`).setInputFiles({
      name: `${type.toLowerCase()}.png`,
      mimeType: "image/png",
      buffer: PNG_BYTES,
    });
  }
  await page.getByRole("button", { name: "등록", exact: true }).click();
  await expect(page).toHaveURL(/\/office\/review/);
  await expect(
    page.getByRole("heading", { name: "신규 사무소 등록 심사 진행 중입니다." }),
  ).toBeVisible();
});

test("최초 운영자가 초대를 수락하고 인증 앱을 등록한 뒤 심사담당을 초대한다", async ({
  browser,
  request,
}) => {
  const session = await adminSession(browser);
  await expect(session.page).toHaveURL(/\/ops$/);
  if (!hasStoredOperator("reviewer")) {
    await operatorStepUp(session);
    await session.page.goto("/ops/operators/invitations");
    await session.page.getByLabel("이름", { exact: true }).fill("실API심사담당");
    await session.page.getByLabel("이메일", { exact: true }).fill(REVIEWER_EMAIL);
    for (const role of [
      "심사담당",
      "고객지원",
      "결제담당",
      "이전담당",
      "개인정보담당",
      "운영담당",
    ]) {
      await session.page.getByLabel(role, { exact: true }).check({ force: true });
    }
    await session.page.getByRole("button", { name: "초대 보내기" }).click();
    await expect(session.page.getByText(/초대/).first()).toBeVisible();
    const mail = await capturedMessage(request, "mail", REVIEWER_EMAIL, {
      match: /ops\/invitations\/accept/,
    });
    const link = mail.body.match(/https?:\/\/\S+\/ops\/invitations\/accept\?token=\S+/)?.[0];
    if (!link) throw new Error("operator invitation link is missing");
    const url = new URL(link);
    const reviewer = await enrollOperator(browser, "reviewer", url.pathname + url.search);
    await reviewer.context.close();
  }
  await session.context.close();
});

test("운영자가 사무소 인증 신청을 승인한다", async ({ browser }) => {
  const session = await storedOperatorLogin(browser, "reviewer");
  const page = session.page;
  await page.goto(`/ops/registrations/${registrationId}`);
  await expect(page.getByRole("heading", { name: `인증 신청 ${registrationId}` })).toBeVisible();
  for (const item of [
    "제출 버전 확인",
    "확인 출처 조회",
    "등록관계 확인",
    "자격·교육 확인",
    "고용명부 대조",
  ]) {
    await page.getByLabel(item).click({ force: true });
    await expect(page.getByLabel(item)).toBeChecked();
  }
  await page.getByRole("button", { name: "승인", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "승인", exact: true }).click();
  await expect(page.getByText("인증 신청을 승인했습니다.")).toBeVisible();
  await session.context.close();
});

test("승인 뒤 대표가 로그인하면 결제 준비 상태에서 업무 홈에 들어간다", async ({ page }) => {
  await loginViaUi(page, owner.email, /\/(home|billing)$/);
  await page.goto("/home");
  await expect(page).toHaveURL(/\/home$/);
  await page.screenshot({ path: "test-results/home.png" });
});

test("카드 등록 화면에 들어가면 토스 키가 없는 환경의 안내가 나온다", async ({ page }) => {
  await loginViaUi(page, owner.email, /\/(home|billing)$/);
  await page.goto("/billing/card");
  await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
  await forceCheck(page.getByRole("checkbox").first());
  await page.getByRole("button", { name: "카드 등록", exact: true }).click();
  await page.screenshot({ path: "test-results/card-no-key.png" });
  await expect(page.getByText(/준비|사용할 수 없|결제 창/).first()).toBeVisible();
});

test("카드를 등록하고 첫 결제를 확인하면 업무 화면이 열린다", async ({ page }) => {
  await loginViaUi(page, owner.email, /\/(home|billing)$/);
  await page.goto("/billing/card");
  const stepUp = await pageApi(page, "POST", "/api/auth/step-up/password", { password: PASSWORD });
  expect(stepUp.status, JSON.stringify(stepUp.body)).toBeLessThan(300);
  const session = await pageApi<{ customerKey: string }>(
    page,
    "POST",
    "/api/subscriptions/billing-key/session",
  );
  expect(session.status, JSON.stringify(session.body)).toBeLessThan(300);
  const { customerKey } = session.body;
  const notice = await pageApi<{ items: { version: string }[] }>(
    page,
    "GET",
    "/api/terms?context=CARD_REGISTRATION",
  );
  const version = notice.body.items[0]?.version ?? "";
  expect(version).not.toBe("");
  await page.goto(
    `/billing/card/result?authKey=local-e2e-auth&customerKey=${encodeURIComponent(customerKey)}&v=${encodeURIComponent(version)}`,
  );
  await expect(page.getByText(/결제수단이 등록됐습니다/).first()).toBeVisible();
  await page.goto("/billing/consent");
  await forceCheck(page.getByRole("checkbox").nth(0));
  await forceCheck(page.getByRole("checkbox").nth(1));
  const consentSubmitted = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === "/api/subscriptions/purchase-consent" &&
      response.request().method() === "POST",
  );
  await page.getByRole("button", { name: /동의/ }).last().click();
  expect((await consentSubmitted).ok()).toBe(true);
  await page.screenshot({ path: "test-results/consent.png" });
  await page.goto("/billing");
  await page.getByRole("button", { name: "지금 결제" }).click();
  const payment = page.getByRole("dialog", { name: "지금 결제" });
  const paymentSubmitted = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === "/api/subscriptions/first-payment" &&
      response.request().method() === "POST",
  );
  await payment.getByRole("button", { name: "결제하기", exact: true }).click();
  expect((await paymentSubmitted).ok()).toBe(true);
  await expect(payment).toBeHidden();
  await page.screenshot({ path: "test-results/pay-now.png" });
  await page.goto("/properties/new");
  await expect(page.getByLabel(/^매물명/)).toBeVisible();
});

function seoulDateChipName(offsetDays: number): string {
  const [year = 0, month = 1, day = 1] = seoulDate(offsetDays).split("-").map(Number);
  const weekday = ["일", "월", "화", "수", "목", "금", "토"][
    new Date(Date.UTC(year, month - 1, day)).getUTCDay()
  ];
  return `${month}월 ${day}일 (${weekday})`;
}

function seoulDate(offsetDays: number): string {
  const moment = new Date(Date.now() + offsetDays * 86_400_000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(moment);
}

let propertyUrl = "";
let coordinationUrl = "";

test("매물을 등록하고 목록과 상세에서 확인한다", async ({ page }) => {
  await loginViaUi(page, owner.email, /\/(home|billing)$/);
  await page.goto("/properties/new");
  await page.getByLabel(/^매물명/).fill("실API 아파트");
  await page.getByRole("combobox", { name: "건물 카테고리" }).selectOption({ label: "아파트" });
  await page.getByLabel("매물 주소").fill("서울특별시 종로구 시험로 1");
  await page.getByLabel("담당 공인중개사").selectOption({ index: 1 });
  await page.getByRole("button", { name: "활성 등록" }).click();
  await expect(page).toHaveURL(/\/properties\/\d+$/);
  propertyUrl = new URL(page.url()).pathname;
  await expect(page.getByRole("heading", { level: 1, name: "실API 아파트" })).toBeVisible();
  await page.goto("/properties");
  await expect(page.getByText("실API 아파트").first()).toBeVisible();
});

test("고객을 등록하고 희망조건을 저장한 뒤 목록에서 확인한다", async ({ page }) => {
  await loginViaUi(page, owner.email, /\/(home|billing)$/);
  await page.goto("/customers/new");
  await page.getByLabel(/^이름/).fill("실API고객");
  await page.getByLabel("연락처", { exact: true }).fill("01099998888");
  await page.getByLabel(/^담당 공인중개사/).selectOption({ index: 1 });
  await page.getByLabel(/^수집 경로/).fill("전화 문의");
  await page.getByLabel(/^처리 근거/).selectOption("CONSENT");
  await page.getByLabel(/^수집 목적/).fill("매물 상담");
  await page.getByLabel(/^보유 기한/).fill("2029-11-10");
  await page.getByRole("button", { name: "등록", exact: true }).click();
  await expect(page).toHaveURL(/\/customers\/\d+$/);
  await expect(page.getByRole("heading", { level: 1, name: "실API고객" })).toBeVisible();
  await page.getByRole("tab", { name: "희망조건" }).click();
  await page.getByRole("button", { name: "희망조건 추가" }).click();
  await page.getByLabel("거래유형").selectOption("SALE");
  await page.getByLabel("매매가 하한 (만원)").fill("10000");
  await page.getByLabel("희망 지역").fill("성북구, 종로구");
  await page.getByRole("button", { name: "저장", exact: true }).click();
  await expect(page.getByText("희망조건을 등록했습니다.")).toBeVisible();
  await page.goto("/customers");
  await expect(page.getByText("실API고객").first()).toBeVisible();
});

test("탈퇴 미리보기가 보유 데이터와 안내를 보여준다", async ({ page }) => {
  await loginViaUi(page, owner.email, /\/(home|billing)$/);
  await page.goto("/account/withdrawal");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  const preview = await pageApi<{ canWithdraw?: boolean }>(
    page,
    "GET",
    "/api/me/withdrawal-preview",
  );
  expect(preview.status).toBe(200);
  await page.screenshot({ path: "test-results/withdrawal.png" });
});

const APPROVER_PHONE = `010-${String(Date.now()).slice(-8, -4)}-${String(Date.now()).slice(-4)}`;
let approverLink = "";

test("매물에 출입승인을 등록하고 승인자 링크를 발급한다", async ({ page }) => {
  await loginViaUi(page, owner.email, /\/(home|billing)$/);
  await page.goto(`${propertyUrl}/access-approvals`);
  await page.getByRole("button", { name: "+ 출입승인 등록" }).click();
  const dialog = page.getByRole("dialog", { name: "출입승인 등록" });
  await dialog.getByLabel("승인자 이름").fill("실API승인자");
  await dialog.getByLabel("승인자 연락처").fill(APPROVER_PHONE.replaceAll("-", ""));
  await dialog.getByLabel("승인 시작일").fill(seoulDate(-1));
  await dialog.getByLabel("승인 종료일").fill("2099-12-31");
  await dialog.getByRole("button", { name: "등록", exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText("실API승인자").first()).toBeVisible();
  await page.getByRole("button", { name: "링크 발급" }).click();
  const linkDialog = page.getByRole("dialog", { name: "승인자 링크" });
  const value = await linkDialog.getByLabel("발급된 링크").inputValue();
  expect(value).toMatch(/\/approver\//);
  approverLink = new URL(value).pathname;
  await linkDialog.getByRole("button", { name: "닫기" }).first().click();
});

test("조율을 만든다", async ({ page }) => {
  await loginViaUi(page, owner.email, /\/(home|billing)$/);
  await page.goto("/coordinations/new");
  await page
    .getByRole("radio", { name: /실API고객/ })
    .first()
    .check({ force: true });
  await page.getByRole("checkbox", { name: "실API 아파트 선택" }).check({ force: true });
  await page.getByRole("button", { name: "조율 만들기" }).click();
  await expect(page).toHaveURL(/\/coordinations\/\d+$/);
  coordinationUrl = new URL(page.url()).pathname;
  await page.screenshot({ path: "test-results/coordination.png" });
});

let customerLink = "";

test("고객 링크를 발급하고 고객이 공개 링크에서 가능한 시간을 제출한다", async ({
  page,
  browser,
}) => {
  await loginViaUi(page, owner.email, /\/(home|billing)$/);
  await page.goto(coordinationUrl);
  await page.getByRole("button", { name: "고객 링크 발급" }).click();
  const linkField = page.getByLabel("발급된 링크");
  await expect(linkField).toBeVisible();
  customerLink = new URL(await linkField.inputValue()).pathname;
  expect(customerLink).toMatch(/^\/visit-responses\//);

  const { context: customerContext, page: customerPage } = await openPublicPage(browser);
  await customerPage.goto(customerLink);
  await customerPage.getByRole("button", { name: seoulDateChipName(2) }).click();
  for (let minutes = 10 * 60; minutes < 18 * 60; minutes += 30) {
    const time = `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
    await customerPage.getByRole("button", { name: time, exact: true }).click();
  }
  await customerPage.getByRole("button", { name: "가능한 시간 제출" }).click();
  await expect(customerPage.getByText("가능한 시간을 제출했습니다.")).toBeVisible();
  await customerContext.close();
});

test("승인자가 링크에서 방문 조건을 등록한다", async ({ browser }) => {
  const { context, page } = await openPublicPage(browser);
  await page.goto(approverLink);
  await expect(page.getByRole("tab", { name: "조건 등록" })).toBeVisible();
  for (const day of ["월", "화", "수", "목", "금", "토", "일"]) {
    await page.getByRole("button", { name: `${day}요일 시간대 추가` }).click();
  }
  await page.getByLabel("하루 최대 방문 횟수").fill("4");
  const saved = page.waitForResponse(
    (response) => response.request().method() === "PUT" && /\/conditions$/.test(response.url()),
  );
  await page.getByRole("button", { name: "조건 저장" }).click();
  expect((await saved).status()).toBe(200);
  await expect(page.getByText(/조건 \d+번 버전으로 저장했습니다/)).toBeVisible();
  await context.close();
});

test("중개사가 일정을 구성하고 방문을 신청한다", async ({ page }) => {
  await loginViaUi(page, owner.email, /\/(home|billing)$/);
  await page.goto(coordinationUrl);
  await expect(page.getByText("조율 가능").first()).toBeVisible();
  await page.getByRole("button", { name: "일정 저장" }).click();
  await expect(page.getByText(/일정 구성을 저장했습니다/)).toBeVisible();
  await expect(page.getByRole("list", { name: "계산된 시작 시각" })).toBeVisible();
  await page.getByRole("button", { name: "방문 신청", exact: true }).first().click();
  const form = page.locator("form").filter({ hasText: "신청 가능 구간" });
  await form.getByRole("button", { name: / ~ / }).first().click();
  await form.getByRole("button", { name: "방문 신청 제출" }).click();
  await expect(page.getByText(/방문 신청을 제출했습니다/)).toBeVisible();
  await expect(page.getByText("신청 대기").first()).toBeVisible();
});

test("승인자가 신청을 비교해 선택하면 조율이 확정된다", async ({ browser, page }) => {
  const { context, page: approver } = await openPublicPage(browser);
  await approver.goto(approverLink);
  await approver.getByRole("tab", { name: "신청 비교·선택" }).click();
  await expect(approver.getByText(/실API공인중개사사무소/).first()).toBeVisible();
  await approver
    .getByRole("button", { name: /신청 선택/ })
    .first()
    .click();
  await approver
    .getByRole("dialog", { name: "이 신청을 선택할까요" })
    .getByRole("button", { name: "선택하기" })
    .click();
  await expect(approver.getByText(/선택한 신청이 확정되었습니다/)).toBeVisible();
  await context.close();
  await loginViaUi(page, owner.email, /\/(home|billing)$/);
  await page.goto(coordinationUrl);
  await expect(page.getByText("확정 완료").first()).toBeVisible();
});

test("예정 시각 전에는 취소만 방문 결과로 기록할 수 있다", async ({ page }) => {
  await loginViaUi(page, owner.email, /\/(home|billing)$/);
  await page.goto(coordinationUrl);
  await expect(page.getByText("확정 완료").first()).toBeVisible();
  await page.getByRole("button", { name: "결과 기록" }).click();
  const dialog = page.getByRole("dialog");
  const outcomes = dialog.getByRole("combobox", { name: "방문 결과" }).getByRole("option");
  await expect(outcomes).toHaveText(["취소"]);
  await expect(dialog.getByRole("status")).toContainText("시작 전에는 취소만 기록할 수 있습니다.");
  await expect(dialog.getByLabel("취소 사유")).toBeVisible();
});

test("격리 DB의 실패 환불을 운영 화면에서 재처리하고 수동 완료한다", async ({
  browser,
  request,
}) => {
  const fixtureHeaders = { "X-E2E-Token": requireEnv("E2E_FIXTURE_TOKEN") };
  async function failedRefund() {
    const response = await operator.context.request.post(
      `${FRONT_ORIGIN}/api/__e2e/failed-refunds`,
      {
        headers: { ...fixtureHeaders, ...(await xsrfHeaders(operator.context)) },
        data: { ownerEmail: owner.email },
      },
    );
    expect(response.status()).toBe(200);
    return (await response.json()) as { invoiceId: number; refundId: number };
  }
  async function auditCount(refundId: number) {
    const response = await request.get(
      `${API_ORIGIN}/api/__e2e/failed-refunds/${refundId}/audit-count`,
      { headers: fixtureHeaders },
    );
    expect(response.status()).toBe(200);
    return ((await response.json()) as { count: number }).count;
  }

  const operator = await storedOperatorLogin(browser, "reviewer");
  const page = operator.page;
  const retry = await failedRefund();
  await page.goto("/ops/billing/refunds");
  await page.getByLabel("환불 상태").selectOption("FAILED");
  await page.getByRole("button", { name: "조회" }).click();
  await expect(page.getByRole("link", { name: String(retry.refundId), exact: true })).toBeVisible();
  await page.goto(`/ops/billing/refunds/${retry.refundId}`);
  await expect(page.getByText("STUB_CANCEL_DECLINED")).toBeVisible();
  await operatorStepUp(operator);
  await page.getByRole("button", { name: "다시 열기" }).click();
  const reopen = page.getByRole("dialog", { name: "실패한 환불 다시 열기" });
  await reopen.getByLabel("다시 여는 사유").fill("격리 PG 응답의 실패 상태 확인");
  await reopen.getByLabel("PG에서 취소되지 않은 것을 확인했습니다").check({ force: true });
  await reopen.getByRole("button", { name: "다시 열기" }).click();
  await expect(page.getByText(/환불을 승인 상태로 되돌렸습니다/)).toBeVisible();
  await page.getByRole("button", { name: "환불 실행" }).click();
  await page
    .getByRole("dialog", { name: "환불 실행" })
    .getByRole("button", { name: "환불 실행" })
    .click();
  await expect(page.getByText("환불을 완료했습니다.")).toBeVisible();
  expect(await auditCount(retry.refundId)).toBe(1);

  const manual = await failedRefund();
  await page.goto(`/ops/billing/refunds/${manual.refundId}`);
  await expect(page.getByText("STUB_CANCEL_DECLINED")).toBeVisible();
  await operatorStepUp(operator);
  await page.getByRole("button", { name: "수동 완료" }).click();
  const resolve = page.getByRole("dialog", { name: "실패한 환불 수동 완료" });
  await resolve.getByLabel("PG 취소 근거").fill("LOCAL-SYNTHETIC-CANCEL");
  await resolve.getByLabel("직접 처리한 사유").fill("격리 환경의 합성 PG 취소 확인");
  await resolve.getByLabel("PG 콘솔에서 직접 취소한 것을 확인했습니다").check({ force: true });
  await resolve.getByRole("button", { name: "수동 완료" }).click();
  await expect(page.getByText("수동 처리로 환불을 완료했습니다.")).toBeVisible();
  expect(await auditCount(manual.refundId)).toBe(1);
  await operator.context.close();
});

test("사무소 종료 후 반환 권한으로 다시 확인하고 자료 반환 화면을 연다", async ({ page }) => {
  await loginViaUi(page, owner.email, /\/home$/);
  await page.goto("/office/close");
  const submit = page.getByRole("button", { name: "사무소 종료", exact: true });
  await submit.click();
  await expect(page.getByText("보관계약 신청 여부를 선택해 주세요.")).toBeVisible();
  await expect(page.getByText("종료 확인에 체크해 주세요.")).toBeVisible();

  const stepUp = await pageApi(page, "POST", "/api/auth/step-up/password", { password: PASSWORD });
  expect(stepUp.status).toBe(200);
  await forceCheck(page.getByLabel("신청하지 않습니다", { exact: true }));
  await forceCheck(page.getByLabel(/^위 내용을 확인했고 사무소를 종료합니다\./));
  const response = page.waitForResponse(
    (res) => res.request().method() === "POST" && res.url().endsWith("/api/offices/current/close"),
  );
  await submit.click();
  expect((await response).status()).toBe(200);

  await expect(page).toHaveURL(/\/grant\?/);
  await expect(page.getByText("사무소가 종료되었습니다.", { exact: true })).toBeVisible();
  const previousSession = await pageApi(page, "GET", "/api/auth/context");
  expect(previousSession.status).toBe(401);

  await page.getByLabel("비밀번호", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "이메일 비밀번호로 확인" }).click();
  await expect(page).toHaveURL(/\/return$/);
  await expect(page.getByRole("heading", { name: "자료 반환" })).toBeVisible();
  await expect(page.getByText("권한 만료", { exact: true })).toBeVisible();
});
