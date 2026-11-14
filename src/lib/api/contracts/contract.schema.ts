// 이 파일은 scripts/generate-contracts.mjs가 API 명세서에서 생성한다. 직접 수정하지 않는다.
import { z } from "zod";

export const ContractFeeRevisionCreateRequestSchema = z.object({
  revisionType: z.string(),
  effectiveDate: z.iso.date(),
  agreedFeeAmount: z.number(),
  supplyAmount: z.number(),
  taxAmount: z.number(),
  totalAmount: z.number(),
  reason: z.string(),
  supersedesRevisionId: z.number().nullable().optional(),
});
export type ContractFeeRevisionCreateRequest = z.infer<
  typeof ContractFeeRevisionCreateRequestSchema
>;

export const ContractFeeRevisionResponseSchema = z.object({
  revisionId: z.number(),
  feeId: z.number(),
  revisionType: z.string(),
  totalAmount: z.number(),
  officeId: z.number(),
  version: z.number(),
});
export type ContractFeeRevisionResponse = z.infer<typeof ContractFeeRevisionResponseSchema>;

export const ContractFeeTransactionCreateRequestSchema = z.object({
  transactionType: z.string(),
  amount: z.number(),
  actualDate: z.iso.date(),
  memo: z.string().nullable().optional(),
  supersedesTransactionId: z.number().nullable().optional(),
  correctionReason: z.string().nullable().optional(),
});
export type ContractFeeTransactionCreateRequest = z.infer<
  typeof ContractFeeTransactionCreateRequestSchema
>;

export const ContractFeeTransactionResponseSchema = z.object({
  transactionId: z.number(),
  feeId: z.number(),
  transactionType: z.string(),
  amount: z.number(),
  actualDate: z.iso.date(),
  officeId: z.number(),
  version: z.number(),
});
export type ContractFeeTransactionResponse = z.infer<typeof ContractFeeTransactionResponseSchema>;

export const ContractFollowupTaskUpdateRequestSchema = z.object({ submitted: z.boolean() });
export type ContractFollowupTaskUpdateRequest = z.infer<
  typeof ContractFollowupTaskUpdateRequestSchema
>;

export const ContractFollowupTaskResponseSchema = z.object({
  taskId: z.number(),
  submitted: z.boolean(),
  submittedAt: z.iso.datetime({ offset: true }),
  officeId: z.number(),
  version: z.number(),
});
export type ContractFollowupTaskResponse = z.infer<typeof ContractFollowupTaskResponseSchema>;

export const ContractListResponseSchema = z.object({
  items: z.array(
    z.object({
      contractId: z.number(),
      propertyAddress: z.string(),
      dealType: z.string(),
      contractStatus: z.string(),
      leasePeriodStatus: z.string().nullable().optional(),
      settlementStatus: z.string(),
      signedDate: z.iso.date().nullable().optional(),
      sellerLandlordName: z.string().nullable().optional(),
      sellerLandlordPartyCount: z.number(),
      buyerTenantName: z.string().nullable().optional(),
      buyerTenantPartyCount: z.number(),
      excluded: z.boolean(),
      leaseEndDate: z.iso.date().nullable().optional(),
      managingMembershipId: z.number(),
      managingMemberName: z.string(),
      missingDocumentTypes: z.array(z.string()),
      officeId: z.number(),
      createdAt: z.iso.datetime({ offset: true }),
      updatedAt: z.iso.datetime({ offset: true }),
      version: z.number(),
    }),
  ),
  page: z.number(),
  size: z.number(),
  totalElements: z.number(),
});
export type ContractListResponse = z.infer<typeof ContractListResponseSchema>;

export const ContractDetailResponseSchema = z.object({
  buyerTenantParties: z.array(
    z.object({
      customerId: z.number().nullable(),
      name: z.string(),
      partyId: z.number(),
      phone: z.string().nullable(),
      sequenceNo: z.number(),
    }),
  ),
  sellerLandlordParties: z.array(
    z.object({
      customerId: z.number().nullable(),
      name: z.string(),
      partyId: z.number(),
      phone: z.string().nullable(),
      sequenceNo: z.number(),
    }),
  ),
  contractId: z.number(),
  propertyId: z.number(),
  propertyAddress: z.string(),
  managingMembershipId: z.number(),
  managingMemberName: z.string(),
  dealType: z.string(),
  contractStatus: z.string(),
  leasePeriodStatus: z.string().nullable().optional(),
  settlementStatus: z.string(),
  signedDate: z.iso.date().nullable().optional(),
  depositAmount: z.number().nullable().optional(),
  leaseStartDate: z.iso.date().nullable().optional(),
  leaseEndDate: z.iso.date().nullable().optional(),
  balanceDueDate: z.iso.date().nullable().optional(),
  balanceDueDatePendingReason: z.string().nullable().optional(),
  previousContractId: z.number().nullable().optional(),
  currentRevisionId: z.number().nullable().optional(),
  documents: z.array(
    z.object({
      documentId: z.number(),
      documentType: z.string(),
      versionNo: z.number(),
      contractRevisionId: z.number().nullable().optional(),
      writtenDate: z.iso.date().nullable().optional(),
      deliveredDate: z.iso.date().nullable().optional(),
      datePendingReason: z.string().nullable().optional(),
      retentionYears: z.number(),
      retentionEndDate: z.iso.date().nullable().optional(),
      piiMaskingConfirmed: z.boolean(),
      supersedesDocumentId: z.number().nullable().optional(),
    }),
  ),
  officeId: z.number(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
  version: z.number(),
  salePrice: z.number().nullable().optional(),
  monthlyRentAmount: z.number().nullable().optional(),
  memo: z.string().nullable().optional(),
  duplicateExcluded: z.boolean(),
  duplicateOfContractId: z.number().nullable().optional(),
  duplicateExcludedAt: z.iso.datetime({ offset: true }).nullable().optional(),
  duplicateExclusionReason: z.string().nullable().optional(),
});
export type ContractDetailResponse = z.infer<typeof ContractDetailResponseSchema>;

export const ContractCorrectionRequestSchema = z.object({});
export type ContractCorrectionRequest = z.infer<typeof ContractCorrectionRequestSchema>;

export const ContractRevisionResponseSchema = z.object({
  contractId: z.number(),
  version: z.number(),
  revisionId: z.number(),
  revisionNo: z.number(),
  revisionType: z.string(),
  previousSnapshot: z.object({
    signedDate: z.string().nullable(),
    dealType: z.enum(["SALE", "JEONSE", "MONTHLY"]),
    salePrice: z.number().nullable(),
    depositAmount: z.number().nullable(),
    monthlyRentAmount: z.number().nullable(),
    balanceDueDate: z.string().nullable(),
    balanceDueDatePendingReason: z.string().nullable(),
    leaseStartDate: z.string().nullable(),
    leaseEndDate: z.string().nullable(),
    sellerLandlordParties: z.array(
      z.object({
        partyId: z.number(),
        sequenceNo: z.number(),
        name: z.string(),
        phone: z.string().nullable(),
        customerId: z.number().nullable(),
      }),
    ),
    buyerTenantParties: z.array(
      z.object({
        partyId: z.number(),
        sequenceNo: z.number(),
        name: z.string(),
        phone: z.string().nullable(),
        customerId: z.number().nullable(),
      }),
    ),
  }),
  currentSnapshot: z.object({
    signedDate: z.string().nullable(),
    dealType: z.enum(["SALE", "JEONSE", "MONTHLY"]),
    salePrice: z.number().nullable(),
    depositAmount: z.number().nullable(),
    monthlyRentAmount: z.number().nullable(),
    balanceDueDate: z.string().nullable(),
    balanceDueDatePendingReason: z.string().nullable(),
    leaseStartDate: z.string().nullable(),
    leaseEndDate: z.string().nullable(),
    sellerLandlordParties: z.array(
      z.object({
        partyId: z.number(),
        sequenceNo: z.number(),
        name: z.string(),
        phone: z.string().nullable(),
        customerId: z.number().nullable(),
      }),
    ),
    buyerTenantParties: z.array(
      z.object({
        partyId: z.number(),
        sequenceNo: z.number(),
        name: z.string(),
        phone: z.string().nullable(),
        customerId: z.number().nullable(),
      }),
    ),
  }),
  reason: z.string(),
  effectiveAt: z.iso.datetime({ offset: true }),
  recordedAt: z.iso.datetime({ offset: true }),
  recordedByMembershipId: z.number(),
  supersedesRevisionId: z.number(),
  officeId: z.number(),
});
export type ContractRevisionResponse = z.infer<typeof ContractRevisionResponseSchema>;

export const ContractDocumentUploadRequestSchema = z.object({
  contractRevisionId: z.number(),
  documentType: z.string(),
  writtenDate: z.iso.date().nullable().optional(),
  deliveredDate: z.iso.date().nullable().optional(),
  datePendingReason: z.string().nullable().optional(),
  piiReviewed: z.boolean(),
  piiMaskingConfirmed: z.boolean().optional(),
  file: z.unknown(),
});
export type ContractDocumentUploadRequest = z.infer<typeof ContractDocumentUploadRequestSchema>;

export const ContractDocumentResponseSchema = z.object({
  documentId: z.number(),
  documentType: z.string(),
  versionNo: z.number(),
  contractRevisionId: z.number(),
  writtenDate: z.iso.date().nullable().optional(),
  deliveredDate: z.iso.date().nullable().optional(),
  datePendingReason: z.string().nullable().optional(),
  retentionYears: z.number(),
  retentionEndDate: z.iso.date().nullable().optional(),
  piiMaskingConfirmed: z.boolean(),
  supersedesDocumentId: z.number().nullable().optional(),
  notice: z.string().nullable(),
  officeId: z.number(),
  version: z.number(),
});
export type ContractDocumentResponse = z.infer<typeof ContractDocumentResponseSchema>;

export const ContractDocumentDownloadResponseSchema = z.object({
  documentId: z.number(),
  downloadUrl: z.string(),
  expiresAt: z.iso.datetime({ offset: true }),
  officeId: z.number(),
  version: z.number(),
});
export type ContractDocumentDownloadResponse = z.infer<
  typeof ContractDocumentDownloadResponseSchema
>;

export const ContractDocumentRevisionResponseSchema = z.object({
  documentId: z.number(),
  documentType: z.string(),
  versionNo: z.number(),
  contractRevisionId: z.number(),
  writtenDate: z.iso.date().nullable().optional(),
  deliveredDate: z.iso.date().nullable().optional(),
  datePendingReason: z.string().nullable().optional(),
  retentionYears: z.number(),
  retentionEndDate: z.iso.date().nullable().optional(),
  piiMaskingConfirmed: z.boolean(),
  supersedesDocumentId: z.number().nullable().optional(),
  officeId: z.number(),
  version: z.number(),
});
export type ContractDocumentRevisionResponse = z.infer<
  typeof ContractDocumentRevisionResponseSchema
>;

export const ContractDraftDeleteResponseSchema = z.object({});
export type ContractDraftDeleteResponse = z.infer<typeof ContractDraftDeleteResponseSchema>;

export const ContractDraftUpdateRequestSchema = z.object({
  depositAmount: z.number().nullable().optional(),
  leaseStartDate: z.iso.date().nullable().optional(),
  leaseEndDate: z.iso.date().nullable().optional(),
  sellerLandlordParties: z
    .array(
      z.object({
        name: z.string(),
        phone: z.string().nullable().optional(),
        customerId: z.number().nullable().optional(),
      }),
    )
    .optional(),
  dealType: z.string().optional(),
  managingMembershipId: z.number().optional(),
  buyerTenantParties: z
    .array(
      z.object({
        name: z.string(),
        phone: z.string().nullable().optional(),
        customerId: z.number().nullable().optional(),
      }),
    )
    .optional(),
  signedDate: z.iso.date().nullable().optional(),
  salePrice: z.number().nullable().optional(),
  monthlyRentAmount: z.number().nullable().optional(),
  balanceDueDate: z.iso.date().nullable().optional(),
  balanceDueDatePendingReason: z.string().nullable().optional(),
  memo: z.string().nullable().optional(),
});
export type ContractDraftUpdateRequest = z.infer<typeof ContractDraftUpdateRequestSchema>;

export const ContractDraftUpdateResponseSchema = z.object({
  contractId: z.number(),
  contractStatus: z.string(),
  version: z.number(),
  officeId: z.number(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
});
export type ContractDraftUpdateResponse = z.infer<typeof ContractDraftUpdateResponseSchema>;

export const ContractFeeCreateRequestSchema = z.object({
  payerType: z.string(),
  payerPartyId: z.number(),
  agreedFeeAmount: z.number(),
  vatIncluded: z.boolean(),
  supplyAmount: z.number(),
  taxAmount: z.number(),
  totalAmount: z.number(),
  billedAt: z.iso.datetime({ offset: true }),
  dueAt: z.iso.datetime({ offset: true }).nullable().optional(),
});
export type ContractFeeCreateRequest = z.infer<typeof ContractFeeCreateRequestSchema>;

export const ContractFeeResponseSchema = z.object({
  feeId: z.number(),
  contractId: z.number(),
  payerPartyId: z.number(),
  totalAmount: z.number(),
  officeId: z.number(),
  version: z.number(),
});
export type ContractFeeResponse = z.infer<typeof ContractFeeResponseSchema>;

export const ContractFollowupTaskListResponseSchema = z.object({
  items: z.array(
    z.object({
      taskId: z.number(),
      taskType: z.string(),
      reportTarget: z.string().nullable().optional(),
      reportBasis: z.string().nullable().optional(),
      targetDate: z.iso.date().nullable().optional(),
      submitted: z.boolean(),
      submittedAt: z.iso.datetime({ offset: true }).nullable().optional(),
      officeId: z.number(),
      version: z.number(),
    }),
  ),
});
export type ContractFollowupTaskListResponse = z.infer<
  typeof ContractFollowupTaskListResponseSchema
>;

export const ContractPaymentScheduleCreateRequestSchema = z.object({
  installmentType: z.string(),
  sequenceNo: z.number(),
  scheduledDate: z.iso.date(),
  scheduledAmount: z.number(),
  amountMismatchReason: z.string().nullable().optional(),
});
export type ContractPaymentScheduleCreateRequest = z.infer<
  typeof ContractPaymentScheduleCreateRequestSchema
>;

export const ContractPaymentScheduleResponseSchema = z.object({
  scheduleId: z.number(),
  contractId: z.number(),
  installmentType: z.string(),
  scheduledAmount: z.number(),
  warning: z.string().nullable().optional(),
  officeId: z.number(),
  version: z.number(),
});
export type ContractPaymentScheduleResponse = z.infer<typeof ContractPaymentScheduleResponseSchema>;

export const ContractRenewRequestSchema = z.object({
  buyerTenantParties: z.array(
    z.object({
      name: z.string(),
      phone: z.string().nullable().optional(),
      customerId: z.number().nullable().optional(),
    }),
  ),
  dealType: z.enum(["JEONSE", "MONTHLY"]),
  depositAmount: z.number().nullable().optional(),
  leaseEndDate: z.iso.date().nullable().optional(),
  leaseStartDate: z.iso.date().nullable().optional(),
  managingMembershipId: z.number(),
  sellerLandlordParties: z.array(
    z.object({
      name: z.string(),
      phone: z.string().nullable().optional(),
      customerId: z.number().nullable().optional(),
    }),
  ),
  signedDate: z.iso.date(),
  monthlyRentAmount: z.number().nullable().optional(),
  balanceDueDate: z.iso.date().nullable().optional(),
  balanceDueDatePendingReason: z.string().nullable().optional(),
});
export type ContractRenewRequest = z.infer<typeof ContractRenewRequestSchema>;

export const ContractRenewResponseSchema = z.object({
  contractId: z.number(),
  contractStatus: z.string(),
  previousContractId: z.number(),
  officeId: z.number(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
  version: z.number(),
});
export type ContractRenewResponse = z.infer<typeof ContractRenewResponseSchema>;

export const ContractRevisionListResponseSchema = z.object({
  items: z.array(
    z.object({
      revisionId: z.number(),
      contractId: z.number(),
      revisionNo: z.number(),
      revisionType: z.enum(["SIGNED", "CORRECTED"]),
      previousSnapshot: z
        .object({
          signedDate: z.string().nullable(),
          dealType: z.enum(["SALE", "JEONSE", "MONTHLY"]),
          salePrice: z.number().nullable(),
          depositAmount: z.number().nullable(),
          monthlyRentAmount: z.number().nullable(),
          balanceDueDate: z.string().nullable(),
          balanceDueDatePendingReason: z.string().nullable(),
          leaseStartDate: z.string().nullable(),
          leaseEndDate: z.string().nullable(),
          sellerLandlordParties: z.array(
            z.object({
              partyId: z.number(),
              sequenceNo: z.number(),
              name: z.string(),
              phone: z.string().nullable(),
              customerId: z.number().nullable(),
            }),
          ),
          buyerTenantParties: z.array(
            z.object({
              partyId: z.number(),
              sequenceNo: z.number(),
              name: z.string(),
              phone: z.string().nullable(),
              customerId: z.number().nullable(),
            }),
          ),
        })
        .nullable(),
      currentSnapshot: z.object({
        signedDate: z.string().nullable(),
        dealType: z.enum(["SALE", "JEONSE", "MONTHLY"]),
        salePrice: z.number().nullable(),
        depositAmount: z.number().nullable(),
        monthlyRentAmount: z.number().nullable(),
        balanceDueDate: z.string().nullable(),
        balanceDueDatePendingReason: z.string().nullable(),
        leaseStartDate: z.string().nullable(),
        leaseEndDate: z.string().nullable(),
        sellerLandlordParties: z.array(
          z.object({
            partyId: z.number(),
            sequenceNo: z.number(),
            name: z.string(),
            phone: z.string().nullable(),
            customerId: z.number().nullable(),
          }),
        ),
        buyerTenantParties: z.array(
          z.object({
            partyId: z.number(),
            sequenceNo: z.number(),
            name: z.string(),
            phone: z.string().nullable(),
            customerId: z.number().nullable(),
          }),
        ),
      }),
      effectiveAt: z.string(),
      recordedAt: z.string(),
      recordedByMembershipId: z.number(),
      reason: z.string().nullable(),
      supersedesRevisionId: z.number().nullable(),
    }),
  ),
  page: z.number(),
  size: z.number(),
  totalElements: z.number(),
});
export type ContractRevisionListResponse = z.infer<typeof ContractRevisionListResponseSchema>;

export const ContractSettlementStatusUpdateRequestSchema = z.object({
  toStatus: z.string(),
  reason: z.string().nullable().optional(),
  effectiveAt: z.iso.datetime({ offset: true }).nullable().optional(),
});
export type ContractSettlementStatusUpdateRequest = z.infer<
  typeof ContractSettlementStatusUpdateRequestSchema
>;

export const ContractSettlementStatusResponseSchema = z.object({
  contractId: z.number(),
  settlementStatus: z.string(),
  version: z.number(),
  officeId: z.number(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
});
export type ContractSettlementStatusResponse = z.infer<
  typeof ContractSettlementStatusResponseSchema
>;

export const ContractSignResponseSchema = z.object({
  contractId: z.number(),
  contractStatus: z.string(),
  version: z.number(),
  officeId: z.number(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
});
export type ContractSignResponse = z.infer<typeof ContractSignResponseSchema>;

export const ContractStatusUpdateRequestSchema = z.object({
  toStatus: z.string(),
  reason: z.string(),
  effectiveAt: z.iso.datetime({ offset: true }),
  previousStatus: z.string().nullable().optional(),
  supersedesHistoryId: z.number().nullable().optional(),
});
export type ContractStatusUpdateRequest = z.infer<typeof ContractStatusUpdateRequestSchema>;

export const ContractStatusUpdateResponseSchema = z.object({
  contractId: z.number(),
  contractStatus: z.string(),
  version: z.number(),
  officeId: z.number(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
});
export type ContractStatusUpdateResponse = z.infer<typeof ContractStatusUpdateResponseSchema>;

export const ContractStatusHistoryResponseSchema = z.object({
  items: z.array(
    z.object({
      historyId: z.number(),
      track: z.string(),
      fromStatus: z.string().nullable().optional(),
      toStatus: z.string(),
      reason: z.string().nullable().optional(),
      changedByMembershipId: z.number().nullable().optional(),
      changedByMemberName: z.string().nullable().optional(),
      effectiveAt: z.iso.datetime({ offset: true }),
      supersedesHistoryId: z.number().nullable().optional(),
      createdAt: z.iso.datetime({ offset: true }),
    }),
  ),
  page: z.number(),
  size: z.number(),
  totalElements: z.number(),
});
export type ContractStatusHistoryResponse = z.infer<typeof ContractStatusHistoryResponseSchema>;

export const ContractPaymentTransactionCreateRequestSchema = z.object({
  actualAmount: z.number(),
  actualDate: z.iso.date(),
  supersedesTransactionId: z.number().nullable().optional(),
  correctionReason: z.string().nullable().optional(),
});
export type ContractPaymentTransactionCreateRequest = z.infer<
  typeof ContractPaymentTransactionCreateRequestSchema
>;

export const ContractPaymentTransactionResponseSchema = z.object({
  transactionId: z.number(),
  scheduleId: z.number(),
  actualAmount: z.number(),
  confirmedByMembershipId: z.number(),
  confirmedAt: z.iso.datetime({ offset: true }),
  officeId: z.number(),
  version: z.number(),
});
export type ContractPaymentTransactionResponse = z.infer<
  typeof ContractPaymentTransactionResponseSchema
>;

export const ContractCreateRequestSchema = z.object({
  buyerTenantParties: z.array(
    z.object({
      name: z.string(),
      phone: z.string().nullable().optional(),
      customerId: z.number().nullable().optional(),
    }),
  ),
  depositAmount: z.number().nullable().optional(),
  sellerLandlordParties: z.array(
    z.object({
      customerId: z.number().nullable().optional(),
      name: z.string(),
      phone: z.string().nullable().optional(),
    }),
  ),
  dealType: z.string(),
  managingMembershipId: z.number(),
  signedDate: z.iso.date(),
  leaseStartDate: z.iso.date().nullable().optional(),
  leaseEndDate: z.iso.date().nullable().optional(),
  balanceDueDate: z.iso.date().nullable().optional(),
  salePrice: z.number().nullable().optional(),
  monthlyRentAmount: z.number().nullable().optional(),
  balanceDueDatePendingReason: z.string().nullable().optional(),
  memo: z.string().nullable().optional(),
});
export type ContractCreateRequest = z.infer<typeof ContractCreateRequestSchema>;

export const ContractCreateResponseSchema = z.object({
  buyerTenantParties: z.array(
    z.object({
      customerId: z.number().nullable(),
      name: z.string(),
      partyId: z.number(),
      phone: z.string().nullable(),
      sequenceNo: z.number(),
    }),
  ),
  sellerLandlordParties: z.array(
    z.object({
      customerId: z.number().nullable(),
      name: z.string(),
      partyId: z.number(),
      phone: z.string().nullable(),
      sequenceNo: z.number(),
    }),
  ),
  contractId: z.number(),
  contractStatus: z.string(),
  officeId: z.number(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
  version: z.number(),
});
export type ContractCreateResponse = z.infer<typeof ContractCreateResponseSchema>;

export const ContractDraftCreateRequestSchema = z.object({
  dealType: z.string(),
  managingMembershipId: z.number(),
  sellerLandlordParties: z
    .array(
      z.object({
        name: z.string(),
        phone: z.string().nullable().optional(),
        customerId: z.number().nullable().optional(),
      }),
    )
    .optional(),
  buyerTenantParties: z
    .array(
      z.object({
        name: z.string(),
        phone: z.string().nullable().optional(),
        customerId: z.number().nullable().optional(),
      }),
    )
    .optional(),
  signedDate: z.iso.date().nullable().optional(),
  depositAmount: z.number().nullable().optional(),
  leaseStartDate: z.iso.date().nullable().optional(),
  leaseEndDate: z.iso.date().nullable().optional(),
  salePrice: z.number().nullable().optional(),
  monthlyRentAmount: z.number().nullable().optional(),
  balanceDueDate: z.iso.date().nullable().optional(),
  balanceDueDatePendingReason: z.string().nullable().optional(),
  memo: z.string().nullable().optional(),
});
export type ContractDraftCreateRequest = z.infer<typeof ContractDraftCreateRequestSchema>;

export const ContractDraftMutationResponseSchema = z.object({
  contractId: z.number(),
  contractStatus: z.string(),
  version: z.number(),
  officeId: z.number(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
});
export type ContractDraftMutationResponse = z.infer<typeof ContractDraftMutationResponseSchema>;

export const ContractDuplicateExclusionRequestSchema = z.object({
  duplicateOfContractId: z.number(),
  reason: z.string(),
});
export type ContractDuplicateExclusionRequest = z.infer<
  typeof ContractDuplicateExclusionRequestSchema
>;

export const ContractDuplicateExclusionResponseSchema = z.object({
  contractId: z.number(),
  duplicateOfContractId: z.number(),
  excludedAt: z.iso.datetime({ offset: true }),
  officeId: z.number(),
  version: z.number(),
});
export type ContractDuplicateExclusionResponse = z.infer<
  typeof ContractDuplicateExclusionResponseSchema
>;

export const ContractFeeListResponseSchema = z.object({
  items: z.array(
    z.object({
      feeId: z.number(),
      payerType: z.string(),
      payerPartyId: z.number(),
      payerName: z.string(),
      agreedFeeAmount: z.number(),
      vatIncluded: z.boolean(),
      supplyAmount: z.number(),
      taxAmount: z.number(),
      totalAmount: z.number(),
      billedAt: z.iso.datetime({ offset: true }),
      dueAt: z.iso.datetime({ offset: true }).nullable().optional(),
      netReceivedAmount: z.number(),
      revisions: z.array(
        z.object({
          revisionId: z.number(),
          revisionType: z.string(),
          effectiveDate: z.iso.date(),
          totalAmount: z.number(),
          reason: z.string().nullable().optional(),
          supersedesRevisionId: z.number().nullable().optional(),
          isSuperseded: z.boolean(),
        }),
      ),
      transactions: z.array(
        z.object({
          transactionId: z.number(),
          transactionType: z.string(),
          amount: z.number(),
          actualDate: z.iso.date(),
          memo: z.string().nullable().optional(),
          supersedesTransactionId: z.number().nullable().optional(),
          correctionReason: z.string().nullable().optional(),
          recordedAt: z.iso.datetime({ offset: true }),
          isSuperseded: z.boolean(),
        }),
      ),
      officeId: z.number(),
      version: z.number(),
    }),
  ),
  payers: z.array(
    z.object({
      payerPartyId: z.number(),
      payerName: z.string(),
      payerType: z.string(),
      billedTotal: z.number(),
      netReceivedTotal: z.number(),
      outstandingAmount: z.number(),
      overcollectedAmount: z.number(),
    }),
  ),
});
export type ContractFeeListResponse = z.infer<typeof ContractFeeListResponseSchema>;

export const ContractPaymentScheduleListResponseSchema = z.object({
  items: z.array(
    z.object({
      scheduleId: z.number(),
      installmentType: z.string(),
      sequenceNo: z.number(),
      scheduledDate: z.iso.date().nullable().optional(),
      scheduledAmount: z.number(),
      actualPaidTotal: z.number(),
      paymentStatus: z.string(),
      transactions: z.array(
        z.object({
          transactionId: z.number(),
          actualAmount: z.number(),
          actualDate: z.iso.date(),
          confirmedByMembershipId: z.number(),
          confirmedByMemberName: z.string(),
          confirmedAt: z.iso.datetime({ offset: true }),
          supersedesTransactionId: z.number().nullable().optional(),
          correctionReason: z.string().nullable().optional(),
          isSuperseded: z.boolean(),
        }),
      ),
      officeId: z.number(),
      version: z.number(),
    }),
  ),
  scheduledTotal: z.number(),
  contractAmountTotal: z.number().nullable().optional(),
  warning: z.string().nullable().optional(),
  amountMismatchReason: z.string().nullable().optional(),
});
export type ContractPaymentScheduleListResponse = z.infer<
  typeof ContractPaymentScheduleListResponseSchema
>;
