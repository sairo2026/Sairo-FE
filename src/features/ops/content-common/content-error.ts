import { ApiError } from "@/shared/api/client";
import { describeOpsError } from "../model/ops-errors";

export function describeContentError(error: unknown, fallback: string): string {
  if (error instanceof ApiError && error.status === 400 && error.fieldErrors?.length) {
    return error.fieldErrors.map((item) => item.message).join(" ");
  }
  return describeOpsError(error, fallback);
}
