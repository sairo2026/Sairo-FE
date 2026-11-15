import { HttpResponse, type JsonBodyType } from "msw";
import { errorResponse } from "./error-responses";

type StoredResponse = { body: string; payload: JsonBodyType; status: number };

const stored = new Map<string, StoredResponse>();
const KEY_FORMAT = /^\S{1,100}$/;

export function resetMockIdempotency(): void {
  stored.clear();
}

/**
 * 등록 요청의 선택 헤더 Idempotency-Key를 API 명세서와 같게 흉내 낸다.
 * 같은 키와 같은 본문의 재요청은 처음 응답을 돌려주고, 같은 키에 다른 본문은 400 INVALID_REQUEST이다.
 * 성공한 응답만 저장한다.
 */
export async function withIdempotency(
  request: Request,
  kind: string,
  run: () => Promise<Response> | Response,
): Promise<Response> {
  const key = request.headers.get("Idempotency-Key");
  if (key === null) return run();
  if (!KEY_FORMAT.test(key)) {
    return errorResponse(400, "INVALID_REQUEST", "입력값을 확인해 주세요.", {
      fieldErrors: [{ field: "Idempotency-Key", code: "INVALID_FORMAT", message: "형식 오류" }],
    });
  }
  const body = await request.clone().text();
  const slot = `${kind}:${key}`;
  const previous = stored.get(slot);
  if (previous) {
    if (previous.body !== body) {
      return errorResponse(400, "INVALID_REQUEST", "입력값을 확인해 주세요.", {
        fieldErrors: [{ field: "Idempotency-Key", code: "NOT_ALLOWED", message: "다른 본문" }],
      });
    }
    return HttpResponse.json(previous.payload, { status: previous.status });
  }
  const response = await run();
  if (response.ok) {
    stored.set(slot, {
      body,
      payload: (await response.clone().json()) as JsonBodyType,
      status: response.status,
    });
  }
  return response;
}
