/** 서버가 거절하는 HTML 표식과 같은 규칙이다. 저장 전에 미리 알려 준다. */
const HTML_MARKUP = /<\s*[/!?]?\s*[a-zA-Z]|<\s*[/!?]/;

export const HTML_MARKUP_MESSAGE = "특수한 태그 문자는 쓸 수 없습니다. 일반 글자로 입력해 주세요.";

export function htmlMarkupError(value: string): string | undefined {
  return HTML_MARKUP.test(value) ? HTML_MARKUP_MESSAGE : undefined;
}
