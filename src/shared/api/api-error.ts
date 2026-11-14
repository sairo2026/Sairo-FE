import { API_ERROR_CODES } from "@/lib/api/contracts/errors";
import type { ApiErrorBody, FieldError } from "@/lib/api/contracts/errors";

export type FieldErrorItem = FieldError;

export type ApiErrorInput = Omit<ApiErrorBody, "traceId"> & { traceId?: string };

/** 서버가 돌려준 오류 응답. 상태별 선택 필드는 `details`와 편의 getter로 읽는다. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly traceId: string;
  readonly requestId?: string;
  readonly fieldErrors?: FieldError[];
  readonly details: ApiErrorInput;

  constructor(status: number, body: ApiErrorInput, requestId?: string) {
    super(body.message);
    this.name = "ApiError";
    this.status = status;
    this.code = body.code;
    this.traceId = body.traceId ?? "";
    this.requestId = requestId;
    this.fieldErrors = body.fieldErrors;
    this.details = body;
  }

  get retryAfterSeconds(): number | undefined {
    return this.details.retryAfterSeconds;
  }

  get actionUrl(): string | undefined {
    return this.details.actionUrl ?? undefined;
  }

  get remainingAttempts(): number | undefined {
    return this.details.remainingAttempts;
  }

  get currentVersion(): number | undefined {
    return this.details.currentVersion;
  }

  get isSessionExpired(): boolean {
    return this.status === 401 && this.code === API_ERROR_CODES.unauthenticated;
  }

  get isStepUpRequired(): boolean {
    return this.status === 401 && this.code === API_ERROR_CODES.stepUpRequired;
  }

  get isReconsentRequired(): boolean {
    return this.status === 403 && this.code === API_ERROR_CODES.reconsentRequired;
  }

  get isRateLimited(): boolean {
    return this.status === 429;
  }
}

export type NetworkErrorKind = "timeout" | "offline" | "network" | "aborted";

const NETWORK_ERROR_MESSAGES: Record<NetworkErrorKind, string> = {
  timeout: "서버 응답이 지연되고 있습니다.",
  offline: "인터넷 연결을 확인해 주세요.",
  network: "서버에 연결하지 못했습니다.",
  aborted: "요청이 취소되었습니다.",
};

/** 서버 응답을 받지 못한 오류. 시간 초과, 오프라인, 호출자의 취소를 구분한다. */
export class ApiNetworkError extends Error {
  readonly kind: NetworkErrorKind;
  readonly requestId?: string;

  constructor(kind: NetworkErrorKind, requestId?: string) {
    super(NETWORK_ERROR_MESSAGES[kind]);
    this.name = "ApiNetworkError";
    this.kind = kind;
    this.requestId = requestId;
  }
}

/** 응답 본문이 계약 스키마와 맞지 않을 때 던진다. */
export class ApiContractError extends Error {
  readonly path: string;
  readonly issues: string[];

  constructor(path: string, issues: string[]) {
    super("서버 응답 형식이 계약과 다릅니다.");
    this.name = "ApiContractError";
    this.path = path;
    this.issues = issues;
  }
}
