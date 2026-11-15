const SENTENCE_GAP = /([.!?])[ \t]+(?=\S)/g;

/**
 * 문장이 minSentences개 이상인 안내문은 문장 끝마다 줄을 바꾼다.
 * 줄바꿈 문자만 넣으므로 글 내용은 그대로이고, 보이는 쪽은 whitespace-pre-line 이어야 한다.
 */
export function breakSentences(text: string, minSentences = 3): string {
  const gaps = text.match(SENTENCE_GAP);
  if (!gaps || gaps.length + 1 < minSentences) return text;
  return text.replace(SENTENCE_GAP, "$1\n");
}

/** 문자열 또는 문자열 조각 배열로 된 children에만 문장 줄바꿈을 적용한다. */
export function breakSentencesIn<T>(children: T): T | string {
  if (typeof children === "string") return breakSentences(children);
  if (Array.isArray(children) && children.every((item) => typeof item === "string")) {
    return breakSentences(children.join(""));
  }
  return children;
}
