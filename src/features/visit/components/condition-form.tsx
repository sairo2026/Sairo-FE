"use client";

import { Button } from "@/shared/components/ui/button";
import { DateTimeField } from "@/shared/components/ui/date-time-field";
import { SelectField } from "@/shared/components/ui/select-field";
import { TextField } from "@/shared/components/ui/text-field";
import {
  MAX_DATE_RULES,
  RULE_KEYS,
  RULE_LABEL,
  WEEKDAYS,
  emptyDateRule,
  emptyDateWindow,
  emptyRange,
} from "../model/conditions";
import type {
  ConditionErrors,
  ConditionFormValues,
  DateRuleRow,
  DateWindowKind,
  DateWindowRow,
  RuleKey,
  RuleMode,
  TimeRange,
} from "../model/conditions";

const KIND_OPTIONS: Array<{ value: DateWindowKind; label: string }> = [
  { value: "AVAILABLE", label: "이 날짜만 가능한 시간" },
  { value: "EXCLUDE", label: "제외할 시간대" },
  { value: "BLOCK", label: "하루 종일 방문 불가" },
];

const MODE_OPTIONS: Array<{ value: RuleMode; label: string }> = [
  { value: "FOLLOW", label: "기본 조건 따르기" },
  { value: "VALUE", label: "값 지정" },
  { value: "UNLIMITED", label: "그 날짜는 제한 없음" },
];

function RangeRow({
  label,
  range,
  error,
  disabled,
  onChange,
  onRemove,
}: {
  label: string;
  range: TimeRange;
  error?: string;
  disabled: boolean;
  onChange: (next: TimeRange) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <DateTimeField
        label={`${label} 시작`}
        kind="time"
        value={range.start}
        disabled={disabled}
        onValueChange={(value) => onChange({ ...range, start: value })}
      />
      <DateTimeField
        label={`${label} 종료`}
        kind="time"
        value={range.end}
        disabled={disabled}
        onValueChange={(value) => onChange({ ...range, end: value })}
      />
      <Button variant="ghost" size="sm" disabled={disabled} onClick={onRemove}>
        {label} 삭제
      </Button>
      {error ? (
        <p role="alert" className="w-full text-caption text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function ConditionForm({
  values,
  errors,
  disabled,
  onChange,
}: {
  values: ConditionFormValues;
  errors: ConditionErrors;
  disabled: boolean;
  onChange: (next: ConditionFormValues) => void;
}) {
  function patch(partial: Partial<ConditionFormValues>) {
    onChange({ ...values, ...partial });
  }

  function setWeekday(weekday: number, ranges: TimeRange[]) {
    patch({ weekday: { ...values.weekday, [weekday]: ranges } });
  }

  function setDateWindow(id: string, next: DateWindowRow) {
    patch({ dateWindows: values.dateWindows.map((row) => (row.id === id ? next : row)) });
  }

  function setDateRule(id: string, next: DateRuleRow) {
    patch({ dateRules: values.dateRules.map((row) => (row.id === id ? next : row)) });
  }

  const maxVisitsEmpty = values.maxVisitsPerDay.trim() === "";

  return (
    <div className="flex flex-col gap-8">
      <section aria-labelledby="cond-period" className="flex flex-col gap-4">
        <h2 id="cond-period" className="text-h3 font-semibold text-ink">
          적용 기간
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <DateTimeField
            label="적용 시작일"
            kind="date"
            value={values.appliesFrom}
            disabled={disabled}
            error={errors.appliesFrom}
            onValueChange={(value) => patch({ appliesFrom: value })}
          />
          <DateTimeField
            label="적용 종료일"
            kind="date"
            value={values.appliesUntil}
            disabled={disabled}
            error={errors.appliesUntil}
            onValueChange={(value) => patch({ appliesUntil: value })}
          />
        </div>
      </section>

      <section aria-labelledby="cond-weekday" className="flex flex-col gap-4">
        <h2 id="cond-weekday" className="text-h3 font-semibold text-ink">
          요일별 가능 시간
        </h2>
        <p className="text-caption text-ink-2">
          한 요일에 여러 시간대를 넣을 수 있습니다. 겹치거나 맞닿는 시간대는 저장할 때 하나로
          합쳐집니다.
        </p>
        {WEEKDAYS.map((weekday) => {
          const ranges = values.weekday[weekday.value] ?? [];
          return (
            <div key={weekday.value} className="flex flex-col gap-3 rounded-control bg-surface p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-body font-semibold text-ink">{weekday.label}</span>
                <Button
                  variant="outlined"
                  size="sm"
                  disabled={disabled}
                  onClick={() => setWeekday(weekday.value, [...ranges, emptyRange()])}
                >
                  {weekday.label} 시간대 추가
                </Button>
              </div>
              {ranges.length === 0 ? (
                <p className="text-caption text-ink-3">가능한 시간대가 없습니다.</p>
              ) : null}
              {ranges.map((range) => (
                <RangeRow
                  key={range.id}
                  label={`${weekday.label} 시간대`}
                  range={range}
                  disabled={disabled}
                  error={errors[`weekday-${weekday.value}-${range.id}`]}
                  onChange={(next) =>
                    setWeekday(
                      weekday.value,
                      ranges.map((item) => (item.id === range.id ? next : item)),
                    )
                  }
                  onRemove={() =>
                    setWeekday(
                      weekday.value,
                      ranges.filter((item) => item.id !== range.id),
                    )
                  }
                />
              ))}
            </div>
          );
        })}
      </section>

      <section aria-labelledby="cond-date" className="flex flex-col gap-4">
        <h2 id="cond-date" className="text-h3 font-semibold text-ink">
          날짜별 가능 시간과 날짜 예외
        </h2>
        <p className="text-caption text-ink-2">
          날짜 예외는 그 날짜에 한해 요일별 가능 시간을 대체합니다. 방문할 수 없는 날은 하루 종일
          방문 불가로 입력하세요.
        </p>
        {values.dateWindows.map((row, index) => (
          <div key={row.id} className="flex flex-col gap-3 rounded-control bg-surface p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <DateTimeField
                label={`날짜 예외 ${index + 1} 날짜`}
                kind="date"
                value={row.date}
                disabled={disabled}
                onValueChange={(value) => setDateWindow(row.id, { ...row, date: value })}
              />
              <SelectField
                label={`날짜 예외 ${index + 1} 종류`}
                value={row.kind}
                disabled={disabled}
                options={KIND_OPTIONS}
                onValueChange={(value) =>
                  setDateWindow(row.id, { ...row, kind: value as DateWindowKind })
                }
              />
            </div>
            {row.kind !== "BLOCK" ? (
              <div className="flex flex-wrap gap-3">
                <DateTimeField
                  label={`날짜 예외 ${index + 1} 시작`}
                  kind="time"
                  value={row.start}
                  disabled={disabled}
                  onValueChange={(value) => setDateWindow(row.id, { ...row, start: value })}
                />
                <DateTimeField
                  label={`날짜 예외 ${index + 1} 종료`}
                  kind="time"
                  value={row.end}
                  disabled={disabled}
                  onValueChange={(value) => setDateWindow(row.id, { ...row, end: value })}
                />
              </div>
            ) : null}
            {errors[`dateWindow-${row.id}`] ? (
              <p role="alert" className="text-caption text-danger">
                {errors[`dateWindow-${row.id}`]}
              </p>
            ) : null}
            <div>
              <Button
                variant="ghost"
                size="sm"
                disabled={disabled}
                onClick={() =>
                  patch({ dateWindows: values.dateWindows.filter((item) => item.id !== row.id) })
                }
              >
                날짜 예외 {index + 1} 삭제
              </Button>
            </div>
          </div>
        ))}
        <div>
          <Button
            variant="outlined"
            size="sm"
            disabled={disabled}
            onClick={() => patch({ dateWindows: [...values.dateWindows, emptyDateWindow()] })}
          >
            날짜 예외 추가
          </Button>
        </div>
      </section>

      <section aria-labelledby="cond-limits" className="flex flex-col gap-4">
        <h2 id="cond-limits" className="text-h3 font-semibold text-ink">
          방문 제한
        </h2>
        <p className="text-caption text-ink-2">
          필수 조건을 위반하면 신청과 확정이 제한됩니다. 비워 두면 그 조건은 제한하지 않습니다.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label={RULE_LABEL.maxVisitsPerDay}
            kind="number"
            value={values.maxVisitsPerDay}
            disabled={disabled}
            hint="1~20회. 기본값 3을 미리 채웠으며 바꾸거나 비울 수 있습니다."
            error={errors.maxVisitsPerDay}
            onValueChange={(value) => patch({ maxVisitsPerDay: value })}
          />
          <TextField
            label={RULE_LABEL.minGapMinutes}
            kind="number"
            value={values.minGapMinutes}
            disabled={disabled}
            error={errors.minGapMinutes}
            onValueChange={(value) => patch({ minGapMinutes: value })}
          />
          <TextField
            label={RULE_LABEL.minLeadMinutes}
            kind="number"
            value={values.minLeadMinutes}
            disabled={disabled}
            error={errors.minLeadMinutes}
            onValueChange={(value) => patch({ minLeadMinutes: value })}
          />
          <TextField
            label={RULE_LABEL.singleVisitMaxMinutes}
            kind="number"
            value={values.singleVisitMaxMinutes}
            disabled={disabled}
            error={errors.singleVisitMaxMinutes}
            onValueChange={(value) => patch({ singleVisitMaxMinutes: value })}
          />
        </div>
        {maxVisitsEmpty ? (
          <p
            role="status"
            className="rounded-control bg-primary-soft px-4 py-3 text-caption text-ink-2"
          >
            하루 최대 방문 횟수를 비우면 제한 없음으로 저장됩니다.
          </p>
        ) : null}
        <SelectField
          label="연속·분산 선호"
          value={values.grouping}
          disabled={disabled}
          placeholder="선택하지 않음"
          options={[
            { value: "CONSECUTIVE", label: "연속해서 방문" },
            { value: "SPREAD", label: "나누어서 방문" },
          ]}
          onValueChange={(value) => patch({ grouping: value as ConditionFormValues["grouping"] })}
        />
        <p className="text-caption text-ink-2">
          연속·분산 선호는 신청 목록의 표시 순서에만 참고하며 위반으로 판정하지 않습니다.
        </p>
      </section>

      <section aria-labelledby="cond-rules" className="flex flex-col gap-4">
        <h2 id="cond-rules" className="text-h3 font-semibold text-ink">
          날짜별 필수 조건
        </h2>
        <p className="text-caption text-ink-2">
          날짜를 정해 그 날짜의 조건만 따로 정합니다. 정하지 않은 항목은 기본 조건을 따릅니다.
        </p>
        {values.dateRules.map((row, index) => (
          <div key={row.id} className="flex flex-col gap-3 rounded-control bg-surface p-4">
            <DateTimeField
              label={`날짜별 조건 ${index + 1} 날짜`}
              kind="date"
              value={row.date}
              disabled={disabled}
              error={errors[`dateRule-${row.id}`]}
              onValueChange={(value) => setDateRule(row.id, { ...row, date: value })}
            />
            {RULE_KEYS.map((key: RuleKey) => {
              const field = row[key];
              return (
                <div key={key} className="grid gap-3 sm:grid-cols-2">
                  <SelectField
                    label={`${RULE_LABEL[key]} (날짜별 조건 ${index + 1})`}
                    value={field.mode}
                    disabled={disabled}
                    options={MODE_OPTIONS}
                    onValueChange={(value) =>
                      setDateRule(row.id, { ...row, [key]: { ...field, mode: value as RuleMode } })
                    }
                  />
                  {field.mode === "VALUE" ? (
                    <TextField
                      label={`${RULE_LABEL[key]} 값 (날짜별 조건 ${index + 1})`}
                      kind="number"
                      value={field.value}
                      disabled={disabled}
                      error={errors[`dateRule-${row.id}-${key}`]}
                      onValueChange={(value) =>
                        setDateRule(row.id, { ...row, [key]: { ...field, value } })
                      }
                    />
                  ) : null}
                </div>
              );
            })}
            <div>
              <Button
                variant="ghost"
                size="sm"
                disabled={disabled}
                onClick={() =>
                  patch({ dateRules: values.dateRules.filter((item) => item.id !== row.id) })
                }
              >
                날짜별 조건 {index + 1} 삭제
              </Button>
            </div>
          </div>
        ))}
        {errors.dateRules ? (
          <p role="alert" className="text-caption text-danger">
            {errors.dateRules}
          </p>
        ) : null}
        <div>
          <Button
            variant="outlined"
            size="sm"
            disabled={disabled || values.dateRules.length >= MAX_DATE_RULES}
            onClick={() => patch({ dateRules: [...values.dateRules, emptyDateRule()] })}
          >
            날짜별 조건 추가
          </Button>
        </div>
      </section>
    </div>
  );
}
