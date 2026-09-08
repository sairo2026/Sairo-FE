"use client";

import { useState } from "react";
import { ApiError } from "@/shared/api/client";
import { createBuyerLink } from "../api/coordination.api";
import { BuyerLinkCreatedDialog } from "./buyer-link-created-dialog";

export function BuyerCoordinationLinkFlow({ coordinationId }: { coordinationId: number }) {
  const [customerLinkUrl, setCustomerLinkUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleCreateBuyerLink() {
    setIsSubmitting(true);
    setError("");
    try {
      const result = await createBuyerLink(coordinationId);
      setCustomerLinkUrl(result.customerLinkUrl);
    } catch (caught) {
      setError(
        caught instanceof ApiError && caught.status === 409
          ? "세입자가 아직 가능한 시간을 제출하지 않았습니다. 세입자 응답 완료 후 다시 시도해주세요."
          : "구매자용 링크를 생성하지 못했습니다. 잠시 후 다시 시도해주세요.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="max-w-[720px]">
      <h1 className="mb-4 text-3xl font-bold">구매자 조율 추가</h1>
      <p className="mb-10 text-slate-500">
        버튼을 누르면 구매희망자용 링크가 새로 생성됩니다. 이름·연락처 입력 없이 링크만 생성되며,
        여러 구매희망자에게 각각 다른 링크를 보내려면 반복해서 생성할 수 있습니다.
      </p>
      {error ? (
        <p role="alert" className="mb-6 text-sm text-red-600">
          {error}
        </p>
      ) : null}
      <button
        type="button"
        onClick={() => void handleCreateBuyerLink()}
        disabled={isSubmitting}
        className="rounded-lg bg-[#3937b8] px-10 py-4 font-semibold text-white disabled:opacity-60"
      >
        구매희망자용 링크 생성
      </button>
      {customerLinkUrl ? (
        <BuyerLinkCreatedDialog
          customerLinkUrl={customerLinkUrl}
          onClose={() => setCustomerLinkUrl(null)}
        />
      ) : null}
    </div>
  );
}
