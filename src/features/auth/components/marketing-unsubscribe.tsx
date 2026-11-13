"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { MarketingUnsubscribeResponse } from "@/lib/api/contracts/auth.schema";
import { ApiError } from "@/shared/api/client";
import { Button } from "@/shared/components/ui/button";
import { formatSeoulDateTime } from "@/shared/lib/format";
import { unsubscribeMarketing } from "../api/account.api";
import { describeAuthError } from "@/shared/lib/api-messages";
import { AuthFrame, FormAlert } from "@/shared/components/feedback/form-frame";

function isInvalidLinkError(caught: unknown): boolean {
  if (!(caught instanceof ApiError)) return false;
  if (caught.status === 404) return true;
  return (
    caught.status === 400 &&
    (caught.fieldErrors?.some((item) => item.field === "token") ??
      caught.code === "INVALID_REQUEST")
  );
}

export function MarketingUnsubscribe({ token }: { token: string | null }) {
  const tokenRef = useRef(token);
  const [result, setResult] = useState<MarketingUnsubscribeResponse | null>(null);
  const [isInvalid, setIsInvalid] = useState(token === null);
  const [error, setError] = useState<string>();
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    if (token) window.history.replaceState(null, "", "/unsubscribe");
  }, [token]);

  async function submit() {
    if (!tokenRef.current) return;
    setIsBusy(true);
    setError(undefined);
    try {
      setResult(await unsubscribeMarketing(tokenRef.current));
    } catch (caught) {
      if (isInvalidLinkError(caught)) {
        setIsInvalid(true);
      } else {
        setError(describeAuthError(caught, "처리하지 못했습니다. 잠시 뒤에 다시 시도해 주세요."));
      }
    } finally {
      setIsBusy(false);
    }
  }

  if (isInvalid) {
    return (
      <AuthFrame title="수신 거부 링크를 확인해 주세요" width="sm">
        <FormAlert>
          수신 거부 링크가 올바르지 않습니다. 사이로 내 정보에서 직접 끌 수 있습니다.
        </FormAlert>
        <Link
          href="/login"
          className="mt-4 inline-block text-caption font-semibold text-primary hover:underline"
        >
          로그인으로 이동
        </Link>
      </AuthFrame>
    );
  }

  if (result) {
    const isAlready = result.status === "ALREADY_UNSUBSCRIBED";
    return (
      <AuthFrame
        title={isAlready ? "이미 수신 거부가 처리되어 있습니다" : "수신 거부를 처리했습니다"}
        width="sm"
      >
        <div className="flex flex-col gap-4">
          <p className="text-body text-ink-2">
            {isAlready
              ? `이미 수신 거부가 처리되어 있습니다. 처리 시각 ${formatSeoulDateTime(result.processedAt)}`
              : `수신 거부를 처리했습니다. 처리 시각 ${formatSeoulDateTime(result.processedAt)}.${
                  result.emailNoticeScheduled
                    ? " 14일 이내에 이메일로 처리 결과를 알려 드립니다."
                    : ""
                } 다시 받으려면 사이로 내 정보에서 켤 수 있습니다.`}
          </p>
          <Link href="/login" className="text-caption font-semibold text-primary hover:underline">
            로그인으로 이동
          </Link>
        </div>
      </AuthFrame>
    );
  }

  return (
    <AuthFrame
      title="공지·혜택 안내 수신 거부"
      description="공지·혜택 안내 이메일 수신을 거부할까요?"
      width="sm"
    >
      <div className="flex flex-col gap-4">
        {error ? <FormAlert>{error}</FormAlert> : null}
        <Button fullWidth isLoading={isBusy} onClick={() => void submit()}>
          수신 거부
        </Button>
      </div>
    </AuthFrame>
  );
}
