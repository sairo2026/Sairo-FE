"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { Button } from "@/shared/components/ui/button";
import { DateTimeField } from "@/shared/components/ui/date-time-field";
import { Modal } from "@/shared/components/ui/modal";
import { SelectField } from "@/shared/components/ui/select-field";
import { TextAreaField } from "@/shared/components/ui/textarea-field";
import { TextField } from "@/shared/components/ui/text-field";
import { toSeoulIso } from "../registrations/registration-model";
import { OpsReasonDialog } from "../components/common/ops-reason-dialog";
import { describeOpsError } from "../model/ops-errors";
import { useOpsSession } from "../model/ops-session";
import { CLOSED_REASONS, LEAD_STATUS, reopenTarget } from "./lead-model";
import type { LeadDetail, LeadQuote } from "./lead-model";

function ActionDialog({
  title,
  confirmLabel,
  canSubmit,
  onSubmit,
  onClose,
  children,
}: {
  title: string;
  confirmLabel: string;
  canSubmit: boolean;
  onSubmit: () => Promise<unknown>;
  onClose: () => void;
  children: ReactNode;
}) {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setIsPending(true);
    setError(null);
    try {
      await onSubmit();
      onClose();
    } catch (caught) {
      setError(describeOpsError(caught));
    } finally {
      setIsPending(false);
    }
  }

  return (
    <Modal
      isOpen
      title={title}
      onClose={onClose}
      footer={
        <>
          <Button variant="cancel" onClick={onClose}>
            취소
          </Button>
          <Button
            variant="submit"
            disabled={!canSubmit || isPending}
            isLoading={isPending}
            onClick={() => void submit()}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {children}
        {error ? (
          <p role="alert" className="text-caption text-danger">
            {error}
          </p>
        ) : null}
      </div>
    </Modal>
  );
}

export function AssignDialog({
  onSubmit,
  onClose,
}: {
  onSubmit: (operatorId: number) => Promise<unknown>;
  onClose: () => void;
}) {
  const session = useOpsSession();
  const [value, setValue] = useState("");
  const id = Number(value);
  return (
    <ActionDialog
      title="담당 배정"
      confirmLabel="담당 배정"
      canSubmit={id > 0}
      onSubmit={() => onSubmit(id)}
      onClose={onClose}
    >
      <p className="text-body text-ink-2">
        활성 지원 역할 운영자만 담당이 될 수 있습니다. 이미 배정된 문의는 상태를 유지한 채 담당만
        바뀝니다.
      </p>
      <TextField
        label="담당 운영자 번호"
        kind="number"
        value={value}
        onValueChange={setValue}
        actionLabel="나로 입력"
        onAction={() => setValue(String(session.operatorId))}
      />
    </ActionDialog>
  );
}

type QuoteForm = {
  officeCount: string;
  seatCount: string;
  quoteAmount: string;
  taxAmount: string;
  serviceScope: string;
  deliveryDueAt: string;
  paymentMethod: string;
  refundTerms: string;
};

function initialQuote(latest: LeadQuote | undefined, lead: LeadDetail): QuoteForm {
  return {
    officeCount: String(latest?.officeCount ?? lead.branchCount),
    seatCount: String(latest?.seatCount ?? lead.expectedSeats),
    quoteAmount: latest ? String(latest.quoteAmount) : "",
    taxAmount: latest ? String(latest.taxAmount) : "",
    serviceScope: latest?.serviceScope ?? "",
    deliveryDueAt: latest?.deliveryDueAt ?? "",
    paymentMethod: latest?.paymentMethod ?? "",
    refundTerms: latest?.refundTerms ?? "",
  };
}

export function QuoteDialog({
  lead,
  onSubmit,
  onClose,
}: {
  lead: LeadDetail;
  onSubmit: (body: {
    officeCount: number;
    seatCount: number;
    quoteAmount: number;
    taxAmount: number;
    serviceScope: string;
    deliveryDueAt: string;
    paymentMethod: string;
    refundTerms: string;
  }) => Promise<unknown>;
  onClose: () => void;
}) {
  const latest = lead.quotes.at(-1);
  const [form, setForm] = useState(() => initialQuote(latest, lead));
  const set = (patch: Partial<QuoteForm>) => setForm((current) => ({ ...current, ...patch }));
  const valid =
    Number(form.officeCount) >= 1 &&
    Number(form.seatCount) >= 1 &&
    form.quoteAmount !== "" &&
    form.taxAmount !== "" &&
    form.serviceScope.trim() !== "" &&
    /^\d{4}-\d{2}-\d{2}$/.test(form.deliveryDueAt) &&
    form.paymentMethod.trim() !== "" &&
    form.refundTerms.trim() !== "";
  return (
    <ActionDialog
      title={latest ? "견적 새 버전 발행" : "견적 발행"}
      confirmLabel="견적 발행"
      canSubmit={valid}
      onClose={onClose}
      onSubmit={() =>
        onSubmit({
          officeCount: Number(form.officeCount),
          seatCount: Number(form.seatCount),
          quoteAmount: Number(form.quoteAmount),
          taxAmount: Number(form.taxAmount),
          serviceScope: form.serviceScope.trim(),
          deliveryDueAt: form.deliveryDueAt,
          paymentMethod: form.paymentMethod.trim(),
          refundTerms: form.refundTerms.trim(),
        })
      }
    >
      <p className="text-body text-ink-2">
        조건을 바꾸면 기존 견적을 고치지 않고 새 버전으로 발행하며 이전 버전은 대체됨으로
        표시됩니다. 유효기한은 발행 후 14일로 서버가 정합니다. 견적은 배정된 담당자만 발행할 수
        있습니다.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="도입 사무소 수"
          kind="number"
          value={form.officeCount}
          onValueChange={(officeCount) => set({ officeCount })}
        />
        <TextField
          label="도입 인원"
          kind="number"
          value={form.seatCount}
          onValueChange={(seatCount) => set({ seatCount })}
        />
        <TextField
          label="견적 금액(원)"
          kind="number"
          value={form.quoteAmount}
          onValueChange={(quoteAmount) => set({ quoteAmount })}
        />
        <TextField
          label="세금(원)"
          kind="number"
          value={form.taxAmount}
          onValueChange={(taxAmount) => set({ taxAmount })}
        />
        <DateTimeField
          label="납기"
          kind="date"
          value={form.deliveryDueAt}
          onValueChange={(deliveryDueAt) => set({ deliveryDueAt })}
        />
        <TextField
          label="결제 방식"
          value={form.paymentMethod}
          onValueChange={(paymentMethod) => set({ paymentMethod })}
        />
      </div>
      <TextAreaField
        label="서비스 범위"
        value={form.serviceScope}
        onValueChange={(serviceScope) => set({ serviceScope })}
        rows={2}
      />
      <TextAreaField
        label="환불 조건"
        value={form.refundTerms}
        onValueChange={(refundTerms) => set({ refundTerms })}
        rows={2}
      />
    </ActionDialog>
  );
}

export function ContractDialog({
  onSubmit,
  onClose,
}: {
  onSubmit: (body: { contractReference: string; contractedAt: string }) => Promise<unknown>;
  onClose: () => void;
}) {
  const [openedAt] = useState(() => Date.now());
  const [reference, setReference] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("10:00");
  const contractedAt = toSeoulIso(date, time);
  const isPast = contractedAt !== null && Date.parse(contractedAt) <= openedAt;
  const trimmed = reference.trim();
  const refValid = trimmed.length >= 1 && trimmed.length <= 100;
  return (
    <ActionDialog
      title="계약 기록"
      confirmLabel="계약 기록"
      canSubmit={refValid && isPast}
      onClose={onClose}
      onSubmit={() => onSubmit({ contractReference: trimmed, contractedAt: contractedAt ?? "" })}
    >
      <p className="text-body text-ink-2">
        수락된 견적이 있는 문의만 계약으로 기록할 수 있고 계약 뒤에는 종료나 재개를 할 수 없습니다.
      </p>
      <TextField
        label="계약 번호"
        value={reference}
        maxLength={100}
        hint="계약서 번호나 전자계약 문서 번호를 1자에서 100자까지 입력합니다."
        onValueChange={setReference}
      />
      <div className="flex gap-4">
        <DateTimeField label="체결 날짜" kind="date" value={date} onValueChange={setDate} />
        <DateTimeField
          label="체결 시각"
          kind="time"
          value={time}
          onValueChange={setTime}
          error={date !== "" && !isPast ? "체결 시각은 지금 이전이어야 합니다." : undefined}
        />
      </div>
    </ActionDialog>
  );
}

export function CloseDialog({
  onSubmit,
  onClose,
}: {
  onSubmit: (body: { closedReason: string; closedNote?: string }) => Promise<unknown>;
  onClose: () => void;
}) {
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const trimmed = note.trim();
  const needsNote = reason === "OTHER";
  return (
    <ActionDialog
      title="문의 종료"
      confirmLabel="문의 종료"
      canSubmit={reason !== "" && (!needsNote || trimmed !== "")}
      onClose={onClose}
      onSubmit={() =>
        onSubmit({ closedReason: reason, ...(trimmed !== "" ? { closedNote: trimmed } : {}) })
      }
    >
      <p className="text-body text-ink-2">
        계약 전 문의를 종료합니다. 종료한 문의는 나중에 재개할 수 있습니다. 처리 기록은 감사 로그에
        남습니다.
      </p>
      <SelectField
        label="종료 사유"
        value={reason}
        placeholder="사유를 선택해 주세요"
        options={Object.entries(CLOSED_REASONS).map(([value, label]) => ({ value, label }))}
        onValueChange={setReason}
      />
      <TextAreaField
        label={needsNote ? "종료 메모(필수)" : "종료 메모"}
        value={note}
        maxLength={1000}
        rows={3}
        onValueChange={setNote}
      />
    </ActionDialog>
  );
}

export function ReopenDialog({
  lead,
  onSubmit,
  onClose,
}: {
  lead: LeadDetail;
  onSubmit: (body: { reason: string; assignedOperatorId?: number }) => Promise<unknown>;
  onClose: () => void;
}) {
  const [assignee, setAssignee] = useState("");
  const target = reopenTarget(lead.closedFromStatus);
  const needsReassign = target === "CONSULTING" || target === "ASSIGNED" || target === "QUOTED";
  return (
    <OpsReasonDialog
      isOpen
      title="문의 재개"
      reasonLabel="재개 사유"
      maxLength={500}
      confirmLabel="문의 재개"
      isReady={assignee === "" || Number(assignee) > 0}
      onSubmit={(reason) =>
        onSubmit({ reason, ...(assignee !== "" ? { assignedOperatorId: Number(assignee) } : {}) })
      }
      onClose={onClose}
      description={
        <p>
          돌아갈 단계:{" "}
          <strong>{target ? (LEAD_STATUS[target]?.label ?? target) : "확인 불가"}</strong>. 견적
          이후 단계에서 종료했다면 상담 단계로 돌아가 새 견적을 발행해야 합니다.
          {needsReassign
            ? " 기존 담당이 비활성이거나 없으면 아래에 담당 운영자 번호를 입력해야 합니다."
            : ""}
        </p>
      }
    >
      <TextField
        label="재개 후 담당 운영자 번호(선택)"
        kind="number"
        value={assignee}
        hint="비워 두면 기존 담당을 유지합니다."
        onValueChange={setAssignee}
      />
    </OpsReasonDialog>
  );
}
