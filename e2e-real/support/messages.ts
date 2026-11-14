import { expect, type APIRequestContext } from "@playwright/test";
import { API_ORIGIN, requireEnv } from "./env";

type Captured = { body: string; to?: string; toPhone?: string };

export async function capturedMessage(
  request: APIRequestContext,
  type: "mail" | "sms",
  recipient: string,
  options: { match?: RegExp } = {},
): Promise<Captured> {
  const token = requireEnv("E2E_FIXTURE_TOKEN");
  const parameter = type === "mail" ? "to" : "toPhone";
  const url = `${API_ORIGIN}/api/__e2e/messages/${type}/latest?${parameter}=${encodeURIComponent(recipient)}`;
  let found: Captured | undefined;
  await expect
    .poll(
      async () => {
        const response = await request.get(url, { headers: { "X-E2E-Token": token } });
        if (response.status() !== 200) return false;
        const message = (await response.json()) as Captured;
        if (options.match && !options.match.test(message.body)) return false;
        found = message;
        return true;
      },
      { timeout: 15_000 },
    )
    .toBe(true);
  return found as Captured;
}
