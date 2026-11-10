"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { FormAlert, FormNotice } from "@/shared/components/feedback/form-frame";
import { useOfficeAccess } from "@/shared/session/office-access-context";
import type {
  EmploymentRosterListResponse,
  OfficeMembershipListResponse,
} from "@/lib/api/contracts/office.schema";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { DataTable } from "@/shared/components/ui/data-table";
import type { PageSize } from "@/shared/components/ui/data-table";
import { Modal } from "@/shared/components/ui/modal";
import { PageHeader } from "@/shared/components/ui/page-header";
import { SelectField } from "@/shared/components/ui/select-field";
import { Tabs } from "@/shared/components/ui/tabs";
import { TextField } from "@/shared/components/ui/text-field";
import { formatSeoulDate } from "@/shared/lib/format";
import { MEMBERSHIP_NOTICE_COPY } from "../model/legal-copy";
import { createRosterItem, updateRosterItem } from "../api/office.api";
import { officeKeys, useMemberships, useRoster } from "../hooks/office-queries";
import {
  CONFIRMATION_SOURCE_LABEL,
  MEMBERSHIP_STATUS_LABEL,
  MEMBERSHIP_STATUS_TONE,
  ROLE_LABEL,
  labelOf,
} from "../model/labels";
import { describeOfficeError, fieldErrorMap } from "../model/messages";
import { validateRoster } from "../model/validation";
import type { RosterField } from "../model/validation";
import { MutedNote } from "@/shared/components/feedback/page-parts";

const LINK_CLASS =
  "inline-flex h-9 items-center rounded-control border border-line px-3.5 text-caption text-ink-2 hover:border-primary hover:text-primary";

function yesNo(value: boolean | null | undefined): string {
  if (value === null || value === undefined) return "-";
  return value ? "확인" : "미확인";
}

function billableLabel(value: boolean | null | undefined): string {
  if (value === null || value === undefined) return "-";
  return value ? "대상" : "아님";
}

export function QuotaBanner() {
  const query = useRoster(0, 25);
  if (!query.data) return null;
  const { quota } = query.data;
  return (
    <div
      role={quota.exceeded ? "alert" : "status"}
      className={
        quota.exceeded
          ? "rounded-control bg-tag-red px-4 py-3 text-caption text-tag-red-ink"
          : "rounded-control bg-primary-soft px-4 py-3 text-caption text-ink-2"
      }
    >
      <p>
        중개보조원 {quota.deputyCount}명 / 한도 {quota.deputyLimit}명 (개업공인중개사와
        소속공인중개사 {quota.qualifiedCount}명의 5배)
      </p>
      {quota.exceeded ? (
        <p className="mt-1 font-semibold">
          한도를 넘었습니다. 시정하기 전까지 모든 중개보조원의 신규 방문 업무와 확정이 제한됩니다.
          고용명부를 확인해 주세요.
        </p>
      ) : null}
    </div>
  );
}

function useTableState() {
  const [page, setPage] = useState(1);
  const [size, setSize] = useState<PageSize>(25);
  return {
    page,
    size,
    setPage,
    setSize: (next: PageSize) => {
      setSize(next);
      setPage(1);
    },
  };
}

function MemberListTab({ status, isOwner }: { status?: "SUSPENDED"; isOwner: boolean }) {
  const table = useTableState();
  const query = useMemberships({ status, page: table.page - 1, size: table.size });
  const base = [
    { key: "name", header: "이름", render: (row: MemberRow) => row.displayName },
    { key: "role", header: "역할", render: (row: MemberRow) => labelOf(ROLE_LABEL, row.role) },
  ];
  const ownerColumns = [
    {
      key: "qualification",
      header: "자격번호",
      render: (row: MemberRow) => row.qualificationNumber ?? "-",
    },
    {
      key: "employment",
      header: "고용신고 확인",
      render: (row: MemberRow) => yesNo(row.employmentReportConfirmed),
    },
    {
      key: "training",
      header: "교육 이수 확인",
      render: (row: MemberRow) => yesNo(row.trainingConfirmed),
    },
    {
      key: "status",
      header: "접근 상태",
      render: (row: MemberRow) => (
        <Badge tone={MEMBERSHIP_STATUS_TONE[row.status]}>
          {row.status === "APPROVED" ? "정상" : MEMBERSHIP_STATUS_LABEL[row.status]}
        </Badge>
      ),
    },
    {
      key: "billable",
      header: "과금 대상",
      render: (row: MemberRow) => billableLabel(row.billable),
    },
    {
      key: "detail",
      header: "관리",
      render: (row: MemberRow) => (
        <Link
          href={`/members/${row.membershipId}`}
          className="text-caption font-semibold text-primary hover:underline"
          aria-label={`${row.displayName} 상세`}
        >
          상세
        </Link>
      ),
    },
  ];
  return (
    <DataTable
      caption={status === "SUSPENDED" ? "접근 정지 구성원 목록" : "구성원 목록"}
      columns={isOwner ? [...base, ...ownerColumns] : base}
      rows={query.data?.items ?? []}
      getRowId={(row) => String(row.membershipId)}
      totalCount={query.data?.totalElements ?? 0}
      page={table.page}
      pageSize={table.size}
      onPageChange={table.setPage}
      onPageSizeChange={table.setSize}
      isLoading={query.isPending}
      errorMessage={query.isError ? "구성원 목록을 불러오지 못했습니다." : undefined}
      onRetry={() => void query.refetch()}
      emptyMessage={
        status === "SUSPENDED" ? "접근이 정지된 구성원이 없습니다." : "구성원이 없습니다."
      }
    />
  );
}

type MemberRow = OfficeMembershipListResponse["items"][number];
type RosterRow = EmploymentRosterListResponse["items"][number];

function RosterCreateDialog({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [personName, setPersonName] = useState("");
  const [legalQualification, setLegalQualification] = useState("");
  const [employmentStartDate, setEmploymentStartDate] = useState("");
  const [confirmationSource, setConfirmationSource] = useState("");
  const [errors, setErrors] = useState<Partial<Record<RosterField, string>>>({});
  const [formError, setFormError] = useState<string>();

  const mutation = useMutation({
    mutationFn: () =>
      createRosterItem({
        personName: personName.trim(),
        legalQualification: legalQualification as "AGENT" | "DEPUTY",
        employmentStartDate,
        confirmationSource: confirmationSource as "REGISTRATION_DOC" | "MANUAL_ENTRY",
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: officeKeys.roster });
      reset();
      onClose();
    },
    onError: (caught) => {
      setErrors(fieldErrorMap(caught));
      setFormError(
        describeOfficeError(caught, "고용명부에 추가하지 못했습니다. 다시 시도해 주세요."),
      );
    },
  });

  function reset() {
    setPersonName("");
    setLegalQualification("");
    setEmploymentStartDate("");
    setConfirmationSource("");
    setErrors({});
    setFormError(undefined);
  }

  function submit() {
    setFormError(undefined);
    const problems = validateRoster({
      personName,
      legalQualification,
      employmentStartDate,
      confirmationSource,
    });
    setErrors(problems);
    if (Object.keys(problems).length > 0) return;
    mutation.mutate();
  }

  return (
    <Modal
      isOpen={isOpen}
      title="고용명부 항목 추가"
      onClose={() => {
        reset();
        onClose();
      }}
      footer={
        <>
          <Button
            variant="cancel"
            disabled={mutation.isPending}
            onClick={() => {
              reset();
              onClose();
            }}
          >
            취소
          </Button>
          <Button isLoading={mutation.isPending} onClick={submit}>
            추가
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <TextField
          label="이름"
          value={personName}
          onValueChange={(next) => {
            setPersonName(next);
            setErrors((current) => ({ ...current, personName: undefined }));
          }}
          error={errors.personName}
          maxLength={50}
        />
        <SelectField
          label="법적 신분"
          value={legalQualification}
          placeholder="선택해 주세요"
          options={[
            { value: "AGENT", label: ROLE_LABEL.AGENT },
            { value: "DEPUTY", label: ROLE_LABEL.DEPUTY },
          ]}
          onValueChange={(next) => {
            setLegalQualification(next);
            setErrors((current) => ({ ...current, legalQualification: undefined }));
          }}
          error={errors.legalQualification}
        />
        <label className="flex flex-col gap-2 text-caption font-semibold text-ink">
          업무개시일
          <input
            type="date"
            value={employmentStartDate}
            onChange={(event) => {
              setEmploymentStartDate(event.target.value);
              setErrors((current) => ({ ...current, employmentStartDate: undefined }));
            }}
            aria-invalid={errors.employmentStartDate ? true : undefined}
            className="h-14 rounded-control border border-line bg-surface px-4 text-body font-medium text-ink"
          />
          {errors.employmentStartDate ? (
            <span role="alert" className="text-caption font-normal text-danger">
              {errors.employmentStartDate}
            </span>
          ) : null}
        </label>
        <SelectField
          label="확인 출처"
          value={confirmationSource}
          placeholder="선택해 주세요"
          options={Object.entries(CONFIRMATION_SOURCE_LABEL).map(([value, label]) => ({
            value,
            label,
          }))}
          onValueChange={(next) => {
            setConfirmationSource(next);
            setErrors((current) => ({ ...current, confirmationSource: undefined }));
          }}
          error={errors.confirmationSource}
        />
        {formError ? <FormAlert>{formError}</FormAlert> : null}
      </div>
    </Modal>
  );
}

function RosterEndDialog({ row, onClose }: { row: RosterRow | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [endDate, setEndDate] = useState("");
  const [error, setError] = useState<string>();
  const [warning, setWarning] = useState<string>();

  const mutation = useMutation({
    mutationFn: () => {
      if (!row) throw new Error("대상이 없습니다.");
      return updateRosterItem(
        row.rosterId,
        { employmentEndDate: endDate === "" ? null : endDate },
        row.version,
      );
    },
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: officeKeys.roster });
      if (result.warning === "DEPUTY_QUOTA_EXCEEDED") {
        setWarning("저장했습니다. 중개보조원 한도를 넘어 신규 방문 업무가 제한됩니다.");
        return;
      }
      onClose();
    },
    onError: async (caught) => {
      await queryClient.invalidateQueries({ queryKey: officeKeys.roster });
      setError(
        describeOfficeError(caught, "고용종료일을 저장하지 못했습니다. 다시 시도해 주세요."),
      );
    },
  });

  return (
    <Modal
      isOpen={row !== null}
      title="고용종료일 수정"
      onClose={onClose}
      footer={
        warning ? (
          <Button onClick={onClose}>확인</Button>
        ) : (
          <>
            <Button variant="cancel" disabled={mutation.isPending} onClick={onClose}>
              취소
            </Button>
            <Button
              isLoading={mutation.isPending}
              onClick={() => {
                setError(undefined);
                mutation.mutate();
              }}
            >
              저장
            </Button>
          </>
        )
      }
    >
      <div className="flex flex-col gap-4">
        <p className="text-body text-ink">{row?.personName}</p>
        {warning ? (
          <FormAlert>{warning}</FormAlert>
        ) : (
          <>
            <label className="flex flex-col gap-2 text-caption font-semibold text-ink">
              고용종료일
              <input
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                className="h-14 rounded-control border border-line bg-surface px-4 text-body font-medium text-ink"
              />
            </label>
            <MutedNote>비워서 저장하면 고용종료일이 없어집니다.</MutedNote>
          </>
        )}
        {error ? <FormAlert>{error}</FormAlert> : null}
      </div>
    </Modal>
  );
}

function RosterTab() {
  const table = useTableState();
  const query = useRoster(table.page - 1, table.size);
  const [isAdding, setIsAdding] = useState(false);
  const [editing, setEditing] = useState<RosterRow | null>(null);
  const { isReadOnly } = useOfficeAccess();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <MutedNote>
          계정이 없는 고용인까지 포함한 실제 고용명부 기준으로 한도를 계산합니다.
        </MutedNote>
        {!isReadOnly ? (
          <Button variant="outlined" size="sm" onClick={() => setIsAdding(true)}>
            항목 추가
          </Button>
        ) : null}
      </div>
      <DataTable
        caption="고용명부"
        columns={[
          { key: "name", header: "이름", render: (row) => row.personName },
          {
            key: "qualification",
            header: "법적 신분",
            render: (row) => labelOf(ROLE_LABEL, row.legalQualification),
          },
          {
            key: "start",
            header: "업무개시일",
            render: (row) => formatSeoulDate(row.employmentStartDate),
          },
          {
            key: "end",
            header: "고용종료일",
            render: (row) => (row.employmentEndDate ? formatSeoulDate(row.employmentEndDate) : "-"),
          },
          {
            key: "source",
            header: "확인 출처",
            render: (row) => labelOf(CONFIRMATION_SOURCE_LABEL, row.confirmationSource),
          },
          { key: "account", header: "계정", render: (row) => (row.membershipId ? "있음" : "없음") },
          {
            key: "edit",
            header: "관리",
            render: (row) =>
              isReadOnly ? null : (
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={`${row.personName} 고용종료일 수정`}
                  onClick={() => setEditing(row)}
                >
                  종료일 수정
                </Button>
              ),
          },
        ]}
        rows={query.data?.items ?? []}
        getRowId={(row) => String(row.rosterId)}
        totalCount={query.data?.totalElements ?? 0}
        page={table.page}
        pageSize={table.size}
        onPageChange={table.setPage}
        onPageSizeChange={table.setSize}
        isLoading={query.isPending}
        errorMessage={query.isError ? "고용명부를 불러오지 못했습니다." : undefined}
        onRetry={() => void query.refetch()}
        emptyMessage="고용명부에 등록된 항목이 없습니다."
      />
      <RosterCreateDialog isOpen={isAdding} onClose={() => setIsAdding(false)} />
      <RosterEndDialog
        key={editing?.rosterId ?? "none"}
        row={editing}
        onClose={() => setEditing(null)}
      />
    </div>
  );
}

export function MembersScreen() {
  const { role } = useOfficeAccess();
  const isOwner = role === "OWNER";
  const [tab, setTab] = useState("members");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="구성원"
        description={
          isOwner
            ? "사무소에 속한 구성원과 고용명부를 관리합니다."
            : "사무소에 속한 구성원의 이름과 역할을 확인합니다."
        }
        actions={
          isOwner ? (
            <div className="flex flex-wrap gap-2">
              <Link href="/members/requests" className={LINK_CLASS}>
                참여 요청·초대
              </Link>
              <Link href="/members/owner-transfer" className={LINK_CLASS}>
                대표 이전
              </Link>
            </div>
          ) : (
            <Link href="/members/owner-transfer" className={LINK_CLASS}>
              대표 이전 확인
            </Link>
          )
        }
      />
      {isOwner ? (
        <>
          <MutedNote>{MEMBERSHIP_NOTICE_COPY.ownerResponsibility}</MutedNote>
          <MutedNote>{MEMBERSHIP_NOTICE_COPY.withdrawnMember}</MutedNote>
          <QuotaBanner />
          <Tabs
            label="구성원 보기"
            activeKey={tab}
            onActiveKeyChange={setTab}
            items={[
              { key: "members", label: "구성원", panel: <MemberListTab isOwner /> },
              { key: "roster", label: "고용명부", panel: <RosterTab /> },
              {
                key: "suspended",
                label: "접근 정지",
                panel: <MemberListTab status="SUSPENDED" isOwner />,
              },
            ]}
          />
        </>
      ) : (
        <MemberListTab isOwner={false} />
      )}
      {isOwner ? null : (
        <FormNotice>자격과 접근 상태 같은 자세한 정보는 대표만 볼 수 있습니다.</FormNotice>
      )}
    </div>
  );
}
