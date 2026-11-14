import { withQuery } from "@/shared/api/client";

export const opsKeys = {
  all: ["ops"] as const,
  scope: (scope: string, ...rest: unknown[]) => ["ops", scope, ...rest] as const,
};

export type OpsListParams = {
  page: number;
  size: number;
  [key: string]: string | number | boolean | readonly string[] | null | undefined;
};

/** 빈 문자열은 필터가 없는 것으로 보고 뺀다. */
export function opsPath(path: string, params: OpsListParams | Record<string, never> = {}): string {
  const cleaned: Record<string, string | number | boolean | readonly string[] | null | undefined> =
    {};
  for (const [key, value] of Object.entries(params)) {
    cleaned[key] = value === "" ? undefined : value;
  }
  return withQuery(path, cleaned);
}

/** 서버가 준 version 값을 If-Match 헤더 형식으로 바꾼다. */
export function ifMatch(version: number): Record<string, string> {
  return { "If-Match": String(version) };
}
