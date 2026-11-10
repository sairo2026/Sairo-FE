"use client";

import { useLegalCompanyInfo } from "@/shared/legal/use-legal-values";
import {
  ACCESS_LOG_NOTICE,
  APPROVER_VISIBLE_INFO_NOTICE,
  LINK_COMMON_COPY,
  LINK_ISSUE_COPY,
  approverNoticeLines,
  approverPreRegisteredNotice,
  customerNoticeLines,
  linkRightsFooter,
} from "../model/legal-copy";
import type { LinkNoticeContext } from "../model/legal-copy";

export type LinkNoticeInput = {
  officeName?: string | null;
  officeContactPhone?: string | null;
  retentionDays?: number | null;
};

export function useLinkNoticeContext(input: LinkNoticeInput): LinkNoticeContext {
  const company = useLegalCompanyInfo();
  return {
    officeName: input.officeName ?? null,
    officeContactPhone: input.officeContactPhone ?? null,
    retentionDays: input.retentionDays ?? null,
    operatorName: company.data?.businessName ?? null,
    privacyContact: company.data?.privacyContact ?? null,
  };
}

function NoticeList({ lines, label }: { lines: string[]; label: string }) {
  const [lead, ...items] = lines;
  return (
    <section
      aria-label={label}
      className="flex flex-col gap-2 rounded-card-flat border border-line bg-white px-5 py-4 text-caption text-ink-2"
    >
      <h2 className="text-body font-semibold text-ink">{label}</h2>
      <p>{lead}</p>
      <ul className="flex list-disc flex-col gap-1 pl-5">
        {items.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </section>
  );
}

export function ApproverLinkPrivacyNotice(props: LinkNoticeInput & { isPreRegistered?: boolean }) {
  const context = useLinkNoticeContext(props);
  return (
    <div className="flex flex-col gap-3">
      <NoticeList lines={approverNoticeLines(context)} label="개인정보 수집 안내" />
      {props.isPreRegistered ? (
        <p className="text-caption text-ink-2">{approverPreRegisteredNotice(context)}</p>
      ) : null}
      <p className="text-caption text-ink-2">{APPROVER_VISIBLE_INFO_NOTICE}</p>
    </div>
  );
}

export function CustomerLinkPrivacyNotice(props: LinkNoticeInput) {
  const context = useLinkNoticeContext(props);
  return <NoticeList lines={customerNoticeLines(context)} label="개인정보 수집 안내" />;
}

export function LinkCommonNotices({
  audience,
  ...input
}: LinkNoticeInput & { audience: "approver" | "customer" }) {
  const context = useLinkNoticeContext(input);
  return (
    <section aria-label="링크 이용 안내" className="flex flex-col gap-2 text-caption text-ink-2">
      <p>{LINK_COMMON_COPY.inputScope}</p>
      <p>{LINK_COMMON_COPY.sharing}</p>
      {audience === "approver" ? <p>{LINK_COMMON_COPY.aboveSubmit}</p> : null}
      {audience === "approver" ? <p>{LINK_COMMON_COPY.approvalWithdrawal}</p> : null}
      <p>
        {linkRightsFooter(context)} [{LINK_COMMON_COPY.rightsRequestLabel}]
      </p>
      <p>{ACCESS_LOG_NOTICE}</p>
    </section>
  );
}

export function LinkIssueGuidance() {
  return (
    <ul className="flex list-disc flex-col gap-1 pl-5 text-caption text-ink-2">
      {LINK_ISSUE_COPY.map((line) => (
        <li key={line}>{line}</li>
      ))}
    </ul>
  );
}
