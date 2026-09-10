import Link from "next/link";

export type EntityLoadErrorKind = "unauthenticated" | "forbidden" | "not-found" | "unknown";

type EntityLoadErrorProps = {
  kind: EntityLoadErrorKind;
  onRetry: () => void;
  forbiddenMessage: string;
  notFoundMessage: string;
  backHref: string;
  backLabel: string;
};

export function EntityLoadError({
  kind,
  onRetry,
  forbiddenMessage,
  notFoundMessage,
  backHref,
  backLabel,
}: EntityLoadErrorProps) {
  if (kind === "unauthenticated") {
    return (
      <div role="alert">
        <p className="mb-4 text-red-600">로그인이 필요합니다.</p>
        <Link href="/login" className="font-semibold text-[#3937b8] hover:underline">
          로그인하러 가기
        </Link>
      </div>
    );
  }
  if (kind === "forbidden" || kind === "not-found") {
    return (
      <div role="alert">
        <p className="mb-4 text-red-600">
          {kind === "forbidden" ? forbiddenMessage : notFoundMessage}
        </p>
        <Link href={backHref} className="font-semibold text-[#3937b8] hover:underline">
          {backLabel}
        </Link>
      </div>
    );
  }
  return (
    <div role="alert">
      <p className="mb-4 text-red-600">정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.</p>
      <button
        type="button"
        onClick={onRetry}
        className="font-semibold text-[#3937b8] hover:underline"
      >
        다시 시도
      </button>
    </div>
  );
}
