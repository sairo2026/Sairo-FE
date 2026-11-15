import { Badge } from "@/shared/components/ui/badge";
import { cn } from "@/shared/lib/cn";
import { statusLabel, statusTone } from "../model/labels";

const COMPACT = "h-8 min-w-0 px-3 text-caption";

/** 방문 조율 상태 배지. 홈의 방문 조율 현황과 같은 문구·색을 쓰는 단일 출처(labels.ts)를 따른다. */
export function CoordinationStatusBadge({
  status,
  compact = false,
  className,
}: {
  status: string;
  compact?: boolean;
  className?: string;
}) {
  return (
    <Badge tone={statusTone(status)} className={cn(compact && COMPACT, className)}>
      {statusLabel(status)}
    </Badge>
  );
}
