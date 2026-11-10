"use client";

import { EmptyState } from "@/shared/components/feedback/empty-state";
import { MutedNote, TextLink } from "@/shared/components/feedback/page-parts";
import { QueryGate } from "@/shared/components/feedback/query-gate";
import { Card } from "@/shared/components/ui/card";
import { PageHeader } from "@/shared/components/ui/page-header";
import { formatSeoulDateTime } from "@/shared/lib/format";
import { useAuthStatus } from "../hooks/billing-queries";
import { isMissing } from "../model/labels";

export function formatRemaining(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const days = Math.floor(seconds / 86_400);
  const hours = Math.floor((seconds % 86_400) / 3600);
  if (days > 0) return hours > 0 ? `${days}일 ${hours}시간` : `${days}일`;
  const minutes = Math.floor((seconds % 3600) / 60);
  return hours > 0 ? `${hours}시간 ${minutes}분` : `${minutes}분`;
}

export function AuthSuspensionScreen() {
  const query = useAuthStatus();
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="인증 중단과 재개"
        description="사무소 인증이 중단됐을 때 다시 인증받고 구독을 재개하는 방법입니다."
        actions={<TextLink href="/billing">구독 현황으로</TextLink>}
      />
      <QueryGate query={query} loadingLabel="인증 상태를 불러오는 중입니다.">
        {(status) =>
          status.authSuspended ? (
            <div className="flex flex-col gap-6">
              <Card title="중단 상태">
                <p className="text-body text-ink">
                  사무소 인증이 중단되어 자동결제가 바로 멈췄습니다. 남은 유료 기간은 환불받을 수
                  있습니다.
                </p>
                <dl className="mt-4 grid gap-2 text-body sm:grid-cols-[160px_1fr]">
                  {status.suspendedAt ? (
                    <>
                      <dt className="font-semibold text-ink-2">중단 시각</dt>
                      <dd>{formatSeoulDateTime(status.suspendedAt)}</dd>
                    </>
                  ) : null}
                  {status.reauthDeadlineAt ? (
                    <>
                      <dt className="font-semibold text-ink-2">재인증 기한</dt>
                      <dd>{formatSeoulDateTime(status.reauthDeadlineAt)}</dd>
                    </>
                  ) : null}
                  {isMissing(status.trialRemainingSeconds) ? null : (
                    <>
                      <dt className="font-semibold text-ink-2">보존된 무료 기간</dt>
                      <dd>{formatRemaining(status.trialRemainingSeconds)}</dd>
                    </>
                  )}
                </dl>
                <p role="alert" className="mt-4 text-body font-semibold text-danger">
                  중단 후 30일 안에 재인증과 재구매 또는 남은 무료 기간 재개까지 완료해야 합니다.
                  인증만 승인받고 재개하지 않아도 30일 시점에 종료되며, 이후 자료 반환 기간 30일이
                  따로 있습니다.
                </p>
              </Card>
              <Card title="재개 방법">
                <ol className="flex list-decimal flex-col gap-2 pl-5 text-body text-ink">
                  <li>
                    <TextLink href="/office/verification">사무소 인증 소명</TextLink>으로 소명
                    자료를 제출합니다. 운영자가 확인한 뒤 재개를 처리합니다.
                  </li>
                  <li>
                    재개된 뒤 남은 무료 기간이 있으면 이어서 이용하고, 없으면 카드 등록과 구독 구매
                    동의로 다시 구매합니다.
                  </li>
                  <li>
                    중단으로 환불 대상이 된 잔여 유료기간의 진행은{" "}
                    <TextLink href="/billing/refunds">환불 신청 내역</TextLink>에서 확인합니다.
                  </li>
                </ol>
                <div className="mt-3">
                  <TextLink href="/support">지원 문의</TextLink>
                </div>
              </Card>
            </div>
          ) : (
            <EmptyState
              title="인증이 중단되지 않았습니다."
              description="현재 사무소 인증은 정상입니다."
            />
          )
        }
      </QueryGate>
    </div>
  );
}

export function ReturnGuideScreen() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="자료 반환과 보관 안내"
        description="구독이 끝난 뒤 자료를 돌려받는 절차입니다."
        actions={<TextLink href="/billing">구독 현황으로</TextLink>}
      />
      <Card title="종료 후 30일">
        <p className="text-body text-ink">
          구독이 종료된 뒤 30일 동안 자료를 조회하고 내보낼 수 있습니다. 탈퇴하거나 종료된 뒤에는
          권한 안내에 담긴 링크로 별도 재인증을 거쳐 반환 전용 화면에서 내보내기를 진행합니다.
        </p>
        <MutedNote>
          계약서처럼 법령상 보존이 필요한 서류는 보관 계약을 맺지 않으면 이 기간 안에 직접 내려받아
          보관하셔야 합니다.
        </MutedNote>
      </Card>
      <Card title="장기 보관">
        <p className="text-body text-ink">
          장기 보관을 원하면 별도 보관계약이 필요합니다. 계약은 사이로 운영자가 체결한 뒤 보관권한을
          발급합니다.
        </p>
        <div className="mt-3">
          <TextLink href="/support">보관계약 문의</TextLink>
        </div>
      </Card>
    </div>
  );
}
