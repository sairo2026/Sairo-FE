# Sairo FE

사이로 프론트엔드 레포입니다.

## 스택

- Next.js (App Router)
- TypeScript
- Tailwind CSS
- TanStack Query (서버 상태)
- React Hook Form과 zod (폼 입력과 응답 검증)
- MSW (모의 API)

## 모의 API

환경변수 `NEXT_PUBLIC_API_MOCKING=enabled`로 개발 서버를 실행하면 브라우저에서 모의 API가 `/api` 호출에 응답한다. 핸들러는 `src/mocks/handlers`에 있고 테스트는 `src/mocks/server.ts`의 `startMockServer`를 쓴다. 오류 응답 형식 도우미는 `src/mocks/error-responses.ts`에 있다.

## 계약 타입 생성

`src/lib/api/contracts`의 `*.schema.ts`는 API 명세서 markdown의 DTO 필드 표에서 생성한다. 직접 고치지 않는다.

```shell
npm run generate:contracts -- --spec <API 명세서 markdown 경로> --area common --area auth
```

영역은 `scripts/contracts/areas.mjs`에 정의한다. 새 영역은 그 파일에 DTO 선택 규칙을 추가한 뒤 같은 명령으로 생성한다.
