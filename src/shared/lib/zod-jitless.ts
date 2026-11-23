import { config } from "../../../node_modules/zod/v4/core/index.js";

// zod의 코드 생성 최적화는 new Function 탐지를 하므로 엄격한 CSP에서 위반으로 기록된다. 끄면 탐지도 건너뛴다.
config({ jitless: true });
