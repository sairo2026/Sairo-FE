import Link from "next/link";
import { cn } from "@/shared/lib/cn";

const ITEMS = [
  { key: "invoices", label: "청구서", href: "/ops/billing" },
  { key: "refunds", label: "환불", href: "/ops/billing/refunds" },
  { key: "reconciliation", label: "대사", href: "/ops/billing/reconciliation" },
  { key: "tax-documents", label: "증빙 발급", href: "/ops/billing/tax-documents" },
] as const;

export type BillingNavKey = (typeof ITEMS)[number]["key"];

export function BillingNav({ current }: { current: BillingNavKey }) {
  return (
    <nav aria-label="결제 화면 이동" className="flex gap-6 border-b border-line">
      {ITEMS.map((item) => (
        <Link
          key={item.key}
          href={item.href}
          aria-current={item.key === current ? "page" : undefined}
          className={cn(
            "-mb-px border-b-2 px-1 pb-2 text-body",
            item.key === current
              ? "border-primary font-semibold text-primary"
              : "border-transparent text-ink-2",
          )}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
