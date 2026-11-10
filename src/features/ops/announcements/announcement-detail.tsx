"use client";

import { useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { RadioGroup } from "@/shared/components/ui/select-field";
import { formatSeoulDateTime } from "@/shared/lib/format";
import { OpsDetailList } from "../components/common/ops-detail-list";
import { OpsStatusBadge } from "../components/common/ops-status-badge";
import { ActionDialog } from "../content-common/action-dialog";
import { SeoulDateTimeInput } from "../content-common/seoul-date-time-input";
import { EMPTY_DATE_TIME, isFutureIso, toSeoulIso } from "../content-common/seoul-time";
import { useAnnouncementActions, useAnnouncementPreview } from "./announcement-api";
import { AnnouncementFormView } from "./announcement-form";
import {
  ANNOUNCEMENT_STATUS,
  audienceLabel,
  formFromAnnouncement,
  importanceLabel,
} from "./announcement-model";
import type { AnnouncementItem } from "./announcement-model";

type Dialog = "review" | "publish" | "end" | "revise" | "preview" | null;

function PreviewBody({ announcementId }: { announcementId: number }) {
  const query = useAnnouncementPreview(announcementId);
  if (query.isPending) return <p role="status">미리보기를 불러오는 중입니다.</p>;
  if (query.isError) {
    return (
      <div className="flex flex-col gap-2">
        <p role="alert" className="text-danger">
          미리보기를 불러오지 못했습니다.
        </p>
        <div>
          <Button variant="outlined" size="sm" onClick={() => void query.refetch()}>
            다시 시도
          </Button>
        </div>
      </div>
    );
  }
  const data = query.data;
  return (
    <div className="flex flex-col gap-4">
      <ul aria-label="미리보기 건수" className="text-body text-ink">
        <li>대상 사무소 {data.targetOfficeCount.toLocaleString("ko-KR")}곳</li>
        <li>
          마케팅 수신 미동의로 제외되는 대상 {data.marketingExcludedCount.toLocaleString("ko-KR")}곳
        </li>
      </ul>
      <div
        role="group"
        aria-label="모바일 미리보기"
        className="mx-auto w-72 rounded-card border-4 border-line bg-white p-4"
      >
        <p className="whitespace-pre-wrap text-body text-ink">{data.renderedContent}</p>
      </div>
    </div>
  );
}

function PublishDialog({
  item,
  onDone,
  onClose,
}: {
  item: AnnouncementItem;
  onDone: (message: string) => void;
  onClose: () => void;
}) {
  const { publish } = useAnnouncementActions();
  const [mode, setMode] = useState("NOW");
  const [scheduled, setScheduled] = useState(EMPTY_DATE_TIME);
  const [error, setError] = useState<string | undefined>();

  async function confirm() {
    let scheduledAt: string | null = null;
    if (mode === "SCHEDULE") {
      scheduledAt = toSeoulIso(scheduled);
      if (scheduledAt === null) {
        setError("예약 게시 날짜와 시각을 입력해 주세요.");
        return false;
      }
      if (!isFutureIso(scheduledAt)) {
        setError("예약 시각은 현재 이후여야 합니다.");
        return false;
      }
    }
    setError(undefined);
    const result = await publish.mutateAsync({ announcementId: item.announcementId, scheduledAt });
    onDone(
      result.status === "SCHEDULED"
        ? `공지를 ${formatSeoulDateTime(result.scheduledAt ?? "")}에 게시하도록 예약했습니다.`
        : "공지를 게시했습니다.",
    );
  }

  return (
    <ActionDialog
      isOpen
      title="공지 게시"
      confirmLabel="게시"
      onConfirm={confirm}
      onClose={onClose}
    >
      <p>
        게시하면 노출 기간에 맞춰 대상 사무소에 공지가 보입니다. 처리 기록은 감사 로그에 남습니다.
      </p>
      <RadioGroup
        legend="게시 방식"
        name="publish-mode"
        value={mode}
        options={[
          { value: "NOW", label: "지금 게시" },
          { value: "SCHEDULE", label: "예약 게시" },
        ]}
        onValueChange={setMode}
      />
      {mode === "SCHEDULE" ? (
        <SeoulDateTimeInput
          label="예약 게시"
          value={scheduled}
          error={error}
          onChange={setScheduled}
        />
      ) : null}
    </ActionDialog>
  );
}

export function AnnouncementDetail({
  item,
  previous,
  onSelect,
  onNotice,
}: {
  item: AnnouncementItem;
  previous: AnnouncementItem | null;
  onSelect: (announcementId: number) => void;
  onNotice: (message: string) => void;
}) {
  const [dialog, setDialog] = useState<Dialog>(null);
  const actions = useAnnouncementActions();
  const close = () => setDialog(null);
  const isScheduled = item.status === "SCHEDULED";

  return (
    <Card title="공지 상세">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <OpsStatusBadge status={item.status} map={ANNOUNCEMENT_STATUS} />
          <span className="text-body font-semibold text-ink">{item.title}</span>
        </div>
        <OpsDetailList
          items={[
            { label: "버전", value: `${item.versionNo}판` },
            {
              label: "이전 버전",
              value:
                item.previousVersionId === null ? null : (
                  <span className="flex items-center gap-2">
                    <span>
                      {previous
                        ? `${previous.versionNo}판 ${previous.title}`
                        : `공지 ${item.previousVersionId}`}
                    </span>
                    {previous ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onSelect(previous.announcementId)}
                      >
                        이전 버전 보기
                      </Button>
                    ) : null}
                  </span>
                ),
            },
            { label: "대상", value: audienceLabel(item) },
            { label: "중요도", value: importanceLabel(item.importance) },
            {
              label: "노출 기간",
              value:
                item.startsAt && item.endsAt
                  ? `${formatSeoulDateTime(item.startsAt)} ~ ${formatSeoulDateTime(item.endsAt)}`
                  : null,
            },
            { label: "상세 링크", value: item.detailUrl },
            { label: "마케팅 여부", value: item.marketing ? "마케팅 공지" : "필수 안내" },
            {
              label: "예약 시각",
              value: item.scheduledAt ? formatSeoulDateTime(item.scheduledAt) : null,
            },
            {
              label: "게시 시각",
              value: item.publishedAt ? formatSeoulDateTime(item.publishedAt) : null,
            },
            { label: "종료 시각", value: item.endedAt ? formatSeoulDateTime(item.endedAt) : null },
          ]}
        />
        <div>
          <p className="text-caption font-semibold text-ink-2">본문</p>
          <p className="whitespace-pre-wrap text-body text-ink">{item.content}</p>
        </div>
        <p role="note" className="text-caption text-ink-2">
          {item.marketing
            ? "마케팅 공지이므로 수신에 동의하지 않은 대상은 제외하고 보냅니다."
            : "필수 안내이므로 마케팅 미동의자에게 선택 마케팅 경로로 보내지 않습니다."}
        </p>
        <div className="flex flex-wrap gap-2">
          {item.status === "DRAFT" || item.status === "REVIEW" ? (
            <Button variant="ghost" onClick={() => setDialog("preview")}>
              게시 전 미리보기
            </Button>
          ) : null}
          {item.status === "DRAFT" ? (
            <Button onClick={() => setDialog("review")}>검토 요청</Button>
          ) : null}
          {item.status === "REVIEW" ? (
            <Button onClick={() => setDialog("publish")}>게시·예약</Button>
          ) : null}
          {item.status === "PUBLISHED" ? (
            <Button variant="outlined" onClick={() => setDialog("revise")}>
              새 버전으로 수정
            </Button>
          ) : null}
          {item.status === "PUBLISHED" || isScheduled ? (
            <Button variant="cancel" onClick={() => setDialog("end")}>
              {isScheduled ? "예약 취소(종료)" : "공지 종료"}
            </Button>
          ) : null}
          {item.status === "ENDED" ? (
            <p className="text-caption text-ink-2">종료된 공지는 더 처리할 수 없습니다.</p>
          ) : null}
        </div>
      </div>

      {dialog === "preview" ? (
        <ActionDialog isOpen title="게시 전 미리보기" onClose={close}>
          <PreviewBody announcementId={item.announcementId} />
        </ActionDialog>
      ) : null}
      {dialog === "review" ? (
        <ActionDialog
          isOpen
          title="검토 요청"
          confirmLabel="검토 요청"
          onClose={close}
          onConfirm={async () => {
            await actions.submitReview.mutateAsync(item.announcementId);
            onNotice("공지를 검토 단계로 올렸습니다. 검토자로 기록됩니다.");
          }}
        >
          <p>초안을 검토 단계로 올립니다. 올린 운영자가 검토자로 기록됩니다.</p>
        </ActionDialog>
      ) : null}
      {dialog === "publish" ? (
        <PublishDialog item={item} onDone={onNotice} onClose={close} />
      ) : null}
      {dialog === "end" ? (
        <ActionDialog
          isOpen
          title={isScheduled ? "예약 취소" : "공지 종료"}
          confirmLabel={isScheduled ? "예약 취소" : "종료"}
          onClose={close}
          onConfirm={async () => {
            await actions.end.mutateAsync(item.announcementId);
            onNotice(isScheduled ? "예약을 취소하고 공지를 종료했습니다." : "공지를 종료했습니다.");
          }}
        >
          <p>
            {isScheduled
              ? "예약 상태의 공지를 종료하면 예약 취소로 처리되어 게시되지 않습니다."
              : "게시 중인 공지를 종료하면 더 이상 노출되지 않습니다."}{" "}
            종료한 공지는 되돌릴 수 없고 처리 기록은 감사 로그에 남습니다.
          </p>
        </ActionDialog>
      ) : null}
      {dialog === "revise" ? (
        <ActionDialog isOpen size="wide" title="새 버전으로 수정" onClose={close}>
          <p>게시된 공지는 덮어쓰지 않고 새 버전 초안으로 남깁니다. 이전 게시본과 연결됩니다.</p>
          <AnnouncementFormView
            initial={formFromAnnouncement(item)}
            submitLabel="새 버전 초안 저장"
            onCancel={close}
            onSubmit={async (body) => {
              const result = await actions.revise.mutateAsync({
                announcementId: item.announcementId,
                body,
              });
              onNotice(`새 버전(${result.versionNo}판) 초안을 만들었습니다.`);
              onSelect(result.announcementId);
              close();
            }}
          />
        </ActionDialog>
      ) : null}
    </Card>
  );
}
