import { expect, test, type Page } from "@playwright/test";
import { fixMockClock } from "../support/scenario";

test.beforeEach(async ({ page }) => {
  await fixMockClock(page);
});

async function passStepUp(page: Page) {
  const dialog = page.getByRole("dialog", { name: "운영자 재인증" });
  await dialog.getByLabel("확인 코드").fill("123456");
  await dialog.getByRole("button", { name: "확인", exact: true }).click();
}

// 개발플로우 4장 시나리오 9: PG 거래자료 대사 → 다섯 분류 → 근거를 남겨 차이 해결
test.describe("시나리오 9 PG 거래 대사", () => {
  test("전일 대사 결과를 분류별로 보고 금액 불일치 항목을 근거와 함께 해결한다", async ({
    page,
  }) => {
    await page.goto("/ops/billing/reconciliation");

    await test.step("일치·금액 불일치·PG에만 존재·내부에만 존재·확인 중 건수가 나온다", async () => {
      const counts = page.getByRole("list", { name: "대사 결과 건수" });
      for (const text of [
        "일치 1건",
        "금액 불일치 2건",
        "PG에만 존재 1건",
        "내부에만 존재 1건",
        "확인 중 1건",
      ]) {
        await expect(counts).toContainText(text);
      }
    });

    await test.step("금액 불일치이면서 미해결인 항목만 걸러 본다", async () => {
      await page.getByLabel("대사 결과", { exact: true }).selectOption("AMOUNT_MISMATCH");
      await page.getByLabel("미해결 차이만").check({ force: true });
      await page.getByRole("button", { name: "조회" }).click();
      await expect(page.getByRole("button", { name: "항목 2 해결 기록" })).toBeVisible();
    });

    await test.step("차이 원인과 해결 근거를 남기면 항목이 해결된다", async () => {
      await page.getByRole("button", { name: "항목 2 해결 기록" }).click();
      const dialog = page.getByRole("dialog", { name: "대사 차이 해결 2" });
      await dialog.getByLabel("차이 원인").fill("PG 수수료 차감 반영 차이");
      await dialog.getByLabel("해결 근거").fill("PG 정산서와 대조 완료");
      await dialog.getByRole("button", { name: "해결 기록" }).click();
      await expect(page.getByText("대사 항목 2의 해결 내용을 기록했습니다.")).toBeVisible();
      await expect(page.getByRole("button", { name: "항목 2 해결 기록" })).toHaveCount(0);
    });
  });

  test.fixme("PG 전일 거래자료를 올리거나 PG에서 조회해 대사를 실행한다 (화면 없음: 대사 화면은 결과 조회와 해결 기록만 있고 업로드·조회 실행 동작이 없다)", async () => {});
});

// 개발플로우 4장 시나리오 10: 개인정보 권리 요청 접수 → 본인확인·책임 사무소·법정 기한 → 처리 이력 → 증빙과 함께 완료
test.describe("시나리오 10 개인정보 권리 요청", () => {
  test("사무소 이용자가 권리 요청을 접수한다", async ({ page }) => {
    await page.goto("/privacy-requests");
    await page.getByLabel("요청 유형").selectOption("ACCESS");
    await page.getByLabel("요청 내용").fill("저장된 내 개인정보 열람을 요청합니다.");
    await page.getByRole("button", { name: "요청 접수" }).click();
    await expect(page).toHaveURL(/\/privacy-requests\/\d+\?received=1/);
    await expect(page.getByText(/요청을 접수했습니다/)).toBeVisible();
  });

  test("운영자가 비회원 접수를 본인확인하고 법정 기한을 정해 권리 요청으로 전환한다", async ({
    page,
  }) => {
    await page.goto("/ops/guest-privacy-intakes/41");
    await page.getByRole("radio", { name: "본인 확인됨" }).check({ force: true });
    await page.getByRole("radio", { name: "권리 요청으로 전환" }).check({ force: true });
    await page.getByLabel("적용 법적 근거").fill("개인정보 보호법 제35조");
    await page.getByLabel("요청 범위").fill("방문 조건 열람");
    await page.getByLabel("법정 기한 날짜").fill("2026-12-20");
    await page.getByLabel("내부 기한 날짜").fill("2026-12-17");
    await page.getByRole("button", { name: "권리 요청으로 전환" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "전환", exact: true }).click();
    await expect(page.getByText("전환 완료").first()).toBeVisible();
  });

  test("운영자가 전달·보완·결정·실행 이력을 남기고 증빙과 함께 완료한다", async ({ page }) => {
    await page.goto("/ops/privacy-requests/502");
    const info = page.locator("dl").filter({ hasText: "법정 기한" }).first();
    await expect(info).toContainText(/본인확인\s*확인 완료/);
    await expect(info).toContainText(/책임 사무소\s*42/);
    await expect(info).toContainText(/법정 기한\s*2026-11-13/);

    const record = async (value: string) => {
      await page.getByLabel("처리 단계").selectOption(value);
      await page.getByRole("button", { name: "처리 기록" }).click();
      await expect(page.getByText(/기록했습니다/).last()).toBeVisible();
    };
    await test.step("책임 사무소 전달과 보완 요청, 협조 요청을 기록한다", async () => {
      await record("FORWARD");
      await record("REQUEST_SUPPLEMENT");
      await record("REQUEST_COOPERATION");
    });
    await test.step("승인 결정과 실행을 기록한다", async () => {
      await record("APPROVE");
      await record("EXECUTE");
    });
    await test.step("완료 증빙 위치를 넣고 완료하면 더 처리할 수 없다", async () => {
      await page.getByLabel("처리 단계").selectOption("COMPLETE");
      await page.getByLabel(/완료 증빙 위치/).fill("증빙 보관함 2026-11 / 502");
      await page.getByRole("button", { name: "처리 기록" }).click();
      await page
        .getByRole("dialog", { name: "완료 처리 확인" })
        .getByRole("button", { name: "기록", exact: true })
        .click();
      await expect(page.getByText("완료하거나 거절한 요청은 더 처리할 수 없습니다.")).toBeVisible();
    });
  });

  test.fixme("사무소가 접수한 요청과 전환된 비회원 요청이 운영 권리 요청 목록에 이어진다 (모의 API 공백: 사무소 접수·비회원 전환·운영 처리 모의 저장소가 서로 이어지지 않는다)", async () => {});
});

// 개발플로우 4장 시나리오 11: 정책 새 버전 검토·게시, 가격 인상 30일 사전 안내와 새 금액 동의, 회사 정보 게시와 문의 수신 시험
test.describe("시나리오 11 출시 활성화 전 준비", () => {
  test("정책 문서 새 버전을 검토 단계로 올리고 시행일에 맞춰 게시한다", async ({ page }) => {
    await page.goto("/ops/policy-documents");
    await page.getByRole("button", { name: "이용약관 1.1 검토 요청" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "검토 요청" }).click();
    await expect(page.getByText(/1\.1 문서를 검토 단계로 올렸습니다/)).toBeVisible();
    await page.getByRole("button", { name: "이용약관 1.1 게시" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "게시", exact: true }).click();
    await expect(page.getByText(/1\.1 문서를 시행일에 맞춰 예약했습니다/)).toBeVisible();
  });

  test("가격 인상 안내는 30일 전보다 늦으면 422로 막히고 30일 정각이면 만들어진다", async ({
    page,
  }) => {
    await page.goto("/ops/price-changes");
    const create = async (version: RegExp) => {
      await page
        .getByLabel("새 가격 버전")
        .selectOption({ label: await optionLabel(page, version) });
      await page.getByRole("button", { name: "안내 생성" }).click();
      await page
        .getByRole("dialog", { name: "가격 변경 안내 생성" })
        .getByRole("button", { name: "안내 생성" })
        .click();
    };
    await create(/^2027-02-STD/);
    await expect(page.getByText(/30일 뒤보다 앞서 안내를 만들 수 없습니다/)).toBeVisible();
    await page.keyboard.press("Escape");
    await create(/^2027-03-STD/);
    await expect(page.getByText(/안내 4건을 만들고 2곳을 건너뛰었습니다/)).toBeVisible();
    await expect(page.getByRole("list", { name: "건너뛴 사무소" })).toContainText(
      "시작 고객 가격 보장 기간 안",
    );
  });

  test("회사 정보를 새 버전으로 게시하고 실제 문의 수신 시험을 기록하면 출시 준비 완료가 된다", async ({
    page,
  }) => {
    await page.goto("/ops/company-info");
    await expect(page.getByText("출시 활성화 차단").first()).toBeVisible();
    const fields: Array<[string, string]> = [
      ["상호", "주식회사 사이로"],
      ["대표자", "김대표"],
      ["사업자등록번호", "123-45-67890"],
      ["주소", "서울특별시 성북구 시험로 1"],
      ["연락처(전화)", "02-000-0000"],
      ["지원 이메일", "support@example.com"],
      ["운영시간", "평일 10:00~18:00"],
      ["긴급 연락 경로", "지원 이메일"],
      ["개인정보 책임자", "김책임"],
      ["개인정보 담당 연락처", "privacy@example.com"],
      ["권리 요청 접수 경로", "설정 > 개인정보 권리 요청"],
      ["구독 해지 경로", "구독·결제 > 해지"],
    ];
    for (const [label, value] of fields) {
      await page.getByLabel(label, { exact: true }).fill(value);
    }
    await page.getByRole("button", { name: "새 버전으로 게시" }).click();
    await expect(page.getByText(/회사 정보 \d+판을 등록했습니다/)).toBeVisible();
    await page.getByRole("button", { name: "수신 시험 성공 기록" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "기록", exact: true }).click();
    await expect(page.getByText("실제 문의 수신 시험 성공을 기록했습니다.")).toBeVisible();
    await expect(page.getByText("출시 준비 완료").first()).toBeVisible();
  });

  test("사무소 이용자가 서비스 문의를 접수한다", async ({ page }) => {
    await page.goto("/support/new");
    await page.getByLabel("문의 유형").selectOption({ index: 1 });
    await page.getByLabel("문의 내용").fill("문의 수신 시험입니다.");
    await page.getByRole("button", { name: "문의 접수" }).click();
    await expect(page).toHaveURL(/\/support\/\d+\?received=1/);
  });

  test.fixme("사무소 대표가 가격 인상 안내에 새 금액으로 동의하고 운영 콘솔의 결정별 건수에 반영된다 (모의 API 공백: 사무소 가격 변경 안내 목록이 운영 안내와 이어지지 않고 동의 결정 처리기가 없다)", async () => {});

  test.fixme("모든 준비를 마친 뒤에만 운영 출시를 활성화한다 (화면 없음: 출시 활성화 전환 화면이 없다)", async () => {});
});

// 개발플로우 4장 시나리오 12: 파기 대상·제외분 미리보기 → 저장소별 실행 → 다른 운영자 검증 → 완료
test.describe("시나리오 12 파기 실행과 검증", () => {
  test("파기 대상과 제외분을 미리 보고 보존 예외를 등록한 뒤 재인증을 거쳐 파기를 실행한다", async ({
    page,
  }) => {
    await page.goto("/ops/deletion-queue/701");
    await page.getByRole("button", { name: "미리보기 조회" }).click();
    for (const text of [
      "파기 대상 건수",
      "보존 제외 건수",
      "검색 색인 대상",
      "파일 대상",
      "임시 내보내기 대상",
    ]) {
      await expect(page.getByText(text).first()).toBeVisible();
    }
    await page.getByRole("button", { name: "파기 실행" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "실행", exact: true }).click();
    await passStepUp(page);
    await expect(page.getByText(/파기를 실행했습니다/)).toBeVisible();
    await expect(page.getByText("검증 대기").first()).toBeVisible();
  });

  test("다른 운영자가 실행한 파기를 저장소별 결과로 검증하면 완료된다", async ({ page }) => {
    await page.goto("/ops/deletion-queue/704");
    for (const label of ["운영 저장소 결과", "검색 색인 결과", "파일 결과", "임시 내보내기 결과"]) {
      await page.getByLabel(label).selectOption("SUCCESS");
    }
    await page.getByLabel("검증 증빙").fill("저장소별 삭제 로그 확인");
    await page.getByRole("button", { name: "검증 기록" }).click();
    await expect(page.getByText(/검증을 마쳤습니다/)).toBeVisible();
  });

  test.fixme("운영 저장소·검색 색인·파일·임시 내보내기를 저장소별로 실행한다 (모의 API 공백: 실행 한 번에 네 저장소가 모두 성공으로 바뀐다)", async () => {});
});

async function optionLabel(page: Page, pattern: RegExp): Promise<string> {
  await expect(page.getByLabel("새 가격 버전").locator("option", { hasText: pattern })).toHaveCount(
    1,
  );
  const labels = await page.getByLabel("새 가격 버전").locator("option").allTextContents();
  const found = labels.find((label) => pattern.test(label.trim()));
  if (!found) throw new Error(`가격 버전 ${pattern} 을 찾을 수 없습니다.`);
  return found.trim();
}
