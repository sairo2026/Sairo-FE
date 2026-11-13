"use client";

import { useState } from "react";
import { ApiError } from "@/shared/api/client";
import { QueryGate } from "@/shared/components/feedback/query-gate";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { DateTimeField } from "@/shared/components/ui/date-time-field";
import { ConfirmDialog } from "@/shared/components/ui/modal";
import { SelectField } from "@/shared/components/ui/select-field";
import { TextAreaField } from "@/shared/components/ui/textarea-field";
import { TextField } from "@/shared/components/ui/text-field";
import { formatSeoulDateTime } from "@/shared/lib/format";
import { OpsDetailList } from "../components/common/ops-detail-list";
import { OpsReasonDialog } from "../components/common/ops-reason-dialog";
import { OpsScreen } from "../components/common/ops-screen";
import { OpsStatusBadge } from "../components/common/ops-status-badge";
import { describeOpsError } from "../model/ops-errors";
import { useOpsSession } from "../model/ops-session";
import { useDeletionActions, useDeletionItem, useDeletionPreview } from "./deletion-api";
import {
  DELETION_PHASE,
  EVIDENCE_MAX_LENGTH,
  REASON_MAX_LENGTH,
  STORE_RESULT,
  VERIFY_FIELDS,
  VERIFY_RESULT_OPTIONS,
  phaseOf,
  targetTypeLabel,
  toSeoulIso,
  validateExclude,
} from "./deletion-model";
import type { DeletionItem, ExcludeErrors, ExcludeInput, VerifyKey } from "./deletion-model";

type Notice = { tone: "ok" | "error"; text: string };

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

function describeDeletionError(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    if (error.code === "SELF_APPROVAL_FORBIDDEN") {
      return "본인이 실행한 건이거나 본인이 승인자로 지정된 건은 직접 처리할 수 없습니다. 실행자와 다른 운영자가 처리해 주세요.";
    }
    if (error.code === "VERIFICATION_INCOMPLETE") {
      return "검증 미완료: 운영 저장소, 검색 색인, 파일, 임시 내보내기 결과를 모두 입력해야 검증할 수 있습니다.";
    }
  }
  return describeOpsError(error, fallback);
}

const EMPTY_EXCLUDE: ExcludeInput = {
  exclusionReason: "",
  approverId: "",
  holdDate: "",
  holdTime: "",
  reviewDate: "",
  reviewTime: "",
};

function ExcludeCard({ item, onDone }: { item: DeletionItem; onDone: (notice: Notice) => void }) {
  const { operatorId } = useOpsSession();
  const actions = useDeletionActions(item.queueId);
  const [input, setInput] = useState(EMPTY_EXCLUDE);
  const [errors, setErrors] = useState<ExcludeErrors>({});
  const [isPending, setIsPending] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const set = (key: keyof ExcludeInput) => (value: string) => setInput({ ...input, [key]: value });

  async function submit() {
    const found = validateExclude(input, operatorId, Date.now());
    setErrors(found);
    setServerError(null);
    const hold = toSeoulIso(input.holdDate, input.holdTime);
    const review = toSeoulIso(input.reviewDate, input.reviewTime);
    if (Object.keys(found).length > 0 || hold === null || review === null) return;
    setIsPending(true);
    try {
      await actions.exclude.mutateAsync({
        exclusionReason: input.exclusionReason.trim(),
        holdExpiresAt: hold,
        exclusionReviewedAt: review,
        approvedByOperatorId: Number(input.approverId),
      });
      setInput(EMPTY_EXCLUDE);
      onDone({
        tone: "ok",
        text: "보존 예외를 등록했습니다. 미리보기에서 제외 건수를 다시 확인해 주세요.",
      });
    } catch (error) {
      setServerError(describeDeletionError(error, "보존 예외를 등록하지 못했습니다."));
    } finally {
      setIsPending(false);
    }
  }

  return (
    <Card title="보존 예외">
      <div className="flex flex-col gap-4">
        <p className="text-caption text-ink-2">
          법정 보존이나 분쟁 보류로 파기할 수 없는 대상은 근거와 승인자, 보류 만료 시각, 재검토
          예정일을 남겨 제외합니다. 승인자는 실행자와 달라야 하며 처리 기록은 감사 로그에 남습니다.
        </p>
        <p className="text-caption text-ink-2">
          예외 대상: {targetTypeLabel(item.targetType)} {item.targetId}
        </p>
        <TextAreaField
          label="보존 근거"
          value={input.exclusionReason}
          onValueChange={set("exclusionReason")}
          maxLength={REASON_MAX_LENGTH}
          rows={3}
          error={errors.exclusionReason}
        />
        <TextField
          label="승인자 운영자 번호"
          kind="number"
          value={input.approverId}
          onValueChange={set("approverId")}
          error={errors.approverId}
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <DateTimeField
            label="보류 만료 날짜"
            kind="date"
            value={input.holdDate}
            onValueChange={set("holdDate")}
            error={errors.holdDate}
          />
          <DateTimeField
            label="보류 만료 시각"
            kind="time"
            value={input.holdTime}
            onValueChange={set("holdTime")}
          />
          <DateTimeField
            label="재검토 예정 날짜"
            kind="date"
            value={input.reviewDate}
            onValueChange={set("reviewDate")}
            error={errors.reviewDate}
          />
          <DateTimeField
            label="재검토 예정 시각"
            kind="time"
            value={input.reviewTime}
            onValueChange={set("reviewTime")}
          />
        </div>
        {serverError ? (
          <p role="alert" className="text-caption text-danger">
            {serverError}
          </p>
        ) : null}
        <div>
          <Button variant="outlined" isLoading={isPending} onClick={() => void submit()}>
            보존 예외 등록
          </Button>
        </div>
      </div>
    </Card>
  );
}

function VerifyCard({ item, onDone }: { item: DeletionItem; onDone: (notice: Notice) => void }) {
  const actions = useDeletionActions(item.queueId);
  const [results, setResults] = useState<Record<VerifyKey, string>>({
    storageResult: "",
    searchIndexResult: "",
    fileResult: "",
    temporaryExportResult: "",
  });
  const [backupDate, setBackupDate] = useState("");
  const [evidence, setEvidence] = useState("");
  const [evidenceError, setEvidenceError] = useState<string | undefined>();
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function submit() {
    setMessage(null);
    if (evidence.trim() === "") {
      setEvidenceError("검증 증빙을 입력해 주세요.");
      return;
    }
    setEvidenceError(undefined);
    setIsPending(true);
    try {
      const response = await actions.verify.mutateAsync({
        ...results,
        backupExpiresAt: backupDate === "" ? null : toSeoulIso(backupDate, "00:00"),
        evidence: evidence.trim(),
      });
      onDone({
        tone: "ok",
        text:
          response.result === "SUCCESS"
            ? "검증을 마쳤습니다. 이 파기 건은 완료로 표시됩니다."
            : "검증을 기록했습니다. 실패한 저장소가 있어 완료로 표시되지 않습니다.",
      });
    } catch (error) {
      setMessage(describeDeletionError(error, "검증하지 못했습니다."));
    } finally {
      setIsPending(false);
    }
  }

  return (
    <Card title="파기 결과 검증">
      <div className="flex flex-col gap-4">
        <p className="text-caption text-ink-2">
          실행자와 다른 운영자가 저장소별 결과를 확인해 입력합니다. 모든 결과가 입력되어 검증을
          마치기 전에는 이 건을 완료로 표시하지 않습니다.
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {VERIFY_FIELDS.map((field) => (
            <SelectField
              key={field.key}
              label={field.label}
              value={results[field.key]}
              options={VERIFY_RESULT_OPTIONS}
              onValueChange={(value) => setResults({ ...results, [field.key]: value })}
            />
          ))}
        </div>
        <DateTimeField
          label="백업 만료일"
          kind="date"
          value={backupDate}
          onValueChange={setBackupDate}
        />
        <TextAreaField
          label="검증 증빙"
          value={evidence}
          onValueChange={setEvidence}
          maxLength={EVIDENCE_MAX_LENGTH}
          rows={3}
          error={evidenceError}
          hint="확인한 방법과 증빙 위치를 적어 주세요. 개인정보 원문은 적지 않습니다."
        />
        {message ? (
          <p role="alert" className="text-caption text-danger">
            {message}
          </p>
        ) : null}
        <div>
          <Button isLoading={isPending} onClick={() => void submit()}>
            검증 기록
          </Button>
        </div>
      </div>
    </Card>
  );
}

function DeletionBody({ item }: { item: DeletionItem }) {
  const actions = useDeletionActions(item.queueId);
  const [wantsPreview, setWantsPreview] = useState(false);
  const preview = useDeletionPreview(item.queueId, wantsPreview);
  const [dialog, setDialog] = useState<"cancel" | "execute" | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const phase = phaseOf(item);
  const isPending = phase === "PENDING";
  const previewSeen = preview.isSuccess;

  async function execute() {
    setNotice(null);
    try {
      await actions.execute.mutateAsync();
      setNotice({
        tone: "ok",
        text: "파기를 실행했습니다. 실행자와 다른 운영자가 검증하면 완료로 표시됩니다.",
      });
    } catch (error) {
      setNotice({
        tone: "error",
        text: describeDeletionError(error, "파기를 실행하지 못했습니다."),
      });
    }
    setDialog(null);
  }

  return (
    <div className="flex flex-col gap-6">
      <Card title="파기 건 정보">
        <OpsDetailList
          items={[
            { label: "상태", value: <OpsStatusBadge status={phase} map={DELETION_PHASE} /> },
            { label: "대상", value: `${targetTypeLabel(item.targetType)} ${item.targetId}` },
            { label: "사무소", value: item.officeId },
            { label: "파기 근거", value: item.reason },
            { label: "예정일", value: formatSeoulDateTime(item.scheduledAt) },
            {
              label: "실행 일시",
              value: item.executedAt ? formatSeoulDateTime(item.executedAt) : null,
            },
            { label: "대상 건수", value: item.targetCount.toLocaleString("ko-KR") },
            { label: "보존 제외 건수", value: item.excludedCount.toLocaleString("ko-KR") },
            ...(
              [
                ["운영 저장소", item.storageResult],
                ["검색 색인", item.searchIndexResult],
                ["파일", item.fileResult],
                ["임시 내보내기", item.temporaryExportResult],
              ] as const
            ).map(([label, value]) => ({
              label,
              value: value === null ? null : <OpsStatusBadge status={value} map={STORE_RESULT} />,
            })),
            {
              label: "백업 만료",
              value: item.backupExpiresAt ? formatSeoulDateTime(item.backupExpiresAt) : null,
            },
            { label: "재시도 횟수", value: `${item.retryCount}회` },
            {
              label: "검증 일시",
              value: item.verifiedAt ? formatSeoulDateTime(item.verifiedAt) : "검증 전",
            },
            { label: "검증 증빙", value: item.verificationEvidence },
            { label: "보존 제외 사유", value: item.exclusionReason },
            {
              label: "취소 시각",
              value: item.cancelledAt ? formatSeoulDateTime(item.cancelledAt) : null,
            },
            { label: "취소 사유", value: item.cancelReason },
          ]}
        />
      </Card>

      <NoticeLine notice={notice} />

      {phase === "CANCELLED" ? (
        <p role="status" className="rounded-card-flat bg-surface px-4 py-3 text-caption text-ink">
          취소한 건입니다. 취소한 건은 실행할 수 없습니다.
        </p>
      ) : null}
      {phase === "AWAITING_VERIFICATION" ? (
        <p role="status" className="rounded-card-flat bg-surface px-4 py-3 text-caption text-ink">
          실행을 시작한 건은 취소할 수 없습니다. 검증을 마치기 전에는 완료로 표시되지 않습니다.
        </p>
      ) : null}

      {isPending ? (
        <>
          <Card title="파기 미리보기">
            <div className="flex flex-col gap-3">
              <p className="text-caption text-ink-2">
                미리보기로 대상 건수와 보존 제외분을 확인한 뒤에만 실행할 수 있습니다.
              </p>
              {preview.isError ? (
                <p role="alert" className="text-caption text-danger">
                  {describeOpsError(preview.error, "미리보기를 불러오지 못했습니다.")}
                </p>
              ) : null}
              {preview.data ? (
                <div className="flex flex-col gap-3">
                  <OpsDetailList
                    items={[
                      { label: "파기 대상 건수", value: `${preview.data.targetCount}건` },
                      { label: "보존 제외 건수", value: `${preview.data.excludedCount}건` },
                      {
                        label: "운영 저장소 대상",
                        value: preview.data.storageTargets
                          .map(
                            (target) => `${targetTypeLabel(target.targetType)} ${target.targetId}`,
                          )
                          .join(", "),
                      },
                      {
                        label: "검색 색인 대상",
                        value: `${preview.data.searchIndexTargets.length}건`,
                      },
                      { label: "파일 대상", value: `${preview.data.fileTargets.length}건` },
                      {
                        label: "임시 내보내기 대상",
                        value: `${preview.data.temporaryExportTargets.length}건`,
                      },
                    ]}
                  />
                  {preview.data.holdReasons.length > 0 ? (
                    <div>
                      <h3 className="text-caption font-semibold text-ink-2">보존 제외 사유</h3>
                      <ul className="list-disc pl-5 text-body text-ink">
                        {preview.data.holdReasons.map((reason) => (
                          <li key={reason}>{reason}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              ) : null}
              <div>
                <Button
                  variant="outlined"
                  isLoading={preview.isFetching}
                  onClick={() => {
                    if (wantsPreview) void preview.refetch();
                    else setWantsPreview(true);
                  }}
                >
                  {previewSeen ? "미리보기 다시 조회" : "미리보기 조회"}
                </Button>
              </div>
            </div>
          </Card>

          <ExcludeCard
            item={item}
            onDone={(next) => {
              setNotice(next);
              if (wantsPreview) void preview.refetch();
            }}
          />

          <Card title="실행과 취소">
            <div className="flex flex-col gap-3">
              <p className="text-caption text-ink-2">
                실행은 고위험 처리로 5분 이내에 재인증을 마쳐야 하고 되돌릴 수 없습니다. 처리 기록은
                감사 로그에 남습니다. 실행 전 대기 건만 사유를 적어 취소할 수 있습니다.
              </p>
              {!previewSeen ? (
                <p className="text-caption text-ink-2">미리보기를 조회하면 실행 버튼이 켜집니다.</p>
              ) : null}
              <div className="flex flex-wrap gap-3">
                <Button disabled={!previewSeen} onClick={() => setDialog("execute")}>
                  파기 실행
                </Button>
                <Button variant="ghost" onClick={() => setDialog("cancel")}>
                  대기 건 취소
                </Button>
              </div>
            </div>
          </Card>
        </>
      ) : null}

      {phase === "AWAITING_VERIFICATION" ? <VerifyCard item={item} onDone={setNotice} /> : null}

      <ConfirmDialog
        isOpen={dialog === "execute"}
        title="파기 실행"
        message="미리보기로 확인한 대상을 파기합니다. 5분 이내 재인증이 필요하고 되돌릴 수 없으며 처리 기록은 감사 로그에 남습니다."
        confirmLabel="실행"
        isPending={actions.execute.isPending}
        onConfirm={() => void execute()}
        onCancel={() => setDialog(null)}
      />
      <OpsReasonDialog
        isOpen={dialog === "cancel"}
        title="파기 대기 건 취소"
        description="취소하면 예약 파기 대상에서 빠지고 이 건은 실행할 수 없습니다. 취소 시각과 사유는 감사 로그에 남습니다."
        reasonLabel="취소 사유"
        confirmLabel="취소"
        onSubmit={async (reason) => {
          await actions.cancel.mutateAsync(reason);
          setNotice({ tone: "ok", text: "파기 대기 건을 취소했습니다." });
        }}
        onClose={() => setDialog(null)}
      />
    </div>
  );
}

function DeletionLoader({ queueId }: { queueId: number }) {
  const query = useDeletionItem(queueId);
  return (
    <QueryGate query={query} loadingLabel="파기 건을 불러오는 중입니다">
      {(item) => <DeletionBody item={item} />}
    </QueryGate>
  );
}

export function DeletionDetailScreen({ queueId }: { queueId: number }) {
  return (
    <OpsScreen title={`파기 건 ${queueId}`} roles={["PRIVACY"]}>
      <DeletionLoader queueId={queueId} />
    </OpsScreen>
  );
}
