import { TEXT_LIMITS, countCodePoints } from "@/shared/lib/format";

export type TaskFormValues = {
  title: string;
  assigneeMembershipId: string;
  dueDate: string;
  dueTime: string;
  relatedCustomerId: string;
  relatedPropertyId: string;
  memo: string;
};

export const TASK_MEMO_LIMIT = 500;

export function emptyTaskForm(assigneeMembershipId: string, dueDate: string): TaskFormValues {
  return {
    title: "",
    assigneeMembershipId,
    dueDate,
    dueTime: "",
    relatedCustomerId: "",
    relatedPropertyId: "",
    memo: "",
  };
}

export function validateTaskForm(values: TaskFormValues): Record<string, string> {
  const errors: Record<string, string> = {};
  const title = values.title.trim();
  if (title === "") errors.title = "제목을 입력해 주세요.";
  else if (countCodePoints(title) > TEXT_LIMITS.title) {
    errors.title = `제목은 ${TEXT_LIMITS.title}자까지 입력할 수 있습니다.`;
  }
  if (values.assigneeMembershipId === "") errors.assigneeMembershipId = "담당자를 선택해 주세요.";
  if (values.dueDate === "") errors.dueDate = "예정일을 입력해 주세요.";
  if (countCodePoints(values.memo) > TASK_MEMO_LIMIT) {
    errors.memo = `메모는 ${TASK_MEMO_LIMIT}자까지 입력할 수 있습니다.`;
  }
  return errors;
}

function toId(value: string): number | null {
  return value === "" ? null : Number(value);
}

export function toCreateRequest(values: TaskFormValues) {
  return {
    title: values.title.trim(),
    assigneeMembershipId: Number(values.assigneeMembershipId),
    dueDate: values.dueDate,
    dueTime: values.dueTime === "" ? null : values.dueTime,
    relatedCustomerId: toId(values.relatedCustomerId),
    relatedPropertyId: toId(values.relatedPropertyId),
    memo: values.memo.trim() === "" ? null : values.memo.trim(),
  };
}
