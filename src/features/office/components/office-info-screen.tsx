"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { FormAlert, FormNotice } from "@/shared/components/feedback/form-frame";
import { useOfficeAccess } from "@/shared/session/office-access-context";
import type { OfficeDetailResponse } from "@/lib/api/contracts/office.schema";
import { QueryGate } from "@/shared/components/feedback/query-gate";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { DataTable } from "@/shared/components/ui/data-table";
import type { PageSize } from "@/shared/components/ui/data-table";
import { Modal } from "@/shared/components/ui/modal";
import { PageHeader } from "@/shared/components/ui/page-header";
import { SelectField } from "@/shared/components/ui/select-field";
import { TextField } from "@/shared/components/ui/text-field";
import { formatSeoulDateTime } from "@/shared/lib/format";
import { createChangeRequest, updateOfficePhone } from "../api/office.api";
import { officeKeys, useChangeRequests, useCurrentOffice } from "../hooks/office-queries";
import {
  CHANGE_STATUS_LABEL,
  CHANGE_TYPE_LABEL,
  ENTITY_TYPE_LABEL,
  labelOf,
} from "../model/labels";
import { describeOfficeError, fieldErrorMap, isApiCode } from "../model/messages";
import { formatBusinessNumber, isValidPhone, validateChangeRequest } from "../model/validation";
import { DetailList, MutedNote } from "@/shared/components/feedback/page-parts";

const CHANGE_FIELDS: Record<
  string,
  Array<{ key: string; label: string; kind?: "tel" | "number" }>
> = {
  ADDRESS: [{ key: "address", label: "새 주소" }],
  REGISTRATION_INFO: [
    { key: "registrationAuthority", label: "등록관청" },
    { key: "realEstateLicenseNumber", label: "개설등록번호" },
    { key: "businessRegistrationNumber", label: "사업자등록번호", kind: "number" },
  ],
  REPRESENTATIVE: [
    { key: "representativeName", label: "새 대표자 이름" },
    { key: "representativePhone", label: "새 대표자 연락처", kind: "tel" },
  ],
};

const CHANGE_STATUS_TONE = { PENDING_REVIEW: "blue", APPROVED: "green", REJECTED: "red" } as const;

function describeRequestedValues(values: Record<string, unknown>): string {
  return Object.entries(values)
    .filter(([, value]) => typeof value === "string" && value !== "")
    .map(
      ([key, value]) =>
        `${key === "entityType" ? "사업자 구분" : (CHANGE_FIELD_LABELS[key] ?? key)}: ${String(value)}`,
    )
    .join(", ");
}

const CHANGE_FIELD_LABELS: Record<string, string> = {
  address: "주소",
  registrationAuthority: "등록관청",
  realEstateLicenseNumber: "개설등록번호",
  businessRegistrationNumber: "사업자등록번호",
  representativeName: "대표자",
  representativePhone: "연락처",
};

function PhoneEditor({ office }: { office: OfficeDetailResponse }) {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [phone, setPhone] = useState(office.representativePhone ?? "");
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();

  const mutation = useMutation({
    mutationFn: () => updateOfficePhone(phone, office.version),
    onSuccess: async () => {
      setIsEditing(false);
      setNotice("대표 연락처를 저장했습니다.");
      await queryClient.invalidateQueries({ queryKey: officeKeys.current });
    },
    onError: async (caught) => {
      if (isApiCode(caught, "VERSION_CONFLICT")) {
        await queryClient.invalidateQueries({ queryKey: officeKeys.current });
      }
      setError(describeOfficeError(caught, "연락처를 저장하지 못했습니다. 다시 시도해 주세요."));
    },
  });

  function save() {
    setNotice(undefined);
    if (!isValidPhone(phone)) {
      setError("연락처를 010-0000-0000 형식으로 입력해 주세요.");
      return;
    }
    setError(undefined);
    mutation.mutate();
  }

  if (!isEditing) {
    return (
      <div className="flex flex-col gap-3">
        {notice ? <FormNotice>{notice}</FormNotice> : null}
        <Button
          variant="outlined"
          size="sm"
          onClick={() => {
            setPhone(office.representativePhone ?? "");
            setError(undefined);
            setIsEditing(true);
          }}
        >
          대표 연락처 변경
        </Button>
      </div>
    );
  }

  return (
    <form
      noValidate
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        save();
      }}
    >
      <TextField
        label="대표 연락처"
        kind="tel"
        value={phone}
        onValueChange={(next) => {
          setPhone(next);
          setError(undefined);
        }}
        error={error}
      />
      <div className="flex gap-2">
        <Button type="submit" size="sm" isLoading={mutation.isPending}>
          저장
        </Button>
        <Button variant="cancel" size="sm" onClick={() => setIsEditing(false)}>
          취소
        </Button>
      </div>
    </form>
  );
}

function ChangeRequestDialog({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [changeType, setChangeType] = useState("");
  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [formError, setFormError] = useState<string>();
  const [done, setDone] = useState(false);

  const mutation = useMutation({
    mutationFn: () => {
      const requestedValues = Object.fromEntries(
        Object.entries(values)
          .filter(
            ([key, value]) =>
              (CHANGE_FIELDS[changeType] ?? []).some((f) => f.key === key) && value.trim() !== "",
          )
          .map(([key, value]) => [key, value.trim()]),
      );
      return createChangeRequest({
        changeType: changeType as "ADDRESS" | "REGISTRATION_INFO" | "REPRESENTATIVE",
        requestedValues,
      });
    },
    onSuccess: async () => {
      setDone(true);
      await queryClient.invalidateQueries({ queryKey: ["office", "change-requests"] });
    },
    onError: (caught) => {
      setErrors(fieldErrorMap(caught));
      setFormError(describeOfficeError(caught, "변경을 신청하지 못했습니다. 다시 시도해 주세요."));
    },
  });

  function close() {
    setChangeType("");
    setValues({});
    setErrors({});
    setFormError(undefined);
    setDone(false);
    onClose();
  }

  function submit() {
    setFormError(undefined);
    const problems = validateChangeRequest(changeType, values);
    setErrors(problems);
    if (Object.keys(problems).length > 0) return;
    mutation.mutate();
  }

  return (
    <Modal
      isOpen={isOpen}
      title="사무소 정보 변경 신청"
      onClose={close}
      footer={
        done ? (
          <Button onClick={close}>확인</Button>
        ) : (
          <>
            <Button variant="cancel" onClick={close} disabled={mutation.isPending}>
              취소
            </Button>
            <Button isLoading={mutation.isPending} onClick={submit}>
              변경 신청
            </Button>
          </>
        )
      }
    >
      {done ? (
        <FormNotice>변경을 신청했습니다. 승인되기 전까지 사무소 정보는 바뀌지 않습니다.</FormNotice>
      ) : (
        <div className="flex flex-col gap-4">
          <MutedNote>
            주소, 등록관계, 대표자 변경은 본인 확인 뒤 신청하고 심사를 거쳐 반영됩니다.
          </MutedNote>
          <SelectField
            label="변경 종류"
            value={changeType}
            placeholder="선택해 주세요"
            options={Object.entries(CHANGE_TYPE_LABEL).map(([value, label]) => ({ value, label }))}
            onValueChange={(next) => {
              setChangeType(next);
              setValues({});
              setErrors({});
            }}
            error={errors.changeType}
          />
          {(CHANGE_FIELDS[changeType] ?? []).map((field) => (
            <TextField
              key={field.key}
              label={field.label}
              kind={field.kind}
              value={values[field.key] ?? ""}
              onValueChange={(next) => {
                setValues((current) => ({
                  ...current,
                  [field.key]:
                    field.key === "businessRegistrationNumber" ? formatBusinessNumber(next) : next,
                }));
                setErrors((current) => ({ ...current, [field.key]: undefined }));
              }}
              error={errors[field.key]}
            />
          ))}
          {formError ? <FormAlert>{formError}</FormAlert> : null}
        </div>
      )}
    </Modal>
  );
}

function ChangeRequestList() {
  const [page, setPage] = useState(1);
  const [size, setSize] = useState<PageSize>(25);
  const query = useChangeRequests(page - 1, size);
  return (
    <DataTable
      caption="사무소 정보 변경 신청 목록"
      rows={query.data?.items ?? []}
      getRowId={(row) => String(row.requestId)}
      totalCount={query.data?.totalElements ?? 0}
      page={page}
      pageSize={size}
      onPageChange={setPage}
      onPageSizeChange={(next) => {
        setSize(next);
        setPage(1);
      }}
      isLoading={query.isPending}
      errorMessage={query.isError ? "변경 신청 목록을 불러오지 못했습니다." : undefined}
      onRetry={() => void query.refetch()}
      emptyMessage="낸 변경 신청이 없습니다."
      columns={[
        {
          key: "changeType",
          header: "종류",
          render: (row) => labelOf(CHANGE_TYPE_LABEL, row.changeType),
        },
        {
          key: "values",
          header: "신청 내용",
          render: (row) => describeRequestedValues(row.requestedValues),
        },
        {
          key: "status",
          header: "상태",
          render: (row) => (
            <Badge tone={CHANGE_STATUS_TONE[row.status]}>
              {labelOf(CHANGE_STATUS_LABEL, row.status)}
            </Badge>
          ),
        },
        { key: "reason", header: "반려 사유", render: (row) => row.rejectionReason ?? "-" },
        {
          key: "createdAt",
          header: "신청 시각",
          render: (row) => formatSeoulDateTime(row.createdAt),
        },
      ]}
    />
  );
}

export function OfficeInfoScreen() {
  const { role, isReadOnly } = useOfficeAccess();
  const query = useCurrentOffice();
  const [isChanging, setIsChanging] = useState(false);
  const isOwner = role === "OWNER";

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="사무소 관리"
        description="사무소 기본 정보를 확인하고 변경합니다."
        actions={
          isOwner ? (
            <div className="flex flex-wrap gap-2">
              <Link
                href="/members"
                className="inline-flex h-9 items-center rounded-control border border-line px-3.5 text-caption text-ink-2 hover:border-primary hover:text-primary"
              >
                구성원·고용명부
              </Link>
              <Link
                href="/members/requests"
                className="inline-flex h-9 items-center rounded-control border border-line px-3.5 text-caption text-ink-2 hover:border-primary hover:text-primary"
              >
                참여 요청·초대
              </Link>
              <Link
                href="/members/owner-transfer"
                className="inline-flex h-9 items-center rounded-control border border-line px-3.5 text-caption text-ink-2 hover:border-primary hover:text-primary"
              >
                대표 이전
              </Link>
            </div>
          ) : null
        }
      />
      <QueryGate query={query} loadingLabel="사무소 정보를 불러오는 중입니다.">
        {(office) => (
          <>
            <Card title="현재 사무소 정보">
              <DetailList
                items={[
                  { label: "사무소명", value: office.name },
                  { label: "사업자 구분", value: labelOf(ENTITY_TYPE_LABEL, office.entityType) },
                  { label: "등록관청", value: office.registrationAuthority },
                  { label: "개설등록번호", value: office.realEstateLicenseNumber },
                  { label: "사업자등록번호", value: office.businessRegistrationNumber },
                  { label: "대표자", value: office.representativeName },
                  {
                    label: "대표 연락처",
                    value: office.representativePhone ?? "대표 개인 연락처는 표시하지 않습니다.",
                  },
                  { label: "주소", value: office.address },
                ]}
              />
              {isOwner && !isReadOnly ? (
                <div className="mt-6">
                  <PhoneEditor office={office} />
                </div>
              ) : null}
            </Card>

            {isOwner ? (
              <Card title="변경 신청">
                <div className="flex flex-col gap-4">
                  <MutedNote>
                    연락처는 저장하면 바로 반영됩니다. 주소, 등록관계, 대표자 변경은 본인 확인 뒤
                    신청하며 승인 전까지 현재 값이 유지됩니다.
                  </MutedNote>
                  {!isReadOnly ? (
                    <div>
                      <Button variant="outlined" size="sm" onClick={() => setIsChanging(true)}>
                        정보 변경 신청
                      </Button>
                    </div>
                  ) : null}
                  <ChangeRequestList />
                </div>
              </Card>
            ) : null}
            <ChangeRequestDialog isOpen={isChanging} onClose={() => setIsChanging(false)} />
          </>
        )}
      </QueryGate>
    </div>
  );
}
