"use client";

import Link from "next/link";
import { useState } from "react";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { SelectField } from "@/shared/components/ui/select-field";
import { formatSeoulDateTime } from "@/shared/lib/format";
import { OpsFilterBar } from "../components/common/ops-filter-bar";
import { OpsScreen } from "../components/common/ops-screen";
import { OpsStatusBadge } from "../components/common/ops-status-badge";
import { OpsTable, useOpsPaging } from "../components/common/ops-table";
import { useHasOpsRole } from "../model/ops-session";
import { FormMessage } from "../system-common/system-fields";
import { describeSystemError } from "../system-common/system-form";
import { IntegrationEditDialog } from "./integration-edit-dialog";
import { useCheckIntegration, useIntegrations } from "./integrations-api";
import {
  CHECK_RESULT,
  CONSENT_STATUS,
  CONTRACT_STATUS,
  ENVIRONMENT_LABELS,
  ENVIRONMENT_OPTIONS,
} from "./integrations-model";
import type { Integration } from "./integrations-model";

function IntegrationTable() {
  const canSeeCopies = useHasOpsRole(["PRIVACY"]);
  const [environment, setEnvironment] = useState("");
  const [applied, setApplied] = useState("");
  const [editing, setEditing] = useState<Integration | null>(null);
  const [feedback, setFeedback] = useState<{ message: string; isError: boolean } | null>(null);
  const [checkingId, setCheckingId] = useState<number | null>(null);
  const paging = useOpsPaging();
  const query = useIntegrations({ page: paging.page, size: paging.size }, applied);
  const check = useCheckIntegration();

  async function runCheck(row: Integration) {
    setCheckingId(row.integrationId);
    setFeedback(null);
    try {
      const result = await check.mutateAsync(row.integrationId);
      const label = CHECK_RESULT[result.lastCheckResult]?.label ?? result.lastCheckResult;
      setFeedback({
        message: `연동 ${row.integrationId} 연결 검사 결과는 ${label}입니다.`,
        isError: result.lastCheckResult === "FAILED",
      });
    } catch (caught) {
      setFeedback({
        message: describeSystemError(caught, "연결 검사를 하지 못했습니다."),
        isError: true,
      });
    } finally {
      setCheckingId(null);
    }
  }

  return (
    <>
      <OpsFilterBar
        label="연동 조회"
        onApply={() => setApplied(environment)}
        onReset={() => {
          setEnvironment("");
          setApplied("");
        }}
      >
        <SelectField
          label="환경"
          value={environment}
          options={ENVIRONMENT_OPTIONS}
          onValueChange={setEnvironment}
        />
      </OpsFilterBar>
      {feedback ? (
        <FormMessage tone={feedback.isError ? "error" : "success"}>{feedback.message}</FormMessage>
      ) : null}
      <OpsTable
        caption="연동 설정 목록"
        query={query}
        paging={paging}
        getRowId={(row) => String(row.integrationId)}
        emptyMessage="등록된 연동이 없습니다."
        columns={[
          { key: "id", header: "연동 번호", render: (row) => row.integrationId },
          {
            key: "env",
            header: "환경",
            render: (row) => (
              <Badge tone={row.environment === "PRODUCTION" ? "blue" : "gray"}>
                {ENVIRONMENT_LABELS[row.environment] ?? row.environment}
              </Badge>
            ),
          },
          { key: "provider", header: "공급자", render: (row) => row.provider },
          { key: "function", header: "기능", render: (row) => row.functionCode },
          {
            key: "enabled",
            header: "활성",
            render: (row) => (
              <Badge tone={row.enabled ? "green" : "gray"}>{row.enabled ? "활성" : "비활성"}</Badge>
            ),
          },
          {
            key: "secretRef",
            header: "비밀값 저장소 참조 ID",
            render: (row) => row.secretReferenceId,
          },
          { key: "masked", header: "마스킹된 연결값", render: (row) => row.maskedConnection },
          { key: "region", header: "처리지역", render: (row) => row.processingRegion ?? "-" },
          {
            key: "retention",
            header: "보유기간과 파기 기준",
            render: (row) => row.retentionPolicy,
          },
          {
            key: "contract",
            header: "계약 상태",
            render: (row) => <OpsStatusBadge status={row.contractStatus} map={CONTRACT_STATUS} />,
          },
          {
            key: "consent",
            header: "동의 상태",
            render: (row) => <OpsStatusBadge status={row.consentStatus} map={CONSENT_STATUS} />,
          },
          {
            key: "reviewed",
            header: "계약·고지 점검",
            render: (row) =>
              row.contractNoticeReviewedAt
                ? formatSeoulDateTime(row.contractNoticeReviewedAt)
                : "점검 전",
          },
          {
            key: "check",
            header: "연결 검사",
            render: (row) => (
              <div className="flex flex-col gap-2">
                {row.lastCheckResult ? (
                  <OpsStatusBadge status={row.lastCheckResult} map={CHECK_RESULT} />
                ) : (
                  "-"
                )}
                <Button
                  variant="outlined"
                  size="sm"
                  aria-label={`연동 ${row.integrationId} 연결 검사`}
                  isLoading={checkingId === row.integrationId}
                  onClick={() => void runCheck(row)}
                >
                  연결 검사
                </Button>
              </div>
            ),
          },
          {
            key: "lastSuccess",
            header: "마지막 성공",
            render: (row) => (row.lastSuccessAt ? formatSeoulDateTime(row.lastSuccessAt) : "-"),
          },
          {
            key: "assignee",
            header: "담당",
            render: (row) =>
              row.assignedOperatorId === null ? "미지정" : `운영자 ${row.assignedOperatorId}`,
          },
          {
            key: "approver",
            header: "활성화 승인자",
            render: (row) =>
              row.approvedByOperatorId === null ? "승인 전" : `운영자 ${row.approvedByOperatorId}`,
          },
          {
            key: "actions",
            header: "관리",
            render: (row) => (
              <div className="flex flex-col gap-2">
                <Button
                  variant="outlined"
                  size="sm"
                  aria-label={`연동 ${row.integrationId} 설정 변경`}
                  onClick={() => {
                    setFeedback(null);
                    setEditing(row);
                  }}
                >
                  설정 변경
                </Button>
                {canSeeCopies ? (
                  <Link
                    href={`/ops/integrations/${row.integrationId}/contract-copies`}
                    className="text-caption font-semibold text-primary underline"
                    aria-label={`연동 ${row.integrationId} 계약서 사본`}
                  >
                    계약서 사본
                  </Link>
                ) : null}
              </div>
            ),
          },
        ]}
      />
      {editing ? (
        <IntegrationEditDialog
          key={editing.integrationId}
          row={editing}
          onClose={() => setEditing(null)}
          onSaved={(message) => {
            setEditing(null);
            setFeedback({ message, isError: false });
          }}
        />
      ) : null}
    </>
  );
}

export function IntegrationsScreen() {
  return (
    <OpsScreen
      title="연동 설정"
      description="결제, 이메일, 본인확인, 저장소, AI 공급자 연동의 상태와 계약·고지 점검을 관리합니다."
      roles={["OPS"]}
    >
      <p className="text-caption text-ink-2">
        비밀값은 저장소 참조 ID와 마스킹된 연결값만 보입니다. 시험 환경에서는 실제 과금과 운영 고객
        발송을 하지 않고 점검 호출만 합니다. 운영 환경 활성화와 공급자·처리지역 변경은 계약·고지
        점검과 승인 뒤에 적용됩니다.
      </p>
      <IntegrationTable />
    </OpsScreen>
  );
}
