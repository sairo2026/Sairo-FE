"use client";

import { useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { formatSeoulDateTime } from "@/shared/lib/format";
import { OpsScreen } from "../components/common/ops-screen";
import { OpsStatusBadge } from "../components/common/ops-status-badge";
import { OpsTable, useOpsPaging } from "../components/common/ops-table";
import { DraftNotice, FormMessage } from "../system-common/system-fields";
import { describeSystemError } from "../system-common/system-form";
import { useRunTermsHashCheck, useTermsHashChecks } from "./terms-hash-api";
import { HASH_RESULT, MISMATCH_WARNING, TERMS_STATUS, hasMismatch } from "./terms-hash-model";
import type { TermsHashRun } from "./terms-hash-model";

function RunSummary({ run }: { run: TermsHashRun }) {
  return (
    <Card title="즉시 점검 결과" tone="flat">
      <p className="text-body text-ink">
        {formatSeoulDateTime(run.checkedAt)}에 점검했습니다. 불일치 {run.mismatchCount}건, 오류{" "}
        {run.errorCount}건입니다.
      </p>
      <table className="mt-3 w-full text-left">
        <caption className="sr-only">즉시 점검 항목별 결과</caption>
        <thead>
          <tr className="text-caption text-ink-2">
            <th scope="col" className="py-2">
              약관 항목
            </th>
            <th scope="col" className="py-2">
              버전
            </th>
            <th scope="col" className="py-2">
              결과
            </th>
            <th scope="col" className="py-2">
              등록한 해시 앞부분
            </th>
            <th scope="col" className="py-2">
              현재 원문 해시 앞부분
            </th>
          </tr>
        </thead>
        <tbody>
          {run.items.map((item) => (
            <tr key={`${item.termsCode}-${item.version}`} className="border-t border-line">
              <td className="py-2">{item.termsCode}</td>
              <td className="py-2">{item.version}</td>
              <td className="py-2">
                <OpsStatusBadge status={item.result} map={HASH_RESULT} />
              </td>
              <td className="py-2 font-mono text-caption">{item.expectedHashPrefix}</td>
              <td className="py-2 font-mono text-caption">{item.actualHashPrefix ?? "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

function TermsBody() {
  const paging = useOpsPaging(100);
  const query = useTermsHashChecks();
  const run = useRunTermsHashCheck();
  const [lastRun, setLastRun] = useState<TermsHashRun | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runNow() {
    setError(null);
    try {
      setLastRun(await run.mutateAsync());
    } catch (caught) {
      setError(describeSystemError(caught, "해시 점검을 실행하지 못했습니다."));
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="submit" isLoading={run.isPending} onClick={() => void runNow()}>
          즉시 점검
        </Button>
        <p className="text-caption text-ink-2">
          시행 중이거나 시행 예정인 모든 약관 버전의 게시 원문을 등록 시점의 해시와 비교합니다.
        </p>
      </div>
      {error ? <FormMessage tone="error">{error}</FormMessage> : null}
      {hasMismatch(query.data?.items ?? [], lastRun) ? (
        <p
          role="alert"
          className="rounded-card-flat border border-danger bg-white px-4 py-3 text-body font-semibold text-danger"
        >
          {MISMATCH_WARNING}
        </p>
      ) : null}
      {lastRun ? <RunSummary run={lastRun} /> : null}
      <OpsTable
        caption="약관 원문 해시 점검 결과"
        query={query}
        paging={paging}
        getRowId={(row) => `${row.termsCode}-${row.version}`}
        emptyMessage="점검할 약관이 없습니다."
        columns={[
          { key: "code", header: "약관 항목", render: (row) => row.termsCode },
          { key: "version", header: "시행 버전", render: (row) => row.version },
          {
            key: "status",
            header: "구분",
            render: (row) => <OpsStatusBadge status={row.status} map={TERMS_STATUS} />,
          },
          {
            key: "effective",
            header: "시행 시각",
            render: (row) => formatSeoulDateTime(row.effectiveAt),
          },
          {
            key: "checked",
            header: "마지막 점검",
            render: (row) =>
              row.lastCheckedAt ? formatSeoulDateTime(row.lastCheckedAt) : "점검 전",
          },
          {
            key: "result",
            header: "결과",
            render: (row) =>
              row.lastResult ? <OpsStatusBadge status={row.lastResult} map={HASH_RESULT} /> : "-",
          },
        ]}
      />
    </>
  );
}

export function TermsHashScreen() {
  return (
    <OpsScreen
      title="약관 원문 해시 점검"
      description="게시된 약관 원문이 등록 시점과 같은지 확인합니다."
      roles={["OPS"]}
    >
      <DraftNotice />
      <TermsBody />
    </OpsScreen>
  );
}
