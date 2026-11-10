import { setupServer } from "msw/node";
import { handlers } from "./handlers";

export const server = setupServer(...handlers);

const FALLBACK_ORIGIN = "http://localhost";

/**
 * 테스트에서 모의 서버를 켠다. 브라우저와 같은 상대 경로 호출이 동작하도록 fetch가 기준 주소를 붙이게 한다.
 * 돌려주는 함수로 원래 상태를 되돌린다.
 */
export function startMockServer(): () => void {
  const origin = typeof location === "undefined" ? FALLBACK_ORIGIN : location.origin;
  server.listen({ onUnhandledFrame: "error" });
  const mockedFetch = globalThis.fetch;
  globalThis.fetch = (input, init) =>
    mockedFetch(typeof input === "string" && input.startsWith("/") ? origin + input : input, init);
  return () => {
    globalThis.fetch = mockedFetch;
    server.close();
  };
}
