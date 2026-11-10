import { accountHandlers } from "./account";
import { authHandlers } from "./auth";
import { officeHandlers } from "./office";

export const handlers = [...authHandlers, ...accountHandlers, ...officeHandlers];
