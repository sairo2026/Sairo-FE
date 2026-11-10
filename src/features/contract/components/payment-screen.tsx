"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type {
  ContractDetailResponse,
  ContractPaymentScheduleListResponse,
} from "@/lib/api/contracts/contract.schema";
import { EmptyState } from "@/shared/components/feedback/empty-state";
import { FormAlert, FormNotice } from "@/shared/components/feedback/form-frame";
import { QueryGate } from "@/shared/components/feedback/query-gate";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { DateTimeField } from "@/shared/components/ui/date-time-field";
import { Modal } from "@/shared/components/ui/modal";
import { SelectField } from "@/shared/components/ui/select-field";
import { TextField } from "@/shared/components/ui/text-field";
import { fieldErrorMap } from "@/shared/lib/api-messages";
import { formatKrw, formatSeoulDate, formatSeoulDateTime } from "@/shared/lib/format";
import { useOfficeAccess } from "@/shared/session/office-access-context";
import { createPaymentTransaction, createSchedule } from "../api/contract-extra.api";
import { contractExtraKeys, useSchedules } from "../hooks/contract-queries";
import { INSTALLMENT_LABEL, PAYMENT_STATUS_LABEL, labelOf } from "../model/labels";
import { describeContractError } from "../model/messages";
import { parseAmount, validateReason } from "../model/form";
import { ContractSubScreen } from "./contract-sub-screen";

type Schedule = ContractPaymentScheduleListResponse["items"][number];

const STATUS_TONE = { UNPAID: "gray", PARTIAL: "amber", PAID: "green" } as const;

function ScheduleDialog({
  contractId,
  existing,
  onClose,
}: {
  contractId: number;
  existing: Schedule[];
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [type, setType] = useState("");
  const [sequence, setSequence] = useState("1");
  const [date, setDate] = useState("");
  const [amount, setAmount] = useState("");
  const [mismatchReason, setMismatchReason] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string>();

  const mutation = useMutation({
    mutationFn: () =>
      createSchedule(contractId, {
        installmentType: type,
        sequenceNo: Number(sequence),
        scheduledDate: date,
        scheduledAmount: parseAmount(amount),
        amountMismatchReason: mismatchReason.trim() === "" ? null : mismatchReason.trim(),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: contractExtraKeys.schedules(contractId) });
      onClose();
    },
    onError: (error) => {
      setErrors((current) => ({ ...current, ...fieldErrorMap(error) }));
      setFormError(describeContractError(error, "대금 예정을 등록하지 못했습니다."));
    },
  });

  function submit() {
    const next: Record<string, string> = {};
    if (type === "") next.installmentType = "대금 종류를 선택해 주세요.";
    const seq = Number(sequence);
    if (!Number.isInteger(seq) || seq < 1)
      next.sequenceNo = "순번은 1 이상의 숫자로 입력해 주세요.";
    else if (existing.some((item) => item.installmentType === type && item.sequenceNo === seq)) {
      next.sequenceNo = "같은 대금 종류와 순번이 이미 있습니다.";
    }
    if (date === "") next.scheduledDate = "예정일을 입력해 주세요.";
    if (Number.isNaN(parseAmount(amount)) || parseAmount(amount) <= 0) {
      next.scheduledAmount = "예정액은 0보다 큰 숫자로 입력해 주세요.";
    }
    if (mismatchReason !== "" && mismatchReason.trim() === "") {
      next.amountMismatchReason = "공백만 있는 사유는 입력할 수 없습니다.";
    }
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    setFormError(undefined);
    mutation.mutate();
  }

  return (
    <Modal
      isOpen
      title="대금 예정 등록"
      onClose={onClose}
      footer={
        <>
          <Button variant="cancel" onClick={onClose} disabled={mutation.isPending}>
            취소
          </Button>
          <Button onClick={submit} isLoading={mutation.isPending}>
            등록
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {formError ? <FormAlert>{formError}</FormAlert> : null}
        <SelectField
          label="대금 종류"
          required
          value={type}
          options={Object.entries(INSTALLMENT_LABEL).map(([value, label]) => ({ value, label }))}
          placeholder="종류 선택"
          onValueChange={setType}
          error={errors.installmentType}
        />
        <TextField
          label="순번"
          kind="number"
          inputMode="numeric"
          value={sequence}
          onValueChange={setSequence}
          error={errors.sequenceNo}
          hint="중도금이 여러 번이면 순번으로 구분합니다."
        />
        <DateTimeField
          label="예정일"
          kind="date"
          required
          value={date}
          onValueChange={setDate}
          error={errors.scheduledDate}
        />
        <TextField
          label="예정액(원)"
          kind="number"
          inputMode="numeric"
          required
          value={amount}
          onValueChange={setAmount}
          error={errors.scheduledAmount}
        />
        <TextField
          label="합계가 매매가·보증금과 다를 때 사유(선택)"
          value={mismatchReason}
          onValueChange={setMismatchReason}
          error={errors.amountMismatchReason}
        />
      </div>
    </Modal>
  );
}

function PaymentDialog({
  contractId,
  schedule,
  onClose,
}: {
  contractId: number;
  schedule: Schedule;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [supersedes, setSupersedes] = useState("");
  const [correctionReason, setCorrectionReason] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string>();
  const active = schedule.transactions.filter((item) => !item.isSuperseded);

  const mutation = useMutation({
    mutationFn: () =>
      createPaymentTransaction(schedule.scheduleId, schedule.version, {
        actualAmount: parseAmount(amount),
        actualDate: date,
        supersedesTransactionId: supersedes === "" ? null : Number(supersedes),
        correctionReason: supersedes === "" ? null : correctionReason.trim(),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: contractExtraKeys.schedules(contractId) });
      onClose();
    },
    onError: (error) => {
      setErrors((current) => ({ ...current, ...fieldErrorMap(error) }));
      setFormError(describeContractError(error, "실지급을 기록하지 못했습니다."));
    },
  });

  function submit() {
    const next: Record<string, string> = {};
    if (Number.isNaN(parseAmount(amount)) || parseAmount(amount) <= 0) {
      next.actualAmount = "실지급 금액은 0보다 큰 숫자로 입력해 주세요.";
    }
    if (date === "") next.actualDate = "실제 지급일을 입력해 주세요.";
    if (supersedes !== "") {
      const problem = validateReason(correctionReason);
      if (problem) next.correctionReason = problem;
    }
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    setFormError(undefined);
    mutation.mutate();
  }

  return (
    <Modal
      isOpen
      title={`${labelOf(INSTALLMENT_LABEL, schedule.installmentType)} ${schedule.sequenceNo}회 실지급 기록`}
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
          확인자와 확인 시각은 현재 사용자와 지금 시각으로 자동 기록됩니다.
        </p>
        <TextField
          label="실지급 금액(원)"
          kind="number"
          inputMode="numeric"
          required
          value={amount}
          onValueChange={setAmount}
          error={errors.actualAmount}
        />
        <DateTimeField
          label="실제 지급일"
          kind="date"
          required
          value={date}
          onValueChange={setDate}
          error={errors.actualDate}
        />
        {active.length > 0 ? (
          <SelectField
            label="오입력 정정이면 대체할 기존 실지급(선택)"
            value={supersedes}
            options={active.map((item) => ({
              value: String(item.transactionId),
              label: `${formatSeoulDate(item.actualDate)} ${formatKrw(item.actualAmount)}`,
            }))}
            placeholder="새 실지급으로 기록"
            onValueChange={setSupersedes}
          />
        ) : null}
        {supersedes !== "" ? (
          <TextField
            label="정정 사유"
            value={correctionReason}
            onValueChange={setCorrectionReason}
            error={errors.correctionReason}
          />
        ) : null}
      </div>
    </Modal>
  );
}

function PaymentBody({ detail }: { detail: ContractDetailResponse }) {
  const { isReadOnly } = useOfficeAccess();
  const query = useSchedules(detail.contractId);
  const [creating, setCreating] = useState(false);
  const [paying, setPaying] = useState<Schedule | null>(null);
  const isDraft = detail.contractStatus === "DRAFT";

  return (
    <div className="flex flex-col gap-4">
      <FormNotice>
        계약 대금은 중개보수와 별도로 관리합니다. 매매가나 보증금과 예정 합계가 달라도 등록은 막지
        않고 경고만 표시합니다.
      </FormNotice>
      {isDraft ? (
        <FormNotice>
          초안 계약에는 대금 예정을 등록할 수 없습니다. 체결 뒤 등록해 주세요.
        </FormNotice>
      ) : null}
      <div>
        <Button disabled={isDraft || isReadOnly} onClick={() => setCreating(true)}>
          + 대금 예정 등록
        </Button>
      </div>
      <QueryGate query={query} loadingLabel="계약 대금을 불러오는 중입니다.">
        {(data) => (
          <>
            <section
              aria-label="예정 합계 대조"
              className="flex flex-col gap-2 rounded-card-flat border border-line px-5 py-4"
            >
              <p className="text-body text-ink">
                예정 합계 <strong>{formatKrw(data.scheduledTotal)}</strong> / 매매가·보증금{" "}
                <strong>{formatKrw(data.contractAmountTotal)}</strong>
              </p>
              {data.warning ? (
                <p role="alert" className="text-caption font-semibold text-tag-red-ink">
                  예정 합계가 매매가·보증금과 다릅니다.
                  {data.amountMismatchReason
                    ? ` 사유: ${data.amountMismatchReason}`
                    : " 사유가 입력되지 않았습니다."}
                </p>
              ) : null}
            </section>
            {data.items.length === 0 ? (
              <EmptyState title="등록된 대금 예정이 없습니다." />
            ) : (
              <ul className="flex flex-col gap-3">
                {data.items.map((item) => (
                  <li
                    key={item.scheduleId}
                    className="flex flex-col gap-3 rounded-card-flat border border-line px-5 py-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <span className="flex items-center gap-3">
                        <span className="text-body font-bold text-ink">
                          {labelOf(INSTALLMENT_LABEL, item.installmentType)} {item.sequenceNo}회
                        </span>
                        <Badge
                          tone={
                            STATUS_TONE[item.paymentStatus as keyof typeof STATUS_TONE] ?? "gray"
                          }
                          className="h-7 min-w-0 px-3 text-caption"
                        >
                          {labelOf(PAYMENT_STATUS_LABEL, item.paymentStatus)}
                        </Badge>
                      </span>
                      <Button
                        variant="outlined"
                        size="sm"
                        disabled={isReadOnly}
                        aria-label={`${labelOf(INSTALLMENT_LABEL, item.installmentType)} ${item.sequenceNo}회 실지급 기록`}
                        onClick={() => setPaying(item)}
                      >
                        실지급 기록
                      </Button>
                    </div>
                    <p className="text-caption text-ink-2">
                      예정 {item.scheduledDate ? formatSeoulDate(item.scheduledDate) : "-"}{" "}
                      {formatKrw(item.scheduledAmount)} · 실지급 합계{" "}
                      {formatKrw(item.actualPaidTotal)}
                    </p>
                    {item.transactions.length > 0 ? (
                      <ul className="flex flex-col gap-1">
                        {item.transactions.map((transaction) => (
                          <li
                            key={transaction.transactionId}
                            className={`text-caption ${transaction.isSuperseded ? "text-ink-3 line-through" : "text-ink"}`}
                          >
                            {formatSeoulDate(transaction.actualDate)}{" "}
                            {formatKrw(transaction.actualAmount)} · 확인{" "}
                            {transaction.confirmedByMemberName}{" "}
                            {formatSeoulDateTime(transaction.confirmedAt)}
                            {transaction.supersedesTransactionId
                              ? ` · 정정(${transaction.correctionReason ?? "사유 없음"})`
                              : ""}
                            {transaction.isSuperseded ? " · 정정으로 대체됨" : ""}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
            {creating ? (
              <ScheduleDialog
                contractId={detail.contractId}
                existing={data.items}
                onClose={() => setCreating(false)}
              />
            ) : null}
            {paying ? (
              <PaymentDialog
                contractId={detail.contractId}
                schedule={paying}
                onClose={() => setPaying(null)}
              />
            ) : null}
          </>
        )}
      </QueryGate>
    </div>
  );
}

export function PaymentScreen({ contractId }: { contractId: number }) {
  return (
    <ContractSubScreen
      contractId={contractId}
      active="payments"
      title="계약 대금·분할 지급"
      description="계약금·중도금·잔금이 언제 얼마나 오갔는지 기록합니다."
    >
      {(detail) => <PaymentBody detail={detail} />}
    </ContractSubScreen>
  );
}
