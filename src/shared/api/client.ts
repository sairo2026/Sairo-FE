import { API_ERROR_CODES, ApiErrorBodySchema } from "@/lib/api/contracts/errors";
import type { ZodType } from "zod";
import { ApiContractError, ApiError, ApiNetworkError } from "./api-error";
import type { ApiErrorInput, FieldErrorItem } from "./api-error";
import { emitApiAuthEvent, getStepUpHandler } from "./auth-events";

export { ApiContractError, ApiError, ApiNetworkError };
export type { ApiErrorInput as ApiErrorBody, FieldErrorItem };

const CSRF_COOKIE_NAME = "XSRF-TOKEN";
const CSRF_HEADER_NAME = "X-XSRF-TOKEN";
const REQUEST_ID_HEADER = "X-Request-Id";
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const RETRYABLE_METHODS = new Set(["GET", "HEAD"]);
const RETRYABLE_STATUSES = new Set([502, 503, 504]);
const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_RETRY = { attempts: 2, baseDelayMs: 300 };

export function parseCookieValue(cookieHeader: string, name: string): string | null {
  for (const cookie of cookieHeader.split("; ")) {
    const separatorIndex = cookie.indexOf("=");
    if (separatorIndex === -1) continue;
    if (cookie.slice(0, separatorIndex) === name) {
      return decodeURIComponent(cookie.slice(separatorIndex + 1));
    }
  }
  return null;
}

function readCsrfToken(): string | null {
  if (typeof document === "undefined") return null;
  return parseCookieValue(document.cookie, CSRF_COOKIE_NAME);
}

/** 서버는 /api 요청을 한 번 받아야 CSRF 쿠키를 내려준다. 쿠키가 없으면 공개 조회로 먼저 받는다. */
const CSRF_PRIMING_PATH = "/api/terms?context=SIGNUP";
let csrfPriming: Promise<void> | null = null;

async function ensureCsrfToken(): Promise<string | null> {
  const existing = readCsrfToken();
  if (existing !== null || typeof document === "undefined") return existing;
  csrfPriming ??= fetch(CSRF_PRIMING_PATH, {
    credentials: "include",
    headers: { [REQUEST_ID_HEADER]: createRequestId() },
  })
    .then(
      () => undefined,
      () => undefined,
    )
    .finally(() => {
      csrfPriming = null;
    });
  await csrfPriming;
  return readCsrfToken();
}

export function createRequestId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `req-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

type QueryValue = string | number | boolean | readonly string[] | null | undefined;

/** 값이 없는 항목은 빼고 배열은 쉼표로 이어 쿼리 문자열을 붙인다. */
export function withQuery(path: string, params: Record<string, QueryValue>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    if (typeof value === "object") {
      if (value.length > 0) search.set(key, value.join(","));
      continue;
    }
    search.set(key, String(value));
  }
  const query = search.toString();
  if (query === "") return path;
  return `${path}${path.includes("?") ? "&" : "?"}${query}`;
}

export type RetryOptions = { attempts?: number; baseDelayMs?: number };

export type ApiFetchOptions<T = unknown> = Omit<RequestInit, "body" | "signal"> & {
  body?: unknown;
  signal?: AbortSignal;
  timeoutMs?: number;
  /** 조회(GET, HEAD)에만 적용한다. 변경 요청은 중복 실행을 피하려고 다시 보내지 않는다. */
  retry?: false | RetryOptions;
  /** 성공 응답을 이 스키마로 검증한다. */
  schema?: ZodType<T>;
  idempotencyKey?: string;
  /** 세션 만료와 재동의 전역 처리를 건너뛴다. 접근 상태를 직접 확인하는 요청에 쓴다. */
  skipAuthEvents?: boolean;
  /** 재인증 처리를 건너뛴다. 재인증 요청 자체에 쓴다. */
  skipStepUp?: boolean;
};

function buildErrorInput(status: number, parsed: unknown, response: Response): ApiErrorInput {
  const result = ApiErrorBodySchema.safeParse(parsed);
  const retryAfterHeader = Number(response.headers.get("Retry-After"));
  const retryAfterFallback =
    status === 429 && Number.isFinite(retryAfterHeader) && retryAfterHeader > 0
      ? retryAfterHeader
      : undefined;
  if (result.success) {
    return {
      ...result.data,
      retryAfterSeconds: result.data.retryAfterSeconds ?? retryAfterFallback,
    };
  }
  const record = typeof parsed === "object" && parsed !== null ? parsed : {};
  const code = "code" in record && typeof record.code === "string" ? record.code : null;
  const message = "message" in record && typeof record.message === "string" ? record.message : null;
  return {
    code: code ?? API_ERROR_CODES.unknown,
    message: message ?? "요청을 처리하지 못했습니다.",
    retryAfterSeconds: retryAfterFallback,
  };
}

function errorName(error: unknown): string | undefined {
  return typeof error === "object" && error !== null && "name" in error
    ? String(error.name)
    : undefined;
}

function toNetworkError(error: unknown, requestId: string, callerSignal?: AbortSignal) {
  if (errorName(error) === "TimeoutError") {
    return new ApiNetworkError("timeout", requestId);
  }
  if (callerSignal?.aborted) return new ApiNetworkError("aborted", requestId);
  if (errorName(error) === "AbortError") {
    return new ApiNetworkError("aborted", requestId);
  }
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return new ApiNetworkError("offline", requestId);
  }
  return new ApiNetworkError("network", requestId);
}

function combineSignals(timeoutMs: number, callerSignal?: AbortSignal): AbortSignal {
  const timeoutSignal = AbortSignal.timeout(timeoutMs);
  return callerSignal ? AbortSignal.any([callerSignal, timeoutSignal]) : timeoutSignal;
}

const CLIENT_ONLY_KEYS = new Set([
  "body",
  "headers",
  "signal",
  "method",
  "timeoutMs",
  "retry",
  "schema",
  "idempotencyKey",
  "skipAuthEvents",
  "skipStepUp",
]);

/** fetch에 그대로 넘길 수 있는 옵션만 남긴다. */
function toFetchInit(options: ApiFetchOptions<unknown>): RequestInit {
  return Object.fromEntries(
    Object.entries(options).filter(([key]) => !CLIENT_ONLY_KEYS.has(key)),
  ) as RequestInit;
}

async function sendOnce<T>(
  path: string,
  options: ApiFetchOptions<T>,
  requestId: string,
  hasRetriedAfterStepUp: boolean,
): Promise<unknown> {
  const { body, headers, signal, method, timeoutMs, idempotencyKey, skipAuthEvents, skipStepUp } =
    options;
  const isMutating = method !== undefined && !SAFE_METHODS.has(method.toUpperCase());
  const csrfToken = isMutating ? await ensureCsrfToken() : null;

  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
  let response: Response;
  try {
    response = await fetch(path, {
      ...toFetchInit(options),
      method,
      credentials: "include",
      signal: combineSignals(timeoutMs ?? DEFAULT_TIMEOUT_MS, signal),
      headers: {
        ...(body !== undefined && !isFormData ? { "Content-Type": "application/json" } : {}),
        ...(csrfToken !== null ? { [CSRF_HEADER_NAME]: csrfToken } : {}),
        ...(isMutating && idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
        [REQUEST_ID_HEADER]: requestId,
        ...headers,
      },
      body: body === undefined ? undefined : isFormData ? body : JSON.stringify(body),
    });
  } catch (error) {
    throw toNetworkError(error, requestId, signal);
  }

  if (!response.ok) {
    const parsed: unknown = await response.json().catch(() => null);
    const error = new ApiError(
      response.status,
      buildErrorInput(response.status, parsed, response),
      requestId,
    );

    const stepUpHandler = getStepUpHandler();
    if (error.isStepUpRequired && !skipStepUp && !hasRetriedAfterStepUp && stepUpHandler) {
      if (await stepUpHandler()) return sendOnce(path, options, requestId, true);
      throw error;
    }
    if (!skipAuthEvents) {
      if (error.isSessionExpired) emitApiAuthEvent({ type: "session-expired", error });
      else if (error.isReconsentRequired) emitApiAuthEvent({ type: "reconsent-required", error });
    }
    throw error;
  }

  if (response.status === 204) return undefined;
  return response.json();
}

function isRetryable(error: unknown): boolean {
  if (error instanceof ApiNetworkError) return error.kind !== "aborted";
  return error instanceof ApiError && RETRYABLE_STATUSES.has(error.status);
}

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export async function apiFetch<T = unknown>(
  path: string,
  options: ApiFetchOptions<T> = {},
): Promise<T> {
  const method = (options.method ?? "GET").toUpperCase();
  const retry =
    options.retry === false || !RETRYABLE_METHODS.has(method)
      ? null
      : { ...DEFAULT_RETRY, ...options.retry };
  const requestId = createRequestId();

  let data: unknown;
  for (let attempt = 0; ; attempt += 1) {
    try {
      data = await sendOnce(path, options, requestId, false);
      break;
    } catch (error) {
      if (retry === null || attempt >= retry.attempts || !isRetryable(error)) throw error;
      await wait(retry.baseDelayMs * 2 ** attempt);
    }
  }

  if (options.schema) {
    const result = options.schema.safeParse(data);
    if (!result.success) {
      throw new ApiContractError(
        path,
        result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`),
      );
    }
    return result.data;
  }
  return data as T;
}
