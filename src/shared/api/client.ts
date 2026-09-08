export type FieldErrorItem = {
  field: string;
  message: string;
};

export type ApiErrorBody = {
  code: string;
  message: string;
  traceId: string;
  fieldErrors?: FieldErrorItem[];
};

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly traceId: string;
  readonly fieldErrors?: FieldErrorItem[];

  constructor(status: number, body: ApiErrorBody) {
    super(body.message);
    this.status = status;
    this.code = body.code;
    this.traceId = body.traceId;
    this.fieldErrors = body.fieldErrors;
  }
}

function isApiErrorBody(value: unknown): value is ApiErrorBody {
  return (
    typeof value === "object" &&
    value !== null &&
    "code" in value &&
    "message" in value &&
    "traceId" in value
  );
}

const CSRF_COOKIE_NAME = "XSRF-TOKEN";
const CSRF_HEADER_NAME = "X-XSRF-TOKEN";
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

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

type ApiFetchOptions = Omit<RequestInit, "body"> & { body?: unknown };

export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const { body, headers, signal, method, ...rest } = options;
  const isMutating = method !== undefined && !SAFE_METHODS.has(method.toUpperCase());
  const csrfToken = isMutating ? readCsrfToken() : null;

  const response = await fetch(path, {
    ...rest,
    method,
    credentials: "include",
    signal: signal ?? AbortSignal.timeout(10_000),
    headers: {
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(csrfToken !== null ? { [CSRF_HEADER_NAME]: csrfToken } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const parsed: unknown = await response.json().catch(() => null);
    const errorBody: ApiErrorBody = isApiErrorBody(parsed)
      ? parsed
      : { code: "UNKNOWN_ERROR", message: "요청을 처리하지 못했습니다.", traceId: "" };
    throw new ApiError(response.status, errorBody);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
