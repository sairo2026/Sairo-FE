import { z } from "zod";
import {
  CustomerDetailResponseSchema,
  CustomerUpdateResponseSchema,
} from "@/lib/api/contracts/customer.schema";

/** 예정 계약에는 초안이 들어가고 초안의 체결일은 비어 있다(명세 15장 계약 응답). */
const UpcomingContractWireSchema =
  CustomerDetailResponseSchema.shape.upcomingContracts.element.extend({
    signedDate: z.iso.date().nullable(),
  });

export const CustomerDetailWireSchema = CustomerDetailResponseSchema.extend({
  upcomingContracts: z.array(UpcomingContractWireSchema),
});
export type CustomerDetail = z.infer<typeof CustomerDetailWireSchema>;

export const CustomerUpdateWireSchema = CustomerUpdateResponseSchema.extend({
  upcomingContracts: z.array(UpcomingContractWireSchema),
});
