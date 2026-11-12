import { z } from "zod";
import { OperatorOfficeDetailResponseSchema } from "@/lib/api/contracts/ops.schema";

const SubscriptionSchema = OperatorOfficeDetailResponseSchema.shape.subscription.unwrap().unwrap();

/** 결제 전 구독은 현재 기간 종료와 체험 종료가 모두 비어 currentPeriodEnd가 null이다(백엔드 OpsHomeService). */
export const OfficeDetailWireSchema = OperatorOfficeDetailResponseSchema.extend({
  subscription: SubscriptionSchema.extend({
    currentPeriodEnd: z.iso.datetime({ offset: true }).nullable(),
  })
    .nullable()
    .optional(),
});
export type OfficeDetail = z.infer<typeof OfficeDetailWireSchema>;
