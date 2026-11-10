"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useOperatorMe } from "@/features/auth/hooks/use-auth-context";
import { AUTH_ROUTES } from "@/features/auth/model/routes";
import { OPS_AUTH_PATHS } from "../api/ops-auth-api";
import { OpsNotice, OpsPublicFrame, primaryLinkClass } from "./ops-public-frame";

const SESSION_NOTICE: Record<string, string> = {
  idle: "30분 동안 활동이 없어 로그아웃되었습니다. 다시 로그인해 주세요.",
  absolute: "로그인 후 8시간이 지나 로그아웃되었습니다. 다시 로그인해 주세요.",
  expired: "세션이 만료되었습니다. 다시 로그인해 주세요.",
};

export function OpsLoginScreen({ errorCode, reason }: { errorCode?: string; reason?: string }) {
  const router = useRouter();
  const me = useOperatorMe();

  useEffect(() => {
    if (me.isSuccess) router.replace(AUTH_ROUTES.opsHome);
  }, [me.isSuccess, router]);

  const sessionNotice = reason ? SESSION_NOTICE[reason] : undefined;

  return (
    <OpsPublicFrame
      title="운영자 로그인"
      description="운영자 계정은 카카오 인증 뒤 인증 앱의 확인 코드로 한 번 더 확인합니다."
    >
      {errorCode === "OPERATOR_NOT_ALLOWED" ? (
        <OpsNotice tone="error">
          이 카카오 계정으로는 운영 콘솔에 접근할 수 없습니다. 접근 권한이 필요하면 보안관리자에게
          문의해 주세요.
        </OpsNotice>
      ) : null}
      {sessionNotice ? <OpsNotice>{sessionNotice}</OpsNotice> : null}
      {me.isSuccess ? <OpsNotice>이미 로그인되어 있어 운영 홈으로 이동합니다.</OpsNotice> : null}
      <a href={OPS_AUTH_PATHS.kakaoStart} className={primaryLinkClass}>
        카카오로 시작
      </a>
      <ul className="list-disc pl-5 text-caption text-ink-2">
        <li>30분 동안 활동이 없으면 자동으로 로그아웃됩니다.</li>
        <li>로그인 후 8시간이 지나면 다시 로그인해야 합니다.</li>
        <li>권한 변경 같은 중요한 처리는 최근 5분 이내 재인증을 한 번 더 요구합니다.</li>
      </ul>
    </OpsPublicFrame>
  );
}
