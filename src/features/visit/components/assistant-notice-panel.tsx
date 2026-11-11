"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { VisitCoordinationDetailResponse } from "@/lib/api/contracts/visit.schema";
import { FormAlert } from "@/shared/components/feedback/form-frame";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { DateTimeField } from "@/shared/components/ui/date-time-field";
import { SelectField } from "@/shared/components/ui/select-field";
import { TextField } from "@/shared/components/ui/text-field";
import { formatSeoulDateTime } from "@/shared/lib/format";
import type { OfficeRole } from "@/shared/session/office-access-context";
import { confirmAssistantNotice, createAssistantNotice } from "../api/follow.api";
import { followKeys, useAssistantNotices } from "../hooks/follow-queries";
import { NOTICE_METHOD_LABEL, NOTICE_RECIPIENT_LABEL, labelOf } from "../model/labels";
import { describeVisitError } from "../model/messages";
import { toKstIso } from "../model/time";

type Item = NonNullable<VisitCoordinationDetailResponse["scheduleItems"]>[number];

export type NoticeFormValues = {
  recipientType: string;
  recipientName: string;
  method: string;
  mode: "NOTIFIED" | "MISSING";
  date: string;
  time: string;
  exceptionReason: string;
  followupAction: string;
};

export const EMPTY_NOTICE_FORM: NoticeFormValues = {
  recipientType: "CUSTOMER",
  recipientName: "",
  method: "PHONE",
  mode: "NOTIFIED",
  date: "",
  time: "",
  exceptionReason: "",
  followupAction: "",
};

export function validateNotice(values: NoticeFormValues): Partial<Record<string, string>> {
  const errors: Partial<Record<string, string>> = {};
  if (values.recipientName.trim() === "") errors.recipientName = "고지 대상 이름을 입력해 주세요.";
  if (values.mode === "NOTIFIED" && (values.date === "" || values.time === "")) {
    errors.date = "실제 고지 날짜와 시각을 입력해 주세요.";
  }
  if (values.mode === "MISSING" && values.exceptionReason.trim() === "") {
    errors.exceptionReason = "고지하지 못한 사유를 입력해 주세요.";
  }
  return errors;
}

function ConfirmButton({ noticeId, itemId }: { noticeId: number; itemId: number }) {
  const queryClient = useQueryClient();
  const [extra, setExtra] = useState("");
  const mutation = useMutation({
    mutationFn: () => confirmAssistantNotice(noticeId, extra.trim() === "" ? null : extra.trim()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: followKeys.notices(itemId) }),
  });
  return (
    <div className="flex flex-col gap-2">
      <TextField label="추가 안내 (선택)" value={extra} onValueChange={setExtra} />
      <div>
        <Button size="sm" isLoading={mutation.isPending} onClick={() => mutation.mutate()}>
          고지 내용 확인
        </Button>
      </div>
      {mutation.isError ? (
        <FormAlert>{describeVisitError(mutation.error, "확인하지 못했습니다.")}</FormAlert>
      ) : null}
    </div>
  );
}

function NoticeForm({ itemId, onDone }: { itemId: number; onDone: () => void }) {
  const queryClient = useQueryClient();
  const [values, setValues] = useState(EMPTY_NOTICE_FORM);
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
  const mutation = useMutation({
    mutationFn: () =>
      createAssistantNotice(itemId, {
        recipientType: values.recipientType as "CUSTOMER" | "APPROVER" | "OTHER",
        recipientName: values.recipientName.trim(),
        noticeMethod: values.method as "KAKAO" | "SMS" | "PHONE" | "IN_PERSON" | "EMAIL",
        notifiedAt: values.mode === "NOTIFIED" ? toKstIso(values.date, values.time) : null,
        missingExceptionReason: values.mode === "MISSING" ? values.exceptionReason.trim() : null,
        followupAction: values.followupAction.trim() === "" ? null : values.followupAction.trim(),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: followKeys.notices(itemId) });
      setValues(EMPTY_NOTICE_FORM);
      onDone();
    },
  });

  function set<K extends keyof NoticeFormValues>(key: K, value: NoticeFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  }

  function submit() {
    const next = validateNotice(values);
    setErrors(next);
    if (Object.keys(next).length === 0) mutation.mutate();
  }

  return (
    <div className="flex flex-col gap-3 rounded-control border border-line p-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <SelectField
          label="고지 대상 유형"
          value={values.recipientType}
          options={Object.entries(NOTICE_RECIPIENT_LABEL).map(([value, label]) => ({
            value,
            label,
          }))}
          onValueChange={(value) => set("recipientType", value)}
        />
        <TextField
          label="고지 대상 이름"
          value={values.recipientName}
          onValueChange={(value) => set("recipientName", value)}
          error={errors.recipientName}
        />
        <SelectField
          label="고지 방법"
          value={values.method}
          options={Object.entries(NOTICE_METHOD_LABEL).map(([value, label]) => ({ value, label }))}
          onValueChange={(value) => set("method", value)}
        />
        <SelectField
          label="기록 종류"
          value={values.mode}
          options={[
            { value: "NOTIFIED", label: "실제 고지함" },
            { value: "MISSING", label: "고지하지 못함" },
          ]}
          onValueChange={(value) => set("mode", value as "NOTIFIED" | "MISSING")}
        />
      </div>
      {values.mode === "NOTIFIED" ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <DateTimeField
            label="실제 고지 날짜"
            kind="date"
            value={values.date}
            onValueChange={(value) => set("date", value)}
            error={errors.date}
          />
          <DateTimeField
            label="실제 고지 시각"
            kind="time"
            value={values.time}
            onValueChange={(value) => set("time", value)}
          />
        </div>
      ) : (
        <TextField
          label="고지하지 못한 사유"
          value={values.exceptionReason}
          onValueChange={(value) => set("exceptionReason", value)}
          error={errors.exceptionReason}
        />
      )}
      <p className="text-caption text-ink-2">
        실제 시각과 예외 사유 중 하나만 입력합니다. 방문 예정 시각 이후에 입력하면 사후 기록으로
        표시됩니다.
      </p>
      <TextField
        label="후속 조치 (선택)"
        value={values.followupAction}
        onValueChange={(value) => set("followupAction", value)}
      />
      {mutation.isError ? (
        <FormAlert>
          {describeVisitError(mutation.error, "고지 기록을 저장하지 못했습니다.")}
        </FormAlert>
      ) : null}
      <div>
        <Button size="sm" isLoading={mutation.isPending} onClick={submit}>
          고지 기록 저장
        </Button>
      </div>
    </div>
  );
}

export function AssistantNoticePanel({
  item,
  role,
  isReadOnly,
}: {
  item: Item;
  role: OfficeRole;
  isReadOnly: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const notices = useAssistantNotices(item.itemId, isOpen);
  const canConfirm = role === "OWNER" || role === "AGENT";
  return (
    <div className="flex flex-col gap-2">
      <div>
        <Button size="sm" variant="ghost" onClick={() => setIsOpen((current) => !current)}>
          {isOpen ? "보조원 고지 기록 닫기" : "보조원 고지 기록"}
        </Button>
      </div>
      {isOpen ? (
        notices.isPending ? (
          <p className="text-caption text-ink-2">고지 기록을 불러오는 중입니다.</p>
        ) : notices.isError ? (
          <FormAlert>
            {describeVisitError(notices.error, "고지 기록을 불러오지 못했습니다.")}
          </FormAlert>
        ) : (
          <div className="flex flex-col gap-3">
            {notices.data.requiredRecipients.some((entry) => !entry.recorded) ? (
              <FormAlert>
                필수 고지 대상 중 기록되지 않은 대상이 있습니다:{" "}
                {notices.data.requiredRecipients
                  .filter((entry) => !entry.recorded)
                  .map((entry) => labelOf(NOTICE_RECIPIENT_LABEL, entry.recipientType))
                  .join(", ")}
              </FormAlert>
            ) : null}
            {notices.data.items.length === 0 ? (
              <p className="text-caption text-ink-2">기록된 고지가 없습니다.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {notices.data.items.map((entry) => (
                  <li key={entry.noticeId} className="flex flex-col gap-1 text-caption text-ink">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">
                        {labelOf(NOTICE_RECIPIENT_LABEL, entry.recipientType)} {entry.recipientName}
                      </span>
                      <span>{labelOf(NOTICE_METHOD_LABEL, entry.noticeMethod)}</span>
                      {entry.notifiedAt ? (
                        <span>{formatSeoulDateTime(entry.notifiedAt)}</span>
                      ) : null}
                      {entry.recordedAfterTheFact ? <Badge tone="amber">사후 기록</Badge> : null}
                      {entry.confirmedAt ? (
                        <Badge tone="green">
                          감독 확인 {formatSeoulDateTime(entry.confirmedAt)}
                        </Badge>
                      ) : (
                        <Badge tone="gray">확인 전</Badge>
                      )}
                    </span>
                    {entry.missingExceptionReason ? (
                      <span className="text-ink-2">예외 사유 {entry.missingExceptionReason}</span>
                    ) : null}
                    {entry.followupAction ? (
                      <span className="text-ink-2">후속 조치 {entry.followupAction}</span>
                    ) : null}
                    {canConfirm && !entry.confirmedAt && !isReadOnly ? (
                      <ConfirmButton noticeId={entry.noticeId} itemId={item.itemId} />
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
            {!canConfirm ? (
              <p className="text-caption text-ink-2">
                감독 확인은 대표와 이 조율의 담당 소속공인중개사만 할 수 있습니다.
              </p>
            ) : null}
            {isAdding ? (
              <NoticeForm itemId={item.itemId} onDone={() => setIsAdding(false)} />
            ) : (
              <div>
                <Button
                  size="sm"
                  variant="outlined"
                  disabled={isReadOnly}
                  onClick={() => setIsAdding(true)}
                >
                  고지 기록 추가
                </Button>
              </div>
            )}
          </div>
        )
      ) : null}
    </div>
  );
}
