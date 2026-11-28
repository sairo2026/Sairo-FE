import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/shared/lib/cn";

export type CardProps = HTMLAttributes<HTMLElement> & {
  title?: string;
  tone?: "default" | "flat" | "elevated";
  /** elevated 카드의 그림자. auth는 처음 화면용, modal은 가입·비밀번호 카드용, login은 이메일 로그인 카드용이다. */
  shadow?: "auth" | "modal" | "login";
  children: ReactNode;
};

export function Card({
  title,
  tone = "default",
  shadow = "auth",
  className,
  children,
  ...rest
}: CardProps) {
  return (
    <section
      {...rest}
      className={cn(
        "bg-white",
        tone === "default" && "rounded-card border border-line px-5 py-8",
        tone === "flat" && "rounded-card-flat border border-line px-5 py-5",
        tone === "elevated" &&
          cn(
            "rounded-card px-6 py-8 sm:px-10 sm:py-12",
            shadow === "modal"
              ? "shadow-modal"
              : shadow === "login"
                ? "shadow-[0_0_25.45px_rgb(27_28_93/0.04)]"
                : "shadow-auth",
          ),
        className,
      )}
    >
      {title ? <h2 className="mb-4 text-h3 font-semibold text-ink">{title}</h2> : null}
      {children}
    </section>
  );
}
