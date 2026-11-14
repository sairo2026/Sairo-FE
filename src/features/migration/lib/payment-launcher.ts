export type PaymentRequest = {
  customerKey: string;
  orderId: string;
  orderName: string;
  amount: number;
  successUrl: string;
  failUrl: string;
};

export type PaymentLauncher = {
  isConfigured: () => boolean;
  requestPayment: (request: PaymentRequest) => Promise<void>;
};

export class PaymentUnavailableError extends Error {
  constructor() {
    super("결제창을 열 수 없습니다.");
    this.name = "PaymentUnavailableError";
  }
}

const SDK_URL = "https://js.tosspayments.com/v2/standard";

type TossPaymentHandle = {
  requestPayment: (options: {
    method: "CARD";
    amount: { currency: "KRW"; value: number };
    orderId: string;
    orderName: string;
    successUrl: string;
    failUrl: string;
  }) => Promise<void>;
};
type TossFactory = (clientKey: string) => {
  payment: (options: { customerKey: string }) => TossPaymentHandle;
};

type TossWindow = { TossPayments?: TossFactory };

/** 결제 SDK가 전역에 올려 두는 값이라 한 곳에서만 형을 좁혀 읽는다. */
function readSdk(): TossFactory | undefined {
  return (window as unknown as TossWindow).TossPayments;
}

function readClientKey(): string {
  return (process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY ?? "").trim();
}

function loadSdk(): Promise<TossFactory> {
  if (typeof window === "undefined") return Promise.reject(new PaymentUnavailableError());
  const existing = readSdk();
  if (existing) return Promise.resolve(existing);
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SDK_URL;
    script.async = true;
    script.onload = () => {
      const loaded = readSdk();
      if (loaded) resolve(loaded);
      else reject(new PaymentUnavailableError());
    };
    script.onerror = () => reject(new PaymentUnavailableError());
    document.head.appendChild(script);
  });
}

export const tossPaymentLauncher: PaymentLauncher = {
  isConfigured: () => readClientKey() !== "",
  async requestPayment({ customerKey, orderId, orderName, amount, successUrl, failUrl }) {
    const clientKey = readClientKey();
    if (clientKey === "") throw new PaymentUnavailableError();
    const factory = await loadSdk();
    await factory(clientKey)
      .payment({ customerKey })
      .requestPayment({
        method: "CARD",
        amount: { currency: "KRW", value: amount },
        orderId,
        orderName,
        successUrl,
        failUrl,
      });
  },
};
