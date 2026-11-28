import type { ReactNode } from "react";
import { BrandLogo } from "@/shared/components/ui/brand-logo";
import { Card } from "@/shared/components/ui/card";
import { breakSentencesIn } from "@/shared/lib/sentences";

export function AuthFrame({
  title,
  description,
  children,
  width = "md",
  variant = "default",
  contentGap = "default",
  tagline,
  as: Root = "main",
}: {
  title: string;
  description?: string;
  children: ReactNode;
  width?: "sm" | "md";
  /** form은 로고 없이 제목만 둔 가입·비밀번호 카드, login은 로고와 제목·소개를 둔 이메일 로그인 카드다. */
  variant?: "default" | "form" | "login";
  contentGap?: "default" | "compact" | "passwordRecovery";
  tagline?: string;
  /** 기본은 화면의 주 영역(main)이다. 이미 main이 있는 작업 틀 안에서 쓸 때만 div로 바꾼다. */
  as?: "div" | "main";
}) {
  if (variant === "login") {
    return (
      <main className="flex flex-1 items-center justify-center bg-surface px-4 py-12 sm:py-16">
        <Card tone="elevated" shadow="login" className="w-full max-w-[624px]">
          <div className="flex flex-col items-center gap-4 text-center">
            <BrandLogo className="w-[220px]" />
            <h1 className="pt-2 text-h1 font-bold text-ink">{title}</h1>
            {tagline ? <p className="text-body text-ink-2">{tagline}</p> : null}
          </div>
          <div className="mt-8 sm:mt-12">{children}</div>
        </Card>
      </main>
    );
  }
  const isForm = variant === "form";
  return (
    <Root className="flex flex-1 items-center justify-center bg-surface px-4 py-12 sm:py-16">
      <Card
        tone="elevated"
        shadow={isForm ? "modal" : "auth"}
        className={width === "sm" ? "w-full max-w-md" : "w-full max-w-[676px]"}
      >
        {isForm ? null : <BrandLogo className="mb-6 w-28" />}
        <h1 className="whitespace-pre-line text-h1 font-bold text-ink">{title}</h1>
        {description ? <p className="mt-4 text-body text-ink-2">{description}</p> : null}
        <div
          className={
            contentGap === "compact"
              ? "mt-6"
              : contentGap === "passwordRecovery"
                ? "mt-14"
                : description
                  ? "mt-12"
                  : "mt-8 sm:mt-12"
          }
        >
          {children}
        </div>
      </Card>
    </Root>
  );
}

export function FormAlert({ children }: { children: ReactNode }) {
  return (
    <p
      role="alert"
      className="rounded-control border border-status-error bg-status-danger-bg px-5 py-4 text-caption text-status-danger-text"
    >
      {children}
    </p>
  );
}

export function FormNotice({
  children,
  variant = "boxed",
}: {
  children: ReactNode;
  /** inline은 박스 없이 파란 캡션만 둔다. 메일 발송 직후 안내에 쓴다. */
  variant?: "boxed" | "inline";
}) {
  return (
    <p
      role="status"
      className={
        variant === "inline"
          ? "whitespace-pre-line text-caption text-primary"
          : "whitespace-pre-line rounded-control bg-primary-soft px-4 py-3 text-caption text-ink-2"
      }
    >
      {breakSentencesIn(children)}
    </p>
  );
}
