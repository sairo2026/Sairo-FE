"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { Tabs } from "@/shared/components/ui/tabs";
import { TextField } from "@/shared/components/ui/text-field";
import { formatSeoulDateTime } from "@/shared/lib/format";
import { OpsReasonDialog } from "../components/common/ops-reason-dialog";
import { OpsScreen } from "../components/common/ops-screen";
import { OpsStatusBadge } from "../components/common/ops-status-badge";
import { OpsTable, useOpsPaging } from "../components/common/ops-table";
import { useArchiveGrants, useGrantTransfer, useReturnGrants } from "./privacy-api";
import { GRANT_STATUS, grantStatus, validateTransfer } from "./privacy-model";
import type { GrantKind, TransferInput } from "./privacy-model";

type Notice = { tone: "ok"; text: string } | null;

const EMPTY_INPUT: TransferInput = {
  newGranteeUserId: "",
  identityEvidenceReference: "",
  registrationRelationReference: "",
  contractReference: "",
};

const KIND_LABEL: Record<GrantKind, string> = { return: "반환권한", archive: "보관권한" };

function TransferDialog({
  kind,
  grantId,
  onDone,
  onClose,
}: {
  kind: GrantKind;
  grantId: number | null;
  onDone: (text: string) => void;
  onClose: () => void;
}) {
  const transfer = useGrantTransfer(kind);
  const [input, setInput] = useState(EMPTY_INPUT);
  const [touched, setTouched] = useState(false);
  const errors = validateTransfer(kind, input);
  const hasErrors = Object.keys(errors).length > 0;
  const show = (key: keyof TransferInput) => (touched ? errors[key] : undefined);
  const set = (key: keyof TransferInput) => (value: string) => {
    setInput({ ...input, [key]: value });
    setTouched(true);
  };

  return (
    <OpsReasonDialog
      isOpen={grantId !== null}
      title={`${KIND_LABEL[kind]} 권한자 변경`}
      description={
        <div className="flex flex-col gap-2 text-caption text-ink-2">
          <p>
            기존 권한을 {kind === "return" ? "회수" : "종료"}하는 처리와 새 권한 발급이 한 번에
            실행되며 되돌릴 수 없습니다. 증빙 참조와 변경 사유는 감사 로그에 남습니다.
          </p>
          <p>
            이 처리는 5분 이내에 재인증을 마쳐야 합니다. 재인증이 필요하면 확인 코드를 요청합니다.
          </p>
          {kind === "return" ? (
            <p>
              새 반환권한은 발급 시점부터 30일 동안 유효하며 기존 권한의 만료를 이어받지 않습니다.
            </p>
          ) : null}
        </div>
      }
      reasonLabel="변경 사유"
      confirmLabel="권한자 변경"
      isReady={!hasErrors}
      onSubmit={async (reason) => {
        if (grantId === null) return;
        const result = await transfer.mutateAsync({
          grantId,
          body: {
            newGranteeUserId: Number(input.newGranteeUserId),
            identityEvidenceReference: input.identityEvidenceReference.trim(),
            registrationRelationReference: input.registrationRelationReference.trim(),
            ...(kind === "archive" ? { contractReference: input.contractReference.trim() } : {}),
            reason,
          },
        });
        onDone(
          `${KIND_LABEL[kind]} ${result.previousGrantId}을(를) ${kind === "return" ? "회수" : "종료"}하고 새 권한 ${result.newGrantId}을(를) 발급했습니다.`,
        );
        setInput(EMPTY_INPUT);
        setTouched(false);
      }}
      onClose={() => {
        setInput(EMPTY_INPUT);
        setTouched(false);
        onClose();
      }}
    >
      <div className="flex flex-col gap-3">
        <TextField
          label="새 권한자 회원 번호"
          kind="number"
          value={input.newGranteeUserId}
          onValueChange={set("newGranteeUserId")}
          error={show("newGranteeUserId")}
        />
        <TextField
          label="본인확인 증빙 참조"
          value={input.identityEvidenceReference}
          onValueChange={set("identityEvidenceReference")}
          error={show("identityEvidenceReference")}
        />
        <TextField
          label="등록관계 증빙 참조"
          value={input.registrationRelationReference}
          onValueChange={set("registrationRelationReference")}
          error={show("registrationRelationReference")}
        />
        {kind === "archive" ? (
          <TextField
            label="새 보관계약 참조"
            value={input.contractReference}
            onValueChange={set("contractReference")}
            error={show("contractReference")}
          />
        ) : null}
      </div>
    </OpsReasonDialog>
  );
}

function ReturnGrantTable({ onTransfer }: { onTransfer: (grantId: number) => void }) {
  const paging = useOpsPaging();
  const query = useReturnGrants({ page: paging.page, size: paging.size });
  const [now] = useState(() => Date.now());
  return (
    <OpsTable
      caption="반환권한 현황"
      query={query}
      paging={paging}
      getRowId={(row) => String(row.grantId)}
      emptyMessage="발급된 반환권한이 없습니다."
      columns={[
        { key: "id", header: "권한 번호", render: (row) => row.grantId },
        { key: "office", header: "사무소 번호", render: (row) => row.officeId },
        { key: "user", header: "권한자 회원 번호", render: (row) => row.grantedToUserId },
        {
          key: "status",
          header: "상태",
          render: (row) => (
            <OpsStatusBadge status={grantStatus("return", row, now)} map={GRANT_STATUS} />
          ),
        },
        { key: "granted", header: "발급", render: (row) => formatSeoulDateTime(row.grantedAt) },
        { key: "expires", header: "만료", render: (row) => formatSeoulDateTime(row.expiresAt) },
        {
          key: "revoked",
          header: "회수",
          render: (row) => (row.revokedAt ? formatSeoulDateTime(row.revokedAt) : "-"),
        },
        {
          key: "action",
          header: "처리",
          render: (row) => (
            <Button
              size="sm"
              variant="outlined"
              aria-label={`반환권한 ${row.grantId} 권한자 변경`}
              disabled={grantStatus("return", row, now) !== "ACTIVE"}
              onClick={() => onTransfer(row.grantId)}
            >
              권한자 변경
            </Button>
          ),
        },
      ]}
    />
  );
}

function ArchiveGrantTable({ onTransfer }: { onTransfer: (grantId: number) => void }) {
  const paging = useOpsPaging();
  const query = useArchiveGrants({ page: paging.page, size: paging.size });
  const [now] = useState(() => Date.now());
  return (
    <OpsTable
      caption="보관권한 현황"
      query={query}
      paging={paging}
      getRowId={(row) => String(row.grantId)}
      emptyMessage="발급된 보관권한이 없습니다."
      columns={[
        { key: "id", header: "권한 번호", render: (row) => row.grantId },
        { key: "office", header: "사무소 번호", render: (row) => row.officeId },
        { key: "user", header: "권한자 회원 번호", render: (row) => row.grantedToUserId },
        { key: "contract", header: "보관계약 참조", render: (row) => row.contractReference ?? "-" },
        {
          key: "status",
          header: "상태",
          render: (row) => (
            <OpsStatusBadge status={grantStatus("archive", row, now)} map={GRANT_STATUS} />
          ),
        },
        { key: "granted", header: "발급", render: (row) => formatSeoulDateTime(row.grantedAt) },
        {
          key: "expires",
          header: "만료",
          render: (row) => (row.expiresAt ? formatSeoulDateTime(row.expiresAt) : "기한 없음"),
        },
        {
          key: "terminated",
          header: "종료",
          render: (row) => (row.terminatedAt ? formatSeoulDateTime(row.terminatedAt) : "-"),
        },
        {
          key: "action",
          header: "처리",
          render: (row) => (
            <Button
              size="sm"
              variant="outlined"
              aria-label={`보관권한 ${row.grantId} 권한자 변경`}
              disabled={grantStatus("archive", row, now) !== "ACTIVE"}
              onClick={() => onTransfer(row.grantId)}
            >
              권한자 변경
            </Button>
          ),
        },
      ]}
    />
  );
}

export function GrantsScreen() {
  const [tab, setTab] = useState<GrantKind>("return");
  const [target, setTarget] = useState<{ kind: GrantKind; grantId: number } | null>(null);
  const [notice, setNotice] = useState<Notice>(null);

  return (
    <OpsScreen
      title="반환·보관 권한"
      description="탈퇴 후 자료 반환권한과 법정보존문서 보관권한은 별도 권한으로 따로 처리합니다."
      roles={["PRIVACY"]}
      actions={
        <Link
          href="/ops/privacy-requests"
          className="text-body font-semibold text-primary underline"
        >
          개인정보 요청 큐
        </Link>
      }
    >
      {notice ? (
        <p role="status" className="text-caption text-ink">
          {notice.text}
        </p>
      ) : null}
      <Tabs
        label="권한 종류"
        activeKey={tab}
        onActiveKeyChange={(key) => setTab(key === "archive" ? "archive" : "return")}
        items={[
          {
            key: "return",
            label: "반환권한",
            panel: (
              <ReturnGrantTable
                onTransfer={(grantId) => {
                  setNotice(null);
                  setTarget({ kind: "return", grantId });
                }}
              />
            ),
          },
          {
            key: "archive",
            label: "보관권한",
            panel: (
              <ArchiveGrantTable
                onTransfer={(grantId) => {
                  setNotice(null);
                  setTarget({ kind: "archive", grantId });
                }}
              />
            ),
          },
        ]}
      />
      <TransferDialog
        kind={target?.kind ?? tab}
        grantId={target?.grantId ?? null}
        onDone={(text) => setNotice({ tone: "ok", text })}
        onClose={() => setTarget(null)}
      />
    </OpsScreen>
  );
}
