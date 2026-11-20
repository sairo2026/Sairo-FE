import { z } from "zod";
import {
  ImportBatchDetailResponseSchema,
  ImportPreviewResponseSchema,
  ImportSupportRequestDetailResponseSchema,
} from "@/lib/api/contracts/migration.schema";

const PreviewRowSchema = z.object({
  sourceRowNumber: z.number(),
  sourceValues: z.record(z.string(), z.string().nullable()),
  normalizedValues: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])),
  unitConversions: z
    .array(
      z.object({
        field: z.string(),
        sourceValue: z.string(),
        targetValue: z.union([z.string(), z.number()]),
        ruleCode: z.string(),
      }),
    )
    .nullish(),
  relationMatches: z
    .array(
      z.object({
        sourceField: z.string(),
        targetType: z.string(),
        targetId: z.number().nullable(),
        confidence: z.number(),
      }),
    )
    .nullish(),
  warnings: z
    .array(
      z.object({
        code: z.string(),
        field: z.string().nullable(),
        message: z.string(),
        severity: z.string(),
      }),
    )
    .nullish(),
  duplicateJudgement: z.string().default("NEW"),
  matchedTargetId: z.number().nullish(),
});

const PreviewSummaryWireSchema = ImportPreviewResponseSchema.shape.summary.extend({
  newCount: z.number().optional(),
  alreadyImportedCount: z.number().optional(),
  duplicateInFileCount: z.number().optional(),
  duplicateExistingCount: z.number().optional(),
});

export const PreviewWireSchema = ImportPreviewResponseSchema.extend({
  rows: z.array(PreviewRowSchema),
  summary: PreviewSummaryWireSchema,
  duplicateWarnings: z
    .array(
      z.object({
        sourceRowNumber: z.number(),
        sourceSystem: z.string(),
        sourceType: z.string(),
        sourceId: z.string().nullish(),
        existingTargetId: z.number(),
        reason: z.string().optional(),
        existingArchived: z.boolean().optional(),
      }),
    )
    .nullish(),
});
export type ImportPreview = z.infer<typeof PreviewWireSchema>;
export type PreviewRow = ImportPreview["rows"][number];

const SkippedByReasonWireSchema = z.object({
  alreadyImported: z.number(),
  duplicateInFile: z.number(),
  duplicateExisting: z.number(),
});

export const BatchDetailWireSchema = ImportBatchDetailResponseSchema.extend({
  counts: z
    .object({
      total: z.number(),
      succeeded: z.number(),
      failed: z.number(),
      skippedDuplicate: z.number().default(0),
      skippedByReason: SkippedByReasonWireSchema.nullish(),
      unprocessed: z.number(),
    })
    .nullish(),
  cancelSummary: z
    .object({
      cancelledCount: z.number(),
      notCancelled: z.array(
        z.object({ entityType: z.string(), entityId: z.number(), reason: z.string() }),
      ),
    })
    .nullish(),
});
export type ImportBatchDetail = z.infer<typeof BatchDetailWireSchema>;

export const SupportDetailWireSchema = ImportSupportRequestDetailResponseSchema.extend({
  executionResult: z
    .object({
      succeeded: z.number(),
      failed: z.number(),
      skippedDuplicate: z.number().default(0),
      unprocessed: z.number(),
    })
    .nullish(),
});
export type ImportSupportDetail = z.infer<typeof SupportDetailWireSchema>;

const RowIssueSchema = z.object({
  code: z.string(),
  field: z.string().nullish(),
  fieldLabel: z.string().nullish(),
  message: z.string(),
  fix: z.string(),
  correctable: z.boolean(),
});

const RowFieldSchema = z.object({
  field: z.string(),
  label: z.string(),
  value: z.string().nullish(),
  corrected: z.boolean(),
});

export const ImportRowSchema = z.object({
  rowNumber: z.number(),
  outcome: z.enum(["SUCCEEDED", "FAILED", "SKIPPED"]),
  label: z.string().nullish(),
  sourceId: z.string().nullish(),
  issues: z.array(RowIssueSchema),
  skipReason: z.string().nullish(),
  targetId: z.number().nullish(),
  fields: z.array(RowFieldSchema),
  readyToRetry: z.boolean(),
});
export type ImportRow = z.infer<typeof ImportRowSchema>;
export type ImportRowIssue = z.infer<typeof RowIssueSchema>;

export const ImportRowResultsSchema = z.object({
  rows: z.array(ImportRowSchema),
  summary: z.object({ succeeded: z.number(), failed: z.number(), skipped: z.number() }),
  page: z.number(),
  size: z.number(),
  totalElements: z.number(),
});
export type ImportRowResults = z.infer<typeof ImportRowResultsSchema>;
