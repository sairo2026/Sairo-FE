"use client";

import { useState } from "react";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { formatSeoulDateTime } from "@/shared/lib/format";
import { OpsDetailList } from "../components/common/ops-detail-list";
import { ActionDialog } from "../content-common/action-dialog";
import { useCompanyActions } from "./company-api";
import { MISSING_ITEM_LABELS } from "./company-model";
import type { CompanyInfoItem } from "./company-model";

export function LaunchStatusCard({
  launchReady,
  missingItems,
  latest,
  onNotice,
}: {
  launchReady: boolean;
  missingItems: string[];
  latest: CompanyInfoItem | null;
  onNotice: (message: string) => void;
}) {
  const { inquiryTest } = useCompanyActions();
  const [result, setResult] = useState<"SUCCESS" | "FAILED" | null>(null);

  return (
    <Card title="출시 준비 상태">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Badge tone={launchReady ? "green" : "red"}>
            {launchReady ? "출시 준비 완료" : "출시 활성화 차단"}
          </Badge>
        </div>
        {missingItems.length > 0 ? (
          <div>
            <p className="text-caption font-semibold text-ink-2">빠진 항목</p>
            <ul aria-label="빠진 항목" className="list-disc pl-5 text-body text-ink">
              {missingItems.map((item) => (
                <li key={item}>{MISSING_ITEM_LABELS[item] ?? item}</li>
              ))}
            </ul>
          </div>
        ) : null}
        <p role="note" className="text-caption text-ink-2">
          필수 정보 게시와 실제 문의 수신 시험이 끝나기 전에는 운영 환경 연동 활성화가 차단됩니다.
        </p>
        {latest ? (
          <OpsDetailList
            items={[
              { label: "가장 최근 게시 버전", value: `${latest.versionNo}판` },
              {
                label: "게시 시각",
                value: formatSeoulDateTime(latest.publishedAt),
              },
              {
                label: "수신 시험 성공 시각",
                value: latest.inquiryDeliveryTestedAt
                  ? formatSeoulDateTime(latest.inquiryDeliveryTestedAt)
                  : null,
              },
              {
                label: "검토자",
                value:
                  latest.reviewedByOperatorId === null
                    ? null
                    : `운영자 ${latest.reviewedByOperatorId}`,
              },
            ]}
          />
        ) : (
          <p className="text-body text-ink-2">
            게시된 회사 정보가 없습니다. 아래에서 먼저 게시해 주세요.
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <Button disabled={latest === null} onClick={() => setResult("SUCCESS")}>
            수신 시험 성공 기록
          </Button>
          <Button variant="cancel" disabled={latest === null} onClick={() => setResult("FAILED")}>
            수신 시험 실패 기록
          </Button>
        </div>
      </div>
      {result && latest ? (
        <ActionDialog
          isOpen
          title={result === "SUCCESS" ? "수신 시험 성공 기록" : "수신 시험 실패 기록"}
          confirmLabel="기록"
          onClose={() => setResult(null)}
          onConfirm={async () => {
            await inquiryTest.mutateAsync({ infoId: latest.infoId, result });
            onNotice(
              result === "SUCCESS"
                ? "실제 문의 수신 시험 성공을 기록했습니다."
                : "실제 문의 수신 시험 실패를 기록했습니다. 수신 경로를 고친 뒤 다시 시험해 주세요.",
            );
          }}
        >
          <p>
            {latest.supportEmail} 로 실제 문의를 보내 수신을 확인한 결과를 기록합니다. 기록한
            운영자가 검토자로 남고 처리 기록은 감사 로그에 남습니다.
          </p>
        </ActionDialog>
      ) : null}
    </Card>
  );
}
