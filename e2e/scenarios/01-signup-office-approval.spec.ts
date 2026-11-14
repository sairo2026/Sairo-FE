import { expect, test } from "@playwright/test";
import { settle, useMockOfficeRole } from "../support/app";

// 개발플로우 4장 시나리오 1: 이메일 회원가입 → 사무소 등록 신청 → 운영자 승인 → 로그인
test.describe("시나리오 1 이메일 가입부터 사무소 승인 뒤 로그인까지", () => {
  test("가입하고 사무소 등록 신청과 증빙을 내면 심사 중 화면에 머문다", async ({ page }) => {
    await useMockOfficeRole(page, "OWNER");
    await test.step("/signup/email에서 이름과 이메일을 넣고 인증 링크를 받는다", async () => {
      await page.goto("/signup");
      await page.getByRole("link", { name: "이메일로 계속하기" }).click();
      await expect(page.getByText("기본 가입 정보 입력")).toBeVisible();
      await page.getByLabel(/^이름/).fill("김중개");
      await page.getByLabel(/^이메일 인증/).fill("new@example.com");
      await page.getByRole("button", { name: "인증 링크 받기" }).click();
      await expect(page.getByText(/인증 링크를 보냈습니다/)).toBeVisible();
    });

    await test.step("메일의 인증 링크로 돌아오면 이메일 인증이 완료된다", async () => {
      await page.goto("/signup/verify-email?token=valid-token-0000000000");
      await expect(page.getByText("기본 가입 정보 입력")).toBeVisible();
      await expect(page.getByText("인증이 완료되었습니다.")).toBeVisible();
      await expect(page.getByLabel(/^이름/)).toHaveValue("김중개");
    });

    await test.step("휴대폰 인증과 필수 약관 동의 뒤 비밀번호를 정해 가입한다", async () => {
      await page.getByLabel(/^휴대폰 번호/).fill("01012345678");
      await page.getByRole("button", { name: "인증번호 받기" }).click();
      await page.getByLabel(/^인증번호/).fill("123456");
      await page.getByRole("button", { name: "확인", exact: true }).click();
      await expect(page.getByText("인증이 완료되었습니다.")).toHaveCount(2);
      await page.getByLabel(/이용약관에 동의합니다/).check({ force: true });
      await page.getByRole("button", { name: "다음" }).click();
      await expect(page.getByText("비밀번호 설정").first()).toBeVisible();
      await page.getByLabel(/^비밀번호\*?$/).fill("abcd1234!");
      await page.getByLabel(/^비밀번호 확인/).fill("abcd1234!");
      await page.getByRole("button", { name: "가입하기" }).click();
      await expect(page).toHaveURL(/\/office\/start$/);
    });

    await test.step("/office/start에서 새 사무소 생성을 고르고 등록번호와 기본 정보를 낸다", async () => {
      await page.getByRole("radio", { name: /새 사무소 생성/ }).click();
      await page.getByRole("button", { name: "다음" }).click();
      await expect(page).toHaveURL(/\/office\/register/);
      await page.getByLabel("등록관청").fill("서울특별시 종로구");
      await page.getByLabel("개설등록번호").fill("11110-2026-00099");
      await page.getByRole("button", { name: "다음" }).click();
      await page.getByLabel("사무소명").fill("새사무소");
      await page.getByLabel("사무소 대표자명").fill("김대표");
      await page.getByLabel("사무소 대표 연락처").fill("01011112222");
      await page.getByLabel("중개사무소 주소").fill("서울시 종로구 1");
      await page.getByLabel("사업자등록번호").fill("1234567890");
      await page.getByLabel("신청자의 등록관계").selectOption({ label: "대표 본인" });
      await page.getByRole("button", { name: "다음" }).click();
      await expect(page).toHaveURL(/\/office\/register\/evidence\?registrationId=31/);
    });

    await test.step("증빙 세 가지를 올려 등록하면 심사 중 상태가 된다", async () => {
      for (const type of [
        "BROKERAGE_LICENSE",
        "BUSINESS_CERTIFICATE",
        "REPRESENTATIVE_QUALIFICATION",
      ]) {
        await page.locator(`input[data-evidence-type="${type}"]`).setInputFiles({
          name: `${type.toLowerCase()}.png`,
          mimeType: "image/png",
          buffer: Buffer.from("e2e"),
        });
      }
      await page.getByRole("button", { name: "등록", exact: true }).click();
      await expect(page).toHaveURL(/\/office\/review/);
      await expect(page.getByText("심사 중").first()).toBeVisible();
      await expect(page.getByText("서류를 확인하고 있습니다.", { exact: true })).toBeVisible();
    });
  });

  test("운영자가 심사 항목을 모두 확인하고 사무소 인증을 승인한다", async ({ page }) => {
    await page.goto("/ops/mfa");
    await page.getByLabel(/^확인 코드/).fill("123456");
    await page.getByRole("button", { name: "확인", exact: true }).click();
    await expect(page).toHaveURL(/\/ops$/);
    await page.goto("/ops/registrations");
    await settle(page);
    await page.getByRole("link", { name: "101", exact: true }).click();
    await expect(page.getByRole("heading", { name: "인증 신청 101" })).toBeVisible();
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
    await expect(page.getByRole("button", { name: "사무소 인증 회수" })).toBeVisible();
  });

  test.fixme("운영자 승인이 가입자의 신청 31번과 접근 상태에 반영된다 (모의 API 공백: 사무소 신청과 운영 심사 목록이 서로 다른 모의 저장소)", async () => {});

  test("승인 뒤 이메일로 로그인하면 업무 홈으로 들어간다", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("link", { name: "이메일로 계속하기" }).click();
    await expect(page.getByRole("heading", { name: "이메일로 로그인" })).toBeVisible();
    await page.getByLabel(/^이메일/).fill("agent@example.com");
    await page.getByLabel(/^비밀번호/).fill("mock-password-1");
    await page.getByRole("button", { name: "로그인", exact: true }).click();
    await expect(page).toHaveURL((url) => url.pathname === "/home");
  });
});
