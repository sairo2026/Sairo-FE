import { z } from "zod";
import {
  ArchiveGrantStatusResponseSchema,
  BillingInvoiceDetailResponseSchema,
  PublicPricingResponseSchema,
  RefundRequestStatusResponseSchema,
  SubscriptionCurrentResponseSchema,
  ReturnGrantExportResponseSchema,
  ReturnGrantStatusResponseSchema,
  TaxRecipientResponseSchema,
} from "@/lib/api/contracts/billing.schema";

export const InvoiceDetailWireSchema = BillingInvoiceDetailResponseSchema.extend({
  supplier: z
    .object({
      businessName: z.string().nullable().optional(),
      representativeName: z.string().nullable().optional(),
      businessNumber: z.string().nullable().optional(),
      address: z.string().nullable().optional(),
      infoVersion: z.number().nullable().optional(),
    })
    .nullable()
    .optional(),
  supplyAmount: z.number().nullable().optional(),
  vatAmount: z.number().nullable().optional(),
  vatRateBp: z.number().nullable().optional(),
});
export type InvoiceDetail = z.infer<typeof InvoiceDetailWireSchema>;

export const RefundStatusWireSchema = RefundRequestStatusResponseSchema.extend({
  createdAt: z.string().nullable().optional(),
  calculation: z
    .object({
      originalApprovedAmount: z.number(),
      totalPeriodSeconds: z.number().nullable().optional(),
      remainingPeriodSeconds: z.number().nullable().optional(),
      couponExcludedAmount: z.number(),
      priorCompensationAmount: z.number(),
      effectiveEndAt: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
});
export type RefundStatus = z.infer<typeof RefundStatusWireSchema>;

export const PublicPricingWireSchema = PublicPricingResponseSchema.extend({
  generalTrial: z
    .object({
      freeEndMode: z.string(),
      durationDays: z.number().nullable().optional(),
      fixedFreeEndsAt: z.string().nullable().optional(),
      applicantWindowEndsAt: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
  refundPolicyVersion: z.string().nullable().optional(),
});
export type PublicPricing = z.infer<typeof PublicPricingWireSchema>;

export const ReturnGrantStatusWireSchema = ReturnGrantStatusResponseSchema.extend({
  officeId: z.number().nullable().optional(),
});
export const ArchiveGrantStatusWireSchema = ArchiveGrantStatusResponseSchema.extend({
  officeId: z.number().nullable().optional(),
});
export const ExportWireSchema = ReturnGrantExportResponseSchema.extend({
  fileExpiresAt: z.string().nullable().optional(),
});
export type ExportResult = z.infer<typeof ExportWireSchema>;

export const TaxRecipientWireSchema = TaxRecipientResponseSchema.extend({
  businessNumber: z.string().nullable().optional(),
  companyName: z.string().nullable().optional(),
  representativeName: z.string().nullable().optional(),
  taxType: z.string().nullable().optional(),
});
export type TaxRecipient = z.infer<typeof TaxRecipientWireSchema>;

export const SubscriptionWireSchema = SubscriptionCurrentResponseSchema.extend({
  startCustomer: z
    .object({
      agreementId: z.number(),
      priceVersion: z.string(),
      priceEndsAt: z.string(),
    })
    .nullable(),
});
export type SubscriptionCurrent = z.infer<typeof SubscriptionWireSchema>;
