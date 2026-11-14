"use client";

import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import type { GuestPrivacyIntakeResponse } from "@/lib/api/contracts/visit.schema";
import { ApiError } from "@/shared/api/client";
import { FormAlert, FormNotice } from "@/shared/components/feedback/form-frame";
import { Button } from "@/shared/components/ui/button";
import { Modal } from "@/shared/components/ui/modal";
import { RadioGroup } from "@/shared/components/ui/select-field";
import { TextAreaField } from "@/shared/components/ui/textarea-field";
import { TextField } from "@/shared/components/ui/text-field";
import { formatSeoulDate, formatSeoulDateTime } from "@/shared/lib/format";
import { countCodePoints } from "@/shared/lib/format";
import { submitGuestPrivacyIntake } from "../api/guest-privacy.api";
import type { GuestRightsTarget } from "../api/guest-privacy.api";
import {
  GUEST_RIGHTS_REQUEST_COPY as COPY,
  LINK_COMMON_COPY,
  linkRightsFooter,
} from "../model/legal-copy";
import type { LinkNoticeContext } from "../model/legal-copy";

const REQUEST_TYPES = [
  { value: "ACCESS", label: "열람" },
  { value: "CORRECTION", label: "정정" },
  { value: "DELETION", label: "삭제" },
  { value: "SUSPENSION", label: "처리정지" },
];
const ROLES = [
  { value: "SELF", label: "본인" },
  { value: "AGENT", label: "대리인" },
];
const CHANNELS = [
  { value: "EMAIL", label: "이메일" },
  { value: "PHONE", label: "전화번호" },
];

const NOTE_MAX = 1000;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SENSITIVE_PATTERN = /\d{6}[-\s]?\d{7}/;

const MESSAGE_BY_CODE: Record<string, string> = {
  GUEST_CONTACT_INVALID: COPY.errors.contact,
  SENSITIVE_DATA_DETECTED: COPY.errors.sensitiveNumber,
  NOTICE_VERSION_CHANGED: LINK_COMMON_COPY.noticeChanged,
  PUBLIC_LINK_NOT_FOUND: "이 링크는 사용할 수 없습니다. 아래 연락처로 요청해 주세요.",
};

function describeError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 429) return COPY.errors.rateLimited;
    return (
      MESSAGE_BY_CODE[error.code] ?? "요청을 접수하지 못했습니다. 잠시 뒤에 다시 시도해 주세요."
    );
  }
  return "요청을 접수하지 못했습니다. 잠시 뒤에 다시 시도해 주세요.";
}

export function isContactValid(channel: string, contact: string): boolean {
  const value = contact.trim();
  if (channel === "EMAIL") return EMAIL_PATTERN.test(value);
  const digits = value.replace(/\D/g, "");
  return /^[\d\-\s+]+$/.test(value) && digits.length >= 9 && digits.length <= 11;
}

function RequestForm({
  target,
  context,
  onClose,
}: {
  target: GuestRightsTarget;
  context: LinkNoticeContext;
  onClose: () => void;
}) {
  const [requestType, setRequestType] = useState("ACCESS");
  const [role, setRole] = useState("SELF");
  const [channel, setChannel] = useState("EMAIL");
  const [contact, setContact] = useState("");
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string>();
  const [done, setDone] = useState<GuestPrivacyIntakeResponse>();

  const mutation = useMutation({
    mutationFn: submitGuestPrivacyIntake,
    onSuccess: (result) => setDone(result),
    onError: (caught) => setError(describeError(caught)),
  });

  function submit() {
    const next: Record<string, string> = {};
    if (!isContactValid(channel, contact)) next.contact = COPY.errors.contact;
    if (countCodePoints(note) > NOTE_MAX)
      next.note = `요청 내용은 ${NOTE_MAX}자까지 입력할 수 있습니다.`;
    else if (SENSITIVE_PATTERN.test(note)) next.note = COPY.errors.sensitiveNumber;
    setErrors(next);
    setError(undefined);
    if (Object.keys(next).length > 0) return;
    mutation.mutate({
      target,
      input: {
        requestType,
        requesterRole: role,
        contactChannel: channel,
        contact: contact.trim(),
        requestNote: note.trim() === "" ? null : note.trim(),
      },
    });
  }

  if (done) {
    return (
      <div className="flex flex-col gap-4">
        <FormNotice>
          {COPY.received(formatSeoulDateTime(done.receivedAt), formatSeoulDate(done.resultDueAt))}
        </FormNotice>
        <p className="text-caption text-ink-2">
          결과는 {done.maskedContact}({done.contactChannel === "EMAIL" ? "이메일" : "전화번호"})로
          알려 드립니다.
        </p>
        <div>
          <Button onClick={onClose}>닫기</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-caption text-ink-2">{COPY.description(context)}</p>
      <RadioGroup
        legend="요청 종류"
        name="guest-request-type"
        value={requestType}
        options={REQUEST_TYPES}
        onValueChange={setRequestType}
      />
      <RadioGroup
        legend="요청자 구분"
        name="guest-request-role"
        value={role}
        options={ROLES}
        onValueChange={setRole}
      />
      {role === "AGENT" ? <p className="text-caption text-ink-2">{COPY.agentGuide}</p> : null}
      <RadioGroup
        legend="연락 방법"
        name="guest-request-channel"
        value={channel}
        options={CHANNELS}
        onValueChange={(value) => {
          setChannel(value);
          setErrors((current) => ({ ...current, contact: "" }));
        }}
      />
      <TextField
        label={channel === "EMAIL" ? "이메일" : "전화번호"}
        kind={channel === "EMAIL" ? "text" : "tel"}
        value={contact}
        onValueChange={(value) => {
          setContact(value);
          setErrors((current) => ({ ...current, contact: "" }));
        }}
        error={errors.contact || undefined}
        autoComplete="off"
        required
      />
      <TextAreaField
        label="요청 내용 (선택)"
        value={note}
        onValueChange={(value) => {
          setNote(value);
          setErrors((current) => ({ ...current, note: "" }));
        }}
        error={errors.note || undefined}
        hint={`${countCodePoints(note)} / ${NOTE_MAX}자`}
        rows={4}
      />
      <p className="text-caption text-ink-2">{COPY.inputGuide}</p>
      <p className="text-caption text-ink-2">{linkRightsFooter(context)}</p>
      {error ? <FormAlert>{error}</FormAlert> : null}
      <div className="flex gap-3">
        <Button isLoading={mutation.isPending} onClick={submit}>
          요청 접수
        </Button>
        <Button variant="cancel" onClick={onClose}>
          닫기
        </Button>
      </div>
    </div>
  );
}

export function GuestRightsRequestButton({
  target,
  context,
}: {
  target: GuestRightsTarget;
  context: LinkNoticeContext;
}) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="font-semibold text-primary underline hover:text-primary-hover active:text-primary-pressed"
      >
        {LINK_COMMON_COPY.rightsRequestLabel}
      </button>
      <Modal isOpen={isOpen} title={COPY.title} size="wide" onClose={() => setIsOpen(false)}>
        {isOpen ? (
          <RequestForm target={target} context={context} onClose={() => setIsOpen(false)} />
        ) : null}
      </Modal>
    </>
  );
}
