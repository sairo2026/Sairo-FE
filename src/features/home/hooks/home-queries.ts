"use client";

import { useQuery } from "@tanstack/react-query";
import { MembershipStatusResponseSchema } from "@/lib/api/contracts/office.schema";
import { apiFetch } from "@/shared/api/client";
import { getHomeSummary, listNotifications, listTasks } from "../api/home.api";
import type { NotificationListParams, TaskListParams } from "../api/home.api";

export const homeKeys = {
  summary: ["home", "summary"] as const,
  tasks: (params: TaskListParams) => ["home", "tasks", params] as const,
  notifications: (params: NotificationListParams) => ["home", "notifications", params] as const,
};

export function useHomeSummary() {
  return useQuery({ queryKey: homeKeys.summary, queryFn: getHomeSummary });
}

export function useTasks(params: TaskListParams, enabled = true) {
  return useQuery({
    queryKey: homeKeys.tasks(params),
    queryFn: () => listTasks(params),
    enabled,
  });
}

export function useNotifications(params: NotificationListParams) {
  return useQuery({
    queryKey: homeKeys.notifications(params),
    queryFn: () => listNotifications(params),
  });
}

export function useMyMembership() {
  return useQuery({
    queryKey: ["home", "my-membership"] as const,
    queryFn: () => apiFetch("/api/memberships/me", { schema: MembershipStatusResponseSchema }),
  });
}
