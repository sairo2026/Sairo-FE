import { cn } from "@/shared/lib/cn";

export const COORDINATION_STEPS = [
  "고객·매물 선택",
  "출입 승인·시간",
  "고객 시간 수집",
  "일정 구성",
  "최종 확정",
] as const;

/**
 * 조율 상태를 5단계 진행 위치(0부터)로 바꾼다. 끝난 조율은 5(모두 완료), 보여줄 단계가 없는 상태는 null이다.
 * 출입 승인은 조율을 만든 뒤 시간 수집 전에 마치므로 시간 수집 중부터 완료로 본다.
 */
export function coordinationStepIndex(status: string): number | null {
  switch (status) {
    case "TIME_COLLECTING":
      return 2;
    case "COORDINATABLE":
    case "RESCHEDULE_REQUIRED":
      return 3;
    case "FINAL_CONFIRMATION_REQUIRED":
    case "APPLYING":
      return 4;
    case "CONFIRMED":
    case "VISIT_COMPLETED":
      return COORDINATION_STEPS.length;
    default:
      return null;
  }
}

/** 방문 조율 진행 단계 표시. 현재 단계는 aria-current로 알리고 색만으로 구분하지 않는다. */
export function CoordinationStepper({ current }: { current: number }) {
  return (
    <ol aria-label="조율 진행 단계" className="flex flex-wrap items-center gap-x-3 gap-y-2">
      {COORDINATION_STEPS.map((label, index) => {
        const isCurrent = index === current;
        const isDone = index < current;
        return (
          <li key={label} aria-current={isCurrent ? "step" : undefined} className="contents">
            {index > 0 ? <span aria-hidden className="h-px w-8 bg-line" /> : null}
            <span className="flex items-center gap-2">
              <span
                aria-hidden
                className={cn(
                  "flex size-6 items-center justify-center rounded-full border text-[12px] font-semibold",
                  isCurrent
                    ? "border-primary bg-primary text-white"
                    : isDone
                      ? "border-primary bg-primary-soft text-primary"
                      : "border-line bg-surface text-ink-2",
                )}
              >
                {isDone ? "✓" : index + 1}
              </span>
              <span
                className={cn(
                  "text-caption",
                  isCurrent
                    ? "font-semibold text-primary"
                    : isDone
                      ? "font-medium text-ink-2"
                      : "font-medium text-muted",
                )}
              >
                {label}
                {isDone ? <span className="sr-only"> 완료</span> : null}
              </span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
