import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/shared/lib/cn";

export type CardProps = HTMLAttributes<HTMLElement> & {
  title?: string;
  tone?: "default" | "flat" | "elevated";
  children: ReactNode;
};

export function Card({ title, tone = "default", className, children, ...rest }: CardProps) {
  return (
    <section
      {...rest}
      className={cn(
        "bg-white",
        tone === "default" && "rounded-card border border-line px-8 py-7",
        tone === "flat" && "rounded-card-flat border border-line px-6 py-5",
        tone === "elevated" && "rounded-card px-6 py-8 shadow-auth sm:px-10 sm:py-12",
        className,
      )}
    >
      {title ? <h2 className="mb-4 text-h2 font-semibold text-ink">{title}</h2> : null}
      {children}
    </section>
  );
}
