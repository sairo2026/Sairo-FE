import { test } from "@playwright/test";
import { settle, useMockOfficeRole, type MockOfficeRole } from "../support/app";
import { fixMockClock } from "../support/scenario";

const CAPTURE = Boolean(process.env.VISUAL_CAPTURE);

type Shot = { name: string; path: string; role: MockOfficeRole | null };

const SHOTS: readonly Shot[] = [
  { name: "01-시작-로그인", path: "/login", role: null },
  { name: "02-이메일-로그인", path: "/login/email", role: null },
  { name: "03-비밀번호-찾기", path: "/password/forgot", role: null },
  { name: "04-가입", path: "/signup", role: null },
  { name: "05-이메일-가입", path: "/signup/email", role: null },
  { name: "06-사무소-시작", path: "/office/start", role: "OWNER" },
  { name: "07-사무소-참여-검색", path: "/office/join", role: "OWNER" },
  { name: "08-사무소-등록", path: "/office/register", role: "OWNER" },
  { name: "09-사무소-증빙", path: "/office/register/evidence?registrationId=31", role: "OWNER" },
  { name: "10-사무소-심사", path: "/office/review", role: "OWNER" },
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
      await page.screenshot({ path: `visual-captures/${shot.name}.png`, fullPage: false });
    });
  }
});
