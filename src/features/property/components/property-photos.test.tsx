// @vitest-environment jsdom
import { cleanup, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http } from "msw";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { mockErrors } from "@/mocks/error-responses";
import {
  buildMockProperty,
  getMockPropertyState,
  resetMockPropertyState,
  setMockPropertyState,
} from "@/mocks/handlers/property";
import { server, startMockServer } from "@/mocks/server";
import { renderOffice } from "@/shared/testing/office-render";
import { PropertyEditScreen } from "./property-form-screen";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/properties/501/edit",
}));

let stopServer: () => void;

beforeAll(() => {
  stopServer = startMockServer();
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
  resetMockPropertyState();
});

afterAll(() => stopServer());

function withPhoto() {
  setMockPropertyState({
    properties: [
      buildMockProperty({
        propertyId: 501,
        name: "사진 매물",
        photos: [
          {
            photoId: 9001,
            objectKey: "properties/501/photo1.jpg",
            description: "거실",
            sortOrder: 1,
            url: "https://storage.example.com/signed/photo1.jpg",
            urlExpiresAt: "2026-11-10T09:10:00+09:00",
          },
        ],
      }),
    ],
  });
}

describe("매물 사진 관리", () => {
  it("등록된 사진을 바로 미리보기로 보여준다", async () => {
    withPhoto();
    renderOffice(<PropertyEditScreen propertyId={501} />, { role: "OWNER" });
    expect(await screen.findByAltText("거실")).not.toBeNull();
    expect(screen.getByDisplayValue("거실")).not.toBeNull();
  });

  it("사진을 올리면 목록에 바로 나타난다", async () => {
    withPhoto();
    const user = userEvent.setup();
    renderOffice(<PropertyEditScreen propertyId={501} />, { role: "OWNER" });
    await screen.findByAltText("거실");
    await user.upload(
      screen.getByLabelText("사진 파일 선택"),
      new File(["x"], "주방.png", { type: "image/png" }),
    );
    await waitFor(() => expect(getMockPropertyState().properties[0]?.photos).toHaveLength(2));
    expect(await screen.findAllByLabelText("사진 설명")).toHaveLength(2);
  });

  it("설명과 정렬 순서를 고쳐 저장한다", async () => {
    withPhoto();
    const user = userEvent.setup();
    renderOffice(<PropertyEditScreen propertyId={501} />, { role: "OWNER" });
    const description = await screen.findByDisplayValue("거실");
    await user.clear(description);
    await user.type(description, "넓은 거실");
    const save = screen.getByRole("button", { name: "설명·순서 저장" });
    await user.click(save);
    await waitFor(() =>
      expect(getMockPropertyState().properties[0]?.photos[0]?.description).toBe("넓은 거실"),
    );
  });

  it("설명과 정렬 순서를 저장할 때 현재 매물 버전을 If-Match로 보낸다", async () => {
    withPhoto();
    const sent: Array<string | null> = [];
    server.use(
      http.patch("/api/properties/501/photos/9001", ({ request }) => {
        sent.push(request.headers.get("If-Match"));
        return undefined;
      }),
    );
    const version = getMockPropertyState().properties[0]?.version ?? 0;
    const user = userEvent.setup();
    renderOffice(<PropertyEditScreen propertyId={501} />, { role: "OWNER" });
    const description = await screen.findByDisplayValue("거실");
    await user.clear(description);
    await user.type(description, "밝은 거실");
    await user.click(screen.getByRole("button", { name: "설명·순서 저장" }));
    await waitFor(() => expect(sent).toEqual([String(version)]));
    await waitFor(() => expect(getMockPropertyState().properties[0]?.version).toBe(version + 1));
  });

  it("다른 사용자가 먼저 매물을 바꿨으면 버전 충돌 안내를 보여준다", async () => {
    withPhoto();
    server.use(http.patch("/api/properties/501/photos/9001", () => mockErrors.versionConflict(9)));
    const user = userEvent.setup();
    renderOffice(<PropertyEditScreen propertyId={501} />, { role: "OWNER" });
    const description = await screen.findByDisplayValue("거실");
    await user.clear(description);
    await user.type(description, "밝은 거실");
    await user.click(screen.getByRole("button", { name: "설명·순서 저장" }));
    expect(await screen.findByText(/다른 사용자가 먼저 수정했습니다/)).not.toBeNull();
  });

  it("정렬 순서가 숫자가 아니면 저장 버튼이 막힌다", async () => {
    withPhoto();
    const user = userEvent.setup();
    renderOffice(<PropertyEditScreen propertyId={501} />, { role: "OWNER" });
    const order = await screen.findByLabelText("정렬 순서");
    await user.clear(order);
    expect(screen.getByText("1 이상의 숫자로 입력해 주세요.")).not.toBeNull();
    expect(
      screen.getByRole("button", { name: "설명·순서 저장" }).getAttribute("aria-disabled"),
    ).toBe("true");
  });

  it("사진을 삭제한다", async () => {
    withPhoto();
    const user = userEvent.setup();
    renderOffice(<PropertyEditScreen propertyId={501} />, { role: "OWNER" });
    await user.click(await screen.findByRole("button", { name: "사진 삭제" }));
    expect(await screen.findByText("등록된 사진이 없습니다.")).not.toBeNull();
  });

  it("서버가 업로드를 거절하면 오류 문구를 보여준다", async () => {
    withPhoto();
    server.use(
      http.post("/api/properties/501/photos", () =>
        mockErrors.validation([{ field: "file", message: "사진은 20장까지 올릴 수 있습니다." }]),
      ),
    );
    const user = userEvent.setup();
    renderOffice(<PropertyEditScreen propertyId={501} />, { role: "OWNER" });
    await screen.findByAltText("거실");
    await user.upload(
      screen.getByLabelText("사진 파일 선택"),
      new File(["x"], "주방.png", { type: "image/png" }),
    );
    expect(await screen.findByText("사진을 처리하지 못했습니다.")).not.toBeNull();
  });
});
