import { billingHandlers } from "./billing";
import { accountHandlers } from "./account";
import { authHandlers } from "./auth";
import { customerHandlers } from "./customer";
import { officeHandlers } from "./office";
import { propertyHandlers } from "./property";
import { visitHandlers } from "./visit";

export const handlers = [
  ...billingHandlers,
  ...authHandlers,
  ...accountHandlers,
  ...officeHandlers,
  ...propertyHandlers,
  ...customerHandlers,
  ...visitHandlers,
];
