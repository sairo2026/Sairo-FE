"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { ApproverPortalApprovalListResponse } from "@/lib/api/contracts/visit.schema";
import { ApiError } from "@/shared/api/client";
import { toErrorScreenKind } from "@/shared/api/error-kind";
import { EmptyState } from "@/shared/components/feedback/empty-state";
import { ErrorScreen } from "@/shared/components/feedback/error-screen";
import { FormAlert, FormNotice } from "@/shared/components/feedback/form-frame";
import { PageSkeleton } from "@/shared/components/feedback/skeleton";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { Modal } from "@/shared/components/ui/modal";
import { PageHeader } from "@/shared/components/ui/page-header";
import { Checkbox } from "@/shared/components/ui/select-field";
import { formatSeoulDate, formatSeoulDateTime } from "@/shared/lib/format";
import {
  closeApproverProfile,
  decideApprovalLink,
  logoutApprover,
  unlinkApproval,
} from "../api/review.api";
import { reviewKeys, useApproverProfile, usePortalApprovals } from "../hooks/review-queries";
import { APPROVER_TYPE_LABEL, labelOf } from "../model/labels";
import { describeVisitError, isApiCode } from "../model/messages";
import { ApproverOtpForm } from "./approver-otp";
import { ApproverPrivacyNotice } from "./approver-privacy-notice";

type PortalItem = ApproverPortalApprovalListResponse["items"][number];

export const BULK_MAX = 20;

export function SessionExpiredScreen() {
  return (
    <ErrorScreen
      kind="unauthenticated"
      title="로그인이 만료되었습니다"
      description="번호 인증으로 다시 로그인해 주세요."
      actions={
        <Link
          href="/approver/account/login"
          className="font-semibold text-primary underline hover:text-primary-hover active:text-primary-pressed"
        >
          로그인으로 이동
        </Link>
      }
    />
  );
}

function ApprovalCard({
  item,
  selected,
  onToggle,
  onUnlink,
}: {
  item: PortalItem;
  selected: boolean;
  onToggle: () => void;
  onUnlink: () => void;
}) {
  const name = item.propertyDisplayName ?? item.propertyAddress ?? `출입승인 ${item.approvalId}`;
  const isPrimary = item.approvalRole === "PRIMARY";
  return (
    <li className="flex flex-col gap-2 rounded-card-flat border border-line bg-white px-5 py-4">
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href={`/approver/account/approvals/${item.approvalId}`}
          className="text-body font-semibold text-ink hover:text-primary hover:underline"
        >
          {name}
        </Link>
        <Badge tone={isPrimary ? "blue" : "gray"} className="h-8 min-w-0 px-3 text-caption">
          {isPrimary ? "대표 승인자" : "공동 승인자"}
        </Badge>
        {item.pendingRequestCount > 0 ? (
          <Badge tone="amber" className="h-8 min-w-0 px-3 text-caption">
            신청 대기 {item.pendingRequestCount}건
          </Badge>
        ) : null}
        {item.approvalActive ? null : (
          <Badge tone="gray" className="h-8 min-w-0 px-3 text-caption">
            종료된 출입승인
          </Badge>
        )}
      </div>
      <dl className="grid grid-cols-1 gap-1 text-caption text-ink-2 sm:grid-cols-2">
        <div>주소: {item.propertyAddress ?? item.propertyRegion}</div>
        <div>승인자 유형: {labelOf(APPROVER_TYPE_LABEL, item.approverType)}</div>
        <div>
          매물을 가진 사무소: {item.ownerOfficeName}
          {item.officeContactPhone ? ` · ${item.officeContactPhone}` : ""}
        </div>
        <div>
          출입승인 유효기간: {formatSeoulDate(item.approvalValidFrom)} ~{" "}
          {formatSeoulDate(item.approvalValidUntil)}
        </div>
        <div>
          활성 조건:{" "}
          {item.activeConditionVersionNo
            ? `${item.activeConditionVersionNo}번 버전${
                item.conditionAppliesUntil
                  ? ` · 적용 종료 ${formatSeoulDate(item.conditionAppliesUntil)}`
                  : ""
              }`
            : "등록 전"}
        </div>
        <div>
          다가오는 확정 방문 {item.upcomingConfirmedVisitCount}건
          {item.nextConfirmedVisitAt
            ? ` · 다음 ${formatSeoulDateTime(item.nextConfirmedVisitAt)}`
            : ""}
        </div>
      </dl>
      <div className="flex flex-wrap items-center gap-3">
        {isPrimary && item.approvalActive ? (
          <Checkbox
            label={`${name} 일괄 적용 선택`}
            checked={selected}
            onCheckedChange={onToggle}
          />
        ) : null}
        <Button size="sm" variant="ghost" aria-label={`${name} 연결 해제`} onClick={onUnlink}>
          연결 해제
        </Button>
      </div>
    </li>
  );
}

function CloseSection() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string>();
  const [needReauth, setNeedReauth] = useState(false);
  const close = useMutation({
    mutationFn: closeApproverProfile,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: reviewKeys.portal });
      router.push("/approver/account/login");
    },
    onError: (caught) => {
      if (isApiCode(caught, "STEP_UP_REQUIRED")) {
        setNeedReauth(true);
        setError(undefined);
        return;
      }
      setError(describeVisitError(caught, "계정을 해지하지 못했습니다. 다시 시도해 주세요."));
    },
  });
  return (
    <Card title="계정 해지">
      <div className="flex flex-col gap-3">
        <p className="text-caption text-ink-2">
          해지하면 번호 정보와 모든 연결이 지워집니다. 유효한 링크가 있으면 링크 방식은 계속 쓸 수
          있고, 사무소가 보유한 승인자 이름과 연락처는 지워지지 않습니다.
        </p>
        <Checkbox
          label="위 내용을 확인했고 계정을 해지합니다"
          checked={confirmed}
          onCheckedChange={setConfirmed}
        />
        {error ? <FormAlert>{error}</FormAlert> : null}
        {needReauth ? (
          <div className="flex flex-col gap-3">
            <FormNotice>해지하려면 10분 안에 번호 인증으로 다시 확인해야 합니다.</FormNotice>
            <ApproverOtpForm
              purpose="REAUTH"
              submitLabel="다시 인증하고 해지"
              onVerified={() => {
                setNeedReauth(false);
                close.mutate();
              }}
            />
          </div>
        ) : (
          <div>
            <Button
              variant="outlined"
              disabled={!confirmed}
              isLoading={close.isPending}
              onClick={() => close.mutate()}
            >
              계정 해지
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}

export function ApproverAccountScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const query = usePortalApprovals();
  const profile = useApproverProfile();
  const [selected, setSelected] = useState<number[]>([]);
  const [unlinkTarget, setUnlinkTarget] = useState<PortalItem>();
  const [error, setError] = useState<string>();

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: reviewKeys.portal });
    await queryClient.invalidateQueries({ queryKey: reviewKeys.profile });
  }

  const decide = useMutation({
    mutationFn: (input: { approvalId: number; decision: "ACCEPT" | "REJECT" }) =>
      decideApprovalLink(input.approvalId, input.decision),
    onSuccess: async () => {
      setError(undefined);
      await refresh();
    },
    onError: async (caught) => {
      setError(describeVisitError(caught, "연결 제안을 처리하지 못했습니다. 다시 시도해 주세요."));
      await refresh();
    },
  });

  const unlink = useMutation({
    mutationFn: (approvalId: number) => unlinkApproval(approvalId),
    onSuccess: async (_, approvalId) => {
      setUnlinkTarget(undefined);
      setSelected((current) => current.filter((id) => id !== approvalId));
      await refresh();
    },
    onError: (caught) => {
      setUnlinkTarget(undefined);
      setError(describeVisitError(caught, "연결을 해제하지 못했습니다. 다시 시도해 주세요."));
    },
  });

  const logout = useMutation({
    mutationFn: logoutApprover,
    onSuccess: async () => {
      queryClient.removeQueries({ queryKey: ["visit", "review", "portal"] });
      router.push("/approver/account/login");
    },
    onError: (caught) =>
      setError(describeVisitError(caught, "로그아웃하지 못했습니다. 다시 시도해 주세요.")),
  });

  if (query.isPending) return <PageSkeleton label="연결된 매물을 불러오는 중입니다." />;
  if (query.isError) {
    const failure = query.error;
    if (failure instanceof ApiError && failure.status === 401) return <SessionExpiredScreen />;
    return (
      <ErrorScreen
        kind={toErrorScreenKind(failure)}
        traceId={failure instanceof ApiError ? failure.traceId : undefined}
        retryAfterSeconds={failure instanceof ApiError ? failure.retryAfterSeconds : undefined}
        onRetry={() => void query.refetch()}
      />
    );
  }

  const proposals = query.data.items.filter((item) => item.linkState === "PENDING_CONFIRM");
  const linked = query.data.items.filter((item) => item.linkState === "LINKED");

  function toggle(approvalId: number) {
    setSelected((current) => {
      if (current.includes(approvalId)) return current.filter((id) => id !== approvalId);
      if (current.length >= BULK_MAX) return current;
      return [...current, approvalId];
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="내 매물 모아보기"
        description={
          profile.data
            ? `${profile.data.maskedPhone} 계정 · 연결 ${profile.data.linkedApprovalCount}건`
            : "연결된 출입승인의 링크와 신청·확정 일정을 한 화면에서 봅니다."
        }
        actions={
          <Button variant="ghost" isLoading={logout.isPending} onClick={() => logout.mutate()}>
            로그아웃
          </Button>
        }
      />
      {error ? <FormAlert>{error}</FormAlert> : null}
      {proposals.length > 0 ? (
        <section aria-label="연결 제안" className="flex flex-col gap-3">
          <h2 className="text-h2 font-semibold text-ink">연결 제안</h2>
          <ul className="flex flex-col gap-2">
            {proposals.map((item) => (
              <li
                key={item.approvalId}
                className="flex flex-wrap items-center justify-between gap-2 rounded-card-flat border border-line bg-white px-5 py-3"
              >
                <span className="text-body text-ink">
                  {item.ownerOfficeName} · {item.propertyRegion}
                </span>
                <span className="flex gap-2">
                  <Button
                    size="sm"
                    isLoading={decide.isPending && decide.variables?.approvalId === item.approvalId}
                    aria-label={`${item.ownerOfficeName} 연결 수락`}
                    onClick={() =>
                      decide.mutate({ approvalId: item.approvalId, decision: "ACCEPT" })
                    }
                  >
                    수락
                  </Button>
                  <Button
                    size="sm"
                    variant="cancel"
                    aria-label={`${item.ownerOfficeName} 연결 거절`}
                    onClick={() =>
                      decide.mutate({ approvalId: item.approvalId, decision: "REJECT" })
                    }
                  >
                    거절
                  </Button>
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <section aria-label="연결된 매물" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-h2 font-semibold text-ink">연결된 매물 {linked.length}개</h2>
          {selected.length > 0 ? (
            <Link
              href={`/approver/account/bulk?ids=${selected.join(",")}`}
              className="inline-flex h-10 items-center rounded-control bg-primary px-4 text-caption font-bold text-white hover:bg-primary-hover active:bg-primary-pressed"
            >
              선택한 {selected.length}개에 조건 일괄 적용
            </Link>
          ) : null}
        </div>
        {linked.length === 0 ? (
          <EmptyState
            title="연결된 매물이 없습니다"
            description="링크에서 계정을 만들거나 사무소의 연결 제안을 수락하면 이곳에 나타납니다."
          />
        ) : (
          <ul className="flex flex-col gap-3">
            {linked.map((item) => (
              <ApprovalCard
                key={item.approvalId}
                item={item}
                selected={selected.includes(item.approvalId)}
                onToggle={() => toggle(item.approvalId)}
                onUnlink={() => setUnlinkTarget(item)}
              />
            ))}
          </ul>
        )}
        <Link
          href="/approver/account/bulk"
          className="text-caption font-semibold text-primary underline hover:text-primary-hover active:text-primary-pressed"
        >
          조건 일괄 적용으로 이동
        </Link>
      </section>
      <CloseSection />
      <ApproverPrivacyNotice retentionDays={query.data.privacyNotice.retentionDays} />
      <Modal
        isOpen={unlinkTarget !== undefined}
        title="연결을 해제할까요"
        onClose={() => setUnlinkTarget(undefined)}
        footer={
          <>
            <Button variant="cancel" onClick={() => setUnlinkTarget(undefined)}>
              취소
            </Button>
            <Button
              isLoading={unlink.isPending}
              onClick={() => unlinkTarget && unlink.mutate(unlinkTarget.approvalId)}
            >
              연결 해제
            </Button>
          </>
        }
      >
        해제한 출입승인은 다시 제안되지 않습니다. 링크가 유효하면 링크로는 계속 사용할 수 있습니다.
      </Modal>
    </div>
  );
}
