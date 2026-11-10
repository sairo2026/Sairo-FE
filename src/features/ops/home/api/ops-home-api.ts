import {
  OpsHomeResponseSchema,
  OpsPriceChangeNoticeListResponseSchema,
  OpsTrialEventListResponseSchema,
} from "@/lib/api/contracts/ops.schema";
import { apiFetch } from "@/shared/api/client";
import { opsKeys, opsPath } from "../../api/ops-api";

export const opsHomeKeys = {
  home: opsKeys.scope("home"),
  trialEvents: opsKeys.scope("home", "trial-events"),
  priceNotices: opsKeys.scope("home", "price-change-notices"),
};

export function fetchOpsHome() {
  return apiFetch("/api/ops/home", { schema: OpsHomeResponseSchema });
}

/** 운영 홈 요약 계산용이라 한 번에 많이 읽는다. 상태 필터가 명세에 없어 화면에서 거른다. */
export function fetchTrialEventsForHome() {
  return apiFetch(opsPath("/api/ops/trial-events", { page: 0, size: 100 }), {
    schema: OpsTrialEventListResponseSchema,
  });
}

export function fetchPendingPriceNoticesForHome() {
  return apiFetch(
    opsPath("/api/ops/price-change-notices", { page: 0, size: 100, decision: "PENDING" }),
    {
      schema: OpsPriceChangeNoticeListResponseSchema,
    },
  );
}
