"use client";

import { useState } from "react";
import type { OperatorMemberDetailResponse } from "@/lib/api/contracts/ops.schema";
import { ApiError } from "@/shared/api/client";
import { fieldErrorSummary } from "@/shared/lib/api-messages";
import { DateTimeField } from "@/shared/components/ui/date-time-field";
import { RadioGroup, SelectField } from "@/shared/components/ui/select-field";
import { formatSeoulDateTime } from "@/shared/lib/format";
import { useNow } from "../../auth/model/use-now";
import { OpsReasonDialog } from "../../components/common/ops-reason-dialog";
import { emergencySuspendMember } from "../api/ops-members-api";
import { SUSPEND_SCOPE_LABELS, toSeoulIso } from "../model/member-status";

type Session = OperatorMemberDetailResponse["sessions"][number];

type Props = {
  userId: number;
  sessions: readonly Session[];
  onClose: () => void;
  onDone: (result: { suspendedAt: string; scope: string }) => void;
};

function toFieldMessageError(error: unknown): unknown {
  const message = fieldErrorSummary(error);
  if (error instanceof ApiError && message) {
    return new ApiError(400, { ...error.details, message }, error.requestId);
  }
  return error;
}

/** 열 때마다 새로 만들어 입력값이 남지 않게 한다. 사유 외 입력이 모두 있어야 실행할 수 있다. */
export function EmergencySuspendDialog({ userId, sessions, onClose, onDone }: Props) {
  const [scope, setScope] = useState("ALL_SESSIONS");
  const [sessionId, setSessionId] = useState("");
  const [reviewDate, setReviewDate] = useState("");
  const [reviewTime, setReviewTime] = useState("");

  const now = useNow();
  const reviewAt = toSeoulIso(reviewDate, reviewTime);
  const isFuture = reviewAt !== null && new Date(reviewAt).getTime() > now;
  const needsSession = scope === "SPECIFIC_SESSION";
  const isReady = isFuture && (!needsSession || sessionId !== "");
  const reviewError =
    reviewAt !== null && !isFuture ? "재검토 예정 시각은 지금보다 뒤여야 합니다." : undefined;

  async function submit(reason: string) {
    if (reviewAt === null) return;
    try {
      const result = await emergencySuspendMember(userId, {
        reason,
        scope,
        sessionId: needsSession ? sessionId : null,
        reviewAt,
      });
      onDone({ suspendedAt: result.suspendedAt, scope: result.scope });
    } catch (caught) {
      throw toFieldMessageError(caught);
    }
  }

  return (
    <OpsReasonDialog
      isOpen
      title="긴급 접근 중단"
      confirmLabel="접근 중단 실행"
      reasonLabel="중단 사유"
      reasonHint="계정 탈취 의심 정황 등 중단하는 이유를 적어 주세요."
      isReady={isReady}
      description={
        <p className="text-body text-ink-2">
          실행하면 대상 세션이 즉시 종료되고 소속 사무소 대표에게 통지가 나갑니다. 실행 내용은 감사
          로그에 남으며 되돌릴 수 없습니다. 재검토 예정 시각까지 보안 확인을 마쳐 주세요.
        </p>
      }
      onSubmit={submit}
      onClose={onClose}
    >
      <RadioGroup
        legend="중단 범위"
        name="suspend-scope"
        value={scope}
        onValueChange={(next) => {
          setScope(next);
          setSessionId("");
        }}
        options={[
          { value: "ALL_SESSIONS", label: SUSPEND_SCOPE_LABELS.ALL_SESSIONS ?? "전체 세션" },
          {
            value: "SPECIFIC_SESSION",
            label: SUSPEND_SCOPE_LABELS.SPECIFIC_SESSION ?? "특정 세션",
            isDisabled: sessions.length === 0,
          },
        ]}
      />
      {sessions.length === 0 ? (
        <p className="text-caption text-ink-2">활성 세션이 없어 특정 세션은 선택할 수 없습니다.</p>
      ) : null}
      {needsSession ? (
        <SelectField
          label="종료할 세션"
          value={sessionId}
          placeholder="세션을 선택해 주세요."
          options={sessions.map((session) => ({
            value: session.sessionId,
            label: `${session.deviceSummary} (시작 ${formatSeoulDateTime(session.createdAt)})`,
          }))}
          onValueChange={setSessionId}
          required
        />
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <DateTimeField
          label="재검토 예정 날짜"
          kind="date"
          value={reviewDate}
          onValueChange={setReviewDate}
          required
        />
        <DateTimeField
          label="재검토 예정 시각"
          kind="time"
          value={reviewTime}
          onValueChange={setReviewTime}
          error={reviewError}
          required
        />
      </div>
    </OpsReasonDialog>
  );
}
