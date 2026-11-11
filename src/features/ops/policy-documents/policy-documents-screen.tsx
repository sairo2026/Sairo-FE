"use client";

import { useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { Checkbox, SelectField } from "@/shared/components/ui/select-field";
import { TextAreaField } from "@/shared/components/ui/textarea-field";
import { TextField } from "@/shared/components/ui/text-field";
import { formatSeoulDateTime } from "@/shared/lib/format";
import { OpsDetailList } from "../components/common/ops-detail-list";
import { OpsScreen } from "../components/common/ops-screen";
import { OpsStatusBadge } from "../components/common/ops-status-badge";
import { OpsTable, useOpsPaging } from "../components/common/ops-table";
import { ActionDialog } from "../content-common/action-dialog";
import { describeContentError } from "../content-common/content-error";
import { FailureNotice, SuccessNotice } from "../content-common/notice-banner";
import { SeoulDateTimeInput } from "../content-common/seoul-date-time-input";
import { usePolicyActions, usePolicyList } from "./policy-api";
import {
  DOC_TYPE_LABELS,
  DOC_TYPE_OPTIONS,
  EMPTY_POLICY_FORM,
  NO_OVERWRITE_TEXT,
  POLICY_STATUS,
  PRICING_NOTICE_TEXT,
  SUMMARY_MAX,
  VERSION_MAX,
  describePolicyPublishError,
  toPolicyRequest,
  validatePolicyForm,
} from "./policy-model";
import type { PolicyDocumentItem, PolicyErrors, PolicyForm } from "./policy-model";

function CreateCard({ onCreated }: { onCreated: (message: string) => void }) {
  const { create } = usePolicyActions();
  const [form, setForm] = useState<PolicyForm>(EMPTY_POLICY_FORM);
  const [errors, setErrors] = useState<PolicyErrors>({});
  const [failure, setFailure] = useState<string | null>(null);

  function patch(next: Partial<PolicyForm>) {
    setForm({ ...form, ...next });
  }

  async function submit() {
    setFailure(null);
    const found = validatePolicyForm(form);
    setErrors(found);
    const body = toPolicyRequest(form);
    if (Object.keys(found).length > 0 || body === null) return;
    try {
      const result = await create.mutateAsync(body);
      setForm(EMPTY_POLICY_FORM);
      onCreated(
        `${DOC_TYPE_LABELS[result.docType] ?? result.docType} ${result.version} 초안을 등록했습니다.`,
      );
    } catch (caught) {
      setFailure(describeContentError(caught, "문서를 등록하지 못했습니다."));
    }
  }

  return (
    <Card title="새 버전 등록">
      <div className="flex flex-col gap-4">
        <p role="note" className="text-caption text-ink-2">
          {NO_OVERWRITE_TEXT} 등록한 문서는 초안으로 저장되고 검토 요청 뒤에 게시할 수 있습니다.
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SelectField
            label="문서 종류"
            value={form.docType}
            options={DOC_TYPE_OPTIONS}
            onValueChange={(docType) => patch({ docType })}
          />
          <TextField
            label="버전"
            value={form.version}
            error={errors.version}
            maxLength={VERSION_MAX + 10}
            onValueChange={(version) => patch({ version })}
          />
        </div>
        <TextAreaField
          label="본문"
          rows={8}
          value={form.body}
          error={errors.body}
          onValueChange={(body) => patch({ body })}
        />
        <TextAreaField
          label="변경 요약"
          rows={3}
          value={form.changeSummary}
          error={errors.changeSummary}
          hint={`${form.changeSummary.length}/${SUMMARY_MAX}자`}
          onValueChange={(changeSummary) => patch({ changeSummary })}
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SeoulDateTimeInput
            label="공지일"
            value={form.noticeAt}
            error={errors.noticeAt}
            onChange={(noticeAt) => patch({ noticeAt })}
          />
          <SeoulDateTimeInput
            label="시행일"
            value={form.effectiveAt}
            error={errors.effectiveAt}
            onChange={(effectiveAt) => patch({ effectiveAt })}
          />
        </div>
        <Checkbox
          label="시행 전에 이용자 동의가 필요합니다"
          checked={form.requiresConsent}
          onCheckedChange={(requiresConsent) => patch({ requiresConsent })}
        />
        {form.docType === "PRICING" ? (
          <p role="note" className="text-caption text-ink-2">
            {PRICING_NOTICE_TEXT}
          </p>
        ) : null}
        <FailureNotice message={failure} />
        <div>
          <Button isLoading={create.isPending} onClick={() => void submit()}>
            초안 등록
          </Button>
        </div>
      </div>
    </Card>
  );
}

type Dialog = { kind: "view" | "review" | "publish"; item: PolicyDocumentItem } | null;

function operatorLabel(id: number | null): string {
  return id === null ? "-" : `운영자 ${id}`;
}

export function PolicyDocumentsScreen() {
  const paging = useOpsPaging();
  const query = usePolicyList({ page: paging.page, size: paging.size });
  const actions = usePolicyActions();
  const [dialog, setDialog] = useState<Dialog>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const close = () => setDialog(null);

  return (
    <OpsScreen
      title="정책 문서 관리"
      description="이용약관, 개인정보처리방침, 처리위탁 조건, 보관 조건, 환불 안내, 수탁업무 목록, 요금표의 게시 버전을 관리합니다."
      roles={["OPS"]}
    >
      <SuccessNotice message={notice} />
      <CreateCard onCreated={setNotice} />
      <OpsTable
        caption="정책 문서 목록"
        query={query}
        paging={paging}
        getRowId={(row) => String(row.documentId)}
        emptyMessage="등록된 정책 문서가 없습니다."
        columns={[
          {
            key: "type",
            header: "문서 종류",
            render: (row) => DOC_TYPE_LABELS[row.docType] ?? row.docType,
          },
          { key: "version", header: "버전", render: (row) => row.version },
          {
            key: "status",
            header: "상태",
            render: (row) => <OpsStatusBadge status={row.status} map={POLICY_STATUS} />,
          },
          {
            key: "effective",
            header: "시행일",
            render: (row) => (row.effectiveAt ? formatSeoulDateTime(row.effectiveAt) : "-"),
          },
          {
            key: "consent",
            header: "필요 동의",
            render: (row) => (row.requiresConsent ? "필요" : "불필요"),
          },
          {
            key: "reviewer",
            header: "검토자",
            render: (row) => operatorLabel(row.reviewedByOperatorId),
          },
          {
            key: "publisher",
            header: "게시자",
            render: (row) => operatorLabel(row.publishedByOperatorId),
          },
          {
            key: "actions",
            header: "처리",
            render: (row) => {
              const name = `${DOC_TYPE_LABELS[row.docType] ?? row.docType} ${row.version}`;
              return (
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`${name} 본문 보기`}
                    onClick={() => setDialog({ kind: "view", item: row })}
                  >
                    본문 보기
                  </Button>
                  {row.status === "DRAFT" ? (
                    <Button
                      size="sm"
                      aria-label={`${name} 검토 요청`}
                      onClick={() => setDialog({ kind: "review", item: row })}
                    >
                      검토 요청
                    </Button>
                  ) : null}
                  {row.status === "REVIEW" ? (
                    <Button
                      size="sm"
                      aria-label={`${name} 게시`}
                      onClick={() => setDialog({ kind: "publish", item: row })}
                    >
                      게시
                    </Button>
                  ) : null}
                </div>
              );
            },
          },
        ]}
      />
      {dialog?.kind === "view" ? (
        <ActionDialog
          isOpen
          size="wide"
          title={`${DOC_TYPE_LABELS[dialog.item.docType] ?? dialog.item.docType} ${dialog.item.version}`}
          onClose={close}
        >
          <OpsDetailList
            items={[
              { label: "변경 요약", value: dialog.item.changeSummary },
              {
                label: "공지일",
                value: dialog.item.noticeAt ? formatSeoulDateTime(dialog.item.noticeAt) : null,
              },
              {
                label: "게시 시각",
                value: dialog.item.publishedAt
                  ? formatSeoulDateTime(dialog.item.publishedAt)
                  : null,
              },
              { label: "검토자", value: operatorLabel(dialog.item.reviewedByOperatorId) },
              { label: "게시자", value: operatorLabel(dialog.item.publishedByOperatorId) },
            ]}
          />
          <p className="whitespace-pre-wrap rounded-card-flat border border-line p-4 text-body text-ink">
            {dialog.item.body}
          </p>
        </ActionDialog>
      ) : null}
      {dialog?.kind === "review" ? (
        <ActionDialog
          isOpen
          title="검토 요청"
          confirmLabel="검토 요청"
          onClose={close}
          onConfirm={async () => {
            await actions.submitReview.mutateAsync(dialog.item.documentId);
            setNotice(`${dialog.item.version} 문서를 검토 단계로 올렸습니다. 검토자로 기록됩니다.`);
          }}
        >
          <p>초안을 검토 단계로 올립니다. 올린 운영자가 검토자로 기록됩니다.</p>
        </ActionDialog>
      ) : null}
      {dialog?.kind === "publish" ? (
        <ActionDialog
          isOpen
          title="문서 게시"
          confirmLabel="게시"
          describeError={describePolicyPublishError}
          onClose={close}
          onConfirm={async () => {
            const result = await actions.publish.mutateAsync(dialog.item.documentId);
            setNotice(
              result.status === "SCHEDULED"
                ? `${result.version} 문서를 시행일에 맞춰 예약했습니다.`
                : `${result.version} 문서를 게시했습니다.`,
            );
          }}
        >
          <p>게시한 문서는 덮어쓸 수 없고 게시자로 기록됩니다. 처리 기록은 감사 로그에 남습니다.</p>
          {dialog.item.docType === "PRICING" ? (
            <p role="note" className="text-caption text-ink-2">
              {PRICING_NOTICE_TEXT}
            </p>
          ) : null}
        </ActionDialog>
      ) : null}
    </OpsScreen>
  );
}
