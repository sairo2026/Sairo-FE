"use client";

import { useState } from "react";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Chip } from "@/shared/components/ui/chip";
import { DataTable } from "@/shared/components/ui/data-table";
import type { PageSize } from "@/shared/components/ui/data-table";
import { PageHeader } from "@/shared/components/ui/page-header";
import { formatSeoulDate } from "@/shared/lib/format";
import { useOfficeAccess } from "@/shared/session/office-access-context";
import { FormNotice } from "@/shared/components/feedback/form-frame";
import { useTasks } from "../hooks/home-queries";
import { TASK_SOURCE_LABEL, TASK_STATUS_LABEL, TASK_STATUS_TONE } from "../model/labels";
import { describeWorkError } from "../model/messages";
import { TaskDialog } from "./task-dialog";
import type { TaskItem } from "./task-dialog";

const FILTERS = [
  { key: "TODO", label: "미완료" },
  { key: "DONE", label: "완료" },
  { key: "", label: "전체" },
] as const;

export function TaskListScreen() {
  const { role, isReadOnly } = useOfficeAccess();
  const [status, setStatus] = useState<string>("TODO");
  const [page, setPage] = useState(1);
  const [size, setSize] = useState<PageSize>(25);
  const [selected, setSelected] = useState<TaskItem | null>(null);
  const [creating, setCreating] = useState(false);
  const query = useTasks({
    status: status === "" ? undefined : status,
    page: page - 1,
    size,
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="업무"
        description="직접 만든 업무와 방문·잔금·만기에서 자동으로 만들어진 업무를 봅니다."
        actions={
          <Button onClick={() => setCreating(true)} disabled={isReadOnly}>
            + 업무 만들기
          </Button>
        }
      />
      {role === "DEPUTY" ? <FormNotice>본인이 담당자인 업무만 보입니다.</FormNotice> : null}
      <div role="group" aria-label="업무 상태" className="flex gap-2">
        {FILTERS.map((item) => (
          <Chip
            key={item.label}
            isSelected={status === item.key}
            onClick={() => {
              setStatus(item.key);
              setPage(1);
            }}
          >
            {item.label}
          </Chip>
        ))}
      </div>
      <DataTable
        caption="업무 목록"
        rows={query.data?.items ?? []}
        getRowId={(row) => String(row.taskId)}
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
          query.isError ? describeWorkError(query.error, "업무를 불러오지 못했습니다.") : undefined
        }
        onRetry={() => void query.refetch()}
        emptyMessage="표시할 업무가 없습니다."
        columns={[
          {
            key: "title",
            header: "제목",
            render: (row) => (
              <button
                type="button"
                aria-label={`업무 ${row.title} 열기`}
                onClick={() => setSelected(row)}
                className="text-left font-semibold text-ink hover:text-primary hover:underline"
              >
                {row.title}
              </button>
            ),
          },
          { key: "assignee", header: "담당자", render: (row) => row.assigneeName },
          {
            key: "due",
            header: "예정일",
            render: (row) =>
              `${formatSeoulDate(row.dueDate)}${row.dueTime ? ` ${row.dueTime.slice(0, 5)}` : ""}`,
          },
          {
            key: "source",
            header: "구분",
            render: (row) => TASK_SOURCE_LABEL[row.sourceType] ?? row.sourceType,
          },
          {
            key: "status",
            header: "상태",
            render: (row) => (
              <Badge tone={TASK_STATUS_TONE[row.status] ?? "gray"}>
                {TASK_STATUS_LABEL[row.status] ?? row.status}
              </Badge>
            ),
          },
        ]}
      />
      <TaskDialog isOpen={creating} task={null} onClose={() => setCreating(false)} />
      <TaskDialog isOpen={selected !== null} task={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
