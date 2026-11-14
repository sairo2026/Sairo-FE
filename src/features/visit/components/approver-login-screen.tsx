"use client";

import { useRouter } from "next/navigation";
import { FormNotice } from "@/shared/components/feedback/form-frame";
import { Card } from "@/shared/components/ui/card";
import { PageHeader } from "@/shared/components/ui/page-header";
import { normalizeLinkToken } from "@/shared/lib/link-token";
import { approverBase } from "../api/approver.api";
import { useApproverConditions, useApproverRequests } from "../hooks/approver-queries";
import { ApproverOtpForm } from "./approver-otp";
import { ApproverPrivacyNotice } from "./approver-privacy-notice";

export function ApproverLoginScreen({ token }: { token?: string }) {
  const router = useRouter();
  const normalized = token === undefined ? null : normalizeLinkToken(token);
  const base = approverBase({ kind: "link", token: normalized ?? "" });
  const enabled = normalized !== null;
  const conditions = useApproverConditions(base, enabled);
  const requests = useApproverRequests(base, enabled);
  const noticeVersion =
    conditions.data?.privacyNotice.noticeVersion ?? requests.data?.privacyNotice.noticeVersion;
  const isClaim = enabled;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={isClaim ? "번호 인증으로 계정 만들기" : "번호 인증 로그인"}
        description="여러 매물의 링크와 신청·확정 일정을 한 화면에서 관리할 수 있습니다."
      />
      <FormNotice>
        계정은 선택 기능이며 링크만으로도 계속 사용할 수 있습니다. 계정에는 휴대폰 번호의 해시와
        마지막 네 자리만 저장하고 이름, 이메일, 비밀번호는 받지 않습니다.
        {isClaim ? " 링크의 출입승인에 등록된 번호와 같아야 인증할 수 있습니다." : ""}
      </FormNotice>
      <Card>
        <ApproverOtpForm
          purpose={isClaim ? "CLAIM" : "LOGIN"}
          linkToken={normalized}
          noticeVersion={noticeVersion}
          submitLabel={isClaim ? "인증하고 계정 만들기" : "로그인"}
          onVerified={() => router.push("/approver/account")}
        />
      </Card>
      <ApproverPrivacyNotice retentionDays={conditions.data?.privacyNotice.retentionDays} />
    </div>
  );
}
