"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { MarketingUnsubscribeResponse } from "@/lib/api/contracts/auth.schema";
import { ApiError } from "@/shared/api/client";
import { Button } from "@/shared/components/ui/button";
import { formatSeoulDate, formatSeoulDateTime } from "@/shared/lib/format";
import { unsubscribeMarketing } from "../api/account.api";
import { describeAuthError } from "@/shared/lib/api-messages";
import { AuthFrame, FormAlert, FormNotice } from "@/shared/components/feedback/form-frame";

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
      if (caught instanceof ApiError && (caught.status === 400 || caught.status === 404)) {
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
          링크가 올바르지 않거나 더 이상 사용할 수 없습니다. 메일의 수신 거부 링크를 다시 열어
          주세요.
        </FormAlert>
      </AuthFrame>
    );
  }

  if (result) {
    const isAlready = result.status === "ALREADY_UNSUBSCRIBED";
    return (
      <AuthFrame
        title={isAlready ? "이미 수신 거부한 상태입니다" : "수신 거부를 처리했습니다"}
        width="sm"
      >
        <div className="flex flex-col gap-4">
          <p className="text-body text-ink-2">
            {isAlready
              ? `${formatSeoulDate(result.expressedAt)}에 광고성 이메일 수신을 이미 철회했습니다.`
              : `${formatSeoulDateTime(result.processedAt)}에 처리했습니다. 이제 광고성 이메일을 보내지 않습니다.`}
          </p>
          {!isAlready ? (
            <FormNotice>
              처리 결과는 {formatSeoulDate(result.resultNoticeDueAt)}까지 이메일로 알려드립니다.
            </FormNotice>
          ) : null}
          <p className="text-caption text-ink-2">
            다시 받고 싶으면 로그인한 뒤 내 정보의 동의 내역에서 선택할 수 있습니다.
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
      title="광고성 이메일 수신 거부"
      description="아래 버튼을 누르면 사이로의 광고성 이메일을 더 이상 받지 않습니다. 서비스 이용에 꼭 필요한 안내 메일은 계속 보냅니다."
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
