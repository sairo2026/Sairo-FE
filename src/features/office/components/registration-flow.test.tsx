// @vitest-environment jsdom
import { cleanup, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http } from "msw";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { mockErrors } from "@/mocks/error-responses";
import { resetMockOfficeState, setMockOfficeState } from "@/mocks/handlers/office";
import { server, startMockServer } from "@/mocks/server";
import { OfficeEvidenceScreen } from "./office-evidence-screen";
import { OfficeRegistrationForm } from "./office-registration-form";
import { OfficeReviewScreen } from "./office-review-screen";
import { OfficeStartScreen } from "./office-start-screen";
import { renderOffice } from "@/shared/testing/office-render";

const navigation = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: navigation.push, replace: navigation.replace }),
  usePathname: () => "/office/start",
}));

let stopServer: () => void;

beforeAll(() => {
  stopServer = startMockServer();
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
  resetMockOfficeState();
  navigation.push.mockClear();
  navigation.replace.mockClear();
  vi.unstubAllGlobals();
});

afterAll(() => stopServer());

function isDisabled(element: HTMLElement) {
  return element.hasAttribute("disabled");
}

describe("사무소 생성/참여 선택", () => {
  it("두 경로를 카드로 보여주고 선택하기 전에는 다음을 막는다", async () => {
    renderOffice(<OfficeStartScreen />);
    expect(screen.getByRole("radio", { name: /새 사무소 생성/ })).not.toBeNull();
    expect(screen.getByRole("radio", { name: /기존 사무소 참여/ })).not.toBeNull();
    expect(isDisabled(screen.getByRole("button", { name: "다음" }))).toBe(true);
  });

  it("새 사무소 생성을 고르면 등록 화면으로 이동한다", async () => {
    const user = userEvent.setup();
    renderOffice(<OfficeStartScreen />);
    await user.click(screen.getByRole("radio", { name: /새 사무소 생성/ }));
    await user.click(screen.getByRole("button", { name: "다음" }));
    expect(navigation.push).toHaveBeenCalledWith("/office/register");
  });

  it("기존 사무소 참여를 고르면 검색 화면으로 이동한다", async () => {
    const user = userEvent.setup();
    renderOffice(<OfficeStartScreen />);
    await user.click(screen.getByRole("radio", { name: /기존 사무소 참여/ }));
    await user.click(screen.getByRole("button", { name: "다음" }));
    expect(navigation.push).toHaveBeenCalledWith("/office/join");
  });

  it("취소하면 접근 안내로 돌아간다", async () => {
    const user = userEvent.setup();
    renderOffice(<OfficeStartScreen />);
    await user.click(screen.getByRole("button", { name: "취소" }));
    expect(navigation.push).toHaveBeenCalledWith("/access");
  });

  it("진행 중인 등록 신청이 있으면 두 카드를 막고 심사 상태로 안내한다", () => {
    renderOffice(<OfficeStartScreen />, { context: { pendingRegistrationId: 9 } });
    expect(isDisabled(screen.getByRole("radio", { name: /새 사무소 생성/ }))).toBe(true);
    expect(isDisabled(screen.getByRole("radio", { name: /기존 사무소 참여/ }))).toBe(true);
    expect(screen.getByRole("link", { name: "심사 상태 확인하기" }).getAttribute("href")).toBe(
      "/office/review",
    );
  });

  it("진행 중인 참여 요청이 있으면 승인 대기 화면으로 안내한다", () => {
    renderOffice(<OfficeStartScreen />, { context: { pendingMembershipId: 4 } });
    expect(isDisabled(screen.getByRole("radio", { name: /새 사무소 생성/ }))).toBe(true);
    expect(screen.getByRole("link", { name: "참여 요청 상태 확인하기" }).getAttribute("href")).toBe(
      "/office/membership",
    );
  });
});

async function fillLookup(user: ReturnType<typeof userEvent.setup>, license = "11110-2026-00002") {
  await user.type(screen.getByLabelText("등록관청"), "서울특별시 종로구");
  await user.type(screen.getByLabelText("개설등록번호"), license);
  await user.click(screen.getByRole("button", { name: "다음" }));
}

async function fillDetails(
  user: ReturnType<typeof userEvent.setup>,
  overrides: { officeName?: string; businessNumber?: string; address?: string } = {},
) {
  await user.type(screen.getByLabelText("사무소명"), overrides.officeName ?? "새사무소");
  await user.type(screen.getByLabelText("사무소 대표자명"), "김대표");
  await user.type(screen.getByLabelText("사무소 대표 연락처"), "01011112222");
  await user.type(screen.getByLabelText("중개사무소 주소"), overrides.address ?? "서울시 종로구 1");
  await user.type(
    screen.getByLabelText("사업자등록번호"),
    overrides.businessNumber ?? "1234567890",
  );
  await user.selectOptions(screen.getByLabelText("신청자의 등록관계"), "대표 본인");
}

describe("사무소 등록 신청", () => {
  it("등록번호를 비우면 검증 오류를 보여주고 조회하지 않는다", async () => {
    const user = userEvent.setup();
    renderOffice(<OfficeRegistrationForm />);
    await user.click(screen.getByRole("button", { name: "다음" }));
    expect(screen.getByText("등록관청을 입력해 주세요.")).not.toBeNull();
    expect(screen.getByText("개설등록번호를 입력해 주세요.")).not.toBeNull();
  });

  it("이미 등록된 사무소면 신규 등록을 막고 참여 화면으로 안내한다", async () => {
    const user = userEvent.setup();
    renderOffice(<OfficeRegistrationForm />);
    await fillLookup(user, "11110-2026-00001");
    expect(await screen.findByText(/이미 등록된 사무소입니다/)).not.toBeNull();
    expect(screen.getByRole("link", { name: "기존 사무소 참여하기" }).getAttribute("href")).toBe(
      "/office/join",
    );
    expect(screen.queryByLabelText("사무소명")).toBeNull();
  });

  it("새 조합이면 기본 정보 입력으로 넘어간다", async () => {
    const user = userEvent.setup();
    renderOffice(<OfficeRegistrationForm />);
    await fillLookup(user);
    expect(await screen.findByLabelText("사무소명")).not.toBeNull();
    expect(screen.getByText(/자격증 사본으로 확인/)).not.toBeNull();
    expect(screen.getByText(/관할 등록관청의 기록과 일치함을 보증하지 않습니다/)).not.toBeNull();
    expect(
      screen.getByText(/제출한 서류는 사이로가 사무소를 확인하는 데만 사용합니다/),
    ).not.toBeNull();
  });

  it("조회가 실패하면 오류를 안내한다", async () => {
    server.use(http.get("/api/offices/lookup", () => mockErrors.server()));
    const user = userEvent.setup();
    renderOffice(<OfficeRegistrationForm />);
    await fillLookup(user);
    expect((await screen.findByRole("alert")).textContent).toContain("일시적인 오류");
  });

  it("기본 정보가 비어 있으면 필드별 오류를 보여준다", async () => {
    const user = userEvent.setup();
    renderOffice(<OfficeRegistrationForm />);
    await fillLookup(user);
    await screen.findByLabelText("사무소명");
    await user.click(screen.getByRole("button", { name: "다음" }));
    expect(screen.getByText("사무소명을 입력해 주세요.")).not.toBeNull();
    expect(screen.getByText("사업자등록번호 10자리를 입력해 주세요.")).not.toBeNull();
    expect(screen.getByText("연락처를 010-0000-0000 형식으로 입력해 주세요.")).not.toBeNull();
    expect(screen.getByText("신청자의 등록관계를 선택해 주세요.")).not.toBeNull();
  });

  it("제출하면 작성 중 신청을 만들고 증빙 업로드로 이동한다", async () => {
    const user = userEvent.setup();
    renderOffice(<OfficeRegistrationForm />);
    await fillLookup(user);
    await screen.findByLabelText("사무소명");
    await fillDetails(user);
    expect((screen.getByLabelText("사업자등록번호") as HTMLInputElement).value).toBe(
      "123-45-67890",
    );
    expect((screen.getByLabelText("사무소 대표 연락처") as HTMLInputElement).value).toBe(
      "010-1111-2222",
    );
    await user.click(screen.getByRole("button", { name: "다음" }));
    await waitFor(() =>
      expect(navigation.push).toHaveBeenCalledWith(
        "/office/register/evidence?registrationId=31&entity=INDIVIDUAL",
      ),
    );
  });

  it("사업자번호가 겹치면 경고 값을 증빙 화면에 넘긴다", async () => {
    const user = userEvent.setup();
    renderOffice(<OfficeRegistrationForm />);
    await fillLookup(user);
    await screen.findByLabelText("사무소명");
    await fillDetails(user, { businessNumber: "1111111111" });
    await user.click(screen.getByRole("button", { name: "다음" }));
    await waitFor(() =>
      expect(navigation.push.mock.calls[0]?.[0]).toContain("warning=DUPLICATE_BUSINESS_NUMBER"),
    );
  });

  it("진행 중인 신청이 있으면 심사 상태 링크와 함께 안내한다", async () => {
    const user = userEvent.setup();
    renderOffice(<OfficeRegistrationForm />);
    await fillLookup(user);
    await screen.findByLabelText("사무소명");
    await fillDetails(user, { officeName: "진행중사무소" });
    await user.click(screen.getByRole("button", { name: "다음" }));
    expect((await screen.findByRole("alert")).textContent).toContain("이미 진행 중인 사무소 신청");
    expect(screen.getByRole("link", { name: "심사 상태 확인하기" })).not.toBeNull();
    expect(navigation.push).not.toHaveBeenCalled();
  });

  it("서버가 필드 오류를 돌려주면 해당 입력 아래에 보여준다", async () => {
    const user = userEvent.setup();
    renderOffice(<OfficeRegistrationForm />);
    await fillLookup(user);
    await screen.findByLabelText("사무소명");
    await fillDetails(user, { officeName: "형식오류사무소" });
    await user.click(screen.getByRole("button", { name: "다음" }));
    expect(await screen.findByText("주소 형식이 올바르지 않습니다.")).not.toBeNull();
  });

  it("요청이 너무 많으면 대기 안내를 보여준다", async () => {
    server.use(http.post("/api/office-registrations", () => mockErrors.rateLimited(90)));
    const user = userEvent.setup();
    renderOffice(<OfficeRegistrationForm />);
    await fillLookup(user);
    await screen.findByLabelText("사무소명");
    await fillDetails(user);
    await user.click(screen.getByRole("button", { name: "다음" }));
    expect((await screen.findByRole("alert")).textContent).toContain("1분 30초 뒤에 다시 시도");
  });

  it("이전을 누르면 등록번호 단계로 돌아간다", async () => {
    const user = userEvent.setup();
    renderOffice(<OfficeRegistrationForm />);
    await fillLookup(user);
    await screen.findByLabelText("사무소명");
    await user.click(screen.getByRole("button", { name: "이전" }));
    expect(screen.getByLabelText("등록관청")).not.toBeNull();
  });
});

function pngFile(name = "file.png", size = 10) {
  return new File([new Uint8Array(size)], name, { type: "image/png" });
}

async function selectAllIndividual(user: ReturnType<typeof userEvent.setup>) {
  await user.upload(screen.getByLabelText("중개사무소 개설등록증"), pngFile("a.png"));
  await user.upload(screen.getByLabelText("중개사무소 사업자등록증"), pngFile("b.png"));
  await user.upload(screen.getByLabelText("공인중개사 자격증"), pngFile("c.png"));
}

describe("증빙 업로드", () => {
  it("신청 번호가 없으면 안내만 보여준다", () => {
    renderOffice(<OfficeEvidenceScreen registrationId={null} entity="INDIVIDUAL" />);
    expect(screen.getByText("신청 정보를 찾을 수 없습니다")).not.toBeNull();
  });

  it("가림 안내와 보관 안내를 문서 문구대로 보여준다", () => {
    renderOffice(<OfficeEvidenceScreen registrationId={31} entity="INDIVIDUAL" />);
    expect(
      screen.getByText(/가리지 않은 파일은 자동으로 가려지거나 거절될 수 있습니다/),
    ).not.toBeNull();
    expect(
      screen.getByText(/확인 결과가 나온 뒤 최대 30일 동안 보관하고 삭제합니다/),
    ).not.toBeNull();
  });

  it("개인 신청은 세 종류를 받고 선택하지 않으면 칸마다 사유를 보여준다", async () => {
    const user = userEvent.setup();
    renderOffice(<OfficeEvidenceScreen registrationId={31} entity="INDIVIDUAL" />);
    expect(screen.queryByLabelText("법인 대표권한 확인자료")).toBeNull();
    await user.click(screen.getByRole("button", { name: "등록" }));
    expect(screen.getAllByText("파일을 선택해 주세요.")).toHaveLength(3);
  });

  it("법인 신청이면 두 종류를 더 받는다", async () => {
    renderOffice(<OfficeEvidenceScreen registrationId={31} entity="CORPORATION" />);
    expect(screen.getByLabelText("법인 대표권한 확인자료")).not.toBeNull();
    expect(screen.getByLabelText("신청자 등록관계 확인자료")).not.toBeNull();
  });

  it("형식이 맞지 않는 파일은 해당 칸에 사유를 표시한다", async () => {
    const user = userEvent.setup({ applyAccept: false });
    renderOffice(<OfficeEvidenceScreen registrationId={31} entity="INDIVIDUAL" />);
    await user.upload(
      screen.getByLabelText("중개사무소 개설등록증"),
      new File(["x"], "a.exe", { type: "application/x-msdownload" }),
    );
    expect(screen.getByText("파일 형식은 PDF, JPG, PNG만 올릴 수 있습니다.")).not.toBeNull();
  });

  it("10MB를 넘는 파일은 사유를 표시한다", async () => {
    const user = userEvent.setup();
    renderOffice(<OfficeEvidenceScreen registrationId={31} entity="INDIVIDUAL" />);
    await user.upload(
      screen.getByLabelText("중개사무소 사업자등록증"),
      pngFile("big.png", 10 * 1024 * 1024 + 1),
    );
    expect(screen.getByText("파일은 한 장당 10MB 이하여야 합니다.")).not.toBeNull();
  });

  it("모두 선택해 등록하면 종류와 파일을 짝지어 보내고 심사 상태로 이동한다", async () => {
    const sent: unknown[] = [];
    const baseFetch = globalThis.fetch;
    vi.stubGlobal("fetch", (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input).includes("/evidence")) sent.push(init?.body);
      return baseFetch(input, init);
    });
    const user = userEvent.setup();
    renderOffice(<OfficeEvidenceScreen registrationId={31} entity="INDIVIDUAL" />);
    await selectAllIndividual(user);
    await user.click(screen.getByRole("button", { name: "등록" }));
    await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith("/office/review"));
    const body = sent[0];
    expect(body).toBeInstanceOf(FormData);
    const form = body as FormData;
    expect(form.getAll("evidenceType")).toEqual([
      "BROKERAGE_LICENSE",
      "BUSINESS_CERTIFICATE",
      "REPRESENTATIVE_QUALIFICATION",
    ]);
    expect(form.getAll("file")).toHaveLength(3);
  });

  it("서버가 파일을 거부하면 해당 칸에 사유를 보여준다", async () => {
    setMockOfficeState({ evidenceMode: "invalid-file" });
    const user = userEvent.setup();
    renderOffice(<OfficeEvidenceScreen registrationId={31} entity="INDIVIDUAL" />);
    await selectAllIndividual(user);
    await user.click(screen.getByRole("button", { name: "등록" }));
    expect(await screen.findByText("주민등록번호 뒷자리가 보입니다.")).not.toBeNull();
    expect(navigation.replace).not.toHaveBeenCalled();
  });

  it("이미 심사 중이면 심사 상태 링크를 안내한다", async () => {
    setMockOfficeState({ evidenceMode: "invalid-transition" });
    const user = userEvent.setup();
    renderOffice(<OfficeEvidenceScreen registrationId={31} entity="INDIVIDUAL" />);
    await selectAllIndividual(user);
    await user.click(screen.getByRole("button", { name: "등록" }));
    expect(await screen.findByRole("link", { name: "심사 상태 확인하기" })).not.toBeNull();
  });

  it("사업자번호 중복 경고를 알려 준다", () => {
    renderOffice(
      <OfficeEvidenceScreen
        registrationId={31}
        entity="INDIVIDUAL"
        warning="DUPLICATE_BUSINESS_NUMBER"
      />,
    );
    expect(screen.getByText(/같은 사업자등록번호의 사무소가 이미 있습니다/)).not.toBeNull();
  });

  it("네트워크 요청이 429면 대기 안내를 보여준다", async () => {
    server.use(
      http.post("/api/office-registrations/:id/evidence", () => mockErrors.rateLimited(30)),
    );
    const user = userEvent.setup();
    renderOffice(<OfficeEvidenceScreen registrationId={31} entity="INDIVIDUAL" />);
    await selectAllIndividual(user);
    await user.click(screen.getByRole("button", { name: "등록" }));
    expect((await screen.findByRole("alert")).textContent).toContain("30초 뒤에 다시 시도");
  });
});

describe("심사 상태", () => {
  it("불러오는 동안 로딩을 보여준다", async () => {
    renderOffice(<OfficeReviewScreen />);
    expect(screen.getByText("심사 상태를 불러오는 중입니다.")).not.toBeNull();
    await screen.findByText("진행 중인 사무소 인증 신청이 없습니다.");
  });

  it("신청이 없으면 시작 화면으로 안내한다", async () => {
    renderOffice(<OfficeReviewScreen />);
    expect(await screen.findByText("진행 중인 사무소 인증 신청이 없습니다.")).not.toBeNull();
    expect(
      screen.getByRole("link", { name: "사무소 생성/참여 선택으로 이동" }).getAttribute("href"),
    ).toBe("/office/start");
  });

  it("불러오지 못하면 오류 화면에서 다시 시도할 수 있다", async () => {
    server.use(http.get("/api/office-registrations/me", () => mockErrors.server()));
    const user = userEvent.setup();
    renderOffice(<OfficeReviewScreen />);
    expect(await screen.findByText("문제가 발생했습니다")).not.toBeNull();
    server.resetHandlers();
    setMockOfficeState({
      registration: {
        registrationId: 31,
        status: "PENDING_REVIEW",
        currentRevisionNo: 1,
        entityType: "INDIVIDUAL",
      },
    });
    await user.click(screen.getByRole("button", { name: /다시 시도/ }));
    expect(await screen.findByText("서류를 확인하고 있습니다.")).not.toBeNull();
  });

  it("작성 중이면 증빙 이어가기와 철회를 보여준다", async () => {
    setMockOfficeState({
      registration: {
        registrationId: 31,
        status: "DRAFT",
        currentRevisionNo: 1,
        entityType: "INDIVIDUAL",
      },
    });
    const user = userEvent.setup();
    renderOffice(<OfficeReviewScreen />);
    await user.click(await screen.findByRole("button", { name: "증빙 업로드 이어가기" }));
    expect(navigation.push).toHaveBeenCalledWith("/office/register/evidence?registrationId=31");
    expect(screen.getByRole("button", { name: "신청 철회" })).not.toBeNull();
  });

  it("심사 중에는 2영업일 목표와 재심사 안내를 보여준다", async () => {
    setMockOfficeState({
      registration: {
        registrationId: 31,
        status: "PENDING_REVIEW",
        currentRevisionNo: 1,
        entityType: "INDIVIDUAL",
      },
    });
    renderOffice(<OfficeReviewScreen />);
    expect(
      await screen.findByText(/접수 후 2영업일 안에 결과를 안내하는 것을 목표로 합니다/),
    ).not.toBeNull();
    expect(screen.getByText(/재심사하거나 인증이 회수될 수 있습니다/)).not.toBeNull();
  });

  it("보완 요청이면 사유와 기한과 재제출 버튼을 보여준다", async () => {
    setMockOfficeState({
      registration: {
        registrationId: 31,
        status: "SUPPLEMENT_REQUESTED",
        currentRevisionNo: 1,
        entityType: "INDIVIDUAL",
        supplementReason: "사업자등록증을 다시 올려 주세요",
        supplementDueAt: "2026-11-20T09:00:00+09:00",
      },
    });
    const user = userEvent.setup();
    renderOffice(<OfficeReviewScreen />);
    expect(await screen.findByText("사업자등록증을 다시 올려 주세요")).not.toBeNull();
    expect(screen.getByText("2026-11-20 09:00")).not.toBeNull();
    await user.click(screen.getByRole("button", { name: "보완 서류 재제출" }));
    expect(navigation.push).toHaveBeenCalledWith("/office/register/evidence?registrationId=31");
  });

  it("신청을 철회하면 확인 대화상자를 거쳐 철회 안내를 보여준다", async () => {
    setMockOfficeState({
      registration: {
        registrationId: 31,
        status: "PENDING_REVIEW",
        currentRevisionNo: 1,
        entityType: "INDIVIDUAL",
      },
    });
    const user = userEvent.setup();
    renderOffice(<OfficeReviewScreen />);
    await user.click(await screen.findByRole("button", { name: "신청 철회" }));
    const dialog = screen.getByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "철회" }));
    expect(
      await screen.findByText("신청을 철회했습니다.", { selector: "p[role=status]" }),
    ).not.toBeNull();
    expect(await screen.findByText("취소")).not.toBeNull();
  });

  it("철회가 실패하면 오류를 보여준다", async () => {
    setMockOfficeState({
      registration: {
        registrationId: 31,
        status: "PENDING_REVIEW",
        currentRevisionNo: 1,
        entityType: "INDIVIDUAL",
      },
    });
    server.use(http.post("/api/office-registrations/:id/cancel", () => mockErrors.rateLimited(60)));
    const user = userEvent.setup();
    renderOffice(<OfficeReviewScreen />);
    await user.click(await screen.findByRole("button", { name: "신청 철회" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "철회" }));
    expect((await screen.findByRole("alert")).textContent).toContain("1분 뒤에 다시 시도");
  });

  it("반려되면 사유와 재신청 시작을 보여주고 시작 화면으로 이동한다", async () => {
    setMockOfficeState({
      registration: {
        registrationId: 31,
        status: "REJECTED",
        currentRevisionNo: 1,
        entityType: "INDIVIDUAL",
        rejectionReason: "서류가 흐립니다",
        resolved: false,
      },
    });
    const user = userEvent.setup();
    renderOffice(<OfficeReviewScreen />);
    expect(await screen.findByText("서류가 흐립니다")).not.toBeNull();
    await user.click(screen.getByRole("button", { name: "재신청 시작" }));
    await waitFor(() => expect(navigation.push).toHaveBeenCalledWith("/office/start"));
  });

  it("회수되면 사유와 시각과 별도 소명이 없다는 안내를 보여준다", async () => {
    setMockOfficeState({
      registration: {
        registrationId: 31,
        status: "REVOKED",
        currentRevisionNo: 2,
        entityType: "INDIVIDUAL",
        revocationReason: "허위 서류",
        revokedAt: "2026-11-09T10:00:00+09:00",
      },
    });
    const user = userEvent.setup();
    renderOffice(<OfficeReviewScreen />);
    expect(await screen.findByText("허위 서류")).not.toBeNull();
    expect(screen.getByText("2026-11-09 10:00")).not.toBeNull();
    expect(screen.getByText(/새로 인증을 신청해 다시 확인받을 수 있습니다/)).not.toBeNull();
    await user.click(screen.getByRole("button", { name: "새 신청 시작" }));
    expect(navigation.push).toHaveBeenCalledWith("/office/start");
  });

  it("인증이 완료되면 확인 버튼으로 홈에 간다", async () => {
    setMockOfficeState({
      registration: {
        registrationId: 31,
        status: "APPROVED",
        currentRevisionNo: 1,
        entityType: "INDIVIDUAL",
      },
    });
    const user = userEvent.setup();
    renderOffice(<OfficeReviewScreen />);
    await user.click(await screen.findByRole("button", { name: "확인" }));
    expect(navigation.push).toHaveBeenCalledWith("/home");
  });
});
