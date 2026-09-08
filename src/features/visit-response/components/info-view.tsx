import type { ReactNode } from "react";

type InfoViewProps = {
  title: string;
  description?: string;
  children?: ReactNode;
  onConfirm: () => void;
};

export function InfoView({ title, description, children, onConfirm }: InfoViewProps) {
  return (
    <div className="flex min-h-[70vh] flex-col">
      <h1 className="text-xl font-bold">{title}</h1>
      {description ? <p className="mt-2 text-sm text-slate-500">{description}</p> : null}
      {children ? <div className="mt-8">{children}</div> : null}
      <button
        type="button"
        onClick={onConfirm}
        className="mt-auto w-full rounded-lg bg-[#3937b8] py-4 font-semibold text-white"
      >
        확인
      </button>
    </div>
  );
}
