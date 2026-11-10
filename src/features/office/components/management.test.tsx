// @vitest-environment jsdom
import { cleanup, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { errorResponse, mockErrors } from "@/mocks/error-responses";
import {
  buildMockMember,
  getMockOfficeState,
  resetMockOfficeState,
  setMockOfficeState,
} from "@/mocks/handlers/office";
import { server, startMockServer } from "@/mocks/server";
import { setStepUpHandler } from "@/shared/api/auth-events";
import { MemberDetailScreen } from "./member-detail-screen";
import { MemberRequestsScreen } from "./member-requests-screen";
import { MembersScreen } from "./members-screen";
import { OfficeInfoScreen } from "./office-info-screen";
import { OwnerTransferScreen } from "./owner-transfer-screen";
import { renderOffice } from "@/shared/testing/office-render";

const navigation = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: navigation.push, replace: navigation.replace }),
  usePathname: () => "/members",
}));

let stopServer: () => void;

beforeAll(() => {
  stopServer = startMockServer();
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
  resetMockOfficeState();
  setStepUpHandler(null);
  navigation.push.mockClear();
  navigation.replace.mockClear();
});

afterAll(() => stopServer());

describe("사무소 정보", () => {
  it("불러오는 동안 로딩을 보여주고 현재 값을 표시한다", async () => {
    renderOffice(<OfficeInfoScreen />, { role: "OWNER" });
    expect(screen.getByText("사무소 정보를 불러오는 중입니다.")).not.toBeNull();
    expect(await screen.findByText("사이로 공인중개사사무소")).not.toBeNull();
    expect(screen.getByText("010-1111-2222")).not.toBeNull();
    expect(await screen.findByText("낸 변경 신청이 없습니다.")).not.toBeNull();
  });

  it("조회가 실패하면 오류 화면을 보여준다", async () => {
    server.use(http.get("/api/offices/current", () => mockErrors.server()));
    renderOffice(<OfficeInfoScreen />, { role: "OWNER" });
    expect(await screen.findByText("문제가 발생했습니다")).not.toBeNull();
  });

  it("권한이 없으면 권한 없음 화면을 보여준다", async () => {
    server.use(http.get("/api/offices/current", () => mockErrors.forbidden()));
    renderOffice(<OfficeInfoScreen />, { role: "OWNER" });
    expect(await screen.findByText("접근 권한이 없습니다")).not.toBeNull();
  });

  it("대표가 아니면 변경 영역을 숨기고 대표 개인 연락처가 없음을 알린다", async () => {
    setMockOfficeState({ office: { ...getMockOfficeState().office, representativePhone: null } });
    renderOffice(<OfficeInfoScreen />, { role: "DEPUTY" });
    expect(await screen.findByText("대표 개인 연락처는 표시하지 않습니다.")).not.toBeNull();
    expect(screen.queryByRole("button", { name: "대표 연락처 변경" })).toBeNull();
    expect(screen.queryByRole("button", { name: "정보 변경 신청" })).toBeNull();
  });

  it("대표 연락처를 바꾸면 버전을 함께 보내 바로 반영한다", async () => {
    const user = userEvent.setup();
    renderOffice(<OfficeInfoScreen />, { role: "OWNER" });
    await user.click(await screen.findByRole("button", { name: "대표 연락처 변경" }));
    const input = screen.getByLabelText("대표 연락처");
    await user.clear(input);
    await user.type(input, "01099998888");
    await user.click(screen.getByRole("button", { name: "저장" }));
    expect(await screen.findByText("대표 연락처를 저장했습니다.")).not.toBeNull();
    expect(screen.getByText("010-9999-8888")).not.toBeNull();
  });

  it("연락처 형식이 틀리면 저장하지 않고 안내한다", async () => {
    const user = userEvent.setup();
    renderOffice(<OfficeInfoScreen />, { role: "OWNER" });
    await user.click(await screen.findByRole("button", { name: "대표 연락처 변경" }));
    const input = screen.getByLabelText("대표 연락처");
    await user.clear(input);
    await user.type(input, "0101");
    await user.click(screen.getByRole("button", { name: "저장" }));
    expect(screen.getByText("연락처를 010-0000-0000 형식으로 입력해 주세요.")).not.toBeNull();
  });

  it("다른 사용자가 먼저 수정했으면 충돌을 안내하고 최신 값을 다시 불러온다", async () => {
    server.use(http.patch("/api/offices/current", () => mockErrors.versionConflict(9)));
    const user = userEvent.setup();
    renderOffice(<OfficeInfoScreen />, { role: "OWNER" });
    await user.click(await screen.findByRole("button", { name: "대표 연락처 변경" }));
    await user.click(screen.getByRole("button", { name: "저장" }));
    expect((await screen.findByRole("alert")).textContent).toContain("다른 사용자가 먼저 수정");
  });

  it("읽기 전용 상태에서는 변경 버튼을 숨긴다", async () => {
    renderOffice(<OfficeInfoScreen />, { role: "OWNER", isReadOnly: true });
    await screen.findByText("사이로 공인중개사사무소");
    expect(screen.queryByRole("button", { name: "대표 연락처 변경" })).toBeNull();
    expect(screen.queryByRole("button", { name: "정보 변경 신청" })).toBeNull();
  });

  it("주소 변경을 신청하면 승인 전까지 값이 유지된다는 안내와 함께 목록에 나타난다", async () => {
    const user = userEvent.setup();
    renderOffice(<OfficeInfoScreen />, { role: "OWNER" });
    await user.click(await screen.findByRole("button", { name: "정보 변경 신청" }));
    const dialog = screen.getByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "변경 신청" }));
    expect(within(dialog).getByText("변경 종류를 선택해 주세요.")).not.toBeNull();
    await user.selectOptions(within(dialog).getByLabelText("변경 종류"), "ADDRESS");
    await user.click(within(dialog).getByRole("button", { name: "변경 신청" }));
    expect(within(dialog).getByText("새 주소를 입력해 주세요.")).not.toBeNull();
    await user.type(within(dialog).getByLabelText("새 주소"), "서울시 중구 1");
    await user.click(within(dialog).getByRole("button", { name: "변경 신청" }));
    expect(
      await within(dialog).findByText(/승인되기 전까지 사무소 정보는 바뀌지 않습니다/),
    ).not.toBeNull();
    await user.click(within(dialog).getByRole("button", { name: "확인" }));
    expect(await screen.findByText("주소 변경")).not.toBeNull();
    expect(screen.getByText("주소: 서울시 중구 1")).not.toBeNull();
  });

  it("대표자 변경은 이름과 연락처를 모두 요구한다", async () => {
    const user = userEvent.setup();
    renderOffice(<OfficeInfoScreen />, { role: "OWNER" });
    await user.click(await screen.findByRole("button", { name: "정보 변경 신청" }));
    const dialog = screen.getByRole("dialog");
    await user.selectOptions(within(dialog).getByLabelText("변경 종류"), "REPRESENTATIVE");
    await user.click(within(dialog).getByRole("button", { name: "변경 신청" }));
    expect(within(dialog).getByText("새 대표자 이름을 입력해 주세요.")).not.toBeNull();
    expect(
      within(dialog).getByText("연락처를 010-0000-0000 형식으로 입력해 주세요."),
    ).not.toBeNull();
  });

  it("본인 확인이 필요하면 확인 뒤 같은 요청을 이어서 보낸다", async () => {
    let calls = 0;
    server.use(
      http.post("/api/office-change-requests", () => {
        calls += 1;
        if (calls === 1) return mockErrors.stepUpRequired();
        return HttpResponse.json(
          {
            requestId: 1,
            officeId: 12,
            changeType: "ADDRESS",
            requestedValues: { address: "x" },
            status: "PENDING_REVIEW",
            createdAt: "2026-11-10T09:00:00+09:00",
            updatedAt: "2026-11-10T09:00:00+09:00",
            version: 1,
          },
          { status: 201 },
        );
      }),
    );
    setStepUpHandler(async () => true);
    const user = userEvent.setup();
    renderOffice(<OfficeInfoScreen />, { role: "OWNER" });
    await user.click(await screen.findByRole("button", { name: "정보 변경 신청" }));
    const dialog = screen.getByRole("dialog");
    await user.selectOptions(within(dialog).getByLabelText("변경 종류"), "ADDRESS");
    await user.type(within(dialog).getByLabelText("새 주소"), "서울시 중구 1");
    await user.click(within(dialog).getByRole("button", { name: "변경 신청" }));
    expect(await within(dialog).findByText(/승인되기 전까지/)).not.toBeNull();
    expect(calls).toBe(2);
  });

  it("본인 확인을 마치지 못하면 안내한다", async () => {
    server.use(http.post("/api/office-change-requests", () => mockErrors.stepUpRequired()));
    setStepUpHandler(async () => false);
    const user = userEvent.setup();
    renderOffice(<OfficeInfoScreen />, { role: "OWNER" });
    await user.click(await screen.findByRole("button", { name: "정보 변경 신청" }));
    const dialog = screen.getByRole("dialog");
    await user.selectOptions(within(dialog).getByLabelText("변경 종류"), "ADDRESS");
    await user.type(within(dialog).getByLabelText("새 주소"), "서울시 중구 1");
    await user.click(within(dialog).getByRole("button", { name: "변경 신청" }));
    expect((await within(dialog).findByRole("alert")).textContent).toContain(
      "본인 확인이 필요합니다",
    );
  });

  it("변경 신청 목록에서 반려 사유를 보여준다", async () => {
    setMockOfficeState({
      changeRequests: [
        {
          requestId: 3,
          changeType: "REPRESENTATIVE",
          requestedValues: { representativeName: "이대표" },
          status: "REJECTED",
          rejectionReason: "서류 부족",
          createdAt: "2026-11-09T09:00:00+09:00",
        },
      ],
    });
    renderOffice(<OfficeInfoScreen />, { role: "OWNER" });
    expect(await screen.findByText("서류 부족")).not.toBeNull();
    expect(screen.getByText("대표자 변경")).not.toBeNull();
  });

  it("변경 신청 목록이 실패해도 화면의 나머지는 유지하고 다시 시도할 수 있다", async () => {
    server.use(http.get("/api/office-change-requests", () => mockErrors.server()));
    renderOffice(<OfficeInfoScreen />, { role: "OWNER" });
    expect(await screen.findByText("변경 신청 목록을 불러오지 못했습니다.")).not.toBeNull();
    expect(screen.getByText("사이로 공인중개사사무소")).not.toBeNull();
  });
});

describe("구성원 목록", () => {
  it("대표는 자격과 확인 여부와 과금 대상을 본다", async () => {
    renderOffice(<MembersScreen />, { role: "OWNER" });
    expect(
      await screen.findByText(
        /구성원의 자격, 고용 신고, 교육 이수 확인의 책임은 사무소에 있습니다/,
      ),
    ).not.toBeNull();
    expect(await screen.findByText("이중개")).not.toBeNull();
    expect(screen.getByText("자격-2")).not.toBeNull();
    expect(screen.getByRole("columnheader", { name: "과금 대상" })).not.toBeNull();
    expect(screen.getByRole("link", { name: "이중개 상세" }).getAttribute("href")).toBe(
      "/members/2",
    );
  });

  it("대표가 아니면 이름과 역할만 본다", async () => {
    renderOffice(<MembersScreen />, { role: "AGENT" });
    expect(await screen.findByText("이중개")).not.toBeNull();
    expect(screen.queryByRole("columnheader", { name: "자격번호" })).toBeNull();
    expect(screen.queryByRole("tab", { name: "고용명부" })).toBeNull();
    expect(screen.getByText(/대표만 볼 수 있습니다/)).not.toBeNull();
  });

  it("목록이 비면 빈 화면을 보여주고 실패하면 다시 시도할 수 있다", async () => {
    setMockOfficeState({ members: [] });
    const { unmount } = renderOffice(<MembersScreen />, { role: "OWNER" });
    expect(await screen.findByText("구성원이 없습니다.")).not.toBeNull();
    unmount();
    server.use(http.get("/api/offices/current/memberships", () => mockErrors.server()));
    renderOffice(<MembersScreen />, { role: "OWNER" });
    expect(await screen.findByText("구성원 목록을 불러오지 못했습니다.")).not.toBeNull();
    expect(screen.getByRole("button", { name: "다시 시도" })).not.toBeNull();
  });

  it("대표가 아닌데 대표 전용 목록을 요청하면 권한 오류 문구를 보여준다", async () => {
    server.use(http.get("/api/offices/current/memberships", () => mockErrors.forbidden()));
    renderOffice(<MembersScreen />, { role: "AGENT" });
    expect(await screen.findByText("구성원 목록을 불러오지 못했습니다.")).not.toBeNull();
  });

  it("중개보조원이 한도를 넘으면 시정 안내 배너를 보여준다", async () => {
    setMockOfficeState({
      quota: { qualifiedCount: 1, deputyCount: 7, deputyLimit: 5, exceeded: true },
    });
    renderOffice(<MembersScreen />, { role: "OWNER" });
    const banner = await screen.findByRole("alert");
    expect(banner.textContent).toContain("중개보조원 7명 / 한도 5명");
    expect(banner.textContent).toContain("신규 방문 업무와 확정이 제한");
  });

  it("한도 안이면 현재 인원과 한도를 안내한다", async () => {
    renderOffice(<MembersScreen />, { role: "OWNER" });
    expect(await screen.findByText(/중개보조원 1명 \/ 한도 10명/)).not.toBeNull();
  });

  it("접근 정지 탭에서 정지된 구성원을 따로 본다", async () => {
    setMockOfficeState({
      members: [
        ...getMockOfficeState().members,
        buildMockMember({ membershipId: 9, displayName: "정지된분", status: "SUSPENDED" }),
      ],
    });
    const user = userEvent.setup();
    renderOffice(<MembersScreen />, { role: "OWNER" });
    await user.click(await screen.findByRole("tab", { name: "접근 정지" }));
    expect(await screen.findByText("정지된분")).not.toBeNull();
  });
});

describe("고용명부", () => {
  it("명부와 한도 계산 기준을 보여준다", async () => {
    const user = userEvent.setup();
    renderOffice(<MembersScreen />, { role: "OWNER" });
    await user.click(await screen.findByRole("tab", { name: "고용명부" }));
    expect(await screen.findByText("김대표")).not.toBeNull();
    expect(screen.getByText(/계정이 없는 고용인까지 포함한 실제 고용명부 기준/)).not.toBeNull();
  });

  it("항목을 추가할 때 필수 값을 검증한다", async () => {
    const user = userEvent.setup();
    renderOffice(<MembersScreen />, { role: "OWNER" });
    await user.click(await screen.findByRole("tab", { name: "고용명부" }));
    await user.click(await screen.findByRole("button", { name: "항목 추가" }));
    const dialog = screen.getByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "추가" }));
    expect(within(dialog).getByText("이름을 입력해 주세요.")).not.toBeNull();
    expect(within(dialog).getByText("법적 신분을 선택해 주세요.")).not.toBeNull();
    expect(within(dialog).getByText("업무개시일을 입력해 주세요.")).not.toBeNull();
    expect(within(dialog).getByText("확인 출처를 선택해 주세요.")).not.toBeNull();
  });

  it("항목을 추가하면 목록에 나타난다", async () => {
    const user = userEvent.setup();
    renderOffice(<MembersScreen />, { role: "OWNER" });
    await user.click(await screen.findByRole("tab", { name: "고용명부" }));
    await user.click(await screen.findByRole("button", { name: "항목 추가" }));
    const dialog = screen.getByRole("dialog");
    await user.type(within(dialog).getByLabelText("이름"), "최보조");
    await user.selectOptions(within(dialog).getByLabelText("법적 신분"), "DEPUTY");
    await user.type(within(dialog).getByLabelText(/업무개시일/), "2026-11-01");
    await user.selectOptions(within(dialog).getByLabelText("확인 출처"), "MANUAL_ENTRY");
    await user.click(within(dialog).getByRole("button", { name: "추가" }));
    expect(await screen.findByText("최보조")).not.toBeNull();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("추가가 서버 검증에 걸리면 필드 오류를 보여준다", async () => {
    const user = userEvent.setup();
    renderOffice(<MembersScreen />, { role: "OWNER" });
    await user.click(await screen.findByRole("tab", { name: "고용명부" }));
    await user.click(await screen.findByRole("button", { name: "항목 추가" }));
    const dialog = screen.getByRole("dialog");
    await user.type(within(dialog).getByLabelText("이름"), "형식오류");
    await user.selectOptions(within(dialog).getByLabelText("법적 신분"), "AGENT");
    await user.type(within(dialog).getByLabelText(/업무개시일/), "2026-11-01");
    await user.selectOptions(within(dialog).getByLabelText("확인 출처"), "REGISTRATION_DOC");
    await user.click(within(dialog).getByRole("button", { name: "추가" }));
    expect(await within(dialog).findByText("이름 형식이 올바르지 않습니다.")).not.toBeNull();
  });

  it("고용종료일을 수정하면 목록이 갱신된다", async () => {
    const user = userEvent.setup();
    renderOffice(<MembersScreen />, { role: "OWNER" });
    await user.click(await screen.findByRole("tab", { name: "고용명부" }));
    await user.click(await screen.findByRole("button", { name: "김대표 고용종료일 수정" }));
    const dialog = screen.getByRole("dialog");
    await user.type(within(dialog).getByLabelText("고용종료일"), "2026-12-31");
    await user.click(within(dialog).getByRole("button", { name: "저장" }));
    expect(await screen.findByText("2026-12-31")).not.toBeNull();
  });

  it("종료일 수정이 한도를 넘기면 경고를 안내한다", async () => {
    setMockOfficeState({
      quota: { qualifiedCount: 1, deputyCount: 7, deputyLimit: 5, exceeded: true },
    });
    const user = userEvent.setup();
    renderOffice(<MembersScreen />, { role: "OWNER" });
    await user.click(await screen.findByRole("tab", { name: "고용명부" }));
    await user.click(await screen.findByRole("button", { name: "김대표 고용종료일 수정" }));
    await user.type(within(screen.getByRole("dialog")).getByLabelText("고용종료일"), "2026-12-31");
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "저장" }));
    expect(await screen.findByText(/한도를 넘어 신규 방문 업무가 제한됩니다/)).not.toBeNull();
  });

  it("버전이 어긋나면 충돌을 안내한다", async () => {
    server.use(
      http.patch("/api/offices/current/employment-roster/:id", () => mockErrors.versionConflict(5)),
    );
    const user = userEvent.setup();
    renderOffice(<MembersScreen />, { role: "OWNER" });
    await user.click(await screen.findByRole("tab", { name: "고용명부" }));
    await user.click(await screen.findByRole("button", { name: "김대표 고용종료일 수정" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "저장" }));
    expect(await screen.findByText(/다른 사용자가 먼저 수정/)).not.toBeNull();
  });

  it("명부 조회가 실패하면 다시 시도할 수 있다", async () => {
    server.use(http.get("/api/offices/current/employment-roster", () => mockErrors.server()));
    const user = userEvent.setup();
    renderOffice(<MembersScreen />, { role: "OWNER" });
    await user.click(await screen.findByRole("tab", { name: "고용명부" }));
    expect(await screen.findByText("고용명부를 불러오지 못했습니다.")).not.toBeNull();
  });
});

describe("구성원 상세", () => {
  it("넘어갈 업무 건수와 확정 방문 안내를 보여준다", async () => {
    renderOffice(<MemberDetailScreen membershipId={2} />, { role: "OWNER" });
    expect(await screen.findByText("이중개")).not.toBeNull();
    expect(screen.getByText(/진행 고객 4건, 매물 7건, 업무 2건, 계약 1건/)).not.toBeNull();
    expect(screen.getByText(/확정된 방문 3건은 재조율 필요로 바뀝니다/)).not.toBeNull();
  });

  it("없는 구성원은 찾을 수 없음 화면을 보여준다", async () => {
    renderOffice(<MemberDetailScreen membershipId={999} />, { role: "OWNER" });
    expect(await screen.findByText("페이지를 찾을 수 없습니다")).not.toBeNull();
  });

  it("역할을 바꾸면 본인 확인을 거쳐 반영한다", async () => {
    let calls = 0;
    server.use(
      http.patch("/api/memberships/:id/role", async ({ request }) => {
        calls += 1;
        if (calls === 1) return mockErrors.stepUpRequired();
        expect(request.headers.get("If-Match")).toBe("5");
        return HttpResponse.json({
          membershipId: 2,
          role: "DEPUTY",
          officeId: 12,
          createdAt: "2026-11-10T09:00:00+09:00",
          updatedAt: "2026-11-10T09:00:00+09:00",
          version: 6,
        });
      }),
    );
    setStepUpHandler(async () => true);
    const user = userEvent.setup();
    renderOffice(<MemberDetailScreen membershipId={2} />, { role: "OWNER" });
    await user.click(await screen.findByRole("button", { name: "역할 변경" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByRole("button", { name: "변경" }).hasAttribute("disabled")).toBe(
      true,
    );
    await user.selectOptions(within(dialog).getByLabelText("새 역할"), "DEPUTY");
    await user.click(within(dialog).getByRole("button", { name: "변경" }));
    expect(await screen.findByText("역할을 변경했습니다.")).not.toBeNull();
    expect(calls).toBe(2);
  });

  it("정지하려면 사유가 필요하고 정지하면 해제 버튼이 나타난다", async () => {
    const user = userEvent.setup();
    renderOffice(<MemberDetailScreen membershipId={2} />, { role: "OWNER" });
    await user.click(await screen.findByRole("button", { name: "접근 정지" }));
    const dialog = screen.getByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "정지" }));
    expect(within(dialog).getByText("사유를 입력해 주세요.")).not.toBeNull();
    await user.type(within(dialog).getByLabelText("사유"), "규정 위반");
    await user.click(within(dialog).getByRole("button", { name: "정지" }));
    expect(await screen.findByText("접근을 정지했습니다.")).not.toBeNull();
    expect(await screen.findByRole("button", { name: "정지 해제" })).not.toBeNull();
  });

  it("정지를 해제하면 확인 뒤 정상으로 돌아간다", async () => {
    setMockOfficeState({
      detail: { ...getMockOfficeState().detail, status: "SUSPENDED" },
    });
    const user = userEvent.setup();
    renderOffice(<MemberDetailScreen membershipId={2} />, { role: "OWNER" });
    await user.click(await screen.findByRole("button", { name: "정지 해제" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "해제" }));
    expect(await screen.findByText("접근 정지를 해제했습니다.")).not.toBeNull();
  });

  it("내보내기는 사유를 받고 완료되면 목록으로 이동한다", async () => {
    const user = userEvent.setup();
    renderOffice(<MemberDetailScreen membershipId={2} />, { role: "OWNER" });
    await user.click(await screen.findByRole("button", { name: "내보내기" }));
    const dialog = screen.getByRole("dialog");
    await user.type(within(dialog).getByLabelText("사유"), "퇴사");
    await user.click(within(dialog).getByRole("button", { name: "내보내기" }));
    await waitFor(() => expect(navigation.push).toHaveBeenCalledWith("/members"));
  });

  it("마지막 대표는 강등과 내보내기를 막고 대표 이전을 안내한다", async () => {
    setMockOfficeState({
      detail: { ...getMockOfficeState().detail, role: "OWNER", membershipId: 1 },
    });
    renderOffice(<MemberDetailScreen membershipId={1} />, { role: "OWNER" });
    expect(await screen.findByText(/대표는 강등하거나 내보낼 수 없습니다/)).not.toBeNull();
    expect(screen.queryByRole("button", { name: "내보내기" })).toBeNull();
    expect(screen.queryByRole("button", { name: "역할 변경" })).toBeNull();
  });

  it("서버가 마지막 대표 오류를 돌려주면 안내한다", async () => {
    server.use(
      http.delete("/api/memberships/:id", () => errorResponse(409, "LAST_OWNER", "마지막 대표")),
    );
    const user = userEvent.setup();
    renderOffice(<MemberDetailScreen membershipId={2} />, { role: "OWNER" });
    await user.click(await screen.findByRole("button", { name: "내보내기" }));
    await user.type(within(screen.getByRole("dialog")).getByLabelText("사유"), "퇴사");
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "내보내기" }));
    expect((await screen.findByRole("alert")).textContent).toContain("유일한 대표");
  });

  it("읽기 전용 상태에서는 변경 버튼을 숨긴다", async () => {
    renderOffice(<MemberDetailScreen membershipId={2} />, { role: "OWNER", isReadOnly: true });
    await screen.findByText("이중개");
    expect(screen.queryByRole("button", { name: "접근 정지" })).toBeNull();
  });
});

describe("참여 요청과 초대 관리", () => {
  function pendingMember(partial: Parameters<typeof buildMockMember>[0]) {
    return buildMockMember({
      status: "PENDING",
      approvedAt: null,
      expiresAt: "2099-12-10T09:00:00+09:00",
      ...partial,
    });
  }

  it("30일과 7일 안내와 빈 대기 목록을 보여준다", async () => {
    renderOffice(<MemberRequestsScreen />, { role: "OWNER" });
    expect(screen.getByText(/가입 신청은 요청 후 30일, 초대는 발송 후 7일/)).not.toBeNull();
    expect(
      await screen.findByText("승인을 기다리는 참여 요청이나 초대가 없습니다."),
    ).not.toBeNull();
  });

  it("초대는 이메일과 역할을 검증한다", async () => {
    const user = userEvent.setup();
    renderOffice(<MemberRequestsScreen />, { role: "OWNER" });
    await user.click(screen.getByRole("button", { name: "초대 보내기" }));
    expect(screen.getByText("이메일 주소를 올바르게 입력해 주세요.")).not.toBeNull();
    expect(screen.getByText("역할을 선택해 주세요.")).not.toBeNull();
  });

  it("초대를 보내면 만료 시각을 안내하고 대기 목록에 나타난다", async () => {
    const user = userEvent.setup();
    renderOffice(<MemberRequestsScreen />, { role: "OWNER" });
    await user.type(screen.getByLabelText("초대할 이메일"), "new@example.com");
    await user.selectOptions(screen.getByLabelText("역할"), "AGENT");
    await user.click(screen.getByRole("button", { name: "초대 보내기" }));
    expect(await screen.findByText(/초대를 보냈습니다\. 2026-11-17 09:00까지/)).not.toBeNull();
    expect(await screen.findByText("초대받은분")).not.toBeNull();
  });

  it("가입하지 않은 이메일은 오류로 안내한다", async () => {
    const user = userEvent.setup();
    renderOffice(<MemberRequestsScreen />, { role: "OWNER" });
    await user.type(screen.getByLabelText("초대할 이메일"), "unknown@example.com");
    await user.selectOptions(screen.getByLabelText("역할"), "DEPUTY");
    await user.click(screen.getByRole("button", { name: "초대 보내기" }));
    expect((await screen.findByRole("alert")).textContent).toContain("대상을 찾을 수 없습니다");
  });

  it("이미 소속된 이메일은 중복 안내를 보여준다", async () => {
    const user = userEvent.setup();
    renderOffice(<MemberRequestsScreen />, { role: "OWNER" });
    await user.type(screen.getByLabelText("초대할 이메일"), "member@example.com");
    await user.selectOptions(screen.getByLabelText("역할"), "DEPUTY");
    await user.click(screen.getByRole("button", { name: "초대 보내기" }));
    expect((await screen.findByRole("alert")).textContent).toContain("이미 소속되어 있거나");
  });

  it("참여 요청을 승인하면 목록에서 사라진다", async () => {
    setMockOfficeState({ members: [pendingMember({ membershipId: 20, displayName: "신청자" })] });
    const user = userEvent.setup();
    renderOffice(<MemberRequestsScreen />, { role: "OWNER" });
    await user.click(await screen.findByRole("button", { name: "신청자 승인" }));
    expect(await screen.findByText("참여를 승인했습니다.")).not.toBeNull();
    await waitFor(() => expect(screen.queryByRole("button", { name: "신청자 승인" })).toBeNull());
  });

  it("중개보조원 한도를 넘으면 승인이 막혔다고 안내한다", async () => {
    setMockOfficeState({
      members: [pendingMember({ membershipId: 21, displayName: "한도초과", role: "DEPUTY" })],
    });
    const user = userEvent.setup();
    renderOffice(<MemberRequestsScreen />, { role: "OWNER" });
    await user.click(await screen.findByRole("button", { name: "한도초과 승인" }));
    expect((await screen.findByRole("alert")).textContent).toContain("5배까지만 승인");
  });

  it("거절은 사유를 요구하고 거절하면 목록에서 사라진다", async () => {
    setMockOfficeState({ members: [pendingMember({ membershipId: 22, displayName: "거절대상" })] });
    const user = userEvent.setup();
    renderOffice(<MemberRequestsScreen />, { role: "OWNER" });
    await user.click(await screen.findByRole("button", { name: "거절대상 거절" }));
    const dialog = screen.getByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "거절" }));
    expect(within(dialog).getByText("거절 사유를 입력해 주세요.")).not.toBeNull();
    await user.type(within(dialog).getByLabelText("거절 사유"), "자격 미확인");
    await user.click(within(dialog).getByRole("button", { name: "거절" }));
    expect(await screen.findByText("참여 요청을 거절했습니다.")).not.toBeNull();
  });

  it("수락 전 초대는 승인과 거절을 막고 재발송과 취소를 제공한다", async () => {
    setMockOfficeState({
      members: [
        pendingMember({
          membershipId: 23,
          displayName: "초대대상",
          requestSource: "INVITE",
          invitationAcceptedAt: null,
        }),
      ],
    });
    const user = userEvent.setup();
    renderOffice(<MemberRequestsScreen />, { role: "OWNER" });
    const approve = await screen.findByRole("button", { name: "초대대상 승인" });
    expect(approve.hasAttribute("disabled")).toBe(true);
    await user.click(screen.getByRole("button", { name: "초대대상 초대 재발송" }));
    expect(await screen.findByText(/초대를 다시 보냈습니다/)).not.toBeNull();
    await user.click(screen.getByRole("button", { name: "초대대상 초대 취소" }));
    expect(await screen.findByText("초대를 취소했습니다.")).not.toBeNull();
  });

  it("수락된 초대는 승인할 수 있다", async () => {
    setMockOfficeState({
      members: [
        pendingMember({
          membershipId: 24,
          displayName: "수락완료",
          requestSource: "INVITE",
          invitationAcceptedAt: "2026-11-10T10:00:00+09:00",
        }),
      ],
    });
    renderOffice(<MemberRequestsScreen />, { role: "OWNER" });
    const approve = await screen.findByRole("button", { name: "수락완료 승인" });
    expect(approve.hasAttribute("disabled")).toBe(false);
  });

  it("대기 목록 조회가 실패하면 다시 시도할 수 있다", async () => {
    server.use(http.get("/api/offices/current/memberships", () => mockErrors.server()));
    renderOffice(<MemberRequestsScreen />, { role: "OWNER" });
    expect(await screen.findByText("승인 대기 목록을 불러오지 못했습니다.")).not.toBeNull();
  });

  it("읽기 전용 상태에서는 초대와 승인을 막는다", async () => {
    setMockOfficeState({ members: [pendingMember({ membershipId: 25, displayName: "읽기전용" })] });
    renderOffice(<MemberRequestsScreen />, { role: "OWNER", isReadOnly: true });
    expect(screen.getByRole("button", { name: "초대 보내기" }).hasAttribute("disabled")).toBe(true);
    const approve = await screen.findByRole("button", { name: "읽기전용 승인" });
    expect(approve.hasAttribute("disabled")).toBe(true);
  });
});

describe("대표 이전", () => {
  it("이전 절차 안내와 본인 확인 시한을 보여준다", async () => {
    renderOffice(<OwnerTransferScreen />, { role: "OWNER" });
    expect(
      await screen.findByText(
        /대상자는 신청 후 7일 안에 수락해야 하며 기한이 지나면 신청이 만료됩니다/,
      ),
    ).not.toBeNull();
    expect(
      screen.getByText(/최근 10분 안에 비밀번호 또는 카카오 계정으로 다시 확인해야 합니다/),
    ).not.toBeNull();
    expect(screen.getByText(/이미 납부한 이용 기간은 유지됩니다/)).not.toBeNull();
  });

  it("진행 중인 이전이 없으면 후보 선택으로 시작한다", async () => {
    const user = userEvent.setup();
    renderOffice(<OwnerTransferScreen />, { role: "OWNER" });
    const select = await screen.findByLabelText("새 대표 후보");
    const options = within(select)
      .getAllByRole("option")
      .map((option) => option.textContent);
    expect(options).toContain("이중개");
    expect(options).not.toContain("박보조");
    await user.click(screen.getByRole("button", { name: "대표 이전 신청" }));
    expect(screen.getByText("넘길 대상을 선택해 주세요.")).not.toBeNull();
  });

  it("후보를 고르고 신청하면 타임라인과 수락 기한을 보여준다", async () => {
    const user = userEvent.setup();
    renderOffice(<OwnerTransferScreen />, { role: "OWNER" });
    await user.selectOptions(await screen.findByLabelText("새 대표 후보"), "102");
    await user.click(screen.getByRole("button", { name: "대표 이전 신청" }));
    expect(await screen.findByRole("list", { name: "대표 이전 진행 상태" })).not.toBeNull();
    expect(screen.getByText(/김대표 대표가 이중개님에게 대표 자리를 넘깁니다/)).not.toBeNull();
    expect(screen.getByText(/수락 기한 2026-11-17 09:00/)).not.toBeNull();
  });

  it("이미 진행 중인 이전이 있으면 서버 오류를 안내한다", async () => {
    server.use(
      http.post("/api/offices/current/owner-transfer", () =>
        errorResponse(409, "TRANSFER_IN_PROGRESS", "진행 중"),
      ),
    );
    const user = userEvent.setup();
    renderOffice(<OwnerTransferScreen />, { role: "OWNER" });
    await user.selectOptions(await screen.findByLabelText("새 대표 후보"), "102");
    await user.click(screen.getByRole("button", { name: "대표 이전 신청" }));
    expect((await screen.findByRole("alert")).textContent).toContain("이미 진행 중인 대표 이전");
  });

  it("후보가 없으면 안내하고 신청을 막는다", async () => {
    setMockOfficeState({
      members: [buildMockMember({ membershipId: 1, displayName: "김대표", role: "OWNER" })],
    });
    renderOffice(<OwnerTransferScreen />, { role: "OWNER" });
    expect(await screen.findByText(/넘길 수 있는 소속공인중개사가 없습니다/)).not.toBeNull();
    expect(screen.getByRole("button", { name: "대표 이전 신청" }).hasAttribute("disabled")).toBe(
      true,
    );
  });

  it("진행 중이면 철회할 수 있고 철회 뒤에는 철회 상태를 표시한다", async () => {
    setMockOfficeState({
      transfer: {
        transferId: 70,
        officeId: 12,
        fromDisplayName: "김대표",
        toDisplayName: "이중개",
        status: "PENDING",
        requestedAt: "2026-11-10T09:00:00+09:00",
        acceptDeadlineAt: "2026-11-17T09:00:00+09:00",
        acceptedAt: null,
        updatedAt: "2026-11-10T09:00:00+09:00",
        version: 1,
      },
    });
    const user = userEvent.setup();
    renderOffice(<OwnerTransferScreen />, { role: "OWNER" });
    await user.click(await screen.findByRole("button", { name: "대표 이전 철회" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "철회" }));
    expect(await screen.findByText("대표 이전을 철회했습니다.")).not.toBeNull();
    expect(await screen.findByText("최근 대표 이전")).not.toBeNull();
    expect(screen.getAllByText("철회됨").length).toBeGreaterThan(0);
  });

  it("후보는 수락할 수 있고 수락하면 심사 단계로 바뀐다", async () => {
    setMockOfficeState({
      transfer: {
        transferId: 70,
        officeId: 12,
        fromDisplayName: "김대표",
        toDisplayName: "이중개",
        status: "PENDING",
        requestedAt: "2026-11-10T09:00:00+09:00",
        acceptDeadlineAt: "2026-11-17T09:00:00+09:00",
        acceptedAt: null,
        updatedAt: "2026-11-10T09:00:00+09:00",
        version: 1,
      },
    });
    const user = userEvent.setup();
    renderOffice(<OwnerTransferScreen />, { role: "AGENT" });
    await user.click(await screen.findByRole("button", { name: "수락" }));
    expect(await screen.findByText(/운영자 승인을 기다립니다/)).not.toBeNull();
    await waitFor(() => expect(screen.queryByRole("button", { name: "수락" })).toBeNull());
  });

  it("후보는 사유와 함께 거절할 수 있다", async () => {
    setMockOfficeState({
      transfer: {
        transferId: 70,
        officeId: 12,
        fromDisplayName: "김대표",
        toDisplayName: "이중개",
        status: "PENDING",
        requestedAt: "2026-11-10T09:00:00+09:00",
        acceptDeadlineAt: "2026-11-17T09:00:00+09:00",
        acceptedAt: null,
        updatedAt: "2026-11-10T09:00:00+09:00",
        version: 1,
      },
    });
    const user = userEvent.setup();
    renderOffice(<OwnerTransferScreen />, { role: "AGENT" });
    await user.click(await screen.findByRole("button", { name: "거절" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "거절" }));
    expect(await screen.findByText("대표 이전을 거절했습니다.")).not.toBeNull();
  });

  it("후보가 수락에 실패하면 기한 만료 안내를 보여준다", async () => {
    setMockOfficeState({
      transfer: {
        transferId: 70,
        officeId: 12,
        fromDisplayName: "김대표",
        toDisplayName: "이중개",
        status: "PENDING",
        requestedAt: "2026-11-01T09:00:00+09:00",
        acceptDeadlineAt: "2026-11-08T09:00:00+09:00",
        acceptedAt: null,
        updatedAt: "2026-11-01T09:00:00+09:00",
        version: 1,
      },
    });
    server.use(
      http.post("/api/owner-transfers/:id/accept", () =>
        errorResponse(409, "INVALID_TRANSITION", "만료"),
      ),
    );
    const user = userEvent.setup();
    renderOffice(<OwnerTransferScreen />, { role: "AGENT" });
    await user.click(await screen.findByRole("button", { name: "수락" }));
    expect((await screen.findByRole("alert")).textContent).toContain("이미 처리되었거나");
  });

  it("심사 단계에는 수락 시각을 표시하고 후보 버튼을 숨긴다", async () => {
    setMockOfficeState({
      transfer: {
        transferId: 70,
        officeId: 12,
        fromDisplayName: "김대표",
        toDisplayName: "이중개",
        status: "UNDER_REVIEW",
        requestedAt: "2026-11-10T09:00:00+09:00",
        acceptDeadlineAt: "2026-11-17T09:00:00+09:00",
        acceptedAt: "2026-11-11T10:30:00+09:00",
        updatedAt: "2026-11-11T10:30:00+09:00",
        version: 2,
      },
    });
    renderOffice(<OwnerTransferScreen />, { role: "AGENT" });
    expect(await screen.findByText("2026-11-11 10:30")).not.toBeNull();
    expect(screen.queryByRole("button", { name: "수락" })).toBeNull();
  });

  it("진행 중인 이전이 없는 구성원에게는 없음 안내만 보여준다", async () => {
    renderOffice(<OwnerTransferScreen />, { role: "AGENT" });
    expect(await screen.findByText("진행 중인 대표 이전이 없습니다.")).not.toBeNull();
  });

  it("조회에 실패하거나 권한이 없으면 공통 오류 화면을 보여준다", async () => {
    server.use(http.get("/api/offices/current/owner-transfer", () => mockErrors.forbidden()));
    renderOffice(<OwnerTransferScreen />, { role: "DEPUTY" });
    expect(await screen.findByText("접근 권한이 없습니다")).not.toBeNull();
  });

  it("요청이 너무 많으면 대기 안내를 보여준다", async () => {
    server.use(http.get("/api/offices/current/owner-transfer", () => mockErrors.rateLimited(20)));
    renderOffice(<OwnerTransferScreen />, { role: "OWNER" });
    expect(await screen.findByText("요청이 너무 많습니다")).not.toBeNull();
  });
});
