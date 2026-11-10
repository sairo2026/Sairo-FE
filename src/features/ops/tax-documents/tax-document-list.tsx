"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { DateTimeField } from "@/shared/components/ui/date-time-field";
import { SelectField } from "@/shared/components/ui/select-field";
import { TextField } from "@/shared/components/ui/text-field";
import { formatKrw } from "@/shared/lib/format";
import { BillingNav } from "../billing/billing-nav";
import { toOptionalNumber } from "../billing/billing-model";
import { OpsFilterBar } from "../components/common/ops-filter-bar";
import { OpsScreen } from "../components/common/ops-screen";
import { OpsStatusBadge } from "../components/common/ops-status-badge";
import { OpsTable, useOpsPaging } from "../components/common/ops-table";
import { useTaxDocumentList } from "./tax-api";
import { TAX_DRAFT_NOTICE, TAX_KIND_LABELS, TAX_STATUS } from "./tax-model";
import { TaxWorkDialog } from "./tax-work-dialog";
import type { TaxRow, TaxWorkMode } from "./tax-work-dialog";

type Filter = { status: string; officeId: string; dueFrom: string; dueTo: string };
const EMPTY: Filter = { status: "", officeId: "", dueFrom: "", dueTo: "" };

const STATUS_OPTIONS = [
  { value: "", label: "전체" },
  ...Object.entries(TAX_STATUS).map(([value, entry]) => ({ value, label: entry.label })),
];

type Work = { invoiceId: number; mode: TaxWorkMode; originalId: number | null };

export function TaxDocumentListScreen() {
  const [draft, setDraft] = useState<Filter>(EMPTY);
  const [applied, setApplied] = useState<Filter>(EMPTY);
  const [invoiceInput, setInvoiceInput] = useState("");
  const [invoiceError, setInvoiceError] = useState<string | undefined>();
  const [work, setWork] = useState<Work | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const paging = useOpsPaging();
  const query = useTaxDocumentList({ ...applied, page: paging.page, size: paging.size });
  const rows: TaxRow[] = query.data?.items ?? [];

  function openByInvoice() {
    const id = toOptionalNumber(invoiceInput.trim());
    if (id === null || id === 0) {
      setInvoiceError("청구서 번호를 숫자로 입력해 주세요.");
      return;
    }
    setInvoiceError(undefined);
    setWork({ invoiceId: id, mode: "record", originalId: null });
  }

  return (
    <OpsScreen
      title="증빙 발급 기록"
      description="국세청 서비스에서 수동으로 발급한 세금계산서와 현금영수증의 결과를 기록합니다."
      roles={["BILLING"]}
    >
      <BillingNav current="tax-documents" />
      <p role="note" className="text-caption text-ink-2">
        {TAX_DRAFT_NOTICE}
      </p>
      <OpsFilterBar
        label="증빙 발급 조회"
        onApply={() => {
          setApplied(draft);
          paging.resetPage();
        }}
        onReset={() => {
          setDraft(EMPTY);
          setApplied(EMPTY);
          paging.resetPage();
        }}
      >
        <SelectField
          label="발급 상태"
          value={draft.status}
          options={STATUS_OPTIONS}
          onValueChange={(status) => setDraft({ ...draft, status })}
        />
        <TextField
          label="사무소 ID"
          kind="number"
          value={draft.officeId}
          onValueChange={(officeId) => setDraft({ ...draft, officeId })}
        />
        <DateTimeField
          label="발급 기한 시작"
          kind="date"
          value={draft.dueFrom}
          onValueChange={(dueFrom) => setDraft({ ...draft, dueFrom })}
        />
        <DateTimeField
          label="발급 기한 끝"
          kind="date"
          value={draft.dueTo}
          onValueChange={(dueTo) => setDraft({ ...draft, dueTo })}
        />
      </OpsFilterBar>
      <div className="flex flex-wrap items-end gap-3 rounded-card-flat border border-line bg-white p-4">
        <TextField
          label="청구서 번호로 기록"
          kind="number"
          value={invoiceInput}
          onValueChange={setInvoiceInput}
          error={invoiceError}
          hint="목록에 없는 청구서에도 발급 결과를 기록할 수 있습니다."
        />
        <Button variant="outlined" onClick={openByInvoice}>
          기록 열기
        </Button>
      </div>
      {notice ? (
        <p role="status" className="text-caption text-ink">
          {notice}
        </p>
      ) : null}
      <OpsTable
        caption="청구서별 증빙 발급 상태"
        query={query}
        paging={paging}
        getRowId={(row) => String(row.documentId)}
        emptyMessage="조건에 맞는 증빙 발급 기록이 없습니다."
        columns={[
          {
            key: "invoice",
            header: "청구서",
            render: (row) => (
              <Link
                href={`/ops/billing/invoices/${row.invoiceId}`}
                className="text-primary underline"
              >
                {row.invoiceId}
              </Link>
            ),
          },
          { key: "office", header: "사무소", render: (row) => row.officeName },
          {
            key: "kind",
            header: "종류",
            render: (row) => TAX_KIND_LABELS[row.documentKind] ?? row.documentKind,
          },
          {
            key: "electronic",
            header: "전자",
            render: (row) => (row.isElectronic ? "전자" : "종이"),
          },
          {
            key: "status",
            header: "상태",
            render: (row) => <OpsStatusBadge status={row.status} map={TAX_STATUS} />,
          },
          { key: "approval", header: "승인번호", render: (row) => row.approvalNumber ?? "-" },
          { key: "issued", header: "발급일", render: (row) => row.issuedOn ?? "-" },
          { key: "supply", header: "공급가액", render: (row) => amount(row.supplyAmount) },
          { key: "vat", header: "세액", render: (row) => amount(row.vatAmount) },
          { key: "due", header: "발급 기한 힌트", render: (row) => row.dueHint ?? "-" },
          {
            key: "recipient",
            header: "수신 정보",
            render: (row) => (row.recipientRegistered ? "등록됨" : "등록 안 됨"),
          },
          {
            key: "action",
            header: "처리",
            render: (row) => (
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outlined"
                  aria-label={`기록 ${row.documentId} 열기`}
                  onClick={() =>
                    setWork({ invoiceId: row.invoiceId, mode: "record", originalId: null })
                  }
                >
                  기록
                </Button>
                {row.status === "ISSUED" ? (
                  <>
                    <Button
                      size="sm"
                      variant="ghost"
                      aria-label={`기록 ${row.documentId} 수정 발급`}
                      onClick={() =>
                        setWork({
                          invoiceId: row.invoiceId,
                          mode: "amend",
                          originalId: row.documentId,
                        })
                      }
                    >
                      수정 발급
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      aria-label={`기록 ${row.documentId} 취소 처리`}
                      onClick={() =>
                        setWork({
                          invoiceId: row.invoiceId,
                          mode: "cancel",
                          originalId: row.documentId,
                        })
                      }
                    >
                      취소 처리
                    </Button>
                  </>
                ) : null}
              </div>
            ),
          },
        ]}
      />
      {work ? (
        <TaxWorkDialog
          key={`${work.invoiceId}-${work.mode}-${work.originalId}`}
          invoiceId={work.invoiceId}
          history={rows.filter((row) => row.invoiceId === work.invoiceId)}
          initialMode={work.mode}
          initialOriginalId={work.originalId}
          onClose={() => setWork(null)}
          onDone={(text) => {
            setNotice(text);
            setWork(null);
          }}
        />
      ) : null}
    </OpsScreen>
  );
}

function amount(value: number | null): string {
  return value === null ? "-" : formatKrw(value);
}
