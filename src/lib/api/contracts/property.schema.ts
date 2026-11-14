// 이 파일은 scripts/generate-contracts.mjs가 API 명세서에서 생성한다. 직접 수정하지 않는다.
import { z } from "zod";

export const PropertyListResponseSchema = z.object({
  items: z.array(
    z.object({
      activeOfferSummary: z.array(
        z.object({
          depositAmount: z.number().nullable(),
          monthlyRentAmount: z.number().nullable(),
          dealType: z.string(),
          status: z.string(),
          salePrice: z.number().nullable(),
          premiumAmount: z.number().nullable(),
        }),
      ),
      updatedAt: z.iso.datetime({ offset: true }),
      propertyId: z.number(),
      name: z.string(),
      address: z.string().nullable(),
      addressDetail: z.string().nullable().optional(),
      categoryId: z.number(),
      categoryName: z.string(),
      registrationStage: z.string(),
      managingMembershipId: z.number().nullable().optional(),
      managingMemberName: z.string().nullable().optional(),
      occupancyStatus: z.string(),
      ownerNames: z.array(z.string()),
      occupantNames: z.array(z.string()),
      leaseEndDate: z.iso.date().nullable().optional(),
      leaseEndSource: z.string().nullable().optional(),
      memo: z.string().nullable().optional(),
      officeId: z.number(),
      createdAt: z.iso.datetime({ offset: true }),
      version: z.number(),
    }),
  ),
  page: z.number(),
  size: z.number(),
  totalElements: z.number(),
});
export type PropertyListResponse = z.infer<typeof PropertyListResponseSchema>;

export const PropertyCreateRequestSchema = z.object({
  name: z.string(),
  categoryId: z.number(),
  address: z.string().nullable().optional(),
  addressDetail: z.string().nullable().optional(),
  managingMembershipId: z.number().nullable().optional(),
  exclusiveAreaSqm: z.number().nullable().optional(),
  moveInDate: z.iso.date().nullable().optional(),
  moveInNegotiable: z.boolean().optional(),
  maintenanceFeeAmount: z.number().nullable().optional(),
  maintenanceFeeItems: z.string().nullable().optional(),
  occupancyStatus: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  memo: z.string().nullable().optional(),
  referenceLeaseEndDate: z.iso.date().nullable().optional(),
  referenceLeaseEndSource: z.string().nullable().optional(),
  duplicateOverrideReason: z.string().nullable().optional(),
  supplyAreaSqm: z.number().nullable().optional(),
  landAreaSqm: z.number().nullable().optional(),
  grossFloorAreaSqm: z.number().nullable().optional(),
});
export type PropertyCreateRequest = z.infer<typeof PropertyCreateRequestSchema>;

export const PropertyCreateResponseSchema = z.object({
  propertyId: z.number(),
  registrationStage: z.string(),
  officeId: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
  version: z.number(),
});
export type PropertyCreateResponse = z.infer<typeof PropertyCreateResponseSchema>;

export const PropertyDuplicateCheckResponseSchema = z.object({
  matches: z.array(
    z.object({
      propertyId: z.number(),
      address: z.string().nullable(),
      addressDetail: z.string().nullable().optional(),
      categoryName: z.string(),
      registrationStage: z.string(),
    }),
  ),
});
export type PropertyDuplicateCheckResponse = z.infer<typeof PropertyDuplicateCheckResponseSchema>;

export const PropertyDeleteResponseSchema = z.object({});
export type PropertyDeleteResponse = z.infer<typeof PropertyDeleteResponseSchema>;

export const PropertyDetailResponseSchema = z.object({
  customFields: z.array(
    z.object({
      fieldName: z.string(),
      fieldType: z.enum(["NUMBER", "BOOLEAN", "TEXT", "DATE"]),
      value: z.unknown().nullable(),
      fieldDefinitionId: z.number(),
    }),
  ),
  offers: z.array(
    z.object({
      dealType: z.enum(["SALE", "JEONSE", "MONTHLY"]),
      depositAmount: z.number().nullable(),
      monthlyRentAmount: z.number().nullable(),
      premiumAmount: z.number().nullable(),
      salePrice: z.number().nullable(),
      status: z.enum(["AVAILABLE", "NEGOTIATING", "COMPLETED", "WITHDRAWN"]),
      offerId: z.number(),
    }),
  ),
  photos: z.array(
    z.object({
      description: z.string().nullable(),
      objectKey: z.string(),
      sortOrder: z.number(),
      photoId: z.number(),
      url: z.string(),
      urlExpiresAt: z.iso.datetime({ offset: true }),
    }),
  ),
  propertyId: z.number(),
  name: z.string(),
  categoryId: z.number(),
  categoryName: z.string(),
  registrationStage: z.string(),
  address: z.string().nullable().optional(),
  addressDetail: z.string().nullable().optional(),
  managingMembershipId: z.number().nullable().optional(),
  managingMemberName: z.string().nullable().optional(),
  exclusiveAreaSqm: z.number().nullable().optional(),
  supplyAreaSqm: z.number().nullable().optional(),
  landAreaSqm: z.number().nullable().optional(),
  grossFloorAreaSqm: z.number().nullable().optional(),
  moveInDate: z.iso.date().nullable().optional(),
  moveInNegotiable: z.boolean(),
  maintenanceFeeAmount: z.number().nullable().optional(),
  maintenanceFeeItems: z.string().nullable().optional(),
  occupancyStatus: z.string(),
  description: z.string().nullable().optional(),
  memo: z.string().nullable().optional(),
  referenceLeaseEndDate: z.iso.date().nullable().optional(),
  referenceLeaseEndSource: z.string().nullable().optional(),
  archivedCustomFields: z.array(
    z.object({
      fieldDefinitionId: z.number(),
      fieldName: z.string(),
      fieldType: z.enum(["NUMBER", "BOOLEAN", "TEXT", "DATE"]),
      value: z.unknown().nullable(),
      previousCategoryId: z.number(),
      previousCategoryName: z.string(),
    }),
  ),
  activeCoordinations: z.array(
    z.object({ coordinationId: z.number(), status: z.string(), customerName: z.string() }),
  ),
  ownerOccupants: z.array(
    z.object({
      linkId: z.number(),
      customerId: z.number(),
      customerName: z.string(),
      role: z.enum(["OWNER", "OCCUPANT"]),
      startDate: z.iso.date(),
      endDate: z.iso.date().nullable().optional(),
    }),
  ),
  visits: z.array(
    z.object({
      scheduleItemId: z.number(),
      coordinationId: z.number(),
      customerId: z.number(),
      customerName: z.string(),
      scheduledStartAt: z.iso.datetime({ offset: true }).nullable().optional(),
      result: z.enum(["COMPLETED", "NO_SHOW", "CANCELLED"]),
      actualVisitedAt: z.iso.datetime({ offset: true }).nullable().optional(),
    }),
  ),
  contracts: z.array(
    z.object({
      contractId: z.number(),
      dealType: z.enum(["SALE", "JEONSE", "MONTHLY"]),
      contractStatus: z.enum(["DRAFT", "SIGNED", "ENDED", "TERMINATED", "CANCELLED", "VOID"]),
      signedDate: z.iso.date().nullable().optional(),
      leaseStartDate: z.iso.date().nullable().optional(),
      leaseEndDate: z.iso.date().nullable().optional(),
    }),
  ),
  leaseEndDate: z.iso.date().nullable().optional(),
  leaseEndSource: z.string().nullable().optional(),
  deletedAt: z.iso.datetime({ offset: true }).nullable().optional(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
  officeId: z.number(),
  version: z.number(),
});
export type PropertyDetailResponse = z.infer<typeof PropertyDetailResponseSchema>;

export const PropertyUpdateRequestSchema = z.object({
  address: z.string().nullable().optional(),
  managingMembershipId: z.number().nullable().optional(),
  exclusiveAreaSqm: z.number().nullable().optional(),
  occupancyStatus: z.string().optional(),
  name: z.string().optional(),
  addressDetail: z.string().nullable().optional(),
  supplyAreaSqm: z.number().nullable().optional(),
  landAreaSqm: z.number().nullable().optional(),
  grossFloorAreaSqm: z.number().nullable().optional(),
  moveInDate: z.iso.date().nullable().optional(),
  moveInNegotiable: z.boolean().optional(),
  maintenanceFeeAmount: z.number().nullable().optional(),
  maintenanceFeeItems: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  memo: z.string().nullable().optional(),
  referenceLeaseEndDate: z.iso.date().nullable().optional(),
  referenceLeaseEndSource: z.string().nullable().optional(),
  duplicateOverrideReason: z.string().nullable().optional(),
  registrationStage: z.string().optional(),
});
export type PropertyUpdateRequest = z.infer<typeof PropertyUpdateRequestSchema>;

export const PropertyUpdateResponseSchema = z.object({
  propertyId: z.number(),
  name: z.string(),
  address: z.string().nullable().optional(),
  addressDetail: z.string().nullable().optional(),
  categoryId: z.number(),
  categoryName: z.string(),
  managingMembershipId: z.number().nullable().optional(),
  managingMemberName: z.string().nullable().optional(),
  registrationStage: z.string(),
  exclusiveAreaSqm: z.number().nullable().optional(),
  supplyAreaSqm: z.number().nullable().optional(),
  landAreaSqm: z.number().nullable().optional(),
  grossFloorAreaSqm: z.number().nullable().optional(),
  moveInDate: z.iso.date().nullable().optional(),
  moveInNegotiable: z.boolean(),
  maintenanceFeeAmount: z.number().nullable().optional(),
  maintenanceFeeItems: z.string().nullable().optional(),
  occupancyStatus: z.string(),
  description: z.string().nullable().optional(),
  memo: z.string().nullable().optional(),
  referenceLeaseEndDate: z.iso.date().nullable().optional(),
  referenceLeaseEndSource: z.string().nullable().optional(),
  photos: z.array(
    z.object({
      photoId: z.number(),
      objectKey: z.string(),
      description: z.string().nullable(),
      sortOrder: z.number(),
    }),
  ),
  customFields: z.array(
    z.object({
      fieldDefinitionId: z.number(),
      fieldName: z.string(),
      fieldType: z.enum(["NUMBER", "BOOLEAN", "TEXT", "DATE"]),
      value: z.unknown().nullable(),
    }),
  ),
  offers: z.array(
    z.object({
      offerId: z.number(),
      dealType: z.enum(["SALE", "JEONSE", "MONTHLY"]),
      status: z.enum(["AVAILABLE", "NEGOTIATING", "COMPLETED", "WITHDRAWN"]),
      salePrice: z.number().nullable(),
      depositAmount: z.number().nullable(),
      monthlyRentAmount: z.number().nullable(),
      premiumAmount: z.number().nullable(),
    }),
  ),
  leaseEndDate: z.iso.date().nullable().optional(),
  leaseEndSource: z.string().nullable().optional(),
  deletedAt: z.iso.datetime({ offset: true }).nullable().optional(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
  officeId: z.number(),
  version: z.number(),
});
export type PropertyUpdateResponse = z.infer<typeof PropertyUpdateResponseSchema>;

export const PropertyCategoryChangeRequestSchema = z.object({ categoryId: z.number() });
export type PropertyCategoryChangeRequest = z.infer<typeof PropertyCategoryChangeRequestSchema>;

export const PropertyCategoryChangeResponseSchema = z.object({
  propertyId: z.number(),
  name: z.string(),
  address: z.string().nullable().optional(),
  addressDetail: z.string().nullable().optional(),
  categoryId: z.number(),
  categoryName: z.string(),
  managingMembershipId: z.number().nullable().optional(),
  managingMemberName: z.string().nullable().optional(),
  registrationStage: z.string(),
  exclusiveAreaSqm: z.number().nullable().optional(),
  supplyAreaSqm: z.number().nullable().optional(),
  landAreaSqm: z.number().nullable().optional(),
  grossFloorAreaSqm: z.number().nullable().optional(),
  moveInDate: z.iso.date().nullable().optional(),
  moveInNegotiable: z.boolean(),
  maintenanceFeeAmount: z.number().nullable().optional(),
  maintenanceFeeItems: z.string().nullable().optional(),
  occupancyStatus: z.string(),
  description: z.string().nullable().optional(),
  memo: z.string().nullable().optional(),
  referenceLeaseEndDate: z.iso.date().nullable().optional(),
  referenceLeaseEndSource: z.string().nullable().optional(),
  photos: z.array(
    z.object({
      photoId: z.number(),
      objectKey: z.string(),
      description: z.string().nullable(),
      sortOrder: z.number(),
    }),
  ),
  customFields: z.array(
    z.object({
      fieldDefinitionId: z.number(),
      fieldName: z.string(),
      fieldType: z.enum(["NUMBER", "BOOLEAN", "TEXT", "DATE"]),
      value: z.unknown().nullable(),
    }),
  ),
  offers: z.array(
    z.object({
      offerId: z.number(),
      dealType: z.enum(["SALE", "JEONSE", "MONTHLY"]),
      status: z.enum(["AVAILABLE", "NEGOTIATING", "COMPLETED", "WITHDRAWN"]),
      salePrice: z.number().nullable(),
      depositAmount: z.number().nullable(),
      monthlyRentAmount: z.number().nullable(),
      premiumAmount: z.number().nullable(),
    }),
  ),
  leaseEndDate: z.iso.date().nullable().optional(),
  leaseEndSource: z.string().nullable().optional(),
  deletedAt: z.iso.datetime({ offset: true }).nullable().optional(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
  officeId: z.number(),
  version: z.number(),
});
export type PropertyCategoryChangeResponse = z.infer<typeof PropertyCategoryChangeResponseSchema>;

export const PropertyFieldValuePutRequestSchema = z.object({ value: z.unknown().nullable() });
export type PropertyFieldValuePutRequest = z.infer<typeof PropertyFieldValuePutRequestSchema>;

export const PropertyFieldValueResponseSchema = z.object({
  fieldDefinitionId: z.number(),
  value: z.unknown().nullable(),
  officeId: z.number(),
  updatedAt: z.string(),
  version: z.number(),
});
export type PropertyFieldValueResponse = z.infer<typeof PropertyFieldValueResponseSchema>;

export const PropertyOfferListResponseSchema = z.object({
  items: z.array(
    z.object({
      depositAmount: z.number().nullable(),
      monthlyRentAmount: z.number().nullable(),
      offerId: z.number(),
      dealType: z.string(),
      status: z.string(),
      officeId: z.number(),
      version: z.number(),
      salePrice: z.number().nullable(),
      premiumAmount: z.number().nullable(),
    }),
  ),
});
export type PropertyOfferListResponse = z.infer<typeof PropertyOfferListResponseSchema>;

export const PropertyOfferCreateRequestSchema = z.object({
  dealType: z.string(),
  depositAmount: z.number().nullable().optional(),
  monthlyRentAmount: z.number().nullable().optional(),
  salePrice: z.number().nullable().optional(),
  premiumAmount: z.number().nullable().optional(),
});
export type PropertyOfferCreateRequest = z.infer<typeof PropertyOfferCreateRequestSchema>;

export const PropertyOfferResponseSchema = z.object({
  offerId: z.number(),
  dealType: z.enum(["SALE", "JEONSE", "MONTHLY"]),
  status: z.enum(["AVAILABLE", "NEGOTIATING", "COMPLETED", "WITHDRAWN"]),
  salePrice: z.number().nullable(),
  depositAmount: z.number().nullable(),
  monthlyRentAmount: z.number().nullable(),
  premiumAmount: z.number().nullable(),
  officeId: z.number(),
  updatedAt: z.string(),
  version: z.number(),
});
export type PropertyOfferResponse = z.infer<typeof PropertyOfferResponseSchema>;

export const PropertyOfferUpdateRequestSchema = z.object({
  status: z.string().optional(),
  salePrice: z.number().nullable().optional(),
  depositAmount: z.number().nullable().optional(),
  monthlyRentAmount: z.number().nullable().optional(),
  premiumAmount: z.number().nullable().optional(),
});
export type PropertyOfferUpdateRequest = z.infer<typeof PropertyOfferUpdateRequestSchema>;

export const PropertyOfferUpdateResponseSchema = z.object({
  offerId: z.number(),
  dealType: z.enum(["SALE", "JEONSE", "MONTHLY"]),
  status: z.enum(["AVAILABLE", "NEGOTIATING", "COMPLETED", "WITHDRAWN"]),
  salePrice: z.number().nullable(),
  depositAmount: z.number().nullable(),
  monthlyRentAmount: z.number().nullable(),
  premiumAmount: z.number().nullable(),
  officeId: z.number(),
  updatedAt: z.string(),
  version: z.number(),
});
export type PropertyOfferUpdateResponse = z.infer<typeof PropertyOfferUpdateResponseSchema>;

export const PropertyPhotoUploadRequestSchema = z.object({
  file: z.unknown(),
  description: z.string().nullable().optional(),
  sortOrder: z.number().nullable().optional(),
});
export type PropertyPhotoUploadRequest = z.infer<typeof PropertyPhotoUploadRequestSchema>;

export const PropertyPhotoResponseSchema = z.object({
  url: z.string(),
  urlExpiresAt: z.iso.datetime({ offset: true }),
  photoId: z.number(),
  objectKey: z.string(),
  description: z.string().nullable(),
  sortOrder: z.number(),
  officeId: z.number(),
  updatedAt: z.string(),
  version: z.number(),
});
export type PropertyPhotoResponse = z.infer<typeof PropertyPhotoResponseSchema>;

export const PropertyPhotoDeleteResponseSchema = z.object({});
export type PropertyPhotoDeleteResponse = z.infer<typeof PropertyPhotoDeleteResponseSchema>;

export const PropertyRestoreResponseSchema = z.object({
  propertyId: z.number(),
  name: z.string(),
  address: z.string().nullable().optional(),
  addressDetail: z.string().nullable().optional(),
  categoryId: z.number(),
  categoryName: z.string(),
  managingMembershipId: z.number().nullable().optional(),
  managingMemberName: z.string().nullable().optional(),
  registrationStage: z.string(),
  exclusiveAreaSqm: z.number().nullable().optional(),
  supplyAreaSqm: z.number().nullable().optional(),
  landAreaSqm: z.number().nullable().optional(),
  grossFloorAreaSqm: z.number().nullable().optional(),
  moveInDate: z.iso.date().nullable().optional(),
  moveInNegotiable: z.boolean(),
  maintenanceFeeAmount: z.number().nullable().optional(),
  maintenanceFeeItems: z.string().nullable().optional(),
  occupancyStatus: z.string(),
  description: z.string().nullable().optional(),
  memo: z.string().nullable().optional(),
  referenceLeaseEndDate: z.iso.date().nullable().optional(),
  referenceLeaseEndSource: z.string().nullable().optional(),
  photos: z.array(
    z.object({
      photoId: z.number(),
      objectKey: z.string(),
      description: z.string().nullable(),
      sortOrder: z.number(),
    }),
  ),
  customFields: z.array(
    z.object({
      fieldDefinitionId: z.number(),
      fieldName: z.string(),
      fieldType: z.enum(["NUMBER", "BOOLEAN", "TEXT", "DATE"]),
      value: z.unknown().nullable(),
    }),
  ),
  offers: z.array(
    z.object({
      offerId: z.number(),
      dealType: z.enum(["SALE", "JEONSE", "MONTHLY"]),
      status: z.enum(["AVAILABLE", "NEGOTIATING", "COMPLETED", "WITHDRAWN"]),
      salePrice: z.number().nullable(),
      depositAmount: z.number().nullable(),
      monthlyRentAmount: z.number().nullable(),
      premiumAmount: z.number().nullable(),
    }),
  ),
  leaseEndDate: z.iso.date().nullable().optional(),
  leaseEndSource: z.string().nullable().optional(),
  deletedAt: z.string().nullable(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
  officeId: z.number(),
  version: z.number(),
});
export type PropertyRestoreResponse = z.infer<typeof PropertyRestoreResponseSchema>;

export const PropertyCategoryListResponseSchema = z.object({
  items: z.array(
    z.object({
      categoryId: z.number(),
      name: z.string(),
      isSystem: z.boolean(),
      active: z.boolean(),
    }),
  ),
});
export type PropertyCategoryListResponse = z.infer<typeof PropertyCategoryListResponseSchema>;

export const PropertyCategoryCreateRequestSchema = z.object({ name: z.string() });
export type PropertyCategoryCreateRequest = z.infer<typeof PropertyCategoryCreateRequestSchema>;

export const PropertyCategoryResponseSchema = z.object({
  categoryId: z.number(),
  officeId: z.number().nullable(),
  name: z.string(),
  isSystem: z.boolean(),
  active: z.boolean(),
  createdAt: z.string(),
});
export type PropertyCategoryResponse = z.infer<typeof PropertyCategoryResponseSchema>;

export const PropertyCategoryUpdateRequestSchema = z.object({
  name: z.string().optional(),
  active: z.boolean().optional(),
});
export type PropertyCategoryUpdateRequest = z.infer<typeof PropertyCategoryUpdateRequestSchema>;

export const PropertyCategoryUpdateResponseSchema = z.object({
  categoryId: z.number(),
  officeId: z.number().nullable(),
  name: z.string(),
  isSystem: z.boolean(),
  active: z.boolean(),
  createdAt: z.string(),
});
export type PropertyCategoryUpdateResponse = z.infer<typeof PropertyCategoryUpdateResponseSchema>;

export const PropertyFieldDefinitionListResponseSchema = z.object({
  items: z.array(
    z.object({
      fieldDefinitionId: z.number(),
      fieldName: z.string(),
      fieldType: z.string(),
      numberKind: z.string().nullable().optional(),
      unit: z.string().nullable().optional(),
      minValue: z.number().nullable().optional(),
      maxValue: z.number().nullable().optional(),
      active: z.boolean(),
    }),
  ),
});
export type PropertyFieldDefinitionListResponse = z.infer<
  typeof PropertyFieldDefinitionListResponseSchema
>;

export const PropertyFieldDefinitionCreateRequestSchema = z.object({
  fieldName: z.string(),
  fieldType: z.string(),
});
export type PropertyFieldDefinitionCreateRequest = z.infer<
  typeof PropertyFieldDefinitionCreateRequestSchema
>;

export const PropertyFieldDefinitionResponseSchema = z.object({
  fieldDefinitionId: z.number(),
  categoryId: z.number(),
  fieldName: z.string(),
  fieldType: z.enum(["NUMBER", "BOOLEAN", "TEXT", "DATE"]),
  active: z.boolean(),
  createdAt: z.string(),
});
export type PropertyFieldDefinitionResponse = z.infer<typeof PropertyFieldDefinitionResponseSchema>;

export const PropertyFieldDefinitionUpdateRequestSchema = z.object({
  fieldName: z.string().optional(),
  active: z.boolean().optional(),
});
export type PropertyFieldDefinitionUpdateRequest = z.infer<
  typeof PropertyFieldDefinitionUpdateRequestSchema
>;

export const PropertyFieldDefinitionUpdateResponseSchema = z.object({
  fieldDefinitionId: z.number(),
  categoryId: z.number(),
  fieldName: z.string(),
  fieldType: z.enum(["NUMBER", "BOOLEAN", "TEXT", "DATE"]),
  active: z.boolean(),
  createdAt: z.string(),
});
export type PropertyFieldDefinitionUpdateResponse = z.infer<
  typeof PropertyFieldDefinitionUpdateResponseSchema
>;

export const PropertyPhotoUpdateRequestSchema = z.object({
  description: z.string().nullable().optional(),
  sortOrder: z.number().optional(),
});
export type PropertyPhotoUpdateRequest = z.infer<typeof PropertyPhotoUpdateRequestSchema>;

export const PropertyPhotoUpdateResponseSchema = z.object({
  photoId: z.number(),
  objectKey: z.string(),
  description: z.string().nullable(),
  sortOrder: z.number(),
  url: z.string(),
  urlExpiresAt: z.iso.datetime({ offset: true }),
  officeId: z.number(),
  updatedAt: z.iso.datetime({ offset: true }),
  version: z.number(),
});
export type PropertyPhotoUpdateResponse = z.infer<typeof PropertyPhotoUpdateResponseSchema>;
