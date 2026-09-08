"use client";

import { submitAvailableTimes, submitNoAvailability } from "../api/visit-response.api";
import { useVisitResponse } from "../hooks/use-visit-response";
import { formatCandidateLabel } from "../model/visit-response";
import { CandidateSelectionView } from "./candidate-selection-view";
import { InfoView } from "./info-view";

export function VisitResponsePage({ token }: { token: string }) {
  const { state, retry, setResponse } = useVisitResponse(token);

  if (state.status === "loading") {
    return <p className="text-slate-500">불러오는 중입니다.</p>;
  }

  if (state.status === "expired") {
    return (
      <InfoView
        title="이 링크는 만료되었습니다."
        description="사무소에 문의 부탁드립니다."
        onConfirm={retry}
      />
    );
  }

  if (state.status === "error") {
    return (
      <InfoView
        title="정보를 불러오지 못했습니다."
        description="잠시 후 다시 시도해주세요."
        onConfirm={retry}
      />
    );
  }

  const { response } = state;

  if (response.result === "WAITING") {
    return (
      <CandidateSelectionView
        candidateTimes={response.candidateTimes}
        onSubmitAvailable={async (candidateTimeIds) => {
          setResponse(await submitAvailableTimes(token, candidateTimeIds));
        }}
        onSubmitNoAvailability={async () => {
          setResponse(await submitNoAvailability(token));
        }}
      />
    );
  }

  if (response.result === "AVAILABLE_SUBMITTED") {
    const selectedCandidates = response.candidateTimes.filter((candidate) =>
      response.selectedCandidateIds.includes(candidate.candidateTimeId),
    );
    return (
      <InfoView
        title="응답이 완료되었습니다. 감사합니다."
        description="사무소에서 확인 후 최종 일정을 확정합니다."
        onConfirm={retry}
      >
        <p className="mb-3 text-sm font-semibold text-slate-500">내가 선택한 일정</p>
        <div className="grid grid-cols-2 gap-3">
          {selectedCandidates.map((candidate) => (
            <span
              key={candidate.candidateTimeId}
              className="rounded-lg border border-[#dfe3ec] px-4 py-3 text-sm font-semibold"
            >
              {formatCandidateLabel(candidate.startsAt)}
            </span>
          ))}
        </div>
      </InfoView>
    );
  }

  if (response.result === "CONFIRMED") {
    return (
      <InfoView
        title="임장 일정이 확정되었습니다."
        description="이 링크는 발급일로부터 7일 동안 사용할 수 있습니다."
        onConfirm={retry}
      >
        <div className="rounded-2xl bg-[#f8f9fd] p-8 text-center">
          <p className="mb-3 text-sm font-semibold text-slate-500">최종 방문 일정</p>
          <span className="inline-block rounded-lg border border-[#dfe3ec] bg-white px-6 py-3 font-semibold">
            {response.scheduledAt ? formatCandidateLabel(response.scheduledAt) : "-"}
          </span>
        </div>
      </InfoView>
    );
  }

  if (response.result === "NOT_SELECTED") {
    return (
      <InfoView
        title="이번 임장은 다른 분과 일정이 확정되었어요."
        description="다른 일정은 사무소에서 안내드릴게요. 이 링크는 발급일로부터 7일 동안 사용할 수 있습니다."
        onConfirm={retry}
      />
    );
  }

  return (
    <InfoView
      title="가능한 시간이 없다고 응답하셨습니다."
      description="사무소에서 새로운 일정을 안내드릴 예정입니다."
      onConfirm={retry}
    />
  );
}
