import { z } from "zod";
import { HomeSummaryResponseSchema } from "@/lib/api/contracts/work.schema";

/** 후속업무의 contractId는 서버 배포 순서에 따라 빠진 응답이 올 수 있어 선택으로 받는다. */
const FollowupTaskWireSchema = HomeSummaryResponseSchema.shape.openFollowupTasks.element.extend({
  contractId: z.number().optional(),
});

export const HomeSummaryWireSchema = HomeSummaryResponseSchema.extend({
  openFollowupTasks: z.array(FollowupTaskWireSchema),
});
export type HomeSummary = z.infer<typeof HomeSummaryWireSchema>;
