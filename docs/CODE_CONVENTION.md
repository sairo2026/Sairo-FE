# SAIRO 프론트엔드 코드 컨벤션

이 문서는 SAIRO 프론트엔드의 필수 구현·리뷰 기준이다. Next.js App Router와 React Server Components를 기본으로 하며, 기능 간 경계와 예측 가능한 데이터 흐름을 우선한다. 포맷은 Prettier, 코드 품질은 ESLint, 타입 안정성은 TypeScript가 검증한다.

## 1. 기본 원칙

- Server Component를 기본값으로 사용하고 브라우저 API·상태·이벤트가 필요한 경계에만 `"use client"`를 둔다.
- 라우팅은 `app`, 업무 코드는 `features`, 공통 기반은 `shared`에 둔다.
- 서버 상태, URL 상태, 폼 상태, UI 상태를 구분하고 하나의 전역 store에 섞지 않는다.
- API 응답을 컴포넌트 곳곳에서 임의 변환하지 않고 API 계층의 schema와 mapper에서 정규화한다.
- 타입 오류를 `any`, non-null assertion, 무분별한 type assertion으로 덮지 않는다.
- 추상화와 라이브러리는 실제 반복·복잡성이 생긴 뒤 도입한다.

## 2. 폴더 구조와 의존 방향

```text
src
├─ app
│  ├─ (public)
│  ├─ (member)
│  ├─ (office)
│  └─ api
├─ features
│  ├─ auth
│  │  ├─ api
│  │  ├─ components
│  │  ├─ hooks
│  │  ├─ model
│  │  ├─ schemas
│  │  └─ utils
│  ├─ office
│  ├─ property
│  └─ coordination
└─ shared
   ├─ api
   ├─ components
   ├─ hooks
   ├─ lib
   ├─ styles
   └─ types
```

- 의존 방향은 `shared → features → app`이다.
- feature끼리 직접 import하지 않는다. 함께 쓰는 개념은 `shared`로 승격하거나 상위 `app`에서 조합한다.
- `app`은 라우팅·layout·loading·error·페이지 조합을 담당하고 재사용 업무 로직을 소유하지 않는다.
- 각 feature는 공개 진입점만 export하고 다른 feature가 내부 파일 경로를 파고들지 않게 한다.
- Next.js의 route group과 private folder는 URL이 아니라 화면·권한 경계를 표현할 때 사용한다.

현재 루트 `app`은 초기 스캐폴드이므로 실제 기능 개발을 시작할 때 `src/app`으로 한 번에 이동한다. 구조가 없는 상태에서 빈 폴더만 미리 만들지는 않는다.

## 3. 파일과 이름

- 파일·폴더는 `kebab-case`, React 컴포넌트와 타입은 `PascalCase`, 함수·변수는 `camelCase`를 사용한다.
- Hook은 `use-*.ts`, schema는 `*.schema.ts`, API 함수는 `*.api.ts`, test는 `*.test.ts(x)`로 역할을 드러낸다.
- `index.ts` barrel은 feature 공개 API에만 제한한다. 모든 폴더에 만들지 않는다.
- boolean은 `is`, `has`, `can`, `should`로 시작한다.
- `data`, `info`, `util`, `common`, `handleClick` 같은 모호한 이름보다 도메인과 행위를 쓴다.

## 4. 컴포넌트

- 컴포넌트는 한 가지 UI 책임을 가진다. 데이터 취득·권한·복잡한 상태 전이·큰 JSX가 한 파일에 모이면 분리한다.
- 합성(composition)과 `children`을 우선하고 boolean prop 여러 개로 변형을 조합하지 않는다.
- 파생 가능한 값은 state로 저장하지 않는다. effect는 외부 시스템 동기화에만 사용한다.
- 이벤트 핸들러는 `handleSubmit`, 전달 prop은 `onSubmit`처럼 구분한다.
- 목록 key로 index를 쓰지 않는다. 데이터의 안정적인 식별자를 사용한다.
- `React.FC`를 일괄 강제하지 않는다. props 타입을 명시한 일반 함수를 기본으로 한다.
- 접근 가능한 HTML 요소와 label을 우선하고 div에 클릭 이벤트를 흉내 내지 않는다.
- 로딩·빈 상태·오류·권한 없음·재시도 UI를 정상 화면과 함께 설계한다.

## 5. Server와 Client 경계

- 페이지의 최초 데이터 조회와 민감한 서버 로직은 가능한 Server Component에서 수행한다.
- Client Component로 전달하는 props는 직렬화 가능해야 한다.
- `"use client"`는 트리 전체에 퍼뜨리지 않고 가장 작은 상호작용 컴포넌트에 둔다.
- 서버 전용 비밀값은 `NEXT_PUBLIC_`에 넣지 않는다. 공개 환경변수와 서버 환경변수를 구분한다.
- Route Handler와 Server Action에서도 인증·인가를 서버에서 다시 검증한다. UI 숨김은 보안 통제가 아니다.

## 6. API 계층과 매핑

- 공통 API client 한 곳에서 base URL, credentials, timeout, 공통 헤더와 오류 파싱을 처리한다.
- endpoint별 파일은 요청·응답 schema, fetch 함수, query/mutation hook을 함께 배치한다.
- 외부 JSON은 신뢰하지 않고 경계에서 schema로 검증한다. API DTO와 화면 model이 다르면 전용 mapper로 변환한다.
- 컴포넌트와 Hook 안에 반복적인 날짜·상태·nullable 매핑 로직을 넣지 않는다.
- mapper는 순수 함수로 작성하고 네트워크 요청·store 변경·toast 같은 부수효과를 넣지 않는다.
- 서버 응답의 `code`와 HTTP 상태를 함께 사용하고 문자열 메시지 비교로 오류를 분기하지 않는다.

## 7. TypeScript

- `strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`, `useUnknownInCatchVariables`를 유지한다.
- `any`와 non-null assertion(`!`)은 금지한다. 외부 입력은 `unknown`으로 받고 narrowing 또는 schema validation을 거친다.
- 객체 형태는 `type`을 기본으로 하고 선언 병합이나 확장이 필요한 공개 계약에만 `interface`를 사용한다.
- 타입 전용 import는 `import type`을 사용한다.
- 반복되는 문자열 상태는 union 또는 `as const` 객체로 정의한다. TypeScript `enum`은 런타임 객체가 꼭 필요할 때만 사용한다.
- type assertion은 검증을 대신하지 않는다. 불가피하면 경계 한 곳에 가두고 이유를 설명한다.
- API nullable과 optional을 구분한다. `null`과 `undefined`를 임의로 치환하지 않는다.

## 8. 상태 관리

- 서버 데이터는 서버 렌더링 또는 전용 server-state 도구로 관리하며 전역 UI store에 복사하지 않는다.
- 검색·필터·페이지처럼 공유·복원되어야 하는 상태는 URL을 우선한다.
- 폼은 폼 내부에, 단일 컴포넌트 상태는 가장 가까운 컴포넌트에 둔다.
- 전역 상태는 로그인 사용자 표시, 전역 modal처럼 실제로 여러 feature가 공유하는 client 상태에만 사용한다.
- 상태 관리 라이브러리는 요구가 생긴 뒤 선택한다. 현재 문서는 특정 라이브러리를 선제 설치하지 않는다.

## 9. 오류 처리와 사용자 경험

- `app/error.tsx`, `not-found.tsx`, feature 수준 error boundary를 책임 범위에 맞게 둔다.
- 401은 인증 복구, 403은 권한 안내, 404는 대상 없음, 409는 충돌 해결, 429는 재시도 안내로 구분한다.
- 예상 가능한 업무 오류는 사용자 행동으로 해결할 수 있는 문구를 보여주고, 예상하지 못한 오류는 추적 ID와 일반 안내를 제공한다.
- 서버의 내부 메시지·stack·민감정보를 그대로 화면이나 console에 노출하지 않는다.
- toast만으로 중요한 오류를 끝내지 않고 해당 폼·영역에도 오류 상태를 표시한다.

## 10. 스타일과 접근성

- Tailwind utility 순서 때문에 수동 논쟁하지 않는다. 필요성이 확인되면 공식 Prettier plugin을 별도 Issue로 도입한다.
- 색상·간격·타이포그래피는 design token을 사용하고 임의 숫자·색상을 반복하지 않는다.
- 모바일 우선으로 작성하고 keyboard focus, contrast, reduced motion을 확인한다.
- 이미지에는 목적에 맞는 alt를 제공하고 장식 이미지는 빈 alt를 사용한다.
- 모달은 focus trap, ESC, focus 복귀를 지원한다.

## 11. 테스트

- 순수 변환·검증은 단위 테스트, feature 흐름은 Testing Library 통합 테스트, 핵심 사용자 여정은 Playwright E2E로 검증한다.
- 구현 상세나 내부 state가 아니라 사용자가 보는 결과와 접근 가능한 role·label을 기준으로 테스트한다.
- API 테스트는 실제 fetch 흐름을 MSW로 가로채고 Hook 자체를 무리하게 mock하지 않는다.
- 인증 진입, 사무소 승인, 매물·계약·조율의 핵심 흐름은 성공·오류·재시도를 함께 검증한다.
- 테스트 도구는 실제 기능 구현 Issue에서 필요한 최소 세트로 추가한다.

## 12. 주석, 로그와 보안

- 코드 내용을 번역하는 주석은 쓰지 않는다. 우회 이유·브라우저 제약·업무 규칙처럼 코드만으로 알 수 없는 이유만 남긴다.
- `TODO`에는 Issue 번호를 붙이고 주석 처리한 코드를 보관하지 않는다.
- 운영 코드에 임시 `console.log`를 남기지 않는다.
- `dangerouslySetInnerHTML`은 원칙적으로 금지하며 필요한 경우 검증된 sanitizer와 리뷰 근거가 있어야 한다.
- 인증 토큰·개인정보를 localStorage, 로그, analytics payload에 임의 저장하지 않는다.

## 13. 자동 검증과 PR 체크리스트

```shell
npm run format
npm run check
```

`npm run check`는 포맷, ESLint, TypeScript, production build를 모두 검증한다.

PR에서는 다음을 확인한다.

- Server/Client 경계가 필요한 최소 범위인가?
- feature 간 직접 의존과 깊은 내부 import가 없는가?
- API schema·mapper와 UI model의 책임이 분리됐는가?
- loading·empty·error·권한·모바일·keyboard 상태를 처리했는가?
- `any`, non-null assertion, 불필요한 effect·전역 state·주석이 없는가?
- 사용자 입력과 서버 응답을 신뢰하지 않고 경계에서 검증하는가?

## 14. 기준 자료

- Next.js App Router 공식 문서: route·layout·Server/Client Component·colocation
- React 공식 문서: 순수 컴포넌트, state 구조, effect와 합성
- TypeScript 및 typescript-eslint 공식 strict 규칙
- Prettier 공식 지침: 포맷과 lint 책임 분리
- Bulletproof React: feature-first 구조, 단방향 의존, API 선언·server state 분리

참고 저장소의 규칙을 그대로 복사하지 않고 SAIRO의 Next.js 16·React 19·App Router 구조에 맞게 이 문서로 확정한다. 충돌 시 이 문서가 저장소의 기준이다.
