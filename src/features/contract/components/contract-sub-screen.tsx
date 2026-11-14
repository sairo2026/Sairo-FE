"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import type { ContractDetailResponse } from "@/lib/api/contracts/contract.schema";
import { ErrorScreen } from "@/shared/components/feedback/error-screen";
import { QueryGate } from "@/shared/components/feedback/query-gate";
import { PageHeader } from "@/shared/components/ui/page-header";
import { cn } from "@/shared/lib/cn";
import { useOfficeAccess } from "@/shared/session/office-access-context";
import { useContract, useContractProperty } from "../hooks/contract-queries";
import { CONTRACT_STATUS_LABEL, DEAL_TYPE_LABEL, labelOf } from "../model/labels";

export type SubKey = "documents" | "fees" | "payments" | "followups";

const SUB_ITEMS: Array<{ key: SubKey; label: string }> = [
  { key: "documents", label: "서류" },
  { key: "fees", label: "중개보수·수납" },
  { key: "payments", label: "계약 대금" },
  { key: "followups", label: "후속업무" },
];

export function ContractSubNav({ contractId, active }: { contractId: number; active?: SubKey }) {
  return (
    <nav aria-label="계약 하위 메뉴" className="flex flex-wrap gap-2">
      <Link
        href={`/contracts/${contractId}`}
        className="inline-flex h-10 items-center rounded-control border border-line px-4 text-caption font-medium text-ink-2 hover:border-primary hover:text-primary"
      >
        계약 상세
      </Link>
      {SUB_ITEMS.map((item) => (
        <Link
          key={item.key}
          href={`/contracts/${contractId}/${item.key}`}
          aria-current={active === item.key ? "page" : undefined}
          className={cn(
            "inline-flex h-10 items-center rounded-control border px-4 text-caption font-medium",
            active === item.key
              ? "border-primary bg-primary-soft text-primary"
              : "border-line text-ink-2 hover:border-primary hover:text-primary",
          )}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

function SubBody({
  detail,
  title,
  description,
  active,
  children,
}: {
  detail: ContractDetailResponse;
  title: string;
  description: string;
  active: SubKey;
  children: ReactNode;
}) {
  const property = useContractProperty(detail.propertyId);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={title}
        description={`${property.data?.name ?? `계약 ${detail.contractId}`} · ${labelOf(DEAL_TYPE_LABEL, detail.dealType)} · ${labelOf(CONTRACT_STATUS_LABEL, detail.contractStatus)}. ${description}`}
      />
      <ContractSubNav contractId={detail.contractId} active={active} />
      {children}
    </div>
  );
}

export function ContractSubScreen({
  contractId,
  title,
  description,
  active,
  children,
}: {
  contractId: number;
  title: string;
  description: string;
  active: SubKey;
  children: (detail: ContractDetailResponse) => ReactNode;
}) {
  const { role } = useOfficeAccess();
  const query = useContract(contractId, role !== "DEPUTY");
  if (role === "DEPUTY") return <ErrorScreen kind="forbidden" />;
  return (
    <QueryGate query={query} loadingLabel="계약 정보를 불러오는 중입니다.">
      {(detail) => (
        <SubBody detail={detail} title={title} description={description} active={active}>
          {children(detail)}
        </SubBody>
      )}
    </QueryGate>
  );
}
