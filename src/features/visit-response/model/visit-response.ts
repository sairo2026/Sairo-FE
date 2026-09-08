import type { VisitResponseCandidateTime } from "../schemas/visit-response.schema";

export function formatDateHeading(isoString: string): string {
  const date = new Date(isoString);
  return `${date.getMonth() + 1}월 ${date.getDate()}일`;
}

export function formatTimeLabel(isoString: string): string {
  const date = new Date(isoString);
  const hours24 = date.getHours();
  const period = hours24 < 12 ? "오전" : "오후";
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${period} ${hours12}:${minutes}`;
}

export function formatCandidateLabel(isoString: string): string {
  return `${formatDateHeading(isoString)} ${formatTimeLabel(isoString)}`;
}

export type CandidateGroup = {
  dateHeading: string;
  candidates: VisitResponseCandidateTime[];
};

export function groupCandidatesByDate(
  candidateTimes: VisitResponseCandidateTime[],
): CandidateGroup[] {
  const sorted = [...candidateTimes].sort(
    (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
  );
  const groups: CandidateGroup[] = [];
  for (const candidate of sorted) {
    const heading = formatDateHeading(candidate.startsAt);
    const lastGroup = groups.at(-1);
    if (lastGroup && lastGroup.dateHeading === heading) {
      lastGroup.candidates.push(candidate);
    } else {
      groups.push({ dateHeading: heading, candidates: [candidate] });
    }
  }
  return groups;
}
