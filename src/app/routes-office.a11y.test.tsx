// @vitest-environment jsdom
import { vi } from "vitest";
import { defineRouteA11yTests } from "@/shared/testing/route-a11y";

vi.mock("next/navigation", async () => {
  const { navigationMock } = await import("@/shared/testing/navigation-mock");
  return navigationMock;
});

defineRouteA11yTests("office");
