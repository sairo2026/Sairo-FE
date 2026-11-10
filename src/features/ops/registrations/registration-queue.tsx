"use client";

import Link from "next/link";
import { useState } from "react";
import { Badge } from "@/shared/components/ui/badge";
import { SelectField } from "@/shared/components/ui/select-field";
import { Tabs } from "@/shared/components/ui/tabs";
import { formatSeoulDateTime } from "@/shared/lib/format";
import { OpsFilterBar } from "../components/common/ops-filter-bar";
import { OpsScreen } from "../components/common/ops-screen";
import { OpsStatusBadge } from "../components/common/ops-status-badge";
import { OpsTable, useOpsPaging } from "../components/common/ops-table";
import { ChangeRequestPanel } from "./change-request-panel";
import { useRegistrationList } from "./registration-api";
import { REGISTRATION_STATUS, REVIEW_DUE_HOURS, isReviewOverdue } from "./registration-model";

const STATUS_OPTIONS = [
  { value: "", label: "심사 대기(기본)" },
  { value: "SUPPLEMENT_REQUESTED", label: "보완 요청" },
  { value: "APPROVED", label: "승인" },
  { value: "REJECTED", label: "반려" },
  { value: "REVOKED", label: "인증 회수" },
  { value: "CANCELLED", label: "신청 취소" },
];

function RegistrationList() {
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState("");
  const paging = useOpsPaging();
  const query = useRegistrationList({ status, page: paging.page, size: paging.size });
  const [now] = useState(() => Date.now());

  return (
    <div className="flex flex-col gap-4">
      <OpsFilterBar
        label="인증 신청 조회"
        onApply={() => {
          setStatus(draft);
          paging.resetPage();
        }}
        onReset={() => {
          setDraft("");
          setStatus("");
          paging.resetPage();
        }}
      >
        <SelectField label="상태" value={draft} options={STATUS_OPTIONS} onValueChange={setDraft} />
      </OpsFilterBar>
      <p className="text-caption text-ink-2">
        상태를 고르지 않으면 심사 대기 신청만 오래된 순으로 보입니다. 접수 후 {REVIEW_DUE_HOURS}
        시간이 지난 심사 대기 건은 기한 초과로 표시합니다.
      </p>
      <OpsTable
        caption="인증 신청 목록"
        query={query}
        paging={paging}
        getRowId={(row) => String(row.registrationId)}
        emptyMessage="심사할 인증 신청이 없습니다."
        columns={[
          {
            key: "id",
            header: "신청 번호",
            render: (row) => (
              <Link
                href={`/ops/registrations/${row.registrationId}`}
                className="font-semibold text-primary underline"
              >
                {row.registrationId}
              </Link>
            ),
          },
          { key: "name", header: "사무소명", render: (row) => row.requestedOfficeName },
          {
            key: "brn",
            header: "사업자등록번호",
            render: (row) => row.businessRegistrationNumber,
          },
          {
            key: "status",
            header: "상태",
            render: (row) => (
              <span className="inline-flex items-center gap-2">
                <OpsStatusBadge status={row.status} map={REGISTRATION_STATUS} />
                {isReviewOverdue(row.status, row.createdAt, now) ? (
                  <Badge tone="red">기한 초과</Badge>
                ) : null}
              </span>
            ),
          },
          {
            key: "createdAt",
            header: "접수 시각",
            render: (row) => formatSeoulDateTime(row.createdAt),
          },
        ]}
      />
    </div>
  );
}

export function RegistrationQueueScreen() {
  const [tab, setTab] = useState("registrations");
  return (
    <OpsScreen
      title="인증 심사"
      description="사무소가 낸 인증 신청과 사무소 정보 변경 신청을 심사합니다."
      roles={["REVIEW"]}
    >
      <Tabs
        label="심사 구분"
        activeKey={tab}
        onActiveKeyChange={setTab}
        items={[
          { key: "registrations", label: "인증 신청", panel: <RegistrationList /> },
          { key: "changes", label: "사무소 정보 변경 신청", panel: <ChangeRequestPanel /> },
        ]}
      />
    </OpsScreen>
  );
}
