import Link from "next/link";
import { COOKIE_NOTICE_COPY } from "./notice-copy";

type CookieNoticeProps = {
  variant?: "default" | "approver" | "ops";
  className?: string;
};

export function CookieNotice({ variant = "default", className }: CookieNoticeProps) {
  const extra =
    variant === "approver"
      ? COOKIE_NOTICE_COPY.approver
      : variant === "ops"
        ? COOKIE_NOTICE_COPY.ops
        : null;
  return (
    <p className={`text-caption text-ink-2 ${className ?? ""}`} data-testid="cookie-notice">
      {COOKIE_NOTICE_COPY.body} {extra}{" "}
      <Link href="/legal/privacy" className="font-semibold underline">
        {COOKIE_NOTICE_COPY.linkLabel}
      </Link>
    </p>
  );
}
