// @vitest-environment jsdom
import { cleanup, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { errorResponse, mockErrors } from "@/mocks/error-responses";
import { getMockPropertyState, resetMockPropertyState } from "@/mocks/handlers/property";
import { server, startMockServer } from "@/mocks/server";
import { renderOffice } from "@/shared/testing/office-render";
import { ApiNetworkError } from "@/shared/api/api-error";
import { describePropertyError } from "../model/messages";
import { PropertyCreateScreen, PropertyEditScreen } from "./property-form-screen";

const navigation = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: navigation.push, replace: navigation.replace }),
  usePathname: () => "/properties/new",
}));

let stopServer: () => void;

beforeAll(() => {
  stopServer = startMockServer();
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
  resetMockPropertyState();
  navigation.push.mockClear();
});

afterAll(() => stopServer());

async function fillBasics(user: ReturnType<typeof userEvent.setup>, name = "새 매물") {
  await screen.findByRole("option", { name: "아파트" });
  await user.type(screen.getByLabelText(/매물명/), name);
  await user.selectOptions(screen.getByLabelText(/카테고리/), "6");
}

describe("매물 등록", () => {
  it("카테고리를 고르기 전에는 전용 입력 안내만 보여주고, 고르면 항목이 나타난다", async () => {
    const user = userEvent.setup();
    renderOffice(<PropertyCreateScreen />, { role: "OWNER" });
    expect(screen.getByText("카테고리를 선택하면 전용 입력 항목이 나타납니다.")).not.toBeNull();
    await screen.findByRole("option", { name: "아파트" });
    await user.selectOptions(screen.getByLabelText(/카테고리/), "6");
    expect(await screen.findByLabelText("동·호")).not.toBeNull();
    expect(screen.getByLabelText("해당층 (층)")).not.toBeNull();
    expect(screen.getByLabelText("준공일")).not.toBeNull();
  });

  it("매물명과 카테고리가 없으면 저장하지 않고 필드 오류를 보여준다", async () => {
    const user = userEvent.setup();
    renderOffice(<PropertyCreateScreen />, { role: "OWNER" });
    await user.click(screen.getByRole("button", { name: "임시저장" }));
    expect(await screen.findByText("매물명을 입력해 주세요.")).not.toBeNull();
    const alerts = screen.getAllByRole("alert").map((item) => item.textContent);
    expect(alerts).toContain("카테고리를 선택해 주세요.");
    expect(getMockPropertyState().properties).toHaveLength(2);
  });

  it("활성 등록에는 주소와 담당 공인중개사가 필요하다고 알린다", async () => {
    const user = userEvent.setup();
    renderOffice(<PropertyCreateScreen />, { role: "OWNER" });
    await fillBasics(user);
    await user.click(screen.getByRole("button", { name: "활성 등록" }));
    expect(await screen.findByText("활성 등록에는 주소가 필요합니다.")).not.toBeNull();
    expect(screen.getByText("활성 등록에는 담당 공인중개사가 필요합니다.")).not.toBeNull();
  });

  it("매물명과 카테고리만으로 임시저장하고 상세로 이동한다", async () => {
    const user = userEvent.setup();
    renderOffice(<PropertyCreateScreen />, { role: "OWNER" });
    await fillBasics(user);
    await user.click(screen.getByRole("button", { name: "임시저장" }));
    await waitFor(() => expect(navigation.push).toHaveBeenCalledTimes(1));
    const created = getMockPropertyState().properties[0];
    expect(created?.name).toBe("새 매물");
    expect(created?.registrationStage).toBe("DRAFT");
    expect(navigation.push).toHaveBeenCalledWith(`/properties/${created?.propertyId}`);
  });

  it("같은 주소가 있으면 경고하고 사유를 입력해야 별도 등록한다", async () => {
    const user = userEvent.setup();
    renderOffice(<PropertyCreateScreen />, { role: "OWNER" });
    await fillBasics(user);
    await user.type(screen.getByLabelText("매물 주소"), "서울특별시 성북구 정릉로 77");
    await user.click(screen.getByRole("button", { name: "임시저장" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText(/국민대 앞 아파트|서울특별시 성북구 정릉로 77/)).not.toBeNull();
    expect(within(dialog).getByRole("link", { name: "기존 매물 보기" }).getAttribute("href")).toBe(
      "/properties/501",
    );
    await user.click(within(dialog).getByRole("button", { name: "별도 매물로 등록" }));
    expect(await within(dialog).findByText("별도 등록 사유를 입력해 주세요.")).not.toBeNull();
    await user.type(within(dialog).getByLabelText("별도 등록 사유"), "다른 호실 임대 단위");
    await user.click(within(dialog).getByRole("button", { name: "별도 매물로 등록" }));
    await waitFor(() => expect(navigation.push).toHaveBeenCalledTimes(1));
    expect(getMockPropertyState().properties[0]?.name).toBe("새 매물");
  });

  it("기존 매물 경고에서 돌아가기를 누르면 저장하지 않는다", async () => {
    const user = userEvent.setup();
    renderOffice(<PropertyCreateScreen />, { role: "OWNER" });
    await fillBasics(user);
    await user.type(screen.getByLabelText("매물 주소"), "서울특별시 성북구 정릉로 77");
    await user.click(screen.getByRole("button", { name: "임시저장" }));
    await user.click(await screen.findByRole("button", { name: "돌아가기" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(navigation.push).not.toHaveBeenCalled();
  });

  it("서버가 필드 오류를 보내면 해당 입력에 표시한다", async () => {
    server.use(
      http.post("/api/properties", () =>
        mockErrors.validation([
          { field: "name", code: "NOT_ALLOWED", message: "서버: 이미 쓰는 이름입니다." },
        ]),
      ),
    );
    const user = userEvent.setup();
    renderOffice(<PropertyCreateScreen />, { role: "OWNER" });
    await fillBasics(user);
    await user.click(screen.getByRole("button", { name: "임시저장" }));
    expect(
      await screen.findByText("사용할 수 없는 값입니다. 다른 값을 입력해 주세요."),
    ).not.toBeNull();
    expect(screen.queryByText(/서버:/)).toBeNull();
    expect(navigation.push).not.toHaveBeenCalled();
  });

  it("카테고리 전용 항목은 단위와 범위를 안내하고 범위를 벗어나면 저장하지 않는다", async () => {
    const user = userEvent.setup();
    renderOffice(<PropertyCreateScreen />, { role: "OWNER" });
    await fillBasics(user);
    const floor = await screen.findByLabelText("해당층 (층)");
    expect(screen.getByText("정수, 0층 이상")).not.toBeNull();
    await user.type(floor, "-3");
    await user.click(screen.getByRole("button", { name: "임시저장" }));
    expect(await screen.findByText("0층 이상으로 입력해 주세요.")).not.toBeNull();
    expect(navigation.push).not.toHaveBeenCalled();
  });

  it("전용 항목 값은 모르는 값을 비워 저장하고 입력한 값만 보낸다", async () => {
    const user = userEvent.setup();
    renderOffice(<PropertyCreateScreen />, { role: "OWNER" });
    await fillBasics(user);
    await user.type(await screen.findByLabelText("해당층 (층)"), "12");
    await user.click(screen.getByRole("button", { name: "임시저장" }));
    await waitFor(() => expect(navigation.push).toHaveBeenCalledTimes(1));
    const created = getMockPropertyState().properties[0];
    expect(created?.customFields).toEqual([
      { fieldDefinitionId: 33, fieldName: "해당층", fieldType: "NUMBER", value: 12 },
    ]);
  });

  it("전용 항목 값을 여러 개 저장할 때 직전 응답의 매물 버전을 If-Match로 잇는다", async () => {
    const versions: Array<string | null> = [];
    server.use(
      http.put("/api/properties/:id/fields/:fieldId", ({ request }) => {
        versions.push(request.headers.get("If-Match"));
        return undefined;
      }),
    );
    const user = userEvent.setup();
    renderOffice(<PropertyCreateScreen />, { role: "OWNER" });
    await fillBasics(user);
    await user.type(await screen.findByLabelText("해당층 (층)"), "12");
    await user.type(screen.getByLabelText("동·호"), "101동 1203호");
    await user.click(screen.getByRole("button", { name: "임시저장" }));
    await waitFor(() => expect(navigation.push).toHaveBeenCalledTimes(1));
    expect(versions).toHaveLength(2);
    expect(versions.every((value) => value !== null)).toBe(true);
    expect(new Set(versions).size).toBe(versions.length);
  });

  it("사진은 형식과 용량을 검사하고 허용된 사진만 목록에 담는다", async () => {
    const user = userEvent.setup({ applyAccept: false });
    renderOffice(<PropertyCreateScreen />, { role: "OWNER" });
    const input = screen.getByLabelText("사진 파일 선택");
    await user.upload(input, new File(["x"], "문서.pdf", { type: "application/pdf" }));
    expect(
      await screen.findByText("JPG, PNG, WebP 형식의 사진만 올릴 수 있습니다."),
    ).not.toBeNull();
    const big = new File(["x"], "큰사진.jpg", { type: "image/jpeg" });
    Object.defineProperty(big, "size", { value: 11 * 1024 * 1024 });
    await user.upload(input, big);
    expect(await screen.findByText("사진은 한 장에 10MB 이하여야 합니다.")).not.toBeNull();
    await user.upload(input, new File(["x"], "거실.jpg", { type: "image/jpeg" }));
    expect(await screen.findByText(/1번째 · 거실.jpg/)).not.toBeNull();
    await user.type(screen.getByLabelText("사진 설명"), "거실");
    await fillBasics(user, "사진 매물");
    await user.click(screen.getByRole("button", { name: "임시저장" }));
    await waitFor(() => expect(navigation.push).toHaveBeenCalledTimes(1));
    expect(getMockPropertyState().properties[0]?.photos).toHaveLength(1);
  });

  it("생성 뒤 일부 단계가 실패하면 임시저장되었음을 알리고 수정 화면으로 보낸다", async () => {
    server.use(http.put("/api/properties/:id/fields/:fieldId", () => mockErrors.server()));
    const user = userEvent.setup();
    renderOffice(<PropertyCreateScreen />, { role: "OWNER" });
    await fillBasics(user);
    await user.type(await screen.findByLabelText("해당층 (층)"), "3");
    await user.click(screen.getByRole("button", { name: "임시저장" }));
    await waitFor(() => expect(navigation.push).toHaveBeenCalledTimes(1));
    const created = getMockPropertyState().properties[0];
    expect(navigation.push).toHaveBeenCalledWith(`/properties/${created?.propertyId}/edit`);
  });

  it("읽기 전용 상태에서는 저장 버튼이 막히고 안내가 나온다", async () => {
    renderOffice(<PropertyCreateScreen />, { role: "OWNER", isReadOnly: true });
    expect(screen.getByText(/읽기만 가능합니다/)).not.toBeNull();
    expect(screen.getByRole("button", { name: "임시저장" }).hasAttribute("disabled")).toBe(true);
  });
});

describe("매물 수정", () => {
  it("불러오는 동안 로딩을 보여주고 현재 값을 채운다", async () => {
    renderOffice(<PropertyEditScreen propertyId={501} />, { role: "OWNER" });
    expect(screen.getByText("매물 정보를 불러오는 중입니다.")).not.toBeNull();
    expect(await screen.findByDisplayValue("국민대 앞 아파트")).not.toBeNull();
    expect(screen.getByDisplayValue("서울특별시 성북구 정릉로 77")).not.toBeNull();
    expect(await screen.findByDisplayValue("12")).not.toBeNull();
  });

  it("없는 매물이면 찾을 수 없음 화면을 보여준다", async () => {
    renderOffice(<PropertyEditScreen propertyId={9999} />, { role: "OWNER" });
    expect(await screen.findByText("페이지를 찾을 수 없습니다")).not.toBeNull();
  });

  it("수정한 값을 If-Match로 저장하고 상세로 이동한다", async () => {
    let ifMatch: string | null = null;
    server.use(
      http.patch("/api/properties/501", async ({ request }) => {
        ifMatch = request.headers.get("If-Match");
        return errorResponse(500, "INTERNAL_ERROR", "실패");
      }),
    );
    const user = userEvent.setup();
    renderOffice(<PropertyEditScreen propertyId={501} />, { role: "OWNER" });
    const name = await screen.findByDisplayValue("국민대 앞 아파트");
    await user.clear(name);
    await user.type(name, "이름 바꾼 아파트");
    await user.click(screen.getByRole("button", { name: "저장" }));
    expect(await screen.findByText(/일시적인 오류가 발생했습니다/)).not.toBeNull();
    expect(ifMatch).toBe("1");
  });

  it("저장에 성공하면 매물이 바뀌고 상세로 이동한다", async () => {
    const user = userEvent.setup();
    renderOffice(<PropertyEditScreen propertyId={501} />, { role: "OWNER" });
    const name = await screen.findByDisplayValue("국민대 앞 아파트");
    await user.clear(name);
    await user.type(name, "이름 바꾼 아파트");
    await user.click(screen.getByRole("button", { name: "저장" }));
    await waitFor(() => expect(navigation.push).toHaveBeenCalledWith("/properties/501"));
    expect(getMockPropertyState().properties.find((item) => item.propertyId === 501)?.name).toBe(
      "이름 바꾼 아파트",
    );
  });

  it("다른 사용자가 먼저 수정했으면 충돌을 알리고 최신 내용을 다시 불러온다", async () => {
    server.use(http.patch("/api/properties/501", () => mockErrors.versionConflict(4)));
    const user = userEvent.setup();
    renderOffice(<PropertyEditScreen propertyId={501} />, { role: "OWNER" });
    await user.click(await screen.findByRole("button", { name: "저장" }));
    expect(await screen.findByText(/다른 사용자가 먼저 수정했습니다/)).not.toBeNull();
    await user.click(screen.getByRole("button", { name: "최신 내용 불러오기" }));
    expect(await screen.findByDisplayValue("국민대 앞 아파트")).not.toBeNull();
  });

  it("임시저장 매물은 주소와 담당자를 채우면 활성 등록으로 전환할 수 있다", async () => {
    const user = userEvent.setup();
    renderOffice(<PropertyEditScreen propertyId={502} />, { role: "OWNER" });
    await screen.findByDisplayValue("정릉 상가");
    await user.click(screen.getByRole("button", { name: "활성 등록으로 전환" }));
    expect(await screen.findByText("활성 등록에는 주소가 필요합니다.")).not.toBeNull();
    await user.type(screen.getByLabelText("매물 주소"), "서울특별시 성북구 정릉로 1");
    await screen.findByRole("option", { name: "이중개" });
    await user.selectOptions(screen.getByLabelText("담당 공인중개사"), "2");
    await user.click(screen.getByRole("button", { name: "활성 등록으로 전환" }));
    await waitFor(() => expect(navigation.push).toHaveBeenCalledWith("/properties/502"));
    expect(
      getMockPropertyState().properties.find((item) => item.propertyId === 502)?.registrationStage,
    ).toBe("ACTIVE");
  });

  it("카테고리를 바꾸면 이전 값을 보관한다는 안내와 함께 변경한다", async () => {
    const user = userEvent.setup();
    renderOffice(<PropertyEditScreen propertyId={501} />, { role: "OWNER" });
    await user.click(await screen.findByRole("button", { name: "카테고리 변경" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText(/지우지 않고 보관되며/)).not.toBeNull();
    await user.selectOptions(within(dialog).getByLabelText("새 카테고리"), "3");
    await user.click(within(dialog).getByRole("button", { name: "변경" }));
    expect(await screen.findByText(/카테고리를 바꿨습니다/)).not.toBeNull();
    const changed = getMockPropertyState().properties.find((item) => item.propertyId === 501);
    expect(changed?.categoryName).toBe("상가·사무실");
    expect(changed?.archivedCustomFields).toHaveLength(1);
  });

  it("보관된 매물은 수정할 수 없다고 안내한다", async () => {
    server.use(
      http.get("/api/properties/501", () => {
        const base = getMockPropertyState().properties[0];
        return Response.json({ ...base, deletedAt: "2026-11-01T09:00:00+09:00" });
      }),
    );
    renderOffice(<PropertyEditScreen propertyId={501} />, { role: "OWNER" });
    expect(await screen.findByText(/보관된 매물은 수정할 수 없습니다/)).not.toBeNull();
    expect(screen.getByRole("link", { name: "상세로 돌아가기" }).getAttribute("href")).toBe(
      "/properties/501",
    );
  });
});

describe("매물 등록 요청 멱등 키", () => {
  function captureKeys() {
    const keys: Array<string | null> = [];
    server.events.on("request:start", ({ request }) => {
      if (request.method === "POST" && new URL(request.url).pathname === "/api/properties") {
        keys.push(request.headers.get("Idempotency-Key"));
      }
    });
    return keys;
  }

  afterEach(() => server.events.removeAllListeners());

  it("연결 오류 뒤 다시 누르면 같은 키로 보내 매물이 한 건만 생긴다", async () => {
    const keys = captureKeys();
    server.use(http.post("/api/properties", () => HttpResponse.error(), { once: true }));
    const user = userEvent.setup();
    renderOffice(<PropertyCreateScreen />, { role: "OWNER" });
    await fillBasics(user);
    const before = getMockPropertyState().properties.length;
    await user.click(screen.getByRole("button", { name: "임시저장" }));
    await screen.findByText(/서버에 연결하지 못했습니다/);
    await user.click(screen.getByRole("button", { name: "임시저장" }));
    await waitFor(() => expect(navigation.push).toHaveBeenCalledTimes(1));
    expect(keys).toHaveLength(2);
    expect(keys[0]).toMatch(/^\S{1,100}$/);
    expect(keys[1]).toBe(keys[0]);
    expect(getMockPropertyState().properties).toHaveLength(before + 1);
  });

  it("입력을 고쳐 다시 보내면 새 키를 쓴다", async () => {
    const keys = captureKeys();
    server.use(http.post("/api/properties", () => HttpResponse.error(), { once: true }));
    const user = userEvent.setup();
    renderOffice(<PropertyCreateScreen />, { role: "OWNER" });
    await fillBasics(user);
    await user.click(screen.getByRole("button", { name: "임시저장" }));
    await screen.findByText(/서버에 연결하지 못했습니다/);
    await user.type(screen.getByLabelText(/매물명/), " 수정");
    await user.click(screen.getByRole("button", { name: "임시저장" }));
    await waitFor(() => expect(navigation.push).toHaveBeenCalledTimes(1));
    expect(keys).toHaveLength(2);
    expect(keys[1]).not.toBe(keys[0]);
  });

  it("폼을 새로 열면 새 키를 쓴다", async () => {
    const keys = captureKeys();
    const user = userEvent.setup();
    renderOffice(<PropertyCreateScreen />, { role: "OWNER" });
    await fillBasics(user);
    await user.click(screen.getByRole("button", { name: "임시저장" }));
    await waitFor(() => expect(navigation.push).toHaveBeenCalledTimes(1));
    cleanup();
    renderOffice(<PropertyCreateScreen />, { role: "OWNER" });
    await fillBasics(user);
    await user.click(screen.getByRole("button", { name: "임시저장" }));
    await waitFor(() => expect(navigation.push).toHaveBeenCalledTimes(2));
    expect(keys).toHaveLength(2);
    expect(keys[1]).not.toBe(keys[0]);
  });

  it("시간 초과 오류 문구는 같은 요청이 이미 처리되었을 수 있다고 알린다", () => {
    expect(describePropertyError(new ApiNetworkError("timeout"), "실패")).toContain(
      "이미 처리되었을 수 있으니",
    );
  });

  describe("거래 유형, 가격, 소유자, 점유자", () => {
    it("월세가 기본으로 선택되고 보증금과 월세를 입력받는다", async () => {
      renderOffice(<PropertyCreateScreen />, { role: "OWNER" });
      const monthly = screen.getByRole("button", { name: "월세" });
      expect(monthly.getAttribute("aria-pressed")).toBe("true");
      expect(screen.getByLabelText("가격 (보증금, 원)")).not.toBeNull();
      expect(screen.getByLabelText("가격 (월세, 원)")).not.toBeNull();
    });

    it("전세나 매매를 고르면 금액 입력이 하나로 바뀐다", async () => {
      const user = userEvent.setup();
      renderOffice(<PropertyCreateScreen />, { role: "OWNER" });
      await user.click(screen.getByRole("button", { name: "전세" }));
      expect(screen.getByLabelText("가격 (전세 보증금, 원)")).not.toBeNull();
      expect(screen.queryByLabelText("가격 (월세, 원)")).toBeNull();
      await user.click(screen.getByRole("button", { name: "매매" }));
      expect(screen.getByLabelText("가격 (매매가, 원)")).not.toBeNull();
    });

    it("가격을 입력하면 임시저장과 함께 거래 제안을 만든다", async () => {
      const user = userEvent.setup();
      renderOffice(<PropertyCreateScreen />, { role: "OWNER" });
      await fillBasics(user);
      await user.type(screen.getByLabelText("가격 (보증금, 원)"), "20000000");
      await user.type(screen.getByLabelText("가격 (월세, 원)"), "900000");
      await user.click(screen.getByRole("button", { name: "임시저장" }));
      await waitFor(() => expect(navigation.push).toHaveBeenCalledTimes(1));
      const created = getMockPropertyState().properties[0];
      expect(created?.offers).toHaveLength(1);
      expect(created?.offers[0]).toMatchObject({
        dealType: "MONTHLY",
        depositAmount: 20_000_000,
        monthlyRentAmount: 900_000,
        salePrice: null,
      });
    });

    it("가격을 비워 두면 거래 제안을 만들지 않는다", async () => {
      const user = userEvent.setup();
      renderOffice(<PropertyCreateScreen />, { role: "OWNER" });
      await fillBasics(user);
      await user.click(screen.getByRole("button", { name: "임시저장" }));
      await waitFor(() => expect(navigation.push).toHaveBeenCalledTimes(1));
      expect(getMockPropertyState().properties[0]?.offers).toHaveLength(0);
    });

    it("월세에서 보증금만 적으면 월세 입력을 요구하고 저장하지 않는다", async () => {
      const user = userEvent.setup();
      renderOffice(<PropertyCreateScreen />, { role: "OWNER" });
      await fillBasics(user);
      await user.type(screen.getByLabelText("가격 (보증금, 원)"), "20000000");
      await user.click(screen.getByRole("button", { name: "임시저장" }));
      expect(await screen.findByText("월세는 0 이상의 정수(원)로 입력해 주세요.")).not.toBeNull();
      expect(getMockPropertyState().properties).toHaveLength(2);
    });

    it("소유자와 점유자를 등록된 고객에서 찾아 연결한다", async () => {
      const user = userEvent.setup();
      renderOffice(<PropertyCreateScreen />, { role: "OWNER" });
      await fillBasics(user);
      await user.type(screen.getByLabelText("소유자 (선택)"), "김수요");
      await user.click(screen.getAllByRole("button", { name: "검색" })[0] as HTMLElement);
      await user.click(
        (await screen.findAllByRole("button", { name: /^김수요/ }))[0] as HTMLElement,
      );
      expect((screen.getByLabelText("소유자 (선택)") as HTMLInputElement).value).toBe("김수요");
      await user.click(screen.getByRole("button", { name: "임시저장" }));
      await waitFor(() => expect(navigation.push).toHaveBeenCalledTimes(1));
      const created = getMockPropertyState().properties[0];
      expect(created?.ownerOccupants).toHaveLength(1);
      expect(created?.ownerOccupants[0]).toMatchObject({
        customerId: 301,
        customerName: "김수요",
        role: "OWNER",
      });
    });

    it("일치하는 고객이 없으면 고객 관리에서 먼저 등록하라고 안내한다", async () => {
      const user = userEvent.setup();
      renderOffice(<PropertyCreateScreen />, { role: "OWNER" });
      await user.type(screen.getByLabelText("점유자 (선택)"), "없는사람");
      await user.click(screen.getAllByRole("button", { name: "검색" })[1] as HTMLElement);
      expect(await screen.findByText(/고객 관리에서 먼저 등록한 뒤 연결해 주세요/)).not.toBeNull();
    });

    it("진행 중인 거래 제안이 있으면 수정 화면에서 거래 유형과 가격을 잠그고 안내한다", async () => {
      renderOffice(<PropertyEditScreen propertyId={501} />, { role: "OWNER" });
      expect(await screen.findByText(/매물 상세의 거래 제안에서 바꿉니다/)).not.toBeNull();
      expect((screen.getByRole("button", { name: "전세" }) as HTMLButtonElement).disabled).toBe(
        true,
      );
      expect((screen.getByLabelText("가격 (보증금, 원)") as HTMLInputElement).value).toBe(
        "20000000",
      );
      expect(screen.getByText("현재 연결된 고객: 김소유")).not.toBeNull();
    });

    it("제안이 없는 매물은 수정 화면에서 가격을 넣어 거래 제안을 만든다", async () => {
      const user = userEvent.setup();
      renderOffice(<PropertyEditScreen propertyId={502} />, { role: "OWNER" });
      await user.click(await screen.findByRole("button", { name: "매매" }));
      await user.type(screen.getByLabelText("가격 (매매가, 원)"), "250000000");
      await user.click(screen.getByRole("button", { name: "저장" }));
      await waitFor(() => expect(navigation.push).toHaveBeenCalledWith("/properties/502"));
      const saved = getMockPropertyState().properties.find((item) => item.propertyId === 502);
      expect(saved?.offers[0]).toMatchObject({ dealType: "SALE", salePrice: 250_000_000 });
    });
  });

  describe("건물 카테고리 직접 입력", () => {
    it("새 이름을 입력해 카테고리를 만들고 바로 선택한다", async () => {
      const user = userEvent.setup();
      renderOffice(<PropertyCreateScreen />, { role: "OWNER" });
      await screen.findByRole("option", { name: "아파트" });
      await user.click(screen.getByRole("button", { name: "직접 입력해서 추가하기" }));
      await user.type(screen.getByLabelText("새 카테고리 이름"), "창고형 상가");
      await user.click(screen.getByRole("button", { name: "추가" }));
      await waitFor(() =>
        expect(getMockPropertyState().categories.some((item) => item.name === "창고형 상가")).toBe(
          true,
        ),
      );
      const created = getMockPropertyState().categories.find((item) => item.name === "창고형 상가");
      await waitFor(() =>
        expect((screen.getByLabelText(/건물 카테고리/) as HTMLSelectElement).value).toBe(
          String(created?.categoryId),
        ),
      );
      expect(screen.queryByLabelText("새 카테고리 이름")).toBeNull();
    });

    it("이름이 비었거나 중복이면 안내한다", async () => {
      const user = userEvent.setup();
      renderOffice(<PropertyCreateScreen />, { role: "OWNER" });
      await user.click(screen.getByRole("button", { name: "직접 입력해서 추가하기" }));
      await user.click(screen.getByRole("button", { name: "추가" }));
      expect(await screen.findByText("카테고리 이름을 입력해 주세요.")).not.toBeNull();
      await user.type(screen.getByLabelText("새 카테고리 이름"), "주차장");
      await user.click(screen.getByRole("button", { name: "추가" }));
      expect(await screen.findByText("같은 이름의 카테고리가 이미 있습니다.")).not.toBeNull();
    });
  });
});
