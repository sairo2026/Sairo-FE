import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { apiFetch } from "@/shared/api/client";

const CampaignSchema = z.object({
  id: z.number(),
  name: z.string(),
  code: z.string(),
  startsAt: z.string(),
  endsAt: z.string(),
  freeMonths: z.number(),
  status: z.string(),
  maxOffices: z.number().nullable(),
  creatorId: z.number(),
  selfRedeemable: z.boolean().optional().default(false),
});
const GrantSchema = z.object({
  id: z.number(),
  campaignId: z.number(),
  officeId: z.number(),
  subscriptionId: z.number(),
  status: z.string(),
  startsAt: z.string(),
  freeEndsAt: z.string(),
  anchor: z.string(),
  nextPeriodStart: z.string(),
});
const IdSchema = z.object({ id: z.number() });

export type Campaign = z.infer<typeof CampaignSchema>;
export type Grant = z.infer<typeof GrantSchema>;

const campaignsKey = ["ops", "promotions", "campaigns"] as const;
const grantsKey = ["ops", "promotions", "grants"] as const;

export function usePromotionCampaigns() {
  return useQuery({
    queryKey: campaignsKey,
    queryFn: () => apiFetch("/api/ops/promotions/campaigns", { schema: z.array(CampaignSchema) }),
  });
}

export function usePromotionGrants() {
  return useQuery({
    queryKey: grantsKey,
    queryFn: () => apiFetch("/api/ops/promotions/grants", { schema: z.array(GrantSchema) }),
  });
}

export type CampaignCreate = {
  name: string;
  code: string;
  applicationStartsAt: string;
  applicationEndsAt: string;
  freeMonths: number;
  maxOffices: number | null;
  selfRedeemable: boolean;
};

export function usePromotionActions() {
  const client = useQueryClient();
  const refresh = async () => {
    await Promise.all([
      client.invalidateQueries({ queryKey: campaignsKey }),
      client.invalidateQueries({ queryKey: grantsKey }),
    ]);
  };
  return {
    create: useMutation({
      mutationFn: (body: CampaignCreate) =>
        apiFetch("/api/ops/promotions/campaigns", { method: "POST", body, schema: IdSchema }),
      onSuccess: refresh,
    }),
    activate: useMutation({
      mutationFn: (id: number) =>
        apiFetch(`/api/ops/promotions/campaigns/${id}/activate`, { method: "POST" }),
      onSuccess: refresh,
    }),
    end: useMutation({
      mutationFn: (id: number) =>
        apiFetch(`/api/ops/promotions/campaigns/${id}/end`, { method: "POST" }),
      onSuccess: refresh,
    }),
    grant: useMutation({
      mutationFn: ({ campaignId, officeId }: { campaignId: number; officeId: number }) =>
        apiFetch(`/api/ops/promotions/campaigns/${campaignId}/grants`, {
          method: "POST",
          body: { officeId },
          schema: IdSchema,
        }),
      onSuccess: refresh,
    }),
    revoke: useMutation({
      mutationFn: (id: number) =>
        apiFetch(`/api/ops/promotions/grants/${id}/revoke`, { method: "POST" }),
      onSuccess: refresh,
    }),
    reconcilePeriod: useMutation({
      mutationFn: ({
        id,
        historicalMembers,
        reason,
      }: {
        id: number;
        historicalMembers: number;
        reason: string;
      }) =>
        apiFetch(`/api/ops/promotions/grants/${id}/reconcile-period`, {
          method: "POST",
          body: { historicalMembers, reason },
        }),
      onSuccess: refresh,
    }),
  };
}
