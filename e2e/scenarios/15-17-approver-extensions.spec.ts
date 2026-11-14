import { expect, test } from "@playwright/test";
import { useMockOfficeRole } from "../support/app";
import { callMockApi, clientNavigate, fixMockClock } from "../support/scenario";

const APPROVER_LINK = "/approver/NzAwMToxNzYyNzM2NDAwMDAw.approver-token-primary-0001";
const CO_APPROVER_LINK = "/approver/approver-token-coapprover-0001";

test.beforeEach(async ({ page }) => {
  await fixMockClock(page);
  await useMockOfficeRole(page, "OWNER");
});

// 개발플로우 4장 시나리오 15: 다른 사무소 신청 허용 → 허용받은 사무소의 신청 → 공존과 선택 → 허용 회수
test.describe("시나리오 15 다른 사무소 신청 허용", () => {
  test("매물을 가진 사무소가 다른 사무소에 신청을 허용하고 회수한다", async ({ page }) => {
    await test.step("국민대 앞 아파트 대표 승인자 출입승인의 신청 허용 화면으로 간다", async () => {
      await page.goto("/properties/501/access-approvals");
      await page.getByRole("link", { name: "신청 허용" }).first().click();
      await expect(page.getByRole("heading", { name: "신청 허용 관리" })).toBeVisible();
      await expect(page.getByText("허용한 사무소가 없습니다.")).toBeVisible();
    });

    await test.step("사무소를 검색해 신청 허용을 추가한다", async () => {
      await page.getByRole("button", { name: "허용 추가" }).click();
      const dialog = page.getByRole("dialog", { name: "신청 허용 추가" });
      await dialog.getByLabel("사무소명").fill("땡땡");
      await dialog.getByLabel("지역").fill("성북구");
      await dialog.getByRole("button", { name: "사무소 검색" }).click();
      await dialog
        .getByRole("list", { name: "검색 결과" })
        .getByRole("button", { name: /땡땡사무소/ })
        .click();
      await dialog.getByRole("button", { name: "허용 추가" }).click();
      await expect(page.getByText("신청 허용을 추가했습니다.")).toBeVisible();
      await expect(page.getByText("사무소 5").first()).toBeVisible();
      await expect(page.getByText("적용 중").first()).toBeVisible();
    });

    await test.step("허용을 회수하면 신청 대기 신청은 기간 만료로 종결되고 확정 방문은 유지된다고 안내한다", async () => {
      await page.getByRole("button", { name: "사무소 5 허용 회수" }).click();
      const dialog = page.getByRole("dialog", { name: "신청 허용 회수" });
      await dialog.getByLabel("회수 사유").fill("계약 종료");
      await dialog.getByRole("button", { name: "회수", exact: true }).click();
      await expect(page.getByText(/허용을 회수했습니다/)).toBeVisible();
      await expect(page.getByText(/기간 만료로 종결/)).toBeVisible();
      await expect(page.getByRole("listitem").filter({ hasText: "사무소 5" })).toContainText(
        "회수 사유 계약 종료",
      );
    });
  });

  test("허용이 없는 다른 사무소 매물을 후보로 담으면 422 CANDIDATE_NOT_ALLOWED를 받는다", async ({
    page,
  }) => {
    await page.goto("/coordinations/801");
    await expect(page.getByText("조율 가능").first()).toBeVisible();
    const result = await callMockApi(
      page,
      "POST",
      "/api/visit-coordinations/801/candidate-properties",
      { propertyId: 999 },
    );
    expect(result.status).toBe(422);
    expect(result.body).toMatchObject({ code: "CANDIDATE_NOT_ALLOWED" });
  });

  test("승인자가 두 사무소의 겹치는 신청 중 허용받은 사무소의 신청을 선택한다", async ({
    page,
  }) => {
    await page.goto(APPROVER_LINK);
    await page.getByRole("tab", { name: "신청 비교·선택" }).click();
    await expect(page.getByText("사이로공인중개사 · 김중개")).toBeVisible();
    await expect(page.getByText("정릉부동산 · 박중개")).toBeVisible();
    await page.getByRole("button", { name: "박중개 신청 선택" }).click();
    await page
      .getByRole("dialog", { name: "이 신청을 선택할까요" })
      .getByRole("button", { name: "선택하기" })
      .click();
    await expect(page.getByText(/시간이 겹치는 다른 신청 1건은 시간 마감되었습니다/)).toBeVisible();
  });

  test("매물을 가진 사무소의 다른 사무소 신청 현황은 고객·인원·요청사항을 보여주지 않는다", async ({
    page,
  }) => {
    await page.goto("/properties/501");
    await page.getByRole("link", { name: "다른 사무소 신청" }).click();
    await expect(page.getByRole("heading", { name: "다른 사무소 신청 현황" })).toBeVisible();
    await expect(
      page.getByText(/고객 이름, 연락처, 인원, 요청사항은 보이지 않습니다/),
    ).toBeVisible();
    await expect(page.getByRole("tab", { name: "신청" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "확정 방문" })).toBeVisible();
  });

  test.fixme("허용받은 사무소가 허용받은 매물을 자기 조율 건 후보로 담고 신청한다 (모의 API 공백: 허용한 쪽과 허용받은 쪽 모의 저장소가 이어지지 않아 허용받은 매물 목록이 늘 비어 있다)", async () => {});

  test.fixme("허용 회수 뒤 허용 근거 신청이 GRANT_REVOKED 알림과 함께 기간 만료되고 다시 신청하면 403 APPLY_GRANT_INACTIVE가 된다 (모의 API 공백: 허용받은 후보 매물과 그 신청을 만들 수 없다)", async () => {});

  test.fixme("두 사무소가 같은 매물에 동시에 확정을 시도해도 한 건만 확정된다 (백엔드 동시성 검증 항목으로 화면 모의 API에서는 재현하지 않는다)", async () => {});
});

// 개발플로우 4장 시나리오 16: 승인자 번호 인증 계정 → 연결 제안 → 일괄 적용 → 공동 승인자 403 → 해지
test.describe("시나리오 16 승인자 계정", () => {
  test("승인자 링크에서 번호 인증으로 계정을 만들고 다시 인증해 해지한다", async ({ page }) => {
    await test.step("승인자 링크에서 번호 인증 계정 만들기로 계정을 만든다", async () => {
      await page.goto(APPROVER_LINK);
      await expect(page.getByRole("heading", { name: "방문 조건과 신청" })).toBeVisible();
      await page.getByRole("link", { name: "번호 인증 계정 만들기·로그인" }).click();
      await expect(page.getByRole("heading", { name: "번호 인증으로 계정 만들기" })).toBeVisible();
      await page.getByLabel("휴대폰 번호").fill("010-1234-5678");
      await page.getByRole("button", { name: "인증번호 받기" }).click();
      await page.getByLabel("인증번호 6자리").fill("123456");
      await page.getByRole("button", { name: "인증하고 계정 만들기" }).click();
      await expect(page.getByRole("heading", { name: "내 매물 모아보기" })).toBeVisible();
      await expect(page.getByText(/010-\*\*\*\*-5678 계정/)).toBeVisible();
    });

    await test.step("계정을 해지하려면 번호로 다시 인증해야 하고 해지 뒤 로그인 화면으로 돌아간다", async () => {
      await page.getByLabel("위 내용을 확인했고 계정을 해지합니다").check({ force: true });
      await page.getByRole("button", { name: "계정 해지" }).click();
      await expect(page.getByText(/10분 안에 번호 인증으로 다시 확인해야 합니다/)).toBeVisible();
      await page.getByLabel("휴대폰 번호").fill("010-1234-5678");
      await page.getByRole("button", { name: "인증번호 받기" }).click();
      await page.getByLabel("인증번호 6자리").fill("123456");
      await page.getByRole("button", { name: "다시 인증하고 해지" }).click();
      await expect(page).toHaveURL(/\/approver\/account\/login/);
      await expect(page.getByRole("heading", { name: "번호 인증 로그인" })).toBeVisible();
    });

    await test.step("계정을 해지해도 승인자 링크 접근은 유지된다", async () => {
      await clientNavigate(page, APPROVER_LINK);
      await expect(page.getByRole("heading", { name: "방문 조건과 신청" })).toBeVisible();
    });
  });

  test("공동 승인자 링크는 읽기 전용이고 조건 입력과 신청 선택이 403 APPROVER_READ_ONLY로 막힌다", async ({
    page,
  }) => {
    await page.goto(CO_APPROVER_LINK);
    await expect(page.getByText(/공동 승인자는 조건을 입력할 수 없고/)).toBeVisible();
    await expect(page.getByRole("button", { name: "조건 저장" })).toHaveCount(0);
    await page.getByRole("tab", { name: "신청 비교·선택" }).click();
    await expect(page.getByText(/이 링크는 읽기 전용입니다/)).toBeVisible();
    const select = await callMockApi(
      page,
      "POST",
      "/api/public/approver-property-links/approver-token-coapprover-0001/visit-requests/9001/select",
      { comparedRequestIds: [9001], acknowledgedNoticeVersion: "2026-11" },
    );
    expect(select.status).toBe(403);
    expect(select.body).toMatchObject({ code: "APPROVER_READ_ONLY" });
  });

  test.fixme("같은 번호로 등록된 다른 출입승인이 연결 제안으로 나오고 수락한 것만 연결된다 (모의 API 공백: 번호 인증이 연결 제안을 만들지 않는다)", async () => {});

  test.fixme("내 매물 모아보기에서 여러 매물을 골라 조건을 일괄 적용하고 영향 확인이 필요한 출입승인은 적용되지 않는다 (모의 API 공백: 연결된 매물과 영향 확인 대상이 없다)", async () => {});
});

// 개발플로우 4장 시나리오 17: 날짜별 필수 조건
test.describe("시나리오 17 날짜별 조건", () => {
  test("특정 날짜의 하루 최대 횟수를 따로 정하고 다른 날짜는 제한 없음으로 저장한다", async ({
    page,
  }) => {
    await page.goto(APPROVER_LINK);
    await expect(page.getByLabel("하루 최대 방문 횟수", { exact: true })).toHaveValue("3");
    await page.getByRole("button", { name: "날짜별 조건 추가" }).click();
    await page.getByRole("button", { name: "날짜별 조건 추가" }).click();
    await page.getByLabel("날짜별 조건 1 날짜").fill("2026-11-18");
    await page
      .getByLabel("하루 최대 방문 횟수 (날짜별 조건 1)", { exact: true })
      .selectOption({ label: "값 지정" });
    await page.getByLabel("하루 최대 방문 횟수 값 (날짜별 조건 1)").fill("1");
    await page.getByLabel("날짜별 조건 2 날짜").fill("2026-11-25");
    await page
      .getByLabel("하루 최대 방문 횟수 (날짜별 조건 2)", { exact: true })
      .selectOption({ label: "그 날짜는 제한 없음" });
    await page.getByRole("button", { name: "조건 저장" }).click();
    await expect(page.getByText("조건 2번 버전으로 저장했습니다.")).toBeVisible();

    await page.getByRole("tab", { name: "신청 비교·선택" }).click();
    await page.getByRole("tab", { name: "조건 등록" }).click();
    await expect(page.getByLabel("날짜별 조건 1 날짜")).toHaveValue("2026-11-18");
    await expect(page.getByLabel("하루 최대 방문 횟수 값 (날짜별 조건 1)")).toHaveValue("1");
    await expect(page.getByLabel("날짜별 조건 2 날짜")).toHaveValue("2026-11-25");
  });

  test.fixme("날짜별 유효 값이 신청 가능 구간, 신청 제출 검증, 선택 재검증, 최소 간격과 사전 신청 시간 판정에 쓰인다 (모의 API 공백: 모의 신청 검증이 날짜별 조건을 읽지 않는다)", async () => {});
});
