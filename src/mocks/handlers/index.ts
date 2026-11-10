import { accountHandlers } from "./account";
import { authHandlers } from "./auth";
import { customerHandlers } from "./customer";
import { officeHandlers } from "./office";
import { propertyHandlers } from "./property";

export const handlers = [
  ...authHandlers,
  ...accountHandlers,
  ...officeHandlers,
  ...propertyHandlers,
  ...customerHandlers,
];
