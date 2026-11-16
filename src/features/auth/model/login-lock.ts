/** BE의 이메일 로그인 실패 제한(5회 실패 시 15분 잠금)과 같은 값이다. */
export const LOGIN_FAILURE_LIMIT = 5;
export const LOGIN_LOCK_MINUTES = 15;

export const LOGIN_LOCK_NOTICE = `${LOGIN_FAILURE_LIMIT}회 불일치 시 ${LOGIN_LOCK_MINUTES}분 뒤 다시 시도할 수 있습니다.`;

/** 이메일 또는 비밀번호가 맞지 않을 때 입력 칸 아래에 보이는 문구다. 가입 여부를 드러내지 않는다. */
export const LOGIN_MISMATCH_COPY = `이메일 또는 비밀번호가 맞지 않습니다. ${LOGIN_LOCK_NOTICE}`;

export const LOGIN_LOCKED_LEAD = `로그인에 ${LOGIN_FAILURE_LIMIT}회 실패해 잠시 막았습니다.`;
