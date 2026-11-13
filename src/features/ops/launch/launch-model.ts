import type { Integration } from "../integrations/integrations-model";

const CONSENT_READY = ["NOT_REQUIRED", "GRANTED"];

export function missingLaunchItems(
  row: Integration,
  companyMissingItems: readonly string[],
): string[] {
  const missing: string[] = [];
  if (row.contractStatus !== "SIGNED") missing.push("CONTRACT_SIGNED");
  if (!CONSENT_READY.includes(row.consentStatus)) missing.push("CONSENT");
  if (row.contractNoticeReviewedAt === null) missing.push("CONTRACT_NOTICE_REVIEW");
  for (const item of companyMissingItems) missing.push(`COMPANY_INFO_${item}`);
  return missing;
}

export type LaunchSummary = { total: number; enabled: number; blocked: number };

export function summarizeLaunch(
  rows: readonly Integration[],
  companyMissingItems: readonly string[],
): LaunchSummary {
  return {
    total: rows.length,
    enabled: rows.filter((row) => row.enabled).length,
    blocked: rows.filter(
      (row) => !row.enabled && missingLaunchItems(row, companyMissingItems).length > 0,
    ).length,
  };
}
