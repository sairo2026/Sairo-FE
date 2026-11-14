import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  OpsSupportInquiryAnswerResponseSchema,
  OpsSupportInquiryAssignResponseSchema,
  OpsSupportInquiryAttachmentResponseSchema,
  OpsSupportInquiryDetailResponseSchema,
  OpsSupportInquiryListResponseSchema,
  OpsSupportInquiryNoteResponseSchema,
  OpsSupportInquiryPriorityResponseSchema,
} from "@/lib/api/contracts/ops.schema";
import { ApiError, apiFetch } from "@/shared/api/client";
import { getStepUpHandler } from "@/shared/api/auth-events";
import { ifMatch, opsKeys, opsPath } from "../api/ops-api";
import type { OpsListParams } from "../api/ops-api";

const SCOPE = "inquiries";
const BASE = "/api/ops/support-inquiries";

export function useInquiryList(params: OpsListParams) {
  return useQuery({
    queryKey: opsKeys.scope(SCOPE, "list", params),
    queryFn: () => apiFetch(opsPath(BASE, params), { schema: OpsSupportInquiryListResponseSchema }),
  });
}

export function useInquiryDetail(inquiryId: number) {
  return useQuery({
    queryKey: opsKeys.scope(SCOPE, "detail", inquiryId),
    queryFn: () =>
      apiFetch(`${BASE}/${inquiryId}`, { schema: OpsSupportInquiryDetailResponseSchema }),
  });
}

export type ReplyInput = { content: string; needsCustomerReply: boolean; closeAfterReply: boolean };

export function useInquiryActions(inquiryId: number) {
  const client = useQueryClient();
  const refresh = () => client.invalidateQueries({ queryKey: opsKeys.scope(SCOPE) });
  return {
    answer: useMutation({
      mutationFn: (body: ReplyInput) =>
        apiFetch(`${BASE}/${inquiryId}/answer`, {
          method: "POST",
          body,
          schema: OpsSupportInquiryAnswerResponseSchema,
        }),
      onSuccess: refresh,
    }),
    note: useMutation({
      mutationFn: (content: string) =>
        apiFetch(`${BASE}/${inquiryId}/notes`, {
          method: "POST",
          body: { content },
          schema: OpsSupportInquiryNoteResponseSchema,
        }),
      onSuccess: refresh,
    }),
    assign: useMutation({
      mutationFn: (assigneeOperatorId: number) =>
        apiFetch(`${BASE}/${inquiryId}/assign`, {
          method: "POST",
          body: { assigneeOperatorId },
          schema: OpsSupportInquiryAssignResponseSchema,
        }),
      onSuccess: refresh,
    }),
    priority: useMutation({
      mutationFn: (input: { priority: "LOW" | "NORMAL" | "HIGH"; version: number }) =>
        apiFetch(`${BASE}/${inquiryId}/priority`, {
          method: "PATCH",
          body: { priority: input.priority },
          headers: ifMatch(input.version),
          schema: OpsSupportInquiryPriorityResponseSchema,
        }),
      onSuccess: refresh,
    }),
    upload: useMutation({
      mutationFn: (file: File) => {
        const form = new FormData();
        form.append("file", file);
        return apiFetch(`${BASE}/${inquiryId}/attachments`, {
          method: "POST",
          body: form,
          schema: OpsSupportInquiryAttachmentResponseSchema,
        });
      },
      onSuccess: refresh,
    }),
    download: useMutation({
      mutationFn: (attachmentId: number) => fetchAttachment(inquiryId, attachmentId),
    }),
  };
}

async function requestAttachment(inquiryId: number, attachmentId: number): Promise<Response> {
  return fetch(`${BASE}/${inquiryId}/attachments/${attachmentId}`, { credentials: "include" });
}

async function toApiError(response: Response): Promise<ApiError> {
  const body: unknown = await response.json().catch(() => null);
  const record = typeof body === "object" && body !== null ? body : {};
  const code = "code" in record && typeof record.code === "string" ? record.code : "UNKNOWN";
  const message =
    "message" in record && typeof record.message === "string"
      ? record.message
      : "요청을 처리하지 못했습니다.";
  return new ApiError(response.status, { code, message });
}

/** 첨부 본문은 JSON이 아니어서 공통 클라이언트를 쓰지 않는다. 재인증 요구는 한 번 다시 시도한다. */
export async function fetchAttachment(inquiryId: number, attachmentId: number): Promise<Blob> {
  let response = await requestAttachment(inquiryId, attachmentId);
  if (response.status === 401) {
    const error = await toApiError(response.clone());
    const handler = getStepUpHandler();
    if (error.isStepUpRequired && handler && (await handler())) {
      response = await requestAttachment(inquiryId, attachmentId);
    } else {
      throw error;
    }
  }
  if (!response.ok) throw await toApiError(response);
  return response.blob();
}

export function saveBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
