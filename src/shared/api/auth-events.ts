import type { ApiError } from "./api-error";

export type ApiAuthEvent =
  { type: "session-expired"; error: ApiError } | { type: "reconsent-required"; error: ApiError };

type Listener = (event: ApiAuthEvent) => void;

const listeners = new Set<Listener>();

export function subscribeApiAuthEvents(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function emitApiAuthEvent(event: ApiAuthEvent): void {
  for (const listener of [...listeners]) listener(event);
}

/** 재인증이 필요한 요청이 401을 받았을 때 재인증을 진행하고 성공 여부를 돌려주는 함수. */
export type StepUpHandler = () => Promise<boolean>;

let stepUpHandler: StepUpHandler | null = null;

export function setStepUpHandler(handler: StepUpHandler | null): void {
  stepUpHandler = handler;
}

export function getStepUpHandler(): StepUpHandler | null {
  return stepUpHandler;
}

const stepUpCompletedListeners = new Set<() => void>();

export function subscribeStepUpCompleted(listener: () => void): () => void {
  stepUpCompletedListeners.add(listener);
  return () => {
    stepUpCompletedListeners.delete(listener);
  };
}

export function emitStepUpCompleted(): void {
  for (const listener of [...stepUpCompletedListeners]) listener();
}
