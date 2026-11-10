"use client";

import { useQuery } from "@tanstack/react-query";
import {
  fetchConfirmationMessages,
  fetchResultHistory,
  listAssistantNotices,
  listAssistantSupervision,
  listConfirmationDeliveries,
} from "../api/follow.api";

export const followKeys = {
  history: (itemId: number) => ["visit", "result-history", itemId] as const,
  messages: (coordinationId: number) => ["visit", "confirmation-messages", coordinationId] as const,
  deliveries: (coordinationId: number) =>
    ["visit", "confirmation-deliveries", coordinationId] as const,
  notices: (itemId: number) => ["visit", "assistant-notices", itemId] as const,
  supervision: (page: number, size: number) => ["visit", "supervision", page, size] as const,
};

export function useResultHistory(itemId: number, enabled: boolean) {
  return useQuery({
    queryKey: followKeys.history(itemId),
    queryFn: () => fetchResultHistory(itemId),
    enabled,
  });
}

export function useConfirmationMessages(coordinationId: number, enabled: boolean) {
  return useQuery({
    queryKey: followKeys.messages(coordinationId),
    queryFn: () => fetchConfirmationMessages(coordinationId),
    enabled,
  });
}

export function useConfirmationDeliveries(coordinationId: number, enabled: boolean) {
  return useQuery({
    queryKey: followKeys.deliveries(coordinationId),
    queryFn: () => listConfirmationDeliveries(coordinationId),
    enabled,
  });
}

export function useAssistantNotices(itemId: number, enabled: boolean) {
  return useQuery({
    queryKey: followKeys.notices(itemId),
    queryFn: () => listAssistantNotices(itemId),
    enabled,
  });
}

export function useAssistantSupervision(page: number, size: number) {
  return useQuery({
    queryKey: followKeys.supervision(page, size),
    queryFn: () => listAssistantSupervision({ page, size }),
  });
}
