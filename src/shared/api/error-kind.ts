import { ApiError, ApiNetworkError } from "./api-error";

export type ErrorScreenKind =
  | "unauthenticated"
  | "forbidden"
  | "not-found"
  | "rate-limited"
  | "server"
  | "maintenance"
  | "network";

/** 오류를 어떤 공통 오류 화면으로 보여줄지 정한다. 문자열 메시지가 아니라 상태와 코드로 분기한다. */
export function toErrorScreenKind(error: unknown): ErrorScreenKind {
  if (error instanceof ApiNetworkError) return "network";
  if (error instanceof ApiError) {
    if (error.status === 401) return "unauthenticated";
    if (error.status === 403) return "forbidden";
    if (error.status === 404) return "not-found";
    if (error.status === 429) return "rate-limited";
    if (error.status === 503) return "maintenance";
  }
  return "server";
}
