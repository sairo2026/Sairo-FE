import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  RawAccessApproveResponseSchema,
  RawAccessCreateResponseSchema,
  RawAccessDetailResponseSchema,
  RawAccessExecuteResponseSchema,
  RawAccessListResponseSchema,
  RawAccessRejectResponseSchema,
  RawAccessRevokeResponseSchema,
} from "@/lib/api/contracts/ops.schema";
import type { RawAccessRequestCreateRequest } from "@/lib/api/contracts/ops.schema";
import { ApiError, apiFetch } from "@/shared/api/client";
import { getStepUpHandler } from "@/shared/api/auth-events";
import { opsKeys, opsPath } from "../api/ops-api";

const SCOPE = "raw-access";
const BASE = "/api/ops/raw-access-requests";

export function useRawAccessList(params: {
  scope: "MINE" | "APPROVABLE";
  status: string;
  page: number;
  size: number;
}) {
  return useQuery({
    queryKey: opsKeys.scope(SCOPE, "list", params),
    queryFn: () => apiFetch(opsPath(BASE, params), { schema: RawAccessListResponseSchema }),
  });
}

export function useRawAccessDetail(requestId: number) {
  return useQuery({
    queryKey: opsKeys.scope(SCOPE, "detail", requestId),
    queryFn: () => apiFetch(`${BASE}/${requestId}`, { schema: RawAccessDetailResponseSchema }),
  });
}

export function useCreateRawAccess() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: RawAccessRequestCreateRequest) =>
      apiFetch(BASE, { method: "POST", body, schema: RawAccessCreateResponseSchema }),
    onSuccess: () => client.invalidateQueries({ queryKey: opsKeys.scope(SCOPE) }),
  });
}

export function useRawAccessActions(requestId: number) {
  const client = useQueryClient();
  const refresh = () => client.invalidateQueries({ queryKey: opsKeys.scope(SCOPE) });
  return {
    approve: useMutation({
      mutationFn: () =>
        apiFetch(`${BASE}/${requestId}/approve`, {
          method: "POST",
          schema: RawAccessApproveResponseSchema,
        }),
      onSuccess: refresh,
    }),
    reject: useMutation({
      mutationFn: (reason: string) =>
        apiFetch(`${BASE}/${requestId}/reject`, {
          method: "POST",
          body: { reason },
          schema: RawAccessRejectResponseSchema,
        }),
      onSuccess: refresh,
    }),
    execute: useMutation({
      mutationFn: () =>
        apiFetch(`${BASE}/${requestId}/execute`, {
          method: "POST",
          schema: RawAccessExecuteResponseSchema,
        }),
      onSuccess: refresh,
    }),
    revoke: useMutation({
      mutationFn: (input: { grantId: number; reason: string }) =>
        apiFetch(`/api/ops/raw-access-grants/${input.grantId}/revoke`, {
          method: "POST",
          body: { reason: input.reason },
          schema: RawAccessRevokeResponseSchema,
        }),
      onSuccess: refresh,
    }),
    fetchFile: useMutation({
      mutationFn: (grantId: number) => fetchGrantFile(grantId),
      onSettled: refresh,
    }),
  };
}

async function requestFile(grantId: number): Promise<Response> {
  return fetch(`/api/ops/raw-access-grants/${grantId}/file`, { credentials: "include" });
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

/** 파일 본문은 JSON이 아니어서 공통 클라이언트를 쓰지 않는다. 재인증 요구는 같은 방식으로 한 번 다시 시도한다. */
export async function fetchGrantFile(
  grantId: number,
): Promise<{ blob: Blob; sha256: string | null }> {
  let response = await requestFile(grantId);
  if (response.status === 401) {
    const error = await toApiError(response.clone());
    const handler = getStepUpHandler();
    if (error.isStepUpRequired && handler && (await handler())) {
      response = await requestFile(grantId);
    } else {
      throw error;
    }
  }
  if (!response.ok) throw await toApiError(response);
  return { blob: await response.blob(), sha256: response.headers.get("X-Content-SHA256") };
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
