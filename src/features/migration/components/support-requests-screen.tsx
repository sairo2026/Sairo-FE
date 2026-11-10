"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import type { ImportSupportRequestListResponse } from "@/lib/api/contracts/migration.schema";
import { EmptyState } from "@/shared/components/feedback/empty-state";
import { ErrorScreen } from "@/shared/components/feedback/error-screen";
import { FormAlert } from "@/shared/components/feedback/form-frame";
import { QueryGate } from "@/shared/components/feedback/query-gate";
import { StatusBadge, TextLink } from "@/shared/components/feedback/page-parts";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { DataTable } from "@/shared/components/ui/data-table";
import type { PageSize } from "@/shared/components/ui/data-table";
import { PageHeader } from "@/shared/components/ui/page-header";
import { Checkbox, SelectField } from "@/shared/components/ui/select-field";
import { TextField } from "@/shared/components/ui/text-field";
import { DataMigrationSupportNotice } from "@/shared/legal/data-rights-notices";
import { MIGRATION_SOURCE_CONSENT_COPY } from "@/shared/legal/notice-copy";
import { formatKrw, formatSeoulDateTime } from "@/shared/lib/format";
import { useOfficeAccess } from "@/shared/session/office-access-context";
import { createImportSupportRequest } from "../api/support-request.api";
import { migrationKeys, useImportBatches } from "../hooks/migration-queries";
import { supportRequestKeys, useImportSupportRequests } from "../hooks/support-queries";
import { SUPPORT_STATUS, targetTypeLabel } from "../model/labels";
import { describeMigrationError } from "../model/messages";
import { SUPPORT_REQUEST_COPY as COPY } from "../model/support-copy";

type Row = ImportSupportRequestListResponse["items"][number];

function ApplyForm({ initialBatchId }: { initialBatchId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isReadOnly } = useOfficeAccess();
  const batches = useImportBatches();
  const [batchId, setBatchId] = useState(initialBatchId);
  const [sourceSystem, setSourceSystem] = useState("");
  const [rowCount, setRowCount] = useState("");
  const [viewConfirmed, setViewConfirmed] = useState(false);
  const [noticeConfirmed, setNoticeConfirmed] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string>();

  const mutation = useMutation({
    mutationFn: createImportSupportRequest,
    onSuccess: async (created) => {
      await queryClient.invalidateQueries({ queryKey: supportRequestKeys.all });
      await queryClient.invalidateQueries({ queryKey: migrationKeys.batches });
      router.push(`/import/support/${created.requestId}`);
    },
    onError: (caught) =>
      setError(describeMigrationError(caught, "이전 지원을 신청하지 못했습니다.")),
  });

  function submit() {
    const next: Record<string, string> = {};
    if (batchId === "") next.batchId = COPY.fileRequired;
    if (sourceSystem.trim() === "") next.sourceSystem = COPY.sourceSystemRequired;
    const parsed = Number(rowCount);
    if (!/^\d+$/.test(rowCount) || parsed < 1) next.rowCount = COPY.rowCountInvalid;
    if (!viewConfirmed || !noticeConfirmed)
      next.sourceConsent = MIGRATION_SOURCE_CONSENT_COPY.required;
    setErrors(next);
    setError(undefined);
    if (Object.keys(next).length > 0) return;
    mutation.mutate({
      importBatchId: Number(batchId),
      sourceSystem: sourceSystem.trim(),
      estimatedRowCount: parsed,
    });
  }

  if (batches.isPending) return null;
  const eligible = (batches.data?.items ?? []).filter((item) => item.eligibleForSupport);

  return (
    <Card title={COPY.applyTitle}>
      {eligible.length === 0 ? (
        <EmptyState
          title={COPY.noEligible}
          action={<TextLink href="/import">데이터 이전으로 가기</TextLink>}
        />
      ) : (
        <div className="flex flex-col gap-5">
          <p className="text-caption text-ink-2">{COPY.standardScope}</p>
          <SelectField
            label={COPY.fileLabel}
            value={batchId}
            placeholder={COPY.filePlaceholder}
            options={eligible.map((item) => ({
              value: String(item.batchId),
              label: `${item.fileName} (${targetTypeLabel(item.targetType)})`,
            }))}
            onValueChange={(value) => {
              setBatchId(value);
              setErrors((current) => ({ ...current, batchId: "" }));
            }}
            error={errors.batchId || undefined}
            disabled={isReadOnly}
          />
          <TextField
            label="원본 시스템 이름"
            value={sourceSystem}
            onValueChange={setSourceSystem}
            error={errors.sourceSystem}
            maxLength={50}
            disabled={isReadOnly}
            required
          />
          <TextField
            label="예상 레코드 수"
            kind="number"
            value={rowCount}
            onValueChange={setRowCount}
            error={errors.rowCount}
            hint="5만 건을 넘거나 원본 시스템이 2종 이상이어도 신청할 수 있고 견적에서 범위가 조정됩니다."
            disabled={isReadOnly}
            required
          />
          <div className="flex flex-col gap-2">
            <p className="text-caption text-ink-2">{MIGRATION_SOURCE_CONSENT_COPY.scope}</p>
            <Checkbox
              label={MIGRATION_SOURCE_CONSENT_COPY.viewConfirm}
              checked={viewConfirmed}
              disabled={isReadOnly}
              onCheckedChange={(value) => {
                setViewConfirmed(value);
                setErrors((current) => ({ ...current, sourceConsent: "" }));
              }}
            />
            <Checkbox
              label={MIGRATION_SOURCE_CONSENT_COPY.noticeConfirm}
              checked={noticeConfirmed}
              disabled={isReadOnly}
              onCheckedChange={(value) => {
                setNoticeConfirmed(value);
                setErrors((current) => ({ ...current, sourceConsent: "" }));
              }}
            />
            {errors.sourceConsent ? (
              <p role="alert" className="text-caption text-danger">
                {errors.sourceConsent}
              </p>
            ) : null}
          </div>
          {error ? <FormAlert>{error}</FormAlert> : null}
          <div>
            <Button isLoading={mutation.isPending} disabled={isReadOnly} onClick={submit}>
              신청하기
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

function RequestsTable() {
  const [page, setPage] = useState(1);
  const [size, setSize] = useState<PageSize>(25);
  const [status, setStatus] = useState("");
  const query = useImportSupportRequests({ page: page - 1, size, status });
  return (
    <Card title={COPY.listTitle}>
      <div className="mb-4 max-w-xs">
        <SelectField
          label={COPY.statusFilter}
          value={status}
          options={[
            { value: "", label: COPY.allStatuses },
            ...Object.entries(SUPPORT_STATUS).map(([value, item]) => ({
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
            ? describeMigrationError(query.error, "신청 목록을 불러오지 못했습니다.")
            : undefined
        }
        onRetry={() => void query.refetch()}
        emptyMessage={COPY.listEmpty}
        columns={[
          {
            key: "request",
            header: "신청",
            render: (row) => (
              <Link
                href={`/import/support/${row.requestId}`}
                className="font-semibold text-primary hover:underline"
              >
                {row.sourceSystem}
              </Link>
            ),
          },
          {
            key: "status",
            header: "상태",
            render: (row) => (
              <StatusBadge
                tone={SUPPORT_STATUS[row.status]?.tone ?? "gray"}
                label={SUPPORT_STATUS[row.status]?.label ?? row.status}
              />
            ),
          },
          {
            key: "quote",
            header: "견적",
            render: (row) => (row.quoteAmount ? formatKrw(row.quoteAmount) : "-"),
          },
          { key: "updated", header: "갱신", render: (row) => formatSeoulDateTime(row.updatedAt) },
        ]}
      />
    </Card>
  );
}

export function SupportRequestsScreen() {
  const { role } = useOfficeAccess();
  const params = useSearchParams();
  const batches = useImportBatches();
  if (role !== "OWNER") return <ErrorScreen kind="forbidden" />;
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={COPY.title}
        description={COPY.description}
        actions={<TextLink href="/import">데이터 이전</TextLink>}
      />
      <DataMigrationSupportNotice />
      <QueryGate query={batches} loadingLabel="이전 파일을 불러오는 중입니다.">
        {() => <ApplyForm initialBatchId={params.get("batchId") ?? ""} />}
      </QueryGate>
      <RequestsTable />
    </div>
  );
}
