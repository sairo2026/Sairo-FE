// 이 파일은 scripts/generate-contracts.mjs가 API 명세서에서 생성한다. 직접 수정하지 않는다.
import { z } from "zod";

export const CustomerConsultationUpdateRequestSchema = z.object({
  occurredAt: z.iso.datetime({ offset: true }).optional(),
  content: z.string().optional(),
  consultationType: z.string().optional(),
  correctionReason: z.string(),
});
export type CustomerConsultationUpdateRequest = z.infer<
  typeof CustomerConsultationUpdateRequestSchema
>;

export const CustomerConsultationUpdateResponseSchema = z.object({
  consultationId: z.number(),
  customerId: z.number(),
  occurredAt: z.string(),
  authorMembershipId: z.number(),
  content: z.string(),
  consultationType: z.enum(["FIRST_INQUIRY", "FOLLOWUP"]),
  createdAt: z.string(),
  updatedAt: z.string(),
  version: z.number(),
  officeId: z.number(),
});
export type CustomerConsultationUpdateResponse = z.infer<
  typeof CustomerConsultationUpdateResponseSchema
>;

export const CustomerConsultationRevisionListResponseSchema = z.object({
  items: z.array(
    z.object({
      previousConsultationType: z.enum(["FIRST_INQUIRY", "FOLLOWUP"]),
      previousContent: z.string(),
      previousOccurredAt: z.iso.datetime({ offset: true }),
      correctedBy: z.string(),
      correctedAt: z.iso.datetime({ offset: true }),
      correctionReason: z.string(),
    }),
  ),
});
export type CustomerConsultationRevisionListResponse = z.infer<
  typeof CustomerConsultationRevisionListResponseSchema
>;

export const PropertyInterestUpdateRequestSchema = z.object({
  endDate: z.iso.date().nullable().optional(),
  note: z.string().nullable().optional(),
});
export type PropertyInterestUpdateRequest = z.infer<typeof PropertyInterestUpdateRequestSchema>;

export const PropertyInterestUpdateResponseSchema = z.object({
  interestId: z.number(),
  officeId: z.number(),
  customerId: z.number(),
  propertyId: z.number(),
  startDate: z.string(),
  endDate: z.string().nullable(),
  note: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  version: z.number(),
});
export type PropertyInterestUpdateResponse = z.infer<typeof PropertyInterestUpdateResponseSchema>;

export const CustomerListResponseSchema = z.object({
  page: z.number(),
  size: z.number(),
  totalElements: z.number(),
  items: z.array(
    z.object({
      customerId: z.number(),
      name: z.string(),
      isCorporation: z.boolean(),
      phone: z.string().nullable().optional(),
      roles: z.array(z.string()),
      deletedAt: z.iso.datetime({ offset: true }).nullable().optional(),
      updatedAt: z.iso.datetime({ offset: true }),
      officeId: z.number(),
      createdAt: z.iso.datetime({ offset: true }),
      version: z.number(),
    }),
  ),
});
export type CustomerListResponse = z.infer<typeof CustomerListResponseSchema>;

export const CustomerCreateRequestSchema = z.object({
  isCorporation: z.boolean(),
  name: z.string(),
  managingMembershipId: z.number(),
  dataSource: z.string(),
  processingBasis: z.string(),
  dataPurpose: z.string(),
  retentionUntil: z.iso.date(),
  phone: z.string().nullable().optional(),
  memo: z.string().nullable().optional(),
  secondaryPhone: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
});
export type CustomerCreateRequest = z.infer<typeof CustomerCreateRequestSchema>;

export const CustomerCreateResponseSchema = z.object({
  customerId: z.number(),
  deletedAt: z.string().nullable(),
  officeId: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
  version: z.number(),
  processingBasis: z.string(),
});
export type CustomerCreateResponse = z.infer<typeof CustomerCreateResponseSchema>;

export const CustomerMergeRequestSchema = z.object({
  primaryCustomerId: z.number(),
  mergedCustomerId: z.number(),
  conflictResolutionNote: z.string(),
  keepFirstInquiryId: z.number().nullable().optional(),
  mergedCustomerVersion: z.number(),
  fieldChoices: z
    .object({
      name: z.enum(["PRIMARY", "MERGED"]).optional(),
      phone: z.enum(["PRIMARY", "MERGED"]).optional(),
      secondaryPhone: z.enum(["PRIMARY", "MERGED"]).optional(),
      email: z.enum(["PRIMARY", "MERGED"]).optional(),
      memo: z.enum(["PRIMARY", "MERGED"]).optional(),
      managingMembershipId: z.enum(["PRIMARY", "MERGED"]).optional(),
    })
    .nullable()
    .optional(),
});
export type CustomerMergeRequest = z.infer<typeof CustomerMergeRequestSchema>;

export const CustomerMergeResponseSchema = z.object({
  primaryCustomerId: z.number(),
  mergedCustomerId: z.number(),
  mergedAt: z.string(),
  version: z.number(),
});
export type CustomerMergeResponse = z.infer<typeof CustomerMergeResponseSchema>;

export const CustomerDeleteResponseSchema = z.object({});
export type CustomerDeleteResponse = z.infer<typeof CustomerDeleteResponseSchema>;

export const CustomerDetailResponseSchema = z.object({
  consultations: z.array(
    z.object({
      consultationType: z.enum(["FIRST_INQUIRY", "FOLLOWUP"]),
      content: z.string(),
      occurredAt: z.iso.datetime({ offset: true }),
      consultationId: z.number(),
      authorMembershipId: z.number(),
      authorName: z.string(),
      revisionCount: z.number(),
    }),
  ),
  currentOwnedOccupied: z.array(z.record(z.string(), z.unknown())),
  pastContracts: z.array(
    z.object({
      contractId: z.number(),
      propertyId: z.number(),
      propertyName: z.string(),
      dealType: z.enum(["SALE", "JEONSE", "MONTHLY"]),
      contractStatus: z.string(),
      signedDate: z.iso.date(),
      leaseStartDate: z.iso.date().nullable().optional(),
      leaseEndDate: z.iso.date().nullable().optional(),
    }),
  ),
  relatedProperties: z.array(
    z.object({
      endDate: z.iso.date().nullable(),
      propertyName: z.string(),
      role: z.enum(["OWNER", "OCCUPANT", "INTEREST"]),
      startDate: z.iso.date(),
      propertyId: z.number(),
      linkId: z.number().nullable(),
      interestId: z.number().nullable(),
      note: z.string().nullable(),
    }),
  ),
  tasks: z.array(
    z.object({
      taskId: z.number(),
      title: z.string(),
      dueDate: z.iso.date(),
      status: z.enum(["TODO", "DONE", "CANCELLED"]),
    }),
  ),
  upcomingContracts: z.array(
    z.object({
      contractId: z.number(),
      propertyId: z.number(),
      propertyName: z.string(),
      dealType: z.enum(["SALE", "JEONSE", "MONTHLY"]),
      contractStatus: z.string(),
      signedDate: z.iso.date(),
      leaseStartDate: z.iso.date().nullable().optional(),
      leaseEndDate: z.iso.date().nullable().optional(),
    }),
  ),
  visits: z.array(
    z.object({
      coordinationId: z.number(),
      status: z.enum([
        "TIME_COLLECTING",
        "COORDINATABLE",
        "FINAL_CONFIRMATION_REQUIRED",
        "APPLYING",
        "CONFIRMED",
        "RESCHEDULE_REQUIRED",
        "VISIT_COMPLETED",
        "VISIT_INCOMPLETE",
        "CANCELLED",
      ]),
      periodStartDate: z.iso.date(),
      periodEndDate: z.iso.date(),
      candidatePropertyCount: z.number(),
    }),
  ),
  customerId: z.number(),
  name: z.string(),
  isCorporation: z.boolean(),
  managingMembershipId: z.number(),
  phone: z.string().nullable().optional(),
  secondaryPhone: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  memo: z.string().nullable().optional(),
  dataSource: z.string(),
  processingBasis: z.string(),
  dataPurpose: z.string(),
  retentionUntil: z.iso.date(),
  deletedAt: z.iso.datetime({ offset: true }).nullable().optional(),
  roles: z.array(z.string()),
  deletable: z.boolean(),
  status: z.enum(["ACTIVE", "ARCHIVED", "MERGED"]),
  mergedIntoCustomerId: z.number().nullable(),
  demandConditions: z.array(
    z.object({
      conditionId: z.number(),
      dealType: z.enum(["SALE", "JEONSE", "MONTHLY"]),
      categoryId: z.number().nullable(),
      priceMin: z.number().nullable(),
      priceMax: z.number().nullable(),
      depositMin: z.number().nullable(),
      depositMax: z.number().nullable(),
      rentMin: z.number().nullable(),
      rentMax: z.number().nullable(),
      areaMin: z.number().nullable(),
      areaMax: z.number().nullable(),
      moveInDate: z.iso.date().nullable(),
      regions: z.array(z.object({ regionId: z.number(), regionName: z.string() })),
      version: z.number(),
    }),
  ),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
  officeId: z.number(),
  version: z.number(),
});
export type CustomerDetailResponse = z.infer<typeof CustomerDetailResponseSchema>;

export const CustomerUpdateRequestSchema = z.object({
  phone: z.string().nullable().optional(),
  memo: z.string().nullable().optional(),
  name: z.string().optional(),
  managingMembershipId: z.number().optional(),
  secondaryPhone: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  dataSource: z.string().optional(),
  processingBasis: z.string().optional(),
  dataPurpose: z.string().optional(),
  retentionUntil: z.iso.date().optional(),
});
export type CustomerUpdateRequest = z.infer<typeof CustomerUpdateRequestSchema>;

export const CustomerUpdateResponseSchema = z.object({
  customerId: z.number(),
  name: z.string(),
  isCorporation: z.boolean(),
  managingMembershipId: z.number(),
  phone: z.string().nullable().optional(),
  secondaryPhone: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  memo: z.string().nullable().optional(),
  dataSource: z.string(),
  processingBasis: z.string(),
  dataPurpose: z.string(),
  retentionUntil: z.iso.date(),
  deletedAt: z.iso.datetime({ offset: true }).nullable().optional(),
  roles: z.array(z.string()),
  deletable: z.boolean(),
  status: z.enum(["ACTIVE", "ARCHIVED", "MERGED"]),
  mergedIntoCustomerId: z.number().nullable(),
  demandConditions: z.array(
    z.object({
      conditionId: z.number(),
      dealType: z.enum(["SALE", "JEONSE", "MONTHLY"]),
      categoryId: z.number().nullable(),
      priceMin: z.number().nullable(),
      priceMax: z.number().nullable(),
      depositMin: z.number().nullable(),
      depositMax: z.number().nullable(),
      rentMin: z.number().nullable(),
      rentMax: z.number().nullable(),
      areaMin: z.number().nullable(),
      areaMax: z.number().nullable(),
      moveInDate: z.iso.date().nullable(),
      regions: z.array(z.object({ regionId: z.number(), regionName: z.string() })),
      version: z.number(),
    }),
  ),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
  relatedProperties: z.array(
    z.object({
      propertyId: z.number(),
      propertyName: z.string(),
      role: z.enum(["OWNER", "OCCUPANT", "INTEREST"]),
      startDate: z.iso.date(),
      endDate: z.iso.date().nullable(),
      linkId: z.number().nullable(),
      interestId: z.number().nullable(),
      note: z.string().nullable(),
    }),
  ),
  upcomingContracts: z.array(
    z.object({
      contractId: z.number(),
      propertyId: z.number(),
      propertyName: z.string(),
      dealType: z.enum(["SALE", "JEONSE", "MONTHLY"]),
      contractStatus: z.string(),
      signedDate: z.iso.date(),
      leaseStartDate: z.iso.date().nullable().optional(),
      leaseEndDate: z.iso.date().nullable().optional(),
    }),
  ),
  pastContracts: z.array(
    z.object({
      contractId: z.number(),
      propertyId: z.number(),
      propertyName: z.string(),
      dealType: z.enum(["SALE", "JEONSE", "MONTHLY"]),
      contractStatus: z.string(),
      signedDate: z.iso.date(),
      leaseStartDate: z.iso.date().nullable().optional(),
      leaseEndDate: z.iso.date().nullable().optional(),
    }),
  ),
  consultations: z.array(
    z.object({
      consultationId: z.number(),
      consultationType: z.enum(["FIRST_INQUIRY", "FOLLOWUP"]),
      occurredAt: z.iso.datetime({ offset: true }),
      content: z.string(),
      authorMembershipId: z.number(),
      authorName: z.string(),
      revisionCount: z.number(),
    }),
  ),
  visits: z.array(
    z.object({
      coordinationId: z.number(),
      status: z.enum([
        "TIME_COLLECTING",
        "COORDINATABLE",
        "FINAL_CONFIRMATION_REQUIRED",
        "APPLYING",
        "CONFIRMED",
        "RESCHEDULE_REQUIRED",
        "VISIT_COMPLETED",
        "VISIT_INCOMPLETE",
        "CANCELLED",
      ]),
      periodStartDate: z.iso.date(),
      periodEndDate: z.iso.date(),
      candidatePropertyCount: z.number(),
    }),
  ),
  tasks: z.array(
    z.object({
      taskId: z.number(),
      title: z.string(),
      dueDate: z.iso.date(),
      status: z.enum(["TODO", "DONE", "CANCELLED"]),
    }),
  ),
  officeId: z.number(),
  version: z.number(),
  currentOwnedOccupied: z.array(z.record(z.string(), z.unknown())),
});
export type CustomerUpdateResponse = z.infer<typeof CustomerUpdateResponseSchema>;

export const CustomerConsultationListResponseSchema = z.object({
  items: z.array(
    z.object({
      consultationId: z.number(),
      consultationType: z.string(),
      occurredAt: z.iso.datetime({ offset: true }),
      content: z.string(),
      authorMembershipId: z.number(),
      authorName: z.string(),
      revisionCount: z.number(),
      officeId: z.number(),
      version: z.number(),
    }),
  ),
});
export type CustomerConsultationListResponse = z.infer<
  typeof CustomerConsultationListResponseSchema
>;

export const CustomerConsultationCreateRequestSchema = z.object({
  occurredAt: z.iso.datetime({ offset: true }),
  content: z.string(),
  consultationType: z.string(),
});
export type CustomerConsultationCreateRequest = z.infer<
  typeof CustomerConsultationCreateRequestSchema
>;

export const CustomerConsultationCreateResponseSchema = z.object({
  consultationId: z.number(),
  customerId: z.number(),
  occurredAt: z.string(),
  authorMembershipId: z.number(),
  content: z.string(),
  consultationType: z.enum(["FIRST_INQUIRY", "FOLLOWUP"]),
  createdAt: z.string(),
  updatedAt: z.string(),
  version: z.number(),
  officeId: z.number(),
});
export type CustomerConsultationCreateResponse = z.infer<
  typeof CustomerConsultationCreateResponseSchema
>;

export const DemandConditionCreateRequestSchema = z.object({
  dealType: z.string(),
  categoryId: z.number().nullable().optional(),
  depositMin: z.number().nullable().optional(),
  depositMax: z.number().nullable().optional(),
  rentMin: z.number().nullable().optional(),
  rentMax: z.number().nullable().optional(),
  regions: z.array(z.string()).nullable().optional(),
  priceMin: z.number().nullable().optional(),
  priceMax: z.number().nullable().optional(),
  areaMin: z.number().nullable().optional(),
  areaMax: z.number().nullable().optional(),
  moveInDate: z.iso.date().nullable().optional(),
});
export type DemandConditionCreateRequest = z.infer<typeof DemandConditionCreateRequestSchema>;

export const DemandConditionCreateResponseSchema = z.object({
  conditionId: z.number(),
  customerId: z.number(),
  dealType: z.enum(["SALE", "JEONSE", "MONTHLY"]),
  categoryId: z.number().nullable(),
  priceMin: z.number().nullable(),
  priceMax: z.number().nullable(),
  depositMin: z.number().nullable(),
  depositMax: z.number().nullable(),
  rentMin: z.number().nullable(),
  rentMax: z.number().nullable(),
  areaMin: z.number().nullable(),
  areaMax: z.number().nullable(),
  moveInDate: z.string().nullable(),
  createdAt: z.string(),
  officeId: z.number(),
  updatedAt: z.string(),
  version: z.number(),
  regions: z.array(
    z.object({ regionId: z.number(), demandConditionId: z.number(), regionName: z.string() }),
  ),
});
export type DemandConditionCreateResponse = z.infer<typeof DemandConditionCreateResponseSchema>;

export const PropertyInterestCreateRequestSchema = z.object({
  propertyId: z.number(),
  startDate: z.iso.date(),
  note: z.string().nullable().optional(),
  endDate: z.iso.date().nullable().optional(),
});
export type PropertyInterestCreateRequest = z.infer<typeof PropertyInterestCreateRequestSchema>;

export const PropertyInterestCreateResponseSchema = z.object({
  interestId: z.number(),
  officeId: z.number(),
  customerId: z.number(),
  propertyId: z.number(),
  startDate: z.string(),
  endDate: z.string().nullable(),
  note: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  version: z.number(),
});
export type PropertyInterestCreateResponse = z.infer<typeof PropertyInterestCreateResponseSchema>;

export const CustomerRestoreResponseSchema = z.object({
  customerId: z.number(),
  name: z.string(),
  isCorporation: z.boolean(),
  managingMembershipId: z.number(),
  phone: z.string().nullable().optional(),
  secondaryPhone: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  memo: z.string().nullable().optional(),
  dataSource: z.string(),
  processingBasis: z.string(),
  dataPurpose: z.string(),
  retentionUntil: z.iso.date(),
  deletedAt: z.string().nullable(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
  relatedProperties: z.array(
    z.object({
      propertyId: z.number(),
      propertyName: z.string(),
      role: z.enum(["OWNER", "OCCUPANT", "INTEREST"]),
      startDate: z.iso.date(),
      endDate: z.iso.date().nullable(),
    }),
  ),
  currentOwnedOccupied: z.array(z.record(z.string(), z.unknown())),
  upcomingContracts: z.array(z.record(z.string(), z.unknown())),
  pastContracts: z.array(z.record(z.string(), z.unknown())),
  consultations: z.array(
    z.object({
      consultationId: z.number(),
      consultationType: z.enum(["FIRST_INQUIRY", "FOLLOWUP"]),
      occurredAt: z.iso.datetime({ offset: true }),
      content: z.string(),
    }),
  ),
  visits: z.array(z.record(z.string(), z.unknown())),
  tasks: z.array(z.record(z.string(), z.unknown())),
  officeId: z.number(),
  version: z.number(),
});
export type CustomerRestoreResponse = z.infer<typeof CustomerRestoreResponseSchema>;

export const DemandConditionUpdateRequestSchema = z.object({
  depositMax: z.number().nullable().optional(),
  dealType: z.string().optional(),
  categoryId: z.number().nullable().optional(),
  priceMin: z.number().nullable().optional(),
  priceMax: z.number().nullable().optional(),
  depositMin: z.number().nullable().optional(),
  rentMin: z.number().nullable().optional(),
  rentMax: z.number().nullable().optional(),
  areaMin: z.number().nullable().optional(),
  areaMax: z.number().nullable().optional(),
  moveInDate: z.iso.date().nullable().optional(),
  regions: z.array(z.unknown()).nullable().optional(),
});
export type DemandConditionUpdateRequest = z.infer<typeof DemandConditionUpdateRequestSchema>;

export const DemandConditionUpdateResponseSchema = z.object({
  conditionId: z.number(),
  customerId: z.number(),
  dealType: z.enum(["SALE", "JEONSE", "MONTHLY"]),
  categoryId: z.number().nullable(),
  priceMin: z.number().nullable(),
  priceMax: z.number().nullable(),
  depositMin: z.number().nullable(),
  depositMax: z.number().nullable(),
  rentMin: z.number().nullable(),
  rentMax: z.number().nullable(),
  areaMin: z.number().nullable(),
  areaMax: z.number().nullable(),
  moveInDate: z.string().nullable(),
  createdAt: z.string(),
  officeId: z.number(),
  updatedAt: z.string(),
  version: z.number(),
  regions: z.array(
    z.object({ regionId: z.number(), demandConditionId: z.number(), regionName: z.string() }),
  ),
});
export type DemandConditionUpdateResponse = z.infer<typeof DemandConditionUpdateResponseSchema>;

export const CandidatePropertyFilterResponseSchema = z.object({
  items: z.array(
    z.object({
      dealType: z.enum(["SALE", "JEONSE", "MONTHLY"]),
      monthlyRentAmount: z.number().nullable(),
      name: z.string(),
      propertyId: z.number(),
      depositAmount: z.number().nullable(),
      salePrice: z.number().nullable(),
    }),
  ),
});
export type CandidatePropertyFilterResponse = z.infer<typeof CandidatePropertyFilterResponseSchema>;

export const OwnerOccupantUpdateRequestSchema = z.object({
  endDate: z.iso.date().nullable().optional(),
});
export type OwnerOccupantUpdateRequest = z.infer<typeof OwnerOccupantUpdateRequestSchema>;

export const OwnerOccupantUpdateResponseSchema = z.object({
  linkId: z.number(),
  officeId: z.number(),
  propertyId: z.number(),
  customerId: z.number(),
  role: z.enum(["OWNER", "OCCUPANT"]),
  startDate: z.string(),
  endDate: z.string().nullable(),
  confirmedByMembershipId: z.number().nullable(),
  confirmedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  version: z.number(),
});
export type OwnerOccupantUpdateResponse = z.infer<typeof OwnerOccupantUpdateResponseSchema>;

export const OwnerOccupantCreateRequestSchema = z.object({
  customerId: z.number(),
  role: z.string(),
  startDate: z.iso.date(),
  confirmedByMembershipId: z.number().nullable().optional(),
});
export type OwnerOccupantCreateRequest = z.infer<typeof OwnerOccupantCreateRequestSchema>;

export const OwnerOccupantCreateResponseSchema = z.object({
  linkId: z.number(),
  officeId: z.number(),
  propertyId: z.number(),
  customerId: z.number(),
  role: z.enum(["OWNER", "OCCUPANT"]),
  startDate: z.string(),
  endDate: z.string().nullable(),
  confirmedByMembershipId: z.number().nullable(),
  confirmedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  version: z.number(),
});
export type OwnerOccupantCreateResponse = z.infer<typeof OwnerOccupantCreateResponseSchema>;

export const CustomerAssistantViewResponseSchema = z.object({
  customerId: z.number(),
  name: z.string(),
  phone: z.string().nullable(),
});
export type CustomerAssistantViewResponse = z.infer<typeof CustomerAssistantViewResponseSchema>;

export const DuplicateCustomerCheckResponseSchema = z.object({
  items: z.array(
    z.object({
      customerId: z.number(),
      name: z.string(),
      isCorporation: z.boolean(),
      phone: z.string().nullable(),
      roles: z.array(z.string()),
      deletedAt: z.iso.datetime({ offset: true }).nullable(),
      managingMembershipId: z.number(),
    }),
  ),
});
export type DuplicateCustomerCheckResponse = z.infer<typeof DuplicateCustomerCheckResponseSchema>;
