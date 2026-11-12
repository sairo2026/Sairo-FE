import { z } from "zod";
import { ContractRevisionListResponseSchema } from "@/lib/api/contracts/contract.schema";

/** 체결 때 만드는 첫 버전(SIGNED)은 대체한 버전이 없어 null이다(명세 15장 계약 버전 서술). */
const ContractRevisionWireSchema = ContractRevisionListResponseSchema.shape.items.element.extend({
  supersedesRevisionId: z.number().nullable(),
});

export const ContractRevisionListWireSchema = ContractRevisionListResponseSchema.extend({
  items: z.array(ContractRevisionWireSchema),
});
export type ContractRevisionList = z.infer<typeof ContractRevisionListWireSchema>;
