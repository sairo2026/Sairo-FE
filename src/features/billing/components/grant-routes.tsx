"use client";

import { useSearchParams } from "next/navigation";
import { GrantAuthScreen, GrantVerifyScreen } from "./grant-screens";

export function GrantAuthRoute() {
  const params = useSearchParams();
  const kind = params.get("type") === "archive" ? "archive" : "return";
  const raw = Number(params.get("grantId"));
  return <GrantAuthScreen kind={kind} grantId={Number.isInteger(raw) && raw > 0 ? raw : null} />;
}

export function GrantVerifyRoute() {
  const params = useSearchParams();
  return (
    <GrantVerifyScreen credential={params.get("credential")} errorCode={params.get("error")} />
  );
}
