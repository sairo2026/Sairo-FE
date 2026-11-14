import { Badge } from "@/shared/components/ui/badge";
import type { BadgeTone } from "@/shared/components/ui/badge";

export type OpsStatusMap = Record<string, { label: string; tone: BadgeTone }>;

/** 상태 코드를 화면값 한글과 색 의미로 보인다. 모르는 코드는 코드 그대로 회색으로 보인다. */
export function OpsStatusBadge({ status, map }: { status: string; map: OpsStatusMap }) {
  const entry = map[status];
  return <Badge tone={entry?.tone ?? "gray"}>{entry?.label ?? status}</Badge>;
}
