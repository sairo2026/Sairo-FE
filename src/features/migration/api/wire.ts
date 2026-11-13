import { z } from "zod";
import {
  ImportBatchDetailResponseSchema,
  ImportPreviewResponseSchema,
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
});

export const PreviewWireSchema = ImportPreviewResponseSchema.extend({
  rows: z.array(PreviewRowSchema),
  duplicateWarnings: z
    .array(
      z.object({
        sourceRowNumber: z.number(),
        sourceSystem: z.string(),
        sourceType: z.string(),
        sourceId: z.string(),
        existingTargetId: z.number(),
      }),
    )
    .nullish(),
});
export type ImportPreview = z.infer<typeof PreviewWireSchema>;
export type PreviewRow = ImportPreview["rows"][number];

export const BatchDetailWireSchema = ImportBatchDetailResponseSchema.extend({
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
