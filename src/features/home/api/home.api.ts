import {
  HomeSummaryResponseSchema,
  NotificationListResponseSchema,
  TaskCreateResponseSchema,
  TaskListResponseSchema,
  TaskUpdateResponseSchema,
} from "@/lib/api/contracts/work.schema";
import type { TaskCreateRequest, TaskUpdateRequest } from "@/lib/api/contracts/work.schema";
import { apiFetch, withQuery } from "@/shared/api/client";

export type TaskListParams = {
  status?: string;
  assigneeMembershipId?: number;
  page: number;
  size: number;
};

export type NotificationListParams = { unreadOnly: boolean; page: number; size: number };

export function getHomeSummary() {
  return apiFetch("/api/home", { schema: HomeSummaryResponseSchema });
}

export function listTasks(params: TaskListParams) {
  return apiFetch(withQuery("/api/tasks", { ...params }), { schema: TaskListResponseSchema });
}

export function createTask(request: TaskCreateRequest) {
  return apiFetch("/api/tasks", {
    method: "POST",
    body: request,
    schema: TaskCreateResponseSchema,
  });
}

export function updateTask(taskId: number, version: number, request: TaskUpdateRequest) {
  return apiFetch(`/api/tasks/${taskId}`, {
    method: "PATCH",
    body: request,
    headers: { "If-Match": String(version) },
    schema: TaskUpdateResponseSchema,
  });
}

export function deleteTask(taskId: number, version: number) {
  return apiFetch(`/api/tasks/${taskId}`, {
    method: "DELETE",
    headers: { "If-Match": String(version) },
  });
}

export function listNotifications(params: NotificationListParams) {
  return apiFetch(withQuery("/api/notifications", { ...params }), {
    schema: NotificationListResponseSchema,
  });
}

export function markNotificationRead(notificationId: number) {
  return apiFetch(`/api/notifications/${notificationId}/read`, { method: "POST" });
}
