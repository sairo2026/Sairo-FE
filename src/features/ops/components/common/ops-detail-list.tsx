import type { ReactNode } from "react";

export type OpsDetailItem = { label: string; value: ReactNode };

/** 라벨과 값을 짝지어 보이는 읽기 전용 목록. 값이 비면 대시를 보인다. */
export function OpsDetailList({ items, columns = 2 }: { items: OpsDetailItem[]; columns?: 1 | 2 }) {
  return (
    <dl className={columns === 2 ? "grid gap-x-8 gap-y-4 sm:grid-cols-2" : "grid gap-y-4"}>
      {items.map((item) => (
        <div key={item.label} className="flex flex-col gap-1">
          <dt className="text-caption font-semibold text-ink-2">{item.label}</dt>
          <dd className="text-body text-ink">
            {item.value === null || item.value === undefined || item.value === ""
              ? "-"
              : item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
