import type { CoordinationStatus } from "../schemas/coordination.schema";

export const coordinationStatusLabels: Record<CoordinationStatus, string> = {
  TENANT_CHECKING: "세입자 확인 중",
  BUYER_DELIVERY_REQUIRED: "구매자 전달 필요",
  BUYER_CHECKING: "구매자 확인 중",
  FINAL_CONFIRMATION_REQUIRED: "최종 확정 필요",
  SCHEDULE_CONFIRMED: "확정 완료",
  VISIT_COMPLETED: "임장 완료",
  CANCELLED: "조율 취소",
};

export const coordinationStatusBadgeClassNames: Record<CoordinationStatus, string> = {
  TENANT_CHECKING: "bg-[#ffdde3] text-[#c8102e]",
  BUYER_DELIVERY_REQUIRED: "bg-[#fff1b8] text-[#8a6100]",
  BUYER_CHECKING: "bg-[#d6f5df] text-[#177245]",
  FINAL_CONFIRMATION_REQUIRED: "bg-[#c9f7ee] text-[#0f7a68]",
  SCHEDULE_CONFIRMED: "bg-[#dbe4ff] text-[#3937b8]",
  VISIT_COMPLETED: "border border-[#dfe3ec] bg-white text-slate-500",
  CANCELLED: "border border-[#dfe3ec] bg-white text-slate-400",
};
