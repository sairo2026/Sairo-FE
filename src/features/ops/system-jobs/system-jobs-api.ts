import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/shared/api/client";
import { opsKeys, opsPath } from "../api/ops-api";
import type { OpsListParams } from "../api/ops-api";
import { SystemJobListSchema, SystemJobRerunSchema } from "./system-jobs-model";

const SCOPE = "system-jobs";

export function useSystemJobs(params: OpsListParams) {
  return useQuery({
    queryKey: opsKeys.scope(SCOPE, "list", params),
    queryFn: () =>
      apiFetch(opsPath("/api/ops/system-jobs", params), { schema: SystemJobListSchema }),
  });
}

export function useRerunSystemJob() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: { jobName: string; runId: number }) =>
      apiFetch(`/api/ops/system-jobs/${encodeURIComponent(input.jobName)}/rerun`, {
        method: "POST",
        body: { runId: input.runId },
        schema: SystemJobRerunSchema,
      }),
    onSettled: () => client.invalidateQueries({ queryKey: opsKeys.scope(SCOPE) }),
  });
}
