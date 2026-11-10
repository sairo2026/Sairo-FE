import type { HomeSummaryResponse } from "@/lib/api/contracts/work.schema";
import { cn } from "@/shared/lib/cn";

type Day = HomeSummaryResponse["calendarDays"][number];

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"] as const;

function seoulToday(): { year: number; month: number; date: number } {
  const shifted = new Date(Date.now() + 9 * 3_600_000);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    date: shifted.getUTCDate(),
  };
}

/** 한 달 달력 칸. 앞쪽 빈칸은 null이다. */
export function buildMonthCells(year: number, month: number): Array<number | null> {
  const first = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const cells: Array<number | null> = Array.from({ length: first }, () => null);
  for (let day = 1; day <= last; day += 1) cells.push(day);
  return cells;
}

export function MiniCalendar({ days }: { days: Day[] }) {
  const today = seoulToday();
  const cells = buildMonthCells(today.year, today.month);
  const prefix = `${today.year}-${String(today.month).padStart(2, "0")}-`;
  const byDay = new Map(days.map((day) => [day.date, day]));
  return (
    <div>
      <p className="mb-3 text-caption font-semibold text-ink-2">
        {today.year}년 {today.month}월
      </p>
      <div role="grid" aria-label="이번 달 일정" className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS.map((weekday) => (
          <span key={weekday} role="columnheader" className="text-caption text-ink-3">
            {weekday}
          </span>
        ))}
        {cells.map((day, index) => {
          if (day === null) return <span key={`blank-${index}`} role="gridcell" />;
          const info = byDay.get(`${prefix}${String(day).padStart(2, "0")}`);
          const label = info
            ? `${today.month}월 ${day}일 방문 ${info.visitCount}건 업무 ${info.taskCount}건`
            : `${today.month}월 ${day}일 일정 없음`;
          return (
            <span
              key={day}
              role="gridcell"
              aria-label={label}
              className={cn(
                "flex min-h-12 flex-col items-center rounded-control py-1 text-caption",
                day === today.date ? "bg-primary-soft font-bold text-primary" : "text-ink",
              )}
            >
              {day}
              {info ? (
                <span className="text-[11px] leading-tight text-ink-2">
                  {info.visitCount > 0 ? `방${info.visitCount}` : ""}
                  {info.taskCount > 0 ? ` 업${info.taskCount}` : ""}
                </span>
              ) : null}
            </span>
          );
        })}
      </div>
    </div>
  );
}
