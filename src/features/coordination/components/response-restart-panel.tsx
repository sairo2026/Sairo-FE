"use client";

import { useState } from "react";
import { ApiError } from "@/shared/api/client";
import { useFocusTrapDialog } from "@/shared/hooks/use-focus-trap-dialog";
import { restartResponse } from "../api/coordination.api";
import { isSameSlot } from "../model/coordination";
import type { CoordinationCandidateTimeItem } from "../schemas/coordination.schema";
import { CandidateTimePicker } from "./candidate-time-picker";
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
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [selectedTimes, setSelectedTimes] = useState<Date[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [issuedLink, setIssuedLink] = useState<{ url: string; expiresAt: string } | null>(null);

  const allowedSlots = allowedCandidates.map((candidate) => new Date(candidate.startsAt));

  function openPicker() {
    setSelectedTimes([]);
    setError("");
    setIsPickerOpen(true);
  }

  const dialogRef = useFocusTrapDialog(isPickerOpen, () => setIsPickerOpen(false));

  async function handleSubmit() {
    if (selectedTimes.length === 0) return;
    const candidateTimeIds = selectedTimes
      .map(
        (time) =>
          allowedCandidates.find((candidate) => isSameSlot(new Date(candidate.startsAt), time))
            ?.candidateTimeId,
      )
      .filter((id): id is number => id !== undefined);
    if (candidateTimeIds.length === 0) return;

    setIsSubmitting(true);
    setError("");
    try {
      const result = await restartResponse(coordinationId, responseId, candidateTimeIds);
      setIsPickerOpen(false);
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
    <div className="mt-4">
      <button
        type="button"
        onClick={openPicker}
        className="rounded-lg border border-[#3937b8] px-5 py-3 text-sm font-semibold text-[#3937b8]"
      >
        재시작
      </button>

      {isPickerOpen ? (
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-label="새로 보낼 후보 시간 선택"
          tabIndex={-1}
          className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/55 px-4 py-10 outline-none"
        >
          <div className="mx-auto w-full max-w-[1010px] rounded-3xl bg-white p-10 shadow-xl">
            <CandidateTimePicker
              value={selectedTimes}
              onChange={setSelectedTimes}
              onBack={() => setIsPickerOpen(false)}
              onSubmit={() => void handleSubmit()}
              isSubmitting={isSubmitting}
              allowedSlots={allowedSlots}
              title="새로 보낼 후보 시간 선택"
              backLabel="취소"
              submitLabel="새 링크 발급"
            />
            {error ? (
              <p role="alert" className="mt-4 text-sm text-red-600">
                {error}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

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
