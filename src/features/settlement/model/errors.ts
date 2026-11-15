import { describeWorkError } from "@/features/home/model/messages";
import { ApiError } from "@/shared/api/client";

export const SETTLEMENT_OUT_OF_RANGE_COPY =
  "조회할 수 있는 기간을 벗어난 달입니다. 사무소를 만든 달부터 이번 달까지만 볼 수 있습니다.";

export function isOutOfRangeMonth(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    error.status === 400 &&
    (error.fieldErrors ?? []).some(
      (item) => item.field === "yearMonth" && item.code === "OUT_OF_RANGE",
    )
  );
}

export function describeSettlementError(error: unknown, fallback: string): string {
  return isOutOfRangeMonth(error)
    ? SETTLEMENT_OUT_OF_RANGE_COPY
    : describeWorkError(error, fallback);
}
