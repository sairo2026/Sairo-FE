"use client";

import Link from "next/link";
import { useState } from "react";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { ConfirmDialog } from "@/shared/components/ui/modal";
import { SelectField } from "@/shared/components/ui/select-field";
import { TextAreaField } from "@/shared/components/ui/textarea-field";
import { TextField } from "@/shared/components/ui/text-field";
import { formatSeoulDateTime } from "@/shared/lib/format";
import { OpsDetailList } from "../components/common/ops-detail-list";
import { OpsFilterBar } from "../components/common/ops-filter-bar";
import { OpsScreen } from "../components/common/ops-screen";
import { OpsStatusBadge } from "../components/common/ops-status-badge";
import { OpsTable, useOpsPaging } from "../components/common/ops-table";
import { describeOpsError } from "../model/ops-errors";
import { useHasOpsRole } from "../model/ops-session";
import { useDisputeActions, useDisputeList } from "./dispute-api";
import {
  ANSWER_LABELS,
  APPROVER_TYPE_LABELS,
  DECISION_NOTE_MAX,
  DISPUTE_STATUS,
  REASON_CODE_LABELS,
  REMOVE_REASONS,
  REVIEW_STATUS,
  STATUS_FILTERS,
  answerText,
} from "./dispute-model";
import type { DisputeItem } from "./dispute-model";

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

const AUDIT_NOTICE = "결정과 직권 삭제는 운영자 감사 로그에 남습니다.";

function DisputeDetail({
  dispute,
  canDecide,
  onDecided,
}: {
  dispute: DisputeItem;
  canDecide: boolean;
  onDecided: (text: string) => void;
}) {
  const { decide } = useDisputeActions();
  const [note, setNote] = useState("");
  const [pending, setPending] = useState<"UPHELD" | "REMOVED" | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const review = dispute.review;
  const trimmed = note.trim();
  const isOpen = dispute.status === "OPEN";
  const canSubmit = trimmed !== "" && trimmed.length <= DECISION_NOTE_MAX;

  async function confirm() {
    if (pending === null) return;
    const decision = pending;
    setNotice(null);
    try {
      await decide.mutateAsync({
        disputeId: dispute.disputeId,
        decision,
        decisionNote: trimmed,
      });
      setPending(null);
      onDecided(
        decision === "UPHELD"
          ? `이의 ${dispute.disputeId}번을 평가 유지로 결정했습니다.`
          : `이의 ${dispute.disputeId}번을 평가 삭제로 결정했습니다.`,
      );
    } catch (error) {
      setPending(null);
      setNotice({ tone: "error", text: describeOpsError(error, "결정하지 못했습니다.") });
    }
  }

  return (
    <Card title={`이의 ${dispute.disputeId} 상세`} aria-label={`이의 ${dispute.disputeId} 상세`}>
      <div className="flex flex-col gap-5">
        <OpsDetailList
          items={[
            {
              label: "이의 상태",
              value: <OpsStatusBadge status={dispute.status} map={DISPUTE_STATUS} />,
            },
            { label: "평가 상태", value: REVIEW_STATUS[review.reviewStatus] },
            { label: "사무소", value: dispute.reviewedBroker.officeName },
            { label: "평가받은 중개사", value: dispute.reviewedBroker.brokerName },
            { label: "방문 일시", value: formatSeoulDateTime(review.actualVisitedAt) },
            { label: "이의 접수 시각", value: formatSeoulDateTime(dispute.filedAt) },
            { label: "처리 목표일", value: formatSeoulDateTime(dispute.dueAt) },
            { label: "승인자 유형", value: APPROVER_TYPE_LABELS[review.approverType] },
            {
              label: "승인자 링크 발급자가 평가받은 중개사와 같은지",
              value: review.issuerIsReviewedBroker ? "같음" : "다름",
            },
            { label: "평가 최초 입력", value: formatSeoulDateTime(review.submittedAt) },
            { label: "평가 마지막 입력·수정", value: formatSeoulDateTime(review.lastRevisedAt) },
            { label: "평가 수정 횟수", value: `${review.revisionCount}회` },
          ]}
        />
        {review.issuerIsReviewedBroker ? (
          <p role="note" className="text-caption text-ink-2">
            승인자 링크를 평가받은 중개사 본인이 발급했습니다. 판정 참고 정보이며 평가를 자동으로
            제외하지 않습니다.
          </p>
        ) : null}
        <section aria-label="평가 응답">
          <h3 className="mb-2 text-body font-semibold text-ink">평가 응답</h3>
          <ul className="flex flex-col gap-1">
            {Object.entries(review.answers).map(([key, value]) => (
              <li key={key} className="text-body text-ink">
                {ANSWER_LABELS[key] ?? key}: {answerText(value)}
              </li>
            ))}
          </ul>
        </section>
        <section aria-label="이의 사유">
          <h3 className="mb-2 text-body font-semibold text-ink">이의 사유</h3>
          <p className="text-body text-ink">
            {REASON_CODE_LABELS[dispute.reasonCode]} · {dispute.reasonText}
          </p>
        </section>
        <p role="note" className="text-caption text-ink-2">
          승인자 이름, 연락처, 매물 주소는 이 화면에 나오지 않습니다. 확인이 필요하면{" "}
          <Link href="/ops/raw-access/new" className="font-semibold text-primary underline">
            원문 접근 요청
          </Link>
          으로 신청해 주세요.
        </p>
        {!isOpen ? (
          <section aria-label="결정 결과">
            <h3 className="mb-2 text-body font-semibold text-ink">결정 결과</h3>
            <p className="text-body text-ink">
              {DISPUTE_STATUS[dispute.status]?.label} ·{" "}
              {dispute.decidedAt ? formatSeoulDateTime(dispute.decidedAt) : "-"}
            </p>
            <p className="text-body text-ink-2">{dispute.decisionNote ?? "-"}</p>
          </section>
        ) : null}
        {isOpen && canDecide ? (
          <section aria-label="이의 결정" className="flex flex-col gap-3">
            <TextAreaField
              label="결정 사유 메모"
              value={note}
              maxLength={DECISION_NOTE_MAX}
              rows={3}
              hint="결정 사유 메모는 중개사 화면에 보입니다. 1자에서 500자까지 입력합니다."
              onValueChange={setNote}
            />
            <p className="text-caption text-ink-2">결정은 되돌릴 수 없습니다. {AUDIT_NOTICE}</p>
            <NoticeLine notice={notice} />
            <div className="flex flex-wrap gap-3">
              <Button variant="outlined" disabled={!canSubmit} onClick={() => setPending("UPHELD")}>
                평가 유지
              </Button>
              <Button variant="ghost" disabled={!canSubmit} onClick={() => setPending("REMOVED")}>
                평가 삭제
              </Button>
            </div>
          </section>
        ) : null}
        <ConfirmDialog
          isOpen={pending !== null}
          title={pending === "UPHELD" ? "평가 유지 결정" : "평가 삭제 결정"}
          message={`${
            pending === "UPHELD"
              ? "평가를 그대로 유지합니다."
              : "평가를 삭제합니다. 삭제한 평가는 복구할 수 없습니다."
          } 결정은 되돌릴 수 없고 ${AUDIT_NOTICE}`}
          confirmLabel={pending === "UPHELD" ? "평가 유지로 결정" : "평가 삭제로 결정"}
          isPending={decide.isPending}
          onConfirm={() => void confirm()}
          onCancel={() => setPending(null)}
        />
      </div>
    </Card>
  );
}

function DirectRemoveCard({ onRemoved }: { onRemoved: (text: string) => void }) {
  const { remove } = useDisputeActions();
  const [reviewId, setReviewId] = useState("");
  const [reasonCode, setReasonCode] = useState("");
  const [note, setNote] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const trimmed = note.trim();
  const id = Number(reviewId);
  const canSubmit =
    id > 0 && reasonCode !== "" && trimmed !== "" && trimmed.length <= DECISION_NOTE_MAX;

  async function confirm() {
    setNotice(null);
    try {
      await remove.mutateAsync({
        reviewId: id,
        reasonCode: reasonCode as "LEGAL_REQUEST" | "PRIVACY_REQUEST" | "OPERATOR_DISCRETION",
        decisionNote: trimmed,
      });
      setReviewId("");
      setReasonCode("");
      setNote("");
      onRemoved(`평가 ${id}번을 직권 삭제했습니다.`);
    } catch (error) {
      setNotice({ tone: "error", text: describeOpsError(error, "평가를 삭제하지 못했습니다.") });
    }
    setConfirming(false);
  }

  return (
    <Card title="이의 없이 평가 직권 삭제">
      <div className="flex flex-col gap-4">
        <p className="text-caption text-ink-2">
          법적 요청이나 개인정보 요청처럼 이의 없이 평가를 삭제해야 할 때만 씁니다. 열린 이의가
          있으면 함께 닫힙니다. 삭제는 되돌릴 수 없고 {AUDIT_NOTICE}
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField label="평가 번호" kind="number" value={reviewId} onValueChange={setReviewId} />
          <SelectField
            label="삭제 사유 코드"
            value={reasonCode}
            placeholder="사유를 선택해 주세요"
            options={Object.entries(REMOVE_REASONS).map(([value, label]) => ({ value, label }))}
            onValueChange={setReasonCode}
          />
        </div>
        <TextAreaField
          label="직권 삭제 메모"
          value={note}
          maxLength={DECISION_NOTE_MAX}
          rows={3}
          hint="1자에서 500자까지 입력합니다."
          onValueChange={setNote}
        />
        <NoticeLine notice={notice} />
        <div>
          <Button variant="ghost" disabled={!canSubmit} onClick={() => setConfirming(true)}>
            평가 직권 삭제
          </Button>
        </div>
      </div>
      <ConfirmDialog
        isOpen={confirming}
        title="평가 직권 삭제"
        message={`평가 ${id}번을 삭제합니다. 삭제는 되돌릴 수 없고 ${AUDIT_NOTICE}`}
        confirmLabel="직권 삭제"
        isPending={remove.isPending}
        onConfirm={() => void confirm()}
        onCancel={() => setConfirming(false)}
      />
    </Card>
  );
}

function DisputeBoard() {
  const canDecide = useHasOpsRole(["SUPPORT"]);
  const [draft, setDraft] = useState("OPEN");
  const [status, setStatus] = useState("OPEN");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [now] = useState(() => Date.now());
  const paging = useOpsPaging();
  const query = useDisputeList({ status, page: paging.page, size: paging.size });
  const selected = query.data?.items.find((item) => item.disputeId === selectedId);

  return (
    <>
      <OpsFilterBar
        label="평가 이의 조회"
        onApply={() => {
          setStatus(draft);
          setSelectedId(null);
          paging.resetPage();
        }}
        onReset={() => {
          setDraft("OPEN");
          setStatus("OPEN");
          setSelectedId(null);
          paging.resetPage();
        }}
      >
        <SelectField
          label="이의 상태"
          value={draft}
          options={STATUS_FILTERS}
          onValueChange={setDraft}
        />
      </OpsFilterBar>
      <p className="text-caption text-ink-2">
        접수 시각이 오래된 이의부터 보입니다. 처리 목표일은 접수 후 7영업일이며 표시용입니다.
      </p>
      {result ? (
        <p role="status" className="text-body font-semibold text-ink">
          {result}
        </p>
      ) : null}
      <OpsTable
        caption="평가 이의 목록"
        query={query}
        paging={paging}
        getRowId={(row) => String(row.disputeId)}
        emptyMessage="조건에 맞는 평가 이의가 없습니다."
        columns={[
          { key: "id", header: "이의 번호", render: (row) => row.disputeId },
          {
            key: "status",
            header: "상태",
            render: (row) => (
              <span className="inline-flex items-center gap-2">
                <OpsStatusBadge status={row.status} map={DISPUTE_STATUS} />
                {row.status === "OPEN" && Date.parse(row.dueAt) < now ? (
                  <Badge tone="red">목표일 경과</Badge>
                ) : null}
              </span>
            ),
          },
          { key: "office", header: "사무소", render: (row) => row.reviewedBroker.officeName },
          { key: "broker", header: "중개사", render: (row) => row.reviewedBroker.brokerName },
          {
            key: "reason",
            header: "사유",
            render: (row) => REASON_CODE_LABELS[row.reasonCode],
          },
          {
            key: "filedAt",
            header: "접수 시각",
            render: (row) => formatSeoulDateTime(row.filedAt),
          },
          { key: "dueAt", header: "목표 처리일", render: (row) => formatSeoulDateTime(row.dueAt) },
          {
            key: "open",
            header: "상세",
            render: (row) => (
              <Button
                size="sm"
                variant="ghost"
                aria-label={`이의 ${row.disputeId} 상세 보기`}
                onClick={() => {
                  setResult(null);
                  setSelectedId(row.disputeId);
                }}
              >
                상세 보기
              </Button>
            ),
          },
        ]}
      />
      {selected ? (
        <DisputeDetail
          key={selected.disputeId}
          dispute={selected}
          canDecide={canDecide}
          onDecided={(text) => {
            setResult(text);
            setSelectedId(null);
          }}
        />
      ) : null}
      {canDecide ? <DirectRemoveCard onRemoved={setResult} /> : null}
    </>
  );
}

export function DisputeScreen() {
  return (
    <OpsScreen
      title="평가 이의"
      description="중개사가 낸 방문 평가 이의를 결정하고 필요하면 평가를 직권 삭제합니다."
      roles={["SUPPORT"]}
    >
      <DisputeBoard />
    </OpsScreen>
  );
}
