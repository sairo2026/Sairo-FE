"use client";

import { useQuery } from "@tanstack/react-query";
import { OpsOperatorOptionListResponseSchema } from "@/lib/api/contracts/ops.schema";
import { apiFetch } from "@/shared/api/client";
import { SelectField } from "@/shared/components/ui/select-field";
import { opsKeys } from "../../api/ops-api";
import { OPS_ROLE_LABELS } from "../../model/roles";
import type { OpsRole } from "../../model/roles";

export function useOperatorOptions() {
  return useQuery({
    queryKey: opsKeys.scope("operator-options"),
    queryFn: () =>
      apiFetch("/api/ops/operators/options", { schema: OpsOperatorOptionListResponseSchema }),
    staleTime: 60_000,
  });
}

function roleText(roles: string[]): string {
  return roles.map((role) => OPS_ROLE_LABELS[role as OpsRole] ?? role).join(", ");
}

export function OperatorSelect({
  label,
  value,
  onValueChange,
  error,
  disabled,
}: {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
}) {
  const options = useOperatorOptions();
  const items = options.data?.items ?? [];
  return (
    <SelectField
      label={label}
      value={value}
      disabled={disabled || options.isPending}
      error={error ?? (options.isError ? "운영자 목록을 불러오지 못했습니다." : undefined)}
      options={[
        { value: "", label: options.isPending ? "불러오는 중" : "운영자를 선택해 주세요" },
        ...items.map((item) => ({
          value: String(item.operatorId),
          label: `${item.name} (${roleText(item.roles)})`,
        })),
      ]}
      onValueChange={onValueChange}
    />
  );
}
