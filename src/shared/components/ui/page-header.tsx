import type { ReactNode } from "react";
import { Breadcrumb, type BreadcrumbItem } from "./breadcrumb";

export type PageHeaderProps = {
  title: string;
  description?: string;
  actions?: ReactNode;
  breadcrumb?: readonly BreadcrumbItem[];
};

export function PageHeader({ title, description, actions, breadcrumb }: PageHeaderProps) {
  const header = (
    <header className="flex flex-wrap items-start justify-between gap-4 pb-0">
      <div className="flex min-w-0 flex-col gap-4">
        <h1 className="text-h1 font-bold text-ink">{title}</h1>
        {description ? <p className="text-body text-ink-2">{description}</p> : null}
      </div>
      {actions ? <div className="flex min-h-12 items-center gap-3">{actions}</div> : null}
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
