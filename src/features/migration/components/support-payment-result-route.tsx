"use client";

import { useSearchParams } from "next/navigation";
import { SupportPaymentResultScreen } from "./support-payment-result-screen";

export function SupportPaymentResultRoute({ requestId }: { requestId: number }) {
  const params = useSearchParams();
  return (
    <SupportPaymentResultScreen
      requestId={requestId}
      paymentKey={params.get("paymentKey")}
      orderId={params.get("orderId")}
      amount={params.get("amount")}
      failCode={params.get("code")}
    />
  );
}
