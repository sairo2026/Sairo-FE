"use client";

import { useState } from "react";
import { QueryGate } from "@/shared/components/feedback/query-gate";
import { OpsScreen } from "../components/common/ops-screen";
import { SuccessNotice } from "../content-common/notice-banner";
import { CalendarSection } from "./calendar-section";
import { useCompanyInfo } from "./company-api";
import { CompanyFormCard } from "./company-form";
import { EMPTY_COMPANY_FORM, formFromInfo, latestInfo } from "./company-model";
import { LaunchStatusCard } from "./launch-status";
import { PriceAndRefundSection, SubprocessorSection } from "./related-sections";

export function CompanyInfoScreen() {
  const query = useCompanyInfo();
  const [notice, setNotice] = useState<string | null>(null);

  return (
    <OpsScreen
      title="회사 정보"
      description="고객에게 게시하는 회사, 지원, 개인정보 창구 정보와 영업일 달력을 관리합니다."
      roles={["OPS"]}
    >
      <SuccessNotice message={notice} />
      <QueryGate query={query} loadingLabel="회사 정보를 불러오는 중입니다">
        {(data) => {
          const latest = latestInfo(data.items);
          return (
            <>
              <LaunchStatusCard
                launchReady={data.launchReady}
                missingItems={data.missingItems}
                latest={latest}
                onNotice={setNotice}
              />
              <CompanyFormCard
                key={latest?.infoId ?? "empty"}
                initial={latest ? formFromInfo(latest) : EMPTY_COMPANY_FORM}
                onSaved={setNotice}
              />
            </>
          );
        }}
      </QueryGate>
      <SubprocessorSection />
      <PriceAndRefundSection />
      <CalendarSection onNotice={setNotice} />
    </OpsScreen>
  );
}
