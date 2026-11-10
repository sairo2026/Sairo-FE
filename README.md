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

## 환경변수 예시

개발·테스트 환경에서 쓰는 값이다. 실제 키는 저장소에 넣지 않는다.

| 이름 | 설명 |
| --- | --- |
| `API_PROXY_TARGET` | 백엔드 주소. 기본값은 `http://localhost:8080` |
| `NEXT_PUBLIC_TOSS_CLIENT_KEY` | 결제대행사 개발자센터의 테스트 클라이언트 키(`test_ck_`로 시작). 비어 있으면 카드 등록창을 열지 않고 준비 중 안내를 보인다 |
| `COMING_SOON` | `true`면 출시 안내 화면으로 막는다. 운영 배포에서는 값이 없어도 켜진다 |
| `REVIEW_MODE` | `true`면 출시 안내가 켜진 배포에서도 로그인, 가입, 요금, 약관, 결제, 지원 경로와 API를 연다. 업무 화면은 계속 막고 기본값은 꺼짐이다 |

