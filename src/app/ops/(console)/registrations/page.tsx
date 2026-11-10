import type { Metadata } from "next";
import { RegistrationQueueScreen } from "@/features/ops/registrations/registration-queue";

export const metadata: Metadata = { title: "인증 심사 | 사이로 운영" };

export default function Page() {
  return <RegistrationQueueScreen />;
}
