import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/shared/api/client";
import { opsKeys, opsPath } from "../api/ops-api";
import type { OpsListParams } from "../api/ops-api";
import {
  IncidentCreateSchema,
  IncidentListSchema,
  IncidentUpdateSchema,
  PrivacyIncidentCreateSchema,
  PrivacyIncidentListSchema,
  PrivacyIncidentUpdateSchema,
} from "./incidents-model";
import type {
  toIncidentCreateBody,
  toIncidentUpdateBody,
  toPrivacyCreateBody,
} from "./incidents-model";

const SCOPE = "incidents";

export function useIncidents(params: OpsListParams) {
  return useQuery({
    queryKey: opsKeys.scope(SCOPE, "list", params),
    queryFn: () => apiFetch(opsPath("/api/ops/incidents", params), { schema: IncidentListSchema }),
  });
}

export function useCreateIncident() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: ReturnType<typeof toIncidentCreateBody>) =>
      apiFetch("/api/ops/incidents", { method: "POST", body, schema: IncidentCreateSchema }),
    onSuccess: () => client.invalidateQueries({ queryKey: opsKeys.scope(SCOPE, "list") }),
  });
}

export function useUpdateIncident() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: { incidentId: number; body: ReturnType<typeof toIncidentUpdateBody> }) =>
      apiFetch(`/api/ops/incidents/${input.incidentId}`, {
        method: "PATCH",
        body: input.body,
        schema: IncidentUpdateSchema,
      }),
    onSettled: () => client.invalidateQueries({ queryKey: opsKeys.scope(SCOPE, "list") }),
  });
}

export function usePrivacyIncidents(params: OpsListParams, enabled: boolean) {
  return useQuery({
    queryKey: opsKeys.scope(SCOPE, "privacy", params),
    queryFn: () =>
      apiFetch(opsPath("/api/ops/privacy-incidents", params), {
        schema: PrivacyIncidentListSchema,
      }),
    enabled,
  });
}

export function useCreatePrivacyIncident() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: ReturnType<typeof toPrivacyCreateBody>) =>
      apiFetch("/api/ops/privacy-incidents", {
        method: "POST",
        body,
        schema: PrivacyIncidentCreateSchema,
      }),
    onSuccess: () => client.invalidateQueries({ queryKey: opsKeys.scope(SCOPE, "privacy") }),
  });
}

export function useAddPrivacyEvidence() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: { privacyIncidentId: number; responseEvidence: string }) =>
      apiFetch(`/api/ops/privacy-incidents/${input.privacyIncidentId}`, {
        method: "PATCH",
        body: { responseEvidence: input.responseEvidence },
        schema: PrivacyIncidentUpdateSchema,
      }),
    onSettled: () => client.invalidateQueries({ queryKey: opsKeys.scope(SCOPE, "privacy") }),
  });
}
