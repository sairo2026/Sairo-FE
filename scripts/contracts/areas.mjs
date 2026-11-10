const AUTH_PATH_PREFIXES = [
  "/api/auth/",
  "/api/me",
  "/api/terms",
  "/api/public/marketing-unsubscribe",
  "/api/webhooks/kakao/",
];

const OPS_SESSION_DTO_NAMES = ["OpsMeResponse", "OpsMfaVerifyRequest", "OpsStepUpRequest"];

const COMMON_DTO_NAMES = ["AuthContextResponse", "CurrentSessionResponse"];

function startsWithAny(path, prefixes) {
  return prefixes.some((prefix) => path === prefix || path.startsWith(prefix));
}

function isAuthDto(dto) {
  return (
    dto.apis.length > 0 && dto.apis.every((api) => startsWithAny(api.path, AUTH_PATH_PREFIXES))
  );
}

export const AREAS = {
  common: {
    description: "접근 상태와 세션 응답",
    select: (dto) => COMMON_DTO_NAMES.includes(dto.name),
  },
  "ops-session": {
    description: "운영 콘솔 세션 확인과 재인증",
    select: (dto) => OPS_SESSION_DTO_NAMES.includes(dto.name),
  },
  auth: {
    description: "인증·계정 도메인",
    select: (dto) => !COMMON_DTO_NAMES.includes(dto.name) && isAuthDto(dto),
  },
};

export function selectAreaDtos(dtos, areaName) {
  const area = AREAS[areaName];
  if (!area) {
    throw new Error(
      `알 수 없는 영역: ${areaName}. 사용 가능한 영역: ${Object.keys(AREAS).join(", ")}`,
    );
  }
  return [...dtos.values()].filter((dto) => area.select(dto));
}

export const ENUM_HINTS = {
  "AuthContextResponse.role": ["OWNER", "AGENT", "DEPUTY"],
};
