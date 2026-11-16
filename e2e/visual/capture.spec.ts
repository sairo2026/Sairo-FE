import { test, type Page } from "@playwright/test";
import { settle, useMockOfficeRole, type MockOfficeRole } from "../support/app";
import { fixMockClock } from "../support/scenario";
import * as step from "./capture-steps";

const CAPTURE = Boolean(process.env.VISUAL_CAPTURE);

type Shot = {
  name: string;
  path: string;
  role: MockOfficeRole | null;
  /** 화면 전체 길이를 찍는다(긴 입력 화면). */
  full?: boolean;
  /** 화면이 열린 뒤 모달이나 패널을 여는 동작. */
  act?: (page: Page) => Promise<void>;
  /** 휴대폰 인증을 요구하는 모의 설정으로 연다. */
  phoneRequired?: boolean;
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
  { name: "34-매물-상세", path: "/properties/501", role: "OWNER" },
  { name: "35-고객-상세", path: "/customers/301", role: "OWNER" },
  { name: "36-매물-등록-전체", path: "/properties/new", role: "OWNER", full: true },
  { name: "37-고객-등록-전체", path: "/customers/new", role: "OWNER", full: true },
  { name: "38-사무소-등록-전체", path: "/office/register", role: "NEW", full: true },
  {
    name: "39-사무소-증빙-전체",
    path: "/office/register/evidence?registrationId=31",
    role: "NEW",
    full: true,
  },
  {
    name: "40-가입-이메일-발송후",
    path: "/signup/email",
    role: null,
    phoneRequired: true,
    act: step.sendEmailLink,
  },
  {
    name: "41-가입-휴대폰-코드발송후",
    path: "/signup/email",
    role: null,
    phoneRequired: true,
    act: step.phoneCodeSent,
  },
  {
    name: "42-가입-휴대폰-코드입력중",
    path: "/signup/email",
    role: null,
    phoneRequired: true,
    act: step.phoneCodeTyping,
  },
  {
    name: "43-가입-이메일-휴대폰-인증완료",
    path: "/signup/email",
    role: null,
    phoneRequired: true,
    act: step.emailAndPhoneVerified,
  },
  {
    name: "44-가입-약관-보기-팝업",
    path: "/signup/email",
    role: null,
    phoneRequired: true,
    act: step.openTermsPopup,
  },
  {
    name: "45-가입-비밀번호-설정",
    path: "/signup/email",
    role: null,
    phoneRequired: true,
    act: step.toPasswordStep,
  },
  {
    name: "46-가입-비밀번호-확인-불일치",
    path: "/signup/email",
    role: null,
    phoneRequired: true,
    act: step.passwordMismatch,
  },
  {
    name: "47-가입-비밀번호-길이-오류",
    path: "/signup/email",
    role: null,
    phoneRequired: true,
    act: step.passwordTooShort,
  },
  { name: "48-가입-카카오-정보입력", path: "/signup/kakao", role: null, phoneRequired: true },
  {
    name: "49-가입-이미-가입된-계정",
    path: "/signup/kakao",
    role: null,
    phoneRequired: true,
    act: step.kakaoDuplicate,
  },
  {
    name: "50-로그인-비밀번호-불일치",
    path: "/login/email",
    role: null,
    act: step.wrongPasswordLogin,
  },
  {
    name: "50-1-로그인-잠금",
    path: "/login/email",
    role: null,
    act: step.lockedLogin,
  },
  {
    name: "51-비밀번호-찾기-메일발송후",
    path: "/password/forgot",
    role: null,
    act: step.forgotPasswordSent,
  },
  {
    name: "52-사무소-참여-검색결과",
    path: "/office/join",
    role: "NEW",
    act: step.searchJoinOffice,
  },
  { name: "53-사무소-참여-정보확인", path: "/office/join", role: "NEW", act: step.openJoinForm },
  {
    name: "54-사무소-참여-요청완료-팝업",
    path: "/office/join",
    role: "NEW",
    act: step.joinRequested,
  },
  {
    name: "55-사무소-등록번호-입력",
    path: "/office/register",
    role: "NEW",
    act: step.fillRegisterLookup,
  },
  {
    name: "56-사무소-기본정보-입력전",
    path: "/office/register",
    role: "NEW",
    act: step.toRegisterDetails,
  },
  {
    name: "57-사무소-기본정보-입력후",
    path: "/office/register",
    role: "NEW",
    act: step.fillRegisterDetails,
  },
  {
    name: "58-사무소-증빙-업로드완료",
    path: "/office/register/evidence?registrationId=31",
    role: "NEW",
    act: step.attachEvidence,
  },
  {
    name: "59-사무소-심사-진행중",
    path: "/office/register/evidence?registrationId=31",
    role: "NEW",
    act: step.submitEvidence,
  },
  {
    name: "60-매물-등록-중복-알림",
    path: "/properties/new",
    role: "OWNER",
    act: step.duplicatePropertyDialog,
  },
  {
    name: "61-매물-삭제불가-방문조율",
    path: "/properties/9001",
    role: "OWNER",
    act: step.openArchiveDialog,
  },
  {
    name: "62-매물-삭제불가-계약",
    path: "/properties/9002",
    role: "OWNER",
    act: step.openArchiveDialog,
  },
  {
    name: "63-매물-삭제-완료",
    path: "/properties/501",
    role: "OWNER",
    act: step.archiveCompleted,
  },
  {
    name: "64-매물-목록-선택",
    path: "/properties",
    role: "OWNER",
    act: step.selectAllProperties,
  },
];

test.describe("화면 캡처(디자인 비교용)", () => {
  test.skip(!CAPTURE, "VISUAL_CAPTURE가 켜진 수동 실행에서만 돈다.");
  test.use({ viewport: { width: 1440, height: 1024 } });

  for (const shot of SHOTS) {
    test(shot.name, async ({ page }) => {
      await fixMockClock(page);
      await useMockOfficeRole(page, shot.role);
      if (shot.phoneRequired) {
        await page.addInitScript(() =>
          window.localStorage.setItem("sairo-mock-phone-verification", "required"),
        );
      }
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
