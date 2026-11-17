/** 매물·고객 목록의 정렬 선택지다. 값은 서버가 받는 "키,방향" 형식이다. */
export const LIST_SORT_OPTIONS = [
  { value: "", label: "최근 수정순" },
  { value: "createdAt,desc", label: "최근 등록순" },
  { value: "createdAt,asc", label: "오래된 등록순" },
  { value: "name,asc", label: "이름 가나다순" },
  { value: "name,desc", label: "이름 역순" },
] as const;
