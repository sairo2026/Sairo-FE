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
});
export type InvoiceDetail = z.infer<typeof InvoiceDetailWireSchema>;

export const RefundStatusWireSchema = RefundRequestStatusResponseSchema;
export type RefundStatus = z.infer<typeof RefundStatusWireSchema>;

export const PublicPricingWireSchema = PublicPricingResponseSchema;
export type PublicPricing = z.infer<typeof PublicPricingWireSchema>;

export const ReturnGrantStatusWireSchema = ReturnGrantStatusResponseSchema;
export const ArchiveGrantStatusWireSchema = ArchiveGrantStatusResponseSchema;
export const ExportWireSchema = ReturnGrantExportResponseSchema;
export type ExportResult = z.infer<typeof ExportWireSchema>;

export const TaxRecipientWireSchema = TaxRecipientResponseSchema;
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
