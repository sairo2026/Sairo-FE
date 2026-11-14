"use client";

import Link from "next/link";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import type {
  ApproverConditionBulkApplyResponse,
  ApproverConditionBulkPreviewResponse,
} from "@/lib/api/contracts/visit.schema";
import { ApiError } from "@/shared/api/client";
import { toErrorScreenKind } from "@/shared/api/error-kind";
import { ErrorScreen } from "@/shared/components/feedback/error-screen";
import { FormAlert, FormNotice } from "@/shared/components/feedback/form-frame";
import { PageSkeleton } from "@/shared/components/feedback/skeleton";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { PageHeader } from "@/shared/components/ui/page-header";
import { SelectField } from "@/shared/components/ui/select-field";
import { Checkbox } from "@/shared/components/ui/select-field";
import { fetchApproverConditions } from "../api/approver.api";
import { applyBulkConditions, portalApprovalBase, previewBulkConditions } from "../api/review.api";
import { usePortalApprovals } from "../hooks/review-queries";
import {
  conditionToForm,
  emptyConditionForm,
  toConditionRequest,
  validateCondition,
  violatedRuleLabel,
} from "../model/conditions";
import type { ConditionErrors, ConditionFormValues } from "../model/conditions";
import { BULK_FAILURE_LABEL, labelOf } from "../model/labels";
import { describeVisitError } from "../model/messages";
import { SessionExpiredScreen } from "./approver-account-screen";
import { ConditionForm } from "./condition-form";

const BULK_MAX = 20;

type Preview = ApproverConditionBulkPreviewResponse["items"][number];
type ApplyItem = ApproverConditionBulkApplyResponse["items"][number];

function conditionBody(values: ConditionFormValues, noticeVersion: string) {
  const { impactAcknowledged, acknowledgedNoticeVersion, ...condition } = toConditionRequest(
    values,
    { impactAcknowledged: false, noticeVersion },
  );
  void impactAcknowledged;
  void acknowledgedNoticeVersion;
  return condition;
}

export function ApproverBulkScreen({ initialIds }: { initialIds: number[] }) {
  const query = usePortalApprovals();
  const [selected, setSelected] = useState<number[]>(initialIds.slice(0, BULK_MAX));
  const [values, setValues] = useState<ConditionFormValues>(() => emptyConditionForm());
  const [errors, setErrors] = useState<ConditionErrors>({});
  const [loadSource, setLoadSource] = useState("");
  const [previews, setPreviews] = useState<Preview[]>();
  const [acknowledged, setAcknowledged] = useState<number[]>([]);
  const [results, setResults] = useState<ApplyItem[]>();
  const [formError, setFormError] = useState<string>();

  const noticeVersion = query.data?.privacyNotice.noticeVersion ?? "";

  const load = useMutation({
    mutationFn: (approvalId: number) => fetchApproverConditions(portalApprovalBase(approvalId)),
    onSuccess: (condition) => {
      setValues(conditionToForm(condition));
      setFormError(undefined);
    },
    onError: (caught) =>
      setFormError(
        describeVisitError(
          caught,
          "현재 조건을 불러오지 못했습니다. 조건이 없는 매물일 수 있습니다.",
        ),
      ),
  });

  const preview = useMutation({
    mutationFn: () =>
      previewBulkConditions({
        approvalIds: selected,
        condition: conditionBody(values, noticeVersion),
      }),
    onSuccess: (response) => {
      setPreviews(response.items);
      setAcknowledged([]);
      setResults(undefined);
      setFormError(undefined);
    },
    onError: (caught) =>
      setFormError(describeVisitError(caught, "영향을 확인하지 못했습니다. 다시 시도해 주세요.")),
  });

  const apply = useMutation({
    mutationFn: () =>
      applyBulkConditions({
        approvalIds: selected,
        condition: conditionBody(values, noticeVersion),
        impactAcknowledgedApprovalIds: acknowledged,
        acknowledgedNoticeVersion: noticeVersion,
      }),
    onSuccess: (response) => {
      setResults(response.items);
      setFormError(undefined);
    },
    onError: (caught) =>
      setFormError(describeVisitError(caught, "조건을 적용하지 못했습니다. 다시 시도해 주세요.")),
  });

  if (query.isPending) return <PageSkeleton label="연결된 매물을 불러오는 중입니다." />;
  if (query.isError) {
    const failure = query.error;
    if (failure instanceof ApiError && failure.status === 401) return <SessionExpiredScreen />;
    return (
      <ErrorScreen
        kind={toErrorScreenKind(failure)}
        traceId={failure instanceof ApiError ? failure.traceId : undefined}
        retryAfterSeconds={failure instanceof ApiError ? failure.retryAfterSeconds : undefined}
        onRetry={() => void query.refetch()}
      />
    );
  }

  const eligible = query.data.items.filter(
    (item) => item.linkState === "LINKED" && item.approvalRole === "PRIMARY" && item.approvalActive,
  );
  const nameOf = (approvalId: number) => {
    const found = query.data.items.find((item) => item.approvalId === approvalId);
    return found?.propertyDisplayName ?? found?.propertyAddress ?? `출입승인 ${approvalId}`;
  };

  function toggle(approvalId: number) {
    setPreviews(undefined);
    setResults(undefined);
    setSelected((current) => {
      if (current.includes(approvalId)) return current.filter((id) => id !== approvalId);
      if (current.length >= BULK_MAX) return current;
      return [...current, approvalId];
    });
  }

  function runPreview() {
    setFormError(undefined);
    if (selected.length === 0) {
      setFormError("적용할 출입승인을 선택해 주세요.");
      return;
    }
    const next = validateCondition(values);
    setErrors(next);
    if (Object.keys(next).length > 0) {
      setFormError("입력한 내용을 확인해 주세요.");
      return;
    }
    preview.mutate();
  }

  const needAck = previews?.filter((item) => item.eligible && item.hasImpact) ?? [];
  const canApply =
    previews !== undefined && needAck.every((item) => acknowledged.includes(item.approvalId));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="조건 일괄 적용"
        description="선택한 여러 매물에 같은 방문 조건을 한 번에 적용합니다."
        actions={
          <Link
            href="/approver/account"
            className="text-caption font-semibold text-primary underline"
          >
            내 매물 모아보기
          </Link>
        }
      />
      <FormNotice>
        적용하면 각 출입승인의 기존 조건이 새 버전으로 덮어써지며 이전 버전은 보존됩니다. 기존 날짜
        예외와 날짜별 필수 조건도 함께 바뀝니다. 한 번에 최대 {BULK_MAX}개까지 선택할 수 있고 대표
        승인자로 연결된 출입승인만 선택할 수 있습니다.
      </FormNotice>
      <Card title={`대상 출입승인 ${selected.length}/${BULK_MAX}`}>
        {eligible.length === 0 ? (
          <p className="text-body text-ink-2">선택할 수 있는 대표 승인자 출입승인이 없습니다.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {eligible.map((item) => (
              <li key={item.approvalId}>
                <Checkbox
                  label={nameOf(item.approvalId)}
                  checked={selected.includes(item.approvalId)}
                  onCheckedChange={() => toggle(item.approvalId)}
                />
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Card title="적용할 조건">
        <div className="flex flex-col gap-4">
          <SelectField
            label="한 매물의 현재 조건 불러오기"
            value={loadSource}
            options={[
              { value: "", label: "선택해 주세요" },
              ...eligible.map((item) => ({
                value: String(item.approvalId),
                label: nameOf(item.approvalId),
              })),
            ]}
            onValueChange={(value) => {
              setLoadSource(value);
              if (value !== "") load.mutate(Number(value));
            }}
          />
          <ConditionForm
            values={values}
            errors={errors}
            disabled={preview.isPending || apply.isPending}
            onChange={(next) => {
              setValues(next);
              setPreviews(undefined);
              setResults(undefined);
            }}
          />
        </div>
      </Card>
      {formError ? <FormAlert>{formError}</FormAlert> : null}
      <div>
        <Button isLoading={preview.isPending} onClick={runPreview}>
          영향 미리보기
        </Button>
      </div>
      {previews ? (
        <Card title="미리보기 결과">
          <ul className="flex flex-col gap-3">
            {previews.map((item) => (
              <li key={item.approvalId} className="flex flex-col gap-1 text-body text-ink-2">
                <span className="font-semibold text-ink">
                  {item.propertyDisplayName ?? nameOf(item.approvalId)}
                </span>
                {!item.eligible ? (
                  <span className="text-caption text-danger">
                    적용할 수 없음 ·{" "}
                    {labelOf(BULK_FAILURE_LABEL, item.ineligibleReason ?? "INVALID_CONDITION")}
                  </span>
                ) : item.hasImpact ? (
                  <>
                    <span className="text-caption">
                      영향 받는 확정 방문 {item.affectedItems.length}건
                    </span>
                    <ul className="text-caption">
                      {(
                        item.affectedItems as Array<{
                          scheduleItemId: number;
                          violatedRules: unknown[];
                        }>
                      ).map((entry) => (
                        <li key={entry.scheduleItemId}>
                          방문 {entry.scheduleItemId} ·{" "}
                          {entry.violatedRules.map(violatedRuleLabel).join(", ")}
                        </li>
                      ))}
                    </ul>
                    <Checkbox
                      label={`${nameOf(item.approvalId)} 영향을 확인했습니다`}
                      checked={acknowledged.includes(item.approvalId)}
                      onCheckedChange={(checked) =>
                        setAcknowledged((current) =>
                          checked
                            ? [...current, item.approvalId]
                            : current.filter((id) => id !== item.approvalId),
                        )
                      }
                    />
                  </>
                ) : (
                  <span className="text-caption">영향 없음</span>
                )}
              </li>
            ))}
          </ul>
          <div className="mt-4">
            <Button isLoading={apply.isPending} disabled={!canApply} onClick={() => apply.mutate()}>
              선택한 출입승인에 적용
            </Button>
          </div>
        </Card>
      ) : null}
      {results ? (
        <Card title="적용 결과">
          <ul className="flex flex-col gap-2">
            {results.map((item) => (
              <li key={item.approvalId} className="flex flex-wrap items-center gap-2 text-body">
                <span className="text-ink">{nameOf(item.approvalId)}</span>
                {item.result === "APPLIED" ? (
                  <Badge tone="green" className="h-8 min-w-0 px-3 text-caption">
                    적용됨
                  </Badge>
                ) : item.result === "NEEDS_IMPACT_ACK" ? (
                  <Badge tone="amber" className="h-8 min-w-0 px-3 text-caption">
                    영향 확인 필요
                  </Badge>
                ) : (
                  <Badge tone="red" className="h-8 min-w-0 px-3 text-caption">
                    실패
                  </Badge>
                )}
                {item.failureCode ? (
                  <span className="text-caption text-danger">
                    {labelOf(BULK_FAILURE_LABEL, item.failureCode)}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
          {results.some((item) => item.result === "NEEDS_IMPACT_ACK") ? (
            <p className="mt-3 text-caption text-ink-2">
              영향 확인 필요 항목은 위 미리보기에서 영향을 확인한 뒤 다시 적용해 주세요.
            </p>
          ) : null}
        </Card>
      ) : null}
    </div>
  );
}
