"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import type { ExportListResponse } from "@/lib/api/contracts/migration.schema";
import { ErrorScreen } from "@/shared/components/feedback/error-screen";
import { FormAlert, FormNotice } from "@/shared/components/feedback/form-frame";
import { QueryGate } from "@/shared/components/feedback/query-gate";
import { StatusBadge } from "@/shared/components/feedback/page-parts";
import { Button } from "@/shared/components/ui/button";
import { FieldLabel } from "@/shared/components/ui/field-label";
import { SecondaryLink } from "@/shared/components/ui/secondary-link";
import { DataTable } from "@/shared/components/ui/data-table";
import type { PageSize } from "@/shared/components/ui/data-table";
import { PageHeader } from "@/shared/components/ui/page-header";
import { Checkbox, RadioGroup } from "@/shared/components/ui/select-field";
import { DataExportNotice } from "@/shared/legal/data-rights-notices";
import { formatSeoulDateTime } from "@/shared/lib/format";
import { useOfficeAccess } from "@/shared/session/office-access-context";
import { createExport, updateExportPolicy } from "../api/export.api";
import type { ExportAllowedTablesResponse } from "@/lib/api/contracts/migration.schema";
import {
  exportKeys,
  useAllowedExportTables,
  useExportStatus,
  useExports,
} from "../hooks/support-queries";
import { EXPORT_STATUS, EXPORT_TABLES } from "../model/labels";
import { describeMigrationError } from "../model/messages";
import { EXPORT_COPY as COPY } from "../model/support-copy";
import { ApiError } from "@/shared/api/client";

type Row = ExportListResponse["items"][number];

function ExportStatusBadge({ status }: { status: string }) {
  const item = EXPORT_STATUS[status];
  return <StatusBadge tone={item?.tone ?? "gray"} label={item?.label ?? status} />;
}

const RUNNING_EXPORT_STATUSES = ["PENDING", "PROCESSING"];

function ExportStatusPanel({ exportId }: { exportId: number }) {
  const queryClient = useQueryClient();
  const query = useExportStatus(exportId);
  const status = query.data?.status;
  const previousStatus = useRef<string | undefined>(undefined);
  useEffect(() => {
    const wasRunning = RUNNING_EXPORT_STATUSES.includes(previousStatus.current ?? "");
    if (wasRunning && status !== undefined && !RUNNING_EXPORT_STATUSES.includes(status)) {
      void queryClient.invalidateQueries({ queryKey: exportKeys.lists });
    }
    previousStatus.current = status;
  }, [status, queryClient]);
  if (query.isPending) return <p role="status">내보내기 상태를 확인하는 중입니다.</p>;
  if (query.isError) {
    const isExpired = query.error instanceof ApiError && query.error.code === "EXPORT_EXPIRED";
    return (
      <FormAlert>
        {isExpired
          ? COPY.expired
          : describeMigrationError(query.error, "내보내기 상태를 확인하지 못했습니다.")}
      </FormAlert>
    );
  }
  const data = query.data;
  return (
    <section aria-label="내보내기 상태" className="flex flex-col gap-3" aria-live="polite">
      <div className="flex items-center gap-3">
        <ExportStatusBadge status={data.status} />
        <span className="text-caption text-ink-2">
          {data.fileExpiresAt ? COPY.fileExpires(formatSeoulDateTime(data.fileExpiresAt)) : null}
        </span>
      </div>
      {data.status === "PENDING" || data.status === "PROCESSING" ? (
        <p className="text-caption text-ink-2">{COPY.creating}</p>
      ) : null}
      {data.status === "COMPLETED" && data.downloadUrl ? (
        <div className="flex flex-col gap-2">
          <p className="text-caption font-semibold text-primary">{COPY.completed}</p>
          <a
            href={data.downloadUrl}
            className="w-fit rounded-control bg-primary px-4 py-2 text-caption font-bold text-white hover:bg-primary-hover active:bg-primary-pressed"
          >
            {COPY.download}
          </a>
          <p className="text-caption text-ink-2">{COPY.downloadNote}</p>
        </div>
      ) : null}
      {data.status === "FAILED" ? <FormAlert>{COPY.failed(data.failureReason)}</FormAlert> : null}
    </section>
  );
}

function CreateForm({
  tables,
  isOwner,
  onCreated,
}: {
  tables: Array<{ code: string; label: string }>;
  isOwner: boolean;
  onCreated: (exportId: number) => void;
}) {
  const queryClient = useQueryClient();
  const { isReadOnly } = useOfficeAccess();
  const [scope, setScope] = useState(isOwner ? "FULL" : "TABLES");
  const [selected, setSelected] = useState<string[]>([]);
  const [tableError, setTableError] = useState<string>();
  const [error, setError] = useState<string>();

  const mutation = useMutation({
    mutationFn: createExport,
    onSuccess: async (created) => {
      setError(undefined);
      await queryClient.invalidateQueries({ queryKey: exportKeys.all });
      onCreated(created.exportId);
    },
    onError: (caught) => setError(describeMigrationError(caught, "내보내기를 만들지 못했습니다.")),
  });

  function toggle(code: string, checked: boolean) {
    setTableError(undefined);
    setSelected((current) =>
      checked ? [...current, code] : current.filter((item) => item !== code),
    );
  }

  function submit() {
    setError(undefined);
    if (scope === "FULL") {
      mutation.mutate({ scope: "FULL" });
      return;
    }
    if (selected.length === 0) {
      setTableError(COPY.tablesRequired);
      return;
    }
    mutation.mutate({ scope: "TABLES", tables: selected });
  }

  const noTables = tables.length === 0;
  return (
    <section aria-labelledby="export-section-1" className="flex flex-col gap-4">
      <h2 id="export-section-1" className="text-h2 font-semibold text-ink">
        {COPY.createTitle}
      </h2>
      <div className="flex flex-col gap-5">
        {isOwner ? (
          <RadioGroup
            legend={COPY.scopeLabel}
            name="export-scope"
            value={scope}
            onValueChange={setScope}
            options={[
              { value: "FULL", label: COPY.scopeFull },
              { value: "TABLES", label: COPY.scopeTables },
            ]}
          />
        ) : null}
        {scope === "TABLES" ? (
          noTables ? (
            <FormNotice>{COPY.noAllowedTables}</FormNotice>
          ) : (
            <fieldset className="min-w-0 flex flex-col gap-2">
              <FieldLabel as="legend">{COPY.tablesLabel}</FieldLabel>
              <div className="flex flex-wrap gap-4">
                {tables.map((table) => (
                  <Checkbox
                    key={table.code}
                    label={table.label}
                    checked={selected.includes(table.code)}
                    onCheckedChange={(checked) => toggle(table.code, checked)}
                  />
                ))}
              </div>
              {tableError ? (
                <p role="alert" className="text-caption text-danger">
                  {tableError}
                </p>
              ) : null}
            </fieldset>
          )
        ) : null}
        {error ? <FormAlert>{error}</FormAlert> : null}
        <div>
          <Button
            isLoading={mutation.isPending}
            disabled={isReadOnly || (scope === "TABLES" && noTables)}
            onClick={submit}
          >
            {COPY.submit}
          </Button>
        </div>
      </div>
    </section>
  );
}

function PolicyPanel({ tables }: { tables: ExportAllowedTablesResponse["tables"] }) {
  const { isReadOnly } = useOfficeAccess();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<string[]>(() =>
    tables.filter((table) => table.allowed === true).map((table) => table.code),
  );
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<string>();

  const mutation = useMutation({
    mutationFn: updateExportPolicy,
    onSuccess: async (result) => {
      setError(undefined);
      setMessage(
        COPY.policySaved(
          result.tables
            .filter((table) => table.allowed !== false)
            .map((table) => table.label)
            .join(", "),
        ),
      );
      await queryClient.invalidateQueries({ queryKey: exportKeys.allowedTables });
    },
    onError: (caught) => {
      setMessage(undefined);
      setError(describeMigrationError(caught, "허용 목록을 저장하지 못했습니다."));
    },
  });

  return (
    <section aria-labelledby="export-section-2" className="flex flex-col gap-4">
      <h2 id="export-section-2" className="text-h2 font-semibold text-ink">
        {COPY.policyTitle}
      </h2>
      <div className="flex flex-col gap-4">
        <p className="text-caption text-ink-2">{COPY.policyIntro}</p>
        <div className="flex flex-wrap gap-4">
          {EXPORT_TABLES.map((table) => (
            <Checkbox
              key={table.code}
              label={`${table.label} 허용`}
              checked={selected.includes(table.code)}
              onCheckedChange={(checked) =>
                setSelected((current) =>
                  checked
                    ? [...current, table.code]
                    : current.filter((item) => item !== table.code),
                )
              }
            />
          ))}
        </div>
        {error ? <FormAlert>{error}</FormAlert> : null}
        {message ? (
          <p role="status" className="text-caption font-semibold text-primary">
            {message}
          </p>
        ) : null}
        <div>
          <Button
            variant="outlined"
            disabled={isReadOnly}
            isLoading={mutation.isPending}
            onClick={() => mutation.mutate(selected)}
          >
            {COPY.policySave}
          </Button>
        </div>
      </div>
    </section>
  );
}

function History({ onSelect }: { onSelect: (exportId: number) => void }) {
  const [page, setPage] = useState(1);
  const [size, setSize] = useState<PageSize>(25);
  const query = useExports({ page: page - 1, size });
  return (
    <section aria-labelledby="export-section-3" className="flex flex-col gap-4">
      <h2 id="export-section-3" className="text-h2 font-semibold text-ink">
        {COPY.historyTitle}
      </h2>
      <p className="mb-3 text-caption text-ink-2">{COPY.historyNote}</p>
      <DataTable<Row>
        caption={COPY.historyTitle}
        rows={query.data?.items ?? []}
        getRowId={(row) => String(row.exportId)}
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
            ? describeMigrationError(query.error, "내보내기 이력을 불러오지 못했습니다.")
            : undefined
        }
        onRetry={() => void query.refetch()}
        emptyMessage={COPY.historyEmpty}
        columns={[
          {
            key: "scope",
            header: "범위",
            render: (row) => (row.scope === "FULL" ? COPY.scopeFullLabel : COPY.scopeTablesLabel),
          },
          {
            key: "status",
            header: "상태",
            render: (row) => <ExportStatusBadge status={row.status} />,
          },
          {
            key: "created",
            header: "만든 시각",
            render: (row) => formatSeoulDateTime(row.createdAt),
          },
          {
            key: "expires",
            header: "파일 삭제",
            render: (row) => (row.fileExpiresAt ? formatSeoulDateTime(row.fileExpiresAt) : "-"),
          },
          {
            key: "action",
            header: "받기",
            render: (row) => (
              <Button variant="ghost" size="sm" onClick={() => onSelect(row.exportId)}>
                {COPY.openLink}
              </Button>
            ),
          },
        ]}
      />
    </section>
  );
}

export function ExportsScreen() {
  const { role } = useOfficeAccess();
  const tables = useAllowedExportTables();
  const queryClient = useQueryClient();
  const [exportId, setExportId] = useState<number | null>(null);
  if (role !== "OWNER" && role !== "AGENT") return <ErrorScreen kind="forbidden" />;
  const isOwner = role === "OWNER";

  function selectExport(selectedId: number) {
    void queryClient.invalidateQueries({ queryKey: exportKeys.detail(selectedId) });
    setExportId(selectedId);
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={COPY.title}
        description={COPY.description}
        actions={<SecondaryLink href="/billing/return-guide">자료 반환 안내</SecondaryLink>}
      />
      <DataExportNotice />
      <QueryGate query={tables} loadingLabel="내보낼 수 있는 표를 불러오는 중입니다.">
        {(data) => <CreateForm tables={data.tables} isOwner={isOwner} onCreated={setExportId} />}
      </QueryGate>
      {exportId !== null ? (
        <section aria-labelledby="export-section-4" className="flex flex-col gap-4">
          <h2 id="export-section-4" className="text-h2 font-semibold text-ink">
            {"내보내기 진행"}
          </h2>
          <ExportStatusPanel exportId={exportId} />
        </section>
      ) : null}
      {isOwner && tables.data ? <PolicyPanel tables={tables.data.tables} /> : null}
      <History onSelect={selectExport} />
      <p className="text-caption text-ink-2">{COPY.returnGuide}</p>
    </div>
  );
}
