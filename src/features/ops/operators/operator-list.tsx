"use client";

import Link from "next/link";
import { useState } from "react";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { ConfirmDialog, Modal } from "@/shared/components/ui/modal";
import { Checkbox } from "@/shared/components/ui/select-field";
import { formatSeoulDateTime } from "@/shared/lib/format";
import { OpsReasonDialog } from "../components/common/ops-reason-dialog";
import { OpsScreen } from "../components/common/ops-screen";
import { OpsStatusBadge } from "../components/common/ops-status-badge";
import { OpsTable, useOpsPaging } from "../components/common/ops-table";
import { useOpsSession } from "../model/ops-session";
import { OPS_ROLES, OPS_ROLE_LABELS } from "../model/roles";
import type { OpsRole } from "../model/roles";
import { useOperatorActions, useOperatorList } from "./operator-api";
import { OPERATOR_STATUS, describeOperatorError } from "./operator-model";

type OperatorRow = {
  operatorId: number;
  name: string;
  status: "ACTIVE" | "DISABLED";
  roles: string[];
};

type Notice = { tone: "ok" | "error"; text: string };

function RoleDialog({
  operator,
  isPending,
  onSubmit,
  onClose,
}: {
  operator: OperatorRow;
  isPending: boolean;
  onSubmit: (roles: string[]) => Promise<void>;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<string[]>(operator.roles);
  const [error, setError] = useState<string | null>(null);

  function toggle(role: OpsRole, checked: boolean) {
    setSelected((prev) => (checked ? [...prev, role] : prev.filter((item) => item !== role)));
  }

  async function submit() {
    if (selected.length === 0) {
      setError("역할을 하나 이상 선택해 주세요.");
      return;
    }
    setError(null);
    try {
      await onSubmit(selected);
    } catch (caught) {
      setError(describeOperatorError(caught, "역할을 지정하지 못했습니다."));
    }
  }

  return (
    <Modal
      isOpen
      title={`${operator.name} 역할 지정`}
      onClose={onClose}
      footer={
        <>
          <Button variant="cancel" onClick={onClose}>
            취소
          </Button>
          <Button isLoading={isPending} onClick={() => void submit()}>
            역할 저장
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <p className="text-caption text-ink-2">
          역할 지정에는 5분 이내 재인증이 필요하고 변경 기록은 감사 로그에 남습니다. 마지막 활성
          보안관리자의 역할은 회수할 수 없습니다.
        </p>
        <fieldset className="min-w-0 flex flex-col gap-2">
          <legend className="sr-only">부여할 역할</legend>
          {OPS_ROLES.map((role) => (
            <Checkbox
              key={role}
              label={OPS_ROLE_LABELS[role]}
              checked={selected.includes(role)}
              onCheckedChange={(checked) => toggle(role, checked)}
            />
          ))}
        </fieldset>
        {error ? (
          <p role="alert" className="text-caption text-danger">
            {error}
          </p>
        ) : null}
      </div>
    </Modal>
  );
}

function OperatorTable() {
  const session = useOpsSession();
  const paging = useOpsPaging();
  const query = useOperatorList({ page: paging.page, size: paging.size });
  const actions = useOperatorActions();
  const [roleTarget, setRoleTarget] = useState<OperatorRow | null>(null);
  const [disableTarget, setDisableTarget] = useState<OperatorRow | null>(null);
  const [enableTarget, setEnableTarget] = useState<OperatorRow | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);

  async function enable() {
    if (!enableTarget) return;
    try {
      await actions.enable.mutateAsync(enableTarget.operatorId);
      setNotice({ tone: "ok", text: `${enableTarget.name} 계정을 다시 활성화했습니다.` });
    } catch (error) {
      setNotice({ tone: "error", text: describeOperatorError(error, "재활성화하지 못했습니다.") });
    }
    setEnableTarget(null);
  }

  return (
    <div className="flex flex-col gap-4">
      {notice ? (
        <p
          role={notice.tone === "error" ? "alert" : "status"}
          className={notice.tone === "error" ? "text-caption text-danger" : "text-caption text-ink"}
        >
          {notice.text}
        </p>
      ) : null}
      <OpsTable
        caption="운영자 계정 목록"
        query={query}
        paging={paging}
        getRowId={(row) => String(row.operatorId)}
        emptyMessage="등록된 운영자가 없습니다."
        columns={[
          { key: "name", header: "이름", render: (row) => row.name },
          {
            key: "status",
            header: "상태",
            render: (row) => <OpsStatusBadge status={row.status} map={OPERATOR_STATUS} />,
          },
          {
            key: "roles",
            header: "역할",
            render: (row) =>
              row.roles.length === 0 ? (
                "-"
              ) : (
                <span className="flex flex-wrap gap-1">
                  {row.roles.map((role) => (
                    <Badge key={role} tone="teal">
                      {OPS_ROLE_LABELS[role as OpsRole] ?? role}
                    </Badge>
                  ))}
                </span>
              ),
          },
          {
            key: "createdAt",
            header: "등록 시각",
            render: (row) => formatSeoulDateTime(row.createdAt),
          },
          {
            key: "actions",
            header: "처리",
            render: (row) => (
              <span className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  aria-label={`${row.name} 역할 지정`}
                  onClick={() => setRoleTarget(row)}
                >
                  역할 지정
                </Button>
                {row.status === "ACTIVE" ? (
                  row.operatorId === session.operatorId ? (
                    <span className="text-caption text-ink-2">본인 계정</span>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      aria-label={`${row.name} 비활성화`}
                      onClick={() => setDisableTarget(row)}
                    >
                      비활성화
                    </Button>
                  )
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label={`${row.name} 재활성화`}
                    onClick={() => setEnableTarget(row)}
                  >
                    재활성화
                  </Button>
                )}
              </span>
            ),
          },
        ]}
      />
      {roleTarget ? (
        <RoleDialog
          key={roleTarget.operatorId}
          operator={roleTarget}
          isPending={actions.assignRoles.isPending}
          onSubmit={async (roles) => {
            await actions.assignRoles.mutateAsync({ operatorId: roleTarget.operatorId, roles });
            setNotice({ tone: "ok", text: `${roleTarget.name} 역할을 저장했습니다.` });
            setRoleTarget(null);
          }}
          onClose={() => setRoleTarget(null)}
        />
      ) : null}
      <OpsReasonDialog
        isOpen={disableTarget !== null}
        title={`${disableTarget?.name ?? ""} 비활성화`}
        description="5분 이내 재인증이 필요합니다. 비활성화하면 그 운영자의 모든 세션이 종료되고 승인자였던 미실행 승인이 무효가 됩니다. 처리 기록은 감사 로그에 남습니다."
        reasonLabel="비활성화 사유"
        confirmLabel="비활성화"
        onSubmit={async (reason) => {
          if (!disableTarget) return;
          const result = await actions.disable.mutateAsync({
            operatorId: disableTarget.operatorId,
            reason,
          });
          setNotice({
            tone: "ok",
            text: `${disableTarget.name} 계정을 비활성화했습니다. 종료한 세션 ${result.terminatedSessionCount}개, 무효화한 미실행 승인 ${result.invalidatedApprovalCount}건입니다.`,
          });
        }}
        onClose={() => setDisableTarget(null)}
      />
      <ConfirmDialog
        isOpen={enableTarget !== null}
        title="운영자 재활성화"
        message={`${enableTarget?.name ?? ""} 계정을 다시 활성화합니다. 5분 이내 재인증이 필요하고 사유 입력은 없습니다. 이전에 무효가 된 승인은 되살아나지 않습니다.`}
        confirmLabel="재활성화"
        isPending={actions.enable.isPending}
        onConfirm={() => void enable()}
        onCancel={() => setEnableTarget(null)}
      />
    </div>
  );
}

export function OperatorListScreen() {
  return (
    <OpsScreen
      title="운영자"
      description="운영자 계정과 역할을 관리합니다. 역할 지정, 비활성화, 재활성화는 모두 5분 이내 재인증이 필요하고 감사 로그에 남습니다."
      roles={["SECURITY_ADMIN"]}
      actions={
        <span className="flex gap-4 text-body font-semibold text-primary">
          <Link href="/ops/operators/invitations" className="underline">
            운영자 초대 관리
          </Link>
          <Link href="/ops/audit-log" className="underline">
            감사 이력
          </Link>
        </span>
      }
    >
      <OperatorTable />
    </OpsScreen>
  );
}
