export type BillingAuthRequest = {
  customerKey: string;
  successUrl: string;
  failUrl: string;
};

/** 카드 등록창을 여는 포트. 실제 결제대행사 SDK와 테스트용 대역이 같은 형태를 따른다. */
export type BillingAuthLauncher = {
  isConfigured: () => boolean;
  requestBillingAuth: (request: BillingAuthRequest) => Promise<void>;
};

export class PaymentWidgetUnavailableError extends Error {
  constructor() {
    super("카드 등록창을 열 수 없습니다.");
    this.name = "PaymentWidgetUnavailableError";
  }
}

const SDK_URL = "https://js.tosspayments.com/v2/standard";

type TossPaymentHandle = {
  requestBillingAuth: (options: {
    method: "CARD";
    successUrl: string;
    failUrl: string;
  }) => Promise<void>;
};
type TossFactory = (clientKey: string) => {
  payment: (options: { customerKey: string }) => TossPaymentHandle;
};

declare global {
  interface Window {
    TossPayments?: TossFactory;
  }
}

function readClientKey(): string {
  return (process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY ?? "").trim();
}

function loadSdk(): Promise<TossFactory> {
  if (typeof window === "undefined") return Promise.reject(new PaymentWidgetUnavailableError());
  if (window.TossPayments) return Promise.resolve(window.TossPayments);
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SDK_URL;
    script.async = true;
    script.onload = () =>
      window.TossPayments
        ? resolve(window.TossPayments)
        : reject(new PaymentWidgetUnavailableError());
    script.onerror = () => reject(new PaymentWidgetUnavailableError());
    document.head.appendChild(script);
  });
}

/** 환경변수에 테스트 키가 있을 때만 동작한다. 키가 없으면 등록창을 열지 않는다. */
export const tossBillingAuthLauncher: BillingAuthLauncher = {
  isConfigured: () => readClientKey() !== "",
  async requestBillingAuth({ customerKey, successUrl, failUrl }) {
    const clientKey = readClientKey();
    if (clientKey === "") throw new PaymentWidgetUnavailableError();
    const factory = await loadSdk();
    await factory(clientKey).payment({ customerKey }).requestBillingAuth({
      method: "CARD",
      successUrl,
      failUrl,
    });
  },
};
