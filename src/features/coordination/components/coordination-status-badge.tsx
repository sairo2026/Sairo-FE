import { coordinationStatusBadgeClassNames, coordinationStatusLabels } from "../model/coordination";
import type { CoordinationStatus } from "../schemas/coordination.schema";

export function CoordinationStatusBadge({ status }: { status: CoordinationStatus }) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold ${coordinationStatusBadgeClassNames[status]}`}
    >
      {coordinationStatusLabels[status]}
    </span>
  );
}
