import type { ImportPreview } from "../api/wire";

export function previewNewCount(summary: ImportPreview["summary"]): number {
  if (summary.newCount !== undefined) return summary.newCount;
  return Math.max(0, summary.rowCount - summary.errorRowCount - summary.duplicateCount);
}
