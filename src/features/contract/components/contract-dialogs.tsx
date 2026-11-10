"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { ContractDetailResponse } from "@/lib/api/contracts/contract.schema";
import { FormAlert, FormNotice } from "@/shared/components/feedback/form-frame";
import { Button } from "@/shared/components/ui/button";
import { DateTimeField } from "@/shared/components/ui/date-time-field";
import { Modal } from "@/shared/components/ui/modal";
import { SelectField } from "@/shared/components/ui/select-field";
import { fieldErrorMap } from "@/shared/lib/api-messages";
import {
  correctContract,
  excludeDuplicate,
  listContracts,
  updateContractStatus,
  updateSettlementStatus,
} from "../api/contract.api";
import { contractKeys } from "../hooks/contract-queries";
import { CONTRACT_STATUS_LABEL, SETTLEMENT_STATUS_LABEL, isLease, labelOf } from "../model/labels";
import {
  REASON_LIMIT,
  formFromDetail,
  toCorrectionRequest,
  toSeoulDateTime,
  validateContractForm,
  validateReason,
} from "../model/form";
import type { ContractFormValues } from "../model/form";
import { describeContractError } from "../model/messages";
import { ContractFields } from "./contract-fields";

type DialogProps = { detail: ContractDetailResponse; onClose: () => void };

function ReasonBox({
  value,
  onChange,
  error,
  label = "사유",
}: {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  label?: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="contract-reason" className="text-caption font-semibold text-ink">
        {label}
      </label>
      <textarea
        id="contract-reason"
        rows={3}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={error ? true : undefined}
        className="w-full rounded-control border border-line px-4 py-3 text-body text-ink focus:border-primary"
      />
      <p className="text-caption text-ink-3">{REASON_LIMIT}자까지 입력할 수 있습니다.</p>
      {error ? (
        <p role="alert" className="text-caption text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function useAfterChange(onClose: () => void) {
  const queryClient = useQueryClient();
  return async () => {
    await queryClient.invalidateQueries({ queryKey: contractKeys.all });
    onClose();
  };
}

export function StatusDialog({ detail, onClose }: DialogProps) {
  const done = useAfterChange(onClose);
  const options = ["ENDED", "TERMINATED", "CANCELLED", "VOID"].filter(
    (status) =>
      status !== detail.contractStatus && !(status === "TERMINATED" && detail.dealType === "SALE"),
  );
  const [toStatus, setToStatus] = useState("");
  const [reason, setReason] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string>();

  const mutation = useMutation({
    mutationFn: () =>
      updateContractStatus(detail.contractId, detail.version, {
        toStatus,
        reason: reason.trim(),
        effectiveAt: toSeoulDateTime(date, time) ?? "",
        ...(toStatus === "VOID" ? { previousStatus: detail.contractStatus } : {}),
      }),
    onSuccess: done,
    onError: (error) => {
      setErrors((current) => ({ ...current, ...fieldErrorMap(error) }));
      setFormError(describeContractError(error, "계약 상태를 바꾸지 못했습니다."));
    },
  });

  function submit() {
    const next: Record<string, string> = {};
    if (toStatus === "") next.toStatus = "바꿀 상태를 선택해 주세요.";
    const problem = validateReason(reason);
    if (problem) next.reason = problem;
    if (date === "" || time === "") next.effectiveAt = "실제 효력 날짜와 시간을 입력해 주세요.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    setFormError(undefined);
    mutation.mutate();
  }

  return (
    <Modal
      isOpen
      title="계약 상태 변경"
      onClose={onClose}
      footer={
        <>
          <Button variant="cancel" onClick={onClose} disabled={mutation.isPending}>
            취소
          </Button>
          <Button onClick={submit} isLoading={mutation.isPending}>
            상태 변경
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {formError ? <FormAlert>{formError}</FormAlert> : null}
        <p className="text-caption text-ink-2">
          현재 상태: {labelOf(CONTRACT_STATUS_LABEL, detail.contractStatus)}. 임대기간 상태와 잔금
          상태는 따로 관리되며 이 변경으로 바뀌지 않습니다.
        </p>
        <SelectField
          label="바꿀 상태"
          required
          value={toStatus}
          options={options.map((status) => ({
            value: status,
            label:
              status === "VOID" ? "무효 (오기록 정정)" : (CONTRACT_STATUS_LABEL[status] ?? status),
          }))}
          placeholder="상태 선택"
          onValueChange={setToStatus}
          error={errors.toStatus}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <DateTimeField
            label="실제 효력 날짜"
            kind="date"
            required
            value={date}
            onValueChange={setDate}
            error={errors.effectiveAt}
          />
          <DateTimeField
            label="실제 효력 시간"
            kind="time"
            required
            value={time}
            onValueChange={setTime}
          />
        </div>
        <ReasonBox value={reason} onChange={setReason} error={errors.reason} />
      </div>
    </Modal>
  );
}

export function SettlementStatusDialog({ detail, onClose }: DialogProps) {
  const done = useAfterChange(onClose);
  const options = ["SCHEDULED", "PARTIAL", "COMPLETE", "NONE"].filter(
    (status) => status !== detail.settlementStatus,
  );
  const [toStatus, setToStatus] = useState("");
  const [reason, setReason] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string>();

  const mutation = useMutation({
    mutationFn: () =>
      updateSettlementStatus(detail.contractId, detail.version, {
        toStatus,
        reason: reason.trim() === "" ? null : reason.trim(),
        effectiveAt: toSeoulDateTime(date, time),
      }),
    onSuccess: done,
    onError: (error) =>
      setFormError(describeContractError(error, "잔금 상태를 바꾸지 못했습니다.")),
  });

  function submit() {
    const next: Record<string, string> = {};
    if (toStatus === "") next.toStatus = "바꿀 상태를 선택해 주세요.";
    if ((date === "") !== (time === "")) next.effectiveAt = "날짜와 시간을 함께 입력해 주세요.";
    if (reason.trim() !== "") {
      const problem = validateReason(reason);
      if (problem) next.reason = problem;
    }
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    setFormError(undefined);
    mutation.mutate();
  }

  return (
    <Modal
      isOpen
      title="잔금 상태 기록"
      onClose={onClose}
      footer={
        <>
          <Button variant="cancel" onClick={onClose} disabled={mutation.isPending}>
            취소
          </Button>
          <Button onClick={submit} isLoading={mutation.isPending}>
            기록
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {formError ? <FormAlert>{formError}</FormAlert> : null}
        <p className="text-caption text-ink-2">
          현재 잔금 상태: {labelOf(SETTLEMENT_STATUS_LABEL, detail.settlementStatus)}. 잔금 예정일을
          입력하거나 고쳐도 자동으로 바뀌지 않으며 담당자가 직접 기록한 값만 표시합니다. 잔금 완료는
          계약 종료나 중개보수 수납 완료를 뜻하지 않습니다.
        </p>
        <SelectField
          label="바꿀 잔금 상태"
          required
          value={toStatus}
          options={options.map((status) => ({
            value: status,
            label: SETTLEMENT_STATUS_LABEL[status] ?? status,
          }))}
          placeholder="상태 선택"
          onValueChange={setToStatus}
          error={errors.toStatus}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <DateTimeField
            label="실제 효력 날짜(선택)"
            kind="date"
            value={date}
            onValueChange={setDate}
            error={errors.effectiveAt}
          />
          <DateTimeField
            label="실제 효력 시간(선택)"
            kind="time"
            value={time}
            onValueChange={setTime}
          />
        </div>
        <ReasonBox value={reason} onChange={setReason} error={errors.reason} label="사유(선택)" />
      </div>
    </Modal>
  );
}

export function DuplicateDialog({ detail, onClose }: DialogProps) {
  const done = useAfterChange(onClose);
  const candidates = useQuery({
    queryKey: ["contract", "duplicate-candidates"],
    queryFn: () => listContracts({ page: 0, size: 100 }),
  });
  const [target, setTarget] = useState("");
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string>();

  const mutation = useMutation({
    mutationFn: () =>
      excludeDuplicate(detail.contractId, detail.version, {
        duplicateOfContractId: Number(target),
        reason: reason.trim(),
      }),
    onSuccess: done,
    onError: (error) => {
      setErrors((current) => ({ ...current, ...fieldErrorMap(error) }));
      setFormError(describeContractError(error, "중복 제외하지 못했습니다."));
    },
  });

  function submit() {
    const next: Record<string, string> = {};
    if (target === "") next.duplicateOfContractId = "중복 대상 계약을 선택해 주세요.";
    const problem = validateReason(reason);
    if (problem) next.reason = problem;
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    setFormError(undefined);
    mutation.mutate();
  }

  const options = (candidates.data?.items ?? [])
    .filter((item) => item.contractId !== detail.contractId)
    .map((item) => ({
      value: String(item.contractId),
      label: `#${item.contractId} ${item.propertyAddress} (${labelOf(CONTRACT_STATUS_LABEL, item.contractStatus)})`,
    }));

  return (
    <Modal
      isOpen
      title="중복 제외"
      onClose={onClose}
      footer={
        <>
          <Button variant="cancel" onClick={onClose} disabled={mutation.isPending}>
            취소
          </Button>
          <Button onClick={submit} isLoading={mutation.isPending}>
            중복 제외
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {formError ? <FormAlert>{formError}</FormAlert> : null}
        <FormNotice>
          단순 중복 입력 계약을 업무 목록에서 빼고 월말결산 체결 집계에서도 뺍니다. 첨부 문서와 체결
          이력, 법정 보존 서류는 삭제하거나 수정하지 않습니다.
        </FormNotice>
        <SelectField
          label="중복 대상 계약"
          required
          value={target}
          options={options}
          placeholder="같은 내용으로 남길 계약 선택"
          onValueChange={setTarget}
          error={errors.duplicateOfContractId}
        />
        <ReasonBox value={reason} onChange={setReason} error={errors.reason} />
      </div>
    </Modal>
  );
}

export function CorrectionDialog({ detail, onClose }: DialogProps) {
  const done = useAfterChange(onClose);
  const [values, setValues] = useState<ContractFormValues>(() => formFromDetail(detail));
  const [reason, setReason] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string>();

  const mutation = useMutation({
    mutationFn: () => {
      if (detail.currentRevisionId === null || detail.currentRevisionId === undefined) {
        throw new Error("기준 버전이 없습니다.");
      }
      return correctContract(
        detail.contractId,
        detail.version,
        toCorrectionRequest(
          values,
          detail.currentRevisionId,
          reason,
          toSeoulDateTime(date, time) ?? "",
        ),
      );
    },
    onSuccess: done,
    onError: (error) => {
      setErrors((current) => ({ ...current, ...fieldErrorMap(error) }));
      setFormError(describeContractError(error, "정정하지 못했습니다."));
    },
  });

  function submit() {
    const next = validateContractForm(values, "sign", { requireManager: false });
    const problem = validateReason(reason);
    if (problem) next.reason = problem;
    if (date === "" || time === "") next.effectiveAt = "실제 효력 날짜와 시간을 입력해 주세요.";
    setErrors(next);
    if (Object.keys(next).length > 0) {
      setFormError("입력값을 확인해 주세요.");
      return;
    }
    setFormError(undefined);
    mutation.mutate();
  }

  return (
    <Modal
      isOpen
      size="wide"
      title="핵심정보 정정"
      onClose={onClose}
      footer={
        <>
          <Button variant="cancel" onClick={onClose} disabled={mutation.isPending}>
            취소
          </Button>
          <Button onClick={submit} isLoading={mutation.isPending}>
            정정 버전 등록
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {formError ? <FormAlert>{formError}</FormAlert> : null}
        <FormNotice>
          현재 전체값을 고쳐서 정정 버전으로 등록합니다. 이전 버전과 첨부 서류의 연결은 그대로
          남습니다. 상태 자체를 바꿀 때는 상태 변경을 사용합니다.
        </FormNotice>
        <ContractFields
          values={values}
          onChange={setValues}
          errors={errors}
          lockDealType
          hideManager
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <DateTimeField
            label="정정 효력 날짜"
            kind="date"
            required
            value={date}
            onValueChange={setDate}
            error={errors.effectiveAt}
          />
          <DateTimeField
            label="정정 효력 시간"
            kind="time"
            required
            value={time}
            onValueChange={setTime}
          />
        </div>
        <ReasonBox value={reason} onChange={setReason} error={errors.reason} label="정정 사유" />
      </div>
    </Modal>
  );
}

export function canRenew(detail: ContractDetailResponse): boolean {
  return isLease(detail.dealType) && detail.contractStatus !== "DRAFT";
}
