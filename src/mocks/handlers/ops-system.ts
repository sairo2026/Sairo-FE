import type { RequestHandler } from "msw";
import { opsSystemMonitorHandlers } from "./ops-system-monitor";

export const opsSystemHandlers: RequestHandler[] = [...opsSystemMonitorHandlers];
