// zod가 스키마를 만들기 전에 jitless 설정이 먼저 실행되도록 zod 진입점을 대신한다. next.config.ts의 별칭이 가리킨다.
import "./zod-jitless";

export * from "../../../node_modules/zod/index.js";
export { z, default } from "../../../node_modules/zod/index.js";
