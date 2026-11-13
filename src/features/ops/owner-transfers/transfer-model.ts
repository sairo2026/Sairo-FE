import type { OpsStatusMap } from "../components/common/ops-status-badge";

export const TRANSFER_STATUS: OpsStatusMap = {
  PENDING: { label: "수락 대기", tone: "blue" },
  UNDER_REVIEW: { label: "운영자 승인 대기", tone: "amber" },
  COMPLETED: { label: "완료", tone: "green" },
  REJECTED: { label: "거절", tone: "red" },
  WITHDRAWN: { label: "철회", tone: "gray" },
  EXPIRED: { label: "기한 만료", tone: "gray" },
};

export const TRANSFER_ERRORS: Record<string, string> = {
  TRANSFER_PRECONDITION_FAILED:
    "활성 소속, 자격, 등록관계, 사무소 종료 여부를 다시 확인했으나 조건이 맞지 않아 승인하지 못했습니다.",
  INVALID_TRANSITION: "이미 처리된 이전 건입니다. 목록을 새로 고쳐 주세요.",
};
