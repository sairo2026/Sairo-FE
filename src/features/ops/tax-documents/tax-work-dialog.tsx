"use client";

import { useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { Checkbox, RadioGroup, SelectField } from "@/shared/components/ui/select-field";
import { DateTimeField } from "@/shared/components/ui/date-time-field";
import { Modal } from "@/shared/components/ui/modal";
import { TextAreaField } from "@/shared/components/ui/textarea-field";
import { TextField } from "@/shared/components/ui/text-field";
import { formatKrw } from "@/shared/lib/format";
import type { TaxDocumentListResponse } from "@/lib/api/contracts/ops.schema";
import { useInvoiceDetail } from "../billing/billing-api";
import { INVOICE_STATUS, describeBillingError } from "../billing/billing-model";
import { OpsStatusBadge } from "../components/common/ops-status-badge";
import { useTaxDocumentActions } from "./tax-api";
import {
  RECORD_STATUS_OPTIONS,
  TAX_DRAFT_NOTICE,
  TAX_ELIGIBLE_INVOICE_STATUS,
  TAX_KIND_LABELS,
  TAX_STATUS,
  parseSignedInteger,
  suggestSplit,
} from "./tax-model";

export type TaxRow = TaxDocumentListResponse["items"][number];
export type TaxWorkMode = "record" | "amend" | "cancel";

type Errors = Partial<
  Record<
    "kind" | "approvalNumber" | "issuedOn" | "supplyAmount" | "vatAmount" | "note" | "original",
    string
  >
>;

const KIND_OPTIONS = Object.entries(TAX_KIND_LABELS).map(([value, label]) => ({ value, label }));

export function TaxWorkDialog({
  invoiceId,
  history,
  initialMode,
  initialOriginalId,
  onClose,
  onDone,
}: {
  invoiceId: number;
  history: TaxRow[];
  initialMode: TaxWorkMode;
  initialOriginalId: number | null;
  onClose: () => void;
  onDone: (text: string) => void;
}) {
  const invoice = useInvoiceDetail(invoiceId);
  const actions = useTaxDocumentActions();
  const issued = history.filter((row) => row.status === "ISSUED");
  const firstOriginal = issued.find((row) => row.documentId === initialOriginalId) ?? issued[0];
  const [mode, setMode] = useState<TaxWorkMode>(initialMode);
  const [kind, setKind] = useState(history[0]?.documentKind ?? "TAX_INVOICE");
  const [isElectronic, setIsElectronic] = useState(true);
  const [status, setStatus] = useState("ISSUED");
  const [originalId, setOriginalId] = useState(String(firstOriginal?.documentId ?? ""));
  const [approvalNumber, setApprovalNumber] = useState("");
  const [issuedOn, setIssuedOn] = useState("");
  const [supply, setSupply] = useState(() => negated(firstOriginal?.supplyAmount, initialMode));
  const [vat, setVat] = useState(() => negated(firstOriginal?.vatAmount, initialMode));
  const [note, setNote] = useState(initialMode === "cancel" ? "발급 취소" : "");
  const [errors, setErrors] = useState<Errors>({});
  const [failure, setFailure] = useState<string | null>(null);

  const total = invoice.data?.vatIncludedAmount ?? null;
  const isEligible = invoice.data
    ? TAX_ELIGIBLE_INVOICE_STATUS.includes(invoice.data.status)
    : true;
  const isPending = actions.record.isPending || actions.amend.isPending;
  const original = issued.find((row) => String(row.documentId) === originalId);

  function changeMode(next: string) {
    const value = next as TaxWorkMode;
    setMode(value);
    setErrors({});
    setFailure(null);
    if (value === "cancel" && original) {
      setSupply(negated(original.supplyAmount, "cancel"));
      setVat(negated(original.vatAmount, "cancel"));
      setNote("발급 취소");
    }
  }

  function changeOriginal(next: string) {
    setOriginalId(next);
    const row = issued.find((item) => String(item.documentId) === next);
    if (mode === "cancel" && row) {
      setSupply(negated(row.supplyAmount, "cancel"));
      setVat(negated(row.vatAmount, "cancel"));
    }
  }

  function validate(): Errors {
    const found: Errors = {};
    const needsAmounts = mode !== "record" || status === "ISSUED";
    if (needsAmounts) {
      const approval = approvalNumber.trim();
      if (approval === "" || approval.length > 40) {
        found.approvalNumber = "승인번호를 40자 이내로 입력해 주세요.";
      }
      if (issuedOn === "") found.issuedOn = "발급일을 입력해 주세요.";
      const supplyValue = parseSignedInteger(supply);
      const vatValue = parseSignedInteger(vat);
      if (supplyValue === null) found.supplyAmount = "공급가액을 정수로 입력해 주세요.";
      if (vatValue === null) found.vatAmount = "세액을 정수로 입력해 주세요.";
      if (
        mode === "record" &&
        supplyValue !== null &&
        vatValue !== null &&
        total !== null &&
        supplyValue + vatValue !== total
      ) {
        found.vatAmount = `공급가액과 세액의 합이 청구서 총액 ${formatKrw(total)}과 같아야 합니다.`;
      }
    }
    if (mode === "record" && status === "ISSUE_FAILED" && note.trim() === "") {
      found.note = "발급 실패 사유를 입력해 주세요.";
    }
    if (mode !== "record") {
      if (originalId === "") found.original = "수정할 원본 발급 기록을 선택해 주세요.";
      if (note.trim() === "") found.note = "사유를 입력해 주세요.";
    }
    return found;
  }

  async function submit() {
    setFailure(null);
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    try {
      if (mode === "record") {
        const isIssued = status === "ISSUED";
        await actions.record.mutateAsync({
          invoiceId,
          body: {
            documentKind: kind,
            isElectronic,
            status,
            approvalNumber: isIssued ? approvalNumber.trim() : null,
            issuedOn: isIssued ? issuedOn : null,
            supplyAmount: isIssued ? parseSignedInteger(supply) : null,
            vatAmount: isIssued ? parseSignedInteger(vat) : null,
            operatorNote: note.trim() === "" ? null : note.trim(),
          },
        });
        onDone("발급 기록을 저장했습니다.");
      } else {
        await actions.amend.mutateAsync({
          documentId: Number(originalId),
          body: {
            approvalNumber: approvalNumber.trim(),
            issuedOn,
            supplyAmount: parseSignedInteger(supply) ?? 0,
            vatAmount: parseSignedInteger(vat) ?? 0,
            operatorNote: note.trim(),
          },
        });
        onDone(mode === "cancel" ? "취소 처리를 기록했습니다." : "수정 발급을 기록했습니다.");
      }
    } catch (error) {
      setFailure(describeBillingError(error, "발급 기록을 저장하지 못했습니다."));
    }
  }

  const split = total === null ? null : suggestSplit(total);
  const showAmounts = mode !== "record" || status === "ISSUED";
  return (
    <Modal
      isOpen
      size="wide"
      title={`청구서 ${invoiceId} 증빙 발급 기록`}
      onClose={onClose}
      footer={
        <>
          <Button variant="cancel" onClick={onClose}>
            닫기
          </Button>
          <Button isLoading={isPending} disabled={invoice.isError} onClick={() => void submit()}>
            저장
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4 overflow-y-auto">
        <p className="text-caption text-ink-2">{TAX_DRAFT_NOTICE}</p>
        <section aria-label="청구서 요약" className="rounded-card-flat border border-line p-4">
          {invoice.isPending ? (
            <p className="text-body text-ink-2">청구서를 불러오는 중입니다.</p>
          ) : null}
          {invoice.isError ? (
            <p role="alert" className="text-body text-danger">
              청구서를 불러오지 못했습니다. 청구서 번호를 확인해 주세요.
            </p>
          ) : null}
          {invoice.data ? (
            <div className="flex flex-col gap-1 text-body text-ink">
              <p>
                사무소 {invoice.data.officeId} · 총액 {formatKrw(invoice.data.vatIncludedAmount)} ·{" "}
                <OpsStatusBadge status={invoice.data.status} map={INVOICE_STATUS} />
              </p>
              <p className="text-caption text-ink-2">
                수신 정보:{" "}
                {history.length === 0
                  ? "확인할 수 없음"
                  : history[0]?.recipientRegistered
                    ? "등록됨"
                    : "등록 안 됨"}
              </p>
              {!isEligible ? (
                <p role="note" className="text-caption text-danger">
                  결제 완료나 환불 상태의 청구서만 증빙을 기록할 수 있습니다.
                </p>
              ) : null}
            </div>
          ) : null}
        </section>
        <section aria-label="기록 이력">
          <h3 className="mb-2 text-body font-semibold text-ink">기록 이력</h3>
          {history.length === 0 ? (
            <p className="text-caption text-ink-2">이 청구서의 발급 기록이 없습니다.</p>
          ) : (
            <ul className="flex flex-col gap-1 text-caption text-ink-2">
              {history.map((row) => (
                <li key={row.documentId}>
                  #{row.documentId} {TAX_KIND_LABELS[row.documentKind] ?? row.documentKind}{" "}
                  {TAX_STATUS[row.status]?.label ?? row.status}
                  {row.approvalNumber ? ` · 승인번호 ${row.approvalNumber}` : ""}
                  {row.issuedOn ? ` · ${row.issuedOn}` : ""}
                  {row.supplyAmount !== null ? ` · 공급가액 ${formatKrw(row.supplyAmount)}` : ""}
                  {row.vatAmount !== null ? ` · 세액 ${formatKrw(row.vatAmount)}` : ""}
                </li>
              ))}
            </ul>
          )}
        </section>
        <RadioGroup
          legend="처리 종류"
          name="tax-work-mode"
          value={mode}
          onValueChange={changeMode}
          options={[
            { value: "record", label: "발급 결과 기록" },
            { value: "amend", label: "수정 발급" },
            { value: "cancel", label: "취소 처리" },
          ]}
        />
        {mode === "record" ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField
              label="증빙 종류"
              value={kind}
              options={KIND_OPTIONS}
              onValueChange={setKind}
            />
            <SelectField
              label="발급 상태"
              value={status}
              options={RECORD_STATUS_OPTIONS}
              onValueChange={setStatus}
            />
            <Checkbox label="전자 발급" checked={isElectronic} onCheckedChange={setIsElectronic} />
            <p className="text-caption text-ink-2">
              현금영수증과 면세 계산서는 종류를 골라 기록만 합니다.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <SelectField
              label="원본 발급 기록"
              value={originalId}
              placeholder="원본을 선택해 주세요"
              error={errors.original}
              options={issued.map((row) => ({
                value: String(row.documentId),
                label: `#${row.documentId} ${TAX_KIND_LABELS[row.documentKind] ?? row.documentKind} ${row.approvalNumber ?? ""}`,
              }))}
              onValueChange={changeOriginal}
            />
            <p className="text-caption text-ink-2">
              {mode === "cancel"
                ? "취소 처리는 원본 금액을 되돌리는 수정 발급으로 기록합니다. 원본은 고치지 않고 새 기록이 만들어집니다."
                : "원본은 고치지 않고 수정 발급 기록이 새로 만들어집니다. 금액은 음수일 수 있습니다."}
            </p>
          </div>
        )}
        {showAmounts ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              label="승인번호"
              value={approvalNumber}
              onValueChange={setApprovalNumber}
              error={errors.approvalNumber}
              maxLength={40}
            />
            <DateTimeField
              label="발급일"
              kind="date"
              value={issuedOn}
              onValueChange={setIssuedOn}
              error={errors.issuedOn}
            />
            <TextField
              label="공급가액"
              value={supply}
              onValueChange={setSupply}
              error={errors.supplyAmount}
              hint={mode === "record" ? undefined : "음수로 입력할 수 있습니다."}
            />
            <TextField
              label="세액"
              value={vat}
              onValueChange={setVat}
              error={errors.vatAmount}
              hint={mode === "record" ? undefined : "음수로 입력할 수 있습니다."}
            />
            {mode === "record" && split ? (
              <div className="flex flex-col gap-1 sm:col-span-2">
                <p className="text-caption text-ink-2">
                  청구서 총액 {formatKrw(total)} 기준 제안: 공급가액 {formatKrw(split.supply)}, 세액{" "}
                  {formatKrw(split.vat)}. 세무사 확인 전 가정입니다.
                </p>
                <div>
                  <Button
                    size="sm"
                    variant="outlined"
                    onClick={() => {
                      setSupply(String(split.supply));
                      setVat(String(split.vat));
                    }}
                  >
                    제안값 채우기
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
        <TextAreaField
          label={
            mode === "record"
              ? status === "ISSUE_FAILED"
                ? "발급 실패 사유"
                : "메모(선택)"
              : "사유"
          }
          value={note}
          onValueChange={setNote}
          error={errors.note}
          rows={3}
        />
        {failure ? (
          <p role="alert" className="text-caption text-danger">
            {failure}
          </p>
        ) : null}
      </div>
    </Modal>
  );
}

function negated(value: number | null | undefined, mode: TaxWorkMode): string {
  if (mode !== "cancel" || value === null || value === undefined) return "";
  return String(value === 0 ? 0 : -value);
}
