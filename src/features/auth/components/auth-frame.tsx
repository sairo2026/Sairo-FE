import type { ReactNode } from "react";
import { Card } from "@/shared/components/ui/card";

export function AuthFrame({
  title,
  description,
  children,
  width = "md",
}: {
  title: string;
  description?: string;
  children: ReactNode;
  width?: "sm" | "md";
}) {
  return (
    <div className="flex flex-1 items-start justify-center bg-surface px-4 py-12 sm:py-16">
      <Card className={width === "sm" ? "w-full max-w-md" : "w-full max-w-xl"}>
        <h1 className="text-h1 font-bold text-ink">{title}</h1>
        {description ? <p className="mt-3 text-body text-ink-2">{description}</p> : null}
        <div className="mt-6">{children}</div>
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
    <p role="status" className="rounded-control bg-primary-soft px-4 py-3 text-caption text-ink-2">
      {children}
    </p>
  );
}
