import { describe, expect, it } from "vitest";
import { parseCookieValue } from "./client";

describe("parseCookieValue", () => {
  it("reads the named cookie among multiple cookies", () => {
    expect(parseCookieValue("a=1; XSRF-TOKEN=abc123; b=2", "XSRF-TOKEN")).toBe("abc123");
  });

  it("decodes a URL-encoded cookie value", () => {
    expect(parseCookieValue("XSRF-TOKEN=abc%2F123", "XSRF-TOKEN")).toBe("abc/123");
  });

  it("returns null when the cookie is missing", () => {
    expect(parseCookieValue("a=1; b=2", "XSRF-TOKEN")).toBeNull();
  });

  it("returns null for an empty cookie header", () => {
    expect(parseCookieValue("", "XSRF-TOKEN")).toBeNull();
  });
});
