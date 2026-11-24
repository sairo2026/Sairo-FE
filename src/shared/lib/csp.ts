export type CspMode = "enforce" | "report-only";

export const CSP_NONCE_HEADER = "x-nonce";

// 토스페이먼츠 카드 등록창이 쓰는 출처. 테스트 키로 등록창을 열어 측정했다.
// 측정값: SDK는 js.tosspayments.com, 로그·모니터링은 event/log.tosspayments.com,
// 세션 확인은 apigw-sandbox.tosspayments.com, 등록창 iframe은 payment-gateway-sandbox.tosspayments.com이다.
// 운영 키는 같은 이름의 sandbox 없는 호스트를 쓰므로 토스 소유 하위 도메인 전체를 연결·프레임에만 허용한다.
export const TOSS_SCRIPT_SOURCES: readonly string[] = ["https://js.tosspayments.com"];
export const TOSS_CONNECT_SOURCES: readonly string[] = ["https://*.tosspayments.com"];
export const TOSS_FRAME_SOURCES: readonly string[] = ["https://*.tosspayments.com"];

// 프록시를 거치지 않는 응답과 보고 전용 모드에서도 항상 강제하는 최소 기준선이다.
export const BASELINE_CONTENT_SECURITY_POLICY = [
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
].join("; ");

export function createNonce(): string {
  return btoa(crypto.randomUUID());
}

export function resolveCspMode(env: Readonly<Record<string, string | undefined>>): CspMode {
  // 기본은 강제다. 장애 시 CSP_MODE=report-only 환경변수를 넣고 다시 배포하면 코드 변경 없이 보고 전용으로 되돌아간다.
  return env.CSP_MODE === "report-only" ? "report-only" : "enforce";
}

export function buildContentSecurityPolicy(
  nonce: string,
  isDev: boolean,
  isHttpLoopback = false,
): string {
  const directives = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' ${TOSS_SCRIPT_SOURCES.join(" ")}${
      isDev ? " 'unsafe-eval'" : ""
    }`,
    // React가 style 속성을 쓰므로 스타일은 인라인을 허용한다. 스크립트 실행에는 영향이 없다.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data:",
    "font-src 'self'",
    `connect-src 'self' ${TOSS_CONNECT_SOURCES.join(" ")}`,
    `frame-src 'self' ${TOSS_FRAME_SOURCES.join(" ")}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(isDev || isHttpLoopback ? [] : ["upgrade-insecure-requests"]),
  ];
  return directives.map((d) => d.replace(/\s+/g, " ").trim()).join("; ");
}

export function cspHeaderName(mode: CspMode): string {
  return mode === "enforce" ? "Content-Security-Policy" : "Content-Security-Policy-Report-Only";
}
