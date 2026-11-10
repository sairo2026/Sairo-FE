"use client";

import Link from "next/link";
import { useState } from "react";
import { ApiError } from "@/shared/api/client";
import { fieldErrorMap } from "@/shared/lib/api-messages";
import { QueryGate } from "@/shared/components/feedback/query-gate";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { RadioGroup, SelectField } from "@/shared/components/ui/select-field";
import { TextAreaField } from "@/shared/components/ui/textarea-field";
import { TextField } from "@/shared/components/ui/text-field";
import { formatSeoulDateTime } from "@/shared/lib/format";
import { OpsDetailList } from "../components/common/ops-detail-list";
import { OpsScreen } from "../components/common/ops-screen";
import { OpsStatusBadge } from "../components/common/ops-status-badge";
import { describeOpsError } from "../model/ops-errors";
import { useOpsSession } from "../model/ops-session";
import { saveBlob, useInquiryActions, useInquiryDetail } from "./inquiry-api";
import {
  ATTACHMENT_LIMIT,
  CATEGORY_LABELS,
  INQUIRY_STATUS,
  PRIORITY_STATUS,
  SCAN_LABELS,
  attachmentsOfMessage,
  formatBytes,
  validateAttachmentFile,
} from "./inquiry-model";
import type { InquiryAttachment, InquiryDetail, InquiryMessage } from "./inquiry-model";

type Notice = { tone: "ok" | "error"; text: string };

function NoticeLine({ notice }: { notice: Notice | null }) {
  if (!notice) return null;
  return (
    <p
      role={notice.tone === "error" ? "alert" : "status"}
      className={notice.tone === "error" ? "text-caption text-danger" : "text-caption text-ink"}
    >
      {notice.text}
    </p>
  );
}

function AttachmentList({
  attachments,
  onDownload,
  pendingId,
}: {
  attachments: InquiryAttachment[];
  onDownload: (attachment: InquiryAttachment) => void;
  pendingId: number | null;
}) {
  if (attachments.length === 0) return null;
  return (
    <ul className="mt-2 flex flex-col gap-2" aria-label="첨부 목록">
      {attachments.map((attachment) => (
        <li
          key={attachment.attachmentId}
          className="flex flex-wrap items-center justify-between gap-3 text-caption text-ink"
        >
          <span>
            {attachment.fileName} · {formatBytes(attachment.sizeBytes)} ·{" "}
            {SCAN_LABELS[attachment.scanStatus]} ·{" "}
            <strong>
              {attachment.visibility === "INTERNAL"
                ? "내부 첨부, 고객에게 보이지 않음"
                : "공개 첨부, 고객에게 공개"}
            </strong>
          </span>
          <Button
            size="sm"
            variant="ghost"
            disabled={attachment.scanStatus !== "CLEAN"}
            isLoading={pendingId === attachment.attachmentId}
            aria-label={`${attachment.fileName} 내려받기`}
            onClick={() => onDownload(attachment)}
          >
            내려받기
          </Button>
        </li>
      ))}
    </ul>
  );
}

function MessageCard({
  message,
  isLatestPublicAnswer,
  attachments,
  onDownload,
  pendingId,
}: {
  message: InquiryMessage;
  isLatestPublicAnswer: boolean;
  attachments: InquiryAttachment[];
  onDownload: (attachment: InquiryAttachment) => void;
  pendingId: number | null;
}) {
  const isInternal = message.visibility === "INTERNAL";
  const isRequester = message.authorType === "REQUESTER";
  const name = isInternal ? "내부 메모" : isRequester ? "고객 메시지" : "공개 답변";
  return (
    <li>
      <article
        aria-label={name}
        data-visibility={message.visibility}
        className={
          isInternal
            ? "rounded-card-flat border border-dashed border-tag-amber-ink bg-tag-amber px-5 py-4 text-tag-amber-ink"
            : "rounded-card-flat border border-primary-line bg-white px-5 py-4 text-ink"
        }
      >
        <header className="mb-2 flex flex-wrap items-center gap-2 text-caption">
          {isInternal ? (
            <Badge tone="amber">내부 메모, 고객에게 보이지 않음</Badge>
          ) : isRequester ? (
            <Badge tone="gray">고객 작성</Badge>
          ) : (
            <Badge tone="blue">고객에게 공개</Badge>
          )}
          {!isInternal && !isRequester && !isLatestPublicAnswer ? (
            <Badge tone="gray">이전 공개 답변</Badge>
          ) : null}
          <span>
            {message.authorDisplayName} · {formatSeoulDateTime(message.createdAt)}
          </span>
        </header>
        <p className="whitespace-pre-wrap text-body">{message.content}</p>
        <AttachmentList attachments={attachments} onDownload={onDownload} pendingId={pendingId} />
      </article>
    </li>
  );
}

function ReplyForm({
  isClosed,
  onSubmit,
}: {
  isClosed: boolean;
  onSubmit: (input: {
    content: string;
    needsCustomerReply: boolean;
    closeAfterReply: boolean;
  }) => Promise<void>;
}) {
  const [content, setContent] = useState("");
  const [after, setAfter] = useState("ANSWERED");
  const [isPending, setIsPending] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const canSubmit = !isClosed && content.trim() !== "" && !isPending;

  async function submit() {
    setIsPending(true);
    setNotice(null);
    try {
      await onSubmit({
        content: content.trim(),
        needsCustomerReply: after === "WAITING",
        closeAfterReply: after === "CLOSE",
      });
      setContent("");
      setAfter("ANSWERED");
      setNotice({ tone: "ok", text: "공개 답변을 등록했습니다. 고객에게 보입니다." });
    } catch (error) {
      setNotice({
        tone: "error",
        text: describeOpsError(error, "공개 답변을 등록하지 못했습니다."),
      });
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form
      aria-label="공개 답변 작성"
      className="flex flex-col gap-3 rounded-card-flat border border-primary-line bg-white p-5"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <h3 className="text-h2 font-semibold text-ink">공개 답변 작성</h3>
      <p className="text-caption text-ink-2">
        여기에 쓴 내용은 고객에게 공개되고 알림으로 전달됩니다. 이전 공개 답변은 수정하거나 삭제하지
        않고 이력으로 남습니다.
      </p>
      <TextAreaField
        label="공개 답변 내용"
        value={content}
        onValueChange={setContent}
        disabled={isClosed}
        rows={4}
      />
      <RadioGroup
        legend="답변 뒤 처리"
        name="reply-after"
        value={after}
        onValueChange={setAfter}
        options={[
          { value: "ANSWERED", label: "답변 완료로 둡니다" },
          { value: "WAITING", label: "고객 답변을 기다립니다" },
          { value: "CLOSE", label: "답변 뒤 문의를 종료합니다" },
        ]}
      />
      {isClosed ? (
        <p className="text-caption text-ink-2">종료된 문의에는 답변할 수 없습니다.</p>
      ) : null}
      <NoticeLine notice={notice} />
      <div>
        <Button type="submit" disabled={!canSubmit} isLoading={isPending}>
          공개 답변 등록(고객에게 공개)
        </Button>
      </div>
    </form>
  );
}

function NoteForm({
  isClosed,
  onSubmit,
}: {
  isClosed: boolean;
  onSubmit: (content: string) => Promise<void>;
}) {
  const [content, setContent] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const canSubmit = !isClosed && content.trim() !== "" && !isPending;

  async function submit() {
    setIsPending(true);
    setNotice(null);
    try {
      await onSubmit(content.trim());
      setContent("");
      setNotice({ tone: "ok", text: "내부 메모를 저장했습니다. 고객에게 보이지 않습니다." });
    } catch (error) {
      setNotice({
        tone: "error",
        text: describeOpsError(error, "내부 메모를 저장하지 못했습니다."),
      });
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form
      aria-label="내부 메모 작성"
      className="flex flex-col gap-3 rounded-card-flat border border-dashed border-tag-amber-ink bg-tag-amber p-5 text-tag-amber-ink"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <h3 className="text-h2 font-semibold">내부 메모 작성</h3>
      <p className="text-caption">
        내부 메모는 운영자에게만 보이며 고객 화면과 알림에 포함되지 않습니다.
      </p>
      <TextAreaField
        label="내부 메모 내용"
        value={content}
        onValueChange={setContent}
        disabled={isClosed}
        rows={3}
      />
      {isClosed ? (
        <p className="text-caption">종료된 문의에는 내부 메모를 추가할 수 없습니다.</p>
      ) : null}
      <NoticeLine notice={notice} />
      <div>
        <Button type="submit" variant="outlined" disabled={!canSubmit} isLoading={isPending}>
          내부 메모 저장(고객에게 보이지 않음)
        </Button>
      </div>
    </form>
  );
}

function AttachmentUpload({
  detail,
  onUpload,
}: {
  detail: InquiryDetail;
  onUpload: (file: File) => Promise<void>;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [inputKey, setInputKey] = useState(0);

  function select(next: File | null) {
    setNotice(null);
    if (next === null) {
      setFile(null);
      setFileError(null);
      return;
    }
    const problem = validateAttachmentFile(next);
    setFileError(problem);
    setFile(problem === null ? next : null);
  }

  async function submit() {
    if (file === null) {
      setFileError("올릴 파일을 선택해 주세요.");
      return;
    }
    setIsPending(true);
    setNotice(null);
    try {
      await onUpload(file);
      setFile(null);
      setInputKey((key) => key + 1);
      setNotice({ tone: "ok", text: "첨부를 올렸습니다. 검사가 끝나면 내려받을 수 있습니다." });
    } catch (error) {
      const fieldMessage = fieldErrorMap(error).file;
      if (fieldMessage) setFileError(fieldMessage);
      else setNotice({ tone: "error", text: describeOpsError(error, "첨부를 올리지 못했습니다.") });
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form
      aria-label="첨부 올리기"
      className="flex flex-col gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <label htmlFor="inquiry-attachment-file" className="text-caption font-semibold text-ink">
        첨부 파일 선택
      </label>
      <input
        key={inputKey}
        id="inquiry-attachment-file"
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
        aria-invalid={fileError ? true : undefined}
        onChange={(event) => select(event.target.files?.[0] ?? null)}
      />
      <p className="text-caption text-ink-2">
        운영자 첨부는 문의당 {ATTACHMENT_LIMIT}개까지, 파일당 20MB 이하의 PDF, JPG, PNG만 올릴 수
        있습니다. 현재 이 문의의 첨부는 {detail.attachments.length}개입니다.
      </p>
      {fileError ? (
        <p role="alert" className="text-caption text-danger">
          파일 항목 오류: {fileError}
        </p>
      ) : null}
      <NoticeLine notice={notice} />
      <div>
        <Button
          type="submit"
          variant="outlined"
          size="sm"
          disabled={isPending}
          isLoading={isPending}
        >
          첨부 올리기
        </Button>
      </div>
    </form>
  );
}

function ManageCard({ detail, refetch }: { detail: InquiryDetail; refetch: () => void }) {
  const session = useOpsSession();
  const actions = useInquiryActions(detail.inquiryId);
  const [assignee, setAssignee] = useState("");
  const [priority, setPriority] = useState<string>(detail.priority);
  const [notice, setNotice] = useState<Notice | null>(null);
  const isClosed = detail.status === "CLOSED";

  async function assign(id: number) {
    setNotice(null);
    try {
      await actions.assign.mutateAsync(id);
      setAssignee("");
      setNotice({ tone: "ok", text: "담당을 배정했습니다." });
    } catch (error) {
      setNotice({ tone: "error", text: describeOpsError(error, "담당을 배정하지 못했습니다.") });
    }
  }

  async function changePriority() {
    setNotice(null);
    try {
      await actions.priority.mutateAsync({
        priority: priority as "LOW" | "NORMAL" | "HIGH",
        version: detail.version,
      });
      setNotice({ tone: "ok", text: "우선순위를 바꿨습니다." });
    } catch (error) {
      setNotice({ tone: "error", text: describeOpsError(error, "우선순위를 바꾸지 못했습니다.") });
      if (error instanceof ApiError && error.code === "VERSION_CONFLICT") refetch();
    }
  }

  const assigneeId = Number(assignee);
  return (
    <Card title="담당과 우선순위">
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-end gap-3">
          <TextField
            label="담당 운영자 번호"
            kind="number"
            value={assignee}
            onValueChange={setAssignee}
          />
          <Button
            variant="outlined"
            disabled={!(assigneeId > 0) || actions.assign.isPending}
            onClick={() => void assign(assigneeId)}
          >
            담당 배정
          </Button>
          <Button
            variant="ghost"
            disabled={actions.assign.isPending}
            onClick={() => void assign(session.operatorId)}
          >
            나에게 배정
          </Button>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <SelectField
            label="우선순위"
            value={priority}
            disabled={isClosed}
            options={Object.entries(PRIORITY_STATUS).map(([value, entry]) => ({
              value,
              label: entry.label,
            }))}
            onValueChange={setPriority}
          />
          <Button
            variant="outlined"
            disabled={isClosed || priority === detail.priority || actions.priority.isPending}
            onClick={() => void changePriority()}
          >
            우선순위 변경
          </Button>
        </div>
        {isClosed ? (
          <p className="text-caption text-ink-2">종료된 문의의 우선순위는 바꿀 수 없습니다.</p>
        ) : (
          <p className="text-caption text-ink-2">
            첫 공개 답변 전에는 우선순위에 맞춰 첫 답변 목표 시각을 다시 계산합니다.
          </p>
        )}
        <NoticeLine notice={notice} />
      </div>
    </Card>
  );
}

function InquiryBody({ detail, refetch }: { detail: InquiryDetail; refetch: () => void }) {
  const actions = useInquiryActions(detail.inquiryId);
  const [downloadNotice, setDownloadNotice] = useState<Notice | null>(null);
  const [pendingId, setPendingId] = useState<number | null>(null);
  const isClosed = detail.status === "CLOSED";

  const publicAnswers = detail.messages.filter(
    (message) => message.visibility === "PUBLIC" && message.authorType === "OPERATOR",
  );
  const latestAnswerId = publicAnswers.at(-1)?.messageId;
  const linkedIds = new Set(detail.messages.map((message) => message.messageId));
  const unlinked = detail.attachments.filter(
    (attachment) => attachment.messageId === null || !linkedIds.has(attachment.messageId),
  );

  async function download(attachment: InquiryAttachment) {
    setPendingId(attachment.attachmentId);
    setDownloadNotice(null);
    try {
      const blob = await actions.download.mutateAsync(attachment.attachmentId);
      saveBlob(blob, attachment.fileName);
    } catch (error) {
      setDownloadNotice({
        tone: "error",
        text: describeOpsError(error, "첨부를 내려받지 못했습니다."),
      });
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Card title="문의 정보">
        <OpsDetailList
          items={[
            { label: "문의 유형", value: CATEGORY_LABELS[detail.category] },
            { label: "사무소", value: detail.officeName ?? "사무소 없음" },
            { label: "작성자", value: detail.authorDisplayName },
            {
              label: "상태",
              value: <OpsStatusBadge status={detail.status} map={INQUIRY_STATUS} />,
            },
            {
              label: "우선순위",
              value: <OpsStatusBadge status={detail.priority} map={PRIORITY_STATUS} />,
            },
            { label: "담당", value: detail.assignedOperatorName ?? "미배정" },
            { label: "접수 시각", value: formatSeoulDateTime(detail.createdAt) },
            { label: "첫 답변 목표", value: formatSeoulDateTime(detail.responseDueAt) },
            {
              label: "최근 공개 답변 시각",
              value: detail.answeredAt ? formatSeoulDateTime(detail.answeredAt) : null,
            },
            {
              label: "마감 시각",
              value: detail.closedAt ? formatSeoulDateTime(detail.closedAt) : null,
            },
          ]}
        />
      </Card>
      <Card title="문의 본문">
        <p className="whitespace-pre-wrap text-body text-ink">{detail.content}</p>
        {detail.requestScope ? (
          <p className="mt-3 text-caption text-ink-2">요청 범위: {detail.requestScope}</p>
        ) : null}
        <AttachmentList
          attachments={unlinked}
          onDownload={(attachment) => void download(attachment)}
          pendingId={pendingId}
        />
      </Card>
      <ManageCard detail={detail} refetch={refetch} />
      <Card title="답변과 내부 메모 이력">
        <p className="mb-3 text-caption text-ink-2">
          공개 답변 {publicAnswers.length}건은 고객에게 보입니다. 이전 공개 답변은 수정하거나
          삭제하지 않고 이력으로 보존합니다. 노란 점선 상자는 내부 메모이며 고객에게 보이지
          않습니다.
        </p>
        <NoticeLine notice={downloadNotice} />
        {detail.messages.length === 0 ? (
          <p className="text-body text-ink-2">아직 이력이 없습니다.</p>
        ) : (
          <ol className="flex flex-col gap-3">
            {detail.messages.map((message) => (
              <MessageCard
                key={message.messageId}
                message={message}
                isLatestPublicAnswer={message.messageId === latestAnswerId}
                attachments={attachmentsOfMessage(detail.attachments, message.messageId)}
                onDownload={(attachment) => void download(attachment)}
                pendingId={pendingId}
              />
            ))}
          </ol>
        )}
      </Card>
      <Card title="답변 작성">
        <div className="flex flex-col gap-6">
          <ReplyForm
            isClosed={isClosed}
            onSubmit={async (input) => {
              await actions.answer.mutateAsync(input);
            }}
          />
          <NoteForm
            isClosed={isClosed}
            onSubmit={async (content) => {
              await actions.note.mutateAsync(content);
            }}
          />
          <AttachmentUpload
            detail={detail}
            onUpload={async (file) => {
              await actions.upload.mutateAsync(file);
            }}
          />
        </div>
      </Card>
      <p className="text-caption text-ink-2">
        이 문의의 조회와 처리는 운영자 감사 로그에 남습니다.{" "}
        <Link href="/ops/inquiries" className="font-semibold text-primary underline">
          목록으로
        </Link>
      </p>
    </div>
  );
}

function InquiryDetailLoader({ inquiryId }: { inquiryId: number }) {
  const query = useInquiryDetail(inquiryId);
  return (
    <QueryGate query={query} loadingLabel="문의를 불러오는 중입니다">
      {(detail) => <InquiryBody detail={detail} refetch={() => void query.refetch()} />}
    </QueryGate>
  );
}

export function InquiryDetailScreen({ inquiryId }: { inquiryId: number }) {
  return (
    <OpsScreen
      title={`문의 ${inquiryId}`}
      description="문의 본문과 공개 답변, 내부 메모를 구분해 처리합니다."
      roles={["SUPPORT"]}
    >
      <InquiryDetailLoader inquiryId={inquiryId} />
    </OpsScreen>
  );
}
