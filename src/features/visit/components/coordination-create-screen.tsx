"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FormAlert, FormNotice } from "@/shared/components/feedback/form-frame";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { DateTimeField } from "@/shared/components/ui/date-time-field";
import { PageHeader } from "@/shared/components/ui/page-header";
import { SelectField } from "@/shared/components/ui/select-field";
import { useAssignableMembers } from "@/shared/session/assignable-members";
import { useOfficeAccess } from "@/shared/session/office-access-context";
import { createCoordination } from "../api/visit.api";
import { visitKeys } from "../hooks/visit-queries";
import { MAX_CANDIDATES } from "../model/labels";
import { describeVisitError, isApiCode } from "../model/messages";
import { addDays, todayKst, validatePeriod } from "../model/time";
import { CandidatePicker, CustomerPicker } from "./pickers";
import type { CandidateChoice } from "./pickers";

type Errors = {
  customer?: string;
  candidates?: string;
  start?: string;
  end?: string;
};

export function CoordinationCreateScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { role, isReadOnly } = useOfficeAccess();
  const isDeputy = role === "DEPUTY";
  const members = useAssignableMembers();
  const today = todayKst();
  const [customer, setCustomer] = useState<{ customerId: number; name: string } | null>(null);
  const [candidates, setCandidates] = useState<CandidateChoice[]>([]);
  const [start, setStart] = useState(today);
  const [end, setEnd] = useState(addDays(today, 7));
  const [manager, setManager] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string>();

  const mutation = useMutation({
    mutationFn: () =>
      createCoordination({
        customerId: customer?.customerId ?? 0,
        candidatePropertyIds: candidates.map((item) => item.propertyId),
        managerMembershipId: !isDeputy && manager !== "" ? Number(manager) : null,
        periodStartDate: start,
        periodEndDate: end,
      }),
    onSuccess: async (created) => {
      await queryClient.invalidateQueries({ queryKey: visitKeys.all });
      router.push(`/coordinations/${created.coordinationId}`);
    },
    onError: (caught) => {
      if (isApiCode(caught, "CUSTOMER_ARCHIVED")) setCustomer(null);
      setFormError(describeVisitError(caught, "조율을 만들지 못했습니다. 다시 시도해 주세요."));
    },
  });

  function toggle(choice: CandidateChoice) {
    setCandidates((current) =>
      current.some((item) => item.propertyId === choice.propertyId)
        ? current.filter((item) => item.propertyId !== choice.propertyId)
        : current.length >= MAX_CANDIDATES
          ? current
          : [...current, choice],
    );
    setErrors((current) => ({ ...current, candidates: undefined }));
  }

  function submit() {
    const period = validatePeriod(start, end, today);
    const next: Errors = {
      customer: customer ? undefined : "고객을 선택해 주세요.",
      candidates: candidates.length === 0 ? "후보 매물을 1개 이상 선택해 주세요." : undefined,
      ...period,
    };
    setErrors(next);
    setFormError(undefined);
    if (Object.values(next).some(Boolean)) return;
    mutation.mutate();
  }

  const memberOptions = [
    { value: "", label: "나 (기본값)" },
    ...(members.data ?? []).map((item) => ({
      value: String(item.membershipId),
      label: item.displayName,
    })),
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="조율 만들기"
        description="고객 한 명과 후보 매물을 골라 조율을 시작합니다."
      />
      {isReadOnly ? <FormNotice>읽기만 가능한 상태라 조율을 만들 수 없습니다.</FormNotice> : null}
      <Card>
        <div className="flex flex-col gap-8">
          <CustomerPicker
            value={customer}
            onChange={(next) => {
              setCustomer(next);
              setErrors((current) => ({ ...current, customer: undefined }));
            }}
            error={errors.customer}
          />
          <CandidatePicker
            selected={candidates}
            onToggle={toggle}
            max={MAX_CANDIDATES}
            error={errors.candidates}
          />
          <div className="grid gap-5 sm:grid-cols-2">
            <DateTimeField
              label="방문 가능 시작일"
              kind="date"
              value={start}
              min={today}
              onValueChange={setStart}
              error={errors.start}
            />
            <DateTimeField
              label="방문 가능 종료일"
              kind="date"
              value={end}
              min={start || today}
              max={addDays(today, 30)}
              onValueChange={setEnd}
              error={errors.end}
            />
          </div>
          <p className="text-caption text-ink-2">방문 가능 기간은 오늘부터 최대 30일입니다.</p>
          {isDeputy ? (
            <FormNotice>중개보조원은 담당자를 바꿀 수 없어 본인이 담당자로 지정됩니다.</FormNotice>
          ) : (
            <SelectField
              label="담당자"
              value={manager}
              options={memberOptions}
              onValueChange={setManager}
            />
          )}
          {formError ? <FormAlert>{formError}</FormAlert> : null}
          <div className="flex gap-3">
            <Button isLoading={mutation.isPending} disabled={isReadOnly} onClick={submit}>
              조율 만들기
            </Button>
            <Link
              href="/coordinations"
              className="inline-flex h-14 items-center rounded-control bg-primary-soft px-6 text-body font-medium text-ink-2 hover:bg-primary-line"
            >
              취소
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
}
