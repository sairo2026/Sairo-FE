import { expect, test } from "@playwright/test";
import { useMockOfficeRole } from "../support/app";
import { fixMockClock } from "../support/scenario";

test.beforeEach(async ({ page }) => {
  await fixMockClock(page);
});

// 개발플로우 4장 시나리오 7: 구독 체험 시작 → 첫 결제 실패 → 즉시 종료·반환기간 진입 → 대표의 직접 재결제 성공 후 구독 재개
test.describe("시나리오 7 체험부터 첫 결제 실패와 반환기간, 재결제까지", () => {
  test("체험 중인 대표가 카드를 등록하고 구독 구매에 동의한다", async ({ page }) => {
    await useMockOfficeRole(page, "OWNER");

    await test.step("카드 등록창에서 돌아오면 등록 결과와 첫 결제 예정일을 보여준다", async () => {
      await page.goto("/billing/card/result?authKey=ok&customerKey=customer-key-0001&v=1.0");
      await expect(page.getByText(/결제수단이 등록됐습니다/)).toBeVisible();
      await expect(page.getByText(/첫 결제 예정일은 2027-01-09/)).toBeVisible();
      await page.getByRole("link", { name: "구독 현황으로" }).click();
    });

    await test.step("/billing에서 체험 상태와 결제 준비 상태를 확인한다", async () => {
      await expect(page.getByRole("heading", { name: "구독·결제" })).toBeVisible();
      await expect(page.getByText(/무료 이용 중 · 무료 종료 예정 2027-01-08/)).toBeVisible();
      await expect(page.getByRole("list", { name: "결제 준비 상태" })).toContainText(
        "구독 구매 동의 필요",
      );
    });

    await test.step("요금제 안내에서 인원 수로 예상 금액을 계산한다", async () => {
      await page.getByRole("link", { name: "요금제 안내와 예상 금액" }).click();
      await page.getByLabel("인원 수로 계산해 보기").fill("3");
      await expect(page.getByText(/3명: 59,900원 \/ 월/)).toBeVisible();
      await page.goBack();
    });

    await test.step("구독 구매 동의를 기록하면 결제 준비가 끝난다", async () => {
      await page.getByRole("link", { name: "구독 구매 동의하기", exact: true }).click();
      await page
        .getByRole("checkbox", { name: /월 선불 자동결제에 동의합니다/ })
        .check({ force: true });
      await page
        .getByRole("checkbox", { name: /해지와 환불 조건을 확인했습니다/ })
        .check({ force: true });
      await page.getByRole("button", { name: "동의하고 확인 완료" }).click();
      await expect(page.getByText(/구독 조건 확인이 기록됐습니다/)).toBeVisible();
      await page.getByRole("link", { name: "구독 현황으로" }).click();
      await expect(page.getByRole("list", { name: "결제 준비 상태" })).not.toContainText("필요");
    });
  });

  test("반환기간에 들어간 대표가 본인 확인 뒤 자료를 내보낸다", async ({ page }) => {
    await page.goto("/billing/return-guide");
    await expect(page.getByRole("heading", { name: "자료 반환과 보관 안내" })).toBeVisible();
    await page.goto("/grant?type=return&grantId=12");
    await page.getByLabel("비밀번호").fill("correct-pw");
    await page.getByRole("button", { name: "이메일 비밀번호로 확인" }).click();
    await expect(page.getByRole("heading", { name: "자료 반환" })).toBeVisible();
    await page.getByRole("button", { name: "자료 내보내기" }).click();
    await expect(page.getByText(/내보내기가 완료됐습니다/)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("link", { name: "내려받기" })).toBeVisible();
  });

  test.fixme("체험이 끝나 첫 결제가 실패하면 즉시 종료와 반환기간으로 바뀌고 대표가 직접 재결제해 구독이 재개된다 (모의 API 공백: 모의 구독 상태가 체험에서 바뀌지 않고 첫 결제와 재결제가 늘 성공한다)", async () => {});
});

// 개발플로우 4장 시나리오 8: 갱신 PG 타임아웃 → 확인 중 유지 → 같은 주문 ID와 멱등키로 결과 확인 → 성공 또는 확정 실패
test.describe("시나리오 8 갱신 결제 타임아웃과 결과 확인", () => {
  test("운영 콘솔 청구서 상세에 결제 확인 중 청구와 PG 확인 중 시도가 함께 보인다", async ({
    page,
  }) => {
    await page.goto("/ops/billing/invoices/2");
    await expect(page.getByText("결제 확인 중").first()).toBeVisible();
    const attempts = page.getByRole("table", { name: "결제 시도 목록" });
    await expect(attempts.getByRole("row").filter({ hasText: "inv2-att1-b2c4" })).toContainText(
      "실패",
    );
    await expect(attempts.getByRole("row").filter({ hasText: "inv2-att2-c9d1" })).toContainText(
      "PG 확인 중",
    );
  });

  test("청구서 상세에서 확인 중인 주문과 사무소의 결제 작업 이력을 보고 실패한 작업을 원래 주문으로 다시 실행한다", async ({
    page,
  }) => {
    await page.goto("/ops/billing/invoices/2");

    await test.step("PG 결과 확인 영역에 확인 중인 주문 ID와 자동 재조회 안내가 나온다", async () => {
      await expect(page.getByText("확인 중인 주문 ID: inv2-att2-c9d1")).toBeVisible();
      await expect(
        page.getByText(/같은 주문 ID로 결제대행사 결과를 자동으로 다시 조회합니다/),
      ).toBeVisible();
    });

    await test.step("이 사무소의 실패한 정기 결제 작업을 원래 멱등키로 다시 실행한다", async () => {
      const runs = page.getByRole("table", { name: "이 사무소의 결제 작업 실행 이력" });
      await expect(runs.getByRole("row").filter({ hasText: "PG_TIMEOUT" })).toContainText(
        "정기 결제",
      );
      await page.getByRole("button", { name: "실행 108 다시 실행" }).click();
      await page
        .getByRole("dialog")
        .getByRole("button", { name: "다시 실행", exact: true })
        .click();
      await expect(page.getByText(/실행 108를 원래 주문으로 다시 실행했습니다/)).toBeVisible();
    });

    await test.step("최신 결과를 다시 불러와도 같은 주문이 확인 중으로 남는다", async () => {
      await page.getByRole("button", { name: "최신 결과 불러오기" }).click();
      await expect(page.getByText("확인 중인 주문 ID: inv2-att2-c9d1")).toBeVisible();
    });
  });

  test.fixme("확인 중인 결제가 중복 승인 없이 결제 성공 또는 확정 실패로 끝난다 (모의 API 공백: 모의 청구서의 확인 중 상태가 바뀌지 않고 사무소 청구서는 확인 중 상태를 받지 않는다)", async () => {});
});
