"use client";

import { useState } from "react";
import { Tabs } from "@/shared/components/ui/tabs";
import type { TabItem } from "@/shared/components/ui/tabs";
import { OpsScreen } from "../components/common/ops-screen";
import { useHasOpsRole } from "../model/ops-session";
import { IncidentPanel } from "./incident-panel";
import { PrivacyIncidentPanel } from "./privacy-incident-panel";

function IncidentTabs() {
  const canIncident = useHasOpsRole(["OPS"]);
  const canPrivacy = useHasOpsRole(["PRIVACY"]);
  const items: TabItem[] = [];
  if (canIncident) items.push({ key: "incidents", label: "장애", panel: <IncidentPanel /> });
  if (canPrivacy) {
    items.push({ key: "privacy", label: "개인정보 사고", panel: <PrivacyIncidentPanel /> });
  }
  const [active, setActive] = useState(items[0]?.key ?? "incidents");
  return (
    <Tabs label="장애·사고 구분" items={items} activeKey={active} onActiveKeyChange={setActive} />
  );
}

export function IncidentsScreen() {
  return (
    <OpsScreen
      title="장애·사고"
      description="서비스 장애의 단계별 대응과 개인정보 사고의 신고·통지 요건을 기록합니다."
      roles={["OPS", "PRIVACY"]}
    >
      <IncidentTabs />
    </OpsScreen>
  );
}
