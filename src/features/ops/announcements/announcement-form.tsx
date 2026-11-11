"use client";

import { useState } from "react";
import type { OpsAnnouncementCreateRequest } from "@/lib/api/contracts/ops.schema";
import { Button } from "@/shared/components/ui/button";
import { Checkbox, SelectField } from "@/shared/components/ui/select-field";
import { TextAreaField } from "@/shared/components/ui/textarea-field";
import { TextField } from "@/shared/components/ui/text-field";
import { describeContentError } from "../content-common/content-error";
import { FailureNotice } from "../content-common/notice-banner";
import { SeoulDateTimeInput } from "../content-common/seoul-date-time-input";
import {
  AUDIENCE_OPTIONS,
  CONTENT_MAX,
  IMPORTANCE_OPTIONS,
  SUBSCRIPTION_STATUS_OPTIONS,
  TITLE_MAX,
  toAnnouncementRequest,
  validateAnnouncementForm,
} from "./announcement-model";
import type { AnnouncementErrors, AnnouncementForm } from "./announcement-model";

export function AnnouncementFormView({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial: AnnouncementForm;
  submitLabel: string;
  onSubmit: (body: OpsAnnouncementCreateRequest) => Promise<unknown>;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<AnnouncementForm>(initial);
  const [errors, setErrors] = useState<AnnouncementErrors>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  function patch(next: Partial<AnnouncementForm>) {
    setForm({ ...form, ...next });
  }

  async function submit() {
    setFailure(null);
    const found = validateAnnouncementForm(form);
    setErrors(found);
    const body = toAnnouncementRequest(form);
    if (Object.keys(found).length > 0 || body === null) return;
    setIsPending(true);
    try {
      await onSubmit(body);
    } catch (caught) {
      setFailure(describeContentError(caught, "공지를 저장하지 못했습니다."));
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <TextField
        label="제목"
        value={form.title}
        error={errors.title}
        onValueChange={(title) => patch({ title })}
        hint={`${form.title.trim().length}/${TITLE_MAX}자`}
      />
      <TextAreaField
        label="본문"
        value={form.content}
        error={errors.content}
        onValueChange={(content) => patch({ content })}
        hint={`${form.content.length}/${CONTENT_MAX}자`}
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SelectField
          label="대상"
          value={form.audienceType}
          options={AUDIENCE_OPTIONS}
          onValueChange={(audienceType) => patch({ audienceType })}
        />
        {form.audienceType === "SUBSCRIPTION_STATUS" ? (
          <SelectField
            label="대상 구독 상태"
            value={form.audienceStatus}
            placeholder="구독 상태를 선택해 주세요"
            options={SUBSCRIPTION_STATUS_OPTIONS}
            error={errors.audienceStatus}
            onValueChange={(audienceStatus) => patch({ audienceStatus })}
          />
        ) : null}
        {form.audienceType === "OFFICE" ? (
          <TextField
            label="대상 사무소 ID"
            kind="number"
            value={form.audienceOfficeId}
            error={errors.audienceOfficeId}
            onValueChange={(audienceOfficeId) => patch({ audienceOfficeId })}
          />
        ) : null}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SeoulDateTimeInput
          label="노출 시작"
          value={form.startsAt}
          error={errors.startsAt}
          onChange={(startsAt) => patch({ startsAt })}
        />
        <SeoulDateTimeInput
          label="노출 종료"
          value={form.endsAt}
          error={errors.endsAt}
          onChange={(endsAt) => patch({ endsAt })}
        />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SelectField
          label="중요도"
          value={form.importance}
          options={IMPORTANCE_OPTIONS}
          onValueChange={(importance) => patch({ importance })}
        />
        <TextField
          label="상세 링크(선택)"
          value={form.detailUrl}
          error={errors.detailUrl}
          onValueChange={(detailUrl) => patch({ detailUrl })}
        />
      </div>
      <Checkbox
        label="마케팅 공지입니다"
        checked={form.marketing}
        onCheckedChange={(marketing) => patch({ marketing })}
      />
      <p role="note" className="text-caption text-ink-2">
        {form.marketing
          ? "마케팅 공지는 마케팅 수신에 동의하지 않은 대상을 제외하고 보냅니다."
          : "필수 안내는 마케팅 미동의자에게 선택 마케팅 경로로 보내지 않습니다."}
      </p>
      <FailureNotice message={failure} />
      <div className="flex gap-2">
        <Button isLoading={isPending} onClick={() => void submit()}>
          {submitLabel}
        </Button>
        <Button variant="cancel" onClick={onCancel}>
          취소
        </Button>
      </div>
    </div>
  );
}
