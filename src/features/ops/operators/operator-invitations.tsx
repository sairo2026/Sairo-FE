"use client";

import Link from "next/link";
import { useState } from "react";
import type { FormEvent } from "react";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { ConfirmDialog } from "@/shared/components/ui/modal";
import { Checkbox, SelectField } from "@/shared/components/ui/select-field";
import { TextField } from "@/shared/components/ui/text-field";
import { formatSeoulDateTime } from "@/shared/lib/format";
import { OpsFilterBar } from "../components/common/ops-filter-bar";
import { OpsScreen } from "../components/common/ops-screen";
import { OpsStatusBadge } from "../components/common/ops-status-badge";
import { OpsTable, useOpsPaging } from "../components/common/ops-table";
import { OPS_ROLES, OPS_ROLE_LABELS } from "../model/roles";
import type { OpsRole } from "../model/roles";
import { useInvitationActions, useInvitationList } from "./operator-api";
import { INVITATION_STATUS, INVITATION_VALID_HOURS, describeOperatorError } from "./operator-model";

type Notice = { tone: "ok" | "error"; text: string };
type FormErrors = { name?: string; email?: string; roles?: string };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const STATUS_OPTIONS = [
  { value: "", label: "전체" },
  ...Object.entries(INVITATION_STATUS).map(([value, entry]) => ({ value, label: entry.label })),
];

function InviteForm({ onNotice }: { onNotice: (notice: Notice) => void }) {
  const actions = useInvitationActions();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [roles, setRoles] = useState<OpsRole[]>([]);
  const [errors, setErrors] = useState<FormErrors>({});

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const found: FormErrors = {};
    if (name.trim() === "") found.name = "이름을 입력해 주세요.";
    if (!EMAIL_PATTERN.test(email.trim())) found.email = "이메일 형식을 확인해 주세요.";
    if (roles.length === 0) found.roles = "부여할 역할을 하나 이상 선택해 주세요.";
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    try {
      const created = await actions.create.mutateAsync({
        inviteeName: name.trim(),
        inviteeEmail: email.trim(),
        roles,
      });
      onNotice({
        tone: "ok",
        text: `${created.inviteeName}님에게 초대 메일을 보냈습니다. ${formatSeoulDateTime(created.expiresAt)}까지 수락할 수 있습니다.`,
      });
      setName("");
      setEmail("");
      setRoles([]);
    } catch (error) {
      onNotice({ tone: "error", text: describeOperatorError(error, "초대하지 못했습니다.") });
    }
  }

  return (
    <Card title="새 운영자 초대">
      <form onSubmit={(event) => void submit(event)} noValidate className="flex flex-col gap-4">
        <p className="text-caption text-ink-2">
          초대 유효기간은 {INVITATION_VALID_HOURS}시간입니다. 초대 링크는 이메일로만 전달되며 이
          화면과 서버 응답에는 토큰 원문이 없습니다. 초대 생성에는 5분 이내 재인증이 필요하고 감사
          로그에 남습니다.
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField label="이름" value={name} onValueChange={setName} error={errors.name} />
          <TextField
            label="이메일"
            value={email}
            onValueChange={setEmail}
            error={errors.email}
            autoComplete="off"
          />
        </div>
        <fieldset className="min-w-0 flex flex-col gap-2">
          <legend className="mb-2 text-caption font-semibold text-ink">부여할 역할</legend>
          <div className="flex flex-wrap gap-4">
            {OPS_ROLES.map((role) => (
              <Checkbox
                key={role}
                label={OPS_ROLE_LABELS[role]}
                checked={roles.includes(role)}
                onCheckedChange={(checked) =>
                  setRoles((prev) => (checked ? [...prev, role] : prev.filter((it) => it !== role)))
                }
              />
            ))}
          </div>
          {errors.roles ? (
            <p role="alert" className="text-caption text-danger">
              {errors.roles}
            </p>
          ) : null}
        </fieldset>
        <div>
          <Button type="submit" isLoading={actions.create.isPending}>
            초대 보내기
          </Button>
        </div>
      </form>
    </Card>
  );
}

type InvitationRow = { invitationId: number; inviteeName: string; version: number };

function InvitationTable({ onNotice }: { onNotice: (notice: Notice) => void }) {
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState("");
  const paging = useOpsPaging();
  const query = useInvitationList({ status, page: paging.page, size: paging.size });
  const actions = useInvitationActions();
  const [target, setTarget] = useState<InvitationRow | null>(null);

  async function cancel() {
    if (!target) return;
    try {
      await actions.cancel.mutateAsync({
        invitationId: target.invitationId,
        version: target.version,
      });
      onNotice({ tone: "ok", text: `${target.inviteeName}님에 대한 초대를 취소했습니다.` });
    } catch (error) {
      onNotice({
        tone: "error",
        text: describeOperatorError(error, "초대를 취소하지 못했습니다."),
      });
    }
    setTarget(null);
  }

  return (
    <div className="flex flex-col gap-4">
      <OpsFilterBar
        label="초대 조회"
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
      <OpsTable
        caption="운영자 초대 목록"
        query={query}
        paging={paging}
        getRowId={(row) => String(row.invitationId)}
        emptyMessage="초대 내역이 없습니다."
        columns={[
          { key: "name", header: "이름", render: (row) => row.inviteeName },
          { key: "email", header: "이메일", render: (row) => row.inviteeEmail },
          {
            key: "roles",
            header: "부여 역할",
            render: (row) => (
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
            key: "status",
            header: "상태",
            render: (row) => <OpsStatusBadge status={row.status} map={INVITATION_STATUS} />,
          },
          {
            key: "expiresAt",
            header: "만료 시각",
            render: (row) => formatSeoulDateTime(row.expiresAt),
          },
          { key: "by", header: "초대한 사람", render: (row) => row.invitedByName },
          {
            key: "actions",
            header: "처리",
            render: (row) =>
              row.status === "PENDING" ? (
                <Button
                  size="sm"
                  variant="ghost"
                  aria-label={`${row.inviteeName} 초대 취소`}
                  onClick={() => setTarget(row)}
                >
                  초대 취소
                </Button>
              ) : (
                "-"
              ),
          },
        ]}
      />
      <ConfirmDialog
        isOpen={target !== null}
        title="초대 취소"
        message={`${target?.inviteeName ?? ""}님에 대한 대기 중 초대를 취소합니다. 5분 이내 재인증이 필요하고 이미 받은 초대 링크는 쓸 수 없게 됩니다.`}
        confirmLabel="초대 취소"
        isPending={actions.cancel.isPending}
        onConfirm={() => void cancel()}
        onCancel={() => setTarget(null)}
      />
    </div>
  );
}

function Invitations() {
  const [notice, setNotice] = useState<Notice | null>(null);
  return (
    <>
      {notice ? (
        <p
          role={notice.tone === "error" ? "alert" : "status"}
          className={notice.tone === "error" ? "text-caption text-danger" : "text-caption text-ink"}
        >
          {notice.text}
        </p>
      ) : null}
      <InviteForm onNotice={setNotice} />
      <InvitationTable onNotice={setNotice} />
    </>
  );
}

export function OperatorInvitationsScreen() {
  return (
    <OpsScreen
      title="운영자 초대"
      description="새 운영자를 초대하고 초대 상태를 봅니다. 같은 이메일로 대기 중인 초대가 있으면 새로 만들 수 없습니다."
      roles={["SECURITY_ADMIN"]}
      actions={
        <Link href="/ops/operators" className="text-body font-semibold text-primary underline">
          운영자 목록
        </Link>
      }
    >
      <Invitations />
    </OpsScreen>
  );
}
