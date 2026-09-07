const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

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

export function getApiBaseUrl(): string {
  return API_BASE_URL;
}

type ApiFetchOptions = Omit<RequestInit, "body"> & { body?: unknown };

export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const { body, headers, signal, ...rest } = options;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    credentials: "include",
    signal: signal ?? AbortSignal.timeout(10_000),
    headers: {
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
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
