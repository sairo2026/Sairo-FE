import { cleanup } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, beforeEach, vi } from "vitest";
import { resetMockOpsSession } from "@/mocks/handlers/ops-session";
import {
  opsSystemMonitorHandlers,
  resetMockOpsSystemMonitor,
} from "@/mocks/handlers/ops-system-monitor";
import { server, startMockServer } from "@/mocks/server";
import { renderOpsScreen } from "../home/testing/render-ops-screen";
import type { OpsRole } from "../model/roles";
import type { ReactNode } from "react";

export function installSystemTestLifecycle() {
  let stopServer: () => void = () => undefined;
  beforeAll(() => {
    stopServer = startMockServer();
  });
  beforeEach(() => {
    server.use(...opsSystemMonitorHandlers);
  });
  afterEach(() => {
    cleanup();
    server.resetHandlers();
    resetMockOpsSession();
    resetMockOpsSystemMonitor();
    vi.restoreAllMocks();
  });
  afterAll(() => stopServer());
}

export function renderWithMonitor(ui: ReactNode, roles: OpsRole[]) {
  return renderOpsScreen(ui, roles);
}

export function isDisabled(button: HTMLElement): boolean {
  return button.getAttribute("aria-disabled") === "true";
}

export const EMPTY_PAGE = { items: [], page: 0, size: 25, totalElements: 0 };
