// 이 파일은 scripts/generate-contracts.mjs가 API 명세서에서 생성한다. 직접 수정하지 않는다.
import { z } from "zod";

export const ExportCreateRequestSchema = z.object({
  scope: z.string(),
  tables: z.array(z.string()).optional(),
});
export type ExportCreateRequest = z.infer<typeof ExportCreateRequestSchema>;

export const ExportCreateResponseSchema = z.object({
  exportId: z.number(),
  status: z.string(),
  downloadUrl: z.string().nullable().optional(),
  expiresAt: z.string().nullable().optional(),
  fileExpiresAt: z.string(),
});
export type ExportCreateResponse = z.infer<typeof ExportCreateResponseSchema>;

export const ExportResultResponseSchema = z.object({
  exportId: z.number(),
  status: z.string(),
  downloadUrl: z.string().nullable().optional(),
  expiresAt: z.iso.datetime({ offset: true }).nullable().optional(),
  fileExpiresAt: z.iso.datetime({ offset: true }),
  failureReason: z.string().nullable().optional(),
});
export type ExportResultResponse = z.infer<typeof ExportResultResponseSchema>;

export const ImportBatchListResponseSchema = z.object({
  items: z.array(
    z.object({
      batchId: z.number(),
      fileName: z.string(),
      targetType: z.string(),
      status: z.string(),
      createdAt: z.iso.datetime({ offset: true }),
      rowCount: z.number().nullable().optional(),
      executedAt: z.iso.datetime({ offset: true }).nullable().optional(),
      cancellableUntil: z.iso.datetime({ offset: true }).nullable().optional(),
      supportRequestId: z.number().nullable().optional(),
      supportRequestStatus: z.string().nullable().optional(),
      eligibleForSupport: z.boolean(),
      officeId: z.number(),
      updatedAt: z.iso.datetime({ offset: true }),
      version: z.number(),
    }),
  ),
  remainingThisMonth: z.number(),
});
export type ImportBatchListResponse = z.infer<typeof ImportBatchListResponseSchema>;

export const ImportBatchCreateRequestSchema = z.object({
  file: z.unknown(),
  targetType: z.string(),
});
export type ImportBatchCreateRequest = z.infer<typeof ImportBatchCreateRequestSchema>;

export const ImportBatchStatusResponseSchema = z.object({
  batchId: z.number(),
  status: z.string(),
  fileName: z.string(),
  sheets: z.array(z.object({ name: z.string(), rowCount: z.number(), columnCount: z.number() })),
  selectedSheetName: z.string(),
  officeId: z.number(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
  version: z.number(),
});
export type ImportBatchStatusResponse = z.infer<typeof ImportBatchStatusResponseSchema>;

export const ImportCancelRequestSchema = z.object({});
export type ImportCancelRequest = z.infer<typeof ImportCancelRequestSchema>;

export const ImportCancelResponseSchema = z.object({
  batchId: z.number(),
  officeId: z.number(),
  status: z.enum([
    "UPLOADED",
    "MAPPING",
    "PREVIEW",
    "EXECUTING",
    "COMPLETED",
    "FAILED",
    "CANCELLED",
  ]),
  cancelledCount: z.number(),
  notCancelled: z.array(
    z.object({ entityType: z.string(), entityId: z.number(), reason: z.string() }),
  ),
  rowCount: z.number().nullable(),
  executedAt: z.string().nullable(),
  cancellableUntil: z.string().nullable(),
  cancelledAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  version: z.number(),
});
export type ImportCancelResponse = z.infer<typeof ImportCancelResponseSchema>;

export const ImportExecuteResponseSchema = z.object({
  batchId: z.number(),
  status: z.string(),
  cancellableUntil: z.iso.datetime({ offset: true }).nullable().optional(),
  officeId: z.number(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
  version: z.number(),
});
export type ImportExecuteResponse = z.infer<typeof ImportExecuteResponseSchema>;

export const ImportMappingConfirmRequestSchema = z.object({
  mappings: z.array(z.object({ sourceColumn: z.string(), targetField: z.string() })),
  sourceSystem: z.string(),
});
export type ImportMappingConfirmRequest = z.infer<typeof ImportMappingConfirmRequestSchema>;

export const ImportMappingConfirmResponseSchema = z.object({
  batchId: z.number(),
  officeId: z.number(),
  status: z.enum([
    "UPLOADED",
    "MAPPING",
    "PREVIEW",
    "EXECUTING",
    "COMPLETED",
    "FAILED",
    "CANCELLED",
  ]),
  rowCount: z.number().nullable(),
  executedAt: z.string().nullable(),
  cancellableUntil: z.string().nullable(),
  cancelledAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  version: z.number(),
});
export type ImportMappingConfirmResponse = z.infer<typeof ImportMappingConfirmResponseSchema>;

export const ImportMappingSuggestionResponseSchema = z.object({
  sourceColumns: z.array(
    z.object({
      name: z.string(),
      sampleValues: z.array(z.string()),
      mappedTargetField: z.string().nullable().optional(),
    }),
  ),
  suggestedMappings: z.array(
    z.object({ sourceColumn: z.string(), targetField: z.string(), confidence: z.number() }),
  ),
  availableTargetFields: z.array(
    z.object({ field: z.string(), label: z.string(), type: z.string(), required: z.boolean() }),
  ),
});
export type ImportMappingSuggestionResponse = z.infer<typeof ImportMappingSuggestionResponseSchema>;

export const ImportPreviewResponseSchema = z.object({
  duplicateWarnings: z.array(z.unknown()).nullable().optional(),
  rows: z.array(
    z.object({
      relationMatches: z
        .array(
          z.object({
            confidence: z.number(),
            sourceField: z.string(),
            targetId: z.number().nullable(),
            targetType: z.string(),
          }),
        )
        .nullable()
        .optional(),
      unitConversions: z.array(z.unknown()).nullable().optional(),
      warnings: z
        .array(
          z.object({
            severity: z.string(),
            code: z.string(),
            field: z.string().nullable(),
            message: z.string(),
          }),
        )
        .nullable()
        .optional(),
      sourceRowNumber: z.number(),
      sourceValues: z.object({ name: z.string().nullable().optional() }),
      normalizedValues: z.object({ customerName: z.string().optional() }),
    }),
  ),
  summary: z.object({
    rowCount: z.number(),
    errorRowCount: z.number(),
    warningCount: z.number(),
    duplicateCount: z.number(),
    relationMatchCount: z.number(),
  }),
  page: z.number(),
  size: z.number(),
  totalElements: z.number(),
});
export type ImportPreviewResponse = z.infer<typeof ImportPreviewResponseSchema>;

export const ImportSupportRequestCreateRequestSchema = z.object({
  importBatchId: z.number(),
  sourceSystem: z.string(),
  estimatedRowCount: z.number(),
});
export type ImportSupportRequestCreateRequest = z.infer<
  typeof ImportSupportRequestCreateRequestSchema
>;

export const ImportSupportRequestStatusResponseSchema = z.object({
  requestId: z.number(),
  importBatchId: z.number(),
  status: z.string(),
  quoteAmount: z.number().nullable().optional(),
  updatedAt: z.iso.datetime({ offset: true }),
  version: z.number(),
});
export type ImportSupportRequestStatusResponse = z.infer<
  typeof ImportSupportRequestStatusResponseSchema
>;

export const ImportSupportQuoteAcceptResponseSchema = z.object({
  requestId: z.number(),
  officeId: z.number(),
  sourceSystem: z.string(),
  estimatedRowCount: z.number().nullable(),
  quoteAmount: z.number().nullable(),
  paymentOrderId: z.string(),
  paymentAmount: z.number(),
  status: z.string(),
  requestedAt: z.string(),
  deliveredAt: z.string().nullable(),
});
export type ImportSupportQuoteAcceptResponse = z.infer<
  typeof ImportSupportQuoteAcceptResponseSchema
>;

export const ImportSupportRequestDetailResponseSchema = z.object({
  requestId: z.number(),
  importBatchId: z.number(),
  sourceSystem: z.string(),
  estimatedRowCount: z.number(),
  quoteAmount: z.number().nullable().optional(),
  status: z.string(),
  assignedOperatorName: z.string().nullable().optional(),
  processingStartedAt: z.iso.datetime({ offset: true }).nullable().optional(),
  submittedAt: z.iso.datetime({ offset: true }).nullable().optional(),
  changeRequestCount: z.number(),
  changeRequestReason: z.string().nullable().optional(),
  changeRequestedAt: z.iso.datetime({ offset: true }).nullable().optional(),
  approvedAt: z.iso.datetime({ offset: true }).nullable().optional(),
  approvedMappingVersionNo: z.number().nullable().optional(),
  deliveredAt: z.iso.datetime({ offset: true }).nullable().optional(),
  cancelledAt: z.iso.datetime({ offset: true }).nullable().optional(),
  cancelReason: z.string().nullable().optional(),
  rejectedAt: z.iso.datetime({ offset: true }).nullable().optional(),
  rejectReason: z.string().nullable().optional(),
  directWorkAllowed: z.boolean(),
  allowedActions: z.array(z.string()),
  batchStatus: z.string(),
  executionResult: z
    .object({ succeeded: z.number(), failed: z.number(), unprocessed: z.number() })
    .nullable()
    .optional(),
  submittedMapping: z
    .object({
      versionNo: z.number(),
      sourceSystem: z.string(),
      targetType: z.string(),
      confirmedByType: z.string(),
      createdAt: z.iso.datetime({ offset: true }),
      items: z.array(
        z.object({
          sourceColumn: z.string(),
          targetField: z.string(),
          confidence: z.number().nullable().optional(),
        }),
      ),
    })
    .nullable()
    .optional(),
  previewSummary: z
    .object({
      rowCount: z.number(),
      warningCount: z.number(),
      duplicateCount: z.number(),
      relationMatchCount: z.number(),
    })
    .nullable()
    .optional(),
  requestedAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
  version: z.number(),
});
export type ImportSupportRequestDetailResponse = z.infer<
  typeof ImportSupportRequestDetailResponseSchema
>;

export const ImportSupportApproveResponseSchema = z.object({
  requestId: z.number(),
  status: z.string(),
  approvedMappingVersionNo: z.number(),
  approvedAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
  version: z.number(),
});
export type ImportSupportApproveResponse = z.infer<typeof ImportSupportApproveResponseSchema>;

export const ImportSupportChangeRequestSchema = z.object({ reason: z.string() });
export type ImportSupportChangeRequest = z.infer<typeof ImportSupportChangeRequestSchema>;

export const ImportSupportChangeResponseSchema = z.object({
  requestId: z.number(),
  status: z.string(),
  changeRequestCount: z.number(),
  changeRequestedAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
  version: z.number(),
});
export type ImportSupportChangeResponse = z.infer<typeof ImportSupportChangeResponseSchema>;

export const ImportSupportCancelRequestSchema = z.object({
  reason: z.string().nullable().optional(),
});
export type ImportSupportCancelRequest = z.infer<typeof ImportSupportCancelRequestSchema>;

export const ImportSupportCancelResponseSchema = z.object({
  requestId: z.number(),
  status: z.string(),
  cancelledAt: z.iso.datetime({ offset: true }),
  importBatchId: z.number(),
  directWorkAllowed: z.boolean(),
  updatedAt: z.iso.datetime({ offset: true }),
  version: z.number(),
});
export type ImportSupportCancelResponse = z.infer<typeof ImportSupportCancelResponseSchema>;

export const ImportSheetSelectRequestSchema = z.object({ sheetName: z.string() });
export type ImportSheetSelectRequest = z.infer<typeof ImportSheetSelectRequestSchema>;

export const ImportBatchDetailResponseSchema = z.object({
  batchId: z.number(),
  fileName: z.string(),
  targetType: z.string(),
  status: z.string(),
  rowCount: z.number().nullable().optional(),
  counts: z
    .object({
      total: z.number(),
      succeeded: z.number(),
      failed: z.number(),
      unprocessed: z.number(),
    })
    .nullable()
    .optional(),
  executedAt: z.iso.datetime({ offset: true }).nullable().optional(),
  cancellableUntil: z.iso.datetime({ offset: true }).nullable().optional(),
  cancelledAt: z.iso.datetime({ offset: true }).nullable().optional(),
  failureReason: z.string().nullable().optional(),
  cancelSummary: z
    .object({
      cancelledCount: z.number(),
      notCancelled: z.array(z.record(z.string(), z.unknown())),
    })
    .nullable()
    .optional(),
  officeId: z.number(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
  version: z.number(),
});
export type ImportBatchDetailResponse = z.infer<typeof ImportBatchDetailResponseSchema>;

export const ImportSupportRequestListResponseSchema = z.object({
  items: z.array(
    z.object({
      requestId: z.number(),
      importBatchId: z.number(),
      sourceSystem: z.string(),
      status: z.string(),
      quoteAmount: z.number().nullable().optional(),
      updatedAt: z.iso.datetime({ offset: true }),
    }),
  ),
  page: z.number(),
  size: z.number(),
  totalElements: z.number(),
});
export type ImportSupportRequestListResponse = z.infer<
  typeof ImportSupportRequestListResponseSchema
>;

export const ImportSupportPaymentConfirmRequestSchema = z.object({
  paymentKey: z.string(),
  orderId: z.string(),
  amount: z.number(),
});
export type ImportSupportPaymentConfirmRequest = z.infer<
  typeof ImportSupportPaymentConfirmRequestSchema
>;

export const ImportSupportPaymentConfirmResponseSchema = z.object({
  requestId: z.number(),
  status: z.string(),
  paidAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
  version: z.number(),
});
export type ImportSupportPaymentConfirmResponse = z.infer<
  typeof ImportSupportPaymentConfirmResponseSchema
>;

export const ExportListResponseSchema = z.object({
  items: z.array(
    z.object({
      exportId: z.number(),
      scope: z.string(),
      status: z.string(),
      createdAt: z.iso.datetime({ offset: true }),
      fileExpiresAt: z.iso.datetime({ offset: true }),
    }),
  ),
  page: z.number(),
  size: z.number(),
  totalElements: z.number(),
});
export type ExportListResponse = z.infer<typeof ExportListResponseSchema>;

export const ExportAllowedTablesResponseSchema = z.object({
  tables: z.array(z.object({ code: z.string(), label: z.string() })),
});
export type ExportAllowedTablesResponse = z.infer<typeof ExportAllowedTablesResponseSchema>;

export const ExportPolicyUpdateRequestSchema = z.object({ allowedTables: z.array(z.string()) });
export type ExportPolicyUpdateRequest = z.infer<typeof ExportPolicyUpdateRequestSchema>;

export const OfficeExportPolicyUpdateResponseSchema = z.object({
  tables: z.array(z.object({ code: z.string(), label: z.string() })),
});
export type OfficeExportPolicyUpdateResponse = z.infer<
  typeof OfficeExportPolicyUpdateResponseSchema
>;

export const ImportSheetSelectResponseSchema = z.object({
  batchId: z.number(),
  status: z.string(),
  fileName: z.string(),
  sheets: z.array(z.object({ name: z.string(), rowCount: z.number(), columnCount: z.number() })),
  selectedSheetName: z.string(),
  officeId: z.number(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
  version: z.number(),
});
export type ImportSheetSelectResponse = z.infer<typeof ImportSheetSelectResponseSchema>;

export const ImportRetryFailedResponseSchema = z.object({
  batchId: z.number(),
  status: z.string(),
  cancellableUntil: z.iso.datetime({ offset: true }).nullable().optional(),
  officeId: z.number(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
  version: z.number(),
});
export type ImportRetryFailedResponse = z.infer<typeof ImportRetryFailedResponseSchema>;
