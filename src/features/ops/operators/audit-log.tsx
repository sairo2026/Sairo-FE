"use client";

import { useState } from "react";
import { DateTimeField } from "@/shared/components/ui/date-time-field";
import { SelectField } from "@/shared/components/ui/select-field";
import { TextField } from "@/shared/components/ui/text-field";
import { formatSeoulDateTime } from "@/shared/lib/format";
import { OpsFilterBar } from "../components/common/ops-filter-bar";
import { OpsScreen } from "../components/common/ops-screen";
import { OpsTable, useOpsPaging } from "../components/common/ops-table";
import { useAuditLog } from "./operator-api";
import {
  AUDIT_ACTION_LABELS,
  AUDIT_TARGET_LABELS,
  seoulDayStart,
  seoulNextDayStart,
} from "./operator-model";

type Filters = {
  actionType: string;
  operatorId: string;
  targetType: string;
  targetId: string;
  from: string;
  to: string;
};

const EMPTY: Filters = {
  actionType: "",
  operatorId: "",
  targetType: "",
  targetId: "",
  from: "",
  to: "",
};

const ACTION_OPTIONS = [
  { value: "", label: "전체" },
  ...Object.entries(AUDIT_ACTION_LABELS).map(([value, label]) => ({ value, label })),
];

const TARGET_OPTIONS = [
  { value: "", label: "전체" },
  ...Object.entries(AUDIT_TARGET_LABELS).map(([value, label]) => ({ value, label })),
];

function AuditTable() {
  const [draft, setDraft] = useState<Filters>(EMPTY);
  const [applied, setApplied] = useState<Filters>(EMPTY);
  const [rangeError, setRangeError] = useState<string | undefined>();
  const paging = useOpsPaging();
  const query = useAuditLog({
    actionType: applied.actionType,
    operatorId: applied.operatorId,
    targetType: applied.targetType,
    targetId: applied.targetId,
    from: seoulDayStart(applied.from),
    to: seoulNextDayStart(applied.to),
    page: paging.page,
    size: paging.size,
  });

  function set<K extends keyof Filters>(key: K, value: Filters[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  function apply() {
    if (draft.from !== "" && draft.to !== "" && draft.from > draft.to) {
      setRangeError("시작일이 종료일보다 늦습니다.");
      return;
    }
    setRangeError(undefined);
    setApplied(draft);
    paging.resetPage();
  }

  return (
    <div className="flex flex-col gap-4">
      <OpsFilterBar
        label="감사 이력 조회"
        onApply={apply}
        onReset={() => {
          setDraft(EMPTY);
          setApplied(EMPTY);
          setRangeError(undefined);
          paging.resetPage();
        }}
      >
        <SelectField
          label="행위 종류"
          value={draft.actionType}
          options={ACTION_OPTIONS}
          onValueChange={(value) => set("actionType", value)}
        />
        <TextField
          label="운영자 ID"
          kind="number"
          value={draft.operatorId}
          onValueChange={(value) => set("operatorId", value)}
        />
        <SelectField
          label="대상 종류"
          value={draft.targetType}
          options={TARGET_OPTIONS}
          onValueChange={(value) => set("targetType", value)}
        />
        <TextField
          label="대상 ID"
          kind="number"
          value={draft.targetId}
          onValueChange={(value) => set("targetId", value)}
        />
        <DateTimeField
          label="시작일"
          kind="date"
          value={draft.from}
          onValueChange={(value) => set("from", value)}
        />
        <DateTimeField
          label="종료일"
          kind="date"
          value={draft.to}
          onValueChange={(value) => set("to", value)}
          error={rangeError}
        />
      </OpsFilterBar>
      <p className="text-caption text-ink-2">
        원문 접근 승인 이력은 행위 종류에서 원문 접근 요청·승인·거절·실행·다운로드·회수를 골라
        확인합니다. 본인이 낸 요청은 본인이 승인할 수 없습니다. 시각은 서울 기준이고 종료일은 그 날
        끝까지 포함합니다.
      </p>
      <OpsTable
        caption="감사 이력"
        query={query}
        paging={paging}
        getRowId={(row) => String(row.auditId)}
        emptyMessage="조건에 맞는 감사 이력이 없습니다."
        columns={[
          { key: "at", header: "기록 시각", render: (row) => formatSeoulDateTime(row.createdAt) },
          { key: "operator", header: "운영자", render: (row) => row.operatorName },
          {
            key: "action",
            header: "행위",
            render: (row) => AUDIT_ACTION_LABELS[row.actionType] ?? row.actionType,
          },
          {
            key: "target",
            header: "대상",
            render: (row) =>
              row.targetType
                ? `${AUDIT_TARGET_LABELS[row.targetType] ?? row.targetType}${row.targetId ? ` ${row.targetId}` : ""}`
                : "-",
          },
          { key: "detail", header: "상세", render: (row) => row.detail ?? "-" },
        ]}
      />
    </div>
  );
}

export function AuditLogScreen() {
  return (
    <OpsScreen
      title="감사 이력"
      description="운영자의 처리 이력을 봅니다. 기록에는 마스킹된 운영 정보만 담깁니다."
      roles={["SECURITY_ADMIN"]}
    >
      <AuditTable />
    </OpsScreen>
  );
}
