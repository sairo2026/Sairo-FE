import type { ReactNode } from "react";

export type PageHeaderProps = { title: string; description?: string; actions?: ReactNode };

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4 pb-6">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <h1 className="text-h1 font-bold text-ink">{title}</h1>
        {description ? <p className="text-caption text-ink-2">{description}</p> : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </header>
  );
}
