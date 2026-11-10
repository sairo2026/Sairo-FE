import { billingHandlers } from "./billing";
import { accountHandlers } from "./account";
import { authHandlers } from "./auth";
import { customerHandlers } from "./customer";
import { officeHandlers } from "./office";
import { propertyHandlers } from "./property";
import { visitHandlers } from "./visit";
import { visitFollowHandlers } from "./visit-follow";
import { visitRequestHandlers } from "./visit-request";
import { visitApproverHandlers } from "./visit-approver";
import { visitReviewHandlers } from "./visit-review";

export const handlers = [
  ...billingHandlers,
  ...authHandlers,
  ...accountHandlers,
  ...officeHandlers,
  ...propertyHandlers,
  ...customerHandlers,
  ...visitHandlers,
  ...visitApproverHandlers,
  ...visitRequestHandlers,
  ...visitFollowHandlers,
  ...visitReviewHandlers,
];
