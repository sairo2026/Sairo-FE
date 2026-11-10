import type { ReactNode } from "react";
import {
  DATA_EXPORT_COPY,
  DATA_MIGRATION_COPY,
  PRIVACY_RIGHTS_COPY,
  SUPPORT_INQUIRY_COPY,
} from "./data-rights-copy";

function NoticeBlock({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-1 rounded-card-flat border border-line bg-surface px-5 py-4">
      {title ? <h2 className="text-body font-semibold text-ink">{title}</h2> : null}
      <div className="flex flex-col gap-2 text-caption text-ink-2">{children}</div>
    </section>
  );
}

export function DataMigrationUploadNotice() {
  return (
    <NoticeBlock title={DATA_MIGRATION_COPY.uploadTitle}>
      <p>{DATA_MIGRATION_COPY.upload}</p>
      <p>{DATA_MIGRATION_COPY.retention}</p>
      <p>{DATA_MIGRATION_COPY.run}</p>
    </NoticeBlock>
  );
}

export function DataMigrationSupportNotice() {
  return (
    <NoticeBlock title={DATA_MIGRATION_COPY.supportTitle}>
      <p>{DATA_MIGRATION_COPY.support}</p>
      <p>{DATA_MIGRATION_COPY.supportCancel}</p>
      <p>{DATA_MIGRATION_COPY.supportPrivacy}</p>
    </NoticeBlock>
  );
}

export function DataExportNotice() {
  return (
    <NoticeBlock>
      <p>{DATA_EXPORT_COPY.guide}</p>
      <p className="font-semibold text-ink">{DATA_EXPORT_COPY.caution}</p>
      <p>{DATA_EXPORT_COPY.withdrawnMember}</p>
    </NoticeBlock>
  );
}

export function PrivacyRightsNotice({ isOwner = false }: { isOwner?: boolean }) {
  return (
    <NoticeBlock title={PRIVACY_RIGHTS_COPY.title}>
      <p>{PRIVACY_RIGHTS_COPY.guide}</p>
      <p>{PRIVACY_RIGHTS_COPY.officeCustomer}</p>
      <p>{PRIVACY_RIGHTS_COPY.nameDeletion}</p>
      {isOwner ? <p>{PRIVACY_RIGHTS_COPY.ownerGuide}</p> : null}
    </NoticeBlock>
  );
}

export function SupportInquiryNotice({ isOwner = false }: { isOwner?: boolean }) {
  return (
    <NoticeBlock>
      <p>{SUPPORT_INQUIRY_COPY.attachment}</p>
      {isOwner ? <p>{SUPPORT_INQUIRY_COPY.outsourcingOwner}</p> : null}
    </NoticeBlock>
  );
}
