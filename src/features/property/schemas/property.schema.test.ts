import { describe, expect, it } from "vitest";
import {
  parseDuplicateProperties,
  parsePropertyDetail,
  parsePropertyList,
} from "./property.schema";

describe("property API schemas", () => {
  it("parses nullable property fields without changing their meaning", () => {
    expect(
      parsePropertyList({
        properties: [
          {
            propertyId: 1,
            propertyName: null,
            address: "서울특별시 성북구 정릉로 123",
            addressDetail: null,
            dealType: "MONTHLY",
          },
        ],
      }),
    ).toEqual([
      {
        propertyId: 1,
        propertyName: null,
        address: "서울특별시 성북구 정릉로 123",
        addressDetail: null,
        dealType: "MONTHLY",
      },
    ]);
  });

  it("rejects an unsupported deal type", () => {
    expect(() =>
      parsePropertyDetail({
        propertyId: 1,
        propertyName: "정릉 매물",
        address: "서울특별시 성북구 정릉로 123",
        addressDetail: "303호",
        dealType: "RENT",
        createdAt: "2026-09-08T00:00:00Z",
      }),
    ).toThrow("매물 응답 형식이 올바르지 않습니다.");
  });

  it("parses duplicate address results used by the registration dialog", () => {
    expect(
      parseDuplicateProperties({
        duplicateProperties: [
          {
            propertyId: 7,
            propertyName: "땡땡빌라",
            address: "서울특별시 성북구 정릉로 123",
            addressDetail: "303호",
          },
        ],
      }),
    ).toHaveLength(1);
  });
});
