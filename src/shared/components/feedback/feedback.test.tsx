// @vitest-environment jsdom
import { QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/shared/api/client";
import { createQueryClient } from "@/shared/api/query-client";
import { normalizeLinkToken } from "@/shared/lib/link-token";
import { EmptyState } from "./empty-state";
import { audienceForPath } from "./error-audience";
import { ERROR_SCREEN_COPY, ErrorScreen } from "./error-screen";
import { ListSkeleton, PageSkeleton } from "./skeleton";
import { TokenResourceView } from "./token-resource-view";
import type { ErrorScreenKind } from "@/shared/api/error-kind";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const KINDS: ErrorScreenKind[] = [
  "unauthenticated",
  "forbidden",
  "not-found",
  "rate-limited",
  "server",
  "maintenance",
  "network",
];

describe("ErrorScreen", () => {
  it("운영자와 비회원 링크 경로를 각각 해당 오류 안내 대상으로 분류한다", () => {
    expect(audienceForPath("/ops/billing")).toBe("ops");
    expect(audienceForPath("/approver/token")).toBe("guest");
    expect(audienceForPath("/visit-responses/token")).toBe("guest");
    expect(audienceForPath("/home")).toBe("office");
  });

  it.each(KINDS)("%s 화면은 제목과 안내 문구를 보여준다", (kind) => {
    render(<ErrorScreen kind={kind} />);
    expect(screen.getByRole("heading", { name: ERROR_SCREEN_COPY[kind].title })).not.toBeNull();
    expect(screen.getByText(ERROR_SCREEN_COPY[kind].description)).not.toBeNull();
  });

  it("미로그인 화면은 로그인 링크를, 권한 없음은 홈 링크를 준다", () => {
    const { unmount } = render(<ErrorScreen kind="unauthenticated" />);
    expect(screen.getByRole("link", { name: "로그인하기" }).getAttribute("href")).toBe("/login");
    unmount();
    render(<ErrorScreen kind="forbidden" />);
    expect(screen.getByRole("link", { name: "홈으로" }).getAttribute("href")).toBe("/");
  });

  it("추적 번호를 문의 번호로 보여준다", () => {
    render(<ErrorScreen kind="server" traceId="trace-9" />);
    expect(screen.getByText("문의 번호: trace-9")).not.toBeNull();
  });

  it("서버 오류와 네트워크 오류는 경고로 알린다", () => {
    render(<ErrorScreen kind="network" />);
    expect(screen.getByRole("alert")).not.toBeNull();
  });

  it("다시 시도를 누르면 호출한다", async () => {
    const onRetry = vi.fn();
    render(<ErrorScreen kind="server" onRetry={onRetry} />);
    await userEvent.click(screen.getByRole("button", { name: "다시 시도" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("429는 대기 시간이 끝나기 전까지 다시 시도를 막고 남은 시간을 센다", () => {
    vi.useFakeTimers();
    const onRetry = vi.fn();
    render(<ErrorScreen kind="rate-limited" retryAfterSeconds={3} onRetry={onRetry} />);
    const button = screen.getByRole("button", { name: "다시 시도" });
    expect(screen.getByText("3초 뒤에 다시 시도할 수 있습니다.")).not.toBeNull();
    expect(button.getAttribute("aria-disabled")).toBe("true");

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByText("2초 뒤에 다시 시도할 수 있습니다.")).not.toBeNull();

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.queryByText(/초 뒤에 다시 시도/)).toBeNull();
    expect(button.getAttribute("aria-disabled")).toBeNull();
  });
});

describe("빈 상태와 로딩", () => {
  it("빈 상태는 제목과 설명과 동작을 보여준다", () => {
    render(
      <EmptyState
        title="매물이 없습니다"
        description="새 매물을 등록해 보세요."
        action={<button>등록</button>}
      />,
    );
    expect(screen.getByText("매물이 없습니다")).not.toBeNull();
    expect(screen.getByText("새 매물을 등록해 보세요.")).not.toBeNull();
    expect(screen.getByRole("button", { name: "등록" })).not.toBeNull();
  });

  it("스켈레톤은 진행 중임을 한 번만 알린다", () => {
    render(
      <>
        <PageSkeleton label="화면을 불러오는 중" />
        <ListSkeleton rows={3} label="목록을 불러오는 중" />
      </>,
    );
    const statuses = screen.getAllByRole("status");
    expect(statuses).toHaveLength(2);
    expect(statuses[0]?.getAttribute("aria-busy")).toBe("true");
    expect(screen.getByText("화면을 불러오는 중")).not.toBeNull();
    expect(statuses[1]?.querySelectorAll("[aria-hidden]").length).toBe(3);
  });
});

describe("링크 토큰 형식", () => {
  it("형식이 맞는 토큰만 돌려준다", () => {
    expect(normalizeLinkToken("abcdEFGH12345678")).toBe("abcdEFGH12345678");
    expect(normalizeLinkToken("MTIzOjE3NjI5MDAwMDAwMDA.c2lnbmF0dXJlLXZhbHVl")).toBe(
      "MTIzOjE3NjI5MDAwMDAwMDA.c2lnbmF0dXJlLXZhbHVl",
    );
    expect(normalizeLinkToken("a".repeat(513))).toBeNull();
    expect(normalizeLinkToken(" abcdEFGH12345678 ")).toBe("abcdEFGH12345678");
    expect(normalizeLinkToken("짧다")).toBeNull();
    expect(normalizeLinkToken("abc/../defghijklmnop")).toBeNull();
    expect(normalizeLinkToken("%E0%A4%A")).toBeNull();
    expect(normalizeLinkToken(undefined)).toBeNull();
  });
});

describe("TokenResourceView", () => {
  function renderView(token: string | undefined, fetcher: (token: string) => Promise<string>) {
    render(
      <QueryClientProvider client={createQueryClient()}>
        <TokenResourceView token={token} queryKey={["link", "test"]} fetcher={fetcher}>
          {(resource) => <p>{resource}</p>}
        </TokenResourceView>
      </QueryClientProvider>,
    );
  }

  it("형식이 틀린 토큰은 서버에 묻지 않고 열 수 없는 링크로 안내한다", () => {
    const fetcher = vi.fn();
    renderView("x", fetcher);
    expect(screen.getByRole("heading", { name: "링크를 열 수 없습니다" })).not.toBeNull();
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("불러오는 동안 스켈레톤을 보이고 성공하면 내용을 보여준다", async () => {
    renderView("abcdEFGH12345678", () => Promise.resolve("응답 내용"));
    expect(screen.getByRole("status")).not.toBeNull();
    await waitFor(() => expect(screen.getByText("응답 내용")).not.toBeNull());
  });

  it("서버가 404를 주면 형식 오류와 같은 문구로 안내한다", async () => {
    renderView("abcdEFGH12345678", () =>
      Promise.reject(new ApiError(404, { code: "RESOURCE_NOT_FOUND", message: "없음" })),
    );
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "링크를 열 수 없습니다" })).not.toBeNull(),
    );
  });

  it("429는 대기 시간을 알리고 그 밖의 오류는 오류 화면으로 보여준다", async () => {
    renderView("abcdEFGH12345678", () =>
      Promise.reject(
        new ApiError(429, { code: "RATE_LIMITED", message: "많음", retryAfterSeconds: 30 }),
      ),
    );
    await waitFor(() =>
      expect(screen.getByText("30초 뒤에 다시 시도할 수 있습니다.")).not.toBeNull(),
    );
  });
});
