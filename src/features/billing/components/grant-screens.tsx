"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ApiError } from "@/shared/api/client";
import { FormAlert, FormNotice } from "@/shared/components/feedback/form-frame";
import {
  DetailList,
  FlowFrame,
  MutedNote,
  TextLink,
} from "@/shared/components/feedback/page-parts";
import { PageSkeleton } from "@/shared/components/feedback/skeleton";
import { Button } from "@/shared/components/ui/button";
import { TextField } from "@/shared/components/ui/text-field";
import { formatSeoulDateTime } from "@/shared/lib/format";
import {
  KAKAO_GRANT_START_PATH,
  authenticateGrant,
  createReturnExport,
  fetchArchiveGrant,
  fetchReturnExport,
  fetchReturnGrant,
} from "../api/billing.api";
import type { ExportResult } from "../api/wire";
import { RETURN_COPY } from "../model/legal-copy";
import { describeBillingError } from "../model/messages";

export type GrantKind = "return" | "archive";

export const GRANT_PENDING_KEY = "sairo.billing.grant.pending";

type PendingGrant = { kind: GrantKind; grantId: number };

function savePending(pending: PendingGrant) {
  try {
    window.sessionStorage.setItem(GRANT_PENDING_KEY, JSON.stringify(pending));
  } catch {
    return;
  }
}

function readPendingRaw(): string | null {
  try {
    return window.sessionStorage.getItem(GRANT_PENDING_KEY);
  } catch {
    return null;
  }
}

function parsePending(raw: string | null): PendingGrant | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<PendingGrant>;
    if (
      (parsed.kind === "return" || parsed.kind === "archive") &&
      Number.isInteger(parsed.grantId)
    ) {
      return { kind: parsed.kind, grantId: Number(parsed.grantId) };
    }
  } catch {
    return null;
  }
  return null;
}

function subscribeNothing() {
  return () => undefined;
}

const SESSION_NOTE =
  "재인증 성공 뒤 10분 동안 아무 동작이 없거나 30분이 지나면 다시 인증해야 합니다. 이 전용 화면에서는 일반 업무 화면으로 이동할 수 없습니다.";

function destination(kind: GrantKind) {
  return kind === "return" ? "/return" : "/archive";
}

function describeGrantError(error: unknown): string {
  if (error instanceof ApiError && error.status === 403 && error.code === "FORBIDDEN") {
    return RETURN_COPY.errors.expired;
  }
  return describeBillingError(error, "본인 확인을 완료하지 못했습니다. 다시 시도해 주세요.");
}

function isGrantRefused(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    (error.code === "RETURN_GRANT_INVALID" || error.code === "ARCHIVE_GRANT_INVALID")
  );
}

function SupportLine() {
  return (
    <p className="mt-3 text-caption text-ink-2">
      권한 오류가 계속되면 <TextLink href="/support">고객지원</TextLink>으로 문의해 주세요.
    </p>
  );
}

export function GrantAuthScreen({ kind, grantId }: { kind: GrantKind; grantId: number | null }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [fieldError, setFieldError] = useState<string>();
  const [error, setError] = useState<string>();
  const [showSupport, setShowSupport] = useState(false);
  const title = kind === "return" ? "자료 반환 본인 확인" : "보관 문서 본인 확인";

  const mutation = useMutation({
    mutationFn: () =>
      authenticateGrant(kind, { grantId: grantId ?? 0, authMethod: "EMAIL", credential: password }),
    onSuccess: () => router.push(destination(kind)),
    onError: (caught) => {
      setError(describeGrantError(caught));
      setShowSupport(
        isGrantRefused(caught) || (caught instanceof ApiError && caught.status === 403),
      );
    },
  });

  if (grantId === null) {
    return (
      <FlowFrame title={title} width="md">
        <FormAlert>권한 안내에 담긴 링크로 다시 접속해 주세요.</FormAlert>
        <SupportLine />
      </FlowFrame>
    );
  }
  return (
    <FlowFrame
      title={title}
      description={kind === "return" ? RETURN_COPY.reauth : RETURN_COPY.archive}
      width="md"
    >
      <form
        noValidate
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (password === "") {
            setFieldError("비밀번호를 입력해 주세요.");
            return;
          }
          setFieldError(undefined);
          setError(undefined);
          mutation.mutate();
        }}
      >
        <TextField
          label="비밀번호"
          kind="password"
          value={password}
          onValueChange={(next) => {
            setPassword(next);
            setFieldError(undefined);
          }}
          error={fieldError}
          autoComplete="current-password"
        />
        {error ? <FormAlert>{error}</FormAlert> : null}
        {showSupport ? <SupportLine /> : null}
        <Button type="submit" isLoading={mutation.isPending}>
          이메일 비밀번호로 확인
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            savePending({ kind, grantId });
            window.location.assign(KAKAO_GRANT_START_PATH);
          }}
        >
          카카오로 확인
        </Button>
        <MutedNote>{SESSION_NOTE}</MutedNote>
        <MutedNote>
          카카오 인증은 일반 로그인이 아니라 세션을 만들지 않는 본인 확인입니다.
        </MutedNote>
      </form>
    </FlowFrame>
  );
}

export function GrantVerifyScreen({
  credential,
  errorCode,
}: {
  credential: string | null;
  errorCode?: string | null;
}) {
  const router = useRouter();
  const started = useRef(false);
  const raw = useSyncExternalStore(subscribeNothing, readPendingRaw, () => undefined);
  const pending = raw === undefined ? undefined : parsePending(raw);
  const mutation = useMutation({
    mutationFn: (target: PendingGrant) =>
      authenticateGrant(target.kind, {
        grantId: target.grantId,
        authMethod: "KAKAO",
        credential: credential ?? "",
      }),
    onSuccess: (_result, target) => router.push(destination(target.kind)),
  });

  useEffect(() => {
    if (!pending || !credential || started.current) return;
    started.current = true;
    mutation.mutate(pending);
  }, [pending, credential, mutation]);

  if (pending === undefined) return <PageSkeleton label="본인 확인을 준비하는 중입니다." />;
  if (!credential || !pending || errorCode) {
    return (
      <FlowFrame title="본인 확인" width="md">
        <FormAlert>
          본인 확인을 완료하지 못했습니다. 권한 안내에 담긴 링크로 다시 시도해 주세요.
        </FormAlert>
        <SupportLine />
      </FlowFrame>
    );
  }
  if (mutation.isError) {
    return (
      <FlowFrame title="본인 확인" width="md">
        <FormAlert>{describeGrantError(mutation.error)}</FormAlert>
        <SupportLine />
      </FlowFrame>
    );
  }
  return <PageSkeleton label="본인 확인 중입니다." />;
}

function ExportPanel({ grantId }: { grantId: number }) {
  const [exportId, setExportId] = useState<number | null>(null);
  const [error, setError] = useState<string>();
  const create = useMutation({
    mutationFn: () => createReturnExport(grantId),
    onSuccess: (result) => {
      setError(undefined);
      setExportId(result.exportId);
    },
    onError: (caught) => setError(describeGrantError(caught)),
  });
  const status = useQuery({
    queryKey: ["billing", "return-export", grantId, exportId],
    queryFn: () => fetchReturnExport(grantId, exportId ?? 0),
    enabled: exportId !== null,
    refetchInterval: (query) => {
      const state = query.state.data?.status;
      return state === "COMPLETED" || state === "FAILED" || query.state.error ? false : 3000;
    },
  });

  const result: ExportResult | undefined = status.data;
  return (
    <div className="flex flex-col gap-3">
      <Button
        isLoading={create.isPending}
        disabled={exportId !== null && result?.status !== "FAILED"}
        onClick={() => create.mutate()}
      >
        자료 내보내기
      </Button>
      {error ? <FormAlert>{error}</FormAlert> : null}
      {exportId !== null && !result && !status.isError ? (
        <MutedNote>내보내기를 준비하고 있습니다.</MutedNote>
      ) : null}
      {status.isError ? <FormAlert>{describeGrantError(status.error)}</FormAlert> : null}
      {result && result.status !== "COMPLETED" && result.status !== "FAILED" ? (
        <MutedNote>내보내기를 만들고 있습니다. 잠시만 기다려 주세요.</MutedNote>
      ) : null}
      {result?.status === "FAILED" ? (
        <FormAlert>내보내기에 실패했습니다. 다시 요청해 주세요.</FormAlert>
      ) : null}
      {result?.status === "COMPLETED" && result.downloadUrl ? (
        <div className="flex flex-col gap-1">
          <FormNotice>내보내기가 완료됐습니다. 다운로드 주소는 10분 동안 유효합니다.</FormNotice>
          <a href={result.downloadUrl} className="text-body font-semibold text-primary underline">
            내려받기
          </a>
        </div>
      ) : null}
    </div>
  );
}

export function ReturnGrantScreen() {
  const query = useQuery({
    queryKey: ["billing", "return-grant"],
    queryFn: fetchReturnGrant,
    retry: false,
  });
  const unauthorized =
    query.error instanceof ApiError && (query.error.status === 401 || query.error.status === 403);
  return (
    <FlowFrame title="자료 반환" description="구독이 끝난 뒤 자료를 내보냅니다." width="md">
      {query.isPending ? (
        <PageSkeleton label="반환권한을 확인하는 중입니다." />
      ) : unauthorized ? (
        <div className="flex flex-col gap-2">
          <FormAlert>
            본인 확인이 만료됐거나 권한이 없습니다. 권한 안내에 담긴 링크로 다시 인증해 주세요.
          </FormAlert>
          <SupportLine />
        </div>
      ) : query.isError ? (
        <div className="flex flex-col gap-3">
          <FormAlert>
            {describeBillingError(query.error, "반환권한을 불러오지 못했습니다.")}
          </FormAlert>
          <Button onClick={() => void query.refetch()}>다시 시도</Button>
        </div>
      ) : query.data.revoked ? (
        <div className="flex flex-col gap-2">
          <FormAlert>{RETURN_COPY.errors.revoked}</FormAlert>
          <SupportLine />
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          <DetailList
            items={[{ label: "권한 만료", value: formatSeoulDateTime(query.data.expiresAt) }]}
          />
          <ExportPanel grantId={query.data.grantId} />
          <MutedNote>{SESSION_NOTE}</MutedNote>
        </div>
      )}
    </FlowFrame>
  );
}

export function ArchiveGrantScreen() {
  const query = useQuery({
    queryKey: ["billing", "archive-grant"],
    queryFn: fetchArchiveGrant,
    retry: false,
  });
  const unauthorized =
    query.error instanceof ApiError && (query.error.status === 401 || query.error.status === 403);
  return (
    <FlowFrame
      title="보관 문서"
      description="별도 보관계약으로 보관 중인 문서의 권한 상태입니다."
      width="md"
    >
      {query.isPending ? (
        <PageSkeleton label="보관권한을 확인하는 중입니다." />
      ) : unauthorized ? (
        <div className="flex flex-col gap-2">
          <FormAlert>
            본인 확인이 만료됐거나 권한이 없습니다. 권한 안내에 담긴 링크로 다시 인증해 주세요.
          </FormAlert>
          <SupportLine />
        </div>
      ) : query.isError ? (
        <div className="flex flex-col gap-3">
          <FormAlert>
            {describeBillingError(query.error, "보관권한을 불러오지 못했습니다.")}
          </FormAlert>
          <Button onClick={() => void query.refetch()}>다시 시도</Button>
        </div>
      ) : query.data.revoked ? (
        <div className="flex flex-col gap-2">
          <FormAlert>종료된 보관권한입니다.</FormAlert>
          <SupportLine />
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <DetailList
            items={[
              {
                label: "권한 만료",
                value: query.data.expiresAt
                  ? formatSeoulDateTime(query.data.expiresAt)
                  : "계약 기간 동안",
              },
            ]}
          />
          <MutedNote>보관 문서 열람은 고객지원으로 요청해 주세요.</MutedNote>
          <MutedNote>{SESSION_NOTE}</MutedNote>
        </div>
      )}
    </FlowFrame>
  );
}
