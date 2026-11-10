"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { listProperties } from "@/features/property/api/property.api";
import type { ContractDetailResponse } from "@/lib/api/contracts/contract.schema";
import { ErrorScreen } from "@/shared/components/feedback/error-screen";
import { FormAlert, FormNotice } from "@/shared/components/feedback/form-frame";
import { QueryGate } from "@/shared/components/feedback/query-gate";
import { Button } from "@/shared/components/ui/button";
import { ConfirmDialog } from "@/shared/components/ui/modal";
import { PageHeader } from "@/shared/components/ui/page-header";
import { SelectField } from "@/shared/components/ui/select-field";
import { fieldErrorMap } from "@/shared/lib/api-messages";
import { useOfficeAccess } from "@/shared/session/office-access-context";
import {
  createDraft,
  createSignedContract,
  deleteDraft,
  signDraft,
  updateDraft,
} from "../api/contract.api";
import { contractKeys, useContract, useContractProperty } from "../hooks/contract-queries";
import {
  emptyContractForm,
  formFromDetail,
  toCreateRequest,
  toDraftCreateRequest,
  toDraftUpdateRequest,
  validateContractForm,
} from "../model/form";
import type { ContractFormValues } from "../model/form";
import { describeContractError } from "../model/messages";
import { CONTRACT_ENTRY_COPY } from "@/shared/legal/notice-copy";
import { ContractFields } from "./contract-fields";

function FormBody({
  propertyId,
  contract,
}: {
  propertyId: number | null;
  contract: ContractDetailResponse | null;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isReadOnly } = useOfficeAccess();
  const [pickedProperty, setPickedProperty] = useState(propertyId ? String(propertyId) : "");
  const targetPropertyId =
    contract?.propertyId ?? (pickedProperty === "" ? null : Number(pickedProperty));
  const property = useContractProperty(targetPropertyId);
  const properties = useQuery({
    queryKey: ["contract", "properties"],
    queryFn: () => listProperties({ page: 0, size: 100 }),
    enabled: propertyId === null && contract === null,
  });
  const [values, setValues] = useState<ContractFormValues>(() =>
    contract ? formFromDetail(contract) : emptyContractForm(),
  );
  const [version, setVersion] = useState(contract?.version ?? 0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string>();
  const [confirmDelete, setConfirmDelete] = useState(false);

  function fail(error: unknown, fallback: string) {
    setErrors((current) => ({ ...current, ...fieldErrorMap(error) }));
    setFormError(describeContractError(error, fallback));
  }

  async function finish(contractId: number) {
    await queryClient.invalidateQueries({ queryKey: contractKeys.all });
    router.push(`/contracts/${contractId}`);
  }

  const saveDraft = useMutation({
    mutationFn: async () => {
      if (contract) {
        const saved = await updateDraft(contract.contractId, version, toDraftUpdateRequest(values));
        setVersion(saved.version);
        return saved.contractId;
      }
      if (targetPropertyId === null) throw new Error("매물을 선택해 주세요.");
      const created = await createDraft(targetPropertyId, toDraftCreateRequest(values));
      return created.contractId;
    },
    onSuccess: finish,
    onError: (error) => fail(error, "초안을 저장하지 못했습니다."),
  });

  const sign = useMutation({
    mutationFn: async () => {
      if (contract) {
        const saved = await updateDraft(contract.contractId, version, toDraftUpdateRequest(values));
        setVersion(saved.version);
        const signed = await signDraft(contract.contractId, saved.version);
        return signed.contractId;
      }
      if (targetPropertyId === null) throw new Error("매물을 선택해 주세요.");
      const created = await createSignedContract(targetPropertyId, toCreateRequest(values));
      return created.contractId;
    },
    onSuccess: finish,
    onError: (error) => fail(error, "체결 등록하지 못했습니다."),
  });

  const remove = useMutation({
    mutationFn: () => deleteDraft(contract?.contractId ?? 0),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: contractKeys.all });
      router.push("/contracts");
    },
    onError: (error) => {
      setConfirmDelete(false);
      fail(error, "초안을 삭제하지 못했습니다.");
    },
  });

  function submit(mode: "draft" | "sign") {
    const next = validateContractForm(values, mode, { requireManager: contract === null });
    if (targetPropertyId === null) next.propertyId = "매물을 선택해 주세요.";
    setErrors(next);
    if (Object.keys(next).length > 0) {
      setFormError("입력값을 확인해 주세요.");
      return;
    }
    setFormError(undefined);
    if (mode === "draft") saveDraft.mutate();
    else sign.mutate();
  }

  const busy = saveDraft.isPending || sign.isPending || remove.isPending;
  const propertyOptions = (properties.data?.items ?? []).map((item) => ({
    value: String(item.propertyId),
    label: item.name,
  }));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={contract ? "계약 초안 수정" : "계약 등록"}
        description="초안으로 임시 저장하거나 필수값을 모두 채워 체결 등록합니다."
      />
      <FormNotice>{CONTRACT_ENTRY_COPY.parties}</FormNotice>
      {formError ? <FormAlert>{formError}</FormAlert> : null}
      <section className="flex flex-col gap-3 rounded-card-flat border border-line px-5 py-4">
        <h2 className="text-body font-semibold text-ink">매물</h2>
        {propertyId !== null || contract ? (
          <p className="text-body text-ink">
            {property.data ? (
              <Link
                href={`/properties/${property.data.propertyId}`}
                className="font-semibold text-primary hover:underline"
              >
                {property.data.name}
                {property.data.address ? ` · ${property.data.address}` : ""}
              </Link>
            ) : (
              "매물 정보를 불러오는 중입니다."
            )}
          </p>
        ) : (
          <SelectField
            label="매물 선택"
            required
            value={pickedProperty}
            options={propertyOptions}
            placeholder="계약할 매물 선택"
            onValueChange={setPickedProperty}
            error={errors.propertyId}
          />
        )}
      </section>
      <ContractFields
        values={values}
        onChange={setValues}
        errors={errors}
        managerOptional={contract !== null}
      />
      <div className="flex flex-wrap justify-end gap-2">
        {contract ? (
          <Button
            variant="ghost"
            disabled={busy || isReadOnly}
            onClick={() => setConfirmDelete(true)}
          >
            초안 삭제
          </Button>
        ) : null}
        <Button
          variant="outlined"
          isLoading={saveDraft.isPending}
          disabled={busy || isReadOnly}
          onClick={() => submit("draft")}
        >
          초안 저장
        </Button>
        <Button
          isLoading={sign.isPending}
          disabled={busy || isReadOnly}
          onClick={() => submit("sign")}
        >
          체결 등록
        </Button>
      </div>
      <ConfirmDialog
        isOpen={confirmDelete}
        title="초안 삭제"
        message="이 계약 초안을 삭제할까요? 당사자 입력값과 함께 완전히 삭제되며 되돌릴 수 없습니다."
        confirmLabel="삭제"
        isPending={remove.isPending}
        onConfirm={() => remove.mutate()}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}

export function ContractCreateScreen({ propertyId }: { propertyId: number | null }) {
  const { role } = useOfficeAccess();
  if (role === "DEPUTY") return <ErrorScreen kind="forbidden" />;
  return <FormBody propertyId={propertyId} contract={null} />;
}

export function ContractDraftEditScreen({ contractId }: { contractId: number }) {
  const { role } = useOfficeAccess();
  const query = useContract(contractId, role !== "DEPUTY");
  if (role === "DEPUTY") return <ErrorScreen kind="forbidden" />;
  return (
    <QueryGate query={query} loadingLabel="계약 정보를 불러오는 중입니다.">
      {(detail) =>
        detail.contractStatus !== "DRAFT" ? (
          <div className="flex flex-col gap-4">
            <FormNotice>
              체결된 계약은 초안으로 수정할 수 없습니다. 핵심정보 오기록은 정정으로 처리합니다.
            </FormNotice>
            <Link
              href={`/contracts/${contractId}`}
              className="font-semibold text-primary hover:underline"
            >
              계약 상세로 이동
            </Link>
          </div>
        ) : (
          <FormBody propertyId={detail.propertyId} contract={detail} />
        )
      }
    </QueryGate>
  );
}
