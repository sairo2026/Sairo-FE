"use client";

import Link from "next/link";
import { useId, useState } from "react";
import type { ReactNode } from "react";
import { AuthFrame, FormAlert } from "@/shared/components/feedback/form-frame";
import { Badge } from "@/shared/components/ui/badge";
import type { BadgeTone } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Modal } from "@/shared/components/ui/modal";
import { cn } from "@/shared/lib/cn";

export function FlowFrame({
  title,
  description,
  width,
  children,
}: {
  title: string;
  description?: string;
  width?: "sm" | "md";
  children: ReactNode;
}) {
  return (
    <AuthFrame title={title} description={description} width={width}>
      {children}
    </AuthFrame>
  );
}

export function StatusBadge({ tone, label }: { tone: BadgeTone; label: string }) {
  return <Badge tone={tone}>{label}</Badge>;
}

export function DetailList({ items }: { items: Array<{ label: string; value: ReactNode }> }) {
  return (
    <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-[160px_1fr]">
      {items.map((item) => (
        <div key={item.label} className="contents">
          <dt className="text-caption font-semibold text-ink-2">{item.label}</dt>
          <dd className="text-body text-ink">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function ButtonRow({
  children,
  align = "center",
}: {
  children: ReactNode;
  align?: "center" | "start";
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap gap-3",
        align === "center" ? "justify-center" : "justify-start",
      )}
    >
      {children}
    </div>
  );
}

export function TextLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="text-caption font-semibold text-primary hover:underline">
      {children}
    </Link>
  );
}

export function MutedNote({ children }: { children: ReactNode }) {
  return <p className="text-caption text-ink-2">{children}</p>;
}

export function Checklist({
  id,
  label,
  checked,
  onChange,
  error,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  error?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="inline-flex items-center gap-2 text-body text-ink">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          aria-invalid={error ? true : undefined}
          className="h-5 w-5 accent-primary"
        />
        {label}
      </label>
      {error ? (
        <p role="alert" className="text-caption text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export type ReasonDialogProps = {
  isOpen: boolean;
  title: string;
  description?: string;
  label?: string;
  confirmLabel: string;
  isPending: boolean;
  error?: string;
  validate: (value: string) => string | undefined;
  onConfirm: (reason: string) => void;
  onClose: () => void;
};

export function ReasonDialog(props: ReasonDialogProps) {
  return props.isOpen ? <ReasonDialogBody {...props} /> : null;
}

function ReasonDialogBody({
  isOpen,
  title,
  description,
  label = "사유",
  confirmLabel,
  isPending,
  error,
  validate,
  onConfirm,
  onClose,
}: ReasonDialogProps) {
  const [reason, setReason] = useState("");
  const [localError, setLocalError] = useState<string>();
  const fieldId = useId();

  function submit() {
    const problem = validate(reason);
    setLocalError(problem);
    if (!problem) onConfirm(reason.trim());
  }

  return (
    <Modal
      isOpen={isOpen}
      title={title}
      onClose={onClose}
      footer={
        <>
          <Button variant="cancel" onClick={onClose} disabled={isPending}>
            취소
          </Button>
          <Button isLoading={isPending} onClick={submit}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        {description ? <p className="text-body text-ink-2">{description}</p> : null}
        <label htmlFor={fieldId} className="text-caption font-semibold text-ink">
          {label}
        </label>
        <textarea
          id={fieldId}
          value={reason}
          onChange={(event) => {
            setReason(event.target.value);
            setLocalError(undefined);
          }}
          rows={4}
          aria-invalid={localError ? true : undefined}
          className="rounded-control border border-line bg-surface p-4 text-body text-ink focus:border-primary focus:bg-white"
        />
        {localError ? (
          <p role="alert" className="text-caption text-danger">
            {localError}
          </p>
        ) : null}
        {error ? <FormAlert>{error}</FormAlert> : null}
      </div>
    </Modal>
  );
}
