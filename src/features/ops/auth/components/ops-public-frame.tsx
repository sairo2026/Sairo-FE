import type { ReactNode } from "react";
import { Card } from "@/shared/components/ui/card";

/** 콘솔 가드 밖에서 쓰는 운영자 인증 화면의 공통 틀. */
export function OpsPublicFrame({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <main className="mx-auto w-full max-w-md px-4 py-24">
      <Card>
        <h1 className="text-h1 font-bold text-ink">{title}</h1>
        {description ? <p className="mt-3 text-body text-ink-2">{description}</p> : null}
        {children ? <div className="mt-6 flex flex-col gap-4">{children}</div> : null}
      </Card>
    </main>
  );
}

export function OpsNotice({
  tone = "info",
  children,
}: {
  tone?: "info" | "error";
  children: ReactNode;
}) {
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={
        tone === "error"
          ? "rounded-control border border-danger px-4 py-3 text-body text-danger"
          : "rounded-control border border-line bg-surface px-4 py-3 text-body text-ink-2"
      }
    >
      {children}
    </p>
  );
}

export const primaryLinkClass =
  "inline-flex h-12 items-center justify-center rounded-control bg-primary px-10 font-bold text-white hover:bg-primary-hover";
