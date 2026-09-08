import { describe, expect, it } from "vitest";
import {
  parseBuyerLinkCreateResult,
  parseCoordinationCreateResult,
  parseCoordinationProperty,
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
});
