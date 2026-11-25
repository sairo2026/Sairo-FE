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

| 이름                          | 설명                                                                                                                                 |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `API_PROXY_TARGET`            | 백엔드 주소. 기본값은 `http://localhost:8080`                                                                                        |
| `NEXT_PUBLIC_TOSS_CLIENT_KEY` | 결제대행사 개발자센터의 테스트 클라이언트 키(`test_ck_`로 시작). 비어 있으면 카드 등록창을 열지 않고 준비 중 안내를 보인다           |
| `COMING_SOON`                 | `true`면 출시 안내 화면으로 막는다. 운영 배포에서는 값이 없어도 켜진다                                                               |
| `REVIEW_MODE`                 | `true`면 출시 안내가 켜진 배포에서도 로그인, 가입, 요금, 약관, 결제, 지원 경로와 API를 연다. 업무 화면은 계속 막고 기본값은 꺼짐이다 |

## 브라우저 시험

`e2e/`의 Playwright 시험은 모의 API를 켠 운영 빌드(`NEXT_PUBLIC_API_MOCKING=enabled npm run build` 뒤 `npm run start`) 위에서 돈다. 반응형 점검은 모든 화면을 모바일 폭과 데스크톱 폭에서 열어 가로 넘침과 포인터 대상 크기를 검사한다. `e2e/scenarios/`는 개발플로우의 필수 시나리오를 데스크톱 폭에서 화면 흐름으로 재현한다. 모의 API 상태는 페이지 메모리에 있으므로 한 시나리오 안에서는 클라이언트 이동(`e2e/support/scenario.ts`의 `clientNavigate`)으로 상태를 이어 가고, 모의 응답이 없어 재현할 수 없는 단계는 `test.fixme`로 이름을 남긴다. 브라우저 설치와 실행은 CI의 `e2e` 작업이 맡고 로컬에서는 `npx playwright install chromium` 뒤 `npm run e2e`로 돌릴 수 있다.

## PDF 글꼴 및 라이선스

무료 프로모션 이용내역서 PDF는 [Pretendard 공식 저장소의 alternative TTF](https://github.com/orioncactus/pretendard/blob/main/packages/pretendard/dist/public/static/alternative/Pretendard-Regular.ttf)를 사용한다. 글꼴은 PDF 다운로드 시에만 불러오고 문서에 사용한 글리프만 포함한다. 아래는 동봉된 SIL OFL 1.1 전문이다.

```text
Copyright (c) 2021, Kil Hyung-jin (https://github.com/orioncactus/pretendard),
with Reserved Font Name 'Pretendard'.

Copyright 2014-2021 Adobe (http://www.adobe.com/),
with Reserved Font Name 'Source'.
Source is a trademark of Adobe in the United States and/or other countries.

Copyright (c) 2016 The Inter Project Authors (https://github.com/rsms/inter),
with Reserved Font Name 'Inter'.

Copyright 2021 The M+ FONTS Project Authors (https://github.com/coz-m/MPLUS_FONTS),
with Reserved Font Name 'M PLUS 1'.

This Font Software is licensed under the SIL Open Font License, Version 1.1.
This license is copied below, and is also available with a FAQ at:
https://scripts.sil.org/OFL


-----------------------------------------------------------
SIL OPEN FONT LICENSE Version 1.1 - 26 February 2007
-----------------------------------------------------------

PREAMBLE
The goals of the Open Font License (OFL) are to stimulate worldwide
development of collaborative font projects, to support the font creation
efforts of academic and linguistic communities, and to provide a free and
open framework in which fonts may be shared and improved in partnership
with others.

The OFL allows the licensed fonts to be used, studied, modified and
redistributed freely as long as they are not sold by themselves. The
fonts, including any derivative works, can be bundled, embedded, 
redistributed and/or sold with any software provided that any reserved
names are not used by derivative works. The fonts and derivatives,
however, cannot be released under any other type of license. The
requirement for fonts to remain under this license does not apply
to any document created using the fonts or their derivatives.

DEFINITIONS
"Font Software" refers to the set of files released by the Copyright
Holder(s) under this license and clearly marked as such. This may
include source files, build scripts and documentation.

"Reserved Font Name" refers to any names specified as such after the
copyright statement(s).

"Original Version" refers to the collection of Font Software components as
distributed by the Copyright Holder(s).

"Modified Version" refers to any derivative made by adding to, deleting,
or substituting -- in part or in whole -- any of the components of the
Original Version, by changing formats or by porting the Font Software to a
new environment.

"Author" refers to any designer, engineer, programmer, technical
writer or other person who contributed to the Font Software.

PERMISSION & CONDITIONS
Permission is hereby granted, free of charge, to any person obtaining
a copy of the Font Software, to use, study, copy, merge, embed, modify,
redistribute, and sell modified and unmodified copies of the Font
Software, subject to the following conditions:

1) Neither the Font Software nor any of its individual components,
in Original or Modified Versions, may be sold by itself.

2) Original or Modified Versions of the Font Software may be bundled,
redistributed and/or sold with any software, provided that each copy
contains the above copyright notice and this license. These can be
included either as stand-alone text files, human-readable headers or
in the appropriate machine-readable metadata fields within text or
binary files as long as those fields can be easily viewed by the user.

3) No Modified Version of the Font Software may use the Reserved Font
Name(s) unless explicit written permission is granted by the corresponding
Copyright Holder. This restriction only applies to the primary font name as
presented to the users.

4) The name(s) of the Copyright Holder(s) or the Author(s) of the Font
Software shall not be used to promote, endorse or advertise any
Modified Version, except to acknowledge the contribution(s) of the
Copyright Holder(s) and the Author(s) or with their explicit written
permission.

5) The Font Software, modified or unmodified, in part or in whole,
must be distributed entirely under this license, and must not be
distributed under any other license. The requirement for fonts to
remain under this license does not apply to any document created
using the Font Software.

TERMINATION
This license becomes null and void if any of the above conditions are
not met.

DISCLAIMER
THE FONT SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO ANY WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT
OF COPYRIGHT, PATENT, TRADEMARK, OR OTHER RIGHT. IN NO EVENT SHALL THE
COPYRIGHT HOLDER BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
INCLUDING ANY GENERAL, SPECIAL, INDIRECT, INCIDENTAL, OR CONSEQUENTIAL
DAMAGES, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF THE USE OR INABILITY TO USE THE FONT SOFTWARE OR FROM
OTHER DEALINGS IN THE FONT SOFTWARE.

```

