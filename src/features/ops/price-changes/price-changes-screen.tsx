"use client";

import { useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { ConfirmDialog } from "@/shared/components/ui/modal";
import { SelectField } from "@/shared/components/ui/select-field";
import { TextField } from "@/shared/components/ui/text-field";
import { formatKrw, formatSeoulDateTime } from "@/shared/lib/format";
import type { OpsPriceChangeNoticeCreateResponse } from "@/lib/api/contracts/ops.schema";
import { OpsFilterBar } from "../components/common/ops-filter-bar";
import { OpsScreen } from "../components/common/ops-screen";
import { OpsStatusBadge } from "../components/common/ops-status-badge";
import { OpsTable, useOpsPaging } from "../components/common/ops-table";
import { useCreatePriceNotices, usePriceNotices, usePriceSchedules } from "./price-api";
import {
  CHANGE_KIND_LABELS,
  DECISION_STATUS,
  MAX_OFFICE_IDS,
  NOTICE_RULE_TEXT,
  SKIP_REASON_LABELS,
  describePriceError,
  parseOfficeIds,
} from "./price-model";

type Filter = { scheduleId: string; decision: string; officeId: string };
const EMPTY: Filter = { scheduleId: "", decision: "", officeId: "" };

const DECISION_OPTIONS = [
  { value: "", label: "전체" },
  ...Object.entries(DECISION_STATUS).map(([value, entry]) => ({ value, label: entry.label })),
];

function CreateCard() {
  const schedules = usePriceSchedules();
  const create = useCreatePriceNotices();
  const [scheduleId, setScheduleId] = useState("");
  const [officeText, setOfficeText] = useState("");
  const [officeError, setOfficeError] = useState<string | undefined>();
  const [isConfirming, setIsConfirming] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [result, setResult] = useState<OpsPriceChangeNoticeCreateResponse | null>(null);

  const candidates = (schedules.data?.items ?? []).filter(
    (item) => item.audience === "STANDARD" && item.status === "SCHEDULED",
  );
  const selected = candidates.find((item) => String(item.scheduleId) === scheduleId);

  function requestConfirm() {
    setFailure(null);
    if (!selected) {
      setFailure("안내를 만들 새 가격 버전을 선택해 주세요.");
      return;
    }
    if (parseOfficeIds(officeText) === "invalid") {
      setOfficeError(`사무소 ID를 쉼표로 구분해 ${MAX_OFFICE_IDS}개 이내로 입력해 주세요.`);
      return;
    }
    setOfficeError(undefined);
    setIsConfirming(true);
  }

  async function submit() {
    const ids = parseOfficeIds(officeText);
    if (!selected || ids === "invalid") return;
    try {
      setResult(await create.mutateAsync({ scheduleId: selected.scheduleId, officeIds: ids }));
      setFailure(null);
    } catch (error) {
      setResult(null);
      setFailure(describePriceError(error));
    }
    setIsConfirming(false);
  }

  return (
    <Card title="가격 변경 안내 만들기">
      <div className="flex flex-col gap-4">
        <p className="text-body text-ink-2">
          구독 중, 미납 유예, 미납 제한 사무소가 대상입니다. 시작 고객 가격 보장 기간 안의 사무소,
          체험·결제 전 사무소, 이미 같은 안내가 있는 사무소는 건너뜁니다.
        </p>
        <p role="note" className="text-caption text-ink-2">
          {NOTICE_RULE_TEXT}
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SelectField
            label="새 가격 버전"
            value={scheduleId}
            placeholder={schedules.isPending ? "불러오는 중입니다" : "버전을 선택해 주세요"}
            options={candidates.map((item) => ({
              value: String(item.scheduleId),
              label: `${item.version} (효력 ${formatSeoulDateTime(item.effectiveAt)})`,
            }))}
            onValueChange={setScheduleId}
          />
          <TextField
            label="사무소 ID 목록(선택)"
            value={officeText}
            onValueChange={setOfficeText}
            error={officeError}
            hint="비우면 모든 대상 사무소에 만듭니다."
          />
        </div>
        {schedules.isError ? (
          <p role="alert" className="text-caption text-danger">
            가격 버전을 불러오지 못했습니다.
          </p>
        ) : null}
        {selected ? (
          <p className="text-caption text-ink-2">
            Solo {formatKrw(selected.soloAmount)}, 2~4인 추가 {formatKrw(selected.teamFirstExtra)},
            5인 이상 추가 {formatKrw(selected.teamAfterFourExtra)} · 효력{" "}
            {formatSeoulDateTime(selected.effectiveAt)}
          </p>
        ) : null}
        {failure ? (
          <p role="alert" className="text-caption text-danger">
            {failure}
          </p>
        ) : null}
        <div>
          <Button onClick={requestConfirm}>안내 생성</Button>
        </div>
        {result ? (
          <div
            role="status"
            className="flex flex-col gap-2 rounded-card-flat border border-line p-4"
          >
            <p className="text-body font-semibold text-ink">
              안내 {result.createdCount}건을 만들고 {result.skippedCount}곳을 건너뛰었습니다.
            </p>
            {result.skipped.length > 0 ? (
              <ul aria-label="건너뛴 사무소" className="text-caption text-ink-2">
                {result.skipped.map((item) => (
                  <li key={item.officeId}>
                    사무소 {item.officeId}: {SKIP_REASON_LABELS[item.reason] ?? item.reason}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </div>
      <ConfirmDialog
        isOpen={isConfirming}
        title="가격 변경 안내 생성"
        message={`${selected?.version ?? ""} 안내를 만듭니다. 만든 안내는 되돌릴 수 없고 생성 기록은 감사 로그에 남습니다.`}
        confirmLabel="안내 생성"
        isPending={create.isPending}
        onConfirm={() => void submit()}
        onCancel={() => setIsConfirming(false)}
      />
    </Card>
  );
}

function StatusSummary({
  summary,
}: {
  summary: {
    pending: number;
    agreed: number;
    declined: number;
    notRequired: number;
    endedNoConsent: number;
  };
}) {
  const items = [
    { label: "응답 대기", count: summary.pending },
    { label: "동의", count: summary.agreed },
    { label: "거절", count: summary.declined },
    { label: "안내만", count: summary.notRequired },
    { label: "무응답 종료", count: summary.endedNoConsent },
  ];
  return (
    <ul aria-label="결정별 건수" className="flex flex-wrap gap-4 text-body text-ink">
      {items.map((item) => (
        <li key={item.label}>
          {item.label} {item.count}건
        </li>
      ))}
    </ul>
  );
}

function NoticeList() {
  const schedules = usePriceSchedules();
  const [draft, setDraft] = useState<Filter>(EMPTY);
  const [applied, setApplied] = useState<Filter>(EMPTY);
  const paging = useOpsPaging();
  const query = usePriceNotices({
    priceScheduleId: applied.scheduleId,
    decision: applied.decision,
    officeId: applied.officeId,
    page: paging.page,
    size: paging.size,
  });
  const standard = (schedules.data?.items ?? []).filter((item) => item.audience === "STANDARD");
  return (
    <div className="flex flex-col gap-4">
      <OpsFilterBar
        label="가격 변경 안내 조회"
        onApply={() => {
          setApplied(draft);
          paging.resetPage();
        }}
        onReset={() => {
          setDraft(EMPTY);
          setApplied(EMPTY);
          paging.resetPage();
        }}
      >
        <SelectField
          label="가격 버전"
          value={draft.scheduleId}
          options={[
            { value: "", label: "전체" },
            ...standard.map((item) => ({ value: String(item.scheduleId), label: item.version })),
          ]}
          onValueChange={(scheduleId) => setDraft({ ...draft, scheduleId })}
        />
        <SelectField
          label="결정"
          value={draft.decision}
          options={DECISION_OPTIONS}
          onValueChange={(decision) => setDraft({ ...draft, decision })}
        />
        <TextField
          label="사무소 ID"
          kind="number"
          value={draft.officeId}
          onValueChange={(officeId) => setDraft({ ...draft, officeId })}
        />
      </OpsFilterBar>
      {query.data ? <StatusSummary summary={query.data.summary} /> : null}
      <p className="text-caption text-ink-2">
        시작 고객 가격 보장 종료 안내도 같은 목록에 표시됩니다. 건수는 조건에 맞는 전체 결과
        기준입니다.
      </p>
      <OpsTable
        caption="가격 변경 안내 목록"
        query={query}
        paging={paging}
        getRowId={(row) => String(row.noticeId)}
        emptyMessage="조건에 맞는 가격 변경 안내가 없습니다."
        columns={[
          {
            key: "office",
            header: "사무소",
            render: (row) => `${row.officeName} (${row.officeId})`,
          },
          {
            key: "kind",
            header: "구분",
            render: (row) => CHANGE_KIND_LABELS[row.changeKind] ?? row.changeKind,
          },
          { key: "from", header: "이전 버전", render: (row) => row.fromPriceVersion },
          { key: "to", header: "새 버전", render: (row) => row.toPriceVersion },
          {
            key: "notified",
            header: "안내 시각",
            render: (row) => formatSeoulDateTime(row.notifiedAt),
          },
          {
            key: "effective",
            header: "효력 시각",
            render: (row) => formatSeoulDateTime(row.effectiveAt),
          },
          {
            key: "due",
            header: "응답 기한",
            render: (row) => formatSeoulDateTime(row.responseDueAt),
          },
          {
            key: "decision",
            header: "결정",
            render: (row) => <OpsStatusBadge status={row.decision} map={DECISION_STATUS} />,
          },
          {
            key: "decided",
            header: "결정 시각",
            render: (row) => (row.decidedAt ? formatSeoulDateTime(row.decidedAt) : "-"),
          },
        ]}
      />
    </div>
  );
}

export function PriceChangesScreen() {
  return (
    <OpsScreen
      title="가격 변경 안내"
      description="새 가격 버전의 안내 대상을 만들고 사무소별 응답 현황을 봅니다."
      roles={["BILLING"]}
    >
      <CreateCard />
      <NoticeList />
    </OpsScreen>
  );
}
