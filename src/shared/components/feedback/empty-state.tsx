import type { ReactNode } from "react";

export type EmptyStateProps = {
  title: string;
  description?: string;
  action?: ReactNode;
};

/** 목록이나 영역에 보여줄 항목이 없을 때 안내한다. */
export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-card-flat border border-dashed border-line bg-surface px-6 py-12 text-center">
      <p className="text-body font-semibold text-ink">{title}</p>
      {description ? <p className="text-caption text-ink-2">{description}</p> : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}
