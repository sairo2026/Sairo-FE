"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ContractDetailResponse } from "@/lib/api/contracts/contract.schema";
import { ErrorScreen } from "@/shared/components/feedback/error-screen";
import { FormAlert, FormNotice } from "@/shared/components/feedback/form-frame";
import { QueryGate } from "@/shared/components/feedback/query-gate";
import { Button } from "@/shared/components/ui/button";
import { PageHeader } from "@/shared/components/ui/page-header";
import { fieldErrorMap } from "@/shared/lib/api-messages";
import { useOfficeAccess } from "@/shared/session/office-access-context";
import { renewContract } from "../api/contract.api";
import { contractKeys, useContract } from "../hooks/contract-queries";
import { formFromDetail, toRenewRequest, validateContractForm } from "../model/form";
import type { ContractFormValues } from "../model/form";
import { isLease } from "../model/labels";
import { describeContractError } from "../model/messages";
import { ContractFields } from "./contract-fields";

function RenewBody({ detail }: { detail: ContractDetailResponse }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isReadOnly } = useOfficeAccess();
  const [values, setValues] = useState<ContractFormValues>(() => ({
    ...formFromDetail(detail),
    signedDate: "",
    leaseStartDate: "",
    leaseEndDate: "",
    balanceDueDate: "",
    balanceDueDatePendingReason: "",
  }));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string>();

  const mutation = useMutation({
    mutationFn: () => renewContract(detail.contractId, toRenewRequest(values)),
    onSuccess: async (created) => {
      await queryClient.invalidateQueries({ queryKey: contractKeys.all });
      router.push(`/contracts/${created.contractId}`);
    },
    onError: (error) => {
      setErrors((current) => ({ ...current, ...fieldErrorMap(error) }));
      setFormError(describeContractError(error, "재계약을 등록하지 못했습니다."));
    },
  });

  function submit() {
    const next = validateContractForm(values, "sign");
    setErrors(next);
    if (Object.keys(next).length > 0) {
      setFormError("입력값을 확인해 주세요.");
      return;
    }
    setFormError(undefined);
    mutation.mutate();
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="재계약"
        description="기존 계약과 연결한 새 계약을 만듭니다. 기존 계약은 자동으로 종료되지 않습니다."
      />
      {formError ? <FormAlert>{formError}</FormAlert> : null}
      <FormNotice>
        당사자와 금액은 기존 계약 값으로 채웠습니다. 체결일과 새 임대기간은 직접 입력해 주세요. 같은
        매물에서 기간이 겹치는 체결 계약이 있으면 등록할 수 없습니다.
      </FormNotice>
      <ContractFields values={values} onChange={setValues} errors={errors} lockDealType />
      <div className="flex justify-end gap-2">
        <Link
          href={`/contracts/${detail.contractId}`}
          className="inline-flex h-12 items-center rounded-control bg-primary-soft px-8 text-body font-medium text-ink-2 hover:bg-primary-line"
        >
          취소
        </Link>
        <Button
          isLoading={mutation.isPending}
          disabled={mutation.isPending || isReadOnly}
          onClick={submit}
        >
          재계약 등록
        </Button>
      </div>
    </div>
  );
}

export function ContractRenewScreen({ contractId }: { contractId: number }) {
  const { role } = useOfficeAccess();
  const query = useContract(contractId, role !== "DEPUTY");
  if (role === "DEPUTY") return <ErrorScreen kind="forbidden" />;
  return (
    <QueryGate query={query} loadingLabel="계약 정보를 불러오는 중입니다.">
      {(detail) =>
        !isLease(detail.dealType) || detail.contractStatus === "DRAFT" ? (
          <div className="flex flex-col gap-4">
            <FormNotice>재계약은 체결된 전세·월세 계약에서만 할 수 있습니다.</FormNotice>
            <Link
              href={`/contracts/${contractId}`}
              className="font-semibold text-primary hover:underline"
            >
              계약 상세로 이동
            </Link>
          </div>
        ) : (
          <RenewBody detail={detail} />
        )
      }
    </QueryGate>
  );
}
