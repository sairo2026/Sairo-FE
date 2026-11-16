const ISSUER_NAMES: Record<string, string> = {
  "11": "KB국민카드",
  "15": "카카오뱅크",
  "21": "하나카드",
  "24": "토스뱅크",
  "30": "한국산업은행",
  "31": "BC카드",
  "33": "우리BC카드",
  "34": "Sh수협은행",
  "35": "전북은행",
  "36": "씨티카드",
  "37": "우체국예금보험",
  "38": "새마을금고",
  "39": "저축은행중앙회",
  "3A": "케이뱅크",
  "3C": "유니온페이",
  "3K": "기업비씨",
  "41": "신한카드",
  "42": "제주은행",
  "46": "광주은행",
  "4J": "JCB",
  "4M": "마스터카드",
  "4V": "비자",
  "51": "삼성카드",
  "61": "현대카드",
  "62": "신협",
  "6D": "다이너스클럽",
  "71": "롯데카드",
  "7A": "아메리칸 익스프레스",
  "91": "NH농협카드",
  W1: "우리카드",
};

const ISSUER_CODE_PATTERN = /^[0-9A-Za-z]{2}$/;

/** 서버가 주는 발급사 값(토스 issuerCode 또는 이미 이름)을 화면용 이름으로 바꾼다. 모르는 코드는 "카드"로 표시한다. */
export function cardIssuerName(raw: string | null | undefined): string {
  const value = raw?.trim();
  if (!value) return "카드";
  if (ISSUER_CODE_PATTERN.test(value)) return ISSUER_NAMES[value.toUpperCase()] ?? "카드";
  return value;
}

/** 결제수단 표시 한 줄. 예: "토스뱅크 끝자리 0000" */
export function cardLabel(
  issuer: string | null | undefined,
  last4: string | null | undefined,
): string {
  return `${cardIssuerName(issuer)} 끝자리 ${last4 ?? "----"}`;
}
