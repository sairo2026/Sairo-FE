export function hasFinalConsonant(word: string): boolean {
  const last = word.trim().slice(-1);
  if (!last) return false;
  const code = last.charCodeAt(0);
  if (code < 0xac00 || code > 0xd7a3) return false;
  return (code - 0xac00) % 28 !== 0;
}

export function objectParticle(word: string): string {
  return `${word}${hasFinalConsonant(word) ? "을" : "를"}`;
}

export function topicParticle(word: string): string {
  return `${word}${hasFinalConsonant(word) ? "은" : "는"}`;
}
