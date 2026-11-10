"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { TermsReconsentResponse } from "@/lib/api/contracts/auth.schema";
import { ApiError } from "@/shared/api/client";
import { toErrorScreenKind } from "@/shared/api/error-kind";
import { ErrorScreen } from "@/shared/components/feedback/error-screen";
import { PageSkeleton } from "@/shared/components/feedback/skeleton";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { formatSeoulDate } from "@/shared/lib/format";
import { findLegalDocumentByTermsCode } from "@/shared/legal/registry";
import { fetchTermsReconsent, recordTermsAgreement } from "../api/auth-context.api";
import { authContextQueryKey } from "../hooks/use-auth-context";
import { RECONSENT_COPY } from "../model/legal-copy";
import { AUTH_ROUTES } from "../model/routes";
import { MARKETING_TERMS_CODE } from "./terms-agreement-section";

const reconsentQueryKey = ["auth", "terms-reconsent"] as const;

async function agreeToAll(items: TermsReconsentResponse["items"]) {
  for (const item of items) {
    await recordTermsAgreement({
      termsCode: item.termsCode,
      version: item.version,
      agreed: true,
      consentPath: "RECONSENT",
    });
  }
}

/** 약관이 바뀌어 다시 동의해야 할 때 바뀐 항목을 안내하고 동의를 받는다. */
export function ReconsentNotice() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isDeclined, setIsDeclined] = useState(false);
  const query = useQuery({ queryKey: reconsentQueryKey, queryFn: fetchTermsReconsent });
  const agreeMutation = useMutation({
    mutationFn: agreeToAll,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: authContextQueryKey });
      router.replace("/");
    },
    onError: (error) => {
      if (error instanceof ApiError && error.code === "TERMS_VERSION_CHANGED") {
        void query.refetch();
      }
    },
  });

  const isUnauthenticated = query.error instanceof ApiError && query.error.status === 401;
  const isDone = query.data !== undefined && !query.data.reconsentRequired;
  const redirectTarget = isUnauthenticated ? AUTH_ROUTES.login : isDone ? "/" : null;

  useEffect(() => {
    if (redirectTarget !== null) router.replace(redirectTarget);
  }, [redirectTarget, router]);

  if (query.isPending || redirectTarget !== null) {
    return <PageSkeleton label="바뀐 약관을 확인하는 중입니다." />;
  }
  if (query.isError) {
    return (
      <ErrorScreen
        kind={toErrorScreenKind(query.error)}
        traceId={query.error instanceof ApiError ? query.error.traceId : undefined}
        onRetry={() => void query.refetch()}
      />
    );
  }

  const { items } = query.data;
  const hasVersionChanged =
    agreeMutation.error instanceof ApiError && agreeMutation.error.code === "TERMS_VERSION_CHANGED";
  const firstEffectiveAt = items[0]?.effectiveAt;
  const hasMarketing = items.some((item) => item.termsCode === MARKETING_TERMS_CODE);
  return (
    <main className="mx-auto w-full max-w-xl px-4 py-16">
      <Card>
        <h1 className="text-h1 font-bold text-ink">{RECONSENT_COPY.title}</h1>
        <p className="mt-3 text-body text-ink-2">
          {RECONSENT_COPY.body(firstEffectiveAt ? formatSeoulDate(firstEffectiveAt) : null)}
        </p>
        <ul className="mt-5 flex flex-col gap-4">
          {items.map((item) => (
            <li
              key={`${item.termsCode}-${item.version}`}
              className="rounded-control bg-surface p-4"
            >
              <p className="text-body font-semibold text-ink">
                {findLegalDocumentByTermsCode(item.termsCode)?.title ?? item.termsCode}{" "}
                <span className="text-primary">({item.required ? "필수" : "선택"})</span>
              </p>
              <p className="mt-1 text-caption text-ink-2">
                이전 버전 {item.previousVersion ?? "없음"}, 새 버전 {item.version}
              </p>
              <p className="text-caption text-ink-2">시행일 {formatSeoulDate(item.effectiveAt)}</p>
              {item.changeSummary ? (
                <p className="mt-1 text-caption text-ink-2">{item.changeSummary}</p>
              ) : null}
              <div className="mt-2 flex gap-4">
                <a
                  href={item.documentUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-caption font-semibold text-primary hover:underline"
                >
                  {RECONSENT_COPY.changedLink}
                </a>
                {item.previousDocumentUrl ? (
                  <a
                    href={item.previousDocumentUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-caption font-semibold text-ink-2 hover:underline"
                  >
                    {RECONSENT_COPY.previousLink}
                  </a>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
        {hasMarketing ? (
          <p className="mt-4 text-caption text-ink-2">{RECONSENT_COPY.marketingBanner}</p>
        ) : null}
        <p className="mt-4 text-caption text-ink-2">{RECONSENT_COPY.footer}</p>
        {hasVersionChanged ? (
          <p role="alert" className="mt-4 text-caption text-danger">
            그 사이 약관이 다시 바뀌었습니다. 바뀐 내용을 확인한 뒤 동의해 주세요.
          </p>
        ) : agreeMutation.isError ? (
          <p role="alert" className="mt-4 text-caption text-danger">
            동의를 저장하지 못했습니다. 잠시 뒤에 다시 시도해 주세요.
          </p>
        ) : isDeclined ? (
          <p role="alert" className="mt-4 text-caption text-danger">
            {RECONSENT_COPY.requiredError}
          </p>
        ) : null}
        <div className="mt-6 flex flex-wrap gap-2">
          <Button isLoading={agreeMutation.isPending} onClick={() => agreeMutation.mutate(items)}>
            동의하고 계속
          </Button>
          <Button variant="cancel" onClick={() => setIsDeclined(true)}>
            동의하지 않음
          </Button>
          <Link
            href={AUTH_ROUTES.withdrawal}
            className="inline-flex h-12 items-center rounded-control border border-line px-6 font-medium text-ink-2 hover:border-primary hover:text-primary"
          >
            회원 탈퇴
          </Link>
        </div>
      </Card>
    </main>
  );
}
