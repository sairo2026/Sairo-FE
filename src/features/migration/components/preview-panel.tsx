"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { FormAlert } from "@/shared/components/feedback/form-frame";
import { QueryGate } from "@/shared/components/feedback/query-gate";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { DataTable } from "@/shared/components/ui/data-table";
import type { PageSize } from "@/shared/components/ui/data-table";
import { Checkbox } from "@/shared/components/ui/select-field";
import { ConfirmDialog } from "@/shared/components/ui/modal";
import { executeImport } from "../api/migration.api";
import type { ImportPreview, PreviewRow } from "../api/wire";
import { migrationKeys, useImportBatches, useImportPreview } from "../hooks/migration-queries";
import { IMPORT_COPY, describeMigrationError } from "../model/messages";

type Props = { batchId: number; isLocked: boolean };

function isErrorRow(row: PreviewRow): boolean {
  return (row.warnings ?? []).some((warning) => warning.severity === "ERROR");
}

function ValueList({ values }: { values: Record<string, string | number | boolean | null> }) {
  const entries = Object.entries(values);
  if (entries.length === 0) return <>-</>;
  return (
    <dl className="flex flex-col gap-0.5">
      {entries.map(([key, value]) => (
        <div key={key} className="flex gap-2">
          <dt className="text-ink-3">{key}</dt>
          <dd className="text-ink">{value === null ? "(비어 있음)" : String(value)}</dd>
        </div>
      ))}
    </dl>
  );
}

function Summary({ summary }: { summary: ImportPreview["summary"] }) {
  const items = [
    { label: "행 수", value: summary.rowCount },
    { label: "오류 행", value: summary.errorRowCount },
    { label: "경고", value: summary.warningCount },
    { label: "중복", value: summary.duplicateCount },
    { label: "연결 후보", value: summary.relationMatchCount },
  ];
  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-5">
      {items.map((item) => (
        <div key={item.label} className="rounded-control border border-line bg-surface px-4 py-3">
          <dt className="text-caption text-ink-2">{item.label}</dt>
          <dd className="text-h2 font-bold text-ink">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function PreviewBody({
  batchId,
  isLocked,
  data,
  page,
  size,
  onPageChange,
  onSizeChange,
}: Props & {
  data: ImportPreview;
  page: number;
  size: PageSize;
  onPageChange: (page: number) => void;
  onSizeChange: (size: PageSize) => void;
}) {
  const queryClient = useQueryClient();
  const batches = useImportBatches();
  const remaining = batches.data?.remainingThisMonth;
  const [onlyErrors, setOnlyErrors] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState<string>();

  const mutation = useMutation({
    mutationFn: executeImport,
    onSuccess: async () => {
      setIsConfirming(false);
      await queryClient.invalidateQueries({ queryKey: migrationKeys.batch(batchId) });
      await queryClient.invalidateQueries({ queryKey: migrationKeys.batches });
    },
    onError: (caught) => {
      setIsConfirming(false);
      setError(describeMigrationError(caught, "이전을 시작하지 못했습니다."));
    },
  });

  const rows = onlyErrors ? data.rows.filter(isErrorRow) : data.rows;
  const isQuotaOut = remaining !== undefined && remaining <= 0;
  const hasNothingToImport = data.summary.rowCount - data.summary.errorRowCount <= 0;

  return (
    <div className="flex flex-col gap-5">
      <p className="text-caption text-ink-2">{IMPORT_COPY.previewIntro}</p>
      <Summary summary={data.summary} />
      {data.summary.errorRowCount > 0 ? (
        <p role="note" className="text-caption text-ink">
          {IMPORT_COPY.errorRowNotice}
        </p>
      ) : null}
      {data.duplicateWarnings && data.duplicateWarnings.length > 0 ? (
        <section aria-label="중복 경고" className="flex flex-col gap-2">
          <h3 className="text-body font-semibold text-ink">중복 경고</h3>
          <ul className="flex flex-col gap-1 text-caption text-ink-2">
            {data.duplicateWarnings.map((item) => (
              <li key={`${item.sourceRowNumber}-${item.sourceId}`}>
                {item.sourceRowNumber}행 · {item.sourceSystem} {item.sourceId}은 이미 사이로에 있는
                자료(번호 {item.existingTargetId})와 연결됩니다.
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <Checkbox
        label="오류 행만 보기 (현재 페이지)"
        checked={onlyErrors}
        onCheckedChange={setOnlyErrors}
      />
      <DataTable<PreviewRow>
        caption="미리보기 행"
        rows={rows}
        getRowId={(row) => String(row.sourceRowNumber)}
        totalCount={data.totalElements}
        page={page}
        pageSize={size}
        onPageChange={onPageChange}
        onPageSizeChange={onSizeChange}
        emptyMessage="표시할 행이 없습니다."
        columns={[
          { key: "row", header: "행", render: (row) => `${row.sourceRowNumber}행` },
          {
            key: "source",
            header: "원본값",
            render: (row) => <ValueList values={row.sourceValues} />,
          },
          {
            key: "normalized",
            header: "바뀔 값",
            render: (row) => <ValueList values={row.normalizedValues} />,
          },
          {
            key: "warnings",
            header: "확인",
            render: (row) =>
              (row.warnings ?? []).length === 0 ? (
                "문제 없음"
              ) : (
                <ul className="flex flex-col gap-1">
                  {(row.warnings ?? []).map((warning) => (
                    <li
                      key={`${warning.code}-${warning.field ?? ""}`}
                      className={
                        warning.severity === "ERROR" ? "font-semibold text-danger" : "text-ink"
                      }
                    >
                      [{warning.severity === "ERROR" ? "오류" : "경고"}] {warning.message}
                    </li>
                  ))}
                </ul>
              ),
          },
        ]}
      />
      {error ? <FormAlert>{error}</FormAlert> : null}
      {isQuotaOut ? <FormAlert>{IMPORT_COPY.quotaExhausted}</FormAlert> : null}
      <div>
        <Button
          disabled={isLocked || isQuotaOut || hasNothingToImport}
          isLoading={mutation.isPending}
          onClick={() => setIsConfirming(true)}
        >
          이전 실행
        </Button>
      </div>
      <ConfirmDialog
        isOpen={isConfirming}
        title="이전을 실행할까요?"
        message={IMPORT_COPY.executeConfirm(data.summary.rowCount, data.summary.errorRowCount)}
        confirmLabel="실행"
        isPending={mutation.isPending}
        onConfirm={() => mutation.mutate(batchId)}
        onCancel={() => setIsConfirming(false)}
      />
    </div>
  );
}

export function PreviewPanel({ batchId, isLocked }: Props) {
  const [page, setPage] = useState(1);
  const [size, setSize] = useState<PageSize>(25);
  const query = useImportPreview(batchId, { page: page - 1, size }, true);
  return (
    <Card title="미리보기">
      <QueryGate query={query} loadingLabel="미리보기를 불러오는 중입니다.">
        {(data) => (
          <PreviewBody
            batchId={batchId}
            isLocked={isLocked}
            data={data}
            page={page}
            size={size}
            onPageChange={setPage}
            onSizeChange={(next) => {
              setSize(next);
              setPage(1);
            }}
          />
        )}
      </QueryGate>
    </Card>
  );
}
