import { billingHandlers } from "./billing";
import { accountHandlers } from "./account";
import { authHandlers } from "./auth";
import { customerHandlers } from "./customer";
import { migrationHandlers } from "./migration";
import { migrationSupportHandlers } from "./migration-support";
import { officeHandlers } from "./office";
import { propertyHandlers } from "./property";
import { settingsHandlers } from "./settings";
import { supportHandlers } from "./support";
import { visitHandlers } from "./visit";
import { visitFollowHandlers } from "./visit-follow";
import { visitRequestHandlers } from "./visit-request";
import { visitApproverHandlers } from "./visit-approver";
import { visitReviewHandlers } from "./visit-review";
import { workHandlers } from "./work";
import { contractHandlers } from "./contract";
import { contractExtraHandlers } from "./contract-extra";
import { opsSessionHandlers } from "./ops-session";
import { opsHomeHandlers } from "./ops-home";
import { opsRegistrationHandlers } from "./ops-registrations";
import { opsRawAccessHandlers } from "./ops-raw-access";
import { opsOperatorHandlers } from "./ops-operators";

export const handlers = [
  ...billingHandlers,
  ...authHandlers,
  ...accountHandlers,
  ...settingsHandlers,
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
  ...opsSessionHandlers,
  ...opsHomeHandlers,
  ...opsRegistrationHandlers,
  ...opsRawAccessHandlers,
  ...opsOperatorHandlers,
];
