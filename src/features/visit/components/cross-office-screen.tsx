"use client";

import Link from "next/link";
import { useState } from "react";
import { EmptyState } from "@/shared/components/feedback/empty-state";
import { FormNotice } from "@/shared/components/feedback/form-frame";
import { QueryGate } from "@/shared/components/feedback/query-gate";
import { Badge } from "@/shared/components/ui/badge";
import { Card } from "@/shared/components/ui/card";
import { Chip } from "@/shared/components/ui/chip";
import { PageHeader } from "@/shared/components/ui/page-header";
import { Tabs } from "@/shared/components/ui/tabs";
import { formatSeoulDateTime } from "@/shared/lib/format";
import { useOfficeAccess } from "@/shared/session/office-access-context";
import { useCrossOfficeRequests, useCrossOfficeSchedules } from "../hooks/request-queries";
import { ITEM_RESULT_LABEL, labelOf } from "../model/labels";
import {
  CLOSE_REASON_LABEL,
  REQUEST_KIND_LABEL,
  REQUEST_STATUS_FILTERS,
  REQUEST_STATUS_LABEL,
} from "../model/request-labels";
import { RequestStatusBadge } from "./request-section";

const PARAMS = { page: 0, size: 50 };

function RequestsTab({ propertyId }: { propertyId: number }) {
  const [status, setStatus] = useState("");
  const query = useCrossOfficeRequests(propertyId, { ...PARAMS, status: status || undefined });
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2" role="group" aria-label="신청 상태 필터">
        <Chip isSelected={status === ""} onClick={() => setStatus("")}>
          전체
        </Chip>
        {REQUEST_STATUS_FILTERS.map((item) => (
          <Chip key={item} isSelected={status === item} onClick={() => setStatus(item)}>
            {REQUEST_STATUS_LABEL[item]}
          </Chip>
        ))}
      </div>
      <QueryGate query={query} loadingLabel="신청 현황을 불러오는 중입니다.">
        {(data) =>
          data.items.length === 0 ? (
            <EmptyState title="다른 사무소의 신청이 없습니다." />
          ) : (
            <ul className="flex flex-col">
              {data.items.map((item) => (
                <li
                  key={item.requestId}
                  className="flex flex-wrap items-center justify-between gap-3 border-b border-line py-3"
                >
                  <div className="flex flex-col gap-1">
                    <span className="text-body font-semibold text-ink">
                      {item.applicantOfficeName} · {item.applicantBrokerName}
                    </span>
                    <span className="text-caption text-ink-2">
                      {labelOf(REQUEST_KIND_LABEL, item.requestKind)} ·{" "}
                      {formatSeoulDateTime(item.requestedStartAt)} ~{" "}
                      {formatSeoulDateTime(item.requestedEndAt)} · 예상{" "}
                      {item.expectedDurationMinutes}분
                    </span>
                    <span className="text-caption text-ink-2">
                      제출 {formatSeoulDateTime(item.submittedAt)}
                      {item.closedAt ? ` · 종결 ${formatSeoulDateTime(item.closedAt)}` : ""}
                      {item.closeReasonCode
                        ? ` · ${labelOf(CLOSE_REASON_LABEL, item.closeReasonCode)}`
                        : ""}
                    </span>
                  </div>
                  <RequestStatusBadge status={item.status} />
                </li>
              ))}
            </ul>
          )
        }
      </QueryGate>
    </div>
  );
}

function SchedulesTab({ propertyId }: { propertyId: number }) {
  const query = useCrossOfficeSchedules(propertyId, PARAMS);
  return (
    <QueryGate query={query} loadingLabel="확정 방문을 불러오는 중입니다.">
      {(data) =>
        data.items.length === 0 ? (
          <EmptyState title="다른 사무소의 확정 방문이 없습니다." />
        ) : (
          <ul className="flex flex-col">
            {data.items.map((item) => (
              <li
                key={item.scheduleItemId}
                className="flex flex-wrap items-center justify-between gap-3 border-b border-line py-3"
              >
                <div className="flex flex-col gap-1">
                  <span className="text-body font-semibold text-ink">
                    {formatSeoulDateTime(item.scheduledStartAt)} ~{" "}
                    {formatSeoulDateTime(item.scheduledEndAt)}
                  </span>
                  <span className="text-caption text-ink-2">
                    {item.applicantOfficeName} · {item.applicantBrokerName}
                  </span>
                </div>
                <span className="flex items-center gap-2">
                  <Badge tone="gray">{labelOf(ITEM_RESULT_LABEL, item.result)}</Badge>
                  <Badge tone={item.state === "VALID" ? "green" : "red"}>
                    {item.state === "VALID" ? "유효" : "재조율 필요"}
                  </Badge>
                </span>
              </li>
            ))}
          </ul>
        )
      }
    </QueryGate>
  );
}

export function CrossOfficeScreen({ propertyId }: { propertyId: number }) {
  const { role } = useOfficeAccess();
  const [tab, setTab] = useState("requests");
  if (role === "DEPUTY") {
    return (
      <EmptyState
        title="이 화면은 중개보조원에게 제공되지 않습니다."
        description="다른 사무소 신청 현황은 승인된 대표와 소속공인중개사가 봅니다."
      />
    );
  }
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="다른 사무소 신청 현황"
        description="내 매물에 들어온 다른 사무소의 신청과 확정 방문을 읽기 전용으로 봅니다."
        actions={
          <Link
            href={`/properties/${propertyId}`}
            className="inline-flex h-12 items-center rounded-control border border-line bg-white px-6 text-body font-medium text-ink-2 hover:border-primary hover:text-primary"
          >
            매물 상세
          </Link>
        }
      />
      <Card>
        <div className="flex flex-col gap-4">
          <FormNotice>
            고객 이름, 연락처, 인원, 요청사항은 보이지 않습니다. 취소, 변경, 결과 기록은 신청한
            사무소가 하며 이견이 있으면 사무소끼리 연락해 주세요.
          </FormNotice>
          <Tabs
            label="다른 사무소 현황"
            activeKey={tab}
            onActiveKeyChange={setTab}
            items={[
              { key: "requests", label: "신청", panel: <RequestsTab propertyId={propertyId} /> },
              {
                key: "schedules",
                label: "확정 방문",
                panel: <SchedulesTab propertyId={propertyId} />,
              },
            ]}
          />
        </div>
      </Card>
    </div>
  );
}
