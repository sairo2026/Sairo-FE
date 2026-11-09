import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/shared/lib/cn";

export type CardProps = HTMLAttributes<HTMLElement> & {
  title?: string;
  tone?: "default" | "flat";
  children: ReactNode;
};

export function Card({ title, tone = "default", className, children, ...rest }: CardProps) {
  return (
    <section
      {...rest}
      className={cn(
        "border border-line bg-white",
        tone === "default" ? "rounded-card px-8 py-7" : "rounded-card-flat px-6 py-5",
        className,
      )}
    >
      {title ? <h2 className="mb-4 text-h2 font-semibold text-ink">{title}</h2> : null}
      {children}
    </section>
  );
}
