"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { ImportMappingSuggestionResponse } from "@/lib/api/contracts/migration.schema";
import { FormAlert } from "@/shared/components/feedback/form-frame";
import { QueryGate } from "@/shared/components/feedback/query-gate";
import { StatusBadge } from "@/shared/components/feedback/page-parts";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { TextField } from "@/shared/components/ui/text-field";
import { confirmImportMapping } from "../api/migration.api";
import { migrationKeys, useMappingSuggestion } from "../hooks/migration-queries";
import { IMPORT_COPY, describeMigrationError } from "../model/messages";

const UNMAPPED = "";

type Props = {
  batchId: number;
  isLocked: boolean;
};

function initialSelection(data: ImportMappingSuggestionResponse): Record<string, string> {
  const selection: Record<string, string> = {};
  for (const column of data.sourceColumns) {
    selection[column.name] = column.mappedTargetField ?? UNMAPPED;
  }
  return selection;
}

export function validateMapping(
  data: ImportMappingSuggestionResponse,
  selection: Record<string, string>,
  sourceSystem: string,
): { sourceSystem?: string; mapping?: string } {
  const result: { sourceSystem?: string; mapping?: string } = {};
  if (sourceSystem.trim() === "") result.sourceSystem = IMPORT_COPY.sourceSystemRequired;
  const chosen = Object.values(selection).filter((value) => value !== UNMAPPED);
  const missing = data.availableTargetFields
    .filter((field) => field.required && !chosen.includes(field.field))
    .map((field) => field.label);
  if (missing.length > 0) {
    result.mapping = IMPORT_COPY.requiredFieldMissing(missing.join(", "));
    return result;
  }
  const duplicate = data.availableTargetFields.find(
    (field) => chosen.filter((value) => value === field.field).length > 1,
  );
  if (duplicate) result.mapping = IMPORT_COPY.duplicateTarget(duplicate.label);
  return result;
}

function MappingForm({
  batchId,
  isLocked,
  data,
}: Props & { data: ImportMappingSuggestionResponse }) {
  const queryClient = useQueryClient();
  const [selection, setSelection] = useState(() => initialSelection(data));
  const [sourceSystem, setSourceSystem] = useState("");
  const [errors, setErrors] = useState<{ sourceSystem?: string; mapping?: string }>({});
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<string>();

  const mutation = useMutation({
    mutationFn: confirmImportMapping,
    onSuccess: async () => {
      setError(undefined);
      setMessage(IMPORT_COPY.mappingSaved);
      await queryClient.invalidateQueries({ queryKey: migrationKeys.batch(batchId) });
      await queryClient.invalidateQueries({ queryKey: migrationKeys.previewAll(batchId) });
    },
    onError: (caught) => {
      setMessage(undefined);
      setError(describeMigrationError(caught, "매핑을 저장하지 못했습니다."));
    },
  });

  function submit() {
    const problems = validateMapping(data, selection, sourceSystem);
    setErrors(problems);
    setError(undefined);
    setMessage(undefined);
    if (problems.sourceSystem || problems.mapping) return;
    mutation.mutate({
      batchId,
      body: {
        sourceSystem: sourceSystem.trim(),
        mappings: Object.entries(selection)
          .filter(([, targetField]) => targetField !== UNMAPPED)
          .map(([sourceColumn, targetField]) => ({ sourceColumn, targetField })),
      },
    });
  }

  const confidenceByColumn = new Map(
    data.suggestedMappings.map((item) => [item.sourceColumn, item.confidence]),
  );

  if (data.availableTargetFields.length === 0) {
    return <FormAlert>{IMPORT_COPY.noTargetFields}</FormAlert>;
  }

  return (
    <div className="flex flex-col gap-5">
      <TextField
        label={IMPORT_COPY.sourceSystemLabel}
        value={sourceSystem}
        onValueChange={(value) => {
          setSourceSystem(value);
          setErrors((current) => ({ ...current, sourceSystem: undefined }));
        }}
        error={errors.sourceSystem}
        hint="예: 사용하던 프로그램 이름과 연도"
        maxLength={50}
        disabled={isLocked}
        required
      />
      <div className="overflow-x-auto rounded-control border border-line">
        <table className="w-full min-w-[40rem] border-collapse text-left text-caption">
          <caption className="sr-only">원본 열과 사이로 항목 연결</caption>
          <thead className="bg-surface">
            <tr>
              {["원본 열", "샘플 값", "사이로 항목", "추천"].map((column) => (
                <th key={column} scope="col" className="px-3 py-2 font-semibold text-ink">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.sourceColumns.map((column) => {
              const value = selection[column.name] ?? UNMAPPED;
              const confidence = confidenceByColumn.get(column.name);
              return (
                <tr key={column.name} className="border-t border-line align-top">
                  <th scope="row" className="px-3 py-2 text-left font-semibold text-ink">
                    {column.name}
                  </th>
                  <td className="px-3 py-2 text-ink-2">{column.sampleValues.join(", ") || "-"}</td>
                  <td className="px-3 py-2">
                    <select
                      aria-label={`${column.name} 열에 연결할 사이로 항목`}
                      value={value}
                      disabled={isLocked}
                      onChange={(event) => {
                        const next = event.target.value;
                        setSelection((current) => ({ ...current, [column.name]: next }));
                        setErrors((current) => ({ ...current, mapping: undefined }));
                      }}
                      className="h-10 w-full rounded-control border border-line bg-surface px-2 text-caption"
                    >
                      <option value={UNMAPPED}>연결 안 함</option>
                      {data.availableTargetFields.map((field) => (
                        <option key={field.field} value={field.field}>
                          {field.label}
                          {field.required ? " (필수)" : ""}
                        </option>
                      ))}
                    </select>
                    {value === UNMAPPED ? (
                      <span className="mt-1 block text-ink-2">
                        연결되지 않은 열은 이전되지 않습니다.
                      </span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 text-ink-2">
                    {confidence === undefined ? (
                      "-"
                    ) : (
                      <StatusBadge tone="teal" label={`${Math.round(confidence * 100)}%`} />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {errors.mapping ? <FormAlert>{errors.mapping}</FormAlert> : null}
      {error ? <FormAlert>{error}</FormAlert> : null}
      {message ? (
        <p role="status" className="text-caption font-semibold text-primary">
          {message}
        </p>
      ) : null}
      <div>
        <Button isLoading={mutation.isPending} disabled={isLocked} onClick={submit}>
          매핑 확정하고 미리보기
        </Button>
      </div>
    </div>
  );
}

export function MappingPanel({ batchId, isLocked }: Props) {
  const query = useMappingSuggestion(batchId, true);
  return (
    <Card title="매핑 검토">
      <p className="mb-4 text-caption text-ink-2">
        올린 파일의 열이 사이로의 어떤 항목인지 확인합니다. 추천은 참고용이며 바꿀 수 있습니다.
      </p>
      <QueryGate query={query} loadingLabel="매핑 제안을 불러오는 중입니다.">
        {(data) => <MappingForm batchId={batchId} isLocked={isLocked} data={data} />}
      </QueryGate>
    </Card>
  );
}
