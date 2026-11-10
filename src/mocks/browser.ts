import { setupWorker } from "msw/browser";
import { handlers } from "./handlers";
import { legalReviewHandlers } from "./handlers/legal-review";

export const worker = setupWorker(...legalReviewHandlers, ...handlers);
