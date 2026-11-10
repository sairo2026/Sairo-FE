"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FormAlert, FormNotice } from "@/shared/components/feedback/form-frame";
import { useOfficeAccess } from "@/shared/session/office-access-context";
import type { MembershipDetailResponse } from "@/lib/api/contracts/office.schema";
import { QueryGate } from "@/shared/components/feedback/query-gate";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { ConfirmDialog, Modal } from "@/shared/components/ui/modal";
import { PageHeader } from "@/shared/components/ui/page-header";
import { SelectField } from "@/shared/components/ui/select-field";
import { formatSeoulDateTime } from "@/shared/lib/format";
import {
  reinstateMembership,
  revokeMembership,
  suspendMembership,
  updateMembershipRole,
} from "../api/office.api";
import { officeKeys, useMembershipDetail } from "../hooks/office-queries";
import {
  MEMBERSHIP_STATUS_LABEL,
  MEMBERSHIP_STATUS_TONE,
  REQUEST_SOURCE_LABEL,
  ROLE_LABEL,
  labelOf,
} from "../model/labels";
import { describeOfficeError } from "../model/messages";
import { validateReason } from "../model/validation";
import { DetailList, MutedNote, ReasonDialog, StatusBadge } from "./office-ui";

type Dialog = "role" | "suspend" | "reinstate" | "revoke" | null;

function yesNo(value: boolean | null | undefined) {
  if (value === null || value === undefined) return "-";
  return value ? "확인" : "미확인";
}

function MemberDetailBody({ detail }: { detail: MembershipDetailResponse }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isReadOnly } = useOfficeAccess();
  const [dialog, setDialog] = useState<Dialog>(null);
  const [role, setRole] = useState<"AGENT" | "DEPUTY">(
    detail.role === "DEPUTY" ? "DEPUTY" : "AGENT",
  );
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();

  const isOwnerTarget = detail.role === "OWNER";
  const isSuspended = detail.status === "SUSPENDED";
  const isApproved = detail.status === "APPROVED";
  const counts = detail.assignedCounts;

  async function refreshAll() {
    await queryClient.invalidateQueries({
      queryKey: officeKeys.membershipDetail(detail.membershipId),
    });
    await queryClient.invalidateQueries({ queryKey: officeKeys.memberships });
  }

  function handleError(caught: unknown, fallback: string) {
    setDialog(null);
    setError(describeOfficeError(caught, fallback));
  }

  const roleMutation = useMutation({
    mutationFn: () => updateMembershipRole(detail.membershipId, role, detail.version),
    onSuccess: async () => {
      setDialog(null);
      setNotice("역할을 변경했습니다.");
      await refreshAll();
    },
    onError: (caught) => handleError(caught, "역할을 변경하지 못했습니다. 다시 시도해 주세요."),
  });

  const suspendMutation = useMutation({
    mutationFn: (reason: string) => suspendMembership(detail.membershipId, reason),
    onSuccess: async () => {
      setDialog(null);
      setNotice("접근을 정지했습니다.");
      await refreshAll();
    },
    onError: (caught) => handleError(caught, "접근을 정지하지 못했습니다. 다시 시도해 주세요."),
  });

  const reinstateMutation = useMutation({
    mutationFn: () => reinstateMembership(detail.membershipId),
    onSuccess: async () => {
      setDialog(null);
      setNotice("접근 정지를 해제했습니다.");
      await refreshAll();
    },
    onError: (caught) => handleError(caught, "정지를 해제하지 못했습니다. 다시 시도해 주세요."),
  });

  const revokeMutation = useMutation({
    mutationFn: (reason: string) => revokeMembership(detail.membershipId, reason),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: officeKeys.memberships });
      router.push("/members");
    },
    onError: (caught) => handleError(caught, "내보내지 못했습니다. 다시 시도해 주세요."),
  });

  const handoverNote = (
    <>
      이 구성원이 맡던 진행 고객 {counts.customers}건, 매물 {counts.properties}건, 업무{" "}
      {counts.tasks}건, 계약 {counts.contracts}건의 담당은 대표에게 넘어갑니다.
      {counts.confirmedVisits > 0
        ? ` 확정된 방문 ${counts.confirmedVisits}건은 재조율 필요로 바뀝니다.`
        : ""}
    </>
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={detail.displayName}
        description="구성원의 역할을 바꾸거나 접근을 정지하거나 내보냅니다."
        actions={
          <Link
            href="/members"
            className="inline-flex h-9 items-center rounded-control border border-line px-3.5 text-caption text-ink-2 hover:border-primary hover:text-primary"
          >
            목록으로
          </Link>
        }
      />

      {notice ? <FormNotice>{notice}</FormNotice> : null}
      {error ? <FormAlert>{error}</FormAlert> : null}

      <Card title="구성원 정보">
        <DetailList
          items={[
            { label: "역할", value: labelOf(ROLE_LABEL, detail.role) },
            {
              label: "접근 상태",
              value: (
                <StatusBadge
                  tone={MEMBERSHIP_STATUS_TONE[detail.status]}
                  label={MEMBERSHIP_STATUS_LABEL[detail.status]}
                />
              ),
            },
            { label: "참여 경로", value: labelOf(REQUEST_SOURCE_LABEL, detail.requestSource) },
            { label: "자격번호", value: detail.qualificationNumber ?? "-" },
            { label: "고용신고 확인", value: yesNo(detail.employmentReportConfirmed) },
            { label: "교육 이수 확인", value: yesNo(detail.trainingConfirmed) },
            { label: "과금 대상", value: detail.billable ? "대상" : "아님" },
            {
              label: "승인 시각",
              value: detail.approvedAt ? formatSeoulDateTime(detail.approvedAt) : "-",
            },
          ]}
        />
      </Card>

      <Card title="넘어갈 담당 업무">
        <div className="flex flex-col gap-3">
          <DetailList
            items={[
              { label: "진행 고객", value: `${counts.customers}건` },
              { label: "매물", value: `${counts.properties}건` },
              { label: "업무", value: `${counts.tasks}건` },
              { label: "계약", value: `${counts.contracts}건` },
              { label: "확정된 방문", value: `${counts.confirmedVisits}건` },
            ]}
          />
          <MutedNote>{handoverNote}</MutedNote>
        </div>
      </Card>

      {isOwnerTarget ? (
        <p
          role="status"
          className="rounded-control bg-primary-soft px-4 py-3 text-caption text-ink-2"
        >
          사무소의 대표는 강등하거나 내보낼 수 없습니다. 대표를 바꾸려면 대표 이전을 진행해 주세요.{" "}
          <Link
            href="/members/owner-transfer"
            className="font-semibold text-primary hover:underline"
          >
            대표 이전
          </Link>
        </p>
      ) : null}

      {!isOwnerTarget && !isReadOnly ? (
        <div className="flex flex-wrap gap-3">
          {isApproved ? (
            <Button variant="outlined" onClick={() => setDialog("role")}>
              역할 변경
            </Button>
          ) : null}
          {isApproved ? (
            <Button variant="outlined" onClick={() => setDialog("suspend")}>
              접근 정지
            </Button>
          ) : null}
          {isSuspended ? (
            <Button variant="outlined" onClick={() => setDialog("reinstate")}>
              정지 해제
            </Button>
          ) : null}
          {isApproved || isSuspended ? (
            <Button variant="cancel" onClick={() => setDialog("revoke")}>
              내보내기
            </Button>
          ) : null}
        </div>
      ) : null}

      <Modal
        isOpen={dialog === "role"}
        title="역할 변경"
        onClose={() => setDialog(null)}
        footer={
          <>
            <Button
              variant="cancel"
              disabled={roleMutation.isPending}
              onClick={() => setDialog(null)}
            >
              취소
            </Button>
            <Button
              isLoading={roleMutation.isPending}
              disabled={role === detail.role}
              onClick={() => roleMutation.mutate()}
            >
              변경
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <SelectField
            label="새 역할"
            value={role}
            options={[
              { value: "AGENT", label: ROLE_LABEL.AGENT },
              { value: "DEPUTY", label: ROLE_LABEL.DEPUTY },
            ]}
            onValueChange={(next) => setRole(next === "DEPUTY" ? "DEPUTY" : "AGENT")}
          />
          <MutedNote>
            역할을 바꾸기 전에 본인 확인을 한 번 더 합니다. 변경에는 사유가 필요하지 않습니다.
          </MutedNote>
          <MutedNote>{handoverNote}</MutedNote>
        </div>
      </Modal>

      <ReasonDialog
        isOpen={dialog === "suspend"}
        title="접근 정지"
        description={`정지하면 즉시 사무소 데이터를 볼 수 없습니다. ${counts.confirmedVisits > 0 ? `확정된 방문 ${counts.confirmedVisits}건은 재조율 필요로 바뀝니다.` : ""}`}
        confirmLabel="정지"
        isPending={suspendMutation.isPending}
        validate={(value) => validateReason(value)}
        onConfirm={(reason) => suspendMutation.mutate(reason)}
        onClose={() => setDialog(null)}
      />

      <ReasonDialog
        isOpen={dialog === "revoke"}
        title="구성원 내보내기"
        description="내보내기 전에 본인 확인을 한 번 더 합니다. 내보낸 구성원은 사무소 데이터를 볼 수 없습니다."
        confirmLabel="내보내기"
        isPending={revokeMutation.isPending}
        validate={(value) => validateReason(value)}
        onConfirm={(reason) => revokeMutation.mutate(reason)}
        onClose={() => setDialog(null)}
      />

      <ConfirmDialog
        isOpen={dialog === "reinstate"}
        title="접근 정지를 해제할까요"
        message="해제하면 이 구성원이 다시 사무소 데이터를 볼 수 있습니다."
        confirmLabel="해제"
        isPending={reinstateMutation.isPending}
        onConfirm={() => reinstateMutation.mutate()}
        onCancel={() => setDialog(null)}
      />
    </div>
  );
}

export function MemberDetailScreen({ membershipId }: { membershipId: number }) {
  const query = useMembershipDetail(membershipId);
  return (
    <QueryGate query={query} loadingLabel="구성원 정보를 불러오는 중입니다.">
      {(detail) => <MemberDetailBody detail={detail} />}
    </QueryGate>
  );
}
