import { describe, expect, it } from "vitest";
import { previousCustomerToken, safeReusableBlocks } from "./reuse-link";

const TOKEN = "abcdefghijklmnop.qrstuvwxyz";

describe("previousCustomerToken", () => {
  it("accepts a token or an exact customer link from this origin", () => {
    expect(previousCustomerToken(TOKEN, "https://app.sairo.agency")).toBe(TOKEN);
    expect(
      previousCustomerToken(
        `https://app.sairo.agency/visit-responses/${TOKEN}`,
        "https://app.sairo.agency",
      ),
    ).toBe(TOKEN);
  });

  it("rejects another origin, another path, and query parameters", () => {
    expect(
      previousCustomerToken(
        `https://other.example/visit-responses/${TOKEN}`,
        "https://app.sairo.agency",
      ),
    ).toBeNull();
    expect(
      previousCustomerToken(`https://app.sairo.agency/other/${TOKEN}`, "https://app.sairo.agency"),
    ).toBeNull();
    expect(
      previousCustomerToken(
        `https://app.sairo.agency/visit-responses/${TOKEN}?x=1`,
        "https://app.sairo.agency",
      ),
    ).toBeNull();
  });
});

describe("safeReusableBlocks", () => {
  it("keeps exact half-hour ranges and never expands a five-minute range", () => {
    expect(
      safeReusableBlocks([
        { startsAt: "2026-12-01T10:00:00+09:00", endsAt: "2026-12-01T11:00:00+09:00" },
        { startsAt: "2026-12-02T10:05:00+09:00", endsAt: "2026-12-02T10:35:00+09:00" },
      ]),
    ).toEqual({ "2026-12-01": [600, 630] });
  });
});
