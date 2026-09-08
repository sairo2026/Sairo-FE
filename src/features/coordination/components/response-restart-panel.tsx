"use client";

import { useState } from "react";
import { ApiError } from "@/shared/api/client";
import { restartResponse } from "../api/coordination.api";
import { formatCandidateLabelFromIso } from "../model/coordination";
import type { CoordinationCandidateTimeItem } from "../schemas/coordination.schema";
import { CustomerLinkDialog } from "./customer-link-dialog";

type ResponseRestartPanelProps = {
  coordinationId: number;
  responseId: number;
  dialogTitle: string;
  allowedCandidates: CoordinationCandidateTimeItem[];
  onRestarted: () => void;
};

export function ResponseRestartPanel({
  coordinationId,
  responseId,
  dialogTitle,
  allowedCandidates,
  onRestarted,
}: ResponseRestartPanelProps) {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [issuedLink, setIssuedLink] = useState<{ url: string; expiresAt: string } | null>(null);

  function toggleCandidate(candidateTimeId: number) {
    setSelectedIds((current) =>
      current.includes(candidateTimeId)
        ? current.filter((id) => id !== candidateTimeId)
        : [...current, candidateTimeId],
    );
  }

  async function handleSubmit() {
    if (selectedIds.length === 0) return;
    setIsSubmitting(true);
    setError("");
    try {
      const result = await restartResponse(coordinationId, responseId, selectedIds);
      setIssuedLink({ url: result.customerLinkUrl, expiresAt: result.linkExpiresAt });
    } catch (caught) {
      setError(
        caught instanceof ApiError && caught.status === 409
          ? "지금은 재시작할 수 없는 상태입니다. 화면을 새로고침해 확인해주세요."
          : "새 링크를 발급하지 못했습니다. 잠시 후 다시 시도해주세요.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mt-4 rounded-xl border border-[#dfe3ec] bg-[#f8f9fd] p-5">
      <p className="mb-4 text-sm font-semibold">새로 보낼 후보 시간을 선택해주세요.</p>
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {allowedCandidates.map((candidate) => {
          const selected = selectedIds.includes(candidate.candidateTimeId);
          return (
            <button
              key={candidate.candidateTimeId}
              type="button"
              onClick={() => toggleCandidate(candidate.candidateTimeId)}
              className={`rounded-lg border px-4 py-3 text-sm font-semibold ${
                selected
                  ? "border-[#3937b8] bg-[#3937b8] text-white"
                  : "border-[#dfe3ec] bg-white text-[#182033]"
              }`}
            >
              {formatCandidateLabelFromIso(candidate.startsAt)}
            </button>
          );
        })}
      </div>
      {error ? (
        <p role="alert" className="mb-4 text-sm text-red-600">
          {error}
        </p>
      ) : null}
      <button
        type="button"
        onClick={() => void handleSubmit()}
        disabled={selectedIds.length === 0 || isSubmitting}
        className="rounded-lg bg-[#3937b8] px-6 py-3 text-sm font-semibold text-white disabled:opacity-50"
      >
        {isSubmitting ? "처리 중" : "새 링크 발급"}
      </button>
      {issuedLink ? (
        <CustomerLinkDialog
          title={dialogTitle}
          customerLinkUrl={issuedLink.url}
          linkExpiresAt={issuedLink.expiresAt}
          onClose={() => {
            setIssuedLink(null);
            onRestarted();
          }}
        />
      ) : null}
    </div>
  );
}
