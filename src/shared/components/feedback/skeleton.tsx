import { cn } from "@/shared/lib/cn";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("animate-pulse rounded-control bg-primary-soft", className)} />
  );
}

/** 화면 전체를 불러오는 동안 보여준다. 스크린 리더에는 한 번만 알린다. */
export function PageSkeleton({ label = "불러오는 중입니다." }: { label?: string }) {
  return (
    <div role="status" aria-busy="true" className="flex flex-col gap-4 px-4 py-8">
      <span className="sr-only">{label}</span>
      <Skeleton className="h-9 w-1/3" />
      <Skeleton className="h-5 w-2/3" />
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-40 w-full" />
    </div>
  );
}

export function ListSkeleton({
  rows = 5,
  label = "목록을 불러오는 중입니다.",
}: {
  rows?: number;
  label?: string;
}) {
  return (
    <div role="status" aria-busy="true" className="flex flex-col gap-3">
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} className="h-14 w-full" />
      ))}
    </div>
  );
}
