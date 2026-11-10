import { accountHandlers } from "./account";
import { authHandlers } from "./auth";
import { officeHandlers } from "./office";
import { propertyHandlers } from "./property";

export const handlers = [
  ...authHandlers,
  ...accountHandlers,
  ...officeHandlers,
  ...propertyHandlers,
];
