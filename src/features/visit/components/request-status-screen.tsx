"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { EmptyState } from "@/shared/components/feedback/empty-state";
import { FormAlert } from "@/shared/components/feedback/form-frame";
import { QueryGate } from "@/shared/components/feedback/query-gate";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { Chip } from "@/shared/components/ui/chip";
import { PageHeader } from "@/shared/components/ui/page-header";
import { formatSeoulDateTime } from "@/shared/lib/format";
import { readRequestNotice } from "../api/request.api";
import { useRequestNotices, useVisitRequests } from "../hooks/request-queries";
import { useCoordinationDetail, visitKeys } from "../hooks/visit-queries";
import { describeVisitError } from "../model/messages";
import {
  NOTICE_TYPE_DESCRIPTION,
  NOTICE_TYPE_LABEL,
  REQUEST_KIND_LABEL,
  REQUEST_STATUS_FILTERS,
  REQUEST_STATUS_LABEL,
} from "../model/request-labels";
import { RequestStatusBadge, WithdrawButton } from "./request-section";

function NoticePanel({ requestIds }: { requestIds: number[] }) {
  const query = useRequestNotices();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string>();
  const mutation = useMutation({
    mutationFn: (noticeId: number) => readRequestNotice(noticeId),
    onSuccess: async () => {
      setError(undefined);
      await queryClient.invalidateQueries({ queryKey: visitKeys.all });
    },
    onError: (caught) => setError(describeVisitError(caught, "알림을 확인 처리하지 못했습니다.")),
  });
  return (
    <section className="flex flex-col gap-3" aria-labelledby="notices-title">
      <h2 id="notices-title" className="text-h2 font-semibold text-ink">
        마감·선택 결과 알림
      </h2>
      <p className="text-caption text-ink-2">
        알림은 사이로 안에서만 전달되며 문자나 이메일, 카카오 알림은 보내지 않습니다.
      </p>
      <QueryGate query={query} loadingLabel="알림을 불러오는 중입니다.">
        {(data) => {
          const items = data.items.filter((item) => requestIds.includes(item.requestId));
          if (items.length === 0) {
            return <EmptyState title="받은 알림이 없습니다." />;
          }
          return (
            <ul className="flex flex-col gap-3">
              {items.map((item) => (
                <li
                  key={item.noticeId}
                  className="flex flex-wrap items-start justify-between gap-3 border-b border-line pb-3"
                >
                  <div className="flex flex-col gap-1">
                    <span className="flex flex-wrap items-center gap-2 text-body font-semibold text-ink">
                      {NOTICE_TYPE_LABEL[item.noticeType] ?? item.noticeType}
                      {item.readAt ? null : <Badge tone="blue">새 알림</Badge>}
                    </span>
                    <span className="text-caption text-ink-2">
                      {NOTICE_TYPE_DESCRIPTION[item.noticeType] ?? ""}
                    </span>
                    <span className="text-caption text-ink-3">
                      {formatSeoulDateTime(item.createdAt)}
                    </span>
                  </div>
                  {item.readAt ? null : (
                    <Button
                      size="sm"
                      variant="ghost"
                      isLoading={mutation.isPending && mutation.variables === item.noticeId}
                      aria-label={`${NOTICE_TYPE_LABEL[item.noticeType] ?? item.noticeType} 알림 확인`}
                      onClick={() => mutation.mutate(item.noticeId)}
                    >
                      확인
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          );
        }}
      </QueryGate>
      {error ? <FormAlert>{error}</FormAlert> : null}
    </section>
  );
}

export function RequestStatusScreen({ coordinationId }: { coordinationId: number }) {
  const requests = useVisitRequests(coordinationId);
  const detail = useCoordinationDetail(coordinationId);
  const [filter, setFilter] = useState<string>("");
  const nameOf = (candidateId: number) =>
    detail.data?.candidateProperties.find((item) => item.candidatePropertyId === candidateId)
      ?.propertyName ?? `후보 ${candidateId}`;
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="방문 신청 현황"
        description="신청 대기와 종결된 신청, 마감과 선택 결과 알림을 확인합니다."
        actions={
          <Link
            href={`/coordinations/${coordinationId}`}
            className="inline-flex h-12 items-center rounded-control border border-line bg-white px-6 text-body font-medium text-ink-2 hover:border-primary hover:text-primary"
          >
            조율 상세
          </Link>
        }
      />
      <QueryGate query={requests} loadingLabel="신청 현황을 불러오는 중입니다.">
        {(data) => {
          const visible = data.items.filter((item) => item.status !== "SELECTED");
          const counts = REQUEST_STATUS_FILTERS.map((status) => ({
            status,
            count: visible.filter((item) => item.status === status).length,
          }));
          const shown = filter ? visible.filter((item) => item.status === filter) : visible;
          return (
            <>
              <Card>
                <div className="flex flex-col gap-4">
                  <div className="flex flex-wrap gap-2" role="group" aria-label="신청 상태 필터">
                    <Chip isSelected={filter === ""} onClick={() => setFilter("")}>
                      전체 {visible.length}
                    </Chip>
                    {counts.map((entry) => (
                      <Chip
                        key={entry.status}
                        isSelected={filter === entry.status}
                        onClick={() => setFilter(entry.status)}
                      >
                        {REQUEST_STATUS_LABEL[entry.status]} {entry.count}
                      </Chip>
                    ))}
                  </div>
                  <p className="text-caption text-ink-2">
                    재검증에 실패한 신청은 종결되며 다시 신청하려면 새 신청을 내야 합니다. 시간이
                    마감된 신청도 자동으로 승격되지 않습니다.
                  </p>
                  {shown.length === 0 ? (
                    <EmptyState title="표시할 신청이 없습니다." />
                  ) : (
                    <ul className="flex flex-col">
                      {shown.map((item) => (
                        <li
                          key={item.requestId}
                          className="flex flex-wrap items-center justify-between gap-3 border-b border-line py-3"
                        >
                          <div className="flex flex-col gap-1">
                            <span className="flex flex-wrap items-center gap-2 text-body font-semibold text-ink">
                              {nameOf(item.candidatePropertyId)}
                              {item.crossOffice ? (
                                <Badge tone="teal">허용받은 사무소 매물</Badge>
                              ) : null}
                              {item.requestKind ? (
                                <span className="text-caption font-normal text-ink-2">
                                  {REQUEST_KIND_LABEL[item.requestKind] ?? item.requestKind}
                                </span>
                              ) : null}
                            </span>
                            <span className="text-caption text-ink-2">
                              {formatSeoulDateTime(item.requestedStartAt)} ~{" "}
                              {formatSeoulDateTime(item.requestedEndAt)} · 제출{" "}
                              {formatSeoulDateTime(item.submittedAt)}
                            </span>
                            {item.statusReason ? (
                              <span className="text-caption text-ink-2">
                                사유 {item.statusReason}
                              </span>
                            ) : null}
                          </div>
                          <span className="flex items-center gap-2">
                            <RequestStatusBadge status={item.status} />
                            <WithdrawButton request={item} />
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </Card>
              <Card>
                <NoticePanel requestIds={data.items.map((item) => item.requestId)} />
              </Card>
            </>
          );
        }}
      </QueryGate>
    </div>
  );
}
