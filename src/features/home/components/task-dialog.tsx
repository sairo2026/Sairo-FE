"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { TaskListResponse } from "@/lib/api/contracts/work.schema";
import { listCustomers } from "@/features/customer/api/customer.api";
import { listProperties } from "@/features/property/api/property.api";
import { FormAlert, FormNotice } from "@/shared/components/feedback/form-frame";
import { Button } from "@/shared/components/ui/button";
import { DateTimeField } from "@/shared/components/ui/date-time-field";
import { Modal } from "@/shared/components/ui/modal";
import { SelectField } from "@/shared/components/ui/select-field";
import { TextField } from "@/shared/components/ui/text-field";
import { fieldErrorMap } from "@/shared/lib/api-messages";
import { useAssignableMembers } from "@/shared/session/assignable-members";
import { useOfficeAccess } from "@/shared/session/office-access-context";
import { createTask, deleteTask, updateTask } from "../api/home.api";
import { useMyMembership } from "../hooks/home-queries";
import { TASK_SOURCE_LABEL, TASK_STATUS_LABEL, isAutoTask } from "../model/labels";
import { describeWorkError } from "../model/messages";
import {
  TASK_MEMO_LIMIT,
  emptyTaskForm,
  toCreateRequest,
  validateTaskForm,
} from "../model/task-form";
import type { TaskFormValues } from "../model/task-form";

export type TaskItem = TaskListResponse["items"][number];

function seoulToday(): string {
  return new Date(Date.now() + 9 * 3_600_000).toISOString().slice(0, 10);
}

function fromTask(task: TaskItem): TaskFormValues {
  return {
    title: task.title,
    assigneeMembershipId: String(task.assigneeMembershipId),
    dueDate: task.dueDate,
    dueTime: task.dueTime?.slice(0, 5) ?? "",
    relatedCustomerId: task.relatedCustomerId ? String(task.relatedCustomerId) : "",
    relatedPropertyId: task.relatedPropertyId ? String(task.relatedPropertyId) : "",
    memo: task.memo ?? "",
  };
}

export type TaskDialogProps = { task: TaskItem | null; isOpen: boolean; onClose: () => void };

export function TaskDialog(props: TaskDialogProps) {
  if (!props.isOpen) return null;
  return <TaskDialogBody key={props.task?.taskId ?? "new"} {...props} />;
}

function TaskDialogBody({ task, onClose }: TaskDialogProps) {
  const queryClient = useQueryClient();
  const { role, isReadOnly } = useOfficeAccess();
  const isDeputy = role === "DEPUTY";
  const members = useAssignableMembers();
  const me = useMyMembership();
  const customers = useQuery({
    queryKey: ["home", "task-customers"],
    queryFn: () => listCustomers({ page: 0, size: 100 }),
    enabled: !isDeputy,
  });
  const properties = useQuery({
    queryKey: ["home", "task-properties"],
    queryFn: () => listProperties({ page: 0, size: 100 }),
    enabled: !isDeputy,
  });
  const isEdit = task !== null;
  const auto = task ? isAutoTask(task.sourceType) : false;
  const [values, setValues] = useState<TaskFormValues>(() =>
    task ? fromTask(task) : emptyTaskForm("", seoulToday()),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string>();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const myId = me.data ? String(me.data.membershipId) : "";
  const assignee = values.assigneeMembershipId || (isEdit ? "" : myId);

  function set<K extends keyof TaskFormValues>(key: K, value: TaskFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: "" }));
  }

  async function done() {
    await queryClient.invalidateQueries({ queryKey: ["home"] });
    onClose();
  }

  function onFail(error: unknown, fallback: string) {
    setErrors((current) => ({ ...current, ...fieldErrorMap(error) }));
    setFormError(describeWorkError(error, fallback));
  }

  const save = useMutation({
    mutationFn: async () => {
      const request = toCreateRequest({ ...values, assigneeMembershipId: assignee });
      if (!task) return createTask(request);
      if (auto) return updateTask(task.taskId, task.version, { memo: request.memo });
      return updateTask(task.taskId, task.version, request);
    },
    onSuccess: done,
    onError: (error) => onFail(error, "업무를 저장하지 못했습니다."),
  });

  const toggle = useMutation({
    mutationFn: () => {
      if (!task) throw new Error("대상 업무가 없습니다.");
      return updateTask(task.taskId, task.version, {
        status: task.status === "DONE" ? "TODO" : "DONE",
      });
    },
    onSuccess: done,
    onError: (error) => onFail(error, "업무 상태를 바꾸지 못했습니다."),
  });

  const remove = useMutation({
    mutationFn: () => {
      if (!task) throw new Error("대상 업무가 없습니다.");
      return deleteTask(task.taskId, task.version);
    },
    onSuccess: done,
    onError: (error) => {
      setConfirmDelete(false);
      onFail(error, "업무를 삭제하지 못했습니다.");
    },
  });

  function submit() {
    const next = validateTaskForm({ ...values, assigneeMembershipId: assignee });
    if (auto) {
      delete next.title;
      delete next.dueDate;
      delete next.assigneeMembershipId;
    }
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    setFormError(undefined);
    save.mutate();
  }

  const memberOptions = (members.data ?? []).map((item) => ({
    value: String(item.membershipId),
    label: item.displayName,
  }));
  if (me.data && !memberOptions.some((item) => item.value === myId)) {
    memberOptions.unshift({ value: myId, label: "나" });
  }
  if (task && !memberOptions.some((item) => item.value === String(task.assigneeMembershipId))) {
    memberOptions.push({ value: String(task.assigneeMembershipId), label: task.assigneeName });
  }
  const customerOptions = (customers.data?.items ?? []).map((item) => ({
    value: String(item.customerId),
    label: item.name,
  }));
  const propertyOptions = (properties.data?.items ?? []).map((item) => ({
    value: String(item.propertyId),
    label: item.name,
  }));
  const busy = save.isPending || toggle.isPending || remove.isPending;

  return (
    <Modal
      isOpen
      size="wide"
      title={isEdit ? "업무 수정" : "업무 만들기"}
      onClose={onClose}
      footer={
        <>
          {task && !auto ? (
            <Button
              variant="ghost"
              onClick={() => setConfirmDelete(true)}
              disabled={busy || isReadOnly}
            >
              삭제
            </Button>
          ) : null}
          {task ? (
            <Button
              variant="outlined"
              onClick={() => toggle.mutate()}
              isLoading={toggle.isPending}
              disabled={busy || isReadOnly}
            >
              {task.status === "DONE" ? "완료 취소" : "완료 처리"}
            </Button>
          ) : null}
          <Button variant="cancel" onClick={onClose} disabled={busy}>
            취소
          </Button>
          <Button onClick={submit} isLoading={save.isPending} disabled={busy || isReadOnly}>
            저장
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {formError ? <FormAlert>{formError}</FormAlert> : null}
        {task && auto ? (
          <FormNotice>
            {TASK_SOURCE_LABEL[task.sourceType] ?? "자동 생성"} 업무입니다. 제목·예정일·담당자는
            원천이 바뀌면 함께 갱신되어 고칠 수 없고 삭제할 수 없습니다. 완료 처리와 완료 취소, 메모
            입력만 가능합니다.
          </FormNotice>
        ) : null}
        {task ? (
          <p className="text-caption text-ink-2">
            현재 상태: {TASK_STATUS_LABEL[task.status] ?? task.status}
          </p>
        ) : null}
        <TextField
          label="제목"
          required
          value={values.title}
          onValueChange={(v) => set("title", v)}
          error={errors.title}
          disabled={auto}
          maxLength={100}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            label="담당자"
            required
            value={assignee}
            options={memberOptions}
            placeholder="담당자 선택"
            onValueChange={(v) => set("assigneeMembershipId", v)}
            error={errors.assigneeMembershipId}
            disabled={auto || isDeputy}
          />
          <DateTimeField
            label="예정일"
            kind="date"
            required
            value={values.dueDate}
            onValueChange={(v) => set("dueDate", v)}
            error={errors.dueDate}
            disabled={auto}
          />
          <DateTimeField
            label="시간(선택)"
            kind="time"
            value={values.dueTime}
            onValueChange={(v) => set("dueTime", v)}
            error={errors.dueTime}
            disabled={auto}
          />
        </div>
        {isDeputy ? (
          <FormNotice>중개보조원은 본인 업무만 만들고 고칠 수 있습니다.</FormNotice>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField
              label="관련 고객(선택)"
              value={values.relatedCustomerId}
              options={customerOptions}
              placeholder="선택 안 함"
              onValueChange={(v) => set("relatedCustomerId", v)}
              disabled={auto}
            />
            <SelectField
              label="관련 매물(선택)"
              value={values.relatedPropertyId}
              options={propertyOptions}
              placeholder="선택 안 함"
              onValueChange={(v) => set("relatedPropertyId", v)}
              disabled={auto}
            />
          </div>
        )}
        <TextField
          label="메모(선택)"
          value={values.memo}
          onValueChange={(v) => set("memo", v)}
          error={errors.memo}
          hint={`${TASK_MEMO_LIMIT}자까지 입력할 수 있습니다.`}
        />
        {confirmDelete ? (
          <div
            role="alertdialog"
            aria-label="업무 삭제 확인"
            className="rounded-control border border-line p-4"
          >
            <p className="text-body text-ink">이 업무를 삭제할까요? 삭제하면 되돌릴 수 없습니다.</p>
            <div className="mt-3 flex gap-2">
              <Button variant="cancel" size="sm" onClick={() => setConfirmDelete(false)}>
                취소
              </Button>
              <Button size="sm" onClick={() => remove.mutate()} isLoading={remove.isPending}>
                삭제 확인
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
