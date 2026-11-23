import type { ReactNode } from "react";
import { Breadcrumb, type BreadcrumbItem } from "./breadcrumb";

export type PageHeaderProps = {
  title: string;
  description?: string;
  actions?: ReactNode;
  breadcrumb?: readonly BreadcrumbItem[];
};

const LONG_DESCRIPTION_LENGTH = 80;

export function PageHeader({ title, description, actions, breadcrumb }: PageHeaderProps) {
  const isLong = (description?.length ?? 0) > LONG_DESCRIPTION_LENGTH;
  const header = (
    <header className="flex flex-wrap items-end justify-between gap-4 pb-0">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <h1 className="text-h1 font-bold text-ink">{title}</h1>
        {description && !isLong ? <p className="text-caption text-ink-2">{description}</p> : null}
        {description && isLong ? (
          <p className="basis-full text-caption text-ink-2">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </header>
  );
  if (!breadcrumb || breadcrumb.length === 0) return header;
  return (
    <div className="flex flex-col gap-2">
      <Breadcrumb items={breadcrumb} />
      {header}
    </div>
  );
}
