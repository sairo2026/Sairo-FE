"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { CustomerDetail } from "../api/wire";
import { FormAlert, FormNotice } from "@/shared/components/feedback/form-frame";
import { DetailList, MutedNote } from "@/shared/components/feedback/page-parts";
import { QueryGate } from "@/shared/components/feedback/query-gate";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { Modal } from "@/shared/components/ui/modal";
import { Tabs } from "@/shared/components/ui/tabs";
import { formatSeoulDate } from "@/shared/lib/format";
import { useAssignableMembers } from "@/shared/session/assignable-members";
import { useOfficeAccess } from "@/shared/session/office-access-context";
import { deleteCustomer, restoreCustomer } from "../api/customer.api";
import { customerKeys, useCustomerDetail } from "../hooks/customer-queries";
import {
  CONTRACT_STATUS_LABEL,
  COORDINATION_STATUS_LABEL,
  CUSTOMER_ROLE_LABEL,
  CUSTOMER_ROLE_TONE,
  DEAL_TYPE_LABEL,
  PROCESSING_BASIS_LABEL,
  TASK_STATUS_LABEL,
  isCustomerRole,
  isDealType,
  labelOf,
} from "../model/labels";
import { describeCustomerError } from "../model/messages";
import { ConsultationPanel } from "./consultation-panel";
import { DemandPanel } from "./demand-panel";
import { RelationsPanel } from "./relations-panel";

type Contract = CustomerDetail["upcomingContracts"][number];

function ContractList({ title, items }: { title: string; items: Contract[] }) {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-body font-semibold text-ink">{title}</h3>
      {items.length === 0 ? (
        <MutedNote>계약이 없습니다.</MutedNote>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((item) => (
            <li key={item.contractId} className="text-body text-ink">
              {item.propertyName} ·{" "}
              {isDealType(item.dealType) ? DEAL_TYPE_LABEL[item.dealType] : item.dealType} ·{" "}
              {labelOf(CONTRACT_STATUS_LABEL, item.contractStatus)} ·{" "}
              {item.signedDate ? `체결 ${formatSeoulDate(item.signedDate)}` : "체결일 미정"}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function BasicInfo({ customer }: { customer: CustomerDetail }) {
  const members = useAssignableMembers();
  const managerName =
    members.data?.find((item) => item.membershipId === customer.managingMembershipId)
      ?.displayName ?? `담당자 ${customer.managingMembershipId}`;
  return (
    <div className="flex flex-col gap-6">
      <DetailList
        items={[
          { label: "구분", value: customer.isCorporation ? "법인" : "개인" },
          { label: "연락처", value: customer.phone ?? "-" },
          { label: "보조 연락처", value: customer.secondaryPhone ?? "-" },
          { label: "이메일", value: customer.email ?? "-" },
          { label: "담당 공인중개사", value: managerName },
          { label: "업무 메모", value: customer.memo ?? "-" },
        ]}
      />
      <section className="flex flex-col gap-3">
        <h3 className="text-body font-semibold text-ink">개인정보 수집 안내</h3>
        <DetailList
          items={[
            { label: "수집 경로", value: customer.dataSource },
            {
              label: "처리 근거",
              value: labelOf(PROCESSING_BASIS_LABEL, customer.processingBasis),
            },
            { label: "수집 목적", value: customer.dataPurpose },
            { label: "보유 기한", value: formatSeoulDate(customer.retentionUntil) },
          ]}
        />
      </section>
      <section className="flex flex-col gap-3">
        <h3 className="text-body font-semibold text-ink">현재 소유·점유</h3>
        {customer.relatedProperties.filter(
          (item) => item.role !== "INTEREST" && item.endDate === null,
        ).length === 0 ? (
          <MutedNote>현재 소유하거나 점유 중인 매물이 없습니다.</MutedNote>
        ) : (
          <ul className="flex flex-col gap-1">
            {customer.relatedProperties
              .filter((item) => item.role !== "INTEREST" && item.endDate === null)
              .map((item) => (
                <li key={`${item.role}-${item.linkId}`} className="text-body text-ink">
                  {item.role === "OWNER" ? "소유" : "점유"} · {item.propertyName}
                </li>
              ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function ActivityPanel({ customer }: { customer: CustomerDetail }) {
  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <h3 className="text-body font-semibold text-ink">방문</h3>
        {customer.visits.length === 0 ? (
          <MutedNote>방문 조율 이력이 없습니다.</MutedNote>
        ) : (
          <ul className="flex flex-col gap-2">
            {customer.visits.map((visit) => (
              <li key={visit.coordinationId} className="text-body text-ink">
                {labelOf(COORDINATION_STATUS_LABEL, visit.status)} ·{" "}
                {formatSeoulDate(visit.periodStartDate)} ~ {formatSeoulDate(visit.periodEndDate)} ·
                후보 매물 {visit.candidatePropertyCount}개
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="flex flex-col gap-3">
        <h3 className="text-body font-semibold text-ink">업무</h3>
        {customer.tasks.length === 0 ? (
          <MutedNote>연결된 업무가 없습니다.</MutedNote>
        ) : (
          <ul className="flex flex-col gap-2">
            {customer.tasks.map((task) => (
              <li key={task.taskId} className="text-body text-ink">
                {task.title} · 기한 {formatSeoulDate(task.dueDate)} ·{" "}
                {labelOf(TASK_STATUS_LABEL, task.status)}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function RemoveDialog({ customer, onClose }: { customer: CustomerDetail; onClose: () => void }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string>();
  const mutation = useMutation({
    mutationFn: () => deleteCustomer(customer.customerId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: customerKeys.all });
      router.push("/customers");
    },
    onError: (caught) => setError(describeCustomerError(caught, "고객을 처리하지 못했습니다.")),
  });
  return (
    <Modal
      isOpen
      title={customer.deletable ? "오입력 고객 삭제" : "고객 보관"}
      onClose={onClose}
      footer={
        <>
          <Button variant="cancel" onClick={onClose} disabled={mutation.isPending}>
            취소
          </Button>
          <Button
            isLoading={mutation.isPending}
            onClick={() => {
              setError(undefined);
              mutation.mutate();
            }}
          >
            {customer.deletable ? "삭제" : "보관"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <p>
          {customer.deletable
            ? "참조하는 기록이 없어 완전히 삭제됩니다. 삭제하면 되돌릴 수 없습니다."
            : "참조하는 기록이 있어 삭제하지 않고 보관합니다. 보관한 고객은 보관 고객 보기에서 복원할 수 있습니다."}
        </p>
        {error ? <FormAlert>{error}</FormAlert> : null}
      </div>
    </Modal>
  );
}

function MergedNotice({ customer }: { customer: CustomerDetail }) {
  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-center gap-3">
        <h1 className="text-h1 font-bold text-ink">{customer.name}</h1>
        <Badge tone="gray">병합됨</Badge>
      </header>
      <FormNotice>
        다른 고객으로 병합된 고객입니다. 기록과 수정은 남은 고객에서 확인할 수 있습니다.
      </FormNotice>
      {customer.mergedIntoCustomerId ? (
        <div>
          <Link
            href={`/customers/${customer.mergedIntoCustomerId}`}
            className="inline-flex h-12 items-center rounded-control bg-primary px-6 text-body font-bold text-white hover:bg-primary-hover"
          >
            남은 고객으로 이동
          </Link>
        </div>
      ) : null}
    </div>
  );
}

function DetailBody({ customer }: { customer: CustomerDetail }) {
  const queryClient = useQueryClient();
  const { isReadOnly } = useOfficeAccess();
  const [tab, setTab] = useState("info");
  const [isRemoveOpen, setIsRemoveOpen] = useState(false);
  const [notice, setNotice] = useState<string>();
  const [error, setError] = useState<string>();
  const isArchived = Boolean(customer.deletedAt) || customer.status === "ARCHIVED";
  const canEdit = !isReadOnly && !isArchived;

  const restoreMutation = useMutation({
    mutationFn: () => restoreCustomer(customer.customerId),
    onSuccess: async () => {
      setError(undefined);
      setNotice("고객을 복원했습니다.");
      await queryClient.invalidateQueries({ queryKey: customerKeys.all });
    },
    onError: (caught) => setError(describeCustomerError(caught, "고객을 복원하지 못했습니다.")),
  });

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-h1 font-bold text-ink">{customer.name}</h1>
          <div className="flex flex-wrap items-center gap-2">
            {customer.roles.map((item) =>
              isCustomerRole(item) ? (
                <Badge key={item} tone={CUSTOMER_ROLE_TONE[item]}>
                  {CUSTOMER_ROLE_LABEL[item]}
                </Badge>
              ) : null,
            )}
            {isArchived ? <Badge tone="red">보관됨</Badge> : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/customers"
            className="inline-flex h-12 items-center rounded-control border border-line bg-white px-6 text-body font-medium text-ink-2 hover:border-primary hover:text-primary"
          >
            목록
          </Link>
          {isArchived ? (
            <Button
              isLoading={restoreMutation.isPending}
              disabled={isReadOnly}
              onClick={() => restoreMutation.mutate()}
            >
              복원
            </Button>
          ) : (
            <>
              <Link
                href={`/customers/${customer.customerId}/edit`}
                className="inline-flex h-12 items-center rounded-control bg-primary px-6 text-body font-bold text-white hover:bg-primary-hover"
              >
                수정
              </Link>
              <Button variant="ghost" disabled={isReadOnly} onClick={() => setIsRemoveOpen(true)}>
                {customer.deletable ? "오입력 삭제" : "보관"}
              </Button>
            </>
          )}
        </div>
      </header>
      {notice ? <FormNotice>{notice}</FormNotice> : null}
      {error ? <FormAlert>{error}</FormAlert> : null}
      {isArchived ? (
        <FormNotice>보관된 고객입니다. 수정하려면 먼저 복원해 주세요.</FormNotice>
      ) : null}
      <Card>
        <Tabs
          label="고객 상세"
          activeKey={tab}
          onActiveKeyChange={setTab}
          items={[
            { key: "info", label: "기본 정보", panel: <BasicInfo customer={customer} /> },
            {
              key: "demand",
              label: "희망조건",
              panel: <DemandPanel customer={customer} canEdit={canEdit} />,
            },
            {
              key: "properties",
              label: "관련 매물",
              panel: <RelationsPanel customer={customer} canEdit={canEdit} />,
            },
            {
              key: "contracts",
              label: "계약",
              panel: (
                <div className="flex flex-col gap-6">
                  <ContractList title="예정 계약" items={customer.upcomingContracts} />
                  <ContractList title="지난 계약" items={customer.pastContracts} />
                </div>
              ),
            },
            {
              key: "consultations",
              label: "상담 이력",
              panel: <ConsultationPanel customerId={customer.customerId} canEdit={canEdit} />,
            },
            { key: "activity", label: "방문·업무", panel: <ActivityPanel customer={customer} /> },
          ]}
        />
      </Card>
      {isRemoveOpen ? (
        <RemoveDialog customer={customer} onClose={() => setIsRemoveOpen(false)} />
      ) : null}
    </div>
  );
}

export function CustomerDetailScreen({ customerId }: { customerId: number }) {
  const query = useCustomerDetail(customerId);
  return (
    <QueryGate query={query} loadingLabel="고객 정보를 불러오는 중입니다.">
      {(customer) =>
        customer.status === "MERGED" ? (
          <MergedNotice customer={customer} />
        ) : (
          <DetailBody customer={customer} />
        )
      }
    </QueryGate>
  );
}
