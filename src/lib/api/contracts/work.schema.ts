// 이 파일은 scripts/generate-contracts.mjs가 API 명세서에서 생성한다. 직접 수정하지 않는다.
import { z } from "zod";

export const EntityLifecycleCorrectionRequestSchema = z.object({
  effectiveAt: z.iso.datetime({ offset: true }),
  correctionReason: z.string(),
});
export type EntityLifecycleCorrectionRequest = z.infer<
  typeof EntityLifecycleCorrectionRequestSchema
>;

export const EntityLifecycleCorrectionResponseSchema = z.object({
  eventId: z.number(),
  supersedesEventId: z.number(),
  effectiveAt: z.iso.datetime({ offset: true }),
});
export type EntityLifecycleCorrectionResponse = z.infer<
  typeof EntityLifecycleCorrectionResponseSchema
>;

export const MonthlySettlementListResponseSchema = z.object({
  items: z.array(
    z.object({ yearMonth: z.string(), isFinalized: z.boolean(), contractSignedCount: z.number() }),
  ),
});
export type MonthlySettlementListResponse = z.infer<typeof MonthlySettlementListResponseSchema>;

export const MonthlySettlementResponseSchema = z.object({
  yearMonth: z.string(),
  isFinalized: z.boolean(),
  propertyCountTotal: z.number(),
  customerCountTotal: z.number(),
  propertyCountNew: z.number(),
  customerCountNew: z.number(),
  firstInquiryCount: z.number(),
  visitCompletedCount: z.number(),
  visitCompletedPropertyCount: z.number(),
  coordinationEndedCount: z.number(),
  coordinationVisitCompletedCount: z.number(),
  coordinationVisitIncompleteCount: z.number(),
  contractSignedCount: z.number(),
  contractSignedPropertyCount: z.number(),
  leaseMaturityCount: z.number(),
  leaseMaturityPropertyCount: z.number(),
  agreedFeeTotal: z.number(),
  actualFeeReceivedTotal: z.number(),
  outstandingAmount: z.number(),
  overcollectedAmount: z.number(),
  propertyCountNewMigrated: z.number(),
  customerCountNewMigrated: z.number(),
  agreedFeeUndatedCount: z.number(),
  asOf: z.iso.datetime({ offset: true }),
});
export type MonthlySettlementResponse = z.infer<typeof MonthlySettlementResponseSchema>;

export const SettlementDetailsResponseSchema = z.object({
  metric: z.string(),
  yearMonth: z.string(),
  items: z.array(
    z.object({
      contractId: z.number().optional(),
      propertyId: z.number().optional(),
      propertyAddress: z.string().nullable().optional(),
      dealType: z.string().optional(),
      signedDate: z.iso.date().optional(),
    }),
  ),
  page: z.number(),
  size: z.number(),
  totalElements: z.number(),
});
export type SettlementDetailsResponse = z.infer<typeof SettlementDetailsResponseSchema>;

export const SettlementExportResponseSchema = z.object({
  yearMonth: z.string(),
  isFinalized: z.boolean(),
  propertyCountTotal: z.number(),
  customerCountTotal: z.number(),
  propertyCountNew: z.number(),
  customerCountNew: z.number(),
  firstInquiryCount: z.number(),
  visitCompletedCount: z.number(),
  visitCompletedPropertyCount: z.number(),
  coordinationEndedCount: z.number(),
  coordinationVisitCompletedCount: z.number(),
  coordinationVisitIncompleteCount: z.number(),
  contractSignedCount: z.number(),
  contractSignedPropertyCount: z.number(),
  leaseMaturityCount: z.number(),
  leaseMaturityPropertyCount: z.number(),
  agreedFeeTotal: z.number(),
  actualFeeReceivedTotal: z.number(),
  outstandingAmount: z.number(),
  overcollectedAmount: z.number(),
  propertyCountNewMigrated: z.number(),
  customerCountNewMigrated: z.number(),
  agreedFeeUndatedCount: z.number(),
  asOf: z.iso.datetime({ offset: true }),
});
export type SettlementExportResponse = z.infer<typeof SettlementExportResponseSchema>;

export const MonthlyMemoResponseSchema = z.object({
  yearMonth: z.string(),
  content: z.string().nullable(),
  version: z.number(),
  updatedByMembershipId: z.number().nullable().optional(),
  updatedByMemberName: z.string().nullable().optional(),
  updatedAt: z.iso.datetime({ offset: true }).nullable().optional(),
});
export type MonthlyMemoResponse = z.infer<typeof MonthlyMemoResponseSchema>;

export const MonthlyMemoUpsertRequestSchema = z.object({ content: z.string() });
export type MonthlyMemoUpsertRequest = z.infer<typeof MonthlyMemoUpsertRequestSchema>;

export const MonthlyMemoUpsertResponseSchema = z.object({
  yearMonth: z.string(),
  content: z.string().nullable(),
  version: z.number(),
  updatedByMembershipId: z.number(),
  updatedByMemberName: z.string(),
  updatedAt: z.string(),
});
export type MonthlyMemoUpsertResponse = z.infer<typeof MonthlyMemoUpsertResponseSchema>;

export const HomeSummaryResponseSchema = z.object({
  openFollowupTasks: z.array(
    z.object({ dueDate: z.iso.date(), title: z.string(), taskId: z.number() }),
  ),
  openTasks: z.array(
    z.object({
      dueDate: z.iso.date(),
      status: z.enum(["TODO", "DONE", "CANCELLED"]),
      assigneeMembershipId: z.number(),
      assigneeName: z.string(),
      title: z.string(),
      taskId: z.number(),
      overdue: z.boolean(),
    }),
  ),
  todayScheduledVisits: z.array(
    z.object({
      coordinationId: z.number(),
      customerName: z.string(),
      propertyAddress: z.string(),
      scheduledStartAt: z.iso.datetime({ offset: true }),
      scheduleItemId: z.number(),
    }),
  ),
  activeCoordinationCount: z.number(),
  unreadNotificationCount: z.number(),
  unreadVisitRequestNoticeCount: z.number(),
  visitRequestSummary: z.object({
    pendingCount: z.number(),
    revalidationFailedCount: z.number(),
    timeClosedCount: z.number(),
  }),
  coordinationStatusCounts: z.array(z.object({ status: z.string(), count: z.number() })),
  leaseExpiringWithin90DaysCount: z.number(),
  calendarDays: z.array(
    z.object({ date: z.iso.date(), visitCount: z.number(), taskCount: z.number() }),
  ),
});
export type HomeSummaryResponse = z.infer<typeof HomeSummaryResponseSchema>;

export const NotificationListResponseSchema = z.object({
  items: z.array(
    z.object({
      notificationId: z.number(),
      type: z.string(),
      message: z.string(),
      read: z.boolean(),
      targetType: z.string(),
      targetId: z.number().nullable().optional(),
      createdAt: z.iso.datetime({ offset: true }),
    }),
  ),
  page: z.number(),
  size: z.number(),
  totalElements: z.number(),
});
export type NotificationListResponse = z.infer<typeof NotificationListResponseSchema>;

export const NotificationReadResponseSchema = z.object({});
export type NotificationReadResponse = z.infer<typeof NotificationReadResponseSchema>;

export const TaskListResponseSchema = z.object({
  items: z.array(
    z.object({
      assigneeMembershipId: z.number(),
      assigneeName: z.string(),
      dueDate: z.iso.date(),
      title: z.string(),
      taskId: z.number(),
      status: z.string(),
      sourceType: z.enum(["MANUAL", "VISIT", "CONTRACT_BALANCE", "CONTRACT_MATURITY"]),
      dueTime: z.string().nullable().optional(),
      relatedCustomerId: z.number().nullable().optional(),
      relatedCustomerName: z.string().nullable().optional(),
      relatedPropertyId: z.number().nullable().optional(),
      relatedPropertyName: z.string().nullable().optional(),
      memo: z.string().nullable().optional(),
      completedAt: z.iso.datetime({ offset: true }).nullable().optional(),
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
export type TaskListResponse = z.infer<typeof TaskListResponseSchema>;

export const TaskCreateRequestSchema = z.object({
  title: z.string(),
  assigneeMembershipId: z.number(),
  dueDate: z.iso.date(),
  dueTime: z.string().nullable().optional(),
  relatedCustomerId: z.number().nullable().optional(),
  relatedPropertyId: z.number().nullable().optional(),
  memo: z.string().nullable().optional(),
});
export type TaskCreateRequest = z.infer<typeof TaskCreateRequestSchema>;

export const TaskCreateResponseSchema = z.object({
  taskId: z.number(),
  officeId: z.number(),
  title: z.string(),
  assigneeMembershipId: z.number(),
  dueDate: z.string(),
  dueTime: z.string().nullable(),
  relatedCustomerId: z.number().nullable(),
  relatedPropertyId: z.number().nullable(),
  memo: z.string().nullable(),
  status: z.enum(["TODO", "DONE", "CANCELLED"]),
  sourceType: z.enum(["MANUAL", "VISIT", "CONTRACT_BALANCE", "CONTRACT_MATURITY"]),
  sourceId: z.number().nullable(),
  completedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  version: z.number(),
});
export type TaskCreateResponse = z.infer<typeof TaskCreateResponseSchema>;

export const TaskDeleteResponseSchema = z.object({});
export type TaskDeleteResponse = z.infer<typeof TaskDeleteResponseSchema>;

export const TaskUpdateRequestSchema = z.object({
  title: z.string().optional(),
  assigneeMembershipId: z.number().optional(),
  dueDate: z.iso.date().optional(),
  status: z.enum(["TODO", "DONE", "CANCELLED"]).optional(),
  dueTime: z.string().nullable().optional(),
  relatedCustomerId: z.number().nullable().optional(),
  relatedPropertyId: z.number().nullable().optional(),
  memo: z.string().nullable().optional(),
});
export type TaskUpdateRequest = z.infer<typeof TaskUpdateRequestSchema>;

export const TaskUpdateResponseSchema = z.object({
  taskId: z.number(),
  officeId: z.number(),
  title: z.string(),
  assigneeMembershipId: z.number(),
  dueDate: z.string(),
  dueTime: z.string().nullable(),
  relatedCustomerId: z.number().nullable(),
  relatedPropertyId: z.number().nullable(),
  memo: z.string().nullable(),
  status: z.enum(["TODO", "DONE", "CANCELLED"]),
  sourceType: z.enum(["MANUAL", "VISIT", "CONTRACT_BALANCE", "CONTRACT_MATURITY"]),
  sourceId: z.number().nullable(),
  completedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  version: z.number(),
});
export type TaskUpdateResponse = z.infer<typeof TaskUpdateResponseSchema>;
