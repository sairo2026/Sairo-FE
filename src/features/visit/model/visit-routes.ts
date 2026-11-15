import { isCoordinationStatus } from "./labels";
import type { CoordinationStatus } from "./labels";

/**
 * 방문 조율 화면이 받는 쿼리 규칙과 그 주소를 만드는 함수다.
 * 홈 상태 태그, 매물·고객 상세의 시작 링크, 알림 이동은 이 함수로 주소를 만들면 규칙이 어긋나지 않는다.
 *
 * - `/coordinations?status=<조율 상태>`: 목록을 그 상태로 거른다. 알 수 없는 값은 무시한다.
 * - `/coordinations/new?propertyId=<매물 번호>&customerId=<고객 번호>`: 조율 만들기에서 후보 매물과 고객을 미리 고른다.
 * - `/coordinations/<번호>/requests?status=<신청 상태>`: 신청 현황을 그 상태로 거른다.
 */

type Param = string | string[] | undefined;

function first(value: Param): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function parseStatusParam(value: Param): CoordinationStatus | undefined {
  const text = first(value);
  return text !== undefined && isCoordinationStatus(text) ? text : undefined;
}

export function parseIdParam(value: Param): number | undefined {
  const text = first(value);
  if (text === undefined || !/^\d+$/.test(text)) return undefined;
  const id = Number(text);
  return Number.isSafeInteger(id) && id >= 1 ? id : undefined;
}

export function coordinationListPath(status?: CoordinationStatus): string {
  return status ? `/coordinations?status=${status}` : "/coordinations";
}

export function coordinationCreatePath(
  target: { propertyId?: number; customerId?: number } = {},
): string {
  const query = new URLSearchParams();
  if (target.propertyId !== undefined) query.set("propertyId", String(target.propertyId));
  if (target.customerId !== undefined) query.set("customerId", String(target.customerId));
  const text = query.toString();
  return text ? `/coordinations/new?${text}` : "/coordinations/new";
}

export function coordinationRequestsPath(coordinationId: number, status?: string): string {
  const base = `/coordinations/${coordinationId}/requests`;
  return status ? `${base}?status=${status}` : base;
}
