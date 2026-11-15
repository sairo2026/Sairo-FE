import { test, type Page } from "@playwright/test";
import { settle, useMockOfficeRole, type MockOfficeRole } from "../support/app";
import { fixMockClock } from "../support/scenario";

const CAPTURE = Boolean(process.env.VISUAL_CAPTURE);

type Shot = {
  name: string;
  path: string;
  role: MockOfficeRole | null;
  /** 화면 전체 길이를 찍는다(긴 입력 화면). */
  full?: boolean;
  /** 화면이 열린 뒤 모달이나 패널을 여는 동작. */
  act?: (page: Page) => Promise<void>;
};

const SHOTS: readonly Shot[] = [
  { name: "01-시작-로그인", path: "/login", role: null },
  { name: "02-이메일-로그인", path: "/login/email", role: null },
  { name: "03-비밀번호-찾기", path: "/password/forgot", role: null },
  { name: "04-가입", path: "/signup", role: null },
  { name: "05-이메일-가입", path: "/signup/email", role: null },
  { name: "06-사무소-시작", path: "/office/start", role: "NEW" },
  { name: "07-사무소-참여-검색", path: "/office/join", role: "NEW" },
  { name: "08-사무소-등록", path: "/office/register", role: "NEW" },
  { name: "09-사무소-증빙", path: "/office/register/evidence?registrationId=31", role: "NEW" },
  { name: "10-사무소-심사", path: "/office/review", role: "NEW" },
  { name: "11-홈", path: "/home", role: "OWNER" },
  { name: "12-알림함", path: "/notifications", role: "OWNER" },
  { name: "13-알림함-방문신청", path: "/notifications?tab=visit-request", role: "OWNER" },
  { name: "14-매물-목록", path: "/properties", role: "OWNER" },
  { name: "15-매물-등록", path: "/properties/new", role: "OWNER" },
  { name: "16-고객-목록", path: "/customers", role: "OWNER" },
  { name: "17-고객-등록", path: "/customers/new", role: "OWNER" },
  { name: "18-방문-조율", path: "/coordinations", role: "OWNER" },
  { name: "19-방문-조율-만들기", path: "/coordinations/new", role: "OWNER" },
  { name: "20-계약-목록", path: "/contracts", role: "OWNER" },
  { name: "21-계약-등록", path: "/contracts/new", role: "OWNER" },
  { name: "22-데이터-이전", path: "/import", role: "OWNER" },
  { name: "23-데이터-내보내기", path: "/exports", role: "OWNER" },
  { name: "24-월말결산", path: "/settlements", role: "OWNER" },
  { name: "25-구성원", path: "/members", role: "OWNER" },
  { name: "26-구독-결제", path: "/billing", role: "OWNER" },
  { name: "27-요금", path: "/pricing", role: null },
  { name: "28-이용약관", path: "/legal/terms", role: null },
  { name: "29-비밀번호-재설정", path: "/password/reset?token=valid-token-0000000000", role: null },
  {
    name: "30-이메일-인증-완료",
    path: "/signup/verify-email?token=valid-token-0000000000",
    role: null,
  },
  { name: "31-이메일-가입-전체", path: "/signup/email", role: null, full: true },
  {
    name: "32-홈-알림-패널",
    path: "/home",
    role: "OWNER",
    act: async (page) => {
      await page.getByRole("button", { name: /알림 열기/ }).click();
    },
  },
  {
    name: "33-홈-업무-만들기",
    path: "/home",
    role: "OWNER",
    act: async (page) => {
      await page
        .getByRole("button", { name: /업무 만들기/ })
        .first()
        .click();
    },
  },
  { name: "34-매물-상세", path: "/properties/1", role: "OWNER" },
  { name: "35-고객-상세", path: "/customers/1", role: "OWNER" },
  { name: "36-매물-등록-전체", path: "/properties/new", role: "OWNER", full: true },
  { name: "37-고객-등록-전체", path: "/customers/new", role: "OWNER", full: true },
  { name: "38-사무소-등록-전체", path: "/office/register", role: "NEW", full: true },
  {
    name: "39-사무소-증빙-전체",
    path: "/office/register/evidence?registrationId=31",
    role: "NEW",
    full: true,
  },
];

test.describe("화면 캡처(디자인 비교용)", () => {
  test.skip(!CAPTURE, "VISUAL_CAPTURE가 켜진 수동 실행에서만 돈다.");
  test.use({ viewport: { width: 1440, height: 1024 } });

  for (const shot of SHOTS) {
    test(shot.name, async ({ page }) => {
      await fixMockClock(page);
      await useMockOfficeRole(page, shot.role);
      await page.goto(shot.path);
      await settle(page);
      if (shot.act) {
        await shot.act(page).catch(() => undefined);
        await page.waitForTimeout(400);
      }
      await page.screenshot({
        path: `visual-captures/${shot.name}.png`,
        fullPage: shot.full === true,
      });
    });
  }
});
