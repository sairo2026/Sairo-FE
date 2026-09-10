import Link from "next/link";
import type { CoordinationPropertyErrorKind } from "../hooks/use-coordination-property";

export function CoordinationLoadError({
  kind,
  onRetry,
}: {
  kind: CoordinationPropertyErrorKind;
  onRetry: () => void;
}) {
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
          {kind === "forbidden" ? "이 매물에 접근할 권한이 없습니다." : "매물을 찾을 수 없습니다."}
        </p>
        <Link href="/properties" className="font-semibold text-[#3937b8] hover:underline">
          매물 목록으로
        </Link>
      </div>
    );
  }
  return (
    <div role="alert">
      <p className="mb-4 text-red-600">
        매물 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.
      </p>
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
