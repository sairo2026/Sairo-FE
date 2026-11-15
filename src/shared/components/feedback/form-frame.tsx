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
  tagline,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  width?: "sm" | "md";
  /** form은 로고 없이 제목만 둔 가입·비밀번호 카드, login은 로고와 한 줄 소개를 둔 이메일 로그인 카드다. */
  variant?: "default" | "form" | "login";
  tagline?: string;
}) {
  if (variant === "login") {
    return (
      <div className="flex flex-1 items-start justify-center bg-surface px-4 py-12 sm:py-16">
        <Card tone="elevated" shadow="login" className="w-full max-w-[624px]">
          <div className="flex flex-col items-center gap-5">
            <BrandLogo className="w-[220px]" />
            {tagline ? (
              <p className="text-center text-h2 font-semibold text-primary">{tagline}</p>
            ) : null}
          </div>
          <h1 className="sr-only">{title}</h1>
          <div className="mt-8 sm:mt-11">{children}</div>
        </Card>
      </div>
    );
  }
  const isForm = variant === "form";
  return (
    <div className="flex flex-1 items-start justify-center bg-surface px-4 py-12 sm:py-16">
      <Card
        tone="elevated"
        shadow={isForm ? "modal" : "auth"}
        className={width === "sm" ? "w-full max-w-md" : "w-full max-w-[676px]"}
      >
        {isForm ? null : <BrandLogo className="mb-6 w-28" />}
        <h1 className="text-h1 font-bold text-ink">{title}</h1>
        {description ? (
          <p
            className={
              isForm ? "mt-6 text-h2 font-semibold text-ink-2" : "mt-3 text-body text-ink-2"
            }
          >
            {description}
          </p>
        ) : null}
        <div className="mt-8 sm:mt-11">{children}</div>
      </Card>
    </div>
  );
}

export function FormAlert({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="rounded-control bg-tag-red px-4 py-3 text-caption text-tag-red-ink">
      {children}
    </p>
  );
}

export function FormNotice({ children }: { children: ReactNode }) {
  return (
    <p
      role="status"
      className="whitespace-pre-line rounded-control bg-primary-soft px-4 py-3 text-caption text-ink-2"
    >
      {breakSentencesIn(children)}
    </p>
  );
}
