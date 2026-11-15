import { PublicPricingResponseSchema } from "@/lib/api/contracts/billing.schema";
import type { PublicPricingResponse } from "@/lib/api/contracts/billing.schema";
import { PublicCompanyInfoResponseSchema } from "@/lib/api/contracts/public-site.schema";
import type { PublicCompanyInfoResponse } from "@/lib/api/contracts/public-site.schema";
import type { ZodType } from "zod";

const API_TARGET = process.env.API_PROXY_TARGET ?? "http://localhost:8080";
const REVALIDATE_SECONDS = 60;
const TIMEOUT_MS = 3_000;

async function loadPublicJson<T>(path: string, schema: ZodType<T>): Promise<T | undefined> {
  try {
    const response = await fetch(`${API_TARGET}${path}`, {
      headers: { Accept: "application/json" },
      next: { revalidate: REVALIDATE_SECONDS },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) return undefined;
    const parsed = schema.safeParse(await response.json());
    return parsed.success ? parsed.data : undefined;
  } catch {
    return undefined;
  }
}

export function loadPublicCompanyInfo(): Promise<PublicCompanyInfoResponse | undefined> {
  return loadPublicJson("/api/public/company-info", PublicCompanyInfoResponseSchema);
}

export function loadPublicPricing(): Promise<PublicPricingResponse | undefined> {
  return loadPublicJson("/api/public/pricing", PublicPricingResponseSchema);
}
