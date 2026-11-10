"use client";

import { useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { DateTimeField } from "@/shared/components/ui/date-time-field";
import { RadioGroup } from "@/shared/components/ui/select-field";
import { TextAreaField } from "@/shared/components/ui/textarea-field";
import { OpsStatusBadge } from "../components/common/ops-status-badge";
import { OpsTable, useOpsPaging } from "../components/common/ops-table";
import { ActionDialog } from "../content-common/action-dialog";
import { useBusinessCalendar, useCalendarUpdate } from "./company-api";
import { CALENDAR_REASON_MAX } from "./company-model";

type Target = { date: string; isBusinessDay: boolean; reason: string; isNew: boolean };

const DAY_STATUS = {
  BUSINESS: { label: "영업일", tone: "green" },
  HOLIDAY: { label: "휴무", tone: "red" },
} as const;

function CalendarDialog({
  target,
  onDone,
  onClose,
}: {
  target: Target;
  onDone: (message: string) => void;
  onClose: () => void;
}) {
  const update = useCalendarUpdate();
  const [date, setDate] = useState(target.date);
  const [mode, setMode] = useState(target.isBusinessDay ? "BUSINESS" : "HOLIDAY");
  const [reason, setReason] = useState(target.reason);
  const [errors, setErrors] = useState<{ date?: string; reason?: string }>({});

  async function confirm() {
    const found: { date?: string; reason?: string } = {};
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) found.date = "날짜를 입력해 주세요.";
    if (reason.length > CALENDAR_REASON_MAX) {
      found.reason = `사유는 ${CALENDAR_REASON_MAX}자 이내로 입력해 주세요.`;
    }
    setErrors(found);
    if (Object.keys(found).length > 0) return false;
    const isBusinessDay = mode === "BUSINESS";
    await update.mutateAsync({
      date,
      isBusinessDay,
      reason: reason.trim() === "" ? null : reason.trim(),
    });
    onDone(`${date}을(를) ${isBusinessDay ? "영업일" : "휴무"}로 반영했습니다.`);
    return undefined;
  }

  return (
    <ActionDialog
      isOpen
      title={target.isNew ? "영업일·휴무일 추가" : "영업일·휴무일 변경"}
      confirmLabel="반영"
      onClose={onClose}
      onConfirm={confirm}
    >
      <p>첫 답변과 기업 문의 목표 시각을 계산할 때 이 달력을 씁니다. 날짜는 서울 기준입니다.</p>
      {target.isNew ? (
        <DateTimeField
          label="날짜"
          kind="date"
          value={date}
          error={errors.date}
          onValueChange={setDate}
        />
      ) : (
        <p className="text-body font-semibold text-ink">{target.date}</p>
      )}
      <RadioGroup
        legend="구분"
        name="calendar-mode"
        value={mode}
        options={[
          { value: "BUSINESS", label: "영업일" },
          { value: "HOLIDAY", label: "휴무" },
        ]}
        onValueChange={setMode}
      />
      <TextAreaField
        label="사유(선택)"
        rows={3}
        value={reason}
        error={errors.reason}
        hint={`${reason.length}/${CALENDAR_REASON_MAX}자`}
        onValueChange={setReason}
      />
    </ActionDialog>
  );
}

export function CalendarSection({ onNotice }: { onNotice: (message: string) => void }) {
  const paging = useOpsPaging();
  const query = useBusinessCalendar({ page: paging.page, size: paging.size });
  const [target, setTarget] = useState<Target | null>(null);

  return (
    <Card title="영업일 달력">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-body text-ink-2">
            날짜별로 영업일과 휴무를 바꿉니다. 사유는 최대 {CALENDAR_REASON_MAX}자입니다.
          </p>
          <Button
            variant="outlined"
            onClick={() => setTarget({ date: "", isBusinessDay: false, reason: "", isNew: true })}
          >
            날짜 추가
          </Button>
        </div>
        <OpsTable
          caption="영업일 달력"
          query={query}
          paging={paging}
          getRowId={(row) => row.calendarDate}
          emptyMessage="등록된 영업일·휴무일이 없습니다."
          columns={[
            { key: "date", header: "날짜", render: (row) => row.calendarDate },
            {
              key: "type",
              header: "구분",
              render: (row) => (
                <OpsStatusBadge
                  status={row.isBusinessDay ? "BUSINESS" : "HOLIDAY"}
                  map={DAY_STATUS}
                />
              ),
            },
            { key: "reason", header: "사유", render: (row) => row.reason ?? "-" },
            {
              key: "actions",
              header: "처리",
              render: (row) => (
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={`${row.calendarDate} 변경`}
                  onClick={() =>
                    setTarget({
                      date: row.calendarDate,
                      isBusinessDay: row.isBusinessDay,
                      reason: row.reason ?? "",
                      isNew: false,
                    })
                  }
                >
                  변경
                </Button>
              ),
            },
          ]}
        />
      </div>
      {target ? (
        <CalendarDialog target={target} onDone={onNotice} onClose={() => setTarget(null)} />
      ) : null}
    </Card>
  );
}
