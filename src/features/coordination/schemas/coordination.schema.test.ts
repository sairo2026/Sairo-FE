import { describe, expect, it } from "vitest";
import {
  parseBuyerLinkCreateResult,
  parseCoordinationCreateResult,
  parseCoordinationDetailResult,
  parseCoordinationListResult,
  parseCoordinationProperty,
  parseHomeSummaryResult,
  parseResponseRestartResult,
} from "./coordination.schema";

describe("coordination API schemas", () => {
  it("parses a coordination property response", () => {
    expect(
      parseCoordinationProperty({
        propertyId: 1,
        propertyName: null,
        address: "서울특별시 성북구 정릉로 123",
        addressDetail: "202호",
        dealType: "MONTHLY",
      }),
    ).toEqual({
      propertyId: 1,
      propertyName: null,
      address: "서울특별시 성북구 정릉로 123",
      addressDetail: "202호",
      dealType: "MONTHLY",
    });
  });

  it("rejects an unsupported deal type", () => {
    expect(() =>
      parseCoordinationProperty({
        propertyId: 1,
        propertyName: null,
        address: "서울특별시 성북구 정릉로 123",
        addressDetail: null,
        dealType: "RENT",
      }),
    ).toThrow();
  });

  it("parses a coordination create response", () => {
    expect(
      parseCoordinationCreateResult({
        coordinationId: 10,
        status: "TENANT_CHECKING",
        tenantResponseId: 20,
        customerLinkUrl: "https://app.sairo.agency/visit-responses/token123",
        linkExpiresAt: "2026-09-15T00:00:00Z",
      }),
    ).toEqual({
      coordinationId: 10,
      status: "TENANT_CHECKING",
      tenantResponseId: 20,
      customerLinkUrl: "https://app.sairo.agency/visit-responses/token123",
      linkExpiresAt: "2026-09-15T00:00:00Z",
    });
  });

  it("rejects a malformed create response", () => {
    expect(() => parseCoordinationCreateResult({ coordinationId: 10 })).toThrow();
  });

  it("parses a buyer link create response", () => {
    expect(
      parseBuyerLinkCreateResult({
        buyerResponseId: 30,
        customerLinkUrl: "https://app.sairo.agency/visit-responses/buyer-token",
        linkExpiresAt: "2026-09-15T00:00:00Z",
        coordinationStatus: "BUYER_CHECKING",
      }),
    ).toEqual({
      buyerResponseId: 30,
      customerLinkUrl: "https://app.sairo.agency/visit-responses/buyer-token",
      linkExpiresAt: "2026-09-15T00:00:00Z",
      coordinationStatus: "BUYER_CHECKING",
    });
  });

  it("rejects a malformed buyer link response", () => {
    expect(() => parseBuyerLinkCreateResult({ buyerResponseId: 30 })).toThrow();
  });

  const statusCounts = {
    tenantChecking: 1,
    buyerDeliveryRequired: 0,
    buyerChecking: 0,
    finalConfirmationRequired: 0,
    scheduleConfirmed: 1,
    visitCompleted: 0,
  };

  it("parses a coordination list response", () => {
    expect(
      parseCoordinationListResult({
        statusCounts,
        coordinations: [
          {
            coordinationId: 1,
            propertyAddress: "서울특별시 성북구 정릉로 123",
            tenantName: "김세입자",
            tenantPhone: "010-1234-5678",
            visitScheduledAt: null,
            status: "TENANT_CHECKING",
          },
        ],
      }),
    ).toEqual({
      statusCounts,
      coordinations: [
        {
          coordinationId: 1,
          propertyAddress: "서울특별시 성북구 정릉로 123",
          tenantName: "김세입자",
          tenantPhone: "010-1234-5678",
          visitScheduledAt: null,
          status: "TENANT_CHECKING",
        },
      ],
    });
  });

  it("rejects a list response with an unknown status", () => {
    expect(() =>
      parseCoordinationListResult({
        statusCounts,
        coordinations: [
          {
            coordinationId: 1,
            propertyAddress: "서울특별시 성북구 정릉로 123",
            tenantName: "김세입자",
            tenantPhone: "010-1234-5678",
            visitScheduledAt: null,
            status: "CANCELLED",
          },
        ],
      }),
    ).toThrow();
  });

  const tenantResponse = {
    responseId: 10,
    role: "TENANT",
    name: "김세입자",
    phone: "010-1234-5678",
    result: "AVAILABLE_SUBMITTED",
    offeredCandidateIds: [100, 101],
    selectedCandidateIds: [100],
    submittedAt: "2026-09-08T00:00:00Z",
    customerLinkUrl: "https://app.sairo.agency/visit-responses/tenant-token",
    linkExpiresAt: "2026-09-15T00:00:00Z",
  };

  it("parses a coordination detail response", () => {
    const raw = {
      coordinationId: 1,
      property: {
        propertyId: 5,
        address: "서울특별시 성북구 정릉로 123",
        addressDetail: null,
        propertyName: null,
        dealType: "MONTHLY",
      },
      status: "BUYER_CHECKING",
      createdAt: "2026-09-01T00:00:00Z",
      scheduledAt: null,
      confirmedAt: null,
      candidateTimes: [{ candidateTimeId: 100, startsAt: "2026-09-20T01:30:00Z" }],
      tenantResponse,
      buyerResponses: [],
    };
    expect(parseCoordinationDetailResult(raw)).toEqual(raw);
  });

  it("rejects a detail response missing the tenant response", () => {
    expect(() =>
      parseCoordinationDetailResult({
        coordinationId: 1,
        property: {
          propertyId: 5,
          address: "서울특별시 성북구 정릉로 123",
          addressDetail: null,
          propertyName: null,
          dealType: "MONTHLY",
        },
        status: "BUYER_CHECKING",
        createdAt: "2026-09-01T00:00:00Z",
        scheduledAt: null,
        confirmedAt: null,
        candidateTimes: [],
        buyerResponses: [],
      }),
    ).toThrow();
  });

  it("parses a home summary response", () => {
    expect(
      parseHomeSummaryResult({
        todayVisitCount: 3,
        inProgressCoordinationCount: 5,
        contractExpiringD90Count: 0,
        coordinationStatusCounts: statusCounts,
      }),
    ).toEqual({
      todayVisitCount: 3,
      inProgressCoordinationCount: 5,
      contractExpiringD90Count: 0,
      coordinationStatusCounts: statusCounts,
    });
  });

  it("parses a response restart result", () => {
    expect(
      parseResponseRestartResult({
        customerLinkUrl: "https://app.sairo.agency/visit-responses/new-token",
        linkExpiresAt: "2026-09-20T00:00:00Z",
      }),
    ).toEqual({
      customerLinkUrl: "https://app.sairo.agency/visit-responses/new-token",
      linkExpiresAt: "2026-09-20T00:00:00Z",
    });
  });

  it("rejects a malformed response restart result", () => {
    expect(() => parseResponseRestartResult({ customerLinkUrl: "x" })).toThrow();
  });
});
