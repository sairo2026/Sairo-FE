"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import type { CustomerDetailResponse } from "@/lib/api/contracts/customer.schema";
import { ApiError } from "@/shared/api/client";
import { toErrorScreenKind } from "@/shared/api/error-kind";
import { ErrorScreen } from "@/shared/components/feedback/error-screen";
import { FormAlert, FormNotice } from "@/shared/components/feedback/form-frame";
import { PageSkeleton } from "@/shared/components/feedback/skeleton";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { Checkbox } from "@/shared/components/ui/select-field";
import { PageHeader } from "@/shared/components/ui/page-header";
import { formatSeoulDateTime } from "@/shared/lib/format";
import { useAssignableMembers } from "@/shared/session/assignable-members";
import { useOfficeAccess } from "@/shared/session/office-access-context";
import { mergeCustomers } from "../api/customer.api";
import { customerKeys, useCustomerDetail } from "../hooks/customer-queries";
import { CONSULTATION_TYPE_LABEL } from "../model/labels";
import { describeCustomerError, isApiCode } from "../model/messages";
import {
  MERGE_FIELDS,
  MERGE_FIELD_LABEL,
  checkMergeReadiness,
  differingFields,
  fieldValue,
  firstInquiryIds,
  needsFirstInquiryChoice,
  pickDefaultPrimary,
  toMergeRequest,
} from "../model/merge";
import type { MergeChoices, MergeField, MergeSide } from "../model/merge";

function displayValue(
  customer: CustomerDetailResponse,
  field: MergeField,
  managerName: (id: number) => string,
): string {
  if (field === "managingMembershipId") return managerName(customer.managingMembershipId);
  const value = fieldValue(customer, field);
  return value === "" ? "없음" : value;
}

function MergeForm({
  first,
  second,
}: {
  first: CustomerDetailResponse;
  second: CustomerDetailResponse;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const members = useAssignableMembers();
  const noteId = useId();
  const [isSwapped, setIsSwapped] = useState(false);
  const [choices, setChoices] = useState<MergeChoices>({});
  const [keepFirstInquiryId, setKeepFirstInquiryId] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [formError, setFormError] = useState<string>();
  const [isConflict, setIsConflict] = useState(false);

  const [defaultPrimary, defaultMerged] = pickDefaultPrimary(first, second);
  const primary = isSwapped ? defaultMerged : defaultPrimary;
  const merged = isSwapped ? defaultPrimary : defaultMerged;
  const managerName = (id: number) =>
    members.data?.find((item) => item.membershipId === id)?.displayName ?? `담당자 ${id}`;

  const differing = differingFields(primary, merged);
  const needsInquiry = needsFirstInquiryChoice(primary, merged);
  const blockedReason =
    primary.status === "MERGED" || merged.status === "MERGED"
      ? "이미 병합된 고객은 다시 병합할 수 없습니다."
      : primary.status === "ARCHIVED" || merged.status === "ARCHIVED"
        ? "보관된 고객은 병합할 수 없습니다. 복원한 뒤 다시 시도해 주세요."
        : null;
  const readiness = checkMergeReadiness({
    primary,
    merged,
    choices,
    note,
    keepFirstInquiryId,
    isConfirmed,
  });

  const mutation = useMutation({
    mutationFn: () =>
      mergeCustomers(
        toMergeRequest({ primary, merged, choices, note, keepFirstInquiryId }),
        primary.version,
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: customerKeys.all });
      router.push(`/customers/${primary.customerId}`);
    },
    onError: async (caught) => {
      if (isApiCode(caught, "VERSION_CONFLICT")) {
        setIsConflict(true);
        await queryClient.invalidateQueries({ queryKey: customerKeys.all });
      }
      setFormError(
        describeCustomerError(caught, "고객을 병합하지 못했습니다. 다시 시도해 주세요."),
      );
    },
  });

  function swap() {
    setIsSwapped((value) => !value);
    setChoices({});
    setKeepFirstInquiryId(null);
    setIsConfirmed(false);
    setFormError(undefined);
  }

  function choose(field: MergeField, side: MergeSide) {
    setChoices((existing) => ({ ...existing, [field]: side }));
  }

  const inquiryOptions = [
    ...primary.consultations
      .filter((item) => item.consultationType === "FIRST_INQUIRY")
      .map((item) => ({ ...item, owner: "고객 A" })),
    ...merged.consultations
      .filter((item) => item.consultationType === "FIRST_INQUIRY")
      .map((item) => ({ ...item, owner: "고객 B" })),
  ];

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <PageHeader
        title="고객 병합"
        description="중복 등록된 고객 두 명을 하나로 합칩니다."
        actions={
          <Link
            href="/customers"
            className="inline-flex h-12 items-center rounded-control border border-line bg-white px-6 text-body font-medium text-ink-2 hover:border-primary hover:text-primary"
          >
            목록
          </Link>
        }
      />
      {blockedReason ? <FormAlert>{blockedReason}</FormAlert> : null}
      {formError ? <FormAlert>{formError}</FormAlert> : null}
      {isConflict ? (
        <div>
          <Button
            variant="outlined"
            size="sm"
            onClick={() => {
              setIsConflict(false);
              setFormError(undefined);
              setChoices({});
            }}
          >
            선택을 초기화하고 최신 내용으로 계속
          </Button>
        </div>
      ) : null}

      <Card tone="flat">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-col gap-1 text-body text-ink">
            <p>
              <strong>고객 A</strong> 병합 후 남는 고객: {primary.name} (고객 ID{" "}
              {primary.customerId})
            </p>
            <p>
              <strong>고객 B</strong> 합쳐질 고객: {merged.name} (고객 ID {merged.customerId})
            </p>
          </div>
          <Button variant="outlined" size="sm" disabled={mutation.isPending} onClick={swap}>
            남길 고객 바꾸기
          </Button>
        </div>
        <p className="mt-3 text-caption text-ink-2">
          남길 고객을 바꾸면 선택한 항목을 다시 확인해야 합니다.
        </p>
      </Card>

      <fieldset disabled={mutation.isPending} className="flex flex-col gap-6">
        <Card tone="flat" title="항목별 값 선택">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <caption className="sr-only">고객 병합 항목 비교</caption>
              <thead>
                <tr>
                  <th scope="col" className="px-3 py-2 text-caption font-semibold text-ink-2">
                    항목
                  </th>
                  <th scope="col" className="px-3 py-2 text-caption font-semibold text-ink-2">
                    고객 A
                  </th>
                  <th scope="col" className="px-3 py-2 text-caption font-semibold text-ink-2">
                    고객 B
                  </th>
                </tr>
              </thead>
              <tbody>
                {MERGE_FIELDS.map((field) => {
                  const isDifferent = differing.includes(field);
                  return (
                    <tr key={field} className="border-t border-line align-top">
                      <th scope="row" className="px-3 py-3 text-caption font-semibold text-ink">
                        {MERGE_FIELD_LABEL[field]}
                      </th>
                      {isDifferent ? (
                        (["PRIMARY", "MERGED"] as const).map((side) => {
                          const customer = side === "PRIMARY" ? primary : merged;
                          return (
                            <td key={side} className="px-3 py-3 text-body text-ink">
                              <label className="inline-flex items-center gap-2">
                                <input
                                  type="radio"
                                  name={`merge-${field}`}
                                  checked={choices[field] === side}
                                  onChange={() => choose(field, side)}
                                  aria-label={`${MERGE_FIELD_LABEL[field]} ${side === "PRIMARY" ? "고객 A" : "고객 B"} 값 선택`}
                                  className="h-5 w-5 accent-primary"
                                />
                                <span className="whitespace-pre-wrap">
                                  {displayValue(customer, field, managerName)}
                                </span>
                              </label>
                            </td>
                          );
                        })
                      ) : (
                        <td colSpan={2} className="px-3 py-3 text-body text-ink">
                          <span className="mr-2 rounded-small bg-surface px-2 py-1 text-caption text-ink-2">
                            동일
                          </span>
                          {displayValue(primary, field, managerName)}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        {needsInquiry ? (
          <Card tone="flat" title="최초문의 선택">
            <p className="mb-3 text-caption text-ink-2">
              최초문의로 남길 상담을 선택해 주세요. 나머지는 후속상담으로 바뀝니다.
            </p>
            <ul className="flex flex-col gap-3">
              {inquiryOptions.map((item) => (
                <li key={item.consultationId}>
                  <label className="flex items-start gap-3 text-body text-ink">
                    <input
                      type="radio"
                      name="keep-first-inquiry"
                      checked={keepFirstInquiryId === item.consultationId}
                      onChange={() => setKeepFirstInquiryId(item.consultationId)}
                      className="mt-1 h-5 w-5 accent-primary"
                    />
                    <span>
                      {item.owner} · {CONSULTATION_TYPE_LABEL.FIRST_INQUIRY} ·{" "}
                      {formatSeoulDateTime(item.occurredAt)} · {item.content}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </Card>
        ) : firstInquiryIds(primary).length + firstInquiryIds(merged).length > 0 ? (
          <FormNotice>한쪽에만 최초문의가 있어 그대로 유지됩니다.</FormNotice>
        ) : null}

        <Card tone="flat" title="충돌 정리">
          <div className="flex flex-col gap-2">
            <label htmlFor={noteId} className="text-caption font-semibold text-ink">
              충돌 정리 메모 <span className="text-primary">*</span>
            </label>
            <textarea
              id={noteId}
              rows={3}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              className="rounded-control border border-line bg-surface p-4 text-body text-ink focus:border-primary focus:bg-white"
            />
          </div>
        </Card>
      </fieldset>

      <FormAlert>
        고객 A가 병합 후 남는 고객이며, 고객 B는 병합됨 상태로 표시됩니다. 병합은 되돌릴 수
        없습니다. 남길 고객과 선택한 값을 확인해 주세요.
      </FormAlert>
      <Checkbox
        label="병합은 되돌릴 수 없다는 점을 확인했습니다."
        checked={isConfirmed}
        disabled={mutation.isPending}
        onCheckedChange={setIsConfirmed}
      />
      {!readiness.isReady ? (
        <ul className="list-disc pl-5 text-caption text-ink-2">
          {readiness.missing.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        <Button
          disabled={!readiness.isReady || blockedReason !== null}
          isLoading={mutation.isPending}
          onClick={() => {
            setFormError(undefined);
            mutation.mutate();
          }}
        >
          고객 A로 병합하기
        </Button>
        <span className="text-caption text-ink-2">
          남는 고객: {primary.name} (고객 ID {primary.customerId})
        </span>
      </div>
    </div>
  );
}

export function CustomerMergeScreen({
  primaryId,
  mergedId,
}: {
  primaryId: number;
  mergedId: number;
}) {
  const { role } = useOfficeAccess();
  const firstQuery = useCustomerDetail(primaryId);
  const secondQuery = useCustomerDetail(mergedId);

  if (role !== "OWNER") return <ErrorScreen kind="forbidden" />;
  if (primaryId === mergedId) {
    return (
      <FormAlert>
        같은 고객끼리는 병합할 수 없습니다. 목록에서 두 고객을 다시 선택해 주세요.
      </FormAlert>
    );
  }
  const failed = firstQuery.isError ? firstQuery : secondQuery.isError ? secondQuery : null;
  if (failed) {
    const error = failed.error;
    return (
      <ErrorScreen
        kind={toErrorScreenKind(error)}
        traceId={error instanceof ApiError ? error.traceId : undefined}
        retryAfterSeconds={error instanceof ApiError ? error.retryAfterSeconds : undefined}
        onRetry={() => void failed.refetch()}
      />
    );
  }
  if (!firstQuery.data || !secondQuery.data) {
    return <PageSkeleton label="병합할 고객을 불러오는 중입니다." />;
  }
  return (
    <MergeForm
      key={`${firstQuery.data.version}-${secondQuery.data.version}`}
      first={firstQuery.data}
      second={secondQuery.data}
    />
  );
}
