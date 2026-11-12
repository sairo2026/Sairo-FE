"use client";

import Link from "next/link";
import { useState } from "react";
import { QueryGate } from "@/shared/components/feedback/query-gate";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { ConfirmDialog } from "@/shared/components/ui/modal";
import { TextAreaField } from "@/shared/components/ui/textarea-field";
import { TextField } from "@/shared/components/ui/text-field";
import { formatKrw, formatSeoulDateTime } from "@/shared/lib/format";
import { OpsDetailList } from "../components/common/ops-detail-list";
import { OpsReasonDialog } from "../components/common/ops-reason-dialog";
import { OpsScreen } from "../components/common/ops-screen";
import { OpsStatusBadge } from "../components/common/ops-status-badge";
import { describeOpsError } from "../model/ops-errors";
import { useImportSupportActions, useImportSupportDetail } from "./import-support-api";
import type { MappingInput } from "./import-support-api";
import {
  BATCH_STATUS_LABELS,
  DEFAULT_QUOTE_AMOUNT,
  IMPORT_SUPPORT_STATUS,
  SCOPE_NOTE_MAX_LENGTH,
  TARGET_FIELDS,
  isMappingTargetType,
  validateQuote,
} from "./import-support-model";
import type { ImportSupportDetail } from "./import-support-model";
import { MappingEditor } from "./mapping-editor";

type Notice = { tone: "ok" | "error"; text: string };

const DEFAULT_SCOPE_NOTE = "원본 시스템 1종, 최대 5만 레코드, 수정요청 1회";

function NoticeLine({ notice }: { notice: Notice | null }) {
  if (!notice) return null;
  return (
    <p
      role={notice.tone === "error" ? "alert" : "status"}
      className={notice.tone === "error" ? "text-caption text-danger" : "text-caption text-ink"}
    >
      {notice.text}
    </p>
  );
}

function fieldLabel(targetType: string, field: string): string {
  if (!isMappingTargetType(targetType)) return field;
  return TARGET_FIELDS[targetType].find((entry) => entry.field === field)?.label ?? field;
}

function lockMessage(detail: ImportSupportDetail): string | null {
  if (detail.allowedActions.includes("EDIT_MAPPING")) return null;
  if (detail.status === "APPROVED" || detail.status === "DELIVERED") {
    return `대표가 승인한 뒤에는 매핑을 편집할 수 없습니다. 승인한 매핑 버전 ${detail.approvedMappingVersionNo ?? "-"}으로만 실행합니다.`;
  }
  if (detail.status === "REVIEW") {
    return "대표 검수 중에는 매핑을 편집할 수 없습니다. 대표가 승인하거나 수정을 요청하면 다시 열립니다.";
  }
  if (detail.status === "PROCESSING") return "담당 운영자만 매핑을 편집할 수 있습니다.";
  return "처리 중 상태에서만 매핑을 편집할 수 있습니다.";
}

function QuoteCard({
  detail,
  onSubmit,
}: {
  detail: ImportSupportDetail;
  onSubmit: (amount: number, scopeNote: string | null) => Promise<unknown>;
}) {
  const [amount, setAmount] = useState(String(detail.quoteAmount ?? DEFAULT_QUOTE_AMOUNT));
  const [scopeNote, setScopeNote] = useState(detail.scopeNote ?? DEFAULT_SCOPE_NOTE);
  const [errors, setErrors] = useState<{ amount?: string; scopeNote?: string }>({});
  const [notice, setNotice] = useState<Notice | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function submit() {
    const result = validateQuote({ amount, scopeNote });
    setErrors({ amount: result.amount, scopeNote: result.scopeNote });
    setNotice(null);
    if (result.value === null) return;
    setIsPending(true);
    try {
      await onSubmit(result.value, scopeNote.trim() === "" ? null : scopeNote.trim());
      setNotice({ tone: "ok", text: "견적을 제시했습니다. 대표가 수락하면 결제로 이어집니다." });
    } catch (error) {
      setNotice({ tone: "error", text: describeOpsError(error, "견적을 제시하지 못했습니다.") });
    } finally {
      setIsPending(false);
    }
  }

  return (
    <Card title="견적 제시">
      <div className="flex flex-col gap-4">
        <p className="text-caption text-ink-2">
          기본 견적은 부가세 포함 {formatKrw(DEFAULT_QUOTE_AMOUNT)}입니다. 표준 범위는 원본 시스템
          1종, 최대 5만 레코드, 수정요청 1회입니다. 범위를 넘으면 금액과 범위 비고를 조정해 주세요.
        </p>
        <TextField
          label="견적 금액(원, VAT 포함)"
          kind="number"
          value={amount}
          onValueChange={setAmount}
          error={errors.amount}
        />
        <TextAreaField
          label="범위 비고"
          value={scopeNote}
          onValueChange={setScopeNote}
          maxLength={SCOPE_NOTE_MAX_LENGTH}
          rows={3}
          error={errors.scopeNote}
        />
        <NoticeLine notice={notice} />
        <div>
          <Button isLoading={isPending} onClick={() => void submit()}>
            {detail.status === "QUOTED" ? "견적 다시 제시" : "견적 제시"}
          </Button>
        </div>
      </div>
    </Card>
  );
}

function MappingCard({
  detail,
  onSave,
}: {
  detail: ImportSupportDetail;
  onSave: (input: MappingInput) => Promise<unknown>;
}) {
  const canEdit = detail.allowedActions.includes("EDIT_MAPPING");
  const lock = lockMessage(detail);
  const current = detail.currentMapping;
  return (
    <Card title="매핑">
      <div className="flex flex-col gap-4">
        {lock ? (
          <p role="status" className="rounded-card-flat bg-surface px-4 py-3 text-caption text-ink">
            {lock}
          </p>
        ) : null}
        {canEdit ? (
          <MappingEditor detail={detail} onSave={onSave} />
        ) : current ? (
          <table className="w-full text-left text-body">
            <caption className="sr-only">현재 매핑</caption>
            <thead>
              <tr className="text-caption text-ink-2">
                <th scope="col" className="py-1">
                  원본 열
                </th>
                <th scope="col" className="py-1">
                  대상 필드
                </th>
              </tr>
            </thead>
            <tbody>
              {current.items.map((item) => (
                <tr key={item.sourceColumn}>
                  <td className="py-1">{item.sourceColumn}</td>
                  <td className="py-1">{fieldLabel(current.targetType, item.targetField)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-body text-ink-2">확정된 매핑이 없습니다.</p>
        )}
        <div>
          <h3 className="text-caption font-semibold text-ink-2">매핑 버전 이력</h3>
          {detail.mappingHistory.length === 0 ? (
            <p className="text-body text-ink-2">저장된 매핑 버전이 없습니다.</p>
          ) : (
            <ol className="mt-1 flex flex-col gap-1">
              {detail.mappingHistory.map((entry) => (
                <li key={entry.versionNo} className="text-body text-ink">
                  버전 {entry.versionNo} ·{" "}
                  {entry.confirmedByType === "OPERATOR" ? "운영자" : "대표"} {entry.confirmedByName}{" "}
                  · {formatSeoulDateTime(entry.createdAt)}
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </Card>
  );
}

function PreviewCard({ detail }: { detail: ImportSupportDetail }) {
  const summary = detail.previewSummary;
  return (
    <Card title="미리보기 요약">
      <div className="flex flex-col gap-3">
        {summary ? (
          <OpsDetailList
            items={[
              { label: "대상 행 수", value: summary.rowCount.toLocaleString("ko-KR") },
              { label: "경고 행 수", value: summary.warningCount.toLocaleString("ko-KR") },
              { label: "중복 행 수", value: summary.duplicateCount.toLocaleString("ko-KR") },
              {
                label: "기존 레코드 연결 후보",
                value: summary.relationMatchCount.toLocaleString("ko-KR"),
              },
            ]}
          />
        ) : (
          <p className="text-body text-ink-2">아직 미리보기가 만들어지지 않았습니다.</p>
        )}
        <p className="text-caption text-ink-2">
          고객 파일의 원본 값은 이 화면에 표시되지 않습니다. 값을 확인해야 하면 원문 접근 승인을
          요청해 주세요.
        </p>
        <div>
          <Link
            href={`/ops/raw-access/new?targetType=IMPORT_BATCH&targetId=${detail.importBatchId}`}
            className="text-body font-semibold text-primary underline"
          >
            원문 접근 승인 요청
          </Link>
        </div>
      </div>
    </Card>
  );
}

type Dialog = "reject" | "execute" | "deliver" | null;

function ImportSupportBody({ detail }: { detail: ImportSupportDetail }) {
  const actions = useImportSupportActions(detail.requestId, detail.version);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const allowed = new Set(detail.allowedActions);

  async function run(task: () => Promise<unknown>, success: string, failure: string) {
    setNotice(null);
    try {
      await task();
      setNotice({ tone: "ok", text: success });
    } catch (error) {
      setNotice({ tone: "error", text: describeOpsError(error, failure) });
    }
    setDialog(null);
  }

  const isApprovedFlow = detail.status === "APPROVED" || detail.status === "DELIVERED";

  return (
    <div className="flex flex-col gap-6">
      <Card title="신청 정보">
        <OpsDetailList
          items={[
            {
              label: "상태",
              value: <OpsStatusBadge status={detail.status} map={IMPORT_SUPPORT_STATUS} />,
            },
            { label: "사무소", value: `${detail.officeName ?? "이름 없음"} (${detail.officeId})` },
            { label: "원본 시스템", value: detail.sourceSystem },
            {
              label: "업로드 행 수",
              value: detail.rowCount === null ? "-" : detail.rowCount.toLocaleString("ko-KR"),
            },
            {
              label: "예상 레코드",
              value:
                detail.estimatedRowCount === null
                  ? "-"
                  : detail.estimatedRowCount.toLocaleString("ko-KR"),
            },
            {
              label: "견적 금액",
              value:
                detail.quoteAmount === null || detail.quoteAmount === undefined
                  ? null
                  : formatKrw(detail.quoteAmount),
            },
            { label: "범위 비고", value: detail.scopeNote },
            { label: "담당 운영자", value: detail.assignedOperatorName },
            {
              label: "처리 시작",
              value: detail.processingStartedAt
                ? formatSeoulDateTime(detail.processingStartedAt)
                : null,
            },
            {
              label: "검수 제출",
              value: detail.submittedAt ? formatSeoulDateTime(detail.submittedAt) : null,
            },
            {
              label: "대표 승인",
              value: detail.approvedAt
                ? `${formatSeoulDateTime(detail.approvedAt)} (매핑 버전 ${detail.approvedMappingVersionNo ?? "-"})`
                : null,
            },
            {
              label: "납품 확인",
              value: detail.deliveredAt ? formatSeoulDateTime(detail.deliveredAt) : null,
            },
            { label: "신청 일시", value: formatSeoulDateTime(detail.requestedAt) },
            { label: "거절 사유", value: detail.rejectReason },
          ]}
        />
      </Card>

      {detail.changeRequestCount > 0 ? (
        <Card title="대표의 수정 요청">
          <OpsDetailList
            columns={1}
            items={[
              { label: "수정 요청 내용", value: detail.changeRequestReason },
              {
                label: "요청 일시",
                value: detail.changeRequestedAt
                  ? formatSeoulDateTime(detail.changeRequestedAt)
                  : null,
              },
              {
                label: "수정 요청 횟수",
                value: `${detail.changeRequestCount}회 (표준 범위는 1회)`,
              },
            ]}
          />
        </Card>
      ) : null}

      <NoticeLine notice={notice} />

      {allowed.has("QUOTE") ? (
        <QuoteCard
          detail={detail}
          onSubmit={(amount, scopeNote) =>
            actions.quote.mutateAsync({ quoteAmount: amount, scopeNote })
          }
        />
      ) : null}

      {allowed.has("REJECT") ? (
        <Card title="신청 거절">
          <div className="flex flex-col gap-3">
            <p className="text-caption text-ink-2">
              견적 수락 전 신청만 거절할 수 있습니다. 거절하면 신청이 끝나고 대표의 직접 매핑·실행
              권한이 바로 돌아옵니다. 거절 사유는 대표의 신청 상세에 표시되고 감사 로그에 남습니다.
            </p>
            <div>
              <Button variant="outlined" onClick={() => setDialog("reject")}>
                신청 거절
              </Button>
            </div>
          </div>
        </Card>
      ) : null}

      {allowed.has("START") ? (
        <Card title="처리 시작">
          <div className="flex flex-col gap-3">
            <p className="text-caption text-ink-2">
              결제가 끝난 건입니다. 처리를 시작하면 내가 담당 운영자가 되고 담당자만 매핑을 편집할
              수 있습니다.
            </p>
            <div>
              <Button
                isLoading={actions.start.isPending}
                onClick={() =>
                  void run(
                    () => actions.start.mutateAsync(),
                    "처리를 시작했습니다.",
                    "처리를 시작하지 못했습니다.",
                  )
                }
              >
                처리 시작
              </Button>
            </div>
          </div>
        </Card>
      ) : null}

      {detail.status === "PROCESSING" ||
      detail.status === "REVIEW" ||
      isApprovedFlow ||
      detail.mappingHistory.length > 0 ? (
        <>
          <MappingCard detail={detail} onSave={(input) => actions.saveMapping.mutateAsync(input)} />
          <PreviewCard detail={detail} />
        </>
      ) : null}

      {allowed.has("SUBMIT_REVIEW") ? (
        <Card title="대표 검수 제출">
          <div className="flex flex-col gap-3">
            <p className="text-caption text-ink-2">
              최신 매핑 버전을 대표 검수에 제출합니다. 제출 뒤에는 대표가 승인하거나 수정을 요청할
              때까지 매핑을 바꿀 수 없습니다.
            </p>
            <div>
              <Button
                isLoading={actions.submitReview.isPending}
                onClick={() =>
                  void run(
                    () => actions.submitReview.mutateAsync(),
                    "대표 검수에 제출했습니다.",
                    "검수에 제출하지 못했습니다.",
                  )
                }
              >
                검수 제출
              </Button>
            </div>
          </div>
        </Card>
      ) : null}

      {isApprovedFlow ? (
        <Card title="실행과 납품">
          <div className="flex flex-col gap-3">
            <OpsDetailList
              items={[
                {
                  label: "이전 실행 상태",
                  value: BATCH_STATUS_LABELS[detail.batchStatus] ?? detail.batchStatus,
                },
                {
                  label: "실행 시작",
                  value: detail.executedAt ? formatSeoulDateTime(detail.executedAt) : null,
                },
              ]}
            />
            {detail.batchStatus === "EXECUTING" ? (
              <p role="status" className="text-caption text-ink">
                이전을 실행하는 중입니다. 끝나면 이 화면에서 납품을 확인할 수 있습니다.
              </p>
            ) : null}
            {detail.batchStatus === "FAILED" ? (
              <p role="alert" className="text-caption text-danger">
                실행에 실패했습니다. 재시도는 시스템 작업 재실행으로 진행합니다.
              </p>
            ) : null}
            <div className="flex flex-wrap gap-3">
              {allowed.has("EXECUTE") ? (
                <Button onClick={() => setDialog("execute")}>승인한 버전으로 실행</Button>
              ) : null}
              {allowed.has("DELIVER") ? (
                <Button onClick={() => setDialog("deliver")}>납품 확인</Button>
              ) : null}
            </div>
          </div>
        </Card>
      ) : null}

      <OpsReasonDialog
        isOpen={dialog === "reject"}
        title="이전 지원 신청 거절"
        description="거절하면 신청이 끝나고 연결된 이전 실행 단위의 직접 매핑·실행 권한이 대표에게 바로 돌아옵니다. 되돌릴 수 없고 처리 기록은 감사 로그에 남습니다."
        reasonLabel="거절 사유(대표에게 표시)"
        confirmLabel="거절"
        onSubmit={async (reason) => {
          await actions.reject.mutateAsync(reason);
          setNotice({ tone: "ok", text: "신청을 거절했습니다. 대표의 직접 권한이 돌아갔습니다." });
        }}
        onClose={() => setDialog(null)}
      />
      <ConfirmDialog
        isOpen={dialog === "execute"}
        title="승인한 버전으로 실행"
        message={`대표가 승인한 매핑 버전 ${detail.approvedMappingVersionNo ?? "-"}으로 이전을 실행합니다. 실행은 한 번만 시작할 수 있고 처리 기록은 감사 로그에 남습니다.`}
        confirmLabel="실행"
        isPending={actions.execute.isPending}
        onConfirm={() =>
          void run(
            () => actions.execute.mutateAsync(),
            "이전 실행을 시작했습니다.",
            "이전을 실행하지 못했습니다.",
          )
        }
        onCancel={() => setDialog(null)}
      />
      <ConfirmDialog
        isOpen={dialog === "deliver"}
        title="납품 확인"
        message="이전 결과를 납품 완료로 확인합니다. 확인하면 이 신청이 종료됩니다."
        confirmLabel="납품 확인"
        isPending={actions.deliver.isPending}
        onConfirm={() =>
          void run(
            () => actions.deliver.mutateAsync(),
            "납품을 확인했습니다.",
            "납품을 확인하지 못했습니다.",
          )
        }
        onCancel={() => setDialog(null)}
      />
    </div>
  );
}

function ImportSupportLoader({ requestId }: { requestId: number }) {
  const query = useImportSupportDetail(requestId);
  return (
    <QueryGate query={query} loadingLabel="이전 지원 신청을 불러오는 중입니다">
      {(detail) => <ImportSupportBody detail={detail} />}
    </QueryGate>
  );
}

export function ImportSupportDetailScreen({ requestId }: { requestId: number }) {
  return (
    <OpsScreen title={`이전 지원 신청 ${requestId}`} roles={["MIGRATION"]}>
      <ImportSupportLoader requestId={requestId} />
    </OpsScreen>
  );
}
