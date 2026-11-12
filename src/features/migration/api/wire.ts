import { z } from "zod";
import {
  ExportAllowedTablesResponseSchema,
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
  sheets: z
    .array(z.object({ name: z.string(), rowCount: z.number(), columnCount: z.number() }))
    .nullish(),
  selectedSheetName: z.string().nullish(),
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
  scopeNote: z.string().nullish(),
});
export type ImportSupportDetail = z.infer<typeof SupportDetailWireSchema>;

/** 대표에게는 일곱 개 표 전체와 허용 여부를, 중개사에게는 허용된 표만 준다. */
export const ExportTablesWireSchema = ExportAllowedTablesResponseSchema.extend({
  tables: z.array(
    z.object({ code: z.string(), label: z.string(), allowed: z.boolean().optional() }),
  ),
});
export type ExportTables = z.infer<typeof ExportTablesWireSchema>;
