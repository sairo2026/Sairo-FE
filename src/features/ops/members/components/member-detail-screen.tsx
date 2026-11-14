"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import type { OperatorMemberDetailResponse } from "@/lib/api/contracts/ops.schema";
import { QueryGate } from "@/shared/components/feedback/query-gate";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { formatSeoulDateTime } from "@/shared/lib/format";
import { OpsDetailList } from "../../components/common/ops-detail-list";
import { OpsScreen } from "../../components/common/ops-screen";
import { OpsStatusBadge } from "../../components/common/ops-status-badge";
import { MEMBER_ROLE_LABELS } from "../../offices/model/office-status";
import { useHasOpsRole } from "../../model/ops-session";
import { OPS_WORK_ROLES } from "../../model/roles";
import { fetchMemberDetail, opsMemberKeys } from "../api/ops-members-api";
import {
  ACCOUNT_STATUS,
  LOGIN_METHOD_LABELS,
  PENDING_TYPE_LABELS,
  SUSPEND_SCOPE_LABELS,
} from "../model/member-status";
import { EmergencySuspendDialog } from "./emergency-suspend-dialog";

type Detail = OperatorMemberDetailResponse;
type SecurityEvent = Detail["securityEvents"][number];

function EventSummary({ event }: { event: SecurityEvent }) {
  return (
    <OpsDetailList
      columns={1}
      items={[
        { label: "실행 일시", value: formatSeoulDateTime(event.occurredAt) },
        { label: "범위", value: SUSPEND_SCOPE_LABELS[event.scope] ?? event.scope },
        { label: "사유", value: event.reason },
        { label: "재검토 예정 시각", value: formatSeoulDateTime(event.reviewAt) },
        { label: "실행한 운영자", value: event.actorOperatorName },
      ]}
    />
  );
}

function AccountCard({ detail }: { detail: Detail }) {
  const membership = detail.currentMembership;
  const pending = detail.pendingRequestSummary;
  return (
    <Card title="계정 정보" tone="flat">
      <OpsDetailList
        items={[
          { label: "회원 ID", value: detail.userId },
          { label: "이름", value: detail.displayName },
          {
            label: "계정 상태",
            value: <OpsStatusBadge status={detail.accountStatus} map={ACCOUNT_STATUS} />,
          },
          {
            label: "탈퇴 일시",
            value: detail.withdrawnAt ? formatSeoulDateTime(detail.withdrawnAt) : null,
          },
          {
            label: "소속 사무소·역할",
            value: membership
              ? `${membership.officeName} · ${MEMBER_ROLE_LABELS[membership.role] ?? membership.role}`
              : "승인된 소속 없음",
          },
          {
            label: "진행 중인 요청",
            value: pending
              ? `${PENDING_TYPE_LABELS[pending.type] ?? pending.type} (${pending.status})`
              : "없음",
          },
          {
            label: "로그인 방식",
            value: detail.loginMethods
              .map((method) => LOGIN_METHOD_LABELS[method] ?? method)
              .join(", "),
          },
          {
            label: "마지막 로그인",
            value: detail.lastLoginAt ? formatSeoulDateTime(detail.lastLoginAt) : "기록 없음",
          },
          ...(detail.loginLockedUntil
            ? [
                {
                  label: "로그인 잠금 해제 시각",
                  value: formatSeoulDateTime(detail.loginLockedUntil),
                },
              ]
            : []),
        ]}
      />
    </Card>
  );
}

function SecurityCard({ detail }: { detail: Detail }) {
  const [latest, ...older] = detail.securityEvents;
  return (
    <Card title="보안 사건 기록" tone="flat">
      {latest ? (
        <div className="flex flex-col gap-4">
          <section aria-label="최근 긴급 중단 기록">
            <h3 className="mb-2 text-body font-semibold text-ink">최근 긴급 중단 기록</h3>
            <EventSummary event={latest} />
          </section>
          {older.length > 0 ? (
            <ul className="flex flex-col gap-2" aria-label="이전 보안 사건">
              {older.map((event, index) => (
                <li key={`${event.occurredAt}-${index}`} className="text-body text-ink-2">
                  {formatSeoulDateTime(event.occurredAt)} ·{" "}
                  {SUSPEND_SCOPE_LABELS[event.scope] ?? event.scope} · {event.reason}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : (
        <p className="text-body text-ink-2">기록된 보안 사건이 없습니다.</p>
      )}
    </Card>
  );
}

function SessionsCard({ detail }: { detail: Detail }) {
  return (
    <Card title="활성 세션" tone="flat">
      {detail.sessions.length === 0 ? (
        <p className="text-body text-ink-2">활성 세션이 없습니다.</p>
      ) : (
        <table className="w-full text-left text-body">
          <caption className="sr-only">활성 세션 목록</caption>
          <thead>
            <tr className="border-b border-line text-caption text-ink-2">
              <th scope="col" className="py-2">
                시작
              </th>
              <th scope="col" className="py-2">
                마지막 요청
              </th>
              <th scope="col" className="py-2">
                기기
              </th>
            </tr>
          </thead>
          <tbody>
            {detail.sessions.map((session) => (
              <tr key={session.sessionId} className="border-b border-line">
                <td className="py-2">{formatSeoulDateTime(session.createdAt)}</td>
                <td className="py-2">{formatSeoulDateTime(session.lastSeenAt)}</td>
                <td className="py-2">{session.deviceSummary}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}

function MemberDetailBody({ detail }: { detail: Detail }) {
  const queryClient = useQueryClient();
  const canSuspend = useHasOpsRole(["SECURITY_ADMIN"]);
  const canBilling = useHasOpsRole(["BILLING"]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [doneMessage, setDoneMessage] = useState<string | null>(null);
  const membership = detail.currentMembership;

  return (
    <>
      {doneMessage ? (
        <p
          role="status"
          className="rounded-control border border-line bg-surface px-4 py-3 text-body text-ink"
        >
          {doneMessage}
        </p>
      ) : null}
      <AccountCard detail={detail} />
      <div className="flex flex-wrap items-center gap-3">
        {membership ? (
          <Link
            href={`/ops/offices/${membership.officeId}`}
            className="text-body font-semibold text-primary underline"
          >
            소속 사무소 상세
          </Link>
        ) : null}
        {canBilling ? (
          <Link href="/ops/billing" className="text-body font-semibold text-primary underline">
            결제·환불
          </Link>
        ) : null}
      </div>
      <SecurityCard detail={detail} />
      <SessionsCard detail={detail} />
      {canSuspend ? (
        <Card title="긴급 접근 중단" tone="flat">
          <p className="mb-4 text-body text-ink-2">
            계정 탈취 의심처럼 즉시 막아야 할 때 사용합니다. 중단하면 소속 사무소 대표에게 통지가
            나가고 감사 로그에 남습니다.
          </p>
          <Button variant="outlined" onClick={() => setIsDialogOpen(true)}>
            긴급 접근 중단
          </Button>
        </Card>
      ) : null}
      {isDialogOpen ? (
        <EmergencySuspendDialog
          userId={detail.userId}
          sessions={detail.sessions}
          onClose={() => setIsDialogOpen(false)}
          onDone={(result) => {
            setIsDialogOpen(false);
            setDoneMessage(
              `긴급 접근 중단을 실행했습니다. (${SUSPEND_SCOPE_LABELS[result.scope] ?? result.scope}, ${formatSeoulDateTime(result.suspendedAt)}) 소속 사무소 대표에게 통지가 나갑니다.`,
            );
            void queryClient.invalidateQueries({ queryKey: opsMemberKeys.detail(detail.userId) });
          }}
        />
      ) : null}
    </>
  );
}

function MemberDetailLoader({ userId }: { userId: number }) {
  const query = useQuery({
    queryKey: opsMemberKeys.detail(userId),
    queryFn: () => fetchMemberDetail(userId),
  });
  return (
    <QueryGate query={query} loadingLabel="회원 정보를 불러오는 중입니다.">
      {(detail) => <MemberDetailBody detail={detail} />}
    </QueryGate>
  );
}

export function MemberDetailScreen({ userId }: { userId: number }) {
  return (
    <OpsScreen
      title="회원 상세"
      roles={OPS_WORK_ROLES}
      actions={
        <Link href="/ops/members" className="text-body font-semibold text-primary underline">
          목록으로
        </Link>
      }
    >
      <MemberDetailLoader userId={userId} />
    </OpsScreen>
  );
}
