"use client";

import Link from "next/link";
import { useState } from "react";
import type { OpsPriceScheduleCreateResponse } from "@/lib/api/contracts/ops.schema";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { RadioGroup } from "@/shared/components/ui/select-field";
import { TextField } from "@/shared/components/ui/text-field";
import { formatKrw, formatSeoulDate, formatSeoulDateTime } from "@/shared/lib/format";
import { OpsScreen } from "../components/common/ops-screen";
import { OpsStatusBadge } from "../components/common/ops-status-badge";
import { OpsTable, useOpsPaging } from "../components/common/ops-table";
import { ActionDialog } from "../content-common/action-dialog";
import { FailureNotice, SuccessNotice } from "../content-common/notice-banner";
import { SeoulDateTimeInput } from "../content-common/seoul-date-time-input";
import { useHasOpsRole } from "../model/ops-session";
import {
  usePriceScheduleActions,
  usePriceScheduleList,
  usePricingPolicyDocuments,
} from "./price-schedule-api";
import {
  EMPTY_PRICE_FORM,
  NOTICE_DAYS,
  PRICE_AUDIENCE_LABELS,
  PRICE_AUDIENCE_OPTIONS,
  PRICE_RULE_TEXTS,
  PRICE_STATUS,
  SAMPLE_MEMBER_COUNTS,
  describePriceScheduleError,
  monthlyAmount,
  toPriceRequest,
  validatePriceForm,
} from "./price-schedule-model";
import type { PriceErrors, PriceForm } from "./price-schedule-model";

function AmountPreview({ form }: { form: PriceForm }) {
  const solo = Number(form.soloAmount);
  const first = Number(form.teamFirstExtra);
  const after = Number(form.teamAfterFourExtra);
  if (form.soloAmount === "" || form.teamFirstExtra === "" || form.teamAfterFourExtra === "") {
    return null;
  }
  const prices = { soloAmount: solo, teamFirstExtra: first, teamAfterFourExtra: after };
  return (
    <ul aria-label="인원별 월 금액 예시" className="text-caption text-ink-2">
      {SAMPLE_MEMBER_COUNTS.map((count) => (
        <li key={count}>
          {count}명 {formatKrw(monthlyAmount(count, prices))}
        </li>
      ))}
    </ul>
  );
}

function CreateCard() {
  const { create } = usePriceScheduleActions();
  const [form, setForm] = useState<PriceForm>(EMPTY_PRICE_FORM);
  const [errors, setErrors] = useState<PriceErrors>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [result, setResult] = useState<OpsPriceScheduleCreateResponse | null>(null);

  function patch(next: Partial<PriceForm>) {
    setForm({ ...form, ...next });
  }

  async function submit() {
    setFailure(null);
    setResult(null);
    const found = validatePriceForm(form);
    setErrors(found);
    const body = toPriceRequest(form);
    if (Object.keys(found).length > 0 || body === null) return;
    try {
      setResult(await create.mutateAsync(body));
      setForm(EMPTY_PRICE_FORM);
    } catch (caught) {
      setFailure(describePriceScheduleError(caught, "요금표를 저장하지 못했습니다."));
    }
  }

  return (
    <Card title="요금표 새 버전">
      <div className="flex flex-col gap-4">
        <ul className="list-disc pl-5 text-caption text-ink-2">
          {PRICE_RULE_TEXTS.map((text) => (
            <li key={text}>{text}</li>
          ))}
        </ul>
        <RadioGroup
          legend="요금표 대상"
          name="price-audience"
          value={form.audience}
          options={PRICE_AUDIENCE_OPTIONS}
          onValueChange={(audience) => patch({ audience })}
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <TextField
            label="Solo 기준액(원)"
            kind="number"
            value={form.soloAmount}
            error={errors.soloAmount}
            onValueChange={(soloAmount) => patch({ soloAmount })}
          />
          <TextField
            label="2~4인 추가액(원)"
            kind="number"
            value={form.teamFirstExtra}
            error={errors.teamFirstExtra}
            onValueChange={(teamFirstExtra) => patch({ teamFirstExtra })}
          />
          <TextField
            label="5인 이상 추가액(원)"
            kind="number"
            value={form.teamAfterFourExtra}
            error={errors.teamAfterFourExtra}
            onValueChange={(teamAfterFourExtra) => patch({ teamAfterFourExtra })}
          />
        </div>
        <AmountPreview form={form} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SeoulDateTimeInput
            label="효력"
            value={form.effectiveAt}
            error={errors.effectiveAt}
            onChange={(effectiveAt) => patch({ effectiveAt })}
          />
          <SeoulDateTimeInput
            label="안내"
            value={form.noticeAt}
            error={errors.noticeAt}
            onChange={(noticeAt) => patch({ noticeAt })}
          />
        </div>
        <FailureNotice message={failure} />
        <div>
          <Button isLoading={create.isPending} onClick={() => void submit()}>
            요금표 저장
          </Button>
        </div>
        {result ? (
          <p role="status" className="text-body font-semibold text-ink">
            {result.version} 버전을 저장했습니다. 작성자와 다른 결제담당의 승인이 필요합니다.
          </p>
        ) : null}
      </div>
    </Card>
  );
}

export function PriceSchedulesScreen() {
  const paging = useOpsPaging();
  const query = usePriceScheduleList({ page: paging.page, size: paging.size });
  const actions = usePriceScheduleActions();
  const canSeePolicy = useHasOpsRole(["OPS"]);
  const policies = usePricingPolicyDocuments(canSeePolicy);
  const [target, setTarget] = useState<{ scheduleId: number; version: string } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function consentText(effectiveAt: string): string {
    if (!canSeePolicy) return "요금표 정책 문서는 운영담당만 조회할 수 있습니다";
    if (policies.isPending) return "확인 중";
    if (policies.isError) return "확인하지 못했습니다";
    const day = formatSeoulDate(effectiveAt);
    const doc = policies.data.items.find(
      (item) =>
        item.docType === "PRICING" &&
        item.status !== "ENDED" &&
        item.effectiveAt !== null &&
        formatSeoulDate(item.effectiveAt) === day,
    );
    if (!doc) return "같은 시행일의 요금표 정책 문서가 없습니다";
    return doc.requiresConsent ? "명시적 동의 필요" : "명시적 동의 불필요";
  }

  return (
    <OpsScreen
      title="요금표"
      description="VAT 포함 요금표 버전을 만들고 작성자와 다른 결제담당이 승인합니다."
      roles={["BILLING"]}
    >
      <SuccessNotice message={notice} />
      <p className="text-caption text-ink-2">
        시작 고객 합의는 <Link href="/ops/start-customer-agreements">시작 고객 합의</Link>에서, 가격
        변경 안내는 <Link href="/ops/price-changes">가격 변경 안내</Link>에서 처리합니다.
        {canSeePolicy ? (
          <>
            {" "}
            체험 이벤트는 <Link href="/ops/trial-events">체험 이벤트</Link>에서 설정합니다.
          </>
        ) : null}
      </p>
      <CreateCard />
      <OpsTable
        caption="요금표 버전 목록"
        query={query}
        paging={paging}
        getRowId={(row) => String(row.scheduleId)}
        emptyMessage="등록된 요금표가 없습니다."
        columns={[
          { key: "version", header: "버전", render: (row) => row.version },
          {
            key: "audience",
            header: "대상",
            render: (row) => PRICE_AUDIENCE_LABELS[row.audience] ?? row.audience,
          },
          { key: "solo", header: "Solo 기준액", render: (row) => formatKrw(row.soloAmount) },
          { key: "first", header: "2~4인 추가액", render: (row) => formatKrw(row.teamFirstExtra) },
          {
            key: "after",
            header: "5인 이상 추가액",
            render: (row) => formatKrw(row.teamAfterFourExtra),
          },
          {
            key: "effective",
            header: "효력",
            render: (row) => formatSeoulDateTime(row.effectiveAt),
          },
          {
            key: "notice",
            header: "안내",
            render: (row) => (row.noticeAt ? formatSeoulDateTime(row.noticeAt) : "-"),
          },
          {
            key: "consent",
            header: "필요 동의",
            render: (row) => consentText(row.effectiveAt),
          },
          {
            key: "status",
            header: "상태",
            render: (row) => <OpsStatusBadge status={row.status} map={PRICE_STATUS} />,
          },
          {
            key: "approver",
            header: "승인자",
            render: (row) =>
              row.approvedByOperatorId === null ? "-" : `운영자 ${row.approvedByOperatorId}`,
          },
          {
            key: "actions",
            header: "처리",
            render: (row) =>
              row.status === "DRAFT" || row.status === "REVIEW" ? (
                <Button
                  size="sm"
                  aria-label={`${row.version} 승인`}
                  onClick={() => setTarget({ scheduleId: row.scheduleId, version: row.version })}
                >
                  승인
                </Button>
              ) : (
                "-"
              ),
          },
        ]}
      />
      <p className="text-caption text-ink-2">
        안내 시각은 시행 {NOTICE_DAYS}일 전 이전이어야 하며 승인한 요금표는 바꿀 수 없습니다.
      </p>
      {target ? (
        <ActionDialog
          isOpen
          title="요금표 승인"
          confirmLabel="승인"
          describeError={(caught) =>
            describePriceScheduleError(caught, "요금표를 승인하지 못했습니다.")
          }
          onClose={() => setTarget(null)}
          onConfirm={async () => {
            const result = await actions.approve.mutateAsync(target.scheduleId);
            setNotice(
              result.status === "ACTIVE"
                ? `${result.version} 요금표를 승인했습니다. 지금부터 시행됩니다.`
                : `${result.version} 요금표를 승인했습니다. 효력 시각에 맞춰 예약됩니다.`,
            );
          }}
        >
          <p>
            {target.version} 요금표를 승인합니다. 작성자와 다른 결제담당만 승인할 수 있고 승인한
            버전은 되돌릴 수 없습니다. 처리 기록은 감사 로그에 남습니다.
          </p>
        </ActionDialog>
      ) : null}
    </OpsScreen>
  );
}
