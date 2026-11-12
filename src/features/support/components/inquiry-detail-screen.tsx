"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { SupportInquiryResponse } from "@/lib/api/contracts/support.schema";
import { FormAlert, FormNotice } from "@/shared/components/feedback/form-frame";
import { DetailList, StatusBadge, TextLink } from "@/shared/components/feedback/page-parts";
import { QueryGate } from "@/shared/components/feedback/query-gate";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { PageHeader } from "@/shared/components/ui/page-header";
import { TextAreaField } from "@/shared/components/ui/textarea-field";
import { SupportInquiryNotice } from "@/shared/legal/data-rights-notices";
import { SUPPORT_INQUIRY_COPY } from "@/shared/legal/data-rights-copy";
import { countCodePoints, formatSeoulDateTime } from "@/shared/lib/format";
import {
  attachmentDownloadPath,
  replyToInquiry,
  uploadInquiryAttachment,
} from "../api/support.api";
import { supportKeys, useInquiry } from "../hooks/support-queries";
import {
  ATTACHMENT_EXTENSIONS,
  ATTACHMENT_MAX_BYTES,
  ATTACHMENT_MAX_COUNT,
  INQUIRY_CONTENT_MAX,
  INQUIRY_STATUS,
  SCAN_STATUS,
  categoryLabel,
} from "../model/labels";
import { SUPPORT_COPY as COPY, describeSupportError } from "../model/messages";
import { toCustomerView } from "../model/public-view";
import type { SupportInquiryDetail } from "../api/wire";

function validateAttachment(file: File, currentCount: number): string | undefined {
  const lower = file.name.toLowerCase();
  if (!ATTACHMENT_EXTENSIONS.some((extension) => lower.endsWith(extension))) {
    return COPY.attachmentType;
  }
  if (file.size > ATTACHMENT_MAX_BYTES) return COPY.attachmentTooLarge;
  if (currentCount >= ATTACHMENT_MAX_COUNT) return COPY.attachmentLimit;
  return undefined;
}

type Props = { detail: SupportInquiryDetail; justReceived: boolean };

function Messages({ detail }: { detail: SupportInquiryResponse }) {
  const view = toCustomerView(detail);
  if (view.messages.length === 0) return null;
  return (
    <ul aria-label={COPY.messagesTitle} className="flex flex-col gap-3">
      {view.messages.map((message) => {
        const isMine = message.authorType === "REQUESTER";
        return (
          <li
            key={message.messageId}
            className={
              isMine
                ? "rounded-control border border-line bg-white px-4 py-3"
                : "rounded-control bg-primary-soft px-4 py-3"
            }
          >
            <p className="text-caption font-semibold text-ink">
              {isMine ? COPY.requesterLabel : (message.authorDisplayName ?? COPY.operatorLabel)}
              <span className="ml-2 font-normal text-ink-2">
                {formatSeoulDateTime(message.createdAt)}
              </span>
            </p>
            <p className="mt-1 whitespace-pre-wrap text-body text-ink">{message.content}</p>
          </li>
        );
      })}
    </ul>
  );
}

function Attachments({ detail }: { detail: SupportInquiryResponse }) {
  const queryClient = useQueryClient();
  const view = toCustomerView(detail);
  const [error, setError] = useState<string>();
  const [message, setMessage] = useState<string>();

  const mutation = useMutation({
    mutationFn: uploadInquiryAttachment,
    onSuccess: async () => {
      setError(undefined);
      setMessage(COPY.attachmentDone);
      await queryClient.invalidateQueries({ queryKey: supportKeys.inquiry(detail.inquiryId) });
    },
    onError: (caught) => {
      setMessage(undefined);
      setError(describeSupportError(caught, "파일을 올리지 못했습니다."));
    },
  });

  function choose(file: File | undefined) {
    if (!file) return;
    const problem = validateAttachment(file, view.attachments.length);
    setMessage(undefined);
    if (problem) {
      setError(problem);
      return;
    }
    setError(undefined);
    mutation.mutate({ inquiryId: detail.inquiryId, file });
  }

  return (
    <Card title={COPY.attachmentsTitle}>
      <div className="flex flex-col gap-4">
        <p className="text-caption text-ink-2">{SUPPORT_INQUIRY_COPY.attachment}</p>
        {view.attachments.length === 0 ? (
          <p className="text-caption text-ink-2">{COPY.attachmentsEmpty}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {view.attachments.map((item) => (
              <li
                key={item.attachmentId}
                className="flex flex-wrap items-center gap-x-4 gap-y-1 text-caption text-ink"
              >
                <span className="font-semibold">{item.fileName}</span>
                <span className="text-ink-2">
                  {item.mediaType} · {Math.max(1, Math.round(item.sizeBytes / 1024))}KB
                </span>
                <span className="text-ink-2">
                  {SCAN_STATUS[item.scanStatus] ?? item.scanStatus}
                </span>
                {item.scanStatus === "CLEAN" ? (
                  <a
                    href={attachmentDownloadPath(detail.inquiryId, item.attachmentId)}
                    className="font-semibold text-primary hover:underline"
                  >
                    {COPY.download}
                  </a>
                ) : (
                  <span className="text-ink-2">
                    {item.scanStatus === "REJECTED" ? COPY.rejected : COPY.notReady}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
        <div className="flex flex-col gap-2">
          <label htmlFor="inquiry-attachment" className="text-caption font-semibold text-ink">
            {COPY.attachmentAdd} (PDF, JPG, PNG · 20MB · 최대 10개)
          </label>
          <input
            id="inquiry-attachment"
            type="file"
            accept={ATTACHMENT_EXTENSIONS.join(",")}
            disabled={mutation.isPending}
            onChange={(event) => {
              choose(event.target.files?.[0]);
              event.target.value = "";
            }}
            className="text-caption text-ink"
          />
        </div>
        {error ? <FormAlert>{error}</FormAlert> : null}
        {message ? (
          <p role="status" className="text-caption font-semibold text-primary">
            {message}
          </p>
        ) : null}
      </div>
    </Card>
  );
}

function ReplyForm({ detail }: { detail: SupportInquiryResponse }) {
  const queryClient = useQueryClient();
  const [content, setContent] = useState("");
  const [fieldError, setFieldError] = useState<string>();
  const [error, setError] = useState<string>();
  const [message, setMessage] = useState<string>();

  const mutation = useMutation({
    mutationFn: replyToInquiry,
    onSuccess: async () => {
      const wasClosed = detail.status === "CLOSED";
      setContent("");
      setError(undefined);
      setMessage(wasClosed ? COPY.replyReopened : COPY.replyDone);
      await queryClient.invalidateQueries({ queryKey: supportKeys.all });
    },
    onError: (caught) => {
      setMessage(undefined);
      setError(describeSupportError(caught, "답글을 등록하지 못했습니다."));
    },
  });

  function submit() {
    setMessage(undefined);
    setError(undefined);
    if (content.trim() === "") {
      setFieldError(COPY.replyRequired);
      return;
    }
    if (countCodePoints(content) > INQUIRY_CONTENT_MAX) {
      setFieldError(COPY.contentTooLong(INQUIRY_CONTENT_MAX));
      return;
    }
    setFieldError(undefined);
    mutation.mutate({ inquiryId: detail.inquiryId, content: content.trim() });
  }

  return (
    <div className="flex flex-col gap-3">
      <TextAreaField
        label={COPY.replyLabel}
        value={content}
        onValueChange={(value) => {
          setContent(value);
          setFieldError(undefined);
        }}
        error={fieldError}
        rows={4}
      />
      {error ? <FormAlert>{error}</FormAlert> : null}
      {message ? (
        <p role="status" className="text-caption font-semibold text-primary">
          {message}
        </p>
      ) : null}
      <div>
        <Button variant="outlined" isLoading={mutation.isPending} onClick={submit}>
          {COPY.replySubmit}
        </Button>
      </div>
    </div>
  );
}

function Body({ detail, justReceived }: Props) {
  const status = INQUIRY_STATUS[detail.status];
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10">
      <PageHeader
        title={`${categoryLabel(detail.category)} 문의`}
        actions={
          <>
            <StatusBadge tone={status?.tone ?? "gray"} label={status?.label ?? detail.status} />
            <TextLink href="/support">서비스 이용</TextLink>
          </>
        }
      />
      {justReceived ? <FormNotice>{SUPPORT_INQUIRY_COPY.received}</FormNotice> : null}
      <SupportInquiryNotice />
      <Card title={COPY.detailTitle}>
        <DetailList
          items={[
            { label: "접수", value: formatSeoulDateTime(detail.createdAt) },
            { label: COPY.firstReplyTarget, value: formatSeoulDateTime(detail.responseDueAt) },
            { label: COPY.assignedTo, value: detail.assignedOperatorName ?? COPY.unassigned },
            {
              label: "최근 답변",
              value: detail.answeredAt ? formatSeoulDateTime(detail.answeredAt) : "-",
            },
          ]}
        />
      </Card>
      {detail.content ? (
        <Card title={COPY.originalTitle}>
          <div className="flex flex-col gap-3">
            <p className="whitespace-pre-wrap text-body text-ink">{detail.content}</p>
            {detail.requestScope ? (
              <p className="whitespace-pre-wrap text-caption text-ink-2">
                {COPY.originalScope}: {detail.requestScope}
              </p>
            ) : null}
          </div>
        </Card>
      ) : null}
      <Card title={COPY.messagesTitle}>
        <div className="flex flex-col gap-5">
          <Messages detail={detail} />
          <ReplyForm detail={detail} />
        </div>
      </Card>
      <Attachments detail={detail} />
    </main>
  );
}

export function InquiryDetailScreen({
  inquiryId,
  justReceived = false,
}: {
  inquiryId: number;
  justReceived?: boolean;
}) {
  const query = useInquiry(inquiryId);
  return (
    <QueryGate query={query} loadingLabel="문의를 불러오는 중입니다.">
      {(detail) => <Body detail={detail} justReceived={justReceived} />}
    </QueryGate>
  );
}
