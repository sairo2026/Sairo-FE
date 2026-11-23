import { ApiError, ApiNetworkError } from "./api-error";

export type ErrorScreenKind =
  | "unauthenticated"
  | "forbidden"
  | "not-found"
  | "rate-limited"
  | "server"
  | "maintenance"
  | "network"
  | "timeout";

/** 오류를 어떤 공통 오류 화면으로 보여줄지 정한다. 문자열 메시지가 아니라 상태와 코드로 분기한다. */
export function toErrorScreenKind(error: unknown): ErrorScreenKind {
  if (error instanceof ApiNetworkError) return error.kind === "timeout" ? "timeout" : "network";
  if (error instanceof ApiError) {
    if (error.status === 401) return "unauthenticated";
    if (error.status === 403) return "forbidden";
    if (error.status === 404) return "not-found";
    if (error.status === 429) return "rate-limited";
    if (error.status === 503) return "maintenance";
  }
  return "server";
}

const TRANSIENT_GATEWAY_STATUSES = new Set([502, 503, 504]);

/** 서버가 재시작하는 등 잠시 뒤 다시 보내면 풀리는 오류인지 판정한다. 사용자의 취소는 제외한다. */
export function isTransientGatewayError(error: unknown): boolean {
  if (error instanceof ApiNetworkError) return error.kind !== "aborted";
  return error instanceof ApiError && TRANSIENT_GATEWAY_STATUSES.has(error.status);
}
