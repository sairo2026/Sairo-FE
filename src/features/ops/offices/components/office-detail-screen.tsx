"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import type { OperatorOfficeDetailResponse } from "@/lib/api/contracts/ops.schema";
import { QueryGate } from "@/shared/components/feedback/query-gate";
import { Card } from "@/shared/components/ui/card";
import { Tabs } from "@/shared/components/ui/tabs";
import type { TabItem } from "@/shared/components/ui/tabs";
import type { DataTableColumn } from "@/shared/components/ui/data-table";
import { formatKrw, formatSeoulDate, formatSeoulDateTime } from "@/shared/lib/format";
import { OpsDetailList } from "../../components/common/ops-detail-list";
import { OpsScreen } from "../../components/common/ops-screen";
import { OpsStatusBadge } from "../../components/common/ops-status-badge";
import { OpsTable, useOpsPaging } from "../../components/common/ops-table";
import { useHasOpsRole } from "../../model/ops-session";
import { OPS_WORK_ROLES } from "../../model/roles";
import {
  fetchOfficeAuditLog,
  fetchOfficeDetail,
  fetchOfficeImportRequests,
  fetchOfficeInquiries,
  fetchOfficeInvoices,
  opsOfficeKeys,
} from "../api/ops-offices-api";
import {
  MEMBERSHIP_STATUS_LABELS,
  MEMBER_ROLE_LABELS,
  REGISTRATION_STATUS,
  SUBSCRIPTION_STATUS,
} from "../model/office-status";

type Detail = OperatorOfficeDetailResponse;

function RegistrationHistoryTab({ detail }: { detail: Detail }) {
  if (detail.registrationHistory.length === 0) {
    return <p className="text-body text-ink-2">인증 이력이 없습니다.</p>;
  }
  return (
    <ol className="flex flex-col gap-3" aria-label="인증 이력">
      {detail.registrationHistory.map((item, index) => (
        <li key={`${item.createdAt}-${index}`} className="rounded-card-flat border border-line p-4">
          <p className="text-body font-semibold text-ink">
            {item.fromStatus
              ? (REGISTRATION_STATUS[item.fromStatus]?.label ?? item.fromStatus)
              : "시작"}
            {" → "}
            {REGISTRATION_STATUS[item.toStatus]?.label ?? item.toStatus}
          </p>
          <p className="text-caption text-ink-2">
            {formatSeoulDateTime(item.createdAt)} · {item.changedByType}
          </p>
          {item.reason ? <p className="mt-1 text-body text-ink">{item.reason}</p> : null}
        </li>
      ))}
    </ol>
  );
}

function MembersTab({ detail }: { detail: Detail }) {
  if (detail.members.length === 0) {
    return <p className="text-body text-ink-2">소속 구성원이 없습니다.</p>;
  }
  return (
    <table className="w-full text-left text-body">
      <caption className="sr-only">구성원 목록</caption>
      <thead>
        <tr className="border-b border-line text-caption text-ink-2">
          <th className="py-2">이름</th>
          <th className="py-2">역할</th>
          <th className="py-2">상태</th>
        </tr>
      </thead>
      <tbody>
        {detail.members.map((member) => (
          <tr key={member.membershipId} className="border-b border-line">
            <td className="py-2">{member.displayName}</td>
            <td className="py-2">{MEMBER_ROLE_LABELS[member.role] ?? member.role}</td>
            <td className="py-2">{MEMBERSHIP_STATUS_LABELS[member.status] ?? member.status}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function RosterTab({ detail }: { detail: Detail }) {
  return (
    <div className="flex flex-col gap-3">
      <OpsDetailList
        items={[
          { label: "중개사 인원", value: `${detail.employmentRoster.agentCount}명` },
          { label: "중개보조원 인원", value: `${detail.employmentRoster.deputyCount}명` },
        ]}
      />
      <p className="text-caption text-ink-2">
        현재 유효한 고용명부의 인원 수만 보이며 이름 등 개인 식별 값은 보이지 않습니다.
      </p>
    </div>
  );
}

type InvoiceRow = Awaited<ReturnType<typeof fetchOfficeInvoices>>["items"][number];
const INVOICE_STATUS_LABELS: Record<string, string> = {
  UNBILLED: "미청구",
  PROCESSING: "처리 중",
  VERIFYING: "확인 중",
  PAID: "결제 완료",
  FAILED: "결제 실패",
  PARTIALLY_REFUNDED: "부분 환불",
  FULLY_REFUNDED: "전액 환불",
  CANCELLED: "취소",
};

function BillingTab({ officeId }: { officeId: number }) {
  const paging = useOpsPaging();
  const query = useQuery({
    queryKey: opsOfficeKeys.tab(officeId, "billing", paging.page, paging.size),
    queryFn: () => fetchOfficeInvoices(officeId, paging.page, paging.size),
  });
  const columns: DataTableColumn<InvoiceRow>[] = [
    { key: "id", header: "청구서", render: (row) => row.invoiceId },
    {
      key: "period",
      header: "청구 기간",
      render: (row) =>
        `${formatSeoulDate(row.billingPeriodStart)} ~ ${formatSeoulDate(row.billingPeriodEnd)}`,
    },
    { key: "amount", header: "금액", render: (row) => formatKrw(row.vatIncludedAmount) },
    {
      key: "status",
      header: "상태",
      render: (row) => INVOICE_STATUS_LABELS[row.status] ?? row.status,
    },
    { key: "due", header: "납부 기한", render: (row) => formatSeoulDateTime(row.dueAt) },
  ];
  return (
    <OpsTable
      caption="청구서 목록"
      query={query}
      columns={columns}
      getRowId={(row) => String(row.invoiceId)}
      paging={paging}
      emptyMessage="이 사무소의 청구서가 없습니다."
    />
  );
}

type InquiryRow = Awaited<ReturnType<typeof fetchOfficeInquiries>>["items"][number];
const INQUIRY_STATUS_LABELS: Record<string, string> = {
  OPEN: "접수",
  ASSIGNED: "담당 배정",
  WAITING_FOR_CUSTOMER: "고객 답변 대기",
  ANSWERED: "답변 완료",
  CLOSED: "종료",
};

function InquiriesTab({ officeId }: { officeId: number }) {
  const paging = useOpsPaging();
  const query = useQuery({
    queryKey: opsOfficeKeys.tab(officeId, "inquiries", paging.page, paging.size),
    queryFn: () => fetchOfficeInquiries(officeId, paging.page, paging.size),
  });
  const columns: DataTableColumn<InquiryRow>[] = [
    { key: "id", header: "문의", render: (row) => row.inquiryId },
    { key: "category", header: "유형", render: (row) => row.category },
    {
      key: "status",
      header: "상태",
      render: (row) => INQUIRY_STATUS_LABELS[row.status] ?? row.status,
    },
    { key: "assignee", header: "담당", render: (row) => row.assignedOperatorName ?? "미배정" },
    { key: "due", header: "답변 목표", render: (row) => formatSeoulDateTime(row.responseDueAt) },
  ];
  return (
    <OpsTable
      caption="문의 목록"
      query={query}
      columns={columns}
      getRowId={(row) => String(row.inquiryId)}
      paging={paging}
      emptyMessage="이 사무소의 문의가 없습니다."
    />
  );
}

type ImportRow = Awaited<ReturnType<typeof fetchOfficeImportRequests>>["items"][number];

function ImportTab({ officeId }: { officeId: number }) {
  const paging = useOpsPaging();
  const query = useQuery({
    queryKey: opsOfficeKeys.tab(officeId, "import", paging.page, paging.size),
    queryFn: () => fetchOfficeImportRequests(officeId, paging.page, paging.size),
  });
  const columns: DataTableColumn<ImportRow>[] = [
    { key: "id", header: "신청", render: (row) => row.requestId },
    { key: "source", header: "원본 시스템", render: (row) => row.sourceSystem },
    { key: "status", header: "상태", render: (row) => row.status },
    { key: "assignee", header: "담당", render: (row) => row.assignedOperatorName ?? "미배정" },
    {
      key: "requestedAt",
      header: "신청 시각",
      render: (row) => formatSeoulDateTime(row.requestedAt),
    },
  ];
  return (
    <OpsTable
      caption="이전 지원 신청 목록"
      query={query}
      columns={columns}
      getRowId={(row) => String(row.requestId)}
      paging={paging}
      emptyMessage="이 사무소의 이전 지원 신청이 없습니다."
    />
  );
}

type AuditRow = Awaited<ReturnType<typeof fetchOfficeAuditLog>>["items"][number];

function AuditTab({ officeId }: { officeId: number }) {
  const paging = useOpsPaging();
  const query = useQuery({
    queryKey: opsOfficeKeys.tab(officeId, "audit", paging.page, paging.size),
    queryFn: () => fetchOfficeAuditLog(officeId, paging.page, paging.size),
  });
  const columns: DataTableColumn<AuditRow>[] = [
    { key: "at", header: "일시", render: (row) => formatSeoulDateTime(row.createdAt) },
    { key: "operator", header: "운영자", render: (row) => row.operatorName },
    { key: "action", header: "행위", render: (row) => row.actionType },
    { key: "detail", header: "내용", render: (row) => row.detail ?? "-" },
  ];
  return (
    <OpsTable
      caption="운영 이력"
      query={query}
      columns={columns}
      getRowId={(row) => String(row.auditId)}
      paging={paging}
      emptyMessage="이 사무소의 운영 이력이 없습니다."
    />
  );
}

function BasicInfo({ detail }: { detail: Detail }) {
  return (
    <Card title="기본 정보" tone="flat">
      <OpsDetailList
        items={[
          { label: "사무소 ID", value: detail.officeId },
          { label: "사무소명", value: detail.name },
          { label: "대표자", value: detail.representativeName },
          { label: "사업자등록번호", value: detail.businessRegistrationNumber },
          { label: "개설등록번호", value: detail.realEstateLicenseNumber },
          { label: "연락처", value: detail.phone },
          { label: "주소", value: detail.address },
          { label: "등록관청", value: detail.registrationAuthority },
          {
            label: "인증 상태",
            value: <OpsStatusBadge status={detail.registrationStatus} map={REGISTRATION_STATUS} />,
          },
          { label: "승인된 구성원", value: `${detail.approvedMembershipCount}명` },
          { label: "열린 문의", value: `${detail.openInquiryCount}건` },
          { label: "생성 일시", value: formatSeoulDateTime(detail.createdAt) },
        ]}
      />
    </Card>
  );
}

function SubscriptionInfo({ detail }: { detail: Detail }) {
  const { subscription, returnGrant, archiveGrant } = detail;
  return (
    <Card title="구독과 반환·보관" tone="flat">
      <OpsDetailList
        items={[
          {
            label: "구독 상태",
            value: subscription ? (
              <OpsStatusBadge status={subscription.status} map={SUBSCRIPTION_STATUS} />
            ) : (
              "구독 없음"
            ),
          },
          { label: "요금제", value: subscription?.plan },
          {
            label: "체험 종료",
            value: subscription?.trialEndsAt ? formatSeoulDateTime(subscription.trialEndsAt) : null,
          },
          {
            label: "현재 기간 종료",
            value: subscription ? formatSeoulDateTime(subscription.currentPeriodEnd) : null,
          },
          {
            label: "미납 시작",
            value: subscription?.pastDueSince
              ? formatSeoulDateTime(subscription.pastDueSince)
              : null,
          },
          {
            label: "반환 권한",
            value: returnGrant
              ? `${formatSeoulDateTime(returnGrant.grantedAt)} 발급, ${formatSeoulDateTime(returnGrant.expiresAt)} 만료${returnGrant.revokedAt ? `, ${formatSeoulDateTime(returnGrant.revokedAt)} 회수` : ""}`
              : "발급 이력 없음",
          },
          {
            label: "보관 권한",
            value: archiveGrant
              ? `${formatSeoulDateTime(archiveGrant.grantedAt)} 발급, ${archiveGrant.expiresAt ? `${formatSeoulDateTime(archiveGrant.expiresAt)} 만료` : "무기한"}${archiveGrant.terminatedAt ? `, ${formatSeoulDateTime(archiveGrant.terminatedAt)} 종료` : ""}`
              : "발급 이력 없음",
          },
        ]}
      />
    </Card>
  );
}

function OfficeDetailBody({ detail }: { detail: Detail }) {
  const canBilling = useHasOpsRole(["BILLING"]);
  const canSupport = useHasOpsRole(["SUPPORT"]);
  const canMigration = useHasOpsRole(["MIGRATION"]);
  const canAudit = useHasOpsRole(["SECURITY_ADMIN"]);
  const [activeKey, setActiveKey] = useState("registration");
  const { officeId } = detail;

  const items: TabItem[] = [
    { key: "registration", label: "인증 이력", panel: <RegistrationHistoryTab detail={detail} /> },
    { key: "members", label: "구성원", panel: <MembersTab detail={detail} /> },
    { key: "roster", label: "고용명부 현황", panel: <RosterTab detail={detail} /> },
  ];
  if (canBilling)
    items.push({ key: "billing", label: "청구", panel: <BillingTab officeId={officeId} /> });
  if (canSupport)
    items.push({ key: "inquiries", label: "문의", panel: <InquiriesTab officeId={officeId} /> });
  if (canMigration)
    items.push({ key: "import", label: "이전", panel: <ImportTab officeId={officeId} /> });
  if (canAudit)
    items.push({ key: "audit", label: "운영이력", panel: <AuditTab officeId={officeId} /> });

  const rawAccessHref = `/ops/raw-access/new?targetType=OFFICE&targetId=${officeId}&officeId=${officeId}`;

  return (
    <>
      <p className="text-caption text-ink-2">
        이 화면은 마스킹된 운영 메타데이터만 보여 줍니다. 원본 정보가 필요하면 목적과 범위를 적어
        원문 조회를 요청해 주세요. 요청과 열람은 감사 로그에 남습니다.
      </p>
      <BasicInfo detail={detail} />
      <SubscriptionInfo detail={detail} />
      <Card tone="flat">
        <Tabs
          label="사무소 상세"
          items={items}
          activeKey={activeKey}
          onActiveKeyChange={setActiveKey}
        />
      </Card>
      <div>
        <Link
          href={rawAccessHref}
          className="inline-flex h-12 items-center rounded-control bg-primary-soft px-8 font-semibold text-primary hover:bg-primary-line"
        >
          원문 조회 요청
        </Link>
      </div>
    </>
  );
}

function OfficeDetailLoader({ officeId }: { officeId: number }) {
  const query = useQuery({
    queryKey: opsOfficeKeys.detail(officeId),
    queryFn: () => fetchOfficeDetail(officeId),
  });
  return (
    <QueryGate query={query} loadingLabel="사무소 정보를 불러오는 중입니다.">
      {(detail) => <OfficeDetailBody detail={detail} />}
    </QueryGate>
  );
}

export function OfficeDetailScreen({ officeId }: { officeId: number }) {
  return (
    <OpsScreen
      title="고객사 상세"
      roles={OPS_WORK_ROLES}
      actions={
        <Link href="/ops/offices" className="text-body font-semibold text-primary underline">
          목록으로
        </Link>
      }
    >
      <OfficeDetailLoader officeId={officeId} />
    </OpsScreen>
  );
}
