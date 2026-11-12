/** 서버 토큰은 base64url 두 덩어리를 점으로 잇고 길이는 512자 이하다. */
const TOKEN_PATTERN = /^[A-Za-z0-9_.-]{16,512}$/;

/**
 * 고객·승인자 링크 주소의 토큰 형식만 확인한다. 토큰은 로그·화면·분석 도구에 남기지 않는다.
 * 형식이 맞지 않으면 서버에 묻지 않고 무효 링크로 처리한다.
 */
export function normalizeLinkToken(raw: string | undefined): string | null {
  if (raw === undefined) return null;
  let decoded: string;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    return null;
  }
  const token = decoded.trim();
  return TOKEN_PATTERN.test(token) ? token : null;
}
