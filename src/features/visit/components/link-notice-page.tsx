"use client";

import { PageHeader } from "@/shared/components/ui/page-header";
import {
  ApproverLinkPrivacyNotice,
  CustomerLinkPrivacyNotice,
  LinkCommonNotices,
} from "./link-legal-notices";

export function LinkNoticePage({ audience }: { audience: "approver" | "customer" }) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={audience === "approver" ? "승인자 링크 개인정보 안내" : "고객 링크 개인정보 안내"}
        description="방문 조율 링크 화면에 표시되는 개인정보 수집 안내입니다."
      />
      {audience === "approver" ? (
        <ApproverLinkPrivacyNotice isPreRegistered />
      ) : (
        <CustomerLinkPrivacyNotice />
      )}
      <LinkCommonNotices audience={audience} />
    </div>
  );
}
