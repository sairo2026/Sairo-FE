import { expect, test } from "@playwright/test";
import { fixMockClock } from "../support/scenario";

test.beforeEach(async ({ page }) => {
  await fixMockClock(page);
});

// 개발플로우 4장 시나리오 18: 가격 결정의 요금 규칙 시험 항목 중 화면이 있는 것
test.describe("시나리오 18 요금 규칙", () => {
  test("시작 고객 합의를 등록하고 다른 운영자 등록분을 승인하며 상한·가입 창·중복 등록을 막는다", async ({
    page,
  }) => {
    await page.goto("/ops/start-customer-agreements");
    await expect(page.getByRole("table", { name: "시작 고객 합의 목록" })).toBeVisible();

    await test.step("사무소 8의 합의를 등록하고 같은 사무소를 다시 등록하면 409로 막힌다", async () => {
      const register = async () => {
        await page.getByLabel("대상 사무소 ID").fill("8");
        await page.getByLabel("시작 고객 이벤트").selectOption("7");
        await page.getByLabel("시작 고객 가격 버전 ID").fill("14");
        await page.getByLabel("체결일").fill("2026-11-09");
        await page.getByLabel("합의서 참조번호").fill("SC-2026-0008");
        await page.getByLabel("합의서 문안 버전").fill("1.0");
        await page.getByLabel("주간 사용을 확인했습니다").check({ force: true });
        await page.getByLabel("월 1회 피드백 인터뷰를 확인했습니다").check({ force: true });
        await page.getByRole("button", { name: "합의 등록" }).click();
      };
      await register();
      await expect(page.getByText(/합의 \d+를 등록했습니다/)).toBeVisible();
      await register();
      await expect(page.getByText("이미 같은 사무소의 시작 고객 합의가 있습니다.")).toBeVisible();
    });

    await test.step("등록한 운영자는 자기 합의를 승인할 수 없다", async () => {
      await expect(page.getByText("등록한 운영자는 승인할 수 없습니다.").first()).toBeVisible();
    });

    await test.step("다른 운영자가 등록한 합의를 승인하면 무료 종료가 2027-07-01로 늦춰진다", async () => {
      await page.getByRole("button", { name: "합의 2 승인" }).click();
      await page
        .getByRole("dialog", { name: "시작 고객 합의 승인" })
        .getByRole("button", { name: "승인", exact: true })
        .click();
      const result = page.getByRole("status", { name: "승인 결과" });
      await expect(result).toContainText("합의 2를 승인했습니다.");
      await expect(result).toContainText("2027-07-01");
    });

    await test.step("상한이 찬 이벤트와 가입 창이 닫힌 이벤트의 합의 승인은 409로 막힌다", async () => {
      await page.getByRole("button", { name: "합의 4 승인" }).click();
      await page
        .getByRole("dialog", { name: "시작 고객 합의 승인" })
        .getByRole("button", { name: "승인", exact: true })
        .click();
      await expect(page.getByText(/승인 상한을 넘어/)).toBeVisible();
      await page.keyboard.press("Escape");
      await page.getByRole("button", { name: "합의 5 승인" }).click();
      await page
        .getByRole("dialog", { name: "시작 고객 합의 승인" })
        .getByRole("button", { name: "승인", exact: true })
        .click();
      await expect(page.getByText(/가입 창이 닫혀/)).toBeVisible();
    });
  });

  test("일반 이벤트 가입 창이 겹치면 409로 막히고 작성자 본인은 승인할 수 없다", async ({
    page,
  }) => {
    await page.goto("/ops/trial-events");
    await page.getByLabel("이벤트명").fill("겹치는 체험 이벤트");
    await page.getByRole("textbox", { name: "시작 날짜", exact: true }).fill("2026-11-20");
    await page.getByRole("textbox", { name: "시작 시각", exact: true }).fill("00:00");
    await page.getByRole("textbox", { name: "종료 날짜", exact: true }).fill("2026-12-30");
    await page.getByRole("textbox", { name: "종료 시각", exact: true }).fill("00:00");
    await page.getByRole("button", { name: "이벤트 등록" }).click();
    await expect(page.getByText(/가입 창이 겹쳐 저장할 수 없습니다/)).toBeVisible();

    await page.getByRole("button", { name: "시작 고객 모집 승인" }).click();
    await page
      .getByRole("dialog", { name: "이벤트 승인" })
      .getByRole("button", { name: "승인", exact: true })
      .click();
    await expect(page.getByText(/작성자 본인은 승인할 수 없습니다/)).toBeVisible();
  });

  test("공개 요금 페이지는 시작 고객 가격을 보여주지 않는다", async ({ page }) => {
    await page.goto("/pricing");
    await expect(page.getByRole("heading", { name: "사무소 단위 월 구독 요금" })).toBeVisible();
    await expect(page.getByText(/월 39,900원/).first()).toBeVisible();
    await expect(page.getByText(/시작 고객/)).toHaveCount(0);
  });

  test.fixme("최초 인증 완료 시각의 이벤트 선택 경계, 15번째 자리 동시 승인, 청구 시작과 가격 버전 고정, 가격 보장 종료 45일 전 안내, 거절·무응답 종료, 인하 안내 적용 (백엔드 배치·청구 규칙으로 화면이 없다)", async () => {});

  test.fixme("시행 중인 표준 가격 버전이 없으면 공개 요금 조회가 404 PRICE_SCHEDULE_NOT_PUBLISHED를 안내한다 (모의 API 공백: 공개 요금 모의 응답이 늘 200이다)", async () => {});

  test.fixme("사무소 대표가 승인된 시작 고객 합의와 가격 보장 기간을 확인한다 (모의 API 공백: 사무소 시작 고객 합의 응답이 늘 비어 있다)", async () => {});
});
