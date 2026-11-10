"use client";

import { useState } from "react";
import type { TermsAgreementHistoryResponse } from "@/lib/api/contracts/auth.schema";
import { QueryGate } from "@/shared/components/feedback/query-gate";
import { StatusBadge, TextLink } from "@/shared/components/feedback/page-parts";
import { Card } from "@/shared/components/ui/card";
import { DataTable } from "@/shared/components/ui/data-table";
import type { PageSize } from "@/shared/components/ui/data-table";
import { PageHeader } from "@/shared/components/ui/page-header";
import { ConsentTable } from "@/shared/consent/consent-table";
import { CONSENT_HISTORY_COPY } from "@/shared/consent/consent-copy";
import { useAccountMe } from "@/shared/consent/use-account-me";
import { formatSeoulDateTime } from "@/shared/lib/format";
import { useOfficeAccess } from "@/shared/session/office-access-context";
import { useTermsHistory } from "../hooks/settings-queries";
import { SETTINGS_COPY as COPY, describeSettingsError } from "../model/copy";
import { MarketingConsent } from "./marketing-consent";

type Row = TermsAgreementHistoryResponse["items"][number];

function History() {
  const [page, setPage] = useState(1);
  const [size, setSize] = useState<PageSize>(25);
  const query = useTermsHistory({ page: page - 1, size });
  return (
    <Card title={COPY.consentsHistory}>
      <DataTable<Row>
        caption={COPY.consentsHistory}
        rows={query.data?.items ?? []}
        getRowId={(row) => String(row.agreementId)}
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
            ? describeSettingsError(query.error, "동의 이력을 불러오지 못했습니다.")
            : undefined
        }
        onRetry={() => void query.refetch()}
        emptyMessage={COPY.consentsHistoryEmpty}
        columns={[
          { key: "name", header: CONSENT_HISTORY_COPY.columns[0], render: (row) => row.termsName },
          { key: "version", header: CONSENT_HISTORY_COPY.columns[1], render: (row) => row.version },
          {
            key: "status",
            header: CONSENT_HISTORY_COPY.columns[2],
            render: (row) => (
              <StatusBadge
                tone={row.agreed ? "green" : "gray"}
                label={
                  row.agreed
                    ? CONSENT_HISTORY_COPY.statuses.agreed
                    : CONSENT_HISTORY_COPY.statuses.withdrawn
                }
              />
            ),
          },
          {
            key: "time",
            header: CONSENT_HISTORY_COPY.columns[3],
            render: (row) => formatSeoulDateTime(row.recordedAt),
          },
          {
            key: "path",
            header: CONSENT_HISTORY_COPY.columns[4],
            render: (row) => COPY.pathLabel[row.consentPath] ?? COPY.pathLabel.UNKNOWN,
          },
        ]}
      />
    </Card>
  );
}

export function ConsentsScreen() {
  const query = useAccountMe();
  const { isReadOnly } = useOfficeAccess();
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-10">
      <PageHeader
        title={COPY.consentsTitle}
        description={COPY.consentsPageDescription}
        actions={<TextLink href="/account">내 계정</TextLink>}
      />
      <QueryGate query={query} loadingLabel="동의 내역을 불러오는 중입니다.">
        {(me) => (
          <>
            <Card title={COPY.consentsCurrent}>
              <div className="flex flex-col gap-5">
                <ConsentTable agreements={me.termsAgreements} isReadOnly={isReadOnly} />
                <MarketingConsent me={me} isReadOnly={isReadOnly} />
              </div>
            </Card>
            <History />
          </>
        )}
      </QueryGate>
    </main>
  );
}
