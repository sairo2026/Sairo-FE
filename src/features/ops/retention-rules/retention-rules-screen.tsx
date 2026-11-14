"use client";

import { useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { SelectField } from "@/shared/components/ui/select-field";
import { Tabs } from "@/shared/components/ui/tabs";
import { formatSeoulDate, formatSeoulDateTime } from "@/shared/lib/format";
import { OpsFilterBar } from "../components/common/ops-filter-bar";
import { OpsScreen } from "../components/common/ops-screen";
import { OpsStatusBadge } from "../components/common/ops-status-badge";
import { OpsTable, useOpsPaging } from "../components/common/ops-table";
import { DraftNotice, FormMessage } from "../system-common/system-fields";
import { describeSystemError } from "../system-common/system-form";
import { useKakaoEvents, useRetentionRules, useRetryKakaoEvent } from "./retention-api";
import { RuleEditDialog } from "./rule-edit-dialog";
import {
  ANCHOR_LABELS,
  DIRECTION_LABELS,
  DIRECTION_OPTIONS,
  KAKAO_STATUS,
  KAKAO_STATUS_OPTIONS,
  RULE_STATUS,
  canRetryKakao,
} from "./retention-model";

function RulesPanel() {
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const paging = useOpsPaging(100);
  const query = useRetentionRules();
  const editing = query.data?.items.find((rule) => rule.ruleCode === editingCode) ?? null;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-caption text-ink-2">
        일수와 근거 메모를 바꾸려면 변경 사유가 필요하고, 다른 운영자가 먼저 수정했으면 저장이
        거절됩니다.
      </p>
      {feedback ? <FormMessage tone="success">{feedback}</FormMessage> : null}
      <OpsTable
        caption="보관 기간 규칙"
        query={query}
        paging={paging}
        getRowId={(row) => row.ruleCode}
        emptyMessage="등록된 보관 기간 규칙이 없습니다."
        columns={[
          { key: "code", header: "규칙 코드", render: (row) => row.ruleCode },
          { key: "group", header: "데이터군", render: (row) => row.dataGroupLabel },
          { key: "days", header: "보관 일수", render: (row) => `${row.retentionDays}일` },
          {
            key: "anchor",
            header: "기산점",
            render: (row) => ANCHOR_LABELS[row.anchorEvent] ?? row.anchorEvent,
          },
          { key: "note", header: "근거 메모", render: (row) => row.basisNote },
          {
            key: "status",
            header: "확인 상태",
            render: (row) => <OpsStatusBadge status={row.status} map={RULE_STATUS} />,
          },
          {
            key: "effective",
            header: "적용 시작일",
            render: (row) => formatSeoulDate(row.effectiveFrom),
          },
          {
            key: "edit",
            header: "수정",
            render: (row) => (
              <Button
                variant="outlined"
                size="sm"
                aria-label={`규칙 ${row.ruleCode} 수정`}
                onClick={() => {
                  setFeedback(null);
                  setEditingCode(row.ruleCode);
                }}
              >
                수정
              </Button>
            ),
          },
        ]}
      />
      {editing ? (
        <RuleEditDialog
          key={editing.ruleCode}
          rule={editing}
          onClose={() => setEditingCode(null)}
          onSaved={(message) => {
            setEditingCode(null);
            setFeedback(message);
          }}
        />
      ) : null}
    </div>
  );
}

function KakaoPanel() {
  const [direction, setDirection] = useState("");
  const [status, setStatus] = useState("");
  const [applied, setApplied] = useState({ direction: "", status: "" });
  const [feedback, setFeedback] = useState<{ message: string; isError: boolean } | null>(null);
  const paging = useOpsPaging();
  const query = useKakaoEvents({ ...applied, page: paging.page, size: paging.size });
  const retry = useRetryKakaoEvent();

  async function retryEvent(eventId: number) {
    setFeedback(null);
    try {
      const result = await retry.mutateAsync(eventId);
      setFeedback({
        message: `사건 ${eventId}를 다시 시도하도록 예약했습니다. 다음 호출은 ${formatSeoulDateTime(result.nextAttemptAt)}입니다.`,
        isError: false,
      });
    } catch (caught) {
      setFeedback({
        message: describeSystemError(caught, "다시 시도하지 못했습니다."),
        isError: true,
      });
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-caption text-ink-2">
        식별자 원문과 암호문은 표시하지 않습니다. 대기 또는 재시도 상태의 호출 작업만 수동으로 다시
        시도할 수 있습니다.
      </p>
      <OpsFilterBar
        label="연결 끊기 사건 조회"
        onApply={() => {
          setApplied({ direction, status });
          paging.resetPage();
        }}
        onReset={() => {
          setDirection("");
          setStatus("");
          setApplied({ direction: "", status: "" });
          paging.resetPage();
        }}
      >
        <SelectField
          label="방향"
          value={direction}
          options={DIRECTION_OPTIONS}
          onValueChange={setDirection}
        />
        <SelectField
          label="상태"
          value={status}
          options={KAKAO_STATUS_OPTIONS}
          onValueChange={setStatus}
        />
      </OpsFilterBar>
      {feedback ? (
        <FormMessage tone={feedback.isError ? "error" : "success"}>{feedback.message}</FormMessage>
      ) : null}
      <OpsTable
        caption="카카오 연결 끊기 사건"
        query={query}
        paging={paging}
        getRowId={(row) => String(row.eventId)}
        emptyMessage="조건에 맞는 사건이 없습니다."
        columns={[
          { key: "id", header: "사건 번호", render: (row) => row.eventId },
          {
            key: "direction",
            header: "방향",
            render: (row) => DIRECTION_LABELS[row.direction] ?? row.direction,
          },
          {
            key: "status",
            header: "상태",
            render: (row) => <OpsStatusBadge status={row.status} map={KAKAO_STATUS} />,
          },
          { key: "attempt", header: "시도 횟수", render: (row) => `${row.attemptCount}회` },
          { key: "error", header: "마지막 오류", render: (row) => row.lastErrorCode ?? "-" },
          {
            key: "next",
            header: "다음 시도",
            render: (row) => (row.nextAttemptAt ? formatSeoulDateTime(row.nextAttemptAt) : "-"),
          },
          { key: "referrer", header: "사유", render: (row) => row.referrerType ?? "-" },
          { key: "user", header: "사용자 번호", render: (row) => row.userId ?? "-" },
          {
            key: "occurred",
            header: "발생 시각",
            render: (row) => formatSeoulDateTime(row.occurredAt),
          },
          {
            key: "retry",
            header: "재시도",
            render: (row) =>
              canRetryKakao(row) ? (
                <Button
                  variant="outlined"
                  size="sm"
                  aria-label={`사건 ${row.eventId} 다시 시도`}
                  isLoading={retry.isPending && retry.variables === row.eventId}
                  onClick={() => void retryEvent(row.eventId)}
                >
                  다시 시도
                </Button>
              ) : (
                "-"
              ),
          },
        ]}
      />
    </div>
  );
}

function RetentionTabs() {
  const [active, setActive] = useState("rules");
  return (
    <Tabs
      label="보관 기간과 연결 끊기"
      activeKey={active}
      onActiveKeyChange={setActive}
      items={[
        { key: "rules", label: "보관 기간 규칙", panel: <RulesPanel /> },
        { key: "kakao", label: "카카오 연결 끊기", panel: <KakaoPanel /> },
      ]}
    />
  );
}

export function RetentionRulesScreen() {
  return (
    <OpsScreen
      title="보관 기간 규칙"
      description="데이터군별 보관 기간 규칙과 카카오 연결 끊기 작업을 점검합니다."
      roles={["PRIVACY"]}
    >
      <DraftNotice />
      <RetentionTabs />
    </OpsScreen>
  );
}
