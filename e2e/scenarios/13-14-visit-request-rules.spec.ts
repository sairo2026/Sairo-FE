import { expect, test } from "@playwright/test";
import { useMockOfficeRole } from "../support/app";
import { callMockApi, clientNavigate, fixMockClock } from "../support/scenario";

const APPROVER_LINK = "/approver/NzAwMToxNzYyNzM2NDAwMDAw.approver-token-primary-0001";

test.beforeEach(async ({ page }) => {
  await fixMockClock(page);
  await useMockOfficeRole(page, "OWNER");
});

// 개발플로우 4장 시나리오 13: 승인자 조건 → 두 중개사 신청 공존 → 승인자 선택 → 재검증 → 시간 마감 알림
// → 조건 위반 신청 422 → 취소된 빈자리 자동 승격 없음
test.describe("시나리오 13 승인자 조건과 신청 선택", () => {
  test("승인자가 여섯 가지 조건을 등록한다", async ({ page }) => {
    await page.goto(APPROVER_LINK);
    await expect(page.getByRole("tab", { name: "조건 등록" })).toBeVisible();
    await page.getByLabel("하루 최대 방문 횟수").fill("2");
    await page.getByLabel("방문 간 최소 간격(분)").fill("30");
    await page.getByLabel("최소 사전 신청 시간(분)").fill("120");
    await page.getByLabel("1회 허용 시간(분)").fill("40");
    await page.getByLabel("적용 종료일").fill("2026-12-31");
    await page.getByRole("button", { name: "목요일 시간대 추가" }).click();
    await page.getByRole("button", { name: "조건 저장" }).click();
    await expect(page.getByText("조건 2번 버전으로 저장했습니다.")).toBeVisible();
  });

  test("겹치는 두 중개사 신청이 함께 보이고 하나를 고르면 다른 신청은 시간 마감되며 처리된 신청은 다시 고를 수 없다", async ({
    page,
  }) => {
    await page.goto(APPROVER_LINK);
    await page.getByRole("tab", { name: "신청 비교·선택" }).click();

    await test.step("같은 매물에 겹치는 두 사무소의 신청이 승인 대기로 함께 보인다", async () => {
      await expect(page.getByText("사이로공인중개사 · 김중개")).toBeVisible();
      await expect(page.getByText("정릉부동산 · 박중개")).toBeVisible();
      await expect(page.getByText(/겹치는 신청은 승인 대기로 함께 보이며/)).toBeVisible();
    });

    await test.step("다른 창에서 김중개 신청이 먼저 선택된 뒤 박중개 신청을 고르면 409로 안내한다", async () => {
      const selected = await callMockApi(
        page,
        "POST",
        "/api/public/approver-property-links/NzAwMToxNzYyNzM2NDAwMDAw.approver-token-primary-0001/visit-requests/9001/select",
        { comparedRequestIds: [9001, 9002], acknowledgedNoticeVersion: "2026-11" },
        { "If-Match": "1" },
      );
      expect(selected.status).toBe(200);
      await page.getByRole("button", { name: "박중개 신청 선택" }).click();
      await page
        .getByRole("dialog", { name: "이 신청을 선택할까요" })
        .getByRole("button", { name: "선택하기" })
        .click();
      await expect(
        page.getByText(/이미 처리되었거나 희망 시작 시각이 지난 신청입니다/),
      ).toBeVisible();
      const again = await callMockApi(
        page,
        "POST",
        "/api/public/approver-property-links/NzAwMToxNzYyNzM2NDAwMDAw.approver-token-primary-0001/visit-requests/9002/select",
        { comparedRequestIds: [9002], acknowledgedNoticeVersion: "2026-11" },
        { "If-Match": "1" },
      );
      expect(again.status).toBe(409);
      expect(again.body).toMatchObject({ code: "VISIT_REQUEST_INVALID_STATE" });
    });
  });

  test("조건에 맞지 않는 구간의 신청은 422로 거부되고 자동 승격이 없음을 신청 현황에 안내한다", async ({
    page,
  }) => {
    await page.goto("/coordinations/801");
    await page.getByRole("button", { name: "일정 저장" }).click();
    await expect(page.getByText(/일정 구성을 저장했습니다/)).toBeVisible();

    await test.step("계산된 구간 밖 시각으로 신청하면 APPROVER_CONDITION_VIOLATED 422를 받는다", async () => {
      const rejected = await callMockApi(
        page,
        "POST",
        "/api/visit-coordinations/801/visit-requests",
        {
          candidatePropertyId: 8011,
          requestedStartAt: "2026-11-18T20:00:00+09:00",
          requestedEndAt: "2026-11-18T20:30:00+09:00",
          expectedDurationMinutes: 30,
        },
      );
      expect(rejected.status).toBe(422);
      expect(rejected.body).toMatchObject({ code: "APPROVER_CONDITION_VIOLATED" });
    });

    await test.step("신청 현황 화면은 시간 마감 신청이 자동 승격되지 않음을 안내한다", async () => {
      await page.getByRole("link", { name: "신청 현황과 알림" }).click();
      await expect(page.getByText(/자동으로 승격되지 않습니다/).first()).toBeVisible();
    });
  });

  test.fixme("선택 뒤 재검증 실패와 확정 취소로 생긴 빈자리가 이전 대기자에게 넘어가지 않는다 (모의 API 공백: 재검증 실패와 확정 방문 취소를 만드는 처리기가 화면 흐름에 없다)", async () => {});
});

// 개발플로우 4장 시나리오 14: 대리 입력 조건 → 본인 입력 활성 시 409 → 재조율 중 변경 신청 → 만료 배치와 409 → 확정 방문 취소
test.describe("시나리오 14 대리 입력 조건과 신청 상태 전이", () => {
  test("새 대표 승인자에 중개사 대리 입력 조건을 저장하고 본인 입력이 활성인 승인에는 대리 입력이 막힌다", async ({
    page,
  }) => {
    await test.step("정릉 상가에 대표 승인자를 등록하고 승인자 조건 화면으로 간다", async () => {
      await page.goto("/properties/502/access-approvals");
      await page.getByRole("button", { name: "+ 출입승인 등록" }).click();
      const dialog = page.getByRole("dialog", { name: "출입승인 등록" });
      await dialog.getByLabel("승인자 이름").fill("정상가");
      await dialog.getByLabel("승인자 연락처").fill("01055556666");
      await dialog.getByLabel("승인 종료일").fill("2099-12-31");
      await dialog.getByRole("button", { name: "등록", exact: true }).click();
      await expect(dialog).toBeHidden();
      await page.getByRole("link", { name: "승인자 조건" }).first().click();
      await expect(page.getByText("등록된 조건 이력이 없습니다.")).toBeVisible();
    });

    await test.step("대리 입력으로 저장하면 출처가 중개사 대리 입력인 1번 버전이 적용된다", async () => {
      await page.getByRole("button", { name: "대리 입력으로 저장" }).click();
      await expect(page.getByText("조건 1번 버전으로 저장했습니다.")).toBeVisible();
      await expect(page.getByText("1번 버전", { exact: true })).toBeVisible();
      await expect(page.getByText("중개사 대리 입력").first()).toBeVisible();
      await expect(page.getByText("적용 중").first()).toBeVisible();
    });

    await test.step("승인자 본인 입력이 적용 중인 7001은 대리 입력을 막고 API도 409를 돌려준다", async () => {
      await clientNavigate(page, "/properties/501/access-approvals/7001/conditions");
      await expect(page.getByText(/승인자 본인이 입력한 조건이 적용 중이라/)).toBeVisible();
      await expect(page.getByRole("button", { name: "대리 입력으로 저장" })).toHaveCount(0);
      const result = await callMockApi(
        page,
        "PUT",
        "/api/properties/501/access-approvals/7001/approver-conditions/proxy",
        {
          appliesFrom: "2026-11-12T00:00:00+09:00",
          appliesUntil: "2026-12-31T23:59:59+09:00",
          windows: [
            {
              windowType: "WEEKDAY",
              weekday: 3,
              windowDate: null,
              startsTime: "10:00",
              endsTime: "12:00",
              isException: false,
            },
          ],
          impactAcknowledged: false,
          acknowledgedNoticeVersion: "",
        },
      );
      expect(result.status).toBe(409);
      expect(result.body).toMatchObject({ code: "INVALID_TRANSITION" });
    });
  });

  test("조율 전체 취소 뒤 새 기간으로 복제한다", async ({ page }) => {
    await page.goto("/coordinations/801");
    await page.getByRole("button", { name: "조율 전체 취소" }).click();
    const dialog = page.getByRole("dialog", { name: "조율 전체 취소" });
    await dialog.getByLabel("취소 사유 (선택)").fill("고객 일정 변경");
    await dialog.getByRole("button", { name: "전체 취소" }).click();
    await expect(page.getByText("취소", { exact: true }).first()).toBeVisible();
    await page.getByRole("button", { name: "새 기간으로 복제" }).click();
    const clone = page.getByRole("dialog", { name: "새 기간으로 복제" });
    await clone.getByLabel("방문 가능 시작일").fill("2026-11-20");
    await clone.getByLabel("방문 가능 종료일").fill("2026-11-27");
    await clone.getByRole("button", { name: "복제해서 새 조율 만들기" }).click();
    await expect(page.getByText("새 조율을 만들었습니다.")).toBeVisible();
    await expect(page.getByRole("link", { name: "새 조율 열기" })).toBeVisible();
  });

  test.fixme("재조율 필요 상태에서 변경 신청을 내도 상태가 유지되고 영향 방문이 해소되면 확정 완료로 돌아간다 (모의 API 공백: 확정 일정 항목이 없어 변경 신청 영역이 나타나지 않는다)", async () => {});

  test.fixme("희망 시작 시각이 지난 신청 대기 신청이 만료 배치로 기간 만료가 되고 그 신청을 고르면 409로 만료 처리된다 (모의 API 공백: 만료 상태 신청과 배치가 없다)", async () => {});

  test.fixme("확정 방문 취소가 신청 취소, 빈자리 재개방 알림, 취소 사유 코드, 조율 상태 재계산을 함께 처리한다 (모의 API 공백: 확정 방문 단위 취소 처리기가 없다)", async () => {});
});
