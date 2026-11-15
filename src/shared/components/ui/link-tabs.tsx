import Link from "next/link";
import { cn } from "@/shared/lib/cn";

export type LinkTabItem = { key: string; label: string; href: string };

export type LinkTabsProps = {
  label: string;
  items: readonly LinkTabItem[];
  activeKey: string | null;
};

/** 탭마다 주소가 있는 탭 줄. Tabs와 같은 모양이며 선택된 탭은 밑줄과 기본 색에 aria-current로 알린다. */
export function LinkTabs({ label, items, activeKey }: LinkTabsProps) {
  return (
    <nav aria-label={label} className="flex gap-6 overflow-x-auto border-b border-line">
      {items.map((item) => {
        const isActive = item.key === activeKey;
        return (
          <Link
            key={item.key}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "-mb-px shrink-0 border-b-2 pb-3 text-body font-semibold whitespace-nowrap transition-colors active:bg-primary-line",
              isActive
                ? "border-primary text-primary"
                : "border-transparent text-ink hover:border-primary-line hover:bg-primary-soft hover:text-primary",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
