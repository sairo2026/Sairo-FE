"use client";

import { useState } from "react";
import { Checkbox } from "@/shared/components/ui/select-field";
import { TextField } from "@/shared/components/ui/text-field";
import { OpsReasonDialog } from "../components/common/ops-reason-dialog";
import { REFUND_RECOVERY_AUDIT_NOTICE, STEP_UP_NOTICE } from "./billing-model";

function DangerNote({ children }: { children: string }) {
  return (
    <p
      role="note"
      className="rounded-small border border-danger px-4 py-3 text-caption text-danger"
    >
      {children}
    </p>
  );
}

function Description({ lead, danger }: { lead: string; danger: string }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-body text-ink-2">{lead}</p>
      <DangerNote>{danger}</DangerNote>
      <p className="text-caption text-ink-2">
        {STEP_UP_NOTICE} {REFUND_RECOVERY_AUDIT_NOTICE}
      </p>
    </div>
  );
}

type DialogProps = {
  isOpen: boolean;
  onSubmit: (input: { reason: string; reference: string }) => Promise<unknown>;
  onClose: () => void;
};

function ReopenForm({ isOpen, onSubmit, onClose }: DialogProps) {
  const [confirmed, setConfirmed] = useState(false);
  return (
    <OpsReasonDialog
      isOpen={isOpen}
      title="실패한 환불 다시 열기"
      reasonLabel="다시 여는 사유"
      reasonHint="PG 관리자 화면에서 확인한 내용과 다시 여는 이유를 적어 주세요."
      maxLength={1000}
      confirmLabel="다시 열기"
      isReady={confirmed}
      description={
        <Description
          lead="환불을 승인 상태로 되돌립니다. 이후 환불 실행을 누르면 PG로 새 요청이 나갑니다."
          danger="PG에서 이미 취소된 결제를 다시 열면 같은 금액이 두 번 환불될 수 있습니다. PG 관리자 화면에서 취소되지 않았는지 먼저 확인해 주세요."
        />
      }
      onSubmit={(reason) => onSubmit({ reason, reference: "" })}
      onClose={() => {
        setConfirmed(false);
        onClose();
      }}
    >
      <Checkbox
        label="PG에서 취소되지 않은 것을 확인했습니다"
        requirement="required"
        checked={confirmed}
        onCheckedChange={setConfirmed}
      />
    </OpsReasonDialog>
  );
}

function ManualResolveForm({ isOpen, onSubmit, onClose }: DialogProps) {
  const [confirmed, setConfirmed] = useState(false);
  const [reference, setReference] = useState("");
  return (
    <OpsReasonDialog
      isOpen={isOpen}
      title="실패한 환불 수동 완료"
      reasonLabel="직접 처리한 사유"
      reasonHint="PG 관리자 화면에서 직접 취소한 경위를 적어 주세요."
      maxLength={1000}
      confirmLabel="수동 완료"
      isReady={confirmed && reference.trim() !== ""}
      description={
        <Description
          lead="PG 관리자 화면에서 직접 취소한 환불을 근거와 함께 완료로 닫습니다. PG로는 다시 요청하지 않고 청구서 환불 상태를 맞춥니다."
          danger="PG에서 실제로 취소된 금액이 환불 금액과 같은지 확인한 뒤에만 완료해 주세요. 완료하면 되돌릴 수 없습니다."
        />
      }
      onSubmit={(reason) => onSubmit({ reason, reference: reference.trim() })}
      onClose={() => {
        setConfirmed(false);
        setReference("");
        onClose();
      }}
    >
      <TextField
        label="PG 취소 근거"
        value={reference}
        onValueChange={setReference}
        maxLength={150}
        required
        hint="PG 관리자 화면의 취소 거래 번호 등을 적어 주세요. 완료 기록에 MANUAL: 근거로 남습니다."
      />
      <Checkbox
        label="PG 콘솔에서 직접 취소한 것을 확인했습니다"
        requirement="required"
        checked={confirmed}
        onCheckedChange={setConfirmed}
      />
    </OpsReasonDialog>
  );
}

export function RefundReopenDialog(props: DialogProps) {
  return <ReopenForm key={`reopen-${props.isOpen}`} {...props} />;
}

export function RefundManualResolveDialog(props: DialogProps) {
  return <ManualResolveForm key={`manual-${props.isOpen}`} {...props} />;
}
