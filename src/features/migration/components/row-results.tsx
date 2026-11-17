"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { FormAlert } from "@/shared/components/feedback/form-frame";
import { QueryGate } from "@/shared/components/feedback/query-gate";
import { StatusBadge, TextLink } from "@/shared/components/feedback/page-parts";
import { Button } from "@/shared/components/ui/button";
import { Pagination } from "@/shared/components/ui/pagination";
import { Tabs } from "@/shared/components/ui/tabs";
import { TextField } from "@/shared/components/ui/text-field";
import { correctImportRow, failedRowsCsvUrl } from "../api/migration.api";
import type { RowOutcome } from "../api/migration.api";
import type { ImportBatchDetail, ImportRow } from "../api/wire";
import { migrationKeys, useImportRows } from "../hooks/migration-queries";
import { ROW_SKIP_REASON_LABEL } from "../model/labels";
import { IMPORT_COPY, describeMigrationError } from "../model/messages";

const PAGE_SIZE = 25;

type Counts = NonNullable<ImportBatchDetail["counts"]>;

const OPEN_LINK: Record<string, { base: string; label: string }> = {
  CUSTOMER: { base: "/customers/", label: "고객 보기" },
  PROPERTY: { base: "/properties/", label: "매물 보기" },
};

function RowName({ row }: { row: ImportRow }) {
  const name = row.label?.trim() ? row.label : "(이름 없음)";
  return (
    <span className="flex flex-col">
      <span className="font-semibold text-ink">{name}</span>
      {row.sourceId ? <span className="text-ink-3">원본 번호 {row.sourceId}</span> : null}
    </span>
  );
}

function TargetLink({ targetType, id }: { targetType: string; id: number | null | undefined }) {
  const link = OPEN_LINK[targetType];
  if (!link || id === null || id === undefined) return null;
  return <TextLink href={`${link.base}${id}`}>{link.label}</TextLink>;
}

function FailedRow({
  batchId,
  row,
  isLocked,
}: {
  batchId: number;
  row: ImportRow;
  isLocked: boolean;
}) {
  const queryClient = useQueryClient();
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [error, setError] = useState<string>();
  const fixable = new Set(row.issues.filter((issue) => issue.correctable).map((i) => i.field));
  const fields = row.fields.filter((field) => fixable.has(field.field));

  const mutation = useMutation({
    mutationFn: correctImportRow,
    onSuccess: async () => {
      setError(undefined);
      setDrafts({});
      await queryClient.invalidateQueries({ queryKey: migrationKeys.rowsAll(batchId) });
    },
    onError: (caught) => {
      setError(describeMigrationError(caught, "고친 값을 저장하지 못했습니다."));
    },
  });

  const changed = Object.entries(drafts).filter(
    ([field, value]) => value !== (fields.find((item) => item.field === field)?.value ?? ""),
  );

  return (
    <li className="flex flex-col gap-3 rounded-control border border-line bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-col gap-1">
          <span className="text-caption font-semibold text-ink-2">파일 {row.rowNumber}행</span>
          <RowName row={row} />
        </div>
        {row.readyToRetry ? (
          <StatusBadge tone="teal" label="고침 저장됨" />
        ) : (
          <StatusBadge tone="red" label="실패" />
        )}
      </div>
      {row.readyToRetry ? (
        <p className="text-caption text-ink-2">{IMPORT_COPY.readyToRetry}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {row.issues.map((issue, index) => (
            <li key={`${issue.code}-${index}`} className="flex flex-col gap-0.5 text-caption">
              <span className="font-semibold text-danger">
                {issue.fieldLabel ? `${issue.fieldLabel}: ` : ""}
                {issue.message}
              </span>
              <span className="text-ink-2">고치는 방법: {issue.fix}</span>
            </li>
          ))}
        </ul>
      )}
      {fields.length > 0 && !isLocked ? (
        <form
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (changed.length === 0) {
              setError(IMPORT_COPY.correctionNothing);
              return;
            }
            mutation.mutate({
              batchId,
              rowNumber: row.rowNumber,
              values: Object.fromEntries(changed),
            });
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            {fields.map((field) => (
              <TextField
                key={field.field}
                label={field.label}
                value={drafts[field.field] ?? field.value ?? ""}
                onValueChange={(value) => {
                  setError(undefined);
                  setDrafts((current) => ({ ...current, [field.field]: value }));
                }}
                disabled={mutation.isPending}
              />
            ))}
          </div>
          {error ? <FormAlert>{error}</FormAlert> : null}
          <div>
            <Button type="submit" size="sm" variant="outlined" isLoading={mutation.isPending}>
              고친 값 저장
            </Button>
          </div>
        </form>
      ) : null}
      {fields.length === 0 && !row.readyToRetry ? (
        <p className="text-caption text-ink-2">{IMPORT_COPY.fixInFile}</p>
      ) : null}
    </li>
  );
}

function OutcomeList({
  batch,
  outcome,
  isLocked,
}: {
  batch: ImportBatchDetail;
  outcome: RowOutcome;
  isLocked: boolean;
}) {
  const [page, setPage] = useState(1);
  const query = useImportRows(batch.batchId, outcome, { page: page - 1, size: PAGE_SIZE });
  return (
    <QueryGate query={query} loadingLabel="줄별 결과를 불러오는 중입니다.">
      {(data) => {
        const pageCount = Math.max(1, Math.ceil(data.totalElements / PAGE_SIZE));
        if (data.rows.length === 0) {
          return <p className="py-4 text-caption text-ink-2">{IMPORT_COPY.noRowsInTab[outcome]}</p>;
        }
        return (
          <div className="flex flex-col gap-4">
            {outcome === "FAILED" ? (
              <ul aria-label="실패한 줄" className="flex flex-col gap-3">
                {data.rows.map((row) => (
                  <FailedRow
                    key={row.rowNumber}
                    batchId={batch.batchId}
                    row={row}
                    isLocked={isLocked}
                  />
                ))}
              </ul>
            ) : (
              <ul
                aria-label={outcome === "SUCCEEDED" ? "성공한 줄" : "제외한 줄"}
                className="flex flex-col divide-y divide-line rounded-control border border-line bg-white"
              >
                {data.rows.map((row) => (
                  <li
                    key={row.rowNumber}
                    className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-caption"
                  >
                    <span className="flex items-center gap-4">
                      <span className="w-20 text-ink-2">파일 {row.rowNumber}행</span>
                      <RowName row={row} />
                    </span>
                    <span className="flex items-center gap-3">
                      {outcome === "SKIPPED" && row.skipReason ? (
                        <span className="text-ink-2">
                          {ROW_SKIP_REASON_LABEL[row.skipReason] ?? row.skipReason}
                        </span>
                      ) : null}
                      <TargetLink targetType={batch.targetType} id={row.targetId} />
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {pageCount > 1 ? (
              <Pagination
                label="줄별 결과 쪽 이동"
                page={page}
                pageCount={pageCount}
                onPageChange={setPage}
              />
            ) : null}
          </div>
        );
      }}
    </QueryGate>
  );
}

/** 이전 결과를 성공·실패·제외로 나누어 줄 단위로 보여 주고 실패한 줄은 앱에서 고치게 한다. */
export function RowResults({
  batch,
  counts,
  isLocked,
}: {
  batch: ImportBatchDetail;
  counts: Counts;
  isLocked: boolean;
}) {
  const [active, setActive] = useState<RowOutcome | "">("");
  const defaultKey: RowOutcome =
    counts.failed > 0 ? "FAILED" : counts.succeeded > 0 ? "SUCCEEDED" : "SKIPPED";
  const current: RowOutcome = active === "" ? defaultKey : active;
  const tab = (key: RowOutcome, label: string, count: number) => ({
    key,
    label: `${label} ${count}건`,
    panel: key === current ? <OutcomeList batch={batch} outcome={key} isLocked={isLocked} /> : null,
  });
  return (
    <section aria-label="줄별 결과" className="flex flex-col gap-4">
      <p className="text-body font-semibold text-ink">
        {IMPORT_COPY.resultHeadline(
          counts.total,
          counts.succeeded,
          counts.failed,
          counts.skippedDuplicate,
        )}
      </p>
      {counts.failed > 0 ? (
        <div className="flex flex-col gap-2 rounded-control border border-line bg-surface p-4">
          <p className="text-caption text-ink">{IMPORT_COPY.failedGuide}</p>
          <div>
            <a
              href={failedRowsCsvUrl(batch.batchId)}
              download
              className="text-caption font-semibold text-primary hover:underline"
            >
              실패한 줄 내려받기 (CSV)
            </a>
          </div>
        </div>
      ) : null}
      <Tabs
        label="이전 결과 구분"
        activeKey={current}
        onActiveKeyChange={(key) => setActive(key as RowOutcome)}
        items={[
          tab("FAILED", "실패", counts.failed),
          tab("SUCCEEDED", "성공", counts.succeeded),
          tab("SKIPPED", "제외", counts.skippedDuplicate),
        ]}
      />
    </section>
  );
}
