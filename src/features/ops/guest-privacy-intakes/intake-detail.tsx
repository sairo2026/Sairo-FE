"use client";

import Link from "next/link";
import { useState } from "react";
import { ApiError } from "@/shared/api/client";
import { QueryGate } from "@/shared/components/feedback/query-gate";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { DateTimeField } from "@/shared/components/ui/date-time-field";
import { ConfirmDialog } from "@/shared/components/ui/modal";
import { RadioGroup, SelectField } from "@/shared/components/ui/select-field";
import { TextAreaField } from "@/shared/components/ui/textarea-field";
import { formatSeoulDateTime } from "@/shared/lib/format";
import { toSeoulIso } from "../registrations/registration-model";
import { OpsDetailList } from "../components/common/ops-detail-list";
import { OpsScreen } from "../components/common/ops-screen";
import { OpsStatusBadge } from "../components/common/ops-status-badge";
import { describeOpsError } from "../model/ops-errors";
import { useIntakeLookup, useResolveIntake } from "./intake-api";
import {
  CHANNEL_LABELS,
  CLOSE_REASONS,
  DRAFT_NOTICE,
  INTAKE_STATUS,
  LINK_KIND_LABELS,
  REQUESTER_ROLE_LABELS,
  REQUEST_TYPE_LABELS,
  VERIFICATION_STATUS,
} from "./intake-model";
import type { IntakeItem } from "./intake-model";

type Notice = { tone: "ok" | "error"; text: string };

function ResolveForm({ intake, onDone }: { intake: IntakeItem; onDone: (notice: Notice) => void }) {
  const resolve = useResolveIntake(intake.intakeId);
  const [verification, setVerification] = useState("");
  const [action, setAction] = useState("");
  const [legalBasis, setLegalBasis] = useState("");
  const [requestScope, setRequestScope] = useState("");
  const [legalDate, setLegalDate] = useState("");
  const [legalTime, setLegalTime] = useState("18:00");
  const [internalDate, setInternalDate] = useState("");
  const [internalTime, setInternalTime] = useState("18:00");
  const [closeReason, setCloseReason] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const effectiveAction = verification === "FAILED" ? "CLOSE" : action;
  const legalDueAt = legalDate === "" ? null : toSeoulIso(legalDate, legalTime);
  const internalDueAt = internalDate === "" ? null : toSeoulIso(internalDate, internalTime);
  const dueOrderError =
    legalDueAt && internalDueAt && Date.parse(legalDueAt) < Date.parse(internalDueAt)
      ? "법정 기한은 내부 기한 이후여야 합니다."
      : undefined;

  let isReady = verification !== "" && effectiveAction !== "" && dueOrderError === undefined;
  if (effectiveAction === "CONVERT") {
    isReady = isReady && legalBasis.trim() !== "" && requestScope.trim() !== "";
  } else if (effectiveAction === "CLOSE") {
    isReady = isReady && closeReason !== "";
  }

  async function submit() {
    setError(null);
    const isConvert = effectiveAction === "CONVERT";
    try {
      const result = await resolve.mutateAsync({
        verificationResult: verification,
        action: effectiveAction,
        legalBasis: isConvert ? legalBasis.trim() : null,
        requestScope: isConvert ? requestScope.trim() : null,
        legalDueAt: isConvert ? legalDueAt : null,
        internalDueAt: isConvert ? internalDueAt : null,
        closeReason: isConvert ? null : closeReason,
      });
      setConfirming(false);
      onDone({
        tone: "ok",
        text:
          result.status === "CONVERTED"
            ? `권리 요청으로 전환했습니다. 권리 요청 번호는 ${result.privacyRequestId ?? "-"}입니다.`
            : `접수를 종결했습니다. 사유: ${CLOSE_REASONS[result.closedReason ?? ""] ?? result.closedReason ?? "-"}`,
      });
    } catch (caught) {
      setConfirming(false);
      const message = describeOpsError(caught, "처리하지 못했습니다.");
      if (caught instanceof ApiError && caught.code === "GUEST_INTAKE_ALREADY_CONVERTED") {
        onDone({ tone: "error", text: message });
      } else {
        setError(message);
      }
    }
  }

  return (
    <Card title="본인 확인 결과와 처리">
      <div className="flex flex-col gap-5">
        <p className="text-caption text-ink-2">
          요청자에게 회신해 본인 여부를 확인한 결과를 기록하고 권리 요청으로 전환하거나 종결합니다.
          처리 기록은 운영자 감사 로그에 남고 전환 뒤에는 되돌릴 수 없습니다.
        </p>
        <RadioGroup
          legend="본인 확인 결과"
          name="verification-result"
          value={verification}
          onValueChange={(next) => {
            setVerification(next);
            if (next === "FAILED") setAction("CLOSE");
          }}
          options={[
            { value: "VERIFIED", label: "본인 확인됨" },
            { value: "FAILED", label: "본인 확인 실패" },
          ]}
        />
        <RadioGroup
          legend="처리 방법"
          name="resolve-action"
          value={effectiveAction}
          onValueChange={setAction}
          options={[
            {
              value: "CONVERT",
              label: "권리 요청으로 전환",
              isDisabled: verification === "FAILED",
            },
            { value: "CLOSE", label: "종결" },
          ]}
        />
        {verification === "FAILED" ? (
          <p className="text-caption text-ink-2">본인 확인에 실패하면 종결만 할 수 있습니다.</p>
        ) : null}
        {effectiveAction === "CONVERT" ? (
          <div className="flex flex-col gap-4">
            <TextAreaField
              label="적용 법적 근거"
              value={legalBasis}
              rows={2}
              hint="근거 조항을 확인하지 못했으면 검토 중과 검토 대상 법령 이름을 적습니다."
              onValueChange={setLegalBasis}
            />
            <TextAreaField
              label="요청 범위"
              value={requestScope}
              rows={2}
              hint="요청한 개인정보와 처리 범위를 적습니다."
              onValueChange={setRequestScope}
            />
            <div className="flex flex-wrap gap-4">
              <DateTimeField
                label="법정 기한 날짜"
                kind="date"
                value={legalDate}
                onValueChange={setLegalDate}
              />
              <DateTimeField
                label="법정 기한 시각"
                kind="time"
                value={legalTime}
                onValueChange={setLegalTime}
                error={dueOrderError}
              />
              <DateTimeField
                label="내부 기한 날짜"
                kind="date"
                value={internalDate}
                onValueChange={setInternalDate}
              />
              <DateTimeField
                label="내부 기한 시각"
                kind="time"
                value={internalTime}
                onValueChange={setInternalTime}
              />
            </div>
            <p className="text-caption text-ink-2">
              비워 두면 법정 기한은 접수일 10일 뒤, 내부 기한은 접수일 7일 뒤로 정해집니다. 법정
              기한은 내부 기한 이후여야 합니다.
            </p>
          </div>
        ) : null}
        {effectiveAction === "CLOSE" ? (
          <SelectField
            label="종결 사유"
            value={closeReason}
            placeholder="사유를 선택해 주세요"
            options={Object.entries(CLOSE_REASONS).map(([value, label]) => ({ value, label }))}
            onValueChange={setCloseReason}
          />
        ) : null}
        {error ? (
          <p role="alert" className="text-caption text-danger">
            {error}
          </p>
        ) : null}
        <div>
          <Button disabled={!isReady} onClick={() => setConfirming(true)}>
            {effectiveAction === "CLOSE" ? "접수 종결" : "권리 요청으로 전환"}
          </Button>
        </div>
      </div>
      <ConfirmDialog
        isOpen={confirming}
        title={effectiveAction === "CLOSE" ? "접수 종결" : "권리 요청으로 전환"}
        message={
          effectiveAction === "CLOSE"
            ? "접수를 종결합니다. 처리 기록은 감사 로그에 남습니다."
            : "링크를 발급한 사무소가 처리 책임인 권리 요청을 만듭니다. 전환한 접수는 되돌릴 수 없고 처리 기록은 감사 로그에 남습니다."
        }
        confirmLabel={effectiveAction === "CLOSE" ? "종결" : "전환"}
        isPending={resolve.isPending}
        onConfirm={() => void submit()}
        onCancel={() => setConfirming(false)}
      />
    </Card>
  );
}

function IntakeBody({ intake, refetch }: { intake: IntakeItem; refetch: () => void }) {
  const [notice, setNotice] = useState<Notice | null>(null);
  return (
    <div className="flex flex-col gap-6">
      <p
        role="note"
        className="rounded-card-flat border border-line bg-white px-4 py-3 text-caption text-ink-2"
      >
        {DRAFT_NOTICE}
      </p>
      <Card title="접수 정보">
        <OpsDetailList
          items={[
            {
              label: "접수 상태",
              value: <OpsStatusBadge status={intake.status} map={INTAKE_STATUS} />,
            },
            {
              label: "본인 확인 상태",
              value: (
                <OpsStatusBadge status={intake.verificationStatus} map={VERIFICATION_STATUS} />
              ),
            },
            {
              label: "요청 종류",
              value: REQUEST_TYPE_LABELS[intake.requestType] ?? intake.requestType,
            },
            {
              label: "요청자 구분",
              value: REQUESTER_ROLE_LABELS[intake.requesterRole] ?? intake.requesterRole,
            },
            {
              label: "연락 방법",
              value: CHANNEL_LABELS[intake.contactChannel] ?? intake.contactChannel,
            },
            { label: "연락처(마스킹)", value: intake.maskedContact ?? "연락처 삭제됨" },
            { label: "링크 발급 사무소", value: intake.officeName },
            { label: "링크 종류", value: LINK_KIND_LABELS[intake.linkKind] ?? intake.linkKind },
            { label: "접수 시각", value: formatSeoulDateTime(intake.receivedAt) },
            { label: "내부 목표 기한", value: formatSeoulDateTime(intake.internalDueAt) },
          ]}
        />
        <p className="mt-3 text-caption text-ink-2">
          연락처는 서버가 가린 값만 보이며 원문이 필요하면 원문 접근 절차를 이용해 주세요.
        </p>
      </Card>
      {notice ? (
        <p
          role={notice.tone === "error" ? "alert" : "status"}
          className="text-body font-semibold text-ink"
        >
          {notice.text}
        </p>
      ) : null}
      {intake.status === "CONVERTED" ? (
        <Card title="전환 완료">
          <p role="status" className="text-body text-ink">
            이미 권리 요청으로 전환된 접수입니다. 권리 요청 번호는{" "}
            <strong>{intake.privacyRequestId ?? "-"}</strong>입니다. 다시 전환할 수 없습니다.
          </p>
        </Card>
      ) : intake.status === "CLOSED" ? (
        <Card title="종결 완료">
          <p role="status" className="text-body text-ink">
            종결된 접수입니다. 더 처리할 수 없습니다.
          </p>
        </Card>
      ) : (
        <ResolveForm
          intake={intake}
          onDone={(done) => {
            setNotice(done);
            refetch();
          }}
        />
      )}
      <p className="text-caption text-ink-2">
        <Link href="/ops/guest-privacy-intakes" className="font-semibold text-primary underline">
          목록으로
        </Link>
      </p>
    </div>
  );
}

function ConflictRefresh({ refetch }: { refetch: () => void }) {
  return (
    <Button variant="ghost" size="sm" onClick={refetch}>
      새로 고침
    </Button>
  );
}

function IntakeLoader({ intakeId }: { intakeId: number }) {
  const query = useIntakeLookup(intakeId);
  return (
    <QueryGate query={query} loadingLabel="접수를 불러오는 중입니다">
      {(intake) =>
        intake === null ? (
          <section role="alert" className="rounded-card-flat border border-line bg-white px-6 py-8">
            <h2 className="text-h2 font-semibold text-ink">접수를 찾을 수 없습니다</h2>
            <p className="mt-2 text-body text-ink-2">
              번호가 맞는지 확인해 주세요. 목록에서 다시 선택할 수 있습니다.
            </p>
            <ConflictRefresh refetch={() => void query.refetch()} />
          </section>
        ) : (
          <IntakeBody intake={intake} refetch={() => void query.refetch()} />
        )
      }
    </QueryGate>
  );
}

export function IntakeDetailScreen({ intakeId }: { intakeId: number }) {
  return (
    <OpsScreen
      title={`비회원 권리 요청 ${intakeId}`}
      description="본인 확인 결과를 기록하고 권리 요청으로 전환하거나 종결합니다."
      roles={["PRIVACY"]}
    >
      <IntakeLoader intakeId={intakeId} />
    </OpsScreen>
  );
}
