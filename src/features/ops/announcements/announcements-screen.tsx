"use client";

import { useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { formatSeoulDateTime } from "@/shared/lib/format";
import { OpsScreen } from "../components/common/ops-screen";
import { OpsStatusBadge } from "../components/common/ops-status-badge";
import { OpsTable, useOpsPaging } from "../components/common/ops-table";
import { SuccessNotice } from "../content-common/notice-banner";
import { useAnnouncementActions, useAnnouncementList } from "./announcement-api";
import { AnnouncementDetail } from "./announcement-detail";
import { AnnouncementFormView } from "./announcement-form";
import {
  ANNOUNCEMENT_STATUS,
  EMPTY_ANNOUNCEMENT_FORM,
  MARKETING_RULE_TEXT,
  audienceLabel,
  importanceLabel,
} from "./announcement-model";

function CreateCard({
  onCreated,
  onCancel,
}: {
  onCreated: (announcementId: number) => void;
  onCancel: () => void;
}) {
  const { create } = useAnnouncementActions();
  return (
    <Card title="새 공지 작성">
      <p className="mb-4 text-body text-ink-2">
        작성한 공지는 초안으로 저장됩니다. 검토 요청과 게시는 상세에서 이어서 처리합니다.
      </p>
      <AnnouncementFormView
        initial={EMPTY_ANNOUNCEMENT_FORM}
        submitLabel="초안 저장"
        onCancel={onCancel}
        onSubmit={async (body) => {
          const result = await create.mutateAsync(body);
          onCreated(result.announcementId);
        }}
      />
    </Card>
  );
}

export function AnnouncementsScreen() {
  const paging = useOpsPaging();
  const query = useAnnouncementList({ page: paging.page, size: paging.size });
  const [isCreating, setIsCreating] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const items = query.data?.items ?? [];
  const selected = items.find((item) => item.announcementId === selectedId) ?? null;
  const previous =
    selected === null || selected.previousVersionId === null
      ? null
      : (items.find((item) => item.announcementId === selected.previousVersionId) ?? null);

  return (
    <OpsScreen
      title="공지 관리"
      description="공지를 초안, 검토, 예약·게시, 종료 순서로 처리합니다. 게시된 공지의 수정은 새 버전으로 남깁니다."
      roles={["OPS"]}
      actions={
        <Button onClick={() => setIsCreating(true)} disabled={isCreating}>
          새 공지 작성
        </Button>
      }
    >
      <SuccessNotice message={notice} />
      <p role="note" className="text-caption text-ink-2">
        {MARKETING_RULE_TEXT}
      </p>
      {isCreating ? (
        <CreateCard
          onCancel={() => setIsCreating(false)}
          onCreated={(announcementId) => {
            setIsCreating(false);
            setSelectedId(announcementId);
            setNotice("공지 초안을 저장했습니다.");
          }}
        />
      ) : null}
      <OpsTable
        caption="공지 목록"
        query={query}
        paging={paging}
        getRowId={(row) => String(row.announcementId)}
        emptyMessage="등록된 공지가 없습니다."
        columns={[
          {
            key: "title",
            header: "제목",
            render: (row) => (
              <Button
                variant="ghost"
                size="sm"
                aria-label={`${row.title} ${row.versionNo}판 상세 보기`}
                onClick={() => {
                  setSelectedId(row.announcementId);
                  setNotice(null);
                }}
              >
                {row.title}
              </Button>
            ),
          },
          { key: "version", header: "버전", render: (row) => `${row.versionNo}판` },
          {
            key: "status",
            header: "상태",
            render: (row) => <OpsStatusBadge status={row.status} map={ANNOUNCEMENT_STATUS} />,
          },
          { key: "audience", header: "대상", render: (row) => audienceLabel(row) },
          {
            key: "importance",
            header: "중요도",
            render: (row) => importanceLabel(row.importance),
          },
          {
            key: "marketing",
            header: "구분",
            render: (row) => (row.marketing ? "마케팅" : "필수 안내"),
          },
          {
            key: "period",
            header: "노출 기간",
            render: (row) =>
              row.startsAt && row.endsAt
                ? `${formatSeoulDateTime(row.startsAt)} ~ ${formatSeoulDateTime(row.endsAt)}`
                : "-",
          },
        ]}
      />
      {selected ? (
        <AnnouncementDetail
          key={selected.announcementId}
          item={selected}
          previous={previous}
          onSelect={setSelectedId}
          onNotice={setNotice}
        />
      ) : null}
    </OpsScreen>
  );
}
