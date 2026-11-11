"use client";

import { DateTimeField } from "@/shared/components/ui/date-time-field";
import { SelectField } from "@/shared/components/ui/select-field";
import { TextField } from "@/shared/components/ui/text-field";
import type { FieldDefinition } from "../model/form";

export type FieldValueMap = Record<number, string>;

function rangeHint(definition: FieldDefinition): string | undefined {
  if (definition.fieldType !== "NUMBER") return undefined;
  const unit = definition.unit ?? "";
  const parts: string[] = [];
  parts.push(definition.numberKind === "INTEGER" ? "정수" : "소수 입력 가능");
  const { minValue, maxValue } = definition;
  if (minValue !== null && minValue !== undefined && maxValue !== null && maxValue !== undefined) {
    parts.push(`${minValue}~${maxValue}${unit}`);
  } else if (minValue !== null && minValue !== undefined) {
    parts.push(`${minValue}${unit} 이상`);
  } else if (maxValue !== null && maxValue !== undefined) {
    parts.push(`${maxValue}${unit} 이하`);
  } else if (definition.numberKind === "INTEGER" || unit !== "") {
    parts.push(unit === "" ? "음수 입력 가능" : `음수 입력 가능, 단위 ${unit}`);
  }
  return parts.join(", ");
}

export function CustomFieldsSection({
  definitions,
  values,
  errors,
  onChange,
  disabled,
}: {
  definitions: readonly FieldDefinition[];
  values: FieldValueMap;
  errors: Record<number, string | undefined>;
  onChange: (fieldDefinitionId: number, raw: string) => void;
  disabled?: boolean;
}) {
  const active = definitions.filter((definition) => definition.active);
  if (active.length === 0) {
    return <p className="text-caption text-ink-2">이 카테고리에는 전용 입력 항목이 없습니다.</p>;
  }
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
      {active.map((definition) => {
        const id = definition.fieldDefinitionId;
        const raw = values[id] ?? "";
        const unit = definition.unit ? ` (${definition.unit})` : "";
        const label = `${definition.fieldName}${unit}`;
        const error = errors[id];
        if (definition.fieldType === "BOOLEAN") {
          return (
            <SelectField
              key={id}
              label={label}
              value={raw}
              disabled={disabled}
              options={[
                { value: "", label: "모름" },
                { value: "true", label: "예" },
                { value: "false", label: "아니오" },
              ]}
              onValueChange={(value) => onChange(id, value)}
              error={error}
            />
          );
        }
        if (definition.fieldType === "DATE") {
          return (
            <DateTimeField
              key={id}
              label={label}
              kind="date"
              value={raw}
              disabled={disabled}
              onValueChange={(value) => onChange(id, value)}
              error={error}
            />
          );
        }
        return (
          <TextField
            key={id}
            label={label}
            value={raw}
            disabled={disabled}
            inputMode={definition.fieldType === "NUMBER" ? "decimal" : undefined}
            hint={rangeHint(definition)}
            onValueChange={(value) => onChange(id, value)}
            error={error}
          />
        );
      })}
    </div>
  );
}
