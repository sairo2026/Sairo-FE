import { expect, test } from "@playwright/test";

test("로그인은 목적·이메일 경로·비밀번호 보기를 명확히 보여준다", async ({ page }, testInfo) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { level: 1, name: "로그인" })).toBeVisible();
  await expect(page.getByText("사이로 계정으로 로그인해 업무를 이어갈 수 있습니다.")).toBeVisible();
  await expect(
    page.getByText("처음 이용하는 카카오 계정은 회원가입으로 안내합니다."),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "카카오로 시작하기" })).toHaveAttribute(
    "href",
    "/api/auth/kakao/start",
  );
  const email = page.getByRole("link", { name: "이메일로 로그인하기" });
  await expect(email).toHaveAttribute("href", "/login/email");
  await expect(page.getByRole("link", { name: "회원가입" })).toHaveAttribute("href", "/signup");
  await page.screenshot({ path: testInfo.outputPath("login-entry.png"), fullPage: true });

  await email.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/login\/email$/);
  await expect(page.getByRole("heading", { level: 1, name: "로그인" })).toBeVisible();
  const password = page.getByLabel("비밀번호", { exact: true });
  await password.fill("example-password");
  await expect(password).toHaveAttribute("type", "password");
  await page.getByRole("button", { name: "입력값 보기: 비밀번호" }).click();
  await expect(password).toHaveAttribute("type", "text");
  await expect(password).toHaveValue("example-password");
  await expect(page.getByRole("button", { name: "로그인하기" })).toBeVisible();
});

test("회원가입은 로그인과 다른 안내·이메일 경로·필수 약관을 보여준다", async ({
  page,
}, testInfo) => {
  await page.route("**/api/terms?context=SIGNUP", (route) =>
    route.fulfill({
      json: {
        items: [
          {
            termsCode: "TOS",
            version: "1.0",
            required: true,
            title: "이용약관",
            documentUrl: "/legal/terms",
            category: "TERMS",
            reconsentRequired: false,
            changeSummary: null,
          },
          {
            termsCode: "PRIVACY",
            version: "1.0",
            required: false,
            title: "개인정보처리방침",
            documentUrl: "/legal/privacy",
            category: "NOTICE",
            reconsentRequired: false,
            changeSummary: null,
          },
        ],
        phoneVerificationRequired: false,
      },
    }),
  );
  await page.goto("/signup");
  await expect(page.getByRole("heading", { level: 1, name: "회원가입" })).toBeVisible();
  await expect(
    page.getByText("계정을 만들고 부동산 업무 관리를 시작할 수 있습니다."),
  ).toBeVisible();
  await expect(page.getByText("이미 가입한 카카오 계정은 로그인됩니다.")).toBeVisible();
  await expect(page.getByRole("link", { name: "로그인" })).toHaveAttribute("href", "/login");
  const email = page.getByRole("link", { name: "이메일로 회원가입하기" });
  await expect(email).toHaveAttribute("href", "/signup/email");
  await page.screenshot({ path: testInfo.outputPath("signup-entry.png"), fullPage: true });

  const kakaoDetails = page.locator("details").filter({
    has: page.getByText("카카오 계정 연결·해제 안내 자세히 보기"),
  });
  await expect(kakaoDetails).toHaveJSProperty("open", false);
  await kakaoDetails.locator("summary").focus();
  await page.keyboard.press("Enter");
  await expect(kakaoDetails).toHaveJSProperty("open", true);
  await expect(
    page.getByText(/카카오 계정으로 가입하면 카카오가 제공하는 회원번호가/),
  ).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("signup-kakao-details.png"), fullPage: true });
  await page.keyboard.press("Enter");
  await expect(kakaoDetails).toHaveJSProperty("open", false);

  await email.click();
  await expect(page).toHaveURL(/\/signup\/email$/);
  await expect(page.getByRole("heading", { level: 1, name: "기본 가입 정보 입력" })).toBeVisible();
  await expect(page.getByText("약관 동의", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "다음" })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("signup-email.png"), fullPage: true });
});
