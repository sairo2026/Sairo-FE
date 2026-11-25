import { z } from "zod";
import {
  ArchiveGrantStatusResponseSchema,
  FirstPaymentResponseSchema,
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

/** 첫 결제·재결제 응답에서 화면이 쓰는 값만 받는다. 결제 결과는 paymentStatus로 안내한다. */
export const PaymentAttemptWireSchema = FirstPaymentResponseSchema.pick({
  status: true,
  invoiceId: true,
  paymentStatus: true,
}).partial();
export type PaymentAttempt = z.infer<typeof PaymentAttemptWireSchema>;

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

export const PromotionPeriodSchema = z.object({
  id: z.number(),
  periodStart: z.string(),
  periodEnd: z.string(),
  listAmount: z.number(),
  discountAmount: z.number(),
  chargedAmount: z.number(),
  priceVersion: z.string(),
  createdAt: z.string(),
  campaignName: z.string(),
  campaignCode: z.string(),
  officeName: z.string(),
  plan: z.string(),
  freeEndsAt: z.string(),
});
export type PromotionPeriod = z.infer<typeof PromotionPeriodSchema>;

export const CurrentPromotionSchema = z
  .object({
    campaignName: z.string(),
    campaignCode: z.string(),
    startsAt: z.string(),
    freeEndsAt: z.string(),
    nextFreeRenewalAt: z.string().nullable(),
    conversionStatus: z.string(),
    potentialPaidAmount: z.number().nullable(),
  })
  .nullable();
export type CurrentPromotion = z.infer<typeof CurrentPromotionSchema>;
