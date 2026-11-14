"use client";

import { useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { SelectField } from "@/shared/components/ui/select-field";
import { TextField } from "@/shared/components/ui/text-field";
import { describeOpsError } from "../model/ops-errors";
import {
  TARGET_FIELDS,
  TARGET_TYPE_LABELS,
  draftFromMapping,
  isMappingTargetType,
  mappingBody,
  validateMapping,
} from "./import-support-model";
import type { ImportSupportDetail, MappingDraft, MappingTargetType } from "./import-support-model";
import type { MappingInput } from "./import-support-api";

const TARGET_TYPE_OPTIONS = (Object.keys(TARGET_TYPE_LABELS) as MappingTargetType[]).map(
  (value) => ({ value, label: TARGET_TYPE_LABELS[value] }),
);

export function MappingEditor({
  detail,
  onSave,
}: {
  detail: ImportSupportDetail;
  onSave: (input: MappingInput) => Promise<unknown>;
}) {
  const current = detail.currentMapping;
  const initialType: MappingTargetType =
    current && isMappingTargetType(current.targetType) ? current.targetType : "CUSTOMER";
  const [targetType, setTargetType] = useState<MappingTargetType>(initialType);
  const [sourceSystem, setSourceSystem] = useState(current?.sourceSystem ?? detail.sourceSystem);
  const [draft, setDraft] = useState<MappingDraft>(() =>
    draftFromMapping(detail.sourceColumns, current?.items ?? []),
  );
  const [problems, setProblems] = useState<string[]>([]);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const fieldOptions = [
    { value: "", label: "연결 안 함" },
    ...TARGET_FIELDS[targetType].map((field) => ({
      value: field.field,
      label: field.required ? `${field.label} (필수)` : field.label,
    })),
  ];

  function changeTargetType(next: string) {
    if (!isMappingTargetType(next)) return;
    setTargetType(next);
    setDraft(draftFromMapping(detail.sourceColumns, []));
    setProblems([]);
  }

  async function save() {
    const found = validateMapping(draft, targetType);
    const systemName = sourceSystem.trim();
    if (systemName === "") found.unshift("원본 시스템 이름을 입력해 주세요.");
    setProblems(found);
    setMessage(null);
    if (found.length > 0) return;
    setIsSaving(true);
    try {
      await onSave({ sourceSystem: systemName, targetType, mappings: mappingBody(draft) });
      setMessage({ ok: true, text: "새 매핑 버전을 저장했습니다." });
    } catch (error) {
      setMessage({ ok: false, text: describeOpsError(error, "매핑을 저장하지 못했습니다.") });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SelectField
          label="대상 종류"
          value={targetType}
          options={TARGET_TYPE_OPTIONS}
          onValueChange={changeTargetType}
        />
        <TextField label="원본 시스템" value={sourceSystem} onValueChange={setSourceSystem} />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {detail.sourceColumns.map((column) => (
          <SelectField
            key={column}
            label={`원본 열 ${column}`}
            value={draft[column] ?? ""}
            options={fieldOptions}
            onValueChange={(value) => setDraft({ ...draft, [column]: value })}
          />
        ))}
      </div>
      <p className="text-caption text-ink-2">
        저장할 때마다 새 매핑 버전이 만들어지고 이전 버전은 이력으로 남습니다. 원본 값은 이 화면에
        표시되지 않습니다.
      </p>
      {problems.length > 0 ? (
        <ul role="alert" className="list-disc pl-5 text-caption text-danger">
          {problems.map((problem) => (
            <li key={problem}>{problem}</li>
          ))}
        </ul>
      ) : null}
      {message ? (
        <p
          role={message.ok ? "status" : "alert"}
          className={message.ok ? "text-caption text-ink" : "text-caption text-danger"}
        >
          {message.text}
        </p>
      ) : null}
      <div>
        <Button variant="submit" isLoading={isSaving} onClick={() => void save()}>
          매핑 저장
        </Button>
      </div>
    </div>
  );
}
