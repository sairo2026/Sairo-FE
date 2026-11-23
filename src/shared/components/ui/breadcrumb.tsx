import Link from "next/link";
import { Fragment } from "react";

export type BreadcrumbItem = { label: string; href?: string };

/** 상세·하위 화면 머리말 위에 현재 위치를 보여 주는 경로. 마지막 항목이 현재 화면이다. */
export function Breadcrumb({ items }: { items: readonly BreadcrumbItem[] }) {
  if (items.length === 0) return null;
  return (
    <nav aria-label="현재 위치" className="text-caption text-ink-2">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <Fragment key={`${item.label}-${index}`}>
              <li>
                {item.href && !isLast ? (
                  <Link href={item.href} className="hover:text-ink hover:underline">
                    {item.label}
                  </Link>
                ) : (
                  <span aria-current={isLast ? "page" : undefined}>{item.label}</span>
                )}
              </li>
              {isLast ? null : (
                <li aria-hidden="true" className="select-none">
                  ›
                </li>
              )}
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
