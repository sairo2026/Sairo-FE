"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { FormAlert, FormNotice } from "@/shared/components/feedback/form-frame";
import { useOfficeAccess } from "@/shared/session/office-access-context";
import type { OfficeMembershipListResponse } from "@/lib/api/contracts/office.schema";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { DataTable } from "@/shared/components/ui/data-table";
import type { PageSize } from "@/shared/components/ui/data-table";
import { PageHeader } from "@/shared/components/ui/page-header";
import { SelectField } from "@/shared/components/ui/select-field";
import { TextField } from "@/shared/components/ui/text-field";
import { formatSeoulDateTime } from "@/shared/lib/format";
import {
  approveMembership,
  cancelInvitation,
  inviteMember,
  rejectMembership,
  resendInvitation,
} from "../api/office.api";
import { officeKeys, useMemberships } from "../hooks/office-queries";
import { REQUEST_SOURCE_LABEL, ROLE_LABEL, labelOf } from "../model/labels";
import { describeOfficeError, fieldErrorMap } from "../model/messages";
import { validateInvite, validateReason } from "../model/validation";
import { MutedNote, ReasonDialog } from "@/shared/components/feedback/page-parts";

type PendingRow = OfficeMembershipListResponse["items"][number];

function yesNo(value: boolean | null | undefined) {
  if (value === null || value === undefined) return "-";
  return value ? "확인" : "미확인";
}

function InviteForm() {
  const queryClient = useQueryClient();
  const { isReadOnly } = useOfficeAccess();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [formError, setFormError] = useState<string>();
  const [notice, setNotice] = useState<string>();

  const mutation = useMutation({
    mutationFn: () => inviteMember({ email: email.trim(), role: role as "AGENT" | "DEPUTY" }),
    onSuccess: async (result) => {
      setNotice(
        `초대를 보냈습니다. ${formatSeoulDateTime(result.expiresAt)}까지 수락할 수 있습니다.`,
      );
      setEmail("");
      setRole("");
      await queryClient.invalidateQueries({ queryKey: officeKeys.memberships });
    },
    onError: (caught) => {
      setErrors(fieldErrorMap(caught));
      setFormError(describeOfficeError(caught, "초대를 보내지 못했습니다. 다시 시도해 주세요."));
    },
  });

  function submit() {
    setNotice(undefined);
    setFormError(undefined);
    const problems = validateInvite({ email, role });
    setErrors(problems);
    if (Object.keys(problems).length > 0) return;
    mutation.mutate();
  }

  return (
    <Card title="구성원 초대">
      <form
        noValidate
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <MutedNote>
          사이로에 가입한 이메일만 초대할 수 있습니다. 초대는 발송 후 7일 안에 수락해야 하며
          취소하거나 다시 보낼 수 있습니다. 초대받은 분이 수락하면 사무소 대표가 그 분의 이름과
          역할, 자격 확인 상태를 볼 수 있습니다.
        </MutedNote>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="초대할 이메일"
            value={email}
            onValueChange={(next) => {
              setEmail(next);
              setErrors((current) => ({ ...current, email: undefined }));
            }}
            inputMode="email"
            placeholder="email@email.com"
            error={errors.email}
          />
          <SelectField
            label="역할"
            value={role}
            placeholder="선택해 주세요"
            options={[
              { value: "AGENT", label: ROLE_LABEL.AGENT },
              { value: "DEPUTY", label: ROLE_LABEL.DEPUTY },
            ]}
            onValueChange={(next) => {
              setRole(next);
              setErrors((current) => ({ ...current, role: undefined }));
            }}
            error={errors.role}
          />
        </div>
        {notice ? <FormNotice>{notice}</FormNotice> : null}
        {formError ? <FormAlert>{formError}</FormAlert> : null}
        <div>
          <Button type="submit" isLoading={mutation.isPending} disabled={isReadOnly}>
            초대 보내기
          </Button>
        </div>
      </form>
    </Card>
  );
}

function PendingTable() {
  const queryClient = useQueryClient();
  const { isReadOnly } = useOfficeAccess();
  const [page, setPage] = useState(1);
  const [size, setSize] = useState<PageSize>(25);
  const query = useMemberships({ status: "PENDING", page: page - 1, size });
  const [rejecting, setRejecting] = useState<PendingRow | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: officeKeys.memberships });
  }

  const approve = useMutation({
    mutationFn: (id: number) => approveMembership(id),
    onMutate: (id) => setBusyId(id),
    onSuccess: async () => {
      setNotice("참여를 승인했습니다.");
      await refresh();
    },
    onError: async (caught) => {
      setError(describeOfficeError(caught, "승인하지 못했습니다. 다시 시도해 주세요."));
      await refresh();
    },
    onSettled: () => setBusyId(null),
  });

  const reject = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) => rejectMembership(id, reason),
    onSuccess: async () => {
      setRejecting(null);
      setNotice("참여 요청을 거절했습니다.");
      await refresh();
    },
    onError: async (caught) => {
      setRejecting(null);
      setError(describeOfficeError(caught, "거절하지 못했습니다. 다시 시도해 주세요."));
      await refresh();
    },
  });

  const cancel = useMutation({
    mutationFn: (id: number) => cancelInvitation(id),
    onMutate: (id) => setBusyId(id),
    onSuccess: async () => {
      setNotice("초대를 취소했습니다.");
      await refresh();
    },
    onError: async (caught) => {
      setError(describeOfficeError(caught, "초대를 취소하지 못했습니다. 다시 시도해 주세요."));
      await refresh();
    },
    onSettled: () => setBusyId(null),
  });

  const resend = useMutation({
    mutationFn: (id: number) => resendInvitation(id),
    onMutate: (id) => setBusyId(id),
    onSuccess: async (result) => {
      setNotice(
        `초대를 다시 보냈습니다. ${formatSeoulDateTime(result.expiresAt)}까지 수락할 수 있습니다.`,
      );
      await refresh();
    },
    onError: (caught) =>
      setError(describeOfficeError(caught, "초대를 다시 보내지 못했습니다. 다시 시도해 주세요.")),
    onSettled: () => setBusyId(null),
  });

  return (
    <div className="flex flex-col gap-4">
      {notice ? <FormNotice>{notice}</FormNotice> : null}
      {error ? <FormAlert>{error}</FormAlert> : null}
      <DataTable
        caption="승인 대기 목록"
        rows={query.data?.items ?? []}
        getRowId={(row) => String(row.membershipId)}
        totalCount={query.data?.totalElements ?? 0}
        page={page}
        pageSize={size}
        onPageChange={setPage}
        onPageSizeChange={(next) => {
          setSize(next);
          setPage(1);
        }}
        isLoading={query.isPending}
        errorMessage={query.isError ? "승인 대기 목록을 불러오지 못했습니다." : undefined}
        onRetry={() => void query.refetch()}
        emptyMessage="승인을 기다리는 참여 요청이나 초대가 없습니다."
        columns={[
          { key: "name", header: "이름", render: (row) => row.displayName },
          { key: "role", header: "역할", render: (row) => labelOf(ROLE_LABEL, row.role) },
          {
            key: "source",
            header: "경로",
            render: (row) => labelOf(REQUEST_SOURCE_LABEL, row.requestSource),
          },
          {
            key: "expires",
            header: "만료 시각",
            render: (row) => (row.expiresAt ? formatSeoulDateTime(row.expiresAt) : "-"),
          },
          {
            key: "qualification",
            header: "자격번호",
            render: (row) => row.qualificationNumber ?? "-",
          },
          {
            key: "employment",
            header: "고용신고",
            render: (row) => yesNo(row.employmentReportConfirmed),
          },
          { key: "training", header: "교육 이수", render: (row) => yesNo(row.trainingConfirmed) },
          {
            key: "actions",
            header: "처리",
            render: (row) => {
              const isInvite = row.requestSource === "INVITE";
              const waitingAcceptance = isInvite && !row.invitationAcceptedAt;
              const busy = busyId === row.membershipId;
              return (
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    disabled={isReadOnly || waitingAcceptance}
                    isLoading={busy && approve.isPending}
                    aria-label={`${row.displayName} 승인`}
                    onClick={() => {
                      setError(undefined);
                      setNotice(undefined);
                      approve.mutate(row.membershipId);
                    }}
                  >
                    승인
                  </Button>
                  <Button
                    size="sm"
                    variant="cancel"
                    disabled={isReadOnly || waitingAcceptance}
                    aria-label={`${row.displayName} 거절`}
                    onClick={() => {
                      setError(undefined);
                      setNotice(undefined);
                      setRejecting(row);
                    }}
                  >
                    거절
                  </Button>
                  {isInvite ? (
                    <>
                      <Button
                        size="sm"
                        variant="outlined"
                        disabled={isReadOnly}
                        isLoading={busy && resend.isPending}
                        aria-label={`${row.displayName} 초대 재발송`}
                        onClick={() => {
                          setError(undefined);
                          setNotice(undefined);
                          resend.mutate(row.membershipId);
                        }}
                      >
                        재발송
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={isReadOnly}
                        isLoading={busy && cancel.isPending}
                        aria-label={`${row.displayName} 초대 취소`}
                        onClick={() => {
                          setError(undefined);
                          setNotice(undefined);
                          cancel.mutate(row.membershipId);
                        }}
                      >
                        초대 취소
                      </Button>
                    </>
                  ) : null}
                </div>
              );
            },
          },
        ]}
      />
      <ReasonDialog
        isOpen={rejecting !== null}
        title="참여 요청 거절"
        description={rejecting ? `${rejecting.displayName}님의 참여 요청을 거절합니다.` : undefined}
        label="거절 사유"
        confirmLabel="거절"
        isPending={reject.isPending}
        validate={(value) => validateReason(value, "거절 사유")}
        onConfirm={(reason) => rejecting && reject.mutate({ id: rejecting.membershipId, reason })}
        onClose={() => setRejecting(null)}
      />
    </div>
  );
}

export function MemberRequestsScreen() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="참여 요청·초대"
        description="구성원을 초대하고 참여 요청을 승인하거나 거절합니다."
        actions={
          <Link
            href="/members"
            className="inline-flex h-9 items-center rounded-control border border-line px-3.5 text-caption text-ink-2 hover:border-primary hover:text-primary"
          >
            구성원 목록
          </Link>
        }
      />
      <MutedNote>
        가입 신청은 요청 후 30일, 초대는 발송 후 7일까지 유효하며 재발송하면 만료일이 7일로 다시
        계산됩니다. 초대는 대상자가 수락하기 전에는 승인할 수 없습니다.
      </MutedNote>
      <InviteForm />
      <Card title="승인 대기">
        <PendingTable />
      </Card>
    </div>
  );
}
