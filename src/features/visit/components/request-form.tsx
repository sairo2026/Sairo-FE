"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { Button } from "@/shared/components/ui/button";
import { Chip } from "@/shared/components/ui/chip";
import { DateTimeField } from "@/shared/components/ui/date-time-field";
import { TextField } from "@/shared/components/ui/text-field";
import { formatSeoulDateTime } from "@/shared/lib/format";
import { NOTE_MAX_LENGTH, validateRequestForm } from "../model/request-form";
import type {
  RequestBody,
  RequestFormErrors,
  RequestFormValues,
  RequestSlot,
} from "../model/request-form";
import { kstParts, minutesBetween } from "../model/time";

function initialValues(): RequestFormValues {
  return {
    slotIndex: null,
    date: "",
    startTime: "",
    endTime: "",
    duration: "",
    partySize: "",
    note: "",
  };
}

export function RequestForm({
  slots,
  submitLabel,
  isPending,
  disabledReason,
  feedback,
  onSubmit,
  onCancel,
}: {
  slots: readonly RequestSlot[];
  submitLabel: string;
  isPending: boolean;
  disabledReason?: string;
  feedback?: ReactNode;
  onSubmit: (body: RequestBody) => void;
  onCancel?: () => void;
}) {
  const [values, setValues] = useState<RequestFormValues>(initialValues);
  const [errors, setErrors] = useState<RequestFormErrors>({});

  function set<K extends keyof RequestFormValues>(key: K, value: RequestFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  }

  function pickSlot(index: number) {
    const slot = slots[index];
    if (!slot) return;
    const start = kstParts(slot.startsAt);
    const end = kstParts(slot.endsAt);
    setValues((current) => ({
      ...current,
      slotIndex: index,
      date: start.date,
      startTime: start.time,
      endTime: end.date === start.date ? end.time : "23:59",
      duration: String(minutesBetween(slot.startsAt, slot.endsAt)),
    }));
    setErrors({});
  }

  function submit() {
    const result = validateRequestForm(values, slots);
    setErrors(result.errors);
    if (result.body) onSubmit(result.body);
  }

  if (disabledReason) {
    return <p className="text-caption text-ink-2">{disabledReason}</p>;
  }
  if (slots.length === 0) {
    return <p className="text-caption text-ink-2">지금 신청할 수 있는 구간이 없습니다.</p>;
  }

  return (
    <form
      noValidate
      className="flex flex-col gap-4 rounded-card-flat border border-line p-4"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <fieldset className="flex flex-col gap-2">
        <legend className="text-caption font-semibold text-ink">신청 가능 구간</legend>
        <div className="flex flex-wrap gap-2">
          {slots.map((slot, index) => (
            <Chip
              key={slot.startsAt}
              isSelected={values.slotIndex === index}
              onClick={() => pickSlot(index)}
            >
              {formatSeoulDateTime(slot.startsAt)} ~ {formatSeoulDateTime(slot.endsAt)}
            </Chip>
          ))}
        </div>
        {errors.slotIndex ? (
          <p role="alert" className="text-caption text-danger">
            {errors.slotIndex}
          </p>
        ) : null}
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-3">
        <DateTimeField
          label="방문 날짜"
          kind="date"
          value={values.date}
          onValueChange={(value) => set("date", value)}
          error={errors.date}
        />
        <DateTimeField
          label="희망 시작"
          kind="time"
          value={values.startTime}
          onValueChange={(value) => set("startTime", value)}
          error={errors.startTime}
        />
        <DateTimeField
          label="희망 종료"
          kind="time"
          value={values.endTime}
          onValueChange={(value) => set("endTime", value)}
          error={errors.endTime}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="예상 소요시간 (분)"
          kind="number"
          value={values.duration}
          onValueChange={(value) => set("duration", value)}
          error={errors.duration}
        />
        <TextField
          label="방문 인원 (선택)"
          kind="number"
          value={values.partySize}
          onValueChange={(value) => set("partySize", value)}
          error={errors.partySize}
        />
      </div>
      <TextField
        label="요청사항 (선택)"
        value={values.note}
        maxLength={NOTE_MAX_LENGTH + 50}
        hint="고객의 이름과 연락처는 넣지 마세요."
        onValueChange={(value) => set("note", value)}
        error={errors.note}
      />
      {feedback}
      <div className="flex gap-2">
        <Button type="submit" size="sm" isLoading={isPending}>
          {submitLabel}
        </Button>
        {onCancel ? (
          <Button variant="cancel" size="sm" onClick={onCancel} disabled={isPending}>
            취소
          </Button>
        ) : null}
      </div>
    </form>
  );
}
