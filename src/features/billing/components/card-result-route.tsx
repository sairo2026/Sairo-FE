"use client";

import { useSearchParams } from "next/navigation";
import { CardResultScreen } from "./card-screen";

export function CardResultRoute() {
  const params = useSearchParams();
  return (
    <CardResultScreen
      authKey={params.get("authKey")}
      customerKey={params.get("customerKey")}
      version={params.get("v")}
      failCode={params.get("code")}
    />
  );
}
