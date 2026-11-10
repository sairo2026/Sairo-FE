"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { PrivacyRequestListResponse } from "@/lib/api/contracts/support.schema";
import { FormAlert } from "@/shared/components/feedback/form-frame";
import { StatusBadge, TextLink } from "@/shared/components/feedback/page-parts";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { DataTable } from "@/shared/components/ui/data-table";
import type { PageSize } from "@/shared/components/ui/data-table";
import { PageHeader } from "@/shared/components/ui/page-header";
import { SelectField } from "@/shared/components/ui/select-field";
import { TextAreaField } from "@/shared/components/ui/textarea-field";
import { TextField } from "@/shared/components/ui/text-field";
import { PrivacyRightsNotice } from "@/shared/legal/data-rights-notices";
import { countCodePoints, formatSeoulDateTime } from "@/shared/lib/format";
import { useOfficeAccess } from "@/shared/session/office-access-context";
import { createPrivacyRequest } from "../api/support.api";
import { useMyPrivacyRequests } from "../hooks/support-queries";
import {
  IDENTITY_STATUS,
  INQUIRY_CONTENT_MAX,
  PRIVACY_REQUEST_TYPES,
  PRIVACY_STATUS,
  privacyTypeLabel,
} from "../model/labels";
import { PRIVACY_COPY as COPY, describeSupportError } from "../model/messages";

type Row = PrivacyRequestListResponse["items"][number];

function RequestForm() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [requestType, setRequestType] = useState("");
  const [content, setContent] = useState("");
  const [scope, setScope] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string>();

  const mutation = useMutation({
    mutationFn: createPrivacyRequest,
    onSuccess: async (created) => {
      await queryClient.invalidateQueries({ queryKey: ["support", "privacy-requests"] });
      router.push(`/privacy-requests/${created.requestId}?received=1`);
    },
    onError: (caught) => setError(describeSupportError(caught, "요청을 접수하지 못했습니다.")),
  });

  function submit() {
    const next: Record<string, string> = {};
    if (requestType === "") next.requestType = COPY.typeRequired;
    if (content.trim() === "") next.content = COPY.contentRequired;
    else if (countCodePoints(content) > INQUIRY_CONTENT_MAX) {
      next.content = `요청 내용은 ${INQUIRY_CONTENT_MAX}자까지 입력할 수 있습니다.`;
    }
    setErrors(next);
    setError(undefined);
    if (Object.keys(next).length > 0) return;
    mutation.mutate({
      requestType,
      content: content.trim(),
      requestScope: scope.trim() === "" ? null : scope.trim(),
    });
  }

  return (
    <Card title={COPY.formTitle}>
      <div className="flex flex-col gap-5">
        <SelectField
          label={COPY.typeLabel}
          value={requestType}
          placeholder={COPY.typePlaceholder}
          options={PRIVACY_REQUEST_TYPES.map((item) => ({ value: item.value, label: item.label }))}
          onValueChange={(value) => {
            setRequestType(value);
            setErrors((current) => ({ ...current, requestType: "" }));
          }}
          error={errors.requestType || undefined}
        />
        <TextAreaField
          label={COPY.contentLabel}
          value={content}
          onValueChange={(value) => {
            setContent(value);
            setErrors((current) => ({ ...current, content: "" }));
          }}
          error={errors.content || undefined}
          hint={COPY.contentHint}
        />
        <TextField
          label={COPY.scopeLabel}
          value={scope}
          onValueChange={setScope}
          hint={COPY.scopeHint}
          maxLength={500}
        />
        {error ? <FormAlert>{error}</FormAlert> : null}
        <div>
          <Button isLoading={mutation.isPending} onClick={submit}>
            {COPY.submit}
          </Button>
        </div>
      </div>
    </Card>
  );
}

export function PrivacyStatusBadge({ status }: { status: string }) {
  const item = PRIVACY_STATUS[status];
  return <StatusBadge tone={item?.tone ?? "gray"} label={item?.label ?? status} />;
}

export function PrivacyHistory({ isCompact = false }: { isCompact?: boolean }) {
  const [page, setPage] = useState(1);
  const [size, setSize] = useState<PageSize>(25);
  const [status, setStatus] = useState("");
  const query = useMyPrivacyRequests({ page: page - 1, size, status });
  return (
    <Card title={COPY.listTitle}>
      {isCompact ? null : (
        <div className="mb-4 max-w-xs">
          <SelectField
            label={COPY.statusFilter}
            value={status}
            options={[
              { value: "", label: COPY.allStatuses },
              ...Object.entries(PRIVACY_STATUS).map(([value, item]) => ({
                value,
                label: item.label,
              })),
            ]}
            onValueChange={(value) => {
              setStatus(value);
              setPage(1);
            }}
          />
        </div>
      )}
      <DataTable<Row>
        caption={COPY.listTitle}
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
        errorMessage={
          query.isError
            ? describeSupportError(query.error, "요청 이력을 불러오지 못했습니다.")
            : undefined
        }
        onRetry={() => void query.refetch()}
        emptyMessage={COPY.listEmpty}
        columns={[
          {
            key: "type",
            header: "요청",
            render: (row) => (
              <Link
                href={`/privacy-requests/${row.requestId}`}
                className="font-semibold text-primary hover:underline"
              >
                {privacyTypeLabel(row.requestType)} 요청
              </Link>
            ),
          },
          {
            key: "status",
            header: "처리 상태",
            render: (row) => <PrivacyStatusBadge status={row.status} />,
          },
          {
            key: "identity",
            header: "본인 확인",
            render: (row) => IDENTITY_STATUS[row.identityStatus]?.label ?? row.identityStatus,
          },
          { key: "due", header: "법정 기한", render: (row) => formatSeoulDateTime(row.legalDueAt) },
          {
            key: "completed",
            header: "완료",
            render: (row) => (row.completedAt ? formatSeoulDateTime(row.completedAt) : "-"),
          },
          {
            key: "handler",
            header: "처리 주체",
            render: (row) => row.responsibleOfficeName ?? "사이로",
          },
        ]}
      />
    </Card>
  );
}

export function PrivacyRequestsScreen() {
  const { role } = useOfficeAccess();
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-10">
      <PageHeader
        title={COPY.title}
        description={COPY.description}
        actions={<TextLink href="/support">서비스 이용</TextLink>}
      />
      <PrivacyRightsNotice isOwner={role === "OWNER"} />
      <RequestForm />
      <PrivacyHistory />
    </main>
  );
}
