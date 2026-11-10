"use client";

import { useEffect, useState } from "react";
import { QueryGate } from "@/shared/components/feedback/query-gate";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { ConfirmDialog } from "@/shared/components/ui/modal";
import { formatSeoulDateTime } from "@/shared/lib/format";
import { OpsDetailList } from "../components/common/ops-detail-list";
import { OpsReasonDialog } from "../components/common/ops-reason-dialog";
import { OpsScreen } from "../components/common/ops-screen";
import { OpsStatusBadge } from "../components/common/ops-status-badge";
import { useHasOpsRole, useOpsSession } from "../model/ops-session";
import { saveBlob, useRawAccessActions, useRawAccessDetail } from "./raw-access-api";
import {
  ACCESS_WINDOW_MINUTES,
  APPROVAL_VALID_HOURS,
  BASIS_TYPE_LABELS,
  RAW_ACCESS_STATUS,
  REQUEST_TYPE_LABELS,
  TARGET_TYPE_LABELS,
  describeRawAccessError,
  executorId,
  grantState,
  isApprovalExpired,
  isRevocable,
  remainingMinutes,
} from "./raw-access-model";
import type { RawAccessDetail } from "./raw-access-model";

type Notice = { tone: "ok" | "error"; text: string };
type DialogKind = "execute" | "reject" | "revoke" | "approve" | null;

function useNow(intervalMs: number, refreshKey: unknown): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const refresh = setTimeout(() => setNow(Date.now()), 0);
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => {
      clearTimeout(refresh);
      clearInterval(timer);
    };
  }, [intervalMs, refreshKey]);
  return now;
}

function optionalTime(value: string | null | undefined): string {
  return value ? formatSeoulDateTime(value) : "-";
}

function RecordCard({ detail }: { detail: RawAccessDetail }) {
  const grant = detail.grant;
  return (
    <Card title="요청과 승인 기록">
      <OpsDetailList
        items={[
          {
            label: "상태",
            value: <OpsStatusBadge status={detail.status} map={RAW_ACCESS_STATUS} />,
          },
          {
            label: "요청 종류",
            value: REQUEST_TYPE_LABELS[detail.requestType] ?? detail.requestType,
          },
          {
            label: "대상",
            value: `${TARGET_TYPE_LABELS[detail.targetType] ?? detail.targetType}${detail.targetId ? ` ${detail.targetId}` : ""}`,
          },
          { label: "대상 사무소", value: detail.officeId },
          { label: "열람 사유", value: detail.purpose },
          { label: "범위", value: detail.scope },
          { label: "근거 종류", value: BASIS_TYPE_LABELS[detail.basisType] ?? detail.basisType },
          { label: "근거 내용", value: detail.basisNote },
          { label: "연결 문의", value: detail.linkedInquiryId },
          { label: "요청자", value: detail.requestedByName },
          { label: "요청 시각", value: formatSeoulDateTime(detail.createdAt) },
          { label: "수혜자 운영자 ID", value: detail.beneficiaryOperatorId },
          { label: "승인자", value: detail.approvedByName },
          { label: "승인 시각", value: optionalTime(detail.approvedAt) },
          { label: "승인 만료 시각", value: optionalTime(detail.expiresAt) },
          { label: "실행 시각", value: optionalTime(grant?.executedAt) },
          ...(detail.status === "REJECTED"
            ? [
                { label: "거절한 사람", value: detail.rejectedByName },
                { label: "거절 시각", value: optionalTime(detail.rejectedAt) },
                { label: "거절 사유", value: detail.rejectReason },
              ]
            : []),
        ]}
      />
    </Card>
  );
}

function AccessCard({
  detail,
  now,
  isExecutor,
  canRevoke,
  onDownload,
  onRevoke,
  isDownloading,
}: {
  detail: RawAccessDetail;
  now: number;
  isExecutor: boolean;
  canRevoke: boolean;
  onDownload: () => void;
  onRevoke: () => void;
  isDownloading: boolean;
}) {
  const grant = detail.grant;
  if (!grant) return null;
  const state = grantState(detail, now);
  const isDownload = detail.requestType === "RAW_DOWNLOAD";
  return (
    <Card title="접근 창">
      <div className="flex flex-col gap-3">
        <OpsDetailList
          items={[
            { label: "접근 창 만료 시각", value: formatSeoulDateTime(grant.expiresAt) },
            ...(isDownload
              ? [
                  {
                    label: "파일 크기",
                    value:
                      grant.fileSize !== null && grant.fileSize !== undefined
                        ? `${grant.fileSize.toLocaleString("ko-KR")} 바이트`
                        : "-",
                  },
                  { label: "파일 해시(SHA-256)", value: grant.fileSha256 },
                  { label: "내려받은 시각", value: optionalTime(grant.downloadedAt) },
                ]
              : []),
            ...(grant.revokedAt
              ? [
                  { label: "회수 시각", value: formatSeoulDateTime(grant.revokedAt) },
                  { label: "회수한 사람", value: grant.revokedByName },
                  { label: "회수 사유", value: grant.revokeReason },
                ]
              : []),
          ]}
        />
        {state === "ACTIVE" ? (
          <p role="status" className="text-body font-semibold text-ink">
            남은 접근 시간 {remainingMinutes(grant.expiresAt, now)}분
          </p>
        ) : null}
        {state === "EXPIRED" ? (
          <p role="status" className="text-body text-ink-2">
            접근 시간 {ACCESS_WINDOW_MINUTES}분이 지나 만료되었습니다.
          </p>
        ) : null}
        {state === "REVOKED" ? (
          <p role="status" className="text-body text-danger">
            회수된 접근입니다. 열람과 파일 전달이 막혀 있습니다.
          </p>
        ) : null}
        {state === "DOWNLOADED" ? (
          <p role="status" className="text-body text-ink-2">
            이미 받은 파일입니다. 파일은 한 번만 받을 수 있어 다시 받을 수 없습니다.
          </p>
        ) : null}
        {isDownload ? (
          <p className="text-caption text-ink-2">
            파일은 한 번만 받을 수 있습니다. 받기 직전에 5분 이내 재인증이 필요하며 공개 주소는
            만들어지지 않습니다.
          </p>
        ) : null}
        <div className="flex flex-wrap gap-3">
          {isDownload && isExecutor ? (
            <Button disabled={state !== "ACTIVE"} isLoading={isDownloading} onClick={onDownload}>
              파일 받기
            </Button>
          ) : null}
          {canRevoke ? (
            <Button variant="ghost" onClick={onRevoke}>
              접근 회수
            </Button>
          ) : null}
        </div>
      </div>
    </Card>
  );
}

function RawAccessBody({ detail }: { detail: RawAccessDetail }) {
  const session = useOpsSession();
  const isPrivacy = useHasOpsRole(["PRIVACY"]);
  const isSecurityAdmin = useHasOpsRole(["SECURITY_ADMIN"]);
  const now = useNow(30_000, detail);
  const actions = useRawAccessActions(detail.requestId);
  const [dialog, setDialog] = useState<DialogKind>(null);
  const [notice, setNotice] = useState<Notice | null>(null);

  const isSelf =
    session.operatorId === detail.requestedByOperatorId ||
    session.operatorId === detail.beneficiaryOperatorId;
  const isExecutor = session.operatorId === executorId(detail);
  const isDownload = detail.requestType === "RAW_DOWNLOAD";
  const approvalExpired = isApprovalExpired(detail, now);
  const canExecute =
    detail.status === "APPROVED" && !detail.grant && isExecutor && !approvalExpired;
  const canRevoke = isSecurityAdmin && isRevocable(detail, now);
  const grantId = detail.grant?.grantId ?? detail.grantId ?? null;

  async function run(task: () => Promise<unknown>, success: string, failure: string) {
    setNotice(null);
    try {
      await task();
      setNotice({ tone: "ok", text: success });
    } catch (error) {
      setNotice({ tone: "error", text: describeRawAccessError(error, failure) });
    }
    setDialog(null);
  }

  async function download() {
    if (grantId === null) return;
    setNotice(null);
    try {
      const file = await actions.fetchFile.mutateAsync(grantId);
      saveBlob(file.blob, `raw-access-${grantId}.bin`);
      setNotice({ tone: "ok", text: "파일을 받았습니다. 같은 파일은 다시 받을 수 없습니다." });
    } catch (error) {
      setNotice({ tone: "error", text: describeRawAccessError(error, "파일을 받지 못했습니다.") });
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <RecordCard detail={detail} />
      <AccessCard
        detail={detail}
        now={now}
        isExecutor={isExecutor}
        canRevoke={canRevoke}
        onDownload={() => void download()}
        onRevoke={() => setDialog("revoke")}
        isDownloading={actions.fetchFile.isPending}
      />
      <Card title="처리">
        <div className="flex flex-col gap-3">
          {notice ? (
            <p
              role={notice.tone === "error" ? "alert" : "status"}
              className={
                notice.tone === "error" ? "text-caption text-danger" : "text-caption text-ink"
              }
            >
              {notice.text}
            </p>
          ) : null}
          {detail.status === "PENDING" ? (
            isPrivacy ? (
              <>
                {isSelf ? (
                  <p role="note" className="text-caption text-danger">
                    본인이 요청하거나 수혜자인 건은 직접 승인하거나 거절할 수 없습니다. 다른
                    개인정보담당이 처리해 주세요.
                  </p>
                ) : null}
                <div className="flex gap-3">
                  <Button disabled={isSelf} onClick={() => setDialog("approve")}>
                    승인
                  </Button>
                  <Button variant="ghost" disabled={isSelf} onClick={() => setDialog("reject")}>
                    거절
                  </Button>
                </div>
              </>
            ) : (
              <p className="text-body text-ink-2">개인정보담당의 승인을 기다리고 있습니다.</p>
            )
          ) : null}
          {detail.status === "APPROVED" && !detail.grant ? (
            <>
              {approvalExpired ? (
                <p role="note" className="text-caption text-danger">
                  승인 유효기간 {APPROVAL_VALID_HOURS}시간이 지나 실행할 수 없습니다. 필요하면 새로
                  요청해 주세요.
                </p>
              ) : null}
              {!isExecutor ? (
                <p className="text-caption text-ink-2">수혜자 본인만 실행할 수 있습니다.</p>
              ) : null}
              <div>
                <Button disabled={!canExecute} onClick={() => setDialog("execute")}>
                  실행
                </Button>
              </div>
              <p className="text-caption text-ink-2">
                실행에는 5분 이내 재인증이 필요하며 승인 1건은 한 번만 실행할 수 있습니다.
              </p>
            </>
          ) : null}
          {detail.status === "INVALIDATED" ? (
            <p role="note" className="text-body text-ink-2">
              승인이 무효가 되었습니다. 승인자 권한이 회수되었거나 승인 유효기간이 지난 경우입니다.
              필요하면 새로 요청해 주세요.
            </p>
          ) : null}
          {detail.status === "REJECTED" || detail.status === "EXPIRED" ? (
            <p className="text-body text-ink-2">더 처리할 수 있는 작업이 없습니다.</p>
          ) : null}
        </div>
      </Card>
      <ConfirmDialog
        isOpen={dialog === "approve"}
        title="원문 접근 승인"
        message={`${REQUEST_TYPE_LABELS[detail.requestType] ?? ""} 요청을 승인합니다. 승인은 ${APPROVAL_VALID_HOURS}시간 안에 실행해야 하고 승인 기록은 감사 로그에 남습니다.`}
        confirmLabel="승인"
        isPending={actions.approve.isPending}
        onConfirm={() =>
          void run(
            () => actions.approve.mutateAsync(),
            "요청을 승인했습니다.",
            "승인하지 못했습니다.",
          )
        }
        onCancel={() => setDialog(null)}
      />
      <ConfirmDialog
        isOpen={dialog === "execute"}
        title="원문 접근 실행"
        message={
          isDownload
            ? "실행하면 승인된 범위의 원문을 파일로 만들고 60분 동안 받을 수 있습니다. 파일은 한 번만 받을 수 있습니다."
            : "실행하면 60분 동안 승인된 범위의 원문을 볼 수 있습니다. 승인 1건은 한 번만 실행할 수 있습니다."
        }
        confirmLabel="실행"
        isPending={actions.execute.isPending}
        onConfirm={() =>
          void run(
            () => actions.execute.mutateAsync(),
            "실행했습니다. 접근 창이 열렸습니다.",
            "실행하지 못했습니다.",
          )
        }
        onCancel={() => setDialog(null)}
      />
      <OpsReasonDialog
        isOpen={dialog === "reject"}
        title="원문 접근 거절"
        reasonLabel="거절 사유"
        confirmLabel="거절"
        onSubmit={async (reason) => {
          await actions.reject.mutateAsync(reason);
          setNotice({ tone: "ok", text: "요청을 거절했습니다." });
        }}
        onClose={() => setDialog(null)}
      />
      <OpsReasonDialog
        isOpen={dialog === "revoke"}
        title="원문 접근 회수"
        description="회수하면 즉시 열람과 파일 전달이 막히며 되돌릴 수 없습니다. 5분 이내 재인증이 필요하고 처리 기록은 감사 로그에 남습니다."
        reasonLabel="회수 사유"
        confirmLabel="접근 회수"
        onSubmit={async (reason) => {
          if (grantId === null) return;
          await actions.revoke.mutateAsync({ grantId, reason });
          setNotice({ tone: "ok", text: "접근을 회수했습니다." });
        }}
        onClose={() => setDialog(null)}
      />
    </div>
  );
}

function RawAccessDetailLoader({ requestId }: { requestId: number }) {
  const query = useRawAccessDetail(requestId);
  return (
    <QueryGate query={query} loadingLabel="원문 접근 요청을 불러오는 중입니다">
      {(detail) => <RawAccessBody detail={detail} />}
    </QueryGate>
  );
}

export function RawAccessDetailScreen({ requestId }: { requestId: number }) {
  return (
    <OpsScreen title={`원문 접근 요청 ${requestId}`} roles={[]}>
      <RawAccessDetailLoader requestId={requestId} />
    </OpsScreen>
  );
}
