/** 숫자 0~9를 우리말로 읽을 때 받침이 있는 숫자(영, 일, 삼, 육, 칠, 팔). */
const DIGITS_WITH_FINAL = "013678";

export function hasFinalConsonant(word: string): boolean {
  const last = word.trim().slice(-1);
  if (!last) return false;
  if (last >= "0" && last <= "9") return DIGITS_WITH_FINAL.includes(last);
  const code = last.charCodeAt(0);
  if (code < 0xac00 || code > 0xd7a3) return false;
  return (code - 0xac00) % 28 !== 0;
}

function isRieul(word: string): boolean {
  const last = word.trim().slice(-1);
  if (last === "1" || last === "7" || last === "8") return true;
  const code = last.charCodeAt(0);
  return code >= 0xac00 && code <= 0xd7a3 && (code - 0xac00) % 28 === 8;
}

export function objectParticle(word: string): string {
  return `${word}${hasFinalConsonant(word) ? "을" : "를"}`;
}

export function topicParticle(word: string): string {
  return `${word}${hasFinalConsonant(word) ? "은" : "는"}`;
}

export function subjectParticle(word: string): string {
  return `${word}${hasFinalConsonant(word) ? "이" : "가"}`;
}

export function instrumentalParticle(word: string): string {
  if (!hasFinalConsonant(word) || isRieul(word)) return `${word}로`;
  return `${word}으로`;
}
