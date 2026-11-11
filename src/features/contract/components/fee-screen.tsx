"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type {
  ContractDetailResponse,
  ContractFeeListResponse,
} from "@/lib/api/contracts/contract.schema";
import { EmptyState } from "@/shared/components/feedback/empty-state";
import { FormAlert, FormNotice } from "@/shared/components/feedback/form-frame";
import { QueryGate } from "@/shared/components/feedback/query-gate";
import { Button } from "@/shared/components/ui/button";
import { DateTimeField } from "@/shared/components/ui/date-time-field";
import { Modal } from "@/shared/components/ui/modal";
import { Checkbox, SelectField } from "@/shared/components/ui/select-field";
import { TextField } from "@/shared/components/ui/text-field";
import { fieldErrorMap } from "@/shared/lib/api-messages";
import { formatKrw, formatSeoulDate } from "@/shared/lib/format";
import { useOfficeAccess } from "@/shared/session/office-access-context";
import { createFee, createFeeRevision, createFeeTransaction } from "../api/contract-extra.api";
import { contractExtraKeys, useFees } from "../hooks/contract-queries";
import {
  FEE_REVISION_TYPE_LABEL,
  FEE_TRANSACTION_LABEL,
  PAYER_TYPE_LABEL,
  labelOf,
} from "../model/labels";
import { describeContractError } from "../model/messages";
import { parseAmount, toSeoulDateTime, validateReason } from "../model/form";
import { ContractSubScreen } from "./contract-sub-screen";

type Fee = ContractFeeListResponse["items"][number];

function isMoney(value: string): boolean {
  return !Number.isNaN(parseAmount(value));
}

function AmountFields({
  values,
  errors,
  onChange,
}: {
  values: { agreed: string; supply: string; tax: string; total: string };
  errors: Record<string, string>;
  onChange: (key: "agreed" | "supply" | "tax" | "total", value: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <TextField
        label="약정보수(원)"
        kind="number"
        inputMode="numeric"
        value={values.agreed}
        onValueChange={(value) => onChange("agreed", value)}
        error={errors.agreedFeeAmount}
      />
      <TextField
        label="공급가액(원)"
        kind="number"
        inputMode="numeric"
        value={values.supply}
        onValueChange={(value) => onChange("supply", value)}
        error={errors.supplyAmount}
      />
      <TextField
        label="세액(원)"
        kind="number"
        inputMode="numeric"
        value={values.tax}
        onValueChange={(value) => onChange("tax", value)}
        error={errors.taxAmount}
      />
      <TextField
        label="합계(원)"
        kind="number"
        inputMode="numeric"
        value={values.total}
        onValueChange={(value) => onChange("total", value)}
        error={errors.totalAmount}
      />
    </div>
  );
}

function validateAmounts(values: { agreed: string; supply: string; tax: string; total: string }) {
  const errors: Record<string, string> = {};
  if (!isMoney(values.agreed) || parseAmount(values.agreed) <= 0) {
    errors.agreedFeeAmount = "약정보수는 0보다 큰 숫자로 입력해 주세요.";
  }
  if (!isMoney(values.supply)) errors.supplyAmount = "공급가액을 숫자로 입력해 주세요.";
  if (!isMoney(values.tax)) errors.taxAmount = "세액을 숫자로 입력해 주세요.";
  if (!isMoney(values.total)) errors.totalAmount = "합계를 숫자로 입력해 주세요.";
  if (
    !errors.supplyAmount &&
    !errors.taxAmount &&
    !errors.totalAmount &&
    parseAmount(values.total) !== parseAmount(values.supply) + parseAmount(values.tax)
  ) {
    errors.totalAmount = "합계가 공급가액과 세액의 합과 다릅니다.";
  }
  return errors;
}

function useAfter(contractId: number, onClose: () => void) {
  const queryClient = useQueryClient();
  return async () => {
    await queryClient.invalidateQueries({ queryKey: contractExtraKeys.fees(contractId) });
    onClose();
  };
}

function DialogFooter({
  onClose,
  onSubmit,
  pending,
  label,
}: {
  onClose: () => void;
  onSubmit: () => void;
  pending: boolean;
  label: string;
}) {
  return (
    <>
      <Button variant="cancel" onClick={onClose} disabled={pending}>
        취소
      </Button>
      <Button onClick={onSubmit} isLoading={pending}>
        {label}
      </Button>
    </>
  );
}

function FeeCreateDialog({
  detail,
  onClose,
}: {
  detail: ContractDetailResponse;
  onClose: () => void;
}) {
  const done = useAfter(detail.contractId, onClose);
  const [payer, setPayer] = useState("");
  const [amounts, setAmounts] = useState({ agreed: "", supply: "", tax: "", total: "" });
  const [vat, setVat] = useState(true);
  const [billedDate, setBilledDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string>();
  const payers = [
    ...detail.sellerLandlordParties.map((party) => ({ party, side: "SELLER_LANDLORD" })),
    ...detail.buyerTenantParties.map((party) => ({ party, side: "BUYER_TENANT" })),
  ];

  const mutation = useMutation({
    mutationFn: () => {
      const [side, partyId] = payer.split(":");
      return createFee(detail.contractId, {
        payerType: side ?? "",
        payerPartyId: Number(partyId),
        agreedFeeAmount: parseAmount(amounts.agreed),
        vatIncluded: vat,
        supplyAmount: parseAmount(amounts.supply),
        taxAmount: parseAmount(amounts.tax),
        totalAmount: parseAmount(amounts.total),
        billedAt: toSeoulDateTime(billedDate, "00:00") ?? "",
        dueAt: toSeoulDateTime(dueDate, "00:00"),
      });
    },
    onSuccess: done,
    onError: (error) => {
      setErrors((current) => ({ ...current, ...fieldErrorMap(error) }));
      setFormError(describeContractError(error, "청구를 등록하지 못했습니다."));
    },
  });

  function submit() {
    const next = validateAmounts(amounts);
    if (payer === "") next.payer = "지급의무자를 선택해 주세요.";
    if (billedDate === "") next.billedAt = "청구발생일을 입력해 주세요.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    setFormError(undefined);
    mutation.mutate();
  }

  return (
    <Modal
      isOpen
      size="wide"
      title="중개보수 청구 등록"
      onClose={onClose}
      footer={
        <DialogFooter
          onClose={onClose}
          onSubmit={submit}
          pending={mutation.isPending}
          label="청구 등록"
        />
      }
    >
      <div className="flex flex-col gap-4">
        {formError ? <FormAlert>{formError}</FormAlert> : null}
        <SelectField
          label="지급의무자"
          required
          value={payer}
          options={payers.map(({ party, side }) => ({
            value: `${side}:${party.partyId}`,
            label: `${labelOf(PAYER_TYPE_LABEL, side)} ${party.name}`,
          }))}
          placeholder="계약 당사자 중 선택"
          onValueChange={setPayer}
          error={errors.payer ?? errors.payerPartyId}
        />
        <AmountFields
          values={amounts}
          errors={errors}
          onChange={(key, value) => setAmounts((current) => ({ ...current, [key]: value }))}
        />
        <Checkbox label="부가세 포함" checked={vat} onCheckedChange={setVat} />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <DateTimeField
            label="청구발생일"
            kind="date"
            required
            value={billedDate}
            onValueChange={setBilledDate}
            error={errors.billedAt}
          />
          <DateTimeField
            label="지급예정일(선택)"
            kind="date"
            value={dueDate}
            onValueChange={setDueDate}
          />
        </div>
      </div>
    </Modal>
  );
}

function RevisionDialog({
  contractId,
  fee,
  onClose,
}: {
  contractId: number;
  fee: Fee;
  onClose: () => void;
}) {
  const done = useAfter(contractId, onClose);
  const [kind, setKind] = useState("ADJUSTED");
  const [effective, setEffective] = useState("");
  const [amounts, setAmounts] = useState({ agreed: "", supply: "", tax: "", total: "" });
  const [reason, setReason] = useState("");
  const [supersedes, setSupersedes] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string>();
  const targets = fee.revisions.filter((item) => !item.isSuperseded);

  const mutation = useMutation({
    mutationFn: () =>
      createFeeRevision(fee.feeId, fee.version, {
        revisionType: kind,
        effectiveDate: effective,
        agreedFeeAmount: parseAmount(amounts.agreed),
        supplyAmount: parseAmount(amounts.supply),
        taxAmount: parseAmount(amounts.tax),
        totalAmount: parseAmount(amounts.total),
        reason: reason.trim(),
        supersedesRevisionId: kind === "CORRECTED" ? Number(supersedes) : null,
      }),
    onSuccess: done,
    onError: (error) => {
      setErrors((current) => ({ ...current, ...fieldErrorMap(error) }));
      setFormError(describeContractError(error, "보수 조정을 기록하지 못했습니다."));
    },
  });

  function submit() {
    const next = validateAmounts(amounts);
    if (effective === "") next.effectiveDate = "효력일을 입력해 주세요.";
    const problem = validateReason(reason);
    if (problem) next.reason = problem;
    if (kind === "CORRECTED" && supersedes === "")
      next.supersedesRevisionId = "대체할 기존 조정 사건을 선택해 주세요.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    setFormError(undefined);
    mutation.mutate();
  }

  return (
    <Modal
      isOpen
      size="wide"
      title="보수 조정"
      onClose={onClose}
      footer={
        <DialogFooter
          onClose={onClose}
          onSubmit={submit}
          pending={mutation.isPending}
          label="조정 기록"
        />
      }
    >
      <div className="flex flex-col gap-4">
        {formError ? <FormAlert>{formError}</FormAlert> : null}
        <FormNotice>
          정상 조정은 새 효력일부터만 적용되고 이전 달에 소급하지 않습니다. 과거 오입력 정정은 원래
          효력일을 쓰고 영향받은 월을 다시 계산합니다.
        </FormNotice>
        <SelectField
          label="조정 종류"
          required
          value={kind}
          options={[
            { value: "ADJUSTED", label: "정상 감액·취소" },
            { value: "CORRECTED", label: "과거 오입력 정정" },
          ]}
          onValueChange={setKind}
        />
        {kind === "CORRECTED" ? (
          <SelectField
            label="대체할 기존 조정 사건"
            required
            value={supersedes}
            options={targets.map((item) => ({
              value: String(item.revisionId),
              label: `${labelOf(FEE_REVISION_TYPE_LABEL, item.revisionType)} ${formatSeoulDate(item.effectiveDate)} ${formatKrw(item.totalAmount)}`,
            }))}
            placeholder="정정할 사건 선택"
            onValueChange={setSupersedes}
            error={errors.supersedesRevisionId}
          />
        ) : null}
        <DateTimeField
          label="효력일"
          kind="date"
          required
          value={effective}
          onValueChange={setEffective}
          error={errors.effectiveDate}
        />
        <AmountFields
          values={amounts}
          errors={errors}
          onChange={(key, value) => setAmounts((current) => ({ ...current, [key]: value }))}
        />
        <TextField
          label="사유"
          required
          value={reason}
          onValueChange={setReason}
          error={errors.reason}
        />
      </div>
    </Modal>
  );
}

function TransactionDialog({
  contractId,
  fee,
  onClose,
}: {
  contractId: number;
  fee: Fee;
  onClose: () => void;
}) {
  const done = useAfter(contractId, onClose);
  const [type, setType] = useState("RECEIPT");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [memo, setMemo] = useState("");
  const [supersedes, setSupersedes] = useState("");
  const [correctionReason, setCorrectionReason] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string>();
  const targets = fee.transactions.filter((item) => !item.isSuperseded);

  const mutation = useMutation({
    mutationFn: () =>
      createFeeTransaction(fee.feeId, fee.version, {
        transactionType: type,
        amount: parseAmount(amount),
        actualDate: date,
        memo: memo.trim() === "" ? null : memo.trim(),
        supersedesTransactionId: supersedes === "" ? null : Number(supersedes),
        correctionReason: supersedes === "" ? null : correctionReason.trim(),
      }),
    onSuccess: done,
    onError: (error) => {
      setErrors((current) => ({ ...current, ...fieldErrorMap(error) }));
      setFormError(describeContractError(error, "수납·환급을 기록하지 못했습니다."));
    },
  });

  function submit() {
    const next: Record<string, string> = {};
    const value = parseAmount(amount);
    if (Number.isNaN(value) || value <= 0) next.amount = "금액은 0보다 큰 숫자로 입력해 주세요.";
    else if (type === "REFUND" && value > fee.netReceivedAmount) {
      next.amount = "환급액이 순수납액을 넘을 수 없습니다.";
    }
    if (date === "") next.actualDate = "실제 수납·환급일을 입력해 주세요.";
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
      title="수납·환급 기록"
      onClose={onClose}
      footer={
        <DialogFooter
          onClose={onClose}
          onSubmit={submit}
          pending={mutation.isPending}
          label="기록"
        />
      }
    >
      <div className="flex flex-col gap-4">
        {formError ? <FormAlert>{formError}</FormAlert> : null}
        <SelectField
          label="구분"
          required
          value={type}
          options={[
            { value: "RECEIPT", label: "수납" },
            { value: "REFUND", label: "환급" },
          ]}
          onValueChange={setType}
        />
        <TextField
          label="금액(원)"
          kind="number"
          inputMode="numeric"
          required
          value={amount}
          onValueChange={setAmount}
          error={errors.amount}
          hint={`현재 순수납액 ${formatKrw(fee.netReceivedAmount)}`}
        />
        <DateTimeField
          label="실제 수납·환급일"
          kind="date"
          required
          value={date}
          onValueChange={setDate}
          error={errors.actualDate}
        />
        <TextField label="메모(선택)" value={memo} onValueChange={setMemo} error={errors.memo} />
        {targets.length > 0 ? (
          <SelectField
            label="오입력 정정이면 대체할 기존 거래(선택)"
            value={supersedes}
            options={targets.map((item) => ({
              value: String(item.transactionId),
              label: `${labelOf(FEE_TRANSACTION_LABEL, item.transactionType)} ${formatSeoulDate(item.actualDate)} ${formatKrw(item.amount)}`,
            }))}
            placeholder="새 거래로 기록"
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

type FeeDialog = { kind: "revision" | "transaction"; fee: Fee } | { kind: "create" } | null;

function FeeBody({ detail }: { detail: ContractDetailResponse }) {
  const { isReadOnly } = useOfficeAccess();
  const query = useFees(detail.contractId);
  const [dialog, setDialog] = useState<FeeDialog>(null);
  const isDraft = detail.contractStatus === "DRAFT";
  const close = () => setDialog(null);

  return (
    <div className="flex flex-col gap-4">
      <FormNotice>
        중개보수는 실제 계약 당사자인 지급의무자별로 기록합니다. 미수금과 초과수납은 지급의무자별로
        계산하며 서로 상계하지 않습니다.
      </FormNotice>
      {isDraft ? (
        <FormNotice>초안 계약에는 청구를 등록할 수 없습니다. 체결 뒤 등록해 주세요.</FormNotice>
      ) : null}
      <div>
        <Button disabled={isDraft || isReadOnly} onClick={() => setDialog({ kind: "create" })}>
          + 청구 등록
        </Button>
      </div>
      <QueryGate query={query} loadingLabel="중개보수 내역을 불러오는 중입니다.">
        {(data) => (
          <>
            <section aria-labelledby="payer-title" className="flex flex-col gap-3">
              <h2 id="payer-title" className="text-h2 font-semibold text-ink">
                지급의무자별 미수금·초과수납
              </h2>
              {data.payers.length === 0 ? (
                <p className="text-caption text-ink-3">청구가 없어 집계할 내용이 없습니다.</p>
              ) : (
                <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {data.payers.map((payer) => (
                    <li
                      key={payer.payerPartyId}
                      className="flex flex-col gap-1 rounded-card-flat border border-line px-5 py-4"
                    >
                      <span className="font-semibold text-ink">
                        {payer.payerName} ({labelOf(PAYER_TYPE_LABEL, payer.payerType)})
                      </span>
                      <span className="text-caption text-ink-2">
                        청구 {formatKrw(payer.billedTotal)} · 순수납{" "}
                        {formatKrw(payer.netReceivedTotal)}
                      </span>
                      <span className="text-caption font-semibold text-ink">
                        미수금 {formatKrw(payer.outstandingAmount)} · 초과수납{" "}
                        {formatKrw(payer.overcollectedAmount)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            {data.items.length === 0 ? (
              <EmptyState title="등록된 중개보수 청구가 없습니다." />
            ) : (
              <ul className="flex flex-col gap-4">
                {data.items.map((fee) => (
                  <li
                    key={fee.feeId}
                    className="flex flex-col gap-3 rounded-card border border-line px-6 py-5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <span className="text-body font-bold text-ink">
                        {fee.payerName} ({labelOf(PAYER_TYPE_LABEL, fee.payerType)}){" "}
                        {formatKrw(fee.totalAmount)}
                      </span>
                      <span className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={isReadOnly}
                          aria-label={`${fee.payerName} 보수 조정`}
                          onClick={() => setDialog({ kind: "revision", fee })}
                        >
                          보수 조정
                        </Button>
                        <Button
                          variant="outlined"
                          size="sm"
                          disabled={isReadOnly}
                          aria-label={`${fee.payerName} 수납·환급 기록`}
                          onClick={() => setDialog({ kind: "transaction", fee })}
                        >
                          수납·환급 기록
                        </Button>
                      </span>
                    </div>
                    <p className="text-caption text-ink-2">
                      약정 {formatKrw(fee.agreedFeeAmount)} · 공급가액 {formatKrw(fee.supplyAmount)}{" "}
                      · 세액 {formatKrw(fee.taxAmount)} ·{" "}
                      {fee.vatIncluded ? "부가세 포함" : "부가세 별도"} · 순수납{" "}
                      {formatKrw(fee.netReceivedAmount)}
                    </p>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div>
                        <h3 className="text-caption font-semibold text-ink-2">보수 조정 이력</h3>
                        <ul className="mt-1 flex flex-col gap-1">
                          {fee.revisions.map((revision) => (
                            <li
                              key={revision.revisionId}
                              className={`text-caption ${revision.isSuperseded ? "text-ink-3 line-through" : "text-ink"}`}
                            >
                              {labelOf(FEE_REVISION_TYPE_LABEL, revision.revisionType)}{" "}
                              {formatSeoulDate(revision.effectiveDate)}{" "}
                              {formatKrw(revision.totalAmount)}
                              {revision.reason ? ` · ${revision.reason}` : ""}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h3 className="text-caption font-semibold text-ink-2">수납·환급 내역</h3>
                        {fee.transactions.length === 0 ? (
                          <p className="mt-1 text-caption text-ink-3">기록된 거래가 없습니다.</p>
                        ) : (
                          <ul className="mt-1 flex flex-col gap-1">
                            {fee.transactions.map((transaction) => (
                              <li
                                key={transaction.transactionId}
                                className={`text-caption ${transaction.isSuperseded ? "text-ink-3 line-through" : "text-ink"}`}
                              >
                                {labelOf(FEE_TRANSACTION_LABEL, transaction.transactionType)}{" "}
                                {formatSeoulDate(transaction.actualDate)}{" "}
                                {formatKrw(transaction.amount)}
                                {transaction.correctionReason
                                  ? ` · 정정: ${transaction.correctionReason}`
                                  : ""}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </QueryGate>
      {dialog?.kind === "create" ? <FeeCreateDialog detail={detail} onClose={close} /> : null}
      {dialog?.kind === "revision" ? (
        <RevisionDialog contractId={detail.contractId} fee={dialog.fee} onClose={close} />
      ) : null}
      {dialog?.kind === "transaction" ? (
        <TransactionDialog contractId={detail.contractId} fee={dialog.fee} onClose={close} />
      ) : null}
    </div>
  );
}

export function FeeScreen({ contractId }: { contractId: number }) {
  return (
    <ContractSubScreen
      contractId={contractId}
      active="fees"
      title="중개보수·수납"
      description="중개보수를 청구하고 받은 돈을 지급의무자별로 기록합니다."
    >
      {(detail) => <FeeBody detail={detail} />}
    </ContractSubScreen>
  );
}
