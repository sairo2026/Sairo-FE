"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { listRequestNotices, readRequestNotice } from "@/features/visit/api/request.api";
import { NOTICE_TYPE_DESCRIPTION, NOTICE_TYPE_LABEL } from "@/features/visit/model/request-labels";
import { QueryGate } from "@/shared/components/feedback/query-gate";
import { EmptyState } from "@/shared/components/feedback/empty-state";
import { FormAlert } from "@/shared/components/feedback/form-frame";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Checkbox } from "@/shared/components/ui/select-field";
import { PageHeader } from "@/shared/components/ui/page-header";
import { Tabs } from "@/shared/components/ui/tabs";
import { formatSeoulDateTime } from "@/shared/lib/format";
import { PAGE_SIZE_OPTIONS } from "@/shared/components/ui/data-table";
import type { PageSize } from "@/shared/components/ui/data-table";
import { markNotificationRead } from "../api/home.api";
import { homeKeys, useNotifications } from "../hooks/home-queries";
import { notificationHref, notificationTypeLabel } from "../model/labels";
import { describeWorkError } from "../model/messages";

function GeneralNotifications() {
  const queryClient = useQueryClient();
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState<PageSize>(25);
  const [actionError, setActionError] = useState<string>();
  const query = useNotifications({ unreadOnly, page, size });

  const read = useMutation({
    mutationFn: (notificationId: number) => markNotificationRead(notificationId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: homeKeys.all }),
    onError: (error) => setActionError(describeWorkError(error, "읽음 처리하지 못했습니다.")),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Checkbox
          label="읽지 않은 알림만 보기"
          checked={unreadOnly}
          onCheckedChange={(next) => {
            setUnreadOnly(next);
            setPage(0);
          }}
        />
        <label className="flex items-center gap-2 text-caption text-ink-2">
          페이지당
          <select
            aria-label="페이지당 알림 수"
            value={size}
            onChange={(event) => {
              setSize(Number(event.target.value) as PageSize);
              setPage(0);
            }}
            className="h-10 rounded-control border border-line px-2"
          >
            {PAGE_SIZE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}건
              </option>
            ))}
          </select>
        </label>
      </div>
      {actionError ? <FormAlert>{actionError}</FormAlert> : null}
      <QueryGate query={query} loadingLabel="알림을 불러오는 중입니다.">
        {(data) =>
          data.items.length === 0 ? (
            <EmptyState
              title={unreadOnly ? "읽지 않은 알림이 없습니다." : "받은 알림이 없습니다."}
            />
          ) : (
            <>
              <ul className="flex flex-col gap-2">
                {data.items.map((item) => {
                  const href = notificationHref(item.targetType, item.targetId);
                  return (
                    <li
                      key={item.notificationId}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-card-flat border border-line px-5 py-4"
                    >
                      <div className="flex min-w-0 flex-col gap-1">
                        <span className="flex items-center gap-2">
                          <Badge
                            tone={item.read ? "gray" : "blue"}
                            className="h-7 min-w-0 px-3 text-caption"
                          >
                            {notificationTypeLabel(item.type)}
                          </Badge>
                          {item.read ? null : (
                            <span className="text-caption font-semibold text-primary">
                              읽지 않음
                            </span>
                          )}
                        </span>
                        <span className={item.read ? "text-ink-2" : "font-semibold text-ink"}>
                          {item.message}
                        </span>
                        <span className="text-caption text-ink-3">
                          {formatSeoulDateTime(item.createdAt)}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        {href ? (
                          <Link
                            href={href}
                            onClick={() => {
                              if (!item.read) read.mutate(item.notificationId);
                            }}
                            className="inline-flex h-9 items-center rounded-control border border-line px-3.5 text-caption font-medium text-ink-2 hover:border-primary hover:text-primary"
                          >
                            관련 화면으로 이동
                          </Link>
                        ) : null}
                        {item.read ? null : (
                          <Button
                            variant="ghost"
                            size="sm"
                            aria-label={`${item.message} 읽음 처리`}
                            onClick={() => read.mutate(item.notificationId)}
                          >
                            읽음 처리
                          </Button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
              <div className="flex items-center justify-center gap-3 text-caption text-ink-2">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={page === 0}
                  onClick={() => setPage((current) => current - 1)}
                >
                  이전
                </Button>
                <span>
                  {page + 1} / {Math.max(1, Math.ceil(data.totalElements / size))}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={(page + 1) * size >= data.totalElements}
                  onClick={() => setPage((current) => current + 1)}
                >
                  다음
                </Button>
              </div>
            </>
          )
        }
      </QueryGate>
    </div>
  );
}

function VisitRequestNotices() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["visit", "notices"], queryFn: listRequestNotices });
  const read = useMutation({
    mutationFn: (noticeId: number) => readRequestNotice(noticeId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["visit", "notices"] }),
  });
  return (
    <QueryGate query={query} loadingLabel="방문 신청 알림을 불러오는 중입니다.">
      {(data) =>
        data.items.length === 0 ? (
          <EmptyState title="방문 신청 알림이 없습니다." />
        ) : (
          <ul className="flex flex-col gap-2">
            {data.items.map((item) => (
              <li
                key={item.noticeId}
                className="flex flex-wrap items-center justify-between gap-3 rounded-card-flat border border-line px-5 py-4"
              >
                <div className="flex flex-col gap-1">
                  <Badge
                    tone={item.readAt ? "gray" : "teal"}
                    className="h-7 min-w-0 w-fit px-3 text-caption"
                  >
                    {NOTICE_TYPE_LABEL[item.noticeType] ?? "방문 신청"}
                  </Badge>
                  <span className="text-ink">
                    {NOTICE_TYPE_DESCRIPTION[item.noticeType] ?? "방문 신청 알림입니다."}
                  </span>
                  <span className="text-caption text-ink-3">
                    {formatSeoulDateTime(item.createdAt)}
                  </span>
                </div>
                <div className="flex gap-2">
                  <Link
                    href="/coordinations"
                    className="inline-flex h-9 items-center rounded-control border border-line px-3.5 text-caption font-medium text-ink-2 hover:border-primary hover:text-primary"
                  >
                    방문 조율로 이동
                  </Link>
                  {item.readAt ? null : (
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`방문 신청 알림 ${item.noticeId} 읽음 처리`}
                      onClick={() => read.mutate(item.noticeId)}
                    >
                      읽음 처리
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )
      }
    </QueryGate>
  );
}

export function NotificationListScreen() {
  const [tab, setTab] = useState("general");
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="알림함"
        description="앱 안에서만 전달되는 알림을 모아 봅니다. 방문과 공지·혜택 알림은 설정에서 끌 수 있고 로그인·보안과 서비스 필수 알림은 끌 수 없습니다."
      />
      <Tabs
        label="알림 종류"
        activeKey={tab}
        onActiveKeyChange={setTab}
        items={[
          { key: "general", label: "전체 알림", panel: <GeneralNotifications /> },
          { key: "visit-request", label: "방문 신청 알림", panel: <VisitRequestNotices /> },
        ]}
      />
    </div>
  );
}
