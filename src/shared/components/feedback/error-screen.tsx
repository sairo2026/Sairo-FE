"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { ErrorScreenKind } from "@/shared/api/error-kind";
import { Button } from "@/shared/components/ui/button";
import { WORK_HOME_PATH } from "@/shared/lib/app-paths";
import { useOptionalOfficeAccess } from "@/shared/session/office-access-context";
import { useErrorAudience } from "./error-audience";
import type { ErrorAudience } from "./error-audience";

type ScreenCopy = { title: string; description: string; isAlert: boolean };

export const ERROR_SCREEN_COPY: Record<ErrorScreenKind, ScreenCopy> = {
  unauthenticated: {
    title: "로그인이 필요합니다",
    description: "로그인한 뒤 다시 시도해 주세요.",
    isAlert: false,
  },
  forbidden: {
    title: "접근 권한이 없습니다",
    description: "이 화면을 볼 수 있는 권한이 없습니다. 사무소 대표에게 권한을 문의해 주세요.",
    isAlert: false,
  },
  "not-found": {
    title: "페이지를 찾을 수 없습니다",
    description: "주소가 바뀌었거나 삭제되었거나 볼 수 없는 항목입니다.",
    isAlert: false,
  },
  "rate-limited": {
    title: "요청이 너무 많습니다",
    description: "잠시 기다린 뒤 다시 시도해 주세요.",
    isAlert: true,
  },
  server: {
    title: "문제가 발생했습니다",
    description: "일시적인 문제로 요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.",
    isAlert: true,
  },
  maintenance: {
    title: "서비스 점검 중입니다",
    description: "더 나은 서비스를 위해 점검하고 있습니다. 잠시 후 다시 접속해 주세요.",
    isAlert: false,
  },
  network: {
    title: "네트워크 연결을 확인해 주세요",
    description: "서버에 연결하지 못했습니다. 연결 상태를 확인한 뒤 다시 시도해 주세요.",
    isAlert: true,
  },
};

type AudienceCopy = Partial<Record<ErrorScreenKind, Partial<ScreenCopy>>>;

const OWNER_COPY: AudienceCopy = {
  forbidden: {
    description:
      "이 화면을 볼 수 있는 권한이 없습니다. 사무소 인증 상태와 구독 상태를 확인해 주세요.",
  },
};

const AUDIENCE_COPY: Record<ErrorAudience, AudienceCopy> = {
  office: {},
  ops: {
    unauthenticated: { description: "운영자 로그인을 한 뒤 다시 시도해 주세요." },
    forbidden: {
      description:
        "이 화면을 볼 수 있는 운영 역할이 아닙니다. 역할 변경은 보안관리자에게 요청해 주세요.",
    },
  },
  guest: {
    unauthenticated: {
      title: "다시 확인이 필요합니다",
      description: "확인 시간이 지났습니다. 받은 링크를 다시 열어 주세요.",
    },
    forbidden: {
      description: "이 링크로는 볼 수 없는 화면입니다. 링크를 보낸 중개사무소에 문의해 주세요.",
    },
    "not-found": {
      description:
        "주소가 바뀌었거나 더 이상 볼 수 없는 항목입니다. 받은 링크를 다시 확인해 주세요.",
    },
  },
};

const AUDIENCE_LINKS: Record<
  ErrorAudience,
  { login: { href: string; label: string } | null; home: { href: string; label: string } | null }
> = {
  office: {
    login: { href: "/login", label: "로그인하기" },
    home: { href: WORK_HOME_PATH, label: "홈으로" },
  },
  ops: {
    login: { href: "/ops/login", label: "운영자 로그인" },
    home: { href: "/ops", label: "운영 홈으로" },
  },
  guest: { login: null, home: null },
};

export function resolveErrorCopy(
  kind: ErrorScreenKind,
  audience: ErrorAudience,
  isOwner: boolean,
): ScreenCopy {
  const override =
    audience === "office" && isOwner ? OWNER_COPY[kind] : AUDIENCE_COPY[audience][kind];
  return { ...ERROR_SCREEN_COPY[kind], ...override };
}

export type ErrorScreenProps = {
  kind: ErrorScreenKind;
  title?: string;
  description?: string;
  /** 문의할 때 알려 주는 추적 번호. */
  traceId?: string;
  /** 429에서 다시 시도할 수 있을 때까지의 초. */
  retryAfterSeconds?: number;
  onRetry?: () => void;
  actions?: ReactNode;
};

/** 정해진 초가 지나기 전에는 다시 시도 버튼을 막고 남은 시간을 알린다. */
function RetryAction({ seconds, onRetry }: { seconds: number; onRetry: () => void }) {
  const [remaining, setRemaining] = useState(seconds);
  useEffect(() => {
    const timer = setInterval(() => setRemaining((value) => Math.max(0, value - 1)), 1000);
    return () => clearInterval(timer);
  }, []);
  return (
    <>
      {remaining > 0 ? (
        <p className="w-full text-caption font-semibold text-primary" aria-live="polite">
          {remaining}초 뒤에 다시 시도할 수 있습니다.
        </p>
      ) : null}
      <Button variant="submit" disabled={remaining > 0} onClick={onRetry}>
        다시 시도
      </Button>
    </>
  );
}

export function ErrorScreen({
  kind,
  title,
  description,
  traceId,
  retryAfterSeconds,
  onRetry,
  actions,
}: ErrorScreenProps) {
  const audience = useErrorAudience();
  const officeAccess = useOptionalOfficeAccess();
  const copy = resolveErrorCopy(kind, audience, officeAccess?.role === "OWNER");
  const links = AUDIENCE_LINKS[audience];
  const waitSeconds = kind === "rate-limited" ? (retryAfterSeconds ?? 0) : 0;

  return (
    <section
      role={copy.isAlert ? "alert" : undefined}
      aria-labelledby="error-screen-title"
      className="mx-auto flex w-full max-w-md flex-col items-center gap-4 px-4 py-16 text-center"
    >
      <h1 id="error-screen-title" className="text-h1 font-bold text-ink">
        {title ?? copy.title}
      </h1>
      <p className="text-body text-ink-2">{description ?? copy.description}</p>
      {traceId ? <p className="text-caption text-ink-3">문의 번호: {traceId}</p> : null}
      <div className="mt-2 flex flex-wrap justify-center gap-2">
        {onRetry ? <RetryAction key={waitSeconds} seconds={waitSeconds} onRetry={onRetry} /> : null}
        {kind === "unauthenticated" && links.login ? (
          <Link
            href={links.login.href}
            className="inline-flex h-12 items-center rounded-control bg-primary px-10 font-bold text-white hover:bg-primary-hover"
          >
            {links.login.label}
          </Link>
        ) : null}
        {(kind === "forbidden" || kind === "not-found" || kind === "server") && links.home ? (
          <Link
            href={links.home.href}
            className="inline-flex h-12 items-center rounded-control border border-line px-10 font-medium text-ink-2 hover:border-primary hover:text-primary"
          >
            {links.home.label}
          </Link>
        ) : null}
        {actions}
      </div>
    </section>
  );
}
