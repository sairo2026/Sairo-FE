import { billingHandlers } from "./billing";
import { accountHandlers } from "./account";
import { authHandlers } from "./auth";
import { customerHandlers } from "./customer";
import { migrationHandlers } from "./migration";
import { migrationSupportHandlers } from "./migration-support";
import { officeHandlers } from "./office";
import { propertyHandlers } from "./property";
import { supportHandlers } from "./support";
import { visitHandlers } from "./visit";
import { visitFollowHandlers } from "./visit-follow";
import { visitRequestHandlers } from "./visit-request";
import { visitApproverHandlers } from "./visit-approver";
import { visitReviewHandlers } from "./visit-review";
import { workHandlers } from "./work";
import { contractHandlers } from "./contract";
import { contractExtraHandlers } from "./contract-extra";

export const handlers = [
  ...billingHandlers,
  ...authHandlers,
  ...accountHandlers,
  ...officeHandlers,
  ...migrationHandlers,
  ...migrationSupportHandlers,
  ...supportHandlers,
  ...propertyHandlers,
  ...customerHandlers,
  ...visitHandlers,
  ...visitApproverHandlers,
  ...visitRequestHandlers,
  ...visitFollowHandlers,
  ...visitReviewHandlers,
  ...workHandlers,
  ...contractHandlers,
  ...contractExtraHandlers,
];
