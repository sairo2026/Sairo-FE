import { fieldErrorSummary } from "@/shared/lib/api-messages";
import { describeOpsError } from "../model/ops-errors";

export function describeContentError(error: unknown, fallback: string): string {
  return fieldErrorSummary(error) ?? describeOpsError(error, fallback);
}
