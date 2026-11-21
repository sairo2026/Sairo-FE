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
import { StatusBadge } from "@/shared/components/feedback/page-parts";
import { migrationKeys, useImportBatches, useImportPreview } from "../hooks/migration-queries";
import { DUPLICATE_JUDGEMENT, targetFieldLabel } from "../model/labels";
import { IMPORT_COPY, describeMigrationError } from "../model/messages";
import { previewNewCount } from "../model/preview-counts";

type Props = { batchId: number; isLocked: boolean };

function isErrorRow(row: PreviewRow): boolean {
  return (row.warnings ?? []).some((warning) => warning.severity === "ERROR");
}

function ValueList({
  values,
  isTargetField = false,
}: {
  values: Record<string, string | number | boolean | null>;
  isTargetField?: boolean;
}) {
  const entries = Object.entries(values);
  if (entries.length === 0) return <>-</>;
  return (
    <dl className="flex flex-col gap-0.5">
      {entries.map(([key, value]) => (
        <div key={key} className="flex gap-2">
          <dt className="text-muted">{isTargetField ? targetFieldLabel(key) : key}</dt>
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
    { label: "새로 만들 행", value: previewNewCount(summary) },
    { label: "중복 제외", value: summary.duplicateCount },
    { label: "연결 후보", value: summary.relationMatchCount },
  ];
  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
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
  const newCount = previewNewCount(data.summary);
  const hasNothingToImport = newCount <= 0;

  return (
    <div className="flex flex-col gap-5">
      <p className="text-caption text-ink-2">{IMPORT_COPY.previewIntro}</p>
      <Summary summary={data.summary} />
      {data.summary.errorRowCount > 0 ? (
        <p role="note" className="text-caption text-ink">
          {IMPORT_COPY.errorRowNotice}
        </p>
      ) : null}
      {data.summary.duplicateCount > 0 ? (
        <p role="note" className="text-caption text-ink">
          {IMPORT_COPY.skippedHint}
        </p>
      ) : null}
      {data.duplicateWarnings && data.duplicateWarnings.length > 0 ? (
        <section aria-label="중복 경고" className="flex flex-col gap-2">
          <h3 className="text-body font-semibold text-ink">중복 경고</h3>
          <ul className="flex flex-col gap-1 text-caption text-ink-2">
            {data.duplicateWarnings.map((item) => (
              <li key={`${item.sourceRowNumber}-${item.sourceId}`}>
                {item.sourceRowNumber}행
                {item.sourceId ? ` · ${item.sourceSystem} ${item.sourceId}` : ""}은 이미 사이로에
                있는 자료(번호 {item.existingTargetId})와 겹쳐 새로 만들지 않습니다.
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
            render: (row) => <ValueList values={row.normalizedValues} isTargetField />,
          },
          {
            key: "judgement",
            header: "중복 판정",
            render: (row) => {
              const judgement = DUPLICATE_JUDGEMENT[row.duplicateJudgement];
              return (
                <StatusBadge
                  tone={judgement?.tone ?? "gray"}
                  label={judgement?.label ?? row.duplicateJudgement}
                />
              );
            },
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
      {hasNothingToImport ? <FormAlert>{IMPORT_COPY.nothingToImport}</FormAlert> : null}
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
        message={IMPORT_COPY.executeConfirm(
          newCount,
          data.summary.errorRowCount,
          data.summary.duplicateCount,
        )}
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
