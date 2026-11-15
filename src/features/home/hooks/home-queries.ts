"use client";

import { useQuery } from "@tanstack/react-query";
import { MembershipStatusResponseSchema } from "@/lib/api/contracts/office.schema";
import { listCustomers } from "@/features/customer/api/customer.api";
import { customerKeys } from "@/features/customer/hooks/customer-queries";
import { listProperties } from "@/features/property/api/property.api";
import { propertyKeys } from "@/features/property/hooks/property-queries";
import { apiFetch } from "@/shared/api/client";
import { getHomeSummary, listNotifications, listTasks } from "../api/home.api";
import type { NotificationListParams, TaskListParams } from "../api/home.api";

export const homeKeys = {
  all: ["home"] as const,
  summary: ["home", "summary"] as const,
  myMembership: ["home", "my-membership"] as const,
  taskCustomers: ["home", "task-customers"] as const,
  taskProperties: ["home", "task-properties"] as const,
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
    queryKey: homeKeys.myMembership,
    queryFn: () => apiFetch("/api/memberships/me", { schema: MembershipStatusResponseSchema }),
  });
}

const FIRST_USE_PROBE = { page: 0, size: 25 } as const;

/** 매물과 고객이 모두 하나도 없는 새 사무소인지 확인한다. 둘 다 불러온 뒤에만 참이 된다. */
export function useIsEmptyOffice(enabled: boolean) {
  const properties = useQuery({
    queryKey: propertyKeys.list(FIRST_USE_PROBE),
    queryFn: () => listProperties(FIRST_USE_PROBE),
    enabled,
  });
  const customers = useQuery({
    queryKey: customerKeys.list(FIRST_USE_PROBE),
    queryFn: () => listCustomers(FIRST_USE_PROBE),
    enabled,
  });
  return properties.data?.totalElements === 0 && customers.data?.totalElements === 0;
}
