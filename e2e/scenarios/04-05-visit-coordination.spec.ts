import { expect, test, type Page } from "@playwright/test";
import { useMockOfficeRole } from "../support/app";
import { clientNavigate, fixMockClock } from "../support/scenario";

// 개발플로우 4장 시나리오 4·5를 정합화 기준 흐름(승인자 조건·중개사 신청·승인자 선택)으로 재현한다.
// 4: 조율 생성 → 출입승인 3건 등록 → 고객·승인자 시간 제출 → 일정 구성 → 확정 → 결과 기록
// 5: 확정된 조율에서 점유자 변경 → 재조율 → 재확정

async function registerApproval(
  page: Page,
  values: { name: string; phone: string; coApprover?: boolean; from?: string; until?: string },
) {
  await page.getByRole("button", { name: "+ 출입승인 등록" }).click();
  const dialog = page.getByRole("dialog", { name: "출입승인 등록" });
  await dialog.getByLabel("승인자 이름").fill(values.name);
  await dialog.getByLabel("승인자 연락처").fill(values.phone);
  if (values.coApprover) await dialog.getByLabel("공동 승인자").check({ force: true });
  if (values.from) await dialog.getByLabel("승인 시작일").fill(values.from);
  if (values.until) await dialog.getByLabel("승인 종료일").fill(values.until);
  await dialog.getByRole("button", { name: "등록", exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText(values.name).first()).toBeVisible();
}

test.describe("시나리오 4 방문 조율 생성부터 결과 기록까지", () => {
  test.beforeEach(async ({ page }) => {
    await fixMockClock(page);
    await useMockOfficeRole(page, "OWNER");
  });

  test("조율을 만들고 두 매물에 출입승인 3건을 등록해 승인자 링크를 발급한다", async ({ page }) => {
    await test.step("/coordinations/new에서 고객과 후보 매물을 골라 조율을 만든다", async () => {
      await page.goto("/coordinations");
      await page.getByRole("link", { name: "+ 조율 만들기" }).click();
      await page
        .getByRole("radio", { name: /김수요/ })
        .first()
        .check({ force: true });
      await page.getByRole("checkbox", { name: "국민대 앞 아파트 선택" }).check({ force: true });
      await page.getByRole("button", { name: "조율 만들기" }).click();
      await expect(page).toHaveURL(/\/coordinations\/81\d\d$/);
      await expect(page.getByText("시간 수집 중").first()).toBeVisible();
    });

    await test.step("국민대 앞 아파트에 공동 승인자와 다음 기간 대표 승인자를 등록한다", async () => {
      await clientNavigate(page, "/properties/501/access-approvals");
      await expect(page.getByText("박점유").first()).toBeVisible();
      await registerApproval(page, {
        name: "정관리",
        phone: "01011112222",
        coApprover: true,
        until: "2099-12-31",
      });
      await registerApproval(page, {
        name: "정다음",
        phone: "01033334444",
        from: "2027-01-01",
        until: "2027-01-31",
      });
    });

    await test.step("정릉 상가에 대표 승인자를 등록하고 승인자 링크를 발급한다", async () => {
      await clientNavigate(page, "/properties/502/access-approvals");
      await expect(page.getByText("등록된 출입승인이 없습니다.")).toBeVisible();
      await registerApproval(page, { name: "정상가", phone: "01055556666", until: "2099-12-31" });
      await page.getByRole("button", { name: "링크 발급" }).click();
      const dialog = page.getByRole("dialog", { name: "승인자 링크" });
      await expect(dialog.getByLabel("발급된 링크")).toHaveValue(/\/approver\//);
      await dialog.getByRole("button", { name: "닫기" }).first().click();
      await expect(page.getByRole("button", { name: "링크 재발급" })).toBeVisible();
    });
  });

  test("고객이 공개 링크에서 가능한 시간을 제출한다", async ({ page }) => {
    await page.goto("/visit-responses/customer-token-0000001");
    await page.getByRole("button", { name: "가능한 시간 추가" }).click();
    await page.getByLabel("1번째 날짜").fill("2026-11-12");
    await page.getByLabel("1번째 시작").fill("10:00");
    await page.getByLabel("1번째 종료").fill("12:00");
    await page.getByRole("button", { name: "가능한 시간 제출" }).click();
    await expect(page.getByText("가능한 시간을 제출했습니다.")).toBeVisible();
  });

  test("승인자가 승인자 링크에서 방문 조건을 등록한다", async ({ page }) => {
    await page.goto("/approver/approver-token-primary-0001");
    await expect(page.getByRole("tab", { name: "조건 등록" })).toBeVisible();
    await page.getByLabel("하루 최대 방문 횟수").fill("4");
    await page.getByRole("button", { name: "조건 저장" }).click();
    await expect(page.getByText("조건 2번 버전으로 저장했습니다.")).toBeVisible();
  });

  test("일정을 구성하고 중개사가 계산된 구간으로 신청하면 승인자가 겹치는 신청을 비교해 선택한다", async ({
    page,
  }) => {
    await test.step("/coordinations/801에서 일정을 저장해 신청 가능한 시작 시각을 계산한다", async () => {
      await page.goto("/coordinations/801");
      await expect(page.getByText("조율 가능").first()).toBeVisible();
      await page.getByRole("button", { name: "일정 저장" }).click();
      await expect(page.getByText(/일정 구성을 저장했습니다/)).toBeVisible();
      await expect(page.getByRole("list", { name: "계산된 시작 시각" })).toBeVisible();
      await page.getByRole("button", { name: "충돌 확인" }).click();
      await expect(page.getByText("겹치는 일정이 없습니다.")).toBeVisible();
    });

    await test.step("국민대 앞 아파트에 계산된 구간으로 방문 신청을 낸다", async () => {
      await page.getByRole("button", { name: "방문 신청", exact: true }).first().click();
      const form = page.locator("form").filter({ hasText: "신청 가능 구간" });
      await form.getByRole("button", { name: / ~ / }).first().click();
      await form.getByRole("button", { name: "방문 신청 제출" }).click();
      await expect(page.getByText(/방문 신청을 제출했습니다/)).toBeVisible();
      await expect(page.getByText("신청 대기").first()).toBeVisible();
    });

    await test.step("신청 현황에서 신청 대기 상태를 확인한다", async () => {
      await page.getByRole("link", { name: "신청 현황과 알림" }).click();
      await expect(page).toHaveURL(/\/coordinations\/801\/requests/);
      await expect(page.getByText("신청 대기").first()).toBeVisible();
    });

    await test.step("승인자가 겹치는 두 신청 중 하나를 선택하면 다른 신청은 시간 마감된다", async () => {
      await clientNavigate(page, "/approver/approver-token-primary-0001");
      await page.getByRole("tab", { name: "신청 비교·선택" }).click();
      await expect(page.getByText("사이로공인중개사 · 김중개")).toBeVisible();
      await expect(page.getByText("정릉부동산 · 박중개")).toBeVisible();
      await page.getByRole("button", { name: "김중개 신청 선택" }).click();
      await page
        .getByRole("dialog", { name: "이 신청을 선택할까요" })
        .getByRole("button", { name: "선택하기" })
        .click();
      await expect(page.getByText(/선택한 신청이 확정되었습니다/)).toBeVisible();
      await page.getByRole("tab", { name: "확정 일정" }).click();
      await expect(page.getByText("사이로공인중개사 · 김중개")).toBeVisible();
    });
  });

  test.fixme("중개사가 낸 신청을 승인자가 선택하면 조율이 확정 완료가 된다 (모의 API 공백: 사무소 신청과 승인자 신청이 다른 모의 저장소라 선택이 조율에 반영되지 않는다)", async () => {});

  test.fixme("확정된 방문의 결과를 기록한다 (모의 API 공백: 확정 일정 항목을 만드는 처리기가 없어 결과 기록 영역이 나타나지 않는다)", async () => {});
});

test.describe("시나리오 5 점유자 변경에 따른 재조율", () => {
  test.beforeEach(async ({ page }) => {
    await fixMockClock(page);
    await useMockOfficeRole(page, "OWNER");
  });

  test("출입승인 철회를 접수하면 조율이 재조율 필요가 되고 일정을 다시 구성할 수 있다", async ({
    page,
  }) => {
    await page.goto("/coordinations/801");
    await expect(page.getByText("조율 가능").first()).toBeVisible();

    await test.step("점유자 변경으로 출입승인 7001 철회를 접수한다", async () => {
      await page.getByRole("button", { name: "출입승인 철회 접수" }).click();
      const dialog = page.getByRole("dialog", { name: "출입승인 철회 접수" });
      await dialog.getByLabel("출입승인 번호").fill("7001");
      await dialog.getByLabel("철회 날짜").fill("2026-11-09");
      await dialog.getByLabel("철회 시각").fill("10:00");
      await dialog.getByLabel("철회 사유").fill("점유자 변경");
      await dialog.getByRole("button", { name: "철회 접수" }).click();
      await expect(page.getByText("재조율 필요").first()).toBeVisible();
      await expect(page.getByText(/재조율이 필요합니다/).first()).toBeVisible();
    });

    await test.step("재조율 사유를 남기고 일정을 다시 저장해도 재조율 필요가 유지된다", async () => {
      await page.getByLabel("재조율이 필요한 이유").fill("점유자 변경으로 새 승인 필요");
      await page.getByRole("button", { name: "재조율 필요로 전환" }).click();
      await expect(page.getByText(/재조율 필요로 전환했습니다/)).toBeVisible();
      await page.getByRole("button", { name: "일정 저장" }).click();
      await expect(page.getByText(/일정 구성을 저장했습니다/)).toBeVisible();
      await expect(page.getByText("재조율 필요").first()).toBeVisible();
    });

    await test.step("철회된 출입승인은 매물의 출입승인 목록에 철회됨으로 남는다", async () => {
      await clientNavigate(page, "/properties/501/access-approvals");
      await expect(page.getByText("철회됨").first()).toBeVisible();
    });
  });

  test.fixme("새 출입승인으로 다시 신청해 재확정한다 (모의 API 공백: 재조율 필요 상태에서 확정 완료로 돌아가는 처리기가 없다)", async () => {});
});
