// @vitest-environment jsdom
import { http, HttpResponse } from "msw";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { mockErrors } from "@/mocks/error-responses";
import { server, startMockServer } from "@/mocks/server";
import { ApiContractError, ApiError, ApiNetworkError } from "./api-error";
import { setStepUpHandler, subscribeApiAuthEvents } from "./auth-events";
import type { ApiAuthEvent } from "./auth-events";
import { apiFetch, createRequestId, withQuery } from "./client";
import { toErrorScreenKind } from "./error-kind";

let stopServer: () => void;

beforeAll(() => {
  stopServer = startMockServer();
});

afterEach(() => {
  server.resetHandlers();
  setStepUpHandler(null);
  document.cookie = "XSRF-TOKEN=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
});

afterAll(() => {
  stopServer();
});

const FAST_RETRY = { attempts: 2, baseDelayMs: 1 };

async function catchError(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  throw new Error("오류가 발생해야 한다");
}

describe("apiFetch 성공 응답", () => {
  it("JSON 본문을 돌려주고 요청 ID 헤더와 쿠키 포함 설정을 붙인다", async () => {
    let requestId: string | null = null;
    server.use(
      http.get("/api/ping", ({ request }) => {
        requestId = request.headers.get("X-Request-Id");
        return HttpResponse.json({ ok: true });
      }),
    );
    await expect(apiFetch("/api/ping")).resolves.toEqual({ ok: true });
    expect(requestId).toMatch(/^[\w-]{8,}$/);
  });

  it("204는 undefined를 돌려준다", async () => {
    server.use(http.post("/api/empty", () => new HttpResponse(null, { status: 204 })));
    await expect(apiFetch("/api/empty", { method: "POST" })).resolves.toBeUndefined();
  });

  it("스키마를 주면 응답을 검증하고 어긋나면 계약 오류를 던진다", async () => {
    server.use(http.get("/api/typed", () => HttpResponse.json({ count: "많음" })));
    const error = await catchError(
      apiFetch("/api/typed", { schema: z.object({ count: z.number() }) }),
    );
    expect(error).toBeInstanceOf(ApiContractError);
    expect((error as ApiContractError).issues[0]).toContain("count");
  });

  it("요청 ID는 호출마다 다르다", () => {
    expect(createRequestId()).not.toBe(createRequestId());
  });
});

describe("FormData 본문", () => {
  function captureFetch() {
    const sent: { body: unknown; headers: Record<string, string> | undefined }[] = [];
    const baseFetch = globalThis.fetch;
    vi.stubGlobal("fetch", (input: RequestInfo | URL, init?: RequestInit) => {
      sent.push({ body: init?.body, headers: init?.headers as Record<string, string> });
      return baseFetch(input, init);
    });
    return sent;
  }

  it("FormData는 JSON으로 바꾸지 않고 Content-Type을 지정하지 않는다", async () => {
    const sent = captureFetch();
    server.use(http.post("/api/upload", () => HttpResponse.json({ ok: true })));
    const form = new FormData();
    form.append("evidenceType", "BROKERAGE_LICENSE");
    await expect(apiFetch("/api/upload", { method: "POST", body: form })).resolves.toEqual({
      ok: true,
    });
    vi.unstubAllGlobals();
    expect(sent[0]?.body).toBe(form);
    expect(sent[0]?.headers && "Content-Type" in sent[0].headers).toBe(false);
  });

  it("객체 본문은 계속 JSON으로 보낸다", async () => {
    const sent = captureFetch();
    server.use(http.post("/api/json", () => HttpResponse.json({ ok: true })));
    await apiFetch("/api/json", { method: "POST", body: { a: 1 } });
    vi.unstubAllGlobals();
    expect(sent[0]?.body).toBe('{"a":1}');
    expect(sent[0]?.headers?.["Content-Type"]).toBe("application/json");
  });
});

describe("CSRF와 변경 요청 헤더", () => {
  it("변경 요청에는 쿠키의 토큰을 X-XSRF-TOKEN으로 보낸다", async () => {
    document.cookie = "XSRF-TOKEN=token%2F1; path=/";
    let header: string | null = null;
    server.use(
      http.post("/api/things", ({ request }) => {
        header = request.headers.get("X-XSRF-TOKEN");
        return HttpResponse.json({});
      }),
    );
    await apiFetch("/api/things", { method: "POST", body: { a: 1 } });
    expect(header).toBe("token/1");
  });

  it("조회 요청에는 CSRF 헤더를 보내지 않는다", async () => {
    document.cookie = "XSRF-TOKEN=token1; path=/";
    let header: string | null = "unset";
    server.use(
      http.get("/api/things", ({ request }) => {
        header = request.headers.get("X-XSRF-TOKEN");
        return HttpResponse.json({});
      }),
    );
    await apiFetch("/api/things");
    expect(header).toBeNull();
  });

  it("본문은 JSON으로 보내고 멱등키를 변경 요청에만 붙인다", async () => {
    let contentType: string | null = null;
    let idempotency: string | null = null;
    server.use(
      http.post("/api/things", ({ request }) => {
        contentType = request.headers.get("Content-Type");
        idempotency = request.headers.get("Idempotency-Key");
        return HttpResponse.json({});
      }),
    );
    await apiFetch("/api/things", { method: "POST", body: { a: 1 }, idempotencyKey: "key-1" });
    expect(contentType).toBe("application/json");
    expect(idempotency).toBe("key-1");
  });
});

describe("공통 오류 응답 파싱", () => {
  it("코드·메시지·추적 ID·필드 오류 코드를 읽는다", async () => {
    server.use(
      http.post("/api/forms", () =>
        mockErrors.validation([{ field: "email", code: "FORMAT", message: "형식이 다릅니다" }]),
      ),
    );
    const error = await catchError(apiFetch("/api/forms", { method: "POST", body: {} }));
    expect(error).toBeInstanceOf(ApiError);
    const apiError = error as ApiError;
    expect(apiError.status).toBe(400);
    expect(apiError.code).toBe("INVALID_REQUEST");
    expect(apiError.traceId).toBe("mock-trace-0001");
    expect(apiError.fieldErrors).toEqual([
      { field: "email", code: "FORMAT", message: "형식이 다릅니다" },
    ]);
    expect(apiError.requestId).toBeTruthy();
  });

  it("429는 본문의 retryAfterSeconds를 읽는다", async () => {
    server.use(http.get("/api/limited", () => mockErrors.rateLimited(42)));
    const error = (await catchError(apiFetch("/api/limited"))) as ApiError;
    expect(error.isRateLimited).toBe(true);
    expect(error.retryAfterSeconds).toBe(42);
  });

  it("429 본문에 값이 없으면 Retry-After 헤더를 쓴다", async () => {
    server.use(
      http.get("/api/limited", () =>
        HttpResponse.json(
          { code: "RATE_LIMITED", message: "많음" },
          { status: 429, headers: { "Retry-After": "7" } },
        ),
      ),
    );
    const error = (await catchError(apiFetch("/api/limited"))) as ApiError;
    expect(error.retryAfterSeconds).toBe(7);
  });

  it("방문 신청 한도 초과의 한도 정보와 인증번호 남은 횟수와 버전 충돌의 현재 버전을 읽는다", async () => {
    server.use(
      http.post("/api/quota", () =>
        HttpResponse.json(
          {
            code: "VISIT_REQUEST_QUOTA_EXCEEDED",
            message: "한도 초과",
            quotaScope: "APPROVAL",
            limit: 10,
            current: null,
            retryAfterSeconds: 60,
          },
          { status: 429 },
        ),
      ),
      http.post("/api/verify", () =>
        HttpResponse.json(
          { code: "VERIFICATION_CODE_INVALID", message: "틀림", remainingAttempts: 3 },
          { status: 422 },
        ),
      ),
      http.patch("/api/versioned", () => mockErrors.versionConflict(5)),
    );
    const quota = (await catchError(apiFetch("/api/quota", { method: "POST" }))) as ApiError;
    expect(quota.details.quotaScope).toBe("APPROVAL");
    expect(quota.details.limit).toBe(10);
    expect(quota.details.current).toBeNull();
    const verify = (await catchError(apiFetch("/api/verify", { method: "POST" }))) as ApiError;
    expect(verify.remainingAttempts).toBe(3);
    const conflict = (await catchError(
      apiFetch("/api/versioned", { method: "PATCH" }),
    )) as ApiError;
    expect(conflict.currentVersion).toBe(5);
  });

  it("권한 제한 안내의 actionUrl을 읽는다", async () => {
    server.use(http.get("/api/work", () => mockErrors.reconsentRequired()));
    const error = (await catchError(apiFetch("/api/work", { skipAuthEvents: true }))) as ApiError;
    expect(error.actionUrl).toBe("/reconsent");
  });

  it("형식이 다른 오류 본문은 알 수 없는 오류로 처리한다", async () => {
    server.use(http.get("/api/odd", () => new HttpResponse("<html>", { status: 500 })));
    const error = (await catchError(apiFetch("/api/odd", { retry: false }))) as ApiError;
    expect(error.code).toBe("UNKNOWN_ERROR");
    expect(error.status).toBe(500);
  });
});

describe("전역 인증 이벤트", () => {
  it("401 UNAUTHENTICATED는 세션 만료 이벤트를 알린다", async () => {
    const events: ApiAuthEvent[] = [];
    const unsubscribe = subscribeApiAuthEvents((event) => events.push(event));
    server.use(http.get("/api/work", () => mockErrors.unauthenticated()));
    await catchError(apiFetch("/api/work"));
    unsubscribe();
    expect(events.map((event) => event.type)).toEqual(["session-expired"]);
  });

  it("로그인 실패 401은 세션 만료로 보지 않는다", async () => {
    const listener = vi.fn();
    const unsubscribe = subscribeApiAuthEvents(listener);
    server.use(http.post("/api/auth/login", () => mockErrors.invalidCredentials()));
    await catchError(apiFetch("/api/auth/login", { method: "POST", body: {} }));
    unsubscribe();
    expect(listener).not.toHaveBeenCalled();
  });

  it("403 RECONSENT_REQUIRED는 재동의 이벤트를 알린다", async () => {
    const events: ApiAuthEvent[] = [];
    const unsubscribe = subscribeApiAuthEvents((event) => events.push(event));
    server.use(http.get("/api/work", () => mockErrors.reconsentRequired()));
    await catchError(apiFetch("/api/work"));
    unsubscribe();
    expect(events.map((event) => event.type)).toEqual(["reconsent-required"]);
  });

  it("skipAuthEvents를 주면 이벤트를 알리지 않는다", async () => {
    const listener = vi.fn();
    const unsubscribe = subscribeApiAuthEvents(listener);
    server.use(http.get("/api/work", () => mockErrors.unauthenticated()));
    await catchError(apiFetch("/api/work", { skipAuthEvents: true }));
    unsubscribe();
    expect(listener).not.toHaveBeenCalled();
  });
});

describe("재인증(STEP_UP_REQUIRED) 처리", () => {
  it("재인증에 성공하면 같은 요청을 한 번 다시 보낸다", async () => {
    let calls = 0;
    server.use(
      http.post("/api/payment-method", () => {
        calls += 1;
        return calls === 1 ? mockErrors.stepUpRequired() : HttpResponse.json({ changed: true });
      }),
    );
    const handler = vi.fn().mockResolvedValue(true);
    setStepUpHandler(handler);
    await expect(apiFetch("/api/payment-method", { method: "POST" })).resolves.toEqual({
      changed: true,
    });
    expect(handler).toHaveBeenCalledTimes(1);
    expect(calls).toBe(2);
  });

  it("재인증을 취소하면 원래 오류를 던진다", async () => {
    server.use(http.post("/api/payment-method", () => mockErrors.stepUpRequired()));
    setStepUpHandler(vi.fn().mockResolvedValue(false));
    const error = (await catchError(
      apiFetch("/api/payment-method", { method: "POST" }),
    )) as ApiError;
    expect(error.isStepUpRequired).toBe(true);
  });

  it("재인증 뒤에도 401이면 다시 묻지 않는다", async () => {
    server.use(http.post("/api/payment-method", () => mockErrors.stepUpRequired()));
    const handler = vi.fn().mockResolvedValue(true);
    setStepUpHandler(handler);
    await catchError(apiFetch("/api/payment-method", { method: "POST" }));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("skipStepUp이면 처리기를 부르지 않는다", async () => {
    server.use(http.post("/api/auth/step-up/password", () => mockErrors.stepUpRequired()));
    const handler = vi.fn().mockResolvedValue(true);
    setStepUpHandler(handler);
    await catchError(apiFetch("/api/auth/step-up/password", { method: "POST", skipStepUp: true }));
    expect(handler).not.toHaveBeenCalled();
  });
});

describe("재시도와 시간 초과", () => {
  it("조회는 서버 오류(503)와 연결 실패에 한해 재시도한다", async () => {
    let calls = 0;
    server.use(
      http.get("/api/flaky", () => {
        calls += 1;
        if (calls === 1) return mockErrors.maintenance();
        if (calls === 2) return HttpResponse.error();
        return HttpResponse.json({ ok: true });
      }),
    );
    await expect(apiFetch("/api/flaky", { retry: FAST_RETRY })).resolves.toEqual({ ok: true });
    expect(calls).toBe(3);
  });

  it("재시도 횟수를 넘으면 마지막 오류를 던진다", async () => {
    let calls = 0;
    server.use(
      http.get("/api/down", () => {
        calls += 1;
        return mockErrors.maintenance();
      }),
    );
    const error = (await catchError(apiFetch("/api/down", { retry: FAST_RETRY }))) as ApiError;
    expect(error.status).toBe(503);
    expect(calls).toBe(3);
  });

  it("조회라도 4xx와 429는 재시도하지 않는다", async () => {
    let calls = 0;
    server.use(
      http.get("/api/limited", () => {
        calls += 1;
        return mockErrors.rateLimited(5);
      }),
    );
    await catchError(apiFetch("/api/limited", { retry: FAST_RETRY }));
    expect(calls).toBe(1);
  });

  it("변경 요청은 실패해도 다시 보내지 않는다", async () => {
    let calls = 0;
    server.use(
      http.post("/api/charge", () => {
        calls += 1;
        return mockErrors.maintenance();
      }),
    );
    await catchError(apiFetch("/api/charge", { method: "POST", retry: FAST_RETRY }));
    expect(calls).toBe(1);
  });

  it("retry: false이면 조회도 한 번만 보낸다", async () => {
    let calls = 0;
    server.use(
      http.get("/api/once", () => {
        calls += 1;
        return mockErrors.maintenance();
      }),
    );
    await catchError(apiFetch("/api/once", { retry: false }));
    expect(calls).toBe(1);
  });

  it("연결 실패는 네트워크 오류로 던진다", async () => {
    server.use(http.get("/api/offline", () => HttpResponse.error()));
    const error = await catchError(apiFetch("/api/offline", { retry: false }));
    expect(error).toBeInstanceOf(ApiNetworkError);
    expect(toErrorScreenKind(error)).toBe("network");
  });

  it("시간이 지나면 시간 초과 오류로 던진다", async () => {
    server.use(
      http.get("/api/slow", async () => {
        await new Promise((resolve) => setTimeout(resolve, 200));
        return HttpResponse.json({});
      }),
    );
    const error = (await catchError(
      apiFetch("/api/slow", { timeoutMs: 20, retry: false }),
    )) as ApiNetworkError;
    expect(error).toBeInstanceOf(ApiNetworkError);
    expect(error.kind).toBe("timeout");
  });

  it("호출자가 취소하면 재시도하지 않고 취소 오류로 던진다", async () => {
    let calls = 0;
    server.use(
      http.get("/api/cancel", async () => {
        calls += 1;
        await new Promise((resolve) => setTimeout(resolve, 100));
        return HttpResponse.json({});
      }),
    );
    const controller = new AbortController();
    const pending = catchError(apiFetch("/api/cancel", { signal: controller.signal }));
    setTimeout(() => controller.abort(), 10);
    const error = (await pending) as ApiNetworkError;
    expect(error.kind).toBe("aborted");
    expect(calls).toBe(1);
  });
});

describe("withQuery와 오류 화면 분류", () => {
  it("값이 없는 항목은 빼고 배열은 쉼표로 잇는다", () => {
    expect(
      withQuery("/api/properties", {
        page: 0,
        size: 25,
        status: ["ACTIVE", "DRAFT"],
        q: undefined,
      }),
    ).toBe("/api/properties?page=0&size=25&status=ACTIVE%2CDRAFT");
    expect(withQuery("/api/a?x=1", { y: 2 })).toBe("/api/a?x=1&y=2");
    expect(withQuery("/api/a", { status: [] })).toBe("/api/a");
  });

  it("상태 코드로 오류 화면 종류를 정한다", () => {
    const make = (status: number) => new ApiError(status, { code: "X", message: "m" });
    expect(toErrorScreenKind(make(401))).toBe("unauthenticated");
    expect(toErrorScreenKind(make(403))).toBe("forbidden");
    expect(toErrorScreenKind(make(404))).toBe("not-found");
    expect(toErrorScreenKind(make(429))).toBe("rate-limited");
    expect(toErrorScreenKind(make(503))).toBe("maintenance");
    expect(toErrorScreenKind(make(500))).toBe("server");
    expect(toErrorScreenKind(new Error("x"))).toBe("server");
  });
});
