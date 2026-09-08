"use client";

import { useState } from "react";
import { formatCandidateLabel, groupCandidatesByDate } from "../model/visit-response";
import type { VisitResponseCandidateTime } from "../schemas/visit-response.schema";

type CandidateSelectionViewProps = {
  candidateTimes: VisitResponseCandidateTime[];
  onSubmitAvailable: (candidateTimeIds: number[]) => Promise<void>;
  onSubmitNoAvailability: () => Promise<void>;
};

export function CandidateSelectionView({
  candidateTimes,
  onSubmitAvailable,
  onSubmitNoAvailability,
}: CandidateSelectionViewProps) {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const groups = groupCandidatesByDate(candidateTimes);

  function toggle(candidateTimeId: number) {
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
      await onSubmitAvailable(selectedIds);
    } catch {
      setError("제출하지 못했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleNoAvailability() {
    setIsSubmitting(true);
    setError("");
    try {
      await onSubmitNoAvailability();
    } catch {
      setError("제출하지 못했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div>
      <h1 className="text-xl font-bold">
        임장 일정을 조율하고 있습니다.
        <br />
        가능한 일정을 모두 선택해 주십시오.
      </h1>
      <div className="mt-8 space-y-6">
        {groups.map((group) => (
          <div key={group.dateHeading}>
            <p className="mb-3 text-sm font-semibold text-slate-500">{group.dateHeading}</p>
            <div className="grid grid-cols-2 gap-3">
              {group.candidates.map((candidate) => {
                const selected = selectedIds.includes(candidate.candidateTimeId);
                return (
                  <button
                    key={candidate.candidateTimeId}
                    type="button"
                    onClick={() => toggle(candidate.candidateTimeId)}
                    className={`rounded-lg border px-4 py-3 text-sm font-semibold ${
                      selected
                        ? "border-[#3937b8] text-[#3937b8]"
                        : "border-[#dfe3ec] text-[#182033]"
                    }`}
                  >
                    {formatCandidateLabel(candidate.startsAt)}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      {error ? (
        <p role="alert" className="mt-6 text-sm text-red-600">
          {error}
        </p>
      ) : null}
      <div className="mt-10 space-y-3">
        <button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={selectedIds.length === 0 || isSubmitting}
          className="w-full rounded-lg bg-[#3937b8] py-4 font-semibold text-white disabled:bg-[#f0f0ff] disabled:text-slate-400"
        >
          제출
        </button>
        <button
          type="button"
          onClick={() => void handleNoAvailability()}
          disabled={isSubmitting}
          className="w-full rounded-lg bg-[#f0f0ff] py-4 font-semibold text-[#3937b8] disabled:opacity-50"
        >
          가능한 시간이 없음
        </button>
      </div>
    </div>
  );
}
