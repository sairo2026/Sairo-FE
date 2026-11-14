"use client";

import Link from "next/link";
import { useState } from "react";
import { ApiError } from "@/shared/api/client";
import { QueryGate } from "@/shared/components/feedback/query-gate";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { ConfirmDialog } from "@/shared/components/ui/modal";
import { formatKrw, formatSeoulDate, formatSeoulDateTime } from "@/shared/lib/format";
import { OpsDetailList } from "../components/common/ops-detail-list";
import { OpsScreen } from "../components/common/ops-screen";
import { OpsStatusBadge } from "../components/common/ops-status-badge";
import { describeOpsError } from "../model/ops-errors";
import { useLeadActions, useLeadDetail } from "./lead-api";
import {
  AssignDialog,
  CloseDialog,
  ContractDialog,
  QuoteDialog,
  ReopenDialog,
} from "./lead-dialogs";
import {
  ACTION_LABELS,
  ACTOR_LABELS,
  CLOSED_REASONS,
  EVENT_LABELS,
  LEAD_STATUS,
  STAGES,
  quoteState,
} from "./lead-model";
import type { LeadAction, LeadDetail } from "./lead-model";

type Notice = { tone: "ok" | "error"; text: string };

const ACTION_ORDER: LeadAction[] = [
  "ASSIGN",
  "START_CONSULTATION",
  "ISSUE_QUOTE",
  "CONTRACT",
  "CLOSE",
  "REOPEN",
];

function StageTracker({ lead }: { lead: LeadDetail }) {
  const currentIndex = STAGES.findIndex((stage) => stage.statuses.includes(lead.status));
  return (
    <Card title="진행 단계">
      <ol aria-label="진행 단계" className="flex flex-wrap gap-2">
        {STAGES.map((stage, index) => {
          const isCurrent = index === currentIndex;
          const isDone = index < currentIndex;
          return (
            <li
              key={stage.key}
              aria-current={isCurrent ? "step" : undefined}
              className={
                isCurrent
                  ? "rounded-control bg-primary px-4 py-2 text-caption font-bold text-white"
                  : isDone
                    ? "rounded-control bg-primary-soft px-4 py-2 text-caption font-semibold text-primary"
                    : "rounded-control border border-line px-4 py-2 text-caption text-ink-3"
              }
            >
              {isCurrent ? `${LEAD_STATUS[lead.status]?.label ?? lead.status} (현재)` : stage.label}
            </li>
          );
        })}
      </ol>
      {lead.status === "CLOSED" && lead.closedFromStatus ? (
        <p className="mt-3 text-caption text-ink-2">
          종료 직전 단계: {LEAD_STATUS[lead.closedFromStatus]?.label ?? lead.closedFromStatus}
        </p>
      ) : null}
    </Card>
  );
}

function QuoteCards({ lead }: { lead: LeadDetail }) {
  if (lead.quotes.length === 0) {
    return (
      <Card title="견적 버전">
        <p className="text-body text-ink-2">아직 발행한 견적이 없습니다.</p>
      </Card>
    );
  }
  return (
    <Card title="견적 버전">
      <ol aria-label="견적 버전 목록" className="flex flex-col gap-4">
        {[...lead.quotes].reverse().map((quote) => {
          const state = quoteState(quote);
          return (
            <li key={quote.quoteId}>
              <article
                aria-label={`견적 버전 ${quote.versionNo}`}
                className="rounded-card-flat border border-line px-5 py-4"
              >
                <header className="mb-3 flex flex-wrap items-center gap-2">
                  <strong className="text-body text-ink">버전 {quote.versionNo}</strong>
                  <Badge tone={state.tone}>{state.label}</Badge>
                </header>
                <OpsDetailList
                  items={[
                    { label: "도입 사무소 수", value: `${quote.officeCount}개` },
                    { label: "도입 인원", value: `${quote.seatCount}명` },
                    { label: "견적 금액", value: formatKrw(quote.quoteAmount) },
                    { label: "세금", value: formatKrw(quote.taxAmount) },
                    { label: "서비스 범위", value: quote.serviceScope },
                    { label: "납기", value: formatSeoulDate(quote.deliveryDueAt) },
                    { label: "결제 방식", value: quote.paymentMethod },
                    { label: "환불 조건", value: quote.refundTerms },
                    {
                      label: "발행",
                      value: `${formatSeoulDateTime(quote.issuedAt)} · ${quote.issuedByOperatorName}`,
                    },
                    { label: "유효기한", value: formatSeoulDateTime(quote.expiresAt) },
                    {
                      label: "수락 시각",
                      value: quote.acceptedAt ? formatSeoulDateTime(quote.acceptedAt) : null,
                    },
                    {
                      label: "거절 시각",
                      value: quote.rejectedAt ? formatSeoulDateTime(quote.rejectedAt) : null,
                    },
                    {
                      label: "대체된 시각",
                      value: quote.supersededAt ? formatSeoulDateTime(quote.supersededAt) : null,
                    },
                  ]}
                />
                {quote.billingInvoiceId ? (
                  <p className="mt-3 text-body text-ink">
                    일회성 청구서 번호: <strong>{quote.billingInvoiceId}</strong>
                    <span className="text-caption text-ink-2">
                      {" "}
                      (수락한 견적 버전의 합계, 부가세 포함으로 서버가 만들었습니다)
                    </span>
                  </p>
                ) : null}
              </article>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}

type DialogKind = LeadAction | null;

function LeadBody({ lead, refetch }: { lead: LeadDetail; refetch: () => void }) {
  const actions = useLeadActions(lead.leadId, lead.version);
  const [dialog, setDialog] = useState<DialogKind>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const allowed = new Set(lead.allowedActions);

  async function run<T>(fn: () => Promise<T>, success: string): Promise<T> {
    setNotice(null);
    try {
      const result = await fn();
      setNotice({ tone: "ok", text: success });
      return result;
    } catch (error) {
      if (error instanceof ApiError && error.code === "VERSION_CONFLICT") refetch();
      throw error;
    }
  }

  async function startConsultation() {
    try {
      await run(() => actions.startConsultation.mutateAsync(), "상담을 시작했습니다.");
    } catch (error) {
      setNotice({ tone: "error", text: describeOpsError(error, "상담을 시작하지 못했습니다.") });
    }
    setDialog(null);
  }

  return (
    <div className="flex flex-col gap-6">
      <StageTracker lead={lead} />
      <Card title="문의 정보">
        <OpsDetailList
          items={[
            { label: "기업명", value: lead.companyName },
            {
              label: "진행 상태",
              value: <OpsStatusBadge status={lead.status} map={LEAD_STATUS} />,
            },
            { label: "담당자", value: lead.contactName },
            { label: "담당자 연락처", value: lead.contactPhone },
            { label: "담당자 이메일", value: lead.contactEmail },
            { label: "배정된 운영자", value: lead.assignedOperatorName ?? "미배정" },
            { label: "예상 지점 수", value: `${lead.branchCount}개` },
            { label: "예상 인원", value: `${lead.expectedSeats}명` },
            { label: "이전 지원 필요", value: lead.migrationNeeded ? "필요" : "필요 없음" },
            { label: "접수 시각", value: formatSeoulDateTime(lead.createdAt) },
            { label: "계약 번호", value: lead.contractReference },
            {
              label: "계약 체결 시각",
              value: lead.contractedAt ? formatSeoulDateTime(lead.contractedAt) : null,
            },
            {
              label: "종료 사유",
              value: lead.closedReason
                ? (CLOSED_REASONS[lead.closedReason] ?? lead.closedReason)
                : null,
            },
            { label: "종료 메모", value: lead.closedNote },
            {
              label: "종료 시각",
              value: lead.closedAt ? formatSeoulDateTime(lead.closedAt) : null,
            },
          ]}
        />
        <p className="mt-4 whitespace-pre-wrap text-body text-ink">{lead.content}</p>
        <p className="mt-3 text-caption text-ink-2">
          연락처와 문의 원문 조회는 감사 로그에 남습니다.
        </p>
      </Card>
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
          <p className="text-caption text-ink-2">
            지금 할 수 있는 처리만 활성으로 보입니다. 상담 시작, 견적 발행, 계약 기록은 배정된
            담당자만 할 수 있습니다.
          </p>
          <div className="flex flex-wrap gap-3">
            {ACTION_ORDER.map((action) => (
              <Button
                key={action}
                variant={action === "CLOSE" || action === "REOPEN" ? "ghost" : "outlined"}
                disabled={!allowed.has(action)}
                onClick={() => setDialog(action)}
              >
                {ACTION_LABELS[action]}
              </Button>
            ))}
          </div>
        </div>
      </Card>
      <QuoteCards lead={lead} />
      <Card title="진행 이력">
        {lead.history.length === 0 ? (
          <p className="text-body text-ink-2">진행 이력이 없습니다.</p>
        ) : (
          <ol aria-label="진행 이력" className="flex flex-col gap-2">
            {lead.history.map((row) => (
              <li key={`${row.eventType}-${row.createdAt}`} className="text-body text-ink">
                {formatSeoulDateTime(row.createdAt)} ·{" "}
                {EVENT_LABELS[row.eventType] ?? row.eventType}
                {" · "}
                {ACTOR_LABELS[row.actorType] ?? row.actorType}
                {row.actorOperatorName ? ` ${row.actorOperatorName}` : ""}
                {row.assignedOperatorName ? ` · 담당 ${row.assignedOperatorName}` : ""}
                {row.fromStatus
                  ? ` · ${LEAD_STATUS[row.fromStatus]?.label ?? row.fromStatus} → ${LEAD_STATUS[row.toStatus]?.label ?? row.toStatus}`
                  : ` · ${LEAD_STATUS[row.toStatus]?.label ?? row.toStatus}`}
                {row.reason ? ` · ${row.reason}` : ""}
              </li>
            ))}
          </ol>
        )}
      </Card>
      {dialog === "ASSIGN" ? (
        <AssignDialog
          onSubmit={(id) => run(() => actions.assign.mutateAsync(id), "담당을 배정했습니다.")}
          onClose={() => setDialog(null)}
        />
      ) : null}
      <ConfirmDialog
        isOpen={dialog === "START_CONSULTATION"}
        title="상담 시작"
        message="문의를 상담 단계로 바꿉니다. 배정된 담당자 본인만 할 수 있습니다."
        confirmLabel="상담 시작"
        isPending={actions.startConsultation.isPending}
        onConfirm={() => void startConsultation()}
        onCancel={() => setDialog(null)}
      />
      {dialog === "ISSUE_QUOTE" ? (
        <QuoteDialog
          lead={lead}
          onSubmit={(body) =>
            run(() => actions.issueQuote.mutateAsync(body), "견적을 발행했습니다.")
          }
          onClose={() => setDialog(null)}
        />
      ) : null}
      {dialog === "CONTRACT" ? (
        <ContractDialog
          onSubmit={(body) => run(() => actions.contract.mutateAsync(body), "계약을 기록했습니다.")}
          onClose={() => setDialog(null)}
        />
      ) : null}
      {dialog === "CLOSE" ? (
        <CloseDialog
          onSubmit={(body) => run(() => actions.close.mutateAsync(body), "문의를 종료했습니다.")}
          onClose={() => setDialog(null)}
        />
      ) : null}
      {dialog === "REOPEN" ? (
        <ReopenDialog
          lead={lead}
          onSubmit={(body) => run(() => actions.reopen.mutateAsync(body), "문의를 재개했습니다.")}
          onClose={() => setDialog(null)}
        />
      ) : null}
      <p className="text-caption text-ink-2">
        <Link href="/ops/enterprise-leads" className="font-semibold text-primary underline">
          목록으로
        </Link>
      </p>
    </div>
  );
}

function LeadDetailLoader({ leadId }: { leadId: number }) {
  const query = useLeadDetail(leadId);
  return (
    <QueryGate query={query} loadingLabel="기업 도입 문의를 불러오는 중입니다">
      {(lead) => <LeadBody lead={lead} refetch={() => void query.refetch()} />}
    </QueryGate>
  );
}

export function LeadDetailScreen({ leadId }: { leadId: number }) {
  return (
    <OpsScreen
      title={`기업 도입 문의 ${leadId}`}
      description="접수부터 계약 또는 종료까지 단계별로 처리합니다."
      roles={["SUPPORT"]}
    >
      <LeadDetailLoader leadId={leadId} />
    </OpsScreen>
  );
}
