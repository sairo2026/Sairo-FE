"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { VisitCoordinationDetailResponse } from "@/lib/api/contracts/visit.schema";
import { FormAlert, FormNotice } from "@/shared/components/feedback/form-frame";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Checkbox, SelectField } from "@/shared/components/ui/select-field";
import { DateTimeField } from "@/shared/components/ui/date-time-field";
import { formatSeoulDateTime } from "@/shared/lib/format";
import { useOfficeAccess } from "@/shared/session/office-access-context";
import { createConfirmationDelivery } from "../api/follow.api";
import {
  followKeys,
  useConfirmationDeliveries,
  useConfirmationMessages,
} from "../hooks/follow-queries";
import { NOTICE_METHOD_LABEL, labelOf } from "../model/labels";
import { describeVisitError } from "../model/messages";
import { toKstIso } from "../model/time";

type Detail = VisitCoordinationDetailResponse;

function MessageBox({ title, text }: { title: string; text: string }) {
  const [copied, setCopied] = useState<"idle" | "copied" | "failed">("idle");
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied("copied");
    } catch {
      setCopied("failed");
    }
  }
  return (
    <div className="flex flex-col gap-2 rounded-control border border-line p-4">
      <h3 className="text-body font-semibold text-ink">{title}</h3>
      <pre className="whitespace-pre-wrap text-caption text-ink-2">{text}</pre>
      <div className="flex items-center gap-2">
        <Button size="sm" variant="ghost" onClick={() => void copy()}>
          안내문 복사
        </Button>
        {copied === "copied" ? (
          <span className="text-caption text-ink-2">복사했습니다.</span>
        ) : null}
        {copied === "failed" ? (
          <span className="text-caption text-danger">
            복사하지 못했습니다. 직접 선택해 복사해 주세요.
          </span>
        ) : null}
      </div>
    </div>
  );
}

function DeliveryForm({ detail, scheduleVersion }: { detail: Detail; scheduleVersion: number }) {
  const queryClient = useQueryClient();
  const [recipient, setRecipient] = useState("CUSTOMER");
  const [candidateId, setCandidateId] = useState("");
  const [delivered, setDelivered] = useState(true);
  const [channel, setChannel] = useState("KAKAO");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [localError, setLocalError] = useState<string>();
  const mutation = useMutation({
    mutationFn: () =>
      createConfirmationDelivery(detail.coordinationId, {
        recipientType: recipient as "CUSTOMER" | "APPROVER",
        scheduleVersion,
        delivered,
        channel: delivered ? (channel as "KAKAO" | "SMS" | "PHONE" | "IN_PERSON" | "EMAIL") : null,
        deliveredAt: delivered ? toKstIso(date, time) : null,
        candidatePropertyId: recipient === "APPROVER" ? Number(candidateId) : null,
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: followKeys.deliveries(detail.coordinationId) }),
  });
  const approverCandidates = detail.candidateProperties.filter((entry) => !entry.crossOffice);

  function submit() {
    if (recipient === "APPROVER" && candidateId === "") {
      setLocalError("승인자에게 전달한 매물을 선택해 주세요.");
      return;
    }
    if (delivered && (date === "" || time === "")) {
      setLocalError("실제 전달 날짜와 시각을 입력해 주세요.");
      return;
    }
    setLocalError(undefined);
    mutation.mutate();
  }

  return (
    <div className="flex flex-col gap-3 rounded-control border border-line p-4">
      <h3 className="text-body font-semibold text-ink">전달 기록 추가</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <SelectField
          label="수신자"
          value={recipient}
          options={[
            { value: "CUSTOMER", label: "고객" },
            { value: "APPROVER", label: "출입 승인자" },
          ]}
          onValueChange={setRecipient}
        />
        {recipient === "APPROVER" ? (
          <SelectField
            label="매물"
            value={candidateId}
            options={[
              { value: "", label: "선택" },
              ...approverCandidates.map((entry) => ({
                value: String(entry.candidatePropertyId),
                label: entry.propertyName,
              })),
            ]}
            onValueChange={setCandidateId}
          />
        ) : null}
        <SelectField
          label="전달 채널"
          value={channel}
          disabled={!delivered}
          options={Object.entries(NOTICE_METHOD_LABEL).map(([value, label]) => ({ value, label }))}
          onValueChange={setChannel}
        />
      </div>
      <Checkbox label="전달했습니다" checked={delivered} onCheckedChange={setDelivered} />
      {delivered ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <DateTimeField label="실제 전달 날짜" kind="date" value={date} onValueChange={setDate} />
          <DateTimeField label="실제 전달 시각" kind="time" value={time} onValueChange={setTime} />
        </div>
      ) : null}
      {localError ? <FormAlert>{localError}</FormAlert> : null}
      {mutation.isError ? (
        <FormAlert>
          {describeVisitError(mutation.error, "전달 기록을 저장하지 못했습니다.")}
        </FormAlert>
      ) : null}
      <div>
        <Button size="sm" isLoading={mutation.isPending} onClick={submit}>
          전달 기록 저장
        </Button>
      </div>
    </div>
  );
}

export function ConfirmationSection({ detail }: { detail: Detail }) {
  const { isReadOnly } = useOfficeAccess();
  const enabled = detail.confirmedScheduleVersion !== null && detail.status !== "CANCELLED";
  const messages = useConfirmationMessages(detail.coordinationId, enabled);
  const deliveries = useConfirmationDeliveries(detail.coordinationId, enabled);
  if (!enabled) return null;
  const nameOf = (candidateId: number | null) =>
    detail.candidateProperties.find((entry) => entry.candidatePropertyId === candidateId)
      ?.propertyName ?? "";
  const crossCandidates = detail.candidateProperties.filter((entry) => entry.crossOffice);
  return (
    <section className="flex flex-col gap-3" aria-labelledby="confirm-title" id="confirmation">
      <h2 id="confirm-title" className="text-h2 font-semibold text-ink">
        확정 안내
      </h2>
      <p className="text-caption text-ink-2">
        확정된 일정의 안내문은 직접 복사해 전달하고, 전달한 채널과 실제 시각을 기록합니다. 일정이
        바뀌면 새 버전으로 다시 안내합니다.
      </p>
      {messages.isPending ? (
        <p className="text-caption text-ink-2">안내문을 불러오는 중입니다.</p>
      ) : messages.isError ? (
        <FormAlert>{describeVisitError(messages.error, "안내문을 불러오지 못했습니다.")}</FormAlert>
      ) : (
        <div className="flex flex-col gap-3">
          <MessageBox title="고객 안내문" text={messages.data.customerMessage} />
          {messages.data.approverMessages.map((entry) => (
            <MessageBox
              key={entry.approvalId}
              title={`승인자 안내문 · ${nameOf(entry.candidatePropertyId)} · ${entry.approverName}`}
              text={entry.message}
            />
          ))}
          {crossCandidates.length > 0 ? (
            <FormNotice>
              허용받은 매물({crossCandidates.map((entry) => entry.propertyName).join(", ")})은
              승인자용 안내문이 만들어지지 않고 승인자 전달 기록도 받지 않습니다.
            </FormNotice>
          ) : null}
          {!isReadOnly ? (
            <DeliveryForm detail={detail} scheduleVersion={messages.data.scheduleVersion} />
          ) : null}
        </div>
      )}
      <h3 className="text-body font-semibold text-ink">전달 기록</h3>
      {deliveries.isPending ? (
        <p className="text-caption text-ink-2">전달 기록을 불러오는 중입니다.</p>
      ) : deliveries.isError ? (
        <FormAlert>
          {describeVisitError(deliveries.error, "전달 기록을 불러오지 못했습니다.")}
        </FormAlert>
      ) : deliveries.data.items.length === 0 ? (
        <p className="text-caption text-ink-2">기록된 전달이 없습니다.</p>
      ) : (
        <ul className="flex flex-col gap-1 text-caption text-ink">
          {deliveries.data.items.map((entry) => (
            <li key={entry.deliveryId} className="flex flex-wrap items-center gap-2">
              <Badge tone={entry.delivered ? "green" : "gray"}>
                {entry.delivered ? "전달함" : "전달 못 함"}
              </Badge>
              <span>
                {entry.recipientType === "CUSTOMER"
                  ? "고객"
                  : `승인자 ${nameOf(entry.candidatePropertyId)}`}
                {" · 일정 v"}
                {entry.scheduleVersion}
                {entry.channel ? ` · ${labelOf(NOTICE_METHOD_LABEL, entry.channel)}` : ""}
                {entry.deliveredAt ? ` · ${formatSeoulDateTime(entry.deliveredAt)}` : ""}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
