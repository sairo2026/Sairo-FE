"use client";

import Link from "next/link";
import { useState } from "react";
import type { SupportInquiryListResponse } from "@/lib/api/contracts/support.schema";
import { QueryGate } from "@/shared/components/feedback/query-gate";
import { StatusBadge, TextLink } from "@/shared/components/feedback/page-parts";
import { Card } from "@/shared/components/ui/card";
import { DataTable } from "@/shared/components/ui/data-table";
import type { PageSize } from "@/shared/components/ui/data-table";
import { PageHeader } from "@/shared/components/ui/page-header";
import { ConsentTable } from "@/shared/consent/consent-table";
import { LegalMarkdown } from "@/shared/legal/legal-markdown";
import { parseMarkdown, pruneEmptyBlocks } from "@/shared/legal/markdown";
import { SupportInquiryNotice } from "@/shared/legal/data-rights-notices";
import { SUPPORT_INQUIRY_COPY } from "@/shared/legal/data-rights-copy";
import { formatSeoulDateTime } from "@/shared/lib/format";
import { useOfficeAccess } from "@/shared/session/office-access-context";
import { useAccountAgreements, useMyInquiries, usePolicyDocuments } from "../hooks/support-queries";
import { INQUIRY_STATUS, POLICY_LINKS, categoryLabel } from "../model/labels";
import { PrivacyHistory } from "./privacy-requests-screen";
import { SUPPORT_COPY as COPY, describeSupportError } from "../model/messages";

type Row = SupportInquiryListResponse["items"][number];

function Policies() {
  return (
    <Card title={COPY.policiesTitle}>
      <ul className="flex flex-wrap gap-x-6 gap-y-2">
        {POLICY_LINKS.map((item) => (
          <li key={item.href}>
            <Link href={item.href} className="font-semibold text-primary hover:underline">
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function SubprocessorBody({ body }: { body: string }) {
  return <LegalMarkdown blocks={pruneEmptyBlocks(parseMarkdown(body))} isCompact />;
}

function Subprocessors({ isOwner }: { isOwner: boolean }) {
  const query = usePolicyDocuments();
  return (
    <Card title={COPY.subprocessorsTitle}>
      <div className="flex flex-col gap-3">
        <QueryGate query={query} loadingLabel="위탁 업체 목록을 불러오는 중입니다.">
          {(data) => {
            const document = data.items.find((item) => item.docType === "SUBPROCESSORS");
            return document ? (
              <>
                <p className="text-caption text-ink-2">
                  시행 버전 {document.version} · {formatSeoulDateTime(document.effectiveAt)}
                </p>
                <SubprocessorBody body={document.body} />
              </>
            ) : (
              <p className="text-caption text-ink-2">{COPY.subprocessorsEmpty}</p>
            );
          }}
        </QueryGate>
        <p className="text-caption text-ink-2">{SUPPORT_INQUIRY_COPY.outsourcingChange}</p>
        {isOwner ? (
          <p className="text-caption text-ink">{SUPPORT_INQUIRY_COPY.outsourcingOwner}</p>
        ) : null}
      </div>
    </Card>
  );
}

function Consents() {
  const query = useAccountAgreements();
  const { isReadOnly } = useOfficeAccess();
  return (
    <Card title={COPY.consentsTitle}>
      <div className="flex flex-col gap-3">
        <p className="text-caption text-ink-2">{COPY.consentsIntro}</p>
        <QueryGate query={query} loadingLabel="동의 내역을 불러오는 중입니다.">
          {(me) => <ConsentTable agreements={me.termsAgreements} isReadOnly={isReadOnly} />}
        </QueryGate>
        <TextLink href="/account/consents">{COPY.consentsAll}</TextLink>
      </div>
    </Card>
  );
}

function Inquiries() {
  const [page, setPage] = useState(1);
  const [size, setSize] = useState<PageSize>(25);
  const query = useMyInquiries({ page: page - 1, size });
  return (
    <Card title={COPY.inquiriesTitle}>
      <DataTable<Row>
        caption={COPY.inquiriesTitle}
        rows={query.data?.items ?? []}
        getRowId={(row) => String(row.inquiryId)}
        totalCount={query.data?.totalElements ?? 0}
        page={page}
        pageSize={size}
        onPageChange={setPage}
        onPageSizeChange={(next) => {
          setSize(next);
          setPage(1);
        }}
        isLoading={query.isPending}
        errorMessage={
          query.isError
            ? describeSupportError(query.error, "문의 이력을 불러오지 못했습니다.")
            : undefined
        }
        onRetry={() => void query.refetch()}
        emptyMessage={COPY.inquiriesEmpty}
        columns={[
          {
            key: "category",
            header: "유형",
            render: (row) => (
              <Link
                href={`/support/${row.inquiryId}`}
                className="font-semibold text-primary hover:underline"
              >
                {categoryLabel(row.category)} 문의
              </Link>
            ),
          },
          {
            key: "status",
            header: "상태",
            render: (row) => (
              <StatusBadge
                tone={INQUIRY_STATUS[row.status]?.tone ?? "gray"}
                label={INQUIRY_STATUS[row.status]?.label ?? row.status}
              />
            ),
          },
          { key: "created", header: "접수", render: (row) => formatSeoulDateTime(row.createdAt) },
          {
            key: "answered",
            header: "최근 답변",
            render: (row) => (row.answeredAt ? formatSeoulDateTime(row.answeredAt) : "-"),
          },
        ]}
      />
    </Card>
  );
}

export function SupportHubScreen() {
  const { role } = useOfficeAccess();
  const isOwner = role === "OWNER";
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-10">
      <PageHeader
        title={COPY.hubTitle}
        description={COPY.hubDescription}
        actions={<TextLink href="/support/new">{COPY.newInquiry}</TextLink>}
      />
      <SupportInquiryNotice isOwner={isOwner} />
      <Policies />
      <Consents />
      <Subprocessors isOwner={isOwner} />
      <Inquiries />
      <PrivacyHistory isCompact />
      <TextLink href="/privacy-requests">{COPY.privacyLink}</TextLink>
      <Card title={COPY.enterpriseTitle}>
        <div className="flex flex-col gap-2">
          <p className="text-caption text-ink-2">{COPY.enterpriseDescription}</p>
          <TextLink href="/support/enterprise">{COPY.enterpriseLink}</TextLink>
        </div>
      </Card>
      <Card title={COPY.withdrawalTitle}>
        <div className="flex flex-col gap-2">
          <p className="text-caption text-ink-2">{COPY.withdrawalDescription}</p>
          <TextLink href="/account/withdrawal">{COPY.withdrawalLink}</TextLink>
        </div>
      </Card>
    </main>
  );
}
