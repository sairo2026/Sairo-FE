"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useId, useState } from "react";
import type { CustomerConsultationListResponse } from "@/lib/api/contracts/customer.schema";
import { FormAlert, FormNotice } from "@/shared/components/feedback/form-frame";
import { QueryGate } from "@/shared/components/feedback/query-gate";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { DateTimeField } from "@/shared/components/ui/date-time-field";
import { Modal } from "@/shared/components/ui/modal";
import { SelectField } from "@/shared/components/ui/select-field";
import { TextField } from "@/shared/components/ui/text-field";
import {
  countCodePoints,
  formatCount,
  formatSeoulDateTime,
  TEXT_LIMITS,
} from "@/shared/lib/format";
import { createConsultation, updateConsultation } from "../api/customer.api";
import {
  customerKeys,
  useConsultationRevisions,
  useConsultations,
} from "../hooks/customer-queries";
import { CONSULTATION_TYPES, CONSULTATION_TYPE_LABEL, labelOf } from "../model/labels";
import { describeCustomerError, fieldErrorMap, isApiCode } from "../model/messages";

type Consultation = CustomerConsultationListResponse["items"][number];

const REASON_MAX = 200;

function seoulParts(value: string | Date): { date: string; time: string } {
  const [date = "", time = ""] = formatSeoulDateTime(value).split(" ");
  return { date, time };
}

function toIso(date: string, time: string): string {
  return `${date}T${time}:00+09:00`;
}

function ContentField({
  value,
  onValueChange,
  error,
}: {
  value: string;
  onValueChange: (value: string) => void;
  error?: string;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-caption font-semibold text-ink">
        상담 내용
      </label>
      <textarea
        id={id}
        rows={4}
        value={value}
        aria-invalid={error ? true : undefined}
        onChange={(event) => onValueChange(event.target.value)}
        className="rounded-control border border-line bg-surface p-4 text-body text-ink focus:border-primary focus:bg-white"
      />
      {error ? (
        <p role="alert" className="text-caption text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

type FormErrors = Partial<Record<"date" | "time" | "content" | "reason", string>>;

function validateForm(input: {
  date: string;
  time: string;
  content: string;
  reason?: string;
}): FormErrors {
  const errors: FormErrors = {};
  if (input.date === "") errors.date = "상담 날짜를 입력해 주세요.";
  if (input.time === "") errors.time = "상담 시각을 입력해 주세요.";
  if (input.content.trim() === "") errors.content = "상담 내용을 입력해 주세요.";
  else if (countCodePoints(input.content) > TEXT_LIMITS.bodyMemo) {
    errors.content = `상담 내용은 ${formatCount(TEXT_LIMITS.bodyMemo)}자 이하로 입력해 주세요.`;
  }
  if (input.reason !== undefined) {
    if (input.reason.trim() === "") errors.reason = "정정 사유를 입력해 주세요.";
    else if (countCodePoints(input.reason) > REASON_MAX) {
      errors.reason = `정정 사유는 ${REASON_MAX}자 이하로 입력해 주세요.`;
    }
  }
  return errors;
}

function CreateForm({
  customerId,
  onCreated,
}: {
  customerId: number;
  onCreated: (message: string) => void;
}) {
  const queryClient = useQueryClient();
  const initial = seoulParts(new Date());
  const [type, setType] = useState("FOLLOWUP");
  const [date, setDate] = useState(initial.date);
  const [time, setTime] = useState(initial.time);
  const [content, setContent] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [formError, setFormError] = useState<string>();

  const mutation = useMutation({
    mutationFn: () =>
      createConsultation(customerId, {
        occurredAt: toIso(date, time),
        content: content.trim(),
        consultationType: type,
      }),
    onSuccess: async () => {
      setContent("");
      setFormError(undefined);
      onCreated("상담 이력을 등록했습니다.");
      await queryClient.invalidateQueries({ queryKey: customerKeys.all });
    },
    onError: (caught) => {
      const mapped = fieldErrorMap(caught);
      if (mapped.content) setErrors((existing) => ({ ...existing, content: mapped.content }));
      setFormError(describeCustomerError(caught, "상담 이력을 등록하지 못했습니다."));
    },
  });

  return (
    <form
      noValidate
      className="flex flex-col gap-4 rounded-card-flat border border-dashed border-line p-5"
      onSubmit={(event) => {
        event.preventDefault();
        setFormError(undefined);
        const next = validateForm({ date, time, content });
        setErrors(next);
        if (Object.keys(next).length === 0) mutation.mutate();
      }}
    >
      <h3 className="text-body font-semibold text-ink">상담 이력 등록</h3>
      <p className="text-caption text-ink-2">
        작성자는 입력하지 않으며 로그인한 구성원이 자동으로 기록됩니다. 최초문의는 고객당 한 건만
        지정할 수 있습니다.
      </p>
      <SelectField
        label="상담 구분"
        value={type}
        options={CONSULTATION_TYPES.map((value) => ({
          value,
          label: CONSULTATION_TYPE_LABEL[value],
        }))}
        onValueChange={setType}
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <DateTimeField
          label="상담 날짜"
          kind="date"
          value={date}
          onValueChange={(value) => {
            setDate(value);
            setErrors((existing) => ({ ...existing, date: undefined }));
          }}
          error={errors.date}
        />
        <DateTimeField
          label="상담 시각"
          kind="time"
          value={time}
          onValueChange={(value) => {
            setTime(value);
            setErrors((existing) => ({ ...existing, time: undefined }));
          }}
          error={errors.time}
        />
      </div>
      <ContentField
        value={content}
        onValueChange={(value) => {
          setContent(value);
          setErrors((existing) => ({ ...existing, content: undefined }));
        }}
        error={errors.content}
      />
      {formError ? <FormAlert>{formError}</FormAlert> : null}
      <div>
        <Button type="submit" size="sm" isLoading={mutation.isPending}>
          상담 등록
        </Button>
      </div>
    </form>
  );
}

function CorrectionDialog({
  consultation,
  onClose,
  onCorrected,
}: {
  consultation: Consultation;
  onClose: () => void;
  onCorrected: (message: string) => void;
}) {
  const queryClient = useQueryClient();
  const initial = seoulParts(consultation.occurredAt);
  const [type, setType] = useState(consultation.consultationType);
  const [date, setDate] = useState(initial.date);
  const [time, setTime] = useState(initial.time);
  const [content, setContent] = useState(consultation.content);
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [formError, setFormError] = useState<string>();

  const mutation = useMutation({
    mutationFn: () =>
      updateConsultation(
        consultation.consultationId,
        {
          occurredAt: toIso(date, time),
          content: content.trim(),
          consultationType: type,
          correctionReason: reason.trim(),
        },
        consultation.version,
      ),
    onSuccess: async () => {
      onCorrected("상담 내용을 정정했습니다. 이전 값은 정정 이력에 남습니다.");
      await queryClient.invalidateQueries({ queryKey: customerKeys.all });
    },
    onError: async (caught) => {
      if (isApiCode(caught, "VERSION_CONFLICT")) {
        await queryClient.invalidateQueries({ queryKey: customerKeys.all });
      }
      setFormError(describeCustomerError(caught, "상담을 정정하지 못했습니다."));
    },
  });

  return (
    <Modal
      isOpen
      title="상담 정정"
      onClose={onClose}
      footer={
        <>
          <Button variant="cancel" onClick={onClose} disabled={mutation.isPending}>
            취소
          </Button>
          <Button
            isLoading={mutation.isPending}
            onClick={() => {
              setFormError(undefined);
              const next = validateForm({ date, time, content, reason });
              setErrors(next);
              if (Object.keys(next).length === 0) mutation.mutate();
            }}
          >
            정정 저장
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <SelectField
          label="상담 구분"
          value={type}
          options={CONSULTATION_TYPES.map((value) => ({
            value,
            label: CONSULTATION_TYPE_LABEL[value],
          }))}
          onValueChange={(value) =>
            setType(value === "FIRST_INQUIRY" ? "FIRST_INQUIRY" : "FOLLOWUP")
          }
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <DateTimeField
            label="상담 날짜"
            kind="date"
            value={date}
            onValueChange={setDate}
            error={errors.date}
          />
          <DateTimeField
            label="상담 시각"
            kind="time"
            value={time}
            onValueChange={setTime}
            error={errors.time}
          />
        </div>
        <ContentField value={content} onValueChange={setContent} error={errors.content} />
        <TextField
          label="정정 사유"
          required
          value={reason}
          maxLength={REASON_MAX}
          onValueChange={(value) => {
            setReason(value);
            setErrors((existing) => ({ ...existing, reason: undefined }));
          }}
          error={errors.reason}
        />
        {formError ? <FormAlert>{formError}</FormAlert> : null}
      </div>
    </Modal>
  );
}

function RevisionDialog({
  consultationId,
  onClose,
}: {
  consultationId: number;
  onClose: () => void;
}) {
  const query = useConsultationRevisions(consultationId);
  return (
    <Modal
      isOpen
      title="정정 이력"
      onClose={onClose}
      footer={
        <Button variant="cancel" onClick={onClose}>
          닫기
        </Button>
      }
    >
      <QueryGate query={query} loadingLabel="정정 이력을 불러오는 중입니다.">
        {(data) =>
          data.items.length === 0 ? (
            <p>정정 이력이 없습니다.</p>
          ) : (
            <ul className="flex flex-col gap-4">
              {data.items.map((item) => (
                <li
                  key={`${item.correctedAt}-${item.correctionReason}`}
                  className="flex flex-col gap-1 rounded-card-flat border border-line p-3"
                >
                  <p className="text-caption text-ink-2">
                    {formatSeoulDateTime(item.correctedAt)} · {item.correctedBy}
                  </p>
                  <p>사유: {item.correctionReason}</p>
                  <p>
                    이전 구분: {labelOf(CONSULTATION_TYPE_LABEL, item.previousConsultationType)} ·
                    이전 시각: {formatSeoulDateTime(item.previousOccurredAt)}
                  </p>
                  <p>이전 내용: {item.previousContent}</p>
                </li>
              ))}
            </ul>
          )
        }
      </QueryGate>
    </Modal>
  );
}

export function ConsultationPanel({
  customerId,
  canEdit,
}: {
  customerId: number;
  canEdit: boolean;
}) {
  const query = useConsultations(customerId);
  const [notice, setNotice] = useState<string>();
  const [correcting, setCorrecting] = useState<Consultation | null>(null);
  const [revisionsOf, setRevisionsOf] = useState<number | null>(null);
  return (
    <div className="flex flex-col gap-5">
      {notice ? <FormNotice>{notice}</FormNotice> : null}
      <QueryGate query={query} loadingLabel="상담 이력을 불러오는 중입니다.">
        {(data) =>
          data.items.length === 0 ? (
            <p className="text-caption text-ink-2">등록된 상담 이력이 없습니다.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {[...data.items]
                .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
                .map((item) => (
                  <li
                    key={`${item.consultationId}-${item.version}`}
                    className="flex flex-col gap-2 rounded-card-flat border border-line p-4"
                  >
                    <div className="flex flex-wrap items-center gap-3">
                      <Badge
                        tone={item.consultationType === "FIRST_INQUIRY" ? "blue" : "gray"}
                        className="h-8 min-w-[72px] px-3 text-caption"
                      >
                        {labelOf(CONSULTATION_TYPE_LABEL, item.consultationType)}
                      </Badge>
                      <span className="text-caption text-ink-2">
                        {formatSeoulDateTime(item.occurredAt)} · 작성 {item.authorName}
                      </span>
                      {item.revisionCount > 0 ? (
                        <button
                          type="button"
                          onClick={() => setRevisionsOf(item.consultationId)}
                          className="text-caption font-semibold text-primary hover:underline"
                        >
                          정정됨 {item.revisionCount}회
                        </button>
                      ) : null}
                    </div>
                    <p className="whitespace-pre-wrap text-body text-ink">{item.content}</p>
                    {canEdit ? (
                      <div>
                        <Button variant="ghost" size="sm" onClick={() => setCorrecting(item)}>
                          정정
                        </Button>
                      </div>
                    ) : null}
                  </li>
                ))}
            </ul>
          )
        }
      </QueryGate>
      {canEdit ? <CreateForm customerId={customerId} onCreated={setNotice} /> : null}
      {correcting ? (
        <CorrectionDialog
          consultation={correcting}
          onClose={() => setCorrecting(null)}
          onCorrected={(message) => {
            setCorrecting(null);
            setNotice(message);
          }}
        />
      ) : null}
      {revisionsOf !== null ? (
        <RevisionDialog consultationId={revisionsOf} onClose={() => setRevisionsOf(null)} />
      ) : null}
    </div>
  );
}
